/**
 * Пути regression-конвейера (от корня regression/).
 */
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REGRESSION_ROOT = path.resolve(__dirname, '..', '..');
export const FIXTURES_AUTO = path.join(REGRESSION_ROOT, 'fixtures', 'auto');
export const CONFIG_DIR = path.join(REGRESSION_ROOT, 'config');
export const CACHE_DIR = path.join(REGRESSION_ROOT, 'cache');
export const RESULTS_DIR = path.join(REGRESSION_ROOT, 'results');
export const REPORTS_DIR = path.join(REGRESSION_ROOT, 'reports');

export function cacheMotohudPath(fixtureId){
  return path.join(CACHE_DIR, 'motohud', `${fixtureId}.json`);
}

export function cacheReferencePath(provider, fixtureId){
  return path.join(CACHE_DIR, 'references', provider, `${fixtureId}.json`);
}

export function checkpointPath(date, phase){
  return path.join(CACHE_DIR, 'checkpoints', `${date}-${phase}.json`);
}

export function graphhopperCounterPath(){
  return path.join(CACHE_DIR, 'graphhopper-counter.json');
}

export function errorsLogPath(date){
  return path.join(RESULTS_DIR, date, 'errors.log');
}

export function loadJson(filePath){
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function saveJson(filePath, data){
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}
