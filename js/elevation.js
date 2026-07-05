/**
 * Высотный профиль маршрута — OpenTopoData + Terrarium, сглаживание, полоска HUD.
 * @module elevation
 */
import {
  S, DEFAULT_ELEV_EXAG, DEFAULT_ELEV_PROFILE_H, MIN_ELEV_PROFILE_H, MAX_ELEV_PROFILE_H,
  DEFAULT_ELEV_PROFILE_LEN_KM, MIN_ELEV_PROFILE_LEN_KM, MAX_ELEV_PROFILE_LEN_KM,
  ELEV_OPTS_KEY
} from './state.js';
import { findSegAtS, interpolateAtS } from './route-geometry.js';
import { getThemeTokens } from './theme-tokens.js';
import { computeCurveSpeed } from './curve-speed.js';

const TERRARIUM_Z = 13;
const SMOOTH_WINDOW_M = 75;
/** @deprecated используйте getElevProfileLenM() */
const PROFILE_LEN_M = 3000;
const ANCHOR_STEP_M = 50;
const OPENTOPO_BATCH = 100;
const OPENTOPO_DELAY_MS = 1100;

export function getElevExag(){
  const v = S.elevExag;
  return typeof v === 'number' && v > 0 ? v : DEFAULT_ELEV_EXAG;
}

export function getElevProfileH(){
  const v = S.elevProfileH;
  if(typeof v !== 'number' || !isFinite(v)) return DEFAULT_ELEV_PROFILE_H;
  return Math.max(MIN_ELEV_PROFILE_H, Math.min(MAX_ELEV_PROFILE_H, Math.round(v)));
}

export function getElevProfileLenKm(){
  const v = S.elevProfileLenKm;
  if(typeof v !== 'number' || !isFinite(v)) return DEFAULT_ELEV_PROFILE_LEN_KM;
  return Math.max(MIN_ELEV_PROFILE_LEN_KM, Math.min(MAX_ELEV_PROFILE_LEN_KM, v));
}

export function getElevProfileLenM(){
  return getElevProfileLenKm() * 1000;
}


export function loadElevOptsFromStorage(){
  try{
    const raw = localStorage.getItem(ELEV_OPTS_KEY);
    if(!raw) return;
    const o = JSON.parse(raw);
    if(typeof o.show === 'boolean' && typeof document !== 'undefined'){
      const cb = document.getElementById('opt-elev-profile');
      if(cb) cb.checked = o.show;
    }
    if(typeof o.exag === 'number'){
      const inp = document.getElementById('opt-elev-exag');
      if(inp) inp.value = String(o.exag);
    }
    if(typeof o.profileH === 'number'){
      const inp = document.getElementById('opt-elev-profile-h');
      if(inp) inp.value = String(o.profileH);
    }
    if(typeof o.profileLenKm === 'number'){
      const inp = document.getElementById('opt-elev-profile-len');
      if(inp) inp.value = String(o.profileLenKm);
    }
  }catch(e){}
}

export function saveElevOptsToStorage(){
  try{
    localStorage.setItem(ELEV_OPTS_KEY, JSON.stringify({
      show: !!S.showElevProfile,
      exag: getElevExag(),
      profileH: getElevProfileH(),
      profileLenKm: getElevProfileLenKm()
    }));
  }catch(e){}
}

const _tileCache = new Map();
let _elevListeners = [];

/** Подписка на готовность elev (для обновления карты) */
export function onElevationReady(fn){
  _elevListeners.push(fn);
}

function notifyElevationReady(){
  _elevListeners.forEach(fn => { try{ fn(); }catch(e){} });
}

function lonLatToTile(lon, lat, z){
  const n = 2 ** z;
  const x = Math.floor((lon + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)), z };
}

function terrariumDecode(r, g, b){
  return (r * 256 + g + b / 256) - 32768;
}

async function fetchTerrariumTile(z, x, y){
  const key = z + '/' + x + '/' + y;
  if(_tileCache.has(key)) return _tileCache.get(key);
  const url = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/' + z + '/' + x + '/' + y + '.png';
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, 256, 256).data);
    };
    img.onerror = () => reject(new Error('Terrarium tile'));
    img.src = url;
  });
  _tileCache.set(key, p);
  return p;
}

