# Handoff: Nightly — P2 dig + Russia rest + interchange corpus sketch

> **Режим:** без вопросов пользователю до закрытия gates или явного stop  
> **Проект:** `C:\Users\Илья\Documents\jul26\moto-hud`  
> **Handoff:** 2026-07-18 (вечер)  
> **Фокус:** польза Dev — разобрать fr на `019f1539`, добить ноги тура после `1613e94`, набросать корпус развязок (не 350 узлов)  
> **HEAD:** `e68b359`+ / post-Varshavka **PASS** уже в архиве  
> **Лог:** `regression/results/2026-07-18/session-p2.md` (или новая дата `2026-07-19`)

---

## TL;DR

Post-Varshavka закрыт (342/348, fr=1). Не бездельничать — три трека:

1. **P0:** точечный разбор `019f1539` on_route — почему появился **false_reroute=1** (на moscow-only утром fr=0, на full — fr=1)
2. **P0:** оставшиеся ноги Russia после `1613e94`: `m4` + `volga` + `siberia` (on_route)
3. **P1:** sketch **interchange corpus v1** — не гонять 350 развязок; выбрать **8–15** представительных классов и описать в markdown (+ список fixture id / пробелы)
4. GH burn — **defer**
5. Код продукта **не трогать**, пока нет явного P0 (массовый fr). Фиксы — только минимальные + HANDOFF-TO-DEV

---

## 1) P0 — `019f1539` false_reroute

```bash
cd C:\Users\Илья\Documents\jul26\moto-hud
git pull && npm run build
node regression/scripts/run-sim.mjs --date 2026-07-18 --force --mode on_route --id 019f1539
# при необходимости ×2–3 для стабильности fr
```

В `session-p2.md` зафиксировать:

| Вопрос | Ответ |
|--------|--------|
| Сколько reroute / trigger? | |
| first_off_route t / lateral / snap_q | |
| fr стабилен или флак? | |
| vs 2026-07-15 / 17 (только p95)? | |
| Связь с `1613e94`? (да/нет/неясно) | |

Артефакты: sim json/log для этого id. **Не** ослаблять `false_reroute_max`.

---

## 2) P0 — Russia rest (после Varshavka)

Москва / nw / south уже OK 18.07. Добить:

```bash
npm run regression:sim:russia -- --leg m4 --date 2026-07-18 --force --mode on_route
npm run regression:sim:russia -- --leg volga --date 2026-07-18 --force --mode on_route
npm run regression:sim:russia -- --leg siberia --date 2026-07-18 --force --mode on_route

npm run regression:rebuild-sim-summary -- --date 2026-07-18
npm run regression:report -- --date 2026-07-18
npm run regression:state
```

| Gate | Цель |
|------|------|
| каждая нога | ≥ 90%, fr ≤ 1 |
| volga | вчера 89% snap — ждать ≥90% или снова P2 snap-only |

---

## 3) P1 — Interchange corpus v1 (sketch, не полный перебор МКАД)

**Не** ставить цель «350 развязок × все съезды».  
Сделать документ: `regression/docs/INTERCHANGE-CORPUS-V1.md`

### Классы (по 1–2 кейса на класс)

| # | Класс | Зачем |
|---|--------|--------|
| 1 | МКАД / магистраль **прямо** (нет голоса Съезд) | анти-Варшавка |
| 2 | Реальный **off ramp** right/left ≥18° | не потерять съезд после порога |
| 3 | Fork keep L/R | «держитесь» |
| 4 | Клевер / многоуровневая | path_diverge vs OSRM |
| 5 | Roundabout на развязке | уже есть fixtures |
| 6 | Серпантин / south | много маневров, не спам |
| 7 | On-ramp въезд | |
| 8 | Slight &lt;18° в кэше OSRM | должен фильтроваться |

Для каждого класса в доке:

- существующий `fixture_id` **или** `GAP` (нужны waypoints)
- ожидаемое: HUD/голос (`Съезд` / `ПРЯМО` / `держитесь`)
- как Nightly проверяет сегодня: sim on_route / unit / только поле

Опционально: пройтись по `regression/cache/motohud/*.json` (если есть) и посчитать, сколько `off ramp`+`slight` с \|ang\|&lt;18 — таблица в тот же md. **Без** массовой генерации 350 GPX.

---

## Критерии DONE сессии

1. `019f1539` разобран (таблица + вывод: флак / регресс / старый P2)  
2. m4 + volga + siberia прогнаны и в session-log  
3. `INTERCHANGE-CORPUS-V1.md` создан (хотя бы классы + что уже покрыто fixtures)  
4. Апдейт `HANDOFF-TO-DEV.md`

---

## Запрещено

- Ослаблять sim gates / false_reroute  
- Откатывать `1613e94`  
- GH burn  
- Генерировать сотни фикстур «все развязки Москвы»  
- Трогать UI/темы

**ready to push** — docs/results OK; код — только если чинили P0 и gates зелёные.
