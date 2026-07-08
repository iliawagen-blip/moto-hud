import { S } from './state.js';
import { angleDiff } from './geo.js';
import { isNative } from './platform.js';
import { getNativeRuVoiceIdx, getWebRuVoice, refreshRuVoice } from './tts-ru.js';
import { isNavManeuverType } from './maneuver-filter.js';
import { isRoundaboutStep, roundaboutVoicePhrase, roundaboutManeuverText } from './roundabout.js';
import telemetry from './telemetry.js';

const _queue = [];
let _busy = false;
let _phraseId = 0;
const MAX_QUEUE = 4;
let _lastText = '';
let _lastSpeakTs = 0;
const DEDUPE_MS = 6500;

const TTS_RATE = 0.98;
const TTS_PITCH = 1.0;

async function speakNative(text, phraseId){
  await refreshRuVoice();
  const voiceIdx = getNativeRuVoiceIdx();
  const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
  telemetry.log('audio', { sub: 'started', id: phraseId });
  const opts = {
    text,
    lang: 'ru-RU',
    rate: TTS_RATE,
    pitch: TTS_PITCH,
    volume: 1.0,
    category: 'playback'
  };
  if(voiceIdx >= 0) opts.voice = voiceIdx;
  await TextToSpeech.speak(opts);
}

function speakWeb(text, phraseId){
  return new Promise((resolve, reject) => {
    if(!('speechSynthesis' in window)){ resolve(); return; }
    try{
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU';
      u.rate = TTS_RATE;
      u.pitch = TTS_PITCH;
      let voice = getWebRuVoice();
      if(!voice){
        const list = speechSynthesis.getVoices().filter(v =>
          (v.lang || '').toLowerCase().startsWith('ru'));
        voice = list[0] || null;
      }
      if(voice) u.voice = voice;
      u.onstart = () => telemetry.log('audio', { sub: 'started', id: phraseId });
      u.onend = () => resolve();
      u.onerror = () => reject(new Error('TTS'));
      speechSynthesis.speak(u);
    }catch(e){ reject(e); }
  });
}

async function drainVoiceQueue(){
  if(_busy || !_queue.length) return;
  _busy = true;
  const item = _queue.shift();
  const text = item.text;
  const phraseId = item.id;
  try{
    if(isNative()) await speakNative(text, phraseId);
    else await speakWeb(text, phraseId);
  }catch(e){
    console.warn('Озвучка:', e);
    try{ await speakWeb(text, phraseId); }catch(e2){}
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
  const phraseId = ++_phraseId;
  telemetry.log('audio', { sub: 'queued', id: phraseId });
  _queue.push({ text: t, id: phraseId });
  while(_queue.length > MAX_QUEUE) _queue.shift();
  drainVoiceQueue();
}

export function clearVoiceQueue(){
  _queue.length = 0;
  if('speechSynthesis' in window){
    try{ speechSynthesis.cancel(); }catch(e){}
  }
}

/** Манёвр с реальным поворотом (не «прямо» / continue / new name) */
export function isTurnStep(step){
  return isNavManeuverType(step);
}

export function maneuverText(step){
  if(!isTurnStep(step) && !isRoundaboutStep(step)) return '';
  if(isRoundaboutStep(step)) return roundaboutManeuverText(step, null);
  const m = step.modifier || '';
  if(m === 'uturn') return 'Разворот';
  if(m.includes('left')) return 'Поверните налево';
  if(m.includes('right')) return 'Поверните направо';
  return '';
}

export function maneuverPhrase(step, when = 'near'){
  if(isRoundaboutStep(step)) return roundaboutVoicePhrase(step, when);
  return maneuverText(step);
}

export function isCameraBehind(cam, heading){
  if(cam.dir == null || heading == null) return S.noDirPolicy === 'warn';
  return angleDiff(cam.dir, heading) <= S.tolerance;
}
