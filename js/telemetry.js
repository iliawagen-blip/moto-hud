/**
 * Телеметрия тестовых поездок: буфер в памяти, батч-flush в IndexedDB, экспорт JSONL.
 * Вызовы log/mark — no-op если сессия не активна.
 */
import { S } from './state.js';

const DB_NAME = 'moto-telemetry';
const DB_VER = 1;
const MAX_SESSIONS = 20;
const FLUSH_MS = 15000;
const ENABLE_KEY = 'moto-hud-telemetry-enabled';
const APP_VERSION = '1.0.0';

/** @type {IDBDatabase | null} */
let _db = null;
/** @type {boolean} */
let _active = false;
/** @type {string | null} */
let _sessionId = null;
/** @type {number} */
let _sessionStart = 0;
/** @type {Array<{ sessionId: string, ev: object }>} */
let _buffer = [];
/** @type {number | null} */
let _flushTimer = null;
/** @type {number | null} */
let _batteryTimer = null;
/** @type {number | null} */
let _perfTimer = null;
/** @type {number | null} */
let _lastSnapS0 = null;

let _perfFrames = 0;
let _perfSum = 0;
let _perfOver32 = 0;
let _perfLastTs = 0;

function r6(n){
  if(n == null || !Number.isFinite(n)) return null;
  return Math.round(n * 1e6) / 1e6;
}
function r2(n){
  if(n == null || !Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function isEnabledPref(){
  try{
    if(new URLSearchParams(location.search).get('telemetry') === '1') return true;
    return localStorage.getItem(ENABLE_KEY) === '1';
  }catch(e){ return false; }
}

function setEnabledPref(on){
  try{ localStorage.setItem(ENABLE_KEY, on ? '1' : '0'); }catch(e){}
}

function openDb(){
  if(_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains('sessions')){
        db.createObjectStore('sessions', { keyPath: 'id' });
      }
      if(!db.objectStoreNames.contains('events')){
        const ev = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        ev.createIndex('sessionId', 'sessionId', { unique: false });
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode){
  return _db.transaction(store, mode).objectStore(store);
}

async function putSession(rec){
  await openDb();
  return new Promise((resolve, reject) => {
    const r = tx('sessions', 'readwrite').put(rec);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

async function getSession(id){
  await openDb();
  return new Promise((resolve, reject) => {
    const r = tx('sessions', 'readonly').get(id);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}

async function listSessionsRaw(){
  await openDb();
  return new Promise((resolve, reject) => {
    const r = tx('sessions', 'readonly').getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}

async function deleteSessionData(id){
  await openDb();
  return new Promise((resolve, reject) => {
    const t = _db.transaction(['sessions', 'events'], 'readwrite');
    t.objectStore('sessions').delete(id);
    const idx = t.objectStore('events').index('sessionId');
    const range = IDBKeyRange.only(id);
    const cur = idx.openCursor(range);
    cur.onsuccess = e => {
      const c = e.target.result;
      if(c){ c.delete(); c.continue(); }
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

async function pruneOldSessions(){
  const all = await listSessionsRaw();
  all.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
  while(all.length > MAX_SESSIONS){
    const drop = all.pop();
    if(drop?.id) await deleteSessionData(drop.id);
  }
}

async function markDirtyIncomplete(){
  try{
    const all = await listSessionsRaw();
    for(const s of all){
      if(!s.endedAt && !s.dirty){
        s.dirty = true;
        await putSession(s);
      }
    }
  }catch(e){ console.warn('telemetry dirty scan:', e); }
}

async function flushBuffer(force){
  if(!_buffer.length && !force) return;
  const batch = _buffer.splice(0, _buffer.length);
  if(!batch.length) return;
  await openDb();
  await new Promise((resolve, reject) => {
    const t = _db.transaction('events', 'readwrite');
    const st = t.objectStore('events');
    for(const row of batch){
      st.add({ sessionId: row.sessionId, ...row.ev });
    }
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  if(_sessionId){
    const sess = await getSession(_sessionId);
    if(sess){
      sess.eventCount = (sess.eventCount || 0) + batch.length;
      const marks = batch.filter(b => b.ev.type === 'mark').length;
      if(marks) sess.markCount = (sess.markCount || 0) + marks;
      await putSession(sess);
    }
  }
}

function scheduleFlush(){
  if(_flushTimer) return;
  _flushTimer = setInterval(() => {
    flushBuffer(false).catch(e => console.warn('telemetry flush:', e));
  }, FLUSH_MS);
}

function stopTimers(){
  if(_flushTimer){ clearInterval(_flushTimer); _flushTimer = null; }
  if(_batteryTimer){ clearInterval(_batteryTimer); _batteryTimer = null; }
  if(_perfTimer){ clearInterval(_perfTimer); _perfTimer = null; }
}

function startSysTimers(){
  stopTimers();
  scheduleFlush();
  _batteryTimer = setInterval(() => {
    if(!_active) return;
    if(navigator.getBattery){
      navigator.getBattery().then(b => {
        log('sys', { sub: 'battery', level: r2(b.level * 100), charging: !!b.charging });
      }).catch(() => {});
    }
  }, 60000);
  _perfTimer = setInterval(() => flushPerfAggregate(), 30000);
}

function relT(){
  return _sessionStart ? Date.now() - _sessionStart : 0;
}

function pushEvent(type, data){
  if(!_active || !_sessionId) return;
  const ev = { t: relT(), type, ...data };
  _buffer.push({ sessionId: _sessionId, ev });
}

function log(type, data){
  if(!_active) return;
  pushEvent(type, data || {});
}

function flushPerfAggregate(){
  if(!_active || !_perfFrames) return;
  log('perf', {
    frames: _perfFrames,
    avg_ms: r2(_perfSum / _perfFrames),
    frames_over_32ms: _perfOver32
  });
  _perfFrames = 0;
  _perfSum = 0;
  _perfOver32 = 0;
  _perfLastTs = 0;
}

function tickPerfFrame(){
  if(!_active) return;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if(_perfLastTs){
    const dt = now - _perfLastTs;
    _perfFrames++;
    _perfSum += dt;
    if(dt > 32) _perfOver32++;
  }
  _perfLastTs = now;
}

function logSnapFromResult(snap){
  if(!_active || !snap) return;
  const s0 = r2(snap.s);
  const latOff = r2(snap.lateral);
  let jump = false;
  if(_lastSnapS0 != null && s0 != null && Math.abs(s0 - _lastSnapS0) > 50) jump = true;
  if(s0 != null) _lastSnapS0 = s0;
  log('snap', { s0, lat_off: latOff, jump, quality: S.snapQuality || 'GOOD' });
}

async function start(meta){
  if(_active) return _sessionId;
  if(!isEnabledPref()) return null;
  await openDb();
  await markDirtyIncomplete();
  _sessionId = uid();
  _sessionStart = Date.now();
  _lastSnapS0 = null;
  _active = true;
  const rec = {
    id: _sessionId,
    startedAt: _sessionStart,
    endedAt: null,
    userAgent: navigator.userAgent || '',
    appVersion: APP_VERSION,
    dirty: false,
    eventCount: 0,
    markCount: 0,
    meta: meta || {}
  };
  await putSession(rec);
  await pruneOldSessions();
  startSysTimers();
  document.documentElement.classList.add('telemetry-on');
  log('meta', { sub: 'start', appVersion: APP_VERSION, ...(meta || {}) });
  updateMarkButtonVisibility();
  return _sessionId;
}

async function stop(){
  if(!_active) return;
  flushPerfAggregate();
  log('meta', { sub: 'stop' });
  await flushBuffer(true);
  const id = _sessionId;
  const ended = Date.now();
  if(id){
    const sess = await getSession(id);
    if(sess){
      sess.endedAt = ended;
      await putSession(sess);
    }
  }
  _active = false;
  _sessionId = null;
  _sessionStart = 0;
  _lastSnapS0 = null;
  document.documentElement.classList.remove('telemetry-on');
  stopTimers();
  updateMarkButtonVisibility();
}

function mark(noteOrObj){
  if(!_active) return;
  if(typeof noteOrObj === 'string'){
    log('mark', noteOrObj ? { note: noteOrObj } : {});
  } else {
    log('mark', noteOrObj || {});
  }
}

function isActive(){ return _active; }
function isEnabled(){ return isEnabledPref(); }

async function setEnabled(on){
  setEnabledPref(!!on);
  if(!on && _active) await stop();
  document.documentElement.classList.toggle('telemetry-on', !!on && _active);
  updateMarkButtonVisibility();
}

function updateMarkButtonVisibility(){
  const btn = document.getElementById('btn-telemetry-mark');
  if(!btn) return;
  const enabled = isEnabledPref();
  btn.classList.toggle('hidden', !enabled);
  btn.classList.toggle('tel-idle', enabled && !_active);
}

async function listSessions(){
  const all = await listSessionsRaw();
  all.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
  return all.map(s => ({
    id: s.id,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    dirty: !!s.dirty,
    eventCount: s.eventCount || 0,
    markCount: s.markCount || 0,
    durationMs: (s.endedAt || Date.now()) - (s.startedAt || 0)
  }));
}

async function getSessionEvents(sessionId){
  await openDb();
  return new Promise((resolve, reject) => {
    const idx = tx('events', 'readonly').index('sessionId');
    const r = idx.getAll(IDBKeyRange.only(sessionId));
    r.onsuccess = () => {
      const rows = (r.result || []).map(row => {
        const { id, sessionId: _sid, ...ev } = row;
        return ev;
      });
      rows.sort((a, b) => (a.t || 0) - (b.t || 0));
      resolve(rows);
    };
    r.onerror = () => reject(r.error);
  });
}

function formatExportFilename(startedAt){
  const d = new Date(startedAt || Date.now());
  const p = n => String(n).padStart(2, '0');
  return 'telemetry_' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    '_' + p(d.getHours()) + '-' + p(d.getMinutes()) + '.jsonl';
}

async function exportSession(sessionId){
  const sess = await getSession(sessionId);
  if(!sess) throw new Error('Сессия не найдена');
  const events = await getSessionEvents(sessionId);
  const head = {
    type: 'session',
    id: sess.id,
    startedAt: sess.startedAt,
    endedAt: sess.endedAt,
    dirty: !!sess.dirty,
    userAgent: sess.userAgent,
    appVersion: sess.appVersion,
    eventCount: events.length,
    markCount: sess.markCount || 0
  };
  const lines = [JSON.stringify(head), ...events.map(e => JSON.stringify(e))];
  const blob = new Blob([lines.join('\n') + '\n'], { type: 'application/x-ndjson' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = formatExportFilename(sess.startedAt);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function deleteSession(sessionId){
  if(_active && _sessionId === sessionId) await stop();
  await deleteSessionData(sessionId);
}

async function storageStats(){
  const all = await listSessionsRaw();
  let events = 0;
  for(const s of all) events += s.eventCount || 0;
  return { sessions: all.length, events, maxSessions: MAX_SESSIONS };
}

function onVisibility(){
  if(!_active) return;
  log('sys', { sub: 'visibility', state: document.visibilityState });
  if(document.visibilityState === 'hidden'){
    flushBuffer(true).catch(() => {});
  }
}

function bindGlobalHandlers(){
  window.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', () => {
    if(_active) flushBuffer(true).catch(() => {});
  });
  window.addEventListener('error', e => {
    log('sys', {
      sub: 'error',
      message: String(e.message || e.error || '').slice(0, 200),
      stack: (e.error?.stack || '').split('\n')[0]?.slice(0, 200) || ''
    });
  });
  window.addEventListener('unhandledrejection', e => {
    const reason = e.reason;
    log('sys', {
      sub: 'error',
      message: String(reason?.message || reason || '').slice(0, 200),
      stack: (reason?.stack || '').split('\n')[0]?.slice(0, 200) || ''
    });
  });
}

/** Инициализация модуля (вызывается один раз из main.js) */
export async function initTelemetry(){
  if(typeof indexedDB === 'undefined') return;
  if(new URLSearchParams(location.search).get('telemetry') === '1'){
    setEnabledPref(true);
  }
  bindGlobalHandlers();
  try{
    await openDb();
    await markDirtyIncomplete();
  }catch(e){ console.warn('telemetry init:', e); }
}

export const telemetry = {
  start,
  stop,
  log,
  mark,
  export: exportSession,
  listSessions,
  deleteSession,
  storageStats,
  isActive,
  isEnabled,
  setEnabled,
  tickPerfFrame,
  logSnapFromResult,
  updateMarkButtonVisibility,
  /** @param {object} fix */
  logFix(fix){
    if(!_active) return;
    log('fix', {
      lat: r6(fix.lat),
      lon: r6(fix.lon),
      acc: r2(fix.acc),
      spd: r2(fix.speed),
      hdg: r2(fix.heading),
      alt: fix.alt != null ? r2(fix.alt) : null,
      ts: fix.ts,
      rcv: fix.rcv ?? Date.now()
    });
  }
};

export default telemetry;
