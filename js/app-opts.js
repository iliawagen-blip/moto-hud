/**
 * Общие опции панели «⚙ Опции» — загрузка и сохранение в localStorage.
 */
import { S, APP_OPTS_KEY } from './state.js';
import { $ } from './util.js';

export function loadAppOptsFromStorage(){
  try{
    const raw = localStorage.getItem(APP_OPTS_KEY);
    if(!raw) return;
    const o = JSON.parse(raw);
    const setCheck = (id, v) => {
      if(typeof v !== 'boolean') return;
      const el = $(id);
      if(el) el.checked = v;
    };
    const setVal = (id, v) => {
      if(v == null) return;
      const el = $(id);
      if(el) el.value = String(v);
    };
    setCheck('opt-voice', o.voice);
    setCheck('opt-path', o.showPath);
    setCheck('opt-crossings', o.showCrossingContext);
    setCheck('opt-heading', o.showCompass);
    setCheck('opt-cams', o.cams);
    setCheck('opt-back-only', o.backOnly);
    setVal('opt-tol', o.tolerance);
    setVal('opt-nodir', o.noDirPolicy);
    setVal('opt-limit', o.limit);
  }catch(e){}
}

export function saveAppOptsToStorage(){
  try{
    localStorage.setItem(APP_OPTS_KEY, JSON.stringify({
      voice: !!S.voice,
      showPath: !!S.showPath,
      showCrossingContext: S.showCrossingContext !== false,
      showCompass: !!S.showCompass,
      cams: !!S.cams,
      backOnly: !!S.backOnly,
      tolerance: S.tolerance,
      noDirPolicy: S.noDirPolicy,
      limit: S.limit
    }));
  }catch(e){}
}
