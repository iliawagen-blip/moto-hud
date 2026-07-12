/**
 * Сравнение полевой телеметрии и regression tick JSONL (T7 / D5).
 * Общая метрика через assertions-shared.summarizeTicks.
 */
import { summarizeTicks, DEFAULT_THRESHOLDS } from './assertions-shared.mjs';

/**
 * @param {object[]} nav
 * @param {number} t
 */
function offRouteAt(nav, t){
  let state = 'ON_ROUTE';
  for(const e of nav || []){
    if((e.t || 0) > t) break;
    if(e.sub === 'offroute_state' && e.to) state = e.to;
  }
  return state;
}

/**
 * Полевые snap → общий tick-формат (lateral_m, snap_quality, dist_m).
 * @param {ReturnType<import('../telemetry-parse.mjs').parseTelemetryJsonl>} parsed
 */
export function fieldSnapsToCommonTicks(parsed){
  const snaps = parsed?.snaps || [];
  const nav = parsed?.nav || [];
  return snaps.map(s => ({
    lateral_m: s.lat_off,
    snap_quality: s.quality,
    dist_m: s.s0,
    off_route_state: offRouteAt(nav, s.t || 0)
  }));
}

/**
 * @param {ReturnType<import('../telemetry-parse.mjs').parseTelemetryJsonl>} parsed
 */
export function summarizeFieldNav(parsed){
  const ticks = fieldSnapsToCommonTicks(parsed);
  if(!ticks.length) return null;
  return summarizeTicks(ticks);
}

/**
 * @param {object[]} fieldTicks common ticks
 * @param {object[]} regTicks regression ticks
 * @param {number} bucketM
 */
export function buildDistBucketCompare(fieldTicks, regTicks, bucketM = 100){
  const fDist = (fieldTicks || []).filter(t => t.dist_m != null && Number.isFinite(t.dist_m));
  const rDist = (regTicks || []).filter(t => t.dist_m != null && Number.isFinite(t.dist_m));
  if(!fDist.length || !rDist.length){
    return { ok: false, reason: 'no_dist_m', field_n: fDist.length, reg_n: rDist.length };
  }
  const fMin = Math.min(...fDist.map(t => t.dist_m));
  const fMax = Math.max(...fDist.map(t => t.dist_m));
  const rMin = Math.min(...rDist.map(t => t.dist_m));
  const rMax = Math.max(...rDist.map(t => t.dist_m));
  const minD = Math.max(fMin, rMin);
  const maxD = Math.min(fMax, rMax);
  if(maxD <= minD){
    return { ok: false, reason: 'no_overlap', field_range: [fMin, fMax], reg_range: [rMin, rMax] };
  }

  function avgLat(arr){
    const v = arr.map(t => t.lateral_m).filter(x => x != null && Number.isFinite(x) && x <= 300);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }

  /** @type {{ dist_m: number, field_n: number, reg_n: number, field_avg_lat: number|null, reg_avg_lat: number|null }[]} */
  const buckets = [];
  for(let d = minD; d < maxD; d += bucketM){
    const d1 = d + bucketM;
    const fIn = fDist.filter(t => t.dist_m >= d && t.dist_m < d1);
    const rIn = rDist.filter(t => t.dist_m >= d && t.dist_m < d1);
    if(!fIn.length && !rIn.length) continue;
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

/**
 * @param {ReturnType<import('../telemetry-parse.mjs').parseTelemetryJsonl>} fieldParsed
 * @param {object[]} regTicks
 * @param {{ fieldLabel?: string, regressionLabel?: string, bucketM?: number }} [opts]
 */
export function compareFieldRegression(fieldParsed, regTicks, opts = {}){
  const fieldTicks = fieldSnapsToCommonTicks(fieldParsed);
  const field = summarizeFieldNav(fieldParsed);
  const regression = summarizeTicks(regTicks || []);
  if(!field?.tick_count){
    return { ok: false, error: 'Нет snap в полевой телеметрии' };
  }
  if(!regression?.tick_count){
    return { ok: false, error: 'Нет regression ticks' };
  }

  const deltas = {};
  for(const key of ['avg_lateral_m', 'p95_lateral_m', 'good_snap_ratio', 'false_reroute_count']){
    const fv = field[key];
    const rv = regression[key];
    if(fv == null && rv == null) continue;
    deltas[key] = {
      field: fv,
      regression: rv,
      delta: fv != null && rv != null ? fv - rv : null
    };
  }

  const distCompare = buildDistBucketCompare(fieldTicks, regTicks, opts.bucketM ?? 100);

  return {
    ok: true,
    fieldLabel: opts.fieldLabel || 'field',
    regressionLabel: opts.regressionLabel || 'regression',
    field,
    regression,
    deltas,
    distCompare,
    thresholds: DEFAULT_THRESHOLDS
  };
}

/**
 * @param {ReturnType<compareFieldRegression>} result
 */
export function formatCompareMarkdown(result){
  if(!result?.ok) return '# Compare\n\n' + (result.error || 'нет данных') + '\n';
  const f = result.field;
  const r = result.regression;
  const lines = [
    '# Field vs Regression compare',
    '',
    '**Field:** ' + result.fieldLabel,
    '**Regression:** ' + result.regressionLabel,
    '',
    '## Metrics',
    '',
    '| Metric | Field | Regression | Δ |',
    '| --- | --- | --- | --- |'
  ];
  for(const [key, d] of Object.entries(result.deltas || {})){
    const fmt = key === 'good_snap_ratio'
      ? v => v?.toFixed(3) ?? '—'
      : key === 'false_reroute_count'
        ? v => String(v ?? '—')
        : v => v != null ? v.toFixed(1) + ' m' : '—';
    lines.push('| ' + key + ' | ' + fmt(d.field) + ' | ' + fmt(d.regression) + ' | ' +
      (d.delta != null ? (key === 'good_snap_ratio' ? d.delta.toFixed(3) : d.delta.toFixed(1)) : '—') + ' |');
  }
  lines.push('');

  const dc = result.distCompare;
  if(dc?.ok && dc.buckets?.length){
    lines.push('## Lateral by route distance (bucket ' + dc.bucketM + ' m)', '');
    lines.push('| dist_m | field avg lat | reg avg lat | field n | reg n |');
    lines.push('| --- | --- | --- | --- | --- |');
    for(const b of dc.buckets.slice(0, 80)){
      lines.push('| ' + b.dist_m + ' | ' +
        (b.field_avg_lat?.toFixed(1) ?? '—') + ' | ' +
        (b.reg_avg_lat?.toFixed(1) ?? '—') + ' | ' +
        b.field_n + ' | ' + b.reg_n + ' |');
    }
    lines.push('');
  } else if(dc && !dc.ok){
    lines.push('## Distance alignment', '', '_Нет перекрытия dist_m/s0: ' + (dc.reason || '') + '_', '');
  }

  lines.push('---', '_tick-compare · D5_');
  return lines.join('\n');
}
