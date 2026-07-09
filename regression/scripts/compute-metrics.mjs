#!/usr/bin/env node
/**
 * Метрики сравнения motohud vs эталоны.
 * Usage: node regression/scripts/compute-metrics.mjs [--id UUID] [--force]
 */
import fs from 'fs';
import { loadConfig } from './lib/env.mjs';
import { listFixtureFiles, loadFixtureFile, saveFixture } from './lib/fixtures-io.mjs';
import { cacheMotohudPath, cacheReferencePath } from './lib/paths.mjs';
import { compareRoutes } from './lib/route-compare.mjs';

const PROVIDERS = ['graphhopper', 'openrouteservice', 'yandex_web'];

function parseArgs(){
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force'),
    id: args.includes('--id') ? args[args.indexOf('--id') + 1] : null
  };
}

function loadRouteCache(path){
  if(!fs.existsSync(path)) return null;
  try{
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  }catch{
    return null;
  }
}

function refMeta(fixture, provider){
  const ref = fixture.references?.[provider];
  const cache = loadRouteCache(cacheReferencePath(provider, fixture.fixture_id));
  if(!cache?.polyline?.length) return null;
  return {
    polyline: cache.polyline,
    distance_m: ref?.distance_m ?? cache.distance_m,
    duration_s: ref?.duration_s ?? cache.duration_s,
    maneuver_count: ref?.maneuver_count ?? cache.maneuvers?.length ?? null,
    roundabout_count: ref?.roundabout_count ?? null
  };
}

function motohudMeta(fixture){
  const cache = loadRouteCache(cacheMotohudPath(fixture.fixture_id));
  if(!cache?.polyline?.length) return null;
  return {
    polyline: cache.polyline,
    distance_m: fixture.motohud?.distance_m ?? cache.distance_m,
    duration_s: fixture.motohud?.duration_s ?? cache.duration_s,
    maneuver_count: fixture.motohud?.step_count ?? cache.steps?.length ?? null,
    roundabout_count: null
  };
}

function pairCompare(routeA, routeB, waypoints){
  if(!routeA || !routeB) return null;
  return compareRoutes({
    polylineA: routeA.polyline,
    polylineB: routeB.polyline,
    distanceA_m: routeA.distance_m,
    distanceB_m: routeB.distance_m,
    durationA_s: routeA.duration_s,
    durationB_s: routeB.duration_s,
    maneuverA: routeA.maneuver_count,
    maneuverB: routeB.maneuver_count,
    roundaboutA: routeA.roundabout_count,
    roundaboutB: routeB.roundabout_count,
    waypoints
  });
}

function computeConsensus(mh, refs, thresholds, pairs){
  const available = PROVIDERS.filter(p => refs[p]);
  const gh = refs.graphhopper;
  const ors = refs.openrouteservice;

  let refs_agree = false;
  if(gh && ors && pairs.graphhopper_vs_ors?.p95_lateral_m != null){
    refs_agree = pairs.graphhopper_vs_ors.p95_lateral_m < thresholds.compare.refs_agree_p95_max_m;
  }

  if(available.length < 2){
    const primary = pairs.graphhopper_vs_motohud || pairs.ors_vs_motohud || pairs.yandex_vs_motohud;
    return {
      refs_agree: false,
      motohud_vs_consensus_p95_m: primary?.p95_lateral_m ?? null,
      motohud_vs_consensus_avg_m: primary?.avg_lateral_m ?? null,
      signal: 'insufficient_refs'
    };
  }

  const mhPairs = [
    pairs.graphhopper_vs_motohud,
    pairs.ors_vs_motohud,
    pairs.yandex_vs_motohud
  ].filter(Boolean);

  const p95s = mhPairs.map(p => p.p95_lateral_m).filter(v => v != null);
  const avgs = mhPairs.map(p => p.avg_lateral_m).filter(v => v != null);
  const consensus_p95 = p95s.length ? Math.max(...p95s) : null;
  const consensus_avg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;

  let signal = 'ok';
  if(!refs_agree) signal = 'warn';
  if(consensus_p95 != null){
    if(consensus_p95 >= thresholds.compare.consensus_deviation_fail_m) signal = 'fail';
    else if(consensus_p95 >= thresholds.compare.consensus_deviation_warn_m) signal = signal === 'fail' ? 'fail' : 'warn';
    else if(refs_agree) signal = 'ok';
  }

  return {
    refs_agree,
    motohud_vs_consensus_p95_m: consensus_p95,
    motohud_vs_consensus_avg_m: consensus_avg,
    signal
  };
}

function computeFixtureMetrics(fixture, thresholds){
  const mh = motohudMeta(fixture);
  if(!mh) return null;

  const refs = {};
  for(const p of PROVIDERS){
    refs[p] = refMeta(fixture, p);
  }

  const available = PROVIDERS.filter(p => refs[p]);
  const wps = fixture.waypoints;

  const pairs = {
    graphhopper_vs_motohud: refs.graphhopper
      ? pairCompare(mh, refs.graphhopper, wps)
      : null,
    ors_vs_motohud: refs.openrouteservice
      ? pairCompare(mh, refs.openrouteservice, wps)
      : null,
    yandex_vs_motohud: refs.yandex_web
      ? pairCompare(mh, refs.yandex_web, wps)
      : null,
    graphhopper_vs_ors: (refs.graphhopper && refs.openrouteservice)
      ? pairCompare(refs.graphhopper, refs.openrouteservice, wps)
      : null,
    graphhopper_vs_yandex: (refs.graphhopper && refs.yandex_web)
      ? pairCompare(refs.graphhopper, refs.yandex_web, wps)
      : null,
    ors_vs_yandex: (refs.openrouteservice && refs.yandex_web)
      ? pairCompare(refs.openrouteservice, refs.yandex_web, wps)
      : null
  };

  return {
    ...pairs,
    consensus_deviation: computeConsensus(mh, refs, thresholds, pairs),
    coverage: { references_available: available }
  };
}

async function main(){
  const { force, id } = parseArgs();
  const thresholds = loadConfig('thresholds');
  let files = listFixtureFiles();
  if(id) files = files.filter(f => f.includes(id));

  console.log(`[metrics] fixtures=${files.length} force=${force}`);

  let ok = 0, skip = 0, err = 0;

  for(const file of files){
    const fx = loadFixtureFile(file);
    if(!force && fx.metrics?.coverage){
      skip++;
      continue;
    }
    try{
      const metrics = computeFixtureMetrics(fx, thresholds);
      if(!metrics){
        console.log(`  ✗ ${fx.fixture_id.slice(0, 8)} no motohud cache`);
        err++;
        continue;
      }
      fx.metrics = metrics;
      fx.last_verified_at = new Date().toISOString();
      saveFixture(fx);
      const p95 = metrics.graphhopper_vs_motohud?.p95_lateral_m;
      const sig = metrics.consensus_deviation?.signal;
      console.log(`  ✓ ${fx.fixture_id.slice(0, 8)} GH↔MH p95=${p95?.toFixed(1) ?? '—'}m signal=${sig}`);
      ok++;
    }catch(e){
      console.log(`  ✗ ${fx.fixture_id.slice(0, 8)} ${e.message}`);
      err++;
    }
  }

  console.log(`[metrics] ok=${ok} skip=${skip} err=${err}`);
  if(err && !ok) process.exit(1);
}

main().catch(e => {
  console.error('[metrics] FATAL:', e);
  process.exit(1);
});
