import { S } from './state.js';
import { $, fmtClock, fmtTime, fmtRemainDur } from './util.js';
import { haversine, bearing, angleDiff } from './geo.js';
import { curPos } from './gps.js';
import {
  buildRoute, loadCameras, saveLastRun, findNearestOnRoute,
  findNextManeuver, getRemainingDistance
} from './route.js';
import { speak, maneuverText, isTurnStep, isCameraBehind } from './voice.js';
import { buildArrowSVG } from './render.js';
import { startVisualLoop, stopVisualLoop, startNavigationGps, stopNavigationGps } from './gps.js';
import {
  ensureFuelStations, bestAlongRoute, nearestOverall,
  fuelColor, fuelStatusText
} from './fuel.js';
import { updateCamStatusUI } from './cam-status.js';
import { resetRouteSnap, getRouteSnapForNav } from './route-geometry.js';
import { ensureRouteGeometry } from './route.js';
import { pickCurveVoiceWarn, resetCurveRibbonState } from './curve-speed.js';
import { renderFavs } from './favorites.js';
import { acquireWakeLock, releaseWakeLock } from './wake-lock.js';
import { clearVoiceQueue } from './voice.js';
import { getHeadingHealth } from './heading.js';
import { tickAutoMode } from './theme-manager.js';
import { applyFinishInfoVisibility } from './hud-opts.js';
import { tickOffRouteMachine, resetOffRouteMachine } from './offroute.js';
import telemetry from './telemetry.js';
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
  let closest = null;
  S.cameras.forEach((c, i) => {
    const d = haversine(S.gps, c);
    if(d > radius) return;
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

  const remaining = getRemainingDistance();
  const nm = findNextManeuver();
  if(nm){
    $('arrow-box').innerHTML = buildArrowSVG(nm.step);
    if(nm.dist < 1000){
      $('v-mdist').textContent = Math.max(0, Math.round(nm.dist / 10) * 10);
      $('v-mdist-u').textContent = 'м';
    } else {
      $('v-mdist').textContent = (nm.dist / 1000).toFixed(1);
      $('v-mdist-u').textContent = 'км';
    }
    $('street').textContent = (nm.step.name || '').toUpperCase() || '—';
    const stIdx = S.route.steps.indexOf(nm.step);
    const kFar = 'st_' + stIdx + '_far';
    const kNear = 'st_' + stIdx + '_near';
    if(isTurnStep(nm.step)){
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
    }
  }
  updateFinishInfo(remaining, kmh, now);
  $('mid-info').textContent = S.startTs ? 'T+' + fmtTime((Date.now() - S.startTs) / 1000) : '—';

  const near = findNearestOnRoute();
  const snap = getRouteSnapForNav(S.smoothedHeading);
  const spdMps = S.gps.speed != null && S.gps.speed >= 0 ? S.gps.speed : 0;
  tickOffRouteMachine({
    lateral: near?.dist,
    acc: S.gps.acc || 0,
    spdMps,
    spdKmh: kmh,
    heading: S.smoothedHeading,
    tangent: snap?.tangent ?? null
  });
  if(remaining < 30 && !S.camWarned.has('arrived')){
    S.camWarned.add('arrived');
    speak('Вы прибыли');
  }
  tickAutoMode();
  checkCamerasILS();
  checkCurveSpeedWarn(kmh);
  refreshFuelPanel();
}

function checkCurveSpeedWarn(kmh){
  if(!S.curveWarn || kmh < 20 || !S.route?.geometry?.curveReady) return;
  const snap = getRouteSnapForNav(S.smoothedHeading);
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
  applyFinishInfoVisibility();
  if(!S.route){
    alert('Сначала постройте маршрут');
    return;
  }
  saveLastRun();
  if(telemetry.isEnabled()){
    telemetry.start({ routeKm: S.route?.distance ? r2(S.route.distance / 1000) : null });
    telemetry.updateMarkButtonVisibility();
  }
  S.startTs = Date.now();
  S.distDone = 0;
  S.camWarned.clear();
  resetOffRouteMachine();
  resetRouteSnap();
  resetCurveRibbonState();
  ensureRouteGeometry(S.route);
  $('setup').style.display = 'none';
  $('setup').style.zIndex = '30';
  $('hud').classList.add('on');
  $('hud').classList.toggle('show-compass', !!S.showCompass);
  updateCamStatusUI();
  loadCameras(); // фоном, не блокирует старт
  acquireWakeLock();
  try{ await startNavigationGps(); }catch(e){ console.warn('FGS GPS:', e); }
  if(!window.__SIM__){
    try{ document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }catch(e){}
  }
  speak('Маршрут построен. В пути ' + Math.round(S.route.duration / 60) + ' минут');
  S.dispSpeed = S.gps && S.gps.speed > 0 ? S.gps.speed * 3.6 : 0;
  onTick();
  startVisualLoop();
}

export function stopHud(){
  telemetry.stop().catch(() => {});
  telemetry.updateMarkButtonVisibility();
  stopVisualLoop();
  stopNavigationGps().catch(() => {});
  S.fuelMode = 0;
  S.fuelSel = null;
  S.fuelOrigFinish = null;
  $('fuelPanel')?.classList.remove('on');
  $('btn-fuel')?.classList.remove('active');
  $('hud').classList.remove('on');
  $('setup').style.display = 'block';
  renderFavs();
  const goBar = $('go-bar');
  if(goBar) goBar.classList.toggle('hidden', !(S.route && S.route.coords?.length));
  releaseWakeLock();
  clearVoiceQueue();
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

function setFuelPanel({ title, dist, sub, hint, color, searching }){
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
  panel.classList.add('on');
  _fuelPanelShownAt = Date.now();
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
        sub: sel.brand + ' · ' + fuelStatusText(sel.status),
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
        sub: sel.brand + ' · ' + fuelStatusText(sel.status),
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
