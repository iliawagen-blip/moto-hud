/**
 * IndexedDB для сохранённых планов поездок.
 */
import { validateTrip, TRIP_MODEL_REV } from './trip-model.js';

const DB_NAME = 'moto-hud-trips';
const DB_VER = 1;
const MAX_TRIPS = 12;

function openDb(){
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

export async function saveTrip(trip){
  validateTrip(trip);
  const rec = { ...trip, version: trip.version || TRIP_MODEL_REV, updatedAt: Date.now() };
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('trips', 'readwrite');
    tx.objectStore('trips').put(rec);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  const all = await listTrips(db);
  if(all.length > MAX_TRIPS){
    const drop = all.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0)).slice(0, all.length - MAX_TRIPS);
    const tx2 = db.transaction('trips', 'readwrite');
    drop.forEach(t => tx2.objectStore('trips').delete(t.id));
  }
  db.close();
  return rec;
}

async function listTrips(db){
  db = db || await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('trips', 'readonly');
    const req = tx.objectStore('trips').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function loadAllTrips(){
  const db = await openDb();
  const rows = await listTrips(db);
  db.close();
  return rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function loadTrip(id){
  const db = await openDb();
  const row = await new Promise((resolve, reject) => {
    const tx = db.transaction('trips', 'readonly');
    const req = tx.objectStore('trips').get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return row || null;
}

export async function deleteTrip(id){
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('trips', 'readwrite');
    tx.objectStore('trips').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadDemoTrip(){
  const r = await fetch('fixtures/trip-jul2026.json');
  if(!r.ok) throw new Error('Демо-план не найден');
  return validateTrip(await r.json());
}
