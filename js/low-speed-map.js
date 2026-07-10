/**
 * Автокарта крупным планом вне маршрута (дворы, парковки).
 * На дороге карта только вручную (двойной тап).
 * @module low-speed-map
 */
import { S, DEFAULT_PATH_MIN_SPEED_KMH, MAX_PATH_MIN_SPEED_KMH } from './state.js';
import { $ } from './util.js';
import { OFF_ROUTE_EXIT_M, OFF_ROAD_MAP_ENTER_MS } from './nav-constants.js';
import { SnapQuality } from './snap-quality.js';
import { OffRouteState } from './offroute.js';
import { isBearingMode } from './bearing-mode.js';
import { setViewMode } from './view-mode.js';
import { tickNavMap } from './nav-map.js';
import telemetry from './telemetry.js';

let _autoActive = false;
let _userPinned = false;
let _offRoadSince = 0;

function canUseLowSpeedMap(waitConverge){
  return !!$('hud')?.classList.contains('on') && !!S.route && !waitConverge && !isBearingMode();
}

/**
 * На маршруте с нормальным snap — прогноз-дорожка, без автокарты.
 * @param {{ lateral?: number | null }} [ctx]
 */
export function isNavOnRoad(ctx = {}){
  if(!S.route?.geometry) return false;
  const lat = ctx.lateral;
  if(S.offRouteState === OffRouteState.OFFLINE_GUIDE) return false;
  if(S.offRouteState === OffRouteState.SUSPECT) return false;
  if(S.snapQuality === SnapQuality.LOST) return false;
  if(lat != null && lat > OFF_ROUTE_EXIT_M) return false;
  if(S.snapQuality === SnapQuality.GOOD) return true;
  if(S.snapQuality === SnapQuality.DEGRADED && lat != null && lat <= OFF_ROUTE_EXIT_M) return true;
  return false;
}

function shouldEnterOffRoadMap(ctx, waitConverge){
  if(S.lowSpeedMap === false || !canUseLowSpeedMap(waitConverge) || _userPinned) return false;
  if(isNavOnRoad(ctx)){
    _offRoadSince = 0;
    return false;
  }
  const now = Date.now();
  if(!_offRoadSince) _offRoadSince = now;
  return now - _offRoadSince >= OFF_ROAD_MAP_ENTER_MS;
}

function shouldExitOffRoadMap(ctx){
  return isNavOnRoad(ctx);
}

function logAutoMap(on, ctx){
  if(!telemetry.isActive?.()) return;
  telemetry.log('nav', {
    sub: 'view_auto_map',
    on,
    lateral: ctx.lateral != null ? Math.round(ctx.lateral) : null,
    snap: S.snapQuality,
    off: S.offRouteState
  });
}

/**
 * @param {number} kmh — для телеметрии / совместимости
 * @param {boolean} waitConverge
 * @param {{ lateral?: number | null }} [ctx]
 */
export function tickLowSpeedMap(kmh, waitConverge, ctx = {}){
  if(S.lowSpeedMap === false){
    if(_autoActive){
      _autoActive = false;
      _offRoadSince = 0;
      setViewMode('hud');
    }
    return;
  }

  if(shouldEnterOffRoadMap(ctx, waitConverge)){
    if(S.viewMode === 'hud' || _autoActive){
      setViewMode('map_zoom');
      if(!_autoActive) logAutoMap(true, ctx);
      _autoActive = true;
    }
  }else if(_autoActive && shouldExitOffRoadMap(ctx)){
    setViewMode('hud');
    logAutoMap(false, ctx);
    _autoActive = false;
    _userPinned = false;
    _offRoadSince = 0;
  }

  if(S.viewMode !== 'hud') tickNavMap();
}

/** Пользователь переключил вид двойным тапом — не мешать автокарте во дворе. */
export function onUserViewModeChange(){
  if(_autoActive) _userPinned = true;
}

export function isAutoMapActive(){
  return _autoActive;
}

export function resetLowSpeedMap(){
  _autoActive = false;
  _userPinned = false;
  _offRoadSince = 0;
}

/** @deprecated — для миграции старых настроек */
export function clampPathMinSpeedKmh(n){
  const v = parseInt(n, 10);
  if(!Number.isFinite(v)) return DEFAULT_PATH_MIN_SPEED_KMH;
  return Math.max(0, Math.min(MAX_PATH_MIN_SPEED_KMH, v));
}

/** @deprecated дорожка больше не скрывается по скорости на дороге */
export function getPathMinSpeedKmh(){
  return 0;
}
