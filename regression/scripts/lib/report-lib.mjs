/**
 * Общие функции отчётов regression.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  RESULTS_DIR, REPORTS_DIR, cacheMotohudPath, cacheReferencePath, loadJson
} from './paths.mjs';
import { listFixtureFiles, loadFixtureFile } from './fixtures-io.mjs';

export function getGitHead(projectRoot){
  try{
    return execSync('git rev-parse HEAD', { cwd: projectRoot, encoding: 'utf8' }).trim();
  }catch{
    return null;
  }
}

export function listResultDates(){
  if(!fs.existsSync(RESULTS_DIR)) return [];
  return fs.readdirSync(RESULTS_DIR)
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
}

export function previousResultDate(date){
  const dates = listResultDates().filter(d => d < date);
  return dates.length ? dates[dates.length - 1] : null;
}

export function loadSimSummary(date){
  const p = path.join(RESULTS_DIR, date, 'sim-summary.json');
  if(!fs.existsSync(p)) return null;
  try{ return loadJson(p); }catch{ return null; }
}

export function loadReportSummary(date){
  const p = path.join(REPORTS_DIR, date, 'summary.json');
  if(!fs.existsSync(p)) return null;
  try{ return loadJson(p); }catch{ return null; }
}

export function yandexMapUrl(waypoints){
  if(!waypoints?.length) return null;
  const rtext = waypoints.map(w => `${w.lat},${w.lon}`).join('~');
  return `https://yandex.ru/maps/?rtext=${encodeURIComponent(rtext)}&rtt=auto`;
}

export function loadPolylineCache(filePath){
  if(!fs.existsSync(filePath)) return null;
  try{
    const j = loadJson(filePath);
    return j.polyline?.length ? j.polyline : null;
  }catch{
    return null;
  }
}

export function loadAllFixturesSorted(){
  return listFixtureFiles().map(loadFixtureFile);
}

export function consensusScore(fixture){
  const m = fixture.metrics?.consensus_deviation;
  if(!m) return -1;
  return m.motohud_vs_consensus_p95_m ?? -1;
}

export function worstFixtures(fixtures, limit = 15){
  return [...fixtures]
    .filter(f => f.status === 'valid' && f.metrics)
    .sort((a, b) => consensusScore(b) - consensusScore(a))
    .slice(0, limit);
}

export function simPassByFixture(simSummary){
  const map = new Map();
  if(!simSummary?.results) return map;
  for(const r of simSummary.results){
    if(r.skipped) continue;
    const cur = map.get(r.fixture_id) || { pass: 0, fail: 0 };
    if(r.pass) cur.pass++; else cur.fail++;
    map.set(r.fixture_id, cur);
  }
  return map;
}

export function trendArrow(cur, prev, lowerIsBetter = true){
  if(cur == null || prev == null) return '—';
  if(cur === prev) return '→ 0%';
  const pct = prev !== 0 ? ((cur - prev) / prev) * 100 : 0;
  const better = lowerIsBetter ? cur < prev : cur > prev;
  const sign = pct > 0 ? '+' : '';
  return `${better ? '↓' : '↑'} ${sign}${pct.toFixed(0)}%`;
}

export function groupCount(fixtures, key){
  const out = {};
  for(const f of fixtures){
    const k = f[key] || 'unknown';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

export function missingReferences(fixtures){
  return fixtures.filter(f => {
    const cov = f.metrics?.coverage?.references_available || [];
    return f.status === 'valid' && cov.length === 0;
  });
}

export function routeCachesForFixture(fixtureId){
  return {
    motohud: loadPolylineCache(cacheMotohudPath(fixtureId)),
    graphhopper: loadPolylineCache(cacheReferencePath('graphhopper', fixtureId)),
    openrouteservice: loadPolylineCache(cacheReferencePath('openrouteservice', fixtureId)),
    yandex_web: loadPolylineCache(cacheReferencePath('yandex_web', fixtureId))
  };
}

export function isYandexCandidate(fixture, thresholds){
  const gh = fixture.metrics?.graphhopper_vs_motohud;
  const ors = fixture.metrics?.ors_vs_motohud;
  const p95 = Math.max(gh?.p95_lateral_m ?? 0, ors?.p95_lateral_m ?? 0);
  const manDiff = Math.max(
    Math.abs(gh?.maneuver_count_diff ?? 0),
    Math.abs(ors?.maneuver_count_diff ?? 0)
  );
  const refsAgree = fixture.metrics?.consensus_deviation?.refs_agree;
  return p95 > 50 && manDiff > 3 && refsAgree === true;
}
