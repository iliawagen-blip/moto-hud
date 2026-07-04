import { S, RUN_KEY } from './state.js';
import { haversine, bearing, distToSegment } from './geo.js';
import { curPos } from './gps.js';
import { updateCamStatusUI } from './cam-status.js';
import {
  buildRouteGeometry, resetRouteSnap, getRouteSnapForNav, remainingDistanceS
} from './route-geometry.js';
import { loadRouteElevation } from './elevation.js';
import { computeCurveSpeed } from './curve-speed.js';
import { resetFuelRouteBinding } from './fuel.js';
import telemetry from './telemetry.js';

/** Построение RouteGeometry и запуск загрузки высот (не блокирует UI) */
export function ensureRouteGeometry(route){
  if(!route) return null;
  if(route.geometry?.n > 1){
    computeCurveSpeed(route.geometry, route);
    return route.geometry;
  }
  try{
    route.geometry = buildRouteGeometry(route);
    if(route.geometry) computeCurveSpeed(route.geometry, route);
    loadRouteElevation();
    return route.geometry;
  }catch(e){
    console.warn('RouteGeometry:', e);
    route.geometry = null;
    return null;
  }
}

function attachRouteGeometry(route){
  ensureRouteGeometry(route);
  resetRouteSnap();
  resetFuelRouteBinding();
}

/** Фоновая сборка geometry для всех вариантов после открытия карты */
export function scheduleGeometryBuild(routes, onDone){
  if(!routes?.length){
    if(onDone) onDone();
    return;
  }
  let i = 0;
  const step = () => {
    if(i >= routes.length){
      if(onDone) onDone();
      return;
    }
    ensureRouteGeometry(routes[i]);
    i++;
    setTimeout(step, 0);
  };
  setTimeout(step, 50);
}

export function saveLastRun(){
  try{
    const route = S.route ? { ...S.route, geometry: undefined } : null;
    localStorage.setItem(RUN_KEY, JSON.stringify({
      route, cameras: S.cameras, finish: S.finish, ts: Date.now()
    }));
  }catch(e){}
}

export function loadLastRun(){
  try{ const r = localStorage.getItem(RUN_KEY); return r ? JSON.parse(r) : null; }
  catch(e){ return null; }
}

export async function searchAddress(query){
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=ru&q=' +
    encodeURIComponent(query) +
    '&email=moto-hud-dev@users.noreply.github.com';
  const r = await fetch(url, {
    headers: { Accept: 'application/json' },
    referrerPolicy: 'no-referrer'
  });
  if(!r.ok) throw new Error('Nominatim ' + r.status);
  return r.json();
}

/** Разбор одного маршрута OSRM в наш формат */
function parseOsrmRoute(rt){
  const coords = rt.geometry.coordinates.map(c => [c[1], c[0]]);
  const steps = [];
  rt.legs.forEach(leg => {
    leg.steps.forEach(st => {
      const loc = st.maneuver.location;
      steps.push({
        lat: loc[1], lon: loc[0],
        type: st.maneuver.type,
        modifier: st.maneuver.modifier,
        name: st.name || '',
        distance: st.distance
      });
    });
  });
  return { coords, steps, distance: rt.distance, duration: rt.duration };
}

/** Запрос нескольких вариантов маршрута (для экрана настройки с картой) */
export async function fetchRouteAlternatives(){
  if(!S.gps || !S.finish) throw new Error('Нужны GPS и финиш');
  S._usedCache = false;
  const url = 'https://router.project-osrm.org/route/v1/driving/' +
    `${S.gps.lon},${S.gps.lat};${S.finish.lon},${S.finish.lat}` +
    '?overview=full&geometries=geojson&steps=true&annotations=false&alternatives=2';
  const r = await fetch(url);
  if(!r.ok) throw new Error('OSRM HTTP ' + r.status);
  const j = await r.json();
  if(!j.routes || !j.routes.length) throw new Error('Маршрут не найден');
  return j.routes.map(parseOsrmRoute);
}

/** Выбор активного варианта из уже загруженных alternatives */
export function selectRouteIndex(idx){
  if(!S.routeAlternatives.length) return;
  S.selectedRouteIdx = Math.max(0, Math.min(S.routeAlternatives.length - 1, idx));
  S.route = S.routeAlternatives[S.selectedRouteIdx];
  resetRouteSnap();
  resetFuelRouteBinding();
}

