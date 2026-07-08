#!/usr/bin/env node
/**
 * Spike: поиск открытых HTTP API «ГдеЗаправка» / gdeto-zapravka.ru
 * Запуск: npm run fuel:spike [-- lat lon]
 */
const lat = parseFloat(process.argv[2]) || 55.75;
const lon = parseFloat(process.argv[3]) || 37.62;
const radius = 40;

const CANDIDATES = [
  { name: 'gdeto-zapravka /api/nearby', url: `https://gdeto-zapravka.ru/api/nearby?lat=${lat}&lon=${lon}&radius_km=${radius}` },
  { name: 'gdeto-zapravka /api/v1/stations', url: `https://gdeto-zapravka.ru/api/v1/stations?lat=${lat}&lon=${lon}&radius=${radius * 1000}` },
  { name: 'gdeto-zapravka /api/stations/nearby', url: `https://gdeto-zapravka.ru/api/stations/nearby?latitude=${lat}&longitude=${lon}` },
  { name: 'gdezapravka.ru /api/nearby', url: `https://gdezapravka.ru/api/nearby?lat=${lat}&lon=${lon}&radius_km=${radius}` },
  { name: 'gdeto-zapravka GraphQL (probe)', url: 'https://gdeto-zapravka.ru/graphql', method: 'POST',
    body: JSON.stringify({ query: '{ stationsNearby(lat:' + lat + ', lon:' + lon + ') { id name } }' }) },
  { name: 'gdeto-zapravka mobile JSON', url: `https://gdeto-zapravka.ru/mobile/api/stations?lat=${lat}&lng=${lon}` },
  { name: 'gdeto-zapravka app config', url: 'https://gdeto-zapravka.ru/app/config.json' }
];

async function probe(item){
  const t0 = Date.now();
  try{
    const opts = {
      method: item.method || 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'moto-hud-fuel-spike/1'
      },
      signal: AbortSignal.timeout(12000)
    };
    if(item.body){
      opts.headers['Content-Type'] = 'application/json';
      opts.body = item.body;
    }
    const r = await fetch(item.url, opts);
    const ms = Date.now() - t0;
    const ct = r.headers.get('content-type') || '';
    const text = await r.text();
    const preview = text.slice(0, 220).replace(/\s+/g, ' ');
    let json = null;
    try{ json = JSON.parse(text); }catch(e){}
    const stations = json?.stations?.length ?? json?.data?.length ?? json?.items?.length ?? null;
    return {
      name: item.name,
      status: r.status,
      ms,
      ct,
      stations,
      preview,
      ok: r.ok
    };
  }catch(e){
    return { name: item.name, error: String(e.message || e), ms: Date.now() - t0 };
  }
}

console.log('fuel spike @', lat, lon, '\n');
for(const c of CANDIDATES){
  const r = await probe(c);
  if(r.error){
    console.log('✗', r.name, '—', r.error, `(${r.ms} ms)`);
  }else{
    const tag = r.ok ? '✓' : '·';
    console.log(tag, r.name, '→', r.status, `${r.ms}ms`, r.stations != null ? `stations=${r.stations}` : '', '\n  ', r.preview);
  }
}
console.log('\nИтог: публичного стабильного API у ГдеЗаправки не найдено — см. docs/fuel-sources.md');
