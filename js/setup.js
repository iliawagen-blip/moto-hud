import { S, DEFAULT_ELEV_EXAG, DEFAULT_ELEV_PROFILE_H, MIN_ELEV_PROFILE_H, MAX_ELEV_PROFILE_H, DEFAULT_ELEV_PROFILE_LEN_KM, MIN_ELEV_PROFILE_LEN_KM, MAX_ELEV_PROFILE_LEN_KM } from './state.js';

import { $ } from './util.js';

import { startGps, checkStartReady } from './gps.js';

import { searchAddress, fetchRouteAlternatives, selectRouteIndex, loadCameras, scheduleGeometryBuild, ensureRouteGeometry } from './route.js';

import { onTick, startHud, stopHud, cycleFuelAssist } from './hud.js';

import { updateCamStatusUI } from './cam-status.js';
import { loadRouteElevation, saveElevOptsToStorage } from './elevation.js';
import { computeCurveSpeed, saveCurveOptsToStorage } from './curve-speed.js';

import { isAndroidNative } from './platform.js';

import {

  renderRouteMap, renderRouteAlts, updateRouteInfo, clearRouteMap, setRouteMapSelectHandler,
  initMapProviderSelect, invalidateRouteMapSize

} from './route-map.js';



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



/** Сброс построенного маршрута при смене финиша */

export function invalidateRoute(){

  S.route = null;

  S.routeAlternatives = [];

  S.selectedRouteIdx = 0;

  clearRouteMap();

  setGoBarVisible(false);

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

    $('s-finish').textContent = '✅ Маршрут построен — выберите вариант и нажмите «ПОЕХАЛИ» внизу';

    $('s-finish').className = 'status ok';

    scheduleGeometryBuild(S.routeAlternatives, () => {
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

  $('s-finish').textContent = '⏳ Ищем адрес…';

  $('s-finish').className = 'status';

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

    $('s-finish').textContent = '🔎 Выберите вариант из списка';

    $('s-finish').className = 'status';

  }catch(e){

    $('s-finish').textContent = '❌ Ошибка поиска: ' + e.message;

    $('s-finish').className = 'status err';

  }

}



export function applyCoordsOrLink(){

  const raw = $('finish-input').value.trim();

  const p = parseInput(raw);

  if(!p){

    $('s-finish').textContent = '❌ Не разобрали. Координаты, ссылка или «Найти адрес»';

    $('s-finish').className = 'status err';

    return;

  }

  S.finish = p;

  $('s-finish').textContent = '✅ Финиш: ' + p.lat.toFixed(5) + ', ' + p.lon.toFixed(5);

  $('s-finish').className = 'status ok';

  $('search-results').style.display = 'none';

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

  return /-?\d{1,2}\.\d+.*-?\d{1,3}\.\d+/.test(s) || /[?&](ll|pt)=/.test(s);

}



export function bindSetupUI(){

  setRouteMapSelectHandler(pickRoute);

  initMapProviderSelect();



  $('s-gps').addEventListener('click', startGps);

  $('btn-search').addEventListener('click', doAddressSearch);

  $('btn-parse').addEventListener('click', applyCoordsOrLink);

  $('btn-build-route').addEventListener('click', doBuildRoute);

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

        if(looksLikeCoordsOrLink(t)) applyCoordsOrLink();

        else doAddressSearch();

      }

    }catch(e){

      $('s-finish').textContent = '❌ Нет доступа к буферу';

      $('s-finish').className = 'status err';

    }

  });



  $('opt-voice').addEventListener('change', e => { S.voice = e.target.checked; });

  $('opt-path').addEventListener('change', e => {

    S.showPath = e.target.checked;

    if(!S.showPath){

      $('block-path').classList.add('hidden');

      $('hud').classList.add('no-path');

    } else {

      $('block-path').classList.remove('hidden');

      $('hud').classList.remove('no-path');

    }

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

  });

  $('opt-cams').addEventListener('change', e => {
    S.cams = e.target.checked;
    if(!S.cams){
      S.camLoadStatus = 'off';
      S.cameras = [];
    }
    updateCamStatusUI();
    if(S.cams && S.route) loadCameras();
  });

  $('opt-back-only').addEventListener('change', e => { S.backOnly = e.target.checked; });

  $('opt-tol').addEventListener('change', e => {

    S.tolerance = Math.max(10, Math.min(90, parseInt(e.target.value, 10) || 45));

  });

  $('opt-nodir').addEventListener('change', e => { S.noDirPolicy = e.target.value; });

  $('opt-limit').addEventListener('change', e => { S.limit = parseInt(e.target.value, 10) || 0; });



  $('btn-start').addEventListener('click', startHud);



  let stopTapCount = 0, stopTapTimer = null;

  $('btn-stop').addEventListener('click', () => {

    stopTapCount++;

    clearTimeout(stopTapTimer);

    if(stopTapCount >= 2){

      stopTapCount = 0;

      if(confirm('Завершить поездку?')) stopHud();

    } else {

      stopTapTimer = setTimeout(() => { stopTapCount = 0; }, 800);

    }

  });



  $('btn-fuel').addEventListener('click', () => { cycleFuelAssist(); });



  $('btn-gear').addEventListener('click', () => {

    $('setup').style.display = 'block';

    $('setup').style.zIndex = '40';

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

  if(!S.showPath){

    $('block-path').classList.add('hidden');

    $('hud').classList.add('no-path');

  }

}



/** Подсказки только в нативном Android-приложении */

export function initNativeHints(){

  if(!isAndroidNative()) return;

  const help = $('drawer-help')?.querySelector('.hint, .drawer-body');

  if(!help) return;

  help.innerHTML +=

    '<br><br><b>Android-приложение:</b> при навигации появится уведомление «Навигация активна» — ' +

    'это foreground-service GPS (требование Android).<br>' +

    '<b>Батарея:</b> в настройках системы отключите оптимизацию батареи для «Мото ИЛС» ' +

    '(Батарея → приложения → без ограничений), иначе GPS может отваливаться на прошивках Samsung/Xiaomi/Huawei.';

}


