# Лимиты GraphHopper в регрессионном конвейере

## Тип лимита

GraphHopper Directions API: **500 запросов в сутки** с **автосбросом раз в 24 часа**.

Это **не накопительный** лимит. Неиспользованные запросы **сгорают** при сбросе.

В личном кабинете отображается, например: `Resets in 17h 27m`.

## Счётчик в конвейере

Файл: `regression/cache/graphhopper-counter.json`

```json
{
  "date": "2026-07-09",
  "count": 30,
  "reset_at": "2026-07-10T03:15:00.000Z"
}
```

| Поле | Описание |
|------|----------|
| `date` | UTC-дата (YYYY-MM-DD). При смене даты `count` → 0 |
| `count` | Запросов за текущие сутки |
| `reset_at` | ISO время сброса из `X-RateLimit-Reset` (если API отдал заголовок) |

Скрипт `fetch-graphhopper.mjs`:

- перед каждым запросом проверяет `count < 450` (90% от 500);
- после ответа увеличивает `count`;
- читает `X-RateLimit-Reset` для уточнения `reset_at`.

## Стартовое состояние (день запуска проекта)

На момент старта у пользователя уже потрачено **~260 из 500** → остаток **~240**.

## Стратегия на 3 дня (без растягивания на 5–6 дней)

| День | Доступно после сброса | План запросов | Накопительно по корпусу |
|------|----------------------|---------------|-------------------------|
| **1** | ~240 остаток | 30 (spike + smoke 5 + повторы) | 5 fixtures с GH |
| **2** | 500 (новые сутки) | 40 (smoke 25 + запас) | 25 fixtures с GH |
| **3** | 500 | 120 (corpus 100 + stale/retry) | 100 fixtures с GH |

Остаток дня **намеренно не копим** — лимит сгорает. Планируем ровно под задачу дня.

### День 1 (детально)

| Этап | GH req |
|------|--------|
| Spike 1 fixture | 1 |
| Smoke fetch 5 | 5 |
| Повторы при ошибках | ≤5 |
| Резерв | ~19 |
| **Итого** | ≤30 |

### День 2

| Этап | GH req |
|------|--------|
| Новые fixtures smoke 25 | 25 |
| Повторы | ≤15 |
| **Итого** | ≤40 |

### День 3

| Этап | GH req |
|------|--------|
| Догон failed/stale | ≤20 |
| Corpus до 100 | 100 |
| **Итого** | ≤120 |

## Формула планирования

```
requests_today = fixtures_to_fetch + ceil(fixtures_to_fetch * 0.2)   # 20% на retry
must_be <= min(remaining_today, 450 - count_today)
```

## Экономия

1. Кэш полилиний в `cache/references/graphhopper/` — re-fetch только при `--force` или `status: stale`.
2. Не запускать GH в nightly для fixtures с актуальным `fetched_at` (< 7 дней).
3. ORS — параллельный эталон; при исчерпании GH nightly продолжается на ORS + motohud.
4. Yandex web — **не** тратит GH-квоту (отдельная фаза).

## Лимит точек маршрута

GraphHopper **Directions API** принимает **не более 5 waypoints** на запрос (`Too many points: 6, allowed: 5`).

Конвейер:

- `generate-waypoints.mjs` — новые fixtures: `many_waypoints` даёт 2–3 via (итого 4–5 точек);
- `fetch-graphhopper.mjs` — при `waypoints.length > 5` автоматически урезает до 5 (start + via + finish, равномерно);
- `config/rate-limits.json` → `graphhopper.max_points: 5`;
- в `references.graphhopper.provider_meta` пишется `points_original`, `points_sent`, `downsampled`.

Fixture может хранить 6+ точек для motohud/ORS; для GH отправляется урезанный набор.

## Troubleshooting

| Ситуация | Действие |
|----------|----------|
| `count >= 450` | Стоп до сброса; checkpoint; продолжить после `reset_at` |
| HTTP 400 Too many points | Fixture >5 точек: fetch урежет автоматически; для новых — `generate-waypoints` cap 5 |
| HTTP 429 | Пауза 60 с, retry 1×; если снова 429 — стоп фазы |
| Неверный ключ | Проверить `regression/.env`, не коммитить |
| Счётчик «залип» | Удалить `graphhopper-counter.json` или исправить `date` вручную |

## Ссылка

- [GraphHopper Directions API](https://docs.graphhopper.com/openapi/routing/getroute)
- Рекомендуется `POST /route`, `points_encoded=false`, `profile=car`
