#!/usr/bin/env node
/**
 * Длинные спокойные demo-GIF для VK:
 *  1) portrait 9:16 — Col du Galibier (плавный подъём) + редкие смены режимов
 *  2) landscape 16:9 — Ай-Петри (подъём) + редкая смена тем
 *
 *   npm run build
 *   node scripts/capture-vk-demo-gifs.mjs
 *   node scripts/capture-vk-demo-gifs.mjs --only=portrait
 *   node scripts/capture-vk-demo-gifs.mjs --only=landscape
 */
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs', 'assets', 'vk-post');
const PORT = 3462;
const BASE = `http://127.0.0.1:${PORT}`;

const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || 'all';

/**
 * Col du Galibier (ФР) — плавная дорога, sharp≈0.8%, подъём ~850 м.
 * Не серпантин-шпильки: лента не «ломается».
 */
const PORTRAIT_LEGS = [
  [45.0250, 6.4900],
  [45.0350, 6.4600],
  [45.0450, 6.4350],
  [45.0550, 6.4100],
  [45.0640, 6.3900],
];

/**
 * Ялта → Ай-Петри — плавный длинный подъём, sharp≈1.5%, Δh≈1100 м.
 */
const LANDSCAPE_LEGS = [
  [44.5000, 34.1400],
  [44.4800, 34.1000],
  [44.4600, 34.0700],
  [44.4450, 34.0550],
];

/** ~10× длиннее прежних (~10 с → ~90–100 с wall-clock) */
const PORTRAIT = {
  id: 'portrait',
  gif: path.join(OUT_DIR, 'hud-demo-portrait-serpentine.gif'),
  gpx: path.join(ROOT, 'fixtures', 'mountain-serpentine-demo.gpx'),
  framesDir: path.join(OUT_DIR, '_frames-portrait'),
  legs: PORTRAIT_LEGS,
  viewport: { width: 390, height: 844 },
  /**
   * VK анимирует GIF только при AR width/height ∈ [0.75 … 2.5]
   * (см. @authors … kak-publikovat-izobrazhenia). 9:16 = 0.56 → статичная картинка.
   * Portrait: 3:4 = 0.75.
   */
  outSize: { w: 540, h: 720 },
  dpr: 1,
  theme: 'avionics',
  mode: 'day',
  /** мс на кадр — медленнее = спокойнее */
  durationMs: 320,
  elevExag: 2.8,
  profileH: 80,
  profileLenKm: 3.5,
};

