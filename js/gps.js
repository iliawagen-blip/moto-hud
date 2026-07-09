import { S } from './state.js';
import { bearing, haversine } from './geo.js';
import { $ } from './util.js';
import { isNative, isSim } from './platform.js';
import {
  startSetupGps, stopSetupGps, startNavGps, stopNavGps, stopAllNativeGps
} from './native-gps.js';
import {
  fuseHeading, startHeadingSensors, stopHeadingSensors, updateHeadingHealth
} from './heading.js';
import telemetry from './telemetry.js';
import { getNavSnap } from './route-geometry.js';
import {
  FUSION_GPS_WEIGHT_MIN, FUSION_GPS_WEIGHT_SPAN,
  GPS_INVALIDATE_ACC_M, GPS_LOST_RECONVERGE_MS,
  GPS_SPEED_MAX_MPS, GPS_SPEED_ACC_TRUST_M, GPS_SPEED_STATIONARY_DIST_M,
  GPS_SPEED_MEAS_MIN_DIST_M, GPS_SPEED_DEVICE_MEAS_RATIO
} from './nav-constants.js';
import { isSpeedOverLimit } from './speed-limit.js';
import { tickRoundaboutHudRefresh } from './roundabout.js';
import { tickNavMap } from './nav-map.js';
import { feedGpsConverge, invalidateGpsConverge, hasEverConverged } from './gps-converge.js';
import { isSnapLost, lostDurationMs } from './snap-quality.js';
import { tickConvergeBlocked } from './converge-telemetry.js';
import { SNAP_HEADING_MAX_AGE_MS } from './nav-constants.js';

let RENDER_POS = null;
let _navMode = false;
let _gpsLost = false;

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
  const raw = S.gps.speed != null && S.gps.speed >= 0 ? S.gps.speed * 3.6 : 0;
  const target = Math.min(raw, GPS_SPEED_MAX_MPS * 3.6);
  S.dispSpeed += (target - S.dispSpeed) * 0.22;
  if(Math.abs(target - S.dispSpeed) < 0.3) S.dispSpeed = target;
  const shown = Math.round(S.dispSpeed);
  el.textContent = shown;
  el.classList.toggle('over', isSpeedOverLimit(target));
  el.classList.toggle('speed-3', shown >= 100);
}

/** Фильтрация speed: плохой acc, скачки чипа, стоянка в радиусе шума. */
function resolveGpsSpeed(next, prev){
  const acc = next.acc ?? 999;
  const device = (next.speed != null && !isNaN(next.speed) && next.speed >= 0) ? next.speed : null;
  let meas = 0;
  let dist = 0;
  if(prev){
    const dt = (next.ts - prev.ts) / 1000;
    if(dt > 0.15 && dt < 12){
      dist = haversine(prev, next);
      if(dist >= GPS_SPEED_MEAS_MIN_DIST_M && dist < 500) meas = dist / dt;
    }
  }

  const noiseRadius = Math.max(GPS_SPEED_STATIONARY_DIST_M, acc * 0.55);
  if(prev && dist < noiseRadius) return 0;

  if(device != null && device <= GPS_SPEED_MAX_MPS && acc <= GPS_SPEED_ACC_TRUST_M){
    if(!prev || meas <= 0 || device <= meas * GPS_SPEED_DEVICE_MEAS_RATIO + 1.5){
      return device;
    }
  }

  if(meas > GPS_SPEED_MAX_MPS) meas = 0;
  if(meas > 0 && (acc <= GPS_SPEED_ACC_TRUST_M * 2 || dist > acc)){
    return S.measSpeed == null ? meas : S.measSpeed * 0.55 + meas * 0.45;
  }
  return 0;
}

let _onTick = () => {};
let _onVisual = () => {};

export function initGps(callbacks){
  _onTick = callbacks.onTick || _onTick;
  _onVisual = callbacks.onVisual || _onVisual;
}

export function visualLoop(){
  S.rafId = requestAnimationFrame(visualLoop);
  if(!$('hud').classList.contains('on')) return;
  telemetry.tickPerfFrame();
  updateRenderPos();
  tickNavMap();
  easeSpeed();
  tickRoundaboutHudRefresh(_onTick);
  _onVisual();
}

export function startVisualLoop(){
  if(!S.rafId) S.rafId = requestAnimationFrame(visualLoop);
}

export function stopVisualLoop(){
  if(S.rafId){ cancelAnimationFrame(S.rafId); S.rafId = null; }
}

