/**
 * URL прокси ГдеБЕНЗ (Cloudflare Worker или /api/fuel на своём домене).
 */
export const FUEL_PROXY_LS_KEY = 'moto-hud-fuel-proxy-url';

/** Базовый URL прокси без завершающего слэша, или '' если выкл. */
export function getFuelProxyBase(){
  try{
    const q = new URLSearchParams(location.search).get('fuel_proxy');
    if(q === '0' || q === 'off') return '';
    if(q && /^https?:\/\//i.test(q)) return q.replace(/\/$/, '');
  }catch(e){}

  try{
    const stored = localStorage.getItem(FUEL_PROXY_LS_KEY);
    if(stored === '0' || stored === '') return '';
    if(stored && /^https?:\/\//i.test(stored)) return stored.replace(/\/$/, '');
  }catch(e){}

  if(typeof location !== 'undefined' && location.protocol.startsWith('http')){
    return location.origin + '/api/fuel';
  }
  return '';
}

export function setFuelProxyBase(url){
  const v = (url || '').trim().replace(/\/$/, '');
  if(!v) localStorage.removeItem(FUEL_PROXY_LS_KEY);
  else localStorage.setItem(FUEL_PROXY_LS_KEY, v);
}

/** Полный URL nearby через прокси. */
export function fuelProxyNearbyUrl(base, lat, lon, radiusKm){
  const root = (base || '').replace(/\/$/, '');
  const path = root.endsWith('/nearby') ? root : root + '/nearby';
  const u = new URL(path, root.startsWith('http') ? undefined : location.origin);
  u.searchParams.set('lat', String(lat));
  u.searchParams.set('lon', String(lon));
  u.searchParams.set('radius_km', String(radiusKm));
  return u.href;
}
