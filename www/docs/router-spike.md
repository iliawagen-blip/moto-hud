# Спайк: офлайн-роутеры (Фаза 4 / направление 7)

> Ревизия: **2026-07-07** — сравнение Valhalla vs GraphHopper vs BRouter для монетизируемого мото-навигатора (РФ, УСН, российские сторы, сервер или клиентский офлайн).

Критерии: мото-профили, офлайн, map-matching, лицензия на коммерцию, стоимость VPS, интеграция в Capacitor.

---

## Решение (кратко)

| Этап | Выбор | Почему |
|------|-------|--------|
| **Сейчас (замена OSRM онлайн)** | **Valhalla** на своём Docker | MIT, trace_route для snap, HTTP API ≈ OSRM, 100–300 мс на VPS |
| **Оффлайн в бете** | Кеш маршрутов + Leaflet offline tiles | Паллиатив до отдельной фичи |
| **Оффлайн v2** | BRouter **или** Valhalla Mobile | BRouter — проще встройка, **AGPL**; Valhalla Mobile — C++, недели |
| **Не приоритет** | GraphHopper self-host | Те же задачи что Valhalla, дороже RAM; коммерческая Directions API не нужна |

**Гибрид (сценарий В):** Valhalla онлайн + BRouter офлайн — элегантно, но две реализации + юрист по AGPL.

---

## Общая характеристика

### Valhalla

- Mapzen → сейчас Mapbox + open source. **C++**, серверный, HTTP API.
- Hierarchical tiles → быстро на больших дистанциях.
- Профиль «мото» = настраиваемый **auto** (`use_highways`, `maneuver_penalty` и т.д.).
- **trace_route** / **trace_attributes** — map-matching из коробки.
- Docker-образы, активные релизы.
- **Лицензия: MIT** — коммерция без ограничений.

### GraphHopper

- GraphHopper GmbH, **Java**. Open Core **Apache 2.0** + платная Directions API.
- Contraction Hierarchies → самый быстрый на **длинных** маршрутах (тысячи км за мс).
- Лучшие structured maneuvers; custom models (YAML) для мото.
- **graphhopper-map-matching** — отдельная библиотека.
- Документация сильная; RAM **6–10 ГБ** на граф РФ.
- Komoot и др. — типичный выбор для коммерции.

### BRouter

- Arndt Brenschede; изначально вело/туризм, **Java**, Android-native.
- **Оффлайн-first:** сегменты `.rd5` (50–150 МБ на 5×5°), профили **.brf** (текстовые формулы).
- Профили сообщества: `moto-fast`, `moto-touring`, `moto-curvy`.
- Маршрут 100 км на телефоне: **2–10 с** (без CH); 30 км ≈ 500 мс.
- Качество «извилистых» маршрутов — **лучшее** при тонкой настройке профиля.
- **Map-matching в стоке нет** — snap остаётся на клиенте (как сейчас в HUD).
- **Лицензия: AGPL v3** — критично для платного закрытого приложения; нужен юрист или коммерческая лицензия у автора.

---

## Сравнение по критериям

| Критерий | Valhalla | GraphHopper | BRouter |
|----------|----------|-------------|---------|
| **До 100 км, latency (сервер)** | 100–300 мс VPS | Очень быстро (CH) | 2–10 с на телефоне; сервер дешёвый |
| **Качество манёвров** | Хорошее, ≈ OSM-граф | Самое чистое JSON | Зависит от .brf; лучше для «красивых» дорог |
| **Мото из коробки** | auto + costing | motorcycle custom model | moto-* .brf, правка в блокноте |
| **Оффлайн Android** | Valhalla Mobile (сложно, 300–800 МБ/регион) | GH Android lib (замедлилось) | **Нативный режим**, BRouterCore |
| **Map-matching** | ✅ trace_route | ✅ отдельная lib | ❌ нет |
| **VPS РФ, RAM** | 4–8 ГБ, ~30–60 €/мес | 6–10 ГБ, ~40–80 €/мес | 2 ГБ, ~10–20 €/мес (или без сервера) |
| **Оффлайн объём РФ** | Крупные тайлы | 200–500 МБ/регион | ~15–20 сегментов, **1–2 ГБ** |
| **Лицензия коммерция** | MIT ✅ | Apache 2.0 ✅ | **AGPL ⚠️** |
| **Сообщество** | Активное (Mapbox и др.) | Компания + OSS | Один автор, стабильно годами |

