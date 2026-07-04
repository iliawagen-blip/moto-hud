/**
 * Тема оформления: CSS-токены на html + кэш для SVG.
 */
import { invalidateThemeTokens, getThemeObject } from './theme-tokens.js';

/** @deprecated — используйте getThemeObject() после applyThemeCss */
export const THEME = new Proxy({}, {
  get(_t, prop){
    const o = getThemeObject();
    return o[prop];
  }
});

/** @deprecated */
export const FUEL_COLORS = new Proxy({}, {
  get(_t, prop){
    return getThemeObject().fuel[prop];
  }
});

/** Синхронизация meta theme-color и сброс кэша токенов */
export function applyThemeCss(){
  if(typeof document === 'undefined') return;
  invalidateThemeTokens();
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#000';
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', bg);
}

export { invalidateThemeTokens, getThemeObject, getThemeTokens } from './theme-tokens.js';
