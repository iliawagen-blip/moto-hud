import { readFileSync } from 'node:fs';
import {
  parseTelemetryJsonl,
  summarizeSession,
  buildFixSnapPairs
} from '../js/telemetry-parse.mjs';

const path = process.argv[2];
if(!path){
  console.error('Usage: node scripts/analyze-telemetry-full.mjs <file.jsonl>');
  process.exit(1);
}

const raw = readFileSync(path, 'utf8');
const parsed = parseTelemetryJsonl(raw);
const summary = summarizeSession(parsed);
const pairs = buildFixSnapPairs(parsed.events);

console.log('=== SESSION ===');
console.log('events', parsed.events.length, 'fixes', parsed.fixes.length, 'snaps', parsed.snaps.length);
console.log('build', summary.buildId);
console.log('duration', summary.durationLabel);
console.log('routeKm', summary.routeKm);
console.log('ua', summary.uaShort);

console.log('\n=== SNAP ===');
console.log('quality %:', summary.qualPct);
console.log('lateral p50/p95/max:', summary.latOffP50, summary.latOffP95, summary.latOffMax);

console.log('\n=== NAV ===');
console.log('offroute transitions:', summary.offrouteCount);
console.log('reroute:', summary.rerouteCount);
console.log('view_auto_map:', summary.viewAutoMapCount);
console.log('converge_blocked_ms:', summary.convergeBlockedMs);

const movingPairs = pairs.filter(p => p.snap?.lat_off > 3);
console.log('\n=== FIX+SNAP pairs (lat_off>3m):', movingPairs.length);
if(movingPairs.length){
  const avgLat = movingPairs.reduce((s, p) => s + p.snap.lat_off, 0) / movingPairs.length;
  console.log('avg lateral', avgLat.toFixed(1), 'm');
}

const accs = parsed.fixes.map(f => f.acc).filter(v => v != null).sort((a, b) => a - b);
if(accs.length){
  const p50 = accs[Math.floor(0.5 * (accs.length - 1))];
  const p95 = accs[Math.floor(0.95 * (accs.length - 1))];
  console.log('\n=== GPS ACC (m) ===');
  console.log('p50', p50?.toFixed(2), 'p95', p95?.toFixed(2));
}
