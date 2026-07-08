/**
 * RouteGeometry — уплотнение маршрута, snap по длине дуги, Frenet-проекция.
 * @module route-geometry
 */
import { haversine, bearing, angleDiff } from './geo.js';
import { S, CAM_PITCH } from './state.js';
import { curPos } from './gps.js';
import { refineManeuvers, resetManeuverFilterLog, HIGHWAY_CLASSES } from './maneuver-filter.js';
import {
  updateSnapQuality, navSFromSnap, resetSnapQuality, SnapQuality, takeForceReeval
} from './snap-quality.js';
import {
  SNAP_HEADING_ACCEPT_DEG, SNAP_HEADING_REJECT_DEG, SNAP_HEADING_GATE_MIN_SPD,
  SNAP_HEADING_GATE_ACC_MAX_M, SNAP_HEADING_MAX_AGE_MS, SNAP_MIN_DOT,
  SNAP_WINDOW_BASE_M, SNAP_WINDOW_ACC_MULT, SNAP_WINDOW_DT_CAP_S, SNAP_STATIONARY_SPD_MPS,
  SNAP_JUMP_PENALTY, SNAP_ANGLE_PENALTY, SNAP_COLD_START_SKIP_FIXES,
  SNAP_REVERSE_EPS, SNAP_FALLBACK_BACK_M, SNAP_FALLBACK_FWD_M,
  SNAP_QUALITY_JUMP_DS_M, SNAP_CURVATURE_RADIUS_M, SNAP_CURVATURE_THRESHOLD_MULT,
  ROUNDABOUT_HEADING_GATE_DEG
} from './nav-constants.js';
import { isSegIdxOnRoundabout, getRoundaboutSnapFlags } from './roundabout.js';

/** Шаг уплотнения polyline, м */
export const DENSE_STEP = 3;
/** Минимальный радиус дуги на шпильке, м */
export const ARC_R_MIN = 12;
/** Порог угла для вставки дуги, ° */
export const ARC_ANGLE_THRESH = 15;
/** Окно snap назад / вперёд — legacy fallback */
export const SNAP_BACK_M = 150;
export const SNAP_FWD_M = 150;
/** Окно усреднения касательной камеры по s, м */
export const CAM_TANGENT_WINDOW = 25;
/** Сглаживание касательной камеры за кадр (0…1, при ~60 fps) */
export const CAM_SMOOTH_ALPHA = 0.11;
/** Шаг сечений ленты, м — фиксированный для стабильной топологии mesh */
export const RIBBON_STEP_M = 2;

let _snap = null;
let _prevFixTs = 0;
let _prevFixPos = null;
let _fixesSinceReset = 0;
let _camHeadingRad = null;
let _camPitchRad = null;
let _snapMemoTs = null;
let _disp = { s: 0, inited: false };
let _dispLastTs = 0;
let _camLastTs = 0;
let _camPitchLastTs = 0;

/** Сброс snap при смене маршрута */
export function resetRouteSnap(opts){
  _snap = null;
  _camHeadingRad = null;
  _camPitchRad = null;
  _snapMemoTs = null;
  _disp.inited = false;
  _dispLastTs = 0;
  _camLastTs = 0;
  _camPitchLastTs = 0;
  _prevFixTs = 0;
  _prevFixPos = null;
  _fixesSinceReset = 0;
  resetSnapQuality();
  if(opts?.seedS != null && S.route?.geometry){
    const geom = S.route.geometry;
    const p = interpolateAtS(geom, opts.seedS);
    _snap = {
      s: opts.seedS,
      segIdx: findSegAtS(geom, opts.seedS),
      lat: p.lat, lon: p.lon,
      lateral: opts.lateral ?? 0,
      tangent: avgTangentDeg(geom, opts.seedS, 20),
      confidence: 0.7
    };
    _disp.s = opts.seedS;
    _disp.inited = true;
  }
}

/** Текущий snap (или null) */
export function getRouteSnap(){ return _snap; }

function destPoint(from, brgDeg, distM){
  const r = Math.PI / 180;
  const br = brgDeg * r;
  const d = distM / 6371000;
  const lat1 = from.lat * r;
  const lon1 = from.lon * r;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br));
  const lon2 = lon1 + Math.atan2(
    Math.sin(br) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: lat2 / r, lon: lon2 / r };
}

function turnAngleDeg(A, B, C){
  const bIn = bearing(A, B);
  const bOut = bearing(B, C);
  return ((bOut - bIn + 540) % 360) - 180;
}

/** Квадратичная дуга вместо острой вершины (не Chaikin — не срезает шпильку) */
function bezierCorner(A, B, C){
  const turn = turnAngleDeg(A, B, C);
  if(Math.abs(turn) < ARC_ANGLE_THRESH) return null;
  const dAB = haversine(A, B);
  const dBC = haversine(B, C);
  const lead = Math.min(15, dAB * 0.35, dBC * 0.35);
  if(lead < 1.5) return null;
  const bIn = bearing(A, B);
  const bOut = bearing(B, C);
  const E = destPoint(B, bIn + 180, lead);
  const X = destPoint(B, bOut, lead);
  const n = Math.max(4, Math.ceil(Math.abs(turn) / 3));
  const pts = [];
  for(let k = 0; k <= n; k++){
    const t = k / n;
    const u = 1 - t;
    pts.push({
      lat: u * u * E.lat + 2 * u * t * B.lat + t * t * X.lat,
      lon: u * u * E.lon + 2 * u * t * B.lon + t * t * X.lon
    });
  }
  return pts;
}

