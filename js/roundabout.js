/**
 * Визуализация и навигация кругового движения (OSRM roundabout).
 * @module roundabout
 */
import { S } from './state.js';
import { $ } from './util.js';
import { haversine } from './geo.js';
import { stepCoordIndex, getRemainingDistance } from './route.js';
import { getNavSnap } from './route-geometry.js';
import telemetry from './telemetry.js';
import {
  ROUNDABOUT_MIN_RADIUS_M,
  ROUNDABOUT_MAX_RADIUS_M,
  ROUNDABOUT_TICK_MS
} from './nav-constants.js';

/** --- SVG-геометрия (доля от RB_SVG_H) --- */
/** Высота viewBox, px */
export const RB_SVG_W = 200;
export const RB_SVG_H = 200;
/** Радиус кольца — 40% высоты */
export const RB_RING_R_RATIO = 0.40;
/** Дуга кольца, градусы (разрыв внизу) */
export const RB_ARC_SPAN_DEG = 330;
/** Толщина кольца — 11% диаметра */
export const RB_RING_STROKE_RATIO = 0.11;
/** Размер цифры съезда — 40% высоты */
export const RB_EXIT_FONT_RATIO = 0.40;
/** Цвета */
export const RB_RING_COLOR = '#00aa5c';
export const RB_RING_OPACITY = 0.7;
export const RB_ENTRY_COLOR = '#ffffff';
export const RB_EXIT_COLOR = '#ffd400';
export const RB_GHOST_EXIT_COLOR = '#888888';

const EXIT_ORDINAL = {
  1: 'первый', 2: 'второй', 3: 'третий', 4: 'четвёртый', 5: 'пятый', 6: 'шестой'
};

let _lastRbHudMs = 0;
let _lastTelemetryKey = '';
let _pairsCache = null;
let _pairsRouteId = null;

export function isRoundaboutStep(step){
  if(!step) return false;
  const t = step.type;
  return t === 'roundabout' || t === 'rotary' || t === 'exit roundabout';
}

export function shouldUseRoundaboutSchema(){
  return S.roundaboutSchema !== false;
}

function normalizeBearingDiff(bb, ba){
  if(bb == null || ba == null || isNaN(bb) || isNaN(ba)) return 0;
  return ((ba - bb + 540) % 360) - 180;
}

function routeCacheKey(route){
  return route?.coords?.length + ':' + (route?.steps?.length ?? 0);
}

/**
 * Пары enter/exit roundabout на маршруте.
 * @returns {Array<object>}
 */
export function getRoundaboutPairs(route){
  if(!route?.steps?.length) return [];
  const key = routeCacheKey(route);
  if(_pairsCache && _pairsRouteId === key) return _pairsCache;

  const pairs = [];
  const steps = route.steps;
  for(let i = 0; i < steps.length; i++){
    const st = steps[i];
    if(st.type !== 'roundabout' && st.type !== 'rotary') continue;
    let exitSt = null;
    let exitIdx = -1;
    for(let j = i + 1; j < steps.length; j++){
      if(steps[j].type === 'exit roundabout'){
        exitSt = steps[j];
        exitIdx = j;
        break;
      }
      if(steps[j].type === 'roundabout' || steps[j].type === 'rotary') break;
    }
    const enterCi = stepCoordIndex(st);
    const exitCi = exitSt ? stepCoordIndex(exitSt) : enterCi;
    const exitNum = (st.exit != null && st.exit > 0) ? st.exit :
      (exitSt?.exit != null && exitSt.exit > 0 ? exitSt.exit : null);
    pairs.push({
      enterIdx: i,
      exitIdx,
      enterStep: st,
      exitStep: exitSt,
      enterSegIdx: Math.max(0, enterCi),
      exitSegIdx: Math.max(enterCi, exitCi),
      exitNumber: exitNum,
      bearingDiff: normalizeBearingDiff(st.bearing_before, st.bearing_after),
      radiusM: estimateRoundaboutRadius(route, enterCi, exitCi),
      isMini: false
    });
    const p = pairs[pairs.length - 1];
    p.isMini = p.radiusM != null && p.radiusM < ROUNDABOUT_MIN_RADIUS_M;
  }
  _pairsCache = pairs;
  _pairsRouteId = key;
  return pairs;
}

