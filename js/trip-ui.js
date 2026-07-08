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
import { parseTripPoint } from './geo.js';
import {
  downloadTripJson, parseTripJson, buildPortableShareUrl, copyText,
  shareTripFile, readTripDeepLink, replaceTripLocalUrl, decodeTripPack
} from './trip-share.js';

let _variantMode = {}; // tripId -> 'calm' | 'intense'
let _busy = false;

function setTripNewError(msg){
  const el = $('trip-new-error');
  if(!el) return;
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
}

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

async function importTripFromFile(file){
  const text = await file.text();
  const trip = parseTripJson(text);
  trip.updatedAt = Date.now();
  await saveTrip(trip);
  await openTrip(trip.id);
  $('drawer-trip')?.setAttribute('open', '');
  setStatus('✓ Импорт: «' + trip.title + '»');
}

async function shareTripLink(){
  const trip = S.activeTrip;
  if(!trip) return;
  const { url, tooLong, length } = await buildPortableShareUrl(trip);
  if(!url || tooLong){
    await shareTripFile(trip);
    setStatus('План большой для ссылки (' + (length || 0) + ' симв.) — отправьте JSON-файл');
    return;
  }
  await copyText(url);
  setStatus('✓ Ссылка скопирована — откройте на телефоне в том же браузере');
}

async function handleTripDeepLink(){
  const { localId, pack, openPlanner } = readTripDeepLink();
  if(openPlanner) $('drawer-trip')?.setAttribute('open', '');

  if(pack){
    try{
      setStatus('Загрузка плана из ссылки…');
      const trip = await decodeTripPack(pack);
      trip.updatedAt = Date.now();
      await saveTrip(trip);
      await openTrip(trip.id, { syncUrl: true });
      setStatus('✓ План из ссылки: «' + trip.title + '»');
      return;
    }catch(e){
      setStatus('❌ Ссылка с планом: ' + (e.message || e), true);
    }
  }

  if(localId){
    const ok = await openTrip(localId, { syncUrl: true });
    if(ok){
      $('drawer-trip')?.setAttribute('open', '');
      setStatus('');
    }else if(openPlanner){
      setStatus('План не найден на этом устройстве — импортируйте JSON или откройте ссылку с упакованным планом', true);
    }
  }
}
async function openTrip(id, opts){
  const trip = await loadTrip(id);
  if(!trip) return false;
  S.activeTrip = trip;
  setStatus('');
  renderActiveTrip();
  await refreshTripList();
  if(opts?.syncUrl !== false) replaceTripLocalUrl(trip.id, true);
  return true;
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
    replaceTripLocalUrl(trip.id, true);
    setStatus('✓ Кавказ июль 2026');
  }catch(e){
    setStatus('❌ ' + (e.message || e), true);
  }
}

function showNewTripModal(on){
  $('tripNewModal')?.classList.toggle('on', !!on);
  if(on){
    setTripNewError('');
    const startEl = $('trip-new-start');
    if(startEl && !startEl.value.trim() && Number.isFinite(S.gps?.lat) && Number.isFinite(S.gps?.lon)){
      startEl.value = `${S.gps.lat.toFixed(6)}, ${S.gps.lon.toFixed(6)}`;
    }
  }
}

async function createTripFromForm(){
  setTripNewError('');
  const title = $('trip-new-title')?.value?.trim() || 'Новая поездка';
  const startRaw = $('trip-new-start')?.value?.trim();
  const finishRaw = $('trip-new-finish')?.value?.trim();
  const nightsRaw = $('trip-new-nights')?.value?.trim();
  if(!startRaw || !finishRaw){
    setTripNewError('Укажите старт и финиш');
    return;
  }
  const start = parseTripPoint(startRaw, 'Старт');
  const finish = parseTripPoint(finishRaw, 'Финиш');
  if(!start || !finish){
    setTripNewError('Не разобраны координаты старта или финиша. Формат: 55.59, 37.53 Название');
    return;
  }
  const nights = [];
  const badLines = [];
  for(const line of (nightsRaw || '').split(/\n/)){
    const t = line.trim();
    if(!t) continue;
    const p = parseTripPoint(t, 'Ночёвка');
    if(p) nights.push(p);
    else badLines.push(t);
  }
  if(badLines.length){
    setTripNewError('Не разобраны строки ночёвок: ' + badLines.slice(0, 3).join('; '));
    return;
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
  $('drawer-trip')?.setAttribute('open', '');
  renderActiveTrip();
  await refreshTripList();
  replaceTripLocalUrl(trip.id, true);
  setStatus('✓ План создан — «🔗 Ссылка» или «📤 JSON» для телефона');
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
  $('trip-new-save')?.addEventListener('click', () => createTripFromForm().catch(e => setTripNewError(e.message || String(e))));
  $('btn-trip-export')?.addEventListener('click', exportTripText);
  $('btn-trip-json')?.addEventListener('click', () => {
    const trip = S.activeTrip;
    if(!trip) return;
    downloadTripJson(trip);
    setStatus('✓ JSON скачан — отправьте в Telegram / iCloud / Drive');
  });
  $('btn-trip-share')?.addEventListener('click', () => shareTripLink().catch(e => setStatus('❌ ' + e.message, true)));
  $('btn-trip-send')?.addEventListener('click', () => {
    const trip = S.activeTrip;
    if(!trip) return;
    shareTripFile(trip).then(mode => {
      if(mode === 'share') setStatus('✓ Отправлено через «Поделиться»');
      else if(mode === 'download') setStatus('✓ JSON скачан');
      else setStatus('✓ Текст отправлен — лучше JSON-файл');
    }).catch(e => setStatus('❌ ' + e.message, true));
  });
  $('btn-trip-import')?.addEventListener('click', () => $('trip-file')?.click());
  $('trip-file')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if(!file) return;
    importTripFromFile(file).catch(err => setStatus('❌ ' + (err.message || err), true));
  });
  $('btn-trip-clear')?.addEventListener('click', () => {
    S.activeTrip = null;
    clearTripContext();
    renderActiveTrip();
    replaceTripLocalUrl(null, false);
    setStatus('');
  });
  $('btn-trip-delete')?.addEventListener('click', async () => {
    const trip = S.activeTrip;
    if(!trip || !confirm('Удалить план «' + trip.title + '»?')) return;
    await deleteTrip(trip.id);
    S.activeTrip = null;
    clearTripContext();
    renderActiveTrip();
    replaceTripLocalUrl(null, false);
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

  refreshTripList().then(() => handleTripDeepLink()).catch(() => {});
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
