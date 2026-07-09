/**
 * Автокарта крупным планом ниже порога скорости (дворы, парковки).
 * @module low-speed-map
 */
import { S } from './state.js';
import { $ } from './util.js';
import { DEFAULT_PATH_MIN_SPEED_KMH, MAX_PATH_MIN_SPEED_KMH } from './state.js';
import { LOW_SPEED_MAP_EXIT_PAD_KMH } from './nav-constants.js';
import { setViewMode } from './view-mode.js';
import { tickNavMap } from './nav-map.js';

let _autoActive = false;
let _userPinned = false;

export function clampPathMinSpeedKmh(n){
  const v = parseInt(n, 10);
  if(!Number.isFinite(v)) return DEFAULT_PATH_MIN_SPEED_KMH;
  return Math.max(0, Math.min(MAX_PATH_MIN_SPEED_KMH, v));
}

export function getPathMinSpeedKmh(){
  return clampPathMinSpeedKmh(S.pathMinSpeedKmh);
}

function canUseLowSpeedMap(waitConverge){
  return !!$('hud')?.classList.contains('on') && !!S.route && !waitConverge && !S.compassMode;
}

function shouldEnterLowSpeedMap(kmh, waitConverge){
  return S.lowSpeedMap !== false && canUseLowSpeedMap(waitConverge) && kmh < getPathMinSpeedKmh();
}

function shouldExitLowSpeedMap(kmh){
  return kmh >= getPathMinSpeedKmh() + LOW_SPEED_MAP_EXIT_PAD_KMH;
}

/**
 * @param {number} kmh
 * @param {boolean} waitConverge
 */
export function tickLowSpeedMap(kmh, waitConverge){
  if(!S.lowSpeedMap){
    if(_autoActive){
      _autoActive = false;
      setViewMode('hud');
    }
    return;
  }

  if(shouldEnterLowSpeedMap(kmh, waitConverge) && !_userPinned){
    if(S.viewMode === 'hud' || _autoActive){
      setViewMode('map_zoom');
      _autoActive = true;
    }
  }else if(_autoActive && shouldExitLowSpeedMap(kmh)){
    setViewMode('hud');
    _autoActive = false;
    _userPinned = false;
  }

  if(S.viewMode !== 'hud') tickNavMap();
}

/** Пользователь переключил вид двойным тапом — не мешать до разгона. */
export function onUserViewModeChange(){
  if(_autoActive) _userPinned = true;
}

export function resetLowSpeedMap(){
  _autoActive = false;
  _userPinned = false;
}
