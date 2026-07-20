/**
 * Единый fetch OSM-слоёв по регионам → data/regions/{id}/{layer}.json[.gz]
 *
 * Usage:
 *   node scripts/fetch-osm-snapshots.mjs --region moscow --layers cameras,fuel,urban,signals
 *   node scripts/fetch-osm-snapshots.mjs --region spb --layers cameras,fuel,urban,signals,highways
 *   node scripts/fetch-osm-snapshots.mjs --region russia_motorways --layers motorways
 *   node scripts/fetch-osm-snapshots.mjs --all-small   # cameras+fuel+urban+signals для moscow/mkad_plus/spb/moscow_oblast
 *   node scripts/fetch-osm-snapshots.mjs --legacy-moscow  # обновить data/*-moscow.* из regions/moscow
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';
import { overpassWithMirrors, sleep, bboxStr, tileBboxes } from './lib/overpass-fetch.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const REGIONS_PATH = path.join(ROOT, 'data', 'osm-regions.json');

const CARD = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5
};

function parseArgs(){
  const a = process.argv.slice(2);
  const get = (k) => {
    const i = a.indexOf(k);
    return i >= 0 ? a[i + 1] : null;
  };
  return {
    region: get('--region'),
    layers: (get('--layers') || '').split(',').map(s => s.trim()).filter(Boolean),
    allSmall: a.includes('--all-small'),
    legacyMoscow: a.includes('--legacy-moscow'),
    pauseMs: Number(get('--pause') || 8000)
  };
}

function loadRegions(){
  return JSON.parse(fs.readFileSync(REGIONS_PATH, 'utf8'));
}

function outDir(regionId){
  return path.join(ROOT, 'data', 'regions', regionId);
}

function writeJson(file, payload, { gzip = false } = {}){
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = JSON.stringify(payload);
  fs.writeFileSync(file, raw + '\n', 'utf8');
  let gzBytes = 0;
  if(gzip){
    const gz = gzipSync(Buffer.from(raw, 'utf8'), { level: 9 });
    fs.writeFileSync(file + '.gz', gz);
    gzBytes = gz.length;
  }
  return { bytes: Buffer.byteLength(raw), gzBytes };
}

function cameraFromTags(lat, lon, tags, id){
  let dir = null;
  if(tags.direction != null){
    const raw = String(tags.direction).trim();
    const num = parseFloat(raw);
    if(!Number.isNaN(num)) dir = ((num % 360) + 360) % 360;
    else {
      const up = raw.toUpperCase();
      if(CARD[up] != null) dir = CARD[up];
    }
  }
  const speed = tags.maxspeed ? parseInt(tags.maxspeed, 10) : null;
  const o = {
    lat, lon,
    speed: Number.isFinite(speed) ? speed : null,
    dir
  };
  if(id != null) o.id = String(id);
  return o;
}

function haversine(a, b){
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function simplifyGeom(geom, minM){
  if(!geom || geom.length <= 2) return geom;
  const out = [geom[0]];
  for(let i = 1; i < geom.length - 1; i++){
    if(haversine(out[out.length - 1], geom[i]) >= minM) out.push(geom[i]);
  }
  out.push(geom[geom.length - 1]);
  return out;
}

async function fetchCameras(bbox){
  const q = `[out:json][timeout:90];(
  node["highway"="speed_camera"](${bboxStr(bbox)});
  node["enforcement"="maxspeed"](${bboxStr(bbox)});
);out body;`;
  const j = await overpassWithMirrors(q);
  const byId = new Map();
  for(const e of j.elements || []){
    if(e.type !== 'node' || e.lat == null) continue;
    const key = e.id != null ? String(e.id) : `${e.lat},${e.lon}`;
    if(byId.has(key)) continue;
    byId.set(key, cameraFromTags(e.lat, e.lon, e.tags || {}, e.id));
  }
  return [...byId.values()];
}

async function fetchFuel(bbox){
  const q = `[out:json][timeout:90];(
  node["amenity"="fuel"](${bboxStr(bbox)});
  way["amenity"="fuel"](${bboxStr(bbox)});
);out center;`;
  const j = await overpassWithMirrors(q);
  const out = [];
  for(const e of j.elements || []){
    const t = e.tags || {};
    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    if(lat == null || lon == null) continue;
    out.push({
      osmId: String(e.id),
      lat: +Number(lat).toFixed(5),
      lon: +Number(lon).toFixed(5),
      brand: t.brand || t.name || t.operator || 'АЗС',
      name: t.name || t.brand || 'АЗС'
    });
  }
  return out;
}

async function fetchUrban(bbox){
  const q = `[out:json][timeout:90];(
  node["place"~"^(city|town|village|hamlet)$"](${bboxStr(bbox)});
);out body;`;
  const j = await overpassWithMirrors(q);
  const places = [];
  for(const e of j.elements || []){
    if(e.type !== 'node' || e.lat == null) continue;
    places.push({
      id: String(e.id),
      lat: +e.lat.toFixed(5),
      lon: +e.lon.toFixed(5),
      place: e.tags?.place || 'town',
      name: e.tags?.name || e.tags?.['name:ru'] || null
    });
  }
  return places;
}

async function fetchSignals(bbox){
  const q = `[out:json][timeout:90];(
  node["highway"="traffic_signals"](${bboxStr(bbox)});
);out body;`;
  const j = await overpassWithMirrors(q);
  const signals = [];
  for(const e of j.elements || []){
    if(e.type !== 'node' || e.lat == null) continue;
    signals.push({
      id: String(e.id),
      lat: +e.lat.toFixed(5),
      lon: +e.lon.toFixed(5)
    });
  }
  return signals;
}

async function fetchHighwaysArterial(bbox, { rows = 2, cols = 2, pauseMs = 10000 } = {}){
  const tiles = tileBboxes(bbox, rows, cols);
  const byId = new Map();
  for(let i = 0; i < tiles.length; i++){
    const t = tiles[i];
    console.log(`  tile ${t.r},${t.c}`);
    const q = `[out:json][timeout:100];
(
  way["highway"="motorway"](${bboxStr(t)});
  way["highway"="motorway_link"](${bboxStr(t)});
  way["highway"="trunk"](${bboxStr(t)});
  way["highway"="trunk_link"](${bboxStr(t)});
  way["highway"="primary"](${bboxStr(t)});
  way["highway"="primary_link"](${bboxStr(t)});
  way["highway"="secondary"](${bboxStr(t)});
  way["highway"="secondary_link"](${bboxStr(t)});
  way["highway"="tertiary"](${bboxStr(t)});
  way["highway"="tertiary_link"](${bboxStr(t)});
  way["highway"]["maxspeed"](${bboxStr(t)});
);
out tags geom;`;
    const j = await overpassWithMirrors(q, { timeoutMs: 200000 });
    for(const el of j.elements || []){
      if(el.type !== 'way' || !el.tags?.highway || !el.geometry?.length) continue;
      if(byId.has(el.id)) continue;
      byId.set(el.id, el);
    }
    console.log('  unique', byId.size);
    if(i < tiles.length - 1) await sleep(pauseMs);
  }
  return [...byId.values()].map(packWay).filter(Boolean);
}

async function fetchMotorways(bbox, { rows = 4, cols = 5, pauseMs = 10000 } = {}){
  const tiles = tileBboxes(bbox, rows, cols);
  const byId = new Map();
  for(let i = 0; i < tiles.length; i++){
    const t = tiles[i];
    console.log(`  motorway tile ${t.r},${t.c} (${i + 1}/${tiles.length})`);
    const q = `[out:json][timeout:100];
(
  way["highway"="motorway"](${bboxStr(t)});
  way["highway"="motorway_link"](${bboxStr(t)});
  way["highway"="trunk"](${bboxStr(t)});
  way["highway"="trunk_link"](${bboxStr(t)});
);
out tags geom;`;
    try{
      const j = await overpassWithMirrors(q, { timeoutMs: 200000 });
      for(const el of j.elements || []){
        if(el.type !== 'way' || !el.tags?.highway || !el.geometry?.length) continue;
        if(byId.has(el.id)) continue;
        byId.set(el.id, el);
      }
      console.log('  unique', byId.size);
    }catch(e){
      console.warn('  tile FAILED', e.message);
    }
    if(i < tiles.length - 1) await sleep(pauseMs);
  }
  return [...byId.values()].map(packWay).filter(Boolean);
}

function packWay(el){
  const geom = simplifyGeom(
    el.geometry.map(p => ({ lat: +p.lat.toFixed(5), lon: +p.lon.toFixed(5) })),
    14
  );
  if(geom.length < 2) return null;
  const o = {
    id: el.id,
    highway: el.tags.highway,
    geom: geom.map(p => [p.lat, p.lon])
  };
  if(el.tags.maxspeed) o.maxspeed = el.tags.maxspeed;
  if(el.tags['maxspeed:conditional']) o.maxspeedConditional = el.tags['maxspeed:conditional'];
  return o;
}

function meta(region, layer, count, extra = {}){
  return {
    updated: new Date().toISOString(),
    source: 'openstreetmap/overpass',
    attribution: '© OpenStreetMap contributors (ODbL)',
    region: region.id,
    layer,
    bbox: region.bbox,
    count,
    ...extra
  };
}

async function fetchLayer(region, layer, pauseMs){
  const dir = outDir(region.id);
  console.log(`\n=== ${region.id} / ${layer} ===`);
  if(layer === 'cameras'){
    const cameras = await fetchCameras(region.bbox);
    const payload = { ...meta(region, layer, cameras.length), cameras };
    const sz = writeJson(path.join(dir, 'cameras.json'), payload);
    console.log('wrote cameras', cameras.length, sz);
    return;
  }
  if(layer === 'fuel'){
    const stations = await fetchFuel(region.bbox);
    const payload = { ...meta(region, layer, stations.length), stations };
    const sz = writeJson(path.join(dir, 'fuel.json'), payload);
    console.log('wrote fuel', stations.length, sz);
    return;
  }
  if(layer === 'urban'){
    const places = await fetchUrban(region.bbox);
    const payload = { ...meta(region, layer, places.length), places };
    const sz = writeJson(path.join(dir, 'urban.json'), payload);
    console.log('wrote urban', places.length, sz);
    return;
  }
  if(layer === 'signals'){
    const signals = await fetchSignals(region.bbox);
    const payload = { ...meta(region, layer, signals.length), signals };
    const sz = writeJson(path.join(dir, 'signals.json'), payload);
    console.log('wrote signals', signals.length, sz);
    return;
  }
  if(layer === 'highways'){
    const tile = region.tile || { rows: 2, cols: 2 };
    const ways = await fetchHighwaysArterial(region.bbox, { ...tile, pauseMs });
    const payload = {
      ...meta(region, layer, ways.length, { note: 'arterial+links + maxspeed; geom~14m' }),
      ways
    };
    const sz = writeJson(path.join(dir, 'highways.json'), payload, { gzip: true });
    console.log('wrote highways', ways.length, sz);
    return;
  }
  if(layer === 'motorways'){
    const tile = region.tile || { rows: 4, cols: 5 };
    const ways = await fetchMotorways(region.bbox, { ...tile, pauseMs });
    const payload = {
      ...meta(region, layer, ways.length, { note: 'motorway+trunk(+link) only' }),
      ways
    };
    const sz = writeJson(path.join(dir, 'motorways.json'), payload, { gzip: true });
    console.log('wrote motorways', ways.length, sz);
    return;
  }
  throw new Error('unknown layer ' + layer);
}

function syncLegacyMoscow(){
  const src = outDir('moscow');
  const map = [
    ['cameras.json', 'cameras-moscow.json'],
    ['highways.json', 'highways-moscow.json'],
    ['highways.json.gz', 'highways-moscow.json.gz']
  ];
  for(const [from, to] of map){
    const a = path.join(src, from);
    const b = path.join(ROOT, 'data', to);
    if(fs.existsSync(a)){
      fs.copyFileSync(a, b);
      console.log('legacy sync', to);
    }
  }
}

async function main(){
  const args = parseArgs();
  const catalog = loadRegions();

  if(args.legacyMoscow){
    syncLegacyMoscow();
    return;
  }

  const jobs = [];
  if(args.allSmall){
    const small = ['cameras', 'fuel', 'urban', 'signals'];
    for(const region of catalog.regions){
      const layers = (region.layers || []).filter(l => small.includes(l));
      for(const layer of layers) jobs.push({ region, layer });
    }
  } else if(args.region){
    const region = catalog.regions.find(r => r.id === args.region);
    if(!region) throw new Error('unknown region ' + args.region);
    const layers = args.layers.length
      ? args.layers
      : (region.layers || []);
    for(const layer of layers) jobs.push({ region, layer });
  } else {
    console.log(`Usage:
  --region moscow --layers cameras,fuel,urban,signals
  --region russia_motorways --layers motorways
  --all-small
  --legacy-moscow`);
    process.exit(1);
  }

  for(let i = 0; i < jobs.length; i++){
    const { region, layer } = jobs[i];
    if(!(region.layers || []).includes(layer) && layer !== 'motorways'){
      console.warn('skip (not in region.layers):', region.id, layer);
      continue;
    }
    await fetchLayer(region, layer, args.pauseMs);
    if(i < jobs.length - 1) await sleep(args.pauseMs);
  }

  if(jobs.some(j => j.region.id === 'moscow')) syncLegacyMoscow();
  console.log('\nDONE', jobs.length, 'jobs');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
