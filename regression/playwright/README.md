# Playwright sim (этап 7)

- `lib/gps-path.mjs` — интерполяция polyline, шум GPS, смещение для deviation
- `lib/page-helpers.mjs` — сервер, legal, injectFix
- `lib/assertions.mjs` — метрики и CI-пороги
- `sim-runner.mjs` — прогон fixture × режим

Оркестратор: `regression/scripts/run-sim.mjs`
