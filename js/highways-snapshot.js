/**
 * Снапшот OSM highway/maxspeed (Москва) для лимитов без live Overpass.
 * data/highways-moscow.json(.gz) — GitHub Actions cron.
 */
import { gunzipSync } from 'fflate';
import { MOSCOW_CAM_BBOX, routeIntersectsBbox } from './cameras-snapshot.js';

export const HIGHWAYS_SNAPSHOT_PATH = 'data/highways-moscow.json';
export const HIGHWAYS_SNAPSHOT_GZ_PATH = 'data/highways-moscow.json.gz';

/** @type {{ bbox: object, ways: Array, updated?: string, count?: number }|null} */
let _cache = null;
/** @type {Promise<object|null>|null} */
let _promise = null;

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

/**
 * Ways снапшота, пересекающие bbox маршрута (не весь город в матчер).
 * @param {Array} ways нормализованные
 * @param {Array<[number,number]>} coords
 */
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

async function fetchJson(url){
  const r = await fetch(url, { cache: 'no-cache' });
  if(!r.ok) throw new Error('highways snapshot HTTP ' + r.status);
  return r.json();
}

async function fetchGzipJson(url){
  const r = await fetch(url, { cache: 'no-cache' });
  if(!r.ok) throw new Error('highways snapshot.gz HTTP ' + r.status);
  const buf = new Uint8Array(await r.arrayBuffer());
  const text = new TextDecoder().decode(gunzipSync(buf));
  return JSON.parse(text);
}

export async function loadHighwaysSnapshot(){
  if(_cache) return _cache;
  if(_promise) return _promise;
  _promise = (async () => {
    try{
      let j = null;
      try{
        j = await fetchGzipJson(HIGHWAYS_SNAPSHOT_GZ_PATH);
      }catch(_e){
        j = await fetchJson(HIGHWAYS_SNAPSHOT_PATH);
      }
      if(!Array.isArray(j.ways)) throw new Error('snapshot: no ways[]');
      const ways = [];
      for(const raw of j.ways){
        const w = normalizeSnapshotWay(raw);
        if(w) ways.push(w);
      }
      _cache = {
        bbox: j.bbox || MOSCOW_CAM_BBOX,
        ways,
        updated: j.updated || null,
        count: j.count ?? ways.length,
        source: j.source || 'osm'
      };
      return _cache;
    }catch(e){
      console.warn('highways snapshot:', e);
      _cache = null;
      return null;
    }finally{
      _promise = null;
    }
  })();
  return _promise;
}

export function routeInHighwaysSnapshot(coords, snap){
  return !!(snap?.bbox && routeIntersectsBbox(coords, snap.bbox));
}

export function clearHighwaysSnapshotCache(){
  _cache = null;
  _promise = null;
}
