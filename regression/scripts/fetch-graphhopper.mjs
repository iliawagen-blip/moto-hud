#!/usr/bin/env node
/**
 * GraphHopper reference fetcher.
 * Usage: node regression/scripts/fetch-graphhopper.mjs [--force] [--id UUID]
 */
import fs from 'fs';
import { loadConfig, getGraphhopperKey } from './lib/env.mjs';
import { throttle } from './lib/rate-limit.mjs';
import { listFixtureFiles, loadFixtureFile, saveFixture } from './lib/fixtures-io.mjs';
import { cacheReferencePath, saveJson } from './lib/paths.mjs';
import {
  canMakeGraphhopperRequest,
  incrementGraphhopperCounter,
  readGraphhopperCounter,
  updateResetFromHeaders,
  graphhopperRemainingDaily,
  formatRateLimitText
} from './lib/graphhopper-counter.mjs';
import { waypointsForGraphhopper } from './lib/waypoints.mjs';

const GH_URL = 'https://graphhopper.com/api/1/route';

const SIGN_TYPE = {
  [-3]: 'sharp_left', [-2]: 'left', [-1]: 'slight_left',
  0: 'continue', 1: 'slight_right', 2: 'right', 3: 'sharp_right',
  4: 'arrive', 5: 'via', 6: 'roundabout'
};

function parseArgs(){
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force'),
    id: args.includes('--id') ? args[args.indexOf('--id') + 1] : null
  };
}

function parseGraphhopperPoints(paths0){
  const pts = paths0?.points;
  if(!pts) return [];
  if(pts.type === 'LineString' && Array.isArray(pts.coordinates)){
    return pts.coordinates.map(([lon, lat]) => [lat, lon]);
  }
  if(Array.isArray(pts)){
    return pts.map(p => Array.isArray(p) ? [p[1], p[0]] : [p.lat, p.lon]);
  }
  return [];
}

function parseManeuvers(paths0, polyline){
  const instr = paths0?.instructions || [];
  return instr.map((ins, i) => {
    const idx = ins.interval?.[0] ?? 0;
    const pt = polyline[idx] || polyline[0] || [0, 0];
    return {
      lat: pt[0],
      lon: pt[1],
      type: SIGN_TYPE[ins.sign] ?? 'unknown',
      angle_deg: null,
      text: ins.text ?? null,
      distance_from_prev_m: ins.distance ?? null
    };
  });
}

function countRoundabouts(maneuvers){
  return maneuvers.filter(m => m.type === 'roundabout').length;
}

function countSignificantManeuvers(maneuvers){
  return maneuvers.filter(m => !['continue', 'arrive', 'via'].includes(m.type)).length;
}

async function fetchGraphhopperWithRetry(waypoints, apiKey, retryPauseMs = 60000){
  for(let attempt = 0; attempt < 2; attempt++){
    const gh = await fetchGraphhopper(waypoints, apiKey);
    incrementGraphhopperCounter(1);
    if(gh.ok || gh.error !== 'rate_limit_429' || attempt === 1) return gh;
    console.warn(`[graphhopper] 429 — ${gh.rateLimitText} — pause ${Math.round(retryPauseMs / 1000)}s, retry 1×`);
    await new Promise(r => setTimeout(r, retryPauseMs));
  }
  return { ok: false, error: 'rate_limit_429' };
}

