#!/usr/bin/env node
/**
 * Горный серпантин → GPX + GIF HUD (прогноз-дорожка + профиль высот) для VK.
 * Запуск: node scripts/capture-vk-elev-gif.mjs
 */
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs', 'assets', 'vk-post');
const GPX_PATH = path.join(ROOT, 'fixtures', 'mountain-serpentine-demo.gpx');
const GIF_PATH = path.join(OUT_DIR, 'hud-elevation-serpentine.gif');
const FRAMES_DIR = path.join(OUT_DIR, '_frames-elev');
const PORT = 3461;
const BASE = `http://127.0.0.1:${PORT}`;

/** Короткие горные ноги (Сочи / Красная Поляна) — OSRM даёт серпантин с перепадом */
const MOUNTAIN_LEGS = [
  [43.66850, 40.25880],
  [43.67820, 40.27240],
  [43.68910, 40.28950],
  [43.70240, 40.30120],
];

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchOsrmCoords() {
  const pathStr = MOUNTAIN_LEGS.map(([lat, lon]) => `${lon},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${pathStr}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('OSRM HTTP ' + res.status);
  const j = await res.json();
  const coords = j.routes?.[0]?.geometry?.coordinates;
  if (!coords?.length) throw new Error('OSRM: пустая геометрия');
  // geojson: [lon, lat] → [lat, lon]
  return coords.map(([lon, lat]) => [lat, lon]);
}

function writeGpx(coords) {
  const t0 = Date.parse('2026-07-23T10:00:00Z');
  const pts = coords.map(([lat, lon], i) => {
    const t = new Date(t0 + i * 2000).toISOString().replace(/\.\d+Z$/, 'Z');
    return `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"><time>${t}</time></trkpt>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="moto-hud"
  xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Горный серпантин (Сочи / Красная Поляна)</name>
    <desc>Демо для профиля высот и прогноз-дорожки VK</desc>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>
`;
  fs.writeFileSync(GPX_PATH, xml, 'utf8');
  console.log('GPX', GPX_PATH, 'points', coords.length);
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
    setTimeout(() => { if (!ready) resolve(proc); }, 8000);
  });
}

async function waitForHud(page, timeout = 90000) {
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

async function waitForElevation(page, timeout = 90000) {
  await page.waitForFunction(
    () => {
      const g = window.__motoHUD?.S?.route?.geometry;
      if (!g?.elevReady || !g.elev?.length) return false;
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < g.elev.length; i++) {
        const e = g.elev[i];
        if (e < min) min = e;
        if (e > max) max = e;
      }
      return max - min > 40;
    },
    null,
    { timeout }
  );
  const span = await page.evaluate(() => {
    const g = window.__motoHUD.S.route.geometry;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < g.elev.length; i++) {
      const e = g.elev[i];
      if (e < min) min = e;
      if (e > max) max = e;
    }
    return { min, max, d: max - min, n: g.n };
  });
  console.log('elev span m', span);
  return span;
}

async function syncSimToRoute(page) {
  await page.evaluate(() => {
    const hud = window.__motoHUD;
    const sim = window.__SIM__;
    const coords = hud?.S?.route?.coords;
    if (coords?.length >= 2 && sim?.setRoutePath) {
      sim.setRoutePath(coords.map(c => [c.lat ?? c[0], c.lon ?? c[1]]));
    }
    const S = hud.S;
    S.showElevProfile = true;
    S.elevExag = 2.8;
    try {
      localStorage.setItem('moto-hud-elev-opts', JSON.stringify({
        show: true, exag: 2.8, profileH: 88, profileLenKm: 3
      }));
    } catch (e) { /* ignore */ }
    document.getElementById('onboarding-modal')?.classList.remove('on');
    document.getElementById('legalModal')?.classList.remove('on');
    document.body.classList.remove('legal-gate');
  });
}

async function seekAndTick(page, frac) {
  await page.evaluate((f) => {
    const hud = window.__motoHUD;
    const sim = window.__SIM__;
    if (!sim?.PATH?.length) return;
    sim.onNavigationStart?.();
    const idx = Math.min(Math.floor(sim.PATH.length * f), sim.PATH.length - 2);
    sim.idx = idx;
    sim.frac = 0.4;
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
    sim.injectFix?.({ lat: a[0], lon: a[1], speed: 16, heading: hdg, acc: 4 });
    hud?.onTick?.();
  }, frac);
  await wait(180);
}

function assembleGif() {
  const py = `
from PIL import Image
import os, glob
frames_dir = r'''${FRAMES_DIR.replace(/\\/g, '/')}'''
out = r'''${GIF_PATH.replace(/\\/g, '/')}'''
files = sorted(glob.glob(os.path.join(frames_dir, 'frame-*.png')))
if not files:
    raise SystemExit('no frames')
imgs = []
for f in files:
    im = Image.open(f).convert('P', palette=Image.ADAPTIVE, colors=128)
    imgs.append(im)
imgs[0].save(
    out,
    save_all=True,
    append_images=imgs[1:],
    duration=90,
    loop=0,
    optimize=True,
    disposal=2,
)
print('GIF', out, 'frames', len(imgs), 'size_kb', os.path.getsize(out)//1024)
`;
  const r = spawnSync('python', ['-c', py], { encoding: 'utf8' });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) throw new Error('Pillow GIF failed');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  for (const f of fs.readdirSync(FRAMES_DIR)) {
    if (f.endsWith('.png')) fs.unlinkSync(path.join(FRAMES_DIR, f));
  }

  console.log('OSRM mountain route…');
  const coords = await fetchOsrmCoords();
  writeGpx(coords);

  const server = await startServer();
  await wait(1500);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1.5,
    locale: 'ru-RU',
    colorScheme: 'dark',
  });
  await context.addInitScript(() => {
    localStorage.setItem('moto-hud-legal-consent', JSON.stringify({
      version: 1, ts: new Date().toISOString(),
    }));
    localStorage.setItem('moto-hud-onboarding-v1', '1');
    localStorage.setItem('moto-hud-elev-opts', JSON.stringify({
      show: true, exag: 2.8, profileH: 88, profileLenKm: 3,
    }));
  });
  const page = await context.newPage();

  try {
    const q = new URLSearchParams({
      sim: '1',
      theme: 'avionics',
      mode: 'day',
      autohud: '1',
      gpx: 'fixtures/mountain-serpentine-demo.gpx',
    });
    await page.goto(`${BASE}/index.html?${q}`, { waitUntil: 'networkidle', timeout: 120000 });
    await waitForHud(page);
    await syncSimToRoute(page);
    // пересобрать маршрут по GPX-финишу после sync
    await page.evaluate(async () => {
      try { await window.__motoHUD?.doBuildRoute?.(); } catch (e) { /* ignore */ }
      window.__motoHUD?.startHud?.();
    });
    await wait(1500);
    await syncSimToRoute(page);
    await waitForElevation(page);

    // прогон по пути: ~36 кадров
    const frames = 36;
    for (let i = 0; i < frames; i++) {
      const frac = 0.08 + (0.75 * i) / (frames - 1);
      await seekAndTick(page, frac);
      const out = path.join(FRAMES_DIR, `frame-${String(i).padStart(3, '0')}.png`);
      await page.screenshot({ path: out, fullPage: false });
      if (i % 6 === 0) console.log('frame', i, 'frac', frac.toFixed(2));
    }
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }

  assembleGif();
  console.log('Done:', GIF_PATH);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
