/**
 * Топливное планирование сегментов: оценка и жадные заправки по OSM.
 * @module trip-fuel
 */
import { auditSegment, parseRtext } from './trip-model.js';
import { rangeKm, fuelLitersForKm, getActiveBikeProfile } from './bike-profile.js';
import { fetchFuelStationsForBBox } from './fuel.js';
import { haversine, distToSegment } from './geo.js';
import { FUEL_CORRIDOR } from './state.js';

const SPARSE_REGIONS = new Set(['north', 'caucasus', 'siberia', 'far_east', 'altai', 'karelia']);
const OVERPASS_CACHE_MS = 10 * 60 * 1000;
const _bboxCache = new Map();

function consumption(profile, roadType){
  const c = profile?.consumptionL100;
  if(!c) return 5.5;
  const key = roadType && c[roadType] != null ? roadType : 'default';
  return c[key] ?? c.default ?? 5.5;
}

function reserveLiters(profile){
  return (profile.reserveKm || 0) * consumption(profile) / 100;
}

/** @param {object} station @param {string} fuelType */
export function stationMatchesFuelType(station, fuelType){
  const t = station?.tags || {};
  if(t['fuel:none'] === 'yes') return false;
  const ft = String(fuelType || '95').toLowerCase();
  const map = {
    '92': ['fuel:octane_92', 'fuel:octane_91'],
    '95': ['fuel:octane_95', 'fuel:gasoline'],
    '98': ['fuel:octane_98', 'fuel:octane_100'],
    'dt': ['fuel:diesel', 'fuel:HGV_diesel'],
    'diesel': ['fuel:diesel']
  };
  const want = map[ft] || map['95'];
  const hasFuelTag = Object.keys(t).some(k => k.startsWith('fuel:'));
  if(!hasFuelTag) return true;
  return want.some(k => t[k] === 'yes');
}

function bboxFromPoints(points, bufDeg = 0.08){
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for(const p of points){
    if(p.lat < minLat) minLat = p.lat;
    if(p.lat > maxLat) maxLat = p.lat;
    if(p.lon < minLon) minLon = p.lon;
    if(p.lon > maxLon) maxLon = p.lon;
  }
  return [minLat - bufDeg, minLon - bufDeg, maxLat + bufDeg, maxLon + bufDeg];
}

async function loadStationsForPoints(points){
  const bb = bboxFromPoints(points);
  const key = bb.map(v => v.toFixed(3)).join(',');
  const hit = _bboxCache.get(key);
  if(hit && Date.now() - hit.ts < OVERPASS_CACHE_MS) return hit.stations;
  const stations = await fetchFuelStationsForBBox(bb[0], bb[1], bb[2], bb[3]);
  _bboxCache.set(key, { ts: Date.now(), stations });
  return stations;
}

/** Полилиния waypoints с накопленной дистанцией, м. */
export function buildRoutePolyline(rtext){
  const pts = parseRtext(rtext);
  if(pts.length < 2) return { verts: [], totalM: 0, totalKm: 0 };
  const verts = [{ ...pts[0], s: 0 }];
  let s = 0;
  for(let i = 1; i < pts.length; i++){
    s += haversine(pts[i - 1], pts[i]);
    verts.push({ ...pts[i], s });
  }
  return { verts, totalM: s, totalKm: s / 1000 };
}

/** Проекция точки на полилинию: s (м), lateral (м). */
export function projectToPolyline(poly, point){
  const verts = poly.verts;
  if(verts.length < 2) return { routeM: 0, lateralM: Infinity };
  let bestS = 0;
  let bestLat = Infinity;
  for(let i = 0; i < verts.length - 1; i++){
    const a = verts[i];
    const b = verts[i + 1];
    const segLen = haversine(a, b) || 1;
    const latM = distToSegment(point, a, b);
    const r = Math.PI / 180;
    const ax = a.lon * r * Math.cos(a.lat * r), ay = a.lat * r;
    const bx = b.lon * r * Math.cos(b.lat * r), by = b.lat * r;
    const px = point.lon * r * Math.cos(point.lat * r), py = point.lat * r;
    const dx = bx - ax, dy = by - ay;
    let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1);
    t = Math.max(0, Math.min(1, t));
    const sHere = a.s + t * segLen;
    if(latM < bestLat){
      bestLat = latM;
      bestS = sHere;
    }
  }
  return { routeM: bestS, lateralM: bestLat, routeKm: bestS / 1000 };
}

