#!/usr/bin/env node
/**
 * GH burn: generate + fetch + metrics до target GH count. Sim не запускается.
 * Resume: читает cache/checkpoints/{date}-gh-burn.json
 * Usage: node regression/scripts/gh-burn-loop.mjs [--target 440] [--date YYYY-MM-DD] [--batches N]
 */
import fs from 'fs';
import path from 'path';
import { runRegressionScript } from './lib/run-child.mjs';
import { readGraphhopperCounter } from './lib/graphhopper-counter.mjs';
import { RESULTS_DIR, FIXTURES_AUTO, CACHE_DIR, saveJson, loadJson } from './lib/paths.mjs';
import { listFixtureFiles } from './lib/fixtures-io.mjs';

function parseArgs(){
  const args = process.argv.slice(2);
  return {
    target: args.includes('--target') ? Number(args[args.indexOf('--target') + 1]) : 440,
    date: args.includes('--date') ? args[args.indexOf('--date') + 1] : new Date().toISOString().slice(0, 10),
    maxBatches: args.includes('--batches') ? Number(args[args.indexOf('--batches') + 1]) : null
  };
}

function checkpointPath(date){
  return path.join(CACHE_DIR, 'checkpoints', `${date}-gh-burn.json`);
}

function loadBurnState(date){
  const p = checkpointPath(date);
  if(!fs.existsSync(p)) return null;
  try{ return loadJson(p); }catch{ return null; }
}

function saveBurnState(date, state){
  saveJson(checkpointPath(date), { ...state, updated_at: new Date().toISOString() });
}

function pruneEmptyFixtures(){
  if(!fs.existsSync(FIXTURES_AUTO)) return 0;
  let n = 0;
  for(const f of fs.readdirSync(FIXTURES_AUTO)){
    if(!f.endsWith('.json') || f.startsWith('_')) continue;
    const fp = path.join(FIXTURES_AUTO, f);
    const raw = fs.readFileSync(fp, 'utf8').trim();
    if(!raw.length){
      fs.unlinkSync(fp);
      n++;
    }
  }
  return n;
}

function appendCheckpoint(date, gh, fixtures, batch, note = ''){
  const logPath = path.join(RESULTS_DIR, date, 'session-log.md');
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const line = `\n### GH burn checkpoint ${new Date().toISOString()}\n- GH: **${gh}/500** (target 440)\n- Fixtures valid: ${fixtures}\n- Batch: ${batch}\n${note ? `- ${note}\n` : ''}`;
  fs.appendFileSync(logPath, line, 'utf8');
  console.log(`[gh-burn] checkpoint GH=${gh} fixtures=${fixtures}`);
}

async function runBatch(seed){
  pruneEmptyFixtures();
  await runRegressionScript('generate-waypoints.mjs', ['--count', '10', '--seed', String(seed)], { allowFail: true });
  await runRegressionScript('fetch-motohud-routes.mjs', [], { allowFail: true });
  await runRegressionScript('fetch-graphhopper.mjs', [], { allowFail: true });
  await runRegressionScript('fetch-openrouteservice.mjs', [], { allowFail: true });
  await runRegressionScript('compute-metrics.mjs', [], { allowFail: true });
}

async function main(){
  const { target, date, maxBatches } = parseArgs();
  const prev = loadBurnState(date);
  let seed = prev?.seed ?? Date.now();
  let batch = prev?.batch ?? 0;
  let lastBucket = prev?.last_bucket ?? Math.floor(readGraphhopperCounter().count / 50);
  let batchesDone = 0;

  console.log(`[gh-burn] start target=${target} date=${date} GH=${readGraphhopperCounter().count} resume=${!!prev}`);

  while(readGraphhopperCounter().count < target){
    if(maxBatches != null && batchesDone >= maxBatches) break;

    batch++;
    batchesDone++;
    const gh0 = readGraphhopperCounter().count;
    if(gh0 >= target) break;

    try{
      await runBatch(seed++);
    }catch(e){
      console.warn('[gh-burn] batch error:', e.message);
    }

    const gh = readGraphhopperCounter().count;
    const fixtures = listFixtureFiles().length;
    const bucket = Math.floor(gh / 50);
    if(bucket > lastBucket){
      appendCheckpoint(date, gh, fixtures, batch, `ΔGH +${gh - gh0}`);
      lastBucket = bucket;
    }

    saveBurnState(date, { date, target, seed, batch, last_bucket: lastBucket, gh, fixtures });

    console.log(`[gh-burn] batch ${batch} done GH=${gh}/${target} fixtures=${fixtures}`);
    if(gh >= target) break;
  }

  const finalGh = readGraphhopperCounter().count;
  const finished = finalGh >= target;
  if(finished){
    appendCheckpoint(date, finalGh, listFixtureFiles().length, batch, '**burn loop finished**');
    saveBurnState(date, { date, target, seed, batch, last_bucket: lastBucket, gh: finalGh, finished: true });
  }
  console.log(`[gh-burn] ${finished ? 'finished' : 'paused'} GH=${finalGh}`);
}

main().catch(e => {
  console.error('[gh-burn] FATAL:', e);
  process.exit(1);
});
