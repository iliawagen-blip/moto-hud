/**
 * Сходимость GPS перед валидным HUD.
 * @module gps-converge
 */
import { S } from './state.js';
import { haversine } from './geo.js';
import { isSim } from './platform.js';
import {
  GPS_CONVERGE_MIN_FIXES, GPS_CONVERGE_LAST3_ACC_M, GPS_CONVERGE_ACC_M,
  GPS_CONVERGE_RE_MIN_FIXES, GPS_CONVERGE_RE_ACC_M, GPS_CONVERGE_JUMP_PAD_M
} from './nav-constants.js';

const _buf = [];
let _gpsFixCount = 0;

export function resetGpsConverge(){
  _buf.length = 0;
  _gpsFixCount = 0;
  S.gpsConverged = false;
  S.gpsFixCount = 0;
}

function isNetworkFix(fix){
  return fix.provider === 'network' || fix.lowAccuracy === true;
}

function maxJump(v, dt, acc){
  return (v || 0) * dt + (acc || GPS_CONVERGE_ACC_M) + GPS_CONVERGE_JUMP_PAD_M;
}

function checkBuffer(minFixes, accLimit){
  if(_buf.length < minFixes) return false;
  const recent = _buf.slice(-minFixes);
  if(recent.some(f => isNetworkFix(f) || f.acc > accLimit)) return false;
  let gpsStreak = 0;
  for(const f of recent){
    if(isNetworkFix(f)) gpsStreak = 0;
    else gpsStreak++;
  }
  if(gpsStreak < 2) return false;
  for(let i = 1; i < recent.length; i++){
    const a = recent[i - 1];
    const b = recent[i];
    const dt = Math.max(0.2, (b.ts - a.ts) / 1000);
    const v = Math.max(a.speed || 0, b.speed || 0);
    const d = haversine(a, b);
    if(d > maxJump(v, dt, Math.max(a.acc, b.acc))) return false;
  }
  if(minFixes >= GPS_CONVERGE_MIN_FIXES){
    const last3 = _buf.slice(-3);
    if(last3.length < 3 || last3.some(f => f.acc > GPS_CONVERGE_LAST3_ACC_M)) return false;
  }
  return true;
}

/**
 * @param {object} fix — lat, lon, acc, speed, ts, provider?
 */
export function feedGpsConverge(fix){
  if(!fix) return S.gpsConverged;
  if(isSim()){
    S.gpsConverged = true;
    return true;
  }
  const acc = fix.acc != null && Number.isFinite(fix.acc) ? fix.acc : 50;
  if(!isNetworkFix(fix)) _gpsFixCount++;
  S.gpsFixCount = _gpsFixCount;

  _buf.push({
    lat: fix.lat, lon: fix.lon, acc,
    speed: fix.speed, ts: fix.ts, provider: fix.provider
  });
  while(_buf.length > 8) _buf.shift();

  const re = S.gpsConverged === false && _buf.length >= 2;
  const minFixes = re ? GPS_CONVERGE_RE_MIN_FIXES : GPS_CONVERGE_MIN_FIXES;
  const accLim = re ? GPS_CONVERGE_RE_ACC_M : GPS_CONVERGE_ACC_M;

  if(checkBuffer(minFixes, accLim)) S.gpsConverged = true;
  else if(!re && _buf.length < minFixes) S.gpsConverged = false;

  return S.gpsConverged;
}

export function invalidateGpsConverge(){
  S.gpsConverged = false;
}
