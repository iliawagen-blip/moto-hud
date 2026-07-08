#!/usr/bin/env node
/** node scripts/trip-rebuild-test.mjs */
import { proposeRebuildRemaining } from '../js/trip-rebuild.js';

const trip = {
  startDate: '2026-07-01',
  finish: { lat: 55.59, lon: 37.53, label: 'Дом' },
  days: [
    { n: 1, variants: [{ id: 'calm', segments: [{ rtext: '55.59,37.53~52.61,38.52' }], night: '🌙 Елец' }] },
    { n: 2, variants: [{ id: 'calm', segments: [{ rtext: '52.61,38.52~51.72,39.14' }], night: '🌙 Воронеж' }] },
    { n: 3, variants: [{ id: 'calm', segments: [{ rtext: '51.72,39.14~55.59,37.53' }], night: '🏁 Дом' }] }
  ]
};

const start = { lat: 53.0, lon: 39.0, label: 'Сейчас' };
const p = proposeRebuildRemaining(trip, 2, start);
if(p.newDays.length !== 2) throw new Error('expected 2 rebuilt days');
if(!p.previewLines.length) throw new Error('no preview');
console.log('trip-rebuild-test OK');
