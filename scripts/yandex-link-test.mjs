/**
 * Тест парсера rtext Яндекс.Карт (без сети).
 */
import { extractYandexUrl } from '../js/yandex-link.js';

function parseRtextFromUrl(url){
  const m = url.match(/[?&]rtext=([^&]+)/i);
  if(!m) throw new Error('no rtext');
  return decodeURIComponent(m[1]).split('~').map(part => {
    const c = part.trim().match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
    if(!c) return null;
    return { lat: +c[1], lon: +c[2] };
  }).filter(Boolean);
}

const FIXTURES = [
  {
    name: 'moscow-tula-2pt',
    url: 'https://yandex.ru/maps/?rtext=55.7558,37.6173~54.1931,37.6173&rtt=auto',
    minPoints: 2
  },
  {
    name: 'three-waypoints',
    url: 'https://yandex.ru/maps/?rtext=55.75,37.62~55.80,37.70~55.85,37.75',
    minPoints: 3
  }
];

let failed = 0;
for(const f of FIXTURES){
  try{
    const pts = parseRtextFromUrl(f.url);
    if(pts.length < f.minPoints) throw new Error('points ' + pts.length);
    console.log('OK', f.name, pts.length, 'pts');
  }catch(e){
    failed++;
    console.error('FAIL', f.name, e.message);
  }
}

const extracted = extractYandexUrl('Смотри https://yandex.ru/maps/?ll=37.6,55.7&rtext=1,2~3,4 end');
if(!extracted?.includes('yandex.ru/maps')){ failed++; console.error('FAIL extract'); }
else console.log('OK extract');

process.exit(failed ? 1 : 0);
