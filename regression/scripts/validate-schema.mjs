/**
 * Zod-схема fixture + validate-schema CLI.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGRESSION_ROOT = path.resolve(__dirname, '..');

const ReferenceAggregate = z.object({
  distance_m: z.number().nullable(),
  duration_s: z.number().nullable(),
  maneuver_count: z.number().int().nullable(),
  roundabout_count: z.number().int().nullable(),
  fetched_at: z.string().nullable(),
  fetch_error: z.string().nullable(),
  provider_meta: z.record(z.unknown()).optional()
}).nullable();

const Waypoint = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  label: z.string()
});

export const FixtureSchema = z.object({
  fixture_id: z.string().uuid(),
  corpus_version: z.number().int().min(1),
  created_at: z.string(),
  last_verified_at: z.string().nullable().optional(),
  source: z.enum(['auto_generator', 'real_trace', 'manual']),
  category: z.enum(['city', 'highway', 'roundabouts', 'many_waypoints', 'mountain', 'mixed']),
  region: z.string().min(1),
  tags: z.array(z.string()),
  waypoints: z.array(Waypoint).min(2),
  constraints: z.object({
    distance_km_min: z.number().min(0),
    distance_km_max: z.number().min(0),
    sim_speed_kmh: z.number().min(1).max(200)
  }),
  references: z.object({
    graphhopper: ReferenceAggregate,
    openrouteservice: ReferenceAggregate,
    yandex_web: ReferenceAggregate
  }),
  motohud: z.object({
    distance_m: z.number().nullable(),
    duration_s: z.number().nullable(),
    step_count: z.number().int().nullable(),
    router: z.enum(['osrm', 'valhalla']),
    fetched_at: z.string().nullable(),
    fetch_error: z.string().nullable()
  }),
  metrics: z.unknown().nullable().optional(),
  metadata: z.object({
    author: z.string(),
    notes: z.string(),
    known_issues: z.array(z.string()),
    compare_interpretation: z.enum(['router_diff', 'data_gap', 'suspected_bug', 'unknown']).nullable(),
    priority: z.enum(['normal', 'worst_case_candidate', 'yandex_validated'])
  }),
  status: z.enum(['valid', 'parse_failed', 'route_failed', 'stale'])
});

/** @param {unknown} data */
export function validateFixture(data){
  return FixtureSchema.parse(data);
}

/** Пустой шаблон для smoke. */
export function emptyFixture(overrides = {}){
  const id = overrides.fixture_id ?? crypto.randomUUID();
  return {
    fixture_id: id,
    corpus_version: 1,
    created_at: new Date().toISOString(),
    last_verified_at: null,
    source: 'auto_generator',
    category: 'city',
    region: 'moscow_center',
    tags: ['template'],
    waypoints: [
      { lat: 55.7558, lon: 37.6173, label: 'start' },
      { lat: 55.7800, lon: 37.6500, label: 'finish' }
    ],
    constraints: { distance_km_min: 5, distance_km_max: 300, sim_speed_kmh: 60 },
    references: { graphhopper: null, openrouteservice: null, yandex_web: null },
    motohud: {
      distance_m: null,
      duration_s: null,
      step_count: null,
      router: 'osrm',
      fetched_at: null,
      fetch_error: null
    },
    metrics: null,
    metadata: {
      author: 'validate-schema',
      notes: 'template fixture',
      known_issues: [],
      compare_interpretation: null,
      priority: 'normal'
    },
    status: 'valid',
    ...overrides
  };
}

async function main(){
  const arg = process.argv[2];
  if(arg && fs.existsSync(arg)){
    const data = JSON.parse(fs.readFileSync(arg, 'utf8'));
    validateFixture(data);
    console.log('OK:', arg);
    return;
  }
  const sample = emptyFixture();
  validateFixture(sample);
  const out = path.join(REGRESSION_ROOT, 'fixtures', 'auto', '_schema_template.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(sample, null, 2) + '\n');
  console.log('OK: template fixture written to', out);
}

if(import.meta.url === pathToFileURL(process.argv[1]).href){
  main().catch(e => {
    console.error('validate-schema FAIL:', e.message);
    process.exit(1);
  });
}
