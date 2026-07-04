import L from 'leaflet';
import { $ } from './util.js';
import { haversine } from './geo.js';
import { getElevProfileLenM } from './elevation.js';
import { geometryToLatLngs, latLngsSliceByS } from './route-geometry.js';
import {
  MAP_PROVIDERS, getMapProviderId, saveMapProviderId, getMapProvider
} from './map-providers.js';

let _onSelect = null;
let _map = null;
let _tileLayer = null;
let _routeLayers = [];
let _hudWindowLayers = [];
let _markers = [];
let _lastRender = null;

const ROUTE_COLORS = ['#00ff88', '#66ccff', '#ffd400'];

function clearLayers(){
  if(!_map) return;
  _routeLayers.forEach(l => _map.removeLayer(l));
  _hudWindowLayers.forEach(l => _map.removeLayer(l));
  _markers.forEach(m => _map.removeLayer(m));
  _routeLayers = [];
  _hudWindowLayers = [];
  _markers = [];
}

function routePolylineLatLngs(route){
  if(route?.geometry?.n > 1) return geometryToLatLngs(route.geometry);
  const coords = route?.coords;
  if(!coords?.length) return [];
  return coords.map(c => [c[0], c[1]]);
}

/** Участок маршрута [startS … startS+maxM] для подсветки «окна HUD» */
function latLngsForDistance(route, maxM, startS){
  const geom = route?.geometry;
  if(geom?.n > 1){
    return latLngsSliceByS(geom, startS || 0, (startS || 0) + maxM);
  }
  const coords = route?.coords;
  if(!coords || coords.length < 2) return [];
  const out = [[coords[0][0], coords[0][1]]];
  let acc = 0;
  for(let i = 0; i < coords.length - 1 && acc < maxM; i++){
    const a = { lat: coords[i][0], lon: coords[i][1] };
    const b = { lat: coords[i + 1][0], lon: coords[i + 1][1] };
    const seg = haversine(a, b);
    if(acc + seg >= maxM){
      const t = (maxM - acc) / seg;
      out.push([a.lat + t * (b.lat - a.lat), a.lon + t * (b.lon - a.lon)]);
      break;
    }
    acc += seg;
    out.push([b.lat, b.lon]);
  }
  return out;
}

function applyTileLayer(id){
  const prov = getMapProvider(id);
  if(!_map) return;
  if(_tileLayer) _map.removeLayer(_tileLayer);
  _tileLayer = L.tileLayer(prov.url, prov.opts);
  _tileLayer.addTo(_map);
}

function ensureMap(){
  const box = $('route-map');
  if(!box) return null;
  if(!_map){
    box.innerHTML = '';
    _map = L.map(box, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true
    });
    applyTileLayer(getMapProviderId());
  }
  return _map;
}

/** Заполнить и привязать селектор подложки карты */
export function initMapProviderSelect(onChange){
  const sel = $('opt-map');
  if(!sel) return;
  sel.innerHTML = Object.values(MAP_PROVIDERS).map(p =>
    '<option value="' + p.id + '">' + p.name + '</option>'
  ).join('');
  sel.value = getMapProviderId();
  sel.addEventListener('change', () => {
    saveMapProviderId(sel.value);
    applyTileLayer(sel.value);
    if(_lastRender){
      renderRouteMap(_lastRender.alternatives, _lastRender.selectedIdx,
        _lastRender.start, _lastRender.finish);
    }
    if(onChange) onChange(sel.value);
  });
}

export function getSelectedMapProviderId(){
  return $('opt-map')?.value || getMapProviderId();
}

