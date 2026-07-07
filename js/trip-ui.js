/**
 * UI планировщика многодневных поездок (фаза 6 MVP).
 */
import { S } from './state.js';
import { $, escapeHtml } from './util.js';
import {
  getDayVariant, tripSummaryText, buildTripFromNights, auditSegment
} from './trip-model.js';
import {
  loadAllTrips, loadTrip, saveTrip, deleteTrip, loadDemoTrip
} from './trip-storage.js';
import {
  applyTripSegment, setTripContext, clearTripContext,
  openSegmentInYandex, downloadSegmentGpx, formatSegmentAudit
} from './trip-planner.js';
import { parseInput } from './geo.js';

let _variantMode = {}; // tripId -> 'calm' | 'intense'
let _busy = false;

function variantForTrip(tripId){
  return _variantMode[tripId] || 'calm';
}

function setStatus(msg, err){
  const el = $('trip-status');
  if(!el) return;
  el.textContent = msg || '';
  el.className = 'status' + (err ? ' err' : msg ? ' ok' : '');
}

function renderTripList(trips){
  const el = $('trip-list');
  if(!el) return;
  if(!trips.length){
    el.innerHTML = '<p class="hint">Нет сохранённых планов. Загрузите демо или создайте новый.</p>';
    return;
  }
  el.innerHTML = trips.map(t => `
    <button type="button" class="trip-list-item${S.activeTrip?.id === t.id ? ' active' : ''}" data-trip-id="${escapeHtml(t.id)}">
      <strong>${escapeHtml(t.title)}</strong>
      <span class="hint">${t.days?.length || 0} дн. · ${new Date(t.updatedAt || 0).toLocaleDateString('ru-RU')}</span>
    </button>
  `).join('');
  el.querySelectorAll('[data-trip-id]').forEach(btn => {
    btn.addEventListener('click', () => openTrip(btn.getAttribute('data-trip-id')));
  });
}

function renderActiveTrip(){
  const wrap = $('trip-days');
  const trip = S.activeTrip;
  if(!wrap) return;
  if(!trip){
    wrap.innerHTML = '<p class="hint">Выберите или загрузите план поездки.</p>';
    $('trip-export-row')?.classList.add('hidden');
    return;
  }
  $('trip-export-row')?.classList.remove('hidden');
  const vid = variantForTrip(trip.id);
  const hasIntense = trip.days.some(d => d.variants.some(v => v.id === 'intense'));
  $('trip-variant-bar')?.classList.toggle('hidden', !hasIntense);

  wrap.innerHTML = trip.days.map(day => {
    const v = getDayVariant(day, vid);
    const segs = v?.segments || [];
    return `
    <article class="trip-day-card" data-day="${day.n}">
      <div class="trip-day-head">
        <strong>День ${day.n}</strong>
        <span class="hint">${escapeHtml(day.date || '')}${day.badge ? ' · ' + escapeHtml(day.badge) : ''}</span>
      </div>
      ${v?.schedule ? `<p class="trip-schedule">${escapeHtml(v.schedule)}</p>` : ''}
      ${v?.summary ? `<p class="trip-summary">${escapeHtml(v.summary)}</p>` : ''}
      ${v?.stats ? `<p class="trip-stats">${escapeHtml(v.stats)}</p>` : ''}
      ${v?.night ? `<p class="trip-night">${escapeHtml(v.night)}</p>` : ''}
      <div class="trip-segments">
        ${segs.map((seg, i) => `
          <div class="trip-seg">
            <span class="trip-seg-label">${escapeHtml(seg.label)}</span>
            <span class="trip-seg-audit">${escapeHtml(formatSegmentAudit(seg))}</span>
            <div class="btnrow c3 trip-seg-actions">
              <button type="button" class="secondary trip-osrm" data-day="${day.n}" data-seg="${i}">🗺 OSRM</button>
              <button type="button" class="secondary trip-yandex" data-day="${day.n}" data-seg="${i}">🧭 Яндекс</button>
              <button type="button" class="secondary trip-gpx" data-day="${day.n}" data-seg="${i}">GPX</button>
            </div>
          </div>
        `).join('')}
      </div>
    </article>`;
  }).join('');

  wrap.querySelectorAll('.trip-osrm').forEach(btn => {
    btn.addEventListener('click', () => onApplySegment(+btn.dataset.day, +btn.dataset.seg, 'osrm'));
  });
  wrap.querySelectorAll('.trip-yandex').forEach(btn => {
    btn.addEventListener('click', () => onYandexSegment(+btn.dataset.day, +btn.dataset.seg));
  });
  wrap.querySelectorAll('.trip-gpx').forEach(btn => {
    btn.addEventListener('click', () => onGpxSegment(+btn.dataset.day, +btn.dataset.seg));
  });
}

async function refreshTripList(){
  const trips = await loadAllTrips();
  renderTripList(trips);
}

async function openTrip(id){
  const trip = await loadTrip(id);
  if(!trip) return;
  S.activeTrip = trip;
  setStatus('');
  renderActiveTrip();
  await refreshTripList();
}

