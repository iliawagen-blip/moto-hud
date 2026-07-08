/**
 * Телеметрия converge (вечер 0): только логирование, без смены UX.
 * @module converge-telemetry
 */
import { S } from './state.js';
import { $ } from './util.js';
import telemetry from './telemetry.js';

const BLOCKED_TICK_MS = 5000;
const MOVING_SPD_KMH = 5;

let _rideStartWall = 0;
let _firstConvergeLogged = false;
let _hadConverged = false;
let _blockedSince = 0;
let _blockedTotalMs = 0;
let _blockedMovingMs = 0;
let _lastBlockedTick = 0;
let _lastFixTs = 0;
let _maxBlockedStreakMs = 0;
let _currentBlockedStreakStart = 0;

let _falseEvents = 0;
let _invalidateAcc = 0;
let _invalidateLost = 0;
let _reConvergeCount = 0;

function r2(n){
  if(n == null || !Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function hudOn(){
  try{ return !!$('hud')?.classList.contains('on'); }catch(e){ return false; }
}

function phase(){
  if(typeof document !== 'undefined' && document.visibilityState === 'hidden') return 'background';
  return hudOn() ? 'riding' : 'setup';
}

function spdKmh(fix){
  const mps = fix?.speed ?? S.gps?.speed;
  if(mps == null || !Number.isFinite(mps) || mps < 0) return 0;
  return mps * 3.6;
}

function fixAgeMs(fix){
  const ts = fix?.ts ?? S.gps?.ts;
  if(!ts) return null;
  return Math.max(0, Date.now() - ts);
}

function buildContext(fix, bufStats, snap){
  return {
    hud_on: hudOn(),
    phase: phase(),
    acc: r2(fix?.acc ?? S.gps?.acc),
    spd_kmh: r2(spdKmh(fix)),
    buf_len: bufStats?.buf_len ?? null,
    buf_acc_max: bufStats?.buf_acc_max ?? null,
    fix_age_ms: fixAgeMs(fix),
    snap_quality: snap?.quality ?? S.snapQuality ?? null,
    lat_off: snap?.lateral != null ? r2(snap.lateral) : null,
    re_converge: !!bufStats?.re_converge,
    gps_fix_count: S.gpsFixCount ?? null,
    had_route: !!(S.route?.coords?.length),
    off_route_state: S.offRouteState || null
  };
}

function logTransition(from, to, reason, extra, fix, bufStats, snap){
  if(!telemetry.isActive?.()) return;
  telemetry.log('nav', {
    sub: 'converge_transition',
    from,
    to,
    reason,
    ...buildContext(fix, bufStats, snap),
    ...extra
  });
}

function onBlockedStart(){
  const now = Date.now();
  if(!_blockedSince) _blockedSince = now;
  if(!_currentBlockedStreakStart) _currentBlockedStreakStart = now;
}

function onBlockedEnd(){
  if(_currentBlockedStreakStart){
    const streak = Date.now() - _currentBlockedStreakStart;
    _blockedTotalMs += streak;
    if(streak > _maxBlockedStreakMs) _maxBlockedStreakMs = streak;
    _currentBlockedStreakStart = 0;
    _blockedSince = 0;
  }
}

/**
 * Сброс счётчиков на старте поездки (ПОЕХАЛИ).
 */
export function resetConvergeTelemetryRide(){
  _rideStartWall = Date.now();
  _firstConvergeLogged = false;
  _hadConverged = false;
  _blockedSince = 0;
  _blockedTotalMs = 0;
  _blockedMovingMs = 0;
  _lastBlockedTick = 0;
  _maxBlockedStreakMs = 0;
  _currentBlockedStreakStart = 0;
  _falseEvents = 0;
  _invalidateAcc = 0;
  _invalidateLost = 0;
  _reConvergeCount = 0;
}

/**
 * Переход gpsConverged (вызывается из gps-converge.js).
 */
export function noteConvergeTransition(from, to, reason, extra, fix, bufStats, snap){
  if(from === to) return;

  if(to === false){
    _falseEvents++;
    if(reason === 'invalidate_acc') _invalidateAcc++;
    if(reason === 'invalidate_lost') _invalidateLost++;
    if(_hadConverged && (reason === 'invalidate_acc' || reason === 'invalidate_lost' || reason === 'invalidate_error')){
      _reConvergeCount++;
    }
    if(hudOn()) onBlockedStart();
  } else {
    if(bufStats?.re_converge) _reConvergeCount++;
    _hadConverged = true;
    onBlockedEnd();
    _blockedSince = 0;

    if(hudOn() && !_firstConvergeLogged && _rideStartWall){
      _firstConvergeLogged = true;
      if(telemetry.isActive?.()){
        telemetry.log('nav', {
          sub: 'converge_first',
          time_to_first_converge_ms: Date.now() - _rideStartWall,
          ...buildContext(fix, bufStats, snap)
        });
      }
    }
  }

  logTransition(from, to, reason, extra || {}, fix, bufStats, snap);
}

/**
 * Периодический тик, пока HUD on и !gpsConverged (из applyGpsFix).
 */
export function tickConvergeBlocked(fix, snap){
  if(!hudOn() || S.gpsConverged !== false) return;
  if(!telemetry.isActive?.()) return;

  const now = Date.now();
  if(fix?.ts) _lastFixTs = fix.ts;

  onBlockedStart();

  const dt = _lastBlockedTick ? now - _lastBlockedTick : 0;
  if(_lastBlockedTick && dt > 0 && spdKmh(fix) >= MOVING_SPD_KMH){
    _blockedMovingMs += dt;
  }

  if(_lastBlockedTick && now - _lastBlockedTick < BLOCKED_TICK_MS) return;
  _lastBlockedTick = now;

  const durBlocked = _blockedSince ? now - _blockedSince : 0;
  telemetry.log('nav', {
    sub: 'converge_blocked_tick',
    dur_blocked_ms: durBlocked,
    ...buildContext(fix, null, snap)
  });
}

/**
 * Итог сессии — вызвать до telemetry.stop().
 */
export function flushConvergeSummary(){
  if(!telemetry.isActive?.()) return;

  let blockedTotal = _blockedTotalMs;
  if(_currentBlockedStreakStart){
    const streak = Date.now() - _currentBlockedStreakStart;
    blockedTotal += streak;
    if(streak > _maxBlockedStreakMs) _maxBlockedStreakMs = streak;
  }

  telemetry.log('meta', {
    sub: 'converge_session_summary',
    converge_false_events: _falseEvents,
    converge_blocked_total_ms: Math.round(blockedTotal),
    converge_blocked_while_moving_ms: Math.round(_blockedMovingMs),
    invalidate_acc_count: _invalidateAcc,
    invalidate_lost_count: _invalidateLost,
    re_converge_count: _reConvergeCount,
    max_blocked_streak_ms: _maxBlockedStreakMs,
    reached_converge: _hadConverged
  });
}

/** Видимость вкладки — для разбора re-converge после заправки. */
export function initConvergeVisibilityLog(){
  if(typeof document === 'undefined' || document._convergeVisBound) return;
  document._convergeVisBound = true;
  document.addEventListener('visibilitychange', () => {
    if(!telemetry.isActive?.()) return;
    telemetry.log('nav', {
      sub: 'converge_visibility',
      state: document.visibilityState,
      gps_converged: S.gpsConverged !== false,
      hud_on: hudOn(),
      phase: phase()
    });
  });
}
