# Interchange corpus v1 (sketch)

> **Дата:** 2026-07-18  
> **Цель:** 8–15 представительных классов, не 350 развязок МКАД  
> **Не делать:** массовая генерация GPX / полный перебор съездов

---

## Как проверяем сегодня

| Канал | Что покрывает |
|-------|----------------|
| `npm run interchange:test` | unit: slight ramp ≥18° = «Съезд»; &lt;18° / gentle arc — не значимы; path_diverge |
| `regression:sim:moscow` on_route | mkad / center / outer — pass% + false_reroute |
| `regression:sim:russia --leg south` | sochi / caucasus — много маневров |
| Поле (Варшавка) | ложный «Съезд» на slight — `1613e94` |

Sim **не** ассертит текст голоса / path_diverge в tick JSONL — только lateral / snap / false_reroute. Голос развязок → unit + поле.

---

## Классы (v1)

| # | Класс | Fixture(s) | Ожидание HUD/голос | Проверка |
|---|--------|------------|--------------------|----------|
| 1 | МКАД / магистраль **прямо** (анти-Варшавка) | `8162bbfd` mkad many_waypoints; `d195dc03` / `d5ad1146` mkad; highway `1a514758` m11 | нет спама «Съезд» на slight &lt;18° | unit slight 10°; поле; sim on_route (косвенно fr/snap) |
| 2 | Реальный **off ramp** ≥18° | **GAP** dedicated sim-assert; cache: 9× `off ramp slight` с \|ang\|≥18 среди 81 slight-off | «Съезд направо/налево» | unit ramp 22°; **нужен** 1–2 fixture с явной рампой ≥18° |
| 3 | Fork keep L/R | **GAP** labeled; forks в cache много (378) | «держитесь …» / keep | unit fork tiny 6° = not significant; sim — GAP |
| 4 | Клевер / многоуровневая | **GAP** explicit clover tag; proxy: `8162bbfd` / `c3ba91fb` moscow many_waypoints | path_diverge vs OSRM keep L/R | unit path_diverge; sim — только on_route health |
| 5 | Roundabout на развязке | `37920e54` moscow_center; `9cc6b59f` `a6f82017` `bea66c2f`; mkad/spb tags `roundabouts` | кольцо без ложного съезда | moscow/nw sim on_route (pass на 17–18.07) |
| 6 | Серпантин / south | `137f5e6b` `491d8990` caucasus; `0f6d2613` sochi (snap P2); `8612e160` many_wp | много маневров, без voice spam | `leg south` on_route |
| 7 | On-ramp въезд | **GAP** (в cache type чаще `off ramp`; on-ramp не размечен) | въезд без ложного «Съезд» на дуге | unit gentle arc; **нужен** fixture |
| 8 | Slight &lt;18° в OSRM | cache stats ниже; example steps на `019f1539` (ang 8°, 3°) | фильтр → не «Съезд» | unit 10°; `1613e94` поле |

**Итого labeled fixtures:** ~10 id выше + GAP на 2/3/4/7 для целевых waypoints.

---

## Cache stats (motohud, 117 routes / 5870 steps)

| Метрика | N |
|---------|---|
| `off ramp` (+ramp) | 84 |
| `fork` | 378 |
| `slight` (любой type) | 1072 |
| `off ramp` + `slight` | 81 |
| из них \|ang\| **&lt;18°** | **72** |
| из них \|ang\| **≥18°** | **9** |
| `fork` + `slight` \|ang\|&lt;18° | 288 |

Вывод: в корпусе **много** slight-off &lt;18° (анти-Варшавка важна); «жёстких» slight-off ≥18° мало (9) — для класса 2 лучше точечно выбрать 1–2 из этих 9 и пометить в fixtures (не генерить 350).

---

## Предлагаемый минимальный набор (12 слотов)

1. `8162bbfd` — mkad straight / many wp  
2. `d195dc03` — mkad  
3. `37920e54` — moscow roundabout  
4. `c3ba91fb` — moscow many_waypoints  
5. `1a514758` — m11 highway  
6. `137f5e6b` — caucasus serpentine  
7. `491d8990` — caucasus  
8. `8612e160` — caucasus many_wp  
9. GAP — off ramp ≥18° (взять из 9 cache hits, оформить tag)  
10. GAP — fork keep L/R  
11. GAP — on-ramp  
12. unit-only — slight &lt;18° (`interchange-test`)

---

## Next (не в этой сессии)

- Проставить tags `interchange_class=…` на выбранные fixtures  
- Один sim smoke на tagged set (не полный МКАД)  
- Не ослаблять false_reroute / не откатывать `1613e94`
