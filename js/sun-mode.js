/**
 * Расчёт восхода/заката по NOAA (локально, без API).
 * @param {number} lat градусы
 * @param {number} lon градусы
 * @param {Date} [date]
 * @returns {{ sunrise: Date, sunset: Date }}
 */
export function sunTimes(lat, lon, date = new Date()){
  const zenith = 90.833;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  const lngHour = lon / 15;

  function calc(isSunrise){
    const t = isSunrise ? dayOfYear + (6 - lngHour) / 24 : dayOfYear + (18 - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let L = M + 1.916 * Math.sin(M * Math.PI / 180) + 0.020 * Math.sin(2 * M * Math.PI / 180) + 282.634;
    L = ((L % 360) + 360) % 360;
    let RA = Math.atan(0.91764 * Math.tan(L * Math.PI / 180)) * 180 / Math.PI;
    RA = ((RA % 360) + 360) % 360;
    const Lq = Math.floor(L / 90) * 90;
    const Rq = Math.floor(RA / 90) * 90;
    RA = (RA + (Lq - Rq)) / 15;
    const sinDec = 0.39782 * Math.sin(L * Math.PI / 180);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(zenith * Math.PI / 180) - sinDec * Math.sin(lat * Math.PI / 180)) /
      (cosDec * Math.cos(lat * Math.PI / 180));
    if(cosH > 1 || cosH < -1){
      return isSunrise
        ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6, 0, 0)
        : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0);
    }
    let H = Math.acos(cosH) * 180 / Math.PI / 15;
    if(!isSunrise) H = 24 - H;
    const T = H + RA - 0.06571 * t - 6.622;
    let ut = T - lngHour;
    ut = ((ut % 24) + 24) % 24;
    const h = Math.floor(ut);
    const m = Math.floor((ut - h) * 60);
    const s = Math.floor(((ut - h) * 60 - m) * 60);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, s);
  }

  return { sunrise: calc(true), sunset: calc(false) };
}

const HYST_MS = 20 * 60 * 1000;
let _lastResolved = 'night';
let _lastSwitchTs = 0;

/**
 * Режим отображения day/night с гистерезисом ±20 мин.
 * @param {'day'|'night'|'auto'} pref
 * @param {{ lat?: number, lon?: number }} pos
 * @param {Date} [now]
 */
export function resolveDisplayMode(pref, pos, now = new Date()){
  if(pref === 'day') return 'day';
  if(pref === 'night') return 'night';

  const lat = pos?.lat;
  const lon = pos?.lon;
  if(lat != null && lon != null && !isNaN(lat) && !isNaN(lon)){
    const { sunrise, sunset } = sunTimes(lat, lon, now);
    const dawn = sunrise.getTime() + HYST_MS;
    const dusk = sunset.getTime() - HYST_MS;
    const ts = now.getTime();
    let target = (ts >= dawn && ts < dusk) ? 'day' : 'night';
    if(target !== _lastResolved && ts - _lastSwitchTs < HYST_MS){
      return _lastResolved;
    }
    if(target !== _lastResolved){
      _lastResolved = target;
      _lastSwitchTs = ts;
    }
    return target;
  }

  const h = now.getHours() + now.getMinutes() / 60;
  return (h >= 7 && h < 21) ? 'day' : 'night';
}

export function resetModeHysteresis(){
  _lastResolved = 'night';
  _lastSwitchTs = 0;
}
