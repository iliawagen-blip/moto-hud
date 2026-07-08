/**
 * UI настроек: открытие с HUD, сворачиваемые секции, dev-mode, телеметрия изменений.
 */
import { $ } from './util.js';
import { logSettingsEvent } from './settings-telemetry.js';

const SECTIONS_KEY = 'moto-hud-opts-sections';
const DEV_KEY = 'moto-hud-dev-mode';
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

function bindSectionPersistence(){
  document.querySelectorAll('.opts-fold[data-section]').forEach(det => {
    det.addEventListener('toggle', () => {
      const id = det.getAttribute('data-section');
      if(!id) return;
      saveSectionOpen(id, det.open);
      if(det.open) logSettingsEvent('section_open', { section: id });
    });
  });
  const main = $('drawer-opts');
  main?.addEventListener('toggle', () => {
    if(main.open) logSettingsEvent('drawer_open', {});
  });
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

export function initSettingsUi(){
  applySectionState();
  bindSectionPersistence();
  bindDevModeEasterEgg();
  updateDevSectionVisible();
  bindOptChangeLogging();
}
