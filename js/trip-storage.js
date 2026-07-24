/**
 * IndexedDB для сохранённых планов поездок (+ fallback localStorage на file://).
 */
import { validateTrip, TRIP_MODEL_REV } from './trip-model.js';

const DB_NAME = 'moto-hud-trips';
const DB_VER = 1;
const MAX_TRIPS = 12;
const LS_KEY = 'moto-hud-trips-v1';

let _useLocal = false;

function openDb(){
  if(_useLocal) return Promise.reject(new Error('localStorage mode'));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains('trips')){
        db.createObjectStore('trips', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function readLsTrips(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch(e){
    return [];
  }
}

function writeLsTrips(trips){
  localStorage.setItem(LS_KEY, JSON.stringify(trips.slice(0, MAX_TRIPS)));
}

async function saveTripIdb(rec){
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('trips', 'readwrite');
    tx.objectStore('trips').put(rec);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  const all = await listTripsIdb(db);
  if(all.length > MAX_TRIPS){
    const drop = all.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0)).slice(0, all.length - MAX_TRIPS);
    const tx2 = db.transaction('trips', 'readwrite');
    drop.forEach(t => tx2.objectStore('trips').delete(t.id));
  }
  db.close();
}

async function listTripsIdb(db){
  db = db || await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('trips', 'readonly');
    const req = tx.objectStore('trips').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTrip(trip){
  validateTrip(trip);
  const rec = { ...trip, version: trip.version || TRIP_MODEL_REV, updatedAt: Date.now() };
  if(_useLocal || location.protocol === 'file:'){
    _useLocal = true;
    const all = readLsTrips().filter(t => t.id !== rec.id);
    all.unshift(rec);
    writeLsTrips(all);
    return rec;
  }
  try{
    await saveTripIdb(rec);
    return rec;
  }catch(e){
    console.warn('trip IDB → localStorage', e);
    _useLocal = true;
    const all = readLsTrips().filter(t => t.id !== rec.id);
    all.unshift(rec);
    writeLsTrips(all);
    return rec;
  }
}

export async function loadAllTrips(){
  if(_useLocal || location.protocol === 'file:'){
    _useLocal = true;
    return readLsTrips().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
  try{
    const db = await openDb();
    const rows = await listTripsIdb(db);
    db.close();
    return rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }catch(e){
    console.warn('trip load IDB → localStorage', e);
    _useLocal = true;
    return readLsTrips().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
}

export async function loadTrip(id){
  if(_useLocal || location.protocol === 'file:'){
    return readLsTrips().find(t => t.id === id) || null;
  }
  try{
    const db = await openDb();
    const row = await new Promise((resolve, reject) => {
      const tx = db.transaction('trips', 'readonly');
      const req = tx.objectStore('trips').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return row || null;
  }catch(e){
    _useLocal = true;
    return readLsTrips().find(t => t.id === id) || null;
  }
}

export async function deleteTrip(id){
  if(_useLocal || location.protocol === 'file:'){
    writeLsTrips(readLsTrips().filter(t => t.id !== id));
    return;
  }
  try{
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('trips', 'readwrite');
      tx.objectStore('trips').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }catch(e){
    _useLocal = true;
    writeLsTrips(readLsTrips().filter(t => t.id !== id));
  }
}

export async function loadDemoTrip(){
  const r = await fetch('fixtures/trip-jul2026.json');
  if(!r.ok) throw new Error('Демо-план недоступен (нужен http:// или npm run dev, не file://)');
  return validateTrip(await r.json());
}

export async function loadAug2026Trip(){
  const r = await fetch('fixtures/trip-aug2026.json');
  if(!r.ok) throw new Error('План «Август F7» недоступен (нужен http:// или npm run dev, не file://)');
  return validateTrip(await r.json());
}
