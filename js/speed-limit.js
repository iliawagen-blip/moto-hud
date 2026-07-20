/**
 * Динамическое ограничение скорости по данным OSRM / OSM.
 * @module speed-limit
 */
import { S } from './state.js';
import { $ } from './util.js';
import { haversine, distToSegment } from './geo.js';
import telemetry from './telemetry.js';
import { speak } from './voice.js';
import {
  SPEED_LIMIT_LOOKAHEAD_M,
  SPEED_LIMIT_GRACE_MS,
  SPEED_LIMIT_OVERSPEED_KMH,
  SPEED_LIMIT_VOICE_MIN_M,
  SPEED_LIMIT_VOICE_MAX_M,
  SPEED_LIMIT_URBAN_PLACE_RADIUS_M
} from './nav-constants.js';
import {
  filterWaysNearRoute,
  loadHighwaysSnapshotForRoute,
  routeInHighwaysSnapshot
} from './highways-snapshot.js';
import { loadMergedLayer, pointNearAny } from './osm-regions.js';

/** @typedef {'osm'|'implicit'|'default'|'none'} SpeedLimitSource */
/** @typedef {{ speed?: number, unit?: string, unknown?: boolean, none?: boolean }} MaxspeedEntry */

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const WAY_MATCH_MAX_M = 40;
/** Уже коридор: field 16–17.07 — batch 36 + 55s×3 зеркала → abort и known_pct=0 */
const CORRIDOR_AROUND_M = 35;
const SAMPLE_STEP_M = 400;
const SAMPLE_BATCH = 12;
const OVERPASS_MIRROR_TIMEOUT_MS = 22000;
const COV_FLUSH_TICKS = 120;
let _highwayLoadToken = 0;
let _highwayRetryTimer = null;
let _highwayRetryStep = 0;

let _graceUntil = 0;
let _lastLimitKey = '';
let _lookaheadWarnedKey = '';
/** @type {Map<string, boolean>} */
const _urbanCache = new Map();
let _cov = { total: 0, osm: 0, implicit: 0, default: 0, none: 0 };
let _covTicks = 0;

const DAY_MAP = { Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0 };

/** Сброс состояния при старте/остановке HUD */
export function resetSpeedLimitState(){
  flushLimitCoverageTelemetry();
  _graceUntil = 0;
  _lastLimitKey = '';
  _lookaheadWarnedKey = '';
  S.currentLimit = null;
  S.currentLimitSource = 'default';
  renderSpeedLimitSign({ limit: null, source: 'default' }, null);
  const graceEl = $('speed-limit-grace');
  if(graceEl){ graceEl.textContent = ''; graceEl.classList.add('hidden'); }
}

function flushLimitCoverageTelemetry(){
  if(_cov.total < 10) return;
  const known = _cov.osm + _cov.implicit;
  telemetry.log('nav', {
    sub: 'limit_coverage',
    ticks: _cov.total,
    osm: _cov.osm,
    implicit: _cov.implicit,
    default: _cov.default,
    none: _cov.none,
    known_pct: Math.round(known / _cov.total * 1000) / 10
  });
  _cov = { total: 0, osm: 0, implicit: 0, default: 0, none: 0 };
  _covTicks = 0;
}

function recordCoverage(source){
  _cov.total++;
  if(source === 'osm') _cov.osm++;
  else if(source === 'implicit') _cov.implicit++;
  else if(source === 'none') _cov.none++;
  else _cov.default++;
  _covTicks++;
  if(_covTicks >= COV_FLUSH_TICKS) flushLimitCoverageTelemetry();
}

/** Нормализация элемента maxspeed из OSRM */
export function normalizeMaxspeedEntry(entry){
  if(entry == null) return { unknown: true };
  if(typeof entry === 'number' && Number.isFinite(entry)){
    return { speed: entry, unit: 'km/h' };
  }
  if(typeof entry === 'string'){
    const s = entry.trim().toLowerCase();
    if(s === 'unknown') return { unknown: true };
    if(s === 'none') return { none: true };
    const m = s.match(/^(\d+(?:\.\d+)?)\s*(km\/h|kmh|kph|mph)?$/i);
    if(m){
      const n = parseFloat(m[1]);
      const unit = (m[2] || 'km/h').toLowerCase().startsWith('mph') ? 'mph' : 'km/h';
      return { speed: n, unit };
    }
    const n = parseInt(s, 10);
    if(!isNaN(n)) return { speed: n, unit: 'km/h' };
    return { unknown: true };
  }
  if(typeof entry === 'object'){
    if(entry.none) return { none: true };
    if(entry.unknown) return { unknown: true };
    if(entry.speed != null && Number.isFinite(Number(entry.speed))){
      return { speed: Number(entry.speed), unit: entry.unit || 'km/h' };
    }
  }
  return { unknown: true };
}

