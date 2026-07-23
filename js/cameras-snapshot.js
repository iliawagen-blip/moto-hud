/**
 * Снапшот камер OSM по регионам + фильтр коридором маршрута.
 * data/regions/{id}/cameras.json (+ legacy data/cameras-moscow.json).
 */
import { haversine, distToSegment } from './geo.js';
import {
  loadMergedLayer,
  loadRegionLayer,
  pointInBbox,
  routeIntersectsBbox
} from './osm-regions.js';

/** Bbox Москвы ≈ внутри МКАД + запас (legacy / fallback) */
export const MOSCOW_CAM_BBOX = {
  south: 55.55,
  west: 37.35,
  north: 55.95,
  east: 37.85
};

export const CAMERAS_SNAPSHOT_PATH = 'data/cameras-moscow.json';

export { pointInBbox, routeIntersectsBbox };

/** Точки вдоль маршрута */
function sampleRoutePoints(coords, stepM = 600){
  if(!coords?.length) return [];
  const pts = [{ lat: coords[0][0], lon: coords[0][1] }];
  let acc = 0;
  for(let i = 1; i < coords.length; i++){
    const a = { lat: coords[i - 1][0], lon: coords[i - 1][1] };
    const b = { lat: coords[i][0], lon: coords[i][1] };
    acc += haversine(a, b);
    if(acc >= stepM){
      pts.push(b);
      acc = 0;
    }
  }
  const last = { lat: coords[coords.length - 1][0], lon: coords[coords.length - 1][1] };
  if(haversine(pts[pts.length - 1], last) > 40) pts.push(last);
  return pts;
}

const CARD = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5
};

export function cameraFromOsmTags(lat, lon, tags = {}, id = null){
  let dir = null;
  if(tags.direction != null){
    const raw = String(tags.direction).trim();
    const num = parseFloat(raw);
    if(!Number.isNaN(num)) dir = ((num % 360) + 360) % 360;
    else {
      const up = raw.toUpperCase();
      if(CARD[up] != null) dir = CARD[up];
    }
  }
  const speed = tags.maxspeed ? parseInt(tags.maxspeed, 10) : null;
  return {
    id: id != null ? String(id) : undefined,
    lat,
    lon,
    speed: Number.isFinite(speed) ? speed : null,
    dir
  };
}

export function cameraFromOverpassNode(e){
  if(!e || e.type !== 'node' || e.lat == null || e.lon == null) return null;
  return cameraFromOsmTags(e.lat, e.lon, e.tags || {}, e.id);
}

/**
 * Камеры в коридоре aroundM от polyline маршрута.
 * Раньше — только до sample-точек шаг 600 м: камера на дороге в 100–300 м
 * от сэмпла отбрасывалась (field 07-07: 0 камер почти весь заезд).
 */
export function filterCamerasNearRoute(cameras, coords, aroundM = 150, sampleStepM = 600){
  if(!cameras?.length || !coords?.length) return [];
  // Грубый bbox маршрута + запас — не крутить все 2k камер по сегментам
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for(const c of coords){
    if(c[0] < minLat) minLat = c[0];
    if(c[0] > maxLat) maxLat = c[0];
    if(c[1] < minLon) minLon = c[1];
    if(c[1] > maxLon) maxLon = c[1];
  }
  const padDeg = Math.max(0.002, aroundM / 111320 * 1.2);
  minLat -= padDeg; maxLat += padDeg;
  minLon -= padDeg; maxLon += padDeg;

  // Быстрый отсев далёких: sample-шары чуть шире (половина шага + around)
  const samples = sampleRoutePoints(coords, sampleStepM);
  const coarseM = Math.max(aroundM, sampleStepM * 0.55) + aroundM;

  const out = [];
  const seen = new Set();
  for(const cam of cameras){
    if(cam?.lat == null || cam?.lon == null) continue;
    if(cam.lat < minLat || cam.lat > maxLat || cam.lon < minLon || cam.lon > maxLon) continue;
    const key = cam.id || (cam.lat.toFixed(5) + ',' + cam.lon.toFixed(5));
    if(seen.has(key)) continue;
    const p = { lat: cam.lat, lon: cam.lon };
    let coarse = !samples.length;
    for(const s of samples){
      if(haversine(p, s) <= coarseM){ coarse = true; break; }
    }
    if(!coarse) continue;

    let best = Infinity;
    for(let i = 0; i < coords.length - 1; i++){
      const d = distToSegment(
        p,
        { lat: coords[i][0], lon: coords[i][1] },
        { lat: coords[i + 1][0], lon: coords[i + 1][1] }
      );
      if(d < best) best = d;
      if(best <= aroundM) break;
    }
    if(best <= aroundM){
      seen.add(key);
      out.push({
        lat: cam.lat,
        lon: cam.lon,
        speed: cam.speed ?? null,
        dir: cam.dir ?? null
      });
    }
  }
  return out;
}

async function loadLegacyMoscowCameras(){
  try{
    const r = await fetch(CAMERAS_SNAPSHOT_PATH, { cache: 'no-cache' });
    if(!r.ok) return null;
    const j = await r.json();
    if(!Array.isArray(j.cameras)) return null;
    return {
      bbox: j.bbox || MOSCOW_CAM_BBOX,
      cameras: j.cameras,
      updated: j.updated || null,
      count: j.count ?? j.cameras.length,
      source: j.source || 'osm',
      regions: ['moscow-legacy']
    };
  }catch(e){
    return null;
  }
}

/**
 * Камеры из всех регионов, пересекающих маршрут.
 * @param {Array<[number,number]>} coords
 */
export async function loadCamerasSnapshotForRoute(coords){
  if(!coords?.length) return null;
  const merged = await loadMergedLayer(coords, 'cameras', 'cameras', 'id');
  if(merged.items.length){
    return {
      bbox: merged.bboxes[0] || MOSCOW_CAM_BBOX,
      bboxes: merged.bboxes,
      cameras: merged.items,
      updated: merged.updated,
      count: merged.items.length,
      source: 'osm-regions',
      regions: merged.regions
    };
  }
  const legacy = await loadLegacyMoscowCameras();
  if(legacy && routeIntersectsBbox(coords, legacy.bbox)) return legacy;
  const mos = await loadRegionLayer('moscow', 'cameras');
  if(mos?.cameras?.length && routeIntersectsBbox(coords, mos.bbox || MOSCOW_CAM_BBOX)){
    return {
      bbox: mos.bbox || MOSCOW_CAM_BBOX,
      cameras: mos.cameras,
      updated: mos.updated,
      count: mos.count ?? mos.cameras.length,
      source: 'osm',
      regions: ['moscow']
    };
  }
  return null;
}

/** Совместимость со старым API (без coords — только legacy Moscow) */
export async function loadCamerasSnapshot(){
  return loadLegacyMoscowCameras();
}

export function clearCamerasSnapshotCache(){}
