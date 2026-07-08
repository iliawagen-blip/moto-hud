/**
 * Текстовый редактор сегмента плана (waypoints → rtext).
 * @module trip-segment-editor
 */
import { $ } from './util.js';
import { formatSegmentEditorText, parseSegmentEditorText, auditSegment } from './trip-model.js';
import { assessSegmentFuel, formatFuelHint } from './trip-fuel.js';
import { getActiveBikeProfile } from './bike-profile.js';

/** @type {{ trip: object, dayN: number, segIdx: number, segment: object, onSaved: Function }|null} */
let _ctx = null;

function updateFuelPreview(){
  const el = $('trip-seg-edit-fuel');
  const ta = $('trip-seg-edit-points');
  if(!el || !ta) return;
  try{
    const { rtext } = parseSegmentEditorText(ta.value);
    const a = assessSegmentFuel({ rtext }, getActiveBikeProfile(), $('trip-seg-edit-road')?.value);
    el.textContent = a ? formatFuelHint(a) : 'Выберите профиль мото для оценки топлива';
    el.className = 'trip-seg-edit-fuel hint' + (a?.level === 'danger' ? ' fuel-danger' : a?.level === 'warn' ? ' fuel-warn' : '');
  }catch(e){
    el.textContent = '';
    el.className = 'trip-seg-edit-fuel hint';
  }
}

function setError(msg){
  const el = $('trip-seg-edit-error');
  if(!el) return;
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
}

export function openSegmentEditor(ctx){
  _ctx = ctx;
  const seg = ctx.segment;
  const label = $('trip-seg-edit-label');
  const points = $('trip-seg-edit-points');
  const meta = $('trip-seg-edit-meta');
  if(label) label.value = seg.label || '';
  if(points) points.value = formatSegmentEditorText(seg);
  if(meta){
    meta.textContent = `День ${ctx.dayN} · сегмент ${ctx.segIdx + 1}`;
  }
  setError('');
  updateFuelPreview();
  $('trip-segment-modal')?.classList.add('on');
}

export function closeSegmentEditor(){
  _ctx = null;
  $('trip-segment-modal')?.classList.remove('on');
}

export function initSegmentEditor(){
  const modal = $('trip-segment-modal');
  if(!modal || modal.dataset.bound) return;
  modal.dataset.bound = '1';

  $('trip-seg-edit-cancel')?.addEventListener('click', closeSegmentEditor);
  $('trip-seg-edit-points')?.addEventListener('input', updateFuelPreview);
  $('trip-seg-edit-road')?.addEventListener('change', updateFuelPreview);

  $('trip-seg-edit-save')?.addEventListener('click', async () => {
    if(!_ctx) return;
    try{
      const label = ($('trip-seg-edit-label')?.value || '').trim() || 'Сегмент';
      const { rtext, points } = parseSegmentEditorText($('trip-seg-edit-points')?.value || '');
      const audit = auditSegment(rtext);
      const day = _ctx.trip.days.find(d => d.n === _ctx.dayN);
      const v = day?.variants?.find(x => x.id === _ctx.variantId) || day?.variants?.[0];
      const seg = v?.segments?.[_ctx.segIdx];
      if(!seg) throw new Error('Сегмент не найден');
      seg.label = label;
      seg.rtext = rtext;
      seg.plannedKm = audit.km;
      seg.type = audit.isLoop ? 'radial' : (points.length === 2 ? 'transfer' : 'route');
      if(typeof _ctx.onSaved === 'function'){
        await _ctx.onSaved(_ctx.trip);
      }
      closeSegmentEditor();
    }catch(e){
      setError(e.message || String(e));
    }
  });
}
