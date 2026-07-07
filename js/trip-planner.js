/**
 * Применение сегмента плана к навигации Moto HUD.
 */
import { S } from './state.js';
import { parseRtext, auditSegment } from './trip-model.js';
import { fetchRouteThroughWaypoints, attachRouteFromImport, buildDirectRouteFromWaypoints } from './route.js';
import { openYandexNavigator } from './yandex-export.js';
import { serializeGpxTrack } from './gpx.js';

/**
 * @param {{ label: string, rtext: string }} segment
 * @param {'osrm'|'direct'} [mode]
 */
export async function applyTripSegment(segment, mode = 'osrm'){
  const waypoints = parseRtext(segment.rtext);
  if(waypoints.length < 2) throw new Error('Нужно ≥2 точек в сегменте');
  let route;
  if(mode === 'direct'){
    route = buildDirectRouteFromWaypoints(waypoints);
  } else {
    route = await fetchRouteThroughWaypoints(waypoints);
  }
  attachRouteFromImport(route, waypoints);
  const { refreshRouteUi } = await import('./setup.js');
  refreshRouteUi();
  return route;
}

export function setTripContext(ctx){
  S.tripContext = ctx;
}

export function clearTripContext(){
  S.tripContext = null;
}

export function getTripContext(){
  return S.tripContext;
}

export function openSegmentInYandex(segment){
  const waypoints = parseRtext(segment.rtext);
  openYandexNavigator({ coords: waypoints.map(w => [w.lat, w.lon]) }, S.gps);
}

export function downloadSegmentGpx(segment, name){
  const pts = parseRtext(segment.rtext);
  if(pts.length < 2) return false;
  const ts = Date.now();
  const track = pts.map((p, i) => ({ ...p, ts: ts + i * 60000 }));
  const xml = serializeGpxTrack(track, name || segment.label);
  const blob = new Blob([xml], { type: 'application/gpx+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (name || 'segment').replace(/[^\w\-а-яА-ЯёЁ]+/g, '_') + '.gpx';
  a.click();
  URL.revokeObjectURL(a.href);
  return true;
}

export function formatSegmentAudit(segment){
  const a = auditSegment(segment.rtext);
  if(a.ok) return `~${a.km} км`;
  return `~${a.km} км ⚠ ${a.warnings[0]}`;
}
