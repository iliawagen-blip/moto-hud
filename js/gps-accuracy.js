/**
 * Эффективная точность GPS: отчёт ОС + измеренный разброс фиксов.
 * Android часто отдаёт accuracy 80–150 м при уже стабильной позиции.
 */
import { haversine } from './geo.js';

/**
 * Радиус разброса последних фиксов относительно их центра, м.
 * @param {Array<{lat:number,lon:number}>} fixes
 */
export function measuredSpreadM(fixes){
  if(!fixes?.length || fixes.length < 3) return null;
  const n = fixes.length;
  let lat = 0;
  let lon = 0;
  for(const f of fixes){
    lat += f.lat;
    lon += f.lon;
  }
  const center = { lat: lat / n, lon: lon / n };
  let maxD = 0;
  for(const f of fixes){
    const d = haversine(f, center);
    if(d > maxD) maxD = d;
  }
  return maxD;
}

/**
 * Эффективная точность для converge и UI.
 * @param {number|null} reportedAcc
 * @param {Array<{lat:number,lon:number,acc?:number|null,speed?:number|null}>} recentFixes
 */
export function effectiveAccM(reportedAcc, recentFixes){
  const spread = measuredSpreadM(recentFixes);
  if(spread == null){
    return reportedAcc != null && Number.isFinite(reportedAcc) ? reportedAcc : null;
  }
  const measured = spread + 8;
  if(reportedAcc == null || !Number.isFinite(reportedAcc)) return measured;
  if(spread <= 55 && reportedAcc > measured) return measured;
  return reportedAcc;
}

/**
 * Точность для отображения в чипе/HUD (не сырой отчёт ОС, если он завышен).
 */
export function displayAccM(reportedAcc, recentFixes){
  const eff = effectiveAccM(reportedAcc, recentFixes);
  if(eff == null) return null;
  return Math.max(3, Math.round(eff));
}

/** Человекочитаемая причина блокировки converge. */
export const CONVERGE_FAIL_LABELS = {
  buffer_short: 'мало фиксов',
  network_fix: 'сетевой fix (не GPS)',
  acc_over_limit: 'accuracy выше порога',
  gps_streak_low: 'мало подряд GPS-фиксов',
  jump_reject: 'скачок координат',
  last3_acc: 'последние 3 fix неточные'
};
