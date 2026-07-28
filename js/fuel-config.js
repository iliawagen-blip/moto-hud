/**
 * URL прокси статуса топлива на АЗС.
 * Основной: Cloudflare Worker / same-origin /api/fuel.
 * Запасной: Google Apps Script …/exec (Documents/jul26/fuel-proxy.gs, dual-mode).
 */
export const FUEL_PROXY_LS_KEY = 'moto-hud-fuel-proxy-url';

function normalizeProxyBase(url){
  return String(url || '').trim().replace(/\/$/, '');
}

/** Google Apps Script web app (/macros/s/…/exec) — nearby бьёт в корень, без /nearby. */
export function isGoogleAppsScriptProxy(url){
  return /script\.google\.com\/macros\/s\//i.test(String(url || ''));
}

/** Базовый URL прокси без завершающего слэша, или '' если выкл. */
export function getFuelProxyBase(){
  try{
    const q = new URLSearchParams(location.search).get('fuel_proxy');
    if(q === '0' || q === 'off') return '';
    if(q && /^https?:\/\//i.test(q)) return normalizeProxyBase(q);
  }catch(e){}

  try{
    const stored = localStorage.getItem(FUEL_PROXY_LS_KEY);
    if(stored === '0' || stored === '') return '';
    if(stored && /^https?:\/\//i.test(stored)) return normalizeProxyBase(stored);
  }catch(e){}

  if(typeof location !== 'undefined' && location.protocol.startsWith('http')){
    return location.origin + '/api/fuel';
  }
  return '';
}

export function setFuelProxyBase(url){
  const v = normalizeProxyBase(url);
  if(!v) localStorage.removeItem(FUEL_PROXY_LS_KEY);
  else localStorage.setItem(FUEL_PROXY_LS_KEY, v);
}

/**
 * Полный URL nearby через прокси.
 * Worker /api/fuel → …/nearby?lat&lon&radius_km
 * GAS → …/exec?lat&lon&radius_km (без /nearby; org Яндекса сюда не передаём).
 */
export function fuelProxyNearbyUrl(base, lat, lon, radiusKm){
  const root = normalizeProxyBase(base);
  let path;
  if(isGoogleAppsScriptProxy(root)){
    path = root.split(/[?#]/)[0].replace(/\/$/, '');
  }else{
    path = root.endsWith('/nearby') ? root : root + '/nearby';
  }
  const u = new URL(path, root.startsWith('http') ? undefined : location.origin);
  u.searchParams.set('lat', String(lat));
  u.searchParams.set('lon', String(lon));
  u.searchParams.set('radius_km', String(radiusKm));
  return u.href;
}
