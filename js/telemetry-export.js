/**
 * Экспорт телеметрии: один JSONL или ZIP с несколькими сессиями.
 * @module telemetry-export
 */
import { zipSync, strToU8 } from 'fflate';
import telemetry from './telemetry.js';

function pad2(n){
  return String(n).padStart(2, '0');
}

function fmtLocal(ts){
  const d = new Date(ts || Date.now());
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
    '_' + pad2(d.getHours()) + '-' + pad2(d.getMinutes());
}

function buildReadme(exports){
  const lines = [
    'Мото ИЛС — телеметрия поездок',
    'Сессий в архиве: ' + exports.length,
    '',
    'Каждый файл .jsonl — одна поездка (отдельная запись HUD).',
    'Это не один общий JSON: внутри архива несколько файлов по числу поездок.',
    '',
    'Файлы:'
  ];
  for(const ex of exports){
    const durMin = ex.sess.startedAt && ex.sess.endedAt
      ? Math.round((ex.sess.endedAt - ex.sess.startedAt) / 60000)
      : '?';
    lines.push('- ' + ex.filename + ' · ' + durMin + ' мин · событий ' + ex.events.length);
  }
  lines.push('', 'Откройте .jsonl в sim.html или отправьте разработчику.');
  return lines.join('\n') + '\n';
}

function formatZipFilename(exports){
  const starts = exports.map(e => e.sess.startedAt || Date.now());
  const base = fmtLocal(Math.min(...starts));
  if(exports.length === 1) return 'telemetry_' + base + '.zip';
  return 'telemetry_' + base + '_' + exports.length + 'sessions.zip';
}

function triggerDownload(blob, filename){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/**
 * Сборка ZIP из уже подготовленных экспортов сессий.
 * @param {Array<{ filename: string, body: string, sess: object, events: object[] }>} exports
 */
export function buildTelemetryZip(exports){
  if(!exports.length) throw new Error('Нет сессий для архива');
  const files = {};
  for(const ex of exports){
    files[ex.filename] = strToU8(ex.body);
  }
  files['README.txt'] = strToU8(buildReadme(exports));
  const bytes = zipSync(files, { level: 6 });
  return new Blob([bytes], { type: 'application/zip' });
}

/**
 * Экспорт одной или нескольких сессий: 1 → JSONL, 2+ → ZIP.
 * @param {string[]} sessionIds
 * @returns {Promise<'jsonl'|'zip'>}
 */
export async function exportSessionsArchive(sessionIds){
  const ids = [...new Set(sessionIds.filter(Boolean))];
  if(!ids.length) throw new Error('Не выбраны сессии');

  const exports = [];
  for(const id of ids){
    exports.push(await telemetry.buildSessionExport(id));
  }

  if(exports.length === 1){
    const ex = exports[0];
    triggerDownload(ex.blob, ex.filename);
    return 'jsonl';
  }

  const zip = buildTelemetryZip(exports);
  triggerDownload(zip, formatZipFilename(exports));
  return 'zip';
}

export { triggerDownload };
