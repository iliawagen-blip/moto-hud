/**
 * Локальный лог событий настроек (всегда) + запись в HUD-телеметрию при активной сессии.
 */
import telemetry from './telemetry.js';

const RING_KEY = 'moto-hud-settings-events';
const RING_MAX = 200;

export function logSettingsEvent(type, data){
  const rec = { ts: Date.now(), type, ...(data || {}) };
  try{
    const arr = JSON.parse(localStorage.getItem(RING_KEY) || '[]');
    arr.push(rec);
    if(arr.length > RING_MAX) arr.splice(0, arr.length - RING_MAX);
    localStorage.setItem(RING_KEY, JSON.stringify(arr));
  }catch(e){}
  try{
    if(telemetry.isActive?.()) telemetry.log('settings', { subtype: type, ...data });
  }catch(e){}
}

/** Для отладки / экспорта в telemetry UI позже. */
export function getSettingsEventRing(){
  try{
    return JSON.parse(localStorage.getItem(RING_KEY) || '[]');
  }catch(e){
    return [];
  }
}
