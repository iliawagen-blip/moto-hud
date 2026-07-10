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
    const nav = doc.getElementById('hud-nav-btns');
    if(nav) nav.scrollTop = 0;
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

    const arrowBox = visibleRect(doc.getElementById('arrow-box'));
    const navBody = visibleRect(doc.querySelector('.block-arrow-body'));
    const turnStreet = visibleRect(doc.getElementById('street'));
    const curStreet = visibleRect(doc.getElementById('street-current'));
    const mdistEl = visibleRect(doc.querySelector('.mdist'));
    if(arrowBox && navBody){
      if(arrowBox.top < navBody.top + 2) issues.push('стрелка обрезана сверху');
      if(arrowBox.bottom > navBody.bottom - 2) issues.push('стрелка обрезана снизу');
    }
    if(turnStreet && arrowBox && turnStreet.bottom > arrowBox.top + 1){
      issues.push('улица поворота перекрывает стрелку');
    }
    if(curStreet && mdistEl && curStreet.top < mdistEl.bottom - 1){
      issues.push('текущая улица выше дистанции');
    }
    if(turnStreet && curStreet && turnStreet.top >= curStreet.top){
      issues.push('порядок улиц: поворот не выше текущей');
    }

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

  // Тема: все 6 через select
  for(const tid of ['avionics', 'hitech', 'space', 'sport', 'chopper', 'vintage']){
    await page.selectOption('#sim-theme', tid);
    await page.waitForTimeout(450);
    const ok = await page.evaluate((id) => {
      try{
        const html = document.getElementById('frame')?.contentWindow?.document?.documentElement;
        return html?.classList.contains('theme-' + id) || false;
      }catch(e){ return false; }
    }, tid);
    log(ok, 'Тема: ' + tid, ok ? 'OK' : 'класс не применился');
  }
  await page.selectOption('#sim-mode', 'day');
  await page.waitForTimeout(400);
  const themeDay = await page.evaluate(() => document.getElementById('theme-status')?.textContent || '');
  log(/day/i.test(themeDay), 'Режим: день', themeDay);

  // Устройство / ориентация
  await page.selectOption('#sel-device', '412x915');
  await page.click('#btn-orient');
  await page.waitForTimeout(400);
  const phoneW = await page.evaluate(() => document.getElementById('phone')?.style.width || '');
  log(phoneW.includes('px'), 'Смена устройства и ориентации', phoneW);

  const deviceLayout = await page.evaluate(() => {
    const screen = document.getElementById('phone-screen');
    const lbl = document.getElementById('device-size-lbl')?.textContent || '';
    const sw = parseInt(screen?.style.width || '0', 10);
    const sh = parseInt(screen?.style.height || '0', 10);
    const frame = document.getElementById('frame');
    const fw = frame?.clientWidth || 0;
    const fh = frame?.clientHeight || 0;
    return { sw, sh, fw, fh, lbl, portrait: sw < sh };
  });
  log(deviceLayout.sw === 915 && deviceLayout.sh === 412, 'Экран: нативные px (альбом Pixel 7)',
    `${deviceLayout.sw}×${deviceLayout.sh} iframe=${deviceLayout.fw}×${deviceLayout.fh} ${deviceLayout.lbl}`);
  log(Math.abs(deviceLayout.fw - deviceLayout.sw) <= 2 && Math.abs(deviceLayout.fh - deviceLayout.sh) <= 2,
    'iframe = нативное разрешение устройства');

  await page.click('#btn-orient');
  await page.waitForTimeout(300);

  for(const dev of ['390x844', '360x800', '430x932']){
    await page.selectOption('#sel-device', dev);
    await page.waitForTimeout(250);
    const ok = await page.evaluate((v) => {
      const [w, h] = v.split('x').map(Number);
      const sw = parseInt(document.getElementById('phone-screen')?.style.width || '0', 10);
      const sh = parseInt(document.getElementById('phone-screen')?.style.height || '0', 10);
      return sw === w && sh === h;
    }, dev);
    log(ok, `Устройство ${dev}`, ok ? 'OK' : 'размер не совпал');
  }
  await page.selectOption('#sel-device', '390x844');
  await page.click('#btn-orient');
  await page.waitForTimeout(250);

  // Скорость
  await page.locator('#spd').evaluate(el => { el.value = '60'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(200);
  const spdLive = await page.evaluate(() => document.getElementById('sim-spd-live')?.textContent || '');
  log(spdLive.includes('GPS'), 'Слайдер скорости', spdLive);

  // Карта: поиск адреса старта
  if(await page.locator('#sim-map-provider').count()){
    await page.fill('#sim-start-address', 'ВДНХ, Москва');
    await page.click('#btn-sim-start-search');
    await page.waitForTimeout(2500);
    const coords = await page.evaluate(() => document.getElementById('sim-start-coords')?.textContent || '');
    log(/55\.8/.test(coords), 'Карта: поиск старта ВДНХ', coords);

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
    await page.click('#btn-sim-build-route');
    await page.waitForTimeout(3000);
    const routeRes = await page.evaluate(() => {
      const S = document.getElementById('frame')?.contentWindow?.__motoHUD?.S;
      return { pts: S?.route?.coords?.length || S?.route?.geometry?.n || 0 };
    });
    log(routeRes.pts >= 2, 'Кнопка ↻ Маршрут (sim)', 'pts=' + routeRes.pts);
  }catch(e){
    log(false, 'Кнопка ↻ Маршрут (sim)', e.message);
  }

  // Построить маршрут в iframe (legacy path if button failed)
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

  const mapState = await page.evaluate(() => {
    const win = document.getElementById('frame')?.contentWindow;
    const S = win?.__motoHUD?.S;
    const routePts = S?.route?.geometry?.n || S?.route?.coords?.length || 0;
    let simMapPts = 0;
    let pos = null;
    try{
      const layers = window.SimMap;
      if(layers){
        const mapEl = document.getElementById('sim-map');
        const leaflet = mapEl?._leaflet_id != null;
        simMapPts = routePts;
      }
    }catch(e){}
    const gps = S?.gps;
    if(gps) pos = { lat: gps.lat, lon: gps.lon };
    return { routePts, pos, hasSimMap: !!window.SimMap };
  });
  log(mapState.routePts >= 2, 'Карта: маршрут в state', `pts=${mapState.routePts}`);
  log(mapState.hasSimMap, 'Карта: SimMap инициализирован');

  await page.waitForTimeout(800);
  const mapLayers = await page.evaluate(() => {
    try{
      const win = document.getElementById('frame')?.contentWindow;
      window.SimMap?.update?.(win);
      return window.SimMap?.getDebugState?.() || {};
    }catch(e){ return {}; }
  });
  log((mapLayers.routePts || 0) >= 2, 'Карта: маршрут на polyline', `pts=${mapLayers.routePts || 0}`);
  log(!!mapLayers.pos, 'Карта: маркер позиции', mapLayers.pos ? `${mapLayers.pos.lat?.toFixed(5)}, ${mapLayers.pos.lon?.toFixed(5)}` : '—');

  // Пуск симуляции (до HUD — движение может не идти)
  await page.click('#btn-play');
  await page.waitForTimeout(600);
  api = await getFrameApi(page);
  log(api.running === true, '▶ Пуск симуляции', `running=${api.running}`);

  await page.click('#btn-play');
  await page.waitForTimeout(300);
  api = await getFrameApi(page);
  log(api.running === false, '⏸ Пауза симуляции');

  // Навигация: ДОР / КАРТ (нужен HUD)
  await startHudInFrame(page);
  await page.click('#btn-sim-path');
  await page.waitForTimeout(300);
  let navDbg = await page.evaluate(() => document.getElementById('hud-nav-debug')?.textContent || '');
  log(/view:hud/.test(navDbg), 'Нав: ДОР → view:hud', navDbg);

  await page.click('#btn-sim-map');
  await page.waitForTimeout(400);
  navDbg = await page.evaluate(() => document.getElementById('hud-nav-debug')?.textContent || '');
  log(/view:map/.test(navDbg), 'Нав: КАРТ → карта', navDbg);

  const mapStreets = await page.evaluate(() => {
    const doc = document.getElementById('frame')?.contentWindow?.document;
    const hud = doc?.getElementById('hud');
    const turn = doc?.getElementById('street');
    const cur = doc?.getElementById('street-current');
    const mapPane = doc?.getElementById('nav-map-pane');
    const stTurn = turn && doc.defaultView.getComputedStyle(turn).display !== 'none';
    const stCur = cur && doc.defaultView.getComputedStyle(cur).display !== 'none';
    const mapOn = mapPane && doc.defaultView.getComputedStyle(mapPane).display !== 'none';
    return {
      viewMap: hud?.classList.contains('view-map'),
      streetsVisible: stTurn && stCur,
      mapVisible: mapOn,
      turnText: turn?.textContent?.trim(),
      curText: cur?.textContent?.trim()
    };
  });
  log(mapStreets.viewMap && mapStreets.streetsVisible && mapStreets.mapVisible,
    'КАРТ: улицы + карта', JSON.stringify(mapStreets));

  await page.click('#btn-sim-path');
  await page.waitForTimeout(200);

  // ПЕЛЕНГ
  await page.click('#btn-sim-bearing');
  await page.waitForTimeout(400);
  navDbg = await page.evaluate(() => document.getElementById('hud-nav-debug')?.textContent || '');
  const bearingState = await page.evaluate(() => {
    const win = document.getElementById('frame')?.contentWindow;
    const doc = win?.document;
    const S = win?.__motoHUD?.S;
    const bv = doc?.getElementById('bearing-view');
    const hidden = bv?.classList.contains('hidden');
    return {
      navMode: S?.navMode,
      bearingVisible: bv && !hidden,
      label: doc?.getElementById('bearing-label')?.textContent?.trim(),
      dist: doc?.getElementById('bearing-distance')?.textContent?.trim()
    };
  });
  log(/nav:\s*bearing/.test(navDbg) && bearingState.bearingVisible,
    'Нав: ПЕЛЕНГ → bearing-view', JSON.stringify({ navDbg, ...bearingState }));

  await page.click('#btn-sim-path');
  await page.waitForTimeout(300);
  navDbg = await page.evaluate(() => document.getElementById('hud-nav-debug')?.textContent || '');
  log(/nav:\s*route/.test(navDbg), 'Нав: ДОР → выход из пеленга', navDbg);

  // Старт HUD (ПОЕХАЛИ) — повторная проверка
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

  const mapMove = await page.evaluate(() => {
    const win = document.getElementById('frame')?.contentWindow;
    window.SimMap?.update?.(win);
    const a = window.SimMap?.getDebugState?.() || {};
    return { traveled: a.traveledPts || 0, pos: a.pos };
  });
  log(mapMove.traveled >= 2, 'Карта: пройденный трек', `pts=${mapMove.traveled}`);
  log(!!mapMove.pos, 'Карта: позиция обновляется при движении');

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

  await page.fill('#setup-start-address', 'Сокольники, Москва');
  await page.locator('#setup-spd').evaluate(el => { el.value = '70'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.selectOption('#setup-theme', 'sport');
  await page.selectOption('#setup-mode', 'night');

  await page.click('#btn-setup-start-search');
  await page.waitForTimeout(500);
  await page.click('#btn-open-menu');
  await page.waitForTimeout(500);
  const appVisible = await page.locator('#sim-phase-app').isVisible();
  log(appVisible, 'Mobile: переход в фазу приложения');

  await page.waitForFunction(() => {
    try{ return !!document.getElementById('frame')?.contentWindow?.__SIM__; }catch(e){ return false; }
  }, { timeout: 45000 });
  await acceptLegalInFrame(page);

  await page.fill('#mobile-start-address', 'Тверская, Москва');
  await page.click('#btn-mobile-start-search');
  await page.waitForTimeout(2000);

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
