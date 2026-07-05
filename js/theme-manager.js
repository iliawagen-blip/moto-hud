/**
 * Управление темами: класс на html, data-mode, localStorage, авто день/ночь.
 */
import { S } from './state.js';
import { applyThemeCss, invalidateThemeTokens } from './theme.js';
import { resolveDisplayMode, resetModeHysteresis } from './sun-mode.js';
import { renderVisualFrame } from './render.js';
import { syncVintageVfdDomClasses } from './vintage-vfd.js';

export const THEME_STORAGE_KEY = 'moto-hud-theme';
export const THEME_IDS = ['avionics', 'hitech', 'space', 'sport', 'chopper', 'vintage'];
export const MODE_PREFS = ['day', 'night', 'auto'];

const LABELS = {
  avionics: 'Авионика',
  hitech: 'Хайтек',
  space: 'Космос',
  sport: 'Спорт',
  chopper: 'Чоппер',
  vintage: 'Винтаж'
};

/** @typedef {{ theme: string, modePref: string }} ThemePrefs */

export function loadThemePrefs(){
  try{
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if(!raw) return { theme: 'avionics', modePref: 'night' };
    const o = JSON.parse(raw);
    return {
      theme: THEME_IDS.includes(o.theme) ? o.theme : 'avionics',
      modePref: MODE_PREFS.includes(o.modePref) ? o.modePref : 'night'
    };
  }catch(e){
    return { theme: 'avionics', modePref: 'night' };
  }
}

export function saveThemePrefs(prefs){
  try{
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(prefs));
  }catch(e){}
}

/** Применить тему без сохранения (boot) */
export function applyThemeBoot(theme, modePref){
  const html = document.documentElement;
  THEME_IDS.forEach(id => html.classList.remove('theme-' + id));
  html.classList.add('theme-' + (THEME_IDS.includes(theme) ? theme : 'avionics'));
  const pos = S.gps ? { lat: S.gps.lat, lon: S.gps.lon } : null;
  const mode = resolveDisplayMode(modePref, pos);
  html.setAttribute('data-mode', mode);
}

/** Полное применение + сохранение */
export function applyTheme(theme, modePref, save = true){
  const html = document.documentElement;
  THEME_IDS.forEach(id => html.classList.remove('theme-' + id));
  const tid = THEME_IDS.includes(theme) ? theme : 'avionics';
  html.classList.add('theme-' + tid);
  const pos = S.gps ? { lat: S.gps.lat, lon: S.gps.lon } : null;
  const mode = resolveDisplayMode(modePref, pos);
  html.setAttribute('data-mode', mode);
  if(save) saveThemePrefs({ theme: tid, modePref });
  applyThemeCss();
  syncThemeControls(tid, modePref);
  updateModeButtonLabel(modePref, mode);
  if($('hud')?.classList.contains('on')) renderVisualFrame();
  syncVintageVfdDomClasses();
}

function $(id){ return document.getElementById(id); }

export function syncThemeControls(theme, modePref){
  const sel = $('opt-theme');
  if(sel) sel.value = theme;
  const mDay = $('opt-mode-day');
  const mNight = $('opt-mode-night');
  const mAuto = $('opt-mode-auto');
  if(mDay) mDay.checked = modePref === 'day';
  if(mNight) mNight.checked = modePref === 'night';
  if(mAuto) mAuto.checked = modePref === 'auto';
}

export function updateModeButtonLabel(modePref, resolved){
  const btn = $('btn-mode');
  if(!btn) return;
  const lbl = btn.querySelector('.cb-lbl');
  if(!lbl) return;
  if(modePref === 'auto'){
    lbl.textContent = resolved === 'day' ? 'АВТО☀' : 'АВТО🌙';
  } else if(modePref === 'day'){
    lbl.textContent = 'ДЕНЬ';
  } else {
    lbl.textContent = 'НОЧЬ';
  }
}

/** Цикл day → night → auto */
export function cycleModePref(){
  const cur = loadThemePrefs();
  const i = MODE_PREFS.indexOf(cur.modePref);
  const next = MODE_PREFS[(i + 1) % MODE_PREFS.length];
  if(next !== 'auto') resetModeHysteresis();
  applyTheme(cur.theme, next);
}

/** Пересчёт auto-режима по GPS (вызывать из onTick, не каждый кадр) */
let _lastAutoCheck = 0;
export function tickAutoMode(){
  const cur = loadThemePrefs();
  if(cur.modePref !== 'auto') return;
  const now = Date.now();
  if(now - _lastAutoCheck < 30000) return;
  _lastAutoCheck = now;
  const pos = S.gps ? { lat: S.gps.lat, lon: S.gps.lon } : null;
  const mode = resolveDisplayMode('auto', pos);
  const html = document.documentElement;
  if(html.getAttribute('data-mode') !== mode){
    html.setAttribute('data-mode', mode);
    invalidateThemeTokens();
    applyThemeCss();
    updateModeButtonLabel('auto', mode);
    if($('hud')?.classList.contains('on')) renderVisualFrame();
  } else {
    updateModeButtonLabel('auto', mode);
  }
}

export function themeLabel(id){ return LABELS[id] || id; }

export function initThemeManager(){
  const cur = loadThemePrefs();
  applyTheme(cur.theme, cur.modePref, false);
  $('opt-theme')?.addEventListener('change', e => {
    applyTheme(e.target.value, loadThemePrefs().modePref);
  });
  ['opt-mode-day', 'opt-mode-night', 'opt-mode-auto'].forEach(id => {
    $(id)?.addEventListener('change', e => {
      if(!e.target.checked) return;
      const mode = id.replace('opt-mode-', '');
      if(mode !== 'auto') resetModeHysteresis();
      applyTheme(loadThemePrefs().theme, mode);
    });
  });
}
