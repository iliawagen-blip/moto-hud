/** Haversine, м. */
export function haversine(a, b){
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function totalPathKm(waypoints){
  let d = 0;
  for(let i = 1; i < waypoints.length; i++){
    d += haversine(waypoints[i - 1], waypoints[i]);
  }
  return d / 1000;
}

export function randomInBbox(bbox, rng = Math.random){
  const lat = bbox.south + rng() * (bbox.north - bbox.south);
  const lon = bbox.west + rng() * (bbox.east - bbox.west);
  return { lat, lon };
}

/** Детерминированный PRNG (mulberry32). */
export function makeRng(seed){
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