async function fetchGraphhopper(waypoints, apiKey){
  const points = waypoints.map(p => [p.lon, p.lat]);
  const url = `${GH_URL}?key=${encodeURIComponent(apiKey)}`;
  const body = {
    points,
    profile: 'car',
    points_encoded: false,
    instructions: true,
    calc_points: true,
    locale: 'ru'
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const rateLimitText = formatRateLimitText(res.headers);
  updateResetFromHeaders(res.headers);
  if(res.status === 429) return { ok: false, error: 'rate_limit_429', rateLimitText };
  if(!res.ok){
    const txt = await res.text().catch(() => '');
    return { ok: false, error: `http_${res.status}:${txt.slice(0, 120)}`, rateLimitText };
  }
  const json = await res.json();
  if(json.message && !json.paths?.length){
    return { ok: false, error: json.message };
  }
  const path0 = json.paths?.[0];
  if(!path0) return { ok: false, error: 'no_paths' };
  const polyline = parseGraphhopperPoints(path0);
  const maneuvers = parseManeuvers(path0, polyline);
  return {
    ok: true,
    polyline,
    distance_m: Math.round(path0.distance ?? 0),
    duration_s: Math.round((path0.time ?? 0) / 1000),
    maneuvers,
    rateLimitText
  };
}

async function processFixture(fixture, apiKey, force, rateCfg){
  const cachePath = cacheReferencePath('graphhopper', fixture.fixture_id);
  if(!force && fixture.references?.graphhopper?.fetched_at && fs.existsSync(cachePath)){
    return { skipped: true };
  }
  if(!canMakeGraphhopperRequest(450)){
    return { limit: true };
  }

  const maxPts = rateCfg.graphhopper?.max_points ?? 5;
  const ghWaypoints = waypointsForGraphhopper(fixture.waypoints, maxPts);
  const downsampled = ghWaypoints.length < fixture.waypoints.length;

  const gh = await fetchGraphhopperWithRetry(
    ghWaypoints,
    apiKey,
    rateCfg.graphhopper?.retry_pause_ms ?? 60000
  );

  if(!gh.ok){
    fixture.references.graphhopper = {
      distance_m: null,
      duration_s: null,
      maneuver_count: null,
      roundabout_count: null,
      fetched_at: new Date().toISOString(),
      fetch_error: gh.error
    };
    saveFixture(fixture);
    return { error: gh.error, rateLimitText: gh.rateLimitText, downsampled };
  }

  const cache = {
    fixture_id: fixture.fixture_id,
    provider: 'graphhopper',
    fetched_at: new Date().toISOString(),
    polyline: gh.polyline,
    distance_m: gh.distance_m,
    duration_s: gh.duration_s,
    maneuvers: gh.maneuvers,
    points_sent: ghWaypoints.length,
    points_original: fixture.waypoints.length
  };
  saveJson(cachePath, cache);

  fixture.references.graphhopper = {
    distance_m: gh.distance_m,
    duration_s: gh.duration_s,
    maneuver_count: countSignificantManeuvers(gh.maneuvers),
    roundabout_count: countRoundabouts(gh.maneuvers),
    fetched_at: cache.fetched_at,
    fetch_error: null,
    provider_meta: {
      profile: 'car',
      points_sent: ghWaypoints.length,
      points_original: fixture.waypoints.length,
      downsampled
    }
  };
  saveFixture(fixture);
  return { ok: true, distance_m: gh.distance_m, rateLimitText: gh.rateLimitText, downsampled };
}

async function main(){
  const apiKey = getGraphhopperKey();
  if(!apiKey){
    console.error('[graphhopper] GRAPHHOPPER_API_KEY не задан в regression/.env');
    process.exit(1);
  }

  const { force, id } = parseArgs();
  const rateCfg = loadConfig('rate-limits');
  const delayMs = rateCfg.graphhopper?.delay_between_req_ms ?? 5000;
  const maxPts = rateCfg.graphhopper?.max_points ?? 5;
  const counter = readGraphhopperCounter();

  let files = listFixtureFiles();
  if(id) files = files.filter(f => f.includes(id));

  console.log(`[graphhopper] fixtures=${files.length} count_today=${counter.count} remaining≈${graphhopperRemainingDaily(500)} force=${force}`);

  let lastAt = 0;
  let ok = 0, skip = 0, err = 0, limitHit = false;

  for(const file of files){
    if(!canMakeGraphhopperRequest(450)){
      console.log('[graphhopper] daily safety stop (450) — checkpoint');
      limitHit = true;
      break;
    }
    const fx = loadFixtureFile(file);
    lastAt = await throttle(lastAt, delayMs);
    const r = await processFixture(fx, apiKey, force, rateCfg);
    if(r.limit){ limitHit = true; break; }
    if(r.skipped){ skip++; continue; }
    if(r.error){
      err++;
      const rl = r.rateLimitText ? ` · ${r.rateLimitText}` : '';
      const pts = r.downsampled ? ` · pts ${fx.waypoints.length}→${maxPts}` : '';
      console.log(`  ✗ ${fx.fixture_id.slice(0, 8)} ${r.error}${pts}${rl}`);
    } else {
      ok++;
      const c = readGraphhopperCounter();
      const rl = r.rateLimitText ? ` · ${r.rateLimitText}` : '';
      const pts = r.downsampled ? ` · pts ${fx.waypoints.length}→${maxPts}` : '';
      console.log(`  ✓ ${fx.fixture_id.slice(0, 8)} ${(r.distance_m / 1000).toFixed(1)} km (GH ${c.count}/500)${pts}${rl}`);
    }
  }

  console.log(`[graphhopper] ok=${ok} skip=${skip} err=${err}${limitHit ? ' LIMIT' : ''}`);
  if(limitHit) process.exit(2);
  if(err && !ok) process.exit(1);
}

main().catch(e => {
  console.error('[graphhopper] FATAL:', e);
  process.exit(1);
});
