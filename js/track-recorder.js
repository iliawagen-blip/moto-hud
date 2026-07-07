/**
 * Локальная запись трека поездки (1 Гц) и экспорт GPX.
 */
import { serializeGpxTrack } from './gpx.js';
import { $ } from './util.js';

const TRACK_KEY = 'moto-hud-track-record';
const INTERVAL_MS = 1000;

let _active = false;
/** @type {Array<{ lat: number, lon: number, spd?: number, acc?: number, hdg?: number, ts: number }>} */
let _points = [];
/** @type {Array<{ lat: number, lon: number, ts: number }>} */
let _lastRide = [];
let _lastSample = 0;

export function isTrackRecordEnabled(){
  try{
    if(new URLSearchParams(location.search).get('track') === '1') return true;
    return localStorage.getItem(TRACK_KEY) === '1';
  }catch(e){ return false; }
}

export function setTrackRecordEnabled(on){
  try{ localStorage.setItem(TRACK_KEY, on ? '1' : '0'); }catch(e){}
}

export function startTrackRecorder(){
  _active = true;
  _points = [];
  _lastSample = 0;
}

export function stopTrackRecorder(){
  _active = false;
  const out = _points.slice();
  _points = [];
  return out;
}

export function hasLastTrack(){
  return _lastRide.length >= 2;
}

export function rememberLastRide(points){
  if(points.length >= 2) _lastRide = points.slice();
  updateTrackGpxButton();
}

export function downloadTrackGpx(points, name){
  if(!points?.length || points.length < 2) return false;
  const ts = points[0].ts || Date.now();
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  const fname = `motohud-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.gpx`;
  const xml = serializeGpxTrack(points, name || 'Moto HUD');
  const blob = new Blob([xml], { type: 'application/gpx+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  a.click();
  URL.revokeObjectURL(a.href);
  return true;
}

export function downloadLastTrackGpx(){
  return downloadTrackGpx(_lastRide);
}

/**
 * @param {{ lat: number, lon: number, spd?: number, acc?: number, hdg?: number }} sample
 */
export function tickTrackRecorder(sample){
  if(!_active || sample?.lat == null || sample?.lon == null) return;
  const now = Date.now();
  if(now - _lastSample < INTERVAL_MS) return;
  _lastSample = now;
  _points.push({
    lat: sample.lat,
    lon: sample.lon,
    spd: sample.spd,
    acc: sample.acc,
    hdg: sample.hdg,
    ts: now
  });
}

function updateTrackGpxButton(){
  $('btn-track-gpx')?.classList.toggle('hidden', !hasLastTrack());
}

export function initTrackRecorderUi(){
  const opt = $('opt-track-record');
  if(opt){
    opt.checked = isTrackRecordEnabled();
    opt.addEventListener('change', e => setTrackRecordEnabled(e.target.checked));
  }
  $('btn-track-gpx')?.addEventListener('click', () => {
    if(!downloadLastTrackGpx()) alert('Нет сохранённого трека');
  });
  updateTrackGpxButton();
}
