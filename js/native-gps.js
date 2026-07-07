import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { registerPlugin } from '@capacitor/core';
import { isAndroidNative } from './platform.js';

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

let setupWatchId = null;
let navWatcherId = null;

function mapCapPosition(pos){
  const c = pos.coords;
  const fix = {
    lat: c.latitude,
    lon: c.longitude,
    speed: (c.speed != null && !isNaN(c.speed) && c.speed >= 0) ? c.speed : null,
    heading: c.heading == null || isNaN(c.heading) ? null : c.heading,
    acc: c.accuracy,
    ts: pos.timestamp
  };
  return tagFixQuality(fix);
}

function mapBgLocation(loc){
  const fix = {
    lat: loc.latitude,
    lon: loc.longitude,
    speed: (loc.speed != null && !isNaN(loc.speed) && loc.speed >= 0) ? loc.speed : null,
    heading: loc.bearing == null || isNaN(loc.bearing) ? null : loc.bearing,
    acc: loc.accuracy,
    ts: loc.time,
    provider: loc.provider || null
  };
  return tagFixQuality(fix);
}

/** Сетевой/грубый fix — для cold-start фильтра */
function tagFixQuality(fix){
  const acc = fix.acc;
  if(acc == null) return fix;
  if(acc > 80 || fix.provider === 'network') fix.provider = 'network';
  else if(acc > 40) fix.lowAccuracy = true;
  return fix;
}

export async function ensureNativePermissions(forNavigation){
  const geo = await Geolocation.requestPermissions();
  if(geo.location === 'denied' || geo.location === 'prompt-with-rationale'){
    throw new Error('Нет доступа к геолокации');
  }
  if(forNavigation && isAndroidNative()){
    try{ await LocalNotifications.requestPermissions(); }catch(e){}
  }
}

export async function startSetupGps(onFix, onError){
  await stopSetupGps();
  await ensureNativePermissions(false);
  setupWatchId = await Geolocation.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 1000
    },
    (pos, err) => {
      if(err){ onError(err); return; }
      if(pos) onFix(mapCapPosition(pos));
    }
  );
}

export async function stopSetupGps(){
  if(setupWatchId){
    try{ await Geolocation.clearWatch({ id: setupWatchId }); }catch(e){}
    setupWatchId = null;
  }
}

export async function startNavGps(onFix, onError){
  await stopNavGps();
  await stopSetupGps();
  await ensureNativePermissions(true);
  navWatcherId = await BackgroundGeolocation.addWatcher(
    {
      backgroundTitle: 'Мото ИЛС — навигация',
      backgroundMessage: 'Навигация активна. Не закрывайте уведомление.',
      requestPermissions: false,
      stale: false,
      distanceFilter: 0
    },
    (location, error) => {
      if(error){
        if(error.code === 'NOT_AUTHORIZED'){
          onError(new Error('Нет доступа к геолокации'));
          BackgroundGeolocation.openSettings?.();
        } else {
          onError(error);
        }
        return;
      }
      if(location) onFix(mapBgLocation(location));
    }
  );
}

export async function stopNavGps(){
  if(navWatcherId){
    try{
      await BackgroundGeolocation.removeWatcher({ id: navWatcherId });
    }catch(e){}
    navWatcherId = null;
  }
}

export async function stopAllNativeGps(){
  await stopNavGps();
  await stopSetupGps();
}
