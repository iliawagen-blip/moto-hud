var TickCompare = (() => {
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

  // js/shared/tick-compare.mjs
  var tick_compare_exports = {};
  __export(tick_compare_exports, {
    buildDistBucketCompare: () => buildDistBucketCompare,
    compareFieldRegression: () => compareFieldRegression,
    fieldSnapsToCommonTicks: () => fieldSnapsToCommonTicks,
    formatCompareMarkdown: () => formatCompareMarkdown,
    summarizeFieldNav: () => summarizeFieldNav
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

  // js/shared/tick-compare.mjs
  function offRouteAt(nav, t) {
    let state = "ON_ROUTE";
    for (const e of nav || []) {
      if ((e.t || 0) > t) break;
      if (e.sub === "offroute_state" && e.to) state = e.to;
    }
    return state;
  }
  function fieldSnapsToCommonTicks(parsed) {
    const snaps = parsed?.snaps || [];
    const nav = parsed?.nav || [];
    return snaps.map((s) => ({
      lateral_m: s.lat_off,
      snap_quality: s.quality,
      dist_m: s.s0,
      off_route_state: offRouteAt(nav, s.t || 0)
    }));
  }
  function summarizeFieldNav(parsed) {
    const ticks = fieldSnapsToCommonTicks(parsed);
    if (!ticks.length) return null;
    return summarizeTicks(ticks);
  }
  function buildDistBucketCompare(fieldTicks, regTicks, bucketM = 100) {
    const fDist = (fieldTicks || []).filter((t) => t.dist_m != null && Number.isFinite(t.dist_m));
    const rDist = (regTicks || []).filter((t) => t.dist_m != null && Number.isFinite(t.dist_m));
    if (!fDist.length || !rDist.length) {
      return { ok: false, reason: "no_dist_m", field_n: fDist.length, reg_n: rDist.length };
    }
    const fMin = Math.min(...fDist.map((t) => t.dist_m));
    const fMax = Math.max(...fDist.map((t) => t.dist_m));
    const rMin = Math.min(...rDist.map((t) => t.dist_m));
    const rMax = Math.max(...rDist.map((t) => t.dist_m));
    const minD = Math.max(fMin, rMin);
    const maxD = Math.min(fMax, rMax);
    if (maxD <= minD) {
      return { ok: false, reason: "no_overlap", field_range: [fMin, fMax], reg_range: [rMin, rMax] };
    }
    function avgLat(arr) {
      const v = arr.map((t) => t.lateral_m).filter((x) => x != null && Number.isFinite(x) && x <= 300);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    }
    const buckets = [];
    for (let d = minD; d < maxD; d += bucketM) {
      const d1 = d + bucketM;
      const fIn = fDist.filter((t) => t.dist_m >= d && t.dist_m < d1);
      const rIn = rDist.filter((t) => t.dist_m >= d && t.dist_m < d1);
      if (!fIn.length && !rIn.length) continue;
      buckets.push({
        dist_m: Math.round(d + bucketM / 2),
        field_n: fIn.length,
        reg_n: rIn.length,
        field_avg_lat: avgLat(fIn),
        reg_avg_lat: avgLat(rIn)
      });
    }
    return { ok: true, minD, maxD, bucketM, buckets };
  }
  function compareFieldRegression(fieldParsed, regTicks, opts = {}) {
    const fieldTicks = fieldSnapsToCommonTicks(fieldParsed);
    const field = summarizeFieldNav(fieldParsed);
    const regression = summarizeTicks(regTicks || []);
    if (!field?.tick_count) {
      return { ok: false, error: "\u041D\u0435\u0442 snap \u0432 \u043F\u043E\u043B\u0435\u0432\u043E\u0439 \u0442\u0435\u043B\u0435\u043C\u0435\u0442\u0440\u0438\u0438" };
    }
    if (!regression?.tick_count) {
      return { ok: false, error: "\u041D\u0435\u0442 regression ticks" };
    }
    const deltas = {};
    for (const key of ["avg_lateral_m", "p95_lateral_m", "good_snap_ratio", "false_reroute_count"]) {
      const fv = field[key];
      const rv = regression[key];
      if (fv == null && rv == null) continue;
      deltas[key] = {
        field: fv,
        regression: rv,
        delta: fv != null && rv != null ? fv - rv : null
      };
    }
    const distCompare = buildDistBucketCompare(fieldTicks, regTicks, opts.bucketM ?? 100);
    return {
      ok: true,
      fieldLabel: opts.fieldLabel || "field",
      regressionLabel: opts.regressionLabel || "regression",
      field,
      regression,
      deltas,
      distCompare,
      thresholds: DEFAULT_THRESHOLDS
    };
  }
  function formatCompareMarkdown(result) {
    if (!result?.ok) return "# Compare\n\n" + (result.error || "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445") + "\n";
    const f = result.field;
    const r = result.regression;
    const lines = [
      "# Field vs Regression compare",
      "",
      "**Field:** " + result.fieldLabel,
      "**Regression:** " + result.regressionLabel,
      "",
      "## Metrics",
      "",
      "| Metric | Field | Regression | \u0394 |",
      "| --- | --- | --- | --- |"
    ];
    for (const [key, d] of Object.entries(result.deltas || {})) {
      const fmt = key === "good_snap_ratio" ? (v) => v?.toFixed(3) ?? "\u2014" : key === "false_reroute_count" ? (v) => String(v ?? "\u2014") : (v) => v != null ? v.toFixed(1) + " m" : "\u2014";
      lines.push("| " + key + " | " + fmt(d.field) + " | " + fmt(d.regression) + " | " + (d.delta != null ? key === "good_snap_ratio" ? d.delta.toFixed(3) : d.delta.toFixed(1) : "\u2014") + " |");
    }
    lines.push("");
    const dc = result.distCompare;
    if (dc?.ok && dc.buckets?.length) {
      lines.push("## Lateral by route distance (bucket " + dc.bucketM + " m)", "");
      lines.push("| dist_m | field avg lat | reg avg lat | field n | reg n |");
      lines.push("| --- | --- | --- | --- | --- |");
      for (const b of dc.buckets.slice(0, 80)) {
        lines.push("| " + b.dist_m + " | " + (b.field_avg_lat?.toFixed(1) ?? "\u2014") + " | " + (b.reg_avg_lat?.toFixed(1) ?? "\u2014") + " | " + b.field_n + " | " + b.reg_n + " |");
      }
      lines.push("");
    } else if (dc && !dc.ok) {
      lines.push("## Distance alignment", "", "_\u041D\u0435\u0442 \u043F\u0435\u0440\u0435\u043A\u0440\u044B\u0442\u0438\u044F dist_m/s0: " + (dc.reason || "") + "_", "");
    }
    lines.push("---", "_tick-compare \xB7 D5_");
    return lines.join("\n");
  }
  return __toCommonJS(tick_compare_exports);
})();
