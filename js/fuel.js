import { S, FUEL_COLORS, FUEL_CORRIDOR } from './state.js';
import { haversine } from './geo.js';
import { curPos } from './gps.js';
import { findNearestOnRoute } from './route.js';
import { projectPointToRoute } from './route-geometry.js';
import { isNative } from './platform.js';
import { getFuelProxyBase, fuelProxyNearbyUrl } from './fuel-config.js';
import { applyCrowdReports, crowdStatusSuffix } from './fuel-crowd.js';
import { loadMergedLayer } from './osm-regions.js';

let _fuelRouteKey = null;

function fuelRouteKey(){
  const r = S.route;
  if(!r) return '';
  return (r.distance || 0) + ':' + (r.coords?.length || 0) + ':' + (r.geometry?.n || 0);
}

function invalidateFuelRouteS(){
  _fuelRouteKey = null;
  S.fuelStations.forEach(st => { delete st.routeS; delete st.offRoute; });
}

export function fuelColor(status){
  return FUEL_COLORS[status] || FUEL_COLORS.unknown;
}

export function fuelStatusText(status){
  if(status === 'unknown' || status == null) return 'наличие ?';
  return { yes: 'есть', queue: 'очередь', low: 'мало', no: 'нет топлива' }[status] || 'наличие ?';
}

/** Подсказка, если сервис статуса АЗС не ответил (веб/CORS/сеть). */
export function fuelStatusHint(){
  if(S.fuelStatus !== 'ready') return '';
  if(S.fuelSource === 'gdebenz' || S.fuelSource === 'gdebenz+crowd') return '';
  if(S.fuelStations.some(st => st.statusSource === 'crowd' && st.status !== 'unknown')) return '';
  const proxy = getFuelProxyBase();
  if(proxy) return ' · статус АЗС недоступен (проверьте URL прокси)';
  return ' · статус АЗС недоступен · отметьте в HUD';
}

export { crowdStatusSuffix };

/** Ограничивающий прямоугольник маршрута (или окрестность позиции) с буфером */
function routeBBox(bufDeg){
  const buf = bufDeg || 0.05;
  if(S.route && S.route.coords.length){
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    S.route.coords.forEach(c => {
      if(c[0] < minLat) minLat = c[0];
      if(c[0] > maxLat) maxLat = c[0];
      if(c[1] < minLon) minLon = c[1];
      if(c[1] > maxLon) maxLon = c[1];
    });
    return [minLat - buf, minLon - buf, maxLat + buf, maxLon + buf];
  }
  const p = curPos() || S.gps;
  if(!p) return null;
  return [p.lat - buf, p.lon - buf, p.lat + buf, p.lon + buf];
}

/** АЗС из OpenStreetMap (Overpass): координаты + бренд + теги топлива. */
async function loadFuelStationsInBBox(minLat, minLon, maxLat, maxLon){
  const q = `[out:json][timeout:25];
    (node["amenity"="fuel"](${minLat},${minLon},${maxLat},${maxLon});
     way["amenity"="fuel"](${minLat},${minLon},${maxLat},${maxLon}););
    out center 300;`;
  const r = await fetch('https://overpass-api.de/api/interpreter',
    { method: 'POST', body: 'data=' + encodeURIComponent(q) });
  if(!r.ok) throw new Error('Overpass ' + r.status);
  const j = await r.json();
  return (j.elements || []).map(e => {
    const t = e.tags || {};
    const lat = e.lat != null ? e.lat : (e.center && e.center.lat);
    const lon = e.lon != null ? e.lon : (e.center && e.center.lon);
    if(lat == null || lon == null) return null;
    return {
      osmId: String(e.id),
      lat, lon,
      brand: t.brand || t.name || t.operator || 'АЗС',
      name: t.name || t.brand || 'АЗС',
      status: 'unknown',
      tags: t
    };
  }).filter(Boolean);
}

/** АЗС в bbox (для планировщика поездок, без S.route). */
export async function fetchFuelStationsForBBox(minLat, minLon, maxLat, maxLon){
  return loadFuelStationsInBBox(minLat, minLon, maxLat, maxLon);
}

/** АЗС из снапшотов регионов (без Overpass), фильтр по bbox маршрута */
async function loadFromSnapshot(){
  const bb = routeBBox(0.02);
  if(!bb) return null;
  const [minLat, minLon, maxLat, maxLon] = bb;
  const coords = [[minLat, minLon], [maxLat, maxLon]];
  if(S.route?.coords?.length) coords.push(...S.route.coords);
  const merged = await loadMergedLayer(coords, 'fuel', 'stations', 'osmId');
  if(!merged.items.length) return null;
  return merged.items
    .filter(st => st.lat >= minLat && st.lat <= maxLat && st.lon >= minLon && st.lon <= maxLon)
    .map(st => ({
      osmId: String(st.osmId),
      lat: st.lat,
      lon: st.lon,
      brand: st.brand || 'АЗС',
      name: st.name || st.brand || 'АЗС',
      status: 'unknown',
      tags: {}
    }));
}

