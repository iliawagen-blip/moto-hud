/**
 * Разбор ссылок Яндекс.Карт: waypoints из rtext (без парсинга HTML).
 * @module yandex-link
 */

export const YANDEX_PARSER_REV = 2;

/** Домены и пути Яндекс.Карт (длинные и короткие ссылки). */
export const YANDEX_URL_RE =
  /https?:\/\/(?:[a-z0-9-]+\.)?(?:yandex\.(?:ru|com|by|kz|uz)|ya\.ru)\/(?:maps|navi)[^\s"'<>]*/gi;

const SHORT_RE = /^https?:\/\/(?:[a-z0-9-]+\.)?(?:yandex\.(?:ru|com|by|kz|uz)|ya\.ru)\/maps\/-/i;
const RTEXT_RE = /[?&#]rtext=([^&#]+)/i;

const DEFAULT_LABELS = (i, total) => {
  if(i === 0) return 'Старт';
  if(i === total - 1) return 'Финиш';
  return `Точка ${i + 1}`;
};

/** Декодирование query-значения (rtext, + → пробел). */
export function decodeQueryComponent(raw){
  if(raw == null) return '';
  let s = String(raw).trim();
  if(!s) return '';
  try{
    s = decodeURIComponent(s.replace(/\+/g, '%20'));
  }catch{
    s = s.replace(/\+/g, ' ');
  }
  return s;
}

/** Нормализация вставки: убрать кавычки, HTML-сущности, лишние пробелы. */
export function normalizePastedText(text){
  return String(text || '')
    .replace(/&amp;/gi, '&')
    .replace(/&#0*38;/g, '&')
    .replace(/^[\s"'«»]+|[\s"'«»]+$/g, '')
    .trim();
}

/**
 * Извлечь первую ссылку Яндекс.Карт из текста (в т.ч. длинной вставки из мессенджера).
 * @param {string} text
 * @returns {string|null}
 */
export function extractYandexUrl(text){
  const s = normalizePastedText(text);
  if(!s) return null;

  if(/^https?:\/\//i.test(s)){
    const one = s.match(YANDEX_URL_RE);
    if(one) return one[0];
  }

  const m = s.match(YANDEX_URL_RE);
  return m ? m[0] : null;
}

/**
 * Синхронное извлечение rtext из уже раскрытого URL.
 * @param {string} url
 * @returns {string|null}
 */
export function extractRtextParam(url){
  const m = String(url || '').match(RTEXT_RE);
  return m ? decodeQueryComponent(m[1]) : null;
}

/** @param {string} part @param {number} index @param {number} total */
function parseRtextPoint(part, index, total){
  const s = String(part || '').trim();
  if(!s) return null;

  const coord = s.match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if(coord){
    const lat = parseFloat(coord[1]);
    const lon = parseFloat(coord[2]);
    if(Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180){
      return { lat, lon, label: DEFAULT_LABELS(index, total) };
    }
  }
  return null;
}

/**
 * Разбор строки rtext в waypoints (только координаты lat,lon).
 * @param {string} rtext
 * @returns {Array<{lat:number,lon:number,label:string}>}
 */
export function parseRtextWaypoints(rtext){
  const parts = String(rtext || '').split('~').map(p => p.trim()).filter(Boolean);
  const waypoints = parts
    .map((part, i) => parseRtextPoint(part, i, parts.length))
    .filter(Boolean);
  if(waypoints.length < 2){
    throw new Error('Мало точек в rtext (нужно ≥2 с координатами lat,lon)');
  }
  return waypoints;
}

/**
 * Раскрытие короткой ссылки (maps/-/…). fetch injectable для Node.
 * @param {string} url
 * @param {{ fetchFn?: typeof fetch }} [opts]
 */
export async function resolveYandexShortLink(url, opts = {}){
  const fetchFn = opts.fetchFn || globalThis.fetch;
  if(!fetchFn) return url;
  if(!SHORT_RE.test(url)) return url;

  const tryFetch = async method => {
    const res = await fetchFn(url, {
      redirect: 'follow',
      method,
      signal: AbortSignal.timeout?.(15000)
    });
    return res.url && res.url !== url ? res.url : url;
  };

  try{
    return await tryFetch('HEAD');
  }catch{
    try{
      return await tryFetch('GET');
    }catch{
      return url;
    }
  }
}

/**
 * Построить share-URL с rtext (для экспорта / regression).
 * @param {Array<{lat:number,lon:number}>} waypoints
 * @param {{ rtt?: string }} [opts]
 */
export function buildYandexRouteUrl(waypoints, opts = {}){
  const rtext = waypoints.map(w => `${w.lat},${w.lon}`).join('~');
  const rtt = opts.rtt || 'auto';
  return `https://yandex.ru/maps/?rtext=${encodeURIComponent(rtext)}&rtt=${rtt}`;
}

/**
 * @param {string} rawUrl
 * @param {{ fetchFn?: typeof fetch }} [opts]
 * @returns {Promise<Array<{lat:number,lon:number,label:string}>>}
 */
export async function parseYandexRouteLink(rawUrl, opts = {}){
  let url = normalizePastedText(rawUrl);
  if(!url) throw new Error('Пустая ссылка');

  const extracted = extractYandexUrl(url);
  if(extracted) url = extracted;
  else if(!/yandex\.|ya\.ru/i.test(url)){
    throw new Error('Не ссылка Яндекс.Карт');
  }

  url = await resolveYandexShortLink(url, opts);

  const rtext = extractRtextParam(url);
  if(!rtext){
    throw new Error(
      'В ссылке нет маршрута (rtext). Постройте маршрут в Яндекс.Картах → «Поделиться» → скопируйте длинную ссылку.'
    );
  }

  return parseRtextWaypoints(rtext);
}

/** @param {string} raw */
export function isYandexMapsUrl(raw){
  return !!extractYandexUrl(raw) || /yandex\.(?:ru|com)|ya\.ru\/maps/i.test(normalizePastedText(raw));
}
