# Handoff: Nightly regression agent

> **Для:** агент Nightly (режим A — полный конвейер)  
> **Проект:** `C:\Users\Илья\Documents\jul26\moto-hud`  
> **Handoff:** 2026-07-10  
> **Предыдущие сессии:** см. `regression/results/2026-07-10/session-log.md` (не в git)

---

## TL;DR

1. **Сначала закоммить** незакоммиченные фиксы regression snap + `waitForHudFrame` (см. §4) — без них sim `on_route` будет flaky.
2. **Полный re-run sim** на 5 fixtures × 3 режима с `--force` — `sim-summary.json` за 2026-07-10 сейчас **неполный** (1/15 после точечного re-run).
3. **GH fetch retry** — в прошлой nightly ECONNRESET; cache от 2026-07-09, покрытие 5/5 сохранено.
4. Расследования **a6f82017** и **bcf693d0** закрыты — новых `investigations_pending` нет.
5. После report: `npm run regression:state` → обновить `regression/state/current.json`.

---

## 1. Контекст конвейера

| Параметр | Значение |
|----------|----------|
| Fixtures (smoke) | 5 valid, corpus v1 |
| Режимы sim | `on_route`, `deviation`, `noise_stress` |
| Эталоны | GraphHopper + ORS (Yandex **не** в nightly) |
| Оркестратор | `npm run regression:nightly` = `regression/scripts/run-nightly.mjs` |
| Smoke shortcut | `npm run regression:smoke` (= nightly, 5 fixtures) |
| Checkpoint nightly | `regression/cache/checkpoints/{date}-nightly.json` |
| Checkpoint sim | `regression/cache/checkpoints/{date}-sim.json` |
| Лог сессий | `regression/results/{date}/session-log.md` (append-only) |
| Расследования | `regression/reports/investigations/*.md` (gitignored) |

Документация: `regression/README.md`.

---

## 2. Состояние на момент handoff (2026-07-10)

### Nightly mode A (12:22 UTC)

| Метрика | Значение |
|---------|----------|
| motohud fetch | 5/5 OK |
| graphhopper fetch | **FAIL** ECONNRESET → cache 2026-07-09 |
| ors fetch | 5/5 OK |
| metrics | 5/5 пересчитано |
| sim (полный) | **10/15 pass** (67%) |
| CI gate | **FAIL** |
| consensus fail | 4/5 fixtures (refs_agree 20%, без изменений) |
| median p95 vs consensus | ~1267 м |

### Точечные прогоны после nightly

| Сессия | Действие | Результат |
|--------|----------|-----------|
| mode C (12:46) | `waitForHudFrame` в `run-sim.mjs` | a6f82017 noise_stress **PASS** |
| product-agent | snap anchor `regressionPrimeSnap` | bcf693d0 on_route **PASS** (p95=37.6, snap=0.93) |

### Sim fail после полного прогона (нужен re-run с новым кодом)

| Fixture | Режим | Причина fail | p95 | good_snap |
|---------|-------|--------------|-----|-----------|
| `491d8990` | on_route | good_snap_ratio | 13.1 м | 0.52 |
| `5fe8716d` | on_route | good_snap_ratio | 23.4 м | 0.56 |
| `9b63130e` | on_route | good_snap_ratio | 19.9 м | 0.68 |
| `bcf693d0` | on_route | было p95/snap | — | **исправлено** |
| `a6f82017` | noise_stress | crash runner | — | **исправлено** |

**Паттерн:** lateral p95 в норме, но `snap_quality` залипает в `DEGRADED` → низкий `good_snap_ratio`. Фикс product-agent (якорь по `distM`) должен закрыть все три оставшихся `on_route`.

### `regression/state/current.json` — **устарел**

- `sim.last_pass_rate_pct`: 0 (1 точечный re-run перезаписал summary)
- `investigations_pending`: 2 → **0** (оба closed)
- `git.hash`: старый (до bearing + regression fix)

Обновить: `npm run regression:state` после полного sim.

---

## 3. Закрытые расследования

| Файл | Класс | Resolution |
|------|-------|------------|
| `reports/investigations/2026-07-10-a6f82017.md` | agent_bug | `waitForHudFrame()` после `page.goto` в `run-sim.mjs` |
| `reports/investigations/2026-07-10-bcf693d0.md` | product_bug | `primeRouteSnapFromDist` + `regressionPrimeSnap`; seed в `prepareRegressionHud` |

---

## 4. Незакоммиченные изменения (блокер для чистой nightly)

**Git:** `main` ahead of origin на 1 commit (`1a5b3f7` bearing). Regression-fix **не закоммичен**.

### Product / regression (обязательно в build)

