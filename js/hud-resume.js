/**
 * Восстановление HUD после сворачивания / звонка (visibility hidden → visible).
 * @module hud-resume
 */
import { S } from './state.js';
import { $ } from './util.js';
import { ensureRouteGeometry, seedSnapFromGps } from './route.js';
import { loadRouteHighwayTypes } from './speed-limit.js';
import { resetRouteSnap, getNavSnap } from './route-geometry.js';
import { resetSnapQuality, clearCachedManeuver } from './snap-quality.js';
import { startVisualLoop, startNavigationGps, isNavGpsMode } from './gps.js';
import { onTick } from './hud.js';
import { acquireWakeLock, initWakeLockResume } from './wake-lock.js';
import { isNative } from './platform.js';
import telemetry from './telemetry.js';

let _resumeBusy = false;
let _lastResumeMs = 0;
const RESUME_DEBOUNCE_MS = 1500;

function hudActive(){
  return !!$('hud')?.classList.contains('on');
}

/**
 * Поднять маршрут/snap/GPS после возврата в приложение без полного рестарта.
 */
export async function resumeHudAfterBackground(reason){
  if(!hudActive() || !S.route || _resumeBusy) return false;
  const now = Date.now();
  if(now - _lastResumeMs < RESUME_DEBOUNCE_MS) return false;
  _resumeBusy = true;
  _lastResumeMs = now;
  try{
    telemetry.log('nav', { sub: 'hud_resume', reason: reason || 'visibility' });

    if(!S.route.geometry?.n){
      ensureRouteGeometry(S.route);
    }

    const snap = getNavSnap(S.smoothedHeading);
    if(!snap || snap.s == null){
      resetRouteSnap();
      resetSnapQuality();
      seedSnapFromGps({ relaxed: true });
    }

    clearCachedManeuver();

    const hwOk = (S.route.highwayTypes?.filter(Boolean).length || 0) /
      Math.max(1, (S.route.coords?.length || 1) - 1);
    if(hwOk < 0.4){
      loadRouteHighwayTypes(S.route).catch(e => console.warn('resume highway:', e));
    }

    startVisualLoop();

    if(isNative() && !isNavGpsMode()){
      try{ await startNavigationGps(); }catch(e){
        console.warn('resume nav GPS:', e);
      }
    }

    await acquireWakeLock();
    onTick();
    return true;
  }catch(e){
    console.warn('hud resume:', e);
    telemetry.log('sys', { sub: 'hud_resume_fail', message: String(e?.message || e).slice(0, 120) });
    return false;
  }finally{
    _resumeBusy = false;
  }
}

/** Слушатели visibility / Capacitor App resume */
export function initHudResume(){
  if(typeof document === 'undefined') return;

  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible'){
      resumeHudAfterBackground('visibility');
    }
  });

  if(isNative()){
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => {
        if(isActive) resumeHudAfterBackground('app_active');
      }).catch(() => {});
      App.addListener('resume', () => {
        resumeHudAfterBackground('app_resume');
      }).catch(() => {});
    }).catch(() => {});
  }

  initWakeLockResume();
}
