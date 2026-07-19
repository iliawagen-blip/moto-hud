/**
 * Юнит-проверки развязок (без браузера).
 * node scripts/interchange-test.mjs
 */
import {
  isSignificantManeuver, isNavManeuverType, refineManeuvers
} from '../js/maneuver-filter.js';
import {
  detectPathDiverge, syntheticDivergeStep, interchangeVoiceText, isInterchangeStep
} from '../js/interchange.js';

function assert(cond, msg){
  if(!cond) throw new Error(msg);
}

// A: slight off ramp с нормальным углом — значим
const rampOk = {
  step: { type: 'off ramp', modifier: 'slight right', bearing_before: 10, bearing_after: 32 },
  s: 100, angle: 22
};
assert(isNavManeuverType(rampOk.step), 'ramp is nav');
assert(isSignificantManeuver(rampOk), 'slight ramp ≥18° significant');
assert(interchangeVoiceText(rampOk.step).includes('Съезд'), 'voice съезд');

// A: slight off ramp 10° — Варшавка «прямо», не съезд
const rampTiny = {
  step: { type: 'off ramp', modifier: 'slight right', bearing_before: 0, bearing_after: 10 },
  s: 100, angle: 10
};
assert(!isSignificantManeuver(rampTiny), 'slight ramp 10° not significant');

// A: fork slight 6° — не «держитесь»
const forkTiny = {
  step: { type: 'fork', modifier: 'slight right', bearing_before: 0, bearing_after: 6 },
  s: 50, angle: 6
};
assert(!isSignificantManeuver(forkTiny), 'fork slight 6° not significant');

// A: fork straight not significant
const forkStr = {
  step: { type: 'fork', modifier: 'straight', bearing_before: 0, bearing_after: 2 },
  s: 50, angle: 2
};
assert(!isSignificantManeuver(forkStr), 'fork straight not significant');

// A: refine does not collapse real ramp
const refined = refineManeuvers([
  { step: { type: 'off ramp', modifier: 'slight right', bearing_before: 0, bearing_after: 22, distance: 10 }, s: 100 },
  { step: { type: 'new name', modifier: 'straight', bearing_before: 0, bearing_after: 0, distance: 5 }, s: 120 }
]);
assert(refined.some(m => m.step.type === 'off ramp'), 'ramp kept in refine');

// B: path diverge — polyline turns right (явный съезд)
function makeGeom(points){
  const n = points.length;
  const lat = points.map(p => p.lat);
  const lon = points.map(p => p.lon);
  const s = [0];
  for(let i = 1; i < n; i++){
    const dLat = (lat[i] - lat[i - 1]) * 111320;
    const dLon = (lon[i] - lon[i - 1]) * 111320 * Math.cos(lat[i] * Math.PI / 180);
    s.push(s[i - 1] + Math.hypot(dLat, dLon));
  }
  return { n, lat, lon, s };
}

const origin = { lat: 55.75, lon: 37.60 };
const pts = [];
for(let i = 0; i <= 30; i++){
  const along = i * 40;
  let east = 0;
  // Явный съезд: lateral≥55 м и поворот азимута ≥20°
  if(along > 100) east = Math.min(120, (along - 100) * 0.55);
  pts.push({
    lat: origin.lat + along / 111320,
    lon: origin.lon + east / (111320 * Math.cos(origin.lat * Math.PI / 180))
  });
}
const geom = makeGeom(pts);
const div = detectPathDiverge(geom, 0);
assert(div, 'path diverge detected');
assert(div.side === 'right', 'diverge side right, got ' + div.side);
assert(div.distM >= 80 && div.distM <= 800, 'dist in window');
const syn = syntheticDivergeStep(div);
assert(isInterchangeStep(syn) && syn._synthetic === 'path_diverge', 'synthetic step');

// B: пологая дуга без смены азимута — не diverge
const arc = [];
for(let i = 0; i <= 40; i++){
  const along = i * 30;
  const east = along * along * 0.00008; // очень полого
  arc.push({
    lat: origin.lat + along / 111320,
    lon: origin.lon + east / (111320 * Math.cos(origin.lat * Math.PI / 180))
  });
}
const soft = detectPathDiverge(makeGeom(arc), 0);
assert(!soft, 'gentle arc must not path-diverge');

console.log('interchange-test OK', {
  voice: interchangeVoiceText(rampOk.step),
  diverge: { side: div.side, distM: div.distM }
});
