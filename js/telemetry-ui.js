/**
 * UI телеметрии: тумблер, кнопка «метка», список сессий, экспорт.
 */
import telemetry from './telemetry.js';
import { getLastMarkContext } from './hud.js';
import { $ } from './util.js';
import { logFunnel } from './telemetry-funnel.js';

let _tapCount = 0;
let _tapTimer = null;
const MARK_TAP_MS = 450;
/** @type {Set<string>} */
const _selected = new Set();

function bindMarkButton(){
  const btn = $('btn-telemetry-mark');
  if(!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', () => {
    _tapCount++;
    clearTimeout(_tapTimer);
    _tapTimer = setTimeout(() => {
      const n = _tapCount;
      _tapCount = 0;
      const ctx = getLastMarkContext();
      if(n >= 3){
        telemetry.mark({
          tags: ['phantom_turn'],
          note: 'phantom_turn',
          ...(ctx || {})
        });
        logFunnel('mark_placed', { kind: 'phantom_turn' });
        btn.classList.add('critical-flash');
        setTimeout(() => btn.classList.remove('critical-flash'), 400);
        try{ navigator.vibrate?.([30, 40, 30, 40, 30]); }catch(e){}
      } else if(n >= 2){
        telemetry.mark('critical');
        logFunnel('mark_placed', { kind: 'critical' });
        btn.classList.add('critical-flash');
        setTimeout(() => btn.classList.remove('critical-flash'), 400);
        try{ navigator.vibrate?.([30, 40, 30]); }catch(e){}
      } else {
        telemetry.mark(ctx ? { note: 'mark', ...ctx } : undefined);
        logFunnel('mark_placed', { kind: 'mark' });
        try{ navigator.vibrate?.(25); }catch(e){}
      }
      btn.classList.add('flash');
      setTimeout(() => btn.classList.remove('flash'), 200);
    }, MARK_TAP_MS);
  });
}

