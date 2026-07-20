/** Общий Overpass POST с зеркалами */
import https from 'https';

export const OVERPASS_MIRRORS = [
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];

export function sleep(ms){
  return new Promise(r => setTimeout(r, ms));
}

export function postOverpass(url, query, { timeoutMs = 180000, ua = 'moto-hud-osm-snapshot/1.0' } = {}){
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
        'User-Agent': ua
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if(res.statusCode !== 200){
          reject(new Error(`Overpass ${res.statusCode} @ ${u.hostname}: ${buf.toString('utf8').slice(0, 160)}`));
          return;
        }
        try{ resolve(JSON.parse(buf.toString('utf8'))); }
        catch(e){ reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.write(body);
    req.end();
  });
}

export async function overpassWithMirrors(query, opts = {}){
  const mirrors = opts.mirrors || OVERPASS_MIRRORS;
  let lastErr;
  for(const url of mirrors){
    try{
      console.log('  Overpass', url);
      return await postOverpass(url, query, opts);
    }catch(e){
      lastErr = e;
      console.warn('  fail', e.message);
      await sleep(opts.retryPauseMs ?? 4000);
    }
  }
  throw lastErr || new Error('Overpass unreachable');
}

export function bboxStr(b){
  return `${b.south},${b.west},${b.north},${b.east}`;
}

export function tileBboxes(bbox, rows, cols){
  const out = [];
  for(let r = 0; r < rows; r++){
    for(let c = 0; c < cols; c++){
      const south = bbox.south + (bbox.north - bbox.south) * r / rows;
      const north = bbox.south + (bbox.north - bbox.south) * (r + 1) / rows;
      const west = bbox.west + (bbox.east - bbox.west) * c / cols;
      const east = bbox.west + (bbox.east - bbox.west) * (c + 1) / cols;
      out.push({ south, west, north, east, r, c });
    }
  }
  return out;
}
