/**
 * Синхронизация Leaflet при ручном режиме карты (двойной тап / КАРТ).
 * Автопоказ карты «во дворах» отключён — только ручное переключение viewMode.
 * @module low-speed-map
 */
import { S, DEFAULT_PATH_MIN_SPEED_KMH, MAX_PATH_MIN_SPEED_KMH } from './state.js';
import { $ } from './util.js';
import { OFF_ROUTE_EXIT_M } from './nav-constants.js';
import { SnapQuality } from './snap-quality.js';
import { OffRouteState } from './offroute.js';
import { tickNavMap } from './nav-map.js';

/**
 * На маршруте с нормальным snap — прогноз-дорожка (не «двор»).
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

/** @deprecated автокарта удалена */
export function tickLowSpeedMap(_kmh, _waitConverge, _ctx = {}){
  if(S.viewMode !== 'hud') tickNavMap();
}

/** @deprecated */
export function onUserViewModeChange(){}

/** @deprecated всегда false */
export function isAutoMapActive(){
  return false;
}

export function resetLowSpeedMap(){}

/** @deprecated */
export function clampPathMinSpeedKmh(n){
  const v = parseInt(n, 10);
  if(!Number.isFinite(v)) return DEFAULT_PATH_MIN_SPEED_KMH;
  return Math.max(0, Math.min(MAX_PATH_MIN_SPEED_KMH, v));
}

/** @deprecated */
export function getPathMinSpeedKmh(){
  return 0;
}
