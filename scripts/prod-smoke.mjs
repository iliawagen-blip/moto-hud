#!/usr/bin/env node
/**
 * Smoke-тест статики на деплое (GitHub Pages и др.).
 *   node scripts/prod-smoke.mjs [baseUrl]
 */
const BASE = (process.argv[2] || 'https://iliawagen-blip.github.io/moto-hud').replace(/\/$/, '');
const results = [];

function log(ok, name, detail = ''){
  results.push({ ok, name, detail });
  console.log((ok ? '✓' : '✗') + ' ' + name + (detail ? ' — ' + detail : ''));
}

async function check(path, opts = {}){
  const url = path.startsWith('http') ? path : BASE + path;
  const res = await fetch(url, { redirect: 'follow' });
  const text = opts.headOnly ? '' : await res.text();
  if(opts.minBytes && text.length < opts.minBytes){
    throw new Error('too small: ' + text.length + ' bytes');
  }
  if(opts.includes && !text.includes(opts.includes)){
    throw new Error('missing: ' + opts.includes);
  }
  if(opts.regex && !opts.regex.test(text)){
    throw new Error('regex miss');
  }
  return { status: res.status, len: text.length, text };
}

async function main(){
  console.log('Smoke:', BASE, '\n');

  const pages = [
    ['/', { includes: 'Мото ИЛС', minBytes: 5000 }],
    ['/index.html', { includes: '__BUILD_ID__', minBytes: 5000 }],
    ['/sim.html', { includes: 'Эмулятор', minBytes: 3000 }],
    ['/docs/support.html', { minBytes: 500 }],
    ['/docs/offer.html', { minBytes: 500 }],
    ['/docs/disclaimer.html', { minBytes: 500 }],
    ['/fixtures/serpentine-demo.gpx', { includes: '<gpx', minBytes: 200 }]
  ];

  for(const [path, opts] of pages){
    try{
      const r = await check(path, opts);
      log(r.status === 200, 'GET ' + path, 'HTTP ' + r.status + ' · ' + r.len + ' B');
    }catch(e){
      log(false, 'GET ' + path, e.message);
    }
  }

  try{
    const idx = await check('/index.html');
    const m = idx.text.match(/__BUILD_ID__='([^']+)'/);
    const buildId = m?.[1] || '';
    log(!!buildId && buildId !== '__BUILD_ID__', 'build-id в index.html', buildId || '—');

    const assets = [
      '/js/app.js?v=' + buildId,
      '/js/sim.js?v=' + buildId,
      '/css/app.css',
      '/js/leaflet.js'
    ];
    for(const p of assets){
      const r = await check(p, { minBytes: 1000 });
      log(r.status === 200, 'asset ' + p.split('?')[0], r.len + ' B');
    }
  }catch(e){
    log(false, 'assets chain', e.message);
  }

  try{
    const osrm = 'https://router.project-osrm.org/route/v1/driving/37.616,55.757;37.632,55.827?overview=false&annotations=speed';
    const r = await fetch(osrm);
    const j = await r.json();
    log(r.ok && j.code === 'Ok', 'OSRM annotations=speed (маршрут)', j.code || r.status);
  }catch(e){
    log(false, 'OSRM', e.message);
  }

  const failed = results.filter(r => !r.ok);
  console.log('\n--- Итог smoke ---');
  console.log(`Пройдено: ${results.length - failed.length}/${results.length}`);
  if(failed.length){
    failed.forEach(f => console.log('  FAIL:', f.name, f.detail));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
