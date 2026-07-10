#!/usr/bin/env node
/**
 * Удаление устаревших polyline из cache/.
 * Usage: node regression/scripts/cleanup-cache.mjs [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { CACHE_DIR } from './lib/paths.mjs';

const MAX_AGE = {
  graphhopper: 90,
  openrouteservice: 90,
  yandex_web: 30,
  motohud: 180
};

function parseArgs(){
  return { dryRun: process.argv.includes('--dry-run') };
}

function purgeDir(dir, maxDays, dryRun){
  if(!fs.existsSync(dir)) return 0;
  const cutoff = Date.now() - maxDays * 864e5;
  let n = 0;
  for(const name of fs.readdirSync(dir)){
    if(!name.endsWith('.json')) continue;
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if(st.mtimeMs < cutoff){
      if(!dryRun) fs.unlinkSync(fp);
      n++;
    }
  }
  return n;
}

function main(){
  const { dryRun } = parseArgs();
  let total = 0;

  for(const [provider, days] of Object.entries(MAX_AGE)){
    const dir = provider === 'motohud'
      ? path.join(CACHE_DIR, 'motohud')
      : path.join(CACHE_DIR, 'references', provider);
    const removed = purgeDir(dir, days, dryRun);
    if(removed) console.log(`[cleanup] ${provider}: ${removed} файлов${dryRun ? ' (dry-run)' : ''}`);
    total += removed;
  }

  console.log(`[cleanup] всего ${total}${dryRun ? ' (dry-run)' : ''}`);
}

main();
