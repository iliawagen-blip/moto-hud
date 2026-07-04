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
