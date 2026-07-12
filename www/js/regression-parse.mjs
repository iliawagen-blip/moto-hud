/**
 * Парсер regression tick JSONL + result JSON (sim UI + CLI).
 */
import { summarizeTicks, evaluateMode, DEFAULT_THRESHOLDS } from './shared/assertions-shared.mjs';

export { summarizeTicks, evaluateMode, DEFAULT_THRESHOLDS };

const RUN_MODES = ['on_route', 'deviation', 'noise_stress'];

const SNAP_COLORS = {
  GOOD: '#39d353',
  DEGRADED: '#f0883e',
  LOST: '#f85149',
  NONE: '#6e7681'
};

export function snapColor(quality){
  return SNAP_COLORS[quality] || SNAP_COLORS.NONE;
}

/**
 * @param {string} text
 */
export function parseRegressionJsonl(text){
  const lines = String(text || '').split(/\r?\n/).filter(l => l.trim());
  /** @type {object[]} */
  const ticks = [];
  for(const line of lines){
    try{
      const o = JSON.parse(line);
      if(o.type === 'regression_tick' || o.lateral_m != null || o.sim_s != null) ticks.push(o);
    }catch(e){ /* skip */ }
  }
  ticks.sort((a, b) => (a.sim_s ?? 0) - (b.sim_s ?? 0));
  const durationS = ticks.length ? (ticks[ticks.length - 1].sim_s ?? 0) : 0;
  return { ticks, durationS };
}

/**
 * @param {object} result
 */
export function validateSimResult(result){
  if(!result?.fixture_id || !result?.mode) throw new Error('result: нужны fixture_id и mode');
  return result;
}

/**
 * Имя файла результата: {uuid}_{mode}.json
 * @param {string} name
 */
export function parseResultFileName(name){
  const m = String(name).match(/^([0-9a-f-]{36})_(on_route|deviation|noise_stress)\.json$/i);
  if(!m) return null;
  return { fixtureId: m[1], runMode: m[2] };
}

/**
 * @param {object[]} ticks
 */
export function buildTrackSegmentsFromTicks(ticks){
  if(!ticks?.length) return [];
  /** @type {{ latlngs: [number,number][], color: string, t0: number, t1: number }[]} */
  const segments = [];
  let runColor = null;
  /** @type {[number,number][]} */
  let runPts = [];
  let runT0 = 0;

  for(let i = 0; i < ticks.length - 1; i++){
    const a = ticks[i];
    const b = ticks[i + 1];
    if(a.lat == null || a.lon == null || b.lat == null || b.lon == null) continue;
    const color = snapColor(a.snap_quality);
    if(runColor === color && runPts.length){
      runPts.push([b.lat, b.lon]);
    } else {
      if(runPts.length >= 2){
        segments.push({ latlngs: runPts, color: runColor, t0: runT0, t1: a.sim_s ?? 0 });
      }
      runColor = color;
      runPts = [[a.lat, a.lon], [b.lat, b.lon]];
      runT0 = a.sim_s ?? 0;
    }
  }
  if(runPts.length >= 2){
    segments.push({
      latlngs: runPts,
      color: runColor,
      t0: runT0,
      t1: ticks[ticks.length - 1].sim_s ?? 0
    });
  }
  return segments;
}

/**
 * @param {object[]} ticks
 * @param {number} simS
 */
export function findTickAt(ticks, simS){
  if(!ticks.length) return null;
  let best = ticks[0];
  for(const t of ticks){
    if((t.sim_s ?? 0) <= simS) best = t;
    else break;
  }
  return best;
}

export function formatSimS(simS){
  const s = Math.floor(simS || 0);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
}

/**
 * Точки lateral sparkline (max lateral на бакет sim_s).
 * @param {object[]} ticks
 * @param {number} durationS
 * @param {number} bucketCount
 */
export function buildLateralSparkline(ticks, durationS, bucketCount = 120){
  if(!ticks?.length || !durationS) return [];
  const n = Math.max(8, bucketCount | 0);
  const buckets = Array.from({ length: n }, () => null);
  for(const t of ticks){
    const lat = t.lateral_m;
    if(lat == null || !Number.isFinite(lat)) continue;
    const idx = Math.min(n - 1, Math.floor(((t.sim_s ?? 0) / durationS) * n));
    buckets[idx] = buckets[idx] == null ? lat : Math.max(buckets[idx], lat);
  }
  return buckets.map((v, i) => ({
    x: (i + 0.5) / n,
    lateral_m: v
  }));
}

