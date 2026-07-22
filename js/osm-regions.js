/**
 * Каталог OSM-снапшотов (data/osm-regions.json) + загрузка слоёв по регионам.
 */
import { gunzipSync } from 'fflate';

export const OSM_REGIONS_PATH = 'data/osm-regions.json';

export function pointInBbox(lat, lon, bbox){
  if(!bbox) return false;
  return lat >= bbox.south && lat <= bbox.north && lon >= bbox.west && lon <= bbox.east;
}

export function routeIntersectsBbox(coords, bbox){
  if(!coords?.length || !bbox) return false;
  for(const c of coords){
    if(pointInBbox(c[0], c[1], bbox)) return true;
  }
  return false;
}

/** @type {object|null} */
let _catalog = null;
/** @type {Promise<object|null>|null} */
let _catalogPromise = null;

/** @type {Map<string, object|null>} */
const _layerCache = new Map();
/** @type {Map<string, Promise<object|null>>} */
const _layerPromises = new Map();

export async function loadOsmRegionsCatalog(){
  if(_catalog) return _catalog;
  if(_catalogPromise) return _catalogPromise;
  _catalogPromise = (async () => {
    try{
      const r = await fetch(OSM_REGIONS_PATH, { cache: 'no-cache' });
      if(!r.ok) throw new Error('regions HTTP ' + r.status);
      _catalog = await r.json();
      return _catalog;
    }catch(e){
      console.warn('osm-regions catalog:', e);
      _catalog = { regions: [] };
      return _catalog;
    }finally{
      _catalogPromise = null;
    }
  })();
  return _catalogPromise;
}

/** Регионы, пересекающие маршрут (меньший bbox предпочтительнее при равном пересечении) */
export async function regionsForRoute(coords){
  const cat = await loadOsmRegionsCatalog();
  const hit = [];
  for(const reg of cat.regions || []){
    if(!reg.bbox || !routeIntersectsBbox(coords, reg.bbox)) continue;
    const area = (reg.bbox.north - reg.bbox.south) * (reg.bbox.east - reg.bbox.west);
    hit.push({ ...reg, _area: area });
  }
  hit.sort((a, b) => a._area - b._area);
  return hit;
}

export function regionPath(regionId, layer, { gzip = false } = {}){
  const base = `data/regions/${regionId}/${layer}.json`;
  return gzip ? base + '.gz' : base;
}

async function fetchJson(url){
  const r = await fetch(url, { cache: 'no-cache' });
  if(!r.ok) throw new Error(url + ' HTTP ' + r.status);
  return r.json();
}

async function fetchGzipJson(url){
  const r = await fetch(url, { cache: 'no-cache' });
  if(!r.ok) throw new Error(url + ' HTTP ' + r.status);
  const buf = new Uint8Array(await r.arrayBuffer());
  return JSON.parse(new TextDecoder().decode(gunzipSync(buf)));
}

/**
 * Загрузка слоя региона (кэш на сессию).
 * @param {string} regionId
 * @param {string} layer cameras|fuel|urban|signals|highways|motorways
 */
export async function loadRegionLayer(regionId, layer){
  const key = regionId + '/' + layer;
  if(_layerCache.has(key)) return _layerCache.get(key);
  if(_layerPromises.has(key)) return _layerPromises.get(key);

  const p = (async () => {
    try{
      const wantGz = layer === 'highways' || layer === 'motorways';
      let j;
      if(wantGz){
        try{ j = await fetchGzipJson(regionPath(regionId, layer, { gzip: true })); }
        catch(_e){ j = await fetchJson(regionPath(regionId, layer)); }
      } else {
        j = await fetchJson(regionPath(regionId, layer));
      }
      _layerCache.set(key, j);
      return j;
    }catch(e){
      console.warn('region layer', key, e);
      _layerCache.set(key, null);
      return null;
    }finally{
      _layerPromises.delete(key);
    }
  })();
  _layerPromises.set(key, p);
  return p;
}

/** Регионы с городским arterial highways — без russia_motorways */
export const CITY_ARTERIAL_REGION_IDS = new Set(['moscow', 'mkad_plus', 'spb']);

/** Слить массивы из нескольких регионов по idKey */
export async function loadMergedLayer(coords, layer, arrayKey, idKey){
  const regs = await regionsForRoute(coords);
  const byId = new Map();
  const bboxes = [];
  const usedRegions = [];
  let updated = null;
  for(const reg of regs){
    if(!(reg.layers || []).includes(layer) && layer !== 'motorways') continue;
    // motorways только у russia_motorways
    if(layer === 'motorways' && reg.id !== 'russia_motorways' && !(reg.layers || []).includes('motorways')) continue;
    if(layer !== 'motorways' && !(reg.layers || []).includes(layer)) continue;
    const j = await loadRegionLayer(reg.id, layer);
    if(!j?.[arrayKey]?.length) continue;
    bboxes.push(j.bbox || reg.bbox);
    usedRegions.push(reg.id);
    if(j.updated && (!updated || j.updated > updated)) updated = j.updated;
    for(const item of j[arrayKey]){
      const id = idKey ? item[idKey] : (item.id || `${item.lat},${item.lon}`);
      if(id != null && byId.has(String(id))) continue;
      byId.set(String(id ?? byId.size), item);
    }
  }
  return {
    items: [...byId.values()],
    bboxes,
    updated,
    // только регионы, реально отдавшие данные (не весь intersect bbox)
    regions: usedRegions
  };
}

export function pointNearAny(lat, lon, points, radiusM, haversineFn){
  const p = { lat, lon };
  for(const q of points){
    if(q?.lat == null) continue;
    if(haversineFn(p, q) <= radiusM) return true;
  }
  return false;
}

export function clearOsmRegionCaches(){
  _catalog = null;
  _layerCache.clear();
  _layerPromises.clear();
}
