#!/usr/bin/env node
/**
 * Визуальный разбор worst-case fixtures + опциональная разметка кандидатов.
 *
 * Usage:
 *   node regression/scripts/review-worst.mjs [--date YYYY-MM-DD] [--open] [--tag-candidates]
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { loadConfig } from './lib/env.mjs';
import { REPORTS_DIR, saveJson } from './lib/paths.mjs';
import {
  loadAllFixturesSorted, worstFixtures, routeCachesForFixture,
  yandexMapUrl, isYandexCandidate
} from './lib/report-lib.mjs';
import { saveFixture } from './lib/fixtures-io.mjs';
import { PROJECT_ROOT } from './lib/run-child.mjs';

function parseArgs(){
  const args = process.argv.slice(2);
  return {
    date: args.includes('--date') ? args[args.indexOf('--date') + 1] : new Date().toISOString().slice(0, 10),
    open: args.includes('--open'),
    tagCandidates: args.includes('--tag-candidates'),
    limit: args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : 15
  };
}

function escapeHtml(s){
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildReviewHtml(fixtures, date){
  const blocks = fixtures.map((f, idx) => {
    const caches = routeCachesForFixture(f.fixture_id);
    const m = f.metrics || {};
    const gh = m.graphhopper_vs_motohud;
    const ors = m.ors_vs_motohud;
    const cons = m.consensus_deviation || {};
    const mapUrl = yandexMapUrl(f.waypoints);

    const layers = [];
    if(caches.motohud) layers.push({ name: 'motohud', color: '#ffd400', coords: caches.motohud });
    if(caches.graphhopper) layers.push({ name: 'graphhopper', color: '#39d353', coords: caches.graphhopper });
    if(caches.openrouteservice) layers.push({ name: 'ors', color: '#58a6ff', coords: caches.openrouteservice });
    if(caches.yandex_web) layers.push({ name: 'yandex', color: '#f85149', coords: caches.yandex_web });

    const center = f.waypoints[0];
    return `
<section class="card" id="f-${idx}">
  <h2>${idx + 1}. ${escapeHtml(f.fixture_id.slice(0, 8))} — ${escapeHtml(f.category)} / ${escapeHtml(f.region)}</h2>
  <p class="meta">
    consensus p95: <b>${cons.motohud_vs_consensus_p95_m?.toFixed(1) ?? '—'} м</b> ·
    signal: <b>${cons.signal || '—'}</b> ·
    refs_agree: ${cons.refs_agree ? 'да' : 'нет'} ·
    interpretation: <code>${f.metadata?.compare_interpretation || 'null'}</code> ·
    priority: <code>${f.metadata?.priority || 'normal'}</code>
  </p>
  <p class="meta">GH↔MH p95 ${gh?.p95_lateral_m?.toFixed(1) ?? '—'} м · ORS↔MH p95 ${ors?.p95_lateral_m?.toFixed(1) ?? '—'} м</p>
  ${mapUrl ? `<p><a href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener">Открыть в Яндекс.Картах</a></p>` : ''}
  <div class="map" id="map-${idx}"></div>
  <script>
    (function(){
      const map = L.map('map-${idx}', { zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© OSM'
      }).addTo(map);
      const layers = ${JSON.stringify(layers)};
      const bounds = [];
      layers.forEach(l => {
        const latlngs = l.coords.map(c => [c[0], c[1]]);
        L.polyline(latlngs, { color: l.color, weight: 4, opacity: 0.85 }).addTo(map).bindPopup(l.name);
        latlngs.forEach(ll => bounds.push(ll));
      });
      ${JSON.stringify(f.waypoints)}.forEach((w, i) => {
        const ll = [w.lat, w.lon];
        L.circleMarker(ll, { radius: 6, color: '#fff', fillColor: i === 0 ? '#39d353' : '#f85149', fillOpacity: 1 })
          .addTo(map).bindPopup(w.label || ('wp' + i));
        bounds.push(ll);
      });
      if(bounds.length) map.fitBounds(bounds, { padding: [24, 24] });
      else map.setView([${center.lat}, ${center.lon}], 12);
    })();
  </script>
</section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Regression review — ${escapeHtml(date)}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  body { margin: 0; background: #0d1117; color: #e6edf3; font-family: system-ui, sans-serif; }
  header { padding: 16px 20px; border-bottom: 1px solid #30363d; }
  h1 { margin: 0 0 6px; font-size: 20px; }
  .sub { color: #8b949e; font-size: 13px; }
  .card { margin: 16px; padding: 14px; background: #161b22; border: 1px solid #30363d; border-radius: 12px; }
  .card h2 { margin: 0 0 8px; font-size: 16px; }
  .meta { font-size: 13px; color: #8b949e; margin: 6px 0; }
  .map { height: 360px; border-radius: 8px; margin-top: 10px; }
  a { color: #58a6ff; }
  code { background: #21262d; padding: 1px 5px; border-radius: 4px; }
</style>
</head>
<body>
<header>
  <h1>Worst-case review — ${escapeHtml(date)}</h1>
  <p class="sub">Слои: motohud (жёлтый), GraphHopper (зелёный), ORS (синий), Yandex (красный). Проставьте compare_interpretation в fixture вручную.</p>
</header>
${blocks}
</body>
</html>`;
}

function openInBrowser(filePath){
  const abs = path.resolve(filePath);
  const url = 'file:///' + abs.replace(/\\/g, '/');
  try{
    if(process.platform === 'win32'){
      execSync(`start "" "${abs}"`, { stdio: 'ignore', shell: true });
    }else if(process.platform === 'darwin'){
      execSync(`open "${abs}"`, { stdio: 'ignore' });
    }else{
      execSync(`xdg-open "${abs}"`, { stdio: 'ignore' });
    }
  }catch(e){
    console.log('[review] Откройте вручную:', url);
  }
}

function main(){
  const { date, open, tagCandidates, limit } = parseArgs();
  const thresholds = loadConfig('thresholds');
  const fixtures = loadAllFixturesSorted().filter(f => f.status === 'valid' && f.metrics);
  const worst = worstFixtures(fixtures, limit);

  if(!worst.length){
    console.log('[review] Нет fixtures с метриками.');
    process.exit(0);
  }

  const outDir = path.join(REPORTS_DIR, date);
  fs.mkdirSync(outDir, { recursive: true });
  const htmlPath = path.join(outDir, 'review-worst.html');
  fs.writeFileSync(htmlPath, buildReviewHtml(worst, date), 'utf8');
  console.log(`[review] HTML → ${htmlPath}`);

  const candidates = [];
  if(tagCandidates){
    for(const f of fixtures){
      if(isYandexCandidate(f, thresholds)){
        f.metadata = f.metadata || {};
        f.metadata.priority = 'worst_case_candidate';
        if(!f.metadata.compare_interpretation) f.metadata.compare_interpretation = 'unknown';
        saveFixture(f);
        candidates.push(f.fixture_id);
      }
    }
    console.log(`[review] Помечено worst_case_candidate: ${candidates.length}`);
  }

  saveJson(path.join(outDir, 'review-worst.json'), {
    date,
    fixture_ids: worst.map(f => f.fixture_id),
    yandex_candidates: candidates,
    generated_at: new Date().toISOString()
  });

  console.log('[review] Топ-' + worst.length + ':');
  worst.forEach((f, i) => {
    const p95 = f.metrics?.consensus_deviation?.motohud_vs_consensus_p95_m;
    console.log(`  ${i + 1}. ${f.fixture_id.slice(0, 8)} ${f.category} p95=${p95?.toFixed(1) ?? '—'}m signal=${f.metrics?.consensus_deviation?.signal}`);
  });

  if(open) openInBrowser(htmlPath);
}

main();
