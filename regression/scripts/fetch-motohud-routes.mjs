#!/usr/bin/env node
/**
 * Fetch маршрутов Мото ИЛС (OSRM) → cache/motohud/{id}.json + агрегаты в fixture.
 * Usage: node regression/scripts/fetch-motohud-routes.mjs [--force] [--id UUID]
 */
import { loadConfig } from './lib/env.mjs';
import { fetchOsrmRoute, parseOsrmRoute } from './lib/osrm.mjs';
import { throttle } from './lib/rate-limit.mjs';
import { listFixtureFiles, loadFixtureFile, saveFixture } from './lib/fixtures-io.mjs';
import { cacheMotohudPath, saveJson } from './lib/paths.mjs';
import fs from 'fs';

function parseArgs(){
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force'),
    id: args.includes('--id') ? args[args.indexOf('--id') + 1] : null
  };
}

async function fetchOne(fixture, force, delayMs){
  if(!force && fixture.motohud?.fetched_at && fs.existsSync(cacheMotohudPath(fixture.fixture_id))){
    return { skipped: true };
  }
  const osrm = await fetchOsrmRoute(fixture.waypoints);
  if(!osrm.ok){
    fixture.motohud = {
      ...fixture.motohud,
      fetched_at: new Date().toISOString(),
      fetch_error: osrm.error
    };
    fixture.status = 'route_failed';
    saveFixture(fixture);
    return { error: osrm.error };
  }
  const parsed = parseOsrmRoute(osrm.route);
  const cache = {
    fixture_id: fixture.fixture_id,
    provider: 'motohud',
    fetched_at: new Date().toISOString(),
    polyline: parsed.polyline,
    distance_m: parsed.distance_m,
    duration_s: parsed.duration_s,
    steps: parsed.steps,
    router: 'osrm'
  };
  saveJson(cacheMotohudPath(fixture.fixture_id), cache);
  fixture.motohud = {
    distance_m: parsed.distance_m,
    duration_s: parsed.duration_s,
    step_count: parsed.step_count,
    router: 'osrm',
    fetched_at: cache.fetched_at,
    fetch_error: null
  };
  if(fixture.status === 'route_failed') fixture.status = 'valid';
  saveFixture(fixture);
  return { ok: true, distance_m: parsed.distance_m };
}

async function main(){
  const { force, id } = parseArgs();
  const rateCfg = loadConfig('rate-limits');
  const delayMs = rateCfg.osrm?.delay_between_req_ms ?? 2000;

  let files = listFixtureFiles();
  if(id) files = files.filter(f => f.includes(id));

  console.log(`[motohud] fixtures=${files.length} force=${force} delay=${delayMs}ms`);

  let lastAt = 0;
  let ok = 0, skip = 0, err = 0;

  for(const file of files){
    const fx = loadFixtureFile(file);
    lastAt = await throttle(lastAt, delayMs);
    const r = await fetchOne(fx, force, delayMs);
    if(r.skipped){ skip++; continue; }
    if(r.error){
      err++;
      console.log(`  ✗ ${fx.fixture_id.slice(0, 8)} ${r.error}`);
    } else {
      ok++;
      console.log(`  ✓ ${fx.fixture_id.slice(0, 8)} ${(r.distance_m / 1000).toFixed(1)} km`);
    }
  }

  console.log(`[motohud] ok=${ok} skip=${skip} err=${err}`);
  if(err && !ok) process.exit(1);
}

main().catch(e => {
  console.error('[motohud] FATAL:', e);
  process.exit(1);
});
