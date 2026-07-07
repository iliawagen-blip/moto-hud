/** Версия текста отказа от ответственности (при изменении — запросить согласие повторно). */
export const LEGAL_DISCLAIMER_VERSION = 1;

export const LEGAL_STORAGE_KEY = 'moto-hud-legal-consent';

export const OFFER_URL = 'docs/offer.html';
export const DISCLAIMER_URL = 'docs/disclaimer.html';
export const PRIVACY_URL = 'docs/privacy.html';
export const SUPPORT_URL = 'docs/support.html';
export const SBP_PAY_URL = 'https://qr.nspk.ru/AS1A0073KULGI2489639NQM5QPNBUIOH';

import { isNative } from './platform.js';

function readConsent(){
  try{
    const raw = localStorage.getItem(LEGAL_STORAGE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch{
    return null;
  }
}

export function hasValidLegalConsent(){
  const data = readConsent();
  return data?.version === LEGAL_DISCLAIMER_VERSION && typeof data?.ts === 'string';
}

function saveConsent(){
  localStorage.setItem(LEGAL_STORAGE_KEY, JSON.stringify({
    version: LEGAL_DISCLAIMER_VERSION,
    ts: new Date().toISOString()
  }));
}

function showBlockedScreen(){
  document.getElementById('legalModal')?.classList.remove('on');
  document.getElementById('legalBlocked')?.classList.add('on');
  document.body.classList.add('legal-blocked');
}

/** RuStore/APK: без ссылки на оплату в UI (только в описании карточки). */
export function applyStoreLegalUi(){
  if(!isNative()) return;
  const link = document.getElementById('help-support-link');
  const sep = document.getElementById('help-support-sep');
  if(link) link.style.display = 'none';
  if(sep) sep.style.display = 'none';
}

async function onDecline(){
  try{
    const { App } = await import('@capacitor/app');
    const { Capacitor } = await import('@capacitor/core');
    if(Capacitor.isNativePlatform()){
      await App.exitApp();
      return;
    }
  }catch{ /* браузер */ }
  showBlockedScreen();
}

/** Блокирующий экран при первом запуске до согласия с отказом от ответственности. */
export function initLegalConsent(){
  applyStoreLegalUi();

  if(hasValidLegalConsent()) return;

  const modal = document.getElementById('legalModal');
  if(!modal) return;

  modal.classList.add('on');
  document.body.classList.add('legal-gate');

  document.getElementById('legal-accept')?.addEventListener('click', () => {
    saveConsent();
    modal.classList.remove('on');
    document.body.classList.remove('legal-gate');
  }, { once: true });

  document.getElementById('legal-decline')?.addEventListener('click', () => {
    void onDecline();
  }, { once: true });
}
