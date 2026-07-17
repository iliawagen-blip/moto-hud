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

// A: slight off ramp significant
const ramp = {
  step: { type: 'off ramp', modifier: 'slight right', bearing_before: 10, bearing_after: 25 },
  s: 100, angle: 15
};
assert(isNavManeuverType(ramp.step), 'ramp is nav');
assert(isSignificantManeuver(ramp), 'slight ramp significant');
assert(interchangeVoiceText(ramp.step).includes('Съезд'), 'voice съезд');

// A: fork straight not significant
const forkStr = {
  step: { type: 'fork', modifier: 'straight', bearing_before: 0, bearing_after: 2 },
  s: 50, angle: 2
};
assert(isNavManeuverType(forkStr.step) === false || !isSignificantManeuver(forkStr),
  'fork straight not significant');

// A: refine does not collapse ramp
const refined = refineManeuvers([
  { step: { type: 'off ramp', modifier: 'slight right', bearing_before: 0, bearing_after: 18, distance: 10 }, s: 100 },
  { step: { type: 'new name', modifier: 'straight', bearing_before: 0, bearing_after: 0, distance: 5 }, s: 120 }
]);
assert(refined.some(m => m.step.type === 'off ramp'), 'ramp kept in refine');

// B: path diverge — polyline turns right
function makeGeom(points){
  // points: [{lat,lon},...] → geom with s cumulative
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

// Start northbound, then peel east (right)
const origin = { lat: 55.75, lon: 37.60 };
const pts = [];
for(let i = 0; i <= 30; i++){
  const along = i * 40; // m north
  let east = 0;
  if(along > 120) east = Math.min(80, (along - 120) * 0.35);
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

console.log('interchange-test OK', {
  voice: interchangeVoiceText(ramp.step),
  diverge: { side: div.side, distM: div.distM }
});