function fmtDur(ms){
  if(!ms || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if(h > 0) return h + 'ч ' + (m % 60) + 'м';
  if(m > 0) return m + 'м ' + (s % 60) + 'с';
  return s + 'с';
}

function fmtDate(ts){
  if(!ts) return '—';
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function getSessionIds(){
  const list = $('telemetry-sessions');
  if(!list) return [];
  return [...list.querySelectorAll('.tel-row[data-id]')].map(r => r.dataset.id).filter(Boolean);
}

function updateBulkBar(){
  const bar = $('telemetry-bulk-bar');
  const countEl = $('telemetry-select-count');
  const exportBtn = $('btn-telemetry-export-selected');
  const deleteBtn = $('btn-telemetry-delete-selected');
  const selectAll = $('telemetry-select-all');
  const ids = getSessionIds();
  const n = _selected.size;
  const hasSessions = ids.length > 0;

  if(bar) bar.classList.toggle('hidden', !hasSessions);
  if(countEl) countEl.textContent = n ? ('Выбрано: ' + n) : 'Ничего не выбрано';
  if(exportBtn) exportBtn.disabled = n === 0;
  if(deleteBtn) deleteBtn.disabled = n === 0;

  if(selectAll){
    selectAll.indeterminate = n > 0 && n < ids.length;
    selectAll.checked = ids.length > 0 && n === ids.length;
  }
}

function toggleSelected(id, on){
  if(on) _selected.add(id);
  else _selected.delete(id);
  const row = $('telemetry-sessions')?.querySelector('.tel-row[data-id="' + id + '"]');
  row?.classList.toggle('tel-row--selected', on);
  const cb = row?.querySelector('input[type="checkbox"]');
  if(cb) cb.checked = on;
  updateBulkBar();
}

function setAllSelected(on){
  const ids = getSessionIds();
  _selected.clear();
  if(on) ids.forEach(id => _selected.add(id));
  const list = $('telemetry-sessions');
  if(list){
    list.querySelectorAll('.tel-row[data-id]').forEach(row => {
      const checked = _selected.has(row.dataset.id);
      row.classList.toggle('tel-row--selected', checked);
      const cb = row.querySelector('input[type="checkbox"]');
      if(cb) cb.checked = checked;
    });
  }
  updateBulkBar();
}

async function exportSessions(ids){
  for(const id of ids){
    try{ await telemetry.export(id); }catch(e){ console.warn(e); }
    await new Promise(r => setTimeout(r, 300));
  }
}

async function deleteSessions(ids){
  for(const id of ids){
    await telemetry.deleteSession(id);
    _selected.delete(id);
  }
  await refreshSessionsList();
}

function renderSessionRow(s){
  const dirty = s.dirty ? ' <span class="tel-dirty">dirty</span>' : '';
  let shareBadge = '';
  if(s.sharePendingConfirm){
    shareBadge = ' <span class="tel-share-pending">Share ?</span>';
  }else if((s.shareAttempts || 0) > 0){
    shareBadge = ' <span class="tel-share-done">передано</span>';
  }
  const checked = _selected.has(s.id);
  return '<div class="tel-row' + (checked ? ' tel-row--selected' : '') + '" data-id="' + s.id + '">' +
    '<label class="tel-check" title="Выбрать сессию">' +
    '<input type="checkbox" data-act="select" data-id="' + s.id + '"' + (checked ? ' checked' : '') + '>' +
    '</label>' +
    '<div class="tel-main">' +
    '<strong>' + fmtDate(s.startedAt) + '</strong>' + dirty + shareBadge +
    '<span class="tel-meta">' + fmtDur(s.durationMs) + ' · ' +
    s.eventCount + ' соб. · меток ' + s.markCount + '</span>' +
    '</div>' +
    '<div class="tel-actions">' +
    '<button type="button" class="tel-btn" data-act="export" data-id="' + s.id + '" title="Экспорт">📤</button>' +
    '<button type="button" class="tel-btn" data-act="delete" data-id="' + s.id + '" title="Удалить">🗑</button>' +
    '</div></div>';
}

async function refreshSessionsList(){
  const list = $('telemetry-sessions');
  const stats = $('telemetry-stats');
  if(!list) return;
  try{
    const sessions = await telemetry.listSessions();
    const st = await telemetry.storageStats();
    const ids = new Set(sessions.map(s => s.id));
    for(const id of _selected){
      if(!ids.has(id)) _selected.delete(id);
    }
    if(stats){
      stats.textContent = 'Сессий: ' + st.sessions + ' / ' + st.maxSessions +
        ' · событий: ~' + st.events;
    }
    if(!sessions.length){
      list.innerHTML = '<div class="hint">Записей пока нет. Включите телеметрию и начните поездку.</div>';
      _selected.clear();
      updateBulkBar();
      return;
    }
    list.innerHTML = sessions.map(renderSessionRow).join('');
    updateBulkBar();
  }catch(e){
    list.innerHTML = '<div class="hint err">IndexedDB: ' + e.message + '</div>';
    _selected.clear();
    updateBulkBar();
  }
}

function bindSessionsList(){
  const list = $('telemetry-sessions');
  if(!list || list.dataset.bound) return;
  list.dataset.bound = '1';

  list.addEventListener('click', async e => {
    const selectCb = e.target.closest('input[data-act="select"]');
    if(selectCb){
      toggleSelected(selectCb.dataset.id, selectCb.checked);
      return;
    }
    const btn = e.target.closest('[data-act]');
    if(!btn || btn.dataset.act === 'select') return;
    const id = btn.dataset.id;
    if(btn.dataset.act === 'export'){
      try{ await telemetry.export(id); }catch(err){ alert(err.message); }
    } else if(btn.dataset.act === 'delete'){
      if(!confirm('Удалить сессию и все события?')) return;
      _selected.delete(id);
      await telemetry.deleteSession(id);
      await refreshSessionsList();
    }
  });

  $('telemetry-select-all')?.addEventListener('change', e => {
    setAllSelected(e.target.checked);
  });

  $('btn-telemetry-export-selected')?.addEventListener('click', async () => {
    const ids = [..._selected];
    if(!ids.length) return;
    await exportSessions(ids);
  });

  $('btn-telemetry-delete-selected')?.addEventListener('click', async () => {
    const ids = [..._selected];
    if(!ids.length) return;
    if(!confirm('Удалить ' + ids.length + ' сессий и все их события?')) return;
    await deleteSessions(ids);
  });

  $('btn-telemetry-export-all')?.addEventListener('click', async () => {
    const sessions = await telemetry.listSessions();
    await exportSessions(sessions.map(s => s.id));
  });
}

export function initTelemetryUI(){
  bindMarkButton();
  bindSessionsList();

  const toggle = $('opt-telemetry');
  if(toggle){
    toggle.checked = telemetry.isEnabled();
    toggle.addEventListener('change', async () => {
      await telemetry.setEnabled(toggle.checked);
      logFunnel(toggle.checked ? 'telemetry_opt_in' : 'telemetry_opt_out', { source: 'settings' });
      telemetry.updateMarkButtonVisibility();
      await refreshSessionsList();
    });
  }

  document.getElementById('opts-telemetry-section')?.addEventListener('toggle', e => {
    if(e.target.open) refreshSessionsList();
  });

  refreshSessionsList();
  telemetry.updateMarkButtonVisibility();
}

export { refreshSessionsList };