/** km/h из записи maxspeed */
export function maxspeedEntryToKmh(entry){
  const e = normalizeMaxspeedEntry(entry);
  if(e.none) return null;
  if(e.unknown || e.speed == null) return undefined;
  if(e.unit === 'mph') return Math.round(e.speed * 1.60934);
  return Math.round(e.speed);
}

/** Зоны maxspeed OSM (РФ и распространённые коды) → км/ч */
const MAXSPEED_ZONE_KMH = {
  'ru:urban': 60,
  'ru:rural': 90,
  'ru:motorway': 110,
  'ru:living_street': 20,
  'ru:highway': 90,
  'de:urban': 50,
  'de:rural': 100,
  'de:motorway': 130
};

/** Числовой maxspeed из OSM-тега way */
export function parseMaxspeedTag(tag){
  if(tag == null) return null;
  const s = String(tag).trim();
  if(!s || /^(walk|none|signals|variable)$/i.test(s)) return null;
  const zone = MAXSPEED_ZONE_KMH[s.toLowerCase()];
  if(zone != null) return zone;
  if(/^(ru:|de:)/i.test(s)) return null;
  const n = parseInt(s, 10);
  return !isNaN(n) && n > 0 ? n : null;
}

/**
 * Простой парсер maxspeed:conditional («40 @ (Mo-Fr 07:00-09:00)»).
 * @param {string} tag
 * @param {Date} [now]
 * @returns {number|null}
 */
export function parseSimpleConditional(tag, now = new Date()){
  if(!tag || typeof tag !== 'string') return null;
  const m = tag.trim().match(
    /^(\d+)\s*@?\s*\(?\s*([A-Za-z]{2}(?:-[A-Za-z]{2})?)\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*\)?$/
  );
  if(!m) return null;
  const speed = parseInt(m[1], 10);
  if(!isDayInConditionalRange(m[2], now)) return null;
  const cur = now.getHours() * 60 + now.getMinutes();
  const t0 = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
  const t1 = parseInt(m[5], 10) * 60 + parseInt(m[6], 10);
  if(cur >= t0 && cur < t1) return speed;
  return null;
}

function isDayInConditionalRange(spec, date){
  const dow = date.getDay();
  const parts = spec.split('-');
  if(parts.length === 1){
    const d = DAY_MAP[parts[0]];
    return d != null && d === dow;
  }
  const a = DAY_MAP[parts[0]];
  const b = DAY_MAP[parts[1]];
  if(a == null || b == null) return false;
  if(a <= b) return dow >= a && dow <= b;
  return dow >= a || dow <= b;
}

/**
 * Парсинг maxspeed из ответа OSRM.
 * @param {object} osrmRoute — элемент routes[]
 * @returns {MaxspeedEntry[]}
 */
export function parseMaxspeedsFromRoute(osrmRoute){
  const out = [];
  if(!osrmRoute?.legs?.length) return out;
  for(const leg of osrmRoute.legs){
    const arr = leg.annotation?.maxspeed;
    if(!Array.isArray(arr)) continue;
    for(const item of arr) out.push(normalizeMaxspeedEntry(item));
  }
  return out;
}

/**
 * Парсинг предполагаемой скорости движения (м/с) — для будущих ETA.
 * @param {object} osrmRoute
 * @returns {number[]}
 */
export function parseSegmentSpeedsFromRoute(osrmRoute){
  const out = [];
  if(!osrmRoute?.legs?.length) return out;
  for(const leg of osrmRoute.legs){
    const arr = leg.annotation?.speed;
    if(!Array.isArray(arr)) continue;
    for(const v of arr) out.push(typeof v === 'number' && Number.isFinite(v) ? v : 0);
  }
  return out;
}

function urbanCacheKey(lat, lon){
  return (Math.round(lat * 100) / 100) + ',' + (Math.round(lon * 100) / 100);
}

/**
 * Overpass с зеркалами. На abort/504 не крутим все зеркала по 55 с (field: 165 с/batch).
 * @param {string} query
 * @param {number} [timeoutMs]
 */
