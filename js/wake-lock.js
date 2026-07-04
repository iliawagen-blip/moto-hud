/**
 * Wake-lock: Screen Wake Lock API (PWA) + KeepAwake (Capacitor Android).
 */
import { S } from './state.js';
import { isNative } from './platform.js';

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
