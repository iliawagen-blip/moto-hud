/**
 * Контекст плана в HUD: км до ночёвки и плановой заправки.
 * @module trip-hud-context
 */
import { S } from './state.js';
import { getDayVariant } from './trip-model.js';
import { haversine } from './geo.js';
import { buildRoutePolyline, projectToPolyline } from './trip-fuel.js';
import { getDayEndPoint } from './trip-rebuild.js';
import { curPos } from './gps.js';

function fmtDist(m){
  if(m == null || !isFinite(m)) return '—';
  if(m < 1000) return Math.round(m / 10) * 10 + ' м';
  return (m / 1000).toFixed(1).replace('.', ',') + ' км';
}

function findSegment(day, label){
  for(const v of day?.variants || []){
    const seg = v.segments?.find(s => s.label === label);
    if(seg) return { seg, variantId: v.id };
  }
  return null;
}

function nextPlannedFuelStop(seg, pos){
  const plan = seg?.fuelPlan;
  if(!plan?.stops?.length || !pos) return null;
  const poly = buildRoutePolyline(seg.rtext);
  const here = projectToPolyline(poly, pos);
  const ahead = plan.stops
    .filter(st => st.routeKm * 1000 > here.routeM + 500)
    .sort((a, b) => a.routeKm - b.routeKm);
  const st = ahead[0];
  if(!st) return null;
  const stPos = { lat: st.lat, lon: st.lon };
  return {
    label: st.brand || st.name || 'АЗС',
    distM: haversine(pos, stPos),
    routeKm: st.routeKm,
    source: 'plan'
  };
}

/**
 * @returns {{ night: object|null, fuel: object|null }|null}
 */
export function getTripHudDistances(){
  const ctx = S.tripContext;
  const trip = S.activeTrip;
  const pos = curPos() || S.gps;
  if(!ctx || !trip || !pos) return null;

  const day = trip.days.find(d => d.n === ctx.dayN);
  if(!day) return null;

  const vid = ctx.variantId || 'calm';
  const nightPt = getDayEndPoint(day, vid);
  let night = null;
  if(nightPt){
    night = {
      label: (getDayVariant(day, vid)?.night || nightPt.label || 'ночёвка').replace(/^🌙\s*/, ''),
      distM: haversine(pos, nightPt)
    };
  }

  let fuel = null;
  const found = ctx.segmentLabel ? findSegment(day, ctx.segmentLabel) : null;
  const seg = found?.seg || getDayVariant(day, vid)?.segments?.[0];
  fuel = nextPlannedFuelStop(seg, pos);

  if(!fuel && S.fuelSel && S.fuelMode > 0){
    const d = S.fuelMode === 2
      ? (S.route ? null : S.fuelSel.distGps)
      : (S.fuelSel.distAhead ?? S.fuelSel.distGps);
    if(d != null){
      fuel = {
        label: S.fuelSel.brand || 'АЗС',
        distM: d,
        source: S.fuelSel.statusSource === 'crowd' || S.fuelSel.statusSource === 'gdebenz' ? 'live' : 'osm'
      };
    }
  }

  return { night, fuel };
}

export function formatTripHudExtraLine(){
  const d = getTripHudDistances();
  if(!d) return '';
  const parts = [];
  if(d.night) parts.push('🌙 ' + d.night.label + ' ' + fmtDist(d.night.distM));
  if(d.fuel){
    const tag = d.fuel.source === 'plan' ? 'план' : (d.fuel.source === 'live' ? 'факт' : 'OSM');
    parts.push('⛽ ' + d.fuel.label + ' ' + fmtDist(d.fuel.distM) + ' (' + tag + ')');
  }
  return parts.join(' · ');
}
