/**
 * Прогон одного fixture × режим sim.
 */
import fs from 'fs';
import path from 'path';
import {
  buildPathWalker, addNoise, mulberry32, truncatePolyline, haversine, offsetPolyline
} from './lib/gps-path.mjs';
import { summarizeTicks, evaluateMode } from './lib/assertions.mjs';
import {
  acceptLegal, prepareFixtureRun, injectFixAndSample, readHudCrash
} from './lib/page-helpers.mjs';

function pickDeviationPolyline(fixture, caches, motohudPolyline, offsetM){
  const order = ['yandex_web', 'graphhopper', 'openrouteservice'];
  for(const p of order){
    const pl = caches[p]?.polyline;
    if(pl?.length >= 2) return { provider: p, polyline: pl };
  }
  return { provider: 'offset', polyline: offsetPolyline(motohudPolyline, offsetM || 65) };
}

function expectedDurationS(distanceM, speedKmh, durationFromCache){
  if(durationFromCache > 0) return durationFromCache;
  const mps = (speedKmh || 50) / 3.6;
  return distanceM / Math.max(mps, 1);
}

/**
 * @param {import('playwright').Page} page
 */
export async function runSimMode(page, opts){
  const {
    fixture,
    mode,
    motohudCache,
    refCaches,
    simCfg,
    thresholds,
    outDir,
    seed
  } = opts;

  const frameEl = await page.$('#frame');
  const content = await frameEl.contentFrame();
  if(!content) throw new Error('iframe not ready');

  await acceptLegal(content);

  const speedKmh = fixture.constraints?.sim_speed_kmh || 50;
  const speedMps = speedKmh / 3.6;
  const timeScale = simCfg.time_scale || 10;
  const gpsHz = simCfg.gps_hz || 1;
  const tickRealMs = 1000 / (gpsHz * timeScale);
  const rng = mulberry32(seed);

  let drivePolyline = motohudCache.polyline;
  if(mode === 'deviation'){
    const useRef = simCfg.use_reference_deviation === true;
    const dev = useRef
      ? pickDeviationPolyline(fixture, refCaches, motohudCache.polyline, simCfg.deviation_offset_m || 65)
      : { provider: 'offset', polyline: offsetPolyline(motohudCache.polyline, simCfg.deviation_offset_m || 65) };
    drivePolyline = dev.polyline;
  }

  const maxDistM = simCfg.max_simulated_distance_km
    ? simCfg.max_simulated_distance_km * 1000
    : null;
  if(maxDistM) drivePolyline = truncatePolyline(drivePolyline, maxDistM);

  const walker = buildPathWalker(drivePolyline);
  const finish = fixture.waypoints[fixture.waypoints.length - 1];
  const arrivalR = simCfg.arrival_radius_m || 20;
  const maxDurFactor = simCfg.max_duration_factor || 1.2;
  const maxSimS = simCfg.max_simulated_duration_s
    || expectedDurationS(walker.totalM, speedKmh, motohudCache.duration_s) * maxDurFactor;

  let sigma = 0;
  let accRange = null;
  if(mode === 'on_route') sigma = simCfg.noise_sigma_m || 8;
  if(mode === 'noise_stress'){
    sigma = simCfg.noise_stress_sigma_m || 50;
    accRange = [simCfg.noise_stress_acc_min_m || 100, simCfg.noise_stress_acc_max_m || 200];
  }

  await prepareFixtureRun(content, {
    cache: motohudCache,
    waypoints: fixture.waypoints,
    timeScale
  });

  const ticks = [];
  let distM = 0;
  let simS = 0;
  let crash = null;
  const stepM = speedMps / gpsHz;

  const telemetryPath = path.join(outDir, `${fixture.fixture_id}_${mode}.jsonl`);
  fs.mkdirSync(outDir, { recursive: true });
  const telStream = fs.createWriteStream(telemetryPath, { flags: 'w' });

  const stressUntilS = mode === 'noise_stress' ? (simCfg.noise_stress_duration_s || 45) : 0;
  const recoverAfterS = mode === 'noise_stress' ? (simCfg.noise_recover_after_s || 50) : Infinity;

  try{
    while(simS < maxSimS){
      const pos = walker.at(distM);
      let lat = pos.lat, lon = pos.lon;
      let activeSigma = sigma;
      if(mode === 'noise_stress'){
        if(simS >= recoverAfterS) activeSigma = 0;
        else if(simS >= stressUntilS) activeSigma = (simCfg.noise_sigma_m || 8);
      }
      if(activeSigma > 0){
        const noisy = addNoise(lat, lon, activeSigma, rng);
        lat = noisy.lat;
        lon = noisy.lon;
      }
      let acc = 5;
      if(accRange){
        acc = accRange[0] + rng() * (accRange[1] - accRange[0]);
        if(Math.floor(simS) % 7 === 0 && simS > 0) acc = accRange[1];
      }

      const tick = await injectFixAndSample(content, {
        lat, lon,
        heading: pos.heading,
        speedMps,
        acc,
        sim_s: Math.round(simS * 10) / 10,
        mode,
        routeDistM: distM,
        dist_m: Math.round(distM * 10) / 10
      });
      ticks.push(tick);
      telStream.write(JSON.stringify(tick) + '\n');

      crash = await readHudCrash(content);
      if(crash) break;

      const dFin = haversine([lat, lon], [finish.lat, finish.lon]);
      if(mode !== 'deviation' && dFin <= arrivalR) break;

      if(mode === 'deviation'){
        const off = tick.off_route_state && tick.off_route_state !== 'ON_ROUTE';
        if(off) break;
        if(simS >= (thresholds.deviation?.off_route_within_s_max || 15) + 5) break;
      }

      distM += stepM;
      simS += 1 / gpsHz;
      if(distM >= walker.totalM) break;

      await page.waitForTimeout(tickRealMs);
    }
  }catch(e){
    crash = String(e.message || e);
  }finally{
    telStream.end();
  }

  const screenshotPath = path.join(outDir, `${fixture.fixture_id}_${mode}.png`);
  try{
    await content.locator('#hud').screenshot({ path: screenshotPath, timeout: 8000 });
  }catch(e){
    try{ await page.screenshot({ path: screenshotPath }); }catch(e2){ /* ignore */ }
  }

  const metrics = summarizeTicks(ticks);
  metrics.sim_duration_s = Math.round(simS * 10) / 10;
  metrics.distance_m = Math.round(distM);
  const { pass, assertions } = evaluateMode(mode, metrics, thresholds, crash);

  return {
    fixture_id: fixture.fixture_id,
    mode,
    pass,
    skipped: false,
    metrics,
    assertions,
    telemetry_path: telemetryPath,
    screenshot: screenshotPath,
    crash,
    finished_at: new Date().toISOString()
  };
}
