/**
 * Локальный прогресс по плану: последний сегмент, отмеченные «готово».
 * @module trip-progress
 */

const PROGRESS_KEY = 'moto-hud-trip-progress-v1';
const VARIANT_KEY = 'moto-hud-trip-variant-v1';

function readJson(key){
  try{ return JSON.parse(localStorage.getItem(key) || '{}'); }catch(e){ return {}; }
}

function writeJson(key, obj){
  try{ localStorage.setItem(key, JSON.stringify(obj)); }catch(e){}
}

export function getVariantMode(tripId){
  const m = readJson(VARIANT_KEY);
  return m[tripId] === 'intense' ? 'intense' : 'calm';
}

export function setVariantMode(tripId, mode){
  const m = readJson(VARIANT_KEY);
  m[tripId] = mode === 'intense' ? 'intense' : 'calm';
  writeJson(VARIANT_KEY, m);
}

/** @returns {{ dayN: number, segIdx: number, at: number }|null} */
export function getLastApplied(tripId){
  const p = readJson(PROGRESS_KEY)[tripId];
  if(!p || p.dayN == null) return null;
  return { dayN: p.dayN, segIdx: p.segIdx ?? 0, at: p.at || 0 };
}

export function markSegmentApplied(tripId, dayN, segIdx){
  const all = readJson(PROGRESS_KEY);
  const cur = all[tripId] || { done: [] };
  cur.dayN = dayN;
  cur.segIdx = segIdx;
  cur.at = Date.now();
  all[tripId] = cur;
  writeJson(PROGRESS_KEY, all);
}

export function isSegmentDone(tripId, dayN, segIdx){
  const cur = readJson(PROGRESS_KEY)[tripId];
  if(!cur?.done?.length) return false;
  return cur.done.some(d => d.dayN === dayN && d.segIdx === segIdx);
}

export function toggleSegmentDone(tripId, dayN, segIdx){
  const all = readJson(PROGRESS_KEY);
  const cur = all[tripId] || { done: [] };
  cur.done = cur.done || [];
  const i = cur.done.findIndex(d => d.dayN === dayN && d.segIdx === segIdx);
  if(i >= 0) cur.done.splice(i, 1);
  else cur.done.push({ dayN, segIdx, at: Date.now() });
  all[tripId] = cur;
  writeJson(PROGRESS_KEY, all);
  return i < 0;
}

export function clearTripProgress(tripId){
  const all = readJson(PROGRESS_KEY);
  delete all[tripId];
  writeJson(PROGRESS_KEY, all);
  const v = readJson(VARIANT_KEY);
  delete v[tripId];
  writeJson(VARIANT_KEY, v);
}
