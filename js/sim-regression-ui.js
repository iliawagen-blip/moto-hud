/**
 * Dashboard Regression: matrix, lazy JSONL, run detail, auto-load results.
 */
(function(){
  const RP = window.RegressionParse;
  const RUN_MODES = RP?.RUN_MODES || ['on_route', 'deviation', 'noise_stress'];
  const TH = RP?.DEFAULT_THRESHOLDS || {};
  const LATERAL_SPARK_MAX_M = 50;
  const RESULTS_ROOT = 'regression/results';

  let state = {
    bundleDate: null,
    summary: null,
    matrix: [],
    fileMap: new Map(),
    remoteUrlMap: new Map(),
    cacheMap: new Map(),
    fixtureMap: new Map(),
    tickCache: new Map(),
    selectedCell: null,
    ticks: [],
    durationS: 0,
    posS: 0,
    segments: [],
    routes: null,
    waypoints: [],
    mapVis: { motohud: true, graphhopper: false, openrouteservice: false, track: true },
    availableDates: [],
    trends: []
  };

  function $(id){ return document.getElementById(id); }

  function esc(s){
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function setProgress(text){
    const el = $('regression-progress');
    if(el) el.textContent = text || '';
  }

  function snapshot(){
    return {
      bundleDate: state.bundleDate,
      summary: state.summary,
      matrix: state.matrix,
      selectedCell: state.selectedCell,
      ticks: state.ticks,
      durationS: state.durationS,
      posS: state.posS,
      segments: state.segments,
      routes: state.routes,
      waypoints: state.waypoints,
      mapVis: { ...state.mapVis },
      replay: window.__simRegReplay?.snapshot?.(),
      _fileMap: state.fileMap,
      _remoteUrlMap: state.remoteUrlMap,
      _tickCache: state.tickCache,
      _cacheMap: state.cacheMap,
      _fixtureMap: state.fixtureMap
    };
  }

  function restore(s){
    if(!s) return;
    state.bundleDate = s.bundleDate;
    state.summary = s.summary;
    state.matrix = s.matrix || [];
    state.fileMap = s._fileMap || new Map();
    state.remoteUrlMap = s._remoteUrlMap || new Map();
    state.tickCache = s._tickCache || new Map();
    state.cacheMap = s._cacheMap || new Map();
    state.fixtureMap = s._fixtureMap || new Map();
    state.selectedCell = s.selectedCell;
    state.ticks = s.ticks || [];
    state.durationS = s.durationS || 0;
    state.posS = s.posS || 0;
    state.segments = s.segments || [];
    state.routes = s.routes || null;
    state.waypoints = s.waypoints || [];
    state.mapVis = s.mapVis || state.mapVis;
    window.__simRegReplay?.restore?.(s.replay);
    syncMapVisUi();
    renderAll();
    window.__simCompareUi?.refresh?.();
    if(state.selectedCell){
      applyMapForSelection();
      void prepareHudSession(state.selectedCell.fixtureId).then(() => {
        window.__simRegReplay?.seekTo?.(state.posS, { pause: false, silent: true });
        renderTimeline();
        renderDebug();
      });
    }
  }

  function onEnter(){
    syncMapVisUi();
    renderAll();
    void autoLoadDefaultBundle();
  }

  let autoLoadPromise = null;

  async function fetchText(url){
    const r = await fetch(url);
    if(!r.ok) throw new Error('HTTP ' + r.status + ': ' + url);
    return r.text();
  }

  async function fetchJson(url){
    try{
      const r = await fetch(url);
      if(!r.ok) return null;
      return await r.json();
    }catch(e){
      return null;
    }
  }

  async function resolveBundleDate(){
    const p = new URLSearchParams(location.search);
    const fromUrl = p.get('regressionDate');
    if(fromUrl) return fromUrl;
    const idx = await fetchJson(RESULTS_ROOT + '/index.json');
    if(idx?.latest) return idx.latest;
    const cur = await fetchJson('regression/state/current.json');
    return cur?.sim?.last_nightly_date || null;
  }

  async function loadAvailableDates(){
    const idx = await fetchJson(RESULTS_ROOT + '/index.json');
    state.availableDates = idx?.dates || [];
    if(state.bundleDate && !state.availableDates.includes(state.bundleDate)){
      state.availableDates = [state.bundleDate, ...state.availableDates];
    }
    renderDateSelect();
    void loadRegressionTrends();
  }

  async function loadRegressionTrends(){
    const dates = state.availableDates?.length
      ? [...state.availableDates].sort()
      : (state.bundleDate ? [state.bundleDate] : []);
    if(!dates.length){
      state.trends = [];
      renderRegressionTrends();
      return;
    }
    const rows = [];
    for(const date of dates){
      let summary = (date === state.bundleDate && state.summary) ? state.summary : null;
      if(!summary) summary = await fetchJson(RESULTS_ROOT + '/' + date + '/sim-summary.json');
      if(!summary) continue;
      const results = summary.results || [];
      const pass = summary.pass ?? results.filter(r => r.pass && !r.skipped).length;
      const fail = summary.fail ?? results.filter(r => !r.pass && !r.skipped).length;
      rows.push({ date, pass, fail, total: summary.total ?? pass + fail });
    }
    state.trends = rows;
    renderRegressionTrends();
  }

  function renderRegressionTrends(){
    const el = $('regression-trends');
    if(!el) return;
    if(state.trends.length < 2){
      el.innerHTML = '';
      return;
    }
    let html = '<table class="reg-trends"><thead><tr><th>date</th><th>pass</th><th>fail</th><th>Δ pass</th></tr></thead><tbody>';
    for(let i = 0; i < state.trends.length; i++){
      const row = state.trends[i];
      const prev = i > 0 ? state.trends[i - 1] : null;
      let delta = '—';
      let dCls = '';
      if(prev){
        const d = row.pass - prev.pass;
        delta = (d > 0 ? '+' : '') + d;
        dCls = d > 0 ? 'delta-good' : d < 0 ? 'delta-bad' : '';
      }
      const cur = row.date === state.bundleDate ? ' style="font-weight:700"' : '';
      html += '<tr' + cur + '><td>' + esc(row.date) + '</td><td class="q-good">' + row.pass +
        '</td><td class="q-lost">' + row.fail + '</td><td class="' + dCls + '">' + esc(delta) + '</td></tr>';
    }
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function renderDateSelect(){
    const sel = $('regression-date-select');
    if(!sel) return;
    const dates = state.availableDates.length
      ? state.availableDates
      : (state.bundleDate ? [state.bundleDate] : []);
    if(!dates.length){
      sel.innerHTML = '<option value="">—</option>';
      return;
    }
    sel.innerHTML = dates.map(d =>
      '<option value="' + esc(d) + '"' + (d === state.bundleDate ? ' selected' : '') + '>' + esc(d) + '</option>'
    ).join('');
  }

  function indexRemoteManifest(date, manifest){
    state.remoteUrlMap = new Map();
    const base = RESULTS_ROOT + '/' + date + '/sim/';
    const files = Array.isArray(manifest) ? manifest : (manifest?.files || []);
    for(const name of files){
      if(name === '_manifest.json') continue;
      if(name.endsWith('.json') || name.endsWith('.jsonl') || name.endsWith('.png')){
        state.remoteUrlMap.set(name, base + name);
      }
    }
  }

  async function loadRemoteBundle(date, opts){
    if(!date) throw new Error('Не указана дата bundle');
    setProgress('Загрузка ' + RESULTS_ROOT + '/' + date + '…');
    state.bundleDate = date;
    const base = RESULTS_ROOT + '/' + date;
    let summary = await fetchJson(base + '/sim-summary.json');
    if(!summary) summary = { date, results: [] };
    const manifest = await fetchJson(base + '/sim/_manifest.json');
    if(manifest){
      indexRemoteManifest(date, manifest);
    } else {
      state.remoteUrlMap = new Map();
      const baseSim = base + '/sim/';
      for(const r of (summary.results || [])){
        if(r.skipped) continue;
        const stem = r.fixture_id + '_' + r.mode;
        state.remoteUrlMap.set(stem + '.json', baseSim + stem + '.json');
        state.remoteUrlMap.set(stem + '.jsonl', baseSim + stem + '.jsonl');
      }
    }
    await applySummary(summary, { skipSetMode: true, ...(opts || {}) });
    await loadAvailableDates();
    setProgress('');
  }

  async function autoLoadDefaultBundle(force){
    if(!force && state.remoteUrlMap.size) return;
    if(autoLoadPromise) return autoLoadPromise;
    autoLoadPromise = (async () => {
      try{
        const date = await resolveBundleDate();
        if(!date){
          await loadAvailableDates();
          return;
        }
        await loadRemoteBundle(date);
      }catch(e){
        console.warn('[sim-regression] auto-load', e);
        const st = $('regression-status');
        if(st && !state.summary){
          st.textContent = 'Автозагрузка недоступна (нужен npm run dev). Загрузите sim/ вручную.';
        }
      }finally{
        autoLoadPromise = null;
      }
    })();
    return autoLoadPromise;
  }

  function indexCacheFiles(fileList){
    for(const file of fileList){
      const path = String(file.webkitRelativePath || file.name).replace(/\\/g, '/');
      const mh = path.match(/(?:^|\/)motohud\/([0-9a-f-]{36})\.json$/i);
      if(mh){ state.cacheMap.set('motohud:' + mh[1], file); continue; }
      const gh = path.match(/(?:^|\/)graphhopper\/([0-9a-f-]{36})\.json$/i);
      if(gh){ state.cacheMap.set('graphhopper:' + gh[1], file); continue; }
      const ors = path.match(/(?:^|\/)openrouteservice\/([0-9a-f-]{36})\.json$/i);
      if(ors){ state.cacheMap.set('openrouteservice:' + ors[1], file); continue; }
      const fix = path.match(/(?:^|\/)fixtures\/auto\/([0-9a-f-]{36})\.json$/i);
      if(fix){ state.fixtureMap.set(fix[1], file); }
    }
  }

  async function readJsonFile(file){
    if(!file) return null;
    return JSON.parse(await file.text());
  }

  async function loadRouteCacheEntry(provider, fixtureId){
    const key = provider + ':' + fixtureId;
    const file = state.cacheMap.get(key);
    if(file){
      const obj = await readJsonFile(file);
      return obj?.polyline || null;
    }
    const sub = provider === 'motohud' ? 'motohud' : 'references/' + provider;
    const obj = await fetchJson('regression/cache/' + sub + '/' + fixtureId + '.json');
    return obj?.polyline || null;
  }

  async function loadFixtureWaypoints(fixtureId){
    const file = state.fixtureMap.get(fixtureId);
    if(file){
      const obj = await readJsonFile(file);
      return obj?.waypoints || [];
    }
    const obj = await fetchJson('regression/fixtures/auto/' + fixtureId + '.json');
    return obj?.waypoints || [];
  }

  async function loadMotohudCache(fixtureId){
    const file = state.cacheMap.get('motohud:' + fixtureId);
    if(file) return readJsonFile(file);
    return fetchJson('regression/cache/motohud/' + fixtureId + '.json');
  }

  async function prepareHudSession(fixtureId){
    const RR = window.__simRegReplay;
    if(!RR?.prepareFixture) return;
    const cache = await loadMotohudCache(fixtureId);
    if(!cache?.polyline?.length){
      console.warn('[regression] нет motohud cache для', fixtureId);
      return;
    }
    const wps = state.waypoints?.length ? state.waypoints : await loadFixtureWaypoints(fixtureId);
    state.waypoints = wps;
    if(RR.getPreparedKey?.() === fixtureId) return;
    try{
      setProgress('HUD prepareRegressionHud…');
      await RR.prepareFixture(fixtureId, wps, cache);
    }catch(e){
      window.__simMode?.showError?.('HUD regression', e.message);
    }finally{
      setProgress('');
    }
  }

  function onReplayPosChange(pos){
    state.posS = pos;
    renderTimeline();
    renderDebug();
  }

  async function loadFixtureRoutes(fixtureId){
    const [motohud, graphhopper, openrouteservice, waypoints] = await Promise.all([
      loadRouteCacheEntry('motohud', fixtureId),
      loadRouteCacheEntry('graphhopper', fixtureId),
      loadRouteCacheEntry('openrouteservice', fixtureId),
      loadFixtureWaypoints(fixtureId)
    ]);
    return { motohud, graphhopper, openrouteservice, waypoints };
  }

  function syncMapVisUi(){
    $('reg-map-mh') && ($('reg-map-mh').checked = !!state.mapVis.motohud);
    $('reg-map-gh') && ($('reg-map-gh').checked = !!state.mapVis.graphhopper);
    $('reg-map-ors') && ($('reg-map-ors').checked = !!state.mapVis.openrouteservice);
    $('reg-map-track') && ($('reg-map-track').checked = !!state.mapVis.track);
  }

  function readMapVisFromUi(){
    state.mapVis = {
      motohud: !!$('reg-map-mh')?.checked,
      graphhopper: !!$('reg-map-gh')?.checked,
      openrouteservice: !!$('reg-map-ors')?.checked,
      track: !!$('reg-map-track')?.checked
    };
  }

  function renderThresholdBars(result){
    const hints = RP?.assertionThresholdHints?.(result, TH) || [];
    if(!hints.length) return '';
    let html = '<div class="reg-th-bars">';
    for(const h of hints){
      if(h.actual == null || h.limit == null) continue;
      let pct = 0;
      let ok = false;
      if(h.cmp === 'min'){
        pct = Math.min(100, (h.actual / h.limit) * 100);
        ok = h.actual >= h.limit;
      } else {
        pct = Math.min(100, (h.actual / h.limit) * 100);
        ok = h.actual <= h.limit;
      }
      html += '<div class="reg-th-row"><span>' + esc(h.name) + '</span>' +
        '<div class="reg-th-bar"><div class="reg-th-fill ' + (ok ? 'ok' : 'bad') + '" style="width:' + pct + '%"></div>' +
        '<div class="reg-th-limit" style="left:100%"></div></div>' +
        '<span class="' + (ok ? 'q-good' : 'q-lost') + '">' + esc(h.fmt(h.actual)) + ' / ' + esc(h.fmt(h.limit)) + '</span></div>';
    }
    html += '</div>';
    return html;
  }

  function drawLateralSparkCanvas(bar, w){
    if(!state.ticks.length || !state.durationS) return;
    const h = 36;
    const canvas = document.createElement('canvas');
    canvas.className = 'reg-lateral-spark';
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    for(const line of (RP?.thresholdLinesForMode?.(state.selectedCell?.runMode, TH) || [])){
      const y = h - (line.value_m / LATERAL_SPARK_MAX_M) * (h - 4) - 2;
      ctx.strokeStyle = line.color;
      ctx.globalAlpha = 0.45;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    const pts = RP?.buildLateralSparkline?.(state.ticks, state.durationS, Math.min(160, w)) || [];
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    for(const p of pts){
      if(p.lateral_m == null) continue;
      const x = p.x * w;
      const y = h - (p.lateral_m / LATERAL_SPARK_MAX_M) * (h - 4) - 2;
      if(!started){ ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    if(started) ctx.stroke();
    if(state.posS > 0){
      const cx = (state.posS / state.durationS) * w;
      ctx.strokeStyle = 'rgba(255,212,0,.35)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();
    }
    bar.appendChild(canvas);
  }

  function tickKey(fixtureId, runMode){
    return fixtureId + '_' + runMode + '.jsonl';
  }

  function indexFiles(fileList){
    for(const file of fileList){
      const n = file.name;
      if(n.endsWith('.jsonl') || n.endsWith('.png')) state.fileMap.set(n, file);
      if(RP?.parseResultFileName?.(n)) state.fileMap.set(n, file);
    }
  }

  async function collectFolderResults(){
    const out = [];
    const jobs = [];
    state.fileMap.forEach((file, name) => {
      const meta = RP.parseResultFileName(name);
      if(!meta) return;
      jobs.push(new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          try{
            out.push(RP.validateSimResult(JSON.parse(String(r.result || ''))));
            resolve();
          }catch(e){ reject(e); }
        };
        r.onerror = () => reject(r.error);
        r.readAsText(file);
      }));
    });
    state.remoteUrlMap.forEach((url, name) => {
      const meta = RP.parseResultFileName(name);
      if(!meta) return;
      jobs.push((async () => {
        const obj = await fetchJson(url);
        if(obj) out.push(RP.validateSimResult(obj));
      })());
    });
    await Promise.all(jobs);
    return out;
  }

  async function onSimFolder(fileList){
    indexFiles(fileList);
    const raw = state.summary || { date: state.bundleDate, results: [] };
    try{
      await applySummary(raw);
    }catch(e){
      setProgress('');
      window.__simMode?.showError?.('Папка sim/', e.message);
    }
  }

  async function applySummary(rawSummary, opts){
    setProgress('Чтение результатов из папки…');
    let folderResults = [];
    try{
      folderResults = await collectFolderResults();
    }catch(e){
      window.__simMode?.showError?.('Ошибка result JSON', e.message);
    }
    state.summary = RP.mergeResults(rawSummary, folderResults);
    state.bundleDate = state.summary.date || rawSummary.date || state.bundleDate || 'bundle';
    state.matrix = RP.buildMatrix(state.summary.results);
    renderDateSelect();
    setProgress('');
    renderAll();
    if(!opts?.skipSetMode) window.__simMode?.setMode?.('regression');
  }

  function renderNightlyHeader(){
    const el = $('regression-nightly');
    if(!el || !state.summary) return;
    const s = state.summary;
    el.innerHTML =
      '<strong>' + esc(state.bundleDate) + '</strong> · sim ' +
      '<span class="q-good">' + s.pass + ' pass</span> · ' +
      '<span class="q-lost">' + s.fail + ' fail</span> · ' +
      s.results.length + ' runs';
    renderRegressionTrends();
  }

  function cellHtml(result){
    if(!result) return '<td class="reg-cell reg-empty">—</td>';
    const cls = result.pass ? 'reg-pass' : 'reg-fail';
    const m = result.metrics || {};
    const hint = result.mode === 'on_route'
      ? (m.good_snap_ratio != null ? m.good_snap_ratio.toFixed(2) : '—')
      : (m.p95_lateral_m != null ? Math.round(m.p95_lateral_m) + 'm' : '✓');
    const failNames = (result.assertions || []).filter(a => !a.pass).map(a => a.name).join(', ');
    return '<td class="reg-cell ' + cls + '" data-fid="' + esc(result.fixture_id) + '" data-mode="' + esc(result.mode) + '" title="' + esc(failNames || (result.pass ? 'pass' : 'fail')) + '">' +
      (result.pass ? '✓' : '✗') + ' <span class="reg-hint">' + esc(hint) + '</span></td>';
  }

  function renderMatrix(){
    const el = $('regression-matrix');
    if(!el) return;
    if(!state.matrix.length){
      el.innerHTML = '<p class="dim" style="margin:0;font-size:11px">Загрузка regression/results… или выберите sim/ вручную.</p>';
      return;
    }
    let html = '<table class="reg-matrix"><thead><tr><th>fixture</th>';
    for(const m of RUN_MODES) html += '<th>' + m + '</th>';
    html += '</tr></thead><tbody>';
    for(const row of state.matrix){
      const short = row.fixtureId.slice(0, 8);
      html += '<tr><th title="' + esc(row.fixtureId) + '">' + short + '</th>';
      for(const m of RUN_MODES) html += cellHtml(row.cells[m]);
      html += '</tr>';
    }
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function bindMatrixClicks(){
    const host = $('regression-matrix');
    if(!host || host._regMatrixBound) return;
    host._regMatrixBound = true;
    host.addEventListener('click', e => {
      const td = e.target.closest('.reg-cell[data-fid]');
      if(!td || td.classList.contains('reg-empty')) return;
      void selectCell(td.dataset.fid, td.dataset.mode);
    });
  }

  function buildSimDeepLink(fixtureId, runMode){
    const p = new URLSearchParams(location.search);
    p.set('mode', 'regression');
    p.set('fixture', fixtureId);
    p.set('runMode', runMode);
    if(state.bundleDate) p.set('regressionDate', state.bundleDate);
    return location.origin + location.pathname + '?' + p.toString();
  }

  function exportInvestigationMd(){
    const sel = state.selectedCell;
    if(!sel?.result || !RP?.formatInvestigationMarkdown) return;
    const md = RP.formatInvestigationMarkdown({
      bundleDate: state.bundleDate || '—',
      fixtureId: sel.fixtureId,
      runMode: sel.runMode,
      result: sel.result,
      ticks: state.ticks,
      durationS: state.durationS,
      simUrl: buildSimDeepLink(sel.fixtureId, sel.runMode)
    });
    const shortId = sel.fixtureId.slice(0, 8);
    const date = state.bundleDate || new Date().toISOString().slice(0, 10);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = date + '-' + shortId + '-' + sel.runMode + '-investigation.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function renderRunDetail(){
    const el = $('regression-run-detail');
    const expBtn = $('btn-reg-export-md');
    if(expBtn) expBtn.disabled = !state.selectedCell?.result;
    if(!el) return;
    const sel = state.selectedCell;
    if(!sel?.result){
      el.innerHTML = '<span class="dim">Клик по ячейке матрицы</span>';
      return;
    }
    const r = sel.result;
    const m = r.metrics || {};
    let html = '<div class="reg-run-head">' +
      '<strong>' + esc(r.fixture_id.slice(0, 8)) + '</strong> · ' + esc(r.mode) +
      ' · ' + (r.pass ? '<span class="q-good">PASS</span>' : '<span class="q-lost">FAIL</span>') +
      '</div><ul class="reg-assertions">';
    for(const a of r.assertions || []){
      html += '<li class="' + (a.pass ? 'pass' : 'fail') + '">' +
        (a.pass ? '✓' : '✗') + ' <code>' + esc(a.name) + '</code> — ' + esc(a.detail) + '</li>';
    }
    html += '</ul>' + renderThresholdBars(r) + '<div class="reg-metrics dim">' +
      'p95 ' + (m.p95_lateral_m?.toFixed(1) ?? '—') + ' m · snap ' + (m.good_snap_ratio?.toFixed(3) ?? '—') +
      ' · ticks ' + (m.tick_count ?? '—') +
      (m.had_lost ? ' · LOST' : '') +
      (m.had_degraded ? ' · DEGRADED' : '') +
      '</div>';
    const pngUrl = state.remoteUrlMap.get(r.fixture_id + '_' + r.mode + '.png');
    if(pngUrl){
      html += '<div><img class="reg-screenshot" src="' + esc(pngUrl) + '" alt="screenshot" loading="lazy"></div>';
    }
    el.innerHTML = html;
  }

  function renderTimeline(){
    const bar = $('regression-timeline');
    const lbl = $('regression-time-label');
    if(!bar) return;
    if(!state.ticks.length || !state.durationS){
      bar.innerHTML = '';
      if(lbl) lbl.textContent = '—';
      return;
    }
    bar.innerHTML = '';
    const w = bar.clientWidth || 400;
    drawLateralSparkCanvas(bar, w);
    if(state.segments.length){
      const strip = document.createElement('div');
      strip.className = 'tel-snap-strip';
      for(const seg of state.segments){
        const x0 = (seg.t0 / state.durationS) * w;
        const x1 = (seg.t1 / state.durationS) * w;
        const band = document.createElement('div');
        band.className = 'tel-snap-band';
        band.style.left = x0 + 'px';
        band.style.width = Math.max(1, x1 - x0) + 'px';
        band.style.background = seg.color;
        strip.appendChild(band);
      }
      bar.appendChild(strip);
    }
    const cur = document.createElement('div');
    cur.className = 'tel-cursor';
    cur.id = 'reg-cursor';
    cur.style.left = ((state.posS / state.durationS) * w) + 'px';
    bar.appendChild(cur);
    if(lbl) lbl.textContent = RP.formatSimS(state.posS) + ' / ' + RP.formatSimS(state.durationS);
  }

  function renderDebug(){
    const el = $('regression-debug');
    if(!el) return;
    const t = RP.findTickAt(state.ticks, state.posS);
    if(!t){
      el.textContent = state.segments.length ? 'Tick…' : 'Нет lat/lon в JSONL — только timeline по sim_s (старый формат).';
      return;
    }
    el.innerHTML =
      '<div><strong>sim_s</strong> ' + (t.sim_s ?? '—') +
      ' · <strong>snap</strong> ' + (t.snap_quality ?? '—') +
      ' · <strong>lat</strong> ' + (t.lateral_m ?? '—') + ' m</div>' +
      '<div><strong>offRoute</strong> ' + (t.off_route_state ?? '—') +
      ' · <strong>acc</strong> ' + (t.gps_acc ?? '—') + ' m</div>';
  }

  function renderAll(){
    renderNightlyHeader();
    renderMatrix();
    renderRunDetail();
    renderTimeline();
    renderDebug();
    const st = $('regression-status');
    const n = state.fileMap.size + state.remoteUrlMap.size;
    if(st && !state.summary){
      st.textContent = 'Подключение к ' + RESULTS_ROOT + '… (npm run dev)';
    } else if(st){
      st.textContent = RESULTS_ROOT + '/' + state.bundleDate + ' · ' + n + ' файлов';
    }
    void tryPendingSelect();
  }

  function applyMapForSelection(){
    window.SimMap?.setMode?.('regression');
    readMapVisFromUi();
    window.SimMap?.setRegressionRouteVisibility?.(state.mapVis);
    if(state.waypoints?.length){
      window.SimMap?.setRegressionContext?.({ waypoints: state.waypoints });
    }
    if(state.routes){
      window.SimMap?.setReferenceRoutes?.(state.routes);
    }
    if(state.segments.length && state.mapVis.track){
      window.SimMap?.setRegressionTrack?.(state.segments);
      window.SimMap?.setOnTelemetrySegmentClick?.((t0) => {
        window.__simRegReplay?.seekTo?.(t0);
      });
    } else {
      window.SimMap?.setRegressionTrack?.([]);
    }
    window.SimMap?.fitRegressionBounds?.(state.routes, state.segments, state.waypoints);
    const t = RP.findTickAt(state.ticks, state.posS);
    if(t?.lat != null && !window.__simRegReplay?.isPlaying?.()){
      window.SimMap?.setReplayPosition?.(t.lat, t.lon, t.heading);
    }
  }

  async function loadTicksForCell(fixtureId, runMode){
    const key = tickKey(fixtureId, runMode);
    if(state.tickCache.has(key)) return state.tickCache.get(key);
    const file = state.fileMap.get(key);
    const url = state.remoteUrlMap.get(key);
    if(!file && !url){
      throw new Error('JSONL не найден: ' + key + ' (' + RESULTS_ROOT + '/' + (state.bundleDate || '?') + '/sim/)');
    }
    let text;
    if(file){
      setProgress('Загрузка ' + fixtureId.slice(0, 8) + ' · ' + runMode + ' …');
      text = await file.text();
    } else {
      setProgress('Загрузка ' + fixtureId.slice(0, 8) + ' · ' + runMode + ' …');
      text = await fetchText(url);
    }
    const parsed = RP.parseRegressionJsonl(text);
    const segments = RP.buildTrackSegmentsFromTicks(parsed.ticks);
    const entry = { ...parsed, segments, key };
    state.tickCache.set(key, entry);
    setProgress('');
    return entry;
  }

  async function selectCell(fixtureId, runMode){
    await autoLoadDefaultBundle();
    const row = state.matrix.find(r => r.fixtureId === fixtureId);
    const result = row?.cells?.[runMode];
    if(!result){
      window.__simMode?.showError?.('Нет result', fixtureId + ' ' + runMode);
      return;
    }
    state.selectedCell = { fixtureId, runMode, result };
    document.querySelectorAll('.reg-cell').forEach(c => {
      c.classList.toggle('selected', c.dataset.fid === fixtureId && c.dataset.mode === runMode);
    });
    try{
      setProgress('Маршруты fixture…');
      state.routes = await loadFixtureRoutes(fixtureId);
      state.waypoints = state.routes.waypoints || [];
      const entry = await loadTicksForCell(fixtureId, runMode);
      state.ticks = entry.ticks;
      state.durationS = entry.durationS;
      state.segments = entry.segments;
      state.posS = 0;
      window.__simRegReplay?.setPos?.(0);
      setProgress('');
      renderRunDetail();
      renderTimeline();
      renderDebug();
      applyMapForSelection();
      await prepareHudSession(fixtureId);
      window.__simRegReplay?.seekTo?.(0, { pause: false });
      window.__simCompareUi?.refresh?.();
      const p = new URLSearchParams(location.search);
      p.set('mode', 'regression');
      p.set('fixture', fixtureId);
      p.set('runMode', runMode);
      if(state.bundleDate) p.set('regressionDate', state.bundleDate);
      history.replaceState(null, '', location.pathname + '?' + p.toString());
    }catch(e){
      state.ticks = [];
      state.segments = [];
      renderRunDetail();
      window.__simCompareUi?.refresh?.();
      window.__simMode?.showError?.('Tick JSONL', e.message);
    }
  }

  async function onSummaryFile(file){
    await applySummary(JSON.parse(await file.text()));
  }

  function bindUi(){
    bindMatrixClicks();

    $('regression-summary-file')?.addEventListener('change', async () => {
      const file = $('regression-summary-file').files?.[0];
      if(!file) return;
      try{ await onSummaryFile(file); }
      catch(e){ window.__simMode?.showError?.('sim-summary.json', e.message); }
      $('regression-summary-file').value = '';
    });

    $('regression-sim-folder')?.addEventListener('change', async () => {
      const files = $('regression-sim-folder').files;
      if(!files?.length) return;
      await onSimFolder(files);
      $('regression-sim-folder').value = '';
    });

    $('regression-cache-folder')?.addEventListener('change', async () => {
      const files = $('regression-cache-folder').files;
      if(!files?.length) return;
      indexCacheFiles(files);
      $('regression-cache-folder').value = '';
      renderAll();
      if(state.selectedCell) applyMapForSelection();
    });

    $('regression-date-select')?.addEventListener('change', async () => {
      const date = $('regression-date-select').value;
      if(!date || date === state.bundleDate) return;
      try{
        await loadRemoteBundle(date);
        const p = new URLSearchParams(location.search);
        p.set('regressionDate', date);
        history.replaceState(null, '', location.pathname + '?' + p.toString());
      }catch(e){
        window.__simMode?.showError?.('Regression bundle', e.message);
      }
    });

    $('btn-reg-export-md')?.addEventListener('click', exportInvestigationMd);

    window.__simMode?.onModeChange?.((from, to) => {
      if(to === 'regression') void autoLoadDefaultBundle();
      if(from === 'regression') window.__simRegReplay?.pauseReplay?.();
    });

    ['reg-map-mh', 'reg-map-gh', 'reg-map-ors', 'reg-map-track'].forEach(id => {
      $(id)?.addEventListener('change', () => {
        if(!state.selectedCell) return;
        applyMapForSelection();
      });
    });

    syncMapVisUi();

    $('regression-timeline')?.addEventListener('click', e => {
      if(!state.durationS) return;
      const bar = $('regression-timeline');
      const rect = bar.getBoundingClientRect();
      const simS = ((e.clientX - rect.left) / rect.width) * state.durationS;
      window.__simRegReplay?.seekTo?.(simS);
    });

    window.__simRegReplay?.configure?.({
      getTicks: () => state.ticks,
      getDuration: () => state.durationS,
      onPosChange: onReplayPosChange
    });

    window.addEventListener('resize', () => { if(state.ticks.length) renderTimeline(); });

    const p = new URLSearchParams(location.search);
    const fixture = p.get('fixture');
    const runMode = p.get('runMode');
    if(p.get('mode') === 'regression' && fixture && runMode){
      state._pendingSelect = { fixtureId: fixture, runMode };
    }

    void autoLoadDefaultBundle();
  }

  async function tryPendingSelect(){
    if(!state._pendingSelect) return;
    await autoLoadDefaultBundle();
    if(!state.matrix.length) return;
    const { fixtureId, runMode } = state._pendingSelect;
    delete state._pendingSelect;
    void selectCell(fixtureId, runMode);
  }

  window.__simRegression = {
    snapshot,
    restore,
    onEnter,
    getState: () => state,
    selectCell,
    applySummary,
    loadRemoteBundle,
    autoLoadDefaultBundle
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindUi);
  } else bindUi();
})();
