/**
 * Playwright: подготовка sim.html и iframe HUD.
 */
import { spawn } from 'child_process';
import http from 'http';

export async function waitHttp(url, ms = 45000){
  const t0 = Date.now();
  while(Date.now() - t0 < ms){
    try{
      const ok = await new Promise((resolve, reject) => {
        const req = http.get(url, res => {
          res.resume();
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        });
        req.on('error', reject);
        req.setTimeout(4000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      if(ok) return true;
    }catch(e){ /* retry */ }
    await new Promise(r => setTimeout(r, 350));
  }
  return false;
}

export function startStaticServer(port, cwd){
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['--yes', 'serve', '-l', String(port), '-c', 'serve.json', '.'], {
      cwd,
      shell: true,
      stdio: 'ignore'
    });
    const url = `http://127.0.0.1:${port}/sim.html`;
    setTimeout(async () => {
      const up = await waitHttp(url);
      if(up) resolve({ proc, baseUrl: `http://127.0.0.1:${port}` });
      else { proc.kill(); reject(new Error('static server failed')); }
    }, 2800);
    proc.on('error', reject);
  });
}

export async function waitForHudFrame(page, timeout = 60000){
  await page.waitForFunction(() => {
    const f = document.getElementById('frame');
    const w = f?.contentWindow;
    return !!(w?.__SIM__ && w?.__motoHUD?.prepareRegressionHud);
  }, { timeout });
}

export async function acceptLegal(frame){
  await frame.evaluate(() => {
    try{
      localStorage.setItem('moto-hud-legal-consent', JSON.stringify({ version: 1, ts: new Date().toISOString() }));
    }catch(e){}
    const m = document.getElementById('legalModal');
    if(m) m.classList.remove('on');
    document.body?.classList.remove('legal-gate');
  });
}

export async function prepareFixtureRun(frame, { cache, waypoints, timeScale }){
  await frame.evaluate(({ cache: c, waypoints: wps, timeScale: ts }) => {
    window.__SIM__?.freezeGps?.();
    window.__motoHUD.prepareRegressionHud({ cache: c, waypoints: wps, timeScale: ts });
    window.__motoHUD.startHud();
  }, { cache, waypoints, timeScale });
}

export async function injectFixAndSample(frame, fix){
  return frame.evaluate(({ fix: f }) => {
    const spdMps = f.speedMps ?? 0;
    window.__SIM__.injectFix({
      lat: f.lat,
      lon: f.lon,
      heading: f.heading,
      speed: spdMps,
      acc: f.acc ?? 5
    });
    return window.__motoHUD.sampleRegressionState({ sim_s: f.sim_s, mode: f.mode });
  }, { fix });
}

export async function readHudCrash(frame){
  return frame.evaluate(() => window.__REGRESSION_CRASH__ || null);
}
