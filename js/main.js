import { S } from './state.js';
import { initGps, startGps } from './gps.js';
import { onTick, startHud, initFuelReportUi } from './hud.js';
import { renderVisualFrame } from './render.js';
import { bindSetupUI, syncOptionsFromDom, applyCoordsOrLink, setFinishQuiet, initNativeHints, doBuildRoute, doAddressSearch } from './setup.js';
import { initFavorites } from './favorites.js';
import { updateCamStatusUI } from './cam-status.js';
import { loadElevOptsFromStorage, saveElevOptsToStorage } from './elevation.js';
import { loadCurveOptsFromStorage, saveCurveOptsToStorage } from './curve-speed.js';
import { loadHudOptsFromStorage, saveHudOptsToStorage } from './hud-opts.js';
import { loadAppOptsFromStorage, saveAppOptsToStorage } from './app-opts.js';
import { applyThemeCss } from './theme.js';
import { initThemeManager, applyTheme, loadThemePrefs } from './theme-manager.js';
import { initTtsHealth } from './tts-health.js';
import { initTelemetry } from './telemetry.js';
import { initTelemetryUI } from './telemetry-ui.js';
import { initTelemetryAsk } from './telemetry-ask.js';
import { initConvergeVisibilityLog } from './converge-telemetry.js';
import { registerServiceWorker } from './sw-register.js';
import { initVintageVfd } from './vintage-vfd.js';
import { initLegalConsent } from './legal-consent.js';
import { initOnboarding } from './onboarding.js';
import { initOptControls } from './opt-controls.js';
import { initYandexImportUi } from './yandex-import.js';
import { initYandexClipboard } from './yandex-clipboard.js';
import { initYandexShare } from './yandex-share.js';
import { initViewMode, setViewMode } from './view-mode.js';
import { initBearingMode, toggleBearingMode, isBearingMode, enterBearingMode, exitBearingMode, onNavPathButton, onNavMapButton } from './bearing-mode.js';
import { getMapDisplayPos } from './nav-map.js';
import { initYandexExportUi } from './yandex-export.js';
import { initTrackRecorderUi } from './track-recorder.js';
import { initTripPlannerUi } from './trip-ui.js';
import { initTripRefuelHud } from './trip-refuel-hud.js';
import { initHudChrome } from './hud-chrome.js';
import { initSettingsUi } from './settings-ui.js';
import { initHudSettingsSheet } from './hud-settings-sheet.js';
import { prepareRegressionHud, sampleRegressionState } from './regression-sim-bridge.js';
import { simNavAction, simApplyTheme, simBuildRoute, simGetStatus, simKickGps, simEnsureDemoFinish } from './sim-bridge.js';
import { findNearestOnRoute } from './route.js';

applyThemeCss();
initYandexImportUi();
initYandexClipboard();
initYandexShare();
initViewMode();
initBearingMode();
initYandexExportUi();
initTrackRecorderUi();
initTripPlannerUi();
initHudChrome();

function persistSettingsFromDom(){
  syncOptionsFromDom();
  saveAppOptsToStorage();
  saveHudOptsToStorage();
  saveElevOptsToStorage();
  saveCurveOptsToStorage();
  updateCamStatusUI();
}

function reloadAllSettingsFromStorage(){
  const prefs = loadThemePrefs();
  applyTheme(prefs.theme, prefs.modePref, false);
  loadElevOptsFromStorage();
  loadCurveOptsFromStorage();
  loadHudOptsFromStorage();
  loadAppOptsFromStorage();
  syncOptionsFromDom();
  updateCamStatusUI();
}

initLegalConsent({
  onAccepted: () => initOnboarding(persistSettingsFromDom)
});

initSettingsUi(reloadAllSettingsFromStorage, persistSettingsFromDom);
initHudSettingsSheet(syncOptionsFromDom);
initOptControls();
initFuelReportUi();
initTripRefuelHud();
initThemeManager();
initVintageVfd();
initTelemetry().then(() => {
  initTelemetryUI();
  initTelemetryAsk();
  initConvergeVisibilityLog();
});
initGps({ onTick, onVisual: renderVisualFrame });
loadElevOptsFromStorage();
loadCurveOptsFromStorage();
loadHudOptsFromStorage();
loadAppOptsFromStorage();
syncOptionsFromDom();
updateCamStatusUI();
bindSetupUI();
initFavorites();
initNativeHints();
initTtsHealth();

window.__motoHUD = {
  S, applyCoordsOrLink, setFinishQuiet, startHud, startGps, doBuildRoute, doAddressSearch, onTick,
  findNearestOnRoute, prepareRegressionHud, sampleRegressionState,
  toggleBearingMode, isBearingMode, enterBearingMode, exitBearingMode, onNavPathButton, onNavMapButton, setViewMode, getMapDisplayPos,
  simNavAction, simApplyTheme, simBuildRoute, simGetStatus, simKickGps, simEnsureDemoFinish,
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
