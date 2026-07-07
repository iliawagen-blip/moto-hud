/**
 * Тест построения yandexnavi:// без сети.
 */
import { buildYandexNaviUrl, sampleViaPoints } from '../js/yandex-export.js';

let failed = 0;

function assert(cond, msg){
  if(!cond){ console.error('FAIL:', msg); failed++; }
  else console.log('OK:', msg);
}

const url = buildYandexNaviUrl({
  from: { lat: 55.75, lon: 37.58 },
  to: { lat: 55.76, lon: 37.64 },
  via: [{ lat: 55.755, lon: 37.62 }]
});
assert(url.startsWith('yandexnavi://build_route_on_map?'), 'scheme');
assert(url.includes('lat_via_0=55.755'), 'via point');
assert(url.includes('lat_from=55.75'), 'from');

const coords = [];
for(let i = 0; i < 100; i++) coords.push([55 + i * 0.001, 37 + i * 0.001]);
const via = sampleViaPoints(coords, 8);
assert(via.length === 8, 'sample 8 via');
assert(via[0].lat > coords[0][0] && via[via.length - 1].lat < coords[coords.length - 1][0], 'via inside route');

const url2 = buildYandexNaviUrl({ to: { lat: 54.19, lon: 37.61 } });
assert(!url2.includes('lat_from'), 'to-only route');

if(failed) process.exit(1);
console.log('yandex:export:test OK');
