/**
 * Wake-lock: Screen Wake Lock API (PWA) + KeepAwake (Capacitor Android).
 */
import { S } from './state.js';
import { $ } from './util.js';
import { isNative } from './platform.js';
import telemetry from './telemetry.js';

let _nativeAwake = false;

export async function acquireWakeLock(){
  try{
    if(isNative()){
      const { KeepAwake } = await import('@capacitor-community/keep-awake');
      await KeepAwake.keepAwake();
      _nativeAwake = true;
      return;
    }
    if('wakeLock' in navigator){
      S.wakeLock = await navigator.wakeLock.request('screen');
      S.wakeLock.addEventListener?.('release', () => {
        telemetry.log('sys', { sub: 'wakelock_lost' });
      });
    }
  }catch(e){
    console.warn('Wake-lock:', e);
  }
}

export async function releaseWakeLock(){
  try{
    if(_nativeAwake && isNative()){
      const { KeepAwake } = await import('@capacitor-community/keep-awake');
      await KeepAwake.allowSleep();
      _nativeAwake = false;
    }
  }catch(e){}
  if(S.wakeLock){
    try{ S.wakeLock.release(); }catch(e){}
    S.wakeLock = null;
  }
}

/** Повторный запрос wake-lock после visibility (Android/PWA теряют при сворачивании). */
export function initWakeLockResume(){
  if(typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState !== 'visible') return;
    if(!$('hud')?.classList.contains('on')) return;
    acquireWakeLock();
  });
}
