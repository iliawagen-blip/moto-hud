/* Service worker Мото-ИЛС.

   Кеширует «оболочку» приложения (HTML/иконка/манифест) для установки и работы

   офлайн. Кросс-доменные запросы (OSRM/Overpass/Nominatim, будущие тайлы карт)

   НЕ перехватываются — ими управляет само приложение. */

const CACHE = 'moto-hud-shell-v15';

const SHELL = [

  './',

  './index.html',

  './sim.html',

  './manifest.json',

  './icon.svg',

  './css/app.css',

  './js/sim.js',

  './fixtures/serpentine-demo.gpx'

];



self.addEventListener('install', event => {

  event.waitUntil(

    caches.open(CACHE)

      .then(c => c.addAll(SHELL))

      .then(() => self.skipWaiting())

      .catch(() => {})

  );

});



self.addEventListener('activate', event => {

  event.waitUntil(

    caches.keys()

      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))

      .then(() => self.clients.claim())

  );

});



function cachePut(req, res){

  if(res && res.ok && res.type === 'basic'){

    caches.open(CACHE).then(c => c.put(req, res)).catch(() => {});

  }

}



/** Бандл приложения — всегда сначала сеть (иначе stale-while-revalidate отдаёт старый HUD) */

function respondNetworkFirst(req){

  return fetch(req)

    .then(r => { cachePut(req, r.clone()); return r; })

    .catch(() => caches.match(req));

}



self.addEventListener('fetch', event => {

  const req = event.request;

  if(req.method !== 'GET') return;

  let url;

  try { url = new URL(req.url); } catch(e){ return; }

  if(url.origin !== self.location.origin) return;



  if(url.pathname.endsWith('/js/app.js') || url.pathname.endsWith('/js/app.js.map') ||
     url.pathname.includes('/css/')){

    event.respondWith(respondNetworkFirst(req));

    return;

  }



  if(req.mode === 'navigate'){

    event.respondWith(

      fetch(req)

        .then(r => { cachePut(req, r.clone()); return r; })

        .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))

    );

    return;

  }



  event.respondWith(

    caches.match(req).then(cached => {

      const net = fetch(req)

        .then(r => { cachePut(req, r.clone()); return r; })

        .catch(() => cached);

      return cached || net;

    })

  );

});

