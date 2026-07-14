# Handoff: Nightly regression agent — OFF-ROUTE SIM FIX

> **Режим:** без вопросов пользователю до закрытия sim-gate или явного stop  
> **Проект:** `C:\Users\Илья\Documents\jul26\moto-hud`  
> **Handoff:** 2026-07-13T14:00 UTC  
> **Git baseline:** `8c9e32fb44b4f7fd501400c5d7280fb74f277456` (main)  
> **Лог:** `regression/results/2026-07-12/session-log.md` → append **«Цикл 3 — off-route sim fix»**

---

## TL;DR — что делать прямо сейчас

1. Прочитать `regression/reports/2026-07-12/summary.md` и `regression/state/current.json`.
2. **P0:** починить регрессию **`false_reroute`** в `js/offroute.js` (коммит `8c9e32f` сломал sim `on_route`).
3. **P0:** прогнать smoke sim → полный sim 116×3 → `rebuild-sim-summary` → `report` → `state`.
4. **P1:** сверить с полевой телеметрией `fixtures/field/telemetry_2026-07-13_07-09.jsonl` (reroute на реальном съезде **должен** остаться).
5. **GH burn — STOP** (`count=387/500`, до 440 осталось ~53). Новые GH **не тратить**, пока sim gate не зелёный.

---

## Контекст (почему эта задача)

| Источник | Sim | Главная причина fail |
|----------|-----|----------------------|
| `8c9e32f` report 2026-07-12 | **262/348 (75%)** | **~78× `on_route` + `false_reroute`** |
| rebuild до fix (`e9bee84`) | 334/348 (96%) | 14 fail (snap / deviation) |
| Поле 13.07 `07-09.jsonl` | — | 6 reroute по `snap_lost` — **корректно на съезде** |

**Диагноз:** быстрый триггер `snap_lost` + смягчение `canTriggerReroute` в `offroute.js` дают **ложный reroute на маршруте** в sim (`false_reroute_max: 0` в `regression/config/thresholds.json`).

**Цель fix:** на `on_route` sim — **0 reroute**; на `deviation` sim и в поле — reroute при подтверждённом съезде.

---

## P0 — правка off-route (гипотезы, проверить по коду)

Файлы: `js/offroute.js`, `js/hud.js`, `regression/playwright/lib/assertions-shared.mjs` (только читать).

| # | Изменение | Зачем |
|---|-----------|--------|
| 1 | **`snap_lost` reroute** — только если уже `SUSPECT` **и** `lateral >= OFF_ROUTE_ENTER_M` **и** (heading diverged **или** `suspectDistM >= 40`) | убрать reroute от краткого LOST на линии |
| 2 | **Не reroute** при `lateral < OFF_ROUTE_EXIT_M` после recalc (уже есть — проверить) | |
| 3 | **`tryReturnOnRoute`** — не сбрасывать в ON_ROUTE при LOST + lateral > EXIT (уже есть — проверить) | |
| 4 | Опционально: **`offConfirmed`** для `canTriggerReroute` — lateral ≥ ENTER, но **не** триггерить без heading/time/dist если snap ещё GOOD и lateral < 80 | баланс field vs sim |

**Не ломать поле:** после правки сравнить replay `fixtures/field/telemetry_2026-07-13_07-09.jsonl` в sim (если есть harness) или ручной чек nav subs: `reroute` на ~138s, 1953s… должны сохраниться.

```bash
npm run build
```

---

## P0 — verification loop (без вопросов)

```bash
cd C:\Users\Илья\Documents\jul26\moto-hud
npm run build
```

### Smoke (быстро, ~10 fixture × 3 mode)

```bash
node regression/scripts/run-sim.mjs --fixtures 10 --modes on_route,deviation,noise_stress
```

Ожидание smoke: **0 `false_reroute`** на `on_route`.

### Полный sim (116 fixtures)

```bash
node regression/scripts/run-sim.mjs --date 2026-07-13
npm run regression:rebuild-sim-summary -- --date 2026-07-13
npm run regression:report -- --date 2026-07-13
npm run regression:state
node scripts/regression-results-manifest.mjs
```