function pushUnique(lat, lon, la, lo){
  const n = lat.length;
  if(n){
    const d = haversine({ lat: lat[n - 1], lon: lon[n - 1] }, { lat: la, lon: lo });
    if(d < 0.4) return;
  }
  lat.push(la);
  lon.push(lo);
}

function interpolateSeg(lat, lon, a, b, stepM){
  const d = haversine(a, b);
  const n = Math.max(1, Math.ceil(d / stepM));
  for(let k = 1; k <= n; k++){
    const t = k / n;
    pushUnique(lat, lon,
      a.lat + t * (b.lat - a.lat),
      a.lon + t * (b.lon - a.lon));
  }
}

/** Уплотнение coords с дугами на острых вершинах */
function densifyCoords(coords, stepM){
  const lat = [];
  const lon = [];
  if(!coords || coords.length < 2) return { lat, lon };

  const first = { lat: coords[0][0], lon: coords[0][1] };
  pushUnique(lat, lon, first.lat, first.lon);

  for(let i = 0; i < coords.length - 1; i++){
    const B = { lat: coords[i][0], lon: coords[i][1] };
    const C = { lat: coords[i + 1][0], lon: coords[i + 1][1] };
    const A = i > 0 ? { lat: coords[i - 1][0], lon: coords[i - 1][1] } : null;

    let segStart = B;
    if(A){
      const arc = bezierCorner(A, B, C);
      if(arc && arc.length > 1){
        if(lat.length){
          const last = { lat: lat[lat.length - 1], lon: lon[lon.length - 1] };
          if(haversine(last, arc[0]) < 2) lat.pop(), lon.pop();
        }
        arc.forEach(p => pushUnique(lat, lon, p.lat, p.lon));
        segStart = { lat: lat[lat.length - 1], lon: lon[lon.length - 1] };
      }
    }
    interpolateSeg(lat, lon, segStart, C, stepM);
  }
  return { lat, lon };
}

function buildArcLength(lat, lon){
  const n = lat.length;
  const s = new Float64Array(n);
  for(let i = 1; i < n; i++){
    s[i] = s[i - 1] + haversine(
      { lat: lat[i - 1], lon: lon[i - 1] },
      { lat: lat[i], lon: lon[i] });
  }
  return s;
}

function findSForManeuver(sparseCoords, geom, targetLat, targetLon){
  return findSForLatLon(geom, targetLat, targetLon);
}

/** Ближайшая дуговая координата s для lat/lon на dense polyline */
export function findSForLatLon(geom, lat, lon){
  if(!geom || geom.n < 2) return 0;
  const gps = { lat, lon };
  let bestS = 0;
  let bestD = Infinity;
  for(let i = 0; i < geom.n - 1; i++){
    const proj = projectOnSegment(gps,
      geom.lat[i], geom.lon[i], geom.lat[i + 1], geom.lon[i + 1]);
    const segLen = geom.s[i + 1] - geom.s[i];
    const s = geom.s[i] + proj.t * segLen;
    if(proj.lateral < bestD){
      bestD = proj.lateral;
      bestS = s;
    }
  }
  return bestS;
}

function buildManeuvers(steps, sparseCoords, geom){
  if(!steps || !sparseCoords) return [];
  const full = { lat: geom.lat, lon: geom.lon, s: geom.s, n: geom.n };
  return steps
    .filter(st => st.type !== 'depart' && st.type !== 'arrive')
    .map(st => {
      const s = findSForManeuver(sparseCoords, geom, st.lat, st.lon);
      return {
        s,
        lat: st.lat,
        lon: st.lon,
        angle: Math.abs(turnAngleAtS(full, s)),
        step: st
      };
    });
}

/** Шаг уплотнения: грубее на длинных маршрутах */
function denseStepForCoords(coords){
  let total = 0;
  for(let i = 0; i < coords.length - 1; i++){
    total += haversine(
      { lat: coords[i][0], lon: coords[i][1] },
      { lat: coords[i + 1][0], lon: coords[i + 1][1] });
  }
  if(total > 120000) return 8;
  if(total > 40000) return 5;
  return DENSE_STEP;
}

/** Построение RouteGeometry из route.coords + steps */
export function buildRouteGeometry(route){
  if(!route || !route.coords || route.coords.length < 2) return null;
  resetManeuverFilterLog();
  const stepM = denseStepForCoords(route.coords);
  const { lat: latArr, lon: lonArr } = densifyCoords(route.coords, stepM);
  const n = latArr.length;
  if(n < 2) return null;

  const lat = Float64Array.from(latArr);
  const lon = Float64Array.from(lonArr);
  const s = buildArcLength(latArr, lonArr);
  const elev = new Float64Array(n);
  const grade = new Float64Array(n);
  const maneuvers = refineManeuvers(buildManeuvers(route.steps, route.coords, { s, n, lat, lon }));
  return { lat, lon, s, elev, grade, maneuvers, n, elevReady: false, curveReady: false,
    crossings: [], roundabouts: [] };
}

