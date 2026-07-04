/**
 * Curve speed warning — безопасная скорость входа в поворот (этап 3 ROADPATH).
 * @module curve-speed
 */
import { S, CURVE_OPTS_KEY } from './state.js';
import { THEME } from './theme.js';
import { bearing } from './geo.js';
import { findSegAtS, interpolateAtS, radiusAtS } from './route-geometry.js';

export const CURVE_R_WARN = 100;
export const MIN_CURVE_LEN_M = 25;
const G = 9.81;
const RIBBON_HYST = 0.06;
const _ribbonState = new Map();

export function resetCurveRibbonState(){ _ribbonState.clear(); }

const PRESETS = {
  relaxed: { aLat: 0.28 * G, yellow: 1.0, red: 1.12 },
  normal:  { aLat: 0.32 * G, yellow: 0.88, red: 1.02 },
  strict:  { aLat: 0.35 * G, yellow: 0.82, red: 0.96 }
};

export function getCurveParams(){
  return PRESETS[S.curveStrict] || PRESETS.normal;
}

function turnAngleAtS(geom, s){
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

function vSafeFromR(R, params, gradeAt){
  if(!isFinite(R) || R >= CURVE_R_WARN * 2) return Infinity;
  let v = Math.sqrt(params.aLat * Math.max(8, R));
  const grade = gradeAt || 0;
  if(grade < -0.02) v *= Math.max(0.72, 1 + grade * 2.2);
  return v;
}

function applySafeSpeedAtS(geom, s, vSafe){
  if(!isFinite(vSafe) || vSafe >= 80) return;
  const i = findSegAtS(geom, s);
  if(!isFinite(geom.safeSpeed[i]) || geom.safeSpeed[i] > vSafe){
    geom.safeSpeed[i] = vSafe;
  }
}

/** Построение radius[], safeSpeed[] и списка шпилек для зон подхода */
export function computeCurveSpeed(geom, route){
  if(!geom || geom.n < 3) return;
  resetCurveRibbonState();
  const n = geom.n;
  const params = getCurveParams();
  geom.radius = new Float64Array(n);
  geom.safeSpeed = new Float64Array(n);

  for(let j = 0; j < n; j++){
    const { R } = radiusAtS(geom, geom.s[j]);
    geom.radius[j] = R;
    geom.safeSpeed[j] = vSafeFromR(R, params, geom.grade?.[j]);
  }

  let spans = buildCurveSpans(geom);
  spans = spans.concat(buildManeuverCurveSpans(geom, route));
  geom._curveSpans = mergeSpans(spans);

  for(const sp of geom._curveSpans){
    const v = vSafeFromR(sp.minR, params, geom.grade?.[findSegAtS(geom, sp.sApex)]);
    applySafeSpeedAtS(geom, sp.sApex, v);
  }

  geom.curveReady = true;
}

function buildCurveSpans(geom){
  const spans = [];
  let active = false;
  let sStart = 0;
  let sMinR = 0;
  let minR = Infinity;

  for(let j = 0; j < geom.n; j++){
    const R = geom.radius[j];
    const s = geom.s[j];
    const tight = R < CURVE_R_WARN;

    if(tight){
      if(!active){
        active = true;
        sStart = s;
        minR = R;
        sMinR = s;
      } else if(R < minR){
        minR = R;
        sMinR = s;
      }
    } else if(active){
      if(s - sStart >= MIN_CURVE_LEN_M){
        spans.push({ sEntry: sStart, sExit: s, sApex: sMinR, minR });
      }
      active = false;
      minR = Infinity;
    }
  }
  if(active){
    const s = geom.s[geom.n - 1];
    if(s - sStart >= MIN_CURVE_LEN_M){
      spans.push({ sEntry: sStart, sExit: s, sApex: sMinR, minR });
    }
  }
  return spans;
}

/** Шпильки по манёврам OSRM (на городских маршрутах радиус по polyline часто «прямой») */
function buildManeuverCurveSpans(geom, route){
  const out = [];
  const steps = route?.steps;
  if(steps?.length){
    for(const st of steps){
      if(st.type === 'depart' || st.type === 'arrive') continue;
      const m = geom.maneuvers?.find(mn => mn.step === st);
      if(!m) continue;
      let turn = Math.abs(turnAngleAtS(geom, m.s));
      if(turn < 12 && st.modifier){
        if(st.modifier === 'uturn') turn = 160;
        else if(st.modifier.includes('sharp')) turn = Math.max(turn, 55);
        else if(st.modifier.includes('left') || st.modifier.includes('right')) turn = Math.max(turn, 28);
      }
      if(turn < 18) continue;
      const estR = Math.max(10, 280 / (turn / 22));
      if(estR >= CURVE_R_WARN) continue;
      const arc = Math.max(MIN_CURVE_LEN_M, estR * 0.55);
      out.push({
        sEntry: Math.max(0, m.s - arc * 0.35),
        sExit: m.s + arc * 0.65,
        sApex: m.s,
        minR: estR
      });
    }
  }
  if(out.length) return out;

  for(const m of geom.maneuvers || []){
    const turn = Math.abs(turnAngleAtS(geom, m.s));
    if(turn < 22) continue;
    const estR = Math.max(10, 280 / (turn / 22));
    if(estR >= CURVE_R_WARN) continue;
    const arc = Math.max(MIN_CURVE_LEN_M, estR * 0.55);
    out.push({
      sEntry: Math.max(0, m.s - arc * 0.35),
      sExit: m.s + arc * 0.65,
      sApex: m.s,
      minR: estR
    });
  }
  return out;
}

function mergeSpans(spans){
  if(!spans.length) return [];
  const sorted = spans.slice().sort((a, b) => a.sEntry - b.sEntry);
  const out = [sorted[0]];
  for(let i = 1; i < sorted.length; i++){
    const prev = out[out.length - 1];
    const cur = sorted[i];
    if(cur.sEntry <= prev.sExit + 30){
      prev.sExit = Math.max(prev.sExit, cur.sExit);
      if(cur.minR < prev.minR){
        prev.minR = cur.minR;
        prev.sApex = cur.sApex;
      }
    } else {
      out.push(cur);
    }
  }
  return out;
}

/** Зона подхода: только ДО входа в поворот (s < sEntry) */
export function curveSpanForApproach(s, geom, leadM){
  if(!geom?._curveSpans?.length) return null;
  let best = null;
  let bestDist = Infinity;
  for(const sp of geom._curveSpans){
    const zoneStart = sp.sEntry - leadM;
    if(s >= zoneStart && s < sp.sEntry){
      const d = sp.sEntry - s;
      if(d < bestDist){
        bestDist = d;
        best = sp;
      }
    }
  }
  return best;
}

function vSafeForSpan(geom, span){
  if(!geom?.safeSpeed || !span) return Infinity;
  let vMin = Infinity;
  const i0 = findSegAtS(geom, span.sEntry);
  const i1 = findSegAtS(geom, Math.min(geom.s[geom.n - 1], span.sExit));
  for(let j = i0; j <= i1 && j < geom.n; j++){
    const v = geom.safeSpeed[j];
    if(isFinite(v) && v < vMin) vMin = v;
  }
  if(isFinite(vMin) && vMin < 80) return vMin;
  const params = getCurveParams();
  return vSafeFromR(span.minR, params, geom.grade?.[findSegAtS(geom, span.sApex)]);
}

/** Цвет ленты по v/v_safe; null = нейтральный */
export function ribbonCurveColor(sMid, geom, speedMps){
  if(!S.curveWarn || !geom?.curveReady || speedMps < 3.5) return null;
  const leadM = Math.max(60, Math.min(280, speedMps * 7));
  const span = curveSpanForApproach(sMid, geom, leadM);
  if(!span) return null;

  const vSafe = vSafeForSpan(geom, span);
  if(!isFinite(vSafe) || vSafe < 2) return null;

  const ratio = speedMps / vSafe;
  const { yellow, red } = getCurveParams();
  const spanKey = Math.round(span.sEntry);
  let state = _ribbonState.get(spanKey) || null;

  if(state === 'red'){
    if(ratio < red - RIBBON_HYST) state = ratio >= yellow ? 'yellow' : null;
  } else if(state === 'yellow'){
    if(ratio >= red) state = 'red';
    else if(ratio < yellow - RIBBON_HYST) state = null;
  } else {
    if(ratio >= red) state = 'red';
    else if(ratio >= yellow) state = 'yellow';
  }
  _ribbonState.set(spanKey, state);

  if(state === 'red') return THEME.curveRed;
  if(state === 'yellow') return THEME.curveYellow;
  return null;
}

/** Голосовое предупреждение за N секунд до входа в шпильку */
export function pickCurveVoiceWarn(geom, snapS, speedMps){
  if(!S.curveWarn || !geom?.curveReady || speedMps < 5 || !snapS) return null;
  const params = getCurveParams();

  for(const sp of geom._curveSpans || []){
    if(sp.sEntry <= snapS + 5) continue;
    const dist = sp.sEntry - snapS;
    if(dist > 320) break;

    const vSafe = vSafeForSpan(geom, sp);
    if(speedMps <= vSafe * params.yellow) continue;

    const sec = dist / speedMps;
    if(sec > 7 || sec < 2.5) continue;

    return {
      key: 'curve_' + Math.round(sp.sEntry),
      vSafeKmh: Math.round(vSafe * 3.6),
      sec: Math.round(sec)
    };
  }
  return null;
}

export function loadCurveOptsFromStorage(){
  try{
    const raw = localStorage.getItem(CURVE_OPTS_KEY);
    if(!raw) return;
    const o = JSON.parse(raw);
    if(typeof o.enabled === 'boolean'){
      const cb = document.getElementById('opt-curve-warn');
      if(cb) cb.checked = o.enabled;
    }
    if(typeof o.strict === 'string'){
      const sel = document.getElementById('opt-curve-strict');
      if(sel) sel.value = o.strict;
    }
  }catch(e){}
}

export function saveCurveOptsToStorage(){
  try{
    localStorage.setItem(CURVE_OPTS_KEY, JSON.stringify({
      enabled: !!S.curveWarn,
      strict: S.curveStrict || 'normal'
    }));
  }catch(e){}
}
