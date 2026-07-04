import { S, FUEL_COLORS, FUEL_CORRIDOR } from './state.js';
import { haversine, distToSegment } from './geo.js';
import { curPos } from './gps.js';
import { findNearestOnRoute } from './route.js';
import { isNative } from './platform.js';

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

/** Пересчёт геометрии: прямое расстояние, отклонение от маршрута, «впереди по маршруту». */
export function recomputeFuelGeometry(){
  const pos = curPos() || S.gps;
  if(!pos) return;
  const near = S.route ? findNearestOnRoute() : null;
  const coords = S.route ? S.route.coords : null;
  S.fuelStations.forEach(st => {
    st.distGps = haversine(pos, st);
    st.offRoute = Infinity;
    st.aheadOnRoute = false;
    st.distAhead = Infinity;
    if(coords && near){
      let bi = 0, bd = Infinity;
      for(let i = 0; i < coords.length - 1; i++){
        const d = distToSegment(st,
          { lat: coords[i][0], lon: coords[i][1] },
          { lat: coords[i + 1][0], lon: coords[i + 1][1] });
        if(d < bd){ bd = d; bi = i; }
      }
      st.offRoute = bd;
      if(bi >= near.idx){
        st.aheadOnRoute = bd <= FUEL_CORRIDOR;
        // расстояние по маршруту от текущей позиции до проекции АЗС
        let along = distToSegment(pos,
          { lat: coords[near.idx][0], lon: coords[near.idx][1] },
          { lat: coords[near.idx + 1][0], lon: coords[near.idx + 1][1] });
        for(let i = near.idx + 1; i <= bi; i++){
          along += haversine(
            { lat: coords[i][0], lon: coords[i][1] },
            { lat: coords[i + 1][0], lon: coords[i + 1][1] });
        }
        st.distAhead = along;
      }
    }
  });
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

/** АЗС для отрисовки на прогноз-дорожке (впереди, в разумном коридоре) */
export function fuelStationsForRoad(maxDist){
  if(S.fuelMode === 0 || !S.fuelStations.length) return [];
  recomputeFuelGeometry();
  return S.fuelStations
    .filter(s => s.aheadOnRoute && s.distAhead <= (maxDist || 3000))
    .sort((a, b) => a.distAhead - b.distAhead)
    .slice(0, 4);
}
