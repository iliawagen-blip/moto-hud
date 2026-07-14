#!/usr/bin/env node
/**
 * Ночной оркестратор regression-конвейера.
 *
 * Usage:
 *   node regression/scripts/run-nightly.mjs
 *   node regression/scripts/run-nightly.mjs --fixtures 5 --skip-yandex
 *   node regression/scripts/run-nightly.mjs --skip-sim --skip-fetch
 */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { getOrsKey, getGraphhopperKey } from './lib/env.mjs';
import {
  RESULTS_DIR, REPORTS_DIR, checkpointPath, saveJson, loadJson, graphhopperCounterPath
} from './lib/paths.mjs';
import { listFixtureFiles } from './lib/fixtures-io.mjs';
import { runRegressionScript, PROJECT_ROOT, SCRIPTS_DIR } from './lib/run-child.mjs';
import { appendHardKillError } from './lib/health-check.mjs';

const PHASES = ['cleanup', 'build', 'motohud', 'graphhopper', 'ors', 'metrics', 'sim', 'report'];

function parseArgs(){
  const args = process.argv.slice(2);
  return {
    date: args.includes('--date') ? args[args.indexOf('--date') + 1] : new Date().toISOString().slice(0, 10),
    fixturesLimit: args.includes('--fixtures') ? Number(args[args.indexOf('--fixtures') + 1]) : null,
    skipSim: args.includes('--skip-sim'),
    skipFetch: args.includes('--skip-fetch'),
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
    fromPhase: args.includes('--from') ? args[args.indexOf('--from') + 1] : null
  };
}

function loadNightlyCheckpoint(date){
  const p = checkpointPath(date, 'nightly');
  if(!fs.existsSync(p)) return { completed_phases: [] };
  try{ return loadJson(p); }catch{ return { completed_phases: [] }; }
}

function saveNightlyCheckpoint(date, completed){
  saveJson(checkpointPath(date, 'nightly'), {
    date,
    completed_phases: [...completed],
    updated_at: new Date().toISOString()
  });
}

function fixtureIdsLimited(limit){
  let files = listFixtureFiles();
  files.sort();
  if(limit && limit > 0) files = files.slice(0, limit);
  return files.map(f => path.basename(f, '.json'));
}

function readGhCount(){
  try{
    if(fs.existsSync(graphhopperCounterPath())){
      return loadJson(graphhopperCounterPath()).count ?? null;
    }
  }catch(e){ /* ignore */ }
  return null;
}

function progressLine(ctx){
  return `[nightly] ${ctx.date} · phase=${ctx.phase} · fixtures=${ctx.fixtureCount}` +
    (ctx.ghCount != null ? ` · GH≈${ctx.ghCount}/500` : '');
}

function runBuild(){
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [path.join(PROJECT_ROOT, 'scripts', 'build-web.mjs')], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit'
    });
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`build exit ${code}`)));
  });
}

async function runPhase(name, fn, date, ctx){
  if(ctx.completed.has(name)){
    console.log(`[nightly] · skip ${name} (checkpoint)`);
    return;
  }
  ctx.phase = name;
  console.log(`\n[nightly] ▶ ${name}`);
  if(ctx.dryRun){
    ctx.completed.add(name);
    saveNightlyCheckpoint(date, ctx.completed);
    return;
  }
  const t0 = Date.now();
  try{
    await fn();
    ctx.completed.add(name);
    saveNightlyCheckpoint(date, ctx.completed);
    console.log(`[nightly] ✓ ${name} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }catch(e){
    appendHardKillError(date, { phase: name, reason: String(e.message || e) });
    throw e;
  }
}

async function maybeTelegram(summaryPath){
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chat = process.env.TELEGRAM_CHAT_ID?.trim();
  if(!token || !chat || !fs.existsSync(summaryPath)) return;
  try{
    const s = loadJson(summaryPath);
    const text = `MotoHUD regression ${s.date}\nCI: ${s.ci_gate ? 'PASS' : 'FAIL'}\nsim: ${s.sim_pass}/${s.sim_total}\nconsensus fail: ${s.consensus_fail}`;
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text })
    });
    if(!res.ok) console.warn('[nightly] Telegram HTTP', res.status);
  }catch(e){
    console.warn('[nightly] Telegram:', e.message);
  }
}

async function main(){
  const { date, fixturesLimit, skipSim, skipFetch, force, dryRun, fromPhase } = parseArgs();
  const ids = fixtureIdsLimited(fixturesLimit);
  const fixtureCount = ids.length;

  fs.mkdirSync(path.join(RESULTS_DIR, date), { recursive: true });

  const cp = loadNightlyCheckpoint(date);
  const completed = new Set(cp.completed_phases || []);
  if(fromPhase){
    const idx = PHASES.indexOf(fromPhase);
    if(idx >= 0) for(const p of PHASES.slice(idx)) completed.delete(p);
  }

  const ctx = {
    date,
    fixtureCount,
    completed,
    dryRun,
    phase: 'init',
    ghCount: readGhCount()
  };

  const heartbeat = setInterval(() => console.log(progressLine(ctx)), 5 * 60 * 1000);

  const forceArgs = force ? ['--force'] : [];
  const dateArgs = ['--date', date];

  console.log(`[nightly] start date=${date} fixtures=${fixtureCount} skipFetch=${skipFetch} skipSim=${skipSim}`);

  try{
    await runPhase('cleanup', () => runRegressionScript('cleanup-cache.mjs'), date, ctx);

    await runPhase('build', () => runBuild(), date, ctx);

    if(!skipFetch){
      await runPhase('motohud', () => runRegressionScript('fetch-motohud-routes.mjs', forceArgs), date, ctx);

      if(getGraphhopperKey()){
        await runPhase('graphhopper', () => runRegressionScript('fetch-graphhopper.mjs', forceArgs), date, ctx);
        ctx.ghCount = readGhCount();
      }else{
        console.log('[nightly] ⊘ graphhopper — нет GRAPHHOPPER_API_KEY');
      }

      if(getOrsKey()){
        await runPhase('ors', () => runRegressionScript('fetch-openrouteservice.mjs', forceArgs), date, ctx);
      }else{
        console.log('[nightly] ⊘ ors — нет ORS_API_KEY');
      }
    }else{
      console.log('[nightly] ⊘ fetch phases skipped');
    }

    await runPhase('metrics', () => runRegressionScript('compute-metrics.mjs', forceArgs), date, ctx);

    if(!skipSim){
      await runPhase('sim', () => runRegressionScript('run-sim.mjs', [...dateArgs, ...forceArgs], { allowFail: true }), date, ctx);
    }else{
      console.log('[nightly] ⊘ sim skipped');
    }

    await runPhase('report', () => runRegressionScript('generate-report.mjs', dateArgs), date, ctx);

    const summaryPath = path.join(REPORTS_DIR, date, 'summary.json');
    await maybeTelegram(summaryPath);

    console.log(`\n[nightly] done ${date}`);
  }finally{
    clearInterval(heartbeat);
  }
}

main().catch(e => {
  console.error('[nightly] FATAL:', e);
  process.exit(1);
});
