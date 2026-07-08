/**
 * HUD ↔ карта: двойной тап, три режима (16).
 * @module view-mode
 */
import { S } from './state.js';
import { $ } from './util.js';
import { onHudTap } from './hud-chrome.js';
import { syncNavMap, pauseNavMap, tickNavMap, destroyNavMap } from './nav-map.js';

const DBL_TAP_MS = 400;
const DBL_TAP_MAX_PX = 40;
const VIEW_ORDER = ['hud', 'map_overview', 'map_zoom'];

let _lastTap = { t: 0, x: 0, y: 0 };
let _bound = false;

function isExcludedTarget(el){
  if(!el || !(el instanceof Element)) return true;
  return !!el.closest('.corner-btn, .statusbar, #camAlert, #fuelPanel, #quickFinish, #offRouteWarn, #gps-converge, .legal-modal');
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
}

export function cycleViewMode(){
  const i = VIEW_ORDER.indexOf(S.viewMode || 'hud');
  setViewMode(VIEW_ORDER[(i + 1) % VIEW_ORDER.length]);
}

function onTouchEnd(e){
  if(!document.getElementById('hud')?.classList.contains('on')) return;
  const t = e.changedTouches?.[0];
  if(!t || isExcludedTarget(t.target)) return;
  const now = Date.now();
  const dt = now - _lastTap.t;
  const dist = Math.hypot(t.clientX - _lastTap.x, t.clientY - _lastTap.y);
  if(dt < DBL_TAP_MS && dist < DBL_TAP_MAX_PX){
    cycleViewMode();
    _lastTap.t = 0;
    e.preventDefault();
    return;
  }
  _lastTap = { t: now, x: t.clientX, y: t.clientY };
  onHudTap();
}

export function initViewMode(){
  if(_bound) return;
  const hud = $('hud');
  if(!hud) return;
  hud.addEventListener('touchend', onTouchEnd, { passive: false });
  _bound = true;
  S.viewMode = 'hud';
}

export function resetViewMode(){
  setViewMode('hud');
  destroyNavMap();
}

export { tickNavMap };
