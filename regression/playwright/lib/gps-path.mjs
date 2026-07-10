/**
 * Геометрия пути для Playwright-sim: интерполяция, шум, пеленг.
 */

const R_EARTH = 6371000;

export function haversine(a, b){
  const lat1 = a[0] ?? a.lat, lon1 = a[1] ?? a.lon;
  const lat2 = b[0] ?? b.lat, lon2 = b[1] ?? b.lon;
  const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const x = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(x));
}

export function bearing(a, b){
  const lat1 = (a[0] ?? a.lat) * Math.PI / 180;
  const lat2 = (b[0] ?? b.lat) * Math.PI / 180;
  const dLon = ((b[1] ?? b.lon) - (a[1] ?? a.lon)) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/** @param {() => number} rng — uniform 0..1 */
export function gaussianM(rng){
  let u = 0, v = 0;
  while(u === 0) u = rng();
  while(v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function offsetMeters(lat, lon, northM, eastM){
  const latRad = lat * Math.PI / 180;
  return {
    lat: lat + northM / 110540,
    lon: lon + eastM / (Math.cos(latRad) * 111320)
  };
}

export function addNoise(lat, lon, sigmaM, rng){
  if(!sigmaM) return { lat, lon };
  const n = gaussianM(rng) * sigmaM;
  const e = gaussianM(rng) * sigmaM;
  return offsetMeters(lat, lon, n, e);
}

export function buildPathWalker(polyline){
  const pts = polyline.map(p => [p[0], p[1]]);
  const segs = [];
  let total = 0;
  for(let i = 0; i < pts.length - 1; i++){
    const d = haversine(pts[i], pts[i + 1]);
    segs.push({ a: pts[i], b: pts[i + 1], len: d, start: total });
    total += d;
  }
  return {
    totalM: total,
    at(distM){
      if(!segs.length) return { lat: pts[0][0], lon: pts[0][1], heading: 0 };
      const d = Math.max(0, Math.min(total, distM));
      let seg = segs[segs.length - 1];
      for(const s of segs){
        if(d <= s.start + s.len){ seg = s; break; }
      }
      const t = seg.len > 0 ? (d - seg.start) / seg.len : 0;
      const lat = seg.a[0] + (seg.b[0] - seg.a[0]) * t;
      const lon = seg.a[1] + (seg.b[1] - seg.a[1]) * t;
      return { lat, lon, heading: bearing(seg.a, seg.b) };
    }
  };
}

export function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function offsetPolyline(polyline, offsetM){
  if(!polyline?.length || !offsetM) return polyline;
  const out = [];
  for(let i = 0; i < polyline.length; i++){
    const cur = polyline[i];
    const prev = polyline[Math.max(0, i - 1)];
    const next = polyline[Math.min(polyline.length - 1, i + 1)];
    const hdg = bearing(prev, next);
    const east = offsetM * Math.cos((hdg - 90) * Math.PI / 180);
    const north = offsetM * Math.sin((hdg - 90) * Math.PI / 180);
    const p = offsetMeters(cur[0], cur[1], north, east);
    out.push([p.lat, p.lon]);
  }
  return out;
}

export function truncatePolyline(polyline, maxDistM){
  if(!maxDistM || maxDistM <= 0) return polyline;
  const walker = buildPathWalker(polyline);
  if(walker.totalM <= maxDistM) return polyline;
  const out = [[polyline[0][0], polyline[0][1]]];
  let acc = 0;
  for(let i = 1; i < polyline.length; i++){
    const prev = polyline[i - 1];
    const cur = polyline[i];
    const d = haversine(prev, cur);
    if(acc + d >= maxDistM){
      const p = walker.at(maxDistM);
      out.push([p.lat, p.lon]);
      return out;
    }
    acc += d;
    out.push([cur[0], cur[1]]);
  }
  return out;
}
