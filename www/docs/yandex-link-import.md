# Импорт маршрута из ссылки Яндекс.Карт

Как вставить маршрут в **Мото ИЛС** и в **regression** из длинной (или короткой) ссылки Яндекс.Карт.

> **Принцип:** извлекаются только **waypoints** из параметра `rtext`. HTML страницы и закрытые API **не** используются. Геометрию между точками строит OSRM (или прямая линия в режиме «Быстрый старт»).

Парсер: `js/yandex-link.js` · версия `YANDEX_PARSER_REV`.

---

## Поддерживаемые ссылки

| Формат | Пример |
|--------|--------|
| Длинная с маршрутом | `https://yandex.ru/maps/?rtext=55.75,37.62~55.80,37.70&rtt=auto` |
| Длинная с городом в path | `https://yandex.ru/maps/213/moscow/?ll=…&mode=routes&rtext=…&rtt=auto&z=12` |
| `maps.yandex.ru` | `https://maps.yandex.ru/?rtext=…` |
| `yandex.com/maps` | международный домен |
| Короткая | `https://yandex.ru/maps/-/CCUqY…` (раскрытие redirect, нужна сеть) |
| Вставка из текста | ссылка внутри сообщения в кавычках / с переносами строк |

**Не поддерживается без доработки:**

- `rtext` с **адресами** вместо координат (`Москва, Красная площадь~…`) — нужен геокодер
- только `ruri=` без координат
- парсинг HTML / web-scrape страницы маршрута

---

## Параметр `rtext`

Точки маршрута через `~`, каждая точка — **`широта,долгота`** (lat,lon):

```
rtext=55.7558,37.6173~55.7800,37.6500~55.8000,37.7000
       └── старт ──┘  └── via ──┘  └── финиш ──┘
```

Как получить длинную ссылку в Яндекс.Картах:

1. Построить маршрут (авто / мото).
2. **Поделиться** → скопировать ссылку.
3. В URL должен быть фрагмент `rtext=…` (если только короткая `maps/-/…` — откройте её в браузере и скопируйте URL из адресной строки после редиректа).

---

## Мото ИЛС (PWA)

### Поле «Финиш»

Вставьте ссылку в поле ввода → **Enter** или кнопка разбора координат.

Поддерживается:

- длинная вставка из мессенджера (парсер вытащит URL);
- кнопка **Вставить** из буфера;
- Share Target / буфер при возврате в приложение (баннер «Применить»).

После разбора — модалка:

| Кнопка | Поведение |
|--------|-----------|
| **Пересчёт OSRM** | Маршрут через OSRM по waypoints (рекомендуется) |
| **Быстрый старт** | Прямые отрезки между точками |

### Ограничение точности

Яндекс и OSRM используют разные графы дорог. Для совпадения с Яндексом добавляйте **промежуточные точки** каждые 3–5 км в самих Яндекс.Картах перед копированием ссылки.

### Проверка парсера

```bash
npm run yandex:test
```

---

## Regression: fixture из ссылки

Скрипт создаёт fixture в `regression/fixtures/manual/`:

```bash
npm run regression:import:yandex -- --url "https://yandex.ru/maps/?rtext=55.75,37.62~55.80,37.70" \
  --region moscow_center --category city --notes "Садовое кольцо"

# из файла
npm run regression:import:yandex -- --file route.txt --region moscow_outer

# превью без записи
npm run regression:import:yandex -- --url "..." --dry-run
```

Параметры:

| Флаг | По умолчанию | Описание |
|------|--------------|----------|
| `--url` | — | Ссылка или текст с ссылкой |
| `--file` | — | Файл с ссылкой |
| `--region` | `moscow_center` | `moscow_center`, `moscow_outer`, `mkad_ring`, … |
| `--category` | `city` | `city`, `roundabouts`, `many_waypoints`, … |
| `--notes` | — | Заметка в metadata |
| `--dir` | `fixtures/manual` | Каталог вывода |
| `--dry-run` | — | JSON в stdout, без записи |

Дальше — обычный конвейер:

```bash
npm run regression:fetch:motohud -- --id <uuid>
npm run regression:fetch:gh -- --id <uuid>
npm run regression:fetch:ors -- --id <uuid>
npm run regression:metrics -- --force
```

Fixtures из `manual/` подхватываются `listFixtureFiles()` наравне с `auto/`.

---

## API парсера (для кода)

```javascript
import {
  extractYandexUrl,
  parseYandexRouteLink,
  parseRtextWaypoints,
  buildYandexRouteUrl,
  resolveYandexShortLink
} from './js/yandex-link.js';

// из произвольного текста
const url = extractYandexUrl(paste);

// waypoints [{ lat, lon, label }]
const wps = await parseYandexRouteLink(url);

// обратно share-ссылка
const share = buildYandexRouteUrl(wps, { rtt: 'auto' });
```

---

## Короткие ссылки и CORS

| Среда | Короткая `maps/-/…` |
|-------|------------------------|
| Node (regression import) | redirect follow (HEAD/GET) |
| Браузер PWA | может не раскрыться из‑за CORS → вставьте **длинную** ссылку с `rtext` |

---

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| «Нет rtext» | Постройте маршрут, не точку; скопируйте URL после редиректа |
| «Мало точек» | В rtext только адреса — добавьте точки на карте или введите координаты |
| OSRM ведёт иначе | Больше via-точек в Яндексе; сравните в `regression:review` |
| Короткая ссылка в PWA | Откройте в браузере → скопируйте длинный URL |

---

## Связанные документы

- [NAV-PLAN.md](NAV-PLAN.md) — общая стратегия Яндекс-импорта
- [regression/docs/yandex-web-spike.md](../regression/docs/yandex-web-spike.md) — web-scrape эталона (отдельно от rtext)
