/**
 * Ограничения waypoints для внешних routing API.
 * GraphHopper Directions API: не более 5 точек на один запрос /route.
 */
export const GRAPHHOPPER_MAX_POINTS = 5;

/**
 * Урезание маршрута до maxPoints: сохраняются start, finish и равномерно распределённые via.
 * @param {Array<{lat:number,lon:number,label?:string}>} waypoints
 * @param {number} [maxPoints]
 * @returns {Array<{lat:number,lon:number,label?:string}>}
 */
export function downsampleWaypoints(waypoints, maxPoints = GRAPHHOPPER_MAX_POINTS){
  if(!waypoints?.length || waypoints.length <= maxPoints) return waypoints;
  if(maxPoints < 2) return [waypoints[0]];

  const last = waypoints.length - 1;
  const indices = new Set([0, last]);
  const interior = maxPoints - 2;
  for(let i = 1; i <= interior; i++){
    indices.add(Math.round(i * last / (maxPoints - 1)));
  }
  return [...indices].sort((a, b) => a - b).map(i => waypoints[i]);
}

/**
 * Waypoints для запроса GraphHopper (не более 5 точек).
 * @param {Array<{lat:number,lon:number,label?:string}>} waypoints
 * @param {number} [maxPoints]
 */
export function waypointsForGraphhopper(waypoints, maxPoints = GRAPHHOPPER_MAX_POINTS){
  return downsampleWaypoints(waypoints, maxPoints);
}
