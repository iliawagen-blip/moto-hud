import { S, L, CAM_H, CAM_B, CAM_PITCH, ROAD_MAX, ROAD_HALF } from './state.js';
import { $ } from './util.js';
import { haversine, bearing } from './geo.js';
import { curPos } from './gps.js';
import { maneuverTurnAngle } from './route.js';
import { fuelStationsForRoad, fuelColor } from './fuel.js';
import { ensureRouteGeometry } from './route.js';
import {
  getRouteSnapForNav, getDisplaySnap, updateCamHeading, getCamHeadingRad,
  updateCamPitch, getCamPitchRad,
  computeRibbonSectionsCam, worldToCamXZ
} from './route-geometry.js';
import { renderElevProfile, getElevExag, getElevProfileH } from './elevation.js';
import { ribbonCurveColor } from './curve-speed.js';
import { getThemeTokens } from './theme-tokens.js';

const PROFILE_GAP = 6;

export function computePathLayout(w, h){
  const aspect = Math.max(0.2, w / Math.max(1, h));
  L.W = 1000;
  L.H = Math.max(480, Math.min(2400, Math.round(L.W / aspect)));
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
  if(Zc < 1.5) return null;
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

function screenDist2(a, b){
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/** Отсечение «иголок» и bow-tie четырёхугольников */
function quadValid(aL, aR, bL, bR){
  if(!aL || !aR || !bL || !bR) return false;
  const maxD2 = (L.W * 0.28) ** 2;
  const edges = [
    screenDist2(aL, aR), screenDist2(bL, bR),
    screenDist2(aL, bL), screenDist2(aR, bR)
  ];
  if(Math.max(...edges) > maxD2) return false;
  if(screenDist2(aL, bR) > maxD2 * 1.8 || screenDist2(aR, bL) > maxD2 * 1.8) return false;
  const t1 = triArea2(aL, bL, bR);
  const t2 = triArea2(aL, bR, aR);
  if(t1 <= 0.5 || t2 <= 0.5) return false;
  if(t1 * t2 <= 0) return false;
  return true;
}

function projectCam(x, z, elev){
  return projectGround(x, z, elev);
}

/** Triangle strip в камерной системе + cull битых quad */
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
    if(!quadValid(aL, aR, bL, bR)) continue;

    const sMid = (a.s + b.s) * 0.5;
    const warnCol = ribbonCurveColor(sMid, geom, speedMps);
    const fillCol = warnCol || tok.pathFill;
    const edgeCol = warnCol || tok.pathEdge;
    const fillOp = warnCol ? 0.48 : tok.pathFillOpacity;
    const ew = warnCol ? edgeW + 2 : edgeW;

    if(!fillNone){
      fill += '<polygon points="' + pt(aL) + ' ' + pt(bL) + ' ' + pt(bR) +
        '" fill="' + fillCol + '" fill-opacity="' + fillOp + '" stroke="none"/>';
      fill += '<polygon points="' + pt(aL) + ' ' + pt(bR) + ' ' + pt(aR) +
        '" fill="' + fillCol + '" fill-opacity="' + fillOp + '" stroke="none"/>';
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

function renderTurnsStr(svg, snap, headingRad){
  if(!S.route || !snap) return '';
  const tok = getThemeTokens();
  const bv = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
  const vb = bv && bv.width ? bv.width : L.W;
  const vbX = bv ? bv.x : 0;
  const vbY = bv ? bv.y : 0;
  const vbW = vb;
  const vbH = bv ? bv.height : L.H;
  const turns = S.route.steps.filter(st =>
    st.type !== 'depart' && st.type !== 'arrive' && st.modifier && st.modifier !== 'straight');
  const pos = curPos();
  let out = '';
  let shown = 0;
  for(const st of turns){
    if(shown >= 3) break;
    const loc = toLocalFrenet(st.lat, st.lon, snap, headingRad);
    if(loc.z < 5 || loc.z > ROAD_MAX) continue;
    const P = projectGround(loc.x, loc.z, 0);
    if(!P) continue;
    const ang = turnAngleAt(st);
    const dir = ang == null ? (st.modifier.includes('left') ? -1 : 1) : (ang < 0 ? -1 : 1);
    const deg = ang == null ? '' : Math.round(Math.abs(ang)) + '°';
    const dist = Math.round(haversine(pos, st));
    const col = shown === 0 ? tok.turnPrimary : tok.turnSecondary;
    const k = shown === 0 ? 1 : 0.72;
    const degFont = vb * 0.12 * k;
    const distFont = vb * 0.05 * k;
    const s = vb * 0.05 * k;
    const sw = Math.max(2, vb * 0.012 * k);
    const halo = Math.max(3, degFont * 0.16);
    const tip = (dir * s).toFixed(1);
    const base = (-dir * s).toFixed(1);
    const degHalfW = degFont * deg.length * 0.34;
    let degX = P.x + dir * (s + degHalfW + degFont * 0.25);
    degX = Math.min(vbX + vbW - degHalfW - 4, Math.max(vbX + degHalfW + 4, degX));
    let degY = P.y + degFont * 0.34;
    degY = Math.min(vbY + vbH - 4, Math.max(vbY + degFont + 4, degY));
    let distY = P.y + s + distFont * 1.1;
    distY = Math.min(vbY + vbH - 4, distY);
    out +=
      '<g font-family="' + tok.fontNum + ',monospace" text-anchor="middle">' +
        '<path d="M ' + (P.x + +base).toFixed(1) + ' ' + (P.y - s).toFixed(1) +
          ' L ' + (P.x + +tip).toFixed(1) + ' ' + P.y.toFixed(1) +
          ' L ' + (P.x + +base).toFixed(1) + ' ' + (P.y + s).toFixed(1) + '" ' +
          'fill="none" stroke="' + col + '" stroke-width="' + sw.toFixed(1) + '" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<text x="' + degX.toFixed(1) + '" y="' + degY.toFixed(1) + '" font-size="' + degFont.toFixed(1) + '" font-weight="900" ' +
          'stroke="' + tok.svgHalo + '" stroke-width="' + halo.toFixed(1) + '" stroke-linejoin="round" fill="' + tok.svgHalo + '" opacity="0.65">' + deg + '</text>' +
        '<text x="' + degX.toFixed(1) + '" y="' + degY.toFixed(1) + '" font-size="' + degFont.toFixed(1) + '" font-weight="900" fill="' + col + '">' + deg + '</text>' +
        '<text x="' + P.x.toFixed(1) + '" y="' + distY.toFixed(1) + '" font-size="' + distFont.toFixed(1) + '" fill="' + col + '" opacity="0.9">' + dist + ' м</text>' +
      '</g>';
    shown++;
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
          'fill="' + tok.svgBgOverlay + '" stroke="' + col + '" stroke-width="' + sw.toFixed(1) + '"/>' +
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
  if(!S.showPath || kmh < 25){
    block.classList.add('hidden');
    hud.classList.add('no-path');
    svg.innerHTML = '';
    return;
  }
  block.classList.remove('hidden');
  hud.classList.remove('no-path');

  const gpsHdg = S.smoothedHeading;
  if(S.route && !S.route.geometry) ensureRouteGeometry(S.route);

  const rawSnap = getRouteSnapForNav(gpsHdg);
  const geomReady = S.route?.geometry;
  if(!geomReady || !rawSnap){
    if(svg.innerHTML) svg.innerHTML = '';
    return;
  }
  const speedMps = Math.max(0, S.dispSpeed / 3.6);
  const snap = getDisplaySnap(rawSnap, geomReady, speedMps, gpsHdg);
  if(!snap){
    if(svg.innerHTML) svg.innerHTML = '';
    return;
  }

  const maxDist = Math.max(100, Math.min(ROAD_MAX, Math.round(kmh * 8)));
  const rect = block.getBoundingClientRect();
  computePathLayout(rect.width || block.clientWidth || 300, rect.height || block.clientHeight || 200);
  svg.setAttribute('viewBox', '0 0 ' + L.W + ' ' + L.H);

  const headingRad = updateCamHeading(geomReady, snap);
  updateCamPitch(geomReady, snap, getElevExag(), S.showElevProfile);
  const sections = computeRibbonSectionsCam(geomReady, snap, maxDist, ROAD_HALF, headingRad);
  if(sections.length < 2){
    svg.innerHTML = '';
    return;
  }

  const mesh = buildStripMeshSvg(sections, geomReady, speedMps);
  let html = mesh.fill + mesh.edges;
  const tok = getThemeTokens();

  const centerS = sections
    .map(sec => ({ p: projectCam(sec.cx, sec.cz, sec.elev), s: sec.s }))
    .filter(x => x.p);
  for(let ci = 0; ci < centerS.length - 1; ci++){
    const a = centerS[ci];
    const b = centerS[ci + 1];
    const sMid = (a.s + b.s) * 0.5;
    const warnCol = ribbonCurveColor(sMid, geomReady, speedMps);
    const stroke = warnCol || tok.pathEdge;
    const sw = warnCol ? tok.strokeW + 1.5 : tok.strokeW;
    const op = warnCol ? 0.85 : tok.pathCenterOpacity;
    html += '<line x1="' + a.p.x.toFixed(1) + '" y1="' + a.p.y.toFixed(1) +
      '" x2="' + b.p.x.toFixed(1) + '" y2="' + b.p.y.toFixed(1) +
      '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round" opacity="' + op + '"/>';
  }
  html += renderTurnsStr(svg, snap, headingRad);
  html += renderFuelStr(svg, snap, headingRad);
  const profileH = getElevProfileH();
  const prof = renderElevProfile(snap, geomReady, L.W, profileH);
  if(prof) html += '<g transform="translate(0,' + (L.H - profileH - PROFILE_GAP) + ')">' + prof + '</g>';

  svg.innerHTML = html;
}

function renderParametricArrow(turnDeg){
  const tok = getThemeTokens();
  const H = 120;
  const stemLen = H / 3;
  const exitLen = H / 3;
  const R = Math.abs(turnDeg) > 150 ? H / 3.2 : H / 4;
  const sw = Math.round(H * 0.12 * (tok.strokeW / 3));
  const col = tok.accent;
  const outline = tok.arrowStyle === 'outline';
  const dirVec = aDeg => { const a = aDeg * Math.PI / 180; return [Math.sin(a), -Math.cos(a)]; };
  let a = 0, x = 0, y = 0;
  const pts = [[x, y]];
  let d = dirVec(a); x += d[0] * stemLen; y += d[1] * stemLen; pts.push([x, y]);
  const N = Math.max(3, Math.round(Math.abs(turnDeg) / 5));
  const dA = turnDeg / N;
  const segLen = (R * Math.abs(turnDeg) * Math.PI / 180) / N;
  for(let i = 0; i < N; i++){ a += dA; d = dirVec(a); x += d[0] * segLen; y += d[1] * segLen; pts.push([x, y]); }
  d = dirVec(a); x += d[0] * exitLen; y += d[1] * exitLen; pts.push([x, y]);
  const tip = [x, y];
  const hl = sw * 2.1, hw = sw * 1.5;
  const back = [x - d[0] * hl, y - d[1] * hl];
  const perp = [-d[1], d[0]];
  const wingA = [back[0] + perp[0] * hw, back[1] + perp[1] * hw];
  const wingB = [back[0] - perp[0] * hw, back[1] - perp[1] * hw];
  const stem = pts.slice(0, pts.length - 1).concat([back]);
  const all = pts.concat([tip, wingA, wingB]);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  all.forEach(p => { minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]); maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); });
  const pad = sw;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const vb = minX.toFixed(1) + ' ' + minY.toFixed(1) + ' ' + (maxX - minX).toFixed(1) + ' ' + (maxY - minY).toFixed(1);
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
  return renderParametricArrow(turn);
}

export function buildArrowSVG(step){
  if(!step) return '';
  if(step.type === 'arrive') return arriveFlagSVG();
  let turn = maneuverTurnAngle(step);
  if(Math.abs(turn) < 4 && step.modifier){
    if(step.modifier === 'uturn') turn = 175;
    else if(step.modifier.includes('left')) turn = -8;
    else if(step.modifier.includes('right')) turn = 8;
  }
  turn = Math.max(-178, Math.min(178, turn));
  return renderParametricArrow(turn);
}

export function renderCompass(){
  const el = $('compass-svg');
  if(!el) return;
  const tok = getThemeTokens();
  const W = 400, H = 36, cx = W / 2, px = 1.8;
  let html = '<line x1="' + cx + '" y1="2" x2="' + cx + '" y2="' + H + '" stroke="' + tok.accent + '" stroke-width="2"/>';
  const hdg = effectiveHeading();
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

export function renderVisualFrame(){
  renderCompass();
  renderPathway();
}
