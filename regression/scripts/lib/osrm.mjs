/**
 * OSRM fetch — те же параметры, что js/router.js (прод Мото ИЛС).
 */
import { getOsrmEndpoint } from './env.mjs';

/**
 * @param {Array<{lat:number,lon:number,label?:string}>} waypoints
 */
export function buildOsrmUrl(waypoints){
  const base = getOsrmEndpoint();
  const coordStr = waypoints.map(p => `${p.lon},${p.lat}`).join(';');
  return `${base}/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=true&annotations=speed`;
}

/**
 * @param {Array<{lat:number,lon:number}>} waypoints
 * @returns {Promise<{ ok: boolean, route?: object, error?: string }>}
 */
export async function fetchOsrmRoute(waypoints){
  const url = buildOsrmUrl(waypoints);
  try{
    const res = await fetch(url);
    if(res.status === 429) return { ok: false, error: 'rate_limit_429' };
    if(!res.ok) return { ok: false, error: `http_${res.status}` };
    const json = await res.json();
    if(json.code !== 'Ok' || !json.routes?.[0]){
      return { ok: false, error: json.message || json.code || 'no_route' };
    }
    return { ok: true, route: json.routes[0], raw: json };
  }catch(e){
    return { ok: false, error: String(e.message || e) };
  }
}

/** GeoJSON coordinates [lon,lat] → polyline [[lat,lon]]. */
export function geoJsonToPolyline(geometry){
  const coords = geometry?.coordinates;
  if(!coords?.length) return [];
  return coords.map(([lon, lat]) => [lat, lon]);
}

export function parseOsrmRoute(route){
  const polyline = geoJsonToPolyline(route.geometry);
  const steps = [];
  for(const leg of route.legs || []){
    for(const step of leg.steps || []) steps.push(step);
  }
  return {
    polyline,
    distance_m: Math.round(route.distance ?? 0),
    duration_s: Math.round(route.duration ?? 0),
    step_count: steps.length,
    steps
  };
}
