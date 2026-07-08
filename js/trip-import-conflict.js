/**
 * Разрешение конфликтов при импорте плана (один id, разные revision).
 * @module trip-import-conflict
 */
import { newId } from './util.js';
import { getDayVariant } from './trip-model.js';

/**
 * @returns {{ existing: object, incoming: object, localNewer: boolean }|null}
 */
export function findTripConflict(existing, incoming){
  if(!existing?.id || !incoming?.id) return null;
  if(existing.id !== incoming.id) return null;
  const er = existing.meta?.revision ?? 0;
  const ir = incoming.meta?.revision ?? 0;
  const et = existing.updatedAt || 0;
  const it = incoming.updatedAt || 0;
  if(er === ir && Math.abs(et - it) < 1500) return null;
  return { existing, incoming, localNewer: et >= it };
}

function segmentSignature(day, variantId){
  const v = getDayVariant(day, variantId);
  return (v?.segments || []).map(s => s.rtext).join('|');
}

/** Список отличий для UI. */
export function tripDiffLines(local, remote, variantId = 'calm'){
  const lines = [];
  if(!local || !remote) return lines;
  if(local.title !== remote.title){
    lines.push(`Название: «${local.title}» → «${remote.title}»`);
  }
  if(local.startDate !== remote.startDate){
    lines.push(`Дата старта: ${local.startDate || '—'} → ${remote.startDate || '—'}`);
  }
  const ld = local.days?.length || 0;
  const rd = remote.days?.length || 0;
  if(ld !== rd) lines.push(`Число дней: ${ld} → ${rd}`);
  lines.push(`Revision: ${local.meta?.revision ?? 0} → ${remote.meta?.revision ?? 0}`);
  const max = Math.max(ld, rd);
  for(let i = 0; i < max; i++){
    const a = local.days?.[i];
    const b = remote.days?.[i];
    if(!a && b) lines.push(`День ${b.n}: только в импорте`);
    else if(a && !b) lines.push(`День ${a.n}: только локально`);
    else if(a && b){
      const va = getDayVariant(a, variantId);
      const vb = getDayVariant(b, variantId);
      if(va?.night !== vb?.night && (va?.night || vb?.night)){
        lines.push(`День ${a.n}: ночёвка изменена`);
      }
      if(segmentSignature(a, variantId) !== segmentSignature(b, variantId)){
        lines.push(`День ${a.n}: маршрут (waypoints)`);
      }
    }
  }
  return lines;
}

/**
 * @param {'local'|'imported'|'copy'} choice
 */
export function applyConflictChoice(choice, local, incoming){
  if(choice === 'local') return { ...local };
  if(choice === 'imported'){
    const t = JSON.parse(JSON.stringify(incoming));
    t.updatedAt = Date.now();
    return t;
  }
  if(choice === 'copy'){
    const t = JSON.parse(JSON.stringify(incoming));
    t.id = newId();
    t.title = (incoming.title || 'План') + ' (копия)';
    t.meta = { ...(incoming.meta || {}), forkOf: incoming.id, revision: 1 };
    t.updatedAt = Date.now();
    return t;
  }
  return incoming;
}

export function formatConflictSummary(conflict){
  const { existing, incoming, localNewer } = conflict;
  const loc = new Date(existing.updatedAt || 0);
  const inc = new Date(incoming.updatedAt || 0);
  const locStr = loc.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
  const incStr = inc.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
  return localNewer
    ? `На устройстве новее (${locStr}) · импорт ${incStr}`
    : `В файле новее (${incStr}) · на устройстве ${locStr}`;
}

/** @type {{ conflict: object, onChoose: Function }|null} */
let _pending = null;

function closeConflictUi(choice){
  const cb = _pending?.onChoose;
  _pending = null;
  document.getElementById('trip-conflict-modal')?.classList.remove('on');
  if(cb) cb(choice ?? null);
}

/** @param {Function} onChoose (choice: 'local'|'imported'|'copy'|null) */
export function openTripConflictUi(conflict, onChoose){
  _pending = { conflict, onChoose };
  const sum = document.getElementById('trip-conflict-summary');
  const diff = document.getElementById('trip-conflict-diff');
  const title = document.getElementById('trip-conflict-title');
  if(title) title.textContent = '«' + (conflict.incoming.title || 'План') + '» уже есть';
  if(sum) sum.textContent = formatConflictSummary(conflict);
  if(diff){
    const lines = tripDiffLines(conflict.existing, conflict.incoming);
    diff.innerHTML = lines.length
      ? '<ul>' + lines.map(l => '<li>' + l + '</li>').join('') + '</ul>'
      : '<p class="hint">Отличия не детализированы — различаются revision или время.</p>';
  }
  document.getElementById('trip-conflict-modal')?.classList.add('on');
}

export function initTripConflictModal(){
  const modal = document.getElementById('trip-conflict-modal');
  if(!modal || modal.dataset.bound) return;
  modal.dataset.bound = '1';
  document.getElementById('trip-conflict-local')?.addEventListener('click', () => closeConflictUi('local'));
  document.getElementById('trip-conflict-imported')?.addEventListener('click', () => closeConflictUi('imported'));
  document.getElementById('trip-conflict-copy')?.addEventListener('click', () => closeConflictUi('copy'));
  document.getElementById('trip-conflict-cancel')?.addEventListener('click', () => closeConflictUi(null));
}
