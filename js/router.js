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
 * @param {Array<{lon:number,lat:number}>} [opts.waypoints] — полная цепочка (from/to игнорируются)
 */
export function buildRouteRequestUrl(from, to, opts = {}){
  const backend = getRouterBackend();
  if(backend === RouterBackend.VALHALLA){
    throw new Error('Valhalla: не подключён (спайк Фаза 4)');
  }
  const pts = opts.waypoints?.length
    ? opts.waypoints
    : [from, to];
  const coordStr = pts.map(p => `${p.lon},${p.lat}`).join(';');
  let url = OSRM_BASE + coordStr +
    '?overview=full&geometries=geojson&steps=true&annotations=false';
  if(opts.alternatives) url += '&alternatives=2';
  if(opts.rerouteBearing != null && opts.rerouteRadius != null && pts.length === 2){
    url += '&bearings=' + opts.rerouteBearing + ',45;&radiuses=' + opts.rerouteRadius + ';';
  }
  return url;
}

/** Разбор ответа роутера в массив маршрутов */
export function parseRouteResponse(json){
  if(!json?.routes?.length) throw new Error('Маршрут не найден');
  return json.routes;
}
