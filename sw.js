/* Service worker Мото-ИЛС.
   Версия кеша = mr702zw8 (подставляется npm run build).
   HTML и бандл — network-first; офлайн-оболочка без устаревшего index.html. */

const CACHE = 'moto-hud-shell-mr702zw8';

/** Только статика, не зависящая от релиза приложения */
const SHELL = [
  './manifest.json',
  './icon.svg',
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

self.addEventListener('message', event => {
  if(event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

function cachePut(req, res){
  if(res && res.ok && res.type === 'basic'){
    caches.open(CACHE).then(c => c.put(req, res)).catch(() => {});
  }
}

function respondNetworkFirst(req){
  return fetch(req)
    .then(r => { cachePut(req, r.clone()); return r; })
    .catch(() => caches.match(req));
}

function isAppShell(url){
  if(url.pathname.endsWith('/js/app.js') || url.pathname.endsWith('/js/app.js.map')) return true;
  if(url.pathname.includes('/css/')) return true;
  if(url.pathname.endsWith('.html') || url.pathname.endsWith('/')) return true;
  return false;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch(e){ return; }
  if(url.origin !== self.location.origin) return;

  if(isAppShell(url) || req.mode === 'navigate'){
    event.respondWith(respondNetworkFirst(req));
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
