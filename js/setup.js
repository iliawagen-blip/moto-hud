import { S, DEFAULT_ELEV_EXAG, DEFAULT_ELEV_PROFILE_H, MIN_ELEV_PROFILE_H, MAX_ELEV_PROFILE_H, DEFAULT_ELEV_PROFILE_LEN_KM, MIN_ELEV_PROFILE_LEN_KM, MAX_ELEV_PROFILE_LEN_KM, DEFAULT_CAM_SPEED_TOL, DEFAULT_PATH_CHEVRON_MAX } from './state.js';

import { $, escapeHtml } from './util.js';
import { parseInput } from './geo.js';
import { isYandexMapsUrl } from './yandex-link.js';
import { importYandexFromText } from './yandex-import.js';

import { startGps, checkStartReady } from './gps.js';

import { searchAddress, fetchRouteAlternatives, selectRouteIndex, loadCameras, scheduleGeometryBuild, ensureRouteGeometry } from './route.js';

import { onTick, startHud, stopHud, cycleFuelAssist } from './hud.js';

import { updateCamStatusUI } from './cam-status.js';
import { loadRouteElevation, saveElevOptsToStorage } from './elevation.js';
import { computeCurveSpeed, saveCurveOptsToStorage } from './curve-speed.js';
import { saveHudOptsToStorage, applyFinishInfoVisibility, clampFuelPlannerCount } from './hud-opts.js';
import { applyHudChrome, normalizeChromeMode } from './hud-chrome.js';
import { saveAppOptsToStorage } from './app-opts.js';

import { isAndroidNative } from './platform.js';

import {

  renderRouteMap, renderRouteAlts, updateRouteInfo, clearRouteMap, setRouteMapSelectHandler,
  initMapProviderSelect, invalidateRouteMapSize

} from './route-map.js';

import { prefetchFuelForMap, searchNearestFuelStations, formatFuelDist, fuelStatusText, fuelStatusHint } from './fuel.js';
import { getFuelProxyBase, setFuelProxyBase } from './fuel-config.js';
import { openSettingsPanel } from './settings-ui.js';
import { handleHudGearClick } from './hud-settings-sheet.js';
import { refreshTtsBanner } from './tts-health.js';
import {
  startCompassCalibration, requestHeadingPermission, isCalibrating
} from './heading.js';
import { speak } from './voice.js';
import telemetry from './telemetry.js';
/** Синхронизация пути GPS-симулятора с построенным маршрутом */
function syncSimPath(){
  if(window.__SIM__?.setRoutePath && S.route?.coords?.length){
    window.__SIM__.setRoutePath(S.route.coords);
  }
}



/** Показать/скрыть закреплённую «ПОЕХАЛИ» */
export function setGoBarVisible(visible){
  $('go-bar')?.classList.toggle('hidden', !visible);
  $('setup')?.classList.toggle('has-go-bar', !!visible);
}

/** Обновить карту/инфо после построения или импорта маршрута */
export function refreshRouteUi(){
  if(!S.route) return;
  renderRouteMap(S.routeAlternatives, S.selectedRouteIdx, S.gps, S.finish);
  renderRouteAlts(S.routeAlternatives, S.selectedRouteIdx, pickRoute);
  updateRouteInfo(S.route);
  syncSimPath();
  setGoBarVisible(true);
  $('route-export-row')?.classList.toggle('hidden', !S.route?.coords?.length);
  loadCameras();
  checkStartReady();
  scheduleGeometryBuild(S.routeAlternatives, () => {
    renderRouteMap(S.routeAlternatives, S.selectedRouteIdx, S.gps, S.finish);
  });
}



/** Сброс построенного маршрута при смене финиша */

export function invalidateRoute(){

  S.route = null;

  S.routeAlternatives = [];

  S.selectedRouteIdx = 0;

  clearRouteMap();

  setGoBarVisible(false);
  $('route-export-row')?.classList.add('hidden');

  checkStartReady();

  const b = $('btn-build-route');

  if(b) b.disabled = !(S.gps && S.finish);

}