function sampleElevFromPixels(data, lon, lat, tile){
  const n = 2 ** tile.z;
  const fx = (lon + 180) / 360 * n - tile.x;
  const latRad = lat * Math.PI / 180;
  const fy = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n - tile.y;
  const px = Math.max(0, Math.min(255, Math.floor(fx * 256)));
  const py = Math.max(0, Math.min(255, Math.floor(fy * 256)));
  const idx = (py * 256 + px) * 4;
  return terrariumDecode(data[idx], data[idx + 1], data[idx + 2]);
}

async function sampleElevTerrarium(lon, lat){
  const tile = lonLatToTile(lon, lat, TERRARIUM_Z);
  const data = await fetchTerrariumTile(tile.z, tile.x, tile.y);
  return sampleElevFromPixels(data, lon, lat, tile);
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

/** Batch OpenTopoData (до 100 точек, публичный лимит ~1 req/s) */
async function fetchOpenTopoBatch(batch){
  const locStr = batch.map(a => a.lat.toFixed(6) + ',' + a.lon.toFixed(6)).join('|');
  const url = 'https://api.opentopodata.org/v1/aster30m?locations=' + encodeURIComponent(locStr);
  const r = await fetch(url);
  if(!r.ok) throw new Error('OpenTopo ' + r.status);
  const j = await r.json();
  batch.forEach((a, i) => {
    const e = j.results?.[i]?.elevation;
    if(e != null && isFinite(e)) a.elev = e;
  });
}

function buildAnchors(geom){
  const total = geom.s[geom.n - 1];
  const anchors = [];
  for(let s = 0; s <= total; s += ANCHOR_STEP_M){
    const p = interpolateAtS(geom, s);
    anchors.push({ s, lat: p.lat, lon: p.lon, elev: null });
  }
  const last = anchors[anchors.length - 1];
  if(!last || last.s < total - 1){
    const p = interpolateAtS(geom, total);
    anchors.push({ s: total, lat: p.lat, lon: p.lon, elev: null });
  }
  return anchors;
}

function elevFromAnchors(anchors, s){
  if(!anchors.length) return 0;
  if(s <= anchors[0].s) return anchors[0].elev ?? 0;
  const last = anchors[anchors.length - 1];
  if(s >= last.s) return last.elev ?? 0;
  let lo = 0;
  let hi = anchors.length - 1;
  while(lo < hi - 1){
    const mid = (lo + hi) >> 1;
    if(anchors[mid].s <= s) lo = mid;
    else hi = mid;
  }
  const a = anchors[lo];
  const b = anchors[hi];
  if(a.elev == null && b.elev == null) return 0;
  if(a.elev == null) return b.elev;
  if(b.elev == null) return a.elev;
  const t = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
  return a.elev + t * (b.elev - a.elev);
}

function smoothElev(geom){
  const n = geom.n;
  const half = SMOOTH_WINDOW_M;
  const out = new Float64Array(n);
  let j0 = 0;
  for(let i = 0; i < n; i++){
    const s0 = geom.s[i];
    while(j0 < n && geom.s[j0] < s0 - half) j0++;
    let sum = 0;
    let wsum = 0;
    for(let j = j0; j < n && geom.s[j] <= s0 + half; j++){
      const ds = Math.abs(geom.s[j] - s0);
      const w = 1 - ds / half;
      sum += geom.elev[j] * w;
      wsum += w;
    }
    out[i] = wsum > 0 ? sum / wsum : geom.elev[i];
  }
  geom.elev = out;
}

function computeGrade(geom){
  const n = geom.n;
  for(let i = 0; i < n - 1; i++){
    const ds = geom.s[i + 1] - geom.s[i];
    geom.grade[i] = ds > 0 ? (geom.elev[i + 1] - geom.elev[i]) / ds : 0;
  }
  geom.grade[n - 1] = geom.grade[n - 2] || 0;
  for(let i = 0; i < n; i++){
    geom.grade[i] = Math.max(-0.25, Math.min(0.25, geom.grade[i]));
  }
}

/** Синтетический рельеф для sim.html — иначе Москва ~плоская, метки ±N%% не видны */
function injectSimElevation(geom){
  for(let j = 0; j < geom.n; j++){
    const s = geom.s[j];
    geom.elev[j] = 150 + 28 * Math.sin(s / 320) + 14 * Math.sin(s / 85) + 0.006 * s;
  }
  smoothElev(geom);
  computeGrade(geom);
  geom.elevReady = true;
  computeCurveSpeed(geom, S.route);
  notifyElevationReady();
}

/** Загрузка высот: якоря каждые 50 м → OpenTopo batch → интерполяция на dense */
export async function fetchElevationForGeometry(geom){
  if(!geom || geom.n < 2) return;
  if(typeof document !== 'undefined' && document.documentElement.getAttribute('data-sim') === '1'){
    injectSimElevation(geom);
    return;
  }
  const anchors = buildAnchors(geom);

  for(let i = 0; i < anchors.length; i += OPENTOPO_BATCH){
    const batch = anchors.slice(i, i + OPENTOPO_BATCH);
    try{
      await fetchOpenTopoBatch(batch);
    }catch(e){
      console.warn('OpenTopo batch:', e);
    }
    if(i + OPENTOPO_BATCH < anchors.length) await sleep(OPENTOPO_DELAY_MS);
  }

  for(const a of anchors){
    if(a.elev != null) continue;
    try{
      a.elev = await sampleElevTerrarium(a.lon, a.lat);
    }catch(e){
      a.elev = 0;
    }
  }

  for(let j = 0; j < geom.n; j++){
    geom.elev[j] = elevFromAnchors(anchors, geom.s[j]);
  }
  smoothElev(geom);
  computeGrade(geom);
  geom.elevReady = true;
  computeCurveSpeed(geom, S.route);
  notifyElevationReady();
}

export function loadRouteElevation(){
  if(!S.showElevProfile) return;
  const geom = S.route?.geometry;
  if(!geom || geom.elevReady) return;
  fetchElevationForGeometry(geom).catch(e => console.warn('Высоты:', e));
}

export function gradeColor(grade){
  const t = getThemeTokens();
  const g = Math.abs(grade || 0);
  if(g < 0.04) return t.gradeFlat;
  if(g < 0.08) return t.gradeMid;
  return t.gradeSteep;
}

export function renderElevProfile(snap, geom, W, H){
  if(!S.showElevProfile || !geom?.elevReady || !snap) return '';
  const exag = getElevExag();
  const profileLenM = getElevProfileLenM();
  const s0 = snap.s;
  const s1 = Math.min(geom.s[geom.n - 1], s0 + profileLenM);
  if(s1 - s0 < 50) return '';

  const samples = [];
  for(let s = s0; s <= s1; s += 40){
    const i = findSegAtS(geom, s);
    const ds = geom.s[i + 1] - geom.s[i];
    const t = ds > 0 ? (s - geom.s[i]) / ds : 0;
    const elev = geom.elev[i] + t * (geom.elev[i + 1] - geom.elev[i]);
    samples.push({ s: s - s0, elev });
  }
  if(samples.length < 2) return '';

  const base = samples[0].elev;
  let minE = 0;
  let maxE = 0;
  samples.forEach(p => {
    const d = (p.elev - base) * exag;
    minE = Math.min(minE, d);
    maxE = Math.max(maxE, d);
  });
  const pad = Math.max(8, (maxE - minE) * 0.15);
  minE -= pad;
  maxE += pad;
  const range = maxE - minE || 1;

  const mx = 8;
  const my = 4;
  const pw = W - mx * 2;
  const ph = H - my * 2;

  const toX = ds => mx + (ds / profileLenM) * pw;
  const toY = d => my + ph - ((d - minE) / range) * ph;

  let pathSegs = '';
  samples.forEach((p, i) => {
    if(i === 0) return;
    const a = samples[i - 1];
    const b = p;
    const sMid = s0 + (a.s + b.s) * 0.5;
    const gi = findSegAtS(geom, sMid);
    const col = gradeColor(geom.grade[gi] || 0);
    const x1 = toX(a.s);
    const y1 = toY((a.elev - base) * exag);
    const x2 = toX(b.s);
    const y2 = toY((b.elev - base) * exag);
    pathSegs += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" ' +
      'x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" ' +
      'stroke="' + col + '" stroke-width="3" stroke-linecap="round"/>';
  });

  let marks = '';
  const tok = getThemeTokens();
  geom.maneuvers.forEach(m => {
    if(m.s < s0 || m.s > s1) return;
    const x = toX(m.s - s0);
    marks += '<line x1="' + x.toFixed(1) + '" y1="' + my + '" x2="' + x.toFixed(1) + '" ' +
      'y2="' + (my + ph) + '" stroke="' + tok.accent + '" stroke-width="1" opacity="0.5"/>';
  });

  return '<g class="elev-profile" fill="none">' +
    marks +
    pathSegs +
    '</g>';
}

export { PROFILE_LEN_M, DEFAULT_ELEV_EXAG, DEFAULT_ELEV_PROFILE_H, DEFAULT_ELEV_PROFILE_LEN_KM };
