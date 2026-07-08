/**
 * Модель поездки Trip → Day → Variant → Segment.
 * @module trip-model
 */
import { haversine, parseTripPoint } from './geo.js';
import { newId } from './util.js';

export const TRIP_MODEL_REV = 2;

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
  const baseDate = startDate ? new Date(startDate + 'T12:00:00') : null;
  for(let i = 0; i < chain.length - 1; i++){
    const a = chain[i];
    const b = chain[i + 1];
    const rtext = rtextFromPoints([a, b]);
    let dateLabel = '';
    if(baseDate && !isNaN(baseDate.getTime())){
      const d = new Date(baseDate.getTime());
      d.setDate(d.getDate() + i);
      dateLabel = formatTripDayDate(d);
    }
    trip.days.push({
      n: i + 1,
      date: dateLabel,
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
  if(baseDate && !isNaN(baseDate.getTime()) && trip.days.length){
    const end = new Date(baseDate.getTime());
    end.setDate(end.getDate() + trip.days.length - 1);
    trip.endDate = end.toISOString().slice(0, 10);
  }
  return trip;
}

export function tripSummaryText(trip, variantId = 'calm'){
  const lines = [trip.title, ''];
  if(trip.startDate) lines.push('Старт: ' + trip.startDate + (trip.endDate ? ' → ' + trip.endDate : ''));
  lines.push('');
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

const WD_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MO_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/** @param {Date} d */
export function formatTripDayDate(d){
  if(!d || isNaN(d.getTime())) return '';
  return '· ' + d.getDate() + ' ' + MO_SHORT[d.getMonth()] + ', ' + WD_SHORT[d.getDay()];
}

/** Календарная дата дня плана (полдень локально, без TZ-сдвигов). */
export function calendarDateForDay(trip, dayN){
  if(!trip?.startDate || !dayN) return null;
  const d = new Date(trip.startDate + 'T12:00:00');
  if(isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + (dayN - 1));
  return d;
}

/** Номер дня по календарю (1-based) или null, если вне диапазона поездки. */
export function getTodayDayNumber(trip){
  if(!trip?.startDate || !trip.days?.length) return null;
  const start = new Date(trip.startDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if(isNaN(start.getTime())) return null;
  const diff = Math.floor((today - start) / 86400000) + 1;
  if(diff < 1 || diff > trip.days.length) return null;
  return diff;
}

/**
 * Цель для «▶ Сегодня»: сегмент дня по календарю или разумный fallback.
 * @returns {{ dayN: number, segIdx: number, day: TripDay, seg: TripSegment, hint: string }|null}
 */
export function resolveTodayTarget(trip, variantId, lastApplied){
  if(!trip?.days?.length) return null;
  const vid = variantId || 'calm';
  const todayN = getTodayDayNumber(trip);

  function pack(dayN, segIdx, hint){
    const day = trip.days.find(d => d.n === dayN);
    if(!day) return null;
    const v = getDayVariant(day, vid);
    const seg = v?.segments?.[segIdx];
    if(!seg) return null;
    return { dayN, segIdx, day, seg, hint };
  }

  if(todayN != null) return pack(todayN, 0, 'сегодня по календарю');

  if(trip.startDate){
    const start = new Date(trip.startDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if(!isNaN(start.getTime())){
      const diff = Math.floor((today - start) / 86400000) + 1;
      if(diff < 1) return pack(1, 0, 'поездка ещё не началась — день 1');
      if(diff > trip.days.length){
        const lastDay = trip.days[trip.days.length - 1];
        return pack(lastDay.n, 0, 'даты поездки прошли — последний день');
      }
    }
  }

  if(lastApplied){
    const t = pack(lastApplied.dayN, lastApplied.segIdx, 'продолжить с последнего сегмента');
    if(t) return t;
  }

  return pack(trip.days[0].n, 0, 'день 1 (даты не заданы)');
}

/** Текст для редактора сегмента (строка = точка). */
export function formatSegmentEditorText(seg){
  const pts = parseRtext(seg?.rtext);
  return pts.map(p => {
    const base = `${p.lat}, ${p.lon}`;
    if(p.label && !/^Точка \d+$/.test(p.label) && p.label !== 'Старт' && p.label !== 'Финиш'){
      return `${base} ${p.label}`;
    }
    return base;
  }).join('\n');
}

/** Разбор textarea редактора → rtext. */
export function parseSegmentEditorText(text){
  const lines = String(text || '').split(/\n/).map(l => l.trim()).filter(Boolean);
  if(lines.length < 2) throw new Error('Нужно минимум 2 точки (по одной на строку)');
  const pts = [];
  for(let i = 0; i < lines.length; i++){
    const fb = i === 0 ? 'Старт' : (i === lines.length - 1 ? 'Финиш' : `Точка ${i + 1}`);
    const p = parseTripPoint(lines[i], fb);
    if(!p) throw new Error(`Строка ${i + 1}: не разобраны координаты`);
    pts.push(p);
  }
  return { rtext: rtextFromPoints(pts), points: pts };
}

/** Увеличение revision при правке плана. */
export function touchTripRevision(trip){
  trip.meta = trip.meta || {};
  trip.meta.revision = (trip.meta.revision || 0) + 1;
  trip.meta.updatedAt = new Date().toISOString();
  trip.updatedAt = Date.now();
}
