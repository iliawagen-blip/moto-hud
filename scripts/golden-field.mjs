#!/usr/bin/env node
/**
 * Golden field regression: 3 эталонных jsonl vs потолки в manifest.
 *   node scripts/golden-field.mjs
 *   npm run nav:golden
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseTelemetryJsonl, summarizeSession } from '../js/telemetry-parse.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'fixtures', 'golden', 'manifest.json');

function pct(n, d){
  if(!d) return null;
  return Math.round((n / d) * 1000) / 10;
}

function analyzeFile(rel){
  const full = path.join(ROOT, rel);
  if(!fs.existsSync(full)){
    return { missing: true, file: rel };
  }
  const raw = fs.readFileSync(full, 'utf8');
  const parsed = parseTelemetryJsonl(raw);
  const summary = summarizeSession(parsed);
  const snaps = parsed.snaps || [];
  const nav = parsed.nav || [];
  const lat = snaps.map(s => s.lat_off).filter(v => v != null && Number.isFinite(v)).sort((a, b) => a - b);
  const p = (q) => lat.length
    ? lat[Math.min(lat.length - 1, Math.floor((q / 100) * (lat.length - 1)))]
    : null;
  const lost = snaps.filter(s => s.quality === 'LOST').length;
  const jumps = snaps.filter(s => s.jump).length;
  const reroutes = nav.filter(n => n.sub === 'reroute' || n.sub === 'offroute_reroute').length;
  return {
    missing: false,
    file: rel,
    snap_count: snaps.length,
    lat_off_p50: p(50),
    lat_off_p95: p(95),
    lat_off_max: lat.length ? lat[lat.length - 1] : null,
    snap_lost_ticks: lost,
    snap_lost_pct: pct(lost, snaps.length),
    snap_jumps: jumps,
    reroutes,
    good_pct: summary.qualPct?.GOOD ?? null
  };
}

function checkCase(c, m){
  const fails = [];
  if(m.missing){
    fails.push(`file missing: ${c.file}`);
    return fails;
  }
  for(const [k, lim] of Object.entries(c.max || {})){
    const cur = m[k];
    if(cur == null) continue;
    if(cur > lim) fails.push(`${k}=${cur} > max ${lim}`);
  }
  for(const [k, lim] of Object.entries(c.min || {})){
    const cur = m[k];
    if(cur == null){
      fails.push(`${k} missing (need ≥ ${lim})`);
      continue;
    }
    if(cur < lim) fails.push(`${k}=${cur} < min ${lim}`);
  }
  return fails;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
let ok = true;

console.log('golden-field', manifest.cases.length, 'cases\n');
for(const c of manifest.cases){
  const m = analyzeFile(c.file);
  const fails = checkCase(c, m);
  const pass = fails.length === 0;
  if(!pass) ok = false;
  console.log(`${pass ? 'OK' : 'FAIL'} ${c.id} — ${c.role}`);
  console.log('  ', JSON.stringify({
    lat_p95: m.lat_off_p95,
    lat_max: m.lat_off_max,
    lost_pct: m.snap_lost_pct,
    jumps: m.snap_jumps,
    reroutes: m.reroutes,
    good_pct: m.good_pct
  }));
  for(const f of fails) console.log('   !!', f);
  console.log('');
}

if(!ok){
  console.error('golden-field FAILED');
  process.exit(1);
}
console.log('golden-field OK');
