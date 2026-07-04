/**
 * Единый конфиг цветов UI/HUD (Фаза 0).
 * CSS-переменные синхронизируются через applyThemeCss().
 */

export const THEME = {
  bg: '#000000',
  fg: '#ffffff',
  dim: '#8b9cb3',
  accent: '#ffd400',
  ok: '#39d353',
  warn: '#ff6b6b',
  alert: '#ff2d2d',
  panel: '#0a0f16',
  panel2: '#141d2a',
  border: '#1a2332',
  hud: '#00ff88',
  hudDim: '#00aa5c',
  ribbonFill: '#00aa5c',
  curveYellow: '#ffd400',
  curveRed: '#ff6644',
  routeStart: '#39d353',
  routeFinish: '#ffd400',
  routeAlts: ['#00ff88', '#66ccff', '#ffd400'],
  grade: { flat: '#00ff88', mid: '#ffd400', steep: '#ff6644' },
  fuel: {
    yes: '#39d353',
    queue: '#ffd400',
    low: '#ff9500',
    no: '#ff3b30',
    unknown: '#66ccff'
  }
};

/** @deprecated используйте THEME.fuel — для совместимости импортов */
export const FUEL_COLORS = THEME.fuel;

export function applyThemeCss(){
  if(typeof document === 'undefined') return;
  const r = document.documentElement;
  const t = THEME;
  r.style.setProperty('--bg', t.bg);
  r.style.setProperty('--fg', t.fg);
  r.style.setProperty('--dim', t.dim);
  r.style.setProperty('--accent', t.accent);
  r.style.setProperty('--ok', t.ok);
  r.style.setProperty('--warn', t.warn);
  r.style.setProperty('--alert', t.alert);
  r.style.setProperty('--panel', t.panel);
  r.style.setProperty('--panel2', t.panel2);
  r.style.setProperty('--border', t.border);
  r.style.setProperty('--hud', t.hud);
  r.style.setProperty('--hud-dim', t.hudDim);
  r.style.setProperty('--amber', t.accent);
}
