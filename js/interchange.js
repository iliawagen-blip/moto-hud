/**
 * Развязки / съезды: семантика OSRM ramp|fork + подсказка от геометрии дорожки.
 * Без импорта route-geometry (цикл: filter ↔ geometry).
 * @module interchange
 */
import { angleDiff, bearing } from './geo.js';
import {
  INTERCHANGE_DIVERGE_MIN_M,
  INTERCHANGE_DIVERGE_MAX_M,
  INTERCHANGE_DIVERGE_LATERAL_M,
  INTERCHANGE_DIVERGE_STEP_M,
  INTERCHANGE_DIVERGE_MIN_TURN_DEG,
  INTERCHANGE_DIVERGE_HINT_AHEAD_M,
  INTERCHANGE_DIVERGE_HINT_BAND_M,
  MANEUVER_PASSED_M
} from './nav-constants.js';

/** OSRM-типы, которые на развязке важнее угла поворота */
export function isInterchangeStep(step){
  const t = step?.type;
  return t === 'off ramp' || t === 'on ramp' || t === 'fork';
}

export function isRampStep(step){
  const t = step?.type;
  return t === 'off ramp' || t === 'on ramp';
}

/**
 * Сторона съезда: left | right | null
 * @param {object} step
 * @param {object} [maneuver]
 */
export function interchangeSide(step, maneuver){
  if(step?._divergeSide === 'left' || step?._divergeSide === 'right'){
    return step._divergeSide;
  }
  const mod = (step?.modifier || '').toLowerCase();
  if(mod.includes('left')) return 'left';
  if(mod.includes('right')) return 'right';
  if(step?.bearing_before != null && step?.bearing_after != null){
    let d = step.bearing_after - step.bearing_before;
    while(d > 180) d -= 360;
    while(d < -180) d += 360;
    if(Math.abs(d) >= 6) return d < 0 ? 'left' : 'right';
  }
  if(maneuver?.angle != null && Number.isFinite(maneuver.angle)){
    if(Math.abs(maneuver.angle) >= 6) return maneuver.angle < 0 ? 'left' : 'right';
  }
  return null;
}

/** Короткая подпись HUD: СЪЕЗД → */
export function interchangeHudLabel(step, maneuver){
  const side = interchangeSide(step, maneuver);
  if(step?.type === 'on ramp'){
    if(side === 'left') return 'ВЪЕЗД ←';
    if(side === 'right') return 'ВЪЕЗД →';
    return 'ВЪЕЗД';
  }
  if(side === 'left') return 'СЪЕЗД ←';
  if(side === 'right') return 'СЪЕЗД →';
  if(step?.type === 'fork') return 'РАЗВИЛКА';
  return 'СЪЕЗД';
}

/** Голос / текст манёвра */
export function interchangeVoiceText(step, maneuver){
  const side = interchangeSide(step, maneuver);
  if(step?.type === 'on ramp'){
    if(side === 'left') return 'Въезд налево';
    if(side === 'right') return 'Въезд направо';
    return 'Въезд на трассу';
  }
  if(step?.type === 'fork'){
    if(side === 'left') return 'Держитесь левее';
    if(side === 'right') return 'Держитесь правее';
    return 'Развилка';
  }
  if(side === 'left') return 'Съезд налево';
  if(side === 'right') return 'Съезд направо';
  return 'Съезд';
}

/**
 * Подсказка полосы на съезде (OSRM lanes).
 * @returns {{ side: 'left'|'right'|null, text: string }|null}
 */
export function extractExitLaneHint(step){
  if(!step?.intersections?.length) return null;
  for(const ix of step.intersections){
    const lanes = ix.lanes;
    if(!lanes?.length) continue;
    const valid = lanes.filter(l => l.valid);
    if(!valid.length) continue;
    const inds = valid.flatMap(l => l.indications || []).map(String);
    const left = inds.some(i => i.includes('left') || i === 'slight left');
    const right = inds.some(i => i.includes('right') || i === 'slight right');
    if(left && !right) return { side: 'left', text: 'Левые полосы' };
    if(right && !left) return { side: 'right', text: 'Правые полосы' };
    if(left && right) return { side: null, text: 'Полоса по стрелке' };
  }
  return null;
}

/**
 * Слабый сигнал OSRM для гибрида path_diverge (не invent из геометрии).
 * @param {Array<{ step: object, s: number }>} maneuvers
 * @param {number} curS
 * @param {{ nearS?: number, maxAheadM?: number }} [opts]
 * @returns {{ step: object, along: number, side: 'left'|'right'|null, kind: string }|null}
 */
