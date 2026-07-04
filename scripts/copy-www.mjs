import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const WWW = path.join(ROOT, 'www');

const FILES = ['index.html', 'sim.html', 'manifest.json', 'icon.svg', 'sw.js'];
const DIRS = ['css', 'js'];

function rmrf(p){
  if(fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function cp(src, dst){
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function cpDir(srcDir, dstDir){
  fs.mkdirSync(dstDir, { recursive: true });
  for(const name of fs.readdirSync(srcDir)){
    const s = path.join(srcDir, name);
    const d = path.join(dstDir, name);
    if(fs.statSync(s).isDirectory()) cpDir(s, d);
    else cp(s, d);
  }
}

rmrf(WWW);
fs.mkdirSync(WWW, { recursive: true });
FILES.forEach(f => cp(path.join(ROOT, f), path.join(WWW, f)));
DIRS.forEach(d => cpDir(path.join(ROOT, d), path.join(WWW, d)));
console.log('www/ готов:', WWW);
