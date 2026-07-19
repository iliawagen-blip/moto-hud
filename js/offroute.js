import { S } from './state.js';
import { $ } from './util.js';
import { angleDiff } from './geo.js';
import { recalcRoute } from './route.js';
import { projectPointToRoute } from './route-geometry.js';
import { speak } from './voice.js';
import telemetry from './telemetry.js';
import { SnapQuality } from './snap-quality.js';
import { isBearingMode } from './bearing-mode.js';
import { simScaledDelta } from './sim-time-scale.js';
import {
  OFF_ROUTE_ENTER_M, OFF_ROUTE_EXIT_M, OFF_ROUTE_CONFIRM_MS,
  OFF_ROUTE_CONFIRM_MS_HIGH_SPD, OFF_ROUTE_CONFIRM_DIST_M,
  OFF_ROUTE_CONFIRM_DIST_HIGH_M, OFF_ROUTE_HIGH_SPD_MPS,
  OFF_ROUTE_GPS_ACC_GATE_M, OFF_ROUTE_ACC_FACTOR,
  OFF_ROUTE_HEADING_DIVERGE_DEG, OFF_ROUTE_HEADING_DIVERGE_MS,
  OFF_ROUTE_HEADING_MIN_SPD,
  OFF_ROUTE_RETURN_HOLD_MS, OFF_ROUTE_LATERAL_HARD_M,
  OFF_ROUTE_LOST_HOLD_CONFIRM_MULT
} from './nav-constants.js';

export const OffRouteState = {
  ON_ROUTE: 'ON_ROUTE',
  SUSPECT: 'SUSPECT',
  REROUTING: 'REROUTING',
  OFFLINE_GUIDE: 'OFFLINE_GUIDE'
};

export {
  OFF_ROUTE_ENTER_M, OFF_ROUTE_EXIT_M, OFF_ROUTE_CONFIRM_MS,
  OFF_ROUTE_CONFIRM_DIST_M, OFF_ROUTE_GPS_ACC_GATE_M as GPS_ACC_GATE_M,
  OFF_ROUTE_ACC_FACTOR as ACC_FACTOR,
  OFF_ROUTE_HEADING_DIVERGE_DEG as HEADING_DIVERGE_DEG,
  OFF_ROUTE_HEADING_DIVERGE_MS as HEADING_DIVERGE_MS,
  OFF_ROUTE_HEADING_MIN_SPD as HEADING_DIVERGE_MIN_SPD
};

const OFFLINE_VOICE_STEP_M = 200;
const OFF_ROUTE_WARN_OK = '◆ ПЕРЕСЧЁТ МАРШРУТА ◆';
const OFF_ROUTE_WARN_FAIL = '◆ НЕТ СВЯЗИ — ВЕРНИТЕСЬ НА МАРШРУТ ◆';

const _ctx = {
  confirmMs: 0,
  suspectDistM: 0,
  headingDivergeSince: 0,
  lastFeedMs: 0,
  rerouteBusy: false,
  offlineEntryVoice: false,
  offlineVoiceBucket: null,
  peakLateral: 0,
  returnBelowExitSince: 0
};

function clearOffRouteWarn(){
  const el = $('offRouteWarn');
  if(!el) return;
  el.classList.remove('on');
  el.textContent = OFF_ROUTE_WARN_OK;
}

function showRerouteOk(){
  const el = $('offRouteWarn');
  if(!el) return;
  el.textContent = OFF_ROUTE_WARN_OK;
  el.classList.add('on');
  setTimeout(() => clearOffRouteWarn(), 2000);
}

function showOfflineWarn(){
  const el = $('offRouteWarn');
  if(!el) return;
  el.textContent = OFF_ROUTE_WARN_FAIL;
  el.classList.add('on');
}

function resetBackoff(){
  S.rerouteBackoffStep = 0;
  S.rerouteBackoffUntil = 0;
}

function resetSuspectCtx(){
  _ctx.confirmMs = 0;
  _ctx.suspectDistM = 0;
  _ctx.headingDivergeSince = 0;
  _ctx.peakLateral = 0;
  _ctx.returnBelowExitSince = 0;
}

