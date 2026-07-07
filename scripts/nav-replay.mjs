#!/usr/bin/env node
/**
 * Анализ телеметрии навигации: метрики snap / reroute / marks vs baseline.
 * Использование:
 *   node scripts/nav-replay.mjs path/to/session.jsonl
 *   node scripts/nav-replay.mjs --baseline fixtures/baseline_v0.json file1.jsonl file2.jsonl
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

function usage(){
  console.log(`Usage:
  node scripts/nav-replay.mjs <telemetry.jsonl> [...]
  node scripts/nav-replay.mjs --capture <telemetry.jsonl> [...]   # write baseline
  node scripts/nav-replay.mjs --baseline <baseline.json> <telemetry.jsonl> [...]`);
  process.exit(1);
}

function readJsonl(file){
  const text = fs.readFileSync(file, 'utf8');
  const events = [];
  for(const line of text.split(/\r?\n/)){
    const t = line.trim();
    if(!t) continue;
    try{ events.push(JSON.parse(t)); }catch(e){
      console.warn('skip bad line in', file);
    }
  }
  return events;
}

function pct(arr, p){
  if(!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
  return s[i];
}

function analyze(events, label){
  const snaps = events.filter(e => e.type === 'snap');
  const fixes = events.filter(e => e.type === 'fix');
  const nav = events.filter(e => e.type === 'nav');
  const marks = events.filter(e => e.type === 'mark');

  const latOffs = snaps.map(s => s.lat_off).filter(v => v != null && Number.isFinite(v));
  const jumps = snaps.filter(s => s.jump).length;
  const lost = snaps.filter(s => s.quality === 'LOST').length;
  const degraded = snaps.filter(s => s.quality === 'DEGRADED').length;
  const reroutes = nav.filter(n => n.sub === 'reroute' || n.sub === 'offroute_reroute').length;
  const phantomMarks = marks.filter(m =>
    /phantom/i.test(m.note || '') || (m.tags || []).includes('phantom_turn')
  ).length;

  const maxLat = latOffs.length ? Math.max(...latOffs) : null;
  const bigLat = latOffs.filter(v => v > 30).length;

  return {
    label: label || 'session',
    fix_count: fixes.length,
    snap_count: snaps.length,
    lat_off_p50: pct(latOffs, 50),
    lat_off_p95: pct(latOffs, 95),
    lat_off_max: maxLat,
    lat_off_gt30: bigLat,
    snap_jumps: jumps,
    snap_lost_ticks: lost,
    snap_degraded_ticks: degraded,
    reroutes,
    phantom_marks: phantomMarks,
    mark_count: marks.length
  };
}

function mergeMetrics(list){
  const sum = (k) => list.reduce((a, m) => a + (m[k] || 0), 0);
  const latAll = list.flatMap(m => {
    if(!m._lat_offs) return [];
    return m._lat_offs;
  });
  return {
    sessions: list.length,
    fix_count: sum('fix_count'),
    snap_count: sum('snap_count'),
    lat_off_p50: pct(latAll, 50),
    lat_off_p95: pct(latAll, 95),
    lat_off_max: latAll.length ? Math.max(...latAll) : null,
    lat_off_gt30: sum('lat_off_gt30'),
    snap_jumps: sum('snap_jumps'),
    snap_lost_ticks: sum('snap_lost_ticks'),
    snap_degraded_ticks: sum('snap_degraded_ticks'),
    reroutes: sum('reroutes'),
    phantom_marks: sum('phantom_marks'),
    mark_count: sum('mark_count')
  };
}

function analyzeFile(file){
  const events = readJsonl(file);
  const m = analyze(events, path.basename(file));
  const latOffs = events.filter(e => e.type === 'snap').map(s => s.lat_off).filter(Number.isFinite);
  m._lat_offs = latOffs;
  return m;
}

function compareToBaseline(metrics, baseline){
  const rows = [];
  const checks = [
    ['lat_off_p95', 'max', m => m.lat_off_p95],
    ['lat_off_gt30', 'max', m => m.lat_off_gt30],
    ['snap_jumps', 'max', m => m.snap_jumps],
    ['snap_lost_ticks', 'max', m => m.snap_lost_ticks],
    ['reroutes', 'max', m => m.reroutes],
    ['phantom_marks', 'max', m => m.phantom_marks]
  ];
  let ok = true;
  for(const [key, mode, pick] of checks){
    const cur = pick(metrics);
    const base = baseline.metrics?.[key];
    if(base == null) continue;
    const pass = mode === 'max' ? (cur == null || cur <= base) : cur === base;
    if(!pass) ok = false;
    rows.push({ key, current: cur, baseline: base, pass });
  }
  return { ok, rows };
}

function printMetrics(m){
  console.log(JSON.stringify(m, (k, v) => k.startsWith('_') ? undefined : v, 2));
}

const args = process.argv.slice(2);
if(!args.length) usage();

let mode = 'analyze';
let baselinePath = path.join(ROOT, 'fixtures', 'baseline_v0.json');
const files = [];

for(let i = 0; i < args.length; i++){
  if(args[i] === '--baseline'){ mode = 'compare'; baselinePath = args[++i]; }
  else if(args[i] === '--capture'){ mode = 'capture'; }
  else files.push(args[i]);
}

if(!files.length) usage();

const perFile = files.map(analyzeFile);
const merged = mergeMetrics(perFile);

if(mode === 'capture'){
  const out = {
    version: 1,
    capturedAt: new Date().toISOString(),
    source: files.map(f => path.basename(f)),
    metrics: { ...merged }
  };
  delete out.metrics._lat_offs;
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, JSON.stringify(out, null, 2));
  console.log('baseline written:', baselinePath);
  printMetrics(out.metrics);
  process.exit(0);
}

console.log('--- per file ---');
perFile.forEach(m => printMetrics(m));

console.log('\n--- merged ---');
printMetrics(merged);

if(mode === 'compare' && fs.existsSync(baselinePath)){
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const { ok, rows } = compareToBaseline(merged, baseline);
  console.log('\n--- vs baseline ---');
  for(const r of rows){
    console.log(`${r.pass ? 'OK' : 'FAIL'} ${r.key}: ${r.current} (baseline ≤ ${r.baseline})`);
  }
  process.exit(ok ? 0 : 1);
}
