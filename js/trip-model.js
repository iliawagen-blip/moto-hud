/**
 * Модель поездки Trip → Day → Variant → Segment.
 * @module trip-model
 */
import { haversine } from './geo.js';
import { newId } from './util.js';

export const TRIP_MODEL_REV = 1;

/** @typedef {{ lat: number, lon: number, label?: string }} TripPoint */
/** @typedef {{ label: string, rtext: string, type?: string }} TripSegment */
/** @typedef {{ id: string, label: string, schedule?: string, summary?: string, stats?: string, lunch?: string, night?: string, segments: TripSegment[] }} TripVariant */
/** @typedef {{ n: number, date?: string, badge?: string, variants: TripVariant[] }} TripDay */
/** @typedef {{ id: string, title: string, startDate?: string, endDate?: string, start: TripPoint, finish: TripPoint, days: TripDay[], meta?: object }} TripPlan */

/** Разбор rtext в waypoints */
export function parseRtext(rtext){
  if(!rtext?.trim()) return [];
  return rtext.split('~').map((part, i) => {
    const c = part.trim().match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
    if(!c) return null;
    return { lat: +c[1], lon: +c[2], label: i === 0 ? 'Старт' : (i === rtext.split('~').length - 1 ? 'Финиш' : `Точка ${i + 1}`) };
  }).filter(Boolean);
}

export function rtextFromPoints(points){
  return points.map(p => `${p.lat},${p.lon}`).join('~');
}

/** Прямая сумма сегментов, км (аудит как в jul26/audit-routes.py) */
export function straightKm(rtext){
  const pts = parseRtext(rtext);
  if(pts.length < 2) return 0;
  let d = 0;
  for(let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i]);
  return d / 1000;
}

/**
 * Аудит сегмента: подозрительно если >550 км суммарно, сегмент >250 км, точка вне РФ-бокса.
 * @returns {{ ok: boolean, km: number, warnings: string[] }}
 */
export function auditSegment(rtext){
  const pts = parseRtext(rtext);
  const warnings = [];
  if(pts.length < 2){
    return { ok: false, km: 0, warnings: ['Мало точек'] };
  }
  let km = 0;
  for(let i = 1; i < pts.length; i++){
    const seg = haversine(pts[i - 1], pts[i]) / 1000;
    km += seg;
    if(seg > 250) warnings.push(`Длинный сегмент ${Math.round(seg)} км`);
  }
  for(const p of pts){
    if(p.lat < 40 || p.lat > 57 || p.lon < 30 || p.lon > 52){
      warnings.push(`Точка вне бокса: ${p.lat}, ${p.lon}`);
    }
  }
  if(km > 550) warnings.push(`Суммарно ~${Math.round(km)} км (проверьте)`);
  const isLoop = pts.length >= 3 &&
    haversine(pts[0], pts[pts.length - 1]) < 2;
  return { ok: warnings.length === 0, km: Math.round(km * 10) / 10, warnings, isLoop };
}

export function segmentType(rtext){
  const a = auditSegment(rtext);
  if(a.isLoop) return 'radial';
  const pts = parseRtext(rtext);
  if(pts.length === 2) return 'transfer';
  return 'route';
}

/** Активный вариант дня (calm по умолчанию) */
export function getDayVariant(day, variantId){
  if(!day?.variants?.length) return null;
  return day.variants.find(v => v.id === variantId) || day.variants[0];
}

export function validateTrip(trip){
  if(!trip?.id || !trip.title || !trip.days?.length) throw new Error('Некорректный план');
  return trip;
}

/** Создать пустой план из ночёвок (MVP wizard) */
export function buildTripFromNights({ id, title, start, finish, nights, startDate }){
  /** @type {TripPlan} */
  const trip = {
    id: id || newId(),
    version: TRIP_MODEL_REV,
    title,
    startDate: startDate || new Date().toISOString().slice(0, 10),
    start,
    finish,
    days: [],
    meta: {}
  };
  const chain = [start, ...(nights || []), finish];
  for(let i = 0; i < chain.length - 1; i++){
    const a = chain[i];
    const b = chain[i + 1];
    const rtext = rtextFromPoints([a, b]);
    trip.days.push({
      n: i + 1,
      date: '',
      badge: i === chain.length - 2 ? 'финиш' : 'перегон',
      variants: [{
        id: 'calm',
        label: 'Основной',
        summary: `${a.label || 'Старт'} → ${b.label || 'Финиш'}`,
        night: b.label ? `🌙 ${b.label}` : '',
        segments: [{ label: 'Перегон', rtext, type: 'transfer' }]
      }]
    });
  }
  return trip;
}

export function tripSummaryText(trip, variantId = 'calm'){
  const lines = [trip.title, ''];
  for(const day of trip.days){
    const v = getDayVariant(day, variantId);
    lines.push(`День ${day.n}${day.date ? ' ' + day.date : ''}${day.badge ? ' · ' + day.badge : ''}`);
    if(v?.summary) lines.push('  ' + v.summary);
    if(v?.night) lines.push('  ' + v.night);
    for(const seg of v?.segments || []){
      const a = auditSegment(seg.rtext);
      lines.push(`  → ${seg.label} (~${a.km} км${a.warnings.length ? ' ⚠' : ''})`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}