function pickRoute(idx){

  selectRouteIndex(idx);
  ensureRouteGeometry(S.route);

  renderRouteMap(S.routeAlternatives, S.selectedRouteIdx, S.gps, S.finish);

  renderRouteAlts(S.routeAlternatives, S.selectedRouteIdx, pickRoute);

  updateRouteInfo(S.route);

  syncSimPath();

  checkStartReady();

  loadCameras();

}



export async function doBuildRoute(){

  if(!S.gps || !S.finish){

    $('s-finish').textContent = '❌ Нужны GPS и финиш';

    $('s-finish').className = 'status err';

    return;

  }

  const btn = $('btn-build-route');

  const prev = btn.textContent;

  btn.disabled = true;

  btn.textContent = '⏳ Строим…';

  $('route-info').textContent = '⏳ Запрос маршрутов…';

  $('route-info').className = 'route-info';

  try{

    S.routeAlternatives = await fetchRouteAlternatives();

    S.selectedRouteIdx = 0;

    selectRouteIndex(0);

    renderRouteMap(S.routeAlternatives, 0, S.gps, S.finish);

    renderRouteAlts(S.routeAlternatives, 0, pickRoute);

    updateRouteInfo(S.route);

    syncSimPath();
    setGoBarVisible(true);
    loadCameras();
    telemetry.log('nav', { sub: 'route_built', variants: S.routeAlternatives.length });

    $('s-finish').textContent = '✅ Маршрут построен — выберите вариант и нажмите «ПОЕХАЛИ» внизу';

    $('s-finish').className = 'status ok';

    scheduleGeometryBuild(S.routeAlternatives, () => {
      renderRouteMap(S.routeAlternatives, S.selectedRouteIdx, S.gps, S.finish);
    });

    prefetchFuelForMap().then(() => {
      renderRouteMap(S.routeAlternatives, S.selectedRouteIdx, S.gps, S.finish);
    });

  }catch(e){

    $('route-info').textContent = '❌ ' + e.message;

    $('route-info').className = 'route-info';

    $('s-finish').textContent = '❌ ' + e.message;

    $('s-finish').className = 'status err';

    clearRouteMap();

  }finally{

    btn.textContent = prev;

    btn.disabled = !(S.gps && S.finish);

    checkStartReady();

  }

}



export async function doAddressSearch(){

  const q = $('finish-input').value.trim();

  if(!q){

    $('s-finish').textContent = '❌ Введите адрес';

    $('s-finish').className = 'status err';

    return;

  }

  if(parseInput(q)){

    applyCoordsOrLink();

    return;

  }

  $('s-finish').textContent = '⏳ Ищем адрес…';

  $('s-finish').className = 'status';

  S.finish = null;

  invalidateRoute();

  if(window.__motoHUD) window.__motoHUD._searchBusy = true;

  try{

    const res = await searchAddress(q);

    if(!res.length){

      $('s-finish').textContent = '❌ Ничего не найдено';

      $('s-finish').className = 'status err';

      $('search-results').style.display = 'none';

      return;

    }

    const box = $('search-results');

    box.innerHTML = '';

    res.forEach(r => {

      const d = document.createElement('div');

      d.textContent = r.display_name;

      d.addEventListener('click', () => {

        S.finish = { lat: parseFloat(r.lat), lon: parseFloat(r.lon), label: r.display_name.split(',')[0] };

        $('s-finish').textContent = '✅ Финиш: ' + r.display_name;

        $('s-finish').className = 'status ok';

        $('finish-input').value = r.display_name;

        box.style.display = 'none';

        invalidateRoute();

      });

      box.appendChild(d);

    });

    box.style.display = 'block';
    try{ box.scrollIntoView({ block: 'nearest', behavior: 'smooth', inline: 'nearest' }); }catch(e){}

    $('s-finish').textContent = '🔎 Выберите вариант из списка';

    $('s-finish').className = 'status';

  }catch(e){

    $('s-finish').textContent = '❌ Ошибка поиска: ' + e.message;

    $('s-finish').className = 'status err';

  }finally{

    if(window.__motoHUD) window.__motoHUD._searchBusy = false;

  }

}



