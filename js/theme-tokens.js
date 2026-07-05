/**
 * Кэш CSS-токенов для SVG/rAF. getComputedStyle — только при invalidateThemeTokens().
 */

/** @typedef {Record<string, string | number>} ThemeTokenCache */

/** @type {ThemeTokenCache | null} */
let _cache = null;

function readProp(style, name, fallback){
  const v = style.getPropertyValue(name).trim();
  return v || fallback;
}

function readNum(style, name, fallback){
  const v = parseFloat(readProp(style, name, String(fallback)));
  return Number.isFinite(v) ? v : fallback;
}

/** Сброс кэша (смена темы / режима) */
export function invalidateThemeTokens(){
  _cache = null;
  if(typeof document !== 'undefined'){
    document.dispatchEvent(new CustomEvent('themechange'));
  }
}

/** Токены для SVG и JS-отрисовки (не вызывать getComputedStyle в rAF без invalidate) */
export function getThemeTokens(){
  if(_cache) return _cache;
  const el = typeof document !== 'undefined' ? document.documentElement : null;
  const style = el ? getComputedStyle(el) : null;
  const g = (n, fb) => style ? readProp(style, n, fb) : fb;
  const gn = (n, fb) => style ? readNum(style, n, fb) : fb;

  _cache = {
    bg: g('--bg', '#000000'),
    accent: g('--accent', '#ffd400'),
    line: g('--line', '#1a2332'),
    fg: g('--fg', '#ffffff'),
    fgDim: g('--fg-dim', '#8b9cb3'),
    pathEdge: g('--path-edge', '#00ff88'),
    pathFill: g('--path-fill', '#00aa5c'),
    pathFillOpacity: gn('--path-fill-opacity', 0.22),
    pathEdgeW: gn('--path-edge-w', 5),
    pathTurnScale: gn('--path-turn-scale', 1),
    pathCenterOpacity: gn('--path-center-opacity', 0.45),
    pathDash: g('--path-dash', 'none'),
    strokeW: gn('--stroke-w', 3),
    arrowStyle: g('--arrow-style', 'filled'),
    arrowShape: g('--arrow-shape', 'parametric'),
    compassStyle: g('--compass-style', 'tape'),
    glow: g('--glow', 'none'),
    glowOpacity: gn('--glow-opacity', 0),
    svgHalo: g('--svg-halo', '#000000'),
    svgBgOverlay: g('--svg-bg-overlay', 'rgba(0,0,0,0.72)'),
    turnPrimary: g('--turn-primary', '#ffd400'),
    turnSecondary: g('--turn-secondary', '#00cc70'),
    semWarn: g('--sem-warn', '#FFB000'),
    semDanger: g('--sem-danger', '#E10600'),
    semOk: g('--sem-ok', '#33CC66'),
    curveYellow: g('--curve-yellow', '#FFB000'),
    curveRed: g('--curve-red', '#E10600'),
    gradeFlat: g('--grade-flat', '#00ff88'),
    gradeMid: g('--grade-mid', '#FFB000'),
    gradeSteep: g('--grade-steep', '#E10600'),
    routeStart: g('--route-start', '#33CC66'),
    routeFinish: g('--route-finish', '#ffd400'),
    routeAlt0: g('--route-alt-0', '#00ff88'),
    routeAlt1: g('--route-alt-1', '#66ccff'),
    routeAlt2: g('--route-alt-2', '#ffd400'),
    fontNum: g('--font-num', 'sans-serif'),
    fontLabel: g('--font-label', 'sans-serif')
  };
  return _cache;
}

/** Объект THEME для совместимости (map, fuel, curve) */
export function getThemeObject(){
  const t = getThemeTokens();
  return {
    bg: t.bg,
    fg: t.fg,
    dim: t.fgDim,
    accent: t.accent,
    ok: t.semOk,
    warn: t.semWarn,
    alert: t.semDanger,
    hud: t.pathEdge,
    hudDim: t.pathEdge,
    ribbonFill: t.pathFill,
    curveYellow: t.curveYellow,
    curveRed: t.curveRed,
    routeStart: t.routeStart,
    routeFinish: t.routeFinish,
    routeAlts: [t.routeAlt0, t.routeAlt1, t.routeAlt2],
    grade: { flat: t.gradeFlat, mid: t.gradeMid, steep: t.gradeSteep },
    fuel: {
      yes: t.semOk,
      queue: t.semWarn,
      low: '#ff9500',
      no: t.semDanger,
      unknown: t.routeAlt1
    }
  };
}
