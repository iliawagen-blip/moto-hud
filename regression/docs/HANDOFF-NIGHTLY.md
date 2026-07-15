# Handoff: Nightly regression agent — POST-c28efbe SIM + FIELD GATE

> **Режим:** без вопросов пользователю до закрытия gates или явного stop  
> **Проект:** `C:\Users\Илья\Documents\jul26\moto-hud`  
> **Handoff:** 2026-07-15T05:44 UTC  
> **Git baseline:** `c28efbe` — `fix(nav,hud): evening off-route reroute + compact finish ETA strip` (уже на `origin/main`)  
> **Лог:** создать/дописывать `regression/results/2026-07-15/session-log.md`

---

## TL;DR — что делать прямо сейчас

1. Прочитать этот handoff + `regression/reports/2026-07-14/summary.md` + `regression/state/current.json`.
2. **P0:** `npm run build` → smoke 10 fixtures → **полный sim** `--date 2026-07-15 --force`.
3. **P0 gate:** проверить, что новые пути `lateral_time` / `lateral_hold` в `js/offroute.js` **не** вернули массовый `false_reroute` на `on_route`.
4. **P1:** полевые чеки (read-only fixtures) — утренний reroute жив, вечерний сценарий «стоянка + lateral hard» должен теперь триггерить REROUTING.
5. **GH burn — STOP / defer** (как раньше). Новые GH **не тратить**.

---

## Контекст (где мы)

| Источник | Результат |
|----------|-----------|
| Full sim `2026-07-14` @ offroute revert (`63e634e` era) | **333/348 (96%)**, `false_reroute` on_route = **1** (`c82c1a2e`) |
| Baseline `e9bee84` | 334/348 |
| Регресс `8c9e32f` | 262/348 (~78× false_reroute) — закрыт |
| Поле утро `2026-07-15_06-43` | OK: стрелки + **1× reroute** `dist_heading` |
| Поле вечер `2026-07-14_16-15` | BAD на старом билде: **0 reroute**, SUSPECT↔ON дребезг при spd≈0, ~987× `maneuver_none` |
| Коммит `c28efbe` | фикс evening: `lateral_time`/`lateral_hold`, hold return 2s, steps-fallback манёвров, compact finish-info |

**Риск ночи:** `lateral_time` может снова поднять `false_reroute` на шумном sim `on_route`. Нужен свежий полный прогон на `c28efbe+`.

---

## P0 — verification loop (без вопросов)

```bash
cd C:\Users\Илья\Documents\jul26\moto-hud
npm run build
```

### Smoke (~10 × 3)

```bash
node regression/scripts/run-sim.mjs --fixtures 10 --force --date 2026-07-15
```

Ожидание smoke:

- **`false_reroute` fail на `on_route` = 0** (или ≤1 и явно залогировать fixture)
- не разнести `deviation` (off_route_trigger не хуже, чем 2026-07-14: 8 fail)

### Полный sim (116 × 3)

```bash
node regression/scripts/run-sim.mjs --date 2026-07-15 --force
npm run regression:rebuild-sim-summary -- --date 2026-07-15
npm run regression:report -- --date 2026-07-15
npm run regression:state
node scripts/regression-results-manifest.mjs
```

### Критерии успеха P0

| Gate | Было 2026-07-14 | Цель после `c28efbe` |
|------|-----------------|----------------------|
| Sim total | 333/348 | **≥ 330/348** |
| `on_route` false_reroute fails | 1 (`c82c1a2e`) | **≤ 1** (лучше **0**) |
| Массовый false_reroute (~78) | нет | **не вернулся** |
| deviation off_route fails | 8 | **≤ 10** (не сорвать field-фикс) |

Append в `regression/results/2026-07-15/session-log.md`:

- `git rev-parse HEAD` / build-id
- smoke + full pass/fail
- таблица fail по mode/assertion
- count `false_reroute` on_route (и fixture ids)
- вывод: PASS / FAIL gate + next action

---

## P0b — если smoke/full раздуло false_reroute

**Без эскалации пользователю** — итерация `js/offroute.js`:

