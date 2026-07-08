#!/usr/bin/env node
/**
 * Self-test жадного планировщика заправок (без браузера).
 * node scripts/trip-fuel-test.mjs
 */
import { buildRoutePolyline, projectToPolyline, stationMatchesFuelType, planGreedyFuelStops } from '../js/trip-fuel.js';

function assert(cond, msg){
  if(!cond) throw new Error(msg);
}

const poly = buildRoutePolyline('55.75,37.62~56.32,44.00~55.79,49.11');
assert(poly.totalKm > 500, 'poly km');

const mid = { lat: 56.0, lon: 41.0 };
const proj = projectToPolyline(poly, mid);
assert(proj.routeKm > 0 && proj.lateralM < 50000, 'projection');

assert(stationMatchesFuelType({ tags: { 'fuel:octane_95': 'yes' } }, '95'), 'octane 95');
assert(!stationMatchesFuelType({ tags: { 'fuel:none': 'yes' } }, '95'), 'no fuel');
assert(stationMatchesFuelType({ tags: {} }, '95'), 'unknown tags ok');

const profile = {
  tankLiters: 20,
  reserveKm: 40,
  fuelType: '95',
  consumptionL100: { default: 5.5 }
};

const fakeStations = [
  { osmId: '1', lat: 55.9, lon: 38.5, brand: 'A', name: 'A', tags: { 'fuel:octane_95': 'yes' } },
  { osmId: '2', lat: 56.1, lon: 40.2, brand: 'B', name: 'B', tags: { 'fuel:gasoline': 'yes' } },
  { osmId: '3', lat: 56.25, lon: 43.0, brand: 'C', name: 'C', tags: { 'fuel:octane_95': 'yes' } }
];

const origFetch = globalThis.fetch;
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ elements: fakeStations.map(s => ({ id: s.osmId, lat: s.lat, lon: s.lon, tags: s.tags })) })
});

try{
  const seg = { rtext: '55.75,37.62~56.32,44.00~55.79,49.11', label: 'test' };
  const plan = await planGreedyFuelStops(seg, profile, {});
  assert(plan, 'plan');
  assert(Array.isArray(plan.stops), 'stops array');
  console.log('trip-fuel-test OK · stops:', plan.stops.length, 'warnings:', plan.warnings.length);
}finally{
  globalThis.fetch = origFetch;
}
