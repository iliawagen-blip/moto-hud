/**
 * Парсер полевой телеметрии JSONL (sim + CLI).
 */

export const SNAP_COLORS = {
  GOOD: '#39d353',
  DEGRADED: '#f0883e',
  LOST: '#f85149',
  NONE: '#6e7681',
  HIGH_LAT: '#f85149'
};

const HIGH_LAT_M = 90;

function pctSorted(sorted, p){
  if(!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * (sorted.length - 1)));
  return sorted[i];
}

/**
 * @param {string} text
 */
export function parseTelemetryJsonl(text){
  const lines = String(text || '').split(/\r?\n/).filter(l => l.trim());
  /** @type {object[]} */
  const events = [];
  /** @type {object | null} */
  let session = null;

  for(const line of lines){
    try{
      const o = JSON.parse(line);
      if(o.type === 'session'){
        session = o;
        continue;
      }
      events.push(o);
    }catch(e){ /* skip bad line */ }
  }

  events.sort((a, b) => (a.t || 0) - (b.t || 0));

  const fixes = events.filter(e => e.type === 'fix' && e.lat != null && e.lon != null);
  const snaps = events.filter(e => e.type === 'snap');
  const nav = events.filter(e => e.type === 'nav');
  const marks = events.filter(e => e.type === 'mark');
  const meta = events.filter(e => e.type === 'meta');
  const perf = events.filter(e => e.type === 'perf');

  return { session, events, fixes, snaps, nav, marks, meta, perf };
}

/**
 * Цвет сегмента трека по snap на fix.
 * @param {object | null | undefined} snap
 */
export function snapSegmentColor(snap){
  if(!snap) return SNAP_COLORS.NONE;
  const lat = snap.lat_off;
  if(lat != null && Number.isFinite(lat) && lat > HIGH_LAT_M) return SNAP_COLORS.HIGH_LAT;
  const q = snap.quality || 'GOOD';
  if(q === 'LOST') return SNAP_COLORS.LOST;
  if(q === 'DEGRADED') return SNAP_COLORS.DEGRADED;
  return SNAP_COLORS.GOOD;
}

/**
 * Пары fix + ближайший snap (как в analyze-telemetry-full).
 * @param {object[]} events
 */
export function buildFixSnapPairs(events){
  /** @type {{ fix: object, snap: object | null }[]} */
  const pairs = [];
  for(let i = 0; i < events.length; i++){
    if(events[i].type !== 'fix' || events[i].lat == null || events[i].lon == null) continue;
    const snap = events.slice(i + 1, i + 4).find(e => e.type === 'snap') || null;
    pairs.push({ fix: events[i], snap });
  }
  return pairs;
}

/**
 * @param {object[]} events
 * @param {number} t
 */
export function findFixAt(events, fixes, t){
  if(!fixes.length) return null;
  let best = fixes[0];
  for(const f of fixes){
    if((f.t || 0) <= t) best = f;
    else break;
  }
  return best;
}

/**
 * @param {object[]} snaps
 * @param {number} t
 */
export function findSnapAt(snaps, t){
  let best = null;
  for(const s of snaps){
    if((s.t || 0) > t) break;
    best = s;
  }
  return best;
}

/**
 * @param {ReturnType<typeof parseTelemetryJsonl>} parsed
 */
