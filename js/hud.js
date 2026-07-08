import { S } from './state.js';
import { $, fmtClock, fmtTime, fmtRemainDur, formatStreetLabel } from './util.js';
import { haversine, bearing, angleDiff } from './geo.js';
import { curPos } from './gps.js';
import {
  buildRoute, loadCameras, saveLastRun, findNearestOnRoute,
  findNextManeuver, getRemainingDistance
} from './route.js';
import { speak, maneuverText, isTurnStep, isCameraBehind } from './voice.js';
import { buildArrowSVG, buildTurnArrowSVG } from './render.js';
import { syncVintageVfdDomClasses, resetVintageVfd } from './vintage-vfd.js';
import { closeHudSettingsSheet } from './hud-settings-sheet.js';
import { startVisualLoop, stopVisualLoop, startNavigationGps, stopNavigationGps } from './gps.js';
import {
  ensureFuelStations, bestAlongRoute, nearestOverall,
  fuelColor, fuelStatusText, crowdStatusSuffix, recomputeFuelGeometry
} from './fuel.js';
import {
  saveCrowdReport, nearestStationForReport, applyCrowdReports
} from './fuel-crowd.js';
import { updateCamStatusUI } from './cam-status.js';
import { resetRouteSnap, getNavSnap } from './route-geometry.js';
import { isSnapLost, isSnapDegraded, getCachedManeuver, cacheLastManeuver, resetSnapQuality } from './snap-quality.js';
import { RouteQuality } from './route-quality.js';
import { stepTurnAngleDeg } from './maneuver-filter.js';
import { ensureRouteGeometry } from './route.js';
import { pickCurveVoiceWarn, resetCurveRibbonState } from './curve-speed.js';
import { renderFavs } from './favorites.js';
import { acquireWakeLock, releaseWakeLock } from './wake-lock.js';
import { clearVoiceQueue } from './voice.js';
import { getHeadingHealth } from './heading.js';
import { tickAutoMode } from './theme-manager.js';
import { applyFinishInfoVisibility } from './hud-opts.js';
import { clearHudChromeReveal, applyHudChrome } from './hud-chrome.js';
import { tickOffRouteMachine, resetOffRouteMachine, isOfflineGuide } from './offroute.js';
import telemetry from './telemetry.js';
import { logFunnel } from './telemetry-funnel.js';
import { tickNavMap, resetViewMode } from './view-mode.js';
import { syncTripHudBadge } from './trip-ui.js';
import { formatTripHudExtraLine } from './trip-hud-context.js';
import { syncTripRefuelHud } from './trip-refuel-hud.js';
import {
  startTrackRecorder, stopTrackRecorder, isTrackRecordEnabled, rememberLastRide,
  tickTrackRecorder
} from './track-recorder.js';
import { tickSpeedLimit, resetSpeedLimitState } from './speed-limit.js';
import {
  getRoundaboutContext, isRoundaboutStep, roundaboutVoicePhrase,
  roundaboutManeuverText, logRoundaboutTelemetry, resetRoundaboutState
} from './roundabout.js';
import { resetConvergeTelemetryRide, flushConvergeSummary } from './converge-telemetry.js';

/** @type {object|null} */
let _lastMarkCtx = null;

/** Контекст для телеметрической метки (phantom_turn и др.) */
export function getLastMarkContext(){ return _lastMarkCtx; }

function logManeuverContext(nm, snap, shown, filterReason){
  const snap2 = getNavSnap(S.smoothedHeading);
  _lastMarkCtx = {
    maneuver_id: S.route?.steps?.indexOf(nm.step),
    type: nm.step.type,
    modifier: nm.step.modifier,
    dist: Math.round(nm.dist),
    ang_osrm: stepTurnAngleDeg(nm.step, nm),
    lat_off: snap2?.lateral != null ? Math.round(snap2.lateral) : null,
    snap_quality: S.snapQuality,
    shown: !!shown,
    filter_reason: filterReason || null
  };
  telemetry.log('nav', { sub: 'maneuver_context', ..._lastMarkCtx });
}
function maneuverVoiceThresholds(kmh){
  const mps = Math.max(kmh / 3.6, 4);
  return {
    mps,
    farM: Math.max(220, Math.min(850, mps * 9)),
    nearM: Math.max(35, Math.min(110, mps * 2.5))
  };
}