/**
 * Пороговые линии для режима (из DEFAULT_THRESHOLDS).
 * @param {string} mode
 * @param {object} [thresholds]
 */
export function thresholdLinesForMode(mode, thresholds = DEFAULT_THRESHOLDS){
  if(mode === 'on_route'){
    return [
      { key: 'lateral_good', value_m: 25, color: '#39d353', label: '25 m' },
      { key: 'p95_max', value_m: thresholds.on_route?.p95_lateral_max_m ?? 90, color: '#f0883e', label: 'p95 max' }
    ];
  }
  return [];
}

/**
 * @param {object} result
 * @param {object} [thresholds]
 */
export function assertionThresholdHints(result, thresholds = DEFAULT_THRESHOLDS){
  const mode = result?.mode;
  const m = result?.metrics || {};
  const th = thresholds?.[mode];
  if(!th) return [];
  if(mode === 'on_route'){
    return [
      { name: 'good_snap_ratio', actual: m.good_snap_ratio, limit: th.good_snap_ratio_min, cmp: 'min', fmt: v => v?.toFixed(3) },
      { name: 'p95_lateral', actual: m.p95_lateral_m, limit: th.p95_lateral_max_m, cmp: 'max', fmt: v => v?.toFixed(1) + ' m' },
      { name: 'avg_lateral', actual: m.avg_lateral_m, limit: th.avg_lateral_max_m, cmp: 'max', fmt: v => v?.toFixed(1) + ' m' }
    ];
  }
  if(mode === 'deviation'){
    return [
      { name: 'off_route_within_s', actual: m.first_off_route_sim_s, limit: th.off_route_within_s_max, cmp: 'max', fmt: v => formatSimS(v ?? 0) }
    ];
  }
  return [];
}

export { RUN_MODES };

/**
 * Markdown investigation (R8 / sim D3) для `regression/reports/investigations/`.
 * @param {object} opts
 * @param {string} opts.bundleDate
 * @param {string} opts.fixtureId
 * @param {string} opts.runMode
 * @param {object} opts.result
 * @param {object[]} [opts.ticks]
 * @param {number} [opts.durationS]
 * @param {string} [opts.simUrl]
 * @param {string} [opts.notes]
 */
