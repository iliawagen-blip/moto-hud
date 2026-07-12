/**
 * Spike: OSRM maneuver types at Sevastopolsky x Balaklavsky ring, Moscow.
 */
const BASE = 'https://router.project-osrm.org/route/v1/driving';
const RING = { lon: 37.60545, lat: 55.64210 };

async function overpassRoundabouts(){
  const q = `[out:json][timeout:25];
(
  way["junction"="roundabout"](around:500,${RING.lat},${RING.lon});
  way["junction"="circular"](around:500,${RING.lat},${RING.lon});
);
out tags center;`;
  const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: q });
  return r.json();
}

async function osrmDetailed(name, coords){
  const c = coords.map(p => `${p[0]},${p[1]}`).join(';');
  const url = `${BASE}/${c}?overview=full&geometries=geojson&steps=true`;
  const j = await (await fetch(url)).json();
  console.log(`\n=== ${name} ===`);
  if(j.code !== 'Ok') return console.log(j.code, j.message);
  for(const st of j.routes[0].legs[0].steps){
    const m = st.maneuver;
    const ix = st.intersections?.[st.intersections.length - 1] || st.intersections?.[0];
    const rb = (m.type === 'roundabout' || m.type === 'rotary' || m.type === 'exit roundabout');
    const mark = rb ? ' *** ROUNDABOUT ***' : '';
    console.log(
      `${m.type}/${m.modifier || '-'} exit=${m.exit ?? '-'} name="${st.name || ''}"` +
      ` loc=[${m.location[1].toFixed(5)}, ${m.location[0].toFixed(5)}]` +
      ` bearings=${ix?.bearings?.length ?? 0}${mark}`
    );
  }
}

const scenarios = [
  {
    name: 'Севастопольский (запад) → Балаклавский (север, через кольцо)',
    coords: [[37.60380, 55.64195], [37.60525, 55.64360]]
  },
  {
    name: 'Севастопольский (восток) → Балаклавский (юг)',
    coords: [[37.60720, 55.64240], [37.60530, 55.64020]]
  },
  {
    name: 'Балаклавский (юг) → Севастопольский (запад)',
    coords: [[37.60530, 55.64020], [37.60380, 55.64195]]
  },
  {
    name: 'Балаклавский (север) → Севастопольский (восток)',
    coords: [[37.60525, 55.64360], [37.60720, 55.64240]]
  },
  {
    name: 'Обручева → Севастопольский (запад)',
    coords: [[37.60780, 55.64380], [37.60380, 55.64195]]
  }
];

const o = { elements: [] };
try{
  const over = await overpassRoundabouts();
  o.elements = over.elements || [];
}catch(e){
  console.log('Overpass skip:', e.message);
}
console.log(`OSM junction=roundabout/circular within 500m of [${RING.lat}, ${RING.lon}]: ${o.elements.length}`);
for(const e of o.elements){
  const c = e.center || e;
  console.log(`  way/${e.id} junction=${e.tags?.junction} highway=${e.tags?.highway} name=${e.tags?.name || '—'}`);
}

for(const s of scenarios){
  await osrmDetailed(s.name, s.coords);
}

console.log('\nSummary: if no *** ROUNDABOUT *** — app will show plain turn arrow.');
