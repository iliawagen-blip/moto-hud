/**
 * Web Share Target и Capacitor ACTION_SEND (15.6).
 * @module yandex-share
 */
import { extractYandexUrl, isYandexMapsUrl } from './yandex-link.js';
import { importYandexFromText, showYandexBanner } from './yandex-import.js';

function sharedTextFromLocation(){
  const q = new URLSearchParams(location.search);
  return q.get('shared_url') || q.get('shared_text') || q.get('text') || q.get('url') || '';
}

async function handleSharedText(raw){
  const text = String(raw || '').trim();
  if(!text) return;
  const url = extractYandexUrl(text);
  if(!url && !isYandexMapsUrl(text)) return;
  showYandexBanner('Использовать маршрут из Яндекс.Карт?', async () => {
    try{ await importYandexFromText(url || text); }catch(e){ alert(e.message || e); }
  });
}

export function initYandexShare(){
  const fromUrl = sharedTextFromLocation();
  if(fromUrl) void handleSharedText(fromUrl);

  window.addEventListener('motohud-share', () => {
    const t = window.__sharedYandexText || window.__sharedYandexUrl || '';
    if(t) void handleSharedText(t);
  });

  if(window.__sharedYandexText || window.__sharedYandexUrl){
    void handleSharedText(window.__sharedYandexText || window.__sharedYandexUrl);
  }
}
