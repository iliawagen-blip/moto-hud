import { S, L, CAM_H, CAM_B, CAM_PITCH, ROAD_MAX, ROAD_HALF } from './state.js';
import { $ } from './util.js';
import { haversine, bearing } from './geo.js';
import { curPos } from './gps.js';
import { maneuverTurnAngle, getVisibleTurnManeuvers, MANEUVER_BEND_ANGLE } from './route.js';
import {
  buildRoundaboutSVG, isRoundaboutStep, shouldUseRoundaboutSchema, getRoundaboutContext
} from './roundabout.js';
import { fuelStationsForRoad, fuelColor } from './fuel.js';
import { ensureRouteGeometry } from './route.js';
import {
  getNavSnap, getDisplaySnap, updateCamHeading, getCamHeadingRad,
  updateCamPitch, getCamPitchRad,
  computeRibbonSectionsCam, worldToCamXZ, extendRibbonNearCam,
  interpolateAtS, turnAngleAtS
} from './route-geometry.js';
import { isSnapLost } from './snap-quality.js';
import { PATH_SKIP_DS_M, PATH_SKIP_FRAMES } from './nav-constants.js';

let _pathLastS = null;
let _pathSkipFrames = 0;
import { renderElevProfile, getElevExag, getElevProfileH } from './elevation.js';
import { ribbonCurveColor } from './curve-speed.js';
import { getThemeTokens } from './theme-tokens.js';
import {
  renderCrossingWhiskers, renderRoundaboutSchema,
  getActiveRoundabout, isCrossingContextEnabled
} from './crossings.js';

const PROFILE_GAP = 6;

export function computePathLayout(w, h){
  const aspect = Math.max(0.2, w / Math.max(1, h));
  L.W = 1000;
  L.H = Math.max(480, Math.min(2400, Math.round(L.W / aspect)));
  L.roadH = L.H;
  L.cx = L.W / 2;
  L.land = aspect > 1;
  L.camFocal = L.land ? 900 : 1300;
  L.camVoff = L.H * 0.78;
  L.horizonY = L.camVoff - L.camFocal * Math.tan(CAM_PITCH);
}

/** Псевдо-3D проекция; elevDelta — относительная высота точки, м */
export function projectGround(x, z, elevDelta){
  const pitch = getCamPitchRad();
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const dy = -CAM_H;
  const dz = z + CAM_B;
  const use3d = S.showElevProfile && S.route?.geometry?.elevReady;
  const elevLift = use3d ? (elevDelta || 0) * getElevExag() * 0.16 : 0;
  const Yc = dy * cp + dz * sp - elevLift;
  const Zc = -dy * sp + dz * cp;
  if(Zc < 0.85) return null;
  const sx = L.cx + L.camFocal * x / Zc;
  const sy = L.camVoff - L.camFocal * Yc / Zc;
  if(sx < -L.W * 0.4 || sx > L.W * 1.4) return null;
  return { x: sx, y: sy };
}

/** Локальные координаты от snap с курсом камеры */
export function toLocalFrenet(lat, lon, snap, headingRad){
  return worldToCamXZ(lat, lon, snap, headingRad);
}

/** lat/lon → экран через камеру snap */
function projectWorld(lat, lon, elev, snap, headingRad){
  const { x, z } = worldToCamXZ(lat, lon, snap, headingRad);
  return projectGround(x, z, elev);
}

