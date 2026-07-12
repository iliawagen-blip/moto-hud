#!/usr/bin/env node
/**
 * Этап 7: Playwright sim — on_route / deviation / noise_stress.
 *
 * Usage:
 *   node regression/scripts/run-sim.mjs [--id UUID] [--mode on_route|deviation|noise_stress] [--date YYYY-MM-DD]
 */
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { loadConfig } from './lib/env.mjs';
import { listFixtureFiles, loadFixtureFile } from './lib/fixtures-io.mjs';
import {
  cacheMotohudPath, cacheReferencePath, RESULTS_DIR, checkpointPath, saveJson, loadJson, REGRESSION_ROOT
} from './lib/paths.mjs';
import { startStaticServer, waitForHudFrame } from '../playwright/lib/page-helpers.mjs';
import { runSimMode } from '../playwright/sim-runner.mjs';

const PROJECT_ROOT = path.resolve(REGRESSION_ROOT, '..');

function parseArgs(){
  const args = process.argv.slice(2);
  const modes = ['on_route', 'deviation', 'noise_stress'];
  let mode = null;
  if(args.includes('--mode')){
    mode = args[args.indexOf('--mode') + 1];
    if(!modes.includes(mode)) throw new Error(`unknown mode: ${mode}`);
  }
  return {
    id: args.includes('--id') ? args[args.indexOf('--id') + 1] : null,
    force: args.includes('--force'),
    mode,
    date: args.includes('--date') ? args[args.indexOf('--date') + 1] : new Date().toISOString().slice(0, 10),
    port: args.includes('--port') ? Number(args[args.indexOf('--port') + 1]) : 3477 + Math.floor(Math.random() * 50),
    headless: !args.includes('--headed')
  };
}

function loadRouteCache(filePath){
  if(!fs.existsSync(filePath)) return null;
  try{ return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch{ return null; }
}

function loadCheckpoint(date){
  const p = checkpointPath(date, 'sim');
  if(!fs.existsSync(p)) return { completed: [] };
  try{ return loadJson(p); }catch{ return { completed: [] }; }
}

function saveCheckpoint(date, data){
  saveJson(checkpointPath(date, 'sim'), { ...data, phase: 'sim', date, updated_at: new Date().toISOString() });
}

function isDone(checkpoint, fixtureId, mode){
  return checkpoint.completed?.some(x => x.fixture_id === fixtureId && x.mode === mode);
}

async function main(){
  const { id, mode: onlyMode, date, port, headless, force } = parseArgs();
  const simCfg = loadConfig('sim');
  const thresholds = loadConfig('thresholds');
  const modes = onlyMode ? [onlyMode] : (simCfg.modes || ['on_route', 'deviation', 'noise_stress']);

  let files = listFixtureFiles();
  if(id) files = files.filter(f => f.includes(id));

  const checkpoint = loadCheckpoint(date);
  const outRoot = path.join(RESULTS_DIR, date, 'sim');
  fs.mkdirSync(outRoot, { recursive: true });

  console.log(`[sim] date=${date} fixtures=${files.length} modes=${modes.join(',')} port=${port}`);

  const server = await startStaticServer(port, PROJECT_ROOT);
  const browser = await chromium.launch({ headless });

  let pass = 0, fail = 0, skip = 0;
  const summary = [];

  try{
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 }
    });
    const page = await context.newPage();

    page.on('pageerror', err => console.warn('[sim] pageerror:', err.message));
    page.on('console', msg => {
      if(msg.type() === 'error') console.warn('[sim] console:', msg.text());
    });

    for(const file of files){
      const fixture = loadFixtureFile(file);
      const motohudCache = loadRouteCache(cacheMotohudPath(fixture.fixture_id));
      if(!motohudCache?.polyline?.length){
        console.log(`  ⊘ ${fixture.fixture_id.slice(0, 8)} no motohud cache`);
        skip += modes.length;
        continue;
      }

      const refCaches = {
        graphhopper: loadRouteCache(cacheReferencePath('graphhopper', fixture.fixture_id)),
        openrouteservice: loadRouteCache(cacheReferencePath('openrouteservice', fixture.fixture_id)),
        yandex_web: loadRouteCache(cacheReferencePath('yandex_web', fixture.fixture_id))
      };

      for(const mode of modes){
        if(!force && isDone(checkpoint, fixture.fixture_id, mode)){
          console.log(`  · ${fixture.fixture_id.slice(0, 8)} ${mode} (checkpoint)`);
          continue;
        }

        const simUrl = `${server.baseUrl}/sim.html?regression=1&autohud=0&t=${Date.now()}`;
        await page.goto(simUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await waitForHudFrame(page);

        const seed = parseInt(fixture.fixture_id.replace(/-/g, '').slice(0, 8), 16) ^ mode.length;

        let result;
        try{
          result = await runSimMode(page, {
            fixture,
            mode,
            motohudCache,
            refCaches,
            simCfg,
            thresholds,
            outDir: outRoot,
            seed
          });
        }catch(e){
          result = {
            fixture_id: fixture.fixture_id,
            mode,
            pass: false,
            crash: String(e.message || e),
            metrics: {},
            assertions: [{ name: 'runner', pass: false, detail: String(e.message || e) }]
          };
        }

        if(result.skipped){
          skip++;
          console.log(`  ⊘ ${fixture.fixture_id.slice(0, 8)} ${mode} — ${result.reason}`);
          continue;
        }

        const resultPath = path.join(outRoot, `${fixture.fixture_id}_${mode}.json`);
        saveJson(resultPath, result);
        summary.push(result);

        checkpoint.completed = checkpoint.completed || [];
        checkpoint.completed.push({ fixture_id: fixture.fixture_id, mode, pass: result.pass });
        saveCheckpoint(date, checkpoint);

        if(result.pass){
          pass++;
          console.log(`  ✓ ${fixture.fixture_id.slice(0, 8)} ${mode}`);
        }else{
          fail++;
          const why = result.assertions?.filter(a => !a.pass).map(a => a.name).join(', ') || result.crash || '?';
          console.log(`  ✗ ${fixture.fixture_id.slice(0, 8)} ${mode} — ${why}`);
        }
      }
    }

    await context.close();
  }finally{
    await browser.close();
    server.proc.kill();
  }

  const summaryPath = path.join(RESULTS_DIR, date, 'sim-summary.json');
  saveJson(summaryPath, {
    date,
    pass,
    fail,
    skip,
    total: pass + fail,
    results: summary,
    finished_at: new Date().toISOString()
  });

  console.log(`[sim] pass=${pass} fail=${fail} skip=${skip}`);
  console.log(`[sim] summary → ${summaryPath}`);

  if(fail > 0) process.exit(1);
}

main().catch(e => {
  console.error('[sim] FATAL:', e);
  process.exit(1);
});
