/**
 * Экспорт маршрута в Яндекс Навигатор (yandexnavi://).
 * @see https://yandex.ru/dev/navigator/doc/ru/concepts/navigator-url-params
 */
import { S } from './state.js';
import { $ } from './util.js';

export const MAX_VIA_POINTS = 8;

function round6(n){
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Равномерная выборка промежуточных точек из polyline OSRM.
 * @param {number[][]} coords [lat, lon][]
 * @param {number} [maxVia]
 * @returns {{ lat: number, lon: number }[]}
 */
export function sampleViaPoints(coords, maxVia = MAX_VIA_POINTS){
  if(!coords?.length || coords.length <= 2) return [];
  const inner = coords.slice(1, -1);
  if(inner.length <= maxVia){
    return inner.map(c => ({ lat: c[0], lon: c[1] }));
  }
  const out = [];
  for(let i = 0; i < maxVia; i++){
    const idx = Math.min(
      inner.length - 1,
      Math.round((i + 1) * inner.length / (maxVia + 1)) - 1
    );
    const c = inner[Math.max(0, idx)];
    out.push({ lat: c[0], lon: c[1] });
  }
  return out;
}

/**
 * @param {{ from?: { lat: number, lon: number }, to: { lat: number, lon: number }, via?: { lat: number, lon: number }[] }} opts
 * @returns {string}
 */
export function buildYandexNaviUrl({ from, to, via = [] }){
  const p = new URLSearchParams();
  if(from){
    p.set('lat_from', String(round6(from.lat)));
    p.set('lon_from', String(round6(from.lon)));
  }
  p.set('lat_to', String(round6(to.lat)));
  p.set('lon_to', String(round6(to.lon)));
  via.forEach((pt, i) => {
    p.set(`lat_via_${i}`, String(round6(pt.lat)));
    p.set(`lon_via_${i}`, String(round6(pt.lon)));
  });
  return `yandexnavi://build_route_on_map?${p.toString()}`;
}

/**
 * @param {{ coords?: number[][] }} route
 * @param {{ lat: number, lon: number } | null} [gps]
 */
export function buildYandexNaviUrlFromRoute(route, gps){
  const coords = route?.coords;
  if(!coords?.length) throw new Error('Сначала постройте маршрут');
  const to = { lat: coords[coords.length - 1][0], lon: coords[coords.length - 1][1] };
  const from = gps
    ? { lat: gps.lat, lon: gps.lon }
    : { lat: coords[0][0], lon: coords[0][1] };
  return buildYandexNaviUrl({ from, to, via: sampleViaPoints(coords) });
}

/**
 * @param {{ coords?: number[][] }} route
 * @param {{ lat: number, lon: number } | null} [gps]
 */
export function openYandexNavigator(route, gps){
  const url = buildYandexNaviUrlFromRoute(route, gps);
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function initYandexExportUi(){
  $('btn-yandex-navi')?.addEventListener('click', () => {
    try{
      openYandexNavigator(S.route, S.gps);
    }catch(e){
      alert(e.message || 'Не удалось открыть Яндекс Навигатор');
    }
  });
}
