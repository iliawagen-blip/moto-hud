/**
 * Счётчик дневных запросов GraphHopper.
 * Лимит 500/сутки с автосбросом раз в 24 ч (не накопительный).
 */
import fs from 'fs';
import { graphhopperCounterPath, loadJson, saveJson } from './paths.mjs';

function todayUtc(){
  return new Date().toISOString().slice(0, 10);
}

/**
 * @returns {{ date: string, count: number, reset_at: string | null }}
 */
export function readGraphhopperCounter(){
  const p = graphhopperCounterPath();
  if(!fs.existsSync(p)){
    return { date: todayUtc(), count: 0, reset_at: null };
  }
  const raw = loadJson(p);
  if(raw.date !== todayUtc()){
    return { date: todayUtc(), count: 0, reset_at: raw.reset_at ?? null };
  }
  return raw;
}

/**
 * @param {number} delta
 * @param {{ resetAt?: string | null }} [opts]
 */
export function incrementGraphhopperCounter(delta = 1, opts = {}){
  const cur = readGraphhopperCounter();
  const next = {
    date: todayUtc(),
    count: cur.count + delta,
    reset_at: opts.resetAt ?? cur.reset_at ?? null
  };
  saveJson(graphhopperCounterPath(), next);
  return next;
}

/**
 * Текстовое представление заголовков X-RateLimit-* из ответа GraphHopper.
 * @param {import('http').IncomingHttpHeaders | Headers} headers
 * @returns {string}
 */
export function formatRateLimitText(headers){
  const pairs = [];
  const src = headers instanceof Headers
    ? [...headers.entries()]
    : Object.entries(headers || {});
  for(const [k, v] of src){
    const lk = String(k).toLowerCase();
    if(!lk.startsWith('x-ratelimit-')) continue;
    const name = lk.slice('x-ratelimit-'.length);
    const val = Array.isArray(v) ? v.join(',') : String(v);
    pairs.push(`${name}=${val}`);
  }
  pairs.sort();
  return pairs.length ? pairs.join(' ') : '(нет X-RateLimit-* заголовков)';
}

/**
 * Обновить reset_at из заголовка X-RateLimit-Reset (unix seconds или ISO).
 * @param {import('http').IncomingHttpHeaders} headers
 */
export function updateResetFromHeaders(headers){
  const raw = headers['x-ratelimit-reset'] ?? headers['X-RateLimit-Reset'];
  if(raw == null) return null;
  let resetAt;
  const n = Number(raw);
  if(Number.isFinite(n) && n > 1e9){
    resetAt = new Date(n * 1000).toISOString();
  } else {
    resetAt = String(raw);
  }
  const cur = readGraphhopperCounter();
  saveJson(graphhopperCounterPath(), { ...cur, date: todayUtc(), reset_at: resetAt });
  return resetAt;
}

/**
 * @param {number} safetyStopAt — из config (450)
 */
export function canMakeGraphhopperRequest(safetyStopAt = 450){
  const { count } = readGraphhopperCounter();
  return count < safetyStopAt;
}

export function graphhopperRemainingDaily(dailyLimit = 500){
  const { count } = readGraphhopperCounter();
  return Math.max(0, dailyLimit - count);
}
