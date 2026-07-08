/**
 * Сходимость GPS перед валидным HUD.
 * @module gps-converge
 */
import { S } from './state.js';
import { haversine } from './geo.js';
import { isSim } from './platform.js';
import {
  GPS_CONVERGE_MIN_FIXES, GPS_CONVERGE_LAST3_ACC_M, GPS_CONVERGE_ACC_M,
  GPS_CONVERGE_RE_MIN_FIXES, GPS_CONVERGE_RE_ACC_M, GPS_CONVERGE_JUMP_PAD_M,
  SNAP_QUALITY_LOST_LATERAL_M
} from './nav-constants.js';
import { noteConvergeTransition } from './converge-telemetry.js';

const _buf = [];
let _gpsFixCount = 0;
let _everConverged = false;

export function resetGpsConverge(){
  _buf.length = 0;
  _gpsFixCount = 0;
  S.gpsConverged = false;
  S.gpsFixCount = 0;
  _everConverged = false;
}

function isNetworkFix(fix){
  return fix.provider === 'network' || fix.lowAccuracy === true;
}

function maxJump(v, dt, acc){
  return (v || 0) * dt + (acc || GPS_CONVERGE_ACC_M) + GPS_CONVERGE_JUMP_PAD_M;
}

function evaluateBuffer(minFixes, accLimit){
  if(_buf.length < minFixes) return { ok: false, fail_detail: 'buffer_short' };
  const recent = _buf.slice(-minFixes);
  if(recent.some(f => isNetworkFix(f))) return { ok: false, fail_detail: 'network_fix' };
  if(recent.some(f => f.acc > accLimit)) return { ok: false, fail_detail: 'acc_over_limit' };
  let gpsStreak = 0;
  for(const f of recent){
    if(isNetworkFix(f)) gpsStreak = 0;
    else gpsStreak++;
  }
  if(gpsStreak < 2) return { ok: false, fail_detail: 'gps_streak_low' };
  for(let i = 1; i < recent.length; i++){
    const a = recent[i - 1];
    const b = recent[i];
    const dt = Math.max(0.2, (b.ts - a.ts) / 1000);
    const v = Math.max(a.speed || 0, b.speed || 0);
    const d = haversine(a, b);
    if(d > maxJump(v, dt, Math.max(a.acc, b.acc))){
      return { ok: false, fail_detail: 'jump_reject' };
    }
  }
  if(minFixes >= GPS_CONVERGE_MIN_FIXES){
    const last3 = _buf.slice(-3);
    if(last3.length < 3 || last3.some(f => f.acc > GPS_CONVERGE_LAST3_ACC_M)){
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
  const acc = fix.acc != null && Number.isFinite(fix.acc) ? fix.acc : 50;
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
  const snap = telCtx?.snap;
  const snapBlocksConverge = snap?.quality === 'LOST' ||
    (snap?.lateral != null && snap.lateral > SNAP_QUALITY_LOST_LATERAL_M);

  const ev = evaluateBuffer(minFixes, accLim);
  if(ev.ok && !snapBlocksConverge){
    S.gpsConverged = true;
    _everConverged = true;
    if(prev !== true){
      noteConvergeTransition(prev, true, 'converged', {}, fix, bufStats, snap);
    }
  } else if(snapBlocksConverge || (!re && _buf.length < minFixes)){
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