function sparseReachFactor(regionHint){
  if(!regionHint) return 1;
  const r = String(regionHint).toLowerCase();
  if(SPARSE_REGIONS.has(r)) return 0.72;
  return 1;
}

/**
 * Жадный план заправок по OSM вдоль waypoints сегмента.
 * @returns {Promise<{ stops: object[], warnings: string[], method: string, computedAt: string }>}
 */
export async function planGreedyFuelStops(segment, profile, opts = {}){
  const p = profile || getActiveBikeProfile();
  if(!p || !segment?.rtext) return null;
  const road = opts.roadType || segment.roadMix || 'default';
  const poly = buildRoutePolyline(segment.rtext);
  if(poly.totalM < 500) return { stops: [], warnings: [], method: 'greedy-osm', computedAt: new Date().toISOString() };

  const allStations = await loadStationsForPoints(poly.verts);
  const fuelType = p.fuelType || '95';
  const stations = allStations.filter(st => stationMatchesFuelType(st, fuelType));

  const l100 = consumption(p, road);
  const consumePerM = l100 / 100000;
  const reserveL = reserveLiters(p);
  const reachFactor = sparseReachFactor(opts.regionHint || opts.trip?.meta?.regionHint);
  const maxRangeM = rangeKm(p, road) * 1000 * reachFactor;

  let posM = 0;
  let fuelL = p.tankLiters;
  const stops = [];
  const warnings = [];
  const corridorM = FUEL_CORRIDOR;

  while(posM < poly.totalM - 200){
    const fuelBudgetM = Math.max(0, (fuelL - reserveL) / consumePerM);
    const reachableM = posM + Math.min(fuelBudgetM, maxRangeM);

    if(reachableM >= poly.totalM - 300) break;

    const candidates = stations
      .map(st => {
        const proj = projectToPolyline(poly, st);
        return { st, ...proj };
      })
      .filter(x => x.lateralM <= corridorM && x.routeM > posM + 400 && x.routeM <= reachableM)
      .sort((a, b) => b.routeM - a.routeM);

    if(!candidates.length){
      const fromKm = Math.round(posM / 1000);
      const toKm = Math.round(reachableM / 1000);
      warnings.push(`Нет АЗС АИ-${fuelType} на ~${fromKm}–${toKm} км`);
      if(fuelL <= reserveL + 0.5) break;
      posM = reachableM;
      fuelL = reserveL;
      continue;
    }

    const pick = candidates[0];
    const legM = pick.routeM - posM;
    fuelL -= legM * consumePerM;
    stops.push({
      osmId: pick.st.osmId,
      lat: pick.st.lat,
      lon: pick.st.lon,
      brand: pick.st.brand,
      name: pick.st.name,
      routeKm: Math.round(pick.routeKm * 10) / 10,
      fuelType
    });
    posM = pick.routeM;
    fuelL = p.tankLiters;
  }

  const needKm = poly.totalKm;
  const range = rangeKm(p, road);
  if(needKm > range && !stops.length){
    warnings.push(`Сегмент ~${Math.round(needKm)} км длиннее запаса ~${Math.round(range)} км — заправок не найдено`);
  }

  return {
    stops,
    warnings: [...new Set(warnings)],
    method: 'greedy-osm',
    computedAt: new Date().toISOString(),
    stationCount: stations.length
  };
}

/** Расчёт и запись fuelPlan в сегмент. */
export async function computeSegmentFuelPlan(segment, profile, opts){
  const plan = await planGreedyFuelStops(segment, profile, opts);
  if(plan) segment.fuelPlan = plan;
  return plan;
}

/**
 * @param {{ rtext: string, plannedKm?: number, roadMix?: string, fuelPlan?: object }} segment
 */
