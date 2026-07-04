/**
 * Минимальный разбор GPX 1.1 (trk/trkpt) для replay в симуляторе.
 * @module gpx
 */

/** @typedef {{ lat: number, lon: number, timeMs?: number, ele?: number }} GpxPoint */

function parseTimeMs(text){
  if(!text) return undefined;
  const t = Date.parse(text.trim());
  return Number.isFinite(t) ? t : undefined;
}

/**
 * Разбор GPX-трека из XML-строки.
 * @returns {{ name: string, points: GpxPoint[] }}
 */
export function parseGpxTrack(xmlText){
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if(doc.querySelector('parsererror')) throw new Error('Некорректный GPX/XML');

  const trk = doc.querySelector('trk');
  const name = trk?.querySelector('name')?.textContent?.trim() || 'GPX';
  const pts = [...doc.querySelectorAll('trkpt')];
  if(!pts.length) throw new Error('В GPX нет trkpt');

  const points = pts.map(el => {
    const lat = parseFloat(el.getAttribute('lat'));
    const lon = parseFloat(el.getAttribute('lon'));
    if(!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const eleEl = el.querySelector('ele');
    const ele = eleEl ? parseFloat(eleEl.textContent) : undefined;
    const timeMs = parseTimeMs(el.querySelector('time')?.textContent);
    return { lat, lon, ele: Number.isFinite(ele) ? ele : undefined, timeMs };
  }).filter(Boolean);

  if(points.length < 2) throw new Error('Мало точек в треке');
  return { name, points };
}

/** Haversine, м */
function distM(a, b){
  const R = 6371000;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLon = (b.lon - a.lon) * r;
  const la = a.lat * r;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(la) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/**
 * Уплотнение трека + скорости на сегментах (из timestamps GPX или fallback).
 * @returns {{ coords: number[][], segSpeed: number[], hasTime: boolean }}
 */
export function buildGpxReplay(points, stepM){
  const step = stepM || 12;
  const coords = [];
  const segSpeed = [];
  let hasTime = points.some(p => p.timeMs != null);

  for(let i = 0; i < points.length - 1; i++){
    const a = points[i];
    const b = points[i + 1];
    const segLen = distM(a, b);
    const n = Math.max(1, Math.ceil(segLen / step));
    let spd = 12;
    if(hasTime && a.timeMs != null && b.timeMs != null){
      const dt = (b.timeMs - a.timeMs) / 1000;
      if(dt > 0.2) spd = segLen / dt;
    }
    spd = Math.max(1, Math.min(55, spd));

    for(let k = 0; k < n; k++){
      if(i > 0 && k === 0) continue;
      const t = k / n;
      coords.push([
        a.lat + (b.lat - a.lat) * t,
        a.lon + (b.lon - a.lon) * t
      ]);
      if(coords.length > 1) segSpeed.push(spd);
    }
  }
  const last = points[points.length - 1];
  coords.push([last.lat, last.lon]);

  return { coords, segSpeed, hasTime };
}
