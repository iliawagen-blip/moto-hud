#!/usr/bin/env node
/**
 * Агрегация состояния regression-конвейера → state/current.json
 * Usage: node regression/scripts/update-state.mjs
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  REGRESSION_ROOT, CACHE_DIR, RESULTS_DIR, loadJson, saveJson, graphhopperCounterPath
} from './lib/paths.mjs';
import { listFixtureFiles } from './lib/fixtures-io.mjs';
import { readGraphhopperCounter } from './lib/graphhopper-counter.mjs';

const STATE_PATH = path.join(REGRESSION_ROOT, 'state', 'current.json');
const INVESTIGATIONS_DIR = path.join(REGRESSION_ROOT, 'reports', 'investigations');

function todayUtc(){
  return new Date().toISOString().slice(0, 10);
}

function hasCache(sub, id){
  return fs.existsSync(path.join(CACHE_DIR, sub, `${id}.json`));
}

function hasRef(provider, id){
  return fs.existsSync(path.join(CACHE_DIR, 'references', provider, `${id}.json`));
}

function loadFixturesSafe(){
  const out = [];
  for(const file of listFixtureFiles()){
    try{
      out.push(JSON.parse(fs.readFileSync(file, 'utf8')));
    }catch{ /* skip corrupt */ }
  }
  return out;
}

function isValidFixture(f){
  return !['invalid', 'parse_failed', 'route_failed'].includes(f.status);
}

function lastNightlySim(){
  if(!fs.existsSync(RESULTS_DIR)) return null;
  const dates = fs.readdirSync(RESULTS_DIR)
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  if(!dates.length) return null;
  const date = dates[dates.length - 1];
  const summaryPath = path.join(RESULTS_DIR, date, 'sim-summary.json');
  if(!fs.existsSync(summaryPath)) return { date, pass: null, total: null, rate_pct: null };
  const s = loadJson(summaryPath);
  const pass = s.pass ?? 0;
  const total = s.total ?? 0;
  return { date, pass, total, rate_pct: total ? Math.round(100 * pass / total) : null };
}

function median(arr){
  if(!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function gitRegressionCommit(){
  const r = spawnSync('git', ['log', '-1', '--format=%H %ci', '--', 'regression/'], {
    cwd: path.join(REGRESSION_ROOT, '..'),
    encoding: 'utf8'
  });
  if(r.status !== 0 || !r.stdout.trim()) return null;
  const [hash, ...rest] = r.stdout.trim().split(' ');
  return { hash, date: rest.join(' ') };
}

function readOrsCounter(){
  const p = path.join(CACHE_DIR, 'counters', `openrouteservice-${todayUtc()}.json`);
  if(!fs.existsSync(p)) return 0;
  try{ return loadJson(p).count ?? 0; }catch{ return 0; }
}

function hoursUntilReset(resetAt){
  if(!resetAt) return null;
  const ms = new Date(resetAt).getTime() - Date.now();
  if(!Number.isFinite(ms)) return null;
  return Math.max(0, Math.round(ms / 36e5));
}

function collectKnownIssues(fixtures){
  const issues = [];
  for(const f of fixtures){
    for(const i of f.metadata?.known_issues ?? f.known_issues ?? []){
      issues.push(`${f.fixture_id.slice(0, 8)}: ${i}`);
    }
  }
  return issues;
}

function buildState(){
  const fixtures = loadFixturesSafe();
  const valid = fixtures.filter(isValidFixture);
  let fullCoverage = 0;
  const p95Values = [];
  let refsAgree = 0;
  let refsTotal = 0;

  for(const f of valid){
    const id = f.fixture_id;
    if(hasCache('motohud', id) && hasRef('graphhopper', id) && hasRef('openrouteservice', id)){
      fullCoverage++;
    }
    const cd = f.metrics?.consensus_deviation;
    if(cd){
      refsTotal++;
      if(cd.refs_agree) refsAgree++;
    }
    const p95 = f.metrics?.consensus_deviation?.motohud_vs_consensus_p95_m
      ?? f.metrics?.ors_vs_motohud?.p95_lateral_m;
    if(p95 != null) p95Values.push(p95);
  }

  let yandexLast = null;
  for(const f of valid){
    const t = f.references?.yandex_web?.fetched_at;
    if(t && (!yandexLast || t > yandexLast)) yandexLast = t;
  }

  const gh = readGraphhopperCounter();
  const nightly = lastNightlySim();
  const investigations = fs.existsSync(INVESTIGATIONS_DIR)
    ? fs.readdirSync(INVESTIGATIONS_DIR).filter(f => f.endsWith('.md')).length
    : 0;

  return {
    updated_at: new Date().toISOString(),
    fixtures: {
      total: fixtures.length,
      valid: valid.length,
      full_coverage: fullCoverage,
      full_coverage_pct: valid.length ? Math.round(100 * fullCoverage / valid.length) : 0
    },
    sim: {
      last_nightly_date: nightly?.date ?? null,
      last_pass: nightly?.pass ?? null,
      last_total: nightly?.total ?? null,
      last_pass_rate_pct: nightly?.rate_pct ?? null,
      fixtures_tested: nightly?.total
        ? [...new Set(loadJson(path.join(RESULTS_DIR, nightly.date, 'sim-summary.json')).results?.map(r => r.fixture_id) ?? [])].length
        : 1
    },
    metrics: {
      median_p95_lateral_m: median(p95Values),
      refs_agree_pct: refsTotal ? Math.round(100 * refsAgree / refsTotal) : null
    },
    api_counters: {
      graphhopper: { today: gh.count, limit: 500, reset_at: gh.reset_at, resets_in_h: hoursUntilReset(gh.reset_at) },
      openrouteservice: { today: readOrsCounter(), limit: 2000 }
    },
    yandex: {
      last_fetch_at: yandexLast,
      blocked_until: null
    },
    known_issues: collectKnownIssues(valid),
    investigations_pending: investigations,
    git: gitRegressionCommit()
  };
}

const state = buildState();
saveJson(STATE_PATH, state);
console.log(`[state] written ${STATE_PATH}`);
console.log(JSON.stringify(state, null, 2));