const LANDSCAPE = {
  id: 'landscape',
  gif: path.join(OUT_DIR, 'hud-demo-landscape-themes.gif'),
  gpx: path.join(ROOT, 'fixtures', 'crimea-coast-demo.gpx'),
  framesDir: path.join(OUT_DIR, '_frames-landscape'),
  legs: LANDSCAPE_LEGS,
  viewport: { width: 844, height: 390 },
  /** Landscape 16:9 ≈ 1.78 — внутри окна VK для анимированных GIF */
  outSize: { w: 720, h: 405 },
  dpr: 1,
  theme: 'avionics',
  mode: 'night',
  durationMs: 360,
  elevExag: 2.6,
  profileH: 64,
  profileLenKm: 3.5,
  /** мало тем, долго на каждой — без мельтешения */
  themes: [
    ['avionics', 'night'],
    ['sport', 'day'],
    ['vintage', 'day'],
  ],
};

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchOsrmCoords(legs) {
  const pathStr = legs.map(([lat, lon]) => `${lon},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${pathStr}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('OSRM HTTP ' + res.status);
  const j = await res.json();
  const coords = j.routes?.[0]?.geometry?.coordinates;
  if (!coords?.length) throw new Error('OSRM: пустая геометрия');
  return coords.map(([lon, lat]) => [lat, lon]);
}

/** Лёгкое сглаживание — убирает микропилу OSM без смены трассы */
function smoothCoords(coords, passes = 2) {
  let c = coords.map(p => [p[0], p[1]]);
  for (let p = 0; p < passes; p++) {
    const n = [c[0]];
    for (let i = 1; i < c.length - 1; i++) {
      n.push([
        (c[i - 1][0] + c[i][0] * 2 + c[i + 1][0]) / 4,
        (c[i - 1][1] + c[i][1] * 2 + c[i + 1][1]) / 4,
      ]);
    }
    n.push(c[c.length - 1]);
    c = n;
  }
  return c;
}

function writeGpx(file, coords, name, desc) {
  const t0 = Date.parse('2026-07-24T10:00:00Z');
  const pts = coords.map(([lat, lon], i) => {
    const t = new Date(t0 + i * 1500).toISOString().replace(/\.\d+Z$/, 'Z');
    return `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}"><time>${t}</time></trkpt>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="moto-hud"
  xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${name}</name>
    <desc>${desc}</desc>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>
`;
  fs.writeFileSync(file, xml, 'utf8');
  console.log('GPX', path.basename(file), 'pts', coords.length);
}

async function startServer() {
  const proc = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout?.on('data', () => {});
  proc.stderr?.on('data', () => {});
  proc.on('error', (e) => console.warn('http.server spawn:', e.message));

  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/index.html`);
      if (r.ok) {
        console.log('http.server ready', PORT);
        return proc;
      }
    } catch (e) { /* wait */ }
    await wait(300);
  }
  try { proc.kill('SIGTERM'); } catch (e) { /* ignore */ }
  throw new Error('http.server did not become ready on port ' + PORT);
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

async function waitForElev(page, timeout = 90000) {
  await page.waitForFunction(
    () => !!window.__motoHUD?.S?.route?.geometry?.elevReady,
    null,
    { timeout }
  ).catch(() => console.warn('elevReady timeout — продолжаем без гарантии высот'));
}

