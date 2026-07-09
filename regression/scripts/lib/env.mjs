/**
 * Загрузка regression/.env и конфигов.
 */
import dotenv from 'dotenv';
import path from 'path';
import { CONFIG_DIR, REGRESSION_ROOT, loadJson } from './paths.mjs';

dotenv.config({ path: path.join(REGRESSION_ROOT, '.env') });

export function getOsrmEndpoint(){
  const base = (process.env.OSRM_ENDPOINT || 'https://router.project-osrm.org').replace(/\/$/, '');
  return base;
}

export function getGraphhopperKey(){
  return process.env.GRAPHHOPPER_API_KEY?.trim() || '';
}

export function getOrsKey(){
  return process.env.ORS_API_KEY?.trim() || '';
}

export function loadConfig(name){
  return loadJson(path.join(CONFIG_DIR, `${name}.json`));
}