function applyFuelFinish(st){
  const brand = st.brand || st.name || 'АЗС';
  S.finish = { lat: st.lat, lon: st.lon, label: '⛽ ' + brand };
  const inputVal = st.name && st.name !== st.brand ? brand + ' — ' + st.name : brand;
  $('finish-input').value = inputVal;
  $('finish-input').dataset.userEdited = '1';
  $('s-finish').textContent = '✅ Финиш: ' + inputVal + ' · ' + formatFuelDist(st.distGps);
  $('s-finish').className = 'status ok';
  invalidateRoute();
  checkStartReady();
}

function fuelStationMetaLine(st){
  const parts = ['<span class="fuel-st ' + (st.status || 'unknown') + '">' +
    escapeHtml(fuelStatusText(st.status)) + '</span>'];
  if(st.confirmations) parts.push('отчётов: ' + st.confirmations);
  if(st.lastAt) parts.push('данные: ' + escapeHtml(String(st.lastAt).split(' ')[0]));
  if(st.statusSource === 'crowd') parts.push('ваш отчёт');
  return parts.join(' · ');
}

export async function doFuelSearch(){
  if(!S.gps){
    $('s-finish').textContent = '❌ Сначала получите GPS (нажмите 📍 GPS)';
    $('s-finish').className = 'status err';
    return;
  }
  const btn = $('btn-fuel-search');
  const prev = btn?.textContent;
  if(btn){ btn.disabled = true; btn.textContent = '⏳ Ищем АЗС…'; }
  $('s-finish').textContent = '⏳ Загрузка заправок…';
  $('s-finish').className = 'status';
  try{
    syncOptionsFromDom();
    const limit = clampFuelPlannerCount(S.fuelPlannerCount);
    const list = await searchNearestFuelStations(limit);
    const box = $('search-results');
    box.innerHTML = '';
    if(!list.length){
      $('s-finish').textContent = '❌ Заправки не найдены поблизости';
      $('s-finish').className = 'status err';
      box.style.display = 'none';
      return;
    }
    list.forEach(st => {
      const row = document.createElement('div');
      row.className = 'fuel-item';
      row.innerHTML =
        '<div class="fuel-title"><span>⛽ ' + escapeHtml(st.brand || st.name || 'АЗС') + '</span>' +
        '<span class="fuel-dist">' + formatFuelDist(st.distGps) + '</span></div>' +
        (st.name && st.name !== st.brand
          ? '<div class="fuel-meta">' + escapeHtml(st.name) + '</div>' : '') +
        '<div class="fuel-meta">' + fuelStationMetaLine(st) + '</div>';
      row.addEventListener('click', () => {
        applyFuelFinish(st);
        box.style.display = 'none';
      });
      box.appendChild(row);
    });
    box.style.display = 'block';
    try{ box.scrollIntoView({ block: 'nearest', behavior: 'smooth', inline: 'nearest' }); }catch(e){}
    $('s-finish').textContent = '⛽ Выберите заправку (' + list.length + ')' + fuelStatusHint();
    $('s-finish').className = 'status';
  }catch(e){
    $('s-finish').textContent = '❌ Ошибка загрузки АЗС: ' + e.message;
    $('s-finish').className = 'status err';
  }finally{
    if(btn){
      btn.disabled = false;
      btn.textContent = prev || '⛽ Ближайшие заправки';
    }
  }
}



export function setFinishQuiet(lat, lon, label = 'Точка'){
  S.finish = { lat, lon, label };
  $('s-finish').textContent = '✅ Финиш: ' + lat.toFixed(5) + ', ' + lon.toFixed(5);
  $('s-finish').className = 'status ok';
  checkStartReady();
}



export async function applyCoordsOrLink(opts = {}){

  const hideSearch = opts.hideSearch !== false;

  const raw = $('finish-input').value.trim();

  if(await tryYandexRouteImport(raw)) return;

  const p = parseInput(raw);

  if(!p){

    $('s-finish').textContent = '❌ Не разобрали. Координаты, ссылка или «Найти адрес»';

    $('s-finish').className = 'status err';

    return;

  }

  S.finish = p;

  $('s-finish').textContent = '✅ Финиш: ' + p.lat.toFixed(5) + ', ' + p.lon.toFixed(5);

  $('s-finish').className = 'status ok';

  if(hideSearch) $('search-results').style.display = 'none';

  invalidateRoute();

}



function isFullscreen(){ return document.fullscreenElement || document.webkitFullscreenElement; }



