/**
 * Автопредложение маршрута из буфера при возврате в приложение (15.7).
 * @module yandex-clipboard
 */
import { S } from './state.js';
import { isYandexMapsUrl } from './yandex-link.js';
import { importYandexFromText, showYandexBanner } from './yandex-import.js';

let _clipDebounce = null;

async function sha256(text){
  if(!crypto?.subtle) return text.slice(0, 64);
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function initYandexClipboard(){
  if(!navigator.clipboard?.readText) return;

  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState !== 'visible') return;
    clearTimeout(_clipDebounce);
    _clipDebounce = setTimeout(async () => {
      try{
        const text = await navigator.clipboard.readText();
        if(!isYandexMapsUrl(text)) return;
        const hash = await sha256(text);
        if(hash === S.lastAppliedClipboardHash) return;
        showYandexBanner('Найдена новая ссылка Яндекс.Карт', async () => {
          S.lastAppliedClipboardHash = hash;
          try{ await importYandexFromText(text); }catch(e){ alert(e.message || e); }
        });
      }catch{ /* нет permission */ }
    }, 400);
  });
}
