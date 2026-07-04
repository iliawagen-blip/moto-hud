/** Регистрация SW с версией сборки и автоперезагрузкой при обновлении. */
export function registerServiceWorker(){
  if(!('serviceWorker' in navigator) || window.__SIM__ || location.protocol === 'file:') return;

  const raw = window.__BUILD_ID__;
  const buildId = (raw && raw !== '__BUILD_ID__') ? raw : 'dev';
  const url = 'sw.js?v=' + encodeURIComponent(buildId);

  navigator.serviceWorker.register(url, { scope: './' }).then(reg => {
    const reloadIfWaiting = worker => {
      if(!worker) return;
      worker.postMessage({ type: 'SKIP_WAITING' });
      if(navigator.serviceWorker.controller) location.reload();
    };

    if(reg.waiting) reloadIfWaiting(reg.waiting);

    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if(!nw) return;
      nw.addEventListener('statechange', () => {
        if(nw.state === 'installed') reloadIfWaiting(nw);
      });
    });
  }).catch(() => {});
}
