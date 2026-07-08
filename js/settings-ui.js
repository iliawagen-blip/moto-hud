/**
 * UI настроек: открытие с HUD, сворачиваемые секции, dev-mode, телеметрия изменений.
 */
import { $ } from './util.js';
import { logSettingsEvent } from './settings-telemetry.js';
import { initSettingsPresets } from './settings-presets.js';
import {
  downloadSettingsJson, applySettingsBundle, clearAllSettings
} from './settings-export.js';

const SECTIONS_KEY = 'moto-hud-opts-sections';
const DEV_KEY = 'moto-hud-dev-mode';
const MIGRATION_KEY = 'moto-hud-opts-migration-seen';
const DEV_TAP_TARGET = 'help-app-version';
const DEV_TAPS_NEEDED = 7;

/** Открыть панель настроек (с HUD или setup). */
export function openSettingsPanel(){
  const setup = $('setup');
  const drawer = $('drawer-opts');
  if(!setup || !drawer) return;
  setup.style.display = 'block';
  setup.style.zIndex = '40';
  drawer.open = true;
  requestAnimationFrame(() => {
    drawer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const core = drawer.querySelector('[data-section="core"]');
    if(core) core.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  logSettingsEvent('panel_open', { from: $('hud')?.classList.contains('on') ? 'hud' : 'setup' });
}

function readSectionState(){
  try{
    const raw = localStorage.getItem(SECTIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch(e){
    return {};
  }
}

function saveSectionOpen(id, open){
  const o = readSectionState();
  o[id] = !!open;
  try{ localStorage.setItem(SECTIONS_KEY, JSON.stringify(o)); }catch(e){}
}

function applySectionState(){
  const state = readSectionState();
  document.querySelectorAll('.opts-fold[data-section]').forEach(det => {
    const id = det.getAttribute('data-section');
    if(id && state[id] != null) det.open = !!state[id];
  });
}

function syncAriaExpanded(el){
  if(!el) return;
  const open = el.tagName === 'DETAILS' ? el.open : el.classList.contains('open');
  el.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function bindSectionPersistence(){
  document.querySelectorAll('.opts-fold[data-section]').forEach(det => {
    syncAriaExpanded(det);
    det.addEventListener('toggle', () => {
      const id = det.getAttribute('data-section');
      if(!id) return;
      saveSectionOpen(id, det.open);
      syncAriaExpanded(det);
      if(det.open) logSettingsEvent('section_open', { section: id });
    });
  });
  const main = $('drawer-opts');
  if(main){
    syncAriaExpanded(main);
    main.addEventListener('toggle', () => {
      syncAriaExpanded(main);
      if(main.open) logSettingsEvent('drawer_open', {});
    });
  }
}

function updateDevSectionVisible(){
  let on = false;
  try{ on = localStorage.getItem(DEV_KEY) === '1'; }catch(e){}
  if(new URLSearchParams(location.search).get('dev') === '1') on = true;
  document.documentElement.classList.toggle('dev-mode', on);
  const dev = $('opts-dev-section');
  if(dev) dev.classList.toggle('hidden', !on);
}

function bindDevModeEasterEgg(){
  let taps = 0;
  let lastTap = 0;
  const el = $(DEV_TAP_TARGET);
  if(!el) return;
  el.addEventListener('click', () => {
    const now = Date.now();
    if(now - lastTap > 2500) taps = 0;
    lastTap = now;
    taps++;
    if(taps >= DEV_TAPS_NEEDED){
      taps = 0;
      try{ localStorage.setItem(DEV_KEY, '1'); }catch(e){}
      updateDevSectionVisible();
      logSettingsEvent('dev_mode_on', {});
    }
  });
}

function bindOptChangeLogging(){
  const root = $('drawer-opts');
  if(!root) return;
  root.querySelectorAll('input, select').forEach(el => {
    if(!el.id || !el.id.startsWith('opt-')) return;
    const ev = el.type === 'checkbox' || el.type === 'radio' ? 'change' : 'change';
    el.addEventListener(ev, () => {
      const val = el.type === 'checkbox' ? el.checked : el.value;
      logSettingsEvent('opt_change', { optId: el.id, value: val });
    });
  });
}

function bindMigrationBanner(){
  const banner = $('opts-migration-banner');
  if(!banner) return;
  let seen = false;
  try{ seen = localStorage.getItem(MIGRATION_KEY) === '1'; }catch(e){}
  if(!seen) banner.classList.remove('hidden');
  $('opts-migration-dismiss')?.addEventListener('click', () => {
    banner.classList.add('hidden');
    try{ localStorage.setItem(MIGRATION_KEY, '1'); }catch(e){}
  });
  $('opts-migration-show')?.addEventListener('click', () => {
    openSettingsPanel();
    banner.classList.add('hidden');
    try{ localStorage.setItem(MIGRATION_KEY, '1'); }catch(e){}
  });
}

export function initSettingsUi(reloadAllOpts, persistFromDom){
  applySectionState();
  bindSectionPersistence();
  bindDevModeEasterEgg();
  updateDevSectionVisible();
  bindOptChangeLogging();
  bindSettingsDataActions(reloadAllOpts);
  bindMigrationBanner();
  document.querySelectorAll('.setup-details').forEach(det => {
    syncAriaExpanded(det);
    det.addEventListener('toggle', () => syncAriaExpanded(det));
  });
  initSettingsPresets(() => {
    if(typeof persistFromDom === 'function') persistFromDom();
  });
}

function bindSettingsDataActions(reloadAllOpts){
  $('btn-settings-export')?.addEventListener('click', () => {
    downloadSettingsJson();
    logSettingsEvent('settings_export', {});
  });
  $('btn-settings-import')?.addEventListener('click', () => $('settings-import-file')?.click());
  $('settings-import-file')?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if(!file) return;
    try{
      const text = await file.text();
      applySettingsBundle(JSON.parse(text));
      if(typeof reloadAllOpts === 'function') reloadAllOpts();
      logSettingsEvent('settings_import', {});
      alert('Настройки импортированы');
    }catch(err){
      alert('Ошибка импорта: ' + (err.message || err));
    }
  });
  $('btn-settings-reset')?.addEventListener('click', () => {
    if(!confirm('Сбросить все настройки к заводским?')) return;
    clearAllSettings();
    if(typeof reloadAllOpts === 'function') reloadAllOpts();
    logSettingsEvent('settings_reset', {});
    alert('Настройки сброшены. При необходимости перезагрузите страницу.');
  });
}
