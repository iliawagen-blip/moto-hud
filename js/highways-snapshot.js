/**
 * Снапшот OSM highway/maxspeed + motorways по регионам.
 * data/regions/{id}/highways.json.gz, motorways.json.gz (+ legacy moscow).
 */
import { gunzipSync } from 'fflate';
import { MOSCOW_CAM_BBOX } from './cameras-snapshot.js';
import {
  CITY_ARTERIAL_REGION_IDS,
  loadMergedLayer,
  loadRegionLayer,
  routeIntersectsBbox
} from './osm-regions.js';

export const HIGHWAYS_SNAPSHOT_PATH = 'data/highways-moscow.json';
export const HIGHWAYS_SNAPSHOT_GZ_PATH = 'data/highways-moscow.json.gz';

/** @type {{ bbox: object, ways: Array, updated?: string, count?: number }|null} */
let _cache = null;
/** @type {string|null} */
let _cacheKey = null;

/** Нормализация way из снапшота → формат matchWayAtPoint */
export function normalizeSnapshotWay(w){
  if(!w?.geom?.length) return null;
  const geom = w.geom.map((p) => {
    if(Array.isArray(p)) return { lat: p[0], lon: p[1] };
    return { lat: p.lat, lon: p.lon };
  });
  if(geom.length < 2) return null;
  return {
    id: w.id,
    highway: w.highway,
    maxspeed: w.maxspeed || null,
    maxspeedConditional: w.maxspeedConditional || null,
    geom
  };
}

function wayRoughBbox(geom){
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for(const p of geom){
    if(p.lat < minLat) minLat = p.lat;
    if(p.lat > maxLat) maxLat = p.lat;
    if(p.lon < minLon) minLon = p.lon;
    if(p.lon > maxLon) maxLon = p.lon;
  }
  return { minLat, maxLat, minLon, maxLon };
}

function routeRoughBbox(coords, padDeg = 0.01){
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for(const c of coords){
    if(c[0] < minLat) minLat = c[0];
    if(c[0] > maxLat) maxLat = c[0];
    if(c[1] < minLon) minLon = c[1];
    if(c[1] > maxLon) maxLon = c[1];
  }
  return {
    minLat: minLat - padDeg,
    maxLat: maxLat + padDeg,
    minLon: minLon - padDeg,
    maxLon: maxLon + padDeg
  };
}

function bboxOverlap(a, b){
  return !(a.maxLat < b.minLat || a.minLat > b.maxLat ||
    a.maxLon < b.minLon || a.minLon > b.maxLon);
}

export function filterWaysNearRoute(ways, coords){
  if(!ways?.length || !coords?.length) return [];
  const rb = routeRoughBbox(coords);
  const out = [];
  for(const w of ways){
    if(!w.geom?.length) continue;
    if(bboxOverlap(wayRoughBbox(w.geom), rb)) out.push(w);
  }
  return out;
}

async function fetchGzipJson(url){
  const r = await fetch(url, { cache: 'no-cache' });
  if(!r.ok) throw new Error(url + ' HTTP ' + r.status);
  const buf = new Uint8Array(await r.arrayBuffer());
  return JSON.parse(new TextDecoder().decode(gunzipSync(buf)));
}

async function loadLegacyMoscowHighways(){
  try{
    let j;
    try{ j = await fetchGzipJson(HIGHWAYS_SNAPSHOT_GZ_PATH); }
    catch(_e){
      const r = await fetch(HIGHWAYS_SNAPSHOT_PATH, { cache: 'no-cache' });
      if(!r.ok) return null;
      j = await r.json();
    }
    if(!Array.isArray(j.ways)) return null;
    return {
      bbox: j.bbox || MOSCOW_CAM_BBOX,
      ways: j.ways.map(normalizeSnapshotWay).filter(Boolean),
      updated: j.updated || null,
      count: j.count ?? j.ways.length,
      source: j.source || 'osm',
      regions: ['moscow-legacy']
    };
  }catch(e){
    return null;
  }
}

function packWays(rawWays){
  const ways = [];
  for(const raw of rawWays || []){
    const w = normalizeSnapshotWay(raw);
    if(w) ways.push(w);
  }
  return ways;
}

/**
 * Arterial highways + country motorways для маршрута.
 * @param {Array<[number,number]>} coords
 */
export async function loadHighwaysSnapshotForRoute(coords){
  if(!coords?.length) return null;
  const key = coords.length + ':' + coords[0][0].toFixed(2) + ',' + coords[0][1].toFixed(2) +
    ':' + coords[coords.length - 1][0].toFixed(2) + ',' + coords[coords.length - 1][1].toFixed(2);
  if(_cache && _cacheKey === key) return _cache;

  const byId = new Map();
  const regions = [];
  let updated = null;
  const bboxes = [];

  const hw = await loadMergedLayer(coords, 'highways', 'ways', 'id');
  for(const raw of hw.items){
    const w = normalizeSnapshotWay(raw);
    if(w && !byId.has(String(w.id))) byId.set(String(w.id), w);
  }
  regions.push(...hw.regions);
  bboxes.push(...hw.bboxes);
  if(hw.updated) updated = hw.updated;

  // Городской arterial уже есть — не тянуть 7+ MB russia_motorways (field 17–21.07: 7–35 с)
  const hasCityArterial = hw.regions.some(id => CITY_ARTERIAL_REGION_IDS.has(id)) && hw.items.length > 200;
  if(!hasCityArterial){
    const mw = await loadMergedLayer(coords, 'motorways', 'ways', 'id');
    for(const raw of mw.items){
      const w = normalizeSnapshotWay(raw);
      if(w && !byId.has(String(w.id))) byId.set(String(w.id), w);
    }
    for(const id of mw.regions){
      if(!regions.includes(id)) regions.push(id);
    }
    bboxes.push(...mw.bboxes);
    if(mw.updated && (!updated || mw.updated > updated)) updated = mw.updated;
  }

  if(!byId.size){
    const legacy = await loadLegacyMoscowHighways();
    if(legacy?.ways?.length && routeIntersectsBbox(coords, legacy.bbox)){
      _cache = legacy;
      _cacheKey = key;
      return _cache;
    }
    const mos = await loadRegionLayer('moscow', 'highways');
    if(mos?.ways?.length && routeIntersectsBbox(coords, mos.bbox || MOSCOW_CAM_BBOX)){
      _cache = {
        bbox: mos.bbox || MOSCOW_CAM_BBOX,
        ways: packWays(mos.ways),
        updated: mos.updated,
        count: mos.count,
        source: 'osm',
        regions: ['moscow']
      };
      _cacheKey = key;
      return _cache;
    }
    return null;
  }

  _cache = {
    bbox: bboxes[0] || MOSCOW_CAM_BBOX,
    bboxes,
    ways: [...byId.values()],
    updated,
    count: byId.size,
    source: 'osm-regions',
    regions
  };
  _cacheKey = key;
  return _cache;
}

/** Legacy: весь Moscow dump (без привязки к маршруту) */
export async function loadHighwaysSnapshot(){
  return loadLegacyMoscowHighways();
}

export function routeInHighwaysSnapshot(coords, snap){
  if(!snap) return false;
  if(snap.bboxes?.length){
    return snap.bboxes.some(b => routeIntersectsBbox(coords, b));
  }
  return !!(snap.bbox && routeIntersectsBbox(coords, snap.bbox));
}

export function clearHighwaysSnapshotCache(){
  _cache = null;
  _cacheKey = null;
}
