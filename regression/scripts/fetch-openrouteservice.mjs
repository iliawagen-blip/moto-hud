#!/usr/bin/env node
/**
 * OpenRouteService reference fetcher.
 * Usage: node regression/scripts/fetch-openrouteservice.mjs [--force] [--id UUID]
 */
import fs from 'fs';
import { loadConfig, getOrsKey } from './lib/env.mjs';
import { throttle } from './lib/rate-limit.mjs';
import { listFixtureFiles, loadFixtureFile, saveFixture } from './lib/fixtures-io.mjs';
import { cacheReferencePath, saveJson } from './lib/paths.mjs';

const ORS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

const ORS_TYPE = {
  0: 'left',
  1: 'sharp_left',
  2: 'sharp_right',
  3: 'right',
  4: 'slight_left',
  5: 'slight_right',
  6: 'continue',
  7: 'roundabout',
  8: 'roundabout',
  9: 'u_turn',
  10: 'continue',
  11: 'continue',
  12: 'slight_left',
  13: 'slight_right'
};

function parseArgs(){
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force'),
    id: args.includes('--id') ? args[args.indexOf('--id') + 1] : null
  };
}

function parseOrsResponse(json){
  const feat = json.features?.[0];
  if(!feat) return { ok: false, error: 'no_features' };

  const coords = feat.geometry?.coordinates;
  if(feat.geometry?.type !== 'LineString' || !Array.isArray(coords) || coords.length < 2){
    return { ok: false, error: 'no_geometry' };
  }

  const polyline = coords.map(([lon, lat]) => [lat, lon]);
  const summary = feat.properties?.summary || {};
  const maneuvers = [];

  for(const seg of feat.properties?.segments || []){
    for(const step of seg.steps || []){
      const idx = step.way_points?.[0] ?? 0;
      const pt = polyline[Math.min(idx, polyline.length - 1)] || polyline[0];
      maneuvers.push({
        lat: pt[0],
        lon: pt[1],
        type: ORS_TYPE[step.type] ?? 'unknown',
        angle_deg: null,
        text: step.instruction ?? step.name ?? null,
        distance_from_prev_m: step.distance ?? null
      });
    }
  }

  return {
    ok: true,
    polyline,
    distance_m: Math.round(summary.distance ?? 0),
    duration_s: Math.round(summary.duration ?? 0),
    maneuvers
  };
}

function countRoundabouts(maneuvers){
  return maneuvers.filter(m => m.type === 'roundabout').length;
}

function countSignificantManeuvers(maneuvers){
  return maneuvers.filter(m => !['continue', 'arrive', 'via'].includes(m.type)).length;
}

async function fetchOrs(waypoints, apiKey){
  const coordinates = waypoints.map(p => [p.lon, p.lat]);
  const res = await fetch(ORS_URL, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      coordinates,
      instructions: true,
      language: 'ru'
    }),
    signal: AbortSignal.timeout(60000)
  });

  if(res.status === 429) return { ok: false, error: 'rate_limit_429' };
  if(!res.ok){
    const data = await res.json().catch(() => ({}));
    const msg = data.error?.message || data.error || `http_${res.status}`;
    return { ok: false, error: String(msg).slice(0, 160) };
  }

  const json = await res.json();
  const parsed = parseOrsResponse(json);
  if(!parsed.ok) return parsed;
  return parsed;
}

async function processFixture(fixture, apiKey, force){
  const cachePath = cacheReferencePath('openrouteservice', fixture.fixture_id);
  if(!force && fixture.references?.openrouteservice?.fetched_at && !fixture.references.openrouteservice.fetch_error && fs.existsSync(cachePath)){
    return { skipped: true };
  }

  const ors = await fetchOrs(fixture.waypoints, apiKey);
  if(!ors.ok){
    fixture.references.openrouteservice = {
      distance_m: null,
      duration_s: null,
      maneuver_count: null,
      roundabout_count: null,
      fetched_at: new Date().toISOString(),
      fetch_error: ors.error
    };
    saveFixture(fixture);
    return { error: ors.error };
  }

  const cache = {
    fixture_id: fixture.fixture_id,
    provider: 'openrouteservice',
    fetched_at: new Date().toISOString(),
    polyline: ors.polyline,
    distance_m: ors.distance_m,
    duration_s: ors.duration_s,
    maneuvers: ors.maneuvers
  };
  saveJson(cachePath, cache);

  fixture.references.openrouteservice = {
    distance_m: ors.distance_m,
    duration_s: ors.duration_s,
    maneuver_count: countSignificantManeuvers(ors.maneuvers),
    roundabout_count: countRoundabouts(ors.maneuvers),
    fetched_at: cache.fetched_at,
    fetch_error: null,
    provider_meta: { profile: 'driving-car' }
  };
  saveFixture(fixture);
  return { ok: true, distance_m: ors.distance_m };
}

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
  const apiKey = getOrsKey();
  if(!apiKey){
    console.log('[ors] ORS_API_KEY не задан — пропуск (см. regression/docs/ors-setup.md)');
    process.exit(0);
  }

  const up = await probeOrs();
  if(!up){
    console.log('[ors] api.openrouteservice.org недоступен — пропуск');
    process.exit(0);
  }

  const { force, id } = parseArgs();
  const rateCfg = loadConfig('rate-limits');
  const delayMs = rateCfg.ors?.delay_between_req_ms ?? 2000;

  let files = listFixtureFiles();
  if(id) files = files.filter(f => f.includes(id));

  console.log(`[ors] fixtures=${files.length} delay=${delayMs}ms force=${force}`);

  let lastAt = 0;
  let ok = 0, skip = 0, err = 0;

  for(const file of files){
    const fx = loadFixtureFile(file);
    lastAt = await throttle(lastAt, delayMs);
    const r = await processFixture(fx, apiKey, force);
    if(r.skipped){ skip++; continue; }
    if(r.error){
      err++;
      console.log(`  ✗ ${fx.fixture_id.slice(0, 8)} ${r.error}`);
    }else{
      ok++;
      console.log(`  ✓ ${fx.fixture_id.slice(0, 8)} ${(r.distance_m / 1000).toFixed(1)} km`);
    }
  }

  console.log(`[ors] ok=${ok} skip=${skip} err=${err}`);
  if(err && !ok) process.exit(1);
}

main().catch(e => {
  console.error('[ors] FATAL:', e);
  process.exit(1);
});
