/**
 * Оценка качества polyline / режим «компас на финиш».
 * @module route-quality
 */
import { ROUTE_LOW_AVG_SEG_M, ROUTE_LOW_MANEUVER_PER_KM } from './nav-constants.js';

export const RouteQuality = { OK: 'OK', LOW: 'LOW' };

/**
 * @param {object} route — с geometry
 * @returns {'OK'|'LOW'}
 */
export function assessRouteQuality(route){
  const geom = route?.geometry;
  if(!geom || geom.n < 2) return RouteQuality.OK;

  const totalM = geom.s[geom.n - 1] || 0;
  if(totalM < 500) return RouteQuality.OK;

  let segSum = 0;
  for(let i = 1; i < geom.n; i++) segSum += geom.s[i] - geom.s[i - 1];
  const avgSeg = segSum / Math.max(1, geom.n - 1);

  const maneuvers = geom.maneuvers?.length || 0;
  const perKm = totalM > 0 ? (maneuvers / totalM) * 1000 : 0;

  if(avgSeg < ROUTE_LOW_AVG_SEG_M || perKm > ROUTE_LOW_MANEUVER_PER_KM){
    return RouteQuality.LOW;
  }
  return RouteQuality.OK;
}