export async function overpassFetch(query, timeoutMs = OVERPASS_MIRROR_TIMEOUT_MS){
  const body = 'data=' + encodeURIComponent(query);
  let lastErr = null;
  for(const url of OVERPASS_MIRRORS){
    try{
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body,
        signal: ctrl?.signal
      });
      if(timer) clearTimeout(timer);
      if(!res.ok){
        lastErr = new Error('Overpass ' + res.status + ' @ ' + url);
        // 504/429 — зеркало перегружено; следующий; 5xx иначе тоже
        if(res.status === 504 || res.status === 429 || res.status >= 500) continue;
        continue;
      }
      return await res.json();
    }catch(e){
      lastErr = e;
      const name = e?.name || '';
      const msg = String(e?.message || e);
      // abort / network: не жечь оставшиеся зеркала полным таймаутом подряд
      if(name === 'AbortError' || /aborted|Failed to fetch|NetworkError/i.test(msg)){
        break;
      }
    }
  }
  throw lastErr || new Error('Overpass unreachable');
}

/** Точки вдоль маршрута для коридорных Overpass-запросов (камеры / ways). */
export function sampleRoutePoints(coords, stepM = SAMPLE_STEP_M){
  if(!coords?.length) return [];
  const pts = [{ lat: coords[0][0], lon: coords[0][1] }];
  let acc = 0;
  for(let i = 1; i < coords.length; i++){
    const a = { lat: coords[i - 1][0], lon: coords[i - 1][1] };
    const b = { lat: coords[i][0], lon: coords[i][1] };
    acc += haversine(a, b);
    if(acc >= stepM){
      pts.push(b);
      acc = 0;
    }
  }
  const last = { lat: coords[coords.length - 1][0], lon: coords[coords.length - 1][1] };
  if(haversine(pts[pts.length - 1], last) > 40) pts.push(last);
  return pts;
}

/** @type {Array<{lat:number,lon:number}>|null} */
let _urbanPlaces = null;
/** @type {Promise<Array>|null} */
let _urbanPlacesPromise = null;

async function loadUrbanPlacesNear(lat, lon){
  // грубый bbox вокруг точки → регионы каталога
  const pad = 0.05;
  const coords = [
    [lat - pad, lon - pad],
    [lat + pad, lon + pad]
  ];
  if(_urbanPlaces) return _urbanPlaces;
  if(_urbanPlacesPromise) return _urbanPlacesPromise;
  _urbanPlacesPromise = (async () => {
    try{
      const merged = await loadMergedLayer(coords, 'urban', 'places', 'id');
      _urbanPlaces = merged.items || [];
      return _urbanPlaces;
    }catch(e){
      _urbanPlaces = [];
      return _urbanPlaces;
    }finally{
      _urbanPlacesPromise = null;
    }
  })();
  return _urbanPlacesPromise;
}

export async function checkUrbanZone(lat, lon){
  const key = urbanCacheKey(lat, lon);
  if(_urbanCache.has(key)) return _urbanCache.get(key);

  const r = SPEED_LIMIT_URBAN_PLACE_RADIUS_M;

  // 1) снапшот place nodes — радиус зависит от типа (city ≠ 500 м)
  try{
    const places = await loadUrbanPlacesNear(lat, lon);
    if(places.length){
      const p = { lat, lon };
      let urban = false;
      for(const pl of places){
        const kind = String(pl.place || '').toLowerCase();
        const rad = kind === 'city' ? 18000
          : kind === 'town' ? 6000
          : kind === 'village' ? 2000
          : r; // hamlet / default
        if(haversine(p, pl) <= rad){ urban = true; break; }
      }
      _urbanCache.set(key, urban);
      return urban;
    }
  }catch(_e){ /* fall through */ }

  const q = `[out:json][timeout:18];
(
  node["place"~"^(city|town|village|hamlet)$"](around:${r},${lat},${lon});
  relation["boundary"="administrative"]["admin_level"="8"](around:${r},${lat},${lon});
);
out 1;`;

  let urban = false;
  try{
    const j = await overpassFetch(q, 20000);
    urban = (j.elements?.length ?? 0) > 0;
  }catch(e){
    console.warn('urban check:', e);
  }
  _urbanCache.set(key, urban);
  return urban;
}

/** Точки вдоль polyline с шагом ~SAMPLE_STEP_M (коридор Overpass). — см. export sampleRoutePoints выше */

function parseOverpassWays(elements){
  return (elements || [])
    .filter(e => e.type === 'way' && e.tags?.highway && Array.isArray(e.geometry) && e.geometry.length >= 2)
    .map(e => ({
      id: e.id,
      highway: e.tags.highway,
      maxspeed: e.tags.maxspeed || null,
      maxspeedConditional: e.tags['maxspeed:conditional'] || null,
      geom: e.geometry
    }));
}

