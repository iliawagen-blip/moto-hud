/**
 * Просьба включить телеметрию и отправить JSONL разработчику.
 * @module telemetry-ask
 */
import telemetry from './telemetry.js';
import { refreshSessionsList } from './telemetry-ui.js';
import { hasValidLegalConsent } from './legal-consent.js';
import { isSim } from './platform.js';
import { $ } from './util.js';
import { logFunnel } from './telemetry-funnel.js';
import {
  shareSession,
  downloadSession,
  openShareEmail,
  openTelegramChat,
  formatSharePreviewHtml,
  DEV_EMAIL,
  DEV_TELEGRAM
} from './telemetry-share.js';

export { DEV_EMAIL, DEV_TELEGRAM };

export const TELEMETRY_ASK_KEY = 'moto-hud-telemetry-ask-v1';
export const TELEMETRY_SEND_ASK_KEY = 'moto-hud-telemetry-send-ask-v1';
export const TELEMETRY_SEND_SKIP_EACH_KEY = 'moto-hud-telemetry-send-skip-each';

const MIN_SEND_EVENTS = 5;
const MIN_SEND_RIDE_MS = 120000;

function readAskState(){
  try{ return localStorage.getItem(TELEMETRY_ASK_KEY) || ''; }catch(e){ return ''; }
}

function writeAskState(v){
  try{ localStorage.setItem(TELEMETRY_ASK_KEY, v); }catch(e){}
}

function readSendAskState(){
  try{ return localStorage.getItem(TELEMETRY_SEND_ASK_KEY) || ''; }catch(e){ return ''; }
}

function writeSendAskState(v){
  try{ localStorage.setItem(TELEMETRY_SEND_ASK_KEY, v); }catch(e){}
}

function readSkipEachRide(){
  try{ return localStorage.getItem(TELEMETRY_SEND_SKIP_EACH_KEY) === '1'; }catch(e){ return false; }
}

function writeSkipEachRide(on){
  try{
    if(on) localStorage.setItem(TELEMETRY_SEND_SKIP_EACH_KEY, '1');
    else localStorage.removeItem(TELEMETRY_SEND_SKIP_EACH_KEY);
  }catch(e){}
}

export function openTelemetrySettings(){
  const opts = document.getElementById('opts-settings');
  const section = document.getElementById('opts-telemetry-section');
  if(opts && !opts.open) opts.open = true;
  if(section) section.open = true;
  section?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
}

async function enableTelemetryFromAsk(){
  await telemetry.setEnabled(true);
  logFunnel('telemetry_opt_in', { source: 'ask_modal' });
  const toggle = $('opt-telemetry');
  if(toggle) toggle.checked = true;
  telemetry.updateMarkButtonVisibility();
  await refreshSessionsList();
  openTelemetrySettings();
  writeAskState('enabled');
  $('telemetry-ask-modal')?.classList.remove('on');
}

async function loadSendPreview(sessionId){
  const box = $('telemetry-send-preview');
  if(!box) return null;
  if(!sessionId){
    box.innerHTML = '<p class="hint">Выберите сессию в настройках или завершите поездку.</p>';
    return null;
  }
  try{
    const summary = await telemetry.getSessionShareSummary(sessionId);
    box.innerHTML = formatSharePreviewHtml(summary);
    return summary;
  }catch(e){
    box.innerHTML = '<p class="hint err">' + (e.message || String(e)) + '</p>';
    return null;
  }
}

function setSendStatus(msg, kind){
  const el = $('telemetry-send-status');
  if(!el) return;
  if(!msg){
    el.textContent = '';
    el.classList.add('hidden');
    return;
  }
  el.textContent = msg;
  el.classList.remove('hidden', 'ok', 'warn');
  if(kind) el.classList.add(kind);
}

