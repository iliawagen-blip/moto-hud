/**
 * Снапшот камер OSM для Москвы → data/cameras-moscow.json
 * Запуск: node scripts/fetch-cameras-snapshot.mjs
 * CI: .github/workflows/cameras-snapshot.yml
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'cameras-moscow.json');

const BBOX = { south: 55.55, west: 37.35, north: 55.95, east: 37.85 };

const CARD = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5
};

const MIRRORS = [
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];

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
  return {
    id: id != null ? String(id) : undefined,
    lat,
    lon,
    speed: Number.isFinite(speed) ? speed : null,
    dir
  };
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
        'User-Agent': 'moto-hud-cameras-snapshot/1.0 (+https://github.com/iliawagen-blip/moto-hud)'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if(res.statusCode !== 200){
          reject(new Error(`Overpass ${res.statusCode} @ ${u.hostname}: ${buf.toString('utf8').slice(0, 200)}`));
          return;
        }
        try{
          resolve(JSON.parse(buf.toString('utf8')));
        }catch(e){
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => req.destroy(new Error('timeout')));
    req.write(body);
    req.end();
  });
}

async function fetchElements(){
  const q = `[out:json][timeout:90];(
  node["highway"="speed_camera"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  node["enforcement"="maxspeed"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);out body;`;
  let lastErr;
  for(const url of MIRRORS){
    try{
      console.log('Overpass', url);
      return await postOverpass(url, q);
    }catch(e){
      lastErr = e;
      console.warn('fail', e.message);
    }
  }
  throw lastErr || new Error('Overpass unreachable');
}

const j = await fetchElements();
const byId = new Map();
for(const e of j.elements || []){
  if(e.type !== 'node' || e.lat == null) continue;
  const key = e.id != null ? String(e.id) : `${e.lat},${e.lon}`;
  if(byId.has(key)) continue;
  byId.set(key, cameraFromTags(e.lat, e.lon, e.tags || {}, e.id));
}
const cameras = [...byId.values()].map((c) => {
  const o = { lat: c.lat, lon: c.lon, speed: c.speed, dir: c.dir };
  if(c.id) o.id = c.id;
  return o;
});

const payload = {
  updated: new Date().toISOString(),
  source: 'openstreetmap/overpass',
  attribution: '© OpenStreetMap contributors (ODbL)',
  bbox: BBOX,
  count: cameras.length,
  cameras
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload) + '\n', 'utf8');
const bytes = fs.statSync(OUT).size;
const withSpeed = cameras.filter((c) => c.speed != null).length;
console.log('wrote', OUT, {
  count: cameras.length,
  with_speed: withSpeed,
  bytes
});
