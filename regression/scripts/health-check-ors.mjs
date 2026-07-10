#!/usr/bin/env node
/**
 * Проверка ORS_API_KEY из regression/.env (ключ в stdout не выводится).
 */
import { getOrsKey } from './lib/env.mjs';

const key = getOrsKey();
if (!key) {
  console.log('[ors] FAIL: ORS_API_KEY пустой — см. regression/.env');
  process.exit(1);
}

console.log(`[ors] KEY: задан (${key.length} символов)`);

const url = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';
const body = {
  coordinates: [[37.6173, 55.7558], [37.65, 55.78]],
  instructions: true,
};

const t0 = Date.now();
let res;
try {
  res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
} catch (e) {
  console.log('[ors] FAIL: сеть —', e.message);
  process.exit(1);
}

const ms = Date.now() - t0;
const data = await res.json().catch(() => ({}));
console.log(`[ors] HTTP ${res.status} (${ms} ms)`);

if (!res.ok) {
  const err = data.error?.message || data.error || data.message || 'unknown';
  console.log('[ors] FAIL:', err);
  process.exit(1);
}

const summary = data.features?.[0]?.properties?.summary;
const steps = data.features?.[0]?.properties?.segments?.[0]?.steps?.length ?? 0;
console.log('[ors] OK: маршрут Москва (тестовый A→B)');
console.log(`[ors]   distance_m: ${summary?.distance ?? 'n/a'}`);
console.log(`[ors]   duration_s: ${summary?.duration ?? 'n/a'}`);
console.log(`[ors]   steps: ${steps}`);