export function findOsrmExitHint(maneuvers, curS, opts = {}){
  if(!maneuvers?.length || curS == null || !Number.isFinite(curS)) return null;
  const maxAhead = opts.maxAheadM ?? INTERCHANGE_DIVERGE_HINT_AHEAD_M;
  const nearS = opts.nearS;
  const band = opts.nearBandM ?? INTERCHANGE_DIVERGE_HINT_BAND_M;
  let best = null;

  for(const m of maneuvers){
    const st = m?.step;
    if(!st || st.type === 'depart' || st.type === 'arrive') continue;
    if(curS > m.s + MANEUVER_PASSED_M) continue;
    const along = m.s - curS;
    if(!(along >= 0) || along > maxAhead) continue;
    if(nearS != null && Math.abs(m.s - nearS) > band) continue;

    const mod = (st.modifier || '').toLowerCase();
    let kind = null;
    let side = interchangeSide(st, m);

    if(st.type === 'off ramp' || st.type === 'on ramp' || st.type === 'fork'){
      kind = 'ramp_fork';
    } else if(
      (st.type === 'continue' || st.type === 'notification') &&
      mod.includes('slight') && (mod.includes('left') || mod.includes('right'))
    ){
      kind = 'continue_slight';
    } else {
      const lane = extractExitLaneHint(st);
      if(lane?.side){
        kind = 'lanes';
        if(!side) side = lane.side;
      }
    }
    if(!kind) continue;
    if(!best || along < best.along){
      best = { step: st, along, side, kind };
    }
  }
  return best;
}

/** Геометрия и OSRM не спорят о стороне */
export function divergeSidesCompatible(geoSide, osrmSide){
  if(!geoSide || !osrmSide) return true;
  return geoSide === osrmSide;
}

function findSegAtS(geom, s){
  let lo = 0, hi = geom.n - 2;
  while(lo < hi){
    const mid = (lo + hi + 1) >> 1;
    if(geom.s[mid] <= s) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function interpolateGeomAtS(geom, s){
  const total = geom.s[geom.n - 1];
  if(s <= 0) return { lat: geom.lat[0], lon: geom.lon[0] };
  if(s >= total) return { lat: geom.lat[geom.n - 1], lon: geom.lon[geom.n - 1] };
  const i = findSegAtS(geom, s);
  const s0 = geom.s[i];
  const s1 = geom.s[i + 1];
  const t = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
  return {
    lat: geom.lat[i] + (geom.lat[i + 1] - geom.lat[i]) * t,
    lon: geom.lon[i] + (geom.lon[i + 1] - geom.lon[i]) * t
  };
}

function avgTangentDegLocal(geom, s, windowM){
  const total = geom.s[geom.n - 1];
  const a = interpolateGeomAtS(geom, Math.max(0, s));
  const b = interpolateGeomAtS(geom, Math.min(total, s + windowM));
  return bearing(a, b);
}

/**
 * Уход polyline от текущего касательного (дорожка «права», OSRM сказал прямо).
 * @param {object} geom RouteGeometry { n, lat, lon, s }
 * @param {number} curS
 * @returns {{ side: 'left'|'right', distM: number, atS: number, lateralM: number }|null}
 */
export function detectPathDiverge(geom, curS){
  if(!geom?.n || !geom.s || curS == null || !Number.isFinite(curS)) return null;
  const total = geom.s[geom.n - 1];
  if(!(total > curS + INTERCHANGE_DIVERGE_MIN_M)) return null;

  const origin = interpolateGeomAtS(geom, curS);
  const tanDeg = avgTangentDegLocal(geom, curS, 40);
  if(tanDeg == null || isNaN(tanDeg)) return null;

  const tanRad = tanDeg * Math.PI / 180;
  // bearing 0=N: forward (E,N); left = rotate 90° CCW → (-fy, fx)
  const fx = Math.sin(tanRad);
  const fy = Math.cos(tanRad);
  const nx = -fy;
  const ny = fx;
  const cosLat = Math.cos(origin.lat * Math.PI / 180);

  let first = null;
  let endLat = 0;
  const maxS = Math.min(total, curS + INTERCHANGE_DIVERGE_MAX_M);

  for(let s = curS + INTERCHANGE_DIVERGE_MIN_M; s <= maxS; s += INTERCHANGE_DIVERGE_STEP_M){
    const p = interpolateGeomAtS(geom, s);
    const dN = (p.lat - origin.lat) * 111320;
    const dE = (p.lon - origin.lon) * 111320 * cosLat;
    const along = dE * fx + dN * fy;
    const lat = dE * nx + dN * ny;
    endLat = lat;
    if(!first && Math.abs(lat) >= INTERCHANGE_DIVERGE_LATERAL_M && along > INTERCHANGE_DIVERGE_MIN_M * 0.4){
      first = {
        side: lat > 0 ? 'left' : 'right',
        distM: Math.round(s - curS),
        atS: s,
        lateralM: lat
      };
    }
  }

  if(!first) return null;
  if(Math.abs(endLat) < INTERCHANGE_DIVERGE_LATERAL_M * 0.55) return null;
  if((endLat > 0) !== (first.side === 'left')) return null;
  // Пологая дуга магистрали (Варшавка): боковой уход есть, азимут почти не меняется
  const exitTan = avgTangentDegLocal(geom, first.atS, 50);
  if(exitTan == null || isNaN(exitTan)) return null;
  if(angleDiff(tanDeg, exitTan) < INTERCHANGE_DIVERGE_MIN_TURN_DEG) return null;
  return first;
}

/**
 * Синтетический step для HUD/голоса из path-diverge.
 * @param {{ side: 'left'|'right', distM: number, atS: number }} div
 */
export function syntheticDivergeStep(div){
  const mod = div.side === 'left' ? 'slight left' : 'slight right';
  return {
    type: 'off ramp',
    modifier: mod,
    name: '',
    distance: div.distM,
    _synthetic: 'path_diverge',
    bearing_before: 0,
    bearing_after: div.side === 'left' ? -25 : 25
  };
}
