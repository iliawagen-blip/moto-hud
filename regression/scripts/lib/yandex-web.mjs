/**
 * Playwright-хелперы для web-scrape Яндекс.Карт (driving).
 * Полилиния извлекается эвристически из JSON-ответов; надёжность не гарантируется.
 */
import { chromium } from 'playwright';
import { haversine, totalPathKm } from './geo.mjs';

const RU_LAT = [41, 82];
const RU_LON = [19, 180];
const WAIT_AFTER_LOAD_MS = 26000;
const NAV_TIMEOUT_MS = 90000;

/** Построение URL маршрута (rtext + rtt=auto). */
export function buildYandexUrl(waypoints){
  const rtext = waypoints.map(w => `${w.lat},${w.lon}`).join('~');
  return `https://yandex.ru/maps/?rtext=${encodeURIComponent(rtext)}&rtt=auto`;
}

/** Декодирование Google-encoded polyline (несколько scale для Яндекс-вариантов). */
export function decodeGooglePolyline(encoded, scale = 1e5){
  if(!encoded || typeof encoded !== 'string') return [];
  let index = 0;
  let lat = 0;
  let lon = 0;
  const coords = [];
  while(index < encoded.length){
    let b;
    let shift = 0;
    let result = 0;
    do{
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    }while(b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0;
    result = 0;
    do{
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    }while(b >= 0x20);
    const dlon = (result & 1) ? ~(result >> 1) : (result >> 1);
    lon += dlon;
    coords.push([lat / scale, lon / scale]);
  }
  return coords;
}

function inRuBbox(lat, lon){
  return lat >= RU_LAT[0] && lat <= RU_LAT[1] && lon >= RU_LON[0] && lon <= RU_LON[1];
}

/** Определение порядка [lat,lon] vs [lon,lat] по первой паре. */
export function normalizeToLatLon(pair){
  if(!Array.isArray(pair) || pair.length < 2) return null;
  const [a, b] = pair;
  if(typeof a !== 'number' || typeof b !== 'number') return null;
  if(inRuBbox(b, a)) return [b, a];
  if(inRuBbox(a, b)) return [a, b];
  return null;
}

function pathLengthM(polyline){
  if(!polyline?.length || polyline.length < 2) return 0;
  let d = 0;
  for(let i = 1; i < polyline.length; i++){
    d += haversine(
      { lat: polyline[i - 1][0], lon: polyline[i - 1][1] },
      { lat: polyline[i][0], lon: polyline[i][1] }
    );
  }
  return d;
}

function minDistToWaypointM(polyline, wp){
  if(!polyline?.length) return Infinity;
  let best = Infinity;
  for(const [lat, lon] of polyline){
    const d = haversine({ lat, lon }, wp);
    if(d < best) best = d;
  }
  return best;
}

/**
 * Оценка кандидата полилинии: близость к waypoints, длина пути, число точек.
 * @returns {{ score: number, startDist: number, endDist: number, pathKm: number }}
 */
export function scorePolylineCandidate(polyline, waypoints, expectedDistanceM = null){
  if(!polyline?.length || polyline.length < 8) {
    return { score: 0, startDist: Infinity, endDist: Infinity, pathKm: 0 };
  }
  const start = waypoints[0];
  const end = waypoints[waypoints.length - 1];
  const startDist = minDistToWaypointM(polyline, start);
  const endDist = minDistToWaypointM(polyline, end);
  const pathKm = pathLengthM(polyline) / 1000;
  const straightKm = totalPathKm(waypoints);

  let viaScore = 0;
  for(let i = 1; i < waypoints.length - 1; i++){
    const d = minDistToWaypointM(polyline, waypoints[i]);
    if(d < 800) viaScore += 1 - d / 800;
  }

  let lenScore = 0;
  if(expectedDistanceM && expectedDistanceM > 0){
    const ratio = (pathLengthM(polyline)) / expectedDistanceM;
    if(ratio >= 0.55 && ratio <= 1.45) lenScore = 1 - Math.abs(1 - ratio);
  }else if(pathKm >= straightKm * 0.85){
    lenScore = Math.min(1, pathKm / (straightKm * 2.5));
  }

  const ptScore = Math.min(1, polyline.length / 120);
  const bindScore = Math.max(0, 1 - startDist / 2500) * Math.max(0, 1 - endDist / 2500);

  const score = bindScore * 3 + lenScore * 2 + viaScore + ptScore;
  return { score, startDist, endDist, pathKm };
}

/** Рекурсивный поиск массивов координат в JSON. */
export function collectCoordCandidates(obj, sourceUrl = '', depth = 0, out = [], seen = new WeakSet()){
  if(depth > 18 || obj == null) return out;
  if(typeof obj !== 'object'){
    return out;
  }
  if(seen.has(obj)) return out;
  seen.add(obj);

  if(Array.isArray(obj) && obj.length >= 12){
    const norm = [];
    for(const p of obj){
      const ll = normalizeToLatLon(p);
      if(ll) norm.push(ll);
    }
    if(norm.length >= obj.length * 0.75 && norm.length >= 12){
      out.push({
        source: sourceUrl.split('?')[0],
        len: norm.length,
        polyline: norm
      });
    }
  }

  if(Array.isArray(obj)){
    const limit = Math.min(obj.length, 40);
    for(let i = 0; i < limit; i++){
      collectCoordCandidates(obj[i], sourceUrl, depth + 1, out, seen);
    }
  }else{
    const vals = Object.values(obj);
    const limit = Math.min(vals.length, 50);
    for(let i = 0; i < limit; i++){
      collectCoordCandidates(vals[i], sourceUrl, depth + 1, out, seen);
    }
  }
  return out;
}

/** Поиск encoded polyline-подобных строк в JSON. */
export function collectEncodedCandidates(obj, depth = 0, out = [], seen = new WeakSet()){
  if(depth > 18 || obj == null) return out;
  if(typeof obj === 'string'){
    if(obj.length >= 120 && obj.length <= 500_000 && /^[A-Za-z0-9+/_=-]+$/.test(obj)){
      out.push(obj);
    }
    return out;
  }
  if(typeof obj !== 'object') return out;
  if(seen.has(obj)) return out;
  seen.add(obj);
  if(Array.isArray(obj)){
    for(const v of obj.slice(0, 40)) collectEncodedCandidates(v, depth + 1, out, seen);
  }else{
    for(const v of Object.values(obj).slice(0, 50)) collectEncodedCandidates(v, depth + 1, out, seen);
  }
  return out;
}

/** Парсинг дистанции/времени из текста панели маршрута. */
export function parseDomMetrics(text){
  if(!text) return { distance_m: null, duration_s: null, raw: {} };

  const kmMatch = text.match(/(\d+(?:[,.]\d+)?)\s*км/u);
  const hMatch = text.match(/(\d+)\s*ч/u);
  const minMatches = [...text.matchAll(/(\d+)\s*мин/gu)];

  let distance_m = null;
  if(kmMatch){
    const km = parseFloat(kmMatch[1].replace(',', '.'));
    if(Number.isFinite(km)) distance_m = Math.round(km * 1000);
  }

  let duration_s = null;
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
  const mins = minMatches.length
    ? parseInt(minMatches[minMatches.length - 1][1], 10)
    : 0;
  if(hours > 0 || mins > 0){
    duration_s = hours * 3600 + mins * 60;
  }

  return {
    distance_m,
    duration_s,
    raw: { km: kmMatch?.[0] ?? null, hours, mins }
  };
}

/** Эвристика captcha на странице. */
export function detectCaptcha(html){
  if(!html) return false;
  return /smartcaptcha|showcaptcha|checkcaptcha|captcha__/i.test(html);
}

function dedupeCandidates(candidates){
  const map = new Map();
  for(const c of candidates){
    const poly = c.polyline;
    if(!poly?.length) continue;
    const key = `${poly.length}:${poly[0][0].toFixed(4)},${poly[0][1].toFixed(4)}:${poly.at(-1)[0].toFixed(4)},${poly.at(-1)[1].toFixed(4)}`;
    const prev = map.get(key);
    if(!prev || (c.score ?? 0) > (prev.score ?? 0)) map.set(key, c);
  }
  return [...map.values()];
}

/**
 * Выбор лучшей полилинии из перехваченных кандидатов.
 * @returns {{ polyline: number[][], fetch_method: string, score: number, source: string|null }|null}
 */
export function pickBestPolyline(rawCandidates, waypoints, expectedDistanceM){
  const scored = rawCandidates.map(c => {
    const s = scorePolylineCandidate(c.polyline, waypoints, expectedDistanceM);
    return { ...c, score: s.score, startDist: s.startDist, endDist: s.endDist, pathKm: s.pathKm };
  }).filter(c => c.score > 2.5 && c.startDist < 2000 && c.endDist < 2000);

  const best = dedupeCandidates(scored).sort((a, b) => b.score - a.score)[0];
  if(!best) return null;
  return {
    polyline: best.polyline,
    fetch_method: 'network_intercept',
    score: best.score,
    source: best.source ?? null
  };
}

function attachResponseCollector(page){
  const raw = [];
  const handler = async res => {
    const u = res.url();
    if(!/yandex\.(ru|net)|maps\.yandex/.test(u)) return;
    try{
      const ct = res.headers()['content-type'] || '';
      if(!/json|javascript|text\/plain/.test(ct)) return;
      const txt = await res.text();
      if(txt.length < 80 || txt.length > 8_000_000) return;
      let parsed;
      try{ parsed = JSON.parse(txt); }catch{ return; }

      for(const c of collectCoordCandidates(parsed, u)){
        raw.push(c);
      }
      for(const enc of collectEncodedCandidates(parsed)){
        for(const scale of [1e5, 1e6, 1e7]){
          const pts = decodeGooglePolyline(enc, scale);
          const ru = pts.filter(([lat, lon]) => inRuBbox(lat, lon)).length;
          if(pts.length >= 20 && ru >= pts.length * 0.9){
            raw.push({ source: u.split('?')[0], len: pts.length, polyline: pts, encodedScale: scale });
          }
        }
      }
    }catch{ /* ignore parse errors */ }
  };
  page.on('response', handler);
  return raw;
}

/**
 * Загрузка маршрута через headless Chromium.
 * @param {object} opts
 * @param {{lat:number,lon:number}[]} opts.waypoints
 * @param {boolean} [opts.headed]
 */
export async function fetchYandexRoute({ waypoints, headed = false }){
  const url = buildYandexUrl(waypoints);
  const browser = await chromium.launch({ headless: !headed });
  const page = await browser.newPage({
    locale: 'ru-RU',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  const rawCandidates = attachResponseCollector(page);
  let html = '';

  try{
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    html = await page.content();
    if(detectCaptcha(html)){
      return { ok: false, error: 'captcha', url };
    }
    if(resp && resp.status() >= 400){
      return { ok: false, error: `http_${resp.status()}`, url };
    }

    await page.waitForTimeout(WAIT_AFTER_LOAD_MS);
    html = await page.content();
    if(detectCaptcha(html)){
      return { ok: false, error: 'captcha', url };
    }

    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    const dom = parseDomMetrics(bodyText);
    const picked = pickBestPolyline(rawCandidates, waypoints, dom.distance_m);

    return {
      ok: true,
      url,
      dom,
      polyline: picked?.polyline ?? null,
      fetch_method: picked?.fetch_method ?? null,
      provider_meta: {
        polyline_score: picked?.score ?? null,
        polyline_source: picked?.source ?? null,
        candidates_seen: rawCandidates.length,
        dom_raw: dom.raw
      }
    };
  }finally{
    await browser.close();
  }
}

export function randomDelayMs(minMs, maxMs){
  const lo = Math.min(minMs, maxMs);
  const hi = Math.max(minMs, maxMs);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
