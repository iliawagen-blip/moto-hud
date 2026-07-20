import { S } from './state.js';
import { $ } from './util.js';

/** Обновление индикаторов загрузки камер (setup + HUD), по аналогии с GPS */
export function updateCamStatusUI(){
  const st = S.camLoadStatus || 'idle';
  const n = S.cameras?.length || 0;
  const enabled = !!S.cams;

  const chip = $('s-cams');
  if(chip){
    if(!enabled){
      chip.textContent = '📷 выкл';
      chip.className = 'chip';
      chip.title = 'Камеры отключены в опциях';
    } else if(st === 'loading'){
      chip.textContent = '📷 …';
      chip.className = 'chip';
      chip.title = 'Загрузка камер по маршруту…';
    } else if(st === 'ok' || st === 'stale'){
      chip.textContent = '📷 ' + n + (st === 'stale' ? '*' : '');
      chip.className = 'chip ok';
      chip.title = st === 'stale'
        ? 'Камеры из кэша (Overpass недоступен): ' + n
        : 'Камер на маршруте: ' + n;
    } else if(st === 'err'){
      chip.textContent = '📷 ✕';
      chip.className = 'chip err';
      chip.title = 'Камеры не загрузились';
    } else {
      chip.textContent = '📷 —';
      chip.className = 'chip';
      chip.title = 'Камеры по маршруту';
    }
  }

  const wrap = $('cam-status-wrap');
  const dot = $('cam-dot');
  const txt = $('cam-txt');
  if(!wrap || !dot || !txt) return;

  if(!enabled){
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');

  dot.classList.remove('ok', 'err');
  if(st === 'loading'){
    txt.textContent = 'CAM…';
    wrap.title = 'Загрузка камер…';
  } else if(st === 'ok' || st === 'stale'){
    dot.classList.add('ok');
    txt.textContent = 'CAM ' + n + (st === 'stale' ? '*' : '');
    wrap.title = st === 'stale'
      ? 'Камеры из кэша: ' + n
      : 'Камер на маршруте: ' + n;
  } else if(st === 'err'){
    dot.classList.add('err');
    txt.textContent = 'CAM ✕';
    wrap.title = 'Камеры не загрузились';
  } else {
    txt.textContent = 'CAM';
    wrap.title = 'Камеры по маршруту';
  }
}
