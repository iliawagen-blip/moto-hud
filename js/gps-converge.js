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
import { noteConvergeTransition } from './converge-telemetry.js';
import { effectiveAccM, CONVERGE_FAIL_LABELS } from './gps-accuracy.js';

const _buf = [];
let _gpsFixCount = 0;
let _everConverged = false;
let _lastFailDetail = null;

/** Причина последнего отказа converge (для отладки / title чипа). */
export function getConvergeFailDetail(){
  return _lastFailDetail;
}

export function getConvergeFailLabel(){
  return _lastFailDetail ? (CONVERGE_FAIL_LABELS[_lastFailDetail] || _lastFailDetail) : null;
}

/** Был ли хотя бы один успешный converge в этой сессии навигации */
export function hasEverConverged(){
  return _everConverged;
}

export function resetGpsConverge(){
  _buf.length = 0;
  _gpsFixCount = 0;
  S.gpsConverged = false;
  S.gpsFixCount = 0;
  _everConverged = false;
}

function isNetworkFix(fix){
  return fix.provider === 'network';
}

function fixWithEffectiveAcc(f, ctx){
  const buf = ctx?.length ? ctx : [f];
  const eff = effectiveAccM(f.acc, buf);
  return { ...f, acc: eff, reportedAcc: f.acc };
}

function jumpLimitM(a, b, accA, accB){
  const dt = Math.max(0.2, (b.ts - a.ts) / 1000);
  const v = Math.max(a.speed || 0, b.speed || 0);
  const acc = Math.max(accA ?? GPS_CONVERGE_ACC_M, accB ?? GPS_CONVERGE_ACC_M);
  const stationary = v < 1.2;
  if(stationary) return Math.max(75, acc * 0.5);
  return (v || 0) * dt + acc + GPS_CONVERGE_JUMP_PAD_M;
}

function evaluateBuffer(minFixes, accLimit){
  if(_buf.length < minFixes) return { ok: false, fail_detail: 'buffer_short' };
  const ctx = _buf.slice(-Math.max(minFixes, 5));
  const recent = _buf.slice(-minFixes).map(f => fixWithEffectiveAcc(f, ctx));
  if(recent.some(f => isNetworkFix(f))) return { ok: false, fail_detail: 'network_fix' };
  if(recent.some(f => f.acc != null && f.acc > accLimit)) return { ok: false, fail_detail: 'acc_over_limit' };
  let gpsStreak = 0;
  for(const f of recent){
    if(isNetworkFix(f)) gpsStreak = 0;
    else gpsStreak++;
  }
  if(gpsStreak < 2) return { ok: false, fail_detail: 'gps_streak_low' };
  for(let i = 1; i < recent.length; i++){
    const a = recent[i - 1];
    const b = recent[i];
    const d = haversine(a, b);
    const accA = a.acc != null ? a.acc : accLimit;
    const accB = b.acc != null ? b.acc : accLimit;
    if(d > jumpLimitM(a, b, accA, accB)){
      return { ok: false, fail_detail: 'jump_reject' };
    }
  }
  if(minFixes >= GPS_CONVERGE_MIN_FIXES){
    const last3 = _buf.slice(-3).map(f => fixWithEffectiveAcc(f, ctx));
    if(last3.length < 3 || last3.some(f => f.acc != null && f.acc > GPS_CONVERGE_LAST3_ACC_M)){
      return { ok: false, fail_detail: 'last3_acc' };
    }
  }
  return { ok: true, fail_detail: null };
}

export function getConvergeBufferStats(reConverge){
  let bufAccMax = null;
  for(const f of _buf){
    if(bufAccMax == null || f.acc > bufAccMax) bufAccMax = f.acc;
  }
  return {
    buf_len: _buf.length,
    buf_acc_max: bufAccMax != null ? Math.round(bufAccMax * 10) / 10 : null,
    re_converge: !!reConverge
  };
}

/**
 * @param {object} fix — lat, lon, acc, speed, ts, provider?
 * @param {object} [telCtx] — snap для телеметрии { lateral, quality }
 */
export function feedGpsConverge(fix, telCtx){
  if(!fix) return S.gpsConverged;
  if(isSim()){
    const prev = S.gpsConverged;
    S.gpsConverged = true;
    if(prev !== true) noteConvergeTransition(prev, true, 'sim', {}, fix, null, telCtx?.snap);
    return true;
  }

  const prev = S.gpsConverged;
  const acc = fix.acc != null && Number.isFinite(fix.acc) ? fix.acc : null;
  if(!isNetworkFix(fix)) _gpsFixCount++;
  S.gpsFixCount = _gpsFixCount;

  _buf.push({
    lat: fix.lat, lon: fix.lon, acc,
    speed: fix.speed, ts: fix.ts, provider: fix.provider
  });
  while(_buf.length > 8) _buf.shift();

  const re = _everConverged && S.gpsConverged === false && _buf.length >= 2;
  const minFixes = re ? GPS_CONVERGE_RE_MIN_FIXES : GPS_CONVERGE_MIN_FIXES;
  const accLim = re ? GPS_CONVERGE_RE_ACC_M : GPS_CONVERGE_ACC_M;
  const bufStats = getConvergeBufferStats(re);

  const ev = evaluateBuffer(minFixes, accLim);
  _lastFailDetail = ev.ok ? null : ev.fail_detail;
  if(ev.ok){
    S.gpsConverged = true;
    _everConverged = true;
    if(prev !== true){
      noteConvergeTransition(prev, true, 'converged', {}, fix, bufStats, telCtx?.snap);
    }
  } else if(!re && _buf.length < minFixes){
    S.gpsConverged = false;
  }

  return S.gpsConverged;
}

/**
 * @param {string} [reason]
 * @param {object} [telCtx]
 */
export function invalidateGpsConverge(reason = 'invalidate_unknown', telCtx){
  const prev = S.gpsConverged;
  S.gpsConverged = false;
  if(prev !== false){
    noteConvergeTransition(prev, false, reason, {}, telCtx?.fix ?? S.gps, getConvergeBufferStats(_everConverged), telCtx?.snap);
  }
}
