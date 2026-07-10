import { readFileSync } from 'node:fs';

const path = process.argv[2];
const raw = readFileSync(path, 'utf8');
const fixes = raw.trim().split('\n').map(l => JSON.parse(l)).filter(e => e.type === 'fix');

function haversineM(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

let zeroSpd = 0, movingZero = 0;
const buckets = { '<20': 0, '20-40': 0, '40-60': 0, '>60': 0 };
const zeroByImplied = { '<20': 0, '20-40': 0, '40-60': 0, '>60': 0 };

for (let i = 1; i < fixes.length; i++) {
  const prev = fixes[i - 1];
  const cur = fixes[i];
  const dt = ((cur.ts || cur.rcv) - (prev.ts || prev.rcv)) / 1000;
  if (dt <= 0 || dt > 5) continue;
  const dist = haversineM(prev, cur);
  const implied = dist / dt;
  const kmh = implied * 3.6;
  const b = kmh < 20 ? '<20' : kmh < 40 ? '20-40' : kmh < 60 ? '40-60' : '>60';
  buckets[b]++;
  if (cur.spd === 0) {
    zeroSpd++;
    if (implied > 0.5) {
      movingZero++;
      zeroByImplied[b]++;
    }
  }
}

console.log('fixes', fixes.length);
console.log('spd=0 events', zeroSpd, 'of which implied>0.5m/s', movingZero);
console.log('implied km/h buckets (all):', buckets);
console.log('spd=0 while implied in bucket:', zeroByImplied);

const sample = [];
for (let i = 1; i < fixes.length && sample.length < 8; i++) {
  const prev = fixes[i - 1];
  const cur = fixes[i];
  const dt = ((cur.ts || cur.rcv) - (prev.ts || prev.rcv)) / 1000;
  if (dt <= 0 || dt > 5) continue;
  const dist = haversineM(prev, cur);
  const implied = dist / dt;
  if (cur.spd === 0 && implied > 2) {
    sample.push({ i, dist: dist.toFixed(1), dt: dt.toFixed(1), impliedKmh: (implied * 3.6).toFixed(1), acc: cur.acc });
  }
}
console.log('sample false zeros:', sample);

const GPS_SPEED_MAX_MPS = 55;
const GPS_SPEED_ACC_TRUST_M = 25;
const GPS_SPEED_MEAS_MIN_DIST_M = 1.5;
const GPS_SPEED_DEVICE_MEAS_RATIO = 2.5;

function resolveGpsSpeed(next, prev, measSpeed = null) {
  const acc = next.acc ?? 999;
  const device = (next._deviceSpd != null && !isNaN(next._deviceSpd) && next._deviceSpd >= 0) ? next._deviceSpd : null;
  let meas = 0;
  let dist = 0;
  if (prev) {
    const dt = ((next.ts || next.rcv) - (prev.ts || prev.rcv)) / 1000;
    if (dt > 0.15 && dt < 12) {
      dist = haversineM(prev, next);
      const measFloor = acc <= GPS_SPEED_ACC_TRUST_M ? 0.6 : GPS_SPEED_MEAS_MIN_DIST_M;
      if (dist >= measFloor && dist < 500) meas = dist / dt;
    }
  }
  const driftFloor = acc <= GPS_SPEED_ACC_TRUST_M ? 0.6 : GPS_SPEED_MEAS_MIN_DIST_M;
  const driftM = acc <= GPS_SPEED_ACC_TRUST_M
    ? driftFloor
    : Math.max(driftFloor, acc * 0.55);
  if (prev && dist < driftM && (device == null || device < 0.5)) return 0;
  if (device != null && device >= 0.5 && device <= GPS_SPEED_MAX_MPS && acc <= GPS_SPEED_ACC_TRUST_M) {
    if (!prev || meas <= 0 || device <= meas * GPS_SPEED_DEVICE_MEAS_RATIO + 1.5) return device;
  }
  if (meas > GPS_SPEED_MAX_MPS) meas = 0;
  if (meas > 0 && (acc <= GPS_SPEED_ACC_TRUST_M * 2 || dist > acc)) {
    return measSpeed == null ? meas : measSpeed * 0.55 + meas * 0.45;
  }
  return 0;
}

let oldZero = 0, newZero = 0, newNonZero = 0;
const fixByBucket = { '<20': 0, '20-40': 0, '40-60': 0, '>60': 0 };
const stillByBucket = { '<20': 0, '20-40': 0, '40-60': 0, '>60': 0 };
let measSpeed = null;
for (let i = 1; i < fixes.length; i++) {
  const prev = fixes[i - 1];
  const cur = fixes[i];
  const dt = ((cur.ts || cur.rcv) - (prev.ts || prev.rcv)) / 1000;
  if (dt <= 0 || dt > 5) continue;
  const dist = haversineM(prev, cur);
  const implied = dist / dt;
  const kmh = implied * 3.6;
  const b = kmh < 20 ? '<20' : kmh < 40 ? '20-40' : kmh < 60 ? '40-60' : '>60';
  const oldWouldZero = dist < Math.max(12, (cur.acc ?? 999) * 0.55);
  const sim = { ...cur, _deviceSpd: 0 };
  const resolved = resolveGpsSpeed(sim, prev, measSpeed);
  if (resolved > 0) measSpeed = resolved;
  if (cur.spd === 0 && implied > 0.5) {
    if (oldWouldZero) oldZero++;
    if (resolved === 0) { newZero++; stillByBucket[b]++; }
    else { newNonZero++; fixByBucket[b]++; }
  }
}
console.log('replay (device=0): false zeros old rule', oldZero, 'new still zero', newZero, 'new fixed', newNonZero);
console.log('fixed by bucket km/h:', fixByBucket);
console.log('still zero by bucket km/h:', stillByBucket);
