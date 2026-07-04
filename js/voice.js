import { S } from './state.js';
import { angleDiff } from './geo.js';

export function speak(text){
  if(!S.voice || !('speechSynthesis' in window)) return;
  try{
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU';
    u.rate = 1.05;
    speechSynthesis.speak(u);
  }catch(e){}
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
