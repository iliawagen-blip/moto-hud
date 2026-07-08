import { S, FAV_KEY } from './state.js';
import { $, escapeHtml } from './util.js';
import { startGps, checkStartReady } from './gps.js';
import { buildRoute, loadCameras } from './route.js';
import { invalidateRoute } from './setup.js';
import { onTick, selectQuickFinish } from './hud.js';

const FAV_EMOJIS = ['🏠', '🏢', '⛽', '🍔', '🏍', '🏔', '🏖', '🛠', '🅿', '⭐', '❤', '📍'];
const LEGACY_FAV_KEYS = ['moto-hud-favs', 'moto-hud-places', 'mh-favs'];

function normalizeFav(raw, idx){
  if(!raw || typeof raw !== 'object') return null;
  const lat = typeof raw.lat === 'number' ? raw.lat : parseFloat(raw.lat);
  const lon = typeof raw.lon === 'number' ? raw.lon : parseFloat(raw.lon);
  if(!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const nameRaw = raw.name || raw.label || raw.title || raw.display_name;
  const name = typeof nameRaw === 'string' && nameRaw.trim()
    ? nameRaw.trim().slice(0, 60)
    : 'Место';
  return {
    id: typeof raw.id === 'string' && raw.id
      ? raw.id
      : 'f' + idx + '_' + Math.round(lat * 1e5) + '_' + Math.round(lon * 1e5),
    name,
    emoji: typeof raw.emoji === 'string' && raw.emoji ? raw.emoji : '⭐',
    lat,
    lon
  };
}

function readFavsFromKey(key){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    if(!Array.isArray(arr)) return [];
    return arr.map((f, i) => normalizeFav(f, i)).filter(Boolean);
  }catch(e){ return []; }
}

export function loadFavs(){
  let list = readFavsFromKey(FAV_KEY);
  if(!list.length){
    for(const key of LEGACY_FAV_KEYS){
      if(key === FAV_KEY) continue;
      const legacy = readFavsFromKey(key);
      if(legacy.length){
        list = legacy;
        saveFavs(list);
        break;
      }
    }
  }
  return list;
}

function saveFavs(list){
  try{ localStorage.setItem(FAV_KEY, JSON.stringify(list)); }catch(e){}
}

function favNameHtml(f){
  return '<span class="fav-name"><span class="fav-emoji">' + (f.emoji || '⭐') + '</span>' +
    escapeHtml(f.name) + '</span>';
}

const FAV_QUICK_MAX = 5;

function refreshFavLists(){
  renderFavs();
  renderFavsEdit();
}

export function openFavsManageModal(){
  renderFavsEdit();
  $('favsManageModal')?.classList.add('on');
}

export function closeFavsManageModal(){
  $('favsManageModal')?.classList.remove('on');
}

/** Быстрый выбор финиша — без удаления */
export function renderFavs(){
  const box = $('favs-list');
  if(!box) return;
  const list = loadFavs();
  if(!list.length){
    box.innerHTML = '<div class="favs-empty">Пусто. Нажмите «Управление» чтобы добавить места.</div>';
    return;
  }
  const shown = list.slice(0, FAV_QUICK_MAX);
  let html = shown.map(f =>
    '<div class="fav-item">' +
      '<button type="button" class="fav-apply" data-id="' + f.id + '">' +
        favNameHtml(f) +
      '</button>' +
    '</div>'
  ).join('');
  if(list.length > FAV_QUICK_MAX){
    html += '<div class="favs-more hint">ещё ' + (list.length - FAV_QUICK_MAX) + ' в управлении</div>';
  }
  box.innerHTML = html;
  box.querySelectorAll('.fav-apply').forEach(b => {
    b.addEventListener('click', () => applyFav(b.getAttribute('data-id')));
  });
}

/** Редактирование в настройках — с удалением */
function renderFavsEdit(){
  const box = $('favs-edit-list');
  if(!box) return;
  const list = loadFavs();
  if(!list.length){
    box.innerHTML = '<div class="favs-empty">Нет сохранённых мест.</div>';
    return;
  }
  box.innerHTML = list.map(f =>
    '<div class="fav-item-edit">' +
      '<div class="fav-edit-info">' + favNameHtml(f) + '</div>' +
      '<button type="button" class="fav-del" data-del="' + f.id + '" aria-label="Удалить" title="Удалить">✕</button>' +
    '</div>'
  ).join('');
  box.querySelectorAll('.fav-del').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-del');
      const fav = loadFavs().find(x => x.id === id);
      if(fav && confirm('Удалить «' + fav.name + '»?')) deleteFav(id);
    });
  });
}

function addFav(name, point, emoji){
  if(!point || typeof point.lat !== 'number' || typeof point.lon !== 'number') return;
  const list = loadFavs();
  list.push({
    id: 'f' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: (name || 'Место').trim().slice(0, 60) || 'Место',
    emoji: emoji || '⭐',
    lat: point.lat,
    lon: point.lon
  });
  saveFavs(list);
  refreshFavLists();
}

function deleteFav(id){
  saveFavs(loadFavs().filter(f => f.id !== id));
  refreshFavLists();
}