/** Коридор around: вместо bbox — иначе Overpass таймаутит на длинных маршрутах (field known_pct=0). */
async function fetchWaysAlongRoute(coords){
  const samples = sampleRoutePoints(coords);
  const byId = new Map();
  for(let i = 0; i < samples.length; i += SAMPLE_BATCH){
    const batch = samples.slice(i, i + SAMPLE_BATCH);
    const parts = batch.map(p =>
      `way["highway"](around:${CORRIDOR_AROUND_M},${p.lat.toFixed(5)},${p.lon.toFixed(5)});`
    ).join('\n');
    const q = `[out:json][timeout:20];\n(\n${parts}\n);\nout tags geom;`;
    const j = await overpassFetch(q, OVERPASS_MIRROR_TIMEOUT_MS);
    for(const w of parseOverpassWays(j.elements)){
      if(!byId.has(w.id)) byId.set(w.id, w);
    }
  }
  return [...byId.values()];
}

function scheduleHighwayRetry(route){
  if(_highwayRetryTimer) clearTimeout(_highwayRetryTimer);
  const delays = [12000, 30000, 90000];
  const delay = delays[Math.min(_highwayRetryStep, delays.length - 1)];
  _highwayRetryStep = Math.min(_highwayRetryStep + 1, delays.length - 1);
  _highwayRetryTimer = setTimeout(() => {
    _highwayRetryTimer = null;
    if(S.route !== route) return;
    const matched = route.highwayTypes?.filter(Boolean).length || 0;
    const need = Math.max(1, (route.coords?.length || 1) - 1);
    if(matched / need >= 0.4){
      _highwayRetryStep = 0;
      return;
    }
    loadRouteHighwayTypes(route).catch(e => console.warn('highway retry:', e));
  }, delay);
}

/**
 * Implicit-лимит по типу дороги (словарь РФ).
 * @param {string} highwayType
 * @param {boolean} isUrban
 * @returns {number|null}
 */
export function resolveImplicitLimit(highwayType, isUrban){
  if(!highwayType) return null;
  const hw = String(highwayType).toLowerCase();

  if(hw === 'motorway') return 110;
  if(hw === 'motorway_link') return 90;
  if(hw === 'trunk' || hw === 'trunk_link') return 90;

  const urbanClass = hw === 'primary' || hw === 'secondary' || hw === 'tertiary' ||
    hw === 'primary_link' || hw === 'secondary_link' || hw === 'tertiary_link';
  if(urbanClass) return isUrban ? 60 : 90;

  if(hw === 'residential' || hw === 'unclassified') return 60;
  if(hw === 'living_street') return 20;
  if(hw === 'service') return 20;
  return null;
}

function routeBbox(coords, buf = 0.015){
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for(const c of coords){
    if(c[0] < minLat) minLat = c[0];
    if(c[0] > maxLat) maxLat = c[0];
    if(c[1] < minLon) minLon = c[1];
    if(c[1] > maxLon) maxLon = c[1];
  }
  return { s: minLat - buf, w: minLon - buf, n: maxLat + buf, e: maxLon + buf };
}

function wayBbox(geom){
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for(const p of geom){
    if(p.lat < minLat) minLat = p.lat;
    if(p.lat > maxLat) maxLat = p.lat;
    if(p.lon < minLon) minLon = p.lon;
    if(p.lon > maxLon) maxLon = p.lon;
  }
  return { minLat, maxLat, minLon, maxLon };
}

function bboxOverlap(a, b, pad = 0.0004){
  return !(a.maxLat + pad < b.minLat - pad || a.minLat - pad > b.maxLat + pad ||
    a.maxLon + pad < b.minLon - pad || a.minLon - pad > b.maxLon + pad);
}

function distPointToWayPolyline(point, geom){
  let best = Infinity;
  for(let i = 0; i < geom.length - 1; i++){
    const d = distToSegment(point,
      { lat: geom[i].lat, lon: geom[i].lon },
      { lat: geom[i + 1].lat, lon: geom[i + 1].lon });
    if(d < best) best = d;
  }
  return best;
}

