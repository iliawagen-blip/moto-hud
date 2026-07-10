#!/usr/bin/env node
/**
 * Spike: поиск polyline в ответах Яндекс.Карт.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const wps = [
  { lat: 55.816706, lon: 49.211787 },
  { lat: 55.782897, lon: 49.139095 }
];
const rtext = wps.map(w => `${w.lat},${w.lon}`).join('~');
const url = `https://yandex.ru/maps/?rtext=${encodeURIComponent(rtext)}&rtt=auto`;

function findPolylines(obj, depth = 0, out = [], seen = new WeakSet()){
  if(depth > 16 || obj == null) return out;
  if(typeof obj === 'string'){
    if(obj.length > 80 && /^[A-Za-z0-9_-]+$/.test(obj.slice(0, 40))){
      out.push({ type: 'encoded', len: obj.length, sample: obj.slice(0, 60) });
    }
    return out;
  }
  if(typeof obj !== 'object') return out;
  if(seen.has(obj)) return out;
  seen.add(obj);

  if(Array.isArray(obj) && obj.length > 15){
    const pairs = obj.filter(p =>
      Array.isArray(p) && p.length >= 2 &&
      typeof p[0] === 'number' && typeof p[1] === 'number' &&
      p[0] > 40 && p[0] < 82 && p[1] > 19 && p[1] < 180
    );
    if(pairs.length > obj.length * 0.8){
      out.push({ type: 'coords', len: pairs.length, sample: pairs.slice(0, 2) });
    }
  }

  if(Array.isArray(obj)){
    for(const v of obj.slice(0, 30)) findPolylines(v, depth + 1, out, seen);
  }else{
    for(const v of Object.values(obj).slice(0, 40)) findPolylines(v, depth + 1, out, seen);
  }
  return out;
}

const captures = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: 'ru-RU' });

page.on('response', async res => {
  const u = res.url();
  if(!/yandex\.(ru|net)|maps\.yandex/.test(u)) return;
  try{
    const ct = res.headers()['content-type'] || '';
    if(!/json|javascript|text/.test(ct)) return;
    const txt = await res.text();
    if(txt.length < 200 || txt.length > 6_000_000) return;
    let parsed = null;
    try{ parsed = JSON.parse(txt); }catch(e){ return; }
    const found = findPolylines(parsed);
    if(found.length){
      captures.push({ url: u.split('?')[0], found });
    }
  }catch(e){ /* */ }
});

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(22000);

const dom = await page.evaluate(() => {
  const t = document.body.innerText;
  const km = t.match(/(\d+[,.]\d+|\d+)\s*км/);
  const min = t.match(/(\d+)\s*мин/);
  return { km: km?.[0], min: min?.[0] };
});

console.log('dom', dom);
console.log('captures', captures.length);
captures.forEach(c => {
  console.log(c.url);
  c.found.forEach(f => console.log(' ', f.type, f.len));
});

const out = path.join('regression', 'cache', 'yandex-spike-captures.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ dom, captures }, null, 2));
await browser.close();
