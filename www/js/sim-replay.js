/**
 * Replay engine для JSONL-телеметрии (данные + play/pause + map/HUD inject).
 * UI — js/sim-telemetry-ui.js
 */
(function(){
  const TP = window.TelemetryParse;

  let fileName = '';
  let parsed = null;
  let events = [];
  let fixes = [];
  let snaps = [];
  let pairs = [];
  let segments = [];
  let incidents = [];
  let summary = null;
  let duration = 0;
  let pos = 0;
  let playing = false;
  let speed = 1;
  let timer = null;
  let startWall = 0;
  let startTel = 0;
  let selectedIncidentT = null;
  let hudFollow = true;
  let mapFollow = true;

  const filters = {
    snap: true, offroute: true, converge: true, voice: true,
    nav: true, sys: true, mark: true, perf: true
  };

  function notifyUi(){
    window.__simTelemetryUi?.refresh?.();
    window.__simCompareUi?.refresh?.();
  }

  function isActive(){
    return window.__simMode?.getMode?.() === 'telemetry';
  }

  function parseFile(text){
    if(!TP?.parseTelemetryJsonl) throw new Error('telemetry-parse.js не загружен');
    parsed = TP.parseTelemetryJsonl(text);
    events = parsed.events;
    fixes = parsed.fixes;
    snaps = parsed.snaps;
    pairs = TP.buildFixSnapPairs(events);
    segments = TP.buildTrackSegments(pairs);
    incidents = TP.detectIncidents(parsed);
    summary = TP.summarizeSession(parsed);
    duration = summary.durationMs || (events.length ? events[events.length - 1].t || 0 : 0);
    return parsed;
  }

  function emitFix(f){
    if(mapFollow){
      window.SimMap?.setReplayPosition?.(f.lat, f.lon, f.hdg);
      if(playing) window.SimMap?.panReplayTo?.(f.lat, f.lon);
    }
    if(!hudFollow) return;
    const s = window.__simReplay?.getSim?.();
    if(!s?.injectFix) return;
    s.injectFix({
      lat: f.lat, lon: f.lon, acc: f.acc, speed: f.spd,
      heading: f.hdg, alt: f.alt, ts: f.ts || Date.now()
    });
  }

  function seekTo(t, doPause){
    pos = Math.max(0, Math.min(duration, t));
    const f = TP.findFixAt(events, fixes, pos);
    if(f) emitFix(f);
    if(doPause) pauseReplay();
    notifyUi();
  }

  function tickReplay(){
    if(!playing) return;
    const elapsed = (Date.now() - startWall) * speed;
    pos = startTel + elapsed;
    if(pos >= duration){ pos = duration; pauseReplay(); }
    const f = TP.findFixAt(events, fixes, pos);
    if(f) emitFix(f);
    notifyUi();
  }

  function startReplay(){
    if(!fixes.length) return;
    playing = true;
    startWall = Date.now();
    startTel = pos;
    if(timer) clearInterval(timer);
    timer = setInterval(tickReplay, 50);
    window.__simReplay?.getSim?.()?.pause?.();
    notifyUi();
  }

  function pauseReplay(){
    playing = false;
    if(timer){ clearInterval(timer); timer = null; }
    notifyUi();
  }

  function applyMapLayers(){
    window.SimMap?.setMode?.('telemetry');
    window.SimMap?.setTelemetryTrack?.(segments);
    window.SimMap?.setTelemetryIncidents?.(incidents);
    window.SimMap?.fitTelemetryBounds?.(segments);
    window.SimMap?.setOnTelemetrySegmentClick?.((t) => seekTo(t, true));
  }

  function loadJsonl(text, name){
    parseFile(text);
    if(!fixes.length) throw new Error('В файле нет событий fix');
    fileName = name || fileName || 'JSONL';
    pos = 0;
    selectedIncidentT = null;
    document.body.classList.add('tel-loaded');
    if(window.__simMode?.getMode?.() !== 'telemetry'){
      window.__simMode?.setMode?.('telemetry');
    }
    applyMapLayers();
    seekTo(0, true);
  }

  function snapshot(){
    return {
      fileName, parsed, events, fixes, snaps, pairs, segments, incidents, summary,
      duration, pos, playing: false, speed, filters: { ...filters }, selectedIncidentT,
      hudFollow, mapFollow
    };
  }

  function restore(s){
    if(!s?.fixes?.length) return;
    pauseReplay();
    fileName = s.fileName || '';
    parsed = s.parsed;
    events = s.events;
    fixes = s.fixes;
    snaps = s.snaps;
    pairs = s.pairs;
    segments = s.segments;
    incidents = s.incidents;
    summary = s.summary;
    duration = s.duration;
    pos = s.pos || 0;
    speed = s.speed || 1;
    selectedIncidentT = s.selectedIncidentT ?? null;
    hudFollow = s.hudFollow !== false;
    mapFollow = s.mapFollow !== false;
    Object.assign(filters, s.filters || {});
    document.body.classList.add('tel-loaded');
    applyMapLayers();
    seekTo(pos, true);
  }

  function onEnter(){
    if(fixes.length) applyMapLayers();
    notifyUi();
  }

  function getState(){
    return {
      fileName, parsed, events, fixes, snaps, pairs, segments, incidents, summary,
      duration, pos, playing, speed, filters, selectedIncidentT, hudFollow, mapFollow
    };
  }

  window.__simReplay = {
    getSim(){ try{ return document.getElementById('frame')?.contentWindow?.__SIM__; }catch(e){ return null; } },
    getSmoothedHeading(){
      try{ return document.getElementById('frame')?.contentWindow?.__motoHUD?.S?.smoothedHeading; }catch(e){ return null; }
    },
    loadJsonl,
    pauseReplay,
    startReplay,
    seekTo,
    snapshot,
    restore,
    onEnter,
    isTelemetryLoaded(){ return fixes.length > 0; },
    isActive,
    getState,
    setSpeed(v){ speed = Number(v) || 1; if(playing){ startTel = pos; startWall = Date.now(); } notifyUi(); },
    setFilter(key, val){ if(key in filters){ filters[key] = !!val; notifyUi(); } },
    setHudFollow(v){ hudFollow = !!v; notifyUi(); },
    setMapFollow(v){ mapFollow = !!v; notifyUi(); },
    setSelectedIncidentT(t){ selectedIncidentT = t; notifyUi(); },
    togglePlay(){
      if(!isActive() || !fixes.length) return;
      if(playing) pauseReplay();
      else startReplay();
    }
  };
})();
