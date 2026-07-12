/**
 * Replay regression ticks в iframe HUD (D1 / R6).
 */
(function(){
  const RP = window.RegressionParse;

  let playing = false;
  let speed = 4;
  let timer = null;
  let startWall = 0;
  let startSimS = 0;
  let posS = 0;
  let preparedKey = null;
  let hudFollow = true;
  let mapFollow = true;
  let getTicks = () => [];
  let getDuration = () => 0;
  let onPosChange = null;

  function $(id){ return document.getElementById(id); }

  function getFrameWin(){
    try{ return $('frame')?.contentWindow || null; }catch(e){ return null; }
  }

  function getHud(){
    try{ return getFrameWin()?.__motoHUD || null; }catch(e){ return null; }
  }

  function getSim(){
    try{ return getFrameWin()?.__SIM__ || null; }catch(e){ return null; }
  }

  async function waitForHud(maxMs = 45000){
    const t0 = Date.now();
    while(Date.now() - t0 < maxMs){
      const hud = getHud();
      const sim = getSim();
      if(hud?.prepareRegressionHud && sim?.injectFix) return true;
      await new Promise(r => setTimeout(r, 120));
    }
    throw new Error('iframe HUD не готов — дождитесь загрузки приложения');
  }

  function updatePlayBtn(){
    const btn = $('btn-reg-play');
    if(btn) btn.textContent = playing ? '⏸' : '▶';
  }

  function emitTick(t){
    if(!t || t.lat == null || t.lon == null) return;
    if(hudFollow){
      const hud = getHud();
      const sim = getSim();
      if(t.dist_m != null) hud?.regressionPrimeSnap?.(t.dist_m);
      sim?.injectFix?.({
        lat: t.lat,
        lon: t.lon,
        heading: t.heading ?? 0,
        speed: 0,
        acc: t.gps_acc ?? 5
      });
    }
    window.SimMap?.setReplayPosition?.(t.lat, t.lon, t.heading);
    if(mapFollow && playing) window.SimMap?.panReplayTo?.(t.lat, t.lon);
  }

  function seekTo(simS, opts){
    const duration = getDuration();
    posS = Math.max(0, Math.min(duration || 0, simS || 0));
    const ticks = getTicks();
    const t = RP?.findTickAt?.(ticks, posS);
    if(t){
      emitTick(t);
      if(mapFollow && !playing) window.SimMap?.panReplayTo?.(t.lat, t.lon);
    }
    if(!opts?.silent) onPosChange?.(posS);
    if(opts?.pause !== false && playing) pauseReplay();
    return posS;
  }

  function tickReplay(){
    if(!playing) return;
    const duration = getDuration();
    const elapsed = ((Date.now() - startWall) / 1000) * speed;
    posS = startSimS + elapsed;
    if(posS >= duration){
      posS = duration;
      pauseReplay();
    }
    const t = RP?.findTickAt?.(getTicks(), posS);
    if(t) emitTick(t);
    onPosChange?.(posS);
  }

  function startReplay(){
    const duration = getDuration();
    if(!getTicks().length || !duration) return;
    playing = true;
    startWall = Date.now();
    startSimS = posS;
    if(timer) clearInterval(timer);
    timer = setInterval(tickReplay, 50);
    getSim()?.pause?.();
    updatePlayBtn();
  }

  function pauseReplay(){
    playing = false;
    if(timer){ clearInterval(timer); timer = null; }
    updatePlayBtn();
  }

  async function prepareFixture(fixtureId, waypoints, cache){
    if(!fixtureId || !cache?.polyline?.length || !waypoints?.length){
      throw new Error('Нет motohud cache / waypoints для fixture');
    }
    await waitForHud();
    const sim = getSim();
    const hud = getHud();
    sim?.freezeGps?.();
    sim?.pause?.();
    hud.prepareRegressionHud({ cache, waypoints, timeScale: 1 });
    await hud.startHud?.();
    preparedKey = fixtureId;
    return true;
  }

  function snapshot(){
    return { playing, speed, posS, preparedKey, hudFollow, mapFollow };
  }

  function restore(s){
    if(!s) return;
    speed = s.speed ?? speed;
    posS = s.posS ?? 0;
    preparedKey = s.preparedKey ?? null;
    hudFollow = s.hudFollow !== false;
    mapFollow = s.mapFollow !== false;
    const hudChk = $('reg-hud-follow');
    if(hudChk) hudChk.checked = hudFollow;
    const mapChk = $('reg-map-follow');
    if(mapChk) mapChk.checked = mapFollow;
    const sel = $('sel-reg-speed');
    if(sel) sel.value = String(speed);
    pauseReplay();
  }

  function bindUi(){
    $('btn-reg-play')?.addEventListener('click', () => {
      if(window.__simMode?.getMode?.() !== 'regression') return;
      if(playing) pauseReplay();
      else startReplay();
    });
    $('sel-reg-speed')?.addEventListener('change', () => {
      speed = Number($('sel-reg-speed')?.value) || 4;
      if(playing){ startSimS = posS; startWall = Date.now(); }
    });
    $('reg-hud-follow')?.addEventListener('change', () => {
      hudFollow = !!$('reg-hud-follow')?.checked;
    });
    $('reg-map-follow')?.addEventListener('change', () => {
      mapFollow = !!$('reg-map-follow')?.checked;
    });
    hudFollow = !!$('reg-hud-follow')?.checked;
    mapFollow = $('reg-map-follow') ? !!$('reg-map-follow').checked : true;
    speed = Number($('sel-reg-speed')?.value) || 4;
  }

  window.__simRegReplay = {
    configure(opts){
      if(opts?.getTicks) getTicks = opts.getTicks;
      if(opts?.getDuration) getDuration = opts.getDuration;
      if(opts?.onPosChange) onPosChange = opts.onPosChange;
    },
    waitForHud,
    prepareFixture,
    emitTick,
    seekTo,
    startReplay,
    pauseReplay,
    getPos: () => posS,
    setPos: v => { posS = v; },
    getPreparedKey: () => preparedKey,
    isPlaying: () => playing,
    snapshot,
    restore,
    getHud,
    getSim
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindUi);
  } else bindUi();
})();
