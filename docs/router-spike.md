# Спайк: офлайн-роутеры (Фаза 4 MASTERPLAN)

Критерии выбора роутера для moto-hud помимо мото-профиля и офлайн-режима.

## Сравнение

| | OSRM (сейчас) | GraphHopper | BRouter | Valhalla |
|---|---------------|-------------|---------|----------|
| **Высоты из коробки** | ❌ | ✅ `elevation=true` | ✅ в GPX/track | ✅ в ответе |
| **Alternatives** | ✅ | ✅ | ограничено | ✅ |
| **Moto / извилистость** | driving | custom models | **лучший для MTB/moto** | costing profiles |
| **Офлайн** | свой инстанс | JAR + OSM | `.rd5` + segments | tiles + graph |
| **Размер данных** | средний | средний | компактный | крупный |
| **Capacitor** | HTTP API | HTTP / embedded | HTTP / embedded | HTTP / embedded |
| **Публичный demo** | router.project-osrm.org | limited | brouter.de | — |

## Рекомендация для спайка

1. **Маршрут + высоты одним запросом:** GraphHopper или BRouter — меньше слоёв, чем OSRM + Terrarium/OpenTopo.
2. **Горные серпантины / мото-приоритет:** BRouter с профилем `trekking` / custom — проверить на GPX-фикстурах из `sim.html`.
3. **Единый стек с MapLibre (Фаза 4):** Valhalla + PMTiles — если готовы поднять инфраструктуру.

## Тест-план спайка

- [ ] Один и тот же маршрут (горный GPX): OSRM vs GH vs BRouter — длина, время, polyline на карте.
- [ ] Наличие `elevation` в ответе без отдельного DEM.
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
