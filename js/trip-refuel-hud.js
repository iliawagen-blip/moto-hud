/**
 * HUD: «Заправился» и калибровка расхода в поездке.
 * @module trip-refuel-hud
 */
import { S } from './state.js';
import { $ } from './util.js';
import { speak } from './voice.js';
import { curPos } from './gps.js';
import { recordRefuel, suggestConsumptionCalibration, applyConsumptionCalibration } from './trip-refuel.js';

function syncRefuelRowVisible(){
  const row = $('fp-trip-refuel');
  if(!row) return;
  row.classList.toggle('hidden', !S.tripContext?.tripId);
}

async function onRefuelLiters(liters){
  const tripId = S.tripContext?.tripId;
  if(!tripId) return;
  const pos = curPos() || S.gps;
  recordRefuel(tripId, {
    liters,
    rideKm: S.distDone || 0,
    lat: pos?.lat,
    lon: pos?.lon
  });
  speak('Заправка ' + liters + ' литров');
  const cal = suggestConsumptionCalibration(tripId);
  if(cal && confirm(`Обновить расход в профиле?\n${cal.prev} → ${cal.suggested} л/100\n(${cal.liters} л за ${cal.km} км)`)){
    applyConsumptionCalibration(cal.suggested);
    speak('Расход обновлён');
  }
}

export function initTripRefuelHud(){
  const row = $('fp-trip-refuel');
  if(!row || row.dataset.bound) return;
  row.dataset.bound = '1';
  row.querySelectorAll('[data-refuel-l]').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      const l = parseFloat(btn.getAttribute('data-refuel-l'));
      if(Number.isFinite(l)) onRefuelLiters(l);
    });
  });
  $('btn-refuel-custom')?.addEventListener('click', ev => {
    ev.stopPropagation();
    const raw = prompt('Сколько литров?', '15');
    if(raw == null) return;
    const l = parseFloat(String(raw).replace(',', '.'));
    if(!Number.isFinite(l) || l <= 0) return;
    onRefuelLiters(l);
  });
}

export function syncTripRefuelHud(){
  syncRefuelRowVisible();
}
