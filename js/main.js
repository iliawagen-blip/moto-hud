import { S } from './state.js';
import { initGps, startGps } from './gps.js';
import { onTick, startHud } from './hud.js';
import { renderVisualFrame } from './render.js';
import { bindSetupUI, syncOptionsFromDom, applyCoordsOrLink, setFinishQuiet, initNativeHints, doBuildRoute, doAddressSearch } from './setup.js';
import { initFavorites } from './favorites.js';
import { updateCamStatusUI } from './cam-status.js';
import { loadElevOptsFromStorage } from './elevation.js';
import { loadCurveOptsFromStorage } from './curve-speed.js';
import { loadHudOptsFromStorage } from './hud-opts.js';
import { applyThemeCss } from './theme.js';
import { initThemeManager, applyTheme } from './theme-manager.js';
import { initTtsHealth } from './tts-health.js';
import { initTelemetry } from './telemetry.js';
import { initTelemetryUI } from './telemetry-ui.js';
import { registerServiceWorker } from './sw-register.js';

applyThemeCss();
initThemeManager();
initTelemetry().then(() => initTelemetryUI());
initGps({ onTick, onVisual: renderVisualFrame });
loadElevOptsFromStorage();
loadCurveOptsFromStorage();
loadHudOptsFromStorage();
syncOptionsFromDom();
updateCamStatusUI();
bindSetupUI();
initFavorites();
initNativeHints();
initTtsHealth();

window.__motoHUD = {
  S, applyCoordsOrLink, setFinishQuiet, startHud, startGps, doBuildRoute, doAddressSearch,
  _searchBusy: false, _finishFocused: false
};

window.applyTheme = applyTheme;

window.addEventListener('load', () => {
  setTimeout(startGps, 400);
  registerServiceWorker();
  if(window.__SIM__?.boot && !window.__SIM__._bootScheduled){
    window.__SIM__._bootScheduled = true;
    setTimeout(() => window.__SIM__.boot(), 500);
  }
});