function matchWayAtPoint(point, ways){
  let best = null;
  let bestD = WAY_MATCH_MAX_M;
  const segBox = {
    minLat: point.lat - 0.00035, maxLat: point.lat + 0.00035,
    minLon: point.lon - 0.0005, maxLon: point.lon + 0.0005
  };
  for(const w of ways){
    if(!bboxOverlap(wayBbox(w.geom), segBox)) continue;
    const d = distPointToWayPolyline(point, w.geom);
    if(d < bestD){ bestD = d; best = w; }
  }
  return best;
}

/**
 * Overpass: highway-теги ways вдоль маршрута + urban-флаги.
 * Коридор around: + зеркала — bbox-запрос на длинных маршрутах почти всегда падает
 * (поле: known_pct=0, кроме одного удачного `06-34`).
 * @param {object} route
 */
function applyHighwayWaysToRoute(route, ways, highwayTypes, wayTags, urbanSegments){
  const n = highwayTypes.length;
  for(let i = 0; i < n; i++){
    const lat = (route.coords[i][0] + route.coords[i + 1][0]) / 2;
    const lon = (route.coords[i][1] + route.coords[i + 1][1]) / 2;
    const way = matchWayAtPoint({ lat, lon }, ways);
    if(way){
      highwayTypes[i] = way.highway;
      wayTags[i] = {
        maxspeed: way.maxspeed,
        maxspeedConditional: way.maxspeedConditional
      };
      const hw = String(way.highway).toLowerCase();
      if(hw === 'residential' || hw === 'living_street' || hw === 'service'){
        urbanSegments[i] = true;
      }
    }
  }
  route.highwayTypes = highwayTypes;
  route.wayTags = wayTags;
  route.urbanSegments = urbanSegments;
  return highwayTypes.filter(Boolean).length;
}

export async function loadRouteHighwayTypes(route){
  if(!route?.coords || route.coords.length < 2) return;
  const token = ++_highwayLoadToken;
  const t0 = Date.now();
  const n = route.coords.length - 1;
  const highwayTypes = new Array(n).fill(null);
  const wayTags = new Array(n).fill(null);
  const urbanSegments = new Array(n).fill(false);

  // 1) Снапшоты регионов (arterial + country motorways) — без Overpass
  try{
    const snap = await loadHighwaysSnapshotForRoute(route.coords);
    if(snap?.ways?.length && routeInHighwaysSnapshot(route.coords, snap)){
      const ways = filterWaysNearRoute(snap.ways, route.coords);
      if(token !== _highwayLoadToken || S.route !== route) return;
      const matched = applyHighwayWaysToRoute(route, ways, highwayTypes, wayTags, urbanSegments);
      telemetry.log('nav', {
        sub: 'highway_types_loaded',
        segments: n,
        matched,
        ways: ways.length,
        ms: Date.now() - t0,
        mode: 'snapshot',
        snap_count: snap.count,
        snap_updated: snap.updated || undefined,
        regions: snap.regions
      });
      if(matched / n >= 0.35){
        _highwayRetryStep = 0;
        refineUrbanSegments(route, highwayTypes, urbanSegments, token).catch(() => {});
        return;
      }
    }
  }catch(e){
    console.warn('highways snapshot path:', e);
  }

  let ways = [];
  try{
    ways = await fetchWaysAlongRoute(route.coords);
  }catch(e){
    console.warn('loadRouteHighwayTypes:', e);
    // если снапшот уже частично заполнил — не затираем
    if(!route.highwayTypes?.some(Boolean)){
      route.highwayTypes = highwayTypes;
      route.wayTags = wayTags;
      route.urbanSegments = urbanSegments;
    }
    telemetry.log('nav', {
      sub: 'highway_types_failed',
      segments: n,
      ms: Date.now() - t0,
      message: String(e?.message || e).slice(0, 120)
    });
    scheduleHighwayRetry(route);
    return;
  }

  if(token !== _highwayLoadToken || S.route !== route) return;

  const matched = applyHighwayWaysToRoute(route, ways, highwayTypes, wayTags, urbanSegments);
  telemetry.log('nav', {
    sub: 'highway_types_loaded',
    segments: n,
    matched,
    ways: ways.length,
    ms: Date.now() - t0,
    mode: 'corridor'
  });

  if(matched / n < 0.4) scheduleHighwayRetry(route);
  else _highwayRetryStep = 0;

  refineUrbanSegments(route, highwayTypes, urbanSegments, token).catch(() => {});
}

