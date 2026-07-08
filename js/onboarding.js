/**
 * Онбординг после legal: камеры/лимит и упрощённый первый экран setup.
 */
import { $ } from './util.js';
import { hasValidLegalConsent } from './legal-consent.js';
import { saveAppOptsToStorage } from './app-opts.js';

const ONBOARD_KEY = 'moto-hud-onboarding-v1';
const FIRST_RUN_CLASS = 'setup-first-run';

function isDone(){
  try{ return localStorage.getItem(ONBOARD_KEY) === '1'; }catch(e){ return false; }
}

function markDone(){
  try{ localStorage.setItem(ONBOARD_KEY, '1'); }catch(e){}
  document.body.classList.remove(FIRST_RUN_CLASS);
  $('onboarding-modal')?.classList.remove('on');
  import('./telemetry-ask.js').then(m => {
    setTimeout(() => m.maybeShowTelemetryAsk(), 450);
  }).catch(() => {});
}

function applyFirstRunLayout(){
  document.body.classList.add(FIRST_RUN_CLASS);
  document.querySelectorAll('#setup .setup-details').forEach(det => { det.open = false; });
}

function bindCamOnboarding(persistFromDom){
  const modal = $('onboarding-modal');
  if(!modal) return;

  const backYes = $('onboard-back-yes');
  const backNo = $('onboard-back-no');
  const limit = $('onboard-limit');
  const limitVal = $('onboard-limit-val');

  limit?.addEventListener('input', () => {
    if(limitVal) limitVal.textContent = limit.value;
  });

  $('onboarding-skip')?.addEventListener('click', () => markDone());
  $('onboarding-save')?.addEventListener('click', () => {
    const backOnly = $('opt-back-only');
    const limitEl = $('opt-limit');
    if(backOnly) backOnly.checked = backYes?.classList.contains('active') ?? true;
    if(limitEl && limit) limitEl.value = limit.value;
    if(typeof persistFromDom === 'function') persistFromDom();
    else saveAppOptsToStorage();
    markDone();
  });

  backYes?.addEventListener('click', () => {
    backYes.classList.add('active');
    backNo?.classList.remove('active');
  });
  backNo?.addEventListener('click', () => {
    backNo.classList.add('active');
    backYes?.classList.remove('active');
  });
  backYes?.classList.add('active');
}

/** Запуск после legal (если согласие уже есть — сразу при boot). */
export function initOnboarding(persistFromDom){
  if(!hasValidLegalConsent()) return;
  if(isDone()) return;

  applyFirstRunLayout();
  const modal = $('onboarding-modal');
  if(modal){
    modal.classList.add('on');
    bindCamOnboarding(persistFromDom);
  }
}