/** АЗС из OpenStreetMap (Overpass): координаты + бренд. Наличия здесь нет. */
async function loadFromOverpass(){
  const bb = routeBBox();
  if(!bb) return [];
  const [minLat, minLon, maxLat, maxLon] = bb;
  return loadFuelStationsInBBox(minLat, minLon, maxLat, maxLon);
}

/** Кэш ответа ГдеБЕНЗ (бережно к API, 5 мин). */
const GDEBENZ_CACHE_MS = 5 * 60 * 1000;
let _gdebenzCache = { key: '', ts: 0, data: null };

function gdebenzCacheKey(lat, lon){
  return Math.round(lat * 200) + ':' + Math.round(lon * 200);
}

function readGdebenzCache(lat, lon){
  const key = gdebenzCacheKey(lat, lon);
  if(_gdebenzCache.key === key && Date.now() - _gdebenzCache.ts < GDEBENZ_CACHE_MS){
    return _gdebenzCache.data;
  }
  try{
    const raw = sessionStorage.getItem('moto-hud-gdebenz-' + key);
    if(!raw) return null;
    const o = JSON.parse(raw);
    if(o && Date.now() - o.ts < GDEBENZ_CACHE_MS) return o.data;
  }catch(e){}
  return null;
}

function writeGdebenzCache(lat, lon, data){
  const key = gdebenzCacheKey(lat, lon);
  _gdebenzCache = { key, ts: Date.now(), data };
  try{
    sessionStorage.setItem('moto-hud-gdebenz-' + key, JSON.stringify({ ts: Date.now(), data }));
  }catch(e){}
}

/** Загрузка nearby из ГдеБЕНЗ: native / sim / web (direct → CORS-proxy). */
async function fetchGdebenzNearby(lat, lon, radiusKm){
  const cached = readGdebenzCache(lat, lon);
  if(cached) return cached;

  const apiUrl = 'https://gdebenz.ru/api/nearby?lat=' + lat + '&lon=' + lon + '&radius_km=' + radiusKm;
  let data = null;

  try{
    if(isNative()){
      const { CapacitorHttp } = await import('@capacitor/core');
      const resp = await CapacitorHttp.get({
        url: 'https://gdebenz.ru/api/nearby',
        params: { lat: String(lat), lon: String(lon), radius_km: String(radiusKm) }
      });
      data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
    }else if(window.__SIM__){
      const r = await fetch(apiUrl);
      if(r.ok) data = await r.json();
    }else{
      const tries = [];
      const proxyBase = getFuelProxyBase();
      if(proxyBase){
        tries.push(() => fetch(fuelProxyNearbyUrl(proxyBase, lat, lon, radiusKm)));
      }
      tries.push(
        () => fetch(apiUrl),
        () => fetch('https://corsproxy.io/?' + encodeURIComponent(apiUrl)),
        () => fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(apiUrl))
      );
      for(const run of tries){
        try{
          const r = await run();
          if(!r.ok) continue;
          const text = await r.text();
          data = JSON.parse(text);
          if(data?.stations) break;
        }catch(e){ /* следующий способ */ }
      }
    }
  }catch(e){
    console.warn('Сервис статуса АЗС недоступен:', e);
  }

  if(data?.stations) writeGdebenzCache(lat, lon, data);
  return data;
}

/** Сопоставить станции OSM с ответом ГдеБЕНЗ (osm_id, иначе ближайшая <100 м). */
function applyGdebenzData(stations, data){
  if(!data?.stations?.length) return 0;
  const byId = new Map();
  data.stations.forEach(s => { if(s.osm_id != null) byId.set(String(s.osm_id), s); });
  let matched = 0;
  stations.forEach(st => {
    let g = byId.get(st.osmId);
    if(!g){
      let best = null, bestD = 100;
      for(const s of data.stations){
        if(s.lat == null || s.lon == null) continue;
        const d = haversine(st, s);
        if(d < bestD){ bestD = d; best = s; }
      }
      if(best) g = best;
    }
    if(g?.status){
      st.status = g.status;
      st.statusSource = 'gdebenz';
      if(g.brand) st.brand = g.brand;
      st.confirmations = g.confirmations;
      st.lastAt = g.last_at;
      matched++;
    }
  });
  return matched;
}

/** Обогащение наличием из ГдеБЕНЗ (OSM id + гео-фолбэк). */
async function enrichFromGdebenz(stations){
  const p = curPos() || S.gps;
  if(!p) return;
  const data = await fetchGdebenzNearby(p.lat, p.lon, 40);
  if(!data) return;
  const n = applyGdebenzData(stations, data);
  if(n > 0) S.fuelSource = S.fuelSource === 'crowd' ? 'gdebenz+crowd' : 'gdebenz';
}

