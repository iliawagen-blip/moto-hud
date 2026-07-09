/**
 * E2E-проверка sim.html — все основные пользовательские сценарии.
 * Запуск: node scripts/sim-e2e.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';

const PORT = 3457;
const BASE = process.argv[2] || `http://127.0.0.1:${PORT}`;
const results = [];

function log(ok, name, detail = ''){
  results.push({ ok, name, detail });
  const mark = ok ? '✓' : '✗';
  console.log(`${mark} ${name}${detail ? ' — ' + detail : ''}`);
}

async function waitHttp(url, ms = 30000){
  const t0 = Date.now();
  while(Date.now() - t0 < ms){
    try{
      const res = await fetch(url, { method: 'GET', redirect: 'follow' });
      if(res.ok || (res.status >= 200 && res.status < 500)) return true;
    }catch(e){ /* retry */ }
    await new Promise(r => setTimeout(r, 400));
  }
  return false;
}

function startServer(){
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['--yes', 'serve', '-l', String(PORT), '-c', 'serve.json', '.'], {
      cwd: process.cwd(),
      shell: true,
      stdio: 'ignore'
    });
    setTimeout(async () => {
      const up = await waitHttp(`${BASE}/sim.html`);
      if(up) resolve(proc);
      else { proc.kill(); reject(new Error('Server did not start')); }
    }, 2500);
  });
}

async function getFrameApi(page){
  return page.evaluate(() => {
    try{
      const f = document.getElementById('frame');
      const win = f?.contentWindow;
      return {
        hasSim: !!win?.__SIM__,
        hasHud: !!win?.__motoHUD,
        hudOn: !!win?.document?.getElementById('hud')?.classList?.contains('on'),
        gps: win?.__motoHUD?.S?.gps ? true : false,
        route: !!(win?.__motoHUD?.S?.route?.coords?.length),
        finish: !!win?.__motoHUD?.S?.finish,
        offRoute: win?.__motoHUD?.S?.offRouteState || null,
        speedKmh: win?.__SIM__?.speedKmh ?? null,
        running: win?.__SIM__?.isRunning?.() ?? false
      };
    }catch(e){ return { error: String(e) }; }
  });
}

async function acceptLegalInFrame(page){
  await page.evaluate(() => {
    const win = document.getElementById('frame')?.contentWindow;
    if(!win) return;
    try{
      win.localStorage.setItem('moto-hud-legal-consent', JSON.stringify({
        version: 1,
        ts: new Date().toISOString()
      }));
    }catch(e){}
    const modal = win.document.getElementById('legalModal');
    if(modal) modal.classList.remove('on');
    win.document.body?.classList.remove('legal-gate');
  });
}

async function waitForRoute(page, timeout = 20000){
  await page.waitForFunction(() => {
    try{
      const win = document.getElementById('frame')?.contentWindow;
      return !!(win?.__motoHUD?.S?.route?.coords?.length);
    }catch(e){ return false; }
  }, { timeout });
}

async function buildRouteInFrame(page){
  await page.evaluate(async () => {
    const win = document.getElementById('frame').contentWindow;
    if(win.__motoHUD?.doBuildRoute) await win.__motoHUD.doBuildRoute();
  });
  await waitForRoute(page);
}