export async function buildRoute(opts = {}){
  const { reroute = false, allowCache = true } = opts;
  if(S.routeAlternatives.length){
    selectRouteIndex(S.selectedRouteIdx);
    return;
  }
  S._usedCache = false;
  let url = 'https://router.project-osrm.org/route/v1/driving/' +
    `${S.gps.lon},${S.gps.lat};${S.finish.lon},${S.finish.lat}` +
    '?overview=full&geometries=geojson&steps=true&annotations=false';
  if(reroute){
    const spd = S.gps.speed != null ? S.gps.speed : 0;
    const hdg = S.smoothedHeading;
    if(spd > 3 && hdg != null && !isNaN(hdg)){
      const brg = Math.round(hdg);
      const rad = Math.max(30, Math.round(S.gps.acc || 30));
      url += '&bearings=' + brg + ',45;&radiuses=' + rad + ';';
    }
  }
  try{
    const r = await fetch(url);
    if(!r.ok) throw new Error('OSRM HTTP ' + r.status);
    const j = await r.json();
    if(!j.routes || !j.routes.length) throw new Error('Маршрут не найден');
    S.route = parseOsrmRoute(j.routes[0]);
    attachRouteGeometry(S.route);
    if(!reroute) telemetry.log('nav', { sub: 'route_built' });
  }catch(err){
    if(!allowCache){
      throw err;
    }
    const last = loadLastRun();
    if(last && last.route && S.finish && last.finish &&
       haversine(last.finish, S.finish) < 60){
      S.route = last.route;
      delete S.route.geometry;
      attachRouteGeometry(S.route);
      if(Array.isArray(last.cameras)) S.cameras = last.cameras;
      S._usedCache = true;
      return;
    }
    throw new Error('Нет сети и нет сохранённого маршрута к этой точке');
  }
}

function classifyRerouteError(err){
  const msg = String(err?.message || err || '');
  if(err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(msg)){
    return 'network';
  }
  if(/не найден|no route|NoRoute/i.test(msg)) return 'no_route';
  if(/OSRM HTTP/i.test(msg)) return 'osrm_error';
  return 'network';
}

export async function recalcRoute(){
  if(S.rerouting) return false;
  S.rerouting = true;
  const t0 = Date.now();
  try{
    S.routeAlternatives = [];
    await buildRoute({ reroute: true, allowCache: false });
    telemetry.log('nav', { sub: 'reroute' });
    Array.from(S.camWarned).forEach(k => {
      if(typeof k === 'string' && k.startsWith('st_')) S.camWarned.delete(k);
    });
    await loadCameras();
    if(S.camLoadStatus === 'err'){
      console.warn('Камеры после пересчёта не загрузились');
      telemetry.log('nav', { sub: 'cameras_reload_failed' });
    }
    S.rerouteBackoffStep = 0;
    S.rerouteBackoffUntil = 0;
    return true;
  }catch(e){
    console.warn('Пересчёт не удался:', e);
    const reason = classifyRerouteError(e);
    telemetry.log('nav', {
      sub: 'reroute_failed',
      reason,
      dur_ms: Date.now() - t0
    });
    const delays = [5000, 15000, 60000];
    const step = Math.min(S.rerouteBackoffStep, 2);
    S.rerouteBackoffUntil = Date.now() + delays[step];
    S.rerouteBackoffStep = Math.min(S.rerouteBackoffStep + 1, 2);
    return false;
  }finally{
    S.rerouting = false;
  }
}

export async function loadCameras(){
  if(!S.cams || !S.route){
    S.cameras = [];
    S.camLoadStatus = S.cams ? 'idle' : 'off';
    updateCamStatusUI();
    return;
  }
  if(S._usedCache && S.cameras.length){
    S.camLoadStatus = 'ok';
    updateCamStatusUI();
    return;
  }
  S.camLoadStatus = 'loading';
  updateCamStatusUI();
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  S.route.coords.forEach(c => {
    if(c[0] < minLat) minLat = c[0];
    if(c[0] > maxLat) maxLat = c[0];
    if(c[1] < minLon) minLon = c[1];
    if(c[1] > maxLon) maxLon = c[1];
  });
  const buf = 0.02;
  minLat -= buf; maxLat += buf; minLon -= buf; maxLon += buf;
  const q = `[out:json][timeout:20];
    (node["highway"="speed_camera"](${minLat},${minLon},${maxLat},${maxLon});
     node["enforcement"="maxspeed"](${minLat},${minLon},${maxLat},${maxLon}););
    out body;`;
  try{
    const r = await fetch('https://overpass-api.de/api/interpreter',
      { method: 'POST', body: 'data=' + encodeURIComponent(q) });
    if(!r.ok) throw new Error('Overpass ' + r.status);
    const j = await r.json();
    S.cameras = (j.elements || []).map(e => {
      const t = e.tags || {};
      let dir = null;
      if(t.direction != null){
        const raw = String(t.direction).trim();
        const num = parseFloat(raw);
        if(!isNaN(num)) dir = ((num % 360) + 360) % 360;
        else {
          const CARD = { N:0, NNE:22.5, NE:45, ENE:67.5, E:90, ESE:112.5, SE:135, SSE:157.5,
                         S:180, SSW:202.5, SW:225, WSW:247.5, W:270, WNW:292.5, NW:315, NNW:337.5 };
          const up = raw.toUpperCase();
          if(CARD[up] != null) dir = CARD[up];
        }
      }
      return { lat: e.lat, lon: e.lon, speed: t.maxspeed ? parseInt(t.maxspeed, 10) : null, dir };
    });
    S.camLoadStatus = 'ok';
  }catch(e){
    console.warn('Камеры не загрузились:', e);
    S.cameras = [];
    S.camLoadStatus = 'err';
  }
  updateCamStatusUI();
}

