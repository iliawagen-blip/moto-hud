/**
 * HUD ↔ карта: двойной тап / двойной клик, три режима (16).
 * @module view-mode
 */
import { S } from './state.js';
import { $ } from './util.js';
import { onHudTap } from './hud-chrome.js';
import { syncNavMap, pauseNavMap, tickNavMap, destroyNavMap } from './nav-map.js';
import { onUserViewModeChange, resetLowSpeedMap } from './low-speed-map.js';
import { isBearingMode, syncNavButtons } from './bearing-mode.js';

const DBL_TAP_MS = 400;
const DBL_TAP_MAX_PX = 40;
const VIEW_ORDER = ['hud', 'map_overview', 'map_zoom'];

let _lastTap = { t: 0, x: 0, y: 0 };
let _lastTouchEnd = 0;
let _bound = false;

function isExcludedTarget(el){
  if(!el || !(el instanceof Element)) return true;
  return !!el.closest(
    '.hud-btn, .corner-btn, .statusbar, #camAlert, #fuelPanel, #quickFinish, #offRouteWarn, #gps-converge, .legal-modal, #hud-settings-sheet, .hud-settings-sheet'
  );
}

/** На десктопе клик по скорости/дистанции не должен открывать хром HUD. */
function isChromeTapTarget(el){
  if(!el || !(el instanceof Element)) return false;
  if(isExcludedTarget(el)) return false;
  if(window.matchMedia('(pointer: fine)').matches &&
     el.closest('.speed-stack, .mdist, .block-path, .block-arrow')){
    return false;
  }
  return true;
}

function applyViewLayout(mode){
  const hud = $('hud');
  if(!hud) return;
  hud.classList.remove('view-map', 'view-map-overview', 'view-map-zoom');
  if(mode === 'hud'){
    pauseNavMap();
    return;
  }
  hud.classList.add('view-map');
  hud.classList.add(mode === 'map_zoom' ? 'view-map-zoom' : 'view-map-overview');
  syncNavMap(mode);
}

export function setViewMode(mode){
  const m = VIEW_ORDER.includes(mode) ? mode : 'hud';
  S.viewMode = m;
  applyViewLayout(m);
  syncNavButtons();
}

export function cycleViewMode(){
  if(isBearingMode()) return;
  onUserViewModeChange();
  const i = VIEW_ORDER.indexOf(S.viewMode || 'hud');
  setViewMode(VIEW_ORDER[(i + 1) % VIEW_ORDER.length]);
}

function registerTap(clientX, clientY, target, preventDefault){
  if(!document.getElementById('hud')?.classList.contains('on')) return false;
  if(isExcludedTarget(target)) return false;
  const now = Date.now();
  const dt = now - _lastTap.t;
  const dist = Math.hypot(clientX - _lastTap.x, clientY - _lastTap.y);
  if(dt < DBL_TAP_MS && dist < DBL_TAP_MAX_PX){
    cycleViewMode();
    _lastTap.t = 0;
    if(preventDefault) preventDefault();
    return true;
  }
  _lastTap = { t: now, x: clientX, y: clientY };
  if(isChromeTapTarget(target)) onHudTap();
  return false;
}

function onTouchEnd(e){
  const t = e.changedTouches?.[0];
  if(!t) return;
  _lastTouchEnd = Date.now();
  if(registerTap(t.clientX, t.clientY, t.target, () => e.preventDefault())) return;
}

function onClick(e){
  if(e.button !== 0) return;
  if(Date.now() - _lastTouchEnd < 500) return;
  registerTap(e.clientX, e.clientY, e.target, null);
}

export function initViewMode(){
  if(_bound) return;
  const hud = $('hud');
  if(!hud) return;
  hud.addEventListener('touchend', onTouchEnd, { passive: false });
  hud.addEventListener('click', onClick);
  _bound = true;
  S.viewMode = 'hud';
}

export function resetViewMode(){
  resetLowSpeedMap();
  setViewMode('hud');
  destroyNavMap();
}

export { tickNavMap };
