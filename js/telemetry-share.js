/**
 * Отправка телеметрии: Share Sheet, шаблон, скачивание.
 * @module telemetry-share
 */
import telemetry from './telemetry.js';
import { logFunnel } from './telemetry-funnel.js';

export const DEV_EMAIL = 'iliawagen@gmail.com';
export const DEV_TELEGRAM = 'https://t.me/MotoILS';

function fmtDate(ts){
  if(!ts) return '—';
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function screenInfo(){
  try{
    return (window.screen?.width || '?') + '×' + (window.screen?.height || '?') +
      (window.screen?.orientation?.type ? ' · ' + window.screen.orientation.type : '');
  }catch(e){ return null; }
}

/**
 * Текст сопроводительного сообщения для Share / email.
 * @param {object} summary
 * @param {string} [userNote]
 */
export function buildShareMessage(summary, userNote){
  const lines = [
    'Мото ИЛС · телеметрия поездки',
    'Дата: ' + fmtDate(summary.startedAt),
    'Длительность: ' + (summary.durationMin || 0) + ' мин',
    'GPS-точек: ~' + (summary.fixCount || 0) + ' · меток: ' + (summary.markCount || 0),
    'Размер файла: ~' + (summary.sizeKb || 0) + ' КБ',
    'Регион (старт): ' + (summary.region || '—'),
    'Версия: ' + (summary.appVersion || '?') + ' · build ' + (summary.buildId || '?'),
    'Экран: ' + (screenInfo() || '—'),
    'Session: ' + (summary.sessionId || '').slice(0, 12),
    '',
    'Что было не так:',
    (userNote && userNote.trim()) ? userNote.trim() : '(опишите, если была ошибка навигации)',
    '',
    'Файл JSONL прикреплён через «Поделиться».'
  ];
  return lines.join('\n');
}

function shareFileViaSheet(file, text){
  if(!navigator.share) return Promise.reject(new Error('Share API недоступен'));
  const payload = { title: 'Мото ИЛС — телеметрия', text };
  if(file){
    if(navigator.canShare && !navigator.canShare({ files: [file] })){
      return Promise.reject(new Error('Файл нельзя передать через Share на этом устройстве'));
    }
    payload.files = [file];
  }
  return navigator.share(payload);
}

/**
 * Share Sheet с JSONL (fallback — .txt на iOS).
 */
export async function shareSession(sessionId, userNote){
  const summary = await telemetry.getSessionShareSummary(sessionId);
  const text = buildShareMessage(summary, userNote);
  const { blob, filename, body } = await telemetry.buildSessionExport(sessionId);

  let file = new File([blob], filename, { type: 'application/x-ndjson' });
  try{
    await shareFileViaSheet(file, text);
  }catch(e){
    if(file.type !== 'text/plain'){
      const txtName = filename.replace(/\.jsonl$/i, '.txt');
      file = new File([body], txtName, { type: 'text/plain' });
      await shareFileViaSheet(file, text);
    }else{
      throw e;
    }
  }

  if(userNote?.trim()) logFunnel('share_note_nonempty', { sessionId, len: userNote.trim().length });
  logFunnel('share_sheet_opened', { sessionId });
  await telemetry.recordSessionShare(sessionId, 'share_sheet', { pendingConfirm: true });
  return summary;
}

export async function downloadSession(sessionId){
  await telemetry.export(sessionId);
  logFunnel('share_download', { sessionId });
}

export function openShareEmail(summary, userNote){
  const subject = encodeURIComponent('Мото ИЛС — телеметрия');
  const body = encodeURIComponent(buildShareMessage(summary, userNote) + '\n\n(Прикрепите скачанный JSONL вручную)');
  window.location.href = 'mailto:' + DEV_EMAIL + '?subject=' + subject + '&body=' + body;
  logFunnel('share_email', { sessionId: summary.sessionId });
}

export function openTelegramChat(){
  window.open(DEV_TELEGRAM, '_blank', 'noopener');
  logFunnel('share_telegram_chat');
}

/**
 * HTML-превью для модалки отправки.
 */
export function formatSharePreviewHtml(summary){
  const dirty = summary.dirty ? ' <span class="tel-dirty">незавершена</span>' : '';
  const shared = summary.sharePendingConfirm
    ? '<p class="telemetry-preview-warn">Ранее передано в Share — убедитесь, что файл ушёл в Telegram/email.</p>'
    : '';
  return (
    '<div class="telemetry-preview">' +
    '<p><strong>Что будет отправлено</strong>' + dirty + '</p>' +
    '<ul>' +
    '<li>Поездка: ' + fmtDate(summary.startedAt) + ' · ' + (summary.durationMin || 0) + ' мин</li>' +
    '<li>GPS-точек: ~' + (summary.fixCount || 0) + ' · меток: ' + (summary.markCount || 0) + '</li>' +
    '<li>Размер: ~' + (summary.sizeKb || 0) + ' КБ</li>' +
    '<li>Регион старта: ' + (summary.region || '—') + '</li>' +
    '<li>build ' + (summary.buildId || '?') + '</li>' +
    '</ul>' +
  '<p class="hint">Полный трек поездки в файле. Адреса дома/работы могут попасть в начало/конец — при необходимости опишите это в комментарии.</p>' +
    shared +
    '</div>'
  );
}
