/**
 * Мост для Playwright-регрессии: загрузка кэшированного маршрута без OSRM.
 * @module regression-sim-bridge
 */
import { S } from './state.js';
import { bearing, haversine } from './geo.js';
import { attachRouteFromImport, ensureRouteGeometry, seedSnapFromGps } from './route.js';
import { resetOffRouteMachine } from './offroute.js';
import { resetRouteSnap, getNavSnap, primeRouteSnapFromDist } from './route-geometry.js';
import { resetSimTimeEpoch } from './sim-time-scale.js';

function minimalSteps(waypoints, distanceM){
  const last = waypoints[waypoints.length - 1];
  const first = waypoints[0];
  return [
    {
      lat: first.lat, lon: first.lon,
      type: 'depart', modifier: '', name: first.label || '',
      distance: 0, intersections: []
    },
    {
      lat: last.lat, lon: last.lon,
      type: 'arrive', modifier: '', name: last.label || '',
      distance: distanceM, intersections: []
    }
  ];
}

function routeFromCache(cache, waypoints){
  const coords = cache.polyline || [];
  const n = Math.max(0, coords.length - 1);
  return {
    coords,
    steps: minimalSteps(waypoints, cache.distance_m || 0),
    distance: cache.distance_m || 0,
    duration: cache.duration_s || 0,
    maxspeeds: new Array(n).fill({ unknown: true }),
    segmentSpeeds: new Array(n).fill(0)
  };
}

/**
 * Подготовка HUD для регрессионного прогона.
 * @param {{ waypoints: Array<{lat:number,lon:number,label?:string}>, cache: object, timeScale?: number }} opts
 */
export function prepareRegressionHud(opts){
  const { waypoints, cache, timeScale = 1 } = opts || {};
  if(!waypoints?.length || !cache?.polyline?.length){
    throw new Error('regression: нужны waypoints и polyline');
  }
  if(typeof globalThis !== 'undefined'){
    globalThis.SIM_TIME_SCALE = timeScale;
    globalThis.__REGRESSION_SIM__ = { active: true, disableReroute: true };
  }
  resetSimTimeEpoch();

  const start = waypoints[0];
  const route = routeFromCache(cache, waypoints);
  attachRouteFromImport(route, waypoints);

  const next = waypoints[1] || waypoints[0];
  const hdg = bearing(start, next);
  S.gps = {
    lat: start.lat,
    lon: start.lon,
    acc: 5,
    speed: 0,
    heading: hdg,
    ts: Date.now()
  };
  S.fixPos = { lat: start.lat, lon: start.lon };
  S.fixAt = Date.now();
  S.smoothedHeading = hdg;
  S.gpsConverged = true;
  S.gpsFixCount = 12;
  S.voice = false;
  S.cams = false;
  S.showElevProfile = false;
  resetOffRouteMachine();
  resetRouteSnap();
  ensureRouteGeometry(S.route);
  seedSnapFromGps({ relaxed: true });
  return { distance_m: route.distance, duration_s: route.duration };
}

/**
 * Перед injectFix: якорь snap по пройденной дистанции sim-walker.
 * @param {number} distM
 */
export function regressionPrimeSnap(distM){
  if(!globalThis.__REGRESSION_SIM__?.active) return;
  if(distM != null && Number.isFinite(distM)) primeRouteSnapFromDist(distM);
}

/**
 * Снимок состояния для JSONL-регрессии.
 * @param {object} [extra]
 */
export function sampleRegressionState(extra = {}){
  let lateral = null;
  let maneuverType = null;
  const lat = S.gps?.lat ?? null;
  const lon = S.gps?.lon ?? null;
  const heading = S.smoothedHeading ?? S.gps?.heading ?? null;
  if(S.route && S.gps){
    const snap = getNavSnap(S.smoothedHeading);
    lateral = snap?.lateral ?? null;
    if(lateral != null && (!Number.isFinite(lateral) || lateral > 300)) lateral = null;
    const steps = S.route.steps || [];
    for(let i = 1; i < steps.length; i++){
      const st = steps[i];
      if(haversine(S.gps, st) < 120){
        maneuverType = st.type;
        break;
      }
    }
  }

  return {
    ts: Date.now(),
    type: 'regression_tick',
    lat: lat != null ? Math.round(lat * 1e6) / 1e6 : null,
    lon: lon != null ? Math.round(lon * 1e6) / 1e6 : null,
    heading: heading != null ? Math.round(heading * 10) / 10 : null,
    dist_m: extra.dist_m ?? extra.routeDistM ?? null,
    lateral_m: lateral != null ? Math.round(lateral * 10) / 10 : null,
    snap_quality: S.snapQuality,
    off_route_state: S.offRouteState,
    maneuver_type: maneuverType,
    gps_acc: S.gps?.acc ?? null,
    ...extra
  };
}

export function isRegressionSimActive(){
  return !!globalThis.__REGRESSION_SIM__?.active;
}
