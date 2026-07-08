/**
 * Экспорт / импорт / сброс всех настроек приложения.
 */
import {
  APP_OPTS_KEY, HUD_OPTS_KEY, ELEV_OPTS_KEY, CURVE_OPTS_KEY
} from './state.js';
import { THEME_STORAGE_KEY } from './theme-manager.js';
import { FUEL_PROXY_LS_KEY } from './fuel-config.js';

export const SETTINGS_BUNDLE_KIND = 'moto-hud-settings';
export const SETTINGS_BUNDLE_VERSION = 1;

export function collectSettingsBundle(){
  const read = key => {
    try{ return JSON.parse(localStorage.getItem(key) || 'null'); }catch(e){ return null; }
  };
  return {
    kind: SETTINGS_BUNDLE_KIND,
    version: SETTINGS_BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    appOpts: read(APP_OPTS_KEY),
    hudOpts: read(HUD_OPTS_KEY),
    elevOpts: read(ELEV_OPTS_KEY),
    curveOpts: read(CURVE_OPTS_KEY),
    theme: read(THEME_STORAGE_KEY),
    fuelProxy: localStorage.getItem(FUEL_PROXY_LS_KEY) || ''
  };
}

export function applySettingsBundle(data){
  if(!data || data.kind !== SETTINGS_BUNDLE_KIND) throw new Error('Неверный файл настроек');
  const write = (key, val) => {
    if(val == null) return;
    localStorage.setItem(key, JSON.stringify(val));
  };
  write(APP_OPTS_KEY, data.appOpts);
  write(HUD_OPTS_KEY, data.hudOpts);
  write(ELEV_OPTS_KEY, data.elevOpts);
  write(CURVE_OPTS_KEY, data.curveOpts);
  write(THEME_STORAGE_KEY, data.theme);
  if(data.fuelProxy != null && data.fuelProxy !== ''){
    localStorage.setItem(FUEL_PROXY_LS_KEY, String(data.fuelProxy));
  }else{
    localStorage.removeItem(FUEL_PROXY_LS_KEY);
  }
}

export function clearAllSettings(){
  [APP_OPTS_KEY, HUD_OPTS_KEY, ELEV_OPTS_KEY, CURVE_OPTS_KEY, THEME_STORAGE_KEY, FUEL_PROXY_LS_KEY]
    .forEach(k => { try{ localStorage.removeItem(k); }catch(e){} });
}

export function downloadSettingsJson(){
  const blob = new Blob([JSON.stringify(collectSettingsBundle(), null, 2)],
    { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'moto-hud-settings.json';
  a.click();
  URL.revokeObjectURL(url);
}
