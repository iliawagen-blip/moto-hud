/**
 * Карта рядом с телефоном в sim.html (десктоп).
 * Сборка: sim-map-module.js → sim-map.js (IIFE).
 */
import {
  MAP_PROVIDERS, MAP_PROVIDER_KEY, DEFAULT_MAP_PROVIDER,
  getMapProviderId, saveMapProviderId, listMapProviderIds, getMapProviderName,
  buildMapProviderSelectHtml, resolveMapLayers
} from './map-providers.js';

function geometryToLatLngs(geom){
  if(!geom?.n) return [];
  const out = [];
  for(let i = 0; i < geom.n; i++) out.push([geom.lat[i], geom.lon[i]]);
  return out;
}

let map = null;
let tileLayer = null;
let overlayLayer = null;
let routeLayer = null;
let simPathLayer = null;
let traveledLayer = null;
let posMarker = null;
let finishMarker = null;
let startMarker = null;
let lastRouteKey = '';
let lastSimPathKey = '';
let lastTraveledKey = '';
let lastStartKey = '';
let fittedOnce = false;
let pickStartMode = false;
let onStartPicked = null;
let currentProviderId = DEFAULT_MAP_PROVIDER;

function routeLatLngsFromState(S){
  const route = S?.route;
  if(!route) return [];
  if(route.geometry?.n > 1) return geometryToLatLngs(route.geometry);
  return (route.coords || []).map(c => [c[0], c[1]]);
}

function routeKey(S){
  const pts = routeLatLngsFromState(S);
  if(pts.length < 2) return '';
  const a = pts[0];
  const b = pts[pts.length - 1];
  return pts.length + ':' + a[0].toFixed(4) + ',' + a[1].toFixed(4) + ':' +
    b[0].toFixed(4) + ',' + b[1].toFixed(4);
}

function displayPos(frameWin){
  try{
    const pos = frameWin?.__motoHUD?.getMapDisplayPos?.();
    if(pos?.lat != null && pos?.lon != null) return pos;
  }catch(e){}
  try{
    const gps = frameWin?.__motoHUD?.S?.gps;
    if(gps?.lat != null && gps?.lon != null) return gps;
  }catch(e){}
  return null;
}

function extendBounds(bounds, lat, lon){
  if(lat == null || lon == null) return;
  try{
    bounds.extend([lat, lon]);
  }catch(e){}
}

function ensureLayers(){
  if(!map) return;
  if(!routeLayer){
    routeLayer = L.polyline([], { color: '#4dabf7', weight: 5, opacity: 0.85 }).addTo(map);
  }
  if(!simPathLayer){
    simPathLayer = L.polyline([], { color: '#8b949e', weight: 3, opacity: 0.35, dashArray: '6 8' }).addTo(map);
  }
  if(!traveledLayer){
    traveledLayer = L.polyline([], { color: '#ffd400', weight: 4, opacity: 0.75 }).addTo(map);
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

function flyToStart(lat, lon, zoom = 14){
  if(!map || lat == null || lon == null) return;
  map.setView([lat, lon], zoom, { animate: true });
}

function fitToContent(frameWin){
  if(!map || !window.L) return;
  const bounds = L.latLngBounds([]);
  let S = null;
  try{ S = frameWin?.__motoHUD?.S; }catch(e){}

  const routePts = routeLatLngsFromState(S);
  routePts.forEach(p => extendBounds(bounds, p[0], p[1]));

  let simPath = null;
  try{ simPath = frameWin?.__SIM__?.path; }catch(e){}
  if(simPath?.length >= 2){
    simPath.forEach(p => extendBounds(bounds, p[0], p[1]));
  }

  const pos = displayPos(frameWin);
  extendBounds(bounds, pos?.lat, pos?.lon);

  const fin = S?.finish;
  extendBounds(bounds, fin?.lat, fin?.lon);

  let start = null;
  try{ start = frameWin?.__SIM__?.start; }catch(e){}
  if(start) extendBounds(bounds, start[0], start[1]);

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

  const rk = routeKey(S);
  if(rk !== lastRouteKey){
    lastRouteKey = rk;
    const pts = routeLatLngsFromState(S);
    if(pts.length >= 2){
      routeLayer.setLatLngs(pts);
      routeLayer.setStyle({ opacity: 0.85 });
    } else {
      routeLayer.setLatLngs([]);
    }
    fittedOnce = false;
  }

  let simPath = null;
  try{ simPath = simApi?.path; }catch(e){}
  const spk = simPath?.length
    ? simPath.length + ':' + simPath[0][0].toFixed(4) + ':' + simPath[simPath.length - 1][0].toFixed(4)
    : '';
  if(spk !== lastSimPathKey){
    lastSimPathKey = spk;
    if(simPath?.length >= 2){
      simPathLayer.setLatLngs(simPath.map(p => [p[0], p[1]]));
    } else {
      simPathLayer.setLatLngs([]);
    }
    fittedOnce = false;
  }

  let traveled = null;
  try{ traveled = simApi?.traveledPath; }catch(e){}
  const tpk = traveled?.length
    ? traveled.length + ':' + traveled[traveled.length - 1][0].toFixed(5) + ',' + traveled[traveled.length - 1][1].toFixed(5)
    : '';
  if(tpk !== lastTraveledKey){
    lastTraveledKey = tpk;
    if(traveled?.length >= 2){
      traveledLayer.setLatLngs(traveled.map(p => [p[0], p[1]]));
    } else {
      traveledLayer.setLatLngs([]);
    }
  }

  let start = null;
  try{ start = simApi?.start; }catch(e){}
  const sk = start ? start[0].toFixed(5) + ',' + start[1].toFixed(5) : '';
  if(sk && sk !== lastStartKey) setStartMarker(start[0], start[1]);

  const pos = displayPos(frameWin);
  if(pos?.lat != null && pos?.lon != null){
    posMarker.setLatLng([pos.lat, pos.lon]);
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

  const hasContent = rk || simPath?.length >= 2 || pos || start;
  if(!fittedOnce && hasContent){
    fitToContent(frameWin);
  } else if(pos && fittedOnce){
    const z = map.getZoom();
    if(z >= 10) map.panTo([pos.lat, pos.lon], { animate: true, duration: 0.35 });
  }
}

function invalidateSize(){
  if(map) setTimeout(() => map.invalidateSize(), 80);
}

function resetFit(){
  fittedOnce = false;
  lastRouteKey = '';
  lastSimPathKey = '';
  lastTraveledKey = '';
}

function setPickStartMode(on, cb){
  pickStartMode = !!on;
  onStartPicked = typeof cb === 'function' ? cb : null;
  if(map){
    map.getContainer().style.cursor = pickStartMode ? 'crosshair' : '';
  }
}

function getDebugState(){
  const routePts = routeLayer?.getLatLngs?.() || [];
  const simPts = simPathLayer?.getLatLngs?.() || [];
  const traveledPts = traveledLayer?.getLatLngs?.() || [];
  const pos = posMarker?.getLatLng?.();
  return {
    routePts: routePts.length,
    simPts: simPts.length,
    traveledPts: traveledPts.length,
    pos: pos ? { lat: pos.lat, lon: pos.lng } : null,
    fittedOnce
  };
}

window.SimMap = {
  init,
  update,
  invalidateSize,
  resetFit,
  setMapProvider,
  setStartMarker,
  flyToStart,
  setPickStartMode,
  getDebugState,
  getProviderIds: listMapProviderIds,
  getProviderName: getMapProviderName,
  getCurrentProviderId: () => currentProviderId,
  buildProviderSelectHtml: () => buildMapProviderSelectHtml(currentProviderId)
};
