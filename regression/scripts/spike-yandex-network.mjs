#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const wps = [
  { lat: 55.816706, lon: 49.211787 },
  { lat: 55.782897, lon: 49.139095 }
];
const rtext = wps.map(w => `${w.lat},${w.lon}`).join('~');
const url = `https://yandex.ru/maps/?rtext=${encodeURIComponent(rtext)}&rtt=auto`;

const hits = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: 'ru-RU' });

page.on('response', async res => {
  const u = res.url();
  if(!u.includes('yandex')) return;
  try{
    const txt = await res.text();
    if(txt.length < 80) return;
    const interesting = /coordinates|polyline|geometry|distance|duration|router|driving/i.test(txt) ||
      /route|router|driving|mrc/.test(u);
    if(!interesting) return;
    let keys = 'non-json';
    try{ keys = Object.keys(JSON.parse(txt)).join(','); }catch(e){ /* */ }
    hits.push({ url: u.split('?')[0], len: txt.length, keys });
    if(u.includes('mrc') && txt.startsWith('{')){
      const out = path.join('regression', 'cache', 'yandex-spike-' + hits.length + '.json');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, txt);
    }
  }catch(e){ /* */ }
});

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(20000);

const dist = await page.evaluate(() => {
  const el = document.querySelector('[class*="route"] [class*="distance"], [class*="Route"]');
  return document.body.innerText.slice(0, 500);
}).catch(() => '');

console.log('hits:', hits.length);
hits.forEach(h => console.log(h.url, h.len, h.keys));
console.log('body snippet:', dist.slice(0, 200));
await browser.close();
