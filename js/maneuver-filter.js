/**
 * Фильтрация OSRM-манёвров: убрать информационный шум и микро-изломы way.
 * @module maneuver-filter
 */

import {
  MANEUVER_BEND_DEFAULT_DEG, MANEUVER_MIN_ANGLE_DEG as MANEUVER_MIN_ANGLE,
  MANEUVER_COLLAPSE_SEG_M, MANEUVER_COLLAPSE_GAP_M
} from './nav-constants.js';

export const MANEUVER_BEND_ANGLE = MANEUVER_BEND_DEFAULT_DEG;
export { MANEUVER_MIN_ANGLE, MANEUVER_COLLAPSE_SEG_M, MANEUVER_COLLAPSE_GAP_M };

const HIGHWAY_BEND = {
  motorway: 25, trunk: 25, primary: 18, secondary: 16,
  tertiary: 14, residential: 12, living_street: 12, unclassified: 18
};

function bendThresholdForStep(step){
  const hw = step?.highway || step?.roadClass || '';
  return HIGHWAY_BEND[hw] ?? MANEUVER_BEND_DEFAULT_DEG;
}

const INFO_TYPES = new Set(['new name', 'continue', 'notification']);
const NAV_TYPES = new Set([
  'turn', 'fork', 'on ramp', 'off ramp', 'roundabout', 'rotary',
  'exit roundabout', 'end of road'
]);

function hasTurnModifier(step){
  const m = step.modifier || '';
  if(!m || m === 'straight') return false;
  return m === 'uturn' || m.includes('left') || m.includes('right');
}

/** Тип step OSRM — требует действия водителя (не информационный) */
export function isNavManeuverType(step){
  if(!step || step.type === 'depart' || step.type === 'arrive') return false;
  if(INFO_TYPES.has(step.type) || step.type === 'merge') return false;
  if(step.type === 'roundabout' || step.type === 'rotary' || step.type === 'exit roundabout') return true;
  if(step.type === 'on ramp' || step.type === 'off ramp') return hasTurnModifier(step) || !!step.exit;
  if(!NAV_TYPES.has(step.type)) return false;
  if(step.type === 'fork' || step.type === 'end of road') return hasTurnModifier(step);
  return step.type === 'turn' && hasTurnModifier(step);
}

/** Угол поворота: OSRM bearings → поле angle на манёвре → неизвестно */
export function stepTurnAngleDeg(step, maneuver){
  if(step?.bearing_before != null && step?.bearing_after != null){
    let d = step.bearing_after - step.bearing_before;
    while(d > 180) d -= 360;
    while(d < -180) d += 360;
    return Math.abs(d);
  }
  if(maneuver?.angle != null && Number.isFinite(maneuver.angle)) return Math.abs(maneuver.angle);
  return null;
}

/** Значимый манёвр для HUD / голоса / шевронов */
export function isSignificantManeuver(m, _geom){
  if(!m?.step || !isNavManeuverType(m.step)) return false;

  const mod = m.step.modifier || '';
  const ang = stepTurnAngleDeg(m.step, m);

  if(mod === 'straight') return false;
  if(ang == null){
    return mod === 'uturn' || m.step.type === 'roundabout' || m.step.type === 'rotary';
  }

  const bend = bendThresholdForStep(m.step);

  if(mod.includes('slight') && ang < bend) return false;
  if((mod === 'straight' || !mod) && ang < bend) return false;

  if(mod === 'uturn' || mod.includes('sharp')) return ang >= 8;
  if(ang < MANEUVER_MIN_ANGLE) return false;
  if(ang < bend && (mod.includes('slight') || mod === 'straight')) return false;

  return true;
}

function pickStrongerManeuver(a, b){
  const aa = stepTurnAngleDeg(a.step, a) || 0;
  const ab = stepTurnAngleDeg(b.step, b) || 0;
  if(ab > aa + 4) return b;
  if(aa > ab + 4) return a;
  const pri = s => {
    if(s.type === 'roundabout' || s.type === 'rotary') return 3;
    if(s.modifier === 'uturn' || (s.modifier || '').includes('sharp')) return 2;
    return 1;
  };
  return pri(b.step) > pri(a.step) ? b : a;
}

/**
 * Схлопывание микро-манёвров OSM/OSRM: короткий сегмент + слабый угол + второй манёвр рядом.
 */
export function refineManeuvers(maneuvers){
  if(!maneuvers?.length) return [];
  const sorted = [...maneuvers].sort((a, b) => a.s - b.s);
  const kept = [];

  for(let i = 0; i < sorted.length; i++){
    const m = sorted[i];
    if(!isNavManeuverType(m.step)) continue;

    const segM = m.step.distance || 0;
    const ang = stepTurnAngleDeg(m.step, m) || 0;
    const bend = bendThresholdForStep(m.step);
    const next = sorted[i + 1];

    if(segM < MANEUVER_COLLAPSE_SEG_M && ang < bend){
      if(next && isNavManeuverType(next.step) && (next.s - m.s) < MANEUVER_COLLAPSE_GAP_M){
        continue;
      }
    }

    if(kept.length){
      const prev = kept[kept.length - 1];
      const gap = m.s - prev.s;
      const prevAng = stepTurnAngleDeg(prev.step, prev) || 0;
      if(gap < MANEUVER_COLLAPSE_GAP_M && prevAng < bend && ang < bend){
        kept[kept.length - 1] = pickStrongerManeuver(prev, m);
        continue;
      }
    }

    kept.push(m);
  }

  return kept.filter(m => isSignificantManeuver(m));
}
