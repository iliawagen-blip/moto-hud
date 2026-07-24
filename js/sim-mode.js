/**
 * Режимы sim.html: synth | telemetry | regression.
 * State in-memory per mode; URL via replaceState.
 */
(function(){
  const MODES = ['synth', 'telemetry', 'regression'];
  const MODE_LABELS = { synth: 'Синтетика', telemetry: 'Телеметрия', regression: 'Regression' };
  const DASH_HEIGHT_KEY = 'moto-sim-dash-height';

  let current = 'synth';
  const slots = {
    synth: { playing: false },
    telemetry: null,
    regression: null
  };
  const listeners = [];

  function dashKey(mode){
    return DASH_HEIGHT_KEY + ':' + (mode || current);
  }

  function applyDashHeightForMode(mode){
    const m = mode || current;
    const saved = parseInt(sessionStorage.getItem(dashKey(m)) || '', 10);
    /* Inline на body перебивает CSS-дефолты по data-sim-mode */
    if(saved >= 100){
      document.body.style.setProperty('--sim-dash-height', saved + 'px');
      return;
    }
    document.body.style.removeProperty('--sim-dash-height');
    document.documentElement.style.removeProperty('--sim-dash-height');
  }

  function afterLayoutChange(){
    const run = () => {
      try{ window.applySize?.(); }catch(e){}
      window.SimMap?.invalidateSize?.();
    };
    /* Двойной rAF + короткий timeout: дашборд успевает пересчитать высоту */
    requestAnimationFrame(() => requestAnimationFrame(run));
    setTimeout(run, 80);
  }

  function $(id){ return document.getElementById(id); }

  function showError(msg, detail){
    const el = $('sim-error-toast');
    if(!el) return;
    el.innerHTML = '<strong>' + esc(msg) + '</strong>' +
      (detail ? '<div class="sim-toast-detail">' + esc(detail) + '</div>' : '');
    el.classList.remove('hidden');
    clearTimeout(showError._t);
    showError._t = setTimeout(() => el.classList.add('hidden'), 8000);
  }

  function esc(s){
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function parseUrlMode(){
    const p = new URLSearchParams(location.search);
    const m = p.get('mode');
    return MODES.includes(m) ? m : 'synth';
  }

  function buildUrl(mode, extra){
    const p = new URLSearchParams(location.search);
    p.set('mode', mode);
    if(extra) Object.entries(extra).forEach(([k, v]) => {
      if(v == null || v === '') p.delete(k);
      else p.set(k, v);
    });
    const q = p.toString();
    return location.pathname + (q ? '?' + q : '');
  }

  function syncUrl(mode){
    try{
      history.replaceState(null, '', buildUrl(mode));
    }catch(e){}
  }

  function updateModeUi(mode){
    document.body.dataset.simMode = mode;
    MODES.forEach(m => {
      const btn = $('sim-mode-' + m);
      if(btn){
        btn.classList.toggle('active', m === mode);
        btn.setAttribute('aria-selected', m === mode ? 'true' : 'false');
      }
      const panel = $('dashboard-' + m);
      if(panel) panel.classList.toggle('hidden', m !== mode);
    });
    const menuLbl = $('sim-mode-menu-label');
    if(menuLbl) menuLbl.textContent = MODE_LABELS[mode] || mode;
    const menu = $('sim-mode-menu');
    if(menu) menu.classList.add('hidden');
  }

  function notify(from, to){
    listeners.forEach(fn => {
      try{ fn(from, to); }catch(e){ console.warn('[sim-mode]', e); }
    });
  }

  function setMode(mode, opts){
    if(!MODES.includes(mode) || mode === current) return current;
    const from = current;
    snapshotMode(from);
    current = mode;
    updateModeUi(mode);
    if(document.body.classList.contains('is-mobile') && mode !== 'synth'){
      document.body.dataset.mobileTab = 'dashboard';
      document.querySelectorAll('[data-mobile-tab]').forEach(b => {
        b.classList.toggle('active', b.dataset.mobileTab === 'dashboard');
      });
    }
    if(opts?.url !== false) syncUrl(mode);
    notify(from, mode);
    restoreMode(mode);
    applyDashHeightForMode(mode);
    afterLayoutChange();
    return current;
  }

  function snapshotMode(mode){
    if(mode === 'telemetry' && window.__simReplay?.snapshot){
      slots.telemetry = window.__simReplay.snapshot();
    }
    if(mode === 'regression' && window.__simRegression?.snapshot){
      slots.regression = window.__simRegression.snapshot();
    }
    if(mode === 'synth'){
      const s = window.__simReplay?.getSim?.();
      slots.synth = {
        playing: !!s?.playing,
        mapFollow: window.SimMap?.getPositionFollow?.() ?? false
      };
    }
  }

  function restoreMode(mode){
    if(mode === 'telemetry' && slots.telemetry && window.__simReplay?.restore){
      window.__simReplay.restore(slots.telemetry);
    } else if(mode === 'telemetry' && window.__simReplay?.onEnter){
      window.__simReplay.onEnter();
    }
    if(mode === 'regression' && slots.regression && window.__simRegression?.restore){
      window.__simRegression.restore(slots.regression);
    } else if(mode === 'regression' && window.__simRegression?.onEnter){
      window.__simRegression.onEnter();
    }
    if(mode === 'synth'){
      window.SimMap?.setMode?.('synth');
      const mapFollow = slots.synth?.mapFollow ?? false;
      window.SimMap?.setPositionFollow?.(mapFollow);
      const chk = document.getElementById('sim-map-follow');
      if(chk) chk.checked = mapFollow;
      const s = window.__simReplay?.getSim?.();
      if(slots.synth?.playing && s?.play) s.play();
    }
  }

  function onModeChange(fn){
    listeners.push(fn);
  }

  function bindSegmented(){
    MODES.forEach(m => {
      $('sim-mode-' + m)?.addEventListener('click', () => setMode(m));
    });
    $('btn-sim-mode-menu')?.addEventListener('click', e => {
      e.stopPropagation();
      $('sim-mode-menu')?.classList.toggle('hidden');
    });
    document.addEventListener('click', () => $('sim-mode-menu')?.classList.add('hidden'));
    $('sim-mode-menu')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-sim-mode]');
      if(!btn) return;
      setMode(btn.dataset.simMode);
    });
  }

  function bindKeyboard(){
    document.addEventListener('keydown', e => {
      if(e.target.matches('input, textarea, select')) return;
      if(e.key === '1') setMode('synth');
      if(e.key === '2') setMode('telemetry');
      if(e.key === '3') setMode('regression');
      if(e.key === 'ArrowLeft'){
        const i = MODES.indexOf(current);
        if(i > 0) setMode(MODES[i - 1]);
      }
      if(e.key === 'ArrowRight'){
        const i = MODES.indexOf(current);
        if(i < MODES.length - 1) setMode(MODES[i + 1]);
      }
      if(e.code === 'Space' && current === 'regression'){
        e.preventDefault();
        const RR = window.__simRegReplay;
        if(RR?.isPlaying?.()) RR.pauseReplay();
        else RR?.startReplay?.();
      }
      if(e.code === 'Space' && current === 'telemetry'){
        e.preventDefault();
        document.getElementById('btn-tel-play')?.click();
      }
    });
  }

  function bindMobileTabs(){
    document.querySelectorAll('[data-mobile-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.mobileTab;
        document.body.dataset.mobileTab = tab;
        document.querySelectorAll('[data-mobile-tab]').forEach(b => {
          b.classList.toggle('active', b.dataset.mobileTab === tab);
        });
        if(tab === 'map') setTimeout(() => window.SimMap?.invalidateSize?.(), 80);
      });
    });
    if(document.body.classList.contains('is-mobile')){
      document.body.dataset.mobileTab = 'hud';
    }
  }

  function bindDashboardResizer(){
    const handle = $('sim-dashboard-resizer');
    const wrap = $('sim-phase-app');
    if(!handle || !wrap) return;
    let startY = 0;
    let startH = 0;
    /* Миграция старого общего ключа → telemetry */
    const legacy = parseInt(sessionStorage.getItem(DASH_HEIGHT_KEY) || '', 10);
    if(legacy >= 100 && !sessionStorage.getItem(dashKey('telemetry'))){
      sessionStorage.setItem(dashKey('telemetry'), String(legacy));
      sessionStorage.setItem(dashKey('regression'), String(legacy));
    }
    applyDashHeightForMode(current);

    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      const dash = $('sim-dashboard');
      startY = e.clientY;
      startH = dash?.getBoundingClientRect().height || 280;
      const minH = current === 'synth' ? 100 : 160;
      const onMove = ev => {
        const dy = startY - ev.clientY;
        const h = Math.max(minH, Math.min(window.innerHeight * 0.55, startH + dy));
        document.body.style.setProperty('--sim-dash-height', h + 'px');
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const h = parseInt(getComputedStyle(document.body).getPropertyValue('--sim-dash-height'), 10);
        if(h >= 100) sessionStorage.setItem(dashKey(current), String(h));
        afterLayoutChange();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function handleModeSwitch(from, to){
    window.__simReplay?.pauseReplay?.();
    window.__simRegReplay?.pauseReplay?.();
    window.SimMap?.setMode?.(to === 'synth' ? 'synth' : to);
    if(to !== 'telemetry') window.SimMap?.clearModeLayers?.();
    if(to === 'synth'){
      window.__simReplay?.getSim?.()?.pause?.();
    }
    if(to === 'telemetry'){
      window.__simReplay?.getSim?.()?.pause?.();
    }
    if(to !== 'synth' && from === 'synth'){
      window.__simReplay?.getSim?.()?.pause?.();
    }
  }

  function init(){
    bindSegmented();
    bindKeyboard();
    bindMobileTabs();
    onModeChange(handleModeSwitch);
    const initial = parseUrlMode();
    current = initial;
    updateModeUi(initial);
    bindDashboardResizer();
    notify(null, initial);
    if(initial === 'telemetry') restoreMode('telemetry');
    if(initial === 'regression') restoreMode('regression');
    afterLayoutChange();
  }

  window.__simMode = {
    MODES,
    getMode: () => current,
    setMode,
    onModeChange,
    showError,
    buildUrl,
    getSlot: m => slots[m]
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else init();
})();
