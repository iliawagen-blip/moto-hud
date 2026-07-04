/**
 * Спайк Фазы 4: сравнение OSRM и BRouter на одном маршруте.
 * Запуск: node scripts/spike-routers.mjs [lat1,lon1 lat2,lon2]
 * По умолчанию — демо-серпантин из fixtures/serpentine-demo.gpx.
 */
const DEFAULT = {
  from: { lat: 55.757, lon: 37.616 },
  to: { lat: 55.7585, lon: 37.618 }
};

function parseArgs(argv){
  const pts = argv.filter(a => a.includes(','));
  if(pts.length >= 2){
    const [a, b] = pts;
    const [lat1, lon1] = a.split(',').map(Number);
    const [lat2, lon2] = b.split(',').map(Number);
    return { from: { lat: lat1, lon: lon1 }, to: { lat: lat2, lon: lon2 } };
  }
  return DEFAULT;
}

function haversineM(a, b){
  const R = 6371000;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLon = (b.lon - a.lon) * r;
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function polylineLen(coords){
  let m = 0;
  for(let i = 1; i < coords.length; i++){
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    m += haversineM({ lat: lat1, lon: lon1 }, { lat: lat2, lon: lon2 });
  }
  return m;
}

function elevStats(coords3){
  const elevs = coords3.map(c => c[2]).filter(e => e != null && !isNaN(e));
  if(!elevs.length) return null;
  let gain = 0;
  for(let i = 1; i < elevs.length; i++){
    const d = elevs[i] - elevs[i - 1];
    if(d > 0) gain += d;
  }
  return { min: Math.min(...elevs), max: Math.max(...elevs), gain: Math.round(gain) };
}

async function fetchOsrm(from, to){
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
  const t0 = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': 'moto-hud-spike/1.0' } });
  const ms = Date.now() - t0;
  if(!res.ok) throw new Error(`OSRM ${res.status}`);
  const j = await res.json();
  const r = j.routes?.[0];
  if(!r) throw new Error('OSRM: no route');
  const coords = r.geometry?.coordinates || [];
  return {
    engine: 'OSRM',
    ms,
    distanceM: r.distance,
    durationS: r.duration,
    polylineM: polylineLen(coords),
    elevation: null,
    points: coords.length
  };
}

async function fetchBrouter(from, to, profile = 'trekking'){
  const lonlats = `${from.lon},${from.lat}|${to.lon},${to.lat}`;
  const url = `https://brouter.de/brouter?lonlats=${encodeURIComponent(lonlats)}&profile=${profile}&alternativeidx=0&format=geojson&nogos=&timode=0&trackname=spike`;
  const t0 = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': 'moto-hud-spike/1.0' } });
  const ms = Date.now() - t0;
  if(!res.ok) throw new Error(`BRouter ${res.status}`);
  const j = await res.json();
  const feat = j.features?.[0];
  if(!feat) throw new Error('BRouter: no route');
  const coords = feat.geometry?.coordinates || [];
  const props = feat.properties || {};
  const dist = props.totaldistance ?? polylineLen(coords);
  return {
    engine: `BRouter (${profile})`,
    ms,
    distanceM: dist,
    durationS: props.totaltime ? props.totaltime / 1000 : null,
    polylineM: polylineLen(coords),
    elevation: elevStats(coords),
    points: coords.length
  };
}

function fmtRow(r){
  const elev = r.elevation
    ? `Δ+${r.elevation.gain}m (${r.elevation.min}…${r.elevation.max}m)`
    : '—';
  const dur = r.durationS != null ? `${Math.round(r.durationS / 60)} min` : '—';
  return {
    engine: r.engine,
    latency: `${r.ms} ms`,
    distance: `${Math.round(r.distanceM)} m`,
    duration: dur,
    points: r.points,
    elevation: elev
  };
}

const { from, to } = parseArgs(process.argv.slice(2));
console.log(`Spike: ${from.lat},${from.lon} → ${to.lat},${to.lon}\n`);

const results = [];
for(const fn of [
  () => fetchOsrm(from, to),
  () => fetchBrouter(from, to, 'trekking'),
  () => fetchBrouter(from, to, 'fastbike')
]){
  try{
    results.push(fmtRow(await fn()));
  }catch(e){
    results.push({ engine: fn.name || '?', error: String(e.message || e) });
  }
}

console.table(results);
console.log('\nСледующий шаг: GraphHopper (self-host) + round-trip + surface weights — см. docs/router-spike.md');
