/**
 * Replay JSONL-телеметрии в sim.html (standalone, без сборки).
 */
(function(){
  const MARK_COLOR = '#e10600';
  const NAV_COLOR = '#1f6feb';
  const SYS_COLOR = '#8b949e';

  let events = [];
  let fixes = [];
  let sessionMeta = null;
  let duration = 0;
  let pos = 0;
  let playing = false;
  let speed = 1;
  let timer = null;
  let startWall = 0;
  let startTel = 0;
  let mode = 'synthetic';

  const els = {};

  function $(id){ return document.getElementById(id); }

  function parseJsonl(text){
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const out = [];
    let meta = null;
    for(const line of lines){
      try{
        const o = JSON.parse(line);
        if(o.type === 'session') meta = o;
        else out.push(o);
      }catch(e){}
    }
    return { meta, events: out };
  }

  function buildFixes(ev){
    return ev.filter(e => e.type === 'fix' && e.lat != null && e.lon != null);
  }

  function emitFix(f){
    const s = window.__simReplay?.getSim?.();
    if(!s?.injectFix) return;
    s.injectFix({
      lat: f.lat,
      lon: f.lon,
      acc: f.acc,
      speed: f.spd,
      heading: f.hdg,
      alt: f.alt,
      ts: f.ts || Date.now()
    });
  }

  function findSnapAt(t){
    let best = null;
    for(const e of events){
      if(e.type !== 'snap' || e.t > t) break;
      best = e;
    }
    return best;
  }

  function findFixAt(t){
    let best = fixes[0];
    for(const f of fixes){
      if(f.t <= t) best = f;
      else break;
    }
    return best;
  }

  function updateDebug(t){
    const snap = findSnapAt(t);
    const fix = findFixAt(t);
    const dbg = $('tel-debug');
    if(!dbg) return;
    const sm = window.__simReplay?.getSmoothedHeading?.() ?? '—';
    const ors = (() => {
      try{ return document.getElementById('frame')?.contentWindow?.__motoHUD?.S?.offRouteState; }catch(e){ return null; }
    })();
    dbg.innerHTML =
      '<div><strong>t</strong> ' + Math.round(t) + ' ms</div>' +
      '<div><strong>offRouteState</strong> ' + (ors ?? '—') + '</div>' +
      '<div><strong>snap.s0</strong> ' + (snap?.s0 ?? '—') + ' · <strong>lat_off</strong> ' + (snap?.lat_off ?? '—') + '</div>' +
      '<div><strong>fix.hdg</strong> ' + (fix?.hdg ?? '—') + ' · <strong>smoothed</strong> ' + sm + '</div>' +
      '<div><strong>Δ hdg</strong> ' + (fix?.hdg != null && sm !== '—' ? Math.abs(((fix.hdg - sm + 540) % 360) - 180).toFixed(1) : '—') + '°</div>';
  }

  function drawTimeline(){
    const bar = $('tel-timeline');
    if(!bar || !duration) return;
    bar.innerHTML = '';
    const w = bar.clientWidth || 400;
    for(const e of events){
      if(!['mark','nav','sys'].includes(e.type)) continue;
      const x = (e.t / duration) * w;
      const tick = document.createElement('div');
      tick.className = 'tel-tick tel-tick-' + e.type;
      tick.style.left = x + 'px';
      tick.title = e.type + (e.sub ? ':' + e.sub : '') + (e.note ? ' (' + e.note + ')' : '');
      tick.dataset.t = String(e.t);
      if(e.type === 'mark') tick.style.background = MARK_COLOR;
      else if(e.type === 'nav') tick.style.background = NAV_COLOR;
      else tick.style.background = SYS_COLOR;
      bar.appendChild(tick);
    }
    const cur = document.createElement('div');
    cur.className = 'tel-cursor';
    cur.id = 'tel-cursor';
    cur.style.left = ((pos / duration) * w) + 'px';
    bar.appendChild(cur);
  }

  function showEventPanel(e){
    const p = $('tel-event-panel');
    if(!p || !e) return;
    p.textContent = JSON.stringify(e, null, 0).slice(0, 500);
  }

  function seekTo(t, pause){
    pos = Math.max(0, Math.min(duration, t));
    const f = findFixAt(pos);
    if(f) emitFix(f);
    updateDebug(pos);
    drawTimeline();
    const cur = $('tel-cursor');
    const bar = $('tel-timeline');
    if(cur && bar && duration){
      cur.style.left = ((pos / duration) * (bar.clientWidth || 400)) + 'px';
    }
    if(pause) pauseReplay();
  }

  function tickReplay(){
    if(!playing) return;
    const elapsed = (Date.now() - startWall) * speed;
    pos = startTel + elapsed;
    if(pos >= duration){
      pos = duration;
      pauseReplay();
    }
    const f = findFixAt(pos);
    if(f) emitFix(f);
    updateDebug(pos);
    const cur = $('tel-cursor');
    const bar = $('tel-timeline');
    if(cur && bar && duration){
      cur.style.left = ((pos / duration) * (bar.clientWidth || 400)) + 'px';
    }
  }

  function startReplay(){
    if(!fixes.length) return;
    playing = true;
    startWall = Date.now();
    startTel = pos;
    if(timer) clearInterval(timer);
    timer = setInterval(tickReplay, 50);
    $('btn-tel-play').textContent = '⏸';
    pauseSynthetic();
  }

  function pauseReplay(){
    playing = false;
    if(timer){ clearInterval(timer); timer = null; }
    $('btn-tel-play').textContent = '▶';
  }

  function pauseSynthetic(){
    const s = window.__simReplay?.getSim?.();
    if(s?.pause) s.pause();
  }

  function resumeSynthetic(){
    const s = window.__simReplay?.getSim?.();
    if(s?.play) s.play();
  }

  function loadJsonl(text){
    const parsed = parseJsonl(text);
    sessionMeta = parsed.meta;
    events = parsed.events.sort((a, b) => (a.t || 0) - (b.t || 0));
    fixes = buildFixes(events);
    if(!fixes.length) throw new Error('В файле нет событий fix');
    duration = events[events.length - 1].t || fixes[fixes.length - 1].t || 0;
    pos = 0;
    mode = 'telemetry';
    $('tel-replay-bar')?.classList.remove('hidden');
    $('tel-meta-label').textContent = sessionMeta
      ? ('Сессия ' + (sessionMeta.id || '').slice(0, 8) + (sessionMeta.dirty ? ' · dirty' : ''))
      : fixes.length + ' fix';
    drawTimeline();
    seekTo(0, true);
  }

  function bindUi(){
    $('tel-jsonl-file')?.addEventListener('change', () => {
      const file = $('tel-jsonl-file').files?.[0];
      if(!file) return;
      const r = new FileReader();
      r.onload = () => {
        try{
          loadJsonl(String(r.result || ''));
        }catch(e){ alert('JSONL: ' + e.message); }
      };
      r.readAsText(file);
      $('tel-jsonl-file').value = '';
    });

    $('btn-tel-play')?.addEventListener('click', () => {
      if(mode !== 'telemetry') return;
      if(playing) pauseReplay();
      else startReplay();
    });

    $('btn-tel-mode-synth')?.addEventListener('click', () => {
      mode = 'synthetic';
      pauseReplay();
      $('tel-replay-bar')?.classList.add('hidden');
      resumeSynthetic();
    });

    $('sel-tel-speed')?.addEventListener('change', () => {
      speed = Number($('sel-tel-speed').value) || 1;
      if(playing){
        startTel = pos;
        startWall = Date.now();
      }
    });

    $('tel-timeline')?.addEventListener('click', e => {
      if(mode !== 'telemetry' || !duration) return;
      const bar = $('tel-timeline');
      const rect = bar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const t = (x / rect.width) * duration;
      const tick = e.target.closest('.tel-tick');
      if(tick?.dataset.t){
        const te = events.find(ev => String(ev.t) === tick.dataset.t && ['mark','nav','sys'].includes(ev.type));
        if(te) showEventPanel(te);
        seekTo(Number(tick.dataset.t), true);
      } else {
        seekTo(t, !playing);
      }
    });
  }

  window.__simReplay = {
    getSim(){ try{ return document.getElementById('frame')?.contentWindow?.__SIM__; }catch(e){ return null; } },
    getSmoothedHeading(){
      try{ return document.getElementById('frame')?.contentWindow?.__motoHUD?.S?.smoothedHeading; }catch(e){ return null; }
    },
    loadJsonl,
    isTelemetryMode(){ return mode === 'telemetry'; }
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindUi);
  } else bindUi();
})();
