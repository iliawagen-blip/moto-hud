/**
 * Снапшот OSM ways (магистрали + maxspeed) Москвы → data/highways-moscow.json
 * Запуск: npm run highways:snapshot
 * CI: .github/workflows/highways-snapshot.yml
 *
 * Полный highway bbox (~430k ways) слишком большой; берём arterial+links и любые ways с maxspeed.
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'data', 'highways-moscow.json');
const OUT_GZ = path.join(ROOT, 'data', 'highways-moscow.json.gz');

const BBOX = { south: 55.55, west: 37.35, north: 55.95, east: 37.85 };

const MIRRORS = [
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];

const TILE_ROWS = 2;
const TILE_COLS = 2;
const TILE_PAUSE_MS = 12000;
/** Упрощение геометрии: точки ближе SIMPLIFY_M можно выкинуть */
const SIMPLIFY_M = 14;

function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
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

function postOverpass(url, query){
  const body = 'data=' + encodeURIComponent(query);
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'moto-hud-highways-snapshot/1.0 (+https://github.com/iliawagen-blip/moto-hud)'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if(res.statusCode !== 200){
          reject(new Error(`Overpass ${res.statusCode} @ ${u.hostname}: ${buf.toString('utf8').slice(0, 180)}`));
          return;
        }
        try{ resolve(JSON.parse(buf.toString('utf8'))); }
        catch(e){ reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(180000, () => req.destroy(new Error('timeout')));
    req.write(body);
    req.end();
  });
}

const byId = new Map();
let mirrorRot = 0;

function tileQuery(s, w, n, e){
  return `[out:json][timeout:100];
(
  way["highway"="motorway"](${s},${w},${n},${e});
  way["highway"="motorway_link"](${s},${w},${n},${e});
  way["highway"="trunk"](${s},${w},${n},${e});
  way["highway"="trunk_link"](${s},${w},${n},${e});
  way["highway"="primary"](${s},${w},${n},${e});
  way["highway"="primary_link"](${s},${w},${n},${e});
  way["highway"="secondary"](${s},${w},${n},${e});
  way["highway"="secondary_link"](${s},${w},${n},${e});
  way["highway"="tertiary"](${s},${w},${n},${e});
  way["highway"="tertiary_link"](${s},${w},${n},${e});
  way["highway"]["maxspeed"](${s},${w},${n},${e});
);
out tags geom;`;
}

for(let r = 0; r < TILE_ROWS; r++){
  for(let c = 0; c < TILE_COLS; c++){
    const s = BBOX.south + (BBOX.north - BBOX.south) * r / TILE_ROWS;
    const n = BBOX.south + (BBOX.north - BBOX.south) * (r + 1) / TILE_ROWS;
    const w = BBOX.west + (BBOX.east - BBOX.west) * c / TILE_COLS;
    const e = BBOX.west + (BBOX.east - BBOX.west) * (c + 1) / TILE_COLS;
    console.log(`tile ${r},${c} [${s.toFixed(3)},${w.toFixed(3)} → ${n.toFixed(3)},${e.toFixed(3)}]`);
    // rotate preferred mirror
    const rotated = [...MIRRORS.slice(mirrorRot % MIRRORS.length), ...MIRRORS.slice(0, mirrorRot % MIRRORS.length)];
    mirrorRot++;
    let j = null;
    let lastErr;
    for(const url of rotated){
      try{
        console.log('  try', url);
        j = await postOverpass(url, tileQuery(s, w, n, e));
        break;
      }catch(err){
        lastErr = err;
        console.warn('  fail', err.message);
        await sleep(5000);
      }
    }
    if(!j) throw lastErr || new Error('tile failed');
    let add = 0;
    for(const el of j.elements || []){
      if(el.type !== 'way' || !el.tags?.highway || !Array.isArray(el.geometry) || el.geometry.length < 2) continue;
      if(byId.has(el.id)) continue;
      byId.set(el.id, el);
      add++;
    }
    console.log('  +', add, 'unique', byId.size);
    if(r < TILE_ROWS - 1 || c < TILE_COLS - 1) await sleep(TILE_PAUSE_MS);
  }
}

const ways = [];
for(const el of byId.values()){
  const geom = simplifyGeom(
    el.geometry.map(p => ({ lat: +p.lat.toFixed(5), lon: +p.lon.toFixed(5) })),
    SIMPLIFY_M
  );
  if(geom.length < 2) continue;
  // компакт: g как [[lat,lon],...]
  const o = {
    id: el.id,
    highway: el.tags.highway,
    geom: geom.map(p => [p.lat, p.lon])
  };
  if(el.tags.maxspeed) o.maxspeed = el.tags.maxspeed;
  if(el.tags['maxspeed:conditional']) o.maxspeedConditional = el.tags['maxspeed:conditional'];
  ways.push(o);
}

const payload = {
  updated: new Date().toISOString(),
  source: 'openstreetmap/overpass',
  attribution: '© OpenStreetMap contributors (ODbL)',
  bbox: BBOX,
  note: 'arterial+links and any highway with maxspeed; geom simplified ~14m',
  count: ways.length,
  ways
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
const raw = JSON.stringify(payload);
fs.writeFileSync(OUT_JSON, raw + '\n', 'utf8');
const gz = gzipSync(Buffer.from(raw, 'utf8'), { level: 9 });
fs.writeFileSync(OUT_GZ, gz);

const withMs = ways.filter(w => w.maxspeed).length;
console.log('wrote', OUT_JSON, {
  count: ways.length,
  with_maxspeed: withMs,
  json_bytes: Buffer.byteLength(raw),
  gz_bytes: gz.length
});
console.log('wrote', OUT_GZ);
