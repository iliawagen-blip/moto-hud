/**
 * Абстракция маршрутизации: OSRM сейчас, Valhalla — после спайка (Фаза 4).
 * @module router
 */
import { S } from './state.js';

export const RouterBackend = { OSRM: 'osrm', VALHALLA: 'valhalla' };

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving/';

/** Текущий бэкенд (пока только OSRM) */
export function getRouterBackend(){
  return S.routerBackend || RouterBackend.OSRM;
}

/**
 * URL запроса маршрута.
 * @param {{ lon: number, lat: number }} from
 * @param {{ lon: number, lat: number }} to
 * @param {object} [opts]
 */
export function buildRouteRequestUrl(from, to, opts = {}){
  const backend = getRouterBackend();
  if(backend === RouterBackend.VALHALLA){
    throw new Error('Valhalla: не подключён (спайк Фаза 4)');
  }
  let url = OSRM_BASE + `${from.lon},${from.lat};${to.lon},${to.lat}` +
    '?overview=full&geometries=geojson&steps=true&annotations=false';
  if(opts.alternatives) url += '&alternatives=2';
  if(opts.rerouteBearing != null && opts.rerouteRadius != null){
    url += '&bearings=' + opts.rerouteBearing + ',45;&radiuses=' + opts.rerouteRadius + ';';
  }
  return url;
}

/** Разбор ответа роутера в массив маршрутов */
export function parseRouteResponse(json){
  if(!json?.routes?.length) throw new Error('Маршрут не найден');
  return json.routes;
}
