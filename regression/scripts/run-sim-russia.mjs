#!/usr/bin/env node
/**
 * Sim-тур по России (регионы корпуса auto) — ноги для Nightly.
 *
 *   node regression/scripts/run-sim-russia.mjs --leg nw|m4|volga|siberia|south|all
 *   node regression/scripts/run-sim-russia.mjs --list
 *   (+ passthrough: --date --mode --force --id …)
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

/** Географические ноги (без Москвы — уже закрыта 2026-07-17). */
export const RUSSIA_LEGS = {
  nw: {
    title: 'СЗ: СПб + М-11',
    region: 'spb_center,spb_suburbs,m11_neva',
    approx: 18
  },
  m4: {
    title: 'М-4 Дон',
    region: 'm4_don_north,m4_don_mid,m4_don_south',
    approx: 18
  },
  volga: {
    title: 'Волга / Урал',
    region: 'kazan,yekaterinburg',
    approx: 18
  },
  siberia: {
    title: 'Сибирь',
    region: 'novosibirsk',
    approx: 5
  },
  south: {
    title: 'Юг: Краснодар / Сочи / Кавказ',
    region: 'krasnodar,sochi_adler,caucasus_serpentines',
    approx: 31
  }
};

const argv = process.argv.slice(2);
if(argv.includes('--list') || argv.includes('-h') || argv.includes('--help')){
  console.log('Russia sim legs (excl. moscow — already gated):\n');
  for(const [id, leg] of Object.entries(RUSSIA_LEGS)){
    console.log(`  ${id.padEnd(8)} ~${String(leg.approx).padStart(2)} fx  ${leg.title}`);
    console.log(`           --region ${leg.region}`);
  }
  console.log('\n  all      sequential nw → m4 → volga → siberia → south');
  console.log('\nUsage: npm run regression:sim:russia -- --leg nw --date 2026-07-17 --force --mode on_route');
  process.exit(0);
}

const legIdx = argv.indexOf('--leg');
const legId = legIdx >= 0 ? argv[legIdx + 1] : null;
const passthrough = argv.filter((a, i) => {
  if(a === '--leg' || (legIdx >= 0 && i === legIdx + 1)) return false;
  return true;
});

if(!legId || (!(legId in RUSSIA_LEGS) && legId !== 'all')){
  console.error('[russia-sim] need --leg nw|m4|volga|siberia|south|all  (or --list)');
  process.exit(2);
}

const legs = legId === 'all' ? Object.keys(RUSSIA_LEGS) : [legId];
let exitCode = 0;

for(const id of legs){
  const leg = RUSSIA_LEGS[id];
  const runArgs = [
    path.join(ROOT, 'regression/scripts/run-sim.mjs'),
    '--region', leg.region,
    ...passthrough
  ];
  if(!passthrough.includes('--date')){
    runArgs.push('--date', new Date().toISOString().slice(0, 10));
  }
  console.log(`\n[russia-sim] leg=${id} ${leg.title} (~${leg.approx} fx)`);
  console.log('[russia-sim]', runArgs.slice(1).join(' '));
  const r = spawnSync(process.execPath, runArgs, { cwd: ROOT, stdio: 'inherit' });
  const code = r.status ?? 1;
  if(code !== 0) exitCode = code;
}

process.exit(exitCode);
