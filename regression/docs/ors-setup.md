# Получение API-ключа OpenRouteService (ORS)

Инструкция для регрессионного конвейера Мото ИЛС. Ключ нужен на **этапе 4** (`fetch-openrouteservice.mjs`). Рекомендуется зарегистрироваться **параллельно** с настройкой репозитория — регистрация занимает 5–10 минут.

## Зачем нужен ключ

OpenRouteService — **второй эталон** сравнения маршрутов (наряду с GraphHopper). Бесплатный тариф Standard даёт достаточно запросов для корпуса 100 fixtures и nightly-прогонов.

> Эталоны — средства сравнения, не «истина». Расхождение ORS и Мото ИЛС не всегда означает баг.

## Пошаговая регистрация

### 1. Регистрация аккаунта

1. Откройте [openrouteservice.org](https://openrouteservice.org/).
2. Нажмите **Sign Up** (правый верхний угол).
3. Зарегистрируйтесь через email или GitHub.
4. Подтвердите email по ссылке из письма (проверьте спам).

### 2. Создание токена

1. Войдите в аккаунт.
2. Перейдите в **Dashboard** → вкладка **Tokens**.
3. Нажмите **Create Token**.
4. Тип: **Free — Standard**.
5. Имя токена, например: `motohud-regression`.
6. Скопируйте выданный токен — строка вида `eyJvcmc…` (обычно 100+ символов).

⚠️ Токен показывается **один раз**. Сохраните его сразу.

### 3. Вставка в проект

```bash
cp regression/.env.example regression/.env
```

Откройте `regression/.env` и вставьте ключ:

```env
ORS_API_KEY=eyJvcmc...ваш_токен...
```

Файл `regression/.env` **не коммитится** в git.

### 4. Проверка ключа

После установки зависимостей (`npm install`):

```bash
node regression/scripts/health-check-ors.mjs
```

Скрипт появится на этапе 4. До этого можно проверить вручную:

```bash
curl -X POST "https://api.openrouteservice.org/v2/directions/driving-car/geojson" \
  -H "Authorization: ВАШ_КЛЮМ" \
  -H "Content-Type: application/json" \
  -d '{"coordinates":[[37.6173,55.7558],[37.6500,55.7800]]}'
```

Успех: HTTP 200 и GeoJSON `FeatureCollection` с маршрутом.

## Лимиты бесплатного тарифа

| Параметр | Значение |
|----------|----------|
| Запросов в сутки (directions) | 2 000 |
| Запросов в минуту | 40 |
| Задержка в конвейере | 2 000 ms между запросами |

На 100 fixtures — ~3–5 минут чистого fetch при соблюдении rate limit.

## Формат API (кратко)

- **Endpoint:** `POST https://api.openrouteservice.org/v2/directions/driving-car/geojson`
- **Координаты:** `[lon, lat]` — **не** lat,lon
- **Заголовок:** `Authorization: <API_KEY>`
- **Тело:** `{"coordinates": [[lon,lat], ...], "instructions": true}`

Подробнее: [ORS Directions API](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/requests-and-return-types)

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| HTTP 401 Unauthorized | Проверьте ключ, нет ли пробелов в `.env` |
| HTTP 403 | Токен не активирован или истёк — создайте новый |
| HTTP 429 Too Many Requests | Пауза 60 с, уменьшите частоту в `config/rate-limits.json` |
| `Content type not supported` | Добавьте заголовок `Content-Type: application/json` |
| Пустой маршрут | Проверьте порядок координат (lon, lat) |

## Безопасность

- Не коммитьте ключ в git, не вставляйте в issue/PR.
- Не публикуйте ключ в клиентском коде PWA.
- При утечке — отзовите токен в Dashboard и создайте новый.
