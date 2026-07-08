/**
 * Перенос планов между устройствами: JSON-файл, ссылка с упакованным планом, deep link.
 */
import { validateTrip, TRIP_MODEL_REV } from './trip-model.js';

export const TRIP_PACK_PARAM = 'trip_pack';
export const TRIP_LOCAL_PARAM = 'trip';
export const TRIP_PLANNER_PARAM = 'planner';
/** Практический предел длины URL для мессенджеров */
export const MAX_SHARE_URL_LEN = 7500;

function base64UrlEncode(bytes){
  let bin = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for(let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str){
  const pad = str.length % 4 ? '='.repeat(4 - (str.length % 4)) : '';
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function gzipBytes(text){
  if(typeof CompressionStream === 'undefined'){
    return null;
  }
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzipBytes(bytes){
  if(typeof DecompressionStream === 'undefined'){
    throw new Error('Браузер не поддерживает распаковку (нужен Chrome 80+ / Safari 16.4+)');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

/** Нормализация JSON плана (файл или объект). */
export function parseTripJson(raw){
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if(!data || typeof data !== 'object') throw new Error('Некорректный JSON');
  if(Array.isArray(data.days)){
    data.version = data.version || TRIP_MODEL_REV;
    return validateTrip(data);
  }
  if(data.trip && Array.isArray(data.trip.days)){
    data.trip.version = data.trip.version || TRIP_MODEL_REV;
    return validateTrip(data.trip);
  }
  throw new Error('В файле нет плана поездки (ожидается trip с days[])');
}

export function tripJsonString(trip, pretty){
  const payload = {
    kind: 'moto-hud-trip',
    version: TRIP_MODEL_REV,
    exportedAt: new Date().toISOString(),
    trip: validateTrip({ ...trip })
  };
  return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
}

export function tripDownloadFilename(trip){
  const slug = String(trip.title || 'plan')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'plan';
  return `moto-hud-${slug}.json`;
}

export function downloadTripJson(trip){
  const blob = new Blob([tripJsonString(trip, true)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = tripDownloadFilename(trip);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Упаковать план в параметр URL (gzip + base64url). */
export async function encodeTripPack(trip){
  const json = tripJsonString(trip, false);
  const gz = await gzipBytes(json);
  if(!gz) return { pack: null, reason: 'no-compression' };
  return { pack: base64UrlEncode(gz), bytes: gz.length, jsonLen: json.length };
}

export async function decodeTripPack(pack){
  if(!pack?.trim()) throw new Error('Пустая ссылка');
  const bytes = base64UrlDecode(pack.trim());
  const json = await gunzipBytes(bytes);
  return parseTripJson(json);
}

export function buildTripUrls(trip, origin){
  const base = origin || (typeof location !== 'undefined' ? location.origin + location.pathname : '');
  const local = new URL(base, base);
  local.searchParams.set(TRIP_LOCAL_PARAM, trip.id);
  local.searchParams.set(TRIP_PLANNER_PARAM, '1');
  local.hash = '';
  return { localUrl: local.href };
}

export async function buildPortableShareUrl(trip, origin){
  const base = origin || (typeof location !== 'undefined' ? location.origin + location.pathname : '');
  const { pack, reason } = await encodeTripPack(trip);
  if(!pack){
    return { url: null, tooLong: true, reason };
  }
  const url = new URL(base, base);
  url.searchParams.set(TRIP_PACK_PARAM, pack);
  url.searchParams.set(TRIP_PLANNER_PARAM, '1');
  url.hash = '';
  const href = url.href;
  return {
    url: href,
    tooLong: href.length > MAX_SHARE_URL_LEN,
    length: href.length
  };
}

export async function copyText(text){
  if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(text);
    return true;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try{ ok = document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
  if(!ok) throw new Error('Не удалось скопировать — скопируйте вручную');
  return ok;
}

export async function shareTripFile(trip){
  const json = tripJsonString(trip, true);
  const file = new File([json], tripDownloadFilename(trip), { type: 'application/json' });
  if(navigator.share){
    const payload = { title: trip.title, text: 'План поездки Moto HUD', files: [file] };
    if(!navigator.canShare || navigator.canShare(payload)){
      await navigator.share(payload);
      return 'share';
    }
    await navigator.share({ title: trip.title, text: json.slice(0, 500) + '…\n\nОткройте moto-hud и импортируйте JSON.' });
    return 'share-text';
  }
  downloadTripJson(trip);
  return 'download';
}

/** Параметры deep link при загрузке страницы. */
export function readTripDeepLink(){
  if(typeof location === 'undefined') return {};
  const params = new URLSearchParams(location.search);
  return {
    localId: params.get(TRIP_LOCAL_PARAM),
    pack: params.get(TRIP_PACK_PARAM),
    openPlanner: params.get(TRIP_PLANNER_PARAM) === '1'
  };
}

/** Обновить URL без перезагрузки (закладка на этом устройстве). */
export function replaceTripLocalUrl(tripId, openPlanner){
  if(typeof history === 'undefined' || typeof location === 'undefined') return;
  const url = new URL(location.href);
  url.searchParams.delete(TRIP_PACK_PARAM);
  if(tripId) url.searchParams.set(TRIP_LOCAL_PARAM, tripId);
  else url.searchParams.delete(TRIP_LOCAL_PARAM);
  if(openPlanner) url.searchParams.set(TRIP_PLANNER_PARAM, '1');
  url.hash = '';
  history.replaceState(null, '', url.pathname + url.search);
}
