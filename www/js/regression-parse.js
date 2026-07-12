var RegressionParse = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // js/regression-parse.mjs
  var regression_parse_exports = {};
  __export(regression_parse_exports, {
    DEFAULT_THRESHOLDS: () => DEFAULT_THRESHOLDS,
    RUN_MODES: () => RUN_MODES,
    assertionThresholdHints: () => assertionThresholdHints,
    buildLateralSparkline: () => buildLateralSparkline,
    buildMatrix: () => buildMatrix,
    buildTrackSegmentsFromTicks: () => buildTrackSegmentsFromTicks,
    evaluateMode: () => evaluateMode,
    findTickAt: () => findTickAt,
    formatInvestigationMarkdown: () => formatInvestigationMarkdown,
    formatSimS: () => formatSimS,
    mergeResults: () => mergeResults,
    parseRegressionJsonl: () => parseRegressionJsonl,
    parseResultFileName: () => parseResultFileName,
    snapColor: () => snapColor,
    summarizeNightly: () => summarizeNightly,
    summarizeTicks: () => summarizeTicks,
    thresholdLinesForMode: () => thresholdLinesForMode,
    validateSimResult: () => validateSimResult
  });

  // js/shared/assertions-shared.mjs
  function pct(sorted, p) {
    if (!sorted.length) return null;
    const i = Math.min(sorted.length - 1, Math.floor(p / 100 * sorted.length));
    return sorted[i];
  }
  function summarizeTicks(ticks) {
    const laterals = ticks.map((t) => t.lateral_m).filter((v) => v != null && Number.isFinite(v) && v <= 300);
    const sorted = [...laterals].sort((a, b) => a - b);
    const goodLateral = ticks.filter((t) => t.lateral_m != null && t.lateral_m <= 25 && t.snap_quality !== "LOST").length;
    const goodSnap = ticks.filter((t) => t.snap_quality === "GOOD").length;
    const good = Math.max(goodLateral, goodSnap);
    const total = ticks.length || 1;
    const reroutes = ticks.filter((t, i) => {
      if (i === 0) return false;
      const prev = ticks[i - 1].off_route_state;
      const cur = t.off_route_state;
      return prev === "ON_ROUTE" && (cur === "REROUTING" || cur === "OFFLINE_GUIDE" || cur === "SUSPECT");
    }).length;
    return {
      tick_count: ticks.length,
      avg_lateral_m: laterals.length ? laterals.reduce((a, b) => a + b, 0) / laterals.length : null,
      p95_lateral_m: pct(sorted, 95),
      good_snap_ratio: good / total,
      false_reroute_count: reroutes,
      off_route_triggered: ticks.some((t) => t.off_route_state && t.off_route_state !== "ON_ROUTE"),
      first_off_route_sim_s: (() => {
        const hit = ticks.find((t) => t.off_route_state && t.off_route_state !== "ON_ROUTE");
        return hit?.sim_s ?? null;
      })(),
      had_lost: ticks.some((t) => t.snap_quality === "LOST"),
      had_degraded: ticks.some((t) => t.snap_quality === "DEGRADED"),
      recovered_good: (() => {
        let lost = false;
        for (const t of ticks) {
          if (t.snap_quality === "LOST" || t.snap_quality === "DEGRADED") lost = true;
          if (lost && t.snap_quality === "GOOD") return true;
        }
        return false;
      })(),
      recovered_after_stress: (() => {
        const tail = ticks.filter((t) => (t.sim_s ?? 0) >= 50);
        return tail.some((t) => t.lateral_m != null && t.lateral_m <= 25);
      })()
    };
  }
  function evaluateMode(mode, metrics, thresholds, crash) {
    const assertions = [];
    const push = (name, pass2, detail) => assertions.push({ name, pass: pass2, detail });
    if (crash) {
      push("no_crash", false, crash);
      return { pass: false, assertions };
    }
    if (mode === "on_route") {
      const th = thresholds.on_route;
      push(
        "avg_lateral",
        metrics.avg_lateral_m == null || metrics.avg_lateral_m <= th.avg_lateral_max_m,
        `avg=${metrics.avg_lateral_m?.toFixed(1)} max=${th.avg_lateral_max_m}`
      );
      push(
        "p95_lateral",
        metrics.p95_lateral_m == null || metrics.p95_lateral_m <= th.p95_lateral_max_m,
        `p95=${metrics.p95_lateral_m?.toFixed(1)} max=${th.p95_lateral_max_m}`
      );
      push(
        "good_snap_ratio",
        metrics.good_snap_ratio >= th.good_snap_ratio_min,
        `ratio=${metrics.good_snap_ratio?.toFixed(3)} min=${th.good_snap_ratio_min}`
      );
      push(
        "false_reroute",
        metrics.false_reroute_count <= th.false_reroute_max,
        `count=${metrics.false_reroute_count} max=${th.false_reroute_max}`
      );
    }
    if (mode === "deviation") {
      const maxS = thresholds.deviation.off_route_within_s_max;
      const triggered = metrics.off_route_triggered;
      const within = metrics.first_off_route_sim_s != null && metrics.first_off_route_sim_s <= maxS;
      push("off_route_trigger", triggered, triggered ? `at ${metrics.first_off_route_sim_s}s sim` : "never");
      push("off_route_within_s", !triggered || within, `need <=${maxS}s sim`);
    }
    if (mode === "noise_stress") {
      const th = thresholds.noise_stress;
      push("no_crash", th.must_not_crash, "ok");
      push("degraded_or_lost", metrics.had_lost || metrics.had_degraded, "quality dropped");
      if (th.must_recover) {
        push("recover", metrics.recovered_after_stress || metrics.recovered_good, "lateral/snap ok after stress");
      }
    }
    const pass = assertions.every((a) => a.pass);
    return { pass, assertions };
  }
  var DEFAULT_THRESHOLDS = {
    on_route: {
      avg_lateral_max_m: 20,
      p95_lateral_max_m: 90,
      good_snap_ratio_min: 0.75,
      false_reroute_max: 0
    },
    deviation: { off_route_within_s_max: 15 },
    noise_stress: { must_not_crash: true, must_recover: true }
  };

  // js/regression-parse.mjs
  var RUN_MODES = ["on_route", "deviation", "noise_stress"];
  var SNAP_COLORS = {
    GOOD: "#39d353",
    DEGRADED: "#f0883e",
    LOST: "#f85149",
    NONE: "#6e7681"
  };
  function snapColor(quality) {
    return SNAP_COLORS[quality] || SNAP_COLORS.NONE;
  }
  function parseRegressionJsonl(text) {
    const lines = String(text || "").split(/\r?\n/).filter((l) => l.trim());
    const ticks = [];
    for (const line of lines) {
      try {
        const o = JSON.parse(line);
        if (o.type === "regression_tick" || o.lateral_m != null || o.sim_s != null) ticks.push(o);
      } catch (e) {
      }
    }
    ticks.sort((a, b) => (a.sim_s ?? 0) - (b.sim_s ?? 0));
    const durationS = ticks.length ? ticks[ticks.length - 1].sim_s ?? 0 : 0;
    return { ticks, durationS };
  }
  function validateSimResult(result) {
    if (!result?.fixture_id || !result?.mode) throw new Error("result: \u043D\u0443\u0436\u043D\u044B fixture_id \u0438 mode");
    return result;
  }
  function parseResultFileName(name) {
    const m = String(name).match(/^([0-9a-f-]{36})_(on_route|deviation|noise_stress)\.json$/i);
    if (!m) return null;
    return { fixtureId: m[1], runMode: m[2] };
  }
  function buildTrackSegmentsFromTicks(ticks) {
    if (!ticks?.length) return [];
    const segments = [];
    let runColor = null;
    let runPts = [];
    let runT0 = 0;
    for (let i = 0; i < ticks.length - 1; i++) {
      const a = ticks[i];
      const b = ticks[i + 1];
      if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) continue;
      const color = snapColor(a.snap_quality);
      if (runColor === color && runPts.length) {
        runPts.push([b.lat, b.lon]);
      } else {
        if (runPts.length >= 2) {
          segments.push({ latlngs: runPts, color: runColor, t0: runT0, t1: a.sim_s ?? 0 });
        }
        runColor = color;
        runPts = [[a.lat, a.lon], [b.lat, b.lon]];
        runT0 = a.sim_s ?? 0;
      }
    }
    if (runPts.length >= 2) {
      segments.push({
        latlngs: runPts,
        color: runColor,
        t0: runT0,
        t1: ticks[ticks.length - 1].sim_s ?? 0
      });
    }
    return segments;
  }
  function findTickAt(ticks, simS) {
    if (!ticks.length) return null;
    let best = ticks[0];
    for (const t of ticks) {
      if ((t.sim_s ?? 0) <= simS) best = t;
      else break;
    }
    return best;
  }
  function formatSimS(simS) {
    const s = Math.floor(simS || 0);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
  }
  function buildLateralSparkline(ticks, durationS, bucketCount = 120) {
    if (!ticks?.length || !durationS) return [];
    const n = Math.max(8, bucketCount | 0);
    const buckets = Array.from({ length: n }, () => null);
    for (const t of ticks) {
      const lat = t.lateral_m;
      if (lat == null || !Number.isFinite(lat)) continue;
      const idx = Math.min(n - 1, Math.floor((t.sim_s ?? 0) / durationS * n));
      buckets[idx] = buckets[idx] == null ? lat : Math.max(buckets[idx], lat);
    }
    return buckets.map((v, i) => ({
      x: (i + 0.5) / n,
      lateral_m: v
    }));
  }
  function thresholdLinesForMode(mode, thresholds = DEFAULT_THRESHOLDS) {
    if (mode === "on_route") {
      return [
        { key: "lateral_good", value_m: 25, color: "#39d353", label: "25 m" },
        { key: "p95_max", value_m: thresholds.on_route?.p95_lateral_max_m ?? 90, color: "#f0883e", label: "p95 max" }
      ];
    }
    return [];
  }
  function assertionThresholdHints(result, thresholds = DEFAULT_THRESHOLDS) {
    const mode = result?.mode;
    const m = result?.metrics || {};
    const th = thresholds?.[mode];
    if (!th) return [];
    if (mode === "on_route") {
      return [
        { name: "good_snap_ratio", actual: m.good_snap_ratio, limit: th.good_snap_ratio_min, cmp: "min", fmt: (v) => v?.toFixed(3) },
        { name: "p95_lateral", actual: m.p95_lateral_m, limit: th.p95_lateral_max_m, cmp: "max", fmt: (v) => v?.toFixed(1) + " m" },
        { name: "avg_lateral", actual: m.avg_lateral_m, limit: th.avg_lateral_max_m, cmp: "max", fmt: (v) => v?.toFixed(1) + " m" }
      ];
    }
    if (mode === "deviation") {
      return [
        { name: "off_route_within_s", actual: m.first_off_route_sim_s, limit: th.off_route_within_s_max, cmp: "max", fmt: (v) => formatSimS(v ?? 0) }
      ];
    }
    return [];
  }
  function formatInvestigationMarkdown(opts = {}) {
    const {
      bundleDate = "\u2014",
      fixtureId = "\u2014",
      runMode = "\u2014",
      result = {},
      ticks = [],
      durationS = 0,
      simUrl = "",
      notes = ""
    } = opts;
    const m = result.metrics || {};
    const live = ticks.length ? summarizeTicks(ticks) : null;
    const ts = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const shortId = String(fixtureId).slice(0, 8);
    const pass = !!result.pass;
    const failAssertions = (result.assertions || []).filter((a) => !a.pass);
    const lines = [
      "# Investigation \u2014 " + shortId + " \xB7 " + runMode,
      "",
      "**Status:** " + (pass ? "PASS" : "FAIL") + " \xB7 **Nightly date:** " + bundleDate,
      "**Generated:** " + ts + " \xB7 **Source:** sim.html regression dashboard",
      ""
    ];
    if (simUrl) {
      lines.push("## Sim review", "", simUrl, "");
    }
    lines.push("## Assertions", "");
    if (!(result.assertions || []).length) {
      lines.push("_\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 assertions._", "");
    } else {
      for (const a of result.assertions) {
        lines.push("- " + (a.pass ? "\u2713" : "\u2717") + " `" + a.name + "` \u2014 " + (a.detail || ""));
      }
      lines.push("");
    }
    if (!pass && failAssertions.length) {
      lines.push("## Fail summary", "");
      for (const a of failAssertions) {
        lines.push("- `" + a.name + "`: " + (a.detail || ""));
      }
      lines.push("");
    }
    lines.push("## Metrics (result JSON)", "");
    lines.push("| Metric | Value |");
    lines.push("| --- | --- |");
    const metricRows = [
      ["p95_lateral_m", m.p95_lateral_m != null ? m.p95_lateral_m.toFixed(1) + " m" : "\u2014"],
      ["avg_lateral_m", m.avg_lateral_m != null ? m.avg_lateral_m.toFixed(1) + " m" : "\u2014"],
      ["good_snap_ratio", m.good_snap_ratio != null ? m.good_snap_ratio.toFixed(3) : "\u2014"],
      ["false_reroute_count", m.false_reroute_count ?? "\u2014"],
      ["tick_count", m.tick_count ?? "\u2014"],
      ["first_off_route_sim_s", m.first_off_route_sim_s != null ? formatSimS(m.first_off_route_sim_s) : "\u2014"],
      ["had_lost", m.had_lost ? "yes" : "no"],
      ["had_degraded", m.had_degraded ? "yes" : "no"]
    ];
    for (const [k, v] of metricRows) lines.push("| " + k + " | " + v + " |");
    lines.push("");
    if (live) {
      lines.push("## Tick JSONL (loaded in sim)", "");
      lines.push("| Metric | Value |");
      lines.push("| --- | --- |");
      lines.push("| ticks loaded | " + live.tick_count + " |");
      lines.push("| duration sim_s | " + formatSimS(durationS || (ticks.at(-1)?.sim_s ?? 0)) + " |");
      lines.push("| good_snap_ratio (live) | " + (live.good_snap_ratio?.toFixed(3) ?? "\u2014") + " |");
      lines.push("| p95_lateral (live) | " + (live.p95_lateral_m?.toFixed(1) ?? "\u2014") + " m |");
      lines.push("| LOST | " + (live.had_lost ? "yes" : "no") + " |");
      lines.push("| DEGRADED | " + (live.had_degraded ? "yes" : "no") + " |");
      lines.push("");
    }
    lines.push("## Artifacts", "");
    lines.push("- `regression/results/" + bundleDate + "/sim/" + fixtureId + "_" + runMode + ".jsonl`");
    lines.push("- `regression/results/" + bundleDate + "/sim/" + fixtureId + "_" + runMode + ".json`");
    lines.push("- `regression/results/" + bundleDate + "/sim/" + fixtureId + "_" + runMode + ".png` (\u0435\u0441\u043B\u0438 \u0435\u0441\u0442\u044C)");
    lines.push("");
    lines.push("## Next steps", "");
    lines.push("- [ ] \u0412\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438 \u0432 sim (deep link \u0432\u044B\u0448\u0435)");
    lines.push("- [ ] Scrub timeline \u2192 worst lateral / snap LOST");
    lines.push("- [ ] \u041A\u043B\u0430\u0441\u0441\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F: `product_bug` / `agent_bug` / `threshold` / `osm`");
    lines.push("- [ ] \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0432 `regression/reports/investigations/" + ts + "-" + shortId + ".md`");
    lines.push("");
    if (notes?.trim()) {
      lines.push("## Notes", "", notes.trim(), "");
    }
    lines.push("---", "_sim D3 \xB7 regression-parse_");
    return lines.join("\n");
  }
  function summarizeNightly(summary) {
    const results = summary?.results || [];
    const pass = results.filter((r) => r.pass && !r.skipped).length;
    const fail = results.filter((r) => !r.pass && !r.skipped).length;
    return {
      date: summary?.date || "\u2014",
      pass: summary?.pass ?? pass,
      fail: summary?.fail ?? fail,
      total: summary?.total ?? pass + fail,
      results
    };
  }
  function buildMatrix(results) {
    const byFixture = /* @__PURE__ */ new Map();
    for (const r of results) {
      if (r.skipped) continue;
      const id = r.fixture_id;
      if (!byFixture.has(id)) byFixture.set(id, { fixtureId: id, cells: {} });
      byFixture.get(id).cells[r.mode] = r;
    }
    return [...byFixture.values()].sort((a, b) => a.fixtureId.localeCompare(b.fixtureId));
  }
  function mergeResults(summary, folderResults) {
    const map = /* @__PURE__ */ new Map();
    for (const r of summary?.results || []) {
      if (r.skipped) continue;
      map.set(r.fixture_id + ":" + r.mode, r);
    }
    for (const r of folderResults) {
      map.set(r.fixture_id + ":" + r.mode, r);
    }
    const results = [...map.values()].sort((a, b) => {
      const c = a.fixture_id.localeCompare(b.fixture_id);
      return c || RUN_MODES.indexOf(a.mode) - RUN_MODES.indexOf(b.mode);
    });
    const pass = results.filter((r) => r.pass).length;
    const fail = results.filter((r) => !r.pass).length;
    return {
      date: summary?.date || null,
      pass,
      fail,
      skip: summary?.skip || 0,
      total: pass + fail,
      results
    };
  }
  return __toCommonJS(regression_parse_exports);
})();
