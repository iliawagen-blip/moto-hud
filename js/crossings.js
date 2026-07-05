/**
 * Контекст перекрёстков: парсинг OSRM intersections, усики, схема кругового.
 * @module crossings
 */
import { S, L, ROAD_MAX, CAM_H, CAM_B } from './state.js';
import { destPoint, angleDiff } from './geo.js';
import {
  interpolateAtS, avgTangentDeg, worldToCamXZ, findSForLatLon, getCamPitchRad
} from './route-geometry.js';
import { getThemeTokens } from './theme-tokens.js';
import { getElevExag } from './elevation.js';
import telemetry from './telemetry.js';

export const WHISKER_LEN_M = 18;
export const CROSSING_MERGE_M = 10;
export const CROSSING_MAX_VISIBLE = 6;
export const CROSSING_AHEAD_M = 30;
export const CROSSING_MIN_BACK_M = 150;
export const CROSSING_TIME_S = 15;

/** Совпадает с route.js MANEUVER_PASSED_M / MANEUVER_NEXT_DELAY_M */
const MANEUVER_PASSED_M = 8;
const MANEUVER_NEXT_DELAY_M = 90;

/**
 * @typedef {Object} CrossingWhisker
 * @property {number} bearing - азимут усика, °
 * @property {number} endLat - широта конца усика
 * @property {number} endLon - долгота конца усика
 */

/**
 * @typedef {Object} RouteCrossing
 * @property {number} s - дуговая координата пересечения на маршруте, м
 * @property {number} lat - точка на оси ленты
 * @property {number} lon
 * @property {number[]} sideBearings - боковые азимуты (≤2 на сторону)
 * @property {CrossingWhisker[]} whiskers - предвычисленные усики длиной 18 м
 * @property {boolean} isManeuver - пересечение принадлежит манёвру шага
 */

/**
 * @typedef {Object} RoundaboutExit
 * @property {number} bearing - азимут съезда, °
 * @property {boolean} isTarget - целевой съезд (maneuver.exit)
 */

/**
 * @typedef {Object} RouteRoundabout
 * @property {number} sEnter - s входа в кольцо, м
 * @property {number} sExit - s выхода, м
 * @property {number} lat - широта точки входа (центр схемы)
 * @property {number} lon
 * @property {number} exitNumber - номер съезда OSRM maneuver.exit
 * @property {number|null} totalExits - число съездов или null
 * @property {RoundaboutExit[]} exits - засечки съездов
 * @property {number} travelBearing - курс на входе, °
 */

let _crossLimitLoggedS = null;

function projectGround(x, z, elevDelta){
  const pitch = getCamPitchRad();
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const dy = -CAM_H;
  const dz = z + CAM_B;
  const use3d = S.showElevProfile && S.route?.geometry?.elevReady;
  const elevLift = use3d ? (elevDelta || 0) * getElevExag() * 0.16 : 0;
  const Yc = dy * cp + dz * sp - elevLift;
  const Zc = -dy * sp + dz * cp;
  if(Zc < 0.85) return null;
  const sx = L.cx + L.camFocal * x / Zc;
  const sy = L.camVoff - L.camFocal * Yc / Zc;
  if(sx < -L.W * 0.4 || sx > L.W * 1.4) return null;
  return { x: sx, y: sy };
}

/** Сброс при смене маршрута */
export function resetCrossingTelemetry(){
  _crossLimitLoggedS = null;
}

function signedAngle(fromBrg, toBrg){
  return ((toBrg - fromBrg + 540) % 360) - 180;
}

