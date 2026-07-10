/**
 * Режим пеленга: навигация к финишу без привязки к OSRM-манёврам.
 * @module bearing-mode
 */
import { S } from './state.js';
import { $ } from './util.js';
import { bearing, haversine } from './geo.js';
import { setViewMode } from './view-mode.js';
import { getSensorHeading, fuseHeading, getHeadingHealth } from './heading.js';
import telemetry from './telemetry.js';

const ARRIVED_M = 30;
const U_TURN_DEG = 170;
const GPS_HEADING_ACC_M = 15;
const GPS_HEADING_MIN_KMH = 8;
const COMPASS_PREF_MAX_KMH = 5;
const COMPASS_PREF_ACC_M = 20;
const ARROW_SMOOTH = 0.18;

let _smoothRel = 0;
let _bound = false;
let _lastTickLog = 0;

const BEARING_ICON_SVG =
  '<svg class="bearing-icon-svg" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">' +
  '<circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="2"/>' +
  '<polygon points="16,5 21,23 16,19 11,23" fill="currentColor"/>' +
  '<circle cx="16" cy="16" r="2.2" fill="currentColor"/>' +
  '</svg>';

export function isBearingMode(){
  return S.navMode === 'bearing';
}

export function getBearingTarget(){
  return S.finish || null;
}

function headingSourceLabel(gps, spdKmh){
  const acc = gps?.acc ?? 999;
  if(acc <= GPS_HEADING_ACC_M && spdKmh > GPS_HEADING_MIN_KMH) return 'GPS';
  if(spdKmh < COMPASS_PREF_MAX_KMH || acc > COMPASS_PREF_ACC_M) return 'компас';
  return 'GPS+компас';
}

/** Курс для пеленга: GPS / компас / blend по скорости и acc. */
export function getEffectiveHeading(gps){
  if(!gps) return S.smoothedHeading ?? null;
  const spd = gps.speed ?? 0;
  const spdKmh = spd * 3.6;
  const acc = gps.acc ?? 999;
  const gpsHdg = gps.heading;
  const fused = fuseHeading(gpsHdg, spd);

  if(acc <= GPS_HEADING_ACC_M && spdKmh > GPS_HEADING_MIN_KMH){
    return fused ?? S.smoothedHeading ?? gpsHdg ?? null;
  }
  if(spdKmh < COMPASS_PREF_MAX_KMH || acc > COMPASS_PREF_ACC_M){
    const sensor = getSensorHeading();
    if(sensor != null && spdKmh < COMPASS_PREF_MAX_KMH) return fused ?? sensor;
  }
  return S.smoothedHeading ?? fused ?? gpsHdg ?? null;
}

export function bearingDisplayState(bearingRel, distanceM){
  if(distanceM != null && distanceM < ARRIVED_M){
    return { label: 'Вы у цели', uTurn: false, arrived: true };
  }
  if(Math.abs(bearingRel) > U_TURN_DEG){
    return { label: 'РАЗВОРОТ', uTurn: true, arrived: false };
  }
  return { label: 'К ЦЕЛИ', uTurn: false, arrived: false };
}

export function formatBearingDistance(distanceM){
  if(distanceM == null || !isFinite(distanceM)){
    return { v: '—', u: '' };
  }
  if(distanceM < 1000){
    return { v: String(Math.max(0, Math.round(distanceM / 10) * 10)), u: 'м' };
  }
  return { v: (distanceM / 1000).toFixed(1), u: 'км' };
}

/**
 * @param {number} rotationDeg — относительный пеленг (−180…180)
 * @param {string} label
 * @param {{ uTurn?: boolean, dim?: boolean }} [opts]
 */
export function renderBearingArrow(rotationDeg, label, opts = {}){
  const box = $('bearing-arrow-box');
  if(!box) return;
  const dim = opts.dim ? ' bearing-arrow--dim' : '';
  const uTurn = opts.uTurn ? ' bearing-arrow--uturn' : '';
  const rot = opts.uTurn ? rotationDeg + 180 : rotationDeg;
  box.innerHTML =
    '<div class="bearing-arrow-wrap' + dim + uTurn + '" style="transform:rotate(' + rot.toFixed(1) + 'deg)">' +
    BEARING_ICON_SVG +
    '</div>' +
    (label ? '<div class="bearing-arrow-caption">' + label + '</div>' : '');
}

/** @returns {{ distanceM: number, bearingAbs: number, bearingRel: number, state: object } | null} */
export function updateBearing(gps, target, headingDeg){
  if(!gps || !target) return null;
  const distanceM = haversine(gps, target);
  const bearingAbs = bearing(gps, target);
  let bearingRel = 0;
  if(headingDeg != null && !isNaN(headingDeg)){
    bearingRel = ((bearingAbs - headingDeg + 540) % 360) - 180;
  }
  const state = bearingDisplayState(bearingRel, distanceM);
  return { distanceM, bearingAbs, bearingRel, state };
}

function applyBearingLayout(on){
  const hud = $('hud');
  hud?.classList.toggle('nav-bearing', on);
  $('route-nav-view')?.classList.toggle('hidden', on);
  const bv = $('bearing-view');
  bv?.classList.toggle('hidden', !on);
  bv?.setAttribute('aria-hidden', on ? 'false' : 'true');
  if(on){
    $('block-path')?.classList.add('hidden');
    $('finish-info')?.classList.add('bearing-hide-eta');
    $('camAlert')?.classList.remove('on');
    $('offRouteWarn')?.classList.remove('on');
  }else{
    $('finish-info')?.classList.remove('bearing-hide-eta');
    if(S.showPath !== false) $('block-path')?.classList.remove('hidden');
  }
}

