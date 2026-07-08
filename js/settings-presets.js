/**
 * Пресеты настроек: Город / Трасса / Тур.
 */
import { $ } from './util.js';
import { logSettingsEvent } from './settings-telemetry.js';

export const PRESET_IDS = ['city', 'highway', 'tour'];

const PRESETS = {
  city: {
    label: 'Город',
    values: {
      'opt-voice': true,
      'opt-cams': true,
      'opt-back-only': true,
      'opt-path': false,
      'opt-crossings': true,
      'opt-elev-profile': false,
      'opt-curve-warn': true,
      'opt-curve-strict': 'strict',
      'opt-limit': 60,
      'opt-cam-speed-tol': 10,
      'opt-hud-status-mode': 'tap',
      'opt-hud-finish-mode': 'tap'
    }
  },
  highway: {
    label: 'Трасса',
    values: {
      'opt-voice': true,
      'opt-cams': true,
      'opt-back-only': true,
      'opt-path': true,
      'opt-crossings': true,
      'opt-elev-profile': false,
      'opt-curve-warn': true,
      'opt-curve-strict': 'normal',
      'opt-limit': 90,
      'opt-cam-speed-tol': 15,
      'opt-hud-status-mode': 'tap',
      'opt-hud-finish-mode': 'always'
    }
  },
  tour: {
    label: 'Тур',
    values: {
      'opt-voice': true,
      'opt-cams': true,
      'opt-back-only': false,
      'opt-path': true,
      'opt-crossings': true,
      'opt-elev-profile': true,
      'opt-curve-warn': true,
      'opt-curve-strict': 'relaxed',
      'opt-limit': 90,
      'opt-cam-speed-tol': 20,
      'opt-hud-status-mode': 'tap',
      'opt-hud-finish-mode': 'tap'
    }
  }
};

function setOptDom(id, value){
  const el = $(id);
  if(!el) return;
  if(el.type === 'checkbox') el.checked = !!value;
  else el.value = String(value);
}

/** Применить значения пресета к DOM (без сохранения). */
export function applyPresetToDom(presetId){
  const p = PRESETS[presetId];
  if(!p) return false;
  for(const [id, val] of Object.entries(p.values)) setOptDom(id, val);
  return true;
}

export function getPresetLabel(presetId){
  return PRESETS[presetId]?.label || presetId;
}

export function initSettingsPresets(onApplied){
  document.querySelectorAll('[data-preset]').forEach(btn => {
    if(btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-preset');
      const p = PRESETS[id];
      if(!p) return;
      if(!confirm('Заменить текущие настройки пресетом «' + p.label + '»?')) return;
      applyPresetToDom(id);
      try{ localStorage.setItem('moto-hud-preset-applied', id); }catch(e){}
      logSettingsEvent('preset_apply', { preset: id });
      if(typeof onApplied === 'function') onApplied(id);
    });
  });
}
