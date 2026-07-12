/**
 * D5: UI сравнения полевой телеметрии и regression ticks.
 */
(function(){
  const TC = window.TickCompare;

  function $(id){ return document.getElementById(id); }

  function esc(s){
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function fmtDelta(key, d){
    if(d == null) return '—';
    if(key === 'good_snap_ratio') return (d >= 0 ? '+' : '') + d.toFixed(3);
    if(key === 'false_reroute_count') return (d >= 0 ? '+' : '') + d;
    return (d >= 0 ? '+' : '') + d.toFixed(1) + ' m';
  }

  function fmtMetric(key, v){
    if(v == null) return '—';
    if(key === 'good_snap_ratio') return v.toFixed(3);
    if(key === 'false_reroute_count') return String(v);
    return v.toFixed(1) + ' m';
  }

  function drawDistChart(canvas, distCompare){
    if(!canvas || !distCompare?.ok || !distCompare.buckets?.length) return;
    const buckets = distCompare.buckets;
    const w = canvas.width = canvas.clientWidth || 400;
    const h = canvas.height = 72;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    const maxLat = Math.max(
      25,
      ...buckets.flatMap(b => [b.field_avg_lat, b.reg_avg_lat].filter(v => v != null))
    );
    const n = buckets.length;
    const barW = Math.max(2, (w - 4) / n - 1);
    buckets.forEach((b, i) => {
      const x = 2 + i * (barW + 1);
      if(b.field_avg_lat != null){
        const fh = (b.field_avg_lat / maxLat) * (h - 8);
        ctx.fillStyle = '#ffd400';
        ctx.fillRect(x, h - fh - 2, barW * 0.45, fh);
      }
      if(b.reg_avg_lat != null){
        const rh = (b.reg_avg_lat / maxLat) * (h - 8);
        ctx.fillStyle = '#58a6ff';
        ctx.fillRect(x + barW * 0.5, h - rh - 2, barW * 0.45, rh);
      }
    });
  }

  function gatherInputs(){
    const tel = window.__simReplay?.getState?.();
    const reg = window.__simRegression?.getState?.();
    const fieldParsed = tel?.parsed;
    const regTicks = reg?.ticks || [];
    const fieldLabel = tel?.fileName || 'field JSONL';
    let regLabel = 'regression';
    if(reg?.selectedCell){
      regLabel = reg.selectedCell.fixtureId?.slice(0, 8) + ' · ' + reg.selectedCell.runMode;
      if(reg.bundleDate) regLabel = reg.bundleDate + ' / ' + regLabel;
    }
    return { fieldParsed, regTicks, fieldLabel, regLabel };
  }

  function moveCompareHost(mode){
    const wrap = $('sim-compare-wrap');
    if(!wrap) return;
    const host = mode === 'telemetry'
      ? $('sim-compare-host-tel')
      : $('regression-debug')?.parentElement;
    if(host && wrap.parentElement !== host){
      host.appendChild(wrap);
    }
  }

  function refresh(){
    const wrap = $('sim-compare-wrap');
    const panel = $('sim-compare-panel');
    if(!wrap || !panel || !TC?.compareFieldRegression) return;

    const { fieldParsed, regTicks, fieldLabel, regLabel } = gatherInputs();
    const hasField = !!fieldParsed?.snaps?.length;
    const hasReg = regTicks.length > 0;
    const mode = window.__simMode?.getMode?.();

    moveCompareHost(mode);

    if(mode !== 'telemetry' && mode !== 'regression'){
      wrap.classList.add('hidden');
      return;
    }

    if(!hasField && !hasReg){
      wrap.classList.add('hidden');
      window.__simCompare = { result: null };
      return;
    }

    wrap.classList.remove('hidden');

    if(!hasField || !hasReg){
      panel.innerHTML = '<p class="dim" style="margin:0;font-size:11px">' +
        'Сравнение: загрузите <strong>полевой JSONL</strong> (Телеметрия) и выберите ячейку <strong>Regression</strong> с tick JSONL.' +
        '<br>Сейчас: field ' + (hasField ? '✓' : '—') + ' · regression ' + (hasReg ? '✓' : '—') +
        '</p>';
      $('sim-compare-chart-wrap')?.classList.add('hidden');
      $('btn-compare-export-md')?.setAttribute('disabled', 'disabled');
      window.__simCompare = { result: null };
      return;
    }

    const result = TC.compareFieldRegression(fieldParsed, regTicks, { fieldLabel, regressionLabel: regLabel });
    window.__simCompare = { result };

    if(!result.ok){
      panel.innerHTML = '<p class="dim" style="margin:0">' + esc(result.error) + '</p>';
      $('sim-compare-chart-wrap')?.classList.add('hidden');
      $('btn-compare-export-md')?.setAttribute('disabled', 'disabled');
      return;
    }

    $('btn-compare-export-md')?.removeAttribute('disabled');

    let html = '<div class="compare-labels" style="font-size:10px;color:var(--dim);margin-bottom:4px">' +
      '<span style="color:#ffd400">■</span> ' + esc(fieldLabel) +
      ' · <span style="color:#58a6ff">■</span> ' + esc(regLabel) +
      '</div>';
    html += '<table class="reg-trends compare-metrics"><thead><tr><th>metric</th><th>field</th><th>reg</th><th>Δ</th></tr></thead><tbody>';
    for(const [key, d] of Object.entries(result.deltas)){
      const warn = key === 'good_snap_ratio' && d.delta != null && d.delta < -0.05;
      html += '<tr' + (warn ? ' class="compare-warn"' : '') + '><td><code>' + esc(key) + '</code></td>' +
        '<td>' + fmtMetric(key, d.field) + '</td>' +
        '<td>' + fmtMetric(key, d.regression) + '</td>' +
        '<td>' + fmtDelta(key, d.delta) + '</td></tr>';
    }
    html += '</tbody></table>';

    const dc = result.distCompare;
    if(dc?.ok){
      html += '<p style="margin:6px 0 2px;font-size:10px;color:var(--dim)">Lateral по dist_m (bucket ' +
        dc.bucketM + ' m, overlap ' + Math.round(dc.minD) + '–' + Math.round(dc.maxD) + ' m)</p>';
      $('sim-compare-chart-wrap')?.classList.remove('hidden');
    } else {
      html += '<p style="margin:6px 0 0;font-size:10px;color:var(--dim)">dist_m/s0: ' +
        esc(dc?.reason || 'нет данных для выравнивания') + '</p>';
      $('sim-compare-chart-wrap')?.classList.add('hidden');
    }

    panel.innerHTML = html;
    const canvas = $('sim-compare-dist-chart');
    if(dc?.ok && canvas) drawDistChart(canvas, dc);
  }

  function exportMd(){
    const result = window.__simCompare?.result;
    if(!result?.ok || !TC?.formatCompareMarkdown) return;
    const md = TC.formatCompareMarkdown(result);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'field-vs-regression-compare.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function bindUi(){
    $('btn-compare-export-md')?.addEventListener('click', exportMd);
    window.__simMode?.onModeChange?.(() => refresh());
    window.addEventListener('resize', () => {
      const canvas = $('sim-compare-dist-chart');
      const dc = window.__simCompare?.result?.distCompare;
      if(canvas && dc?.ok) drawDistChart(canvas, dc);
    });
    refresh();
  }

  window.__simCompareUi = { refresh, exportMd };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bindUi);
  } else bindUi();
})();
