#!/usr/bin/env node
/**
 * Markdown + JSON отчёт regression-прогона.
 * Usage: node regression/scripts/generate-report.mjs [--date YYYY-MM-DD]
 */
import fs from 'fs';
import path from 'path';
import { loadConfig } from './lib/env.mjs';
import { REPORTS_DIR, saveJson } from './lib/paths.mjs';
import {
  getGitHead, previousResultDate, loadSimSummary, loadReportSummary,
  loadAllFixturesSorted, worstFixtures, simPassByFixture, trendArrow,
  groupCount, missingReferences, yandexMapUrl
} from './lib/report-lib.mjs';
import { PROJECT_ROOT } from './lib/run-child.mjs';

function parseArgs(){
  const args = process.argv.slice(2);
  return {
    date: args.includes('--date') ? args[args.indexOf('--date') + 1] : new Date().toISOString().slice(0, 10)
  };
}

function fmtM(v){
  return v == null ? '—' : `${v.toFixed(1)} м`;
}

function buildMarkdown(ctx){
  const lines = [];
  lines.push('# Regression summary — ' + ctx.date);
  lines.push('');
  lines.push('> Эталоны (GraphHopper, ORS) — средства сравнения, не «истина в последней инстанции».');
  lines.push('');
  lines.push(`**Git:** \`${ctx.git_head || 'unknown'}\`${ctx.prev_git ? ` (пред.: \`${ctx.prev_git.slice(0, 8)}\`)` : ''}`);
  lines.push(`**CI gate:** ${ctx.ci_gate ? '✅ PASS' : '❌ FAIL'}`);
  lines.push('');

  lines.push('## Сводка');
  lines.push('');
  lines.push(`| Метрика | Значение |`);
  lines.push(`|---------|----------|`);
  lines.push(`| Fixtures valid | ${ctx.fixture_count} |`);
  lines.push(`| С метриками compare | ${ctx.with_metrics} |`);
  lines.push(`| Sim прогонов | ${ctx.sim_total} (pass ${ctx.sim_pass}, fail ${ctx.sim_fail}) |`);
  lines.push(`| Consensus fail | ${ctx.consensus_fail} |`);
  lines.push(`| Consensus warn | ${ctx.consensus_warn} |`);
  lines.push(`| Без эталонов | ${ctx.missing_refs.length} |`);
  lines.push('');

  if(ctx.trends.length){
    lines.push('## Тренды vs ' + ctx.prev_date);
    lines.push('');
    for(const t of ctx.trends){
      lines.push(`- **${t.label}:** ${t.cur} ${t.arrow} (было ${t.prev})`);
    }
    lines.push('');
  }

  lines.push('## По категориям');
  lines.push('');
  for(const [k, v] of Object.entries(ctx.by_category)){
    lines.push(`- ${k}: ${v}`);
  }
  lines.push('');

  lines.push('## По регионам');
  lines.push('');
  for(const [k, v] of Object.entries(ctx.by_region)){
    lines.push(`- ${k}: ${v}`);
  }
  lines.push('');

  if(ctx.worst.length){
    lines.push('## Топ расхождений (consensus p95)');
    lines.push('');
    lines.push('| # | ID | Категория | p95 MH↔consensus | signal | Карта |');
    lines.push('|---|-----|-----------|------------------|--------|-------|');
    ctx.worst.forEach((f, i) => {
      const p95 = f.metrics?.consensus_deviation?.motohud_vs_consensus_p95_m;
      const sig = f.metrics?.consensus_deviation?.signal || '—';
      const map = yandexMapUrl(f.waypoints);
      const link = map ? `[Яндекс](${map})` : '—';
      lines.push(`| ${i + 1} | \`${f.fixture_id.slice(0, 8)}\` | ${f.category} | ${fmtM(p95)} | ${sig} | ${link} |`);
    });
    lines.push('');
  }

  if(ctx.missing_refs.length){
    lines.push('## Без reference-данных');
    lines.push('');
    for(const f of ctx.missing_refs){
      lines.push(`- \`${f.fixture_id.slice(0, 8)}\` ${f.category} / ${f.region}`);
    }
    lines.push('');
  }

  if(ctx.sim_failures.length){
    lines.push('## Падения sim');
    lines.push('');
    for(const s of ctx.sim_failures){
      lines.push(`- \`${s.fixture_id.slice(0, 8)}\` **${s.mode}**: ${s.reason}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`Сгенерировано: ${ctx.generated_at}`);
  return lines.join('\n');
}

function main(){
  const { date } = parseArgs();
  const thresholds = loadConfig('thresholds');
  const fixtures = loadAllFixturesSorted().filter(f => f.status === 'valid');
  const simSummary = loadSimSummary(date);
  const prevDate = previousResultDate(date);
  const prevReport = prevDate ? loadReportSummary(prevDate) : null;

  const consensusFail = fixtures.filter(f => f.metrics?.consensus_deviation?.signal === 'fail').length;
  const consensusWarn = fixtures.filter(f => f.metrics?.consensus_deviation?.signal === 'warn').length;
  const simPass = simSummary?.pass ?? 0;
  const simFail = simSummary?.fail ?? 0;
  const simTotal = simSummary?.total ?? 0;

  const ciGate = simFail === 0 && consensusFail === 0;

  const gitHead = getGitHead(PROJECT_ROOT);
  const prevGit = prevReport?.git_head ?? null;

  const trends = [];
  if(prevReport){
    trends.push({
      label: 'Sim fail',
      cur: simFail,
      prev: prevReport.sim_fail ?? 0,
      arrow: trendArrow(simFail, prevReport.sim_fail ?? 0, true)
    });
    trends.push({
      label: 'Consensus fail',
      cur: consensusFail,
      prev: prevReport.consensus_fail ?? 0,
      arrow: trendArrow(consensusFail, prevReport.consensus_fail ?? 0, true)
    });
    const curP95 = worstFixtures(fixtures, 1)[0]?.metrics?.consensus_deviation?.motohud_vs_consensus_p95_m;
    const prevP95 = prevReport.worst_p95_m;
    trends.push({
      label: 'Worst p95',
      cur: curP95 != null ? curP95.toFixed(1) + ' м' : '—',
      prev: prevP95 != null ? prevP95.toFixed(1) + ' м' : '—',
      arrow: trendArrow(curP95, prevP95, true)
    });
  }

  const worst = worstFixtures(fixtures, 15);
  const missing = missingReferences(fixtures);
  const simFails = (simSummary?.results || []).filter(r => !r.pass && !r.skipped).map(r => ({
    fixture_id: r.fixture_id,
    mode: r.mode,
    reason: r.assertions?.filter(a => !a.pass).map(a => a.name).join(', ') || r.crash || 'fail'
  }));

  const ctx = {
    date,
    git_head: gitHead,
    prev_git: prevGit,
    prev_date: prevDate,
    ci_gate: ciGate,
    fixture_count: fixtures.length,
    with_metrics: fixtures.filter(f => f.metrics?.coverage).length,
    sim_total: simTotal,
    sim_pass: simPass,
    sim_fail: simFail,
    consensus_fail: consensusFail,
    consensus_warn: consensusWarn,
    by_category: groupCount(fixtures, 'category'),
    by_region: groupCount(fixtures, 'region'),
    worst,
    missing_refs: missing,
    sim_failures: simFails,
    trends,
    generated_at: new Date().toISOString()
  };

  const outDir = path.join(REPORTS_DIR, date);
  fs.mkdirSync(outDir, { recursive: true });

  const md = buildMarkdown(ctx);
  const mdPath = path.join(outDir, 'summary.md');
  fs.writeFileSync(mdPath, md + '\n', 'utf8');

  const worstP95 = worst[0]?.metrics?.consensus_deviation?.motohud_vs_consensus_p95_m ?? null;

  const summaryJson = {
    date,
    git_head: gitHead,
    prev_date: prevDate,
    prev_git_head: prevGit,
    ci_gate: ciGate,
    fixture_count: fixtures.length,
    sim_pass: simPass,
    sim_fail: simFail,
    sim_total: simTotal,
    consensus_fail: consensusFail,
    consensus_warn: consensusWarn,
    worst_p95_m: worstP95,
    missing_references: missing.map(f => f.fixture_id),
    thresholds_compare: thresholds.compare,
    generated_at: ctx.generated_at
  };
  saveJson(path.join(outDir, 'summary.json'), summaryJson);

  const trendJson = {
    date,
    prev_date: prevDate,
    metrics: trends.map(t => ({ label: t.label, current: t.cur, previous: t.prev, arrow: t.arrow })),
    sim: {
      pass: simPass,
      fail: simFail,
      prev_pass: prevReport?.sim_pass ?? null,
      prev_fail: prevReport?.sim_fail ?? null
    },
    consensus: {
      fail: consensusFail,
      warn: consensusWarn,
      prev_fail: prevReport?.consensus_fail ?? null
    }
  };
  saveJson(path.join(outDir, 'trend.json'), trendJson);

  console.log(`[report] CI gate: ${ciGate ? 'PASS' : 'FAIL'}`);
  console.log(`[report] ${mdPath}`);
  console.log(`[report] ${path.join(outDir, 'summary.json')}`);

  if(!ciGate) process.exit(1);
}

main();