export function syncNavButtons(){
  const pathBtn = $('btn-nav-path');
  const mapBtn = $('btn-nav-map');
  const bearingBtn = $('btn-nav-bearing');
  const routeView = !isBearingMode();
  const onHud = (S.viewMode || 'hud') === 'hud';

  pathBtn?.classList.toggle('hud-btn--active', routeView && onHud);
  mapBtn?.classList.toggle('hud-btn--active', routeView && !onHud);
  mapBtn?.classList.toggle('hidden', isBearingMode());
  bearingBtn?.classList.toggle('hud-btn--active', isBearingMode());
}

export function enterBearingMode(opts = {}){
  const quiet = !!opts.quiet;
  if(!S.finish){
    if(!quiet) alert('Укажите финиш на карте настройки');
    return false;
  }
  if(!S.gps){
    if(!quiet) alert('Нет GPS');
    return false;
  }
  if(!S.route){
    if(!quiet) alert('Сначала постройте маршрут или укажите финиш');
    return false;
  }
  S.navMode = 'bearing';
  setViewMode('hud');
  _smoothRel = 0;
  applyBearingLayout(true);
  syncNavButtons();
  if(telemetry.isActive?.()){
    telemetry.log('nav', { sub: 'bearing_enter' });
  }
  return true;
}

export function exitBearingMode(){
  if(S.navMode !== 'bearing') return;
  S.navMode = 'route';
  applyBearingLayout(false);
  syncNavButtons();
  if(telemetry.isActive?.()){
    telemetry.log('nav', { sub: 'bearing_exit' });
  }
}

export function toggleBearingMode(){
  if(isBearingMode()) exitBearingMode();
  else enterBearingMode();
}

export function resetBearingMode(){
  S.navMode = 'route';
  _smoothRel = 0;
  applyBearingLayout(false);
  syncNavButtons();
}

export function onNavPathButton(){
  if(isBearingMode()) exitBearingMode();
  setViewMode('hud');
  syncNavButtons();
}

export function onNavMapButton(){
  if(isBearingMode()) return;
  const mode = S.viewMode === 'hud' ? 'map_zoom' : 'hud';
  setViewMode(mode);
  syncNavButtons();
}

/** @param {Date} now @param {number} kmh */
export function tickBearing(now, kmh){
  const gps = S.gps;
  const target = getBearingTarget();
  const hdg = getEffectiveHeading(gps);
  const mid = $('mid-info');
  const tStr = S.startTs ? 'T+' + fmtRideTime((Date.now() - S.startTs) / 1000) : '—';
  if(mid) mid.textContent = tStr + ' · ПЕЛЕНГ';

  if(!target || !gps){
    renderBearingArrow(0, '—', { dim: true });
    const distEl = $('bearing-distance');
    if(distEl) distEl.textContent = '—';
    return;
  }

  const res = updateBearing(gps, target, hdg);
  if(!res) return;

  _smoothRel += (res.bearingRel - _smoothRel) * ARROW_SMOOTH;
  const labelEl = $('bearing-label');
  if(labelEl) labelEl.textContent = res.state.label;

  renderBearingArrow(_smoothRel, res.state.uTurn ? 'РАЗВОРОТ' : '', {
    uTurn: res.state.uTurn,
    dim: false
  });

  const fmt = formatBearingDistance(res.distanceM);
  const distEl = $('bearing-distance');
  if(distEl){
    distEl.innerHTML = fmt.u
      ? '<span class="bearing-dist-val">' + fmt.v + '</span><span class="bearing-dist-u">' + fmt.u + '</span>'
      : fmt.v;
  }

  const meta = $('bearing-heading-meta');
  if(meta){
    const src = headingSourceLabel(gps, kmh);
    const hh = getHeadingHealth();
    meta.textContent = hdg != null ? ('курс ' + Math.round(hdg) + '° · ' + src) : ('курс — · ' + src);
    meta.classList.toggle('bearing-heading-meta--warn', !!hh.interference);
  }

  if(telemetry.isActive?.() && Date.now() - _lastTickLog > 15000){
    _lastTickLog = Date.now();
    telemetry.log('nav', {
      sub: 'bearing_tick',
      dist_m: Math.round(res.distanceM),
      rel: Math.round(_smoothRel),
      hdg: hdg != null ? Math.round(hdg) : null
    });
  }
}

function fmtRideTime(s){
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if(h > 0) return h + 'ч' + (m % 60) + 'м';
  return m + 'м' + Math.floor(s % 60) + 'с';
}

export function initBearingMode(){
  if(_bound) return;
  _bound = true;
  $('btn-nav-path')?.addEventListener('click', e => {
    e.stopPropagation();
    onNavPathButton();
  });
  $('btn-nav-map')?.addEventListener('click', e => {
    e.stopPropagation();
    onNavMapButton();
  });
  $('btn-nav-bearing')?.addEventListener('click', e => {
    e.stopPropagation();
    toggleBearingMode();
  });
  syncNavButtons();
}
