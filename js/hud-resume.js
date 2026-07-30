/**
 * Восстановление HUD после сворачивания / звонка (visibility) и холодный resume из localStorage.
 * @module hud-resume
 */
import { S } from './state.js';
import { $, requestAppFullscreen } from './util.js';
import { ensureRouteGeometry, seedSnapFromGps, loadCameras } from './route.js';
import { loadRouteHighwayTypes } from './speed-limit.js';
import { resetRouteSnap, getNavSnap } from './route-geometry.js';
import { resetSnapQuality, clearCachedManeuver } from './snap-quality.js';
import { startVisualLoop, startNavigationGps, isNavGpsMode } from './gps.js';
import { onTick } from './hud.js';
import { acquireWakeLock, initWakeLockResume } from './wake-lock.js';
import { isNative } from './platform.js';
import { applyHudChrome, clearHudChromeReveal } from './hud-chrome.js';
import { syncNavButtons, enterBearingMode, resetBearingMode } from './bearing-mode.js';
import { closeHudSettingsSheet } from './hud-settings-sheet.js';
import { syncVintageVfdDomClasses, resetVintageVfd } from './vintage-vfd.js';
import { updateCamStatusUI } from './cam-status.js';
import {
  saveActiveRide, loadActiveRide, clearActiveRide,
  startRidePersistPeriodic, shouldSkipRideRestore
} from './ride-persist.js';
import { rememberFinish } from './finish-history.js';
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
  if(!hudActive() || (!S.route && !S.finish) || _resumeBusy) return false;
  const now = Date.now();
  if(now - _lastResumeMs < RESUME_DEBOUNCE_MS) return false;
  _resumeBusy = true;
  _lastResumeMs = now;
  try{
    telemetry.log('nav', { sub: 'hud_resume', reason: reason || 'visibility' });

    if(S.route?.coords?.length){
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
    }

    startVisualLoop();

    if(isNative() && !isNavGpsMode()){
      try{ await startNavigationGps(); }catch(e){
        console.warn('resume nav GPS:', e);
      }
    }

    await acquireWakeLock();
    saveActiveRide(reason || 'visibility');
    if(telemetry.isEnabled() && !telemetry.isActive()){
      try{
        await telemetry.ensureStarted({ reason: 'hud_resume', routeKm: S.route?.distance
          ? Math.round(S.route.distance / 100) / 10 : null });
      }catch(e){ console.warn('telemetry resume start:', e); }
    }
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

/**
 * Холодный старт: вкладку убили при звонке — поднять HUD из localStorage.
 */
export async function tryRestoreActiveRide(){
  if(shouldSkipRideRestore() || hudActive() || _resumeBusy) return false;
  const data = loadActiveRide();
  if(!data?.finish) return false;

  _resumeBusy = true;
  try{
    telemetry.log('nav', {
      sub: 'hud_cold_resume',
      age_s: Math.round((Date.now() - data.ts) / 1000)
    });

    S.finish = {
      lat: data.finish.lat,
      lon: data.finish.lon,
      label: data.finish.label || 'Финиш'
    };
    rememberFinish(S.finish);

    const inp = $('finish-input');
    if(inp){
      inp.value = S.finish.lat.toFixed(5) + ', ' + S.finish.lon.toFixed(5);
      inp.dataset.userEdited = '1';
    }
    const st = $('s-finish');
    if(st){
      st.textContent = '✅ Финиш восстановлен: ' + S.finish.lat.toFixed(5) + ', ' + S.finish.lon.toFixed(5);
      st.className = 'status ok';
    }

    const hasRoute = !!(data.route?.coords?.length);
    if(hasRoute){
      S.route = data.route;
      delete S.route.geometry;
      ensureRouteGeometry(S.route);
      if(Array.isArray(data.cameras) && data.cameras.length) S.cameras = data.cameras;
    }else{
      S.route = null;
    }

    S.startTs = data.startTs || Date.now();
    S.distDone = data.distDone || 0;
    S.measSpeed = null;
    if(!S.camWarned) S.camWarned = new Set();
    S.camWarned.clear();
    if(data.showCompass != null) S.showCompass = !!data.showCompass;
    S.navMode = data.navMode || (hasRoute ? 'route' : 'bearing');

    clearHudChromeReveal();
    applyHudChrome();
    resetSnapQuality();
    clearCachedManeuver();
    resetBearingMode();

    if(hasRoute){
      if(data.snapS != null && Number.isFinite(data.snapS)){
        resetRouteSnap({ seedS: data.snapS, lateral: 0 });
      }else{
        resetRouteSnap();
        seedSnapFromGps({ relaxed: true });
      }
      loadRouteHighwayTypes(S.route).catch(() => {});
      if(!globalThis.__REGRESSION_SIM__?.active) loadCameras().catch(() => {});
    }

    $('setup').style.display = 'none';
    $('setup').style.zIndex = '30';
    $('hud').classList.add('on');
    $('hud').classList.toggle('show-compass', !!S.showCompass);
    closeHudSettingsSheet();
    resetVintageVfd();
    syncVintageVfdDomClasses();
    updateCamStatusUI();

    if(hasRoute) syncNavButtons();
    else enterBearingMode({ quiet: true });

    startVisualLoop();
    try{ await startNavigationGps(); }catch(e){ console.warn('cold resume GPS:', e); }
    await acquireWakeLock();
    requestAppFullscreen();
    startRidePersistPeriodic();
    saveActiveRide('restored');
    if(telemetry.isEnabled()){
      try{
        await telemetry.ensureStarted({
          reason: 'hud_cold_resume',
          routeKm: hasRoute && S.route?.distance
            ? Math.round(S.route.distance / 100) / 10 : null
        });
      }catch(e){ console.warn('telemetry cold start:', e); }
    }
    onTick();
    return true;
  }catch(e){
    console.warn('tryRestoreActiveRide:', e);
    telemetry.log('sys', {
      sub: 'hud_cold_resume_fail',
      message: String(e?.message || e).slice(0, 120)
    });
    return false;
  }finally{
    _resumeBusy = false;
  }
}

/** Слушатели visibility / Capacitor App resume + cold restore */
export function initHudResume(){
  if(typeof document === 'undefined') return;

  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'hidden'){
      if(hudActive()) saveActiveRide('hidden');
      return;
    }
    if(document.visibilityState === 'visible'){
      if(hudActive()) resumeHudAfterBackground('visibility');
      else tryRestoreActiveRide();
    }
  });

  window.addEventListener('pagehide', () => {
    if(hudActive()) saveActiveRide('pagehide');
  });

  if(isNative()){
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => {
        if(isActive){
          if(hudActive()) resumeHudAfterBackground('app_active');
          else tryRestoreActiveRide();
        }else if(hudActive()){
          saveActiveRide('app_inactive');
        }
      }).catch(() => {});
      App.addListener('resume', () => {
        if(hudActive()) resumeHudAfterBackground('app_resume');
        else tryRestoreActiveRide();
      }).catch(() => {});
    }).catch(() => {});
  }

  initWakeLockResume();

  // Холодный старт: дать GPS/consent чуть времени
  setTimeout(() => {
    tryRestoreActiveRide().catch(() => {});
  }, 900);
}

export { clearActiveRide, saveActiveRide, startRidePersistPeriodic };
