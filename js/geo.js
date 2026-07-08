/** Геометрия и разбор ввода координат/ссылок */
export function haversine(a, b){
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function bearing(a, b){
  const r = Math.PI / 180, d = 180 / Math.PI;
  const f1 = a.lat * r, f2 = b.lat * r, dl = (b.lon - a.lon) * r;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return (Math.atan2(y, x) * d + 360) % 360;
}

export function distToSegment(p, a, b){
  const r = Math.PI / 180;
  const ax = a.lon * r * Math.cos(a.lat * r), ay = a.lat * r;
  const bx = b.lon * r * Math.cos(b.lat * r), by = b.lat * r;
  const px = p.lon * r * Math.cos(p.lat * r), py = p.lat * r;
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  const cx = ax + t * dx, cy = ay + t * dy;
  const dLat = py - cy, dLon = (px - cx) / Math.cos(p.lat * r || 1);
  return Math.sqrt(dLat * dLat + dLon * dLon) * 6371000;
}

export function angleDiff(a, b){
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Точка на расстоянии distM по азимуту brgDeg от from */
export function destPoint(from, brgDeg, distM){
  const r = Math.PI / 180;
  const br = brgDeg * r;
  const d = distM / 6371000;
  const lat1 = from.lat * r;
  const lon1 = from.lon * r;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br));
  const lon2 = lon1 + Math.atan2(
    Math.sin(br) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: lat2 / r, lon: lon2 / r };
}

export function parseInput(raw){
  const s = String(raw || '').trim();
  if(!s) return null;
  const coord = s.match(/(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)/);
  if(coord) return { lat: parseFloat(coord[1]), lon: parseFloat(coord[2]), label: 'Координаты' };
  const ll = s.match(/[?&]ll=(-?\d+\.\d+)%2C(-?\d+\.\d+)/i) || s.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/i);
  if(ll) return { lat: parseFloat(ll[1]), lon: parseFloat(ll[2]), label: 'Яндекс' };
  const pt = s.match(/[?&]pt=(-?\d+\.\d+)%2C(-?\d+\.\d+)/i) || s.match(/[?&]pt=(-?\d+\.\d+),(-?\d+\.\d+)/i);
  if(pt) return { lat: parseFloat(pt[2]), lon: parseFloat(pt[1]), label: 'Яндекс pt' };
  const at = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if(at) return { lat: parseFloat(at[1]), lon: parseFloat(at[2]), label: 'Google' };
  return null;
}

/**
 * Разбор строки планировщика: «lat, lon Название» или ссылка Яндекс.
 * @param {string} raw
 * @param {string} [fallbackLabel]
 */
export function parseTripPoint(raw, fallbackLabel){
  const s = String(raw || '').trim();
  if(!s) return null;
  const coord = s.match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)(?:\s+(.+))?$/);
  if(coord){
    const lat = parseFloat(coord[1]);
    const lon = parseFloat(coord[2]);
    if(!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const label = (coord[3] || '').trim() || fallbackLabel || 'Точка';
    return { lat, lon, label };
  }
  const p = parseInput(s);
  if(!p) return null;
  const generic = !p.label || p.label === 'Координаты' || p.label.startsWith('Яндекс');
  return { lat: p.lat, lon: p.lon, label: generic ? (fallbackLabel || p.label || 'Точка') : p.label };
}