async function bootHud(page, cfg) {
  const gpxRel = path.relative(ROOT, cfg.gpx).replace(/\\/g, '/');
  const q = new URLSearchParams({
    sim: '1',
    theme: cfg.theme,
    mode: cfg.mode,
    autohud: '1',
    gpx: gpxRel,
  });
  await page.goto(`${BASE}/index.html?${q}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await wait(800);
  await waitForHud(page);
  await page.evaluate(async ({ elevExag, profileH, profileLenKm }) => {
    const hud = window.__motoHUD;
    const sim = window.__SIM__;
    document.getElementById('onboarding-modal')?.classList.remove('on');
    document.getElementById('legalModal')?.classList.remove('on');
    document.body.classList.remove('legal-gate');
    try { await hud?.doBuildRoute?.(); } catch (e) { /* ignore */ }
    const coords = hud?.S?.route?.coords;
    if (coords?.length >= 2 && sim?.setRoutePath) {
      sim.setRoutePath(coords.map(c => [c.lat ?? c[0], c.lon ?? c[1]]));
    }
    const S = hud.S;
    S.showElevProfile = true;
    S.elevExag = elevExag;
    S.elevProfileH = profileH;
    S.elevProfileLenKm = profileLenKm;
    try {
      localStorage.setItem('moto-hud-elev-opts', JSON.stringify({
        show: true, exag: elevExag, profileH, profileLenKm,
      }));
    } catch (e) { /* ignore */ }
    await hud?.startHud?.();
    sim?.onNavigationStart?.();
  }, {
    elevExag: cfg.elevExag,
    profileH: cfg.profileH,
    profileLenKm: cfg.profileLenKm,
  });
  await wait(1200);
  await waitForElev(page);
  await page.evaluate(() => {
    const hud = window.__motoHUD;
    const sim = window.__SIM__;
    const coords = hud?.S?.route?.coords;
    if (coords?.length >= 2 && sim?.setRoutePath) {
      sim.setRoutePath(coords.map(c => [c.lat ?? c[0], c.lon ?? c[1]]));
    }
    document.getElementById('hud')?.classList.add('chrome-reveal', 'chrome-btns-on');
  });
}

/** Плавное положение на пути: без скачков idx */
async function seekAndTick(page, frac, speed = 14) {
  await page.evaluate(({ f, spd }) => {
    const hud = window.__motoHUD;
    const sim = window.__SIM__;
    if (!sim?.PATH?.length) return;
    sim.onNavigationStart?.();
    const maxIdx = Math.max(0, sim.PATH.length - 2);
    const pos = Math.min(Math.max(f, 0), 0.995) * maxIdx;
    const idx = Math.floor(pos);
    const localFrac = pos - idx;
    sim.idx = idx;
    sim.frac = localFrac;
    sim.running = true;
    const a = sim.PATH[idx];
    const b = sim.PATH[Math.min(idx + 1, sim.PATH.length - 1)];
    const lat = a[0] + (b[0] - a[0]) * localFrac;
    const lon = a[1] + (b[1] - a[1]) * localFrac;
    const toRad = d => d * Math.PI / 180;
    const toDeg = r => (r * 180 / Math.PI + 360) % 360;
    const bearing = (p, q) => {
      const f1 = toRad(p[0]); const f2 = toRad(q[0]); const dl = toRad(q[1] - p[1]);
      const y = Math.sin(dl) * Math.cos(f2);
      const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
      return toDeg(Math.atan2(y, x));
    };
    // смотрим чуть вперёд по пути — стабильнее heading на плавных дугах
    const look = Math.min(idx + 3, sim.PATH.length - 1);
    const hdg = bearing([lat, lon], sim.PATH[look]);
    sim.injectFix?.({ lat, lon, speed: spd, heading: hdg, acc: 4 });
    hud?.onTick?.();
    document.getElementById('hud')?.classList.add('chrome-reveal', 'chrome-btns-on');
  }, { f: frac, spd: speed });
  await wait(55);
}

/** Длинный ровный проезд по фракции [from..to] */
async function driveSegment(page, grab, from, to, frames, speed = 14, logEvery = 40) {
  for (let s = 0; s < frames; s++) {
    const u = frames <= 1 ? 0 : s / (frames - 1);
    const frac = from + (to - from) * u;
    // скорость чуть дышит, без дёрганых скачков
    const spd = speed + Math.sin(u * Math.PI * 2) * 1.5;
    await seekAndTick(page, frac, spd);
    await grab(1);
    if (s % logEvery === 0) console.log('  drive', frac.toFixed(3), `${s + 1}/${frames}`);
  }
}

async function showTap(page, selector) {
  await page.evaluate((sel) => {
    document.getElementById('vk-tap-ripple')?.remove();
    const el = document.querySelector(sel);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const d = document.createElement('div');
    d.id = 'vk-tap-ripple';
    Object.assign(d.style, {
      position: 'fixed',
      left: `${r.left + r.width / 2 - 30}px`,
      top: `${r.top + r.height / 2 - 30}px`,
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      border: '3px solid #ffffff',
      background: 'rgba(255,255,255,0.35)',
      boxShadow: '0 0 0 8px rgba(255,212,0,0.3)',
      zIndex: '2147483647',
      pointerEvents: 'none',
      transform: 'scale(0.35)',
      opacity: '1',
      transition: 'transform 0.45s ease-out, opacity 0.45s ease-out',
    });
    document.body.appendChild(d);
    requestAnimationFrame(() => {
      d.style.transform = 'scale(1.55)';
      d.style.opacity = '0';
    });
    setTimeout(() => d.remove(), 500);
  }, selector);
}

async function tapClick(page, selector) {
  await page.evaluate(() => {
    document.getElementById('hud')?.classList.add('chrome-reveal', 'chrome-btns-on');
  });
  await showTap(page, selector);
  await wait(220);
  const loc = page.locator(selector);
  if (await loc.count()) {
    await loc.first().click({ force: true });
  }
  await wait(450);
}

async function injectDemoFuel(page) {
  await page.evaluate(() => {
    const hud = window.__motoHUD;
    const S = hud?.S;
    const geom = S?.route?.geometry;
    if (!geom?.n || !S.gps) return;
    const curS = hud.getNavSnap?.(S.smoothedHeading)?.s ?? 0;
    const total = geom.s[geom.n - 1];
    const targets = [
      { ds: 450, brand: 'Роснефть', status: 'yes' },
      { ds: 1100, brand: 'Лукойл', status: 'queue' },
      { ds: 1900, brand: 'Газпромнефть', status: 'yes' },
    ];
    const stations = [];
    for (const t of targets) {
      const s = Math.min(total - 20, curS + t.ds);
      let i = 0;
      while (i < geom.n - 2 && geom.s[i + 1] < s) i++;
      const s0 = geom.s[i];
      const s1 = geom.s[i + 1];
      const u = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
      const lat = geom.lat[i] + (geom.lat[i + 1] - geom.lat[i]) * u;
      const lon = geom.lon[i] + (geom.lon[i + 1] - geom.lon[i]) * u;
      stations.push({
        osmId: 'demo-' + t.ds,
        lat: lat + 0.00012,
        lon: lon + 0.00018,
        brand: t.brand,
        name: t.brand,
        status: t.status,
        statusSource: 'demo',
        tags: {},
      });
    }
    S.fuelStations = stations;
    S.fuelStatus = 'ready';
    S.fuelSource = 'demo';
    S.fuelMode = 0;
    S.fuelSel = null;
  });
}

async function setNavMode(page, mode) {
  // mode: 'path' | 'map' | 'bearing'
  await page.evaluate((m) => {
    const hud = window.__motoHUD;
    if (!hud) return;
    if (m === 'path') {
      hud.simNavAction?.('path');
      if (hud.S?.viewMode && hud.S.viewMode !== 'hud') hud.setViewMode?.('hud');
    } else if (m === 'map') {
      hud.setViewMode?.('map_zoom');
    } else if (m === 'bearing') {
      if (!hud.isBearingMode?.()) hud.simNavAction?.('bearing');
    }
    document.getElementById('hud')?.classList.add('chrome-reveal', 'chrome-btns-on');
  }, mode);
  await wait(400);
}

async function shot(page, framesDir, i) {
  const out = path.join(framesDir, `frame-${String(i).padStart(4, '0')}.png`);
  await page.screenshot({ path: out, fullPage: false, animations: 'disabled' });
  return out;
}

function clearFrames(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.png')) fs.unlinkSync(path.join(dir, f));
  }
}

function assembleGif(cfg) {
  const py = `
from PIL import Image
import os, glob
frames_dir = r'''${cfg.framesDir.replace(/\\/g, '/')}'''
out = r'''${cfg.gif.replace(/\\/g, '/')}'''
tw, th = ${cfg.outSize.w}, ${cfg.outSize.h}
files = sorted(glob.glob(os.path.join(frames_dir, 'frame-*.png')))
if not files:
    raise SystemExit('no frames')
imgs = []
for f in files:
    im = Image.open(f).convert('RGBA')
    sw, sh = im.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(sw * scale + 0.5), int(sh * scale + 0.5)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    im = im.crop((left, top, left + tw, top + th))
    imgs.append(im.convert('P', palette=Image.ADAPTIVE, colors=80))
imgs[0].save(
    out,
    save_all=True,
    append_images=imgs[1:],
    duration=${cfg.durationMs},
    loop=0,
    optimize=True,
    disposal=2,
)
sec = len(imgs) * ${cfg.durationMs} / 1000
print('GIF', out, 'frames', len(imgs), 'px', tw, th, 'sec', round(sec,1), 'size_kb', os.path.getsize(out)//1024)
`;
  const r = spawnSync('python', ['-c', py], { encoding: 'utf8' });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) throw new Error('Pillow GIF failed: ' + cfg.id);
}

async function capturePortrait(browser) {
  const cfg = PORTRAIT;
  clearFrames(cfg.framesDir);
  console.log('OSRM portrait (Galibier climb)…');
  const raw = await fetchOsrmCoords(cfg.legs);
  const coords = smoothCoords(raw, 2);
  writeGpx(cfg.gpx, coords, 'Col du Galibier (подъём)', 'VK portrait demo — smooth climb');

  const context = await browser.newContext({
    viewport: cfg.viewport,
    deviceScaleFactor: cfg.dpr,
    locale: 'ru-RU',
    colorScheme: 'dark',
  });
  await context.addInitScript(({ elevExag, profileH, profileLenKm }) => {
    localStorage.setItem('moto-hud-legal-consent', JSON.stringify({
      version: 1, ts: new Date().toISOString(),
    }));
    localStorage.setItem('moto-hud-onboarding-v1', '1');
    localStorage.setItem('moto-hud-elev-opts', JSON.stringify({
      show: true, exag: elevExag, profileH, profileLenKm,
    }));
  }, {
    elevExag: cfg.elevExag,
    profileH: cfg.profileH,
    profileLenKm: cfg.profileLenKm,
  });
  const page = await context.newPage();
  let i = 0;
  const grab = async (n = 1) => {
    for (let k = 0; k < n; k++) await shot(page, cfg.framesDir, i++);
  };

  try {
    await bootHud(page, cfg);
    await injectDemoFuel(page);

    // ── 1) Долгая езда ДОР — высоты, без смены режимов (~35 с)
    console.log('portrait: long path drive');
    await setNavMode(page, 'path');
    await driveSegment(page, grab, 0.05, 0.42, 110, 13, 30);

    // ── 2) Один раз ⛽ — держим панель, едем (~18 с). Без цикла тапов.
    console.log('portrait: fuel hold');
    await seekAndTick(page, 0.42, 12);
    await tapClick(page, '#btn-fuel');
    await grab(4);
    await driveSegment(page, grab, 0.42, 0.52, 50, 11, 25);

    // ── 3) Закрыть топливо один раз, снова ДОР (~12 с)
    console.log('portrait: fuel close → path');
    await tapClick(page, '#btn-fuel');
    await grab(3);
    await driveSegment(page, grab, 0.52, 0.62, 35, 13, 20);

    // ── 4) КАРТА один раз — долго держим (~16 с)
    console.log('portrait: map hold');
    await showTap(page, '#btn-nav-map');
    await wait(280);
    await setNavMode(page, 'map');
    await grab(5);
    for (let s = 0; s < 45; s++) {
      const frac = 0.62 + (0.10 * s) / 44;
      await seekAndTick(page, frac, 13);
      await page.evaluate(() => {
        if (window.__motoHUD?.S?.viewMode === 'hud') {
          window.__motoHUD.setViewMode('map_zoom');
        }
        document.getElementById('hud')?.classList.add('chrome-reveal', 'chrome-btns-on');
      });
      await grab(1);
    }

    // ── 5) ПЕЛЕНГ один раз — долго (~14 с)
    console.log('portrait: bearing hold');
    await showTap(page, '#btn-nav-bearing');
    await wait(280);
    await setNavMode(page, 'bearing');
    await grab(5);
    await driveSegment(page, grab, 0.72, 0.84, 40, 12, 20);

    // ── 6) Обратно ДОР + финал подъёма (~16 с)
    console.log('portrait: path finale');
    await showTap(page, '#btn-nav-path');
    await wait(280);
    await setNavMode(page, 'path');
    await grab(4);
    await driveSegment(page, grab, 0.84, 0.96, 45, 13, 20);

    console.log('portrait frames', i, '≈sec', (i * cfg.durationMs / 1000).toFixed(1));
  } finally {
    await context.close();
  }
  assembleGif(cfg);
}

async function captureLandscape(browser) {
  const cfg = LANDSCAPE;
  clearFrames(cfg.framesDir);
  console.log('OSRM landscape (Ai-Petri climb)…');
  const raw = await fetchOsrmCoords(cfg.legs);
  const coords = smoothCoords(raw, 2);
  writeGpx(cfg.gpx, coords, 'Ай-Петри (подъём)', 'VK landscape themes — smooth climb');

  const context = await browser.newContext({
    viewport: cfg.viewport,
    deviceScaleFactor: cfg.dpr,
    locale: 'ru-RU',
    colorScheme: 'dark',
  });
  await context.addInitScript(({ elevExag, profileH, profileLenKm }) => {
    localStorage.setItem('moto-hud-legal-consent', JSON.stringify({
      version: 1, ts: new Date().toISOString(),
    }));
    localStorage.setItem('moto-hud-onboarding-v1', '1');
    localStorage.setItem('moto-hud-elev-opts', JSON.stringify({
      show: true, exag: elevExag, profileH, profileLenKm,
    }));
  }, {
    elevExag: cfg.elevExag,
    profileH: cfg.profileH,
    profileLenKm: cfg.profileLenKm,
  });
  const page = await context.newPage();
  let i = 0;
  const grab = async (n = 1) => {
    for (let k = 0; k < n; k++) await shot(page, cfg.framesDir, i++);
  };

  try {
    await bootHud(page, cfg);
    await setNavMode(page, 'path');

    const themes = cfg.themes;
    const perTheme = 85; // ~30 с на тему при 360 ms
    for (let t = 0; t < themes.length; t++) {
      const [theme, mode] = themes[t];
      console.log('landscape theme', theme, mode);
      await page.evaluate(({ theme: th, mode: md }) => {
        window.__motoHUD?.simApplyTheme?.(th, md);
        document.getElementById('hud')?.classList.add('chrome-reveal', 'chrome-btns-on');
      }, { theme, mode });
      await wait(500);
      await grab(4); // пауза на новой теме — глаз успевает

      const f0 = 0.06 + (t / themes.length) * 0.78;
      const f1 = 0.06 + ((t + 1) / themes.length) * 0.78;

      // почти вся тема — только ДОР; карту показываем один раз на средней теме
      const showMap = t === 1;
      for (let s = 0; s < perTheme; s++) {
        const u = s / (perTheme - 1);
        const frac = f0 + (f1 - f0) * u;
        if (showMap && s === 28) {
          await showTap(page, '#btn-nav-map');
          await wait(250);
          await setNavMode(page, 'map');
          await grab(4);
        }
        if (showMap && s === 55) {
          await showTap(page, '#btn-nav-path');
          await wait(250);
          await setNavMode(page, 'path');
          await grab(3);
        }
        await seekAndTick(page, frac, 13 + Math.sin(u * Math.PI) * 1.2);
        if (showMap && s >= 28 && s < 55) {
          await page.evaluate(() => {
            if (window.__motoHUD?.S?.viewMode === 'hud') {
              window.__motoHUD.setViewMode('map_zoom');
            }
          });
        }
        await grab(1);
      }
      console.log('  frames so far', i);
    }
    console.log('landscape frames', i, '≈sec', (i * cfg.durationMs / 1000).toFixed(1));
  } finally {
    await context.close();
  }
  assembleGif(cfg);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(path.join(ROOT, 'js', 'app.js'))) {
    console.warn('run npm run build first');
  }

  const server = await startServer();
  await wait(500);
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });

  try {
    if (ONLY === 'all' || ONLY === 'portrait') {
      await capturePortrait(browser);
    }
    if (ONLY === 'all' || ONLY === 'landscape') {
      await captureLandscape(browser);
    }
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }

  console.log('Done.');
  if (ONLY === 'all' || ONLY === 'portrait') console.log(' →', PORTRAIT.gif);
  if (ONLY === 'all' || ONLY === 'landscape') console.log(' →', LANDSCAPE.gif);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
