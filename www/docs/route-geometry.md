# RouteGeometry — прогноз-дорожка и навигационная геометрия

Единый источник геометрии маршрута для карты (setup), HUD-дорожки, snap, дистанций и профиля высот.

## Структура данных

После построения маршрута (OSRM) вызывается `buildRouteGeometry(route)` → `route.geometry`:

| Поле | Тип | Описание |
|------|-----|----------|
| `lat`, `lon` | `Float64Array` | Уплотнённая polyline (~3 м) |
| `s` | `Float64Array` | Длина дуги от старта, м |
| `elev` | `Float64Array` | Высота DEM, м (этап 2.5) |
| `grade` | `Float64Array` | Уклон Δelev/Δs (этап 2.5) |
| `maneuvers` | `Array` | `{ s, lat, lon, angle, step }` |
| `n` | `number` | Число точек |

Карта Leaflet рисует **route.coords** (быстро); HUD и snap используют **route.geometry** (dense).

## Snap (`snapToRoute`)

GPS проецируется на polyline с ограничениями для серпантинов:

1. **Окно по s:** `[prev.s − 30 м, prev.s + 150 м]`
2. **Монотонность:** `s ≥ prev.s − 5 м` (кроме явного офф-роута > 60 м)
3. **Направление:** касательная сегмента согласована с GPS-курсом (`dot > 0.3`)
4. **Скоринг:** `lateral + λ·(1 − dot)` — при неоднозначности выбирается «правильная» нога шпильки

Состояние между кадрами: `{ s, segIdx, lat, lon, lateral, tangent, confidence }`.

## Прогноз-дорожка (Frenet)

1. Срез `[snap.s … snap.s + maxDist]` вдоль `geometry`
2. Локальная система: **касательная маршрута** (не GPS-курс), сглаженная:
   - пространственно: среднее по `[s, s+25 м]`
   - временно: экспоненциальное сглаживание `α ≈ 0.12`/кадр
3. Псевдо-3D: `projectWorld(lat,lon)` → `projectGround(x, z, elevDelta)`
4. **Лента:** per-point Frenet cross-sections → triangle strip (cull flipped)
5. **Painter's order:** сегменты от больших `s` к меньшим
6. **viewBox** фиксированный (`0 0 L.W L.H`), без подгонки bbox каждый кадр

## Сглаживание углов OSRM

- Угол вершины `< 15°` — линейная интерполяция
- Угол `≥ 15°` — **квадратичная дуга** (контрольная точка = вершина, R_min ≈ 12 м)
- Chaikin **не** используется (срезает шпильки)

## Высоты (этап 2.5)

OSRM высот не отдаёт. Источники:

| Фаза | Источник |
|------|----------|
| Онлайн | AWS Terrain Tiles (Terrarium) |
| Офлайн | Copernicus GLO-30 / SRTM HGT |
| Спайк роутеров | GraphHopper / BRouter (`elevation=true`) |

Pipeline: якоря каждые 50 м → **OpenTopoData** batch (fallback Terrarium) → интерполяция на dense → сглаживание elev окном 75 м → `grade[]`.

Рендер:

1. Полоска-профиль 3 км вперёд — **линия сегментами по grade** + числовые метки «+8%» / «−6%» на профиле и осевой
2. Маркеры уклона на ленте — **числовые**, не символы ▲/▼
3. Лента — **нейтральный** цвет (зарезервировано под другие индикаторы)
4. **Этап 3:** наклон камеры по grade + вертикаль в `projectGround` (× `elevExag`)

На карте setup: подсветка первых **3 км** выбранного маршрута («окно HUD»).

## Модули

- `js/route-geometry.js` — preprocess, snap, Frenet, ribbon
- `js/elevation.js` — Terrarium, профиль, окраска
- `js/render.js` — HUD-отрисовка
- `js/route.js` — привязка geometry при build/select

## Этапы внедрения

| Этап | Содержание | Статус |
|------|------------|--------|
| 1 | Float64Array dense, snap с окном, Frenet, карта на dense | ✅ |
| 2 | Дуги на шпильках, clamp ленты, сглаживание камеры, painter's order | ✅ |
| 2.1 | Per-point Frenet cross-sections + triangle strip mesh (без разрывов на поворотах) | ✅ |
| 2.5 | elev/grade, полоска-профиль, окраска ленты, OpenTopo batch | ✅ |
| 3 | 3D-наклон камеры по grade + projectGround | ✅ |
| 4 | Спайк роутеров с elevation — см. `docs/router-spike.md` | 📋 |