export function invalidateRoundaboutCache(){
  _pairsCache = null;
  _pairsRouteId = null;
}

/**
 * Оценка радиуса кольца по polyline между enter и exit.
 * @param {object} route
 * @param {number} enterCi
 * @param {number} exitCi
 * @returns {number|null}
 */
export function estimateRoundaboutRadius(route, enterCi, exitCi){
  const c = route?.coords;
  if(!c || c.length < 3) return null;
  const lo = Math.max(0, Math.min(enterCi, exitCi));
  const hi = Math.min(c.length - 1, Math.max(enterCi, exitCi));
  if(hi - lo < 2) return null;

  let lat = 0;
  let lon = 0;
  const n = hi - lo + 1;
  for(let i = lo; i <= hi; i++){
    lat += c[i][0];
    lon += c[i][1];
  }
  lat /= n;
  lon /= n;
  const center = { lat, lon };
  let maxD = 0;
  for(let i = lo; i <= hi; i++){
    maxD = Math.max(maxD, haversine(center, { lat: c[i][0], lon: c[i][1] }));
  }
  return maxD;
}

function findPairForSeg(segIdx, route){
  for(const p of getRoundaboutPairs(route)){
    if(segIdx >= p.enterSegIdx && segIdx <= p.exitSegIdx) return p;
  }
  return null;
}

function findApproachPair(route, snap){
  if(!snap || !route) return null;
  const pairs = getRoundaboutPairs(route);
  for(const p of pairs){
    if(snap.segIdx < p.enterSegIdx){
      const dist = haversine(snap, p.enterStep);
      if(dist < 400) return p;
    }
  }
  return null;
}

export function isSegIdxOnRoundabout(segIdx, route){
  return !!findPairForSeg(segIdx, route);
}

export function isOnRoundabout(snap, route){
  const ctx = getRoundaboutContext(snap, route);
  return !!ctx?.isOnRoundabout;
}

/**
 * @typedef {Object} RoundaboutContext
 * @property {boolean} active
 * @property {boolean} isOnRoundabout
 * @property {object|null} enterStep
 * @property {object|null} exitStep
 * @property {number} enterSegIdx
 * @property {number} exitSegIdx
 * @property {number|null} exitNumber
 * @property {number} bearingDiff
 * @property {number|null} distanceToExit
 * @property {number} progressAngle - доля дуги 0..1
 * @property {number|null} radiusM
 * @property {boolean} isMini
 * @property {boolean} isOversized
 * @property {string|null} laneHint
 * @property {'approach'|'on'|'exit'} source
 */

/**
 * Контекст кругового для текущего snap.
 * @param {object|null} snap
 * @param {object} [route]
 * @returns {RoundaboutContext|null}
 */
export function getRoundaboutContext(snap, route = S.route){
  if(!route?.steps?.length) return null;

  let pair = snap?.segIdx != null ? findPairForSeg(snap.segIdx, route) : null;
  let source = 'approach';
  let isOn = false;

  if(pair){
    isOn = snap.segIdx > pair.enterSegIdx && snap.segIdx < pair.exitSegIdx;
    source = isOn ? 'on' : (snap.segIdx >= pair.exitSegIdx ? 'exit' : 'approach');
  } else if(snap){
    pair = findApproachPair(route, snap);
    source = 'approach';
  }

  if(!pair) return null;

  const radiusM = pair.radiusM;
  const isMini = pair.isMini || (radiusM != null && radiusM < ROUNDABOUT_MIN_RADIUS_M);
  const isOversized = radiusM != null && radiusM > ROUNDABOUT_MAX_RADIUS_M;

  let distanceToExit = null;
  let progressAngle = 0;

  if(isOn && snap){
    if(pair.exitStep && S.gps){
      const geom = route.geometry;
      if(geom && snap.s != null && pair.exitStep){
        const exitS = geom.maneuvers?.find(m => m.step === pair.exitStep)?.s;
        if(exitS != null) distanceToExit = Math.max(0, exitS - snap.s);
      }
      if(distanceToExit == null){
        distanceToExit = haversine(S.gps, pair.exitStep);
      }
    }
    const span = Math.max(1, pair.exitSegIdx - pair.enterSegIdx);
    progressAngle = Math.max(0, Math.min(1, (snap.segIdx - pair.enterSegIdx) / span));
  }

  const laneHint = extractLaneHint(pair.enterStep);

  return {
    active: true,
    isOnRoundabout: isOn,
    enterStep: pair.enterStep,
    exitStep: pair.exitStep,
    enterSegIdx: pair.enterSegIdx,
    exitSegIdx: pair.exitSegIdx,
    exitNumber: pair.exitNumber,
    bearingDiff: pair.bearingDiff,
    distanceToExit,
    progressAngle,
    radiusM,
    isMini,
    isOversized,
    laneHint,
    source
  };
}

