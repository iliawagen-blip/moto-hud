/**
 * Индекс regression/results для sim.html (directory listing отключён в serve).
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const RESULTS = path.join(ROOT, 'regression', 'results');

if(!fs.existsSync(RESULTS)){
  console.log('regression-results-manifest: нет папки regression/results');
  process.exit(0);
}

const dates = fs.readdirSync(RESULTS)
  .filter(name => {
    const p = path.join(RESULTS, name);
    return fs.statSync(p).isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(name);
  })
  .sort()
  .reverse();

fs.writeFileSync(
  path.join(RESULTS, 'index.json'),
  JSON.stringify({ latest: dates[0] || null, dates }, null, 2) + '\n'
);

let manifestCount = 0;
for(const date of dates){
  const simDir = path.join(RESULTS, date, 'sim');
  if(!fs.existsSync(simDir)) continue;
  const files = fs.readdirSync(simDir)
    .filter(f => f.endsWith('.json') || f.endsWith('.jsonl') || f.endsWith('.png'))
    .sort();
  fs.writeFileSync(
    path.join(simDir, '_manifest.json'),
    JSON.stringify({ date, files }, null, 2) + '\n'
  );
  manifestCount++;
}

console.log('regression-results-manifest: dates=' + dates.length + ' sim=' + manifestCount + ' latest=' + (dates[0] || '—'));
