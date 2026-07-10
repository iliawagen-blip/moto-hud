import fs from 'fs';
import path from 'path';
import { FIXTURES_AUTO, saveJson } from './paths.mjs';
import { validateFixture } from '../validate-schema.mjs';

const FIXTURES_MANUAL = path.join(FIXTURES_AUTO, '..', 'manual');

export function listFixtureFiles(){
  const dirs = [FIXTURES_AUTO, FIXTURES_MANUAL];
  const files = [];
  for(const dir of dirs){
    if(!fs.existsSync(dir)) continue;
    for(const f of fs.readdirSync(dir)){
      if(f.endsWith('.json') && !f.startsWith('_')){
        files.push(path.join(dir, f));
      }
    }
  }
  return files.sort();
}

export function loadFixtureFile(filePath){
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  validateFixture(data);
  return data;
}

export function saveFixture(data){
  validateFixture(data);
  const sub = data.source === 'manual' ? 'manual' : 'auto';
  const file = path.join(FIXTURES_AUTO, '..', sub, `${data.fixture_id}.json`);
  saveJson(file, data);
  return file;
}

export function loadAllFixtures(){
  return listFixtureFiles().map(loadFixtureFile);
}
