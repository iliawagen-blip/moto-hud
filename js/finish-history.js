/**
 * Последние 10 финишей (localStorage) — быстрый выбор на setup.
 * @module finish-history
 */
import { S } from './state.js';
import { $, escapeHtml } from './util.js';
import { haversine } from './geo.js';
import { checkStartReady } from './gps.js';

export const FINISH_HIST_KEY = 'moto-hud-finish-history-v1';
export const FINISH_HIST_MAX = 10;
/** Считать тем же финишем, если ближе этого (м). */
const DEDUP_M = 80;

function normalize(raw){
  if(!raw || typeof raw !== 'object') return null;
  const lat = typeof raw.lat === 'number' ? raw.lat : parseFloat(raw.lat);
  const lon = typeof raw.lon === 'number' ? raw.lon : parseFloat(raw.lon);
  if(!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const labelRaw = raw.label || raw.name || raw.title;
  const label = typeof labelRaw === 'string' && labelRaw.trim()
    ? labelRaw.trim().slice(0, 80)
    : (lat.toFixed(5) + ', ' + lon.toFixed(5));
  return {
    lat,
    lon,
    label,
    ts: typeof raw.ts === 'number' ? raw.ts : Date.now()
  };
}

export function loadFinishHistory(){
  try{
    const raw = localStorage.getItem(FINISH_HIST_KEY);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    if(!Array.isArray(arr)) return [];
    return arr.map(normalize).filter(Boolean).slice(0, FINISH_HIST_MAX);
  }catch(e){
    return [];
  }
}

function saveFinishHistory(list){
  try{
    localStorage.setItem(FINISH_HIST_KEY, JSON.stringify(list.slice(0, FINISH_HIST_MAX)));
  }catch(e){}
}

/** Добавить финиш в историю (MRU, дедуп по координатам). */
export function rememberFinish(finish){
  const item = normalize(finish);
  if(!item) return;
  if(item.label === 'Демо') return;
  const list = loadFinishHistory().filter(f => haversine(f, item) > DEDUP_M);
  list.unshift(item);
  saveFinishHistory(list);
  renderFinishHistory();
}

export function applyFinishFromHistory(idx){
  const list = loadFinishHistory();
  const f = list[idx];
  if(!f) return;
  S.finish = { lat: f.lat, lon: f.lon, label: f.label };
  const inp = $('finish-input');
  if(inp){
    inp.value = f.label && !/^-?\d+\.\d+/.test(f.label)
      ? f.lat.toFixed(5) + ', ' + f.lon.toFixed(5) + ' ' + f.label
      : f.lat.toFixed(5) + ', ' + f.lon.toFixed(5);
    inp.dataset.userEdited = '1';
  }
  const st = $('s-finish');
  if(st){
    st.textContent = '✅ ' + f.label + ' (' + f.lat.toFixed(5) + ', ' + f.lon.toFixed(5) + ')';
    st.className = 'status ok';
  }
  $('search-results') && ($('search-results').style.display = 'none');
  rememberFinish(f);
  S.route = null;
  S.routeAlternatives = [];
  S.selectedRouteIdx = 0;
  $('route-export-row')?.classList.add('hidden');
  checkStartReady();
}

export function renderFinishHistory(){
  const box = $('recent-finishes');
  const lbl = $('recent-finishes-lbl');
  if(!box) return;
  const list = loadFinishHistory();
  if(lbl) lbl.hidden = !list.length;
  if(!list.length){
    box.innerHTML = '';
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.innerHTML = list.map((f, i) =>
    '<div class="fav-item">' +
      '<button type="button" class="fav-apply recent-finish-btn" data-idx="' + i + '">' +
        '<span class="fav-name"><span class="fav-emoji">🏁</span>' +
        escapeHtml(f.label) + '</span>' +
      '</button>' +
    '</div>'
  ).join('');
  box.querySelectorAll('.recent-finish-btn').forEach(b => {
    b.addEventListener('click', () => {
      const idx = parseInt(b.getAttribute('data-idx'), 10);
      applyFinishFromHistory(idx);
    });
  });
}

export function initFinishHistory(){
  renderFinishHistory();
}
