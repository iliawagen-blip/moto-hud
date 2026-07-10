# Яндекс.Карты web-scrape (spike, 2026-07-09)

Отдельная фаза regression-конвейера. **Не** входит в `run-nightly.mjs` по умолчанию.

## Цель

Получить эталон `yandex_web` для fixtures с `metadata.priority = worst_case_candidate`:
- `distance_m`, `duration_s` — из DOM панели маршрута (надёжно);
- `polyline` — эвристика из JSON-ответов страницы (ненадёжно).

## URL и Playwright

```
https://yandex.ru/maps/?rtext=lat,lon~lat,lon&rtt=auto
```

Скрипт: `regression/scripts/fetch-yandex-web.mjs`  
Библиотека: `regression/scripts/lib/yandex-web.mjs`

Запуск (ручной):

```bash
npm run regression:fetch:yandex -- --force-enable --id <fixture-uuid>
npm run regression:fetch:yandex -- --force-enable --headed
```

`rate-limits.json` → `yandex_web.enabled: false` — включение только через `--force-enable`.

## Лимиты

| Параметр | Значение |
|----------|----------|
| Fixtures за прогон | max 25 |
| Фильтр | `worst_case_candidate` (или `--id`) |
| Пауза между запросами | 120–180 с |
| TTL кэша | 30 дней (`cleanup-cache.mjs`) |
| Captcha | полная остановка прогона (exit 3) |

Checkpoint: `regression/cache/checkpoints/{date}-yandex.json`

## Spike: что работает

| Источник | Результат |
|----------|-----------|
| DOM (`innerText`) | «13,2 км», «19 мин», «53 км», «1 ч 44 мин» — стабильно |
| Построение маршрута по `rtext` | Работает в headless Chromium |
| Открытый REST с polyline | **Не найден** при перехвате сети |
| `window.ymaps` / `ymaps3` | **Не экспортируются** на странице карт |
| `/maps/api/location-info/get` | coord-массивы до ~400+ точек — **viewport/POI**, не driving route |
| `/maps/api/mrc/track` | protobuf/base64, фото вдоль трассы, не polyline |
| SVG `<path>` на карте | screen coords, не WGS84 |

## Извлечение polyline (эвристика)

1. Перехват всех JSON-ответов `yandex.ru` / `maps.yandex`.
2. Рекурсивный поиск:
   - массивов `[lon,lat]` / `[lat,lon]` в bbox РФ;
   - encoded strings → decode Google polyline (scale 1e5 / 1e6 / 1e7).
3. Scoring кандидата:
   - близость начала/конца к waypoints;
   - длина пути vs DOM distance;
   - прохождение via-точек.
4. Лучший кандидат с `score > 2.5` → `fetch_method: network_intercept`.

## Если polyline не извлечён

- `references.yandex_web.fetch_error = polyline_not_extracted`
- Сохраняются `distance_m`, `duration_s` из DOM
- **Кэш `cache/references/yandex_web/{id}.json` не создаётся**
- **Не** подставляется polyline OSRM/GraphHopper
- `compute-metrics` не считает `yandex_vs_motohud` без polyline в кэше

## Ограничения и риски

- ToS Яндекса: web-scrape может нарушать условия использования.
- Captcha / rate limit — ожидаемы при частых запусках.
- DOM-метрики полезны для сравнения длительности/дистанции; геометрия для worst-case review — best-effort.
- Для production-эталона предпочтителен официальный [Router API](https://yandex.com/maps-api/docs/router-api/) (ключ).

## Вспомогательные spike-скрипты

- `regression/scripts/spike-yandex-network.mjs`
- `regression/scripts/spike-yandex-polyline.mjs`
- `regression/scripts/decode-yandex-poly.mjs`
- `regression/scripts/analyze-yandex-track.mjs`

Кэш spike (в `.gitignore`): `regression/cache/yandex-*.json`

## Связь с конвейером

После успешного fetch с polyline:

```bash
npm run regression:metrics -- --force
```

Review: `regression/scripts/review-worst.mjs` — слой `yandex_web` на карте.