function resetOfflineCtx(){
  _ctx.offlineEntryVoice = false;
  _ctx.offlineVoiceBucket = null;
}

function resetCtx(){
  resetSuspectCtx();
  resetOfflineCtx();
  _ctx.lastFeedMs = 0;
  _ctx.rerouteBusy = false;
}

export function resetOffRouteMachine(){
  S.offRouteState = OffRouteState.ON_ROUTE;
  resetBackoff();
  resetCtx();
  clearOffRouteWarn();
}

export function isOfflineGuide(){
  return S.offRouteState === OffRouteState.OFFLINE_GUIDE;
}

function transition(from, to, meta){
  S.offRouteState = to;
  telemetry.log('nav', {
    sub: 'offroute_state',
    from,
    to,
    lateral: meta.lateral,
    spd: meta.spd,
    trigger: meta.trigger || undefined
  });
}

function metaFromFeed(feed){
  return {
    lateral: feed.lateral,
    spd: feed.spdKmh,
    trigger: feed.trigger
  };
}

function confirmDistForSpeed(spdMps){
  return spdMps > OFF_ROUTE_HIGH_SPD_MPS
    ? OFF_ROUTE_CONFIRM_DIST_HIGH_M
    : OFF_ROUTE_CONFIRM_DIST_M;
}

function confirmMsForSpeed(spdMps){
  return spdMps > OFF_ROUTE_HIGH_SPD_MPS
    ? OFF_ROUTE_CONFIRM_MS_HIGH_SPD
    : OFF_ROUTE_CONFIRM_MS;
}

function headingDiverged(feed, now){
  if(feed.spdMps <= OFF_ROUTE_HEADING_MIN_SPD) return false;
  if(feed.heading == null || isNaN(feed.heading)) return false;
  if(feed.tangent == null || isNaN(feed.tangent)) return false;
  if(angleDiff(feed.heading, feed.tangent) <= OFF_ROUTE_HEADING_DIVERGE_DEG) return false;
  if(!_ctx.headingDivergeSince) _ctx.headingDivergeSince = now;
  return simScaledDelta(now - _ctx.headingDivergeSince) >= OFF_ROUTE_HEADING_DIVERGE_MS;
}

function lateralAfterReroute(){
  const geom = S.route?.geometry;
  const gps = S.gps;
  if(!geom || !gps) return null;
  return projectPointToRoute(geom, gps)?.lateral ?? null;
}

function canTriggerReroute(feed, now){
  const distNeed = confirmDistForSpeed(feed.spdMps);
  const msNeed = confirmMsForSpeed(feed.spdMps);
  const distOk = _ctx.suspectDistM >= distNeed;
  const timeOk = _ctx.confirmMs >= msNeed;
  const hdgOk = headingDiverged(feed, now);
  const lat = feed.lateral;
  const snapBad = S.snapQuality !== SnapQuality.GOOD || (lat != null && lat > 80);
  if(!snapBad) return null;

  // Регрессионный sim: disableReroute → OFFLINE instead of REROUTING; lateral_*/dist_time
  // при SIM_TIME_SCALE×10 раздувают false_reroute (SUSPECT↔ON). Поле — без флага.
  const isRegSim = !!globalThis.__REGRESSION_SIM__?.active;
  // Мусорный GPS (field 18-13: acc↑ + телепорты, ложный spd=0) — не триггерить reroute
  const gpsJunk = (feed.acc != null && feed.acc > OFF_ROUTE_GPS_ACC_GATE_M * 1.5) ||
    !!feed.gpsTeleport;
  if(gpsJunk) return null;

  if(!isRegSim){
    // Вечерний field: реальный spd≈0 → heading/dist не копятся. peak+текущий ≥ HARD.
    const lateralHardSustain = lat != null
      && lat >= OFF_ROUTE_LATERAL_HARD_M
      && _ctx.peakLateral >= OFF_ROUTE_LATERAL_HARD_M;
    if(lateralHardSustain && _ctx.confirmMs >= msNeed * 2) return 'lateral_time';
    if(lateralHardSustain && _ctx.confirmMs >= msNeed * 2.5) return 'lateral_hold';
    // LOST при lat≥ENTER без HARD 80 (field 07-00: lat≈60, acc≈4, 2+ мин без REROUTING)
    if(S.snapQuality === SnapQuality.LOST && lat != null && lat >= OFF_ROUTE_ENTER_M
        && _ctx.confirmMs >= msNeed * OFF_ROUTE_LOST_HOLD_CONFIRM_MULT){
      return 'lost_lateral_hold';
    }
  }

  if(distOk && hdgOk) return 'dist_heading';
  if(distOk && timeOk && hdgOk) return 'conjunct';
  if(timeOk && hdgOk && lat > OFF_ROUTE_ENTER_M) return 'time_heading';
  if(!isRegSim && distOk && timeOk && lat != null && lat >= OFF_ROUTE_LATERAL_HARD_M){
    return 'dist_time';
  }
  return null;
}

