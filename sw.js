/* Service worker Мото-ИЛС.
   Кеширует «оболочку» приложения (HTML/иконка/манифест) для установки и работы
   офлайн. Кросс-доменные запросы (OSRM/Overpass/Nominatim, будущие тайлы карт)
   НЕ перехватываются — ими управляет само приложение. */
const CACHE = 'moto-hud-shell-v1';
const SHELL = [
  './',
  './index.html',
  './sim.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {}) // отдельный недоступный ресурс не должен ломать установку
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

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch(e){ return; }
  // чужие домены (API, тайлы) — пропускаем без вмешательства
  if(url.origin !== self.location.origin) return;

  // переходы/страницы: сеть, при офлайне — кеш, иначе оболочка index.html
  if(req.mode === 'navigate'){
    event.respondWith(
      fetch(req)
        .then(r => { cachePut(req, r.clone()); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
    return;
  }

  // статика: stale-while-revalidate — мгновенно из кеша, обновление в фоне
  event.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req)
        .then(r => { cachePut(req, r.clone()); return r; })
        .catch(() => cached);
      return cached || net;
    })
  );
});
