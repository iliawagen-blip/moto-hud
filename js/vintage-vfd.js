/**
 * Винтаж: VFD-классы DOM (без rAF-артефактов).
 */
import { $ } from './util.js';

/** Подписка на смену темы */
export function initVintageVfd(){
  document.addEventListener('themechange', syncVintageVfdDomClasses);
  syncVintageVfdDomClasses();
}

/** Классы emissive — только theme-vintage */
export function syncVintageVfdDomClasses(){
  const vintage = document.documentElement.classList.contains('theme-vintage');
  const speedVal = $('v-speed');
  const speedGhost = $('speed-ghost');
  const mdistInner = document.querySelector('.mdist-inner');

  if(speedVal) speedVal.classList.toggle('vfd-emissive-cyan', vintage);
  if(speedGhost && vintage) speedGhost.textContent = '888';
  if(mdistInner) mdistInner.classList.toggle('vfd-emissive-cyan', vintage);
}

/** @deprecated no-op, совместимость с hud.js */
export function resetVintageVfd(){}