function updateGpsConvergeUI(){
  const el = $('gps-converge');
  if(el){
    el.classList.toggle('on', $('hud').classList.contains('on') && !S.gpsConverged);
  }
  if(S.gpsConverged){
    const tag = isSim() ? ' сим' : '';
    $('s-gps').textContent = '✅ GPS' + tag + ' ±' + Math.round(S.gps?.acc || 0) + 'м';
    $('s-gps').className = 'chip ok';
  } else if(S.gps){
    const acc = S.gps.acc != null ? Math.round(S.gps.acc) + 'м' : '…';
    $('s-gps').textContent = '⏳ GPS ±' + acc;
    $('s-gps').className = 'chip';
  } else {
    $('s-gps').textContent = '⏳ GPS…';
    $('s-gps').className = 'chip';
  }
  checkStartReady();
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
  invalidateGpsConverge('invalidate_error');
  if(!_gpsLost){
    _gpsLost = true;
    telemetry.log('nav', { sub: 'gps_lost' });
  }
}

export function applyGpsFix(next){
  if(S.lastPos){
    const d = haversine(S.lastPos, next);
    const dt = (next.ts - S.lastPos.ts) / 1000;
    if(d > 3 && d < 500) S.distDone += d;
    if((next.heading == null || isNaN(next.heading)) && d > 3){
      next.heading = bearing(S.lastPos, next);
    }
  }
  const resolved = resolveGpsSpeed(next, S.lastPos);
  S.measSpeed = resolved;
  next.speed = resolved;
  updateHeadingHealth(next.heading, next.speed ?? S.measSpeed);
  const fused = fuseHeading(next.heading, next.speed ?? S.measSpeed);
  if(fused != null && !isNaN(fused)) next.heading = fused;

  if(next.heading != null && !isNaN(next.heading)){
    if((next.speed ?? 0) >= 3.2) S.lastReliableHeadingTs = Date.now();
    if(S.smoothedHeading == null) S.smoothedHeading = next.heading;
    else {
      const spd = next.speed ?? S.measSpeed ?? 0;
      const alpha = Math.min(1, FUSION_GPS_WEIGHT_MIN + spd / FUSION_GPS_WEIGHT_SPAN);
      const keep = 1 - alpha;
      const r = Math.PI / 180, d = 180 / Math.PI;
      const sx = Math.sin(S.smoothedHeading * r) * keep + Math.sin(next.heading * r) * alpha;
      const sy = Math.cos(S.smoothedHeading * r) * keep + Math.cos(next.heading * r) * alpha;
      S.smoothedHeading = (Math.atan2(sx, sy) * d + 360) % 360;
    }
  }
  S.lastPos = next;
  S.gps = next;
  S.fixPos = { lat: next.lat, lon: next.lon };
  S.fixAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());

  let telSnap = null;
  let navSnap = null;
  if($('hud').classList.contains('on') && S.route?.geometry){
    navSnap = getNavSnap(S.smoothedHeading);
    if(navSnap) telSnap = { lateral: navSnap.lateral, quality: S.snapQuality };
  }
  const telCtx = { fix: next, snap: telSnap };

  feedGpsConverge(next, telCtx);
  if(next.acc != null && next.acc > GPS_INVALIDATE_ACC_M) invalidateGpsConverge('invalidate_acc', telCtx);
  if($('hud').classList.contains('on') && isSnapLost() && lostDurationMs() > GPS_LOST_RECONVERGE_MS){
    telemetry.log('nav', {
      sub: 'snap_lost_long',
      lat_off: telSnap?.lateral != null ? Math.round(telSnap.lateral) : null,
      acc: next.acc != null ? Math.round(next.acc * 10) / 10 : null,
      lost_ms: Math.round(lostDurationMs())
    });
  }
  updateGpsConvergeUI();
  tickConvergeBlocked(next, telSnap);
  if($('hud').classList.contains('on')){
    _onTick();
    if(S.viewMode !== 'hud') tickNavMap({ force: true });
  }

  const rcv = Date.now();
  if(_gpsLost){
    _gpsLost = false;
    telemetry.log('nav', { sub: 'gps_restored' });
  }
  telemetry.logFix({
    lat: next.lat, lon: next.lon, acc: next.acc,
    speed: next.speed, heading: next.heading, alt: next.alt,
    ts: next.ts, rcv
  });
  telemetry.logTrackPoint({
    lat: next.lat, lon: next.lon, acc: next.acc,
    speed: next.speed, heading: next.heading, ts: next.ts
  });
  if(navSnap) telemetry.logSnapFromResult(navSnap);
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
        acc: c.accuracy,
        alt: c.altitude != null && !isNaN(c.altitude) ? c.altitude : null,
        ts: pos.timestamp
      });
    },
    onGpsError,
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
  );
}

/** GPS на экране настройки (без foreground-service) */
export function startGps(){
  _navMode = false;
  startHeadingSensors();
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
  stopHeadingSensors();
  if(isNative()) await stopAllNativeGps();
}
