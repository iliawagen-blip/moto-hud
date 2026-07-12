import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild';

const ROOT = process.cwd();
const WWW = path.join(ROOT, 'www');
const BUILD_ID = Date.now().toString(36);

const STATIC_FILES = ['index.html', 'sim.html', 'manifest.json', 'icon.svg', 'sw.js', 'serve.json', 'preview.bat'];
const STATIC_DIRS = ['css', 'js', 'fixtures', 'docs'];

function rmrf(p){
  if(fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function cp(src, dst){
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function cpDir(srcDir, dstDir, filter){
  fs.mkdirSync(dstDir, { recursive: true });
  for(const name of fs.readdirSync(srcDir)){
    if(filter && !filter(name)) continue;
    const s = path.join(srcDir, name);
    const d = path.join(dstDir, name);
    if(fs.statSync(s).isDirectory()) cpDir(s, d, filter);
    else cp(s, d);
  }
}

function stampBuildId(filePath){
  if(!fs.existsSync(filePath)) return;
  let text = fs.readFileSync(filePath, 'utf8');
  text = text.replace(/%%BUILD_ID%%/g, BUILD_ID);
  text = text.replace(/window\.__BUILD_ID__='[^']*'/g, `window.__BUILD_ID__='${BUILD_ID}'`);
  text = text.replace(/js\/sim\.js\?v=[^'"]+/g, `js/sim.js?v=${BUILD_ID}`);
  fs.writeFileSync(filePath, text);
}

// бандл: резолвит @capacitor/* для нативного приложения и PWA
await esbuild.build({
  entryPoints: [path.join(ROOT, 'js', 'main.js')],
  outfile: path.join(ROOT, 'js', 'app.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  sourcemap: true,
  logLevel: 'info'
});

// IIFE для открытия index.html через file:// (ES modules в Chrome/Edge блокируются)
await esbuild.build({
  entryPoints: [path.join(ROOT, 'js', 'main.js')],
  outfile: path.join(ROOT, 'js', 'app-iife.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  logLevel: 'info'
});

await esbuild.build({
  entryPoints: [path.join(ROOT, 'js', 'sim-main.js')],
  outfile: path.join(ROOT, 'js', 'sim.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  logLevel: 'info'
});

await esbuild.build({
  entryPoints: [path.join(ROOT, 'js', 'sim-map-module.js')],
  outfile: path.join(ROOT, 'js', 'sim-map.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  logLevel: 'info'
});

await esbuild.build({
  entryPoints: [path.join(ROOT, 'js', 'telemetry-parse.mjs')],
  outfile: path.join(ROOT, 'js', 'telemetry-parse.js'),
  bundle: true,
  format: 'iife',
  globalName: 'TelemetryParse',
  platform: 'browser',
  target: ['es2020'],
  logLevel: 'info'
});

await esbuild.build({
  entryPoints: [path.join(ROOT, 'js', 'regression-parse.mjs')],
  outfile: path.join(ROOT, 'js', 'regression-parse.js'),
  bundle: true,
  format: 'iife',
  globalName: 'RegressionParse',
  platform: 'browser',
  target: ['es2020'],
  logLevel: 'info'
});

await esbuild.build({
  entryPoints: [path.join(ROOT, 'js', 'shared', 'tick-compare.mjs')],
  outfile: path.join(ROOT, 'js', 'tick-compare.js'),
  bundle: true,
  format: 'iife',
  globalName: 'TickCompare',
  platform: 'browser',
  target: ['es2020'],
  logLevel: 'info'
});

const leafletSrc = path.join(ROOT, 'node_modules', 'leaflet', 'dist', 'leaflet.js');
const leafletDst = path.join(ROOT, 'js', 'leaflet.js');
if(fs.existsSync(leafletSrc)) cp(leafletSrc, leafletDst);

// Версия SW, manifest, cache-bust в index.html
for(const rel of ['sw.js', 'manifest.json', 'index.html']){
  stampBuildId(path.join(ROOT, rel));
}

// www/ для Capacitor sync
rmrf(WWW);
fs.mkdirSync(WWW, { recursive: true });
STATIC_FILES.forEach(f => {
  const src = path.join(ROOT, f);
  if(fs.existsSync(src)) cp(src, path.join(WWW, f));
});
STATIC_DIRS.forEach(d => {
  if(d === 'js'){
    cpDir(path.join(ROOT, 'js'), path.join(WWW, 'js'), n =>
      n === 'sim.js' || n === 'app.js' || n === 'app-iife.js' || n === 'app.js.map' ||
      n === 'sim-replay.js' || n === 'sim-mode.js' || n === 'sim-regression-ui.js' ||
      n === 'sim-regression-replay.js' || n === 'sim-compare-ui.js' ||
      n === 'tick-compare.js' ||
      n === 'sim-map.js' || n === 'sim-map-module.js' ||
      n === 'regression-parse.js' || n === 'regression-parse.mjs' ||
      n === 'telemetry-parse.js' || n === 'telemetry-parse.mjs' ||
      n.startsWith('shared') || n === 'leaflet.js');
  } else {
    cpDir(path.join(ROOT, d), path.join(WWW, d));
  }
});

stampBuildId(path.join(WWW, 'index.html'));
stampBuildId(path.join(WWW, 'manifest.json'));
stampBuildId(path.join(WWW, 'sw.js'));

console.log('build OK: js/app.js + www/');
console.log('build-id: ' + BUILD_ID);
