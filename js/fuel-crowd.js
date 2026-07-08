/**
 * Локальный краудсорс наличия топлива (отметки водителя в HUD).
 */
import { haversine } from './geo.js';
import { curPos } from './gps.js';

export const FUEL_CROWD_KEY = 'moto-hud-fuel-crowd-v1';
export const FUEL_STATUSES = ['yes', 'queue', 'low', 'no'];
const CROWD_MAX = 400;
const CROWD_TTL_MS = 7 * 24 * 3600 * 1000;
const CROWD_MATCH_M = 85;
/** Свежая отметка перекрывает ГдеБЕНЗ. */
export const CROWD_OVERRIDE_MS = 6 * 3600 * 1000;

export function loadCrowdReports(){
  try{
    const raw = localStorage.getItem(FUEL_CROWD_KEY);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    if(!Array.isArray(arr)) return [];
    const now = Date.now();
    return arr.filter(r => r && r.ts && now - r.ts < CROWD_TTL_MS && FUEL_STATUSES.includes(r.status));
  }catch(e){
    return [];
  }
}

function writeCrowdReports(list){
  const trimmed = list
    .sort((a, b) => b.ts - a.ts)
    .slice(0, CROWD_MAX);
  localStorage.setItem(FUEL_CROWD_KEY, JSON.stringify(trimmed));
  return trimmed;
}

/**
 * Сохранить отметку с текущей GPS.
 * @param {'yes'|'queue'|'low'|'no'} status
 * @param {{ lat: number, lon: number, osmId?: string, brand?: string }} [hint]
 */
export function saveCrowdReport(status, hint){
  if(!FUEL_STATUSES.includes(status)) return null;
  const p = hint || curPos();
  if(!p?.lat || !p?.lon) return null;
  const rec = {
    lat: p.lat,
    lon: p.lon,
    osmId: hint?.osmId || null,
    brand: hint?.brand || '',
    status,
    ts: Date.now()
  };
  const list = loadCrowdReports().filter(r => {
    if(rec.osmId && r.osmId === rec.osmId) return false;
    return haversine(r, rec) > 25;
  });
  list.unshift(rec);
  writeCrowdReports(list);
  return rec;
}

function pickCrowdForStation(st, reports){
  let best = null;
  let bestD = CROWD_MATCH_M;
  for(const r of reports){
    if(r.osmId && st.osmId && r.osmId === st.osmId){
      return r;
    }
    const d = haversine(st, r);
    if(d < bestD){
      bestD = d;
      best = r;
    }
  }
  return best;
}

/** Применить локальные отметки к списку АЗС. */
export function applyCrowdReports(stations){
  const reports = loadCrowdReports();
  if(!reports.length || !stations?.length) return 0;
  let n = 0;
  for(const st of stations){
    const r = pickCrowdForStation(st, reports);
    if(!r) continue;
    const gdeTs = st.lastAt ? Date.parse(String(st.lastAt).replace(' ', 'T')) : 0;
    const crowdFresh = Date.now() - r.ts < CROWD_OVERRIDE_MS;
    const gdeStale = !gdeTs || Date.now() - gdeTs > CROWD_OVERRIDE_MS;
    if(st.statusSource !== 'crowd' && st.status !== 'unknown' && !crowdFresh && !gdeStale) continue;
    st.status = r.status;
    st.statusSource = 'crowd';
    st.crowdAt = r.ts;
    if(r.brand && !st.brand) st.brand = r.brand;
    n++;
  }
  return n;
}

/** Ближайшая АЗС к позиции для отметки. */
export function nearestStationForReport(stations, pos){
  if(!stations?.length || !pos) return null;
  let best = null;
  let bestD = 200;
  for(const st of stations){
    const d = haversine(pos, st);
    if(d < bestD){
      bestD = d;
      best = st;
    }
  }
  return bestD <= 200 ? best : null;
}

export function crowdStatusSuffix(st){
  return st?.statusSource === 'crowd' ? ' · ваш отчёт' : '';
}

export function exportCrowdReportsJson(){
  return JSON.stringify({
    kind: 'moto-hud-fuel-crowd',
    exportedAt: new Date().toISOString(),
    reports: loadCrowdReports()
  }, null, 2);
}

export function importCrowdReportsJson(text){
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data?.reports;
  if(!Array.isArray(arr)) throw new Error('Нет массива reports');
  const valid = arr.filter(r =>
    r && FUEL_STATUSES.includes(r.status) && Number.isFinite(r.lat) && Number.isFinite(r.lon)
  ).map(r => ({ ...r, ts: r.ts || Date.now() }));
  writeCrowdReports([...valid, ...loadCrowdReports()]);
  return valid.length;
}
