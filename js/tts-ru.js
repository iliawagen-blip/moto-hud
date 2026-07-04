/**
 * Русская озвучка: выбор лучшего голоса и ударения в навигационных фразах.
 * Combining acute (U+0301) после ударной гласной — понимают Google / Microsoft TTS.
 */
import { isNative } from './platform.js';

const A = '\u0301';

/** @type {number} */
let _nativeVoiceIdx = -1;
/** @type {SpeechSynthesisVoice | null} */
let _webVoice = null;
let _voiceReady = false;

/** Оценка качества русского голоса (выше — лучше для навигации) */
export function scoreRuVoice(v){
  const name = String(v.name || v.voiceURI || v.identifier || '').toLowerCase();
  const lang = String(v.lang || v.language || '').toLowerCase();
  if(!lang.startsWith('ru')) return -1;

  let score = 0;
  const offline = v.localService === true
    || v.network === false
    || v.networkConnectionRequired === false;
  if(offline) score += 28;
  if(name.includes('google')) score += 55;
  if(/ruc|ru-ru-x|x-ruc/.test(name)) score += 35;
  if(name.includes('yandex')) score += 48;
  if(name.includes('microsoft')) score += 38;
  if(name.includes('pavel') || name.includes('dmitry')) score += 22;
  if(name.includes('irina') || name.includes('milena')) score += 14;
  if(v.default) score += 6;
  if(name.includes('e-speak') || name.includes('espeak') || name.includes('festival')) score -= 45;
  return score;
}

/** Перечитывает список голосов и выбирает лучший ru-RU */
export async function refreshRuVoice(){
  _voiceReady = true;
  if(isNative()){
    try{
      const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
      const res = await TextToSpeech.getSupportedVoices();
      const list = res.voices || [];
      let best = -1;
      let bestScore = -1;
      list.forEach((v, i) => {
        const sc = scoreRuVoice(v);
        if(sc > bestScore){
          bestScore = sc;
          best = i;
        }
      });
      _nativeVoiceIdx = best;
    }catch(e){
      _nativeVoiceIdx = -1;
    }
    return;
  }

  if(!('speechSynthesis' in window)){
    _webVoice = null;
    return;
  }
  const list = speechSynthesis.getVoices();
  let best = null;
  let bestScore = -1;
  for(const v of list){
    const sc = scoreRuVoice(v);
    if(sc > bestScore){
      bestScore = sc;
      best = v;
    }
  }
  _webVoice = best;
}

export function initRuVoice(){
  refreshRuVoice();
  if('speechSynthesis' in window){
    speechSynthesis.addEventListener('voiceschanged', () => { refreshRuVoice(); }, { once: false });
  }
}

export function getNativeRuVoiceIdx(){
  return _nativeVoiceIdx;
}

export function getWebRuVoice(){
  return _webVoice;
}

export function isRuVoiceReady(){
  return _voiceReady;
}

/** Расстановка ударений в типовых навигационных фразах */
export function stressNavText(text){
  if(!text) return text;
  let s = String(text);

  const rules = [
    ['Снизьте скорость перед поворотом', 'Сни' + A + 'зьте ско' + A + 'рость пе' + A + 'ред поворо' + A + 'том'],
    ['Рекомендуется', 'Рекоменду' + A + 'ется'],
    ['километров в час', 'киломе' + A + 'тров в час'],
    ['Поверните налево', 'Поверн\u0438\u0301те нал\u0435\u0301во'],
    ['Поверните направо', 'Поверн\u0438\u0301те напр\u0430\u0301во'],
    ['Разворот', 'Разворо' + A + 'т'],
    ['Камера в спину', 'Ка' + A + 'мера в сп' + A + 'ину'],
    [', лимит ', ', ли' + A + 'мит '],
    ['менее 200 метров', 'ме' + A + 'нее 200 ме' + A + 'тров'],
    ['через 300 метров', 'че' + A + 'рез 300 ме' + A + 'тров'],
    ['через 500 метров', 'че' + A + 'рез 500 ме' + A + 'тров'],
    ['Через ', 'Че' + A + 'рез '],
    [' метров', ' ме' + A + 'тров'],
    [' секунду', ' секун' + A + 'ду'],
    [' секунды', ' секу' + A + 'нды'],
    [' секунд', ' секу' + A + 'нд'],
    ['Вы прибыли', 'Вы прибы' + A + 'ли'],
    ['Маршрут построен', 'Маршру' + A + 'т постро' + A + 'ен'],
    ['В пути ', 'В пу' + A + 'ти '],
    [' минут', ' мину' + A + 'т'],
    ['Заправка по маршруту', 'Запра' + A + 'вка по маршру' + A + 'ту'],
    ['Заправка рядом', 'Запра' + A + 'вка ря' + A + 'дом'],
    ['Строю маршрут к ближайшей заправке', 'Стро' + A + 'ю маршру' + A + 'т к ближа' + A + 'йшей запра' + A + 'вке'],
    ['Отмена', 'Отме' + A + 'на'],
    ['Возврат к маршруту', 'Возвра' + A + 'т к маршру' + A + 'ту'],
    ['Новый финиш', 'Но' + A + 'вый фи' + A + 'ниш'],
    ['Пересчёт маршрута', 'Пересч' + A + 'ёт маршру' + A + 'та'],
    ['Калибровка завершена', 'Калибро' + A + 'вка заверше' + A + 'на'],
    [', очередь', ', оче' + A + 'редь'],
    [', мало', ', ма' + A + 'ло'],
    ['нет топлива', 'нет то' + A + 'плива']
  ];

  for(const [from, to] of rules){
    if(s.includes(from)) s = s.split(from).join(to);
  }
  return s;
}

/** Озвучка «есть / очередь / мало / нет топлива» с ударениями */
export function ttsFuelStatus(status){
  return ({
    yes: 'есть',
    queue: 'оче' + A + 'редь',
    low: 'ма' + A + 'ло',
    no: 'нет то' + A + 'плива'
  })[status] || 'наличие неизвестно';
}

/** Дистанция до манёвра для TTS */
export function ttsManeuverLead(distM, mps){
  if(mps >= 6 && distM >= 120){
    const sec = Math.round(distM / mps);
    if(sec <= 20){
      const w = sec === 1
        ? ' секун' + A + 'ду'
        : sec >= 2 && sec <= 4
          ? ' секу' + A + 'нды'
          : ' секу' + A + 'нд';
      return 'Че' + A + 'рез ' + sec + w;
    }
  }
  const m = Math.max(50, Math.round(distM / 50) * 50);
  return 'Че' + A + 'рез ' + m + ' ме' + A + 'тров';
}

/** Текст манёвра с ударениями (для isTurnStep проверяйте step до вызова) */
export function ttsManeuverText(step){
  if(!step) return '';
  const m = step.modifier || '';
  if(m === 'uturn') return 'Развор\u043e\u0301т';
  if(m.includes('left')) return 'Поверн\u0438\u0301те нал\u0435\u0301во';
  if(m.includes('right')) return 'Поверн\u0438\u0301те напр\u0430\u0301во';
  return '';
}
