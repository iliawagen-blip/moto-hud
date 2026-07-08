/**
 * UI планировщика многодневных поездок (фаза 6 MVP).
 */
import { S } from './state.js';
import { $, escapeHtml } from './util.js';
import {
  getDayVariant, tripSummaryText, buildTripFromNights, auditSegment,
  getTodayDayNumber, resolveTodayTarget, calendarDateForDay, formatTripDayDate,
  touchTripRevision
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
import {
  getVariantMode, setVariantMode, getLastApplied, markSegmentApplied,
  isSegmentDone, toggleSegmentDone, clearTripProgress
} from './trip-progress.js';
import {
  listBikeProfiles, getActiveBikeId, setActiveBikeId, getActiveBikeProfile,
  getBikeProfile, saveCustomBikeProfile, profileSnapshot, formatBikeRangeLine
} from './bike-profile.js';
import { assessSegmentFuel, assessDayFuel, formatFuelHint } from './trip-fuel.js';
import { initSegmentEditor, openSegmentEditor } from './trip-segment-editor.js';

let _busy = false;

function setTripNewError(msg){
  const el = $('trip-new-error');
  if(!el) return;
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
}

function variantForTrip(tripId){
  return getVariantMode(tripId);
}

function getTripBikeProfile(trip){
  if(trip?.meta?.bikeProfileSnapshot){
    const s = trip.meta.bikeProfileSnapshot;
    return { ...s, id: trip.meta.bikeProfileId || s.id };
  }
  return getActiveBikeProfile();
}

function attachBikeToTrip(trip){
  const p = getActiveBikeProfile();
  if(!trip || !p) return;
  trip.meta = trip.meta || {};
  trip.meta.bikeProfileId = p.id;
  trip.meta.bikeProfileSnapshot = profileSnapshot(p);
}

async function persistTrip(trip, opts){
  const bump = opts?.bump !== false;
  attachBikeToTrip(trip);
  if(bump) touchTripRevision(trip);
  else trip.updatedAt = Date.now();
  await saveTrip(trip);
}

function saveCustomFromForm(){
  const tank = parseFloat($('trip-bike-tank')?.value);
  const cons = parseFloat($('trip-bike-consumption')?.value);
  const reserve = parseFloat($('trip-bike-reserve')?.value);
  if(!Number.isFinite(tank) || !Number.isFinite(cons)) return;
  const base = getBikeProfile('bike_custom') || { id: 'bike_custom', name: 'Свой профиль', fuelType: '95' };
  saveCustomBikeProfile({
    ...base,
    tankLiters: tank,
    reserveKm: Number.isFinite(reserve) ? reserve : 40,
    consumptionL100: { ...base.consumptionL100, default: cons }
  });
}

function renderBikePanel(){
  const sel = $('trip-bike-select');
  const rangeEl = $('trip-bike-range');
  const custom = $('trip-bike-custom');
  if(!sel) return;
  const profiles = listBikeProfiles();
  const activeId = getActiveBikeId();
  sel.innerHTML = '<option value="">— не выбран —</option>' +
    profiles.map(p => `<option value="${escapeHtml(p.id)}"${p.id === activeId ? ' selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
  const profile = getActiveBikeProfile();
  if(rangeEl){
    rangeEl.textContent = profile
      ? formatBikeRangeLine(profile) + ' · оценка ±20–30%'
      : 'Без профиля оценка топлива скрыта';
  }
  custom?.classList.toggle('hidden', profile?.id !== 'bike_custom');
  if(profile?.id === 'bike_custom'){
    const tank = $('trip-bike-tank');
    const cons = $('trip-bike-consumption');
    const res = $('trip-bike-reserve');
    if(tank) tank.value = String(profile.tankLiters);
    if(cons) cons.value = String(profile.consumptionL100?.default ?? 5.5);
    if(res) res.value = String(profile.reserveKm);
  }
}

function setStatus(msg, err){
  const el = $('trip-status');
  if(!el) return;
  el.textContent = msg || '';
  el.className = 'status' + (err ? ' err' : msg ? ' ok' : '');
}

function dayDateLabel(trip, day){
  if(day.date) return day.date;
  const d = calendarDateForDay(trip, day.n);
  return d ? formatTripDayDate(d) : '';
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
      <span class="hint">${t.days?.length || 0} дн.${t.startDate ? ' · с ' + t.startDate : ''}</span>
    </button>
  `).join('');
  el.querySelectorAll('[data-trip-id]').forEach(btn => {
    btn.addEventListener('click', () => openTrip(btn.getAttribute('data-trip-id')));
  });
}

function updateTodayButton(){
  const trip = S.activeTrip;
  const btn = $('btn-trip-today');
  const hint = $('trip-today-hint');
  if(!btn) return;
  if(!trip){
    btn.disabled = true;
    if(hint) hint.textContent = '';
    return;
  }
  btn.disabled = false;
  const todayN = getTodayDayNumber(trip);
  const target = resolveTodayTarget(trip, variantForTrip(trip.id), getLastApplied(trip.id));
  if(hint){
    if(todayN != null) hint.textContent = 'Сегодня: день ' + todayN + ' из ' + trip.days.length;
    else if(target) hint.textContent = target.hint;
    else hint.textContent = 'Выберите сегмент вручную';
  }
}

function renderActiveTrip(){
  const wrap = $('trip-days');
  const trip = S.activeTrip;
  if(!wrap) return;
  if(!trip){
    wrap.innerHTML = '<p class="hint">Выберите или загрузите план поездки.</p>';
    $('trip-export-row')?.classList.add('hidden');
    $('trip-today-row')?.classList.add('hidden');
    updateTodayButton();
    return;
  }
  $('trip-export-row')?.classList.remove('hidden');
  $('trip-today-row')?.classList.remove('hidden');
  const vid = variantForTrip(trip.id);
  const hasIntense = trip.days.some(d => d.variants.some(v => v.id === 'intense'));
  $('trip-variant-bar')?.classList.toggle('hidden', !hasIntense);
  document.querySelectorAll('#trip-variant-bar .mode-btn').forEach(b => {
    b.classList.toggle('active', (b.getAttribute('data-mode') || 'calm') === vid);
  });

  const todayN = getTodayDayNumber(trip);
  const last = getLastApplied(trip.id);
  const ctx = S.tripContext;
  const bikeProf = getTripBikeProfile(trip);

  wrap.innerHTML = trip.days.map(day => {
    const v = getDayVariant(day, vid);
    const segs = v?.segments || [];
    const isToday = todayN === day.n;
    const dateLbl = dayDateLabel(trip, day);
    const dayFuel = bikeProf ? assessDayFuel(day, vid, bikeProf) : null;
    return `
    <article class="trip-day-card${isToday ? ' is-today' : ''}" data-day="${day.n}" id="trip-day-${day.n}">
      <div class="trip-day-head">
        <strong>День ${day.n}${isToday ? ' · сегодня' : ''}</strong>
        <span class="hint">${escapeHtml(dateLbl)}${day.badge ? ' · ' + escapeHtml(day.badge) : ''}</span>
      </div>
      ${dayFuel ? `<p class="trip-day-fuel fuel-${dayFuel.level}">⛽ ~${dayFuel.totalLiters} л · ${dayFuel.totalKm} км за день</p>` : ''}
      ${v?.schedule ? `<p class="trip-schedule">${escapeHtml(v.schedule)}</p>` : ''}
      ${v?.summary ? `<p class="trip-summary">${escapeHtml(v.summary)}</p>` : ''}
      ${v?.stats ? `<p class="trip-stats">${escapeHtml(v.stats)}</p>` : ''}
      ${v?.lunch ? `<p class="trip-lunch">${escapeHtml(v.lunch)}</p>` : ''}
      ${v?.night ? `<p class="trip-night">${escapeHtml(v.night)}</p>` : ''}
      <div class="trip-segments">
        ${segs.map((seg, i) => {
          const done = isSegmentDone(trip.id, day.n, i);
          const active = ctx?.tripId === trip.id && ctx?.dayN === day.n && ctx?.segmentLabel === seg.label;
          const wasLast = last?.dayN === day.n && last?.segIdx === i;
          const fuel = bikeProf ? assessSegmentFuel(seg, bikeProf) : null;
          const cls = ['trip-seg', done ? 'is-done' : '', active ? 'is-active' : '', wasLast && !active ? 'is-last' : ''].filter(Boolean).join(' ');
          return `
          <div class="${cls}">
            <span class="trip-seg-label">${done ? '✓ ' : ''}${escapeHtml(seg.label)}</span>
            <span class="trip-seg-audit">${escapeHtml(formatSegmentAudit(seg))}</span>
            ${fuel ? `<span class="trip-seg-fuel fuel-${fuel.level}">${escapeHtml(formatFuelHint(fuel))}</span>` : ''}
            <div class="btnrow c3 trip-seg-actions">
              <button type="button" class="secondary trip-osrm" data-day="${day.n}" data-seg="${i}">🗺 OSRM</button>
              <button type="button" class="secondary trip-yandex" data-day="${day.n}" data-seg="${i}">🧭 Яндекс</button>
              <button type="button" class="secondary trip-gpx" data-day="${day.n}" data-seg="${i}">GPX</button>
            </div>
            <button type="button" class="secondary trip-edit-btn" data-day="${day.n}" data-seg="${i}">✎ Точки</button>
            <button type="button" class="trip-done-btn" data-day="${day.n}" data-seg="${i}">${done ? '↩ Снять «готово»' : '✓ Отметить готово'}</button>
          </div>`;
        }).join('')}
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
  wrap.querySelectorAll('.trip-done-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tripId = S.activeTrip?.id;
      if(!tripId) return;
      toggleSegmentDone(tripId, +btn.dataset.day, +btn.dataset.seg);
      renderActiveTrip();
    });
  });
  wrap.querySelectorAll('.trip-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => onEditSegment(+btn.dataset.day, +btn.dataset.seg));
  });

  updateTodayButton();
  if(todayN != null){
    requestAnimationFrame(() => {
      document.getElementById('trip-day-' + todayN)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }
}

async function refreshTripList(){
  const trips = await loadAllTrips();
  renderTripList(trips);
}

async function importTripFromFile(file){
  const text = await file.text();
  const trip = parseTripJson(text);
  attachBikeToTrip(trip);
  await persistTrip(trip, { bump: false });
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
  setStatus('✓ Ссылка скопирована — откройте на телефоне (нужен trip_pack в URL)');
}

async function handleTripDeepLink(){
  const { localId, pack, openPlanner } = readTripDeepLink();
  if(openPlanner) $('drawer-trip')?.setAttribute('open', '');

  if(pack){
    try{
      setStatus('Загрузка плана из ссылки…');
      const trip = await decodeTripPack(pack);
      attachBikeToTrip(trip);
      await persistTrip(trip, { bump: false });
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
      setStatus('План не найден на этом устройстве — импортируйте JSON или откройте ссылку с trip_pack', true);
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

function onEditSegment(dayN, segIdx){
  const trip = S.activeTrip;
  if(!trip) return;
  const day = trip.days.find(d => d.n === dayN);
  const vid = variantForTrip(trip.id);
  const v = getDayVariant(day, vid);
  const seg = v?.segments?.[segIdx];
  if(!seg) return;
  openSegmentEditor({
    trip,
    dayN,
    segIdx,
    variantId: vid,
    segment: seg,
    onSaved: async t => {
      await persistTrip(t, { bump: true });
      renderActiveTrip();
      setStatus('✓ Сегмент сохранён');
    }
  });
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
    markSegmentApplied(trip.id, dayN, segIdx);
    setStatus(`✓ День ${dayN}: ${seg.label}`);
    renderActiveTrip();
    document.getElementById('setup')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }catch(e){
    setStatus('❌ ' + (e.message || e), true);
  }finally{
    _busy = false;
  }
}

async function applyToday(){
  const trip = S.activeTrip;
  if(!trip) return;
  const vid = variantForTrip(trip.id);
  const target = resolveTodayTarget(trip, vid, getLastApplied(trip.id));
  if(!target){
    setStatus('❌ Нет сегмента для сегодня', true);
    return;
  }
  await onApplySegment(target.dayN, target.segIdx, 'osrm');
  if(target.hint && target.hint !== 'сегодня по календарю'){
    setStatus(`✓ День ${target.dayN} (${target.hint})`);
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
    attachBikeToTrip(trip);
    await persistTrip(trip, { bump: false });
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
    const dateEl = $('trip-new-start-date');
    if(startEl && !startEl.value.trim() && Number.isFinite(S.gps?.lat) && Number.isFinite(S.gps?.lon)){
      startEl.value = `${S.gps.lat.toFixed(6)}, ${S.gps.lon.toFixed(6)}`;
    }
    if(dateEl && !dateEl.value){
      dateEl.value = new Date().toISOString().slice(0, 10);
    }
  }
}

async function createTripFromForm(){
  setTripNewError('');
  const title = $('trip-new-title')?.value?.trim() || 'Новая поездка';
  const startRaw = $('trip-new-start')?.value?.trim();
  const finishRaw = $('trip-new-finish')?.value?.trim();
  const nightsRaw = $('trip-new-nights')?.value?.trim();
  const startDate = $('trip-new-start-date')?.value?.trim() || new Date().toISOString().slice(0, 10);
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
    startDate
  });
  attachBikeToTrip(trip);
  await persistTrip(trip, { bump: true });
  S.activeTrip = trip;
  showNewTripModal(false);
  $('drawer-trip')?.setAttribute('open', '');
  renderActiveTrip();
  await refreshTripList();
  replaceTripLocalUrl(trip.id, true);
  setStatus('✓ План создан — «▶ Сегодня» или «🔗 Ссылка» для телефона');
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
  initSegmentEditor();
  renderBikePanel();

  $('trip-bike-select')?.addEventListener('change', async e => {
    const id = e.target.value;
    setActiveBikeId(id);
    if(id === 'bike_custom') saveCustomFromForm();
    renderBikePanel();
    const trip = S.activeTrip;
    if(trip){
      attachBikeToTrip(trip);
      await persistTrip(trip, { bump: true });
      renderActiveTrip();
    }
  });
  for(const id of ['trip-bike-tank', 'trip-bike-consumption', 'trip-bike-reserve']){
    $(id)?.addEventListener('change', async () => {
      if(getActiveBikeId() !== 'bike_custom') return;
      saveCustomFromForm();
      renderBikePanel();
      const trip = S.activeTrip;
      if(trip){
        attachBikeToTrip(trip);
        await persistTrip(trip, { bump: true });
        renderActiveTrip();
      }
    });
  }

  $('btn-trip-demo')?.addEventListener('click', loadDemo);
  $('btn-trip-new')?.addEventListener('click', () => showNewTripModal(true));
  $('btn-trip-today')?.addEventListener('click', () => applyToday().catch(e => setStatus('❌ ' + (e.message || e), true)));
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
    clearTripProgress(trip.id);
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
      const mode = btn.getAttribute('data-mode') || 'calm';
      setVariantMode(trip.id, mode);
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
