import { S, FAV_KEY } from './state.js';
import { $, escapeHtml } from './util.js';
import { startGps, checkStartReady } from './gps.js';
import { buildRoute, loadCameras } from './route.js';
import { invalidateRoute } from './setup.js';
import { onTick, selectQuickFinish } from './hud.js';

const FAV_EMOJIS = ['🏠', '🏢', '⛽', '🍔', '🏍', '🏔', '🏖', '🛠', '🅿', '⭐', '❤', '📍'];

export function loadFavs(){
  try{
    const raw = localStorage.getItem(FAV_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(f =>
      f && typeof f.lat === 'number' && typeof f.lon === 'number' && typeof f.name === 'string'
    ) : [];
  }catch(e){ return []; }
}

function saveFavs(list){
  try{ localStorage.setItem(FAV_KEY, JSON.stringify(list)); }catch(e){}
}

export function renderFavs(){
  const box = $('favs-list');
  const list = loadFavs();
  if(!list.length){
    box.innerHTML = '<div class="favs-empty">Пусто. Задайте финиш (💾) или сохраните точку GPS (📍).</div>';
    return;
  }
  box.innerHTML = list.map(f =>
    '<div class="fav-item">' +
      '<button type="button" class="fav-apply" data-id="' + f.id + '">' +
        '<span class="fav-name"><span class="fav-emoji">' + (f.emoji || '⭐') + '</span>' + escapeHtml(f.name) + '</span>' +
        '<span class="fav-coords">' + f.lat.toFixed(5) + ', ' + f.lon.toFixed(5) + '</span>' +
      '</button>' +
      '<button type="button" class="fav-del" data-del="' + f.id + '" aria-label="Удалить" title="Удалить">✕</button>' +
    '</div>'
  ).join('');
  box.querySelectorAll('.fav-apply').forEach(b => {
    b.addEventListener('click', () => applyFav(b.getAttribute('data-id')));
    let lp = null;
    b.addEventListener('pointerdown', () => {
      lp = setTimeout(() => {
        lp = null;
        const id = b.getAttribute('data-id');
        const fav = loadFavs().find(x => x.id === id);
        if(fav && confirm('Удалить «' + fav.name + '»?')) deleteFav(id);
      }, 700);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => {
      b.addEventListener(ev, () => { if(lp){ clearTimeout(lp); lp = null; } });
    });
  });
  box.querySelectorAll('.fav-del').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
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
  renderFavs();
}

function deleteFav(id){
  saveFavs(loadFavs().filter(f => f.id !== id));
  renderFavs();
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
  renderFavs();

  $('fav-modal-cancel').addEventListener('click', closeFavModal);
  $('fav-modal-ok').addEventListener('click', () => {
    const name = $('fav-name-input').value.trim() || 'Место';
    addFav(name, favModalState.point, favModalState.emoji);
    closeFavModal();
  });

  $('btn-fav-save-finish').addEventListener('click', () => {
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

  $('btn-fav-save-gps').addEventListener('click', () => {
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

  $('btn-fav-export').addEventListener('click', () => {
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

  $('btn-fav-import').addEventListener('click', () => $('fav-file').click());
  $('fav-file').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const imported = JSON.parse(reader.result);
        if(!Array.isArray(imported)) throw new Error('формат');
        const valid = imported.filter(f =>
          f && typeof f.lat === 'number' && typeof f.lon === 'number' && typeof f.name === 'string');
        if(!valid.length){ alert('В файле нет корректных мест'); return; }
        const cur = loadFavs();
        const seen = new Set(cur.map(f => f.lat.toFixed(5) + ',' + f.lon.toFixed(5)));
        let added = 0;
        valid.forEach(f => {
          const key = f.lat.toFixed(5) + ',' + f.lon.toFixed(5);
          if(seen.has(key)) return;
          seen.add(key);
          cur.push({
            id: 'f' + Date.now() + '_' + Math.floor(Math.random() * 100000),
            name: String(f.name).slice(0, 60),
            emoji: typeof f.emoji === 'string' ? f.emoji : '⭐',
            lat: f.lat, lon: f.lon
          });
          added++;
        });
        saveFavs(cur);
        renderFavs();
        alert('Импортировано мест: ' + added + (valid.length - added ? ' (пропущено дублей: ' + (valid.length - added) + ')' : ''));
      }catch(err){
        alert('Не удалось прочитать файл: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // долгий тап по mid-info в HUD — быстрая смена финиша (если есть избранное)
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