export function formatInvestigationMarkdown(opts = {}){
  const {
    bundleDate = '—',
    fixtureId = '—',
    runMode = '—',
    result = {},
    ticks = [],
    durationS = 0,
    simUrl = '',
    notes = ''
  } = opts;
  const m = result.metrics || {};
  const live = ticks.length ? summarizeTicks(ticks) : null;
  const ts = new Date().toISOString().slice(0, 10);
  const shortId = String(fixtureId).slice(0, 8);
  const pass = !!result.pass;
  const failAssertions = (result.assertions || []).filter(a => !a.pass);

  const lines = [
    '# Investigation — ' + shortId + ' · ' + runMode,
    '',
    '**Status:** ' + (pass ? 'PASS' : 'FAIL') + ' · **Nightly date:** ' + bundleDate,
    '**Generated:** ' + ts + ' · **Source:** sim.html regression dashboard',
    ''
  ];

  if(simUrl){
    lines.push('## Sim review', '', simUrl, '');
  }

  lines.push('## Assertions', '');
  if(!(result.assertions || []).length){
    lines.push('_Нет данных assertions._', '');
  } else {
    for(const a of result.assertions){
      lines.push('- ' + (a.pass ? '✓' : '✗') + ' `' + a.name + '` — ' + (a.detail || ''));
    }
    lines.push('');
  }

  if(!pass && failAssertions.length){
    lines.push('## Fail summary', '');
    for(const a of failAssertions){
      lines.push('- `' + a.name + '`: ' + (a.detail || ''));
    }
    lines.push('');
  }

  lines.push('## Metrics (result JSON)', '');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  const metricRows = [
    ['p95_lateral_m', m.p95_lateral_m != null ? m.p95_lateral_m.toFixed(1) + ' m' : '—'],
    ['avg_lateral_m', m.avg_lateral_m != null ? m.avg_lateral_m.toFixed(1) + ' m' : '—'],
    ['good_snap_ratio', m.good_snap_ratio != null ? m.good_snap_ratio.toFixed(3) : '—'],
    ['false_reroute_count', m.false_reroute_count ?? '—'],
    ['tick_count', m.tick_count ?? '—'],
    ['first_off_route_sim_s', m.first_off_route_sim_s != null ? formatSimS(m.first_off_route_sim_s) : '—'],
    ['had_lost', m.had_lost ? 'yes' : 'no'],
    ['had_degraded', m.had_degraded ? 'yes' : 'no']
  ];
  for(const [k, v] of metricRows) lines.push('| ' + k + ' | ' + v + ' |');
  lines.push('');

  if(live){
    lines.push('## Tick JSONL (loaded in sim)', '');
    lines.push('| Metric | Value |');
    lines.push('| --- | --- |');
    lines.push('| ticks loaded | ' + live.tick_count + ' |');
    lines.push('| duration sim_s | ' + formatSimS(durationS || (ticks.at(-1)?.sim_s ?? 0)) + ' |');
    lines.push('| good_snap_ratio (live) | ' + (live.good_snap_ratio?.toFixed(3) ?? '—') + ' |');
    lines.push('| p95_lateral (live) | ' + (live.p95_lateral_m?.toFixed(1) ?? '—') + ' m |');
    lines.push('| LOST | ' + (live.had_lost ? 'yes' : 'no') + ' |');
    lines.push('| DEGRADED | ' + (live.had_degraded ? 'yes' : 'no') + ' |');
    lines.push('');
  }

  lines.push('## Artifacts', '');
  lines.push('- `regression/results/' + bundleDate + '/sim/' + fixtureId + '_' + runMode + '.jsonl`');
  lines.push('- `regression/results/' + bundleDate + '/sim/' + fixtureId + '_' + runMode + '.json`');
  lines.push('- `regression/results/' + bundleDate + '/sim/' + fixtureId + '_' + runMode + '.png` (если есть)');
  lines.push('');

  lines.push('## Next steps', '');
  lines.push('- [ ] Воспроизвести в sim (deep link выше)');
  lines.push('- [ ] Scrub timeline → worst lateral / snap LOST');
  lines.push('- [ ] Классификация: `product_bug` / `agent_bug` / `threshold` / `osm`');
  lines.push('- [ ] Сохранить в `regression/reports/investigations/' + ts + '-' + shortId + '.md`');
  lines.push('');

  if(notes?.trim()){
    lines.push('## Notes', '', notes.trim(), '');
  }

  lines.push('---', '_sim D3 · regression-parse_');
  return lines.join('\n');
}

/**
 * Сводка nightly из results[].
 * @param {object} summary
 */
export function summarizeNightly(summary){
  const results = summary?.results || [];
  const pass = results.filter(r => r.pass && !r.skipped).length;
  const fail = results.filter(r => !r.pass && !r.skipped).length;
  return {
    date: summary?.date || '—',
    pass: summary?.pass ?? pass,
    fail: summary?.fail ?? fail,
    total: summary?.total ?? pass + fail,
    results
  };
}

/**
 * Матрица fixture × mode.
 * @param {object[]} results
 */
export function buildMatrix(results){
  const byFixture = new Map();
  for(const r of results){
    if(r.skipped) continue;
    const id = r.fixture_id;
    if(!byFixture.has(id)) byFixture.set(id, { fixtureId: id, cells: {} });
    byFixture.get(id).cells[r.mode] = r;
  }
  return [...byFixture.values()].sort((a, b) => a.fixtureId.localeCompare(b.fixtureId));
}

/**
 * Объединить sim-summary и результаты из папки sim/*.json
 * @param {object|null} summary
 * @param {object[]} folderResults
 */
export function mergeResults(summary, folderResults){
  const map = new Map();
  for(const r of summary?.results || []){
    if(r.skipped) continue;
    map.set(r.fixture_id + ':' + r.mode, r);
  }
  for(const r of folderResults){
    map.set(r.fixture_id + ':' + r.mode, r);
  }
  const results = [...map.values()].sort((a, b) => {
    const c = a.fixture_id.localeCompare(b.fixture_id);
    return c || RUN_MODES.indexOf(a.mode) - RUN_MODES.indexOf(b.mode);
  });
  const pass = results.filter(r => r.pass).length;
  const fail = results.filter(r => !r.pass).length;
  return {
    date: summary?.date || null,
    pass,
    fail,
    skip: summary?.skip || 0,
    total: pass + fail,
    results
  };
}