function toggleFullscreen(){

  try{

    if(isFullscreen()){

      (document.exitFullscreen || document.webkitExitFullscreen || function(){}).call(document);

    } else {

      const el = document.documentElement;

      (el.requestFullscreen || el.webkitRequestFullscreen || function(){}).call(el);

    }

  }catch(e){}

}



function looksLikeCoordsOrLink(s){
  return /-?\d{1,2}\.\d+.*-?\d{1,3}\.\d+/.test(s) || /[?&](ll|pt)=/.test(s) || isYandexMapsUrl(s);
}

async function tryYandexRouteImport(raw){
  if(!isYandexMapsUrl(raw)) return false;
  try{
    await importYandexFromText(raw);
    return true;
  }catch(e){
    $('s-finish').textContent = '❌ ' + (e.message || e);
    $('s-finish').className = 'status err';
    return true;
  }
}



export function bindSetupUI(){

  setRouteMapSelectHandler(pickRoute);

  initMapProviderSelect();



  $('s-gps').addEventListener('click', startGps);

  $('btn-search').addEventListener('click', doAddressSearch);

  $('btn-fuel-search')?.addEventListener('click', doFuelSearch);

  $('btn-parse').addEventListener('click', applyCoordsOrLink);

  $('btn-build-route').addEventListener('click', doBuildRoute);

  $('finish-input').addEventListener('input', () => {
    $('finish-input').dataset.userEdited = '1';
  });

  $('finish-input').addEventListener('focus', () => {
    if(window.__motoHUD) window.__motoHUD._finishFocused = true;
  });

  $('finish-input').addEventListener('blur', () => {
    if(window.__motoHUD) window.__motoHUD._finishFocused = false;
  });

  $('finish-input').addEventListener('keydown', e => {

    if(e.key === 'Enter'){

      e.preventDefault();

      if(looksLikeCoordsOrLink(e.target.value)) applyCoordsOrLink();

      else doAddressSearch();

    }

  });

  $('btn-paste').addEventListener('click', async () => {

    try{

      const t = await navigator.clipboard.readText();

      if(t){

        $('finish-input').value = t;

        if(await tryYandexRouteImport(t)) return;

        if(looksLikeCoordsOrLink(t)) await applyCoordsOrLink();

        else doAddressSearch();

      }

    }catch(e){

      $('s-finish').textContent = '❌ Нет доступа к буферу';

      $('s-finish').className = 'status err';

    }

  });



  $('opt-voice').addEventListener('change', e => {
    S.voice = e.target.checked;
    refreshTtsBanner();
    saveAppOptsToStorage();
  });

  $('btn-compass-cal')?.addEventListener('click', async () => {
    const btn = $('btn-compass-cal');
    const ok = await requestHeadingPermission();
    if(!ok){
      alert('Нет доступа к компасу. Разрешите датчики ориентации в настройках браузера/системы.');
      return;
    }
    startCompassCalibration(15000);
    if(btn){
      btn.disabled = true;
      btn.textContent = '⏳ Восьмёрка… 15 с';
    }
    setTimeout(() => {
      if(btn){
        btn.disabled = false;
        btn.textContent = '🧭 Калибровка компаса';
      }
      if(!isCalibrating()) speak('Калибровка завершена');
    }, 15000);
  });

  $('opt-path').addEventListener('change', e => {

    S.showPath = e.target.checked;

    if(!S.showPath){

      $('block-path').classList.add('hidden');

      $('hud').classList.add('no-path');

    } else {

      $('block-path').classList.remove('hidden');

      $('hud').classList.remove('no-path');

    }

    saveAppOptsToStorage();

  });

  $('opt-crossings')?.addEventListener('change', e => {
    S.showCrossingContext = e.target.checked;
    saveAppOptsToStorage();
  });

  function syncChevronInputs(){
    const on = S.showPathChevrons !== false;
    const labels = $('opt-chevron-labels');
    const maxEl = $('opt-chevron-max');
    if(labels) labels.disabled = !on;
    if(maxEl) maxEl.disabled = !on;
  }

  $('opt-path-chevrons')?.addEventListener('change', e => {
    S.showPathChevrons = e.target.checked;
    syncChevronInputs();
    saveAppOptsToStorage();
  });

  $('opt-chevron-labels')?.addEventListener('change', e => {
    S.pathChevronLabels = e.target.checked;
    saveAppOptsToStorage();
  });

  $('opt-chevron-max')?.addEventListener('change', e => {
    S.pathChevronMax = Math.max(1, Math.min(3, parseInt(e.target.value, 10) || DEFAULT_PATH_CHEVRON_MAX));
    e.target.value = String(S.pathChevronMax);
    saveAppOptsToStorage();
  });

  const bindFinishOpt = id => {
    $(id)?.addEventListener('change', () => {
      syncOptionsFromDom();
      saveHudOptsToStorage();
      applyHudChrome();
    });
  };
  bindFinishOpt('opt-finish-dist');
  bindFinishOpt('opt-finish-time');
  bindFinishOpt('opt-finish-eta');

  const bindChromeMode = (id, key) => {
    $(id)?.addEventListener('change', e => {
      S[key] = normalizeChromeMode(e.target.value);
      e.target.value = S[key];
      saveHudOptsToStorage();
      applyHudChrome();
    });
  };
  bindChromeMode('opt-hud-status-mode', 'hudStatusMode');
  bindChromeMode('opt-hud-finish-mode', 'hudFinishMode');

  $('opt-fuel-count')?.addEventListener('change', e => {
    S.fuelPlannerCount = clampFuelPlannerCount(e.target.value);
    e.target.value = String(S.fuelPlannerCount);
    saveHudOptsToStorage();
  });

  $('opt-fuel-proxy')?.addEventListener('change', e => {
    setFuelProxyBase(e.target.value.trim());
  });
  $('opt-fuel-proxy')?.addEventListener('blur', e => {
    setFuelProxyBase(e.target.value.trim());
  });

  function syncElevInputs(){
    const on = S.showElevProfile;
    const exag = $('opt-elev-exag');
    const ph = $('opt-elev-profile-h');
    const plen = $('opt-elev-profile-len');
    if(exag) exag.disabled = !on;
    if(ph) ph.disabled = !on;
    if(plen) plen.disabled = !on;
  }

  $('opt-elev-profile').addEventListener('change', e => {
    S.showElevProfile = e.target.checked;
    syncElevInputs();
    saveElevOptsToStorage();
    if(S.showElevProfile && S.route?.geometry) loadRouteElevation();
  });

  $('opt-elev-exag').addEventListener('change', e => {
    S.elevExag = Math.max(0.5, Math.min(5, parseFloat(e.target.value) || DEFAULT_ELEV_EXAG));
    e.target.value = String(S.elevExag);
    saveElevOptsToStorage();
  });

  $('opt-elev-profile-h').addEventListener('change', e => {
    S.elevProfileH = Math.max(MIN_ELEV_PROFILE_H, Math.min(MAX_ELEV_PROFILE_H,
      parseInt(e.target.value, 10) || DEFAULT_ELEV_PROFILE_H));
    e.target.value = String(S.elevProfileH);
    saveElevOptsToStorage();
  });

  $('opt-elev-profile-len').addEventListener('change', e => {
    S.elevProfileLenKm = Math.max(MIN_ELEV_PROFILE_LEN_KM, Math.min(MAX_ELEV_PROFILE_LEN_KM,
      parseInt(e.target.value, 10) || DEFAULT_ELEV_PROFILE_LEN_KM));
    e.target.value = String(S.elevProfileLenKm);
    saveElevOptsToStorage();
    if(S.routeAlternatives?.length) renderRouteMap(S.routeAlternatives, S.selectedRouteIdx, S.gps, S.finish);
  });

  function syncCurveInputs(){
    const on = S.curveWarn;
    const sel = $('opt-curve-strict');
    if(sel) sel.disabled = !on;
  }

  function recomputeCurveIfReady(){
    const geom = S.route?.geometry;
    if(geom) computeCurveSpeed(geom, S.route);
  }

  $('opt-curve-warn').addEventListener('change', e => {
    S.curveWarn = e.target.checked;
    syncCurveInputs();
    saveCurveOptsToStorage();
  });

  $('opt-curve-strict').addEventListener('change', e => {
    const v = e.target.value;
    if(v === 'relaxed' || v === 'normal' || v === 'strict') S.curveStrict = v;
    saveCurveOptsToStorage();
    recomputeCurveIfReady();
  });

  $('opt-heading').addEventListener('change', e => {

    S.showCompass = e.target.checked;

    $('hud').classList.toggle('show-compass', S.showCompass);

    saveAppOptsToStorage();

  });

  $('opt-cams').addEventListener('change', e => {
    S.cams = e.target.checked;
    if(!S.cams){
      S.camLoadStatus = 'off';
      S.cameras = [];
    }
    updateCamStatusUI();
    if(S.cams && S.route) loadCameras();
    saveAppOptsToStorage();
  });

  $('opt-back-only').addEventListener('change', e => {
    S.backOnly = e.target.checked;
    saveAppOptsToStorage();
  });

  $('opt-tol').addEventListener('change', e => {

    S.tolerance = Math.max(10, Math.min(90, parseInt(e.target.value, 10) || 45));

    saveAppOptsToStorage();

  });

  $('opt-nodir').addEventListener('change', e => {
    S.noDirPolicy = e.target.value;
    saveAppOptsToStorage();
  });

  $('opt-limit').addEventListener('change', e => {
    S.limit = parseInt(e.target.value, 10) || 0;
    saveAppOptsToStorage();
  });

  $('opt-cam-speed-tol')?.addEventListener('change', e => {
    S.camSpeedTol = Math.max(0, Math.min(50, parseInt(e.target.value, 10) || DEFAULT_CAM_SPEED_TOL));
    e.target.value = String(S.camSpeedTol);
    saveAppOptsToStorage();
  });



  $('btn-start').addEventListener('click', startHud);



  let stopArmed = false;
  let stopArmTimer = null;
  let stopLastTap = 0;

  $('btn-stop').addEventListener('click', (e) => {
    e.preventDefault();
    const now = Date.now();
    if(now - stopLastTap < 350) return;
    stopLastTap = now;

    if(stopArmed){
      stopArmed = false;
      clearTimeout(stopArmTimer);
      $('btn-stop')?.classList.remove('armed');
      if(confirm('Завершить поездку?')) stopHud();
      return;
    }
    stopArmed = true;
    $('btn-stop')?.classList.add('armed');
    stopArmTimer = setTimeout(() => {
      stopArmed = false;
      $('btn-stop')?.classList.remove('armed');
    }, 1400);
  });



  $('btn-fuel').addEventListener('click', () => { cycleFuelAssist(); });



  $('btn-gear').addEventListener('click', () => {
    if($('hud')?.classList.contains('on')) handleHudGearClick(syncOptionsFromDom);
    else openSettingsPanel();
  });

  $('qf-close').addEventListener('click', () => $('quickFinish').classList.remove('on'));



  $('btn-fs').addEventListener('click', toggleFullscreen);



  window.addEventListener('orientationchange', () => {

    invalidateRouteMapSize();

    setTimeout(() => { if($('hud').classList.contains('on')) onTick(); }, 250);

  });



  // при открытии details — прокрутить к секции

  document.querySelectorAll('.setup-details').forEach(det => {

    det.addEventListener('toggle', () => {

      if(det.open) setTimeout(() => det.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);

    });

  });

}



