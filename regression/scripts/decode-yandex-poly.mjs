#!/usr/bin/env node
import fs from 'fs';

const j = JSON.parse(fs.readFileSync('regression/cache/yandex-location-info.json', 'utf8'));

function collectEncoded(obj, out = [], seen = new WeakSet(), d = 0){
  if(d > 16 || obj == null) return out;
  if(typeof obj === 'string' && obj.length > 200 && /^[A-Za-z0-9_-]+$/.test(obj)){
    out.push(obj);
    return out;
  }
  if(typeof obj !== 'object') return out;
  if(seen.has(obj)) return out;
  seen.add(obj);
  if(Array.isArray(obj)) for(const v of obj) collectEncoded(v, out, seen, d + 1);
  else for(const v of Object.values(obj)) collectEncoded(v, out, seen, d + 1);
  return out;
}

function decodePolyline(encoded, scale = 1e5){
  let index = 0, lat = 0, lon = 0, coords = [];
  while(index < encoded.length){
    let b, shift = 0, result = 0;
    do{ b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; }while(b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0; result = 0;
    do{ b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; }while(b >= 0x20);
    const dlon = (result & 1) ? ~(result >> 1) : (result >> 1);
    lon += dlon;
    coords.push([lat / scale, lon / scale]);
  }
  return coords;
}

const enc = collectEncoded(j).sort((a, b) => b.length - a.length);
console.log('encoded count', enc.length, 'max len', enc[0]?.length);
for(const scale of [1e5, 1e6, 1e7]){
  const c = decodePolyline(enc[0], scale);
  const ru = c.filter(p => p[0] > 40 && p[0] < 82 && p[1] > 19 && p[1] < 180).length;
  console.log('scale', scale, 'points', c.length, 'ru', ru, 'sample', c.slice(0, 3));
}
