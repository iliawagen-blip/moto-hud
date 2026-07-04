import { S } from './state.js';
import { angleDiff } from './geo.js';
import { isNative } from './platform.js';

const _queue = [];
let _busy = false;
const MAX_QUEUE = 4;
let _lastText = '';
let _lastSpeakTs = 0;
const DEDUPE_MS = 6500;

async function speakNative(text){
  const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
  await TextToSpeech.speak({
    text,
    lang: 'ru-RU',
    rate: 1.05,
    pitch: 1.0,
    volume: 1.0,
    category: 'playback'
  });
}

function speakWeb(text){
  return new Promise((resolve, reject) => {
    if(!('speechSynthesis' in window)){ resolve(); return; }
    try{
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU';
      u.rate = 1.05;
      u.onend = () => resolve();
      u.onerror = () => reject(new Error('TTS'));
      speechSynthesis.speak(u);
    }catch(e){ reject(e); }
  });
}

async function drainVoiceQueue(){
  if(_busy || !_queue.length) return;
  _busy = true;
  const text = _queue.shift();
  try{
    if(isNative()) await speakNative(text);
    else await speakWeb(text);
  }catch(e){
    console.warn('Озвучка:', e);
    try{ await speakWeb(text); }catch(e2){}
  }finally{
    _busy = false;
    if(_queue.length) drainVoiceQueue();
  }
}

/** Озвучка с очередью (антиспам, кооперативный режим — без наложения фраз) */
export function speak(text){
  if(!S.voice || !text) return;
  const t = String(text);
  const now = Date.now();
  if(t === _lastText && now - _lastSpeakTs < DEDUPE_MS) return;
  _lastText = t;
  _lastSpeakTs = now;
  _queue.push(t);
  while(_queue.length > MAX_QUEUE) _queue.shift();
  drainVoiceQueue();
}

export function clearVoiceQueue(){
  _queue.length = 0;
  if('speechSynthesis' in window){
    try{ speechSynthesis.cancel(); }catch(e){}
  }
}

/** Манёвр с реальным поворотом (не «прямо» / continue) */
export function isTurnStep(step){
  if(!step || step.type === 'depart' || step.type === 'arrive') return false;
  const m = step.modifier || '';
  if(!m || m === 'straight') return false;
  return m === 'uturn' || m.includes('left') || m.includes('right');
}

export function maneuverText(step){
  if(!isTurnStep(step)) return '';
  const m = step.modifier || '';
  if(m === 'uturn') return 'Разворот';
  if(m.includes('left')) return 'Поверните налево';
  if(m.includes('right')) return 'Поверните направо';
  return '';
}

export function isCameraBehind(cam, heading){
  if(cam.dir == null || heading == null) return S.noDirPolicy === 'warn';
  return angleDiff(cam.dir, heading) <= S.tolerance;
}
