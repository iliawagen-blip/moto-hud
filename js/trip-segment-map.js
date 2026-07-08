/**
 * Редактор waypoints сегмента на карте Leaflet.
 * @module trip-segment-map
 */
import L from 'leaflet';
import { $ } from './util.js';
import { parseRtext, rtextFromPoints, auditSegment } from './trip-model.js';
import { getMapProviderId, resolveMapLayers } from './map-providers.js';

/** @type {{ trip: object, dayN: number, segIdx: number, variantId: string, segment: object, onSaved: Function }|null} */
let _ctx = null;
let _map = null;
let _tileLayer = null;
let _markers = [];
let _line = null;

function destroyMap(){
  if(_map){
    _map.remove();
    _map = null;
  }
  _tileLayer = null;
  _markers = [];
  _line = null;
}

function applyTiles(){
  if(!_map) return;
  const layers = resolveMapLayers(getMapProviderId());
  if(_tileLayer) _map.removeLayer(_tileLayer);
  _tileLayer = L.tileLayer(layers.base.url, layers.base.opts).addTo(_map);
}

function markerLabel(i, total){
  if(i === 0) return 'Старт';
  if(i === total - 1) return 'Финиш';
  return `Точка ${i + 1}`;
}

function syncPolyline(){
  const latlngs = _markers.map(m => m.getLatLng());
  if(_line) _line.setLatLngs(latlngs);
  else if(_map && latlngs.length){
    _line = L.polyline(latlngs, { color: '#4dabf7', weight: 4, opacity: 0.9 }).addTo(_map);
  }
  const n = $('trip-seg-map-count');
  if(n) n.textContent = `${latlngs.length} точек`;
}

function addMarker(lat, lon, label, draggable = true){
  if(!_map) return null;
  const idx = _markers.length;
  const m = L.marker([lat, lon], { draggable });
  m._wpLabel = label || markerLabel(idx, idx + 1);
  m.bindTooltip(m._wpLabel, { permanent: true, direction: 'top', className: 'trip-map-lbl' });
  m.on('drag', syncPolyline);
  m.on('dragend', () => {
    m._wpLabel = markerLabel(_markers.indexOf(m), _markers.length);
    m.setTooltipContent(m._wpLabel);
  });
  m.addTo(_map);
  _markers.push(m);
  syncPolyline();
  return m;
}

function pointsFromMarkers(){
  return _markers.map((m, i) => ({
    lat: m.getLatLng().lat,
    lon: m.getLatLng().lng,
    label: m._wpLabel || markerLabel(i, _markers.length)
  }));
}

function fitBounds(){
  if(!_map || !_markers.length) return;
  if(_markers.length === 1){
    _map.setView(_markers[0].getLatLng(), 10);
    return;
  }
  const g = L.featureGroup(_markers);
  _map.fitBounds(g.getBounds().pad(0.15));
}

function initMap(segment){
  const box = $('trip-seg-map');
  if(!box) return;
  destroyMap();
  box.innerHTML = '';
  _map = L.map(box, { zoomControl: true, attributionControl: false, preferCanvas: true });
  applyTiles();
  const pts = parseRtext(segment.rtext);
  if(!pts.length){
    _map.setView([55.75, 37.62], 6);
    _map.on('click', onMapClick);
    return;
  }
  pts.forEach((p, i) => addMarker(p.lat, p.lon, p.label || markerLabel(i, pts.length)));
  fitBounds();
  _map.on('click', onMapClick);
}

function onMapClick(e){
  if(!_map || !_ctx) return;
  const n = _markers.length;
  addMarker(e.latlng.lat, e.latlng.lng, markerLabel(n, n + 1));
}

function setError(msg){
  const el = $('trip-seg-map-error');
  if(!el) return;
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
}

export function openSegmentMapEditor(ctx){
  _ctx = ctx;
  const meta = $('trip-seg-map-meta');
  if(meta) meta.textContent = `День ${ctx.dayN} · ${ctx.segment.label || 'сегмент'}`;
  setError('');
  $('trip-segment-map-modal')?.classList.add('on');
  requestAnimationFrame(() => {
    initMap(ctx.segment);
    _map?.invalidateSize();
  });
}

export function closeSegmentMapEditor(){
  $('trip-segment-map-modal')?.classList.remove('on');
  destroyMap();
  _ctx = null;
}

export function initSegmentMapEditor(){
  const modal = $('trip-segment-map-modal');
  if(!modal || modal.dataset.bound) return;
  modal.dataset.bound = '1';

  $('trip-seg-map-cancel')?.addEventListener('click', closeSegmentMapEditor);
  $('trip-seg-map-undo')?.addEventListener('click', () => {
    const m = _markers.pop();
    if(m && _map) _map.removeLayer(m);
    syncPolyline();
  });
  $('trip-seg-map-save')?.addEventListener('click', async () => {
    if(!_ctx) return;
    try{
      const points = pointsFromMarkers();
      if(points.length < 2) throw new Error('Нужно минимум 2 точки');
      const rtext = rtextFromPoints(points);
      const audit = auditSegment(rtext);
      const day = _ctx.trip.days.find(d => d.n === _ctx.dayN);
      const v = day?.variants?.find(x => x.id === _ctx.variantId) || day?.variants?.[0];
      const seg = v?.segments?.[_ctx.segIdx];
      if(!seg) throw new Error('Сегмент не найден');
      seg.rtext = rtext;
      seg.plannedKm = audit.km;
      seg.type = audit.isLoop ? 'radial' : (points.length === 2 ? 'transfer' : 'route');
      delete seg.fuelPlan;
      if(typeof _ctx.onSaved === 'function') await _ctx.onSaved(_ctx.trip);
      closeSegmentMapEditor();
    }catch(e){
      setError(e.message || String(e));
    }
  });
}