export function syncOptionsFromDom(){

  S.voice = $('opt-voice').checked;

  S.showPath = $('opt-path').checked;
  S.showCrossingContext = $('opt-crossings')?.checked ?? true;
  S.showPathChevrons = $('opt-path-chevrons')?.checked ?? true;
  S.pathChevronLabels = $('opt-chevron-labels')?.checked ?? true;
  S.pathChevronMax = Math.max(1, Math.min(3,
    parseInt($('opt-chevron-max')?.value, 10) || DEFAULT_PATH_CHEVRON_MAX));
  if($('opt-chevron-max')) $('opt-chevron-max').value = String(S.pathChevronMax);
  if($('opt-chevron-labels')) $('opt-chevron-labels').disabled = !S.showPathChevrons;
  if($('opt-chevron-max')) $('opt-chevron-max').disabled = !S.showPathChevrons;

  S.showFinishDist = $('opt-finish-dist')?.checked ?? true;
  S.showFinishTime = $('opt-finish-time')?.checked ?? true;
  S.showFinishEta = $('opt-finish-eta')?.checked ?? true;
  S.hudStatusMode = normalizeChromeMode($('opt-hud-status-mode')?.value || S.hudStatusMode);
  S.hudFinishMode = normalizeChromeMode($('opt-hud-finish-mode')?.value || S.hudFinishMode);
  if($('opt-hud-status-mode')) $('opt-hud-status-mode').value = S.hudStatusMode;
  if($('opt-hud-finish-mode')) $('opt-hud-finish-mode').value = S.hudFinishMode;
  applyHudChrome();

  S.fuelPlannerCount = clampFuelPlannerCount($('opt-fuel-count')?.value);
  if($('opt-fuel-count')) $('opt-fuel-count').value = String(S.fuelPlannerCount);
  const proxyEl = $('opt-fuel-proxy');
  if(proxyEl) proxyEl.value = getFuelProxyBase();

  S.showElevProfile = $('opt-elev-profile').checked;

  S.elevExag = Math.max(0.5, Math.min(5, parseFloat($('opt-elev-exag').value) || DEFAULT_ELEV_EXAG));
  S.elevProfileH = Math.max(MIN_ELEV_PROFILE_H, Math.min(MAX_ELEV_PROFILE_H,
    parseInt($('opt-elev-profile-h')?.value, 10) || DEFAULT_ELEV_PROFILE_H));
  S.elevProfileLenKm = Math.max(MIN_ELEV_PROFILE_LEN_KM, Math.min(MAX_ELEV_PROFILE_LEN_KM,
    parseInt($('opt-elev-profile-len')?.value, 10) || DEFAULT_ELEV_PROFILE_LEN_KM));

  if($('opt-elev-exag')) $('opt-elev-exag').value = String(S.elevExag);
  if($('opt-elev-profile-h')) $('opt-elev-profile-h').value = String(S.elevProfileH);
  if($('opt-elev-profile-len')) $('opt-elev-profile-len').value = String(S.elevProfileLenKm);
  if($('opt-elev-exag')) $('opt-elev-exag').disabled = !S.showElevProfile;
  if($('opt-elev-profile-h')) $('opt-elev-profile-h').disabled = !S.showElevProfile;
  if($('opt-elev-profile-len')) $('opt-elev-profile-len').disabled = !S.showElevProfile;

  S.curveWarn = $('opt-curve-warn')?.checked ?? true;
  const strictEl = $('opt-curve-strict');
  if(strictEl){
    S.curveStrict = strictEl.value || 'normal';
    strictEl.disabled = !S.curveWarn;
  }

  S.showCompass = $('opt-heading').checked;

  S.cams = $('opt-cams').checked;

  S.backOnly = $('opt-back-only').checked;

  S.tolerance = parseInt($('opt-tol').value, 10) || 45;

  S.noDirPolicy = $('opt-nodir').value;

  S.limit = parseInt($('opt-limit').value, 10) || 60;
  S.camSpeedTol = Math.max(0, Math.min(50,
    parseInt($('opt-cam-speed-tol')?.value, 10) || DEFAULT_CAM_SPEED_TOL));
  if($('opt-cam-speed-tol')) $('opt-cam-speed-tol').value = String(S.camSpeedTol);

  $('hud')?.classList.toggle('show-compass', S.showCompass);

  if(!S.showPath){

    $('block-path').classList.add('hidden');

    $('hud').classList.add('no-path');

  } else {

    $('block-path')?.classList.remove('hidden');

    $('hud')?.classList.remove('no-path');

  }

}



/** Подсказки только в нативном Android-приложении */

export function initNativeHints(){

  if(!isAndroidNative()) return;

  const help = $('drawer-help')?.querySelector('.hint, .drawer-body');

  if(!help) return;

  help.innerHTML +=

    '<span class="help-section"><b>Android-приложение</b> ' +

    'При навигации — уведомление «Навигация активна» (foreground-service GPS). ' +

    'В настройках системы отключите оптимизацию батареи для «Мото ИЛС», иначе GPS может отваливаться на Samsung/Xiaomi/Huawei. ' +

    'Чек-лист: <code>docs/oem-gps-matrix.md</code>.</span>';

}