1. Сузить `lateral_time` / `lateral_hold`: требовать `peakLateral >= HARD` **и** текущий `lateral >= HARD`, дольше `confirmMs` (1.5–2×).
2. Не ослаблять `false_reroute_max` в thresholds.
3. Rebuild → smoke → (если smoke OK) полный sim.
4. Field invariant: уход с lateral≥80 на 8+ с в стоянии **должен** давать REROUTING (не откатывать целиком к pre-c28efbe).

Файлы: `js/offroute.js`, `js/nav-constants.js` (`OFF_ROUTE_LATERAL_HARD_M`, `OFF_ROUTE_RETURN_HOLD_MS`). Assertions — **только читать**.

---

## P1 — поле (read-only fixtures)

| Fixture | Ожидание |
|---------|----------|
| `fixtures/field/telemetry_2026-07-15_06-43.jsonl` | эталон «утро ок»: был 1× reroute — **не регресснуть логикой** (код-ревью путей `dist_heading`) |
| `fixtures/field/telemetry_2026-07-14_16-15.jsonl` | эталон бага: 0 REROUTING при SUSPECT+lateral 50–176 и spd≈0 — после fix пути `lateral_*` должны закрывать такой кейс |
| `fixtures/field/telemetry_2026-07-13_07-09.jsonl` | старый эталон съездов (6× reroute) — не ломать |

Опционально:

```bash
node scripts/analyze-telemetry-full.mjs fixtures/field/telemetry_2026-07-15_06-43.jsonl
node scripts/analyze-telemetry-full.mjs fixtures/field/telemetry_2026-07-14_16-15.jsonl
```

(если скрипта нет — сверка `nav`/`offroute_state` grep/node one-liner).

**Подложка OSM vs CARTO — не причина.** Не тратить время на тайлы/basemap.

---

## P2 — если gates зелёные и осталось время

1. Точечно `c82c1a2e` on_route false_reroute (если всё ещё 1).
2. good_snap / p95 (`019f1539`, `0f6d2613`, …) — log only, не блокер.
3. Consensus 71 fail — **не трогать**, не GH.

---

## Запрещено / defer

| Действие | Причина |
|----------|---------|
| GH `generate` / burn | defer до стабильного sim после `c28efbe` |
| Yandex web | blocked |
| Ослаблять thresholds `false_reroute_max` | маскирует регресс |
| Откат всего `c28efbe` ради sim | ломает вечернее поле; сужать trigger |
| UI chrome / finish-info redesign | уже в main; не трогать |
| Commit/push без явного запроса user | только local fix + results; **commit кода** — OK если нужен для green gate, message `fix(offroute): …`; **push** — только если user сказал push (сейчас handoff: можно commit local, push по stop/DONE с пометкой в log) |

**Уточнение push:** в этом handoff — **commit на main локально разрешён** для offroute tweaks + session-log/state/report; **`git push` только если smoke+full green и в session-log написано «ready to push»** — иначе оставить unpushed и STOP с вопросом в log (user обычно сам просит push). Практичнее: **commit + push** если gate PASS (как прошлые nightlies). Default: **commit + push** при DONE.

---

## Решения без эскалации

| Ситуация | Действие |
|----------|----------|
| smoke false_reroute ≥ 3 | P0b сужение lateral_*, повтор smoke |
| full 320–329 /348 | принять как soft-fail, перечислить fail, попытаться 1 итерация |
| full < 320 | откат только lateral_* к более жёстким порогам, не весь c28efbe |
| deviation fail > 12 | проверить track, не ослаблять; сравнить с 2026-07-14 list |
| consensus FAIL | log only |

---

## Артефакты

```
js/offroute.js / js/nav-constants.js     ← только если P0b
regression/results/2026-07-15/sim-summary.json
regression/reports/2026-07-15/summary.md
regression/state/current.json
regression/results/2026-07-15/session-log.md
fixtures/field/telemetry_2026-07-14_16-15.jsonl
fixtures/field/telemetry_2026-07-15_06-43.jsonl
```

---

## Stop condition (DONE)

1. Полный sim date **2026-07-15** завершён, report+state обновлены.  
2. `on_route` false_reroute fails **≤ 1** и **нет** массового регресса (~78).  
3. Sim total **≥ 330/348** **или** задокументирован ближайший результат + план.  
4. `session-log.md` заполнен.  
5. `npm run build` OK.

После DONE: обновить `regression/docs/HANDOFF-TO-DEV.md` кратким статусом sim 2026-07-15 (если gates не идеальны — список P2).
