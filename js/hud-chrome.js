/**
 * Видимость «хрома» HUD: кнопки, статусбар, нижняя строка — по тапу (15 с) или из настроек.
 */
import { S } from './state.js';
import { $ } from './util.js';

export const HUD_CHROME_TAP_MS = 15000;

let _revealTimer = null;
let _bound = false;

/** @typedef {'always'|'off'|'tap'} HudChromeMode */

export function normalizeChromeMode(v){
  return v === 'always' || v === 'off' ? v : 'tap';
}

function chromeShown(mode){
  const m = normalizeChromeMode(mode);
  if(m === 'off') return false;
  if(m === 'always') return true;
  return $('hud')?.classList.contains('chrome-reveal');
}

/** Показать кнопки/строки на 15 с (или продлить таймер). */
export function revealHudChrome(){
  const hud = $('hud');
  if(!hud?.classList.contains('on')) return;
  hud.classList.add('chrome-reveal');
  applyHudChrome();
  const nav = $('hud-nav-btns');
  if(nav) nav.scrollTop = 0;
  const btns = $('hud-side-btns');
  if(btns) btns.scrollTop = 0;
  clearTimeout(_revealTimer);
  _revealTimer = setTimeout(() => {
    hud.classList.remove('chrome-reveal');
    applyHudChrome();
  }, HUD_CHROME_TAP_MS);
}

export function onHudTap(){
  revealHudChrome();
}

export function clearHudChromeReveal(){
  clearTimeout(_revealTimer);
  _revealTimer = null;
  $('hud')?.classList.remove('chrome-reveal');
  applyHudChrome();
}

/** Применить классы видимости к #hud. */
export function applyHudChrome(){
  const hud = $('hud');
  if(!hud) return;
  const reveal = hud.classList.contains('chrome-reveal');
  const statusOn = chromeShown(S.hudStatusMode);
  const finishFields = !!(S.showFinishDist || S.showFinishTime || S.showFinishEta);
  const finishOn = finishFields && chromeShown(S.hudFinishMode);

  hud.classList.toggle('chrome-btns-on', reveal);
  hud.classList.toggle('chrome-status-on', statusOn);
  hud.classList.toggle('chrome-finish-on', finishOn);
  if(reveal){
    const nav = $('hud-nav-btns');
    if(nav) nav.scrollTop = 0;
    const btns = $('hud-side-btns');
    if(btns) btns.scrollTop = 0;
  }

  const panel = $('finish-info');
  if(panel){
    panel.classList.toggle('hidden', !finishOn);
    $('fi-dist-line')?.classList.toggle('hidden', !S.showFinishDist);
    $('fi-time-line')?.classList.toggle('hidden', !S.showFinishTime);
    $('fi-eta-line')?.classList.toggle('hidden', !S.showFinishEta);
  }
}

export function initHudChrome(){
  if(_bound) return;
  _bound = true;
  applyHudChrome();
}