### Таблица возможностей (краткая, из MASTERPLAN)

| | OSRM (сейчас) | GraphHopper | BRouter | Valhalla |
|---|---------------|-------------|---------|----------|
| Высоты | ❌ | ✅ | ✅ GPX | ✅ |
| Round-trip | ❌ | ✅ | ✅ loop | ✅ |
| surface/smoothness | ❌ | custom model | **.brf** | costing |
| Публичный demo | project-osrm.org | limited | brouter.de | self-host |

---

## Сценарии для Мото ИЛС

### А — Серверный роутер, монетизация (СБП / подписка позже)

**Valhalla** — лучший баланс: MIT, map-matching, Docker, масштаб.  
GraphHopper — избыточен по RAM. BRouter — **отпадает из-за AGPL** без юридической проработки.

### Б — Оффлайн в приложении (трасса, горы без связи)

**BRouter** — проще всего встроить, если решён AGPL (лицензия у автора / открытый модуль).  
Альтернатива: **Valhalla Mobile** — недели C++ в Capacitor.

### В — Гибрид: Valhalla онлайн + BRouter офлайн

Технически сильно; две кодовые базы + AGPL. Оправдано, если офлайн — **ключевая** ценность продукта.

---

## Практический план внедрения

### Шаг 1 — Valhalla Docker (замена OSRM)

```
Клиент: js/router.js → Valhalla /route + парсер в { coords, steps, distance, duration }
        (контракт как у parseOsrmRoute)
Snap:   trace_route / trace_attributes → снижение lat_off на плохом GPS
```

Причины: MIT, готовый matching, минимум переработки vs OSRM-парсер.

### Шаг 2 — Оффлайн (после трекшна в бете)

- **Паллиатив:** кеш последнего маршрута + offline Leaflet tiles (уже частично есть).
- **Полноценно:** BRouter + лицензия **или** Valhalla Mobile + бюджет времени.

### GraphHopper — когда имеет смысл

- Нужна **лучшая** документация и CH на **очень длинных** перегонах в одном JVM-стеке.
- Готовы платить за RAM и не нужен trace в одном процессе с тем же стеком, что MapLibre+Valhalla.

---

## Монетизация и российские сторы

- **RuStore / NashStore / RuMarket** — нет обязательного Google Play Billing; **Вознаграждение через СБП** на внешней странице допустимо (проверять актуальные правила RuStore).
- Модель «бесплатно + добровольная поддержка» — меньше friction, чем обход правил Google Play.
- AGPL BRouter не блокирует публикацию в сторе, но может **обязать открыть исходники** встраиваемой части — отдельно от вопроса стора.

---

## CLI-спайк (текущий)

```bash
npm run spike:routers
# Москва — Тула (пример):
node scripts/spike-routers.mjs 55.757,37.616 54.193,37.617
```

Сейчас: OSRM vs BRouter public API. **TODO:** добавить Valhalla demo endpoint или локальный Docker в скрипт.

---

## Тест-план спайка

- [ ] Москва — Тула (~180 км): latency, длина, polyline на карте — OSRM vs Valhalla (Docker) vs BRouter `moto-touring`
- [ ] **trace_route** на JSONL `telemetry_2026-07-07` — p95 lat_off vs клиентский snap
- [ ] Round-trip 80–120 км — качество кольца, время
- [ ] Профиль «асфальт» vs «извилисто» — один коридор, три движка
- [ ] Размер offline-pack региона ~500×500 км
- [ ] Юрист: AGPL + встраивание BRouterCore в `ru.vagin.motohud`

---

## Архитектура

**Сейчас:**

```
OSRM → route.coords → RouteGeometry → snap (клиент) → HUD
```

**Цель (направление 7):**

```
getRouter(): valhalla | osrm-fallback
Valhalla /route → тот же контракт geometry + steps
Valhalla /trace_route → s0_nav (опционально заменить часть snapToRoute)
```

`elevation.js` — fallback, если высоты не в ответе роутера.

---

## Честные ограничения

- **Пробки** — только при онлайн-планировании (Яндекс / внешние API); офлайн — без пробок.
- **POI scenic** — полнота OSM по РФ; ручной слой в планировщике (Фаза 6).
- **Публичный OSRM** — не для продакшена; свой Valhalla или лимиты.