async function refineUrbanSegments(route, highwayTypes, urbanSegments, token){
  const n = highwayTypes.length;
  const urbanPending = new Map();
  for(let i = 0; i < n; i++){
    if(urbanSegments[i]) continue;
    const hw = highwayTypes[i];
    if(!hw) continue;
    const needUrban = /^(primary|secondary|tertiary)/i.test(hw);
    if(!needUrban) continue;
    const lat = (route.coords[i][0] + route.coords[i + 1][0]) / 2;
    const lon = (route.coords[i][1] + route.coords[i + 1][1]) / 2;
    const uk = urbanCacheKey(lat, lon);
    if(_urbanCache.has(uk)){
      urbanSegments[i] = _urbanCache.get(uk);
    } else if(!urbanPending.has(uk)){
      urbanPending.set(uk, checkUrbanZone(lat, lon));
    }
  }
  if(!urbanPending.size) return;
  const keys = [...urbanPending.keys()];
  const vals = await Promise.all([...urbanPending.values()]);
  if(token !== _highwayLoadToken || S.route !== route) return;
  const urbanByKey = new Map(keys.map((k, idx) => [k, vals[idx]]));
  for(let i = 0; i < n; i++){
    if(urbanSegments[i] || !highwayTypes[i]) continue;
    if(!/^(primary|secondary|tertiary)/i.test(highwayTypes[i])) continue;
    const lat = (route.coords[i][0] + route.coords[i + 1][0]) / 2;
    const lon = (route.coords[i][1] + route.coords[i + 1][1]) / 2;
    const u = urbanByKey.get(urbanCacheKey(lat, lon));
    if(u != null) urbanSegments[i] = u;
  }
  route.urbanSegments = urbanSegments;
}

function limitFromWayTags(tags, now){
  if(!tags) return null;
  const cond = tags.maxspeedConditional ? parseSimpleConditional(tags.maxspeedConditional, now) : null;
  if(cond != null) return cond;
  return parseMaxspeedTag(tags.maxspeed);
}

function fallbackResult(userDefault, fallbackMode){
  if(fallbackMode === 'hide'){
    return { limit: null, source: 'default' };
  }
  const lim = userDefault > 0 ? userDefault : null;
  return { limit: lim, source: 'default' };
}

/**
 * Текущий лимит по snap на маршруте.
 * @param {{ segIdx?: number, idx?: number }|null} snap
 * @param {object} [opts]
 * @returns {{ limit: number|null, source: SpeedLimitSource }}
 */
export function getCurrentSpeedLimit(snap, opts = {}){
  const dynamic = opts.dynamic ?? S.speedLimitDynamic !== false;
  const userDefault = opts.userDefault ?? S.userDefaultLimit ?? 60;
  const fallbackMode = opts.fallbackMode ?? S.speedLimitFallback ?? 'user-default';
  const route = opts.route ?? S.route;
  const now = opts.now ?? new Date();

  if(!dynamic){
    return fallbackResult(userDefault, 'user-default');
  }

  const seg = resolveSparseSegIdx(snap);
  if(seg == null || !route?.maxspeeds?.length){
    return fallbackResult(userDefault, fallbackMode);
  }

  return lookupSpeedLimitAtSeg(seg, route, userDefault, fallbackMode, now);
}

function resolveSparseSegIdx(snap){
  const raw = snap?.segIdx ?? snap?.idx;
  // Lookahead передаёт только segIdx — не подменять GPS-позицией
  if(snap && snap.lat == null && snap.lon == null && raw != null && S.route?.maxspeeds?.length){
    return Math.max(0, Math.min(raw, S.route.maxspeeds.length - 1));
  }
  const pos = snap?.lat != null && snap?.lon != null
    ? { lat: snap.lat, lon: snap.lon }
    : S.gps;
  if(pos && S.route?.coords?.length > 1){
    let best = 0;
    let bestD = Infinity;
    const c = S.route.coords;
    for(let i = 0; i < c.length - 1; i++){
      const d = distToSegment(pos,
        { lat: c[i][0], lon: c[i][1] },
        { lat: c[i + 1][0], lon: c[i + 1][1] });
      if(d < bestD){ bestD = d; best = i; }
    }
    return best;
  }
  if(raw != null && S.route?.maxspeeds?.length){
    return Math.max(0, Math.min(raw, S.route.maxspeeds.length - 1));
  }
  return null;
}

function nearestRouteSegIdx(){
  return resolveSparseSegIdx(null);
}