let _nearMemoPos = null, _nearMemoVal = null, _nearIdx = 0;

export function findNearestOnRoute(){
  if(!S.route) return null;
  const pos = curPos();
  if(!pos) return null;
  if(_nearMemoPos === pos) return _nearMemoVal;

  const geom = S.route.geometry || ensureRouteGeometry(S.route);
  if(geom){
    const snap = getRouteSnapForNav(S.smoothedHeading);
    if(snap){
      _nearIdx = snap.segIdx;
      _nearMemoPos = pos;
      _nearMemoVal = { idx: snap.segIdx, dist: snap.lateral, s: snap.s };
      return _nearMemoVal;
    }
  }

  const c = S.route.coords, n = c.length;
  const scan = (lo, hi) => {
    let best = { idx: lo, dist: Infinity };
    for(let i = lo; i < hi; i++){
      const d = distToSegment(pos,
        { lat: c[i][0], lon: c[i][1] }, { lat: c[i + 1][0], lon: c[i + 1][1] });
      if(d < best.dist){ best.dist = d; best.idx = i; }
    }
    return best;
  };
  const lo = Math.max(0, _nearIdx - 8), hi = Math.min(n - 1, _nearIdx + 60);
  let best = scan(lo, hi);
  if(best.dist > 60) best = scan(0, n - 1);
  _nearIdx = best.idx;
  _nearMemoPos = pos; _nearMemoVal = best;
  return best;
}

export function stepCoordIndex(step){
  if(step._ci != null) return step._ci;
  const c = S.route.coords;
  let bi = 0, bd = Infinity;
  for(let i = 0; i < c.length; i++){
    const d = haversine({ lat: c[i][0], lon: c[i][1] }, step);
    if(d < bd){ bd = d; bi = i; }
  }
  step._ci = bi;
  return bi;
}

export function findNextManeuver(){
  if(!S.route || !S.route.steps.length) return null;
  const geom = S.route.geometry;
  const snap = geom ? getRouteSnapForNav(S.smoothedHeading) : null;
  const curS = snap ? snap.s : null;
  const curIdx = snap ? snap.segIdx : (findNearestOnRoute()?.idx ?? 0);

  for(const st of S.route.steps){
    if(st.type === 'depart') continue;
    if(geom && curS != null){
      const m = geom.maneuvers.find(mn => mn.step === st);
      if(m && m.s >= curS - 15){
        const along = Math.max(0, m.s - curS);
        return { step: st, dist: along > 0 ? along : haversine(S.gps, st) };
      }
    }
    if(stepCoordIndex(st) >= curIdx){
      return { step: st, dist: haversine(S.gps, st) };
    }
  }
  return null;
}

export function getRemainingDistance(){
  if(!S.route || !S.gps) return 0;
  const geom = S.route.geometry;
  const snap = geom ? getRouteSnapForNav(S.smoothedHeading) : null;
  if(snap) return remainingDistanceS(geom, snap);

  const near = findNearestOnRoute();
  let remaining = 0;
  if(near){
    const c = S.route.coords;
    remaining = distToSegment(S.gps,
      { lat: c[near.idx][0], lon: c[near.idx][1] },
      { lat: c[near.idx + 1][0], lon: c[near.idx + 1][1] });
    for(let i = near.idx + 1; i < c.length - 1; i++){
      remaining += haversine(
        { lat: c[i][0], lon: c[i][1] },
        { lat: c[i + 1][0], lon: c[i + 1][1] });
    }
  } else {
    remaining = haversine(S.gps, S.finish);
  }
  return remaining;
}

export function maneuverTurnAngle(step){
  if(!S.route || !step) return 0;
  const coords = S.route.coords;
  const si = stepCoordIndex(step);
  const distM = (i, j) => haversine(
    { lat: coords[i][0], lon: coords[i][1] },
    { lat: coords[j][0], lon: coords[j][1] });
  let bi = si, ai = si;
  let acc = 0;
  while(bi > 0 && acc < 25){ bi--; acc += distM(bi, bi + 1); }
  acc = 0;
  while(ai < coords.length - 1 && acc < 25){ ai++; acc += distM(ai - 1, ai); }
  if(bi >= ai) return 0;
  const bIn = bearing({ lat: coords[bi][0], lon: coords[bi][1] },
                      { lat: coords[bi + 1][0], lon: coords[bi + 1][1] });
  const bOut = bearing({ lat: coords[ai - 1][0], lon: coords[ai - 1][1] },
                       { lat: coords[ai][0], lon: coords[ai][1] });
  return ((bOut - bIn + 540) % 360) - 180;
}
