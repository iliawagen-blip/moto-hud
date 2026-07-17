# Handoff: Nightly — RUSSIA TOUR (польза по регионам)

> **Режим:** без вопросов пользователю до закрытия gates или явного stop  
> **Проект:** `C:\Users\Илья\Documents\jul26\moto-hud`  
> **Handoff:** 2026-07-17 (вечер) → продолжать в следующие сессии  
> **Фокус:** кататься по корпусу России, ловить регрессии (false_reroute / snap / interchange), приносить пользу Dev  
> **Лог:** `regression/results/YYYY-MM-DD/session-log.md`  
> **HEAD ожидаемый:** `39d8cbe`+ (interchange + field fixes на main)

---

## TL;DR

Москва/развязки **закрыты** (2026-07-17: 25/26 on_route, false_reroute=0).  
Дальше — **тур по России** ногами `nw → m4 → volga → siberia → south`, потом полный sim если успеешь.

1. `npm run build` + `npm run interchange:test` (smoke, не ломать)
2. **P0:** по одной ноге `on_route` через `npm run regression:sim:russia -- --leg <id> …`
3. **P0:** на каждой ноге — pass ≥ 90%, `false_reroute` ≤ 1; fails → session-log + HANDOFF-TO-DEV
4. **P1:** полный корпус `npm run regression:sim -- --date … --force --mode on_route` (≥ 330/348 если 3 режима / или ≥ 90% on_route)
5. GH burn — **defer**

---

## Архив: Москва DONE

| Gate | Результат |
|------|-----------|
| interchange-test | OK |
| moscow on_route | **25/26 (96%)**, false_reroute **0** |
| fail | `019f1539` p95_lateral (P2) |

Не перегонять Москву без причины. Точечно: `npm run regression:sim:moscow -- --mode on_route` только если трогали nav/offroute.

---

## Ноги тура (excl. moscow)

| Leg | Регионы | ~fx | Что полезного ловим |
|-----|---------|-----|---------------------|
| `nw` | `spb_center`, `spb_suburbs`, `m11_neva` | 18 | город + скоростная, съезды М-11 |
| `m4` | `m4_don_*` | 18 | длинные шоссе, lateral drift |
| `volga` | `kazan`, `yekaterinburg` | 18 | другие города / snap |
| `siberia` | `novosibirsk` | 5 | быстрый smoke дальнего региона |
| `south` | `krasnodar`, `sochi_adler`, `caucasus_serpentines` | 31 | серпантин, много маневров |

Список: `npm run regression:sim:russia -- --list`

### Порядок сессии

1. `nw` → 2. `m4` → 3. `volga` → 4. `siberia` → 5. `south`  
Необязательно всё за одну ночь: **закрыл ногу → записали → следующая**.  
`--leg all` — подряд (долго); предпочтительно по одной.

### Команды

```bash
cd C:\Users\Илья\Documents\jul26\moto-hud
npm run build
npm run interchange:test

# Нога (пример — СЗ):
npm run regression:sim:russia -- --leg nw --date 2026-07-17 --force --mode on_route

# Следующие:
npm run regression:sim:russia -- --leg m4 --date 2026-07-17 --force --mode on_route
npm run regression:sim:russia -- --leg volga --date 2026-07-17 --force --mode on_route
npm run regression:sim:russia -- --leg siberia --date 2026-07-17 --force --mode on_route
npm run regression:sim:russia -- --leg south --date 2026-07-17 --force --mode on_route

# После ноги / в конце сессии:
npm run regression:rebuild-sim-summary -- --date 2026-07-17
npm run regression:report -- --date 2026-07-17
npm run regression:state
```

Дата: сегодняшняя сессия или новая `YYYY-MM-DD` — главное **одна дата на session-log**.

---

## Критерии успеха (на ногу)

| Gate | Цель |
|------|------|
| `interchange:test` | OK (в начале сессии) |
| Leg on_route pass | **≥ 90%** |
| `false_reroute` | **≤ 1** на ногу |
| Польза Dev | каждый fail с причиной в session-log; если новый класс бага → блок в `HANDOFF-TO-DEV.md` |

Полный sim (P1): не хуже baseline **343/348** (2026-07-15) / false_reroute on_route ≤ 1.

---

## Что смотреть в fail (польза)

1. **false_reroute** — регресс offroute? сравнить с Moscow gate; не ослаблять пороги
2. **good_snap / p95_lateral** — известный P2, не блокер тура; копить id
3. **Серпантин / south** — флап маневров, «ПРЯМО» на съезде → interchange / path_diverge
4. **М-4 / М-11** — thrash reroute на прямой; backoff / HOLD

Код продукта **не трогать**, пока нет явного P0 (массовый false_reroute или crash). Тогда минимальный fix + smoke ноги + HANDOFF-TO-DEV.

---

## Запрещено

- Ослаблять `false_reroute_max` / sim gates «чтобы проехало»
- GH burn
- Откатывать interchange / `__REGRESSION_SIM__` lateral gate без полевого контрпримера
- Трогать темы / finish-info / UI ради метрик

---

## Stop / DONE (сессия)

1. Хотя бы **одна новая нога** прогнана и задокументирована  
2. session-log: таблица leg → pass/fail / false_reroute  
3. `HANDOFF-TO-DEV.md` — краткий статус тура (+ блокеры если есть)  
4. report/state если гоняли много fx  

**ready to push** — только если правили код и gates зелёные (как обычно).
