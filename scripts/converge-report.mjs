#!/usr/bin/env node
/**
 * Отчёт по телеметрии converge (вечер 0).
 *   node scripts/converge-report.mjs path/to/session.jsonl [...]
 *   node scripts/converge-report.mjs fixtures/*.jsonl
 */
import fs from 'fs';
import path from 'path';

function usage(){
  console.log('Usage: node scripts/converge-report.mjs <telemetry.jsonl> [...]');
  process.exit(1);
}

function readJsonl(file){
  const text = fs.readFileSync(file, 'utf8');
  const events = [];
  for(const line of text.split(/\r?\n/)){
    const t = line.trim();
    if(!t) continue;
    try{ events.push(JSON.parse(t)); }catch(e){}
  }
  return events;
}

function pct(arr, p){
  if(!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
  return s[i];
}

function median(arr){
  return pct(arr, 50);
}

function analyzeSession(events, label){
  const transitions = events.filter(e => e.type === 'nav' && e.sub === 'converge_transition');
  const blockedTicks = events.filter(e => e.type === 'nav' && e.sub === 'converge_blocked_tick');
  const first = events.find(e => e.type === 'nav' && e.sub === 'converge_first');
  const summary = events.find(e => e.type === 'meta' && e.sub === 'converge_session_summary');
  const marks = events.filter(e => e.type === 'mark');
  const phantomMarks = marks.filter(m =>
    /phantom/i.test(m.note || '') || (m.tags || []).includes('phantom_turn')
  );

  const falseTransitions = transitions.filter(t => t.to === false);
  const blockedDurations = blockedTicks.map(t => t.dur_blocked_ms).filter(Number.isFinite);
  const maxAccWhileBlocked = blockedTicks.map(t => t.acc).filter(Number.isFinite);

  const offRouteWhileBlocked = blockedTicks.filter(t =>
    t.off_route_state && t.off_route_state !== 'ON_ROUTE'
  ).length;

  return {
    label,
    transitions: transitions.length,
    false_transitions: falseTransitions.length,
    blocked_ticks: blockedTicks.length,
    blocked_total_ms: summary?.converge_blocked_total_ms ?? null,
    blocked_moving_ms: summary?.converge_blocked_while_moving_ms ?? null,
    max_blocked_streak_ms: summary?.max_blocked_streak_ms ?? median(blockedDurations),
    time_to_first_converge_ms: first?.time_to_first_converge_ms ?? null,
    re_converge_count: summary?.re_converge_count ?? falseTransitions.filter(t =>
      t.reason === 'invalidate_acc' || t.reason === 'invalidate_lost'
    ).length,
    invalidate_acc: summary?.invalidate_acc_count ?? falseTransitions.filter(t => t.reason === 'invalidate_acc').length,
    invalidate_lost: summary?.invalidate_lost_count ?? falseTransitions.filter(t => t.reason === 'invalidate_lost').length,
    reached_converge: summary?.reached_converge ?? transitions.some(t => t.to === true),
    off_route_while_blocked: offRouteWhileBlocked,
    phantom_marks: phantomMarks.length,
    max_acc_blocked: maxAccWhileBlocked.length ? Math.max(...maxAccWhileBlocked) : null,
    reasons: falseTransitions.reduce((acc, t) => {
      const r = t.reason || '?';
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {})
  };
}

function printRow(cols, widths){
  console.log(cols.map((c, i) => String(c ?? '—').padEnd(widths[i])).join(' '));
}

function main(){
  const files = process.argv.slice(2).filter(f => !f.startsWith('-'));
  if(!files.length) usage();

  const rows = [];
  for(const file of files){
    if(!fs.existsSync(file)){ console.warn('skip missing:', file); continue; }
    rows.push(analyzeSession(readJsonl(file), path.basename(file)));
  }
  if(!rows.length){ console.log('No sessions.'); return; }

  console.log('\n=== Converge report ===\n');
  const widths = [28, 8, 8, 10, 10, 10, 8, 8];
  printRow(['session', 'false', 'ticks', 'blocked_s', 'mov_s', 'ttc_ms', 're', 'phantom'], widths);
  printRow(['--------', '-----', '-----', '---------', '-----', '-------', '--', '-------'], widths);

  for(const r of rows){
    printRow([
      r.label,
      r.false_transitions,
      r.blocked_ticks,
      r.blocked_total_ms != null ? (r.blocked_total_ms / 1000).toFixed(1) : '—',
      r.blocked_moving_ms != null ? (r.blocked_moving_ms / 1000).toFixed(1) : '—',
      r.time_to_first_converge_ms ?? '—',
      r.re_converge_count,
      r.phantom_marks
    ], widths);
  }

  const blockedMoving = rows.map(r => r.blocked_moving_ms).filter(v => v != null && v > 0);
  const falseEv = rows.map(r => r.false_transitions);
  const ttc = rows.map(r => r.time_to_first_converge_ms).filter(v => v != null);

  console.log('\n--- Агрегаты ---');
  console.log('Сессий:', rows.length);
  console.log('Сессий с blocked > 30s:', rows.filter(r => (r.blocked_total_ms || 0) > 30000).length);
  console.log('Median false_transitions:', median(falseEv));
  console.log('Median blocked в движении (с):', blockedMoving.length ? (median(blockedMoving) / 1000).toFixed(1) : '—');
  console.log('Median time_to_first_converge (мс):', ttc.length ? Math.round(median(ttc)) : '—');
  console.log('Off-route при blocked:', rows.reduce((a, r) => a + r.off_route_while_blocked, 0));

  const problem = rows.filter(r =>
    (r.blocked_moving_ms || 0) > 60000 || r.false_transitions > 3
  );
  if(problem.length){
    console.log('\n⚠ Приоритет высокий (blocked_mov>60s или false>3):');
    problem.forEach(r => console.log('  -', r.label, JSON.stringify(r.reasons)));
  } else {
    console.log('\n✓ По порогам вечера 0 критичных сессий нет (нужно больше данных).');
  }
}

main();
