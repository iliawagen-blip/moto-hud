#!/usr/bin/env node
/**
 * OpenRouteService reference fetcher — пропускает если нет ключа или ORS недоступен.
 * Usage: node regression/scripts/fetch-openrouteservice.mjs [--force]
 */
import { getOrsKey } from './lib/env.mjs';

async function probeOrs(){
  try{
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 8000);
    const res = await fetch('https://api.openrouteservice.org/', { signal: c.signal });
    clearTimeout(t);
    return res.ok || res.status < 500;
  }catch{
    return false;
  }
}

async function main(){
  const key = getOrsKey();
  if(!key){
    console.log('[ors] ORS_API_KEY не задан — пропуск (см. regression/docs/ors-setup.md)');
    process.exit(0);
  }
  const up = await probeOrs();
  if(!up){
    console.log('[ors] api.openrouteservice.org недоступен — пропуск, продолжаем на GH + motohud');
    process.exit(0);
  }
  console.error('[ors] Этап 4: полный fetch-openrouteservice.mjs — в разработке (ключ есть, API доступен)');
  process.exit(0);
}

main();
