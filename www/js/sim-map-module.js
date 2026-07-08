/**
 * Карта рядом с телефоном в sim.html (десктоп).
 * Сборка: sim-map-module.js → sim-map.js (IIFE).
 */
import {
  MAP_PROVIDERS, MAP_PROVIDER_KEY, DEFAULT_MAP_PROVIDER,
  getMapProviderId, saveMapProviderId, listMapProviderIds, getMapProviderName,
  buildMapProviderSelectHtml, resolveMapLayers
} from './map-providers.js';

let map = null;
let tileLayer = null;
let overlayLayer = null;
let routeLayer = null;
let simPathLayer = null;
let posMarker = null;
let finishMarker = null;
let startMarker = null;
let lastRouteKey = '';
let lastSimPathKey = '';
let lastStartKey = '';
let fittedOnce = false;
let pickStartMode = false;
let onStartPicked = null;
let currentProviderId = DEFAULT_MAP_PROVIDER;

function routeKey(coords){
  if(!coords?.length) return '';
  const a = coords[0];
  const b = coords[coords.length - 1];
  return coords.length + ':' + a[0].toFixed(4) + ',' + a[1].toFixed(4) + ':' +
    b[0].toFixed(4) + ',' + b[1].toFixed(4);
}

function ensureLayers(){
  if(!map) return;
  if(!routeLayer){
    routeLayer = L.polyline([], { color: '#4dabf7', weight: 5, opacity: 0.85 }).addTo(map);
  }
  if(!simPathLayer){
    simPathLayer = L.polyline([], { color: '#8b949e', weight: 3, opacity: 0.45, dashArray: '6 8' }).addTo(map);
  }
  if(!posMarker){
    posMarker = L.circleMarker([0, 0], {
      radius: 9, color: '#ffd400', weight: 3, fillColor: '#ffd400', fillOpacity: 0.9
    }).addTo(map);
  }
  if(!finishMarker){
    finishMarker = L.circleMarker([0, 0], {
      radius: 8, color: '#ff6b6b', weight: 2, fillColor: '#ff6b6b', fillOpacity: 0.75
    }).addTo(map);
  }
  if(!startMarker){
    startMarker = L.circleMarker([55.757, 37.616], {
      radius: 10, color: '#39d353', weight: 3, fillColor: '#39d353', fillOpacity: 0.85
    }).addTo(map);
    startMarker.bindTooltip('Старт маршрута', { direction: 'top', permanent: false });
  }
}

function setStartMarker(lat, lon){
  if(!startMarker) return;
  if(lat == null || lon == null){
    startMarker.setStyle({ opacity: 0, fillOpacity: 0 });
    return;
  }
  startMarker.setLatLng([lat, lon]);
  startMarker.setStyle({ opacity: 1, fillOpacity: 0.85 });
  lastStartKey = lat.toFixed(5) + ',' + lon.toFixed(5);
}

function fitToContent(){
  if(!map || !window.L) return;
  const bounds = L.latLngBounds([]);
  [routeLayer, simPathLayer, posMarker, finishMarker, startMarker].forEach(layer => {
    if(!layer) return;
    try{
      const b = layer.getBounds?.();
      if(b?.isValid()) bounds.extend(b);
    }catch(e){}
  });
  if(bounds.isValid()){
    map.fitBounds(bounds.pad(0.12), { animate: false, maxZoom: 15 });
    fittedOnce = true;
  }
}

function setMapProvider(id){
  if(!map || !MAP_PROVIDERS[id]) return false;
  currentProviderId = id;
  saveMapProviderId(id);
  const layers = resolveMapLayers(id);
  if(tileLayer) map.removeLayer(tileLayer);
  if(overlayLayer){ map.removeLayer(overlayLayer); overlayLayer = null; }
  tileLayer = L.tileLayer(layers.base.url, layers.base.opts).addTo(map);
  if(layers.overlay){
    overlayLayer = L.tileLayer(layers.overlay.url, layers.overlay.opts).addTo(map);
  }
  tileLayer.bringToBack();
  if(overlayLayer) overlayLayer.bringToFront();
  return true;
}

