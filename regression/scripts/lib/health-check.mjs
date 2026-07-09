/**
 * Health-check: запись ошибок при hard-kill фазы nightly.
 */
import fs from 'fs';
import path from 'path';
import { errorsLogPath } from './paths.mjs';

/**
 * @param {string} date — YYYY-MM-DD
 * @param {{
 *   phase: string,
 *   reason: string,
 *   fixture_id?: string,
 *   elapsed_ms?: number,
 *   expected_ms?: number,
 *   tail_log?: string[]
 * }} detail
 */
export function appendHardKillError(date, detail){
  const logPath = errorsLogPath(date);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const block = [
    '---',
    `[${new Date().toISOString()}] HARD_KILL phase=${detail.phase}`,
    `reason: ${detail.reason}`,
    detail.fixture_id ? `last_fixture: ${detail.fixture_id}` : null,
    detail.elapsed_ms != null ? `elapsed_ms: ${detail.elapsed_ms}` : null,
    detail.expected_ms != null ? `expected_ms: ${detail.expected_ms}` : null,
    detail.tail_log?.length ? 'tail_log:\n' + detail.tail_log.join('\n') : null,
    ''
  ].filter(Boolean).join('\n');
  fs.appendFileSync(logPath, block + '\n', 'utf8');
  return logPath;
}

/**
 * Обертка с таймаутом фазы (2× ожидаемого).
 * @template T
 * @param {string} phase
 * @param {number} expectedMs
 * @param {string} date
 * @param {() => Promise<T>} fn
 * @param {{ getLastFixture?: () => string | null, getTailLog?: () => string[] }} [ctx]
 */
export async function runPhaseWithHealthCheck(phase, expectedMs, date, fn, ctx = {}){
  const t0 = Date.now();
  const limit = expectedMs * 2;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`phase_timeout:${phase}`)), limit);
  });
  try{
    return await Promise.race([fn(), timeout]);
  }catch(e){
    if(String(e?.message || e).includes('phase_timeout')){
      appendHardKillError(date, {
        phase,
        reason: `exceeded 2× expected duration (${expectedMs}ms)`,
        fixture_id: ctx.getLastFixture?.() ?? undefined,
        elapsed_ms: Date.now() - t0,
        expected_ms: expectedMs,
        tail_log: ctx.getTailLog?.() ?? []
      });
    }
    throw e;
  }finally{
    clearTimeout(timer);
  }
}
