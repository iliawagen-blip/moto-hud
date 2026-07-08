/**
 * Прокси ГдеБЕНЗ для moto-hud (Cloudflare Worker).
 * Обходит CORS для PWA на GitHub Pages.
 *
 * Deploy: npx wrangler deploy (из workers/gdebenz-proxy)
 * В приложении: ⚙ Опции → URL прокси топлива → https://…workers.dev
 */
const UPSTREAM = 'https://gdebenz.ru/api';

/** Разрешённые Origin (добавьте свой домен при необходимости). */
const ALLOWED_ORIGINS = [
  'https://iliawagen-blip.github.io',
  'http://localhost:3456',
  'http://127.0.0.1:3456',
  'capacitor://localhost',
  'http://localhost'
];

function corsHeaders(request){
  const origin = request.headers.get('Origin') || '';
  const ok = ALLOWED_ORIGINS.some(a => origin === a || origin.startsWith(a));
  return {
    'Access-Control-Allow-Origin': ok ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function json(data, status, extra){
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...extra }
  });
}

export default {
  async fetch(request){
    const cors = corsHeaders(request);
    if(request.method === 'OPTIONS'){
      return new Response(null, { status: 204, headers: cors });
    }
    if(request.method !== 'GET'){
      return json({ error: 'method not allowed' }, 405, cors);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    if(path !== '/nearby' && path !== '/api/fuel/nearby' && path !== ''){
      return json({ error: 'not found', hint: 'GET /nearby?lat=&lon=&radius_km=' }, 404, cors);
    }

    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    const radiusKm = url.searchParams.get('radius_km') || '40';
    if(!lat || !lon){
      return json({ error: 'lat and lon required' }, 400, cors);
    }

    const up = UPSTREAM + '/nearby?lat=' + encodeURIComponent(lat) +
      '&lon=' + encodeURIComponent(lon) +
      '&radius_km=' + encodeURIComponent(radiusKm);

    try{
      const r = await fetch(up, {
        headers: { 'User-Agent': 'moto-hud-fuel-proxy/1', Accept: 'application/json' },
        cf: { cacheTtl: 300, cacheEverything: true }
      });
      const body = await r.text();
      return new Response(body, {
        status: r.status,
        headers: {
          ...cors,
          'Content-Type': r.headers.get('Content-Type') || 'application/json',
          'Cache-Control': 'public, max-age=300'
        }
      });
    }catch(e){
      return json({ error: 'upstream failed', message: String(e.message || e) }, 502, cors);
    }
  }
};