export function assessSegmentFuel(segment, profile, roadType){
  const p = profile || getActiveBikeProfile();
  if(!p || !segment?.rtext) return null;
  const road = roadType || segment.roadMix || 'default';
  const km = segment.plannedKm != null ? segment.plannedKm : auditSegment(segment.rtext).km;
  const range = rangeKm(p, road);
  const liters = fuelLitersForKm(km, p, road);
  const exceeds = km > range;
  const tight = !exceeds && km > range * 0.85;
  let level = 'ok';
  if(exceeds) level = 'danger';
  else if(tight) level = 'warn';
  let warning = null;
  if(exceeds) warning = `~${Math.round(km)} км > запас ~${Math.round(range)} км — нужна заправка`;
  else if(tight) warning = `Близко к пределу бака (~${Math.round(range)} км)`;
  const fp = segment.fuelPlan;
  if(fp?.warnings?.length) warning = (warning ? warning + '; ' : '') + fp.warnings[0];
  return {
    km: Math.round(km * 10) / 10,
    liters: Math.round(liters * 10) / 10,
    rangeKm: Math.round(range),
    exceeds,
    tight,
    level,
    warning,
    fuelType: p.fuelType,
    stopCount: fp?.stops?.length || 0
  };
}

export function formatFuelHint(assessment){
  if(!assessment) return '';
  let s = `⛽ ~${assessment.liters} л · запас ${assessment.rangeKm} км`;
  if(assessment.stopCount) s += ` · ${assessment.stopCount} запр.`;
  if(assessment.warning) s += ' · ⚠ ' + assessment.warning;
  return s;
}

export function formatFuelPlanStops(fuelPlan){
  if(!fuelPlan?.stops?.length) return '';
  return fuelPlan.stops.map((st, i) =>
    `${i + 1}. ${st.brand || st.name} · ~${st.routeKm} км`
  ).join('\n');
}

export function formatFuelPlanHtml(fuelPlan){
  if(!fuelPlan) return '';
  const lines = [];
  if(fuelPlan.stops?.length){
    lines.push('<ul class="trip-fuel-stops">' +
      fuelPlan.stops.map(st =>
        `<li>${st.brand || st.name} · ~${st.routeKm} км</li>`
      ).join('') + '</ul>');
  }
  if(fuelPlan.warnings?.length){
    lines.push('<p class="trip-fuel-warn">⚠ ' + fuelPlan.warnings.join('; ') + '</p>');
  }
  return lines.join('');
}

export function assessDayFuel(day, variantId, profile){
  const v = day?.variants?.find(x => x.id === variantId) || day?.variants?.[0];
  if(!v?.segments?.length) return null;
  let totalKm = 0;
  let totalLiters = 0;
  let totalStops = 0;
  let worst = 'ok';
  const warnings = [];
  for(const seg of v.segments){
    const a = assessSegmentFuel(seg, profile);
    if(!a) continue;
    totalKm += a.km;
    totalLiters += a.liters;
    totalStops += a.stopCount || 0;
    if(a.level === 'danger') worst = 'danger';
    else if(a.level === 'warn' && worst !== 'danger') worst = 'warn';
    if(a.warning) warnings.push(a.warning);
  }
  const p = profile || getActiveBikeProfile();
  const range = p ? rangeKm(p) : 0;
  return {
    totalKm: Math.round(totalKm),
    totalLiters: Math.round(totalLiters * 10) / 10,
    rangeKm: range,
    stopCount: totalStops,
    level: totalKm > range ? 'danger' : (totalKm > range * 0.85 ? 'warn' : worst),
    warnings: [...new Set(warnings)]
  };
}

/** Пакетный расчёт fuelPlan для всех сегментов плана. */
export async function computeTripFuelPlans(trip, profile, onProgress){
  const p = profile || getActiveBikeProfile();
  if(!p || !trip?.days?.length) return 0;
  let n = 0;
  for(const day of trip.days){
    for(const v of day.variants || []){
      for(const seg of v.segments || []){
        if(onProgress) onProgress(day.n, seg.label);
        await computeSegmentFuelPlan(seg, p, { trip, regionHint: trip.meta?.regionHint });
        n++;
      }
    }
  }
  return n;
}
