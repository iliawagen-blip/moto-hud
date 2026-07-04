import { S, FUEL_COLORS, FUEL_CORRIDOR } from './state.js';
import { haversine } from './geo.js';
import { curPos } from './gps.js';
import { findNearestOnRoute } from './route.js';
import { projectPointToRoute } from './route-geometry.js';
import { isNative } from './platform.js';

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
  return { yes: 'есть', queue: 'очередь', low: 'мало', no: 'нет топлива' }[status] || 'наличие ?';
}

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

/** АЗС из OpenStreetMap (Overpass): координаты + бренд. Наличия здесь нет. */
async function loadFromOverpass(){
  const bb = routeBBox();
  if(!bb) return [];
  const [minLat, minLon, maxLat, maxLon] = bb;
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
      status: 'unknown'
    };
  }).filter(Boolean);
}

/** Обогащение наличием из ГдеБЕНЗ. CORS отсутствует → только в нативном приложении
    (Capacitor обходит CORS). В вебе тихо пропускаем — символы будут нейтральные. */
async function enrichFromGdebenz(stations){
  const sim = !!window.__SIM__;
  if(!isNative() && !sim) return;
  const p = curPos() || S.gps;
  if(!p) return;
  let data;
  try{
    if(sim){
      // в эмуляторе сеть подменена — ходим обычным fetch к мок-ответу
      const r = await fetch('https://gdebenz.ru/api/nearby?lat=' + p.lat + '&lon=' + p.lon + '&radius_km=40');
      data = await r.json();
    } else {
      const { CapacitorHttp } = await import('@capacitor/core');
      const resp = await CapacitorHttp.get({
        url: 'https://gdebenz.ru/api/nearby',
        params: { lat: String(p.lat), lon: String(p.lon), radius_km: '40' }
      });
      data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
    }
  }catch(e){
    console.warn('ГдеБЕНЗ недоступен:', e);
    return;
  }
  if(!data || !Array.isArray(data.stations)) return;
  const byId = new Map();
  data.stations.forEach(s => { if(s.osm_id) byId.set(String(s.osm_id), s); });
  stations.forEach(st => {
    const g = byId.get(st.osmId);
    if(g && g.status){
      st.status = g.status;
      if(g.brand) st.brand = g.brand;
      st.confirmations = g.confirmations;
      st.lastAt = g.last_at;
    }
  });
  S.fuelSource = 'gdebenz';
}

/** Загрузка АЗС (ленивая, по первому обращению к ассистенту) */
export async function ensureFuelStations(force){
  if(S.fuelStatus === 'loading') return;
  if(!force && S.fuelStatus === 'ready' && S.fuelStations.length) return;
  S.fuelStatus = 'loading';
  S.fuelSource = 'osm';
  try{
    const stations = await loadFromOverpass();
    await enrichFromGdebenz(stations);
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
