/**
 * Сшивка курса: ROTATION_VECTOR / DeviceOrientation + GPS (Фаза 3, MVP).
 * На скорости > ~12 км/ч — GPS; на малой / стоянке — сенсор (если доступен).
 * При помехах магнитометра — fallback на GPS-курс.
 */
import { angleDiff } from './geo.js';
import { FUSION_GPS_WEIGHT_MIN, FUSION_GPS_WEIGHT_SPAN } from './nav-constants.js';

let sensorHeading = null;
let sensorTs = 0;
let listening = false;

let forceGps = false;
let disagreeSince = 0;
let calibratingUntil = 0;

const DISAGREE_DEG = 55;
const DISAGREE_MS = 4500;
const RECOVER_DEG = 28;

function readOrientation(e){
  let h = null;
  if(typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)){
    h = e.webkitCompassHeading;
  } else if(e.absolute && e.alpha != null && !isNaN(e.alpha)){
    h = (360 - e.alpha) % 360;
  }
  if(h == null || isNaN(h)) return;
  sensorHeading = (h + 360) % 360;
  sensorTs = Date.now();
}

function blendAngles(a, b, wB){
  const r = Math.PI / 180;
  const sx = Math.sin(a * r) * (1 - wB) + Math.sin(b * r) * wB;
  const sy = Math.cos(a * r) * (1 - wB) + Math.cos(b * r) * wB;
  return (Math.atan2(sx, sy) * 180 / Math.PI + 360) % 360;
}

/** Запуск слушателя ориентации (без iOS prompt — только если уже разрешено) */
export function startHeadingSensors(){
  if(listening || typeof window === 'undefined') return;
  window.addEventListener('deviceorientationabsolute', readOrientation, true);
  window.addEventListener('deviceorientation', readOrientation, true);
  listening = true;
}

export function stopHeadingSensors(){
  if(!listening || typeof window === 'undefined') return;
  window.removeEventListener('deviceorientationabsolute', readOrientation, true);
  window.removeEventListener('deviceorientation', readOrientation, true);
  listening = false;
  sensorHeading = null;
  forceGps = false;
  disagreeSince = 0;
  calibratingUntil = 0;
}

/** iOS 13+: запрос разрешения на компас (вызов по жесту пользователя) */
export async function requestHeadingPermission(){
  const DO = window.DeviceOrientationEvent;
  if(DO && typeof DO.requestPermission === 'function'){
    try{
      const st = await DO.requestPermission();
      return st === 'granted';
    }catch(e){ return false; }
  }
  return true;
}

/**
 * Калибровка «восьмёркой» — сброс флага помех на durationMs.
 * @param {number} [durationMs]
 */
export function startCompassCalibration(durationMs = 15000){
  calibratingUntil = Date.now() + durationMs;
  forceGps = false;
  disagreeSince = 0;
  startHeadingSensors();
}

export function isCalibrating(){
  return Date.now() < calibratingUntil;
}

export function getHeadingHealth(){
  return {
    forceGps,
    calibrating: isCalibrating(),
    interference: forceGps && !isCalibrating(),
    sensorFresh: sensorHeading != null && (Date.now() - sensorTs) < 2500
  };
}

/**
 * Обновление детектора помех (вызывать до fuseHeading на каждом GPS-fix).
 * @param {number|null} gpsHeading
 * @param {number|null} speedMps
 */
export function updateHeadingHealth(gpsHeading, speedMps){
  const spd = speedMps ?? 0;
  const sensorFresh = sensorHeading != null && (Date.now() - sensorTs) < 2500;

  if(isCalibrating()){
    forceGps = false;
    disagreeSince = 0;
    return getHeadingHealth();
  }

  if(!sensorFresh || gpsHeading == null || isNaN(gpsHeading)){
    disagreeSince = 0;
    return getHeadingHealth();
  }

  const diff = angleDiff(gpsHeading, sensorHeading);
  if(spd < 8 && diff > DISAGREE_DEG){
    if(!disagreeSince) disagreeSince = Date.now();
    else if(Date.now() - disagreeSince > DISAGREE_MS) forceGps = true;
  } else {
    disagreeSince = 0;
    if(diff < RECOVER_DEG && spd > 4) forceGps = false;
  }
  return getHeadingHealth();
}

/**
 * Сшивка GPS-курса и сенсора. Возвращает курс или null.
 * @param {number|null} gpsHeading
 * @param {number|null} speedMps
 */
export function fuseHeading(gpsHeading, speedMps){
  const sensorFresh = sensorHeading != null && (Date.now() - sensorTs) < 2500;
  const spd = speedMps ?? 0;

  if(forceGps && !isCalibrating() && gpsHeading != null && !isNaN(gpsHeading) && spd >= 3.2){
    return gpsHeading;
  }

  if(!sensorFresh) return gpsHeading ?? null;

  const gpsWeight = Math.min(1, FUSION_GPS_WEIGHT_MIN + spd / FUSION_GPS_WEIGHT_SPAN);

  if(gpsHeading == null || isNaN(gpsHeading)) return sensorHeading;
  if(gpsWeight >= 0.95) return gpsHeading;
  if(gpsWeight <= 0.05) return sensorHeading;

  if(angleDiff(gpsHeading, sensorHeading) > 45 && spd < 3){
    return sensorHeading;
  }
  return blendAngles(gpsHeading, sensorHeading, 1 - gpsWeight);
}

export function getSensorHeading(){ return sensorHeading; }