/** Подсказка полосы из OSRM lanes */
export function extractLaneHint(step){
  if(!step?.intersections?.length) return null;
  for(const ix of step.intersections){
    const lanes = ix.lanes;
    if(!lanes?.length) continue;
    const valid = lanes.filter(l => l.valid);
    if(!valid.length) continue;
    const inds = valid.flatMap(l => l.indications || []);
    if(inds.some(i => String(i).includes('left'))) return 'Займите левую полосу';
    if(inds.some(i => String(i).includes('right'))) return 'Займите правую полосу';
    if(inds.some(i => String(i).includes('straight'))) return 'Займите среднюю полосу';
  }
  return null;
}

function exitOrdinal(n){
  if(n == null || n <= 0) return null;
  if(EXIT_ORDINAL[n]) return EXIT_ORDINAL[n];
  return n + '-й съезд';
}

function streetSuffix(name){
  const n = (name || '').trim();
  return n ? ', ' + n : '';
}

/**
 * Голосовая фраза для кругового.
 * @param {object} step
 * @param {'far'|'near'|'on_exit'|'unknown'} when
 * @param {object} [opts]
 */
export function roundaboutVoicePhrase(step, when, opts = {}){
  const exitN = step.exit != null && step.exit > 0 ? step.exit : null;
  const ord = exitOrdinal(exitN);
  const street = streetSuffix(step.name || opts.streetName);

  if(!exitN){
    if(when === 'far') return 'Через триста метров круговое движение, следуйте по указателям';
    if(when === 'near') return 'Круговое движение, следуйте по указателям';
    if(when === 'on_exit') return 'Ваш съезд';
    return 'Круговое движение, следуйте по указателям';
  }

  if(when === 'far') return 'Через триста метров круговое движение, ' + ord + ' съезд' + street;
  if(when === 'near') return 'Круговое движение, ' + ord + ' съезд' + street;
  if(when === 'on_exit') return 'Ваш съезд';
  return 'Круговое движение, ' + ord + ' съезд';
}

export function roundaboutManeuverText(step, ctx){
  if(!isRoundaboutStep(step)) return '';
  if(ctx?.isOnRoundabout && ctx.distanceToExit != null){
    return 'Ваш съезд через ' + Math.max(10, Math.round(ctx.distanceToExit / 10) * 10) + ' м';
  }
  if(step.exit > 0) return 'Съезд ' + step.exit;
  return 'Круговое движение';
}

function deg2rad(d){ return d * Math.PI / 180; }

