/**
 * Ghost ribbons на развязке (ROADPATH этап 5): Overpass corridor + structural Z.
 * Та же камера, что у прогноза-дорожки (worldToCamXZ / projectGround).
 * @module interchange-corridor
 */
import { haversine } from './geo.js';
import { S, GHOST_OPTS_KEY, ROAD_HALF } from './state.js';
import { overpassFetch } from './speed-limit.js';
import { isInterchangeStep } from './interchange.js';
import {
  worldToCamXZ, interpolateElevAtS, projectPointToRoute
} from './route-geometry.js';
import { MANEUVER_PASSED_M } from './nav-constants.js';

export const GHOST_PREFETCH_M = 1800;
export const GHOST_SHOW_MAX_M = 950;
export const GHOST_BBOX_SIMPLE_M = 400;
export const GHOST_BBOX_LARGE_M = 1000;
export const GHOST_MAX_WAYS = 8;
export const GHOST_MAX_SEGS = 500;
export const GHOST_LAYER_M = 5;
export const GHOST_HALF_W = ROAD_HALF * 0.72;
export const GHOST_PRIMARY_MATCH_M = 18;
export const GHOST_SAMPLE_M = 8;
export const GHOST_OVERPASS_TIMEOUT_MS = 8000;

let _mockPayload = null;
let _gen = 0;
let _state = {
  targetS: null,
  status: 'idle',
  ways: [],
  fetchedAt: 0
};

/** Sim/CI: подставить ответ Overpass вместо сети. */
export function injectMockCorridor(json){
  _mockPayload = json || null;
}

export function resetGhostCorridor(){
  _gen++;
  _state = { targetS: null, status: 'idle', ways: [], fetchedAt: 0 };
}

export function ghostCorridorStatus(){
  return {
    status: _state.status,
    targetS: _state.targetS,
    ways: _state.ways.length,
    enabled: !!S.ghostRibbons
  };
}

export function loadGhostOptsFromStorage(){
  try{
    const raw = localStorage.getItem(GHOST_OPTS_KEY);
    if(raw == null) return;
    const on = raw === '1' || raw === 'true' ||
      (raw.startsWith('{') && JSON.parse(raw).enabled !== false);
    S.ghostRibbons = !!on;
    const cb = document.getElementById('opt-ghost-ribbons');
    if(cb) cb.checked = S.ghostRibbons;
  }catch(e){}
}

export function saveGhostOptsToStorage(){
  try{
    localStorage.setItem(GHOST_OPTS_KEY, JSON.stringify({ enabled: !!S.ghostRibbons }));
  }catch(e){}
}

function findUpcomingInterchange(geom, curS){
  if(!geom?.maneuvers || curS == null || !Number.isFinite(curS)) return null;
  let best = null;
  for(const m of geom.maneuvers){
    if(!m.step || !isInterchangeStep(m.step)) continue;
    if(curS > m.s + MANEUVER_PASSED_M) continue;
    const along = m.s - curS;
    if(along < -30 || along > GHOST_PREFETCH_M) continue;
    if(!best || m.s < best.s){
      best = {
        s: m.s,
        step: m.step,
        lat: m.lat,
        lon: m.lon,
        along
      };
    }
  }
  return best;
}

function bboxForStep(step){
  const t = step?.type;
  if(t === 'fork' || t === 'on ramp') return GHOST_BBOX_LARGE_M;
  const cls = String(step?.driving_side || step?.mode || '');
  if(/motorway|trunk/i.test(cls)) return GHOST_BBOX_LARGE_M;
  return GHOST_BBOX_SIMPLE_M;
}

/** Visual structural Z: layer×5 м; bridge/tunnel — ±1 ярус без layer. */
export function layerOffsetM(tags){
  if(!tags) return 0;
  if(tags.layer != null && tags.layer !== ''){
    const n = parseInt(tags.layer, 10);
    if(Number.isFinite(n)) return n * GHOST_LAYER_M;
  }
  if(tags.bridge && tags.bridge !== 'no') return GHOST_LAYER_M;
  if(tags.tunnel && tags.tunnel !== 'no') return -GHOST_LAYER_M;
  return 0;
}

/** Прореживание 5–10 м с сохранением junction-вершин (все исходные nodes). */
function densifyWay(nodes, stepM){
  if(!nodes || nodes.length < 2) return nodes || [];
  const out = [{ lat: nodes[0].lat, lon: nodes[0].lon }];
  for(let i = 1; i < nodes.length; i++){
    const a = nodes[i - 1];
    const b = nodes[i];
    const d = haversine(a, b);
    if(d > stepM * 1.35){
      const n = Math.max(1, Math.floor(d / stepM));
      for(let k = 1; k < n; k++){
        const t = k / n;
        out.push({
          lat: a.lat + (b.lat - a.lat) * t,
          lon: a.lon + (b.lon - a.lon) * t
        });
      }
    }
    out.push({ lat: b.lat, lon: b.lon });
  }
  return out;
}

export function parseOverpassWays(json){
  const nodes = new Map();
  for(const el of json?.elements || []){
    if(el.type === 'node') nodes.set(el.id, { lat: el.lat, lon: el.lon });
  }
  const ways = [];
  for(const el of json?.elements || []){
    if(el.type !== 'way' || !el.nodes?.length) continue;
    const raw = [];
    for(const id of el.nodes){
      const n = nodes.get(id);
      if(n) raw.push(n);
    }
    if(raw.length < 2) continue;
    ways.push({
      id: el.id,
      tags: el.tags || {},
      pts: densifyWay(raw, GHOST_SAMPLE_M),
      layerOff: layerOffsetM(el.tags)
    });
  }
  return ways;
}

