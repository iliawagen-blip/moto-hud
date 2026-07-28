/**
 * Сохранение активной поездки для восстановления после звонка / убийства вкладки (PWA).
 * @module ride-persist
 */
import { S } from './state.js';
import { $ } from './util.js';
import { getNavSnap } from './route-geometry.js';
import { saveLastRun } from './route.js';

export const ACTIVE_RIDE_KEY = 'moto-hud-active-ride-v1';
/** Не поднимать поездку старше 6 ч. */
export const ACTIVE_RIDE_TTL_MS = 6 * 3600 * 1000;

let _periodicTimer = null;

function hudOn(){
  return !!$('hud')?.classList.contains('on');
}

function stripRoute(route){
  if(!route?.coords?.length) return null;
  return {
    coords: route.coords,
    steps: route.steps || [],
    distance: route.distance,
    duration: route.duration,
    waypoints: route.waypoints || null,
    name: route.name || null
  };
}

export function clearActiveRide(){
  try{ localStorage.removeItem(ACTIVE_RIDE_KEY); }catch(e){}
  stopRidePersistPeriodic();
}

export function loadActiveRide(){
  try{
    const raw = localStorage.getItem(ACTIVE_RIDE_KEY);
    if(!raw) return null;
    const data = JSON.parse(raw);
    if(!data || data.v !== 1 || !data.finish) return null;
    if(Date.now() - (data.ts || 0) > ACTIVE_RIDE_TTL_MS){
      clearActiveRide();
      return null;
    }
    return data;
  }catch(e){
    return null;
  }
}

/** Снимок текущей HUD-поездки в localStorage. */
export function saveActiveRide(reason){
  if(!hudOn() || !S.finish) return false;
  try{
    const snap = getNavSnap(S.smoothedHeading);
    const payload = {
      v: 1,
      ts: Date.now(),
      reason: reason || 'save',
      finish: {
        lat: S.finish.lat,
        lon: S.finish.lon,
        label: S.finish.label || 'Финиш'
      },
      route: stripRoute(S.route),
      cameras: Array.isArray(S.cameras) ? S.cameras.slice(0, 200) : [],
      snapS: snap?.s ?? null,
      navMode: S.navMode || (S.route?.coords?.length ? 'route' : 'bearing'),
      startTs: S.startTs || Date.now(),
      distDone: S.distDone || 0,
      showCompass: !!S.showCompass
    };
    localStorage.setItem(ACTIVE_RIDE_KEY, JSON.stringify(payload));
    saveLastRun();
    return true;
  }catch(e){
    console.warn('saveActiveRide:', e);
    return false;
  }
}

export function startRidePersistPeriodic(){
  stopRidePersistPeriodic();
  if(typeof setInterval === 'undefined') return;
  _periodicTimer = setInterval(() => {
    if(hudOn()) saveActiveRide('periodic');
  }, 20000);
}

export function stopRidePersistPeriodic(){
  if(_periodicTimer){
    clearInterval(_periodicTimer);
    _periodicTimer = null;
  }
}

export function shouldSkipRideRestore(){
  try{
    const q = new URLSearchParams(location.search);
    if(q.get('sim') === '1') return true;
    if(q.get('no_resume') === '1') return true;
  }catch(e){}
  if(globalThis.__REGRESSION_SIM__?.active) return true;
  return false;
}
