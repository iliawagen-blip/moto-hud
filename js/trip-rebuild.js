/**
 * Полуавтоматическая пересборка оставшихся дней плана.
 * @module trip-rebuild
 */
import { getDayVariant, parseRtext, rtextFromPoints, calendarDateForDay, formatTripDayDate, touchTripRevision } from './trip-model.js';

/** Конечная точка дня (ночёвка = последняя точка последнего сегмента). */
export function getDayEndPoint(day, variantId = 'calm'){
  const v = getDayVariant(day, variantId);
  const segs = v?.segments || [];
  if(!segs.length) return null;
  const pts = parseRtext(segs[segs.length - 1].rtext);
  return pts.length ? pts[pts.length - 1] : null;
}

/**
 * Предпросмотр пересборки с `fromDayN` от `startPoint`.
 * @returns {{ kept: object[], newDays: object[], previewLines: string[] }}
 */
export function proposeRebuildRemaining(trip, fromDayN, startPoint, variantId = 'calm'){
  if(!trip?.days?.length || !startPoint || fromDayN < 1) throw new Error('Некорректные данные пересборки');
  const kept = trip.days.filter(d => d.n < fromDayN);
  const rest = trip.days.filter(d => d.n >= fromDayN);
  if(!rest.length) throw new Error('Нет дней для пересборки');

  const targets = [];
  for(const day of rest){
    const pt = getDayEndPoint(day, variantId);
    if(pt) targets.push({ ...pt, dayN: day.n, night: getDayVariant(day, variantId)?.night });
  }
  const lastTarget = targets[targets.length - 1];
  const fin = trip.finish;
  if(fin && (!lastTarget || haversineApprox(lastTarget, fin) > 2)){
    targets.push({ ...fin, dayN: rest[rest.length - 1].n, night: '🏁 Финиш' });
  }

  let cur = { lat: startPoint.lat, lon: startPoint.lon, label: startPoint.label || 'Сейчас' };
  const newDays = [];
  const previewLines = [`Старт пересборки: ${cur.label}`, `Дней затронуто: ${rest.length}`];

  for(let i = 0; i < targets.length; i++){
    const t = targets[i];
    const oldDay = rest[i] || rest[rest.length - 1];
    const dayN = fromDayN + i;
    const cal = calendarDateForDay(trip, dayN);
    const rtext = rtextFromPoints([cur, t]);
    previewLines.push(`День ${dayN}: ${cur.label} → ${t.label}`);
    const oldCalm = getDayVariant(oldDay, 'calm') || oldDay?.variants?.[0];
    const variants = [{
      id: 'calm',
      label: oldCalm?.label || 'Основной',
      schedule: oldCalm?.schedule,
      summary: `${cur.label} → ${t.label}`,
      night: t.night || oldCalm?.night || (t.label ? `🌙 ${t.label}` : ''),
      segments: [{ label: 'Перегон', rtext, type: 'transfer' }]
    }];
    newDays.push({
      n: dayN,
      date: oldDay?.date || (cal ? formatTripDayDate(cal) : ''),
      badge: oldDay?.badge || (i === targets.length - 1 ? 'финиш' : 'перегон'),
      variants
    });
    cur = t;
  }

  return { kept, newDays, previewLines };
}

function haversineApprox(a, b){
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)) / 1000;
}

export function applyRebuildRemaining(trip, fromDayN, startPoint, variantId = 'calm'){
  const { kept, newDays } = proposeRebuildRemaining(trip, fromDayN, startPoint, variantId);
  trip.days = [...kept, ...newDays];
  if(trip.startDate && trip.days.length){
    const last = trip.days[trip.days.length - 1];
    const end = calendarDateForDay(trip, last.n);
    if(end && !isNaN(end.getTime())) trip.endDate = end.toISOString().slice(0, 10);
  }
  touchTripRevision(trip);
  return trip;
}
