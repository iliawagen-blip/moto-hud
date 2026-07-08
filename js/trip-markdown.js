/**
 * Экспорт плана поездки в Markdown.
 * @module trip-markdown
 */
import { getDayVariant, auditSegment, calendarDateForDay, formatTripDayDate } from './trip-model.js';

export function tripMarkdownText(trip, variantId = 'calm', profile){
  const lines = [];
  lines.push('# ' + (trip.title || 'План поездки'));
  lines.push('');
  if(trip.startDate){
    lines.push('**Старт:** ' + trip.startDate + (trip.endDate ? ' → **Финиш:** ' + trip.endDate : ''));
  }
  if(trip.start?.label){
    lines.push('**Откуда:** ' + trip.start.label + ' (`' + trip.start.lat + ', ' + trip.start.lon + '`)');
  }
  if(trip.finish?.label){
    lines.push('**Куда:** ' + trip.finish.label + ' (`' + trip.finish.lat + ', ' + trip.finish.lon + '`)');
  }
  const snap = profile || trip.meta?.bikeProfileSnapshot;
  if(snap?.name){
    lines.push('**Мото:** ' + snap.name + ' · ' + snap.tankLiters + ' л · АИ-' + (snap.fuelType || '95'));
  }
  if(trip.meta?.revision) lines.push('**Revision:** ' + trip.meta.revision);
  lines.push('');
  lines.push('---');
  lines.push('');

  for(const day of trip.days || []){
    const v = getDayVariant(day, variantId);
    const cal = calendarDateForDay(trip, day.n);
    const dateLbl = day.date || (cal ? formatTripDayDate(cal) : '');
    lines.push('## День ' + day.n + (dateLbl ? ' ' + dateLbl : '') + (day.badge ? ' · *' + day.badge + '*' : ''));
    lines.push('');
    if(v?.schedule) lines.push('> ' + v.schedule);
    if(v?.summary) lines.push('**Маршрут:** ' + v.summary);
    if(v?.stats) lines.push('**Км:** ' + v.stats);
    if(v?.lunch) lines.push(v.lunch);
    if(v?.night) lines.push('**' + v.night + '**');
    lines.push('');
    for(const seg of v?.segments || []){
      const a = auditSegment(seg.rtext);
      lines.push('- **' + seg.label + '** — ~' + a.km + ' км');
      if(seg.fuelPlan?.stops?.length){
        lines.push('  - Заправки (оценка):');
        for(const st of seg.fuelPlan.stops){
          lines.push('    - ' + (st.brand || st.name) + ' · ~' + st.routeKm + ' км');
        }
      }
      if(seg.fuelPlan?.warnings?.length){
        lines.push('  - ⚠ ' + seg.fuelPlan.warnings.join('; '));
      }
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('*Экспорт Moto ИЛС · оценка топлива ±20–30%*');
  return lines.join('\n').trim();
}

export function tripMarkdownFilename(trip){
  const slug = String(trip.title || 'plan')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'plan';
  return `moto-hud-${slug}.md`;
}

export function downloadTripMarkdown(trip, variantId, profile){
  const blob = new Blob([tripMarkdownText(trip, variantId, profile)], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = tripMarkdownFilename(trip);
  a.click();
  URL.revokeObjectURL(a.href);
}