async function onApplySegment(dayN, segIdx, mode){
  if(_busy) return;
  const trip = S.activeTrip;
  if(!trip) return;
  const day = trip.days.find(d => d.n === dayN);
  const v = getDayVariant(day, variantForTrip(trip.id));
  const seg = v?.segments?.[segIdx];
  if(!seg) return;
  _busy = true;
  setStatus('Строим маршрут…');
  try{
    await applyTripSegment(seg, mode);
    setTripContext({
      tripId: trip.id,
      tripTitle: trip.title,
      dayN,
      variantId: v.id,
      segmentLabel: seg.label
    });
    setStatus(`✓ День ${dayN}: ${seg.label}`);
    document.getElementById('setup')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }catch(e){
    setStatus('❌ ' + (e.message || e), true);
  }finally{
    _busy = false;
  }
}

function onYandexSegment(dayN, segIdx){
  const trip = S.activeTrip;
  const day = trip?.days.find(d => d.n === dayN);
  const v = getDayVariant(day, variantForTrip(trip.id));
  const seg = v?.segments?.[segIdx];
  if(!seg) return;
  try{ openSegmentInYandex(seg); }catch(e){ setStatus('❌ ' + e.message, true); }
}

function onGpxSegment(dayN, segIdx){
  const trip = S.activeTrip;
  const day = trip?.days.find(d => d.n === dayN);
  const v = getDayVariant(day, variantForTrip(trip.id));
  const seg = v?.segments?.[segIdx];
  if(!seg) return;
  downloadSegmentGpx(seg, `day${dayN}-${seg.label}`);
}

async function loadDemo(){
  setStatus('Загрузка демо…');
  try{
    const trip = await loadDemoTrip();
    trip.updatedAt = Date.now();
    await saveTrip(trip);
    S.activeTrip = trip;
    renderActiveTrip();
    await refreshTripList();
    setStatus('✓ Кавказ июль 2026');
  }catch(e){
    setStatus('❌ ' + (e.message || e), true);
  }
}

function showNewTripModal(on){
  $('tripNewModal')?.classList.toggle('on', !!on);
}

async function createTripFromForm(){
  const title = $('trip-new-title')?.value?.trim() || 'Новая поездка';
  const startRaw = $('trip-new-start')?.value?.trim();
  const finishRaw = $('trip-new-finish')?.value?.trim();
  const nightsRaw = $('trip-new-nights')?.value?.trim();
  if(!startRaw || !finishRaw){
    setStatus('❌ Укажите старт и финиш', true);
    return;
  }
  const start = parseInput(startRaw);
  const finish = parseInput(finishRaw);
  if(!start || !finish){
    setStatus('❌ Не разобраны координаты старта/финиша', true);
    return;
  }
  start.label = start.label || 'Старт';
  finish.label = finish.label || 'Финиш';
  const nights = [];
  for(const line of (nightsRaw || '').split(/\n/)){
    const t = line.trim();
    if(!t) continue;
    const p = parseInput(t);
    if(p) nights.push({ ...p, label: p.label || t.split(/\s+/).slice(2).join(' ') || 'Ночёвка' });
  }
  const trip = buildTripFromNights({
    title,
    start,
    finish,
    nights,
    startDate: new Date().toISOString().slice(0, 10)
  });
  await saveTrip(trip);
  S.activeTrip = trip;
  showNewTripModal(false);
  renderActiveTrip();
  await refreshTripList();
  setStatus('✓ План создан — уточните сегменты и постройте OSRM');
}

function exportTripText(){
  const trip = S.activeTrip;
  if(!trip) return;
  const text = tripSummaryText(trip, variantForTrip(trip.id));
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (trip.id || 'trip') + '.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function initTripPlannerUi(){
  $('btn-trip-demo')?.addEventListener('click', loadDemo);
  $('btn-trip-new')?.addEventListener('click', () => showNewTripModal(true));
  $('trip-new-cancel')?.addEventListener('click', () => showNewTripModal(false));
  $('trip-new-save')?.addEventListener('click', () => createTripFromForm().catch(e => setStatus('❌ ' + e.message, true)));
  $('btn-trip-export')?.addEventListener('click', exportTripText);
  $('btn-trip-clear')?.addEventListener('click', () => {
    S.activeTrip = null;
    clearTripContext();
    renderActiveTrip();
    setStatus('');
  });
  $('btn-trip-delete')?.addEventListener('click', async () => {
    const trip = S.activeTrip;
    if(!trip || !confirm('Удалить план «' + trip.title + '»?')) return;
    await deleteTrip(trip.id);
    S.activeTrip = null;
    clearTripContext();
    renderActiveTrip();
    await refreshTripList();
    setStatus('');
  });

  document.querySelectorAll('#trip-variant-bar .mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const trip = S.activeTrip;
      if(!trip) return;
      _variantMode[trip.id] = btn.getAttribute('data-mode') || 'calm';
      document.querySelectorAll('#trip-variant-bar .mode-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      renderActiveTrip();
    });
  });

  refreshTripList().catch(() => {});
  renderActiveTrip();
}

export function getTripHudLabel(){
  const ctx = S.tripContext;
  if(!ctx) return '';
  let s = `День ${ctx.dayN}`;
  if(ctx.segmentLabel) s += ' · ' + ctx.segmentLabel.replace(/\s*→\s*$/, '');
  return s;
}

export function syncTripHudBadge(){
  const el = $('trip-hud-badge');
  if(!el) return;
  const on = $('hud')?.classList.contains('on');
  const label = getTripHudLabel();
  el.textContent = label;
  el.classList.toggle('hidden', !on || !label);
}