function applyFav(id){
  const fav = loadFavs().find(f => f.id === id);
  if(!fav) return;
  S.finish = { lat: fav.lat, lon: fav.lon, label: fav.name };
  $('s-finish').textContent = '✅ ' + (fav.emoji || '⭐') + ' ' + fav.name + ' (' + fav.lat.toFixed(5) + ', ' + fav.lon.toFixed(5) + ')';
  $('s-finish').className = 'status ok';
  $('finish-input').value = fav.lat + ', ' + fav.lon;
  $('search-results').style.display = 'none';
  invalidateRoute();
  checkStartReady();
}

let favModalState = { point: null, emoji: '⭐' };

function openFavModal(defaultName, point){
  if(!point){ alert('Нет точки для сохранения'); return; }
  favModalState = { point, emoji: '⭐' };
  const row = $('emoji-row');
  row.innerHTML = FAV_EMOJIS.map(e =>
    '<button type="button" data-e="' + e + '"' + (e === '⭐' ? ' class="sel"' : '') + '>' + e + '</button>'
  ).join('');
  row.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      favModalState.emoji = b.getAttribute('data-e');
      row.querySelectorAll('button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
    });
  });
  $('fav-name-input').value = defaultName || '';
  $('favModal').classList.add('on');
  setTimeout(() => $('fav-name-input').focus(), 100);
}

function closeFavModal(){ $('favModal').classList.remove('on'); }

function openQuickFinish(){
  const box = $('qf-list');
  const list = loadFavs();
  if(!list.length){
    box.innerHTML = '<div class="qf-empty">NO SAVED PLACES<br>Сохраните места в настройках</div>';
  } else {
    box.innerHTML = list.map(f =>
      '<button class="qf-item" data-id="' + f.id + '">' +
        (f.emoji || '⭐') + ' ' + escapeHtml(f.name) +
        '<span class="c">' + f.lat.toFixed(4) + ', ' + f.lon.toFixed(4) + '</span>' +
      '</button>'
    ).join('');
    box.querySelectorAll('.qf-item').forEach(b => {
      b.addEventListener('click', () => {
        selectQuickFinish(b.getAttribute('data-id'), loadFavs, async () => {
          await buildRoute();
          loadCameras();
        });
      });
    });
  }
  $('quickFinish').classList.add('on');
}

export function initFavorites(){
  refreshFavLists();

  $('btn-favs-manage')?.addEventListener('click', () => openFavsManageModal());
  $('favs-manage-close')?.addEventListener('click', () => closeFavsManageModal());
  $('favs-manage-backdrop')?.addEventListener('click', () => closeFavsManageModal());

  $('fav-modal-cancel')?.addEventListener('click', closeFavModal);
  $('fav-modal-ok')?.addEventListener('click', () => {
    const name = $('fav-name-input').value.trim() || 'Место';
    addFav(name, favModalState.point, favModalState.emoji);
    closeFavModal();
  });

  $('btn-fav-save-finish')?.addEventListener('click', () => {
    if(!S.finish){
      $('s-finish').textContent = '❌ Сначала задайте финиш, потом сохраните';
      $('s-finish').className = 'status err';
      return;
    }
    const defaultName = S.finish.label && !/^Финиш|^Координаты/.test(S.finish.label)
      ? S.finish.label.split(',')[0]
      : '';
    openFavModal(defaultName, { lat: S.finish.lat, lon: S.finish.lon });
  });

  $('btn-fav-save-gps')?.addEventListener('click', () => {
    if(S.gps){
      openFavModal('', { lat: S.gps.lat, lon: S.gps.lon });
      return;
    }
    $('s-gps').textContent = '⏳ GPS…';
    $('s-gps').className = 'chip';
    const check = setInterval(() => {
      if(S.gps){
        clearInterval(check);
        openFavModal('', { lat: S.gps.lat, lon: S.gps.lon });
      }
    }, 500);
    setTimeout(() => clearInterval(check), 20000);
    startGps();
  });

  $('btn-fav-export')?.addEventListener('click', () => {
    const list = loadFavs();
    if(!list.length){ alert('Нет мест для экспорта'); return; }
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'moto-hud-места.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $('btn-fav-import')?.addEventListener('click', () => $('fav-file')?.click());
  $('fav-file')?.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const imported = JSON.parse(reader.result);
        if(!Array.isArray(imported)) throw new Error('format');
        const valid = imported.map((f, i) => normalizeFav(f, i)).filter(Boolean);
        if(!valid.length){ alert('В файле нет корректных мест'); return; }
        const cur = loadFavs();
        const seen = new Set(cur.map(f => f.lat.toFixed(5) + ',' + f.lon.toFixed(5)));
        let added = 0;
        valid.forEach(f => {
          const key = f.lat.toFixed(5) + ',' + f.lon.toFixed(5);
          if(seen.has(key)) return;
          seen.add(key);
          cur.push(f);
          added++;
        });
        saveFavs(cur);
        refreshFavLists();
        alert('Импортировано мест: ' + added + (valid.length - added ? ' (пропущено дублей: ' + (valid.length - added) + ')' : ''));
      }catch(err){
        alert('Не удалось прочитать файл: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  const mid = $('mid-info');
  if(mid){
    let pressTimer = null;
    mid.addEventListener('pointerdown', () => {
      if(!$('hud').classList.contains('on')) return;
      pressTimer = setTimeout(openQuickFinish, 600);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => {
      mid.addEventListener(ev, () => { if(pressTimer){ clearTimeout(pressTimer); pressTimer = null; } });
    });
  }
}