function lookupSpeedLimitAtSeg(i, route, userDefault, fallbackMode, now){
  const idx = Math.max(0, Math.min(i, route.maxspeeds.length - 1));
  const entry = route.maxspeeds[idx];

  if(entry?.none) return { limit: null, source: 'none' };

  const kmh = maxspeedEntryToKmh(entry);
  if(kmh != null && kmh > 0) return { limit: kmh, source: 'osm' };

  if(entry?.unknown){
    const fromWay = limitFromWayTags(route.wayTags?.[idx], now);
    if(fromWay != null) return { limit: fromWay, source: 'osm' };

    const hw = route.highwayTypes?.[idx];
    if(hw){
      const urban = route.urbanSegments?.[idx] ?? false;
      const implicit = resolveImplicitLimit(hw, urban);
      if(implicit != null) return { limit: implicit, source: 'implicit' };
    }
    return fallbackResult(userDefault, fallbackMode);
  }

  return fallbackResult(userDefault, fallbackMode);
}

function limitsEqual(a, b){
  if(a == null && b == null) return true;
  if(a == null || b == null) return false;
  return Math.round(a) === Math.round(b);
}

/**
 * Поиск ближайшей смены лимита вперёд по маршруту.
 * @param {{ segIdx?: number, idx?: number }|null} snap
 * @param {number} [lookaheadM]
 * @returns {{ newLimit: number|null, distance: number, direction: 'down'|'up' }|null}
 */
export function findNextLimitChange(snap, lookaheadM = SPEED_LIMIT_LOOKAHEAD_M){
  if(S.speedLimitDynamic === false) return null;
  const route = S.route;
  if(!snap || !route?.maxspeeds?.length || !route.coords?.length) return null;

  const startIdx = resolveSparseSegIdx(snap) ?? 0;
  const cur = getCurrentSpeedLimit(snap);
  const curVal = cur.source === 'none' ? null : cur.limit;
  const coords = route.coords;
  let dist = 0;

  for(let i = startIdx + 1; i < route.maxspeeds.length && dist <= lookaheadM; i++){
    const segDist = haversine(
      { lat: coords[i][0], lon: coords[i][1] },
      { lat: coords[i + 1][0], lon: coords[i + 1][1] }
    );
    dist += segDist;

    const next = getCurrentSpeedLimit({ segIdx: i });
    const nextVal = next.source === 'none' ? null : next.limit;
    if(!limitsEqual(curVal, nextVal)){
      const direction = (nextVal != null && (curVal == null || nextVal < curVal)) ? 'down' : 'up';
      return { newLimit: nextVal, distance: dist, direction };
    }
  }
  return null;
}

/** Активный лимит для сравнения со скоростью */
export function getEffectiveSpeedLimit(){
  if(S.speedLimitDynamic === false) return S.userDefaultLimit;
  if(S.currentLimitSource === 'none') return null;
  if(S.currentLimit != null) return S.currentLimit;
  return S.userDefaultLimit;
}

export function isSpeedLimitGraceActive(){
  return Date.now() < _graceUntil;
}

function setSpeedLimitDigitsClass(numEl, value){
  if(!numEl) return;
  numEl.classList.remove('sls-digits-1', 'sls-digits-2', 'sls-digits-3');
  const n = String(value ?? '').replace(/\D/g, '').length;
  numEl.classList.add(n >= 3 ? 'sls-digits-3' : n === 1 ? 'sls-digits-1' : 'sls-digits-2');
}

export function renderSpeedLimitSign(info, preview){
  const el = $('speed-limit-sign');
  if(!el) return;

  const numEl = $('sls-num');
  const tildeEl = $('sls-tilde');
  const noneEl = $('sls-none');
  const previewEl = $('sls-preview');

  if(S.speedLimitDynamic === false){
    const lim = S.userDefaultLimit;
    if(lim > 0){
      el.classList.remove('hidden', 'sls-hidden');
      el.setAttribute('aria-hidden', 'false');
      numEl?.classList.remove('hidden');
      noneEl?.classList.add('hidden');
      if(numEl){
        numEl.textContent = String(lim);
        setSpeedLimitDigitsClass(numEl, lim);
      }
      el.classList.add('sls-default');
      if(tildeEl) tildeEl.classList.add('hidden');
    } else {
      el.classList.add('hidden', 'sls-hidden');
      el.setAttribute('aria-hidden', 'true');
    }
    return;
  }

  el.classList.remove('sls-osm', 'sls-implicit', 'sls-default', 'sls-none', 'sls-hidden', 'sls-preview-down');

  const fallbackMode = S.speedLimitFallback ?? 'user-default';

  if(info.source === 'none'){
    el.classList.add('sls-none');
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
    numEl?.classList.add('hidden');
    noneEl?.classList.remove('hidden');
    tildeEl?.classList.add('hidden');
  } else if(info.limit == null && fallbackMode === 'hide' && info.source === 'default'){
    el.classList.add('hidden', 'sls-hidden');
    el.setAttribute('aria-hidden', 'true');
  } else if(info.limit == null){
    el.classList.add('hidden', 'sls-hidden');
    el.setAttribute('aria-hidden', 'true');
  } else {
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
    numEl?.classList.remove('hidden');
    noneEl?.classList.add('hidden');
    if(numEl){
      numEl.textContent = String(info.limit);
      setSpeedLimitDigitsClass(numEl, info.limit);
    }
    el.classList.add(
      info.source === 'osm' ? 'sls-osm' :
      info.source === 'implicit' ? 'sls-implicit' : 'sls-default'
    );
    if(tildeEl) tildeEl.classList.toggle('hidden', info.source !== 'implicit');
  }

  if(previewEl){
    if(preview && preview.direction === 'down' && preview.newLimit != null){
      previewEl.textContent = String(preview.newLimit);
      previewEl.classList.remove('hidden');
      el.classList.add('sls-preview-down');
    } else {
      previewEl.classList.add('hidden');
      previewEl.textContent = '';
    }
  }
}