async function checkHudLayout(page){
  const r = await page.evaluate(() => {
    const doc = document.getElementById('frame')?.contentWindow?.document;
    const win = doc?.defaultView;
    if(!doc || !win) return { ok: false, detail: 'no frame' };
    const hud = doc.getElementById('hud');
    if(!hud?.classList.contains('on')) return { ok: false, detail: 'hud off' };
    hud.classList.add('chrome-reveal', 'chrome-btns-on', 'chrome-status-on', 'chrome-finish-on');
    const btns = doc.getElementById('hud-side-btns');
    if(btns) btns.scrollTop = 0;

    const hudR = hud.getBoundingClientRect();
    const padTop = parseFloat(win.getComputedStyle(hud).paddingTop) || 0;
    const safeTop = hudR.top + padTop;
    const visibleRect = el => {
      const r = el?.getBoundingClientRect();
      if(!r || r.width < 4 || r.height < 4) return null;
      const st = win.getComputedStyle(el);
      if(st.display === 'none' || st.visibility === 'hidden') return null;
      return r;
    };
    const overlap = (a, b) => a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);

    const stop = visibleRect(doc.getElementById('btn-stop'));
    const status = visibleRect(doc.querySelector('.statusbar'));
    const limit = visibleRect(doc.getElementById('speed-limit-sign'));
    const speed = visibleRect(doc.getElementById('v-speed'));
    const issues = [];

    if(status && status.top < safeTop - 1) issues.push('statusbar выше safe-top');
    if(stop && stop.top < safeTop - 1) issues.push('СТОП выше safe-top');
    if(stop && status && overlap(stop, status)) issues.push('СТОП перекрывает statusbar');
    if(limit && stop && overlap(limit, stop)) issues.push('лимит перекрывает СТОП');
    if(limit && speed){
      const cx = speed.left + speed.width * 0.5;
      const cy = speed.top + speed.height * 0.5;
      if(limit.left < cx && limit.right > cx && limit.top < cy && limit.bottom > cy){
        issues.push('лимит на цифре скорости');
      }
    }

    const limitEl = doc.getElementById('speed-limit-sign');
    const limitVisible = limitEl && !limitEl.classList.contains('hidden');
    const limitText = doc.getElementById('sls-num')?.textContent?.trim() || '';

    return {
      ok: issues.length === 0,
      detail: issues.length ? issues.join('; ') : `limit=${limitVisible ? limitText : 'hidden'}`,
      issues
    };
  });
  log(r.ok, 'HUD layout (перекрытия)', r.detail);
  return r.ok;
}

async function startHudInFrame(page){
  await acceptLegalInFrame(page);
  await page.evaluate(async () => {
    const win = document.getElementById('frame').contentWindow;
    if(win.__motoHUD?.startHud && !win.document.getElementById('hud').classList.contains('on')){
      await win.__motoHUD.startHud();
    }
  });
  await page.waitForFunction(() => {
    try{
      return !!document.getElementById('frame')?.contentWindow?.document?.getElementById('hud')?.classList?.contains('on');
    }catch(e){ return false; }
  }, { timeout: 15000 });
}

