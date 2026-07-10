/** DOM и форматирование */
export const $ = id => document.getElementById(id);

export function fmtClock(d){
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
export function fmtTime(sec){
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

/** Оставшееся время до финиша для HUD */
export function fmtRemainDur(sec){
  if(!isFinite(sec) || sec < 0) return '—';
  sec = Math.round(sec);
  if(sec < 60) return sec + ' сек';
  const m = Math.round(sec / 60);
  if(m < 60) return m + ' мин';
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? h + ' ч ' + rm + ' мин' : h + ' ч';
}
export function pad3(n){ return String(n).padStart(3, '0'); }

export function escapeHtml(s){
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/** Подпись улицы на HUD: без «улица»/«ул.», верхний регистр через CSS. */
export function formatStreetLabel(name){
  if(name == null || name === '') return '—';
  let s = String(name).trim();
  s = s.replace(/\bул\.?\b/giu, ' ').replace(/\bулица\b/giu, ' ');
  s = s.replace(/\s{2,}/g, ' ').replace(/^[\s,.·-]+|[\s,.·-]+$/g, '').trim();
  return s || String(name).trim();
}

/** ID без secure context (file:// не поддерживает crypto.randomUUID). */
export function newId(){
  try{
    if(typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'){
      return crypto.randomUUID();
    }
  }catch(e){}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Запрос полноэкранного режима (только вход; без user gesture браузер может отклонить). */
export function requestAppFullscreen(){
  try{
    if(document.fullscreenElement || document.webkitFullscreenElement) return;
    if(window !== window.top) return;
    if(new URLSearchParams(location.search).get('sim') === '1') return;
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || function(){}).call(el);
  }catch(e){}
}
