/**
 * Dashboard телеметрии: DOM, timeline, incidents, export (B3/B4).
 */
(function(){
  const TP = window.TelemetryParse;
  const R = () => window.__simReplay;

  const MARK_COLOR = '#e10600';
  const NAV_COLOR = '#1f6feb';
  const SYS_COLOR = '#8b949e';
  const PERF_COLOR = '#d29922';

  function $(id){ return document.getElementById(id); }

  function esc(s){
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function shouldShowTick(e, filters){
    if(e.type === 'mark') return filters.mark;
    if(e.type === 'sys') return filters.sys;
    if(e.type === 'nav'){
      if(e.sub === 'view_auto_map' || e.sub === 'maneuver_announced') return filters.voice;
      if(e.sub === 'offroute_state') return filters.offroute;
      if(e.sub === 'converge_transition' || e.sub === 'converge_blocked_tick') return filters.converge;
      if(e.sub === 'snap_lost_long') return filters.snap;
      return filters.nav;
    }
    if(e.type === 'perf') return filters.perf;
    return false;
  }

  function tickColor(e){
    if(e.type === 'mark') return MARK_COLOR;
    if(e.type === 'nav') return NAV_COLOR;
    if(e.type === 'sys') return SYS_COLOR;
    if(e.type === 'perf') return PERF_COLOR;
    return SYS_COLOR;
  }

  function updateSummaryUi(summary){
    const el = $('tel-summary');
    if(!el || !summary) return;
    const q = summary.qualPct;
    el.innerHTML =
      '<div class="tel-sum-grid">' +
      '<div><span class="k">Длительность</span><span class="v">' + summary.durationLabel + '</span></div>' +
      '<div><span class="k">Маршрут</span><span class="v">' + (summary.routeKm != null ? summary.routeKm + ' км' : '—') + '</span></div>' +
      '<div><span class="k">Build</span><span class="v">' + summary.buildId + '</span></div>' +
      '<div><span class="k">Fix</span><span class="v">' + summary.fixCount + '</span></div>' +
      '<div><span class="k">Snap</span><span class="v">' +
        '<span class="q-good">' + q.GOOD + '%</span> · <span class="q-deg">' + q.DEGRADED + '%</span> · ' +
        '<span class="q-lost">' + q.LOST + '%</span></span></div>' +
      '<div><span class="k">Lateral p95</span><span class="v">' + (summary.latOffP95 ?? '—') + ' м</span></div>' +
      '<div><span class="k">Off-route</span><span class="v">' + summary.offrouteCount + '</span></div>' +
      '<div><span class="k">Reroute</span><span class="v">' + summary.rerouteCount + '</span></div>' +
      '<div><span class="k">Converge blocked</span><span class="v">' +
        (summary.convergeBlockedMs != null ? Math.round(summary.convergeBlockedMs / 1000) + ' с' : '—') + '</span></div>' +
      '<div><span class="k">view_auto_map</span><span class="v">' + summary.viewAutoMapCount + '</span></div>' +
      '</div>';
  }

  function renderIncidentsPanel(incidents, selectedIncidentT){
    const p = $('tel-incidents');
    if(!p) return;
    if(!incidents.length){
      p.innerHTML = '<span class="dim">Инцидентов не найдено</span>';
      return;
    }
    p.innerHTML = incidents.slice(0, 40).map(inc =>
      '<button type="button" class="tel-inc' + (selectedIncidentT === inc.t ? ' active' : '') +
      '" data-t="' + inc.t + '" title="' + esc(inc.label) + '">' +
      TP.formatClockMs(inc.t) + ' · ' + esc(inc.label) + '</button>'
    ).join('') + (incidents.length > 40 ? '<span class="dim"> …+' + (incidents.length - 40) + '</span>' : '');
    p.querySelectorAll('.tel-inc').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = Number(btn.dataset.t);
        R()?.setSelectedIncidentT?.(t);
        R()?.seekTo?.(t, true);
      });
    });
  }

  function updateMetaLabel(fileName, summary, fixes){
    const el = $('tel-meta-label');
    if(!el) return;
    if(!summary){
      el.textContent = fileName || '—';
      return;
    }
    const sid = summary.sessionId !== '—' ? String(summary.sessionId).slice(0, 10) : fixes.length + ' fix';
    el.textContent = (fileName ? fileName + ' · ' : '') + sid +
      (summary.dirty ? ' · dirty' : '') + ' · ' + summary.device;
  }

  function updateDebug(t, snaps, events, fixes){
    const snap = TP.findSnapAt(snaps, t);
    const fix = TP.findFixAt(events, fixes, t);
    const dbg = $('tel-debug');
    if(!dbg) return;
    const sm = R()?.getSmoothedHeading?.() ?? '—';
    let ors = null, navMode = null, viewMode = null, gpsConverged = null;
    try{
      const S = document.getElementById('frame')?.contentWindow?.__motoHUD?.S;
      ors = S?.offRouteState;
      navMode = S?.navMode;
      viewMode = S?.viewMode;
      gpsConverged = S?.gpsConverged;
    }catch(e){}

    dbg.innerHTML =
      '<div><strong>t</strong> ' + Math.round(t) + ' ms · <strong>snap</strong> ' + (snap?.quality ?? '—') +
        ' · lat_off ' + (snap?.lat_off ?? '—') + ' м</div>' +
      '<div><strong>offRoute</strong> ' + (ors ?? '—') + ' · <strong>converged</strong> ' + (gpsConverged ?? '—') + '</div>' +
      '<div><strong>view</strong> ' + (viewMode ?? '—') + ' · <strong>nav</strong> ' + (navMode ?? '—') + '</div>' +
      '<div><strong>fix.hdg</strong> ' + (fix?.hdg ?? '—') + ' · <strong>smoothed</strong> ' + sm +
        ' · <strong>spd</strong> ' + (fix?.spd ?? '—') + ' км/ч</div>' +
      '<div><strong>acc</strong> ' + (fix?.acc ?? '—') + ' м' +
        (fix?.dev != null ? ' · dev ' + fix.dev : '') +
        (fix?.spd_src ? ' · src ' + fix.spd_src : '') + '</div>';
  }

  function drawSnapStrip(bar, w, segments, duration){
    if(!segments.length || !duration) return;
    const strip = document.createElement('div');
    strip.className = 'tel-snap-strip';
    for(const seg of segments){
      const x0 = (seg.t0 / duration) * w;
      const x1 = (seg.t1 / duration) * w;
      const band = document.createElement('div');
      band.className = 'tel-snap-band';
      band.style.left = x0 + 'px';
      band.style.width = Math.max(1, x1 - x0) + 'px';
      band.style.background = seg.color;
      strip.appendChild(band);
    }
    bar.appendChild(strip);
  }

  function showEventPanel(e){
    const p = $('tel-event-panel');
    if(p && e) p.textContent = JSON.stringify(e, null, 0).slice(0, 600);
  }

  function drawTimeline(state){
    const bar = $('tel-timeline');
    if(!bar || !state.duration) return;
    bar.innerHTML = '';
    const w = bar.clientWidth || 400;
    drawSnapStrip(bar, w, state.segments, state.duration);
    for(const e of state.events){
      if(!shouldShowTick(e, state.filters)) continue;
      const x = ((e.t || 0) / state.duration) * w;
      const tick = document.createElement('div');
      tick.className = 'tel-tick tel-tick-' + e.type;
      tick.style.left = x + 'px';
      tick.style.background = tickColor(e);
      tick.dataset.t = String(e.t || 0);
      tick.title = e.type + (e.sub ? ':' + e.sub : '');
      tick.addEventListener('mouseenter', () => showEventPanel(e));
      bar.appendChild(tick);
    }
    const cur = document.createElement('div');
    cur.className = 'tel-cursor';
    cur.id = 'tel-cursor';
    cur.style.left = ((state.pos / state.duration) * w) + 'px';
    bar.appendChild(cur);
  }

  function syncToolbar(state){
    const tl = $('tel-time-label');
    if(tl) tl.textContent = TP.formatClockMs(state.pos) + ' / ' + TP.formatClockMs(state.duration);

    const btn = $('btn-tel-play');
    if(btn) btn.textContent = state.playing ? '⏸' : '▶';

    document.querySelectorAll('[data-tel-filter]').forEach(el => {
      const key = el.dataset.telFilter;
      if(key in state.filters) el.checked = state.filters[key];
    });

    const sel = $('sel-tel-speed');
    if(sel) sel.value = String(state.speed);

    const hudChk = $('tel-hud-follow');
    const mapChk = $('tel-map-follow');
    if(hudChk) hudChk.checked = state.hudFollow;
    if(mapChk) mapChk.checked = state.mapFollow;

    const expBtn = $('btn-tel-export-md');
    if(expBtn) expBtn.disabled = !state.fixes?.length;
  }

  function refresh(){
    const state = R()?.getState?.();
    if(!state) return;
    updateMetaLabel(state.fileName, state.summary, state.fixes);
    updateSummaryUi(state.summary);
    renderIncidentsPanel(state.incidents, state.selectedIncidentT);
    syncToolbar(state);
    if(state.fixes?.length){
      drawTimeline(state);
      updateDebug(state.pos, state.snaps, state.events, state.fixes);
    }
  }

  function exportMarkdown(){
    const state = R()?.getState?.();
    if(!state?.parsed || !TP?.formatTelemetryMarkdown) return;
    const md = TP.formatTelemetryMarkdown(state.parsed, {
      fileName: state.fileName,
      incidents: state.incidents
    });
    const base = (state.fileName || 'telemetry').replace(/\.[^.]+$/, '');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = base + '-report.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function loadFromFile(file){
    const r = new FileReader();
    r.onload = () => {
      try{ R()?.loadJsonl?.(String(r.result || ''), file.name); }
      catch(err){ window.__simMode?.showError?.('JSONL', err.message); }
    };
    r.readAsText(file);
  }

  function bindDropZone(){
    const zone = $('dashboard-telemetry');
    if(!zone) return;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('tel-drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('tel-drag'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('tel-drag');
      const file = e.dataTransfer?.files?.[0];
      if(file) loadFromFile(file);
    });
  }

  function bindUi(){
    $('tel-jsonl-file')?.addEventListener('change', () => {
      const file = $('tel-jsonl-file').files?.[0];
      if(!file) return;
      loadFromFile(file);
      $('tel-jsonl-file').value = '';
    });

    $('btn-tel-play')?.addEventListener('click', () => R()?.togglePlay?.());
    $('btn-tel-export-md')?.addEventListener('click', exportMarkdown);

    $('sel-tel-speed')?.addEventListener('change', () => {
      R()?.setSpeed?.($('sel-tel-speed').value);
    });

    $('tel-hud-follow')?.addEventListener('change', () => {
      R()?.setHudFollow?.(!!$('tel-hud-follow')?.checked);
    });
    $('tel-map-follow')?.addEventListener('change', () => {
      R()?.setMapFollow?.(!!$('tel-map-follow')?.checked);
    });

    $('tel-timeline')?.addEventListener('click', e => {
      const state = R()?.getState?.();
      if(!R()?.isActive?.() || !state?.duration) return;
      const bar = $('tel-timeline');
      const rect = bar.getBoundingClientRect();
      const t = ((e.clientX - rect.left) / rect.width) * state.duration;
      const tick = e.target.closest('.tel-tick');
      if(tick?.dataset.t){
        const te = state.events.find(ev => String(ev.t) === tick.dataset.t);
        if(te) showEventPanel(te);
        R()?.seekTo?.(Number(tick.dataset.t), true);
      } else {
        R()?.seekTo?.(t, !state.playing);
      }
    });

    document.querySelectorAll('[data-tel-filter]').forEach(el => {
      const key = el.dataset.telFilter;
      el.addEventListener('change', () => {
        R()?.setFilter?.(key, el.checked);
      });
    });

    window.addEventListener('resize', () => {
      if(R()?.isActive?.() && R()?.isTelemetryLoaded?.()) refresh();
    });

    bindDropZone();
    refresh();
  }

  window.__simTelemetryUi = { refresh, exportMarkdown };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindUi);
  } else bindUi();
})();