function formatManeuverLead(distM, mps){
  if(mps >= 6 && distM >= 120){
    const sec = Math.round(distM / mps);
    if(sec <= 20){
      const w = sec === 1 ? 'секунду' : sec >= 2 && sec <= 4 ? 'секунды' : 'секунд';
      return 'Через ' + sec + ' ' + w;
    }
  }
  const m = Math.max(50, Math.round(distM / 50) * 50);
  return 'Через ' + m + ' метров';
}

export function checkCamerasILS(){
  if(!S.cams || !S.cameras.length) return;
  const now = Date.now();
  const kmh = S.gps.speed != null && S.gps.speed >= 0 ? S.gps.speed * 3.6 : 0;
  const heading = S.smoothedHeading;
  const radius = Math.max(200, Math.min(1000, kmh * 10));
  const tol = S.camSpeedTol != null ? S.camSpeedTol : 15;
  let closest = null;
  S.cameras.forEach((c, i) => {
    const d = haversine(S.gps, c);
    if(d > radius) return;
    if(!c.speed) return;
    if(kmh <= c.speed + tol) return;
    if(S.backOnly && !isCameraBehind(c, heading)) return;
    if(heading != null && angleDiff(bearing(S.gps, c), heading) > 90) return;
    if(!closest || d < closest.dist) closest = { cam: c, dist: d, id: i };
  });
  const alertEl = $('camAlert');
  if(closest){
    $('cam-dist').textContent = Math.round(closest.dist) + ' M';
    $('cam-sub').textContent = closest.cam.speed
      ? 'LIMIT ' + closest.cam.speed + ' KM/H'
      : (closest.cam.dir != null ? 'BRG ' + String(Math.round(closest.cam.dir)).padStart(3, '0') : 'DIR UNKNOWN');
    alertEl.classList.add('on');
    if(!S.camWarned.has(closest.id) && (now - S.lastVoiceTs > 3000)){
      S.camWarned.add(closest.id);
      S.lastVoiceTs = now;
      const dm = closest.dist < 200 ? 'менее 200 метров' :
                 closest.dist < 400 ? 'через 300 метров' :
                 closest.dist < 700 ? 'через 500 метров' :
                 'через ' + Math.round(closest.dist / 100) * 100 + ' метров';
      speak('Камера в спину ' + dm + (closest.cam.speed ? ', лимит ' + closest.cam.speed : ''));
    }
  } else {
    alertEl.classList.remove('on');
    S.cameras.forEach((c, i) => {
      if(S.camWarned.has(i) && haversine(S.gps, c) > 2000) S.camWarned.delete(i);
    });
  }
}

function estimateRemainSec(remaining, kmh){
  if(remaining <= 0) return 0;
  if(kmh > 5) return remaining / (kmh / 3.6);
  if(S.route?.distance > 0 && S.route.duration > 0){
    return remaining / S.route.distance * S.route.duration;
  }
  return null;
}

