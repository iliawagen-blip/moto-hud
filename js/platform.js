import { Capacitor } from '@capacitor/core';

/** Режим симуляции (?sim=1) — подменённый GPS в sim.js */
export function isSim(){ return !!window.__SIM__; }

/** Нативное приложение Capacitor (Android/iOS), не браузер и не сим */
export function isNative(){
  return Capacitor.isNativePlatform() && !isSim();
}

export function isAndroidNative(){
  return isNative() && Capacitor.getPlatform() === 'android';
}
