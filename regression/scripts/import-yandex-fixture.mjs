#!/usr/bin/env node
/**
 * Импорт regression-fixture из длинной ссылки Яндекс.Карт (rtext).
 *
 * Usage:
 *   node regression/scripts/import-yandex-fixture.mjs --url "https://yandex.ru/maps/?rtext=..."
 *   node regression/scripts/import-yandex-fixture.mjs --file route.txt --region moscow_center
 *   npm run regression:import:yandex -- --url "..." --category city
 */
import fs from 'fs';
import path from 'path';
import { FIXTURES_AUTO, saveJson } from './lib/paths.mjs';
import { emptyFixture } from './validate-schema.mjs';
import { totalPathKm } from './lib/geo.mjs';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const YANDEX_LINK = path.join(__dirname, '..', '..', 'js', 'yandex-link.js');

async function loadParser(){
  return import(pathToFileURL(YANDEX_LINK).href);
}

function parseArgs(){
  const args = process.argv.slice(2);
  const out = {
    url: null,
    file: null,
    region: 'moscow_center',
    category: 'city',
    notes: '',
    dir: null,
    dryRun: false
  };
  for(let i = 0; i < args.length; i++){
    const a = args[i];
    if(a === '--url' && args[i + 1]) out.url = args[++i];
    else if(a === '--file' && args[i + 1]) out.file = args[++i];
    else if(a === '--region' && args[i + 1]) out.region = args[++i];
    else if(a === '--category' && args[i + 1]) out.category = args[++i];
    else if(a === '--notes' && args[i + 1]) out.notes = args[++i];
    else if(a === '--dir' && args[i + 1]) out.dir = args[++i];
    else if(a === '--dry-run') out.dryRun = true;
  }
  return out;
}

async function readInput({ url, file }){
  if(url) return url;
  if(file){
    return fs.readFileSync(file, 'utf8');
  }
  if(!process.stdin.isTTY){
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    return Buffer.concat(chunks).toString('utf8');
  }
  throw new Error('Укажите --url, --file или pipe в stdin');
}

async function main(){
  const args = parseArgs();
  const raw = await readInput(args);
  const { parseYandexRouteLink, extractYandexUrl, buildYandexRouteUrl } = await loadParser();

  const sourceUrl = extractYandexUrl(raw) || raw.trim();
  const waypoints = await parseYandexRouteLink(raw, { fetchFn: fetch });

  const km = totalPathKm(waypoints);
  const fixture = emptyFixture({
    source: 'manual',
    category: args.category,
    region: args.region,
    tags: ['yandex_import', args.region, args.category],
    waypoints: waypoints.map((w, i) => ({
      lat: w.lat,
      lon: w.lon,
      label: i === 0 ? 'start' : (i === waypoints.length - 1 ? 'finish' : `via_${i}`)
    })),
    constraints: {
      distance_km_min: Math.max(1, Math.floor(km * 0.5)),
      distance_km_max: Math.ceil(km * 2) || 300,
      sim_speed_kmh: args.category === 'highway' ? 90 : 45
    },
    metadata: {
      author: 'import-yandex-fixture.mjs',
      notes: args.notes || `Импорт из Яндекс.Карт · ${waypoints.length} точек · ~${km.toFixed(1)} км прямой`,
      known_issues: [],
      compare_interpretation: null,
      priority: 'normal'
    },
    status: 'valid'
  });

  fixture.metadata.known_issues.push(
    'waypoints из rtext; геометрия Яндекса не импортирована — только OSRM/GH/ORS в fetch'
  );

  const outDir = args.dir
    ? path.resolve(args.dir)
    : path.join(FIXTURES_AUTO, '..', 'manual');
  const outPath = path.join(outDir, `${fixture.fixture_id}.json`);

  console.log('[import-yandex] waypoints:', waypoints.length);
  console.log('[import-yandex] straight ~km:', km.toFixed(1));
  console.log('[import-yandex] fixture_id:', fixture.fixture_id);
  console.log('[import-yandex] share:', buildYandexRouteUrl(waypoints));

  if(args.dryRun){
    console.log(JSON.stringify(fixture, null, 2));
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });
  saveJson(outPath, fixture);
  console.log('[import-yandex] saved:', outPath);
  console.log('[import-yandex] next: npm run regression:fetch:motohud -- --id', fixture.fixture_id.slice(0, 8));
}

main().catch(e => {
  console.error('[import-yandex] FATAL:', e.message || e);
  process.exit(1);
});
