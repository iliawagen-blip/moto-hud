/**
 * Справочник профилей мотоцикла: бак, расход, запас хода.
 * @module bike-profile
 */

export const BIKE_STORAGE_KEY = 'moto-hud-bike-profiles-v1';
export const ACTIVE_BIKE_KEY = 'moto-hud-active-bike-id';

/** @typedef {{ id: string, name: string, tankLiters: number, reserveKm: number, fuelType: string, consumptionL100: object, builtin?: boolean, custom?: boolean }} BikeProfile */

/** @type {BikeProfile[]} */
export const BUILTIN_BIKES = [
  {
    id: 'bike_ktm_1290',
    name: 'KTM 1290 Super Adventure',
    tankLiters: 22,
    reserveKm: 40,
    fuelType: '95',
    builtin: true,
    consumptionL100: { default: 5.2, highway: 5.0, city: 6.5, mountain: 6.5, offroad: 8.0 }
  },
  {
    id: 'bike_yamaha_tracer9',
    name: 'Yamaha Tracer 9 GT',
    tankLiters: 19,
    reserveKm: 35,
    fuelType: '95',
    builtin: true,
    consumptionL100: { default: 5.0, highway: 4.8, city: 5.8, mountain: 6.0, offroad: 7.5 }
  },
  {
    id: 'bike_yamaha_xj6',
    name: 'Yamaha XJ6 Diversion',
    tankLiters: 17,
    reserveKm: 35,
    fuelType: '95',
    builtin: true,
    consumptionL100: { default: 5.0, highway: 4.5, city: 5.8, mountain: 5.5, offroad: 6.5 }
  },
  {
    id: 'bike_bmw_r1250gs',
    name: 'BMW R 1250 GS Adventure',
    tankLiters: 33,
    reserveKm: 40,
    fuelType: '95',
    builtin: true,
    consumptionL100: { default: 5.5, highway: 5.2, city: 6.3, mountain: 6.9, offroad: 8.4 }
  },
  {
    id: 'bike_bmw_r1200gs',
    name: 'BMW R 1200 GS',
    tankLiters: 20,
    reserveKm: 40,
    fuelType: '95',
    builtin: true,
    consumptionL100: { default: 5.6, highway: 5.3, city: 6.4, mountain: 7.0, offroad: 8.5 }
  },
  {
    id: 'bike_enduro_450',
    name: 'Эндуро 450 (бак 8 л)',
    tankLiters: 8,
    reserveKm: 25,
    fuelType: '95',
    builtin: true,
    consumptionL100: { default: 4.5, highway: 4.0, city: 5.0, mountain: 5.5, offroad: 6.5 }
  },
  {
    id: 'bike_custom',
    name: 'Свой профиль',
    tankLiters: 18,
    reserveKm: 40,
    fuelType: '95',
    custom: true,
    builtin: true,
    consumptionL100: { default: 5.5, highway: 5.0, city: 6.5, mountain: 6.5, offroad: 8.0 }
  }
];

function readCustomProfiles(){
  try{
    const raw = localStorage.getItem(BIKE_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch(e){ return []; }
}

function writeCustomProfiles(list){
  try{ localStorage.setItem(BIKE_STORAGE_KEY, JSON.stringify(list)); }catch(e){}
}

export function listBikeProfiles(){
  const savedCustom = readCustomProfiles().find(p => p.id === 'bike_custom');
  return BUILTIN_BIKES.map(p => {
    if(p.id === 'bike_custom' && savedCustom){
      return { ...p, ...savedCustom, id: 'bike_custom', name: 'Свой профиль', custom: true, builtin: true };
    }
    return { ...p };
  });
}

export function getBikeProfile(id){
  if(!id) return null;
  return listBikeProfiles().find(p => p.id === id) || null;
}

export function getActiveBikeId(){
  try{ return localStorage.getItem(ACTIVE_BIKE_KEY) || ''; }catch(e){ return ''; }
}

export function setActiveBikeId(id){
  try{
    if(id) localStorage.setItem(ACTIVE_BIKE_KEY, id);
    else localStorage.removeItem(ACTIVE_BIKE_KEY);
  }catch(e){}
}

export function getActiveBikeProfile(){
  const id = getActiveBikeId();
  if(!id) return null;
  return getBikeProfile(id);
}

/** @param {BikeProfile} profile */
export function saveCustomBikeProfile(profile){
  if(!profile?.id) return;
  const list = readCustomProfiles().filter(p => p.id !== profile.id);
  list.push({
    id: profile.id,
    name: profile.name,
    tankLiters: profile.tankLiters,
    reserveKm: profile.reserveKm,
    fuelType: profile.fuelType || '95',
    consumptionL100: { ...profile.consumptionL100 }
  });
  writeCustomProfiles(list);
}

/** Снимок для meta плана (без служебных полей). */
export function profileSnapshot(profile){
  if(!profile) return null;
  return {
    id: profile.id,
    name: profile.name,
    tankLiters: profile.tankLiters,
    reserveKm: profile.reserveKm,
    fuelType: profile.fuelType,
    consumptionL100: { ...profile.consumptionL100 }
  };
}

function consumption(profile, roadType){
  const c = profile?.consumptionL100;
  if(!c) return 5.5;
  const key = roadType && c[roadType] != null ? roadType : 'default';
  const v = c[key] ?? c.default;
  return Number.isFinite(v) && v > 0 ? v : 5.5;
}

/** Запас хода, км (оценка). */
export function rangeKm(profile, roadType = 'default'){
  if(!profile?.tankLiters) return 0;
  const l100 = consumption(profile, roadType);
  const reserve = profile.reserveKm || 0;
  return Math.max(0, (profile.tankLiters / l100) * 100 - reserve);
}

/** Литры на дистанцию, км. */
export function fuelLitersForKm(km, profile, roadType = 'default'){
  if(!profile || !Number.isFinite(km) || km <= 0) return 0;
  return km * consumption(profile, roadType) / 100;
}

export function formatBikeRangeLine(profile, roadType = 'default'){
  if(!profile) return '';
  const r = Math.round(rangeKm(profile, roadType));
  const l100 = consumption(profile, roadType);
  return `Запас ~${r} км · ${profile.tankLiters} л · ${l100} л/100 · АИ-${profile.fuelType || '95'}`;
}
