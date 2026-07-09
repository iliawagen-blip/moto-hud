/**
 * Сравнение маршрутов: lateral deviation, Hausdorff, агрегаты.
 * Полилинии — массив [lat, lon].
 */
import { point, lineString } from '@turf/helpers';
import pointToLineDistance from '@turf/point-to-line-distance';
import { haversine } from './geo.mjs';

const SAMPLE_STEP_M = 50;
const MAX_POLYLINE_POINTS = 500;

/** Равномерное прореживание до maxPoints вершин. */
function capPolyline(polyline, maxPoints = MAX_POLYLINE_POINTS){
  if(!polyline?.length || polyline.length <= maxPoints) return polyline;
  const out = [];
  const step = (polyline.length - 1) / (maxPoints - 1);
  for(let i = 0; i < maxPoints; i++){
    out.push(polyline[Math.round(i * step)]);
  }
  return out;
}

function prepPolyline(polyline){
  return samplePolyline(capPolyline(polyline));
}

function bearingDeg(a, b){
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function angleDiffDeg(a, b){
  let d = Math.abs(a - b) % 360;
  if(d > 180) d = 360 - d;
  return d;
}

/** Уплотнение polyline с шагом ~stepM по дуге. */
export function samplePolyline(polyline, stepM = SAMPLE_STEP_M){
  if(!polyline?.length) return [];
  if(polyline.length === 1) return [{ lat: polyline[0][0], lon: polyline[0][1] }];
  const out = [{ lat: polyline[0][0], lon: polyline[0][1] }];
  let acc = 0;
  for(let i = 1; i < polyline.length; i++){
    const prev = { lat: polyline[i - 1][0], lon: polyline[i - 1][1] };
    const cur = { lat: polyline[i][0], lon: polyline[i][1] };
    const seg = haversine(prev, cur);
    if(seg < 1e-3) continue;
    acc += seg;
    while(acc >= stepM){
      const t = 1 - (acc - stepM) / seg;
      out.push({
        lat: prev.lat + t * (cur.lat - prev.lat),
        lon: prev.lon + t * (cur.lon - prev.lon)
      });
      acc -= stepM;
    }
  }
  const last = polyline[polyline.length - 1];
  const tail = { lat: last[0], lon: last[1] };
  const end = out[out.length - 1];
  if(haversine(end, tail) > 5) out.push(tail);
  return out;
}

function toTurfLine(polyline){
  return lineString(polyline.map(([lat, lon]) => [lon, lat]));
}

/** Расстояния от точек A до линии B, м. */
export function lateralDeviationsM(pointsA, polylineB){
  if(!pointsA.length || !polylineB?.length) return [];
  const line = toTurfLine(polylineB);
  return pointsA.map(p => {
    const pt = point([p.lon, p.lat]);
    return pointToLineDistance(pt, line, { units: 'kilometers' }) * 1000;
  });
}

function stats(values){
  if(!values.length){
    return { avg: null, p50: null, p95: null, max: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const pct = p => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[idx];
  };
  return {
    avg: sum / sorted.length,
    p50: pct(50),
    p95: pct(95),
    max: sorted[sorted.length - 1]
  };
}

function hausdorffM(polyA, polyB){
  const sa = prepPolyline(polyA);
  const sb = prepPolyline(polyB);
  const la = lateralDeviationsM(sa, capPolyline(polyB));
  const lb = lateralDeviationsM(sb, capPolyline(polyA));
  const all = [...la, ...lb];
  return all.length ? Math.max(...all) : null;
}

function directionMismatchRatio(polyA, polyB){
  const sa = prepPolyline(polyA);
  const sb = prepPolyline(polyB);
  const n = Math.min(sa.length, sb.length);
  if(n < 2) return null;
  let mismatch = 0;
  let total = 0;
  for(let i = 1; i < n; i++){
    const bA = bearingDeg(sa[i - 1], sa[i]);
    const bB = bearingDeg(sb[i - 1], sb[i]);
    if(angleDiffDeg(bA, bB) > 45) mismatch++;
    total++;
  }
  return total ? mismatch / total : null;
}

function waypointDeviationsM(waypoints, polyline){
  if(!waypoints?.length || !polyline?.length) return null;
  const line = toTurfLine(polyline);
  return waypoints.map(wp => {
    const pt = point([wp.lon, wp.lat]);
    return pointToLineDistance(pt, line, { units: 'kilometers' }) * 1000;
  });
}

function lengthDiffPct(distA, distB){
  if(distA == null || distB == null || distA <= 0) return null;
  return Math.abs(distA - distB) / distA * 100;
}

function durationDiffPct(durA, durB){
  if(durA == null || durB == null || durA <= 0) return null;
  return Math.abs(durA - durB) / durA * 100;
}

/**
 * Попарные метрики двух маршрутов.
 * @param {object} opts
 * @param {number[][]} opts.polylineA
 * @param {number[][]} opts.polylineB
 * @param {number|null} [opts.distanceA_m]
 * @param {number|null} [opts.distanceB_m]
 * @param {number|null} [opts.durationA_s]
 * @param {number|null} [opts.durationB_s]
 * @param {number|null} [opts.maneuverA]
 * @param {number|null} [opts.maneuverB]
 * @param {number|null} [opts.roundaboutA]
 * @param {number|null} [opts.roundaboutB]
 * @param {Array<{lat:number,lon:number}>|null} [opts.waypoints]
 */
export function compareRoutes(opts){
  const {
    polylineA, polylineB,
    distanceA_m, distanceB_m,
    durationA_s, durationB_s,
    maneuverA, maneuverB,
    roundaboutA, roundaboutB,
    waypoints
  } = opts;

  if(!polylineA?.length || !polylineB?.length) return null;

  const capA = capPolyline(polylineA);
  const capB = capPolyline(polylineB);
  const sampled = prepPolyline(capA);
  const laterals = lateralDeviationsM(sampled, capB);
  const latStats = stats(laterals);

  return {
    hausdorff_m: hausdorffM(capA, capB),
    avg_lateral_m: latStats.avg,
    p50_lateral_m: latStats.p50,
    p95_lateral_m: latStats.p95,
    max_lateral_m: latStats.max,
    length_diff_pct: lengthDiffPct(distanceA_m, distanceB_m),
    duration_diff_pct: durationDiffPct(durationA_s, durationB_s),
    maneuver_count_diff: (maneuverA != null && maneuverB != null) ? maneuverA - maneuverB : null,
    roundabout_count_diff: (roundaboutA != null && roundaboutB != null) ? roundaboutA - roundaboutB : null,
    direction_mismatch_ratio: directionMismatchRatio(capA, capB),
    waypoint_deviations_m: waypointDeviationsM(waypoints, capB)
  };
}
