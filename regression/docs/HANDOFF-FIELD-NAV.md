# Handoff: полевая навигация + OSM-снапшоты (июль 2026)

> **Закреплено:** 2026-07-24  
> **Зачем:** контекст после чистки Cursor `state.vscdb` / новой сессии  
> **HEAD на момент записи:** `b9fd74e` (после rebase на `main`)  
> **Полевые билды:** `mrsx6bbe` → `mrw5n2zz` → `mrxdc34t` / `mrxdbdao`

Связанные docs: `INTERCHANGE-CORPUS-V1.md`, `HANDOFF-TO-DEV.md`, `HANDOFF-NIGHTLY.md`,  
каталог регионов: `data/osm-regions.json`, слои: `data/regions/{id}/`.

---

## TL;DR

| Тема | Статус |
|------|--------|
| Hybrid path_diverge (геометрия + слабый OSRM) | ✅ hint-first + мягкие пороги с hint; probe `path_diverge_probe` (раньше =0 из‑за MIN_TURN 20° vs slight&lt;18°) |
| Кэш камер маршрута (`CAM*`) | ✅ |
| Снапшоты OSM по регионам (камеры/fuel/urban/signals/highways) | ✅ + weekly Actions |
| `russia_motorways` (~151k ways) | ✅ в repo; **не грузить** в городе |
| Sticky LOST при lat≈40 / junk-GPS SUSPECT | ✅ фиксы `e21b292` |
| Фильтр камер по polyline (не sample 600 м) | ✅ `b9fd74e` |
| Live красный/зелёный светофоров | ❌ неоткуда; только точки OSM |
| Официальные камеры ГИБДД / data.mos.ru | ❌ ещё нет (OSM слабо на юге Москвы) |

---

## Что зашито в код (хронология)

| Commit | Суть |
|--------|------|
| `096de63` | hybrid path_diverge + localStorage кэш камер |
| `80e3078` | weekly Moscow cameras snapshot |
| `0f11cca` | Moscow highways/maxspeed `.json.gz` |
| `1b1010e` | multi-region: moscow / mkad_plus / moscow_oblast / spb + urban/fuel/signals |
| `f075cf3` | Russia motorways dump |
| `e21b292` | skip city motorways; junk-GPS offroute; LOST score ≥55 м lateral |
| `b9fd74e` | camera filter = dist to route polyline; Overpass если коридор пуст |

### Runtime-контракт снапшотов

1. `data/osm-regions.json` → регионы и layers.  
2. Маршрут ∩ bbox → `loadMergedLayer` / `loadCamerasSnapshotForRoute` / `loadHighwaysSnapshotForRoute`.  
3. Городской arterial (`moscow` / `mkad_plus` / `spb` + ≥200 ways) → **без** `russia_motorways`.  
4. Камеры: фильтр **polyline + 150 м**; если 0 → Overpass corridor; abort → keep/cache (`CAM*`).  
5. Urban place: радиус по типу (city≈18 км … hamlet≈500 м) без live Overpass.  
6. `traffic_signals` → `geom.osmSignals` + `crossing.hasSignal` (не RGB).

### CI

| Workflow | Когда |
|----------|--------|
| `.github/workflows/osm-snapshots.yml` | ср + manual (small / moscow-highways / spb-highways / russia-motorways) |
| `.github/workflows/regression-osrm-refresh.yml` | чт — fixtures metadata (`regression/cache/` в gitignore) |
| legacy cameras/highways workflows | только `workflow_dispatch` |

npm: `osm:snapshot`, `osm:snapshot:small`, `osm:snapshot:motorways`, `cameras:snapshot`, `highways:snapshot`.

---

## Полевые сессии (телеметрия Telegram Desktop)

Анализатор: `node scripts/analyze-telemetry-full.mjs <file.jsonl>`.

### 2026-07-20 … 07-21 (до/после ранних снапшотов)

- Снапшоты заработали: `mode: snapshot`, known_pct→100%, signals attached.  
- Боль: load `russia_motorways` 7–35 с на городском маршруте → пофикшено `e21b292`.

### 2026-07-22 / 07-23 утро (`mrw5n2zz`)

| Файл | Вердикт |
|------|---------|
| `…_22_17-10` | junk GPS, LOST 57%, **0 reroute** (gate ок) |
| `…_23_07-07` | **хороший** заезд (GOOD~, lat p50≈2.8); камеры count 0→1 — **баг фильтра sample** |
| `…_23_07-51` | коротко ок; 1× lateral_time |

Пользователь: «утром всё неплохо, камер не видел» → корень: filter по точкам шаг 600 м выкидывал камеру в ~14 м от трека; почти весь заезд `cameras_loaded count=0`.

### 2026-07-23 вечер / 07-24 утро (`mrxdc34t`, после polyline-fix)

| Файл | GOOD/LOST | Камеры | Reroute | Вердикт |
|------|-----------|--------|---------|---------|
| `…_23_17-21` | 20%/58% | 3→1 | 2 | junk GPS вечер |
| `…_23_17-56` | **96%/2%** | 2 | 2 | эталон длинный вечер (~61 мин) |
| `…_24_07-14` | **92%/1%** | **13→3** | 3 | эталон утро; камеры видны |
| `…_24_07-49` | 57%/39% | keep 1 | 1 | LOST lat≈472 (реальный уход), Overpass abort |

Паттерны:

- `cameras_snapshot_empty_corridor` → Overpass `signal is aborted` → **kept** старый список.  
- Highways: `regions: ["moscow"]`, load 100–300 ms, match часто 100%.  
- `path_diverge` во всех свежих = **0**.  
- Вечерний junk: acc p50≫30, lat сотни метров; SUSPECT иногда у порога `OFF_ROUTE_LATERAL_JUNK_M=280`.
- HUD при junk+LOST: «GPS ШУМНЫЙ / ДЕРЖУ КУРС» + стрелка к snap (не «НЕТ ПРИВЯЗКИ»).

---

## Открытые хвосты (не сделано)

1. **SPb highways** snapshot — layer в каталоге есть, полного dump в repo может не быть (manual Actions `spb-highways`).  
2. **Официальные камеры** (ФВФ ГИБДД / data.mos.ru) — OSM на ряде коридоров пуст.  
3. ~~**Overpass abort** после empty corridor~~ — при keep&gt;0: probe ≤7 с / 2 batch; иначе budget 28 с.  
4. ~~**LOST при lat≫100**~~ — `return_reseed` + forceWide при выходе из LOST / возврате после peak≥80.  
5. **MASTERPLAN.md** (ревизия 2026-07-05) не отражает снапшоты/hybrid — обновить при случае.  
6. Продуктовый план дальше: OEM GPS matrix + Play closed testing → audio focus → офлайн роутер/PMTiles (Фазы 2–4 MASTERPLAN).  
7. Поле: проверить `path_diverge_probe` / `path_diverge`, junk UX «GPS ШУМНЫЙ», `return_reseed`, `route_low_bearing`.

---

## Как продолжить в новой сессии

```text
1. Прочитать этот файл + data/osm-regions.json
2. Поле: node scripts/analyze-telemetry-full.mjs <jsonl>
3. Сим: npm run build; sim sync rule (.cursor/rules/sim-sync.mdc)
4. Не грузить russia_motorways на moscow/spb arterial — инвариант e21b292
5. Камеры: фильтр = polyline (cameras-snapshot.js), не sample-only
```

Телеметрии пользователя лежат вне repo (`Downloads/Telegram Desktop/telemetry_*.jsonl`) — в git не копировать без запроса.
