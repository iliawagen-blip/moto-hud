#!/usr/bin/env node
/**
 * Отчёт по воронке UX телеметрии (вечер 0b).
 *   node scripts/telemetry-funnel-report.mjs path/to/session.jsonl [...]
 *   node scripts/telemetry-funnel-report.mjs fixtures/*.jsonl
 *
 * Считает события meta.funnel из JSONL и агрегирует конверсию opt-in → share.
 */
import fs from 'fs';
import path from 'path';

const FUNNEL_STAGES = [
  'telemetry_opt_in',
  'telemetry_opt_out',
  'ride_start',
  'mark_placed',
  'ride_stop',
  'share_prompt_shown',
  'share_prompt_skipped_short',
  'share_prompt_dismissed_later',
  'share_prompt_dismissed_never',
  'share_prompt_skip_per_ride',
  'share_sheet_opened',
  'share_download',
  'share_email',
  'share_telegram_chat',
  'share_note_nonempty',
  'session_marked_shared'
];

function usage(){
  console.log('Usage: node scripts/telemetry-funnel-report.mjs <telemetry.jsonl> [...]');
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

function pct(num, den){
  if(!den) return '—';
  return (100 * num / den).toFixed(1) + '%';
}

function analyzeFile(events, label){
  const funnel = events.filter(e => e.type === 'meta' && e.sub === 'funnel');
  const counts = {};
  for(const st of FUNNEL_STAGES) counts[st] = 0;
  for(const e of funnel){
    if(e.stage && counts[e.stage] != null) counts[e.stage]++;
  }
  const rides = counts.ride_stop || 0;
  const prompts = counts.share_prompt_shown || 0;
  const shares = counts.share_sheet_opened || 0;
  const confirmed = counts.session_marked_shared || 0;
  return { label, counts, rides, prompts, shares, confirmed };
}

function printRow(cols, widths){
  console.log(cols.map((c, i) => String(c ?? '—').padEnd(widths[i])).join(' '));
}

function main(){
  const files = process.argv.slice(2).filter(f => !f.startsWith('-'));
  if(!files.length) usage();

  const rows = [];
  const totals = Object.fromEntries(FUNNEL_STAGES.map(s => [s, 0]));

  for(const file of files){
    if(!fs.existsSync(file)){ console.warn('skip missing:', file); continue; }
    const row = analyzeFile(readJsonl(file), path.basename(file));
    rows.push(row);
    for(const st of FUNNEL_STAGES) totals[st] += row.counts[st] || 0;
  }
  if(!rows.length){ console.log('No sessions.'); return; }

  console.log('\n=== Telemetry funnel report ===\n');
  const widths = [28, 6, 6, 6, 6, 6, 6];
  printRow(['session', 'rides', 'prompt', 'share', 'conf', 'marks', 'opt_in'], widths);
  printRow(['--------', '-----', '------', '-----', '----', '-----', '------'], widths);

  for(const r of rows){
    printRow([
      r.label,
      r.rides,
      r.prompts,
      r.shares,
      r.confirmed,
      r.counts.mark_placed,
      r.counts.telemetry_opt_in
    ], widths);
  }

  const rides = totals.ride_stop;
  const prompts = totals.share_prompt_shown;
  const shares = totals.share_sheet_opened;
  const confirmed = totals.session_marked_shared;
  const skipped = totals.share_prompt_skipped_short;

  console.log('\n--- Агрегаты ---');
  console.log('Файлов:', rows.length);
  console.log('ride_stop:', rides);
  console.log('share_prompt_shown:', prompts, '· skipped_short:', skipped);
  console.log('share_sheet_opened:', shares);
  console.log('session_marked_shared:', confirmed);
  console.log('\n--- KPI (воронка) ---');
  console.log('prompt / ride:', pct(prompts, rides));
  console.log('share / prompt:', pct(shares, prompts));
  console.log('confirmed / share:', pct(confirmed, shares));
  console.log('confirmed / ride:', pct(confirmed, rides));
  console.log('\n--- Все стадии ---');
  for(const st of FUNNEL_STAGES){
    if(totals[st]) console.log(st + ':', totals[st]);
  }
}

main();