function isPrimaryMatch(way, geom){
  if(!geom || !way.pts?.length) return false;
  let hits = 0;
  let n = 0;
  const step = Math.max(1, Math.floor(way.pts.length / 7));
  for(let i = 0; i < way.pts.length; i += step){
    const proj = projectPointToRoute(geom, way.pts[i]);
    n++;
    if(proj && proj.lateral < GHOST_PRIMARY_MATCH_M) hits++;
  }
  return n > 0 && hits / n >= 0.55;
}

function selectGhostWays(ways, geom, center, bboxM){
  const ghosts = [];
  for(const w of ways){
    if(isPrimaryMatch(w, geom)) continue;
    const mid = w.pts[Math.floor(w.pts.length / 2)];
    if(haversine(center, mid) > bboxM * 1.25) continue;
    ghosts.push(w);
  }
  ghosts.sort((a, b) => {
    const am = a.pts[Math.floor(a.pts.length / 2)];
    const bm = b.pts[Math.floor(b.pts.length / 2)];
    return haversine(center, am) - haversine(center, bm);
  });
  return ghosts.slice(0, GHOST_MAX_WAYS);
}

async function fetchCorridor(lat, lon, radiusM){
  if(_mockPayload) return _mockPayload;
  const r = Math.round(radiusM);
  const q = `[out:json][timeout:25];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"](around:${r},${lat},${lon});
);
out body; >; out skel qt;`;
  return overpassFetch(q, GHOST_OVERPASS_TIMEOUT_MS);
}

function applyReady(gen, targetS, ways){
  if(gen !== _gen) return;
  _state = {
    targetS,
    status: ways.length ? 'ready' : 'failed',
    ways,
    fetchedAt: Date.now()
  };
}

/**
 * Prefetch / discard по snap. Тихий fallback при ошибке сети.
 * @param {object} geom
 * @param {object} snap
 */
export function tickGhostCorridor(geom, snap){
  if(!S.ghostRibbons || !geom || !snap){
    if(_state.status !== 'idle' && !S.ghostRibbons) resetGhostCorridor();
    return;
  }

  const upcoming = findUpcomingInterchange(geom, snap.s);
  if(!upcoming){
    if(_state.targetS != null && snap.s > _state.targetS + 80) resetGhostCorridor();
    return;
  }

  if(snap.s > upcoming.s + MANEUVER_PASSED_M){
    resetGhostCorridor();
    return;
  }

  if(_state.targetS === upcoming.s &&
     (_state.status === 'ready' || _state.status === 'fetching' || _state.status === 'failed')){
    return;
  }

  if(upcoming.along > GHOST_PREFETCH_M) return;

  const bbox = bboxForStep(upcoming.step);
  const center = { lat: upcoming.lat, lon: upcoming.lon };
  const gen = ++_gen;
  _state = { targetS: upcoming.s, status: 'fetching', ways: [], fetchedAt: 0 };

  Promise.resolve()
    .then(() => fetchCorridor(center.lat, center.lon, bbox))
    .then(json => {
      if(gen !== _gen) return;
      const parsed = parseOverpassWays(json);
      const ghosts = selectGhostWays(parsed, geom, center, bbox);
      applyReady(gen, upcoming.s, ghosts);
    })
    .catch(() => {
      if(gen === _gen){
        _state = { targetS: upcoming.s, status: 'failed', ways: [], fetchedAt: Date.now() };
      }
    });
}

export function getGhostWays(){
  if(!S.ghostRibbons || _state.status !== 'ready') return [];
  return _state.ways;
}

/**
 * Сечения ghost-ленты в камере snap (без Frenet primary).
 * elev = DEM-относительный + layerOffset (visual only).
 */
export function computeGhostSections(way, snap, headingRad, geom, maxDist){
  if(!way?.pts?.length || !snap) return [];
  const elev0 = geom?.elevReady ? interpolateElevAtS(geom, snap.s) : 0;
  const halfW = GHOST_HALF_W;
  const samples = [];
  let segs = 0;

  for(const p of way.pts){
    const c = worldToCamXZ(p.lat, p.lon, snap, headingRad);
    if(c.z < 0.4 || c.z > maxDist) continue;
    let elev = way.layerOff || 0;
    if(geom?.elevReady){
      const proj = projectPointToRoute(geom, p);
      if(proj) elev += interpolateElevAtS(geom, proj.s) - elev0;
    }
    samples.push({ x: c.x, z: c.z, elev, s: c.z });
    if(++segs >= GHOST_MAX_SEGS) break;
  }
  if(samples.length < 2) return [];

  samples.sort((a, b) => a.z - b.z);

  const sections = [];
  let prevNx = null;
  let prevNz = null;
  for(let i = 0; i < samples.length; i++){
    const cur = samples[i];
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(samples.length - 1, i + 1);
    let tx = samples[i1].x - samples[i0].x;
    let tz = samples[i1].z - samples[i0].z;
    const tl = Math.hypot(tx, tz);
    if(tl < 0.08) continue;
    tx /= tl;
    tz /= tl;
    let nx = -tz;
    let nz = tx;
    if(prevNx != null && nx * prevNx + nz * prevNz < 0){
      nx = -nx;
      nz = -nz;
    }
    prevNx = nx;
    prevNz = nz;
    sections.push({
      s: cur.s,
      elev: cur.elev,
      cx: cur.x,
      cz: cur.z,
      lx: cur.x + nx * halfW,
      lz: cur.z + nz * halfW,
      rx: cur.x - nx * halfW,
      rz: cur.z - nz * halfW
    });
  }
  return sections;
}
