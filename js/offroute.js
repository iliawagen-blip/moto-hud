import { S } from './state.js';
import { $ } from './util.js';
import { angleDiff } from './geo.js';
import { recalcRoute } from './route.js';
import { speak } from './voice.js';
import telemetry from './telemetry.js';

export const OffRouteState = {
  ON_ROUTE: 'ON_ROUTE',
  SUSPECT: 'SUSPECT',
  REROUTING: 'REROUTING',
  OFFLINE_GUIDE: 'OFFLINE_GUIDE'
};

/** Порог входа в «подозрение на уход с маршрута», м */
export const OFF_ROUTE_ENTER_M = 50;
/** Порог выхода из подозрения (гистерезис), м */
export const OFF_ROUTE_EXIT_M = 25;
/** Время подтверждения ухода до пересчёта, мс */
export const OFF_ROUTE_CONFIRM_MS = 8000;
/** Пройденный путь в SUSPECT для подтверждения, м */
export const OFF_ROUTE_CONFIRM_DIST_M = 100;
/** При acc выше — тик детектора пропускается (кроме выхода на маршрут) */
export const GPS_ACC_GATE_M = 30;
/** Множитель точности GPS к порогу входа */
export const ACC_FACTOR = 1.5;
/** Расхождение курса и касательной маршрута для явного съезда, ° */
export const HEADING_DIVERGE_DEG = 60;
/** Непрерывность расхождения курса для подтверждения, мс */
export const HEADING_DIVERGE_MS = 3000;
/** Минимальная скорость для критерия расхождения курса, м/с */
export const HEADING_DIVERGE_MIN_SPD = 5;

const OFF_ROUTE_WARN_OK = '◆ ПЕРЕСЧЁТ МАРШРУТА ◆';
const OFF_ROUTE_WARN_FAIL = '◆ НЕТ СВЯЗИ — ВЕРНИТЕСЬ НА МАРШРУТ ◆';

const _ctx = {
  confirmMs: 0,
  suspectDistM: 0,
  headingDivergeSince: 0,
  lastFeedMs: 0,
  rerouteBusy: false,
  offlineEntryVoice: false,
  offlineVoiceBucket: null
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

function pickSuspectTrigger(now){
  if(_ctx.confirmMs >= OFF_ROUTE_CONFIRM_MS) return 'time';
  if(_ctx.suspectDistM >= OFF_ROUTE_CONFIRM_DIST_M) return 'dist';
  if(_ctx.headingDivergeSince && now - _ctx.headingDivergeSince >= HEADING_DIVERGE_MS){
    return 'heading';
  }
  return null;
}

function beginReroute(fromState, feed, trigger){
  if(_ctx.rerouteBusy || S.offRouteState === OffRouteState.REROUTING) return;
  _ctx.rerouteBusy = true;
  transition(fromState, OffRouteState.REROUTING, { ...metaFromFeed(feed), trigger });
  recalcRoute().then(ok => {
    _ctx.rerouteBusy = false;
    if(ok){
      transition(OffRouteState.REROUTING, OffRouteState.ON_ROUTE, metaFromFeed(feed));
      resetBackoff();
      resetSuspectCtx();
      showRerouteOk();
    } else {
      transition(OffRouteState.REROUTING, OffRouteState.OFFLINE_GUIDE, metaFromFeed(feed));
      showOfflineWarn();
      resetSuspectCtx();
    }
  });
}

function tickSuspectConfirm(feed, inDeadZone){
  if(inDeadZone) return;
  const now = Date.now();
  const dtMs = feed.dtMs || 0;
  _ctx.confirmMs += dtMs;
  if(feed.spdMps > 0) _ctx.suspectDistM += feed.spdMps * (dtMs / 1000);

  if(feed.spdMps > HEADING_DIVERGE_MIN_SPD &&
     feed.heading != null && !isNaN(feed.heading) &&
     feed.tangent != null && !isNaN(feed.tangent)){
    if(angleDiff(feed.heading, feed.tangent) > HEADING_DIVERGE_DEG){
      if(!_ctx.headingDivergeSince) _ctx.headingDivergeSince = now;
    } else {
      _ctx.headingDivergeSince = 0;
    }
  } else {
    _ctx.headingDivergeSince = 0;
  }

  const trigger = pickSuspectTrigger(now);
  if(!trigger) return;
  if(S.rerouteBackoffUntil && Date.now() < S.rerouteBackoffUntil) return;
  beginReroute(OffRouteState.SUSPECT, { ...feed, trigger }, trigger);
}

function tryReturnOnRoute(feed){
  if(feed.lateral >= OFF_ROUTE_EXIT_M) return false;
  const from = S.offRouteState;
  transition(from, OffRouteState.ON_ROUTE, metaFromFeed(feed));
  resetBackoff();
  resetCtx();
  clearOffRouteWarn();
  return true;
}

/**
 * Один тик машины ухода с маршрута. onTick передаёт lateral, acc, spd, heading, tangent.
 * @param {{ lateral:number, acc:number, spdMps:number, spdKmh:number, heading:number|null, tangent:number|null, dtMs:number }} feed
 */
export function tickOffRouteMachine(feed){
  if(feed.lateral == null || !S.route) return;

  const now = Date.now();
  const dtMs = _ctx.lastFeedMs ? Math.min(3000, now - _ctx.lastFeedMs) : 0;
  _ctx.lastFeedMs = now;
  feed = { ...feed, dtMs };

  if(S.offRouteState === OffRouteState.REROUTING || _ctx.rerouteBusy) return;

  if(S.offRouteState === OffRouteState.SUSPECT || S.offRouteState === OffRouteState.OFFLINE_GUIDE){
    if(tryReturnOnRoute(feed)) return;
  }

  if(S.offRouteState === OffRouteState.OFFLINE_GUIDE){
    if(S.rerouteBackoffUntil && now >= S.rerouteBackoffUntil){
      transition(OffRouteState.OFFLINE_GUIDE, OffRouteState.SUSPECT, metaFromFeed(feed));
      beginReroute(OffRouteState.SUSPECT, { ...feed, trigger: 'backoff_retry' }, 'backoff_retry');
    }
    return;
  }

  if(feed.acc > GPS_ACC_GATE_M) return;

  const enterM = Math.max(OFF_ROUTE_ENTER_M, ACC_FACTOR * feed.acc);
  const inDeadZone = feed.lateral >= OFF_ROUTE_EXIT_M && feed.lateral <= OFF_ROUTE_ENTER_M;

  if(S.offRouteState === OffRouteState.ON_ROUTE){
    if(feed.lateral > enterM){
      resetSuspectCtx();
      transition(OffRouteState.ON_ROUTE, OffRouteState.SUSPECT, metaFromFeed(feed));
    }
    return;
  }

  if(S.offRouteState === OffRouteState.SUSPECT){
    if(feed.lateral <= enterM && !inDeadZone){
      // still suspect until exit threshold
    }
    tickSuspectConfirm(feed, inDeadZone);
  }
}
