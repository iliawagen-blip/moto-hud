/**
 * Общие опции панели «⚙ Опции» — загрузка и сохранение в localStorage.
 */
import { S, APP_OPTS_KEY, DEFAULT_CAM_SPEED_TOL, DEFAULT_PATH_CHEVRON_MAX, DEFAULT_PATH_MIN_SPEED_KMH } from './state.js';
import { $ } from './util.js';
import { clampPathMinSpeedKmh } from './low-speed-map.js';

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
    setCheck('opt-path-chevrons', o.showPathChevrons !== false);
    setCheck('opt-chevron-labels', o.pathChevronLabels !== false);
    setVal('opt-chevron-max', o.pathChevronMax != null ? o.pathChevronMax : DEFAULT_PATH_CHEVRON_MAX);
    setCheck('opt-low-speed-map', o.lowSpeedMap !== false);
    if(o.pathMinSpeedKmh != null) S.pathMinSpeedKmh = clampPathMinSpeedKmh(o.pathMinSpeedKmh);
    setCheck('opt-heading', o.showCompass);
    setCheck('opt-cams', o.cams);
    setCheck('opt-back-only', o.backOnly);
    setVal('opt-tol', o.tolerance);
    setVal('opt-nodir', o.noDirPolicy);
    setVal('opt-limit', o.userDefaultLimit ?? o.limit);
    if(o.userDefaultLimit != null || o.limit != null){
      S.userDefaultLimit = o.userDefaultLimit ?? o.limit ?? 60;
    }
    if(typeof o.speedLimitDynamic === 'boolean') S.speedLimitDynamic = o.speedLimitDynamic;
    if(o.speedLimitFallback) S.speedLimitFallback = o.speedLimitFallback;
    setCheck('opt-speed-limit-dynamic', o.speedLimitDynamic !== false);
    setVal('opt-speed-limit-fallback', o.speedLimitFallback || 'user-default');
    setCheck('opt-roundabout-schema', o.roundaboutSchema !== false);
    if(typeof o.roundaboutSchema === 'boolean') S.roundaboutSchema = o.roundaboutSchema;
    setVal('opt-cam-speed-tol', o.camSpeedTol != null ? o.camSpeedTol : DEFAULT_CAM_SPEED_TOL);
  }catch(e){}
}

export function saveAppOptsToStorage(){
  try{
    localStorage.setItem(APP_OPTS_KEY, JSON.stringify({
      voice: !!S.voice,
      showPath: !!S.showPath,
      showCrossingContext: S.showCrossingContext !== false,
      showPathChevrons: S.showPathChevrons !== false,
      pathChevronLabels: S.pathChevronLabels !== false,
      pathChevronMax: S.pathChevronMax,
      lowSpeedMap: S.lowSpeedMap !== false,
      pathMinSpeedKmh: clampPathMinSpeedKmh(S.pathMinSpeedKmh),
      showCompass: !!S.showCompass,
      cams: !!S.cams,
      backOnly: !!S.backOnly,
      tolerance: S.tolerance,
      noDirPolicy: S.noDirPolicy,
      limit: S.userDefaultLimit,
      userDefaultLimit: S.userDefaultLimit,
      speedLimitDynamic: S.speedLimitDynamic !== false,
      speedLimitFallback: S.speedLimitFallback,
      roundaboutSchema: S.roundaboutSchema !== false,
      camSpeedTol: S.camSpeedTol
    }));
  }catch(e){}
}