function triArea2(a, b, c){
  if(!a || !b || !c) return 0;
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function projectCam(x, z, elev){
  return projectGround(x, z, elev);
}

/** Triangle strip в камерной системе */
function buildStripMeshSvg(sections, geom, speedMps){
  if(sections.length < 2) return { fill: '', edges: '' };
  const tok = getThemeTokens();
  const fillNone = tok.pathFill === 'none' || tok.pathFill === 'transparent';
  let fill = '';
  let edges = '';
  const pt = p => p.x.toFixed(1) + ',' + p.y.toFixed(1);
  const edgeW = tok.pathEdgeW;
  const glowExtra = tok.glow !== 'none' ? ' opacity="' + Math.max(0.1, tok.glowOpacity || 0.25) + '"' : '';

  for(let i = sections.length - 2; i >= 0; i--){
    const a = sections[i];
    const b = sections[i + 1];
    if(b.cz <= a.cz + 0.05) continue;

    const aL = projectCam(a.lx, a.lz, a.elev);
    const aR = projectCam(a.rx, a.rz, a.elev);
    const bL = projectCam(b.lx, b.lz, b.elev);
    const bR = projectCam(b.rx, b.rz, b.elev);
    if(!aL || !aR || !bL || !bR) continue;

    const sMid = (a.s + b.s) * 0.5;
    const warnCol = ribbonCurveColor(sMid, geom, speedMps);
    const fillCol = warnCol || tok.pathFill;
    const edgeCol = warnCol || tok.pathEdge;
    const fillOp = warnCol ? 0.48 : tok.pathFillOpacity;
    const ew = warnCol ? edgeW + 2 : edgeW;

    if(!fillNone){
      const t1 = triArea2(aL, bL, bR);
      const t2 = triArea2(aL, bR, aR);
      const bowTie = t1 * t2 <= 0;
      if(!bowTie || a.cz < 8 || b.cz < 8){
        if(t1 > 1){
          fill += '<polygon points="' + pt(aL) + ' ' + pt(bL) + ' ' + pt(bR) +
            '" fill="' + fillCol + '" fill-opacity="' + fillOp + '" stroke="none"/>';
        }
        if(t2 > 1){
          fill += '<polygon points="' + pt(aL) + ' ' + pt(bR) + ' ' + pt(aR) +
            '" fill="' + fillCol + '" fill-opacity="' + fillOp + '" stroke="none"/>';
        }
      }
    }

    const dash = tok.pathDash !== 'none' ? ' stroke-dasharray="' + tok.pathDash + '"' : '';
    edges +=
      '<line x1="' + aL.x.toFixed(1) + '" y1="' + aL.y.toFixed(1) +
        '" x2="' + bL.x.toFixed(1) + '" y2="' + bL.y.toFixed(1) +
        '" stroke="' + edgeCol + '" stroke-width="' + ew + '" stroke-linecap="round"' + dash + glowExtra + '/>' +
      '<line x1="' + aR.x.toFixed(1) + '" y1="' + aR.y.toFixed(1) +
        '" x2="' + bR.x.toFixed(1) + '" y2="' + bR.y.toFixed(1) +
        '" stroke="' + edgeCol + '" stroke-width="' + ew + '" stroke-linecap="round"' + dash + glowExtra + '/>';
    if(tok.glow !== 'none'){
      edges +=
        '<line x1="' + aL.x.toFixed(1) + '" y1="' + aL.y.toFixed(1) +
          '" x2="' + bL.x.toFixed(1) + '" y2="' + bL.y.toFixed(1) +
          '" stroke="' + tok.glow + '" stroke-width="' + (ew + 4) + '" stroke-linecap="round" opacity="' +
          (tok.glowOpacity || 0.25) + '"/>' +
        '<line x1="' + aR.x.toFixed(1) + '" y1="' + aR.y.toFixed(1) +
          '" x2="' + bR.x.toFixed(1) + '" y2="' + bR.y.toFixed(1) +
          '" stroke="' + tok.glow + '" stroke-width="' + (ew + 4) + '" stroke-linecap="round" opacity="' +
          (tok.glowOpacity || 0.25) + '"/>';
    }
  }
  return { fill, edges };
}

export function effectiveHeading(){
  if(S.smoothedHeading != null && !isNaN(S.smoothedHeading)) return S.smoothedHeading;
  const rad = getCamHeadingRad();
  if(rad != null) return (rad * 180 / Math.PI + 360) % 360;
  return null;
}

function turnAngleAt(step){
  const coords = S.route.coords;
  let bi = 0;
  let bd = Infinity;
  for(let i = 0; i < coords.length; i++){
    const d = haversine({ lat: coords[i][0], lon: coords[i][1] }, step);
    if(d < bd){ bd = d; bi = i; }
  }
  if(bi <= 0 || bi >= coords.length - 1) return null;
  const bIn = bearing({ lat: coords[bi - 1][0], lon: coords[bi - 1][1] },
    { lat: coords[bi][0], lon: coords[bi][1] });
  const bOut = bearing({ lat: coords[bi][0], lon: coords[bi][1] },
    { lat: coords[bi + 1][0], lon: coords[bi + 1][1] });
  return ((bOut - bIn + 540) % 360) - 180;
}

/** Сторона поворота OSRM: −1 влево, +1 вправо, 0 неизвестно */
function modifierTurnSide(mod){
  if(!mod) return 0;
  if(mod.includes('left')) return -1;
  if(mod.includes('right')) return 1;
  return 0;
}

/** Согласование знака угла геометрии с modifier OSRM */
function reconcileTurnAngle(ang, modifier){
  const side = modifierTurnSide(modifier);
  if(modifier === 'uturn'){
    if(Math.abs(ang) < 120) return side < 0 ? -175 : 175;
    return ang;
  }
  if(side === 0) return ang;
  if(side < 0 && ang > 0) return -Math.abs(ang);
  if(side > 0 && ang < 0) return Math.abs(ang);
  if(Math.abs(ang) < 10) return side * 25;
  return ang;
}

/**
 * Базис шеврона в экранных координатах: центр P, единичный вектор направления съезда (ex, ey).
 */
function chevronScreenBasis(snap, headingRad, geom, s, modifier, ang){
  const ds = 16;
  const total = geom.s[geom.n - 1];
  const p0 = interpolateAtS(geom, Math.max(0, s - ds));
  const p1 = interpolateAtS(geom, s);
  const p2 = interpolateAtS(geom, Math.min(total, s + ds));
  const P0 = projectWorld(p0.lat, p0.lon, 0, snap, headingRad);
  const P1 = projectWorld(p1.lat, p1.lon, 0, snap, headingRad);
  const P2 = projectWorld(p2.lat, p2.lon, 0, snap, headingRad);
  if(!P1) return null;

  let ex = 0;
  let ey = 0;
  if(P0 && P2){
    ex = P2.x - P1.x;
    ey = P2.y - P1.y;
    const el = Math.hypot(ex, ey);
    if(el > 1){
      ex /= el;
      ey /= el;
      const ax = P1.x - P0.x;
      const ay = P1.y - P0.y;
      const al = Math.hypot(ax, ay);
      if(al > 1){
        const cross = (ax / al) * ey - (ay / al) * ex;
        const modSide = modifierTurnSide(modifier);
        const geoSide = cross > 0.02 ? 1 : cross < -0.02 ? -1 : 0;
        if(modSide !== 0 && geoSide !== 0 && geoSide !== modSide){
          const lx = -ay / al;
          const ly = ax / al;
          ex = modSide < 0 ? lx : -lx;
          ey = modSide < 0 ? ly : -ly;
        }
      }
    }
  }
  if(Math.hypot(ex, ey) < 0.05){
    const side = modifierTurnSide(modifier) || (ang < 0 ? -1 : 1);
    ex = side;
    ey = 0;
  }
  return { P: P1, ex, ey };
}

function chevronPath(P, ex, ey, arm){
  const tipX = P.x + ex * arm;
  const tipY = P.y + ey * arm;
  const bx = P.x - ex * arm * 0.55;
  const by = P.y - ey * arm * 0.55;
  const px = -ey;
  const py = ex;
  const wing = arm * 0.88;
  const x1 = (bx + px * wing).toFixed(1);
  const y1 = (by + py * wing).toFixed(1);
  const x2 = (bx - px * wing).toFixed(1);
  const y2 = (by - py * wing).toFixed(1);
  return 'M ' + x1 + ' ' + y1 + ' L ' + tipX.toFixed(1) + ' ' + tipY.toFixed(1) + ' L ' + x2 + ' ' + y2;
}

function textBBox(cx, cy, fontSize, text){
  const n = Math.max(String(text || '').length, 1);
  const w = fontSize * n * 0.58;
  const h = fontSize * 1.12;
  return { left: cx - w * 0.5, right: cx + w * 0.5, top: cy - h * 0.82, bottom: cy + h * 0.18 };
}

function bboxOverlap(a, b, pad){
  return a.left - pad < b.right + pad && a.right + pad > b.left - pad &&
    a.top - pad < b.bottom + pad && a.bottom + pad > b.top - pad;
}

function clampLabelX(cx, halfW, vbX, vbW){
  return Math.min(vbX + vbW - halfW - 4, Math.max(vbX + halfW + 4, cx));
}

function clampLabelY(cy, fontSize, vbY, vbH){
  return Math.min(vbY + vbH - 4, Math.max(vbY + fontSize + 4, cy));
}

/** Размещение подписей без наложений: ближний — полный, дальние — дистанция или только шеврон */
function layoutTurnLabels(markers, vb, vbX, vbY, vbW, vbH){
  if(S.pathChevronLabels === false) return;
  const placed = [];
  const minSep = vb * 0.07;
  const pad = vb * 0.014;

  for(let i = 0; i < markers.length; i++){
    const m = markers[i];
    m.degX = null;
    m.degY = null;
    m.distX = null;
    m.distY = null;

    const prev = i > 0 ? markers[i - 1] : null;
    const sep = prev ? Math.hypot(m.P.x - prev.P.x, m.P.y - prev.P.y) : Infinity;
    const wantDeg = i === 0 && !!m.deg;
    const wantDist = i === 0 ? true : sep >= minSep;

    if(wantDeg){
      const sides = [m.labelSide, -m.labelSide];
      for(const side of sides){
        const off = m.arm + m.degFont * 0.35;
        let dx = m.P.x + m.nx * off * side;
        const halfW = m.degFont * Math.max(m.deg.length, 1) * 0.34;
        dx = clampLabelX(dx, halfW, vbX, vbW);
        let dy = clampLabelY(
          m.P.y + m.ny * off * side * 0.35 + m.degFont * 0.34, m.degFont, vbY, vbH);
        const box = textBBox(dx, dy, m.degFont, m.deg);
        if(!placed.some(p => bboxOverlap(box, p, pad))){
          m.degX = dx;
          m.degY = dy;
          placed.push(box);
          break;
        }
      }
    }

    if(!wantDist) continue;

    const distText = m.dist + ' м';
    const slots = [
      () => ({
        x: m.P.x + m.nx * m.arm * (1.5 + i * 0.25) * m.labelSide,
        y: m.P.y + m.ny * m.arm * 0.35 * m.labelSide + m.distFont * 0.15
      }),
      () => ({ x: m.P.x, y: m.tipY + m.distFont * (1.1 + i * 0.35) }),
      () => ({
        x: m.P.x - m.nx * m.arm * (1.5 + i * 0.25) * m.labelSide,
        y: m.P.y - m.ny * m.arm * 0.35 * m.labelSide
      }),
      () => ({ x: m.P.x, y: m.P.y - m.distFont * (0.6 + i * 0.4) })
    ];

    for(const slot of slots){
      let { x, y } = slot();
      x = clampLabelX(x, m.distFont * distText.length * 0.32, vbX, vbW);
      y = clampLabelY(y, m.distFont, vbY, vbH);
      const box = textBBox(x, y, m.distFont, distText);
      if(!placed.some(p => bboxOverlap(box, p, pad))){
        m.distX = x;
        m.distY = y;
        placed.push(box);
        break;
      }
    }
  }
}

function isPathTurnStep(st){
  return st && st.type !== 'depart' && st.type !== 'arrive' &&
    st.modifier && st.modifier !== 'straight';
}

function renderTurnsStr(svg, snap, headingRad, geom, curS){
  if(!S.route || !snap || S.showPathChevrons === false) return '';
  const maxChevrons = Math.max(1, Math.min(3, S.pathChevronMax || 3));
  const tok = getThemeTokens();
  const scale = tok.pathTurnScale || 1;
  const bv = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
  const vb = bv && bv.width ? bv.width : L.W;
  const vbX = bv ? bv.x : 0;
  const vbY = bv ? bv.y : 0;
  const vbW = bv ? bv.width : L.W;
  const vbH = bv ? bv.height : L.H;
  const pos = curPos();

  const items = (geom && curS != null)
    ? getVisibleTurnManeuvers(geom, curS, maxChevrons)
    : S.route.steps.filter(isPathTurnStep).map(st => ({ maneuver: { step: st }, distAhead: haversine(pos, st) }));

  const markers = [];
  for(const item of items){
    if(markers.length >= maxChevrons) break;
    const st = item.maneuver?.step;
    if(!st) continue;
    const loc = toLocalFrenet(st.lat, st.lon, snap, headingRad);
    if(loc.z < 5 || loc.z > ROAD_MAX) continue;
    const P = projectGround(loc.x, loc.z, 0);
    if(!P) continue;

    let ang = null;
    let chev = null;
    const mS = item.maneuver?.s;
    if(geom && mS != null){
      ang = reconcileTurnAngle(turnAngleAtS(geom, mS), st.modifier);
      chev = chevronScreenBasis(snap, headingRad, geom, mS, st.modifier, ang);
    }
    if(ang == null){
      const raw = turnAngleAt(st);
      ang = raw == null
        ? (modifierTurnSide(st.modifier) < 0 ? -25 : modifierTurnSide(st.modifier) > 0 ? 25 : 0)
        : reconcileTurnAngle(raw, st.modifier);
    }
    if(!chev){
      const side = modifierTurnSide(st.modifier) || (ang < 0 ? -1 : 1);
      chev = { P, ex: side, ey: 0 };
    }

    const k = (markers.length === 0 ? 1 : 0.72) * scale;
    const degFont = vb * 0.12 * k;
    const distFont = vb * 0.05 * k;
    const arm = vb * 0.05 * k;
    const tipY = chev.P.y + chev.ey * arm;
    markers.push({
      P: chev.P,
      ex: chev.ex,
      ey: chev.ey,
      nx: -chev.ey,
      ny: chev.ex,
      arm,
      sw: Math.max(2, vb * 0.012 * k),
      col: markers.length === 0 ? tok.turnPrimary : tok.turnSecondary,
      deg: Math.abs(ang) >= 4 ? Math.round(Math.abs(ang)) + '°' : '',
      dist: Math.round(item.distAhead != null ? item.distAhead : haversine(pos, st)),
      degFont,
      distFont,
      tipY,
      labelSide: ang < 0 ? 1 : -1
    });
  }

  layoutTurnLabels(markers, vb, vbX, vbY, vbW, vbH);

  let out = '';
  for(const m of markers){
    out +=
      '<g font-family="' + tok.fontNum + ',monospace" text-anchor="middle">' +
        '<path d="' + chevronPath(m.P, m.ex, m.ey, m.arm) + '" ' +
          'fill="none" stroke="' + m.col + '" stroke-width="' + m.sw.toFixed(1) + '" stroke-linecap="round" stroke-linejoin="round"/>' +
        (m.degX != null ? '<text x="' + m.degX.toFixed(1) + '" y="' + m.degY.toFixed(1) + '" font-size="' + m.degFont.toFixed(1) + '" font-weight="900" fill="' + m.col + '">' + m.deg + '</text>' : '') +
        (m.distX != null ? '<text x="' + m.distX.toFixed(1) + '" y="' + m.distY.toFixed(1) + '" font-size="' + m.distFont.toFixed(1) + '" fill="' + m.col + '" opacity="0.9">' + m.dist + ' м</text>' : '') +
      '</g>';
  }
  return out;
}

function renderFuelStr(svg, snap, headingRad){
  if(S.fuelMode === 0 || !snap) return '';
  const tok = getThemeTokens();
  const bv = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
  const vb = bv && bv.width ? bv.width : L.W;
  const vbX = bv ? bv.x : 0;
  const vbY = bv ? bv.y : 0;
  const vbW = vb;
  const vbH = bv ? bv.height : L.H;
  const stations = fuelStationsForRoad(ROAD_MAX);
  let out = '';
  for(const st of stations){
    const loc = toLocalFrenet(st.lat, st.lon, snap, headingRad);
    if(loc.z < 5 || loc.z > ROAD_MAX) continue;
    const P = projectGround(loc.x, loc.z, 0);
    if(!P) continue;
    const sel = S.fuelSel && S.fuelSel.osmId === st.osmId;
    const k = sel ? 0.62 : 0.46;
    const r = vb * 0.045 * k;
    const emoji = vb * 0.06 * k;
    const distFont = vb * 0.032 * k;
    const sw = Math.max(1.5, vb * 0.008);
    const col = fuelColor(st.status);
    const dm = st.distAhead != null && isFinite(st.distAhead) ? st.distAhead : st.distGps;
    const distTxt = dm < 1000 ? Math.round(dm / 10) * 10 + ' м' : (dm / 1000).toFixed(1) + ' км';
    let cx = Math.min(vbX + vbW - r - 2, Math.max(vbX + r + 2, P.x));
    let cy = Math.min(vbY + vbH - r - distFont - 4, Math.max(vbY + r + 2, P.y));
    out +=
      '<g text-anchor="middle" font-family="' + tok.fontNum + ',monospace">' +
        '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" ' +
          'fill="none" stroke="' + col + '" stroke-width="' + sw.toFixed(1) + '"/>' +
        '<text x="' + cx.toFixed(1) + '" y="' + (cy + emoji * 0.36).toFixed(1) + '" font-size="' + emoji.toFixed(1) + '">\u26FD</text>' +
        '<text x="' + cx.toFixed(1) + '" y="' + (cy + r + distFont * 1.05).toFixed(1) + '" ' +
          'font-size="' + distFont.toFixed(1) + '" font-weight="900" fill="' + col + '" ' +
          'stroke="' + tok.svgHalo + '" stroke-width="' + (distFont * 0.14).toFixed(1) + '" paint-order="stroke">' + distTxt + '</text>' +
      '</g>';
  }
  return out;
}

export function renderPathway(){
  const block = $('block-path');
  const svg = $('path-svg');
  if(!block || !svg) return;
  const hud = $('hud');
  const kmh = S.gps && S.gps.speed != null && S.gps.speed >= 0 ? S.gps.speed * 3.6 : 0;
  if(!S.showPath || kmh < 25 || isSnapLost() || S.compassMode || S.gpsConverged === false){
    block.classList.add('hidden');
    hud.classList.add('no-path');
    svg.innerHTML = '';
    return;
  }
  block.classList.remove('hidden');
  hud.classList.remove('no-path');

  const gpsHdg = S.smoothedHeading;
  if(S.route && !S.route.geometry) ensureRouteGeometry(S.route);

  const rawSnap = getNavSnap(gpsHdg);
  const geomReady = S.route?.geometry;
  if(!geomReady || !rawSnap){
    svg.innerHTML = '';
    return;
  }
  const speedMps = Math.max(0, S.dispSpeed / 3.6);
  const snap = getDisplaySnap(rawSnap, geomReady, speedMps, gpsHdg);
  if(!snap){
    svg.innerHTML = '';
    return;
  }

  if(S.snapQuality === 'GOOD' && _pathLastS != null &&
     Math.abs(snap.s - _pathLastS) < PATH_SKIP_DS_M && kmh >= 25){
    _pathSkipFrames++;
    if(_pathSkipFrames <= PATH_SKIP_FRAMES) return;
  }
  _pathSkipFrames = 0;
  _pathLastS = snap.s;

  const maxDist = Math.max(100, Math.min(ROAD_MAX, Math.round(kmh * 8)));
  const rect = block.getBoundingClientRect();
  computePathLayout(rect.width || block.clientWidth || 300, rect.height || block.clientHeight || 200);
  svg.setAttribute('viewBox', '0 0 ' + L.W + ' ' + L.H);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');

  const headingRad = updateCamHeading(geomReady, snap);
  updateCamPitch(geomReady, snap, getElevExag(), S.showElevProfile);

  const activeRb = isCrossingContextEnabled()
    ? getActiveRoundabout(geomReady, rawSnap.s, speedMps) : null;

  let sections = extendRibbonNearCam(
    computeRibbonSectionsCam(geomReady, snap, maxDist, ROAD_HALF, headingRad)
  );
  if(activeRb){
    sections = sections.filter(sec => sec.s < activeRb.sEnter || sec.s > activeRb.sExit);
  }
  if(sections.length < 2){
    svg.innerHTML = '';
    return;
  }

  let html = '';
  if(isCrossingContextEnabled()){
    html += renderCrossingWhiskers(snap, headingRad, geomReady, rawSnap.s, speedMps);
    if(activeRb) html += renderRoundaboutSchema(activeRb, snap, headingRad);
  }

  const mesh = buildStripMeshSvg(sections, geomReady, speedMps);
  html += mesh.fill + mesh.edges;
  const tok = getThemeTokens();

  const centerS = sections
    .map(sec => ({ p: projectCam(sec.cx, sec.cz, sec.elev), s: sec.s }))
    .filter(x => x.p);
  for(let ci = 0; ci < centerS.length - 1; ci++){
    const a = centerS[ci];
    const b = centerS[ci + 1];
    if(!a.p || !b.p) continue;
    const dx = b.p.x - a.p.x;
    const dy = b.p.y - a.p.y;
    if(dx * dx + dy * dy > (L.W * 0.32) ** 2) continue;
    const sMid = (a.s + b.s) * 0.5;
    const warnCol = ribbonCurveColor(sMid, geomReady, speedMps);
    const stroke = warnCol || tok.pathEdge;
    const sw = warnCol ? tok.strokeW + 1.5 : tok.strokeW;
    const op = warnCol ? 0.85 : tok.pathCenterOpacity;
    html += '<line x1="' + a.p.x.toFixed(1) + '" y1="' + a.p.y.toFixed(1) +
      '" x2="' + b.p.x.toFixed(1) + '" y2="' + b.p.y.toFixed(1) +
      '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round" opacity="' + op + '"/>';
  }
  html += renderTurnsStr(svg, snap, headingRad, geomReady, rawSnap.s);
  html += renderFuelStr(svg, snap, headingRad);
  const profileH = getElevProfileH();
  const prof = renderElevProfile(snap, geomReady, L.W, profileH);
  if(prof) html += '<g transform="translate(0,' + (L.H - profileH - PROFILE_GAP) + ')">' + prof + '</g>';

  svg.innerHTML = html;
}

function computeArrowCenterline(turnDeg, H = 120){
  const stemLen = H / 3;
  const exitLen = H / 3;
  const R = Math.abs(turnDeg) > 150 ? H / 3.2 : H / 4;
  const dirVec = aDeg => { const a = aDeg * Math.PI / 180; return [Math.sin(a), -Math.cos(a)]; };
  let a = 0, x = 0, y = 0;
  const pts = [[x, y]];
  let d = dirVec(a); x += d[0] * stemLen; y += d[1] * stemLen; pts.push([x, y]);
  const N = Math.max(3, Math.round(Math.abs(turnDeg) / 5));
  const dA = turnDeg / N;
  const segLen = (R * Math.abs(turnDeg) * Math.PI / 180) / N;
  for(let i = 0; i < N; i++){
    a += dA; d = dirVec(a); x += d[0] * segLen; y += d[1] * segLen; pts.push([x, y]);
  }
  d = dirVec(a); x += d[0] * exitLen; y += d[1] * exitLen; pts.push([x, y]);
  return { pts, dir: d, tip: [x, y] };
}

function arrowViewBox(all, pad){
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  all.forEach(p => {
    minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
  });
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  return {
    vb: minX.toFixed(1) + ' ' + minY.toFixed(1) + ' ' + (maxX - minX).toFixed(1) + ' ' + (maxY - minY).toFixed(1)
  };
}

function renderParametricArrow(turnDeg){
  const tok = getThemeTokens();
  const H = 120;
  const { pts, dir, tip } = computeArrowCenterline(turnDeg, H);
  const sw = Math.round(H * 0.12 * (tok.strokeW / 3));
  const col = tok.accent;
  const outline = tok.arrowStyle === 'outline';
  const hl = sw * 2.1, hw = sw * 1.5;
  const back = [tip[0] - dir[0] * hl, tip[1] - dir[1] * hl];
  const perp = [-dir[1], dir[0]];
  const wingA = [back[0] + perp[0] * hw, back[1] + perp[1] * hw];
  const wingB = [back[0] - perp[0] * hw, back[1] - perp[1] * hw];
  const stem = pts.slice(0, pts.length - 1).concat([back]);
  const all = [...stem, tip, wingA, wingB];
  const { vb } = arrowViewBox(all, sw);
  const line = '<polyline points="' + stem.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') +
    '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>';
  const head = outline ? '' :
    '<polygon points="' + tip[0].toFixed(1) + ',' + tip[1].toFixed(1) + ' ' +
    wingA[0].toFixed(1) + ',' + wingA[1].toFixed(1) + ' ' + wingB[0].toFixed(1) + ',' + wingB[1].toFixed(1) + '" fill="' + col + '"/>';
  const headOutline = outline ?
    '<polyline points="' + tip[0].toFixed(1) + ',' + tip[1].toFixed(1) + ' ' +
      wingA[0].toFixed(1) + ',' + wingA[1].toFixed(1) + ' ' + wingB[0].toFixed(1) + ',' + wingB[1].toFixed(1) +
      ' ' + tip[0].toFixed(1) + ',' + tip[1].toFixed(1) +
      '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' : '';
  return '<svg class="arrow-svg" viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet">' + line + head + headOutline + '</svg>';
}

/** Чоппер: массивный шеврон «дорожный знак / эмблема» */
function renderChopperArrow(turnDeg){
  const tok = getThemeTokens();
  const col = tok.accent;
  const H = 120;
  const { pts, dir, tip } = computeArrowCenterline(turnDeg, H);
  const halfW = 11;
  const hl = 22, hw = 19;
  const back = [tip[0] - dir[0] * hl, tip[1] - dir[1] * hl];
  const perp = [-dir[1], dir[0]];
  const wingA = [back[0] + perp[0] * hw, back[1] + perp[1] * hw];
  const wingB = [back[0] - perp[0] * hw, back[1] - perp[1] * hw];
  const stem = pts.slice(0, pts.length - 1).concat([back]);
  const left = [], right = [];
  for(let i = 0; i < stem.length; i++){
    const p = stem[i];
    let t;
    if(i < stem.length - 1){
      const q = stem[i + 1];
      t = [q[0] - p[0], q[1] - p[1]];
    } else if(i > 0){
      const q = stem[i - 1];
      t = [p[0] - q[0], p[1] - q[1]];
    } else {
      t = dir;
    }
    const len = Math.hypot(t[0], t[1]) || 1;
    const n = [-t[1] / len, t[0] / len];
    left.push([p[0] + n[0] * halfW, p[1] + n[1] * halfW]);
    right.push([p[0] - n[0] * halfW, p[1] - n[1] * halfW]);
  }
  const body = left.concat(right.slice().reverse());
  const bodyPts = body.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const headPts = tip[0].toFixed(1) + ',' + tip[1].toFixed(1) + ' ' +
    wingA[0].toFixed(1) + ',' + wingA[1].toFixed(1) + ' ' +
    wingB[0].toFixed(1) + ',' + wingB[1].toFixed(1);
  const all = [...stem, tip, wingA, wingB, ...left, ...right];
  const { vb } = arrowViewBox(all, halfW + 4);
  const rim = tok.line || col;
  return '<svg class="arrow-svg arrow-chopper" viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet">' +
    '<polygon points="' + bodyPts + '" fill="' + col + '" stroke="' + rim + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<polygon points="' + headPts + '" fill="' + col + '" stroke="' + rim + '" stroke-width="2" stroke-linejoin="round"/>' +
    '</svg>';
}

function vfdQuant(v, step = 2){
  return Math.round(v / step) * step;
}

function offsetRibbonPoints(centerPts, halfW){
  const left = [], right = [];
  for(let i = 0; i < centerPts.length; i++){
    const p = centerPts[i];
    let dx, dy;
    if(i < centerPts.length - 1){
      dx = centerPts[i + 1][0] - p[0];
      dy = centerPts[i + 1][1] - p[1];
    } else {
      dx = p[0] - centerPts[i - 1][0];
      dy = p[1] - centerPts[i - 1][1];
    }
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    left.push([vfdQuant(p[0] + nx * halfW), vfdQuant(p[1] + ny * halfW)]);
    right.push([vfdQuant(p[0] - nx * halfW), vfdQuant(p[1] - ny * halfW)]);
  }
  return { left, right };
}

/** Винтаж: цельная VFD-стрелка без разрывов между сегментами */
function renderVintageArrow(turnDeg){
  const tok = getThemeTokens();
  const col = tok.accent;
  const halfW = 6.5;
  const H = 120;
  const { pts, dir, tip } = computeArrowCenterline(turnDeg, H);
  const hl = 22, hw = 17;
  const back = [tip[0] - dir[0] * hl, tip[1] - dir[1] * hl];
  const perp = [-dir[1], dir[0]];
  const wingA = [vfdQuant(back[0] + perp[0] * hw), vfdQuant(back[1] + perp[1] * hw)];
  const wingB = [vfdQuant(back[0] - perp[0] * hw), vfdQuant(back[1] - perp[1] * hw)];
  const tipQ = [vfdQuant(tip[0]), vfdQuant(tip[1])];

  const stem = pts.slice(0, pts.length - 1).concat([back]);
  const { left, right } = offsetRibbonPoints(stem, halfW);
  const poly = left.concat([wingA, tipQ, wingB]).concat(right.slice().reverse());
  const polyPts = poly.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

  const all = [...stem, tipQ, wingA, wingB];
  const { vb } = arrowViewBox(all, halfW + 4);
  return '<svg class="arrow-svg arrow-vintage" viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet" filter="url(#vfd-glow-cyan)">' +
    '<polygon points="' + polyPts + '" fill="' + col + '" stroke="none"/>' +
    '</svg>';
}

function renderManeuverArrow(turnDeg){
  const shape = getThemeTokens().arrowShape || 'parametric';
  if(shape === 'chopper') return renderChopperArrow(turnDeg);
  if(shape === 'vintage') return renderVintageArrow(turnDeg);
  return renderParametricArrow(turnDeg);
}

function arriveFlagSVG(){
  const tok = getThemeTokens();
  const sw = Math.max(4, tok.strokeW + 2);
  const col = tok.pathEdge;
  return '<svg class="arrow-svg" viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid meet">' +
    '<rect x="-28" y="-32" width="56" height="40" fill="none" stroke="' + col + '" stroke-width="' + sw + '"/>' +
    '<path d="M-28 -32 L-28 8 L28 -12 Z" fill="' + (tok.arrowStyle === 'outline' ? 'none' : col) + '" stroke="' + col + '" stroke-width="' + (sw * 0.5) + '"/>' +
    '<line x1="-28" y1="8" x2="-28" y2="28" stroke="' + col + '" stroke-width="' + sw + '"/>' +
    '</svg>';
}

export function buildTurnArrowSVG(turnDeg){
  const turn = Math.max(-178, Math.min(178, turnDeg || 0));
  return renderManeuverArrow(turn);
}

export function buildArrowSVG(step, opts = {}){
  if(!step) return '';
  if(step.type === 'arrive') return arriveFlagSVG();

  if(shouldUseRoundaboutSchema() && isRoundaboutStep(step)){
    const ctx = opts.ctx || (opts.snap ? getRoundaboutContext(opts.snap, S.route) : null);
    const rbOpts = {
      ...opts,
      ctx,
      isOnRoundabout: opts.isOnRoundabout ?? ctx?.isOnRoundabout,
      distanceToExit: opts.distanceToExit ?? ctx?.distanceToExit,
      progressAngle: opts.progressAngle ?? ctx?.progressAngle
    };
    const rb = buildRoundaboutSVG(step, rbOpts);
    if(rb) return rb;
  }

  let turn = maneuverTurnAngle(step);
  if(Math.abs(turn) < MANEUVER_BEND_ANGLE){
    if(step.modifier === 'uturn') turn = 175;
    else if(Math.abs(turn) < 4 && step.modifier){
      if(step.modifier.includes('left')) turn = -8;
      else if(step.modifier.includes('right')) turn = 8;
      else turn = 0;
    } else {
      turn = 0;
    }
  }
  turn = Math.max(-178, Math.min(178, turn));
  return renderManeuverArrow(turn);
}

export function renderCompass(){
  const el = $('compass-svg');
  if(!el) return;
  const tok = getThemeTokens();
  const hdg = effectiveHeading();
  if(tok.compassStyle === 'rose'){
    renderCompassRose(el, tok, hdg);
    return;
  }
  const W = 400, H = 36, cx = W / 2, px = 1.8;
  let html = '<line x1="' + cx + '" y1="2" x2="' + cx + '" y2="' + H + '" stroke="' + tok.accent + '" stroke-width="2"/>';
  if(hdg != null && !isNaN(hdg)){
    [['N',0],['E',90],['S',180],['W',270]].forEach(d => {
      let diff = ((d[1] - hdg + 540) % 360) - 180;
      const x = cx + diff * px;
      if(x < 14 || x > W - 14) return;
      const near = Math.abs(diff) < 12;
      html += '<text x="' + x.toFixed(1) + '" y="29" text-anchor="middle" ' +
        'font-family="' + tok.fontLabel + ',sans-serif" font-size="27" font-weight="900" ' +
        'fill="' + (near ? tok.accent : tok.fg) + '">' + d[0] + '</text>';
    });
  }
  el.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  el.innerHTML = html;
}

function renderCompassRose(el, tok, hdg){
  const chopper = document.documentElement.classList.contains('theme-chopper');
  const W = 400, H = chopper ? 140 : 120, cx = W / 2, cy = H / 2, r = chopper ? 54 : 44;
  const fs = chopper ? 30 : 22;
  let html = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + tok.dim + '" stroke-width="' + (chopper ? 2 : 1.5) + '"/>';
  if(hdg != null && !isNaN(hdg)){
    [['N',0],['E',90],['S',180],['W',270]].forEach(d => {
      const a = (d[1] - hdg) * Math.PI / 180;
      const x = cx + Math.sin(a) * r;
      const y = cy - Math.cos(a) * r;
      const near = Math.abs(((d[1] - hdg + 540) % 360) - 180) < 18;
      html += '<text x="' + x.toFixed(1) + '" y="' + (y + 8).toFixed(1) + '" text-anchor="middle" ' +
        'font-family="' + tok.fontLabel + ',sans-serif" font-size="' + fs + '" font-weight="900" ' +
        'fill="' + (near ? tok.accent : tok.fg) + '">' + d[0] + '</text>';
    });
    const a = -hdg * Math.PI / 180;
    html += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.sin(a) * (r - 10)).toFixed(1) +
      '" y2="' + (cy - Math.cos(a) * (r - 10)).toFixed(1) + '" stroke="' + tok.accent + '" stroke-width="' + (chopper ? 4 : 3) + '"/>';
  }
  el.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  el.innerHTML = html;
}

export function renderVisualFrame(){
  renderCompass();
  renderPathway();
}