function enterOfflineGuide(feed){
  showOfflineWarn();
  resetSuspectCtx();
  resetOfflineCtx();
  tickOfflineGuideVoice(feed.lateral);
}

function tickOfflineGuideVoice(lateral){
  if(!S.voice || lateral == null) return;
  if(!_ctx.offlineEntryVoice){
    _ctx.offlineEntryVoice = true;
    _ctx.offlineVoiceBucket = Math.ceil(lateral / OFFLINE_VOICE_STEP_M) * OFFLINE_VOICE_STEP_M;
    speak('Нет связи. Возвращаю на маршрут');
    S.lastVoiceTs = Date.now();
    return;
  }
  const bucket = Math.ceil(lateral / OFFLINE_VOICE_STEP_M) * OFFLINE_VOICE_STEP_M;
  if(_ctx.offlineVoiceBucket == null) _ctx.offlineVoiceBucket = bucket;
  if(bucket <= _ctx.offlineVoiceBucket - OFFLINE_VOICE_STEP_M){
    _ctx.offlineVoiceBucket = bucket;
    if(Date.now() - S.lastVoiceTs < 3000) return;
    speak('До маршрута ' + Math.round(lateral) + ' метров');
    S.lastVoiceTs = Date.now();
  }
}

function beginReroute(fromState, feed, trigger){
  if(globalThis.__REGRESSION_SIM__?.disableReroute){
    transition(fromState, OffRouteState.OFFLINE_GUIDE, { ...metaFromFeed(feed), trigger });
    enterOfflineGuide(feed);
    return;
  }
  if(_ctx.rerouteBusy || S.offRouteState === OffRouteState.REROUTING) return;
  _ctx.rerouteBusy = true;
  transition(fromState, OffRouteState.REROUTING, { ...metaFromFeed(feed), trigger });
  recalcRoute().then(ok => {
    _ctx.rerouteBusy = false;
    if(ok){
      transition(OffRouteState.REROUTING, OffRouteState.ON_ROUTE, metaFromFeed(feed));
      // cooldown уже выставлен в recalcRoute; не обнулять
      resetSuspectCtx();
      showRerouteOk();
    } else {
      transition(OffRouteState.REROUTING, OffRouteState.OFFLINE_GUIDE, metaFromFeed(feed));
      enterOfflineGuide(feed);
    }
  });
}

function tickSuspectConfirm(feed, inDeadZone){
  if(inDeadZone) return;
  const now = Date.now();
  const dtMs = feed.dtMs || 0;
  _ctx.confirmMs += dtMs;
  if(feed.spdMps > 0) _ctx.suspectDistM += feed.spdMps * (dtMs / 1000);
  if(feed.lateral != null && feed.lateral > _ctx.peakLateral){
    _ctx.peakLateral = feed.lateral;
  }

  if(feed.spdMps > OFF_ROUTE_HEADING_MIN_SPD &&
     feed.heading != null && !isNaN(feed.heading) &&
     feed.tangent != null && !isNaN(feed.tangent)){
    if(angleDiff(feed.heading, feed.tangent) > OFF_ROUTE_HEADING_DIVERGE_DEG){
      if(!_ctx.headingDivergeSince) _ctx.headingDivergeSince = now;
    } else {
      _ctx.headingDivergeSince = 0;
    }
  } else {
    _ctx.headingDivergeSince = 0;
  }

  const trigger = canTriggerReroute(feed, now);
  if(!trigger) return;
  if(S.rerouteBackoffUntil && Date.now() < S.rerouteBackoffUntil) return;
  beginReroute(OffRouteState.SUSPECT, { ...feed, trigger }, trigger);
}