function pickSideBearings(inter, travelBrg){
  const inIdx = inter.in;
  const outIdx = inter.out;
  if(inIdx == null || outIdx == null || !inter.bearings?.length) return [];

  const sides = [];
  for(let i = 0; i < inter.bearings.length; i++){
    if(i === inIdx || i === outIdx) continue;
    if(inter.entry && inter.entry[i] === false) continue;
    const brg = inter.bearings[i];
    const rel = signedAngle(travelBrg, brg);
    if(Math.abs(rel) < 12) continue;
    sides.push({ brg, side: rel < 0 ? 'left' : 'right', absRel: Math.abs(rel) });
  }

  const pick = sideName => sides
    .filter(s => s.side === sideName)
    .sort((a, b) => Math.abs(a.absRel - 90) - Math.abs(b.absRel - 90))
    .slice(0, 2)
    .map(s => s.brg);
  return pick('left').concat(pick('right'));
}

function buildWhiskers(lat, lon, sideBearings){
  const axis = { lat, lon };
  return sideBearings.map(bearing => {
    const end = destPoint(axis, bearing, WHISKER_LEN_M);
    return { bearing, endLat: end.lat, endLon: end.lon };
  });
}

function mergeCrossings(list){
  if(!list.length) return [];
  const sorted = list.slice().sort((a, b) => a.s - b.s);
  const out = [sorted[0]];
  for(let i = 1; i < sorted.length; i++){
    const prev = out[out.length - 1];
    const cur = sorted[i];
    if(cur.s - prev.s < CROSSING_MERGE_M){
      const brgs = new Set(prev.sideBearings.concat(cur.sideBearings));
      prev.sideBearings = Array.from(brgs);
      prev.whiskers = buildWhiskers(prev.lat, prev.lon, prev.sideBearings);
      prev.isManeuver = prev.isManeuver || cur.isManeuver;
    } else {
      out.push(cur);
    }
  }
  return out;
}

/**
 * Парсинг intersections[] шагов OSRM → crossings + roundabouts.
 * @param {Array} steps - шаги маршрута с полем intersections
 * @param {object} geom - RouteGeometry (lat, lon, s, n)
 * @returns {{ crossings: RouteCrossing[], roundabouts: RouteRoundabout[] }}
 */
export function buildCrossingsData(steps, geom){
  const raw = [];
  if(!steps?.length || !geom?.n) return { crossings: [], roundabouts: [] };

  for(const st of steps){
    const ixList = st.intersections;
    if(!ixList?.length) continue;

    ixList.forEach((inter, ixIdx) => {
      const lat = inter.lat;
      const lon = inter.lon;
      const s = findSForLatLon(geom, lat, lon);
      const travelBrg = inter.out != null && inter.bearings?.[inter.out] != null
        ? inter.bearings[inter.out]
        : avgTangentDeg(geom, s, 8);
      const sideBearings = pickSideBearings(inter, travelBrg);
      if(!sideBearings.length) return;

      const axis = interpolateAtS(geom, s);
      const isManeuver = ixIdx === ixList.length - 1 ||
        haversineLike(st.lat, st.lon, lat, lon) < 6;

      raw.push({
        s,
        lat: axis.lat,
        lon: axis.lon,
        sideBearings,
        whiskers: buildWhiskers(axis.lat, axis.lon, sideBearings),
        isManeuver
      });
    });
  }

  const crossings = mergeCrossings(raw);
  const roundabouts = buildRoundabouts(steps, geom);

  telemetry.log('nav', {
    sub: 'crossings_parsed',
    count: crossings.length,
    roundabouts: roundabouts.length
  });

  return { crossings, roundabouts };
}

