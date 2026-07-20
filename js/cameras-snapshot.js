/**
 * Снапшот камер OSM (Москва) + фильтр коридором маршрута.
 * Файл: data/cameras-moscow.json (GitHub Actions cron).
 */
import { haversine } from './geo.js';

/** Bbox Москвы ≈ внутри МКАД + запас (совпадает со скриптом fetch) */
export const MOSCOW_CAM_BBOX = {
  south: 55.55,
  west: 37.35,
  north: 55.95,
  east: 37.85
};

/** Точки вдоль маршрута (без импорта speed-limit — там leaflet/DOM) */
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

export const CAMERAS_SNAPSHOT_PATH = 'data/cameras-moscow.json';

const CARD = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5
};

/** @type {{ bbox: object, cameras: Array, updated?: string, count?: number }|null} */
let _snapCache = null;
/** @type {Promise<object|null>|null} */
let _snapPromise = null;

/** Разбор direction / maxspeed из OSM tags → наш объект камеры */
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

/** Overpass node → камера */
export function cameraFromOverpassNode(e){
  if(!e || e.type !== 'node' || e.lat == null || e.lon == null) return null;
  return cameraFromOsmTags(e.lat, e.lon, e.tags || {}, e.id);
}

export function pointInBbox(lat, lon, bbox){
  if(!bbox) return false;
  return lat >= bbox.south && lat <= bbox.north && lon >= bbox.west && lon <= bbox.east;
}

/** Маршрут пересекает зону снапшота */
export function routeIntersectsBbox(coords, bbox){
  if(!coords?.length || !bbox) return false;
  for(const c of coords){
    if(pointInBbox(c[0], c[1], bbox)) return true;
  }
  return false;
}

/**
 * Камеры в коридоре aroundM от точек маршрута (шаг sampleStepM).
 * @param {Array<{lat:number,lon:number}>} cameras
 * @param {Array<[number,number]>} coords
 */
export function filterCamerasNearRoute(cameras, coords, aroundM = 80, sampleStepM = 600){
  if(!cameras?.length || !coords?.length) return [];
  const samples = sampleRoutePoints(coords, sampleStepM);
  if(!samples.length) return [];
  const out = [];
  const seen = new Set();
  for(const cam of cameras){
    if(cam?.lat == null || cam?.lon == null) continue;
    const key = cam.id || (cam.lat.toFixed(5) + ',' + cam.lon.toFixed(5));
    if(seen.has(key)) continue;
    const p = { lat: cam.lat, lon: cam.lon };
    let near = false;
    for(const s of samples){
      if(haversine(p, s) <= aroundM){
        near = true;
        break;
      }
    }
    if(near){
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

/** Загрузка снапшота (один раз за сессию; cache-bust по updated в файле не нужен — SW network-first) */
export async function loadCamerasSnapshot(url = CAMERAS_SNAPSHOT_PATH){
  if(_snapCache) return _snapCache;
  if(_snapPromise) return _snapPromise;
  _snapPromise = (async () => {
    try{
      const r = await fetch(url, { cache: 'no-cache' });
      if(!r.ok) throw new Error('snapshot HTTP ' + r.status);
      const j = await r.json();
      if(!Array.isArray(j.cameras)) throw new Error('snapshot: no cameras[]');
      _snapCache = {
        bbox: j.bbox || MOSCOW_CAM_BBOX,
        cameras: j.cameras,
        updated: j.updated || null,
        count: j.count ?? j.cameras.length,
        source: j.source || 'osm'
      };
      return _snapCache;
    }catch(e){
      console.warn('cameras snapshot:', e);
      _snapCache = null;
      return null;
    }finally{
      _snapPromise = null;
    }
  })();
  return _snapPromise;
}

/** Сброс кэша (тесты / после обновления файла) */
export function clearCamerasSnapshotCache(){
  _snapCache = null;
  _snapPromise = null;
}
