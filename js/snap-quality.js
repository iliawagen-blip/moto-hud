/**
 * Состояние доверия к snap: GOOD / DEGRADED / LOST.
 * @module snap-quality
 */
import { S } from './state.js';
import {
  SNAP_QUALITY_GOOD_IN, SNAP_QUALITY_GOOD_OUT, SNAP_QUALITY_DEGRADED_IN,
  SNAP_QUALITY_LOST_IN, SNAP_QUALITY_DEGRADED_OUT, SNAP_QUALITY_LOST_LATERAL_M,
  SNAP_QUALITY_LOST_SCORE_MIN_LATERAL_M,
  SNAP_QUALITY_DEGRADED_EXIT_LATERAL_M, SNAP_QUALITY_ACC_FLOOR_M,
  SNAP_QUALITY_TICKS_REQUIRED, SNAP_QUALITY_TICK_WINDOW, SNAP_QUALITY_HOLD_MS,
  SNAP_QUALITY_JUMP_DEGRADED_MS, SNAP_QUALITY_DEGRADED_TIMEOUT_MS,
  SNAP_CURVATURE_RADIUS_M, SNAP_CURVATURE_THRESHOLD_MULT,
  ROUNDABOUT_LATERAL_MULTIPLIER, SNAP_STATIONARY_SPD_MPS
} from './nav-constants.js';

export const SnapQuality = { GOOD: 'GOOD', DEGRADED: 'DEGRADED', LOST: 'LOST' };

const _hist = [];
let _degradedSince = 0;
let _jumpUntil = 0;
let _frozenS = null;
let _lastNm = null;
let _forceReeval = false;
let _lostSince = 0;

export function resetSnapQuality(){
  S.snapQuality = SnapQuality.GOOD;
  _hist.length = 0;
  _degradedSince = 0;
  _jumpUntil = 0;
  _frozenS = null;
  _lastNm = null;
  _forceReeval = false;
  _lostSince = 0;
}

/** Запрос широкого пересчёта snap после длительного DEGRADED */
export function takeForceReeval(){
  const v = _forceReeval;
  _forceReeval = false;
  return v;
}

function curvatureMult(geom, s, override){
  if(override != null) return override;
  return 1;
}

function rawScore(snap, gps){
  const acc = Math.max(gps?.acc ?? SNAP_QUALITY_ACC_FLOOR_M, SNAP_QUALITY_ACC_FLOOR_M);
  return snap.lateral / acc;
}

function isScoreLost(score, lateral, mult){
  const s = score / mult;
  // lateral жёсткий порог — всегда LOST
  if(lateral > SNAP_QUALITY_LOST_LATERAL_M) return true;
  // score LOST только если боковой уход уже заметный (анти sticky 18-51)
  return s > SNAP_QUALITY_LOST_IN && lateral >= SNAP_QUALITY_LOST_SCORE_MIN_LATERAL_M;
}

function classifyInstant(score, lateral, mult){
  const s = score / mult;
  if(isScoreLost(score, lateral, mult)) return SnapQuality.LOST;
  if(s > SNAP_QUALITY_DEGRADED_IN || lateral > SNAP_QUALITY_DEGRADED_EXIT_LATERAL_M){
    return SnapQuality.DEGRADED;
  }
  return SnapQuality.GOOD;
}

function classifyExit(score, lateral, mult){
  const s = score / mult;
  if(isScoreLost(score, lateral, mult)) return SnapQuality.LOST;
  // Выход из LOST/DEGRADED: умеренный lateral + приемлемый score
  if(lateral < SNAP_QUALITY_DEGRADED_EXIT_LATERAL_M && s <= SNAP_QUALITY_DEGRADED_OUT){
    return SnapQuality.GOOD;
  }
  if(s <= SNAP_QUALITY_GOOD_OUT && lateral < SNAP_QUALITY_LOST_SCORE_MIN_LATERAL_M){
    return SnapQuality.GOOD;
  }
  return SnapQuality.DEGRADED;
}

