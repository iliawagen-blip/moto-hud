# Спайк: офлайн-роутеры (Фаза 4 MASTERPLAN)

Критерии выбора роутера для moto-hud помимо мото-профиля и офлайн-режима.

## Сравнение

| | OSRM (сейчас) | GraphHopper | BRouter | Valhalla |
|---|---------------|-------------|---------|----------|
| **Высоты из коробки** | ❌ | ✅ `elevation=true` | ✅ в GPX/track | ✅ в ответе |
| **Alternatives** | ✅ | ✅ | ограничено | ✅ |
| **Round-trip** | ❌ | ✅ `round_trip` | ✅ loop | ✅ |
| **Moto / извилистость** | driving | custom models | **лучший для MTB/moto** | costing profiles |
| **surface / smoothness** | ❌ | custom model | **сегменты .brf** | costing |
| **Scenic / viewpoint** | ❌ | через custom | через waytypes | через costing |
| **Офлайн** | свой инстанс | JAR + OSM | `.rd5` + segments | tiles + graph |
| **Размер данных** | средний | средний | компактный | крупный |
| **Capacitor** | HTTP API | HTTP / embedded | HTTP / embedded | HTTP / embedded |
| **Публичный demo** | router.project-osrm.org | limited | brouter.de | — |

## Рекомендация для спайка

1. **Маршрут + высоты одним запросом:** GraphHopper или BRouter — меньше слоёв, чем OSRM + Terrarium/OpenTopo.
2. **Горные серпантины / мото-приоритет:** BRouter с профилем `trekking` / custom — проверить на GPX-фикстурах из `sim.html`.
3. **Round-trip «кольцо на выходные»:** GraphHopper `round_trip.distance` или BRouter loop — критерий для Фазы 5.
4. **Профили покрытия (асфальт / смешанный / бездорожье):** BRouter custom `.brf` или GH custom model с двунаправленными весами `surface`/`smoothness`.
5. **Единый стек с MapLibre (Фаза 4):** Valhalla + PMTiles — если готовы поднять инфраструктуру.

## CLI-спайк

```bash
npm run spike:routers
# или с координатами:
node scripts/spike-routers.mjs 55.757,37.616 55.7585,37.618
```

Скрипт сравнивает latency, длину и наличие elevation в ответе OSRM vs BRouter (`trekking`, `fastbike`).

## Тест-план спайка

- [ ] Один и тот же маршрут (горный GPX): OSRM vs GH vs BRouter — длина, время, polyline на карте.
- [ ] Наличие `elevation` в ответе без отдельного DEM.
- [ ] Round-trip 80–120 км — качество «кольца», время расчёта.
- [ ] Профиль «бездорожье» vs «асфальт» на одной паре точек — различие трека.
- [ ] Размер offline-pack для региона ~500×500 км.
- [ ] Latency на mid-range Android (Capacitor WebView).

## Текущая архитектура (до спайка)

```
OSRM → route.coords
       → RouteGeometry (dense, snap, Frenet)
       → OpenTopoData / Terrarium → elev[] / grade[]
       → HUD профиль + 3D-лента
```

После спайка высоты могут приходить из роутера; `elevation.js` остаётся fallback для OSRM и уточнения DEM.

## Честные ограничения

- **Пробки** — только при онлайн-планировании (OSRM/Яндекс); в офлайн-навигации пробок нет.
- **POI scenic/viewpoint** — зависят от полноты OSM по региону; для РФ возможен ручной слой в планировщике (Фаза 6).