| Файл | Изменение |
|------|-----------|
| `js/route-geometry.js` | `primeRouteSnapFromDist(distM)` |
| `js/regression-sim-bridge.js` | `regressionPrimeSnap`, seed snap в `prepareRegressionHud` |
| `js/hud.js` | skip `loadCameras()` при `__REGRESSION_SIM__` |
| `js/main.js` | export `regressionPrimeSnap` |
| `regression/playwright/lib/page-helpers.mjs` | `regressionPrimeSnap` перед injectFix |
| `regression/playwright/sim-runner.mjs` | передача `routeDistM: distM` |
| `regression/scripts/run-sim.mjs` | `waitForHudFrame()` (agent_bug a6f82017) |

### Прочее (проверить diff)

- `regression/fixtures/auto/*.json` — `last_verified_at` после metrics
- `regression/scripts/update-state.mjs`, `regression/state/` — новые, добавить в git
- `package.json` — script `regression:state`

**Рекомендуемый commit message:**

```
fix(regression): якорь snap по distM в sim; waitForHudFrame

Закрывает on_route flake на длинных polyline (bcf693d0) и crash noise_stress (a6f82017).
```

---

## 5. План следующей nightly (режим A)

### Шаг 0 — подготовка

```bash
cd C:\Users\Илья\Documents\jul26\moto-hud
# Убедиться что regression/.env с GRAPHHOPPER_API_KEY и ORS_API_KEY
git status   # regression-fix закоммичен
```

### Шаг 1 — полный прогон (рекомендуется)

```bash
npm run regression:nightly -- --force --date 2026-07-10
```

Или по фазам после commit + build:

```bash
npm run build
npm run regression:fetch:gh -- --force          # приоритет: retry после ECONNRESET
npm run regression:sim -- --force --date 2026-07-10
npm run regression:report -- --date 2026-07-10
npm run regression:state
```

### Шаг 2 — append session-log

Добавить блок в `regression/results/2026-07-10/session-log.md`:

- метрики до → после (sim pass rate, GH counter, CI gate)
- действия по фазам
- решения / новые investigations (если есть)

### Шаг 3 — критерии успеха smoke v1

| Gate | Ожидание |
|------|----------|
| sim pass | **15/15** (после regression snap fix) |
| noise_stress | no crash на всех 5 |
| on_route | p95 ≤ 90 м, good_snap ≥ 0.75 |
| GH fetch | OK или осознанный skip с fresh cache |
| CI gate в summary.json | PASS |

Consensus (4/5 fail) — **известный долг**, не блокирует закрытие sim-gate, но фиксировать в log.

---

## 6. Известные риски

| Риск | Митигация |
|------|-----------|
| OSRM 429 во время motohud fetch / sim | `config/rate-limits.json` delay 2000 ms; пауза между fixtures; не параллелить sim |
| GH ECONNRESET | 2–3 retry в fetch; nightly не падать — использовать cache |
| `sim-summary.json` перезаписывается | только полный `--force` sim на все fixtures; не полагаться на точечные re-run для gate |
| Playwright порт | run-sim выбирает random 3477–3527; конфликт маловероятен |
| ORS counter | может не инкрементироваться в `cache/counters/` — косметика, не блокер |

---

## 7. Команды-шпаргалка

```bash
# Smoke (= nightly 5 fixtures)
npm run regression:smoke -- --force

# Только sim после build
npm run regression:nightly -- --skip-fetch --force

# Один fixture / режим (debug)
npm run regression:sim -- --id bcf693d0 --mode on_route --force --headed

# Review worst-case
npm run regression:review -- --open

# Схемы
npm run regression:validate-schema
```

---

## 8. Чего не делать

- **Не** включать `regression:fetch:yandex` в nightly (ручной, captcha).
- **Не** считать nightly успешной по `sim-summary` с `total: 1`.
- **Не** эскалировать в product-agent без investigation markdown + JSONL.
- **Не** коммитить `regression/.env`, `cache/`, `results/`, `reports/`.

---

## 9. Связанные handoff / docs

- `regression/README.md` — структура, этапы 0–9
- `regression/docs/graphhopper-limits.md` — лимиты GH
- `regression/docs/ors-setup.md` — ключ ORS
- `docs/HANDOFF-SBP-LEGAL.md` — другой поток (не regression)

---

## 10. Контакты артеfactов 2026-07-10

```
regression/results/2026-07-10/session-log.md
regression/results/2026-07-10/sim-summary.json      ← перезаписать полным прогоном
regression/results/2026-07-10/errors.log            ← GH HARD_KILL
regression/reports/2026-07-10/summary.json          ← CI gate (если report уже был)
regression/cache/checkpoints/2026-07-10-nightly.json
regression/cache/checkpoints/2026-07-10-sim.json
```

**Следующий агент:** commit §4 → `npm run regression:nightly -- --force` → append session-log → `regression:state` → если 15/15 PASS, можно снимать CI FAIL и готовить trend к расширению corpus.