function pushHist(q){
  _hist.push(q);
  while(_hist.length > SNAP_QUALITY_TICK_WINDOW) _hist.shift();
}

function histAgrees(target){
  const n = _hist.filter(x => x === target).length;
  return n >= SNAP_QUALITY_TICKS_REQUIRED;
}

/**
 * Обновление качества snap после snapToRoute.
 * @returns {string} SnapQuality
 */
export function updateSnapQuality(snap, gps, geom, opts){
  if(!snap || !gps){
    S.snapQuality = SnapQuality.LOST;
    return S.snapQuality;
  }

  const now = Date.now();
  if(opts?.jump) _jumpUntil = now + SNAP_QUALITY_JUMP_DEGRADED_MS;

  const mult = curvatureMult(geom, snap.s, opts?.curvMult);
  const latMult = opts?.roundabout?.onRoundabout ? ROUNDABOUT_LATERAL_MULTIPLIER : 1;
  const score = rawScore(snap, gps);
  const lateral = snap.lateral / latMult;
  const instant = now < _jumpUntil ? SnapQuality.DEGRADED : classifyInstant(score, lateral, mult);
  pushHist(instant);

  const prev = S.snapQuality || SnapQuality.GOOD;
  let next = prev;

  if(prev === SnapQuality.GOOD){
    if(instant === SnapQuality.LOST && histAgrees(SnapQuality.LOST)) next = SnapQuality.LOST;
    else if(instant !== SnapQuality.GOOD && histAgrees(SnapQuality.DEGRADED)) next = SnapQuality.DEGRADED;
  } else if(prev === SnapQuality.DEGRADED){
    const exitQ = classifyExit(score, lateral, mult);
    if(instant === SnapQuality.LOST && histAgrees(SnapQuality.LOST)) next = SnapQuality.LOST;
    else if(exitQ === SnapQuality.GOOD && histAgrees(SnapQuality.GOOD)) next = SnapQuality.GOOD;
  } else {
    const exitQ = classifyExit(score, lateral, mult);
    if(exitQ !== SnapQuality.LOST && histAgrees(SnapQuality.DEGRADED)) next = SnapQuality.DEGRADED;
    if(exitQ === SnapQuality.GOOD && histAgrees(SnapQuality.GOOD)) next = SnapQuality.GOOD;
  }

  if(next === SnapQuality.DEGRADED && prev !== SnapQuality.DEGRADED) _degradedSince = now;
  if(next === SnapQuality.GOOD) _degradedSince = 0;
  if(next === SnapQuality.LOST && prev !== SnapQuality.LOST){
    _lostSince = now;
    _forceReeval = true;
  }
  if(next !== SnapQuality.LOST) _lostSince = 0;

  if(prev === SnapQuality.DEGRADED && _degradedSince &&
     now - _degradedSince > SNAP_QUALITY_DEGRADED_TIMEOUT_MS){
    _forceReeval = true;
  }

  S.snapQuality = next;

  if(next === SnapQuality.DEGRADED){
    if(_frozenS == null) _frozenS = snap.s;
  } else if(next === SnapQuality.GOOD){
    _frozenS = null;
  }

  return next;
}

/** s для навигации с учётом заморозки */
export function navSFromSnap(snap){
  if(!snap) return null;
  const spd = S.gps?.speed != null && S.gps.speed >= 0 ? S.gps.speed : 0;
  if(S.snapQuality === SnapQuality.DEGRADED && _frozenS != null && spd < SNAP_STATIONARY_SPD_MPS){
    return _frozenS;
  }
  return snap.s;
}

export function isSnapLost(){ return S.snapQuality === SnapQuality.LOST; }
export function isSnapDegraded(){ return S.snapQuality === SnapQuality.DEGRADED; }
export function lostDurationMs(){
  return _lostSince ? Date.now() - _lostSince : 0;
}

export function cacheLastManeuver(nm){ _lastNm = nm || null; }
export function getCachedManeuver(){ return _lastNm; }
export function clearCachedManeuver(){ _lastNm = null; }
