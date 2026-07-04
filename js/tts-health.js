/**
 * Проверка готовности TTS (Фаза 3): офлайн-голоса на Android, fallback в браузере.
 */
import { S } from './state.js';
import { $ } from './util.js';
import { isNative } from './platform.js';

const TTS_LANG = 'ru-RU';

/** @typedef {{ ok: boolean, offlineVoice?: boolean, voices?: number, platform: string, hint?: string }} TtsHealth */

/** Аудит доступности русского TTS и офлайн-голосов */
export async function auditTtsHealth(){
  if(!S.voice){
    return { ok: true, offlineVoice: true, platform: 'off', hint: '' };
  }

  if(isNative()){
    try{
      const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
      const { supported } = await TextToSpeech.isLanguageSupported({ lang: TTS_LANG });
      let offlineVoice = supported;
      let voices = 0;
      try{
        const res = await TextToSpeech.getSupportedVoices();
        const list = res.voices || [];
        voices = list.length;
        const ru = list.filter(v => (v.lang || '').toLowerCase().startsWith('ru'));
        if(ru.length){
          offlineVoice = ru.some(v => v.network === false || v.networkConnectionRequired === false);
        }
      }catch(e){ /* getSupportedVoices — опционально на старых сборках */ }

      return {
        ok: !!supported,
        offlineVoice,
        voices,
        platform: 'native',
        hint: !supported
          ? 'Русский голос не установлен — навигация будет без озвучки.'
          : !offlineVoice
            ? 'Нет офлайн-голоса — в режиме «в самолёте» подсказки могут не звучать.'
            : ''
      };
    }catch(e){
      return { ok: false, offlineVoice: false, platform: 'native', hint: String(e.message || e) };
    }
  }

  if(!('speechSynthesis' in window)){
    return { ok: false, offlineVoice: false, platform: 'web', hint: 'Браузер не поддерживает озвучку.' };
  }

  const voices = speechSynthesis.getVoices();
  const ru = voices.filter(v => (v.lang || '').toLowerCase().startsWith('ru'));
  const localRu = ru.filter(v => v.localService);
  return {
    ok: ru.length > 0,
    offlineVoice: localRu.length > 0,
    voices: ru.length,
    platform: 'web',
    hint: !ru.length
      ? 'Русский голос не найден — проверьте настройки озвучки системы/браузера.'
      : !localRu.length
        ? 'Только облачные голоса — без сети озвучка может не работать.'
        : ''
  };
}

/** Открыть экран установки голосов (Android) */
export async function openTtsInstall(){
  if(!isNative()) return false;
  try{
    const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
    await TextToSpeech.openInstall();
    return true;
  }catch(e){
    console.warn('TTS install:', e);
    return false;
  }
}

function renderBanner(health){
  const el = $('tts-banner');
  if(!el) return;
  if(!S.voice || (health.ok && health.offlineVoice !== false)){
    el.classList.add('hidden');
    el.innerHTML = '';
    return;
  }

  el.classList.remove('hidden');
  let html = '<b>🔊 Голос:</b> ';
  if(!health.ok){
    html += health.hint || 'русский TTS недоступен.';
  } else {
    html += health.hint || 'офлайн-голос не найден — скачайте языковой пакет.';
  }
  if(isNative()){
    html += ' <button type="button" class="linkish" id="btn-tts-install">Установить голоса</button>';
  }
  el.innerHTML = html;
  $('btn-tts-install')?.addEventListener('click', () => {
    openTtsInstall().then(() => setTimeout(refreshTtsBanner, 2000));
  });
}

/** Показать/скрыть баннер в setup по результату аудита */
export function applyTtsBanner(health){
  renderBanner(health);
}

export async function refreshTtsBanner(){
  const health = await auditTtsHealth();
  applyTtsBanner(health);
  return health;
}

/** Запуск при старте + после смены опции «Голос» */
export function initTtsHealth(){
  if('speechSynthesis' in window){
    speechSynthesis.addEventListener('voiceschanged', () => { refreshTtsBanner(); }, { once: false });
  }
  refreshTtsBanner();
}
