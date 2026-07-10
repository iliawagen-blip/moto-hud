/**
 * API для sim.html: тема, маршрут, навигация внутри iframe.
 * @module sim-bridge
 */
import { S } from './state.js';
import { $ } from './util.js';
import { startHud, onTick } from './hud.js';
import { revealHudChrome } from './hud-chrome.js';
import {
  onNavPathButton, onNavMapButton,
  enterBearingMode, exitBearingMode, isBearingMode
} from './bearing-mode.js';
import { applyTheme, THEME_IDS, MODE_PREFS } from './theme-manager.js';
import { doBuildRoute, refreshRouteUi, setGoBarVisible, setFinishQuiet } from './setup.js';
import { buildDirectRouteFromWaypoints, attachRouteFromImport, scheduleGeometryBuild } from './route.js';

const DEMO_FINISH = [55.827099, 37.632066];

function isSimPage(){
  return new URLSearchParams(location.search).get('sim') === '1';
}

function syncSimPathFromRoute(){
  if(window.__SIM__?.setRoutePath && S.route?.coords?.length){
    window.__SIM__.setRoutePath(S.route.coords);
  }
}

/** Подтянуть GPS из симулятора, если ещё нет fix в state. */
export function simKickGps(){
  if(S.gps?.lat != null && S.gps?.lon != null) return true;
  const sim = window.__SIM__;
  if(!sim) return false;
  if(!sim.cb){
    try{ window.__motoHUD?.startGps?.(); }catch(e){}
  }
  try{
    const [lat, lon] = sim.start || [];
    if(lat != null && sim.injectFix){
      sim.injectFix({ lat, lon, speed: 0, heading: 0, acc: 5 });
    }
  }catch(e){}
  return !!(S.gps?.lat != null && S.gps?.lon != null);
}

/** Демо-финиш, если поле пустое (как __SIM__.boot). */
export function simEnsureDemoFinish(){
  if(S.finish?.lat != null) return { ok: true, existed: true };
  const inp = $('finish-input');
  if(inp?.dataset.userEdited === '1') return { ok: false, error: 'Финиш не задан' };
  if(inp && !inp.value.trim()){
    inp.value = DEMO_FINISH[0].toFixed(5) + ', ' + DEMO_FINISH[1].toFixed(5);
  }
  setFinishQuiet(DEMO_FINISH[0], DEMO_FINISH[1], 'Демо');
  return { ok: !!S.finish, demo: true };
}

/**
 * Применение темы из sim.html (внутри iframe).
 * @param {string} theme
 * @param {string} modePref
 */
export function simApplyTheme(theme, modePref){
  const tid = THEME_IDS.includes(theme) ? theme : 'avionics';
  const mp = MODE_PREFS.includes(modePref) ? modePref : 'night';
  applyTheme(tid, mp);
  const html = document.documentElement;
  const active = THEME_IDS.find(id => html.classList.contains('theme-' + id)) || tid;
  return {
    ok: active === tid,
    theme: active,
    modePref: mp,
    resolved: html.getAttribute('data-mode') || '?'
  };
}

function applyDirectSimRoute(){
  if(!S.gps?.lat || !S.finish?.lat) return null;
  const wps = [
    { lat: S.gps.lat, lon: S.gps.lon, label: 'Старт' },
    { lat: S.finish.lat, lon: S.finish.lon, label: S.finish.label || 'Финиш' }
  ];
  const route = buildDirectRouteFromWaypoints(wps);
  attachRouteFromImport(route, wps);
  refreshRouteUi();
  setGoBarVisible(true);
  syncSimPathFromRoute();
  if(S.routeAlternatives?.length){
    scheduleGeometryBuild(S.routeAlternatives, () => refreshRouteUi());
  }
  return route;
}

/**
 * Построение маршрута из sim (OSRM; при ошибке — прямая линия в sim=1).
 */
export async function simBuildRoute(){
  simKickGps();
  const fin = simEnsureDemoFinish();
  if(!S.gps?.lat) return { ok: false, error: 'Нет GPS — подождите загрузки симулятора' };
  if(!S.finish?.lat) return { ok: false, error: fin.error || 'Укажите финиш в меню' };

  try{
    await doBuildRoute();
    if(S.route?.coords?.length >= 2){
      syncSimPathFromRoute();
      return { ok: true, via: 'osrm', pts: S.route.coords.length };
    }
  }catch(e){
    if(!isSimPage()) return { ok: false, error: e.message || String(e) };
  }

  if(isSimPage()){
    const direct = applyDirectSimRoute();
    if(direct?.coords?.length >= 2){
      return {
        ok: true,
        via: 'direct',
        pts: direct.coords.length,
        warn: 'OSRM недоступен — прямая линия (sim)'
      };
    }
  }

  const errText = ($('route-info')?.textContent || $('s-finish')?.textContent || 'Маршрут не построен').replace(/^❌\s*/, '');
  return { ok: false, error: errText };
}

/**
 * Переключение режима навигации из эмулятора.
 * @param {'path'|'map'|'bearing'} kind
 */
export async function simNavAction(kind){
  const hud = $('hud');
  if(!hud?.classList.contains('on')){
    if(!S.gps || !S.finish){
      return { ok: false, error: 'Дождитесь GPS и укажите финиш в меню' };
    }
    await startHud();
    if(!$('hud')?.classList.contains('on')){
      return { ok: false, error: 'Не удалось запустить HUD' };
    }
  }

  revealHudChrome();

  if(kind === 'path'){
    onNavPathButton();
  }else if(kind === 'map'){
    onNavMapButton();
  }else if(kind === 'bearing'){
    if(isBearingMode()){
      exitBearingMode();
    }else{
      if(!S.finish) return { ok: false, error: 'Укажите финиш' };
      if(!S.gps) return { ok: false, error: 'Нет GPS' };
      if(!enterBearingMode({ quiet: true })){
        return { ok: false, error: 'Пеленг недоступен' };
      }
    }
  }else{
    return { ok: false, error: 'Неизвестный режим: ' + kind };
  }

  onTick();
  return { ok: true, navMode: S.navMode, viewMode: S.viewMode };
}

/** Снимок для панели sim. */
export function simGetStatus(){
  const html = document.documentElement;
  const theme = THEME_IDS.find(id => html.classList.contains('theme-' + id)) || '?';
  return {
    theme,
    mode: html.getAttribute('data-mode'),
    gps: !!(S.gps?.lat),
    finish: !!(S.finish?.lat),
    routePts: S.route?.geometry?.n || S.route?.coords?.length || 0,
    hudOn: !!$('hud')?.classList.contains('on')
  };
}
