/**
 * Leaflet-карта в HUD (режимы map_overview / map_zoom).
 * @module nav-map
 */
import L from 'leaflet';
import { S } from './state.js';
import { $ } from './util.js';
import { curPos } from './gps.js';
import { geometryToLatLngs, latLngsSliceByS, getNavSnap } from './route-geometry.js';
import { getMapProviderId, resolveMapLayers } from './map-providers.js';
import { findNextManeuver } from './route.js';

let _map = null;
let _tileLayer = null;
let _overlayLayer = null;
let _routeLayer = null;
let _posMarker = null;
let _finishMarker = null;
let _maneuverMarker = null;
let _overviewFit = false;
let _lastZoomPan = 0;

function routeLatLngs(){
  const route = S.route;
  if(!route) return [];
  if(route.geometry?.n > 1) return geometryToLatLngs(route.geometry);
  return (route.coords || []).map(c => [c[0], c[1]]);
}

function applyTiles(){
  if(!_map) return;
  const layers = resolveMapLayers(getMapProviderId());
  if(_tileLayer) _map.removeLayer(_tileLayer);
  if(_overlayLayer){ _map.removeLayer(_overlayLayer); _overlayLayer = null; }
  _tileLayer = L.tileLayer(layers.base.url, layers.base.opts).addTo(_map);
  if(layers.overlay){
    _overlayLayer = L.tileLayer(layers.overlay.url, layers.overlay.opts).addTo(_map);
  }
}

function ensureMap(){
  const box = $('nav-map-pane');
  if(!box) return null;
  if(!_map){
    box.innerHTML = '';
    _map = L.map(box, { zoomControl: false, attributionControl: false, preferCanvas: true });
    applyTiles();
    _routeLayer = L.polyline([], { color: '#ffd400', weight: 6 }).addTo(_map);
    _posMarker = L.circleMarker([0, 0], {
      radius: 8, color: '#fff', weight: 2, fillColor: '#3399ff', fillOpacity: 1
    }).addTo(_map);
    _finishMarker = L.circleMarker([0, 0], {
      radius: 7, color: '#fff', weight: 2, fillColor: '#39d353', fillOpacity: 1
    }).addTo(_map);
    _maneuverMarker = L.circleMarker([0, 0], {
      radius: 6, color: '#000', weight: 1, fillColor: '#ffd400', fillOpacity: 1
    }).addTo(_map);
  }
  return _map;
}

function remainingLatLngs(){
  const route = S.route;
  if(!route?.geometry?.n) return routeLatLngs();
  const snap = getNavSnap(S.smoothedHeading);
  const s0 = snap?.s ?? 0;
  return latLngsSliceByS(route.geometry, s0, route.geometry.s[route.geometry.n - 1]);
}

function fitOverview(){
  const map = ensureMap();
  if(!map) return;
  const pts = remainingLatLngs();
  const pos = curPos();
  if(pos) pts.push([pos.lat, pos.lon]);
  if(S.finish) pts.push([S.finish.lat, S.finish.lon]);
  if(pts.length < 1) return;
  map.fitBounds(L.latLngBounds(pts).pad(0.12), { padding: [40, 40], animate: false });
  _overviewFit = true;
}

/** @param {'map_overview'|'map_zoom'} mode */
export function syncNavMap(mode){
  const map = ensureMap();
  if(!map || !S.route) return;

  map.invalidateSize();
  if(typeof map.start === 'function') map.start();

  _routeLayer.setLatLngs(routeLatLngs());

  const pos = curPos();
  if(pos) _posMarker.setLatLng([pos.lat, pos.lon]);
  if(S.finish) _finishMarker.setLatLng([S.finish.lat, S.finish.lon]);

  const nm = findNextManeuver();
  if(nm?.step){
    _maneuverMarker.setLatLng([nm.step.lat, nm.step.lon]);
    _maneuverMarker.setStyle({ opacity: 1, fillOpacity: 1 });
  }else{
    _maneuverMarker.setStyle({ opacity: 0, fillOpacity: 0 });
  }

  if(mode === 'map_overview'){
    if(!_overviewFit) fitOverview();
  }else if(mode === 'map_zoom' && pos){
    const now = Date.now();
    if(now - _lastZoomPan > 2000){
      map.setView([pos.lat, pos.lon], 17, { animate: false });
      _lastZoomPan = now;
    }else{
      map.panTo([pos.lat, pos.lon], { animate: false });
    }
  }
}

export function pauseNavMap(){
  if(_map && typeof _map.stop === 'function') _map.stop();
  _overviewFit = false;
}

export function destroyNavMap(){
  pauseNavMap();
  if(_map){
    _map.remove();
    _map = null;
    _tileLayer = null;
    _routeLayer = null;
    _posMarker = null;
    _finishMarker = null;
    _maneuverMarker = null;
  }
  const box = $('nav-map-pane');
  if(box) box.innerHTML = '';
}

export function tickNavMap(){
  if(S.viewMode === 'hud' || !S.route) return;
  syncNavMap(S.viewMode);
}