/** Отрисовка вариантов маршрута на интерактивной карте Leaflet */
export function renderRouteMap(alternatives, selectedIdx, start, finish){
  const section = $('route-section');
  if(!section) return;

  if(!alternatives || !alternatives.length){
    section.classList.add('hidden');
    clearLayers();
    _lastRender = null;
    return;
  }

  _lastRender = { alternatives, selectedIdx, start, finish };
  section.classList.remove('hidden');

  const map = ensureMap();
  if(!map) return;

  clearLayers();

  const bounds = L.latLngBounds([]);

  alternatives.forEach((r, i) => {
    const latlngs = routePolylineLatLngs(r);
    latlngs.forEach(ll => bounds.extend(ll));
    const sel = i === selectedIdx;
    const layer = L.polyline(latlngs, {
      color: ROUTE_COLORS[i % ROUTE_COLORS.length],
      weight: sel ? 7 : 4,
      opacity: sel ? 1 : 0.45,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
    layer.on('click', () => { if(_onSelect) _onSelect(i); });
    _routeLayers.push(layer);

    if(sel){
      const hudLenM = getElevProfileLenM();
      const hudWin = latLngsForDistance(r, hudLenM, 0);
      if(hudWin.length > 1){
        const glow = L.polyline(hudWin, {
          color: '#ffffff',
          weight: 11,
          opacity: 0.28,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
        const core = L.polyline(hudWin, {
          color: ROUTE_COLORS[i % ROUTE_COLORS.length],
          weight: 5,
          opacity: 0.95,
          dashArray: '10,8',
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map).bindTooltip('Окно HUD ~' + (hudLenM / 1000) + ' км', { direction: 'top', sticky: true });
        _hudWindowLayers.push(glow, core);
      }
    }
  });

  if(start){
    const m = L.circleMarker([start.lat, start.lon], {
      radius: 9, color: '#000', weight: 2,
      fillColor: '#39d353', fillOpacity: 1
    }).addTo(map).bindTooltip('Вы', { permanent: false, direction: 'top' });
    bounds.extend([start.lat, start.lon]);
    _markers.push(m);
  }
  if(finish){
    const m = L.circleMarker([finish.lat, finish.lon], {
      radius: 9, color: '#000', weight: 2,
      fillColor: '#ffd400', fillOpacity: 1
    }).addTo(map).bindTooltip('Финиш', { permanent: false, direction: 'top' });
    bounds.extend([finish.lat, finish.lon]);
    _markers.push(m);
  }

  if(bounds.isValid()){
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
  }
  setTimeout(() => map.invalidateSize(), 120);
}

/** Список-кнопки выбора варианта маршрута */
export function renderRouteAlts(alternatives, selectedIdx, onPick){
  const box = $('route-alts');
  if(!box) return;
  if(!alternatives || !alternatives.length){ box.innerHTML = ''; return; }

  box.innerHTML = alternatives.map((r, i) => {
    const km = (r.distance / 1000).toFixed(1);
    const min = Math.max(1, Math.round(r.duration / 60));
    const sel = i === selectedIdx;
    const col = ROUTE_COLORS[i % ROUTE_COLORS.length];
    return '<button type="button" class="route-alt' + (sel ? ' sel' : '') + '" data-ri="' + i + '">' +
      '<span class="ra-dot" style="background:' + col + '"></span>' +
      '<span class="ra-main">Вариант ' + (i + 1) + '</span>' +
      '<span class="ra-meta">' + km + ' км · ~' + min + ' мин</span>' +
      '</button>';
  }).join('');

  box.querySelectorAll('.route-alt').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.getAttribute('data-ri'), 10);
      if(!isNaN(idx)) onPick(idx);
    });
  });
}

export function setRouteMapSelectHandler(fn){ _onSelect = fn; }

export function updateRouteInfo(route){
  const el = $('route-info');
  if(!el || !route){ if(el) el.textContent = ''; return; }
  const km = (route.distance / 1000).toFixed(1);
  const min = Math.max(1, Math.round(route.duration / 60));
  el.textContent = '✅ ' + km + ' км · ~' + min + ' мин до финиша';
  el.className = 'route-info ok';
}

export function clearRouteMap(){
  $('route-section')?.classList.add('hidden');
  clearLayers();
  _lastRender = null;
  if($('route-alts')) $('route-alts').innerHTML = '';
  if($('route-info')){ $('route-info').textContent = ''; $('route-info').className = 'route-info'; }
}

/** Пересчёт размера карты при повороте экрана */
export function invalidateRouteMapSize(){
  if(_map) setTimeout(() => _map.invalidateSize(), 150);
}
