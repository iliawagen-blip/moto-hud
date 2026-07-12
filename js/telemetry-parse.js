var TelemetryParse = (() => {
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

  // js/telemetry-parse.mjs
  var telemetry_parse_exports = {};
  __export(telemetry_parse_exports, {
    SNAP_COLORS: () => SNAP_COLORS,
    buildFixSnapPairs: () => buildFixSnapPairs,
    buildTrackSegments: () => buildTrackSegments,
    detectIncidents: () => detectIncidents,
    findFixAt: () => findFixAt,
    findSnapAt: () => findSnapAt,
    formatClockMs: () => formatClockMs,
    formatDuration: () => formatDuration,
    formatTelemetryMarkdown: () => formatTelemetryMarkdown,
    parseTelemetryJsonl: () => parseTelemetryJsonl,
    snapSegmentColor: () => snapSegmentColor,
    summarizeSession: () => summarizeSession
  });
  var SNAP_COLORS = {
    GOOD: "#39d353",
    DEGRADED: "#f0883e",
    LOST: "#f85149",
    NONE: "#6e7681",
    HIGH_LAT: "#f85149"
  };
  var HIGH_LAT_M = 90;
  function pctSorted(sorted, p) {
    if (!sorted.length) return null;
    const i = Math.min(sorted.length - 1, Math.floor(p / 100 * (sorted.length - 1)));
    return sorted[i];
  }
  function parseTelemetryJsonl(text) {
    const lines = String(text || "").split(/\r?\n/).filter((l) => l.trim());
    const events = [];
    let session = null;
    for (const line of lines) {
      try {
        const o = JSON.parse(line);
        if (o.type === "session") {
          session = o;
          continue;
        }
        events.push(o);
      } catch (e) {
      }
    }
    events.sort((a, b) => (a.t || 0) - (b.t || 0));
    const fixes = events.filter((e) => e.type === "fix" && e.lat != null && e.lon != null);
    const snaps = events.filter((e) => e.type === "snap");
    const nav = events.filter((e) => e.type === "nav");
    const marks = events.filter((e) => e.type === "mark");
    const meta = events.filter((e) => e.type === "meta");
    const perf = events.filter((e) => e.type === "perf");
    return { session, events, fixes, snaps, nav, marks, meta, perf };
  }
  function snapSegmentColor(snap) {
    if (!snap) return SNAP_COLORS.NONE;
    const lat = snap.lat_off;
    if (lat != null && Number.isFinite(lat) && lat > HIGH_LAT_M) return SNAP_COLORS.HIGH_LAT;
    const q = snap.quality || "GOOD";
    if (q === "LOST") return SNAP_COLORS.LOST;
    if (q === "DEGRADED") return SNAP_COLORS.DEGRADED;
    return SNAP_COLORS.GOOD;
  }
  function buildFixSnapPairs(events) {
    const pairs = [];
    for (let i = 0; i < events.length; i++) {
      if (events[i].type !== "fix" || events[i].lat == null || events[i].lon == null) continue;
      const snap = events.slice(i + 1, i + 4).find((e) => e.type === "snap") || null;
      pairs.push({ fix: events[i], snap });
    }
    return pairs;
  }
  function findFixAt(events, fixes, t) {
    if (!fixes.length) return null;
    let best = fixes[0];
    for (const f of fixes) {
      if ((f.t || 0) <= t) best = f;
      else break;
    }
    return best;
  }
  function findSnapAt(snaps, t) {
    let best = null;
    for (const s of snaps) {
      if ((s.t || 0) > t) break;
      best = s;
    }
    return best;
  }
  function summarizeSession(parsed) {
    const { session, events, fixes, snaps, nav, meta, perf } = parsed;
    const lastT = events.length ? events[events.length - 1].t || 0 : 0;
    const startedAt = session?.startedAt;
    const endedAt = session?.endedAt;
    const durationMs = startedAt && endedAt ? Math.max(0, endedAt - startedAt) : lastT;
    const metaStart = meta.find((e) => e.sub === "start") || events.find((e) => e.build);
    const buildId = session?.buildId || metaStart?.build || events.find((e) => e.build)?.build || "\u2014";
    const routeKm = metaStart?.routeKm ?? session?.meta?.routeKm ?? null;
    const qual = { GOOD: 0, DEGRADED: 0, LOST: 0, "?": 0 };
    for (const s of snaps) {
      const q = s.quality || "?";
      qual[q] = (qual[q] || 0) + 1;
    }
    const snapTotal = snaps.length || 1;
    const qualPct = {
      GOOD: Math.round(qual.GOOD / snapTotal * 100),
      DEGRADED: Math.round(qual.DEGRADED / snapTotal * 100),
      LOST: Math.round(qual.LOST / snapTotal * 100)
    };
    const latOffs = snaps.map((s) => s.lat_off).filter((v) => v != null && Number.isFinite(v)).sort((a, b) => a - b);
    const offroute = nav.filter((n) => n.sub === "offroute_state");
    const reroutes = nav.filter((n) => n.sub === "reroute");
    const autoMap = nav.filter((n) => n.sub === "view_auto_map");
    const convergeSummary = meta.find((e) => e.sub === "converge_session_summary");
    const perfWarns = perf.filter((p) => (p.frames_over_32ms || 0) > 0 || (p.avg_ms || 0) > 32);
    const ua = session?.userAgent || events.find((e) => e.ua)?.ua || "";
    const device = ua.includes("Mobile") ? "mobile" : ua ? "desktop" : "\u2014";
    return {
      sessionId: session?.id || "\u2014",
      durationMs,
      durationLabel: formatDuration(durationMs),
      routeKm,
      buildId,
      device,
      uaShort: ua.slice(0, 72),
      fixCount: fixes.length,
      snapCount: snaps.length,
      eventCount: events.length,
      qual,
      qualPct,
      latOffP50: latOffs.length ? Math.round(pctSorted(latOffs, 50) * 10) / 10 : null,
      latOffP95: latOffs.length ? Math.round(pctSorted(latOffs, 95) * 10) / 10 : null,
      latOffMax: latOffs.length ? Math.round(latOffs[latOffs.length - 1] * 10) / 10 : null,
      offrouteCount: offroute.length,
      rerouteCount: reroutes.length,
      viewAutoMapCount: autoMap.length,
      convergeBlockedMs: convergeSummary?.converge_blocked_total_ms ?? null,
      convergeFalseEvents: convergeSummary?.converge_false_events ?? null,
      perfWarnCount: perfWarns.length,
      dirty: !!session?.dirty
    };
  }
  function haversineM(a, b) {
    if (a?.lat == null || b?.lat == null) return 0;
    const r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r;
    const dLon = (b.lon - a.lon) * r;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 6371e3 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  function detectIncidents(parsed) {
    const { events, fixes, nav, perf } = parsed;
    const out = [];
    function posAt(t) {
      const f = findFixAt(events, fixes, t);
      return f ? { lat: f.lat, lon: f.lon } : null;
    }
    for (const e of nav) {
      if (e.sub === "offroute_state" && (e.to === "SUSPECT" || e.to === "REROUTING")) {
        const p = posAt(e.t || 0);
        if (!p) continue;
        out.push({
          t: e.t || 0,
          lat: p.lat,
          lon: p.lon,
          kind: "offroute",
          label: `off-route \u2192 ${e.to}${e.lateral != null ? ` \xB7 ${Math.round(e.lateral)} \u043C` : ""}`,
          color: "#f85149",
          ev: e
        });
      }
      if (e.sub === "converge_transition" && e.reason === "invalidate_acc") {
        const p = posAt(e.t || 0);
        if (!p) continue;
        out.push({
          t: e.t || 0,
          lat: p.lat,
          lon: p.lon,
          kind: "converge",
          label: "converge invalidate_acc",
          color: "#d29922",
          ev: e
        });
      }
      if (e.sub === "snap_lost_long") {
        const p = posAt(e.t || 0);
        if (!p) continue;
        out.push({
          t: e.t || 0,
          lat: p.lat,
          lon: p.lon,
          kind: "snap",
          label: "snap_lost_long",
          color: "#f85149",
          ev: e
        });
      }
    }
    for (const e of perf) {
      const jank = (e.frames_over_32ms ?? 0) > 0 || (e.avg_ms ?? 0) > 40;
      if (!jank) continue;
      const p = posAt(e.t || 0);
      if (!p) continue;
      out.push({
        t: e.t || 0,
        lat: p.lat,
        lon: p.lon,
        kind: "perf",
        label: `perf_jank avg=${e.avg_ms?.toFixed?.(0) ?? e.avg_ms}ms \xB7 >32ms=${e.frames_over_32ms ?? "?"}`,
        color: "#d29922",
        ev: e
      });
    }
    for (let i = 1; i < fixes.length; i++) {
      const a = fixes[i - 1];
      const b = fixes[i];
      const dt = ((b.t || 0) - (a.t || 0)) / 1e3;
      if (dt <= 0 || dt > 5) continue;
      const dist = haversineM(a, b);
      if (dist < 45) continue;
      out.push({
        t: b.t || 0,
        lat: b.lat,
        lon: b.lon,
        kind: "gps",
        label: `gps_spike ${Math.round(dist)} m / ${dt.toFixed(1)}s`,
        color: "#a371f7",
        ev: b
      });
    }
    const convergeTs = nav.filter((e) => e.sub === "converge_transition").map((e) => e.t || 0).sort((a, b) => a - b);
    for (let i = 1; i < convergeTs.length; i++) {
      if (convergeTs[i] - convergeTs[i - 1] > 8e3) continue;
      const t = convergeTs[i];
      const p = posAt(t);
      if (!p) continue;
      out.push({
        t,
        lat: p.lat,
        lon: p.lon,
        kind: "converge",
        label: "converge_flap",
        color: "#f0883e",
        ev: { sub: "converge_flap", t }
      });
      i++;
    }
    out.sort((a, b) => a.t - b.t);
    return out;
  }
  function buildTrackSegments(pairs) {
    if (pairs.length < 2) return [];
    const segments = [];
    let runColor = null;
    let runPts = [];
    let runT0 = 0;
    for (let i = 0; i < pairs.length - 1; i++) {
      const a = pairs[i].fix;
      const b = pairs[i + 1].fix;
      const color = snapSegmentColor(pairs[i].snap);
      const segPts = [[a.lat, a.lon], [b.lat, b.lon]];
      if (runColor === color && runPts.length) {
        runPts.push([b.lat, b.lon]);
      } else {
        if (runPts.length >= 2) {
          segments.push({ latlngs: runPts, color: runColor, t0: runT0, t1: pairs[i].fix.t || 0 });
        }
        runColor = color;
        runPts = [[a.lat, a.lon], [b.lat, b.lon]];
        runT0 = a.t || 0;
      }
    }
    if (runPts.length >= 2) {
      segments.push({
        latlngs: runPts,
        color: runColor,
        t0: runT0,
        t1: pairs[pairs.length - 1].fix.t || 0
      });
    }
    return segments;
  }
  function formatDuration(ms) {
    const s = Math.round((ms || 0) / 1e3);
    const m = Math.floor(s / 60);
    const r = s % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rm = m % 60;
      return `${h}\u0447 ${rm}\u043C`;
    }
    return m > 0 ? `${m}\u043C ${r}\u0441` : `${r}\u0441`;
  }
  function formatClockMs(ms) {
    const s = Math.floor((ms || 0) / 1e3);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  }
  function formatTelemetryMarkdown(parsed, opts = {}) {
    const { fileName = "", incidents: incIn } = opts;
    const summary = summarizeSession(parsed);
    const incidents = incIn ?? detectIncidents(parsed);
    const { fixes } = parsed;
    const accs = fixes.map((f) => f.acc).filter((v) => v != null).sort((a, b) => a - b);
    const accP50 = accs.length ? pctSorted(accs, 50) : null;
    const accP95 = accs.length ? pctSorted(accs, 95) : null;
    const lines = [
      "# \u041E\u0442\u0447\u0451\u0442 \u0442\u0435\u043B\u0435\u043C\u0435\u0442\u0440\u0438\u0438 Moto HUD",
      "",
      `**\u0414\u0430\u0442\u0430 \u043E\u0442\u0447\u0451\u0442\u0430:** ${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`
    ];
    if (fileName) lines.push(`**\u0424\u0430\u0439\u043B:** \`${fileName}\``);
    lines.push(
      `**Session:** \`${summary.sessionId}\``,
      `**Build:** \`${summary.buildId}\``,
      `**\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E:** ${summary.device}`,
      summary.dirty ? "**\u26A0 dirty session**" : "",
      "",
      "## \u0421\u0432\u043E\u0434\u043A\u0430",
      "",
      "| \u041C\u0435\u0442\u0440\u0438\u043A\u0430 | \u0417\u043D\u0430\u0447\u0435\u043D\u0438\u0435 |",
      "| --- | --- |",
      `| \u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C | ${summary.durationLabel} |`,
      `| \u041C\u0430\u0440\u0448\u0440\u0443\u0442 | ${summary.routeKm != null ? summary.routeKm + " \u043A\u043C" : "\u2014"} |`,
      `| Fix / Snap / Events | ${summary.fixCount} / ${summary.snapCount} / ${summary.eventCount} |`,
      `| Snap GOOD / DEGRADED / LOST | ${summary.qualPct.GOOD}% / ${summary.qualPct.DEGRADED}% / ${summary.qualPct.LOST}% |`,
      `| Lateral p50 / p95 / max | ${summary.latOffP50 ?? "\u2014"} / ${summary.latOffP95 ?? "\u2014"} / ${summary.latOffMax ?? "\u2014"} \u043C |`,
      `| Off-route transitions | ${summary.offrouteCount} |`,
      `| Reroute | ${summary.rerouteCount} |`,
      `| view_auto_map | ${summary.viewAutoMapCount} |`,
      `| Converge blocked | ${summary.convergeBlockedMs != null ? Math.round(summary.convergeBlockedMs / 1e3) + " \u0441" : "\u2014"} |`,
      `| perf_jank windows | ${summary.perfWarnCount} |`,
      `| GPS acc p50 / p95 | ${accP50 != null ? accP50.toFixed(1) : "\u2014"} / ${accP95 != null ? accP95.toFixed(1) : "\u2014"} \u043C |`,
      ""
    );
    if (summary.uaShort) {
      lines.push("## User-Agent", "", `\`${summary.uaShort}\``, "");
    }
    lines.push("## \u0418\u043D\u0446\u0438\u0434\u0435\u043D\u0442\u044B", "");
    if (!incidents.length) {
      lines.push("_\u0418\u043D\u0446\u0438\u0434\u0435\u043D\u0442\u043E\u0432 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E._", "");
    } else {
      lines.push("| t | kind | label | lat | lon |", "| --- | --- | --- | --- | --- |");
      for (const inc of incidents.slice(0, 80)) {
        lines.push(
          `| ${formatClockMs(inc.t)} | ${inc.kind} | ${String(inc.label).replace(/\|/g, "/")} | ${inc.lat?.toFixed?.(5) ?? "\u2014"} | ${inc.lon?.toFixed?.(5) ?? "\u2014"} |`
        );
      }
      if (incidents.length > 80) {
        lines.push("", `_\u2026 \u0435\u0449\u0451 ${incidents.length - 80} \u0438\u043D\u0446\u0438\u0434\u0435\u043D\u0442\u043E\u0432_`, "");
      } else {
        lines.push("");
      }
    }
    lines.push("---", "_\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043E sim.html \xB7 telemetry-parse_");
    return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
  }
  return __toCommonJS(telemetry_parse_exports);
})();
