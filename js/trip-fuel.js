/**
 * Оценка топлива по сегменту плана (без жадных остановок — фаза A2).
 * @module trip-fuel
 */
import { auditSegment } from './trip-model.js';
import { rangeKm, fuelLitersForKm, getActiveBikeProfile } from './bike-profile.js';

/**
 * @param {{ rtext: string, plannedKm?: number, roadMix?: string }} segment
 * @param {object} [profile]
 * @param {string} [roadType]
 */
export function assessSegmentFuel(segment, profile, roadType){
  const p = profile || getActiveBikeProfile();
  if(!p || !segment?.rtext) return null;
  const road = roadType || segment.roadMix || 'default';
  const km = segment.plannedKm != null ? segment.plannedKm : auditSegment(segment.rtext).km;
  const range = rangeKm(p, road);
  const liters = fuelLitersForKm(km, p, road);
  const exceeds = km > range;
  const tight = !exceeds && km > range * 0.85;
  let level = 'ok';
  if(exceeds) level = 'danger';
  else if(tight) level = 'warn';
  let warning = null;
  if(exceeds) warning = `~${Math.round(km)} км > запас ~${Math.round(range)} км — нужна заправка`;
  else if(tight) warning = `Близко к пределу бака (~${Math.round(range)} км)`;
  return {
    km: Math.round(km * 10) / 10,
    liters: Math.round(liters * 10) / 10,
    rangeKm: Math.round(range),
    exceeds,
    tight,
    level,
    warning,
    fuelType: p.fuelType
  };
}

export function formatFuelHint(assessment){
  if(!assessment) return '';
  let s = `⛽ ~${assessment.liters} л · запас ${assessment.rangeKm} км`;
  if(assessment.warning) s += ' · ⚠ ' + assessment.warning;
  return s;
}

/**
 * Суммарная оценка по дню (все сегменты варианта).
 */
export function assessDayFuel(day, variantId, profile){
  const v = day?.variants?.find(x => x.id === variantId) || day?.variants?.[0];
  if(!v?.segments?.length) return null;
  let totalKm = 0;
  let totalLiters = 0;
  let worst = 'ok';
  const warnings = [];
  for(const seg of v.segments){
    const a = assessSegmentFuel(seg, profile);
    if(!a) continue;
    totalKm += a.km;
    totalLiters += a.liters;
    if(a.level === 'danger') worst = 'danger';
    else if(a.level === 'warn' && worst !== 'danger') worst = 'warn';
    if(a.warning) warnings.push(a.warning);
  }
  const p = profile || getActiveBikeProfile();
  const range = p ? rangeKm(p) : 0;
  return {
    totalKm: Math.round(totalKm),
    totalLiters: Math.round(totalLiters * 10) / 10,
    rangeKm: range,
    level: totalKm > range ? 'danger' : (totalKm > range * 0.85 ? 'warn' : worst),
    warnings: [...new Set(warnings)]
  };
}
