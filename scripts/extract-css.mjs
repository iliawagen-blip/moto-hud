import fs from 'fs';
const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<style>([\s\S]*?)<\/style>/);
if (!m) throw new Error('no style');
fs.mkdirSync('css', { recursive: true });
fs.writeFileSync('css/app.css', m[1].trim());
console.log('wrote css/app.css', m[1].length, 'chars');
