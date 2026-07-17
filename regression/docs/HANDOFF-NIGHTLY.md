# Handoff: Nightly — MOSCOW INTERCHANGES (развязки)

> **Режим:** без вопросов пользователю до закрытия gates или явного stop  
> **Проект:** `C:\Users\Илья\Documents\jul26\moto-hud`  
> **Handoff:** 2026-07-17  
> **Фокус:** съезды / path-diverge / голос «Съезд» на МКАД и московских развязках  
> **Лог:** `regression/results/2026-07-17/session-log.md` (создать/дописать)

---

## TL;DR

1. `npm run build` + `node scripts/interchange-test.mjs`
2. **P0:** sim по московским фикстурам (`mkad_ring` + `moscow_center` + `moscow_outer`, **27 шт.**) — режимы `on_route` (+ `deviation` если успеешь)
3. **P0:** нет массового `false_reroute`; смотреть телеметрию `path_diverge` / `maneuver_announced` с `interchange:true`
4. **P1:** если есть полевые JSONL после выезда — проверить, что на съезде не «ПРЯМО»
5. GH burn — **defer**

---

## Что задеплоено в коде (не откатывать без причины)

| Модуль | Суть |
|--------|------|
| `js/interchange.js` | ramp/fork семантика, path-diverge, синтетический съезд |
| `js/maneuver-filter.js` | off/on ramp всегда значимы; не collapse |
| `js/route.js` `findNextManeuver` | окно 800 м → diverge → soft → далёкие |
| `js/voice.js` / `hud.js` / `render.js` | «Съезд направо», баннер СЪЕЗД, стрелка ±38° |
| Ранний голос | far 800–1200 м на interchange |

---

## Московский корпус (27 fixtures)

Регионы: `mkad_ring` (8), `moscow_center` (13), `moscow_outer` (6).

```bash
# Список id:
node -e "const fs=require('fs');const d='regression/fixtures/auto';for(const f of fs.readdirSync(d)){const j=JSON.parse(fs.readFileSync(d+'/'+f,'utf8'));if(['mkad_ring','moscow_center','moscow_outer'].includes(j.region)) console.log(j.fixture_id.slice(0,8), j.region, j.category)}"
```

Приоритет категорий: **roundabouts** → **many_waypoints** (развязки/съезды) → city.

### Команды

```bash
cd C:\Users\Илья\Documents\jul26\moto-hud
npm run build
node scripts/interchange-test.mjs

# Московский корпус 27× (on_route; или без --mode = 3 режима):
npm run regression:sim:moscow -- --date 2026-07-17 --force --mode on_route

# Точечно:
node regression/scripts/run-sim.mjs --date 2026-07-17 --force --mode on_route --id 019f1539
node regression/scripts/run-sim.mjs --date 2026-07-17 --force --mode on_route --id 37920e54

# После прогона:
npm run regression:rebuild-sim-summary -- --date 2026-07-17
npm run regression:report -- --date 2026-07-17
npm run regression:state
```

В session-log — pass/fail по moscow/mkad.

---

## Критерии успеха

| Gate | Цель |
|------|------|
| `interchange-test.mjs` | OK |
| Sim moscow subset on_route | **≥ 90%** pass; false_reroute **≤ 1** |
| Full sim (если гоняли) | **≥ 330/348** (не хуже 2026-07-15) |
| Телеметрия (если смотрели sim debug) | на развязках есть `maneuver_announced` / `path_diverge`, не вечный `maneuver_none` + «ПРЯМО» |

---

## Что смотреть в fail

1. **false_reroute** на mkad — не из-за path-diverge (diverge не трогает offroute)
2. **good_snap / p95** — не блокер развязок (известный P2)
3. Если «прямо» всё ещё в UI на fixture с очевидным съездом — снять `geom.maneuvers` types (off ramp vs continue) и `detectPathDiverge` на mid-route s0

---

## Запрещено

- Ослаблять `false_reroute_max`
- Откатывать ramp-always-significant без полевого контрпримера
- GH burn
- Трогать finish-info / темы

---

## Stop / DONE

1. interchange-test OK  
2. Sim по Москве (хотя бы smoke 6–8 id + roundabouts) задокументирован  
3. session-log + при полном прогоне report/state  
4. Краткий апдейт `HANDOFF-TO-DEV.md` (статус развязок)

**ready to push** — только если gates зелёные и user просил push (как обычно).