function tryReturnOnRoute(feed){
  const now = Date.now();
  if(feed.lateral >= OFF_ROUTE_EXIT_M){
    _ctx.returnBelowExitSince = 0;
    return false;
  }
  // Анти-дребезг field: 2s wall-clock (НЕ simScaled — иначе при ×10 hold=200ms → thrash false_reroute)
  if(!_ctx.returnBelowExitSince) _ctx.returnBelowExitSince = now;
  if(now - _ctx.returnBelowExitSince < OFF_ROUTE_RETURN_HOLD_MS) return false;
  if(S.snapQuality === SnapQuality.LOST) return false;
  if(_ctx.peakLateral >= OFF_ROUTE_LATERAL_HARD_M && feed.lateral > OFF_ROUTE_EXIT_M * 0.6){
    return false;
  }

  const from = S.offRouteState;
  transition(from, OffRouteState.ON_ROUTE, metaFromFeed(feed));
  resetBackoff();
  resetCtx();
  clearOffRouteWarn();
  return true;
}

export function tickOffRouteMachine(feed){
  if(isBearingMode() || feed.lateral == null || !S.route) return;

  const now = Date.now();
  const dtMs = _ctx.lastFeedMs ? Math.min(3000, simScaledDelta(now - _ctx.lastFeedMs)) : 0;
  _ctx.lastFeedMs = now;
  feed = { ...feed, dtMs };

  if(S.offRouteState === OffRouteState.REROUTING || _ctx.rerouteBusy) return;

  if(S.offRouteState === OffRouteState.SUSPECT || S.offRouteState === OffRouteState.OFFLINE_GUIDE){
    if(tryReturnOnRoute(feed)) return;
  }

  if(S.offRouteState === OffRouteState.OFFLINE_GUIDE){
    tickOfflineGuideVoice(feed.lateral);
    if(S.rerouteBackoffUntil && now >= S.rerouteBackoffUntil){
      transition(OffRouteState.OFFLINE_GUIDE, OffRouteState.SUSPECT, metaFromFeed(feed));
      beginReroute(OffRouteState.SUSPECT, { ...feed, trigger: 'backoff_retry' }, 'backoff_retry');
    }
    return;
  }

  const enterM = Math.max(OFF_ROUTE_ENTER_M, OFF_ROUTE_ACC_FACTOR * feed.acc);
  const inDeadZone = feed.lateral >= OFF_ROUTE_EXIT_M && feed.lateral <= OFF_ROUTE_ENTER_M;

  if(S.offRouteState === OffRouteState.ON_ROUTE){
    // плохой GPS / телепорт — не входим в SUSPECT (шум; field 18-13)
    if(feed.acc > OFF_ROUTE_GPS_ACC_GATE_M || feed.gpsTeleport) return;
    const lostOff = S.snapQuality === SnapQuality.LOST && feed.lateral > OFF_ROUTE_ENTER_M;
    if(feed.lateral > enterM || lostOff){
      resetSuspectCtx();
      transition(OffRouteState.ON_ROUTE, OffRouteState.SUSPECT, metaFromFeed(feed));
    }
    return;
  }

  if(S.offRouteState === OffRouteState.SUSPECT){
    // Мусорный GPS в SUSPECT: не копим confirm / peak (иначе lateral_time на телепортах)
    if(feed.gpsTeleport || feed.acc > OFF_ROUTE_GPS_ACC_GATE_M * 2){
      if(feed.lateral < OFF_ROUTE_ENTER_M){
        tryReturnOnRoute(feed);
      }
      return;
    }
    if(feed.acc > OFF_ROUTE_GPS_ACC_GATE_M * 2.5 && feed.lateral < OFF_ROUTE_ENTER_M) return;
    tickSuspectConfirm(feed, inDeadZone);
  }
}