/** Индекс сегмента, содержащего s */
export function findSegAtS(geom, s){
  let lo = 0;
  let hi = geom.n - 2;
  while(lo < hi){
    const mid = (lo + hi + 1) >> 1;
    if(geom.s[mid] <= s) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** lat/lon в точке s (линейная интерполяция по сегменту) */
export function interpolateAtS(geom, s){
  if(s <= 0) return { lat: geom.lat[0], lon: geom.lon[0] };
  const total = geom.s[geom.n - 1];
  if(s >= total) return { lat: geom.lat[geom.n - 1], lon: geom.lon[geom.n - 1] };
  const i = findSegAtS(geom, s);
  const s0 = geom.s[i];
  const s1 = geom.s[i + 1];
  const t = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
  return {
    lat: geom.lat[i] + t * (geom.lat[i + 1] - geom.lat[i]),
    lon: geom.lon[i] + t * (geom.lon[i + 1] - geom.lon[i])
  };
}

/** Угол поворота маршрута в точке s, ° (− влево, + вправо) */
export function turnAngleAtS(geom, s){
  const ds = 18;
  const total = geom.s[geom.n - 1];
  const s0 = Math.max(0, s - ds);
  const s2 = Math.min(total, s + ds);
  if(s2 - s0 < 8) return 0;
  const p0 = interpolateAtS(geom, s0);
  const p1 = interpolateAtS(geom, s);
  const p2 = interpolateAtS(geom, s2);
  const bIn = bearing(p0, p1);
  const bOut = bearing(p1, p2);
  return ((bOut - bIn + 540) % 360) - 180;
}

function segmentBearing(geom, i){
  return bearing(
    { lat: geom.lat[i], lon: geom.lon[i] },
    { lat: geom.lat[i + 1], lon: geom.lon[i + 1] });
}

function projectOnSegment(gps, lat0, lon0, lat1, lon1){
  const r = Math.PI / 180;
  const cosM = Math.cos(((lat0 + lat1) / 2) * r);
  const ax = lon0 * r * cosM;
  const ay = lat0 * r;
  const bx = lon1 * r * cosM;
  const by = lat1 * r;
  const px = gps.lon * r * cosM;
  const py = gps.lat * r;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  const plat = (ay + t * dy) / r;
  const plon = (ax + t * dx) / (r * cosM);
  const lateral = haversine(gps, { lat: plat, lon: plon });
  return { t, lat: plat, lon: plon, lateral };
}

function headingDot(tangentDeg, gpsHdg){
  if(gpsHdg == null || isNaN(gpsHdg)) return 1;
  const diff = angleDiff(tangentDeg, gpsHdg);
  return Math.cos(diff * Math.PI / 180);
}

function computeSnapWindow(spd, dt, acc){
  const v = Math.max(spd || 0, 0);
  const a = Math.max(acc || 8, 8);
  if(v < SNAP_STATIONARY_SPD_MPS) return Math.max(8, a * 0.5);
  if(v < 1) return Math.max(25, SNAP_WINDOW_ACC_MULT * a);
  return v * Math.min(dt, SNAP_WINDOW_DT_CAP_S) + SNAP_WINDOW_ACC_MULT * a + SNAP_WINDOW_BASE_M;
}

function headingGateReject(tangent, gpsHdg, spd, acc, headingAgeMs, segIdx){
  if(gpsHdg == null || isNaN(gpsHdg)) return false;
  const onRb = segIdx != null && isSegIdxOnRoundabout(segIdx, S.route);
  const acceptDeg = onRb ? ROUNDABOUT_HEADING_GATE_DEG : SNAP_HEADING_ACCEPT_DEG;
  const rejectDeg = onRb ? ROUNDABOUT_HEADING_GATE_DEG + 20 : SNAP_HEADING_REJECT_DEG;
  const diff = angleDiff(tangent, gpsHdg);
  if(diff > rejectDeg) return true;
  const softGate = acc > SNAP_HEADING_GATE_ACC_MAX_M || headingAgeMs > SNAP_HEADING_MAX_AGE_MS;
  if(softGate) return false;
  if(spd >= SNAP_HEADING_GATE_MIN_SPD && diff > acceptDeg) return true;
  if(spd >= SNAP_HEADING_GATE_MIN_SPD){
    const dot = headingDot(tangent, gpsHdg);
    if(dot < SNAP_MIN_DOT) return true;
  }
  return false;
}

function scanSnap(gps, geom, sMin, sMax, gpsHdg, requireDir, ctx){
  let best = null;
  const i0 = findSegAtS(geom, sMin);
  const spd = ctx?.spd ?? 0;
  const acc = ctx?.acc ?? 8;
  const headingAgeMs = ctx?.headingAgeMs ?? 0;
  const prevS = ctx?.prevS ?? 0;
  const skipJump = ctx?.skipJumpPenalty ?? false;
  const dt = ctx?.dt ?? 1;

  for(let i = i0; i < geom.n - 1; i++){
    if(geom.s[i] > sMax) break;
    const proj = projectOnSegment(gps,
      geom.lat[i], geom.lon[i], geom.lat[i + 1], geom.lon[i + 1]);
    const segLen = geom.s[i + 1] - geom.s[i];
    const s = geom.s[i] + proj.t * segLen;
    if(s < sMin - 1 || s > sMax + 1) continue;

    const tangent = segmentBearing(geom, i);
    const dot = headingDot(tangent, gpsHdg);

    if(requireDir && headingGateReject(tangent, gpsHdg, spd, acc, headingAgeMs, i)) continue;
    if(requireDir && dot < SNAP_MIN_DOT) continue;

    if(requireDir && spd > 1 && ctx?.prevPos){
      const moveBrg = bearing(ctx.prevPos, gps);
      if(headingDot(tangent, moveBrg) < 0) continue;
    }

    let score = proj.lateral + SNAP_ANGLE_PENALTY * (gpsHdg != null ? (1 - dot) * 50 : 0);
    if(!skipJump && prevS > 0){
      const maxJump = spd * dt + acc;
      const jumpExcess = Math.max(0, Math.abs(s - prevS) - maxJump);
      score += SNAP_JUMP_PENALTY * jumpExcess / 10;
    }

    if(!best || score < best.score){
      best = { s, segIdx: i, lat: proj.lat, lon: proj.lon, lateral: proj.lateral,
        tangent, dot, score, confidence: dot >= SNAP_MIN_DOT ? 1 : 0.5 };
    }
  }
  return best;
}

/** Snap в узком окне вокруг hintS — для отрисовки каждый кадр */
function snapNearS(gps, geom, hintS, gpsHdg){
  const total = geom.s[geom.n - 1];
  const sMin = Math.max(0, hintS - 40);
  const sMax = Math.min(total, hintS + 85);
  return scanSnap(gps, geom, sMin, sMax, gpsHdg, false);
}

/**
 * Snap GPS на polyline с окном по s и проверкой направления (серпантины).
 * @param {object} gps
 * @param {object} geom RouteGeometry
 * @param {number|null} gpsHeadingDeg
 */
export function snapToRoute(gps, geom, gpsHeadingDeg, meta){
  if(!gps || !geom || geom.n < 2) return null;

  const prev = _snap;
  const total = geom.s[geom.n - 1];
  const prevS = prev ? prev.s : 0;
  const now = gps.ts || Date.now();
  const dt = _prevFixTs ? Math.min(SNAP_WINDOW_DT_CAP_S, (now - _prevFixTs) / 1000) : 1;
  const spd = gps.speed != null && gps.speed >= 0 ? gps.speed : 0;
  const acc = gps.acc || 8;
  const headingAgeMs = meta?.headingAgeMs ?? 0;

  _fixesSinceReset++;

  const sWin = prevS > 0 ? computeSnapWindow(spd, dt, acc) : Math.min(200, total * 0.05);
  const sMin = Math.max(0, prevS - sWin);
  const sMax = Math.min(total, prevS + sWin);

  const ctx = {
    spd, acc, headingAgeMs, prevS, dt,
    skipJumpPenalty: prevS <= 0 || _fixesSinceReset <= SNAP_COLD_START_SKIP_FIXES,
    prevPos: _prevFixPos
  };

  let best = null;
  if(takeForceReeval() && prevS > 0){
    const wide = 3 * acc + 100;
    best = scanSnap(gps, geom, Math.max(0, prevS - wide),
      Math.min(total, prevS + wide), gpsHeadingDeg, false, ctx);
  }

  if(!best){
    best = scanSnap(gps, geom, sMin, sMax, gpsHeadingDeg, true, ctx);
  }

  if(!best){
    best = scanSnap(gps, geom, Math.max(0, prevS - SNAP_FALLBACK_BACK_M),
      Math.min(total, prevS + SNAP_FALLBACK_FWD_M), gpsHeadingDeg, false, ctx);
  }

  if(!best){
    if(prev) return prev;
    best = scanSnap(gps, geom, 0, Math.min(total, 200), gpsHeadingDeg, false, ctx);
    if(!best) return null;
  }

  const jump = prev && Math.abs(best.s - prev.s) > SNAP_QUALITY_JUMP_DS_M;

  if(prev && best.lateral < 40 && best.s < prev.s - SNAP_REVERSE_EPS){
    best = { ...best, s: prev.s, segIdx: prev.segIdx, confidence: 0.4 };
  }

  if(prev && spd < SNAP_STATIONARY_SPD_MPS && best.s > prev.s){
    best = { ...best, s: prev.s, segIdx: prev.segIdx };
  }

  if(prev && best.lateral < 35 && spd >= SNAP_STATIONARY_SPD_MPS){
    const ds = best.s - prev.s;
    if(ds > 0 && ds < 30) best.s = prev.s + ds * 0.65;
  }

  if(best.lateral > 60) best.confidence = Math.min(best.confidence, 0.3);

  const { R } = radiusAtS(geom, best.s);
  const curvMult = (!isFinite(R) || R >= SNAP_CURVATURE_RADIUS_M) ? 1 : SNAP_CURVATURE_THRESHOLD_MULT;
  const rbFlags = getRoundaboutSnapFlags(best.segIdx, S.route);
  updateSnapQuality(best, gps, geom, { jump, curvMult, roundabout: rbFlags });

  _snap = best;
  _prevFixTs = now;
  _prevFixPos = { lat: gps.lat, lon: gps.lon };
  return best;
}

/** Snap для навигации: s с учётом snap-quality */
export function getNavSnap(gpsHeadingDeg){
  const raw = getRouteSnapForNav(gpsHeadingDeg);
  if(!raw) return null;
  const ns = navSFromSnap(raw);
  if(ns == null || ns === raw.s) return raw;
  const geom = S.route?.geometry;
  if(!geom) return raw;
  const p = interpolateAtS(geom, ns);
  return {
    ...raw,
    s: ns,
    lat: p.lat,
    lon: p.lon,
    segIdx: findSegAtS(geom, ns)
  };
}

/** Snap по последнему GPS-fix (не по интерполированному curPos — иначе дрожание) */
export function getRouteSnapForNav(gpsHeadingDeg){
  const geom = S.route?.geometry;
  const gps = S.gps;
  if(!geom || !gps) return null;
  if(_snapMemoTs === gps.ts && _snap) return _snap;
  _snapMemoTs = gps.ts;
  const headingAgeMs = S.lastReliableHeadingTs
    ? Date.now() - S.lastReliableHeadingTs : SNAP_HEADING_MAX_AGE_MS + 1;
  return snapToRoute(gps, geom, gpsHeadingDeg, { headingAgeMs });
}

function frameDtSec(){
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const dtMs = _dispLastTs ? Math.min(48, now - _dispLastTs) : 16;
  _dispLastTs = now;
  return dtMs / 1000;
}

/**
 * Сглаженный snap для отрисовки ленты: интеграция по скорости + curPos каждый кадр.
 * Навигация (манёвры, дистанция) использует getRouteSnapForNav без сглаживания.
 */
export function getDisplaySnap(rawSnap, geom, speedMps, gpsHeadingDeg){
  if(!rawSnap || !geom) return null;
  const dt = frameDtSec();
  const total = geom.s[geom.n - 1];
  const spd = Math.max(0, speedMps || 0);

  if(!_disp.inited){
    _disp.s = rawSnap.s;
    _disp.inited = true;
  } else if(spd > 0.05){
    _disp.s = Math.min(total, _disp.s + spd * dt);
  }

  let targetS = rawSnap.s;
  const pos = curPos();
  if(pos){
    const hit = snapNearS(pos, geom, _disp.s, gpsHeadingDeg);
    if(hit) targetS = hit.s;
  }

  const tau = 0.11;
  const alpha = 1 - Math.exp(-dt / tau);
  _disp.s += (targetS - _disp.s) * alpha;
  _disp.s = Math.max(0, Math.min(total, _disp.s));

  const p = interpolateAtS(geom, _disp.s);
  return {
    s: _disp.s,
    lat: p.lat,
    lon: p.lon,
    segIdx: findSegAtS(geom, _disp.s),
    lateral: rawSnap.lateral,
    confidence: rawSnap.confidence
  };
}

/** Средняя касательная маршрута на окне [s, s+windowM] */
export function avgTangentDeg(geom, s, windowM){
  const end = Math.min(geom.s[geom.n - 1], s + windowM);
  let vx = 0;
  let vz = 0;
  const i0 = findSegAtS(geom, s);
  for(let i = i0; i < geom.n - 1 && geom.s[i] < end; i++){
    const r = Math.PI / 180;
    const midLat = (geom.lat[i] + geom.lat[i + 1]) / 2;
    const dLon = (geom.lon[i + 1] - geom.lon[i]) * Math.cos(midLat * r) * 111320;
    const dLat = (geom.lat[i + 1] - geom.lat[i]) * 110540;
    const len = Math.hypot(dLon, dLat) || 1;
    vx += dLon / len;
    vz += dLat / len;
  }
  if(vx === 0 && vz === 0){
    const i = findSegAtS(geom, s);
    return segmentBearing(geom, Math.min(i, geom.n - 2));
  }
  return (Math.atan2(vx, vz) * 180 / Math.PI + 360) % 360;
}

function camSmoothAlpha(dtSec){
  return 1 - Math.pow(1 - CAM_SMOOTH_ALPHA, Math.max(1, dtSec * 60));
}

/** Сглаженная касательная камеры (пространство + время) */
export function updateCamHeading(geom, snap){
  if(!geom || !snap) return _camHeadingRad;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const dt = _camLastTs ? Math.min(48, now - _camLastTs) / 1000 : 1 / 60;
  _camLastTs = now;

  const tgt = avgTangentDeg(geom, snap.s, CAM_TANGENT_WINDOW) * Math.PI / 180;
  if(_camHeadingRad == null){
    _camHeadingRad = tgt;
    return _camHeadingRad;
  }
  let diff = tgt - _camHeadingRad;
  while(diff > Math.PI) diff -= 2 * Math.PI;
  while(diff < -Math.PI) diff += 2 * Math.PI;
  _camHeadingRad += diff * camSmoothAlpha(dt);
  return _camHeadingRad;
}

/** Средний уклон (grade) на окне [s, s+windowM] */
export function avgGradeAtS(geom, s, windowM){
  if(!geom?.elevReady) return 0;
  const total = geom.s[geom.n - 1];
  const sEnd = Math.min(total, s + windowM);
  const ds = sEnd - s;
  if(ds < 0.5) return 0;
  const e0 = interpolateElevAtS(geom, s);
  const e1 = interpolateElevAtS(geom, sEnd);
  return (e1 - e0) / ds;
}

/**
 * Сглаженный наклон камеры по уклону дороги (этап 3).
 * @param {number} elevExag усиление из настроек
 * @param {boolean} enabled профиль высот включён
 */
export function updateCamPitch(geom, snap, elevExag, enabled){
  if(!enabled || !geom?.elevReady || !snap){
    _camPitchRad = null;
    return CAM_PITCH;
  }
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const dt = _camPitchLastTs ? Math.min(48, now - _camPitchLastTs) / 1000 : 1 / 60;
  _camPitchLastTs = now;

  const grade = avgGradeAtS(geom, snap.s, CAM_TANGENT_WINDOW);
  const roadPitch = Math.atan(grade * elevExag) * 0.35;
  const tgt = CAM_PITCH + Math.max(-0.14, Math.min(0.16, roadPitch));
  if(_camPitchRad == null){
    _camPitchRad = tgt;
    return _camPitchRad;
  }
  _camPitchRad += (tgt - _camPitchRad) * camSmoothAlpha(dt);
  return _camPitchRad;
}

export function getCamPitchRad(){
  return _camPitchRad != null ? _camPitchRad : CAM_PITCH;
}

export function getCamHeadingRad(){ return _camHeadingRad; }

/** Точки центра дорожки в локальной Frenet-системе (x — вбок, z — вперёд) */
export function slicePathFrenet(geom, snap, maxDist, headingRad, stepM){
  if(!geom || !snap) return [];
  const cosH = Math.cos(headingRad);
  const sinH = Math.sin(headingRad);
  const kx = Math.cos(snap.lat * Math.PI / 180) * 111320;
  const ky = 110540;
  const sEnd = Math.min(geom.s[geom.n - 1], snap.s + maxDist);
  const pts = [];
  const elev0 = geom.elevReady ? interpolateElevAtS(geom, snap.s) : 0;

  for(let s = snap.s; s <= sEnd; s += stepM){
    const p = interpolateAtS(geom, s);
    const dx = (p.lon - snap.lon) * kx;
    const dy = (p.lat - snap.lat) * ky;
    const x = dx * cosH - dy * sinH;
    const z = dx * sinH + dy * cosH;
    const elev = geom.elevReady ? interpolateElevAtS(geom, s) - elev0 : 0;
    pts.push({ x, z, s, lat: p.lat, lon: p.lon, elev });
  }
  return pts;
}

export function interpolateElevAtS(geom, s){
  if(!geom.elevReady || !geom.elev.length) return 0;
  const i = findSegAtS(geom, s);
  const s0 = geom.s[i];
  const s1 = geom.s[i + 1];
  const t = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
  return geom.elev[i] + t * (geom.elev[i + 1] - geom.elev[i]);
}

function estimateRadius(pts, i){
  if(i <= 0 || i >= pts.length - 1) return Infinity;
  const a = pts[i - 1];
  const b = pts[i];
  const c = pts[i + 1];
  const v1x = b.x - a.x;
  const v1z = b.z - a.z;
  const v2x = c.x - b.x;
  const v2z = c.z - b.z;
  const l1 = Math.hypot(v1x, v1z);
  const l2 = Math.hypot(v2x, v2z);
  if(l1 < 0.05 || l2 < 0.05) return Infinity;
  const cross = v1x * v2z - v1z * v2x;
  const dot = (v1x * v2x + v1z * v2z) / (l1 * l2);
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
  if(angle < 0.03) return Infinity;
  const chord = Math.min(l1, l2);
  return chord / (2 * Math.sin(angle / 2));
}

/** Масштаб метров на градус широты */
function meterScale(lat){
  const r = Math.PI / 180;
  return { kx: Math.cos(lat * r) * 111320, ky: 110540 };
}

/** Frenet-рамка в точке s: касательная и левая нормаль (east/north), м */
export function frenetFrameAtS(geom, s){
  const total = geom.s[geom.n - 1];
  const ds = Math.min(2.5, Math.max(1, total / Math.max(geom.n, 1)));
  const s0 = Math.max(0, s - ds);
  const s1 = Math.min(total, s + ds);
  const p0 = interpolateAtS(geom, s0);
  const p1 = interpolateAtS(geom, s1);
  const midLat = (p0.lat + p1.lat) / 2;
  const { kx, ky } = meterScale(midLat);
  const ex = (p1.lon - p0.lon) * kx;
  const ny = (p1.lat - p0.lat) * ky;
  const len = Math.hypot(ex, ny) || 1;
  return { tx: ex / len, tz: ny / len, nx: -ny / len, nz: ex / len };
}

/** Радиус кривизны и знак поворота (+ = влево) в точке s */
export function radiusAtS(geom, s){
  const ds = 2;
  const total = geom.s[geom.n - 1];
  const s0 = Math.max(0, s - ds);
  const s1 = s;
  const s2 = Math.min(total, s + ds);
  const p0 = interpolateAtS(geom, s0);
  const p1 = interpolateAtS(geom, s1);
  const p2 = interpolateAtS(geom, s2);
  const { kx, ky } = meterScale(p1.lat);
  const ax = (p1.lon - p0.lon) * kx;
  const ay = (p1.lat - p0.lat) * ky;
  const bx = (p2.lon - p1.lon) * kx;
  const by = (p2.lat - p1.lat) * ky;
  const cross = ax * by - ay * bx;
  const la = Math.hypot(ax, ay);
  const lb = Math.hypot(bx, by);
  if(la < 0.01 || lb < 0.01) return { R: Infinity, turnSign: 0 };
  const dot = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
  const angle = Math.acos(dot);
  if(angle < 0.02) return { R: Infinity, turnSign: 0 };
  const R = Math.min(la, lb) / (2 * Math.sin(angle / 2));
  return { R, turnSign: cross > 0 ? 1 : -1 };
}

function curvatureAtS(geom, s){ return radiusAtS(geom, s); }

function ribbonStepAtS(){
  return RIBBON_STEP_M;
}

/** Минимальная «глубина» ближнего сечения — лента уходит за нижний край экрана */
const RIBBON_NEAR_Z_MIN = 0.06;
const RIBBON_NEAR_Z_STEP = 0.22;

/**
 * Дополнительные сечения ближе к камере (экстраполяция от первых двух точек).
 * Проецируются ниже viewBox — при slice заполняют низ без чёрной полосы.
 */
export function extendRibbonNearCam(sections){
  if(sections.length < 2) return sections;
  const s0 = sections[0];
  const s1 = sections[1];
  const dz = s1.cz - s0.cz;
  if(dz < 0.02) return sections;
  const inv = 1 / dz;
  const rate = {
    s: (s1.s - s0.s) * inv,
    elev: (s1.elev - s0.elev) * inv,
    cx: (s1.cx - s0.cx) * inv,
    lx: (s1.lx - s0.lx) * inv,
    lz: (s1.lz - s0.lz) * inv,
    rx: (s1.rx - s0.rx) * inv,
    rz: (s1.rz - s0.rz) * inv
  };
  const extra = [];
  for(let z = s0.cz - RIBBON_NEAR_Z_STEP; z >= RIBBON_NEAR_Z_MIN; z -= RIBBON_NEAR_Z_STEP){
    const back = s0.cz - z;
    extra.push({
      s: s0.s - rate.s * back,
      lat: s0.lat,
      lon: s0.lon,
      elev: s0.elev - rate.elev * back,
      cx: s0.cx - rate.cx * back,
      cz: z,
      lx: s0.lx - rate.lx * back,
      lz: s0.lz - rate.lz * back,
      rx: s0.rx - rate.rx * back,
      rz: s0.rz - rate.rz * back
    });
  }
  return extra.length ? extra.concat(sections) : sections;
}

/**
 * Сечения ленты в камерной системе (x/z от snap) — без скачков Frenet на шпильках.
 * Нормаль с parallel transport (не переворачивается между точками).
 */
export function computeRibbonSectionsCam(geom, snap, maxDist, halfW, headingRad){
  const elev0 = geom.elevReady ? interpolateElevAtS(geom, snap.s) : 0;
  const sEnd = Math.min(geom.s[geom.n - 1], snap.s + maxDist);
  const step = ribbonStepAtS();
  const samples = [];

  for(let s = snap.s; s <= sEnd + 0.01; s += step){
    const p = interpolateAtS(geom, s);
    const c = worldToCamXZ(p.lat, p.lon, snap, headingRad);
    samples.push({
      s,
      x: c.x,
      z: c.z,
      lat: p.lat,
      lon: p.lon,
      elev: geom.elevReady ? interpolateElevAtS(geom, s) - elev0 : 0
    });
    if(s >= sEnd) break;
  }

  const sections = [];
  let prevNx = null;
  let prevNz = null;

  for(let i = 0; i < samples.length; i++){
    const cur = samples[i];
    if(cur.z < 0.12) continue;

    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(samples.length - 1, i + 1);
    let tx = samples[i1].x - samples[i0].x;
    let tz = samples[i1].z - samples[i0].z;
    const tl = Math.hypot(tx, tz);
    if(tl < 0.08) continue;
    tx /= tl;
    tz /= tl;

    let nx = -tz;
    let nz = tx;
    if(prevNx != null && nx * prevNx + nz * prevNz < 0){
      nx = -nx;
      nz = -nz;
    }
    prevNx = nx;
    prevNz = nz;

    let leftW = halfW;
    let rightW = halfW;
    const { R, turnSign } = radiusAtS(geom, cur.s);
    if(R < Infinity && R < halfW * 5){
      const maxOff = Math.max(0.55, R * 0.88);
      if(turnSign > 0) leftW = Math.min(leftW, maxOff);
      else if(turnSign < 0) rightW = Math.min(rightW, maxOff);
    }

    sections.push({
      s: cur.s,
      lat: cur.lat,
      lon: cur.lon,
      elev: cur.elev,
      cx: cur.x,
      cz: cur.z,
      lx: cur.x + nx * leftW,
      lz: cur.z + nz * leftW,
      rx: cur.x - nx * rightW,
      rz: cur.z - nz * rightW
    });
  }
  return sections;
}

/**
 * Поперечные сечения ленты вдоль маршрута (per-point Frenet).
 * @deprecated — для HUD используйте computeRibbonSectionsCam
 */
export function computeRibbonSections(geom, snap, maxDist, halfW){
  const sections = [];
  const elev0 = geom.elevReady ? interpolateElevAtS(geom, snap.s) : 0;
  const sEnd = Math.min(geom.s[geom.n - 1], snap.s + maxDist);
  let s = snap.s;
  while(s <= sEnd + 0.01){
    const p = interpolateAtS(geom, s);
    const { kx, ky } = meterScale(p.lat);
    const frame = frenetFrameAtS(geom, s);
    const { R, turnSign } = radiusAtS(geom, s);
    let leftW = halfW;
    let rightW = halfW;
    if(R < Infinity && R < halfW * 4){
      const maxOff = Math.max(0.4, R - 0.35);
      if(turnSign > 0) leftW = Math.min(leftW, maxOff);
      else if(turnSign < 0) rightW = Math.min(rightW, maxOff);
    }
    sections.push({
      s,
      lat: p.lat,
      lon: p.lon,
      leftLat: p.lat + (frame.nz * leftW) / ky,
      leftLon: p.lon + (frame.nx * leftW) / kx,
      rightLat: p.lat - (frame.nz * rightW) / ky,
      rightLon: p.lon - (frame.nx * rightW) / kx,
      elev: geom.elevReady ? interpolateElevAtS(geom, s) - elev0 : 0
    });
    if(s >= sEnd) break;
    s += ribbonStepAtS();
  }
  return sections;
}

/** lat/lon → камера (x вбок, z вперёд), м */
export function worldToCamXZ(lat, lon, snap, headingRad){
  const { kx, ky } = meterScale(snap.lat);
  const dx = (lon - snap.lon) * kx;
  const dy = (lat - snap.lat) * ky;
  const cosH = Math.cos(headingRad);
  const sinH = Math.sin(headingRad);
  return {
    x: dx * cosH - dy * sinH,
    z: dx * sinH + dy * cosH
  };
}

/** @deprecated — экранный offset; используйте computeRibbonSections */
export function ribbonOffsets(pts, i, halfW){
  const pr = pts[Math.max(0, i - 1)];
  const q = pts[Math.min(pts.length - 1, i + 1)];
  let tx = q.x - pr.x;
  let tz = q.z - pr.z;
  const tl = Math.hypot(tx, tz) || 1;
  tx /= tl;
  tz /= tl;
  const nx = tz;
  const nz = -tx;

  const R = estimateRadius(pts, i);
  let leftW = halfW;
  let rightW = halfW;
  if(R < Infinity && R < halfW * 4){
    const maxOff = Math.max(0.4, R - 0.35);
    const a = pts[Math.max(0, i - 1)];
    const b = pts[i];
    const c = pts[Math.min(pts.length - 1, i + 1)];
    const cross = (b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x);
    if(cross > 0) leftW = Math.min(leftW, maxOff);
    else rightW = Math.min(rightW, maxOff);
  }
  return { nx, nz, leftW, rightW };
}

/** Ближайшая проекция точки на dense polyline (s, lateral) */
export function projectPointToRoute(geom, point){
  if(!geom || geom.n < 2 || !point) return null;
  let best = null;
  for(let i = 0; i < geom.n - 1; i++){
    const proj = projectOnSegment(point,
      geom.lat[i], geom.lon[i], geom.lat[i + 1], geom.lon[i + 1]);
    const segLen = geom.s[i + 1] - geom.s[i];
    const s = geom.s[i] + proj.t * segLen;
    if(!best || proj.lateral < best.lateral){
      best = { s, segIdx: i, lateral: proj.lateral, lat: proj.lat, lon: proj.lon };
    }
  }
  return best;
}

/** Участок polyline [sFrom … sTo] для Leaflet */
export function latLngsSliceByS(geom, sFrom, sTo){
  if(!geom || geom.n < 2) return [];
  const total = geom.s[geom.n - 1];
  const a = Math.max(0, Math.min(sFrom, total));
  const b = Math.max(a, Math.min(sTo, total));
  if(b - a < 0.5) return [];

  const out = [];
  const p0 = interpolateAtS(geom, a);
  out.push([p0.lat, p0.lon]);

  const i0 = findSegAtS(geom, a);
  const i1 = findSegAtS(geom, b);
  for(let i = i0 + 1; i <= i1 && i < geom.n; i++){
    if(geom.s[i] > a + 0.01 && geom.s[i] < b - 0.01){
      out.push([geom.lat[i], geom.lon[i]]);
    }
  }

  const p1 = interpolateAtS(geom, b);
  const last = out[out.length - 1];
  if(!last || Math.abs(last[0] - p1.lat) > 1e-7 || Math.abs(last[1] - p1.lon) > 1e-7){
    out.push([p1.lat, p1.lon]);
  }
  return out;
}

/** Polyline lat/lon для Leaflet из geometry */
export function geometryToLatLngs(geom){
  if(!geom) return [];
  const out = [];
  for(let i = 0; i < geom.n; i++) out.push([geom.lat[i], geom.lon[i]]);
  return out;
}

/** Оставшееся расстояние по s */
export function remainingDistanceS(geom, snap){
  if(!geom || !snap) return 0;
  return Math.max(0, geom.s[geom.n - 1] - snap.s);
}
