#!/usr/bin/env node
/**
 * Стратифицированная генерация regression fixtures.
 * Usage: node regression/scripts/generate-waypoints.mjs [--count 5] [--seed 42]
 */
import crypto from 'crypto';
import { loadConfig } from './lib/env.mjs';
import { haversine, makeRng, randomInBbox, totalPathKm } from './lib/geo.mjs';
import { isNearHighway, snapToRoad } from './lib/overpass.mjs';
import { fetchOsrmRoute } from './lib/osrm.mjs';
import { sleep, throttle } from './lib/rate-limit.mjs';
import { saveFixture } from './lib/fixtures-io.mjs';
import { emptyFixture } from './validate-schema.mjs';

const CATEGORIES = ['city', 'highway', 'roundabouts', 'many_waypoints', 'mountain'];
const OSRM_DELAY_MS = 1500;

function parseArgs(){
  const args = process.argv.slice(2);
  let count = 5;
  let seed = Date.now();
  let categories = null;
  for(let i = 0; i < args.length; i++){
    if(args[i] === '--count' && args[i + 1]) count = Number(args[++i]);
    if(args[i] === '--seed' && args[i + 1]) seed = Number(args[++i]);
    if(args[i] === '--categories' && args[i + 1]){
      categories = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return { count, seed, categories };
}

function pickCategories(count, rng){
  if(count <= CATEGORIES.length){
    return CATEGORIES.slice(0, count);
  }
  const out = [];
  const weights = CATEGORIES.map(c => 1);
  const total = weights.reduce((a, b) => a + b, 0);
  for(let i = 0; i < count; i++){
    let r = rng() * total;
    for(let j = 0; j < CATEGORIES.length; j++){
      r -= weights[j];
      if(r <= 0){ out.push(CATEGORIES[j]); break; }
    }
  }
  return out;
}

function pickRegion(regions, category, rng){
  const tagged = regions.filter(r => {
    if(category === 'highway') return r.tags?.includes('highway') || r.tags?.includes('m11') || r.tags?.includes('m4');
    if(category === 'mountain') return r.tags?.includes('mountain') || r.tags?.includes('serpentine') || r.tags?.includes('coast');
    if(category === 'roundabouts') return r.tags?.includes('urban') || r.tags?.includes('ring') || r.tags?.includes('capital');
    return true;
  });
  const pool = tagged.length ? tagged : regions;
  return pool[Math.floor(rng() * pool.length)];
}

function offsetFromCenter(center, radiusM, bearingDeg){
  const R = 6371000;
  const br = bearingDeg * Math.PI / 180;
  const lat1 = center.lat * Math.PI / 180;
  const lon1 = center.lon * Math.PI / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(radiusM / R) +
    Math.cos(lat1) * Math.sin(radiusM / R) * Math.cos(br));
  const lon2 = lon1 + Math.atan2(
    Math.sin(br) * Math.sin(radiusM / R) * Math.cos(lat1),
    Math.cos(radiusM / R) - Math.sin(lat1) * Math.sin(lat2)
  );
  return { lat: lat2 * 180 / Math.PI, lon: lon2 * 180 / Math.PI };
}

async function buildRoundaboutWaypoints(rb, rng){
  const bearing = rng() * 360;
  const rawStart = offsetFromCenter(rb, rb.radius_m, bearing);
  const rawFinish = offsetFromCenter(rb, rb.radius_m, bearing + 140 + rng() * 80);
  const start = await snapPoint(rawStart.lat, rawStart.lon);
  const finish = await snapPoint(rawFinish.lat, rawFinish.lon);
  const vias = [];
  const viaCount = rng() < 0.4 ? 1 : 0;
  for(let i = 0; i < viaCount; i++){
    const raw = offsetFromCenter(rb, rb.radius_m * (0.6 + rng() * 0.5), bearing + 60 + i * 40);
    const via = await snapPoint(raw.lat, raw.lon);
    vias.push({ ...via, label: `via_ring_${i + 1}` });
  }
  return [
    { ...start, label: 'start_ring' },
    ...vias,
    { ...finish, label: 'finish_ring' }
  ];
}

async function snapPoint(lat, lon){
  const s = await snapToRoad(lat, lon);
  return s || { lat, lon };
}

async function buildRandomWaypoints(region, category, cfg, rng){
  const [dMin, dMax] = cfg.categories[category].distance_km;
  const bbox = region.bbox;
  for(let attempt = 0; attempt < 25; attempt++){
    const rawStart = randomInBbox(bbox, rng);
    const rawFinish = randomInBbox(bbox, rng);
    const start = await snapPoint(rawStart.lat, rawStart.lon);
    const finish = await snapPoint(rawFinish.lat, rawFinish.lon);
    const viaN = category === 'many_waypoints'
      ? 2 + Math.floor(rng() * 3)
      : Math.floor(rng() * 4);
    const wps = [{ ...start, label: 'start' }];
    for(let i = 0; i < viaN; i++){
      const raw = randomInBbox(bbox, rng);
      const via = await snapPoint(raw.lat, raw.lon);
      wps.push({ ...via, label: `via_${i + 1}` });
    }
    wps.push({ ...finish, label: 'finish' });
    const km = totalPathKm(wps);
    if(km >= dMin * 0.7 && km <= dMax * 1.2) return wps;
  }
  const start = await snapPoint(bbox.south + (bbox.north - bbox.south) * 0.3, bbox.west + (bbox.east - bbox.west) * 0.3);
  const finish = await snapPoint(bbox.south + (bbox.north - bbox.south) * 0.7, bbox.west + (bbox.east - bbox.west) * 0.7);
  return [{ ...start, label: 'start' }, { ...finish, label: 'finish' }];
}

async function validateWaypoints(wps){
  let lastAt = 0;
  for(const p of wps){
    lastAt = await throttle(lastAt, OSRM_DELAY_MS);
    const ok = await isNearHighway(p.lat, p.lon);
    if(!ok) return { ok: false, reason: 'not_on_road' };
  }
  lastAt = await throttle(lastAt, OSRM_DELAY_MS);
  const osrm = await fetchOsrmRoute(wps);
  if(!osrm.ok) return { ok: false, reason: `osrm_${osrm.error}` };
  const distKm = (osrm.route.distance || 0) / 1000;
  if(distKm < 4.5) return { ok: false, reason: 'osrm_too_short' };
  return { ok: true, osrm: osrm.route };
}

async function generateOne(category, cfg, regions, roundabouts, rng){
  const region = pickRegion(regions, category, rng);
  let waypoints;
  if(category === 'roundabouts' && roundabouts.length){
    const rb = roundabouts[Math.floor(rng() * roundabouts.length)];
    waypoints = await buildRoundaboutWaypoints(rb, rng);
  } else {
    waypoints = await buildRandomWaypoints(region, category, cfg, rng);
  }

  for(let tryN = 0; tryN < 8; tryN++){
    try{
      const v = await validateWaypoints(waypoints);
      if(v.ok){
        const speed = cfg.category_speed_kmh[category] ?? cfg.default_constraints.sim_speed_kmh;
        const fixture = emptyFixture({
          fixture_id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          category,
          region: region.id,
          tags: ['auto_v1', category, region.id],
          waypoints,
          constraints: {
            distance_km_min: cfg.default_constraints.distance_km_min,
            distance_km_max: cfg.default_constraints.distance_km_max,
            sim_speed_kmh: speed
          },
          metadata: {
            author: 'generate-waypoints.mjs',
            notes: `${region.label} · ${category} · OSRM ${((v.osrm.distance || 0) / 1000).toFixed(1)} km`,
            known_issues: [],
            compare_interpretation: null,
            priority: 'normal'
          },
          status: 'valid'
        });
        return fixture;
      }
    }catch(e){
      if(tryN === 7) console.warn(`    overpass/osrm error: ${e.message}`);
    }
    if(category === 'roundabouts'){
      const rb = roundabouts[Math.floor(rng() * roundabouts.length)];
      waypoints = await buildRoundaboutWaypoints(rb, rng);
    } else {
      waypoints = await buildRandomWaypoints(region, category, cfg, rng);
    }
    await sleep(500);
  }
  return null;
}

async function main(){
  const { count, seed, categories: catsArg } = parseArgs();
  const cfg = loadConfig('regions');
  const regions = cfg.regions;
  const roundabouts = cfg.roundabouts || [];
  const rng = makeRng(seed);
  const cats = catsArg?.length
    ? catsArg
    : pickCategories(count, rng);

  console.log(`[generate] count=${cats.length} seed=${seed} categories=${cats.join(',')}`);

  const saved = [];
  const failed = [];

  for(const category of cats){
    process.stdout.write(`  ${category}… `);
    const fx = await generateOne(category, cfg, regions, roundabouts, rng);
    if(fx){
      const f = saveFixture(fx);
      saved.push(f);
      console.log(`OK ${fx.fixture_id.slice(0, 8)} (${fx.region})`);
    } else {
      failed.push(category);
      console.log('SKIP (validation failed)');
    }
  }

  console.log(`\n[generate] saved ${saved.length}/${cats.length}`);
  if(failed.length) console.log('[generate] failed categories:', failed.join(', '));
  if(!saved.length) process.exit(1);
}

main().catch(e => {
  console.error('[generate] FATAL:', e);
  process.exit(1);
});
