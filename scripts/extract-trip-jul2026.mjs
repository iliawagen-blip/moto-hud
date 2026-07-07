#!/usr/bin/env node
/**
 * Извлечение структуры поездки из route-jul2026.html → fixtures/trip-jul2026.json
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, '..', 'route-jul2026.html');
const OUT = path.join(ROOT, 'fixtures', 'trip-jul2026.json');

if(!fs.existsSync(SRC)){
  console.error('Source not found:', SRC);
  process.exit(1);
}

const html = fs.readFileSync(SRC, 'utf8');

function stripTags(s){
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseRtextLinks(block){
  const segs = [];
  const re = /data-rtext="([^"]+)"[^>]*>([^<]+)</g;
  let m;
  while((m = re.exec(block))){
    segs.push({ label: stripTags(m[2]), rtext: m[1] });
  }
  return segs;
}

function parseVariantsFromBody(body){
  const variants = [];
  const re = /<div class="day-variant[^"]*"\s+data-variant="(calm|intense)"[^>]*>/g;
  const hits = [];
  let m;
  while((m = re.exec(body))) hits.push({ id: m[1], start: m.index + m[0].length });
  for(let i = 0; i < hits.length; i++){
    const chunkEnd = findVariantEnd(body, hits[i].start);
    const chunk = body.slice(hits[i].start, chunkEnd);
    variants.push(parseVariant(chunk, hits[i].id));
  }
  return variants;
}

function findVariantEnd(body, start){
  let pos = start;
  let depth = 1;
  while(pos < body.length && depth > 0){
    const nextOpen = body.indexOf('<div', pos);
    const nextClose = body.indexOf('</div>', pos);
    if(nextClose === -1) break;
    if(nextOpen !== -1 && nextOpen < nextClose){
      depth++;
      pos = nextOpen + 4;
    } else {
      depth--;
      if(depth === 0) return nextClose;
      pos = nextClose + 6;
    }
  }
  return body.length;
}

function parseVariant(block, id){
  const schedule = stripTags((block.match(/class="schedule"[^>]*>([\s\S]*?)<\//) || [])[1] || '');
  const routeLine = stripTags((block.match(/class="route-line"[^>]*>([\s\S]*?)<\//) || [])[1] || '');
  const stats = stripTags((block.match(/class="route-stats"[^>]*>([\s\S]*?)<\//) || [])[1] || '');
  const lunch = stripTags((block.match(/class="lunch"[^>]*>([\s\S]*?)<\//) || [])[1] || '');
  const night = stripTags((block.match(/class="night[^"]*"[^>]*>([\s\S]*?)<\//) || [])[1] || '');
  const nightMood = stripTags((block.match(/class="night-mood"[^>]*>([\s\S]*?)<\//) || [])[1] || '');
  return {
    id,
    label: id === 'calm' ? 'Спокойно' : 'Интенсив',
    schedule,
    summary: routeLine,
    stats,
    lunch,
    night: night || nightMood,
    segments: parseRtextLinks(block)
  };
}

const days = [];
const articleRe = /<article class="card[^"]*" data-day="(\d+)">([\s\S]*?)<\/article>/g;
let am;
while((am = articleRe.exec(html))){
  const dayN = parseInt(am[1], 10);
  const body = am[2];
  const date = stripTags((body.match(/class="date"[^>]*>([^<]+)/) || [])[1] || '');
  const badge = stripTags((body.match(/class="badge[^"]*"[^>]*>([^<]+)/) || [])[1] || '');
  const variants = parseVariantsFromBody(body);
  days.push({ n: dayN, date, badge, variants });
}

const meta = {};
for(const [name, re] of [
  ['nightsRoute', /var nightsRoute = \[([\s\S]*?)\]\.join\('~'\)/],
  ['fullTripRoute', /var fullTripRoute = \[([\s\S]*?)\]\.join\('~'\)/],
  ['m4ReturnRoute', /var m4ReturnRoute = \[([\s\S]*?)\]\.join\('~'\)/],
  ['scenicReturnRoute', /var scenicReturnRoute = \[([\s\S]*?)\]\.join\('~'\)/]
]){
  const m = html.match(re);
  if(m){
    const pts = [...m[1].matchAll(/'([\d.]+),([\d.]+)'/g)].map(x => `${x[1]},${x[2]}`);
    meta[name] = pts.join('~');
  }
}

const trip = {
  id: 'jul2026-caucasus',
  version: 1,
  title: 'Москва → Кавказ, 1–14 июля 2026',
  startDate: '2026-07-01',
  endDate: '2026-07-14',
  start: { lat: 55.591477, lon: 37.538641, label: 'Карамзина, 9' },
  finish: { lat: 55.591477, lon: 37.538641, label: 'Карамзина, 9' },
  meta,
  days
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(trip, null, 2));
console.log('Written', OUT, '—', days.length, 'days,',
  days.reduce((a, d) => a + d.variants.reduce((b, v) => b + v.segments.length, 0), 0), 'segments');