function polar(cx, cy, r, degFromTop){
  const a = deg2rad(degFromTop);
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

function arcPath(cx, cy, r, startDeg, endDeg){
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  return 'M' + s.x.toFixed(1) + ',' + s.y.toFixed(1) +
    ' A' + r + ',' + r + ' 0 ' + large + ' ' + sweep + ' ' + e.x.toFixed(1) + ',' + e.y.toFixed(1);
}

function arrowHead(x, y, angleDeg, len, color, sw){
  const a = deg2rad(angleDeg);
  const hx = x + len * Math.sin(a);
  const hy = y - len * Math.cos(a);
  const wing = len * 0.55;
  const a1 = a + deg2rad(150);
  const a2 = a - deg2rad(150);
  const w1x = hx + wing * Math.sin(a1);
  const w1y = hy - wing * Math.cos(a1);
  const w2x = hx + wing * Math.sin(a2);
  const w2y = hy - wing * Math.cos(a2);
  return '<line x1="' + x.toFixed(1) + '" y1="' + y.toFixed(1) +
    '" x2="' + hx.toFixed(1) + '" y2="' + hy.toFixed(1) +
    '" stroke="' + color + '" stroke-width="' + sw + '" stroke-linecap="round"/>' +
    '<polygon points="' + hx.toFixed(1) + ',' + hy.toFixed(1) + ' ' +
    w1x.toFixed(1) + ',' + w1y.toFixed(1) + ' ' + w2x.toFixed(1) + ',' + w2y.toFixed(1) +
    '" fill="' + color + '"/>';
}

function ghostExitAngles(exitN, activeDiff){
  if(!exitN || exitN < 2) return [];
  const out = [];
  const step = 360 / exitN;
  const active = ((activeDiff % 360) + 360) % 360;
  for(let k = 1; k <= exitN; k++){
    const ang = k * step;
    if(Math.abs(((ang - active + 180) % 360) - 180) < 18) continue;
    out.push(ang);
  }
  if(!out.length && exitN === 2){
    out.push(90, 270);
  }
  return out;
}

/**
 * SVG-схема кругового движения.
 * @param {object} step
 * @param {object} [opts]
 */
export function buildRoundaboutSVG(step, opts = {}){
  if(!shouldUseRoundaboutSchema()) return null;
  if(!isRoundaboutStep(step)) return null;

  const ctx = opts.ctx || null;
  const isOn = !!opts.isOnRoundabout || ctx?.isOnRoundabout;
  const distanceToExit = opts.distanceToExit ?? ctx?.distanceToExit;
  const progress = opts.progressAngle ?? ctx?.progressAngle ?? 0;

  const displayStep = ctx?.enterStep || step;
  const exitN = (displayStep.exit != null && displayStep.exit > 0) ? displayStep.exit :
    (step.exit > 0 ? step.exit : null);
  const bb = displayStep.bearing_before ?? step.bearing_before;
  const ba = displayStep.bearing_after ?? step.bearing_after;
  const bearingDiff = normalizeBearingDiff(bb, ba);

  const radiusM = ctx?.radiusM ?? estimateRoundaboutRadius(
    S.route,
    stepCoordIndex(displayStep),
    ctx?.exitStep ? stepCoordIndex(ctx.exitStep) : stepCoordIndex(displayStep)
  );

  if(radiusM != null && radiusM > ROUNDABOUT_MAX_RADIUS_M) return null;
  if(ctx?.isOversized) return null;

  const isMini = ctx?.isMini || (radiusM != null && radiusM < ROUNDABOUT_MIN_RADIUS_M);
  if(isMini) return null;

  const W = RB_SVG_W;
  const H = RB_SVG_H;
  const cx = W / 2;
  const cy = H * 0.52;
  const R = H * RB_RING_R_RATIO;
  const sw = Math.max(4, 2 * R * RB_RING_STROKE_RATIO);
  const entryDeg = 180;
  const halfGap = (360 - RB_ARC_SPAN_DEG) / 2;
  const arcStart = entryDeg + halfGap;
  const arcEnd = entryDeg - halfGap + 360;

  let svg = '<svg class="arrow-svg rb-schema" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';

  svg += '<path d="' + arcPath(cx, cy, R, arcStart, arcEnd) +
    '" fill="none" stroke="' + RB_RING_COLOR + '" stroke-opacity="' + RB_RING_OPACITY +
    '" stroke-width="' + sw.toFixed(1) + '" stroke-linecap="round"/>';

  const entryColor = isOn ? RB_GHOST_EXIT_COLOR : RB_ENTRY_COLOR;
  const entrySw = isOn ? sw * 0.45 : sw * 0.85;
  const entryPt = polar(cx, cy, R, entryDeg);
  const entryFrom = { x: cx, y: cy + R + 28 };
  svg += '<line x1="' + entryFrom.x.toFixed(1) + '" y1="' + entryFrom.y.toFixed(1) +
    '" x2="' + entryPt.x.toFixed(1) + '" y2="' + entryPt.y.toFixed(1) +
    '" stroke="' + entryColor + '" stroke-width="' + entrySw.toFixed(1) + '" stroke-linecap="round"/>';
  svg += arrowHead(entryPt.x, entryPt.y, entryDeg, sw * 1.6, entryColor, entrySw);

  const exitDeg = entryDeg + bearingDiff;
  const ghostAngles = ghostExitAngles(exitN, bearingDiff);
  for(const g of ghostAngles){
    const gp = polar(cx, cy, R, entryDeg + g);
    svg += arrowHead(gp.x, gp.y, entryDeg + g, sw * 1.1, RB_GHOST_EXIT_COLOR, sw * 0.35);
  }

  const exitPt = polar(cx, cy, R, exitDeg);
  svg += arrowHead(exitPt.x, exitPt.y, exitDeg, sw * 1.8, RB_EXIT_COLOR, sw * 0.9);

  if(isOn){
    const dotDeg = entryDeg + bearingDiff * progress;
    const dot = polar(cx, cy, R, dotDeg);
    svg += '<circle cx="' + dot.x.toFixed(1) + '" cy="' + dot.y.toFixed(1) +
      '" r="' + (sw * 0.55).toFixed(1) + '" fill="' + RB_EXIT_COLOR + '"/>';
  }

  if(exitN){
    const fs = H * RB_EXIT_FONT_RATIO;
    svg += '<text x="' + cx + '" y="' + (cy + fs * 0.12).toFixed(1) +
      '" text-anchor="middle" font-family="Consolas,Arial,sans-serif" font-weight="900" font-size="' +
      fs.toFixed(1) + '" fill="' + RB_EXIT_COLOR + '">' + exitN + '</text>';
  }

  const laneHint = opts.laneHint || ctx?.laneHint || extractLaneHint(displayStep);
  if(laneHint){
    svg += '<text x="' + cx + '" y="' + (H - 8) +
      '" text-anchor="middle" font-size="11" font-weight="700" fill="#ccc">' + laneHint + '</text>';
  }

  if(isOn && distanceToExit != null){
    const dm = Math.max(10, Math.round(distanceToExit / 10) * 10);
    svg += '<text x="' + cx + '" y="' + (H - (laneHint ? 22 : 10)) +
      '" text-anchor="middle" font-size="13" font-weight="800" fill="' + RB_EXIT_COLOR +
      '">Ваш съезд через ' + dm + ' м</text>';
  } else if(!exitN){
    svg += '<text x="' + cx + '" y="' + (H - 8) +
      '" text-anchor="middle" font-size="12" font-weight="700" fill="#ddd">Круговое движение</text>';
  }

  svg += '</svg>';
  return svg;
}

export function logRoundaboutTelemetry(ctx){
  if(!ctx?.active) return;
  const key = ctx.source + ':' + (ctx.exitNumber ?? 'x') + ':' + Math.round(ctx.distanceToExit ?? 0);
  if(key === _lastTelemetryKey) return;
  _lastTelemetryKey = key;
  telemetry.log('nav', {
    sub: 'roundabout',
    exit: ctx.exitNumber,
    bearing_diff: Math.round(ctx.bearingDiff),
    distanceToExit: ctx.distanceToExit != null ? Math.round(ctx.distanceToExit) : null,
    source: ctx.source,
    radius_m: ctx.radiusM != null ? Math.round(ctx.radiusM) : null,
    mini: !!ctx.isMini
  });
}

export function resetRoundaboutState(){
  _lastRbHudMs = 0;
  _lastTelemetryKey = '';
  invalidateRoundaboutCache();
}

/** Быстрый refresh HUD на кольце (250 мс) */
export function tickRoundaboutHudRefresh(onTickFn){
  if(!S.route || !onTickFn) return;
  const snap = getNavSnap(S.smoothedHeading);
  const ctx = getRoundaboutContext(snap, S.route);
  if(!ctx?.isOnRoundabout) return;
  if(!$('hud')?.classList.contains('on')) return;
  const now = performance.now();
  if(now - _lastRbHudMs < ROUNDABOUT_TICK_MS) return;
  _lastRbHudMs = now;
  onTickFn();
}

export function getRoundaboutSnapFlags(segIdx, route){
  const on = isSegIdxOnRoundabout(segIdx, route);
  return { onRoundabout: on };
}
