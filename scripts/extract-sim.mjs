import fs from 'fs';
const h = fs.readFileSync('index.html', 'utf8');
const a = h.indexOf('(function initSim()');
const b = h.indexOf('})();', a) + 5;
let s = h.slice(a, b);
s = s.replace(
  "if(typeof applyCoordsOrLink === 'function') applyCoordsOrLink();",
  'if(window.__motoHUD?.applyCoordsOrLink) window.__motoHUD.applyCoordsOrLink();'
);
s = s.replace(
  "const st = (typeof S !== 'undefined') ? S : null;",
  'const st = window.__motoHUD?.S ?? null;'
);
s = s.replace(
  /if\(typeof startHud === 'function'[\s\S]*?startHud\(\);\s*\}/,
  "if(window.__motoHUD?.startHud && !document.getElementById('hud').classList.contains('on')){\n            window.__motoHUD.startHud();\n          }"
);
fs.writeFileSync('js/sim.js', s);
console.log('sim.js', s.length);
