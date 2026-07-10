# Регрессионный конвейер навигации Мото ИЛС

Автоматизированное сравнение маршрутов Мото ИЛС (OSRM) с эталонами **GraphHopper** и **OpenRouteService**.  
Яндекс web-scrape — **отдельная фаза** после smoke v1 (не в базовом конвейере).

> **Важно:** эталоны — средства сравнения, не «истина». Расхождения могут означать разные профили, версии OSM или эвристики, а не обязательно баг Мото ИЛС.

## Календарные ожидания

При работе **2–3 часа в вечер** (side-time):

| Веха | Срок |
|------|------|
| Smoke v1 (5 fixtures, end-to-end) | **4–6 недель** |
| Corpus 100 без Яндекса | **+1–2 недели** |
| Яндекс web (опционально) | отдельно, после решения по smoke |

## Быстрый старт

```bash
# 1. Ключи
cp regression/.env.example regression/.env
# Вставьте GRAPHHOPPER_API_KEY (и ORS_API_KEY когда будет)

# 2. Зависимости
npm install

# 3. Проверка схемы
npm run regression:validate-schema

# 4. ORS — параллельно зарегистрируйтесь
# См. regression/docs/ors-setup.md
```

## Структура

```
regression/
  fixtures/auto/       # fixtures в git
  cache/
    motohud/           # polyline Мото ИЛС (обязательно, не в git)
    references/        # polyline эталонов (не в git)
    checkpoints/
  results/             # прогоны по датам (не в git)
  reports/             # markdown-отчёты (не в git)
  config/              # regions, thresholds, sim, rate-limits
  schemas/             # JSON Schema
  scripts/             # node-скрипты конвейера
  playwright/          # Playwright specs (этап 7)
  docs/
```

## Кэш motohud (обязательно)

Полилиния **не** хранится в fixture-файле. Обязательный кэш:

`regression/cache/motohud/{fixture_id}.json`

Содержит `polyline`, `steps`, `distance_m`, `duration_s` — нужен для sim и `review-worst`.

## Playwright sim (этап 7)

```bash
npm run build
npm run regression:sim -- --id <fixture-uuid> --force
npm run regression:sim -- --mode on_route --headed   # с окном браузера
```

Требуется `regression/cache/motohud/{id}.json` (см. `regression:fetch:motohud`).

Режимы (`config/sim.json`): `on_route`, `deviation`, `noise_stress`.  
Результаты: `regression/results/{date}/sim/` + `sim-summary.json`.  
Checkpoint: `regression/cache/checkpoints/{date}-sim.json` (пропуск обработанных; `--force` — заново).

Пороги CI — `config/thresholds.json` (калибруются на smoke fixtures).

## Отчёт и review (этап 8)

```bash
npm run regression:report
npm run regression:review -- --open
npm run regression:review -- --tag-candidates
```

Артефакты: `regression/reports/{date}/summary.md`, `summary.json`, `trend.json`, `review-worst.html`.

## Nightly (этап 9)

**Handoff для агента:** [docs/HANDOFF-NIGHTLY.md](docs/HANDOFF-NIGHTLY.md)

```bash
npm run regression:nightly
npm run regression:smoke
npm run regression:nightly -- --skip-sim --skip-fetch
npm run regression:nightly -- --dry-run
npm run regression:nightly -- --from sim
```

Checkpoint: `regression/cache/checkpoints/{date}-nightly.json`.

Playwright-прогон использует **ускоренное время 10×**:

1. Перед запуском sim: `window.SIM_TIME_SCALE = 10` (из `config/sim.json`).
2. Таймеры навигации (grace, off-route, snap hold) масштабируются через `js/sim-time-scale.js`.

Реальное время прогона ~3–5 мин на fixture вместо 30–60 мин.

## Пороги CI

- Первые **5 fixtures**: пороги в `config/thresholds.json` **вручную** (наблюдённый p95 × 1.5).
- При росте до **25** — пересмотр.
- `refs_agree`: GH↔ORS **p95 < 35 м** (не 20).

## npm-скрипты

| Скрипт | Этап | Описание |
|--------|------|----------|
| `regression:validate-schema` | 0 | Zod-валидация fixture |
| `regression:generate` | 1 | Генератор waypoints |
| `regression:fetch:motohud` | 2 | Fetch OSRM |
| `regression:fetch:gh` | 3 | Fetch GraphHopper |
| `regression:fetch:ors` | 4 | Fetch ORS |
| `regression:import:yandex` | — | Fixture из ссылки Яндекс (rtext) |
| `regression:fetch:yandex` | 5 | Яндекс web-scrape (ручной, `--force-enable`) |
| `regression:metrics` | 6 | Метрики сравнения |
| `regression:sim` | 7 | Playwright sim |
| `regression:report` | 8 | Markdown + summary.json + trend.json |
| `regression:review` | 8 | HTML worst-case + `--open` |
| `regression:nightly` | 9 | Оркестратор (fetch → metrics → sim → report) |
| `regression:smoke` | — | nightly на 5 fixtures, без Yandex |

## GraphHopper — лимиты

См. [docs/graphhopper-limits.md](docs/graphhopper-limits.md).

## Яндекс web-scrape (фаза 5, опционально)

Ручной запуск, **не** в `regression:nightly` / `regression:smoke`.

```bash
npm run regression:fetch:yandex -- --force-enable --id <fixture-uuid>
```

См. [docs/yandex-web-spike.md](docs/yandex-web-spike.md) — ограничения, captcha, `polyline_not_extracted`.

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| OSRM 429 | Увеличить `delay_between_req_ms` в `config/rate-limits.json` |
| GH лимит | Ждать сброса; см. `cache/graphhopper-counter.json` |
| ORS 401 | `regression/docs/ors-setup.md` |
| Hard-kill фазы | `results/{date}/errors.log` |
| Капча Яндекса | Стоп; фаза Yandex не в nightly |

## Безопасность

- `regression/.env` — **никогда** в git.
- `cache/`, `results/` — в `.gitignore`.
- API-ключи только через `.env`.
