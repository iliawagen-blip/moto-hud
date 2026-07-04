/**
 * Опции HUD: расстояние / время / ETA до финиша — загрузка и сохранение.
 */
import { S, HUD_OPTS_KEY, DEFAULT_FUEL_PLANNER_COUNT, MIN_FUEL_PLANNER_COUNT, MAX_FUEL_PLANNER_COUNT } from './state.js';
import { $ } from './util.js';

export function loadHudOptsFromStorage(){
  try{
    const raw = localStorage.getItem(HUD_OPTS_KEY);
    if(!raw) return;
    const o = JSON.parse(raw);
    if(typeof o.showFinishDist === 'boolean'){
      const el = $('opt-finish-dist');
      if(el) el.checked = o.showFinishDist;
    }
    if(typeof o.showFinishTime === 'boolean'){
      const el = $('opt-finish-time');
      if(el) el.checked = o.showFinishTime;
    }
    if(typeof o.showFinishEta === 'boolean'){
      const el = $('opt-finish-eta');
      if(el) el.checked = o.showFinishEta;
    }
    if(typeof o.fuelPlannerCount === 'number'){
      S.fuelPlannerCount = clampFuelPlannerCount(o.fuelPlannerCount);
      const el = $('opt-fuel-count');
      if(el) el.value = String(S.fuelPlannerCount);
    }
  }catch(e){}
}

export function clampFuelPlannerCount(n){
  return Math.max(MIN_FUEL_PLANNER_COUNT, Math.min(MAX_FUEL_PLANNER_COUNT,
    parseInt(n, 10) || DEFAULT_FUEL_PLANNER_COUNT));
}

export function saveHudOptsToStorage(){
  try{
    localStorage.setItem(HUD_OPTS_KEY, JSON.stringify({
      showFinishDist: !!S.showFinishDist,
      showFinishTime: !!S.showFinishTime,
      showFinishEta: !!S.showFinishEta,
      fuelPlannerCount: clampFuelPlannerCount(S.fuelPlannerCount)
    }));
  }catch(e){}
}

/** Показать/скрыть строки панели финиша по опциям */
export function applyFinishInfoVisibility(){
  const panel = $('finish-info');
  if(!panel) return;
  const any = !!(S.showFinishDist || S.showFinishTime || S.showFinishEta);
  panel.classList.toggle('hidden', !any);
  $('fi-dist-line')?.classList.toggle('hidden', !S.showFinishDist);
  $('fi-time-line')?.classList.toggle('hidden', !S.showFinishTime);
  $('fi-eta-line')?.classList.toggle('hidden', !S.showFinishEta);
}
