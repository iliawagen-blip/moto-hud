/**
 * События «Заправился» и калибровка расхода.
 * @module trip-refuel
 */
import { getActiveBikeProfile, saveCustomBikeProfile, getBikeProfile, setActiveBikeId } from './bike-profile.js';

const REFUEL_KEY = 'moto-hud-trip-refuel-v1';

function readAll(){
  try{ return JSON.parse(localStorage.getItem(REFUEL_KEY) || '{}'); }catch(e){ return {}; }
}

function writeAll(o){
  try{ localStorage.setItem(REFUEL_KEY, JSON.stringify(o)); }catch(e){}
}

/** @returns {object[]} */
export function getRefuelEvents(tripId){
  return readAll()[tripId] || [];
}

export function recordRefuel(tripId, { liters, odometerKm, rideKm, lat, lon }){
  if(!tripId || !Number.isFinite(liters) || liters <= 0) throw new Error('Укажите литры');
  const all = readAll();
  const list = all[tripId] || [];
  const ev = {
    liters: Math.round(liters * 10) / 10,
    odometerKm: Number.isFinite(odometerKm) ? odometerKm : null,
    rideKm: Number.isFinite(rideKm) ? rideKm : null,
    lat: lat ?? null,
    lon: lon ?? null,
    at: Date.now()
  };
  list.push(ev);
  all[tripId] = list.slice(-24);
  writeAll(all);
  return ev;
}

/**
 * Калибровка по одометру или по S.distDone между заправками.
 */
export function suggestConsumptionCalibration(tripId){
  const events = getRefuelEvents(tripId);
  if(events.length < 2) return null;
  const a = events[events.length - 2];
  const b = events[events.length - 1];
  let km = null;
  if(a.odometerKm != null && b.odometerKm != null) km = b.odometerKm - a.odometerKm;
  else if(a.rideKm != null && b.rideKm != null) km = b.rideKm - a.rideKm;
  if(km == null || km < 20) return null;
  const liters = b.liters;
  const suggested = Math.round(liters / km * 100 * 10) / 10;
  const profile = getActiveBikeProfile();
  const prev = profile?.consumptionL100?.default ?? 5.5;
  if(Math.abs(suggested - prev) / prev > 0.4) return null;
  return { suggested, prev, km: Math.round(km), liters: Math.round(liters * 10) / 10 };
}

export function applyConsumptionCalibration(suggested){
  const base = getBikeProfile('bike_custom') || getActiveBikeProfile();
  if(!base) return false;
  saveCustomBikeProfile({
    ...base,
    id: 'bike_custom',
    name: 'Свой профиль',
    custom: true,
    consumptionL100: { ...(base.consumptionL100 || {}), default: suggested }
  });
  setActiveBikeId('bike_custom');
  return true;
}

export function clearRefuelEvents(tripId){
  const all = readAll();
  delete all[tripId];
  writeAll(all);
}
