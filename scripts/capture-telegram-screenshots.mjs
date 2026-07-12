#!/usr/bin/env node
/**
 * Скриншоты HUD для Telegram-поста (Playwright + локальный serve).
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'assets', 'telegram-post');
const PORT = 3457;
const BASE = `http://127.0.0.1:${PORT}`;

const SHOTS = [
  { file: '01-hud-avionics.png', theme: 'avionics', mode: 'night', action: 'hud' },
  { file: '02-hud-vintage.png', theme: 'vintage', mode: 'night', action: 'hud' },
  { file: '03-hud-sport.png', theme: 'sport', mode: 'night', action: 'hud' },
  { file: '04-map-overview.png', theme: 'avionics', mode: 'night', action: 'map' },
  { file: '05-hud-day.png', theme: 'avionics', mode: 'day', action: 'hud' },
  { file: '06-cameras-onboarding.png', theme: 'avionics', mode: 'night', action: 'onboarding' },
];

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['--yes', 'serve', '-l', String(PORT), '-c', 'serve.json', '.'],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' }
    );
    let ready = false;
    const onData = (buf) => {
      const s = buf.toString();
      if (!ready && /Accepting|http:\/\/127\.0\.0\.1/i.test(s)) {
        ready = true;
        resolve(proc);
      }
    };
    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);
    proc.on('error', reject);
    setTimeout(() => {
      if (!ready) resolve(proc);
    }, 8000);
  });
}

async function waitForHud(page, timeout = 60000) {
  await page.waitForFunction(
    () => document.getElementById('hud')?.classList.contains('on'),
    null,
    { timeout }
  );
  await page.waitForFunction(
    () => {
      const s = window.__motoHUD?.S;
      return s?.route?.coords?.length >= 2 || (s?.route?.geometry?.n >= 2);
    },
    null,
    { timeout }
  );
}

async function advanceSim(page) {
  await page.evaluate(async () => {
    const hud = window.__motoHUD;
    const sim = window.__SIM__;
    if (hud?.S?.route && !(hud.S.route.geometry?.n >= 2 || hud.S.route.coords?.length >= 2)) {
      try { await hud.doBuildRoute?.(); } catch (e) { /* ignore */ }
    }
    sim?.onNavigationStart?.();
    if (!sim?.PATH?.length) return;
    const idx = Math.min(Math.floor(sim.PATH.length * 0.42), sim.PATH.length - 2);
    sim.idx = idx;
    sim.frac = 0.55;
    sim.running = true;
    const a = sim.PATH[idx];
    const b = sim.PATH[Math.min(idx + 1, sim.PATH.length - 1)];
    const toRad = d => d * Math.PI / 180;
    const toDeg = r => (r * 180 / Math.PI + 360) % 360;
    const bearing = (p, q) => {
      const f1 = toRad(p[0]); const f2 = toRad(q[0]); const dl = toRad(q[1] - p[1]);
      const y = Math.sin(dl) * Math.cos(f2);
      const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
      return toDeg(Math.atan2(y, x));
    };
    const hdg = bearing(a, b);
    sim.injectFix?.({ lat: a[0], lon: a[1], speed: 18, heading: hdg, acc: 4 });
    hud?.onTick?.();
  });
  await wait(2500);
}

async function captureOne(page, shot) {
  const q = new URLSearchParams({
    sim: '1',
    theme: shot.theme,
    mode: shot.mode,
  });
  if (shot.action !== 'onboarding') {
    q.set('autohud', '1');
    q.set('gpx', 'fixtures/serpentine-demo.gpx');
  }
  if (shot.action === 'onboarding') q.set('capture', 'onboarding');
  await page.goto(`${BASE}/index.html?${q}`, { waitUntil: 'networkidle', timeout: 90000 });
  if (shot.action === 'onboarding') {
    await page.waitForSelector('#onboarding-modal.on', { timeout: 45000 });
    await wait(800);
  } else {
    await waitForHud(page);
    await page.evaluate(() => {
      document.getElementById('onboarding-modal')?.classList.remove('on');
      document.getElementById('legalModal')?.classList.remove('on');
      document.body.classList.remove('legal-gate');
    });
    await advanceSim(page);
  }

  if (shot.action === 'onboarding') {
    /* modal already visible */
  } else if (shot.action === 'map') {
    await page.evaluate(async () => {
      await window.__motoHUD?.simNavAction?.('map');
    });
    await wait(2000);
  }

  const outPath = path.join(OUT, shot.file);
  await page.screenshot({ path: outPath, fullPage: false, animations: 'disabled' });
  console.log('OK', shot.file);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await startServer();
  await wait(1200);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'ru-RU',
    colorScheme: 'dark',
  });
  await context.addInitScript(() => {
    localStorage.setItem('moto-hud-legal-consent', JSON.stringify({
      version: 1,
      ts: new Date().toISOString(),
    }));
    const fresh = new URLSearchParams(location.search).get('capture') === 'onboarding';
    if (fresh) localStorage.removeItem('moto-hud-onboarding-v1');
    else localStorage.setItem('moto-hud-onboarding-v1', '1');
  });
  const page = await context.newPage();

  try {
    for (const shot of SHOTS) {
      await captureOne(page, shot);
    }
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }

  console.log('Saved to', OUT);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