function bindEnableModal(){
  const modal = $('telemetry-ask-modal');
  if(!modal || modal.dataset.bound) return;
  modal.dataset.bound = '1';

  $('telemetry-ask-enable')?.addEventListener('click', () => { void enableTelemetryFromAsk(); });
  $('telemetry-ask-later')?.addEventListener('click', () => {
    writeAskState('later');
    modal.classList.remove('on');
  });
  $('telemetry-ask-dismiss')?.addEventListener('click', () => {
    writeAskState('dismissed');
    modal.classList.remove('on');
  });
  $('telemetry-ask-open-settings')?.addEventListener('click', () => {
    openTelemetrySettings();
    modal.classList.remove('on');
  });
}

function bindSendModal(){
  const modal = $('telemetry-send-modal');
  if(!modal || modal.dataset.bound) return;
  modal.dataset.bound = '1';

  let pendingSessionId = null;
  let pendingSummary = null;

  modal.addEventListener('telemetry-send-open', e => {
    pendingSessionId = e.detail?.sessionId || null;
    const meta = $('telemetry-send-meta');
    const n = e.detail?.eventCount;
    if(meta){
      meta.textContent = n != null && n > 0
        ? 'Записано событий: ' + n + '. Файл только на устройстве — отправка добровольная.'
        : 'Файл JSONL на устройстве. Отправьте разработчику, если была проблема с навигацией.';
    }
    const note = $('telemetry-send-note');
    if(note) note.value = '';
    const skip = $('telemetry-send-skip-each');
    if(skip) skip.checked = readSkipEachRide();
    setSendStatus('', null);
    $('telemetry-send-confirm')?.classList.add('hidden');
    void loadSendPreview(pendingSessionId).then(s => { pendingSummary = s; });
  });

  $('telemetry-send-share')?.addEventListener('click', async () => {
    try{
      let sid = pendingSessionId;
      if(!sid){
        const sessions = await telemetry.listSessions();
        sid = sessions[0]?.id;
      }
      if(!sid){ alert('Нет записанных сессий'); return; }
      const note = $('telemetry-send-note')?.value || '';
      await shareSession(sid, note);
      setSendStatus(
        'Передано в Share. Выберите Telegram или почту — это не означает автоматическую доставку.',
        'ok'
      );
      $('telemetry-send-confirm')?.classList.remove('hidden');
      await refreshSessionsList();
    }catch(err){
      if(err?.name === 'AbortError') return;
      const msg = err?.message || String(err);
      if(/Share API|нельзя передать/i.test(msg)){
        setSendStatus('Share недоступен — скачайте файл и прикрепите вручную.', 'warn');
      }else{
        alert(msg);
      }
    }
  });

  $('telemetry-send-export')?.addEventListener('click', async () => {
    try{
      let sid = pendingSessionId;
      if(!sid){
        const sessions = await telemetry.listSessions();
        sid = sessions[0]?.id;
      }
      if(!sid){ alert('Нет записанных сессий'); return; }
      await downloadSession(sid);
      setSendStatus('Файл скачан — прикрепите к письму или в Telegram.', 'ok');
    }catch(err){
      alert(err.message || String(err));
    }
  });

  $('telemetry-send-email')?.addEventListener('click', async () => {
    try{
      let sid = pendingSessionId;
      if(!sid){
        const sessions = await telemetry.listSessions();
        sid = sessions[0]?.id;
      }
      const summary = pendingSummary || (sid ? await telemetry.getSessionShareSummary(sid) : null);
      if(!summary){ alert('Нет сессии для письма'); return; }
      const note = $('telemetry-send-note')?.value || '';
      openShareEmail(summary, note);
      setSendStatus('Открыта почта — прикрепите скачанный JSONL вручную.', 'warn');
    }catch(err){
      alert(err.message || String(err));
    }
  });

  $('telemetry-send-telegram')?.addEventListener('click', () => {
    openTelegramChat();
    setSendStatus('Откройте чат и прикрепите файл, если Share не сработал.', 'warn');
  });

  $('telemetry-send-confirm')?.addEventListener('click', async () => {
    if(!pendingSessionId) return;
    await telemetry.recordSessionShare(pendingSessionId, 'user_confirmed', { clearPending: true });
    logFunnel('session_marked_shared', { sessionId: pendingSessionId });
    setSendStatus('Отмечено: вы подтвердили передачу файла.', 'ok');
    await refreshSessionsList();
    setTimeout(() => modal.classList.remove('on'), 800);
  });

  $('telemetry-send-later')?.addEventListener('click', () => {
    logFunnel('share_prompt_dismissed_later', { sessionId: pendingSessionId });
    modal.classList.remove('on');
    pendingSessionId = null;
    pendingSummary = null;
  });

  $('telemetry-send-dismiss')?.addEventListener('click', () => {
    writeSendAskState('dismissed');
    logFunnel('share_prompt_dismissed_never');
    modal.classList.remove('on');
    pendingSessionId = null;
    pendingSummary = null;
  });

  $('telemetry-send-skip-each')?.addEventListener('change', e => {
    const on = !!e.target.checked;
    writeSkipEachRide(on);
    if(on) logFunnel('share_prompt_skip_per_ride');
  });
}