export function summarizeSession(parsed){
  const { session, events, fixes, snaps, nav, meta, perf } = parsed;
  const lastT = events.length ? (events[events.length - 1].t || 0) : 0;
  const startedAt = session?.startedAt;
  const endedAt = session?.endedAt;
  const durationMs = startedAt && endedAt
    ? Math.max(0, endedAt - startedAt)
    : lastT;

  const metaStart = meta.find(e => e.sub === 'start') || events.find(e => e.build);
  const buildId = session?.buildId || metaStart?.build || events.find(e => e.build)?.build || '—';
  const routeKm = metaStart?.routeKm ?? session?.meta?.routeKm ?? null;

  const qual = { GOOD: 0, DEGRADED: 0, LOST: 0, '?': 0 };
  for(const s of snaps){
    const q = s.quality || '?';
    qual[q] = (qual[q] || 0) + 1;
  }
  const snapTotal = snaps.length || 1;
  const qualPct = {
    GOOD: Math.round((qual.GOOD / snapTotal) * 100),
    DEGRADED: Math.round((qual.DEGRADED / snapTotal) * 100),
    LOST: Math.round((qual.LOST / snapTotal) * 100)
  };

  const latOffs = snaps.map(s => s.lat_off).filter(v => v != null && Number.isFinite(v)).sort((a, b) => a - b);
  const offroute = nav.filter(n => n.sub === 'offroute_state');
  const reroutes = nav.filter(n => n.sub === 'reroute');
  const autoMap = nav.filter(n => n.sub === 'view_auto_map');
  const convergeSummary = meta.find(e => e.sub === 'converge_session_summary');

  const perfWarns = perf.filter(p => (p.frames_over_32ms || 0) > 0 || (p.avg_ms || 0) > 32);

  const ua = session?.userAgent || events.find(e => e.ua)?.ua || '';
  const device = ua.includes('Mobile') ? 'mobile' : (ua ? 'desktop' : '—');

  return {
    sessionId: session?.id || '—',
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

function haversineM(a, b){
  if(a?.lat == null || b?.lat == null) return 0;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLon = (b.lon - a.lon) * r;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Авто-инциденты для карты и панели.
 * @param {ReturnType<typeof parseTelemetryJsonl>} parsed
 */
export function detectIncidents(parsed){
  const { events, fixes, nav, perf } = parsed;
  /** @type {{ t: number, lat: number, lon: number, kind: string, label: string, color: string, ev: object }[]} */
  const out = [];

  function posAt(t){
    const f = findFixAt(events, fixes, t);
    return f ? { lat: f.lat, lon: f.lon } : null;
  }

  for(const e of nav){
    if(e.sub === 'offroute_state' && (e.to === 'SUSPECT' || e.to === 'REROUTING')){
      const p = posAt(e.t || 0);
      if(!p) continue;
      out.push({
        t: e.t || 0,
        lat: p.lat,
        lon: p.lon,
        kind: 'offroute',
        label: `off-route → ${e.to}${e.lateral != null ? ` · ${Math.round(e.lateral)} м` : ''}`,
        color: '#f85149',
        ev: e
      });
    }
    if(e.sub === 'converge_transition' && e.reason === 'invalidate_acc'){
      const p = posAt(e.t || 0);
      if(!p) continue;
      out.push({
        t: e.t || 0,
        lat: p.lat,
        lon: p.lon,
        kind: 'converge',
        label: 'converge invalidate_acc',
        color: '#d29922',
        ev: e
      });
    }
    if(e.sub === 'snap_lost_long'){
      const p = posAt(e.t || 0);
      if(!p) continue;
      out.push({
        t: e.t || 0,
        lat: p.lat,
        lon: p.lon,
        kind: 'snap',
        label: 'snap_lost_long',
        color: '#f85149',
        ev: e
      });
    }
  }

  for(const e of perf){
    const jank = (e.frames_over_32ms ?? 0) > 0 || (e.avg_ms ?? 0) > 40;
    if(!jank) continue;
    const p = posAt(e.t || 0);
    if(!p) continue;
    out.push({
      t: e.t || 0,
      lat: p.lat,
      lon: p.lon,
      kind: 'perf',
      label: `perf_jank avg=${e.avg_ms?.toFixed?.(0) ?? e.avg_ms}ms · >32ms=${e.frames_over_32ms ?? '?'}`,
      color: '#d29922',
      ev: e
    });
  }

  for(let i = 1; i < fixes.length; i++){
    const a = fixes[i - 1];
    const b = fixes[i];
    const dt = ((b.t || 0) - (a.t || 0)) / 1000;
    if(dt <= 0 || dt > 5) continue;
    const dist = haversineM(a, b);
    if(dist < 45) continue;
    out.push({
      t: b.t || 0,
      lat: b.lat,
      lon: b.lon,
      kind: 'gps',
      label: `gps_spike ${Math.round(dist)} m / ${dt.toFixed(1)}s`,
      color: '#a371f7',
      ev: b
    });
  }

  const convergeTs = nav
    .filter(e => e.sub === 'converge_transition')
    .map(e => e.t || 0)
    .sort((a, b) => a - b);
  for(let i = 1; i < convergeTs.length; i++){
    if(convergeTs[i] - convergeTs[i - 1] > 8000) continue;
    const t = convergeTs[i];
    const p = posAt(t);
    if(!p) continue;
    out.push({
      t,
      lat: p.lat,
      lon: p.lon,
      kind: 'converge',
      label: 'converge_flap',
      color: '#f0883e',
      ev: { sub: 'converge_flap', t }
    });
    i++;
  }

  out.sort((a, b) => a.t - b.t);
  return out;
}

/**
 * Сегменты трека для SimMap (слитые по цвету).
 * @param {{ fix: object, snap: object | null }[]} pairs
 */
export function buildTrackSegments(pairs){
  if(pairs.length < 2) return [];
  /** @type {{ latlngs: [number, number][], color: string, t0: number, t1: number }[]} */
  const segments = [];

  let runColor = null;
  /** @type {[number, number][]} */
  let runPts = [];
  let runT0 = 0;

  for(let i = 0; i < pairs.length - 1; i++){
    const a = pairs[i].fix;
    const b = pairs[i + 1].fix;
    const color = snapSegmentColor(pairs[i].snap);
    const segPts = [[a.lat, a.lon], [b.lat, b.lon]];

    if(runColor === color && runPts.length){
      runPts.push([b.lat, b.lon]);
    } else {
      if(runPts.length >= 2){
        segments.push({ latlngs: runPts, color: runColor, t0: runT0, t1: pairs[i].fix.t || 0 });
      }
      runColor = color;
      runPts = [[a.lat, a.lon], [b.lat, b.lon]];
      runT0 = a.t || 0;
    }
  }
  if(runPts.length >= 2){
    segments.push({
      latlngs: runPts,
      color: runColor,
      t0: runT0,
      t1: pairs[pairs.length - 1].fix.t || 0
    });
  }
  return segments;
}

export function formatDuration(ms){
  const s = Math.round((ms || 0) / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if(m >= 60){
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}ч ${rm}м`;
  }
  return m > 0 ? `${m}м ${r}с` : `${r}с`;
}

export function formatClockMs(ms){
  const s = Math.floor((ms || 0) / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Markdown-отчёт по полевой сессии (T6 / sim export).
 * @param {ReturnType<typeof parseTelemetryJsonl>} parsed
 * @param {{ fileName?: string, incidents?: ReturnType<typeof detectIncidents> }} [opts]
 */
export function formatTelemetryMarkdown(parsed, opts = {}){
  const { fileName = '', incidents: incIn } = opts;
  const summary = summarizeSession(parsed);
  const incidents = incIn ?? detectIncidents(parsed);
  const { fixes } = parsed;

  const accs = fixes.map(f => f.acc).filter(v => v != null).sort((a, b) => a - b);
  const accP50 = accs.length ? pctSorted(accs, 50) : null;
  const accP95 = accs.length ? pctSorted(accs, 95) : null;

  const lines = [
    '# Отчёт телеметрии Moto HUD',
    '',
    `**Дата отчёта:** ${new Date().toISOString().slice(0, 10)}`
  ];
  if(fileName) lines.push(`**Файл:** \`${fileName}\``);
  lines.push(
    `**Session:** \`${summary.sessionId}\``,
    `**Build:** \`${summary.buildId}\``,
    `**Устройство:** ${summary.device}`,
    summary.dirty ? '**⚠ dirty session**' : '',
    '',
    '## Сводка',
    '',
    '| Метрика | Значение |',
    '| --- | --- |',
    `| Длительность | ${summary.durationLabel} |`,
    `| Маршрут | ${summary.routeKm != null ? summary.routeKm + ' км' : '—'} |`,
    `| Fix / Snap / Events | ${summary.fixCount} / ${summary.snapCount} / ${summary.eventCount} |`,
    `| Snap GOOD / DEGRADED / LOST | ${summary.qualPct.GOOD}% / ${summary.qualPct.DEGRADED}% / ${summary.qualPct.LOST}% |`,
    `| Lateral p50 / p95 / max | ${summary.latOffP50 ?? '—'} / ${summary.latOffP95 ?? '—'} / ${summary.latOffMax ?? '—'} м |`,
    `| Off-route transitions | ${summary.offrouteCount} |`,
    `| Reroute | ${summary.rerouteCount} |`,
    `| view_auto_map | ${summary.viewAutoMapCount} |`,
    `| Converge blocked | ${summary.convergeBlockedMs != null ? Math.round(summary.convergeBlockedMs / 1000) + ' с' : '—'} |`,
    `| perf_jank windows | ${summary.perfWarnCount} |`,
    `| GPS acc p50 / p95 | ${accP50 != null ? accP50.toFixed(1) : '—'} / ${accP95 != null ? accP95.toFixed(1) : '—'} м |`,
    ''
  );

  if(summary.uaShort){
    lines.push('## User-Agent', '', `\`${summary.uaShort}\``, '');
  }

  lines.push('## Инциденты', '');
  if(!incidents.length){
    lines.push('_Инцидентов не найдено._', '');
  } else {
    lines.push('| t | kind | label | lat | lon |', '| --- | --- | --- | --- | --- |');
    for(const inc of incidents.slice(0, 80)){
      lines.push(
        `| ${formatClockMs(inc.t)} | ${inc.kind} | ${String(inc.label).replace(/\|/g, '/')} | ${inc.lat?.toFixed?.(5) ?? '—'} | ${inc.lon?.toFixed?.(5) ?? '—'} |`
      );
    }
    if(incidents.length > 80){
      lines.push('', `_… ещё ${incidents.length - 80} инцидентов_`, '');
    } else {
      lines.push('');
    }
  }

  lines.push('---', '_Сгенерировано sim.html · telemetry-parse_');
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}