function updateFinishInfo(remaining, kmh, now){
  const panel = $('finish-info');
  if(!panel) return;
  const any = S.showFinishDist || S.showFinishTime || S.showFinishEta;
  if(!any || !S.route){
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');

  if(S.showFinishDist){
    $('fi-dist-line')?.classList.remove('hidden');
    const el = $('fi-dist-val');
    if(el){
      el.textContent = remaining < 1000
        ? Math.round(remaining) + ' м'
        : (remaining / 1000).toFixed(1) + ' км';
    }
  } else $('fi-dist-line')?.classList.add('hidden');

  const remainSec = estimateRemainSec(remaining, kmh);

  if(S.showFinishTime && remainSec != null){
    $('fi-time-line')?.classList.remove('hidden');
    const el = $('fi-time-val');
    if(el) el.textContent = fmtRemainDur(remainSec);
  } else $('fi-time-line')?.classList.add('hidden');

  if(S.showFinishEta && remainSec != null){
    $('fi-eta-line')?.classList.remove('hidden');
    const el = $('fi-eta-val');
    if(el) el.textContent = fmtClock(new Date(now.getTime() + remainSec * 1000));
  } else $('fi-eta-line')?.classList.add('hidden');
}

export function onTick(){
  if(!S.gps) return;
  if($('hud').classList.contains('on')){
    tickTrackRecorder({
      lat: S.gps.lat,
      lon: S.gps.lon,
      spd: S.gps.speed,
      acc: S.gps.acc,
      hdg: S.smoothedHeading ?? S.gps.heading
    });
  }
  const now = new Date();
  $('clock').textContent = fmtClock(now);
  const dot = $('gps-dot');
  if(dot){ dot.classList.toggle('ok', !!S.gps); }
  $('gps-txt').textContent = 'GPS ±' + Math.round(S.gps.acc || 0) + 'м';
  const kmh = S.gps.speed != null && S.gps.speed >= 0 ? S.gps.speed * 3.6 : 0;
  const hh = getHeadingHealth();
  const hw = $('heading-warn');
  if(hw){
    hw.classList.toggle('on', !!hh.interference && kmh < 25);
    hw.textContent = hh.calibrating
      ? '🧭 Калибровка компаса — восьмёрка 15 с'
      : '⚠ Помехи компаса — курс по GPS';
  }

  if(!S.route){
    $('mid-info').textContent = S.startTs ? 'T+' + fmtTime((Date.now() - S.startTs) / 1000) : '—';
    updateFinishInfo(0, kmh, now);
    return;
  }

  const gpsOk = S.gpsConverged !== false;
  const snap = gpsOk ? getNavSnap(S.smoothedHeading) : null;
  const spdMps = S.gps.speed != null && S.gps.speed >= 0 ? S.gps.speed : 0;

  if($('hud').classList.contains('on') && !gpsOk){
    $('street').textContent = 'GPS СХОДИТСЯ';
    $('v-mdist').textContent = '—';
    $('arrow-box').innerHTML = buildTurnArrowSVG(0);
    updateFinishInfo(getRemainingDistance(), kmh, now);
  }

  if(isSnapLost()){
    $('street').textContent = 'GPS ПОТЕРЯН';
    $('v-mdist').textContent = '—';
    $('v-mdist-u').textContent = '';
    $('arrow-box').innerHTML = buildTurnArrowSVG(0);
    $('rb-exit-label')?.classList.add('hidden');
    updateFinishInfo(getRemainingDistance(), kmh, now);
    $('mid-info').textContent = S.startTs ? 'T+' + fmtTime((Date.now() - S.startTs) / 1000) : '—';
    return;
  }

  const remaining = getRemainingDistance();
  const near = findNearestOnRoute();

  if(S.compassMode && S.finish && S.gps && !isOfflineGuide()){
    const brg = bearing(S.gps, S.finish);
    const hdg = S.smoothedHeading != null && !isNaN(S.smoothedHeading)
      ? S.smoothedHeading : S.gps.heading;
    let turn = 0;
    if(hdg != null && !isNaN(hdg)) turn = ((brg - hdg + 540) % 360) - 180;
    $('arrow-box').innerHTML = buildTurnArrowSVG(turn);
    const dFin = haversine(S.gps, S.finish);
    if(dFin < 1000){
      $('v-mdist').textContent = Math.max(0, Math.round(dFin / 10) * 10);
      $('v-mdist-u').textContent = 'м';
    } else {
      $('v-mdist').textContent = (dFin / 1000).toFixed(1);
      $('v-mdist-u').textContent = 'км';
    }
    $('street').textContent = 'К ФИНИШУ';
    $('rb-exit-label')?.classList.add('hidden');
    const mid = $('mid-info');
    const tStr = S.startTs ? 'T+' + fmtTime((Date.now() - S.startTs) / 1000) : '—';
    const tripX = formatTripHudExtraLine();
    mid.textContent = tripX ? tStr + ' · ' + tripX : tStr + ' · КОМПАС';
    updateFinishInfo(remaining, kmh, now);
    tickAutoMode();
    checkCamerasILS();
    if(snap) tickSpeedLimit(snap);
    refreshFuelPanel();
    return;
  }

  if(!gpsOk) return;

  tickOffRouteMachine({
    lateral: near?.dist,
    acc: S.gps.acc || 0,
    spdMps,
    spdKmh: kmh,
    heading: S.smoothedHeading,
    tangent: snap?.tangent ?? null
  });

  if(isOfflineGuide() && snap && S.gps){
    const brg = bearing(S.gps, { lat: snap.lat, lon: snap.lon });
    const hdg = S.smoothedHeading != null && !isNaN(S.smoothedHeading)
      ? S.smoothedHeading : S.gps.heading;
    let turn = 0;
    if(hdg != null && !isNaN(hdg)) turn = ((brg - hdg + 540) % 360) - 180;
    $('arrow-box').innerHTML = buildTurnArrowSVG(turn);
    const dSnap = haversine(S.gps, { lat: snap.lat, lon: snap.lon });
    if(dSnap < 1000){
      $('v-mdist').textContent = Math.max(0, Math.round(dSnap / 10) * 10);
      $('v-mdist-u').textContent = 'м';
    } else {
      $('v-mdist').textContent = (dSnap / 1000).toFixed(1);
      $('v-mdist-u').textContent = 'км';
    }
    $('street').textContent = 'ВОЗВРАТ НА МАРШРУТ';
    $('rb-exit-label')?.classList.add('hidden');
  } else {
    let nm = isSnapDegraded() ? getCachedManeuver() : null;
    if(!nm) nm = findNextManeuver();
    if(nm){
      cacheLastManeuver(nm);
      logManeuverContext(nm, snap, true, null);
      const rbCtx = snap ? getRoundaboutContext(snap, S.route) : null;
      if(rbCtx) logRoundaboutTelemetry(rbCtx);
      const displayStep = (rbCtx?.isOnRoundabout && rbCtx.enterStep) ? rbCtx.enterStep :
        (isRoundaboutStep(nm.step) && rbCtx?.enterStep ? rbCtx.enterStep : nm.step);
      $('arrow-box').innerHTML = buildArrowSVG(displayStep, { snap, ctx: rbCtx });
      const rbEl = $('rb-exit-label');
      if(rbEl) rbEl.classList.add('hidden');
      if(rbCtx?.isOnRoundabout && rbCtx.distanceToExit != null){
        $('street').textContent = roundaboutManeuverText(displayStep, rbCtx);
      } else if(isRoundaboutStep(displayStep)){
        const mini = rbCtx?.isMini ? ' · мини-круг' : '';
        $('street').textContent = (roundaboutManeuverText(displayStep, rbCtx) ||
          formatStreetLabel(nm.step.name || displayStep.name)) + mini;
      } else {
        $('street').textContent = formatStreetLabel(nm.step.name);
      }
      if(rbCtx?.isOnRoundabout && rbCtx.distanceToExit != null){
        const dm = Math.max(10, Math.round(rbCtx.distanceToExit / 10) * 10);
        if(dm < 1000){
          $('v-mdist').textContent = dm;
          $('v-mdist-u').textContent = 'м';
        } else {
          $('v-mdist').textContent = (dm / 1000).toFixed(1);
          $('v-mdist-u').textContent = 'км';
        }
      } else if(nm.dist < 1000){
        $('v-mdist').textContent = Math.max(0, Math.round(nm.dist / 10) * 10);
        $('v-mdist-u').textContent = 'м';
      } else {
        $('v-mdist').textContent = (nm.dist / 1000).toFixed(1);
        $('v-mdist-u').textContent = 'км';
      }
      const stIdx = S.route.steps.indexOf(nm.step);
      const kFar = 'st_' + stIdx + '_far';
      const kNear = 'st_' + stIdx + '_near';
      const kRbOn = 'rb_on_' + (rbCtx?.enterSegIdx ?? stIdx);
      if(isRoundaboutStep(displayStep) || isRoundaboutStep(nm.step)){
        try{
          const rbStep = displayStep;
          const dist = rbCtx?.isOnRoundabout && rbCtx.distanceToExit != null
            ? rbCtx.distanceToExit : nm.dist;
          if(rbCtx?.isOnRoundabout && dist <= 50 && dist >= 25 && !S.camWarned.has(kRbOn)){
            S.camWarned.add(kRbOn);
            S.lastVoiceTs = Date.now();
            speak(roundaboutVoicePhrase(rbStep, 'on_exit'));
          } else if(!rbCtx?.isOnRoundabout){
            if(dist <= 320 && dist > 80 && !S.camWarned.has(kFar)){
              S.camWarned.add(kFar);
              telemetry.log('nav', { sub: 'maneuver_announced', id: stIdx, dist: Math.round(dist), phase: 'rb_far' });
              speak(roundaboutVoicePhrase(rbStep, 'far', { streetName: rbStep.name }));
            }
            if(dist <= 70 && !S.camWarned.has(kNear)){
              S.camWarned.add(kNear);
              telemetry.log('nav', { sub: 'maneuver_announced', id: stIdx, dist: Math.round(dist), phase: 'rb_near' });
              speak(roundaboutVoicePhrase(rbStep, 'near', { streetName: rbStep.name }));
            }
          }
        }catch(e){
          console.warn('roundabout voice:', e);
        }
      } else if(isTurnStep(nm.step)){
        try{
          const txt = maneuverText(nm.step);
          const { mps, farM, nearM } = maneuverVoiceThresholds(kmh);
          if(nm.dist <= farM && nm.dist > nearM + 15 && !S.camWarned.has(kFar) && txt){
            S.camWarned.add(kFar);
            telemetry.log('nav', { sub: 'maneuver_announced', id: stIdx, dist: Math.round(nm.dist), phase: 'far' });
            speak(formatManeuverLead(nm.dist, mps) + ' ' + txt);
          }
          if(nm.dist <= nearM && !S.camWarned.has(kNear) && txt){
            S.camWarned.add(kNear);
            telemetry.log('nav', { sub: 'maneuver_announced', id: stIdx, dist: Math.round(nm.dist), phase: 'near' });
            speak(txt);
          }
        }catch(e){
          console.warn('maneuver voice:', e);
        }
      }
    }
  }
  updateFinishInfo(remaining, kmh, now);
  const midLine = S.startTs ? 'T+' + fmtTime((Date.now() - S.startTs) / 1000) : '—';
  const tripX = formatTripHudExtraLine();
  const fullMid = tripX ? midLine + ' · ' + tripX : midLine;
  if(S.routeQuality === RouteQuality.LOW && !S.compassMode){
    $('mid-info').textContent = fullMid + ' · НИЗК. OSM';
  } else {
    $('mid-info').textContent = fullMid;
  }

  if(remaining < 30 && !S.camWarned.has('arrived')){
    S.camWarned.add('arrived');
    speak('Вы прибыли');
  }
  tickAutoMode();
  checkCamerasILS();
  checkCurveSpeedWarn(kmh);
  if(snap) tickSpeedLimit(snap);
  refreshFuelPanel();
  syncTripRefuelHud();
  tickNavMap();
  syncTripHudBadge();
}

function checkCurveSpeedWarn(kmh){
  if(!S.curveWarn || kmh < 20 || !S.route?.geometry?.curveReady) return;
  const snap = getNavSnap(S.smoothedHeading);
  if(!snap) return;
  const speedMps = kmh / 3.6;
  const warn = pickCurveVoiceWarn(S.route.geometry, snap.s, speedMps);
  if(!warn || S.camWarned.has(warn.key)) return;
  if(Date.now() - S.lastVoiceTs < 4000) return;
  S.camWarned.add(warn.key);
  S.lastVoiceTs = Date.now();
  speak('Снизьте скорость перед поворотом. Рекомендуется ' + warn.vSafeKmh + ' километров в час');
}

function r2(n){ return n != null && Number.isFinite(n) ? Math.round(n * 100) / 100 : null; }

export async function startHud(){
  clearHudChromeReveal();
  applyHudChrome();
  if(!S.route){
    alert('Сначала постройте маршрут');
    return;
  }
  saveLastRun();
  if(telemetry.isEnabled()){
    telemetry.start({ routeKm: S.route?.distance ? r2(S.route.distance / 1000) : null });
    telemetry.updateMarkButtonVisibility();
    logFunnel('ride_start', { routeKm: S.route?.distance ? r2(S.route.distance / 1000) : null });
  }
  resetConvergeTelemetryRide();
  if(isTrackRecordEnabled()) startTrackRecorder();
  S.startTs = Date.now();
  S.distDone = 0;
  S.measSpeed = null;
  S.camWarned.clear();
  resetOffRouteMachine();
  resetRouteSnap();
  resetSnapQuality();
  resetCurveRibbonState();
  resetSpeedLimitState();
  resetRoundaboutState();
  ensureRouteGeometry(S.route);
  $('setup').style.display = 'none';
  $('setup').style.zIndex = '30';
  $('hud').classList.add('on');
  $('hud').classList.toggle('show-compass', !!S.showCompass);
  closeHudSettingsSheet();
  resetVintageVfd();
  syncVintageVfdDomClasses();
  updateCamStatusUI();
  loadCameras(); // фоном, не блокирует старт
  acquireWakeLock();
  try{ await startNavigationGps(); }catch(e){ console.warn('FGS GPS:', e); }
  if(window.__SIM__?.onNavigationStart) window.__SIM__.onNavigationStart();
  if(!window.__SIM__){
    try{ document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }catch(e){}
  }
  speak('Маршрут построен. В пути ' + Math.round(S.route.duration / 60) + ' минут');
  S.dispSpeed = S.gps?.speed > 0 ? Math.min(S.gps.speed * 3.6, 198) : 0;
  onTick();
  startVisualLoop();
}

export async function stopHud(){
  if(window.__SIM__?.onNavigationStop) window.__SIM__.onNavigationStop();
  flushConvergeSummary();
  let telSessionId = null;
  try{ telSessionId = await telemetry.stop(); }catch(e){}
  telemetry.updateMarkButtonVisibility();
  if(telSessionId){
    logFunnel('ride_stop', { sessionId: telSessionId });
    import('./telemetry-ask.js').then(m => m.maybeShowSendPrompt(telSessionId)).catch(() => {});
  }
  const trackPts = stopTrackRecorder();
  if(trackPts.length >= 2) rememberLastRide(trackPts);
  stopVisualLoop();
  resetVintageVfd();
  stopNavigationGps().catch(() => {});
  S.fuelMode = 0;
  S.fuelSel = null;
  S.fuelOrigFinish = null;
  $('fuelPanel')?.classList.remove('on');
  $('btn-fuel')?.classList.remove('active');
  $('hud').classList.remove('on');
  clearHudChromeReveal();
  $('setup').style.display = 'block';
  renderFavs();
  const goBar = $('go-bar');
  if(goBar) goBar.classList.toggle('hidden', !(S.route && S.route.coords?.length));
  releaseWakeLock();
  clearVoiceQueue();
  resetOffRouteMachine();
  resetSpeedLimitState();
  resetRoundaboutState();
  resetViewMode();
  syncTripHudBadge();
  try{ document.exitFullscreen && document.exitFullscreen(); }catch(e){}
}

/* ============================================================
   ТОПЛИВНЫЙ АССИСТЕНТ — кнопка ⛽ на HUD
   Цикл: выкл → «по маршруту» → «ближайшая + маршрут» → выкл.
   ============================================================ */
let _fuelBusy = false;
let _fuelPanelShownAt = 0;
const FUEL_PANEL_MS = 9000;  // сколько держать крупную панель, затем прятать

function fmtDistPair(m){
  if(m == null || !isFinite(m)) return { v: '–', u: 'км' };
  if(m < 1000) return { v: String(Math.round(m / 10) * 10), u: 'м' };
  return { v: (m / 1000).toFixed(1), u: 'км' };
}

function setFuelPanel({ title, dist, sub, hint, color, searching, showReport }){
  const panel = $('fuelPanel');
  if(!panel) return;
  panel.style.setProperty('--fuel-c', color || '#66ccff');
  panel.classList.toggle('searching', !!searching);
  if(title != null) $('fp-title').textContent = title;
  if(dist !== undefined){
    const d = fmtDistPair(dist);
    $('fp-dist').textContent = d.v;
    $('fp-u').textContent = d.u;
  }
  if(sub != null) $('fp-sub').textContent = sub;
  if(hint != null) $('fp-hint').textContent = hint;
  const reportRow = $('fuel-report-row');
  if(reportRow){
    const on = showReport !== undefined ? showReport : (!searching && S.fuelMode > 0);
    reportRow.classList.toggle('hidden', !on);
  }
  panel.classList.add('on');
  _fuelPanelShownAt = Date.now();
}

function fuelSubLine(sel){
  if(!sel) return '';
  return sel.brand + ' · ' + fuelStatusText(sel.status) + crowdStatusSuffix(sel);
}

async function submitFuelCrowdReport(status){
  const pos = curPos() || S.gps;
  if(!pos){
    speak('Нет GPS для отметки');
    return;
  }
  recomputeFuelGeometry();
  const hint = nearestStationForReport(S.fuelStations, pos) || S.fuelSel;
  saveCrowdReport(status, hint ? {
    lat: hint.lat,
    lon: hint.lon,
    osmId: hint.osmId,
    brand: hint.brand
  } : { lat: pos.lat, lon: pos.lon });
  applyCrowdReports(S.fuelStations);
  if(S.fuelSel) applyCrowdReports([S.fuelSel]);
  const sel = S.fuelSel || nearestStationForReport(S.fuelStations, pos);
  if(sel){
    setFuelPanel({
      title: $('fp-title')?.textContent,
      sub: fuelSubLine(sel),
      color: fuelColor(sel.status),
      showReport: true
    });
  }
  speak('Отметка: ' + fuelStatusText(status));
}

export function initFuelReportUi(){
  const row = $('fuel-report-row');
  if(!row || row.dataset.bound) return;
  row.dataset.bound = '1';
  row.querySelectorAll('[data-fuel-st]').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      const st = btn.getAttribute('data-fuel-st');
      if(st) submitFuelCrowdReport(st);
    });
  });
}

