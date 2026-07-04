import { S } from './state.js';
import { initGps, startGps } from './gps.js';
import { onTick, startHud } from './hud.js';
import { renderVisualFrame } from './render.js';
import { bindSetupUI, syncOptionsFromDom, applyCoordsOrLink, initNativeHints, doBuildRoute } from './setup.js';
import { initFavorites } from './favorites.js';
import { updateCamStatusUI } from './cam-status.js';
import { loadElevOptsFromStorage } from './elevation.js';

initGps({ onTick, onVisual: renderVisualFrame });
loadElevOptsFromStorage();
syncOptionsFromDom();
updateCamStatusUI();
bindSetupUI();
initFavorites();
initNativeHints();

window.__motoHUD = { S, applyCoordsOrLink, startHud, startGps, doBuildRoute };

window.addEventListener('load', () => { setTimeout(startGps, 400); });

if(window.__SIM__ && typeof window.__SIM__.boot === 'function'){
  window.addEventListener('load', () => setTimeout(() => window.__SIM__.boot(), 700));
}

if('serviceWorker' in navigator && !window.__SIM__ && location.protocol !== 'file:'){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
