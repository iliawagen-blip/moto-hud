# Режим пеленга (bearing navigation) — план реализации

Навигация к цели **без OSRM-маршрута** (лес, поле, тропы). Явное включение пользователем; не автofallback по `routeQuality.LOW`.

**Prod:** [Мото ИЛС](https://iliawagen-blip.github.io/moto-hud/)

---

## Архитектура

| Концепт | Реализация |
|---------|------------|
| Цикл двойного тапа | `S.viewMode`: `hud` → `map_overview` → `map_zoom` → `hud` (`js/view-mode.js`) |
| Режим пеленга | **`S.navMode`**: `'route'` \| `'bearing'` — **вне** `VIEW_ORDER` |
| Мёртвый `compassMode` | Удалить полностью (вечер 6) |
| `opt-heading` / `renderCompass` | Не трогать — отдельные функции |

---

## Дорожная карта

| Вечер | Задача | Часы | Статус |
|-------|--------|------|--------|
| **1** | Layout панели HUD: `.hud-btn-panel`, группы, 56×56 | 2.5–3 | ✅ |
| **2** | Кнопка ПЕЛЕНГ + группа nav; переключение `navMode`; `#bearing-view` скелет | 2.5–3 | ✅ |
| **3** | `bearing-mode.js`: расчёт, `getEffectiveHeading`, базовая стрелка | 2.5–3 | ✅ базово |
| **4** | UI: дистанция, РАЗВОРОТ, финиш &lt;30 м, GPS lost | 2.5–3 | ✅ |
| **5** | ПОЕХАЛИ без маршрута; отключение snap/off-route/voice/cams | 2–2.5 | ✅ |
| **6** | Настройки, телеметрия, удаление `compassMode` | 2–2.5 | ✅ |
| **7** | Полевой тест | 2–3 | ⏸ отложен |

**Gate:** после вечера 1 — скриншоты panel; после 4 — smoke дома; после 6 — поле 30–60 мин.

---

## CSS панели кнопок (вечер 1)

```text
#hud-side-btns.hud-btn-panel
  .hud-btn-group--session     → СТОП
  .hud-btn-group--nav        → вечер 2: дорожка / карта / ПЕЛЕНГ
  .hud-btn-group--quick       → ЗАПР., ЭКРАН
  .hud-btn-group--settings    → НАСТР.
  .hud-btn-group--telemetry   → МЕТКА (если видна)
```

| Класс | Назначение |
|-------|------------|
| `.hud-btn-panel` | Колонка кнопок, `grid-area: btns` |
| `.hud-btn-group` | Группа, `gap: 16px` |
| `.hud-btn-group + .hud-btn-group` | `margin-top: 32px`, разделитель |
| `.hud-btn` | Мин. 56×56 px, иконка + подпись |
| `.hud-btn--active` | Подсветка включённого режима |

Portrait: колонка у левого края блока скорости. Landscape: та же колонка, `justify-content: center` в доступной высоте.

---

## Иконка ПЕЛЕНГ (вечер 2)

SVG 32×32: круг r=13, треугольник-стрелка вверх (fill `#39d353`), точка центра. Отличима от ⛶ ЭКРАН.

---

## `js/bearing-mode.js` (вечер 3–4)

```javascript
export function updateBearing(gps, target, headingDeg);
export function getEffectiveHeading(gps);
export function bearingDisplayState(bearing_rel, distance_m);
export function renderBearingArrow(rotationDeg, label);
export function formatBearingDistance(distance_m);
export function getBearingTarget();
export function enterBearingMode();
export function exitBearingMode();
export function isBearingMode();
export function tickBearing(now);
export function maybeShowCalibrationBanner();
```

**Курс:** GPS при acc&lt;15 м и spd&gt;8 км/ч; magnetometer при spd&lt;5 км/ч или acc&gt;20 м; иначе blend по стабильности 5 с.

**|bearing_rel| &gt; 170°:** стрелка вниз + «РАЗВОРОТ».

---

## `#bearing-view` (разметка)

- `.bearing-label` — «К ЦЕЛИ»
- `#bearing-arrow-box` — SVG стрелка (не `renderManeuverArrow`)
- `#bearing-distance` — haversine, без ETA
- `#bearing-heading-meta` — опционально «курс N°» + GPS/компас
- `.bearing-mode-badge` — «ПЕЛЕНГ»
- `#bearing-cal-banner` — калибровка &gt;7 дней

В bearing скрыты: улица, манёвр, дорожка, камеры, off-route, finish-info ETA.

---

## Изменения в существующем коде

| Файл | Изменение |
|------|-----------|
| `index.html` | Панель кнопок, `#bearing-view`, настройки |
| `css/app.css` | `.hud-btn-*`, `.bearing-*` |
| `js/bearing-mode.js` | NEW |
| `js/state.js` | `navMode`, убрать `compassMode` |
| `js/hud.js` | Убрать ветку compassMode; `startHud` без обязательного route |
| `js/gps.js` | `checkStartReady`: GPS + finish |
| `js/view-mode.js` | Guard bearing при cycle map |
| `js/offroute.js`, `render.js`, `low-speed-map.js` | Skip в bearing |
| `js/setup.js` | Toast без маршрута |
| `js/heading.js` | Timestamp калибровки |

---

## Удаление `compassMode` (вечер 6)

Файлы: `state.js`, `hud.js` (273–299), `route.js`, `offroute.js`, `render.js`, `low-speed-map.js`, `regression-sim-bridge.js`.

`routeQuality.LOW` → только «НИЗК. OSM» в `mid-info`, без переключения режима.

---

## Критерии приёмки

1. Панель кнопок: ровные интервалы, группы, 56×56, перчатки.
2. Лес/поле: ПЕЛЕНГ → стрелка + дистанция по прямой.
3. Разворот 90° → стрелка ~90° без рывков.
4. Стоянка → компас; движение + GPS → «GPS».
5. &lt;30 м → «Вы у цели», без шума.
6. Цель за спиной → «РАЗВОРОТ».
7. GPS lost &gt;5 с → полупрозрачная стрелка + предупреждение.
8. Выход из bearing → HUD/route nav без регрессий.
9. ПОЕХАЛИ без OSRM при GPS + финиш.
10. `compassMode` = 0 в исходниках.
11. Баннер калибровки компаса.
12. Телеметрия `bearing_enter` / `bearing_tick` / `bearing_exit`.

---

## Не делать

- Авто-bearing по `routeQuality.LOW`
- Bearing в цикле двойного тапа
- ETA в bearing
- Переиспользовать `renderManeuverArrow` для пеленга
- Карта/голос в v1

---

## Связанные документы

- [NAV-PLAN.md](NAV-PLAN.md)
- [yandex-link-import.md](yandex-link-import.md)
