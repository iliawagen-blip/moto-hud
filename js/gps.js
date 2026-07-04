import { S } from './state.js';
import { bearing, haversine } from './geo.js';
import { $ } from './util.js';
import { isNative } from './platform.js';
import {
  startSetupGps, stopSetupGps, startNavGps, stopNavGps, stopAllNativeGps
} from './native-gps.js';

let RENDER_POS = null;
let _navMode = false;

export function curPos(){ return RENDER_POS || S.gps; }

export function updateRenderPos(){
  if(!S.gps){ RENDER_POS = null; return; }
  const v = (S.gps.speed != null && S.gps.speed > 0.6) ? S.gps.speed : 0;
  const hdg = (S.smoothedHeading != null && !isNaN(S.smoothedHeading))
    ? S.smoothedHeading : S.gps.heading;
  if(!v || hdg == null || isNaN(hdg) || !S.fixPos){ RENDER_POS = S.gps; return; }
  const rad = Math.PI / 180;
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const dt = Math.min(1.6, Math.max(0, (now - S.fixAt) / 1000));
  const dist = v * dt;
  RENDER_POS = {
    lat: S.fixPos.lat + dist * Math.cos(hdg * rad) / 110540,
    lon: S.fixPos.lon + dist * Math.sin(hdg * rad) / (Math.cos(S.fixPos.lat * rad) * 111320),
    speed: S.gps.speed, heading: S.gps.heading, acc: S.gps.acc
  };
}

export function easeSpeed(){
  const el = $('v-speed');
  if(!el || !S.gps) return;
  const target = S.gps.speed != null && S.gps.speed >= 0 ? S.gps.speed * 3.6 : 0;
  S.dispSpeed += (target - S.dispSpeed) * 0.22;
  if(Math.abs(target - S.dispSpeed) < 0.3) S.dispSpeed = target;
  const shown = Math.round(S.dispSpeed);
  el.textContent = shown;
  el.classList.toggle('over', S.limit > 0 && target > S.limit + 3);
  el.classList.toggle('speed-3', shown >= 100);
}

let _onTick = () => {};
let _onVisual = () => {};
let _lastPathBuild = 0;

export function initGps(callbacks){
  _onTick = callbacks.onTick || _onTick;
  _onVisual = callbacks.onVisual || _onVisual;
}

export function visualLoop(ts){
  S.rafId = requestAnimationFrame(visualLoop);
  if(!$('hud').classList.contains('on')) return;
  updateRenderPos();
  easeSpeed();
  if(ts - _lastPathBuild >= 33){
    _lastPathBuild = ts;
    _onVisual();
  }
}

export function startVisualLoop(){
  if(!S.rafId) S.rafId = requestAnimationFrame(visualLoop);
}

export function stopVisualLoop(){
  if(S.rafId){ cancelAnimationFrame(S.rafId); S.rafId = null; }
}

export function checkStartReady(){
  const hasRoute = !!(S.route && S.route.coords && S.route.coords.length);
  $('btn-start').disabled = !(S.gps && S.finish && hasRoute);
  const buildBtn = $('btn-build-route');
  if(buildBtn) buildBtn.disabled = !(S.gps && S.finish);
}

function onGpsError(){
  $('s-gps').textContent = '❌ GPS';
  $('s-gps').className = 'chip err';
}

export function applyGpsFix(next){
  if(S.lastPos){
    const d = haversine(S.lastPos, next);
    const dt = (next.ts - S.lastPos.ts) / 1000;
    if(d > 3 && d < 500) S.distDone += d;
    if((next.heading == null || isNaN(next.heading)) && d > 3){
      next.heading = bearing(S.lastPos, next);
    }
    if(next.speed == null && dt > 0.2 && dt < 10){
      const meas = d > 2.5 && d < 500 ? d / dt : 0;
      S.measSpeed = S.measSpeed == null ? meas : S.measSpeed * 0.6 + meas * 0.4;
      next.speed = S.measSpeed;
    }
  }
  if(next.heading != null && !isNaN(next.heading)){
    if(S.smoothedHeading == null) S.smoothedHeading = next.heading;
    else {
      const r = Math.PI / 180, d = 180 / Math.PI;
      const sx = Math.sin(S.smoothedHeading * r) * 0.7 + Math.sin(next.heading * r) * 0.3;
      const sy = Math.cos(S.smoothedHeading * r) * 0.7 + Math.cos(next.heading * r) * 0.3;
      S.smoothedHeading = (Math.atan2(sx, sy) * d + 360) % 360;
    }
  }
  S.lastPos = next;
  S.gps = next;
  S.fixPos = { lat: next.lat, lon: next.lon };
  S.fixAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  $('s-gps').textContent = '✅ GPS ±' + Math.round(next.acc) + 'м';
  $('s-gps').className = 'chip ok';
  checkStartReady();
  if($('hud').classList.contains('on')) _onTick();
}

function stopWebGps(){
  if(S.watchId !== null && navigator.geolocation){
    navigator.geolocation.clearWatch(S.watchId);
    S.watchId = null;
  }
}

function startWebGps(){
  if(!navigator.geolocation){
    $('s-gps').textContent = '❌ Нет GPS';
    $('s-gps').className = 'chip err';
    return;
  }
  stopWebGps();
  $('s-gps').textContent = '⏳ GPS…';
  $('s-gps').className = 'chip';
  S.watchId = navigator.geolocation.watchPosition(
    pos => {
      const c = pos.coords;
      applyGpsFix({
        lat: c.latitude, lon: c.longitude,
        speed: (c.speed != null && !isNaN(c.speed) && c.speed >= 0) ? c.speed : null,
        heading: c.heading == null ? null : c.heading,
        acc: c.accuracy, ts: pos.timestamp
      });
    },
    onGpsError,
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
  );
}

/** GPS на экране настройки (без foreground-service) */
export function startGps(){
  _navMode = false;
  if(isNative()){
    $('s-gps').textContent = '⏳ GPS…';
    $('s-gps').className = 'chip';
    stopWebGps();
    startSetupGps(applyGpsFix, onGpsError).catch(onGpsError);
    return;
  }
  startWebGps();
}

/** GPS с foreground-service — при активной навигации (Android) */
export async function startNavigationGps(){
  if(!isNative()) return;
  _navMode = true;
  await startNavGps(applyGpsFix, onGpsError);
}

/** Вернуться к обычному GPS после остановки поездки */
export async function stopNavigationGps(){
  if(!isNative()) return;
  _navMode = false;
  await stopNavGps();
  await startSetupGps(applyGpsFix, onGpsError).catch(onGpsError);
}

export function isNavGpsMode(){ return _navMode; }

export async function stopAllGps(){
  stopWebGps();
  if(isNative()) await stopAllNativeGps();
}
