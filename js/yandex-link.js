/**
 * Разбор ссылок Яндекс.Карт: waypoints из rtext (без парсинга HTML).
 * @module yandex-link
 */

export const YANDEX_PARSER_REV = 1;

export const YANDEX_URL_RE = /https?:\/\/(?:yandex\.ru|ya\.ru)\/maps[^\s"'<>]*/i;
const SHORT_RE = /^https?:\/\/(?:yandex\.ru|ya\.ru)\/maps\/-/i;
const RTEXT_RE = /[?&]rtext=([^&]+)/i;

/** @param {string} text */
export function extractYandexUrl(text){
  const s = String(text || '').trim();
  if(!s) return null;
  if(YANDEX_URL_RE.test(s)) return s.match(YANDEX_URL_RE)[0];
  const m = s.match(YANDEX_URL_RE);
  return m ? m[0] : null;
}

/** @param {string} part */
function parseRtextPoint(part){
  const s = String(part || '').trim();
  if(!s) return null;
  const coord = s.match(/^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/);
  if(coord){
    const lat = parseFloat(coord[1]);
    const lon = parseFloat(coord[2]);
    if(Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon, label: s };
  }
  return null;
}

/**
 * @param {string} rawUrl
 * @returns {Promise<Array<{lat:number,lon:number,label?:string}>>}
 */
export async function parseYandexRouteLink(rawUrl){
  let url = String(rawUrl || '').trim();
  if(!url) throw new Error('Пустая ссылка');
  if(!extractYandexUrl(url)) throw new Error('Не ссылка Яндекс.Карт');

  if(SHORT_RE.test(url)){
    try{
      const res = await fetch(url, { redirect: 'follow', method: 'HEAD', mode: 'cors' });
      if(res.url) url = res.url;
    }catch{
      /* offline / CORS — пробуем исходный URL */
    }
  }

  const m = url.match(RTEXT_RE);
  if(!m) throw new Error('В ссылке нет маршрута (rtext). Постройте маршрут в Яндекс.Картах и нажмите «Поделиться».');

  const parts = decodeURIComponent(m[1]).split('~');
  const waypoints = parts.map(parseRtextPoint).filter(Boolean);
  if(waypoints.length < 2) throw new Error('Мало точек в rtext (нужно ≥2)');

  return waypoints;
}

/** @param {string} raw */
export function isYandexMapsUrl(raw){
  return !!extractYandexUrl(raw);
}
