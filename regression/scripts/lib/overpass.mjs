/**
 * Проверка: точка на дороге в радиусе radiusM.
 * Основной метод — OSRM /nearest (тот же хост, что маршруты).
 * Overpass — опциональный fallback при доступности.
 */
import { getOsrmEndpoint } from './env.mjs';
import { haversine } from './geo.mjs';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const SKIP_HIGHWAY = /^(footway|path|steps|cycleway|pedestrian|bridleway|corridor)$/;

export async function snapToRoad(lat, lon){
  const base = getOsrmEndpoint();
  const url = `${base}/nearest/v1/driving/${lon},${lat}?number=1`;
  const res = await fetch(url);
  if(!res.ok) return null;
  const json = await res.json();
  if(json.code !== 'Ok' || !json.waypoints?.[0]) return null;
  const [wlng, wlat] = json.waypoints[0].location;
  return { lat: wlat, lon: wlng };
}

export async function isNearHighwayOsrm(lat, lon, radiusM = 50){
  const snapped = await snapToRoad(lat, lon);
  if(!snapped) return false;
  return haversine({ lat, lon }, snapped) <= radiusM;
}

async function isNearHighwayOverpass(lat, lon, radiusM = 50){
  const q = `[out:json][timeout:25];
way(around:${radiusM},${lat},${lon})["highway"];
out body 1;`;
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'moto-hud-regression/1.0'
    },
    body: 'data=' + encodeURIComponent(q)
  });
  if(!res.ok) return null;
  const json = await res.json();
  const ways = (json.elements || []).filter(e => {
    if(e.type !== 'way' || !e.tags?.highway) return false;
    return !SKIP_HIGHWAY.test(e.tags.highway);
  });
  return ways.length > 0;
}

/** @returns {Promise<boolean>} */
export async function isNearHighway(lat, lon, radiusM = 50){
  const osrmOk = await isNearHighwayOsrm(lat, lon, radiusM);
  if(osrmOk) return true;
  try{
    const ov = await isNearHighwayOverpass(lat, lon, radiusM);
    if(ov != null) return ov;
  }catch{ /* ignore */ }
  return false;
}
