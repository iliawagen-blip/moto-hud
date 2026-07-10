/**
 * Пороги CI для sim-прогона.
 */

function pct(sorted, p){
  if(!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}

export function summarizeTicks(ticks){
  const laterals = ticks.map(t => t.lateral_m)
    .filter(v => v != null && Number.isFinite(v) && v <= 300);
  const sorted = [...laterals].sort((a, b) => a - b);
  const goodLateral = ticks.filter(t => t.lateral_m != null && t.lateral_m <= 25 && t.snap_quality !== 'LOST').length;
  const goodSnap = ticks.filter(t => t.snap_quality === 'GOOD').length;
  const good = Math.max(goodLateral, goodSnap);
  const total = ticks.length || 1;
  const reroutes = ticks.filter((t, i) => {
    if(i === 0) return false;
    const prev = ticks[i - 1].off_route_state;
    const cur = t.off_route_state;
    return prev === 'ON_ROUTE' && (cur === 'REROUTING' || cur === 'OFFLINE_GUIDE' || cur === 'SUSPECT');
  }).length;

  return {
    tick_count: ticks.length,
    avg_lateral_m: laterals.length ? laterals.reduce((a, b) => a + b, 0) / laterals.length : null,
    p95_lateral_m: pct(sorted, 95),
    good_snap_ratio: good / total,
    false_reroute_count: reroutes,
    off_route_triggered: ticks.some(t => t.off_route_state && t.off_route_state !== 'ON_ROUTE'),
    first_off_route_sim_s: (() => {
      const hit = ticks.find(t => t.off_route_state && t.off_route_state !== 'ON_ROUTE');
      return hit?.sim_s ?? null;
    })(),
    had_lost: ticks.some(t => t.snap_quality === 'LOST'),
    had_degraded: ticks.some(t => t.snap_quality === 'DEGRADED'),
    recovered_good: (() => {
      let lost = false;
      for(const t of ticks){
        if(t.snap_quality === 'LOST' || t.snap_quality === 'DEGRADED') lost = true;
        if(lost && t.snap_quality === 'GOOD') return true;
      }
      return false;
    })(),
    recovered_after_stress: (() => {
      const tail = ticks.filter(t => (t.sim_s ?? 0) >= 50);
      return tail.some(t => t.lateral_m != null && t.lateral_m <= 25);
    })()
  };
}

export function evaluateMode(mode, metrics, thresholds, crash){
  const assertions = [];
  const push = (name, pass, detail) => assertions.push({ name, pass, detail });

  if(crash){
    push('no_crash', false, crash);
    return { pass: false, assertions };
  }

  if(mode === 'on_route'){
    const th = thresholds.on_route;
    push('avg_lateral', metrics.avg_lateral_m == null || metrics.avg_lateral_m <= th.avg_lateral_max_m,
      `avg=${metrics.avg_lateral_m?.toFixed(1)} max=${th.avg_lateral_max_m}`);
    push('p95_lateral', metrics.p95_lateral_m == null || metrics.p95_lateral_m <= th.p95_lateral_max_m,
      `p95=${metrics.p95_lateral_m?.toFixed(1)} max=${th.p95_lateral_max_m}`);
    push('good_snap_ratio', metrics.good_snap_ratio >= th.good_snap_ratio_min,
      `ratio=${metrics.good_snap_ratio?.toFixed(3)} min=${th.good_snap_ratio_min}`);
    push('false_reroute', metrics.false_reroute_count <= th.false_reroute_max,
      `count=${metrics.false_reroute_count} max=${th.false_reroute_max}`);
  }

  if(mode === 'deviation'){
    const maxS = thresholds.deviation.off_route_within_s_max;
    const triggered = metrics.off_route_triggered;
    const within = metrics.first_off_route_sim_s != null && metrics.first_off_route_sim_s <= maxS;
    push('off_route_trigger', triggered, triggered ? `at ${metrics.first_off_route_sim_s}s sim` : 'never');
    push('off_route_within_s', !triggered || within, `need <=${maxS}s sim`);
  }

  if(mode === 'noise_stress'){
    const th = thresholds.noise_stress;
    push('no_crash', th.must_not_crash, 'ok');
    push('degraded_or_lost', metrics.had_lost || metrics.had_degraded, 'quality dropped');
    if(th.must_recover){
      push('recover', metrics.recovered_after_stress || metrics.recovered_good, 'lateral/snap ok after stress');
    }
  }

  const pass = assertions.every(a => a.pass);
  return { pass, assertions };
}
