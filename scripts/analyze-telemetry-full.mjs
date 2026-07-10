import { readFileSync } from 'node:fs';

const path = process.argv[2];
const raw = readFileSync(path, 'utf8');
const events = raw.trim().split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const meta = events.find(e => e.type === 'meta' || e.sub === 'session_start') || events[0];
const fixes = events.filter(e => e.type === 'fix');
const snaps = events.filter(e => e.type === 'snap');
const nav = events.filter(e => e.type === 'nav');

console.log('=== SESSION ===');
const start = events.find(e => e.type === 'meta' && e.sub === 'session_start') || events.find(e => e.build);
console.log('events', events.length, 'fixes', fixes.length, 'snaps', snaps.length);
console.log('build', events.find(e => e.build)?.build || meta?.build);
console.log('ua', (events.find(e => e.ua)?.ua || '').slice(0, 80));

// Speed analysis
let zeroSpd = 0, hasDev = 0, devZeroResolvedZero = 0, devZeroResolvedNonZero = 0;
const srcCount = {};
for (const f of fixes) {
  if (f.spd === 0) zeroSpd++;
  if (f.dev != null) {
    hasDev++;
    if (f.dev === 0 && f.spd === 0) devZeroResolvedZero++;
    if (f.dev === 0 && f.spd > 0) devZeroResolvedNonZero++;
  }
  if (f.spd_src) srcCount[f.spd_src] = (srcCount[f.spd_src] || 0) + 1;
}
console.log('\n=== SPEED ===');
console.log('spd=0:', zeroSpd, '/', fixes.length);
console.log('with dev field:', hasDev, '(new logging)');
console.log('dev=0 -> spd=0:', devZeroResolvedZero, 'dev=0 -> spd>0:', devZeroResolvedNonZero);
console.log('spd_src:', srcCount);

// Lateral / snap
const latOffs = snaps.map(s => s.lat_off).filter(v => v != null && Number.isFinite(v));
latOffs.sort((a, b) => a - b);
const pct = (p) => latOffs.length ? latOffs[Math.floor(p / 100 * (latOffs.length - 1))] : null;
console.log('\n=== SNAP LATERAL (m) ===');
console.log('count', latOffs.length, 'p50', pct(50), 'p75', pct(75), 'p95', pct(95), 'max', latOffs.at(-1));
const qual = {};
for (const s of snaps) qual[s.quality || '?'] = (qual[s.quality || '?'] || 0) + 1;
console.log('quality:', qual);

// Join fix+snap by proximity in sequence (fixes often followed by snap)
let pairs = [];
for (let i = 0; i < events.length; i++) {
  if (events[i].type !== 'fix') continue;
  const snap = events.slice(i + 1, i + 4).find(e => e.type === 'snap');
  if (snap) pairs.push({ spd: events[i].spd, lat_off: snap.lat_off, acc: events[i].acc, dev: events[i].dev, meas: events[i].meas, src: events[i].spd_src });
}
const movingPairs = pairs.filter(p => p.lat_off > 3);
console.log('\n=== FIX+SNAP pairs (lat_off>3m):', movingPairs.length);
if (movingPairs.length) {
  const avgLat = movingPairs.reduce((s, p) => s + p.lat_off, 0) / movingPairs.length;
  const spd0 = movingPairs.filter(p => p.spd === 0).length;
  console.log('avg lateral', avgLat.toFixed(1), 'm, spd=0 while moving offset:', spd0);
  console.log('sample:', movingPairs.slice(0, 5));
}

// acc stats
const accs = fixes.map(f => f.acc).filter(v => v != null);
accs.sort((a, b) => a - b);
console.log('\n=== GPS ACC (m) ===');
console.log('p50', pctAcc(50), 'p95', pctAcc(95));
function pctAcc(p) { return accs[Math.floor(p / 100 * (accs.length - 1))]?.toFixed(2); }

// nav events of interest
const subs = {};
for (const n of nav) subs[n.sub || '?'] = (subs[n.sub || '?'] || 0) + 1;
console.log('\n=== NAV events ===', subs);

const autoMap = nav.filter(n => n.sub === 'view_auto_map');
console.log('view_auto_map:', autoMap.length);

const offroute = nav.filter(n => n.sub === 'offroute_state');
console.log('offroute transitions:', offroute.length, offroute.slice(-3));

// heading / speed when lat_off high
const highLat = pairs.filter(p => p.lat_off > 15 && p.lat_off < 60);
console.log('\n=== High lateral 15-60m (urban lane offset?) ===', highLat.length);
if (highLat.length) {
  console.log('spd=0 count', highLat.filter(p => p.spd === 0).length);
  console.log('sample', highLat.slice(0, 8));
}