function onMapClick(e){
  if(!pickStartMode || !e?.latlng) return;
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;
  setStartMarker(lat, lon);
  if(typeof onStartPicked === 'function') onStartPicked(lat, lon);
}

function init(container){
  if(!window.L || !container || map) return;
  map = L.map(container, { zoomControl: true, attributionControl: false, preferCanvas: true });
  currentProviderId = getMapProviderId();
  setMapProvider(currentProviderId);
  map.setView([55.757, 37.616], 13);
  map.on('click', onMapClick);
  ensureLayers();
  setTimeout(() => map.invalidateSize(), 120);
}

function update(frameWin){
  if(!map || !frameWin) return;
  let S = null;
  let simApi = null;
  try{
    S = frameWin.__motoHUD?.S;
    simApi = frameWin.__SIM__;
  }catch(e){ return; }

  ensureLayers();

  const coords = S?.route?.coords;
  const rk = routeKey(coords);
  if(rk !== lastRouteKey){
    lastRouteKey = rk;
    if(coords?.length >= 2){
      routeLayer.setLatLngs(coords.map(c => [c[0], c[1]]));
      routeLayer.setStyle({ opacity: 0.85 });
    } else {
      routeLayer.setLatLngs([]);
    }
    fittedOnce = false;
  }

  let simPath = null;
  try{ simPath = simApi?.path; }catch(e){}
  const spk = simPath?.length ? simPath.length + ':' + simPath[0][0].toFixed(4) : '';
  if(spk !== lastSimPathKey){
    lastSimPathKey = spk;
    if(simPath?.length >= 2){
      simPathLayer.setLatLngs(simPath.map(p => [p[0], p[1]]));
    } else {
      simPathLayer.setLatLngs([]);
    }
    fittedOnce = false;
  }

  let start = null;
  try{ start = simApi?.start; }catch(e){}
  const sk = start ? start[0].toFixed(5) + ',' + start[1].toFixed(5) : '';
  if(sk && sk !== lastStartKey) setStartMarker(start[0], start[1]);

  const gps = S?.gps;
  if(gps?.lat != null && gps?.lon != null){
    posMarker.setLatLng([gps.lat, gps.lon]);
    posMarker.setStyle({ opacity: 1, fillOpacity: 0.9 });
  } else {
    posMarker.setStyle({ opacity: 0, fillOpacity: 0 });
  }

  const fin = S?.finish;
  if(fin?.lat != null && fin?.lon != null){
    finishMarker.setLatLng([fin.lat, fin.lon]);
    finishMarker.setStyle({ opacity: 1, fillOpacity: 0.75 });
  } else {
    finishMarker.setStyle({ opacity: 0, fillOpacity: 0 });
  }

  if(!fittedOnce && (coords?.length >= 2 || simPath?.length >= 2 || gps || start)){
    fitToContent();
  } else if(gps && S?.route && fittedOnce){
    const z = map.getZoom();
    if(z >= 10) map.panTo([gps.lat, gps.lon], { animate: true, duration: 0.35 });
  }
}

function invalidateSize(){
  if(map) setTimeout(() => map.invalidateSize(), 80);
}

function resetFit(){
  fittedOnce = false;
}

function setPickStartMode(on, cb){
  pickStartMode = !!on;
  onStartPicked = typeof cb === 'function' ? cb : null;
  if(map){
    map.getContainer().style.cursor = pickStartMode ? 'crosshair' : '';
  }
}

window.SimMap = {
  init,
  update,
  invalidateSize,
  resetFit,
  setMapProvider,
  setStartMarker,
  setPickStartMode,
  getProviderIds: listMapProviderIds,
  getProviderName: getMapProviderName,
  getCurrentProviderId: () => currentProviderId,
  buildProviderSelectHtml: () => buildMapProviderSelectHtml(currentProviderId)
};
