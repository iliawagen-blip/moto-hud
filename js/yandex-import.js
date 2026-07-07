/**
 * Импорт маршрута из Яндекс.Карт: диалог, история, применение.
 * @module yandex-import
 */
import { S } from './state.js';
import { $ } from './util.js';
import { haversine } from './geo.js';
import {
  fetchRouteThroughWaypoints, buildDirectRouteFromWaypoints, attachRouteFromImport
} from './route.js';
import { extractYandexUrl } from './yandex-link.js';
import telemetry from './telemetry.js';

const DB_NAME = 'moto-hud-yandex';
const DB_VER = 1;

let _pendingWaypoints = null;
let _pendingUrl = '';

function openDb(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains('imports')){
        db.createObjectStore('imports', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** @param {Array} waypoints @param {'direct'|'routed'} mode */
async function saveYandexImportHistory(waypoints, mode){
  try{
    const db = await openDb();
    const name = (waypoints[0]?.label || 'Маршрут').split(/\s+/)[0].slice(0, 24);
    await new Promise((resolve, reject) => {
      const tx = db.transaction('imports', 'readwrite');
      tx.objectStore('imports').put({
        id: crypto.randomUUID(),
        name,
        ts: Date.now(),
        mode,
        waypointCount: waypoints.length
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }catch(e){ console.warn('yandex history:', e); }
}

/** @param {Array} waypoints @param {object} [gps] */
export function waypointsToOsrmPoints(waypoints, gps){
  const pts = waypoints.map(w => ({ lat: w.lat, lon: w.lon }));
  if(gps && pts.length){
    if(haversine(gps, pts[0]) > 500) pts.unshift({ lat: gps.lat, lon: gps.lon });
    else pts[0] = { lat: gps.lat, lon: gps.lon };
  }
  return pts;
}

function hideImportModal(){
  $('yandexImportModal')?.classList.remove('on');
  _pendingWaypoints = null;
  _pendingUrl = '';
}

function hideBanner(){
  const banner = $('yandex-banner');
  banner?.classList.remove('on');
  banner?.classList.add('hidden');
}

async function finishImport(mode){
  const wps = _pendingWaypoints;
  const urlForInput = _pendingUrl;
  if(!wps?.length) return;
  hideImportModal();
  hideBanner();

  const status = $('s-finish');
  const btn = $('btn-build-route');
  if(btn){ btn.disabled = true; btn.textContent = '⏳ Импорт…'; }
  if(status){
    status.textContent = mode === 'direct' ? '⏳ Быстрый старт…' : '⏳ Пересчёт OSRM…';
    status.className = 'status';
  }

  try{
    if(mode === 'direct'){
      attachRouteFromImport(buildDirectRouteFromWaypoints(wps), wps);
    }else{
      const pts = waypointsToOsrmPoints(wps, S.gps);
      const route = await fetchRouteThroughWaypoints(pts);
      attachRouteFromImport(route, pts);
    }
    const { refreshRouteUi } = await import('./setup.js');
    refreshRouteUi();
    await saveYandexImportHistory(wps, mode);
    telemetry.log('nav', { sub: 'yandex_import', mode, n: wps.length });
    if(status){
      status.textContent = '✅ Маршрут из Яндекс.Карт — нажмите «ПОЕХАЛИ»';
      status.className = 'status ok';
    }
    $('finish-input').value = urlForInput || `${wps.length} точек Яндекс`;
  }catch(e){
    if(status){
      status.textContent = '❌ ' + (e.message || e);
      status.className = 'status err';
    }
  }finally{
    if(btn){ btn.disabled = !(S.gps && S.finish); btn.textContent = '🗺 Построить маршрут'; }
  }
}

/**
 * @param {Array} waypoints
 * @param {string} [sourceUrl]
 */
export function offerYandexImport(waypoints, sourceUrl = ''){
  _pendingWaypoints = waypoints;
  _pendingUrl = sourceUrl || '';
  const modal = $('yandexImportModal');
  const info = $('yandex-import-info');
  if(info){
    info.textContent = `Точек: ${waypoints.length}. Для точного повторения геометрии Яндекса добавляйте промежуточные точки каждые 3–5 км — иначе OSRM может выбрать другие дороги.`;
  }
  modal?.classList.add('on');
}

/** @param {string} rawText */
export async function importYandexFromText(rawText){
  const { parseYandexRouteLink } = await import('./yandex-link.js');
  const url = extractYandexUrl(rawText) || rawText.trim();
  const wps = await parseYandexRouteLink(url);
  offerYandexImport(wps, url);
  return wps;
}

export function showYandexBanner(message, onApply){
  const banner = $('yandex-banner');
  const msg = $('yandex-banner-msg');
  if(!banner) return;
  if(msg) msg.textContent = message || 'Найдена ссылка Яндекс.Карт';
  banner.classList.remove('hidden');
  banner.classList.add('on');
  const applyBtn = $('yandex-banner-apply');
  const dismissBtn = $('yandex-banner-dismiss');
  const onOk = () => { hideBanner(); onApply?.(); };
  const onNo = () => hideBanner();
  applyBtn?.replaceWith(applyBtn.cloneNode(true));
  dismissBtn?.replaceWith(dismissBtn.cloneNode(true));
  $('yandex-banner-apply')?.addEventListener('click', onOk, { once: true });
  $('yandex-banner-dismiss')?.addEventListener('click', onNo, { once: true });
}

export function initYandexImportUi(){
  $('yandex-import-direct')?.addEventListener('click', () => { void finishImport('direct'); });
  $('yandex-import-routed')?.addEventListener('click', () => { void finishImport('routed'); });
  $('yandex-import-cancel')?.addEventListener('click', hideImportModal);
}