async function runDesktop(page){
  await page.goto(`${BASE}/sim.html`, { waitUntil: 'domcontentloaded' });
  log(true, 'sim.html загружается');

  await page.waitForSelector('#frame');
  await page.waitForFunction(() => {
    try{ return !!document.getElementById('frame')?.contentWindow?.__SIM__; }catch(e){ return false; }
  }, { timeout: 45000 });
  await acceptLegalInFrame(page);
  log(true, 'iframe: __SIM__ инициализирован');

  await page.waitForFunction(() => {
    try{ return !!document.getElementById('frame')?.contentWindow?.__motoHUD; }catch(e){ return false; }
  }, { timeout: 45000 });

  let api = await getFrameApi(page);
  log(!!api.hasHud, 'iframe: __motoHUD доступен', JSON.stringify(api));

  // Тема
  await page.click('#btn-theme-hitech');
  await page.waitForTimeout(800);
  const themeH = await page.evaluate(() => document.getElementById('theme-status')?.textContent || '');
  log(/Хайтек/i.test(themeH), 'Тема: Хайтек', themeH);

  await page.click('#btn-theme-vintage');
  await page.waitForTimeout(800);
  const themeV = await page.evaluate(() => document.getElementById('theme-status')?.textContent || '');
  log(/Винтаж/i.test(themeV), 'Тема: Винтаж', themeV);

  // Тема через select
  await page.selectOption('#sim-theme', 'space');
  await page.selectOption('#sim-mode', 'day');
  await page.waitForTimeout(600);
  const themeSpace = await page.evaluate(() => document.getElementById('theme-status')?.textContent || '');
  log(/Космос/i.test(themeSpace), 'Тема: select Космос', themeSpace);

  // Устройство / ориентация
  await page.selectOption('#sel-device', '412x915');
  await page.click('#btn-orient');
  await page.waitForTimeout(400);
  const phoneW = await page.evaluate(() => document.getElementById('phone')?.style.width || '');
  log(phoneW.includes('px'), 'Смена устройства и ориентации', phoneW);

  // Скорость
  await page.locator('#spd').evaluate(el => { el.value = '60'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(200);
  const spdLive = await page.evaluate(() => document.getElementById('sim-spd-live')?.textContent || '');
  log(spdLive.includes('GPS'), 'Слайдер скорости', spdLive);

  // Карта: пресет старта
  if(await page.locator('#sim-map-provider').count()){
    await page.selectOption('#sim-start-preset', 'vdnh');
    await page.waitForTimeout(500);
    const coords = await page.evaluate(() => document.getElementById('sim-start-coords')?.textContent || '');
    log(/55\.82/.test(coords), 'Карта: пресет ВДНХ', coords);

    const providers = await page.locator('#sim-map-provider option').count();
    if(providers > 1){
      await page.selectOption('#sim-map-provider', { index: 1 });
      log(true, 'Карта: смена провайдера');
    }
  } else {
    log(false, 'Карта: панель видна (desktop)');
  }

  // Построить маршрут в iframe
  try{
    await buildRouteInFrame(page);
    api = await getFrameApi(page);
    log(api.route, 'Построение маршрута OSRM', `coords: ${api.route}`);
  }catch(e){
    api = await getFrameApi(page);
    log(false, 'Построение маршрута OSRM', e.message);
  }

  // Перестроить маршрут
  if(await page.locator('#btn-sim-rebuild-route').count()){
    await page.click('#btn-sim-rebuild-route');
    try{
      await waitForRoute(page);
      log(true, 'Карта: ↻ перестроить маршрут');
    }catch(e){
      log(false, 'Карта: ↻ перестроить маршрут', e.message);
    }
  }

  // Пуск симуляции (до HUD — движение может не идти)
  await page.click('#btn-play');
  await page.waitForTimeout(600);
  api = await getFrameApi(page);
  log(api.running === true, '▶ Пуск симуляции', `running=${api.running}`);

  await page.click('#btn-play');
  await page.waitForTimeout(300);
  api = await getFrameApi(page);
  log(api.running === false, '⏸ Пауза симуляции');

  // Старт HUD (ПОЕХАЛИ)
  try{
    await startHudInFrame(page);
    api = await getFrameApi(page);
    log(api.hudOn && api.route, 'HUD запущен (ПОЕХАЛИ)', JSON.stringify(api));
    await checkHudLayout(page);
  }catch(e){
    api = await getFrameApi(page);
    log(false, 'HUD запущен (ПОЕХАЛИ)', e.message);
  }

  // После ПОЕХАЛИ симулятор движется сам — не жмём паузу
  await page.waitForTimeout(1200);
  api = await getFrameApi(page);
  log(api.running && api.hudOn, 'Движение GPS в HUD', `speed=${api.speedKmh} running=${api.running}`);

  await page.click('#btn-reset');
  await page.waitForTimeout(400);
  api = await getFrameApi(page);
  log(api.running === false, '↺ Сброс позиции');

  // GPX демо
  page.once('dialog', d => d.accept());
  await page.click('#btn-gpx-demo');
  await page.waitForTimeout(4000);
  api = await getFrameApi(page);
  const gpxOk = await page.evaluate(() => {
    try{
      const m = document.getElementById('frame').contentWindow.__SIM__?.gpxMeta;
      return m && m.points > 0;
    }catch(e){ return false; }
  });
  log(gpxOk, 'GPX демо-трек', JSON.stringify(api));

  // Перезагрузка меню
  await page.click('#btn-reload');
  await page.waitForFunction(() => {
    try{ return !!document.getElementById('frame')?.contentWindow?.__SIM__; }catch(e){ return false; }
  }, { timeout: 30000 });
  await acceptLegalInFrame(page);
  log(true, '⟳ Перезагрузка iframe (Меню)');
}

async function runMobile(page){
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/sim.html`, { waitUntil: 'domcontentloaded' });

  const setupVisible = await page.locator('#sim-phase-setup').isVisible();
  log(setupVisible, 'Mobile: фаза настройки видна');

  await page.selectOption('#setup-start-preset', 'sokolniki');
  await page.locator('#setup-spd').evaluate(el => { el.value = '70'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.selectOption('#setup-theme', 'sport');
  await page.selectOption('#setup-mode', 'night');

  await page.click('#btn-open-menu');
  await page.waitForTimeout(500);
  const appVisible = await page.locator('#sim-phase-app').isVisible();
  log(appVisible, 'Mobile: переход в фазу приложения');

  await page.waitForFunction(() => {
    try{ return !!document.getElementById('frame')?.contentWindow?.__SIM__; }catch(e){ return false; }
  }, { timeout: 45000 });
  await acceptLegalInFrame(page);

  await page.selectOption('#mobile-start-preset', 'tverskaya');
  await page.waitForTimeout(400);

  try{
    await buildRouteInFrame(page);
    const api = await getFrameApi(page);
    log(api.route, 'Mobile: маршрут построен');
  }catch(e){
    log(false, 'Mobile: маршрут построен', e.message);
  }

  // Пуск на мобильном
  await page.click('#btn-play');
  await page.waitForTimeout(500);
  let api = await getFrameApi(page);
  log(api.running === true, 'Mobile: ▶ пуск симуляции');

  try{
    await startHudInFrame(page);
    api = await getFrameApi(page);
    log(api.hudOn && api.route, 'Mobile: HUD запущен');
    await checkHudLayout(page);
  }catch(e){
    log(false, 'Mobile: HUD layout', e.message);
  }
}

async function runAutohud(page){
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/sim.html?autohud=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    try{ return !!document.getElementById('frame')?.contentWindow?.__SIM__; }catch(e){ return false; }
  }, { timeout: 45000 });
  await acceptLegalInFrame(page);
  await page.waitForFunction(() => {
    try{
      const win = document.getElementById('frame')?.contentWindow;
      return win?.document?.getElementById('hud')?.classList?.contains('on');
    }catch(e){ return false; }
  }, { timeout: 60000 });
  const api = await getFrameApi(page);
  log(api.hudOn && api.route, 'URL ?autohud=1 — авто HUD + маршрут', JSON.stringify(api));
}

async function main(){
  let serverProc = null;
  const needServer = !process.argv[2];
  try{
    if(needServer){
      console.log(`Запуск serve на :${PORT}…`);
      serverProc = await startServer();
    } else {
      const up = await waitHttp(`${BASE}/sim.html`, 45000);
      if(!up) throw new Error(`Недоступен ${BASE}/sim.html`);
    }

    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => {
      try{
        localStorage.setItem('moto-hud-legal-consent', JSON.stringify({
          version: 1,
          ts: new Date().toISOString()
        }));
      }catch(e){}
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.warn('PAGE ERROR:', e.message));
    page.on('console', msg => {
      if(msg.type() === 'error') console.warn('CONSOLE:', msg.text());
    });

    console.log('\n=== Desktop ===');
    await runDesktop(page);

    console.log('\n=== Mobile ===');
    await runMobile(page);

    console.log('\n=== autohud ===');
    await runAutohud(page);

    await browser.close();

    const failed = results.filter(r => !r.ok);
    console.log('\n--- Итог ---');
    console.log(`Пройдено: ${results.length - failed.length}/${results.length}`);
    if(failed.length){
      console.log('Провалы:');
      failed.forEach(f => console.log('  -', f.name, f.detail));
      process.exit(1);
    }
    console.log('Все сценарии OK');
  }finally{
    if(serverProc) serverProc.kill();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
