import fs from 'fs';
import path from 'path';
import { FIXTURES_AUTO, saveJson } from './paths.mjs';
import { validateFixture } from '../validate-schema.mjs';

export function listFixtureFiles(){
  if(!fs.existsSync(FIXTURES_AUTO)) return [];
  return fs.readdirSync(FIXTURES_AUTO)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .map(f => path.join(FIXTURES_AUTO, f));
}

export function loadFixtureFile(filePath){
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  validateFixture(data);
  return data;
}

export function saveFixture(data){
  validateFixture(data);
  const file = path.join(FIXTURES_AUTO, `${data.fixture_id}.json`);
  saveJson(file, data);
  return file;
}

export function loadAllFixtures(){
  return listFixtureFiles().map(loadFixtureFile);
}