function limitKey(info){
  return info.source + ':' + (info.limit ?? 'null');
}

export function tickSpeedLimit(snap){
  if(!S.route){
    resetSpeedLimitState();
    return;
  }

  let eff = snap;
  if(!eff && S.gps) eff = { lat: S.gps.lat, lon: S.gps.lon, s: null };
  if(!eff && S.userDefaultLimit > 0){
    renderSpeedLimitSign({ limit: S.userDefaultLimit, source: 'default' }, null);
    S.currentLimit = S.userDefaultLimit;
    S.currentLimitSource = 'default';
    return;
  }
  if(!eff) return;

  const info = getCurrentSpeedLimit(eff);
  const key = limitKey(info);

  if(key !== _lastLimitKey){
    const prevParts = _lastLimitKey.split(':');
    const from = prevParts.length > 1 ? prevParts[1] : null;
    if(_lastLimitKey){
      _graceUntil = Date.now() + SPEED_LIMIT_GRACE_MS;
      telemetry.log('nav', {
        sub: 'limit_change',
        from: from === 'null' ? null : Number(from),
        to: info.limit,
        source: info.source,
        s: snap?.s != null ? Math.round(snap.s) : null
      });
    }
    _lastLimitKey = key;
    _lookaheadWarnedKey = '';
  }

  S.currentLimit = info.limit;
  S.currentLimitSource = info.source;
  if(S.speedLimitDynamic !== false) recordCoverage(info.source);

  const preview = S.speedLimitDynamic !== false ? findNextLimitChange(snap) : null;
  renderSpeedLimitSign(info, preview?.direction === 'down' ? preview : null);

  const graceEl = $('speed-limit-grace');
  if(graceEl){
    const hint = getSpeedLimitGraceHint();
    if(hint){
      graceEl.textContent = hint;
      graceEl.classList.remove('hidden');
    } else {
      graceEl.textContent = '';
      graceEl.classList.add('hidden');
    }
  }

  if(S.speedLimitDynamic !== false) tickSpeedLimitVoice(snap, preview);
}

function tickSpeedLimitVoice(snap, preview){
  if(!S.voice || !preview || preview.direction !== 'down') return;
  if(preview.newLimit == null) return;
  if(preview.distance < SPEED_LIMIT_VOICE_MIN_M || preview.distance > SPEED_LIMIT_VOICE_MAX_M) return;

  const bucket = Math.round(preview.distance / 25);
  const warnKey = 'lim_' + (snap?.segIdx ?? 0) + '_' + preview.newLimit + '_' + bucket;
  if(_lookaheadWarnedKey === warnKey) return;
  if(Date.now() - S.lastVoiceTs < 2500) return;

  _lookaheadWarnedKey = warnKey;
  S.lastVoiceTs = Date.now();
  speak('Впереди ограничение ' + preview.newLimit);
}

export function isSpeedOverLimit(kmh){
  const lim = getEffectiveSpeedLimit();
  if(lim == null || lim <= 0) return false;
  if(isSpeedLimitGraceActive()) return false;
  return kmh > lim + SPEED_LIMIT_OVERSPEED_KMH;
}

export function getSpeedLimitGraceHint(){
  if(!isSpeedLimitGraceActive() || S.currentLimit == null) return null;
  return 'Сбросьте скорость до ' + S.currentLimit;
}
