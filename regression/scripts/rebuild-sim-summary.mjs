#!/usr/bin/env node
/**
 * Сборка sim-summary.json из артефактов regression/results/{date}/sim/*.json
 * Usage: node regression/scripts/rebuild-sim-summary.mjs [--date YYYY-MM-DD]
 */
import fs from 'fs';
import path from 'path';
import { RESULTS_DIR, saveJson, loadJson } from './lib/paths.mjs';

function parseArgs(){
  const args = process.argv.slice(2);
  return {
    date: args.includes('--date') ? args[args.indexOf('--date') + 1] : new Date().toISOString().slice(0, 10)
  };
}

function parseName(name){
  const m = name.match(/^([0-9a-f-]{36})_(on_route|deviation|noise_stress)\.json$/i);
  if(!m) return null;
  return { fixture_id: m[1], mode: m[2] };
}

function main(){
  const { date } = parseArgs();
  const simDir = path.join(RESULTS_DIR, date, 'sim');
  if(!fs.existsSync(simDir)){
    console.error('[rebuild-sim-summary] нет папки', simDir);
    process.exit(1);
  }

  /** @type {Map<string, { mtime: number, result: object }>} */
  const best = new Map();
  for(const name of fs.readdirSync(simDir)){
    if(!name.endsWith('.json') || name === '_manifest.json') continue;
    const meta = parseName(name);
    if(!meta) continue;
    const fp = path.join(simDir, name);
    let result;
    try{
      result = loadJson(fp);
    }catch{
      continue;
    }
    const key = meta.fixture_id + ':' + meta.mode;
    const mtime = fs.statSync(fp).mtimeMs;
    const prev = best.get(key);
    if(!prev || mtime >= prev.mtime){
      best.set(key, { mtime, result: { ...result, fixture_id: meta.fixture_id, mode: meta.mode } });
    }
  }

  const results = [...best.values()].map(v => v.result).sort((a, b) => {
    const c = a.fixture_id.localeCompare(b.fixture_id);
    return c || a.mode.localeCompare(b.mode);
  });

  const pass = results.filter(r => r.pass && !r.skipped).length;
  const fail = results.filter(r => !r.pass && !r.skipped).length;
  const skip = results.filter(r => r.skipped).length;

  const summary = {
    date,
    pass,
    fail,
    skip,
    total: pass + fail,
    results,
    rebuilt_from_artifacts: true,
    finished_at: new Date().toISOString()
  };

  const out = path.join(RESULTS_DIR, date, 'sim-summary.json');
  saveJson(out, summary);
  console.log(`[rebuild-sim-summary] ${results.length} runs → pass=${pass} fail=${fail} skip=${skip}`);
  console.log(`[rebuild-sim-summary] → ${out}`);
}

main();
