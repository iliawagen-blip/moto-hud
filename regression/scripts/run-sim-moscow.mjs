#!/usr/bin/env node
/**
 * Sim по московским регионам (МКАД / центр / outer) — развязки Nightly.
 *
 *   node regression/scripts/run-sim-moscow.mjs [--date YYYY-MM-DD] [--mode on_route] [--force]
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const passthrough = process.argv.slice(2);
const runArgs = [
  path.join(ROOT, 'regression/scripts/run-sim.mjs'),
  '--region', 'mkad_ring,moscow_center,moscow_outer',
  ...passthrough
];
if(!passthrough.includes('--date')){
  runArgs.push('--date', new Date().toISOString().slice(0, 10));
}

console.log('[moscow-sim]', runArgs.slice(1).join(' '));
const r = spawnSync(process.execPath, runArgs, { cwd: ROOT, stdio: 'inherit' });
process.exit(r.status ?? 1);
