import fs from 'fs';
const h = fs.readFileSync('index.html', 'utf8');
const headEnd = h.indexOf('<style>');
const bodyStart = h.indexOf('</style>') + '</style>'.length;
const scriptStart = h.indexOf('<script>');
const scriptEnd = h.lastIndexOf('</script>');

const slim = h.slice(0, headEnd) +
  '<link rel="stylesheet" href="css/app.css">\n' +
  h.slice(bodyStart, scriptStart) +
  '<script src="js/sim.js"></script>\n' +
  '<script type="module" src="js/main.js"></script>\n' +
  h.slice(scriptEnd + '</script>'.length);

fs.writeFileSync('index.html', slim);
console.log('index.html slim:', slim.length, 'was', h.length);
