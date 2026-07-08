/**
 * UI телеметрии: тумблер, кнопка «метка», список сессий, экспорт.
 */
import telemetry from './telemetry.js';
import { getLastMarkContext } from './hud.js';
import { $ } from './util.js';

let _tapCount = 0;
let _tapTimer = null;
const MARK_TAP_MS = 450;

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
        btn.classList.add('critical-flash');
        setTimeout(() => btn.classList.remove('critical-flash'), 400);
        try{ navigator.vibrate?.([30, 40, 30, 40, 30]); }catch(e){}
      } else if(n >= 2){
        telemetry.mark('critical');
        btn.classList.add('critical-flash');
        setTimeout(() => btn.classList.remove('critical-flash'), 400);
        try{ navigator.vibrate?.([30, 40, 30]); }catch(e){}
      } else {
        telemetry.mark(ctx ? { note: 'mark', ...ctx } : undefined);
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

async function refreshSessionsList(){
  const list = $('telemetry-sessions');
  const stats = $('telemetry-stats');
  if(!list) return;
  try{
    const sessions = await telemetry.listSessions();
    const st = await telemetry.storageStats();
    if(stats){
      stats.textContent = 'Сессий: ' + st.sessions + ' / ' + st.maxSessions +
        ' · событий: ~' + st.events;
    }
    if(!sessions.length){
      list.innerHTML = '<div class="hint">Записей пока нет. Включите телеметрию и начните поездку.</div>';
      return;
    }
    list.innerHTML = sessions.map(s => {
      const dirty = s.dirty ? ' <span class="tel-dirty">dirty</span>' : '';
      return '<div class="tel-row" data-id="' + s.id + '">' +
        '<div class="tel-main">' +
        '<strong>' + fmtDate(s.startedAt) + '</strong>' + dirty +
        '<span class="tel-meta">' + fmtDur(s.durationMs) + ' · ' +
        s.eventCount + ' соб. · меток ' + s.markCount + '</span>' +
        '</div>' +
        '<div class="tel-actions">' +
        '<button type="button" class="tel-btn" data-act="export" data-id="' + s.id + '">📤</button>' +
        '<button type="button" class="tel-btn" data-act="delete" data-id="' + s.id + '">🗑</button>' +
        '</div></div>';
    }).join('');
  }catch(e){
    list.innerHTML = '<div class="hint err">IndexedDB: ' + e.message + '</div>';
  }
}

function bindSessionsList(){
  const list = $('telemetry-sessions');
  if(!list || list.dataset.bound) return;
  list.dataset.bound = '1';
  list.addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if(!btn) return;
    const id = btn.dataset.id;
    if(btn.dataset.act === 'export'){
      try{ await telemetry.export(id); }catch(err){ alert(err.message); }
    } else if(btn.dataset.act === 'delete'){
      if(!confirm('Удалить сессию и все события?')) return;
      await telemetry.deleteSession(id);
      await refreshSessionsList();
    }
  });
  $('btn-telemetry-export-all')?.addEventListener('click', async () => {
    const sessions = await telemetry.listSessions();
    for(const s of sessions){
      try{ await telemetry.export(s.id); }catch(e){ console.warn(e); }
      await new Promise(r => setTimeout(r, 300));
    }
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