### Критерии успеха P0

| Gate | Было (`8c9e32f`) | Цель |
|------|------------------|------|
| Sim `on_route` false_reroute | ~78 fail | **0 fail** |
| Sim total | 262/348 | **≥ 330/348** (не хуже pre-fix) |
| deviation `off_route_trigger` | 2 fail | **≤ 8** (не регресснуть vs e9bee84) |

Append в `regression/results/2026-07-13/session-log.md` (создать если нет):

- commit hash после fix
- sim pass/fail по режимам
- список оставшихся fail (если есть)
- ссылка на field fixture check

---

## P1 — если P0 закрыт (остаток ночи)

1. **Оставшиеся sim fail** (не false_reroute): `019f1539` p95, `0f6d2613`/`9b63130e`/`bd7a87a4`/`cfd81eec` good_snap — точечный разбор в sim UI:
   ```
   sim.html?mode=regression&regressionDate=2026-07-13&fixture=<id>&runMode=on_route
   ```
2. **Consensus** (71 fail) — **не блокирует** P0; только log top-10 p95 из report, без массового GH/ORS.
3. **GH:** если `count < 440` и sim gate PASS — можно добить burn **≤ 10 req** (1 batch generate), иначе **skip**.

---

## Запрещено / defer

| Действие | Причина |
|----------|---------|
| Массовый `regression:generate` + GH fetch | квота 387/500, приоритет sim |
| Yandex web fetch | blocked policy |
| Ослаблять `false_reroute_max` в thresholds | маскирует баг |
| `--skip-sim` в финале | нужен sim gate |

---

## Решения без эскалации

| Ситуация | Действие |
|----------|----------|
| smoke still false_reroute | итерация offroute.js, повтор smoke |
| deviation off_route_trigger fail | проверить sim track lateral, не ослаблять порог без field check |
| sim < 330/348 после fix | зафиксировать delta vs summary 2026-07-12, продолжить точечный разбор |
| CI consensus FAIL | log only, не блокирует handoff complete |
| GH 429 | sleep 60s, 1 retry, иначе stop GH |

---

## Артефакты (обновить)

```
js/offroute.js                    ← главная правка
regression/results/2026-07-13/sim-summary.json
regression/reports/2026-07-13/summary.md
regression/state/current.json
regression/results/2026-07-13/session-log.md
fixtures/field/telemetry_2026-07-13_07-09.jsonl   ← эталон поля (read-only)
```

---

## Справка: поле 13.07 (не регресснуть)

`fixtures/field/telemetry_2026-07-13_07-09.jsonl` — 36.7 min, ~21 km, build `mrhp4bs9`:

- 6× `reroute` с trigger `snap_lost` на реальных съездах (~138s, 1953s…)
- 0× `reroute_failed`
- Последний reroute ~2125s без `ON_ROUTE` до СТОП — отдельный edge (не приоритет P0)

---

## Команды (копипаст)

```bash
npm run build
node regression/scripts/run-sim.mjs --fixtures 10 --modes on_route,deviation,noise_stress
node regression/scripts/run-sim.mjs --date 2026-07-13
npm run regression:rebuild-sim-summary -- --date 2026-07-13
npm run regression:report -- --date 2026-07-13
npm run regression:state
node scripts/regression-results-manifest.mjs
node scripts/analyze-telemetry-full.mjs fixtures/field/telemetry_2026-07-13_07-09.jsonl
```

---

## Stop condition для агента

**DONE** когда:

1. Sim gate: `false_reroute` fail count = **0** на `on_route`, и  
2. `sim_gate_pass: true` в `current.json` **ИЛИ** total pass **≥ 330/348** с перечислением оставшихся fail в session-log, и  
3. `npm run build` OK.

После DONE — commit с message `fix(offroute): …` (один коммит на fix + артефакты sim **не** коммитить unless repo convention says so — **артефакты results/** обычно коммитятся в этом проекте).
