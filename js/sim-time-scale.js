/**
 * Масштаб симулированного времени для Playwright-регрессии.
 * window.SIM_TIME_SCALE = 10 → таймеры навигации (grace, off-route) идут в 10× быстрее.
 *
 * Использование в коде Мото ИЛС:
 *   import { simScaledMs, simScaledDelta } from './sim-time-scale.js';
 *   if (Date.now() - last > simScaledMs(SPEED_LIMIT_GRACE_MS)) ...
 */
const DEFAULT_SCALE = 1;

/** Текущий масштаб (1 = реальное время). */
export function getSimTimeScale(){
  if(typeof globalThis === 'undefined') return DEFAULT_SCALE;
  const w = globalThis;
  const s = w.SIM_TIME_SCALE;
  if(s == null || s === '' || Number(s) <= 0) return DEFAULT_SCALE;
  return Number(s);
}

/** Длительность в «сим-времени» для сравнения с Date.now() в ускоренном режиме. */
export function simScaledMs(realMs){
  return realMs / getSimTimeScale();
}

/** Приращение реального интервала → сим-времени (для накопления elapsed). */
export function simScaledDelta(realDeltaMs){
  return realDeltaMs * getSimTimeScale();
}

/** Date.now() в шкале сим-времени (монотонно только при фиксированном scale). */
let _simEpochReal = null;
let _simEpochSim = null;

export function simNowMs(){
  const scale = getSimTimeScale();
  if(scale === 1) return Date.now();
  const real = Date.now();
  if(_simEpochReal == null){
    _simEpochReal = real;
    _simEpochSim = real;
  }
  return _simEpochSim + (real - _simEpochReal) * scale;
}

/** Сброс эпохи (при смене scale между fixtures). */
export function resetSimTimeEpoch(){
  _simEpochReal = null;
  _simEpochSim = null;
}
