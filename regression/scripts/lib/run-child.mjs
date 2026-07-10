/**
 * Запуск дочерних regression-скриптов.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SCRIPTS_DIR = path.resolve(__dirname, '..');
export const PROJECT_ROOT = path.resolve(SCRIPTS_DIR, '..', '..');

/**
 * @param {string} scriptName — имя файла в regression/scripts/
 * @param {string[]} [args]
 * @param {{ allowFail?: boolean }} [opts]
 */
export function runRegressionScript(scriptName, args = [], opts = {}){
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [scriptPath, ...args], {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      env: process.env
    });
    proc.on('error', reject);
    proc.on('close', code => {
      if(code === 0 || opts.allowFail) resolve(code ?? 0);
      else reject(new Error(`${scriptName} exited with code ${code}`));
    });
  });
}
