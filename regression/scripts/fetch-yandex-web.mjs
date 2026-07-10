#!/usr/bin/env node
/**
 * Яндекс.Карты web-scrape (Playwright) — только worst_case_candidate.
 *
 * Usage:
 *   node regression/scripts/fetch-yandex-web.mjs --force-enable --id <uuid>
 *   node regression/scripts/fetch-yandex-web.mjs --force-enable --headed
 *
 * Не входит в nightly по умолчанию. rate-limits.json: yandex_web.enabled=false.
 */
import fs from 'fs';
import { loadConfig } from './lib/env.mjs';
import { sleep } from './lib/rate-limit.mjs';
import { listFixtureFiles, loadFixtureFile, saveFixture } from './lib/fixtures-io.mjs';
import { cacheReferencePath, checkpointPath, saveJson } from './lib/paths.mjs';
import { fetchYandexRoute, randomDelayMs } from './lib/yandex-web.mjs';

function parseArgs(){
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force'),
    forceEnable: args.includes('--force-enable'),
    headed: args.includes('--headed'),
    id: args.includes('--id') ? args[args.indexOf('--id') + 1] : null,
    date: args.includes('--date') ? args[args.indexOf('--date') + 1] : new Date().toISOString().slice(0, 10)
  };
}

function loadYandexCheckpoint(date){
  const p = checkpointPath(date, 'yandex');
  if(!fs.existsSync(p)) return { processed_ids: [] };
  try{
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }catch{
    return { processed_ids: [] };
  }
}

function saveYandexCheckpoint(date, data){
  saveJson(checkpointPath(date, 'yandex'), {
    date,
    updated_at: new Date().toISOString(),
    ...data
  });
}

function filterFixtures(files, { id, checkpoint, force }){
  let list = files.map(f => loadFixtureFile(f));
  if(id){
    list = list.filter(fx => fx.fixture_id.includes(id));
    return list;
  }
  list = list.filter(fx => fx.metadata?.priority === 'worst_case_candidate');
  if(!force){
    const done = new Set(checkpoint.processed_ids || []);
    list = list.filter(fx => !done.has(fx.fixture_id));
  }
  return list;
}

async function processFixture(fixture, force, headed){
  const cachePath = cacheReferencePath('yandex_web', fixture.fixture_id);
  const ref = fixture.references?.yandex_web;
  if(!force && ref?.fetched_at && !ref?.fetch_error && fs.existsSync(cachePath)){
    return { skipped: true };
  }

  const result = await fetchYandexRoute({ waypoints: fixture.waypoints, headed });

  if(!result.ok){
    fixture.references.yandex_web = {
      distance_m: null,
      duration_s: null,
      maneuver_count: null,
      roundabout_count: null,
      fetched_at: new Date().toISOString(),
      fetch_error: result.error,
      provider_meta: { url: result.url }
    };
    saveFixture(fixture);
    return { error: result.error, captcha: result.error === 'captcha' };
  }

  const fetchedAt = new Date().toISOString();
  const dom = result.dom || {};
  const hasPolyline = Array.isArray(result.polyline) && result.polyline.length >= 8;

  if(!hasPolyline){
    fixture.references.yandex_web = {
      distance_m: dom.distance_m,
      duration_s: dom.duration_s,
      maneuver_count: null,
      roundabout_count: null,
      fetched_at: fetchedAt,
      fetch_error: 'polyline_not_extracted',
      fetch_method: null,
      provider_meta: {
        ...result.provider_meta,
        url: result.url
      }
    };
    saveFixture(fixture);
    return {
      ok: false,
      partial: true,
      distance_m: dom.distance_m,
      error: 'polyline_not_extracted'
    };
  }

  const cache = {
    fixture_id: fixture.fixture_id,
    provider: 'yandex_web',
    fetched_at: fetchedAt,
    polyline: result.polyline,
    distance_m: dom.distance_m ?? Math.round(result.polyline.length * 50),
    duration_s: dom.duration_s,
    fetch_method: result.fetch_method || 'network_intercept'
  };
  saveJson(cachePath, cache);

  fixture.references.yandex_web = {
    distance_m: cache.distance_m,
    duration_s: cache.duration_s,
    maneuver_count: null,
    roundabout_count: null,
    fetched_at: fetchedAt,
    fetch_error: null,
    fetch_method: cache.fetch_method,
    provider_meta: {
      ...result.provider_meta,
      url: result.url
    }
  };
  saveFixture(fixture);
  return { ok: true, distance_m: cache.distance_m, polyline_pts: result.polyline.length };
}

async function main(){
  const { force, forceEnable, headed, id, date } = parseArgs();
  const rateCfg = loadConfig('rate-limits').yandex_web || {};

  if(!rateCfg.enabled && !forceEnable){
    console.error('[yandex] yandex_web.enabled=false в rate-limits.json. Используйте --force-enable для ручного запуска.');
    process.exit(1);
  }

  const maxPerRun = rateCfg.max_per_run ?? 25;
  const delayMin = rateCfg.delay_between_req_ms_min ?? 120000;
  const delayMax = rateCfg.delay_between_req_ms_max ?? 180000;

  const checkpoint = loadYandexCheckpoint(date);
  const files = listFixtureFiles();
  let fixtures = filterFixtures(files, { id, checkpoint, force });

  if(!fixtures.length){
    console.log('[yandex] Нет fixtures для обработки (нужен metadata.priority=worst_case_candidate или --id)');
    process.exit(0);
  }

  fixtures = fixtures.slice(0, maxPerRun);
  console.log(`[yandex] fixtures=${fixtures.length} delay=${delayMin}-${delayMax}ms force=${force} headed=${headed}`);

  let ok = 0;
  let partial = 0;
  let skip = 0;
  let err = 0;
  const processed = [...(checkpoint.processed_ids || [])];

  for(let i = 0; i < fixtures.length; i++){
    const fx = fixtures[i];
    if(i > 0){
      const delay = randomDelayMs(delayMin, delayMax);
      console.log(`[yandex] пауза ${Math.round(delay / 1000)} с…`);
      await sleep(delay);
    }

    console.log(`[yandex] → ${fx.fixture_id.slice(0, 8)} (${fx.metadata?.priority})`);
    const r = await processFixture(fx, force, headed);
    processed.push(fx.fixture_id);

    if(r.skipped){
      skip++;
      console.log(`  ⊘ skip (cache)`);
      continue;
    }
    if(r.captcha){
      err++;
      saveYandexCheckpoint(date, { processed_ids: processed, stopped_reason: 'captcha' });
      console.error('[yandex] CAPTCHA — остановка прогона');
      process.exit(3);
    }
    if(r.ok){
      ok++;
      console.log(`  ✓ ${(r.distance_m / 1000).toFixed(1)} km, ${r.polyline_pts} pts`);
    }else if(r.partial){
      partial++;
      console.log(`  △ DOM only ${r.distance_m ? (r.distance_m / 1000).toFixed(1) + ' km' : '—'} (${r.error})`);
    }else{
      err++;
      console.log(`  ✗ ${r.error}`);
    }

    saveYandexCheckpoint(date, { processed_ids: processed, stopped_reason: null });
  }

  console.log(`[yandex] ok=${ok} partial=${partial} skip=${skip} err=${err}`);
  if(err && !ok && !partial) process.exit(1);
}

main().catch(e => {
  console.error('[yandex] FATAL:', e);
  process.exit(1);
});