function haversineLike(lat1, lon1, lat2, lon2){
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildRoundabouts(steps, geom){
  const out = [];
  for(const st of steps){
    if(st.type !== 'roundabout' && st.type !== 'rotary') continue;
    const ixList = st.intersections;
    if(!ixList?.length) continue;

    const firstIx = ixList[0];
    const sEnter = findSForLatLon(geom, firstIx.lat, firstIx.lon);
    const sExit = findSForLatLon(geom, st.lat, st.lon);

    let mainIx = ixList[0];
    for(const ix of ixList){
      if((ix.bearings?.length || 0) > (mainIx.bearings?.length || 0)) mainIx = ix;
    }

    const enterPt = interpolateAtS(geom, sEnter);
    const travelBrg = mainIx.out != null && mainIx.bearings?.[mainIx.out] != null
      ? mainIx.bearings[mainIx.out]
      : avgTangentDeg(geom, sEnter, 8);

    const inIdx = mainIx.in;
    const outIdx = mainIx.out;
    const exits = [];
    let totalExits = null;

    if(mainIx.bearings?.length && inIdx != null){
      const exitBearings = [];
      for(let i = 0; i < mainIx.bearings.length; i++){
        if(i === inIdx) continue;
        exitBearings.push(mainIx.bearings[i]);
      }
      totalExits = exitBearings.length || null;
      const targetBrg = outIdx != null ? mainIx.bearings[outIdx] : null;
      for(const brg of exitBearings){
        exits.push({
          bearing: brg,
          isTarget: targetBrg != null && angleDiff(brg, targetBrg) < 25
        });
      }
    }

    out.push({
      sEnter,
      sExit,
      lat: enterPt.lat,
      lon: enterPt.lon,
      exitNumber: st.exit != null ? st.exit : 0,
      totalExits,
      exits,
      travelBearing: travelBrg
    });
  }
  return out.sort((a, b) => a.sEnter - b.sEnter);
}

/** Включён ли слой контекста перекрёстков */
export function isCrossingContextEnabled(){
  return S.showCrossingContext !== false;
}

/** s ближайшего впереди манёвра */
export function getNextTurnManeuverS(geom, curS){
  if(!geom?.maneuvers?.length || curS == null) return null;
  const sorted = geom.maneuvers
    .filter(m => m.step.type !== 'depart' && m.step.type !== 'arrive')
    .sort((a, b) => a.s - b.s);
  let blockUntilS = -Infinity;

  for(const m of sorted){
    if(curS > m.s + MANEUVER_PASSED_M){
      blockUntilS = m.s + MANEUVER_NEXT_DELAY_M;
      continue;
    }
    if(m.s < blockUntilS) continue;
    return m.s;
  }
  return null;
}

function crossingWindow(sManeuver, speedMps){
  const v = Math.max(speedMps || 0, CROSSING_MIN_BACK_M / CROSSING_TIME_S);
  return {
    sMin: sManeuver - v * CROSSING_TIME_S,
    sMax: sManeuver + CROSSING_AHEAD_M
  };
}

/**
 * Пересечения в окне показа вокруг ближайшего манёвра (≤6).
 * @returns {RouteCrossing[]}
 */
export function getVisibleCrossings(geom, curS, speedMps){
  if(!geom?.crossings?.length || curS == null) return [];
  const sManeuver = getNextTurnManeuverS(geom, curS);
  if(sManeuver == null) return [];

  const { sMin, sMax } = crossingWindow(sManeuver, speedMps);
  const inRange = geom.crossings.filter(c => c.s >= sMin && c.s <= sMax);
  if(!inRange.length) return [];

  if(inRange.length > CROSSING_MAX_VISIBLE){
    if(_crossLimitLoggedS !== sManeuver){
      _crossLimitLoggedS = sManeuver;
      telemetry.log('nav', { sub: 'crossings_over_limit', s_maneuver: Math.round(sManeuver) });
    }
    inRange.sort((a, b) => Math.abs(a.s - sManeuver) - Math.abs(b.s - sManeuver));
    return inRange.slice(0, CROSSING_MAX_VISIBLE);
  }
  return inRange;
}

/** Активное кольцо в зоне 15 с до входа … до sExit */
export function getActiveRoundabout(geom, curS, speedMps){
  if(!geom?.roundabouts?.length || curS == null) return null;
  const v = Math.max(speedMps || 0, CROSSING_MIN_BACK_M / CROSSING_TIME_S);
  const back = v * CROSSING_TIME_S;
  for(const rb of geom.roundabouts){
    if(curS >= rb.sEnter - back && curS <= rb.sExit) return rb;
  }
  return null;
}

/** SVG усиков (под лентой, far→near) */
export function renderCrossingWhiskers(snap, headingRad, geom, curS, speedMps){
  if(!isCrossingContextEnabled()) return '';
  const crossings = getVisibleCrossings(geom, curS, speedMps);
  if(!crossings.length) return '';

  const tok = getThemeTokens();
  const sw = Math.max(1, tok.pathEdgeW * 0.5);
  const ctxCol = tok.pathContext;
  const ctxOp = tok.pathContextOpacity;
  const sorted = crossings.slice().sort((a, b) => b.s - a.s);
  let out = '';

  for(const cx of sorted){
    const col = cx.isManeuver ? tok.accent : ctxCol;
    const op = cx.isManeuver ? 1 : ctxOp;
    for(const w of cx.whiskers){
      const start = worldToCamXZ(cx.lat, cx.lon, snap, headingRad);
      const end = worldToCamXZ(w.endLat, w.endLon, snap, headingRad);
      if(start.z < 2 || start.z > ROAD_MAX) continue;
      if(end.z < 0.5) continue;
      const P0 = projectGround(start.x, start.z, 0);
      const P1 = projectGround(end.x, end.z, 0);
      if(!P0 || !P1) continue;
      out += '<line x1="' + P0.x.toFixed(1) + '" y1="' + P0.y.toFixed(1) +
        '" x2="' + P1.x.toFixed(1) + '" y2="' + P1.y.toFixed(1) +
        '" stroke="' + col + '" stroke-width="' + sw.toFixed(1) +
        '" stroke-linecap="round" stroke-opacity="' + op.toFixed(2) + '"/>';
    }
  }
  return out;
}

/** SVG схемы кругового (фиксированный экранный размер) */
export function renderRoundaboutSchema(rb, snap, headingRad){
  if(!rb) return '';
  const tok = getThemeTokens();
  const loc = worldToCamXZ(rb.lat, rb.lon, snap, headingRad);
  if(loc.z < 5 || loc.z > ROAD_MAX) return '';
  const P = projectGround(loc.x, loc.z, 0);
  if(!P) return '';

  const r = L.W * 0.085;
  const cx = P.x;
  const cy = P.y;
  const swRing = Math.max(1, tok.pathEdgeW * 0.5);
  let out = '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) +
    '" r="' + r.toFixed(1) + '" fill="none" stroke="' + tok.pathContext +
    '" stroke-width="' + swRing.toFixed(1) + '" stroke-opacity="' +
    tok.pathContextOpacity.toFixed(2) + '"/>';

  const showAll = rb.totalExits != null && rb.exits.length > 1;
  const exits = showAll ? rb.exits : rb.exits.filter(e => e.isTarget);

  for(const ex of exits){
    const rel = signedAngle(rb.travelBearing, ex.bearing) * Math.PI / 180;
    const tickLen = ex.isTarget ? r * 0.42 : r * 0.26;
    const sw = ex.isTarget ? Math.max(1.5, tok.pathEdgeW * 0.85) : swRing;
    const col = ex.isTarget ? tok.accent : tok.pathContext;
    const op = ex.isTarget ? 1 : tok.pathContextOpacity;
    const inner = r * 0.72;
    const x1 = cx + Math.sin(rel) * inner;
    const y1 = cy - Math.cos(rel) * inner;
    const x2 = cx + Math.sin(rel) * (inner + tickLen);
    const y2 = cy - Math.cos(rel) * (inner + tickLen);
    out += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) +
      '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
      '" stroke="' + col + '" stroke-width="' + sw.toFixed(1) +
      '" stroke-linecap="round" stroke-opacity="' + op.toFixed(2) + '"/>';
  }
  return out;
}