function updateFuelButton(){
  const b = $('btn-fuel');
  if(b) b.classList.toggle('active', S.fuelMode > 0);
}

async function rerouteToFuel(){
  try{
    S.routeAlternatives = [];
    await buildRoute();
    loadCameras();
    S.camWarned.clear();
  }catch(e){ console.warn('Пересчёт к заправке не удался:', e); }
}

/** Живое обновление дистанции в панели на каждом тике.
    Крупную панель прячем по таймауту (режим и символы на дорожке остаются). */
export function refreshFuelPanel(){
  const panel = $('fuelPanel');
  if(panel && panel.classList.contains('on') && _fuelPanelShownAt &&
     Date.now() - _fuelPanelShownAt > FUEL_PANEL_MS){
    panel.classList.remove('on');
  }
  if(S.fuelMode === 0 || !S.fuelSel) return;
  const sel = S.fuelSel;
  const dist = S.fuelMode === 2 ? getRemainingDistance()
             : (sel.distAhead != null && isFinite(sel.distAhead) ? sel.distAhead : sel.distGps);
  const d = fmtDistPair(dist);
  $('fp-dist').textContent = d.v;
  $('fp-u').textContent = d.u;
}

export async function cycleFuelAssist(){
  if(_fuelBusy) return;
  _fuelBusy = true;
  const b = $('btn-fuel');
  try{
    if(S.fuelMode === 0 && S.fuelStatus !== 'ready'){
      setFuelPanel({ title: '⛽ ПОИСК ЗАПРАВОК…', dist: null, sub: 'загрузка данных', hint: '', color: '#66ccff', searching: true });
      await ensureFuelStations();
    }
    if(!S.fuelStations.length){
      setFuelPanel({ title: '⛽ АЗС НЕ НАЙДЕНЫ', dist: null, sub: 'нет данных поблизости', hint: 'нажмите ⛽ ещё раз — скрыть', color: '#ff3b30', searching: false });
      if(S.fuelMode !== 0){ await cancelFuelAssist(false); }
      S.fuelMode = 0;
      return;
    }
    const next = (S.fuelMode + 1) % 3;

    if(next === 1){
      let sel = bestAlongRoute();
      let onRoute = !!sel;
      if(!sel) sel = nearestOverall();
      if(!sel){ S.fuelMode = 0; return; }
      S.fuelMode = 1;
      S.fuelSel = sel;
      const dist = onRoute ? sel.distAhead : sel.distGps;
      setFuelPanel({
        title: onRoute ? '⛽ ПО МАРШРУТУ' : '⛽ РЯДОМ (нет по маршруту)',
        dist,
        sub: fuelSubLine(sel),
        hint: '⛽ ещё раз — ближайшая с заездом',
        color: fuelColor(sel.status)
      });
      const km = dist >= 1000 ? Math.round(dist / 1000) + ' километр' : Math.round(dist / 100) * 100 + ' метров';
      speak('Заправка ' + (onRoute ? 'по маршруту' : 'рядом') + ' через ' + km + '. ' + sel.brand +
        (sel.status !== 'unknown' ? ', ' + fuelStatusText(sel.status) : ''));

    } else if(next === 2){
      let sel = nearestOverall(S.fuelSel) || bestAlongRoute();
      if(!sel){ return; }
      if(!S.fuelOrigFinish) S.fuelOrigFinish = S.finish;
      S.fuelMode = 2;
      S.fuelSel = sel;
      S.finish = { lat: sel.lat, lon: sel.lon, label: sel.brand || 'АЗС' };
      setFuelPanel({
        title: '⛽ БЛИЖАЙШАЯ — МАРШРУТ…',
        dist: sel.distGps,
        sub: fuelSubLine(sel),
        hint: '⛽ ещё раз — отмена, вернуть маршрут',
        color: fuelColor(sel.status)
      });
      speak('Строю маршрут к ближайшей заправке. ' + sel.brand);
      await rerouteToFuel();
      setFuelPanel({ title: '⛽ БЛИЖАЙШАЯ ЗАПРАВКА', dist: getRemainingDistance() });
      onTick();

    } else {
      await cancelFuelAssist(true);
    }
  } finally {
    updateFuelButton();
    _fuelBusy = false;
  }
}

async function cancelFuelAssist(reroute){
  const orig = S.fuelOrigFinish;
  S.fuelMode = 0;
  S.fuelSel = null;
  S.fuelOrigFinish = null;
  $('fuelPanel')?.classList.remove('on');
  if(reroute && orig){
    S.finish = orig;
    speak('Отмена. Возврат к маршруту');
    await rerouteToFuel();
    onTick();
  }
}

export async function selectQuickFinish(id, loadFavs, buildAndLoad){
  const fav = loadFavs().find(f => f.id === id);
  if(!fav) return;
  S.finish = { lat: fav.lat, lon: fav.lon, label: fav.name };
  $('quickFinish').classList.remove('on');
  $('mid-info').textContent = 'Пересчёт…';
  speak('Новый финиш ' + fav.name + '. Пересчёт маршрута');
  try{
    await buildAndLoad();
    S.camWarned.clear();
    onTick();
  }catch(e){
    console.warn('Смена финиша не удалась:', e);
    $('mid-info').textContent = 'Ошибка пересчёта';
  }
}
