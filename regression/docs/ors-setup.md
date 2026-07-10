# Получение API-ключа OpenRouteService (ORS)

Инструкция для регрессионного конвейера Мото ИЛС. Ключ нужен на **этапе 4** (`fetch-openrouteservice.mjs`). Рекомендуется зарегистрироваться **параллельно** с настройкой репозитория — регистрация занимает 5–10 минут.

## Зачем нужен ключ

OpenRouteService — **второй эталон** сравнения маршрутов (наряду с GraphHopper). Бесплатный тариф Standard даёт достаточно запросов для корпуса 100 fixtures и nightly-прогонов.

> Эталоны — средства сравнения, не «истина». Расхождение ORS и Мото ИЛС не всегда означает баг.

## Пошаговая регистрация

### 1. Регистрация аккаунта

> **Важно:** страница `dev/#/api-docs/...` — это **документация и playground**, не кабинет. Токены там не создаются.

1. Откройте **[account.heigit.org](https://account.heigit.org/)** (единый аккаунт HeiGIT / ORS).
2. **Sign up** — email или GitHub.
3. Подтвердите email (проверьте спам).

Альтернатива: [openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup) → перенаправит в HeiGIT Account.

### 2. Получение ключа (Basic Key)

1. Войдите на **[account.heigit.org](https://account.heigit.org/)**.
2. На главной Dashboard найдите **Basic Key** (или блок API keys / tokens).
3. Скопируйте длинную строку ключа — с 2025 года часто JWT вида `eyJvcmc…`.

⚠️ Если ключа ещё нет — кнопка **Create** / **Request token** / **Generate** на той же странице. Имя, например: `motohud-regression`, тариф **Free**.

**Обходной путь:** если вы уже залогинены в ORS и открыли [api-docs Directions](https://openrouteservice.org/dev/#/api-docs/directions%20service), раскройте **Authorization-Header** (замок) — playground может подставить ключ автоматически; его можно скопировать оттуда.

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
