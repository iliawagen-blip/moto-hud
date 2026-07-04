import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild';

const ROOT = process.cwd();
const WWW = path.join(ROOT, 'www');

const STATIC_FILES = ['index.html', 'sim.html', 'manifest.json', 'icon.svg', 'sw.js', 'serve.json', 'preview.bat'];
const STATIC_DIRS = ['css', 'js', 'fixtures'];

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

await esbuild.build({
  entryPoints: [path.join(ROOT, 'js', 'sim-main.js')],
  outfile: path.join(ROOT, 'js', 'sim.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  logLevel: 'info'
});

// www/ для Capacitor sync
rmrf(WWW);
fs.mkdirSync(WWW, { recursive: true });
STATIC_FILES.forEach(f => {
  const src = path.join(ROOT, f);
  if(fs.existsSync(src)) cp(src, path.join(WWW, f));
});
STATIC_DIRS.forEach(d => {
  if(d === 'js'){
    cpDir(path.join(ROOT, 'js'), path.join(WWW, 'js'), n => n === 'sim.js' || n === 'app.js' || n === 'app.js.map');
  } else {
    cpDir(path.join(ROOT, d), path.join(WWW, d));
  }
});

console.log('build OK: js/app.js + www/');

function bumpCacheBustTags(){
  const buildId = Date.now().toString(36);
  for(const rel of ['index.html', path.join(WWW, 'index.html')]){
    const f = path.join(ROOT, rel);
    if(!fs.existsSync(f)) continue;
    let html = fs.readFileSync(f, 'utf8');
    html = html.replace(/src="js\/app\.js(\?v=[^"]*)?"/, `src="js/app.js?v=${buildId}"`);
    html = html.replace(/href="css\/app\.css(\?v=[^"]*)?"/, `href="css/app.css?v=${buildId}"`);
    fs.writeFileSync(f, html);
  }
  console.log('cache-bust: ?v=' + buildId);
}

bumpCacheBustTags();
