#!/usr/bin/env node
import fs from 'fs';
const s = fs.readFileSync('regression/cache/yandex-track-sample.json', 'utf8');
for(const k of ['segments', 'vertices', 'encoded', 'polylineGeometry', 'route', 'legs', 'distance', 'duration', 'geometry', 'coordinates']){
  console.log(k, s.indexOf(`"${k}"`));
}
const j = JSON.parse(s);
console.log('data keys', Object.keys(j.data));
if(j.data.path) console.log('path keys', Object.keys(j.data.path));
