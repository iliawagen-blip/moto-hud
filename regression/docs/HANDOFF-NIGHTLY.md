# Handoff: Nightly regression agent — AUTONOMOUS GH BURN

> **Режим:** без вопросов пользователю до `graphhopper-counter.count >= 440`  
> **Проект:** `C:\Users\Илья\Documents\jul26\moto-hud`  
> **Handoff:** 2026-07-11T16:46 UTC (sync артеfactов)  
> **Лог:** `regression/results/2026-07-11/session-log.md`

---

## TL;DR — что делать прямо сейчас

1. Прочитать `regression/state/current.json` → `api_counters.graphhopper.remaining_to_burn` (**388** на старт).
2. **Цикл GH burn** (ниже) пока `count < 440` — **не спрашивать пользователя**.
3. Каждые **50 GH** или **30 мин** — append checkpoint в session-log.
4. При `count >= 440` — `regression:metrics`, `regression:report`, `regression:state`, `regression:rebuild-sim-summary`, manifest, финальный session-log.
5. **Sim не гонять** в этом режиме (слишком долго); только references.

---

## Состояние после sync (2026-07-11)

| Метрика | Значение |
|---------|----------|
| Fixtures valid | **39** |
| Full coverage (MH+GH+ORS) | **33/39 (85%)** |
| GH counter | **62/500** (осталось до stop: **388**) |
| ORS counter (state) | 0 _(счётчик слабый — ориентир: лог fetch)_ |
| **Sim gate (merged)** | **44/45** — fail `bd7a87a4` on_route (snap **0.583**) |
| **Smoke sim (10×3)** | **30/30 PASS** _(9b63130e закрыт re-run 0.750)_ |
| **Consensus gate** | **21 fail / 39** — ожидаемо после expansion |
| refs_agree | **21%** |
| median p95 vs consensus | **182 m** (было ~1267 m на smoke — новые fx тянут вниз) |

### Единственный sim fail (corpus)

| Fixture | mode | good_snap | p95 | Примечание |
|---------|------|-----------|-----|------------|
| `bd7a87a4` | on_route | **0.583** | 36.6 m | не borderline — `recovered_good=false` |

### Data gaps (не чинить ORS в burn-режиме)

- `eb1e26e7` — ORS permanent gap (GH ok)
- `089c5f22` — router_diff GH↔ORS

---

## AUTONOMOUS LOOP — GH burn до 440

```bash
cd C:\Users\Илья\Documents\jul26\moto-hud
```

### Перед циклом (один раз)

```bash
type regression\cache\graphhopper-counter.json
npm run build
```

### Итерация (повторять без паузы на вопросы)

```bash
# 0. STOP?
#    если count >= 440 → выйти в финализацию

# 1. Генерация (бесплатно по API GH)
npm run regression:generate -- --count 10 --seed <NEXT_SEED>
# NEXT_SEED: 20260711d, e, f… или timestamp

# 2. Motohud (OSRM — delay 2s, не параллелить)
npm run regression:fetch:motohud

# 3. GraphHopper — ТРАТИТ КВОТУ
npm run regression:fetch:gh

# 4. ORS (пока лимит 2000 — fetch для всех без cache)
npm run regression:fetch:ors

# 5. Metrics (локально, без API)
npm run regression:metrics

# 6. Checkpoint
# append session-log: GH count, fixtures valid, batch seed
```

**Правила:**

| Правило | Деталь |
|---------|--------|
| **Stop** | `graphhopper-counter.json` → `count >= 440` |
| **Hard stop** | HTTP 429 GH после retry → checkpoint, sleep 60s, retry 1×; если снова — стоп с логом |
| **Skip sim** | `--skip-sim` всегда в burn-режиме |
| **Не тратить GH** | `--force` на уже закэшированных без `--id` |
| **4xx waypoints** | fixture `invalid` / skip ORS — не зацикливаться |
| **Corrupt fixture** | удалить 0-byte JSON, записать в log |
| **Yandex web** | **ЗАПРЕЩЕНО** |

### Оценка итерации

~10 fixtures × 1 GH = **10–12 req/iter** (retry) → **~35 iter** до 440 → **~350 новых fixtures** (целевой corpus **~390**).

---

## Финализация (после stop)

```bash
npm run regression:metrics
npm run regression:rebuild-sim-summary -- --date 2026-07-11
npm run regression:report -- --date 2026-07-11 || true
npm run regression:state
node scripts/regression-results-manifest.mjs
```

Append session-log блок **«mode: GH-BURN complete»**:

- GH: 62 → N/500
- Fixtures: 39 → M
- Full coverage: 33/M
- Consensus fail count
- **Не** ожидать CI gate PASS (consensus долг)

---

## Решения без эскалации (не спрашивать)

| Ситуация | Действие |
|----------|----------|
| `bd7a87a4` sim fail | **defer** — не блокирует burn; investigation после burn |
| `9b63130e` borderline | **closed** — smoke 30/30 |
| Consensus fail | **ignore** для gate в burn-режиме |
| ORS fail на новом fx | metrics `insufficient_refs`, продолжать |
| GH ECONNRESET | retry 2×, иначе skip fixture, продолжить |
| OSRM 429 | sleep 5s, продолжить |
| generate < 10/10 | log failed categories, следующий seed |

---

## Команды

```bash
npm run regression:generate -- --count 10 --seed 20260711d
npm run regression:fetch:motohud
npm run regression:fetch:gh
npm run regression:fetch:ors
npm run regression:metrics
npm run regression:rebuild-sim-summary -- --date 2026-07-11
npm run regression:report -- --date 2026-07-11
npm run regression:state
```

---

## Артефакты (обновлять)

```
regression/cache/graphhopper-counter.json   ← главный стоп-критерий
regression/fixtures/auto/*.json
regression/state/current.json
regression/results/2026-07-11/session-log.md
regression/reports/2026-07-11/summary.md
regression/results/2026-07-11/sim-summary.json
```

---

## После reset GH (следующая сессия)

1. sim on_route на накопленном corpus (batch по 25)
2. `bd7a87a4` investigation / product fix
3. trend report vs 2026-07-11