/** Загрузка АЗС (ленивая, по первому обращению к ассистенту) */
export async function ensureFuelStations(force){
  if(S.fuelStatus === 'loading') return;
  if(!force && S.fuelStatus === 'ready' && S.fuelStations.length) return;
  S.fuelStatus = 'loading';
  S.fuelSource = 'osm';
  try{
    let stations = await loadFromSnapshot();
    if(stations?.length){
      S.fuelSource = 'osm-snapshot';
    } else {
      stations = await loadFromOverpass();
    }
    await enrichFromGdebenz(stations);
    const crowdN = applyCrowdReports(stations);
    if(crowdN > 0 && (S.fuelSource === 'osm' || S.fuelSource === 'osm-snapshot')){
      S.fuelSource = S.fuelSource === 'osm-snapshot' ? 'snapshot+crowd' : 'crowd';
    } else if(crowdN > 0 && S.fuelSource === 'gdebenz') S.fuelSource = 'gdebenz+crowd';
    S.fuelStations = stations;
    S.fuelStatus = 'ready';
  }catch(e){
    console.warn('АЗС не загрузились:', e);
    S.fuelStatus = 'error';
    S.fuelStations = [];
  }
}

/** Пересчёт геометрии: прямое расстояние, отклонение от маршрута, «впереди по маршруту» (s). */
export function recomputeFuelGeometry(){
  const pos = curPos() || S.gps;
  if(!pos) return;

  const key = fuelRouteKey();
  if(key !== _fuelRouteKey){
    _fuelRouteKey = key;
    S.fuelStations.forEach(st => { delete st.routeS; delete st.offRoute; });
  }

  const geom = S.route?.geometry?.n > 1 ? S.route.geometry : null;
  const near = S.route ? findNearestOnRoute() : null;
  const curS = near?.s;

  S.fuelStations.forEach(st => {
    st.distGps = haversine(pos, st);
    if(geom){
      if(st.routeS == null){
        const proj = projectPointToRoute(geom, st);
        if(proj){
          st.routeS = proj.s;
          st.offRoute = proj.lateral;
        }else{
          st.offRoute = Infinity;
        }
      }
      st.aheadOnRoute = false;
      st.distAhead = Infinity;
      if(st.routeS != null && curS != null && st.offRoute <= FUEL_CORRIDOR && st.routeS >= curS - 20){
        st.aheadOnRoute = true;
        st.distAhead = Math.max(0, st.routeS - curS);
      }
    }else{
      st.offRoute = Infinity;
      st.aheadOnRoute = false;
      st.distAhead = Infinity;
    }
  });
}

export function resetFuelRouteBinding(){
  invalidateFuelRouteS();
}

/** Лучшая АЗС по маршруту впереди (в коридоре), ближайшая по ходу движения */
export function bestAlongRoute(){
  recomputeFuelGeometry();
  const cands = S.fuelStations.filter(s => s.aheadOnRoute && s.distAhead > 50);
  cands.sort((a, b) => a.distAhead - b.distAhead);
  return cands[0] || null;
}

/** Ближайшая АЗС вообще (по прямой), исключая уже выбранную по маршруту */
export function nearestOverall(exclude){
  recomputeFuelGeometry();
  const cands = S.fuelStations.filter(s => s.distGps > 50 && (!exclude || s.osmId !== exclude.osmId));
  cands.sort((a, b) => a.distGps - b.distGps);
  return cands[0] || null;
}

/** Ближайшие АЗС по прямой (после ensureFuelStations + recomputeFuelGeometry) */
export async function searchNearestFuelStations(limit){
  await ensureFuelStations(true);
  recomputeFuelGeometry();
  return S.fuelStations
    .filter(s => s.distGps != null && isFinite(s.distGps))
    .sort((a, b) => a.distGps - b.distGps)
    .slice(0, Math.max(1, limit || 5));
}

/** Форматирование расстояния до АЗС для списка планировщика */
export function formatFuelDist(m){
  if(m == null || !isFinite(m)) return '—';
  if(m < 1000) return Math.round(m) + ' м';
  return (m / 1000).toFixed(1).replace('.', ',') + ' км';
}

/** Предзагрузка АЗС для карты setup (не блокирует UI) */
export async function prefetchFuelForMap(){
  try{
    await ensureFuelStations(true);
    recomputeFuelGeometry();
  }catch(e){
    console.warn('АЗС на карте:', e);
  }
}

/** Маркеры ⛽ на карте маршрута (в коридоре трассы) */
export function fuelStationsForMap(limit){
  if(!S.fuelStations.length) return [];
  recomputeFuelGeometry();
  return S.fuelStations
    .filter(s => s.routeS != null && (s.offRoute ?? Infinity) <= FUEL_CORRIDOR + 150)
    .sort((a, b) => a.routeS - b.routeS)
    .slice(0, limit || 48);
}

/** АЗС для отрисовки на прогноз-дорожке (впереди, в разумном коридоре) */
export function fuelStationsForRoad(maxDist){
  if(S.fuelMode === 0 || !S.fuelStations.length) return [];
  recomputeFuelGeometry();
  return S.fuelStations
    .filter(s => s.aheadOnRoute && s.distAhead <= (maxDist || 3000))
    .sort((a, b) => a.distAhead - b.distAhead)
    .slice(0, 4);
}
