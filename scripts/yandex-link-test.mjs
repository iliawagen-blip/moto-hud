/**
 * Тест парсера rtext Яндекс.Карт (без сети, кроме optional short-link).
 */
import {
  extractYandexUrl,
  extractRtextParam,
  parseRtextWaypoints,
  parseYandexRouteLink,
  buildYandexRouteUrl,
  YANDEX_PARSER_REV
} from '../js/yandex-link.js';

const LONG_MOSCOW = 'https://yandex.ru/maps/213/moscow/?from=api-maps&ll=37.618423%2C55.751244&mode=routes&rtext=55.751244%2C37.618423~55.755819%2C37.617644~55.760075%2C37.803819&rtt=auto&z=12';

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
  },
  {
    name: 'long-moscow-query',
    url: LONG_MOSCOW,
    minPoints: 3
  },
  {
    name: 'maps-yandex-ru',
    url: 'https://maps.yandex.ru/?rtext=55.816706,49.211787~55.782897,49.139095&rtt=auto',
    minPoints: 2
  },
  {
    name: 'encoded-spaces',
    url: 'https://yandex.ru/maps/?rtext=55.75%2C37.62~55.80%2C37.70',
    minPoints: 2
  },
  {
    name: 'hash-rtext',
    url: 'https://yandex.ru/maps/#rtext=55.75,37.62~55.80,37.70',
    minPoints: 2
  }
];

let failed = 0;

console.log('parser rev', YANDEX_PARSER_REV);

for(const f of FIXTURES){
  try{
    const rtext = extractRtextParam(f.url);
    if(!rtext) throw new Error('no rtext extracted');
    const pts = parseRtextWaypoints(rtext);
    if(pts.length < f.minPoints) throw new Error('points ' + pts.length);
    console.log('OK', f.name, pts.length, 'pts', pts[0].lat.toFixed(4));
  }catch(e){
    failed++;
    console.error('FAIL', f.name, e.message);
  }
}

const messy = `Маршрут на завтра:
«${LONG_MOSCOW}»
спасибо`;
const extracted = extractYandexUrl(messy);
if(!extracted?.includes('rtext=')){ failed++; console.error('FAIL messy extract'); }
else console.log('OK messy extract', extracted.length, 'chars');

try{
  const asyncPts = await parseYandexRouteLink(LONG_MOSCOW);
  if(asyncPts.length < 3) throw new Error('async pts');
  console.log('OK async parse', asyncPts.length);
}catch(e){
  failed++;
  console.error('FAIL async', e.message);
}

const roundtrip = buildYandexRouteUrl([{ lat: 55.75, lon: 37.62 }, { lat: 55.80, lon: 37.70 }]);
if(!roundtrip.includes('rtext=')){ failed++; console.error('FAIL build url'); }
else console.log('OK build url');

process.exit(failed ? 1 : 0);