/** Показать просьбу включить запись (один раз / «позже» на следующий запуск). */
export function maybeShowTelemetryAsk(){
  if(isSim()) return;
  if(!hasValidLegalConsent()) return;
  if(telemetry.isEnabled()) return;

  const st = readAskState();
  if(st === 'enabled' || st === 'dismissed') return;

  const modal = $('telemetry-ask-modal');
  if(!modal) return;
  bindEnableModal();
  modal.classList.add('on');
}

/** После поездки — напомнить экспортировать и отправить файл. */
export async function maybeShowSendPrompt(sessionId){
  if(isSim() || !sessionId) return;
  if(!telemetry.isEnabled()) return;
  if(readSendAskState() === 'dismissed') return;
  if(readSkipEachRide()) return;

  let eventCount = 0;
  let durationMs = 0;
  try{
    const sessions = await telemetry.listSessions();
    const s = sessions.find(x => x.id === sessionId);
    if(!s) return;
    eventCount = s.eventCount || 0;
    durationMs = s.durationMs || 0;
    if(eventCount < MIN_SEND_EVENTS){
      logFunnel('share_prompt_skipped_short', { sessionId, reason: 'events', eventCount });
      return;
    }
    if(durationMs < MIN_SEND_RIDE_MS){
      logFunnel('share_prompt_skipped_short', { sessionId, reason: 'duration', durationMs });
      return;
    }
  }catch(e){ return; }

  const modal = $('telemetry-send-modal');
  if(!modal) return;
  bindSendModal();
  logFunnel('share_prompt_shown', { sessionId, eventCount, durationMs });
  modal.dispatchEvent(new CustomEvent('telemetry-send-open', {
    detail: { sessionId, eventCount }
  }));
  $('telemetry-send-status')?.classList.add('hidden');
  modal.classList.add('on');
}

async function maybeShowPendingShareBanner(){
  try{
    const pending = await telemetry.listPendingShareConfirm();
    if(!pending.length) return;
    const el = $('telemetry-pending-share-hint');
    if(!el) return;
    el.classList.remove('hidden');
    el.textContent = 'Есть ' + pending.length + ' сессий, переданных в Share — подтвердите доставку в настройках телеметрии.';
  }catch(e){}
}

export function initTelemetryAsk(){
  bindEnableModal();
  bindSendModal();

  $('btn-telemetry-help')?.addEventListener('click', () => {
    bindEnableModal();
    $('telemetry-ask-modal')?.classList.add('on');
  });

  $('btn-telemetry-share-help')?.addEventListener('click', () => {
    openTelemetrySettings();
    $('telemetry-send-modal')?.classList.add('on');
    $('telemetry-send-modal')?.dispatchEvent(new CustomEvent('telemetry-send-open', { detail: {} }));
  });

  void maybeShowPendingShareBanner();

  try{
    if(localStorage.getItem('moto-hud-onboarding-v1') === '1'){
      setTimeout(maybeShowTelemetryAsk, 600);
    }
  }catch(e){}
}
