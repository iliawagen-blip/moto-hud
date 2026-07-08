/**
 * Bottom sheet быстрых настроек на HUD (только на остановке).
 */
import { S } from './state.js';
import { $ } from './util.js';
import { openSettingsPanel } from './settings-ui.js';
import { applyPresetToDom, getPresetLabel } from './settings-presets.js';
import { saveAppOptsToStorage } from './app-opts.js';
import { saveHudOptsToStorage } from './hud-opts.js';
import { saveElevOptsToStorage } from './elevation.js';
import { saveCurveOptsToStorage } from './curve-speed.js';
import { applyHudChrome } from './hud-chrome.js';
import { logSettingsEvent } from './settings-telemetry.js';
import {
  THEME_IDS, themeLabel, loadThemePrefs, applyTheme
} from './theme-manager.js';

const STATIONARY_KMH = 15;
let _toastTimer = null;

function isStationary(){
  return (S.dispSpeed || 0) <= STATIONARY_KMH;
}

function showHudToast(msg){
  let el = $('hud-settings-toast');
  if(!el){
    el = document.createElement('div');
    el.id = 'hud-settings-toast';
    el.className = 'hud-settings-toast';
    $('hud')?.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('on'), 2800);
}

function closeSheet(){
  $('hud-settings-sheet')?.classList.remove('on');
}

function syncSheetFromDom(){
  const voice = $('hud-opt-voice');
  const cams = $('hud-opt-cams');
  if(voice) voice.checked = !!$('opt-voice')?.checked;
  if(cams) cams.checked = !!$('opt-cams')?.checked;
  const cur = loadThemePrefs();
  document.querySelectorAll('.hud-theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === cur.theme);
  });
}

function persistFromDom(syncOptionsFromDom){
  if(typeof syncOptionsFromDom === 'function') syncOptionsFromDom();
  saveAppOptsToStorage();
  saveHudOptsToStorage();
  saveElevOptsToStorage();
  saveCurveOptsToStorage();
  applyHudChrome();
}

function openSheet(){
  const sheet = $('hud-settings-sheet');
  if(!sheet) return;
  syncSheetFromDom();
  sheet.classList.add('on');
  logSettingsEvent('hud_sheet_open', {});
}

/** Вызов с кнопки НАСТР. на HUD. */
export function handleHudGearClick(syncOptionsFromDom){
  if(!isStationary()){
    showHudToast('Настройки — на остановке');
    logSettingsEvent('hud_sheet_blocked', { speed: Math.round(S.dispSpeed || 0) });
    return;
  }
  openSheet();
  $('hud-settings-sheet')._sync = syncOptionsFromDom;
}

function bindHudThemeRow(){
  const row = $('hud-theme-row');
  if(!row || row.dataset.bound) return;
  row.dataset.bound = '1';
  const cur = loadThemePrefs();
  row.innerHTML = THEME_IDS.map(id =>
    '<button type="button" class="secondary hud-theme-btn' +
    (id === cur.theme ? ' active' : '') +
    '" data-theme="' + id + '">' + themeLabel(id) + '</button>'
  ).join('');
  row.querySelectorAll('.hud-theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme');
      if(!THEME_IDS.includes(theme)) return;
      applyTheme(theme, loadThemePrefs().modePref);
      row.querySelectorAll('.hud-theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      logSettingsEvent('hud_sheet_change', { optId: 'opt-theme', value: theme });
    });
  });
}

export function initHudSettingsSheet(syncOptionsFromDom){
  const sheet = $('hud-settings-sheet');
  if(!sheet || sheet.dataset.bound) return;
  sheet.dataset.bound = '1';

  bindHudThemeRow();

  $('hud-settings-backdrop')?.addEventListener('click', closeSheet);
  $('hud-settings-close')?.addEventListener('click', closeSheet);

  $('hud-opt-voice')?.addEventListener('change', e => {
    const main = $('opt-voice');
    if(main) main.checked = e.target.checked;
    S.voice = e.target.checked;
    saveAppOptsToStorage();
    logSettingsEvent('hud_sheet_change', { optId: 'opt-voice', value: S.voice });
  });

  $('hud-opt-cams')?.addEventListener('change', e => {
    const main = $('opt-cams');
    if(main) main.checked = e.target.checked;
    S.cams = e.target.checked;
    saveAppOptsToStorage();
    logSettingsEvent('hud_sheet_change', { optId: 'opt-cams', value: S.cams });
  });

  sheet.querySelectorAll('.hud-preset-btn[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-preset');
      if(!confirm('Пресет «' + getPresetLabel(id) + '»?')) return;
      applyPresetToDom(id);
      persistFromDom(syncOptionsFromDom);
      syncSheetFromDom();
      logSettingsEvent('hud_sheet_preset', { preset: id });
    });
  });

  $('hud-settings-full')?.addEventListener('click', () => {
    closeSheet();
    openSettingsPanel();
  });
}
