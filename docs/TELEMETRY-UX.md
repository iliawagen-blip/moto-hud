# Телеметрия: UX, приватность и воронка

Документ описывает добровольную запись поездок в PWA «Мото ИЛС»: что собирается, как пользователь отправляет файл разработчику, какие метрики воронки считаем и что планируется дальше.

Связанные модули: `js/telemetry.js`, `js/telemetry-funnel.js`, `js/telemetry-share.js`, `js/telemetry-ask.js`, `js/converge-telemetry.js`.

---

## Принципы

1. **Локально по умолчанию** — запись в IndexedDB на устройстве; серверной автоотправки нет.
2. **Явное согласие** — тумблер в настройках; опциональная модалка при первом запуске.
3. **Доставка — отдельный шаг** — после поездки пользователь сам передаёт JSONL (Share Sheet, скачивание, почта, Telegram).
4. **«Передано в Share» ≠ «доставлено»** — после `navigator.share` фиксируется попытка; подтверждение доставки — кнопка «Файл доставлен» или бейдж в списке сессий.
5. **Минимум шума** — модалка отправки не показывается для коротких поездок (< 2 мин) и сессий с < 5 событиями.

---

## Что записывается

| Категория | Содержимое |
|-----------|------------|
| GPS | координаты (6 знаков), точность, скорость, курс |
| Навигация | snap, off-route, манёвры, reroute, converge |
| Метки | кнопка «МЕТКА» на HUD (в т.ч. phantom_turn по тройному тапу) |
| Система | FPS, батарея, visibility, ошибки JS |
| Воронка | события `meta.sub === 'funnel'` |

**Не записывается отдельно:** текстовые адреса финиша (только координаты и события маршрута).

---

## Приватность

- Файл остаётся на телефоне до явной отправки пользователем.
- В превью модалки — предупреждение: начало/конец трека может совпадать с домом/работой.
- Поле «Что было не так» — добровольный комментарий в тексте Share, не отдельная PII-таблица.
- Режим «Не спрашивать после каждой поездки» — `localStorage['moto-hud-telemetry-send-skip-each']`.
- Полный отказ от напоминаний — «Не напоминать» → `moto-hud-telemetry-send-ask-v1 = dismissed`.

Контакты разработчика: [Telegram](https://t.me/MotoILS), iliawagen@gmail.com.

---

## Воронка UX (вечер 0b)

### Стадии (`js/telemetry-funnel.js`)

| Стадия | Когда |
|--------|--------|
| `telemetry_opt_in` / `telemetry_opt_out` | тумблер или модалка включения |
| `ride_start` / `ride_stop` | ПОЕХАЛИ / СТОП при включённой телеметрии |
| `mark_placed` | кнопка МЕТКА |
| `share_prompt_shown` | модалка после поездки (порог пройден) |
| `share_prompt_skipped_short` | поездка < 2 мин или < 5 событий |
| `share_prompt_dismissed_later` / `_never` | закрытие модалки |
| `share_prompt_skip_per_ride` | чекбокс «не спрашивать после каждой» |
| `share_sheet_opened` | успешный вызов Share API |
| `share_download` / `share_email` / `share_telegram_chat` | fallback-каналы |
| `share_note_nonempty` | заполнено поле комментария |
| `session_marked_shared` | пользователь подтвердил доставку |

События пишутся в активную JSONL-сессию и дублируются в `localStorage['moto-hud-telemetry-funnel-v1']` (счётчики на устройстве).

### KPI

```
prompt_rate     = share_prompt_shown / ride_stop
share_rate      = share_sheet_opened / share_prompt_shown
confirm_rate    = session_marked_shared / share_sheet_opened
end_to_end      = session_marked_shared / ride_stop
```

Отчёт: `npm run funnel:report -- path/to/*.jsonl`

---

## UX отправки (текущая реализация)

1. После СТОП — модалка с **превью** (длительность, точки, метки, регион старта, build-id).
2. Главная кнопка **«Отправить»** → `navigator.share` с JSONL + сопроводительным текстом.
3. iOS fallback: файл как `.txt` (`text/plain`), если `application/x-ndjson` не принимается.
4. Вторичные: скачать JSONL, открыть чат Telegram, mailto с шаблоном.
5. Статус: «Передано в Share…» + кнопка «Файл доставлен».
6. В списке сессий: бейдж `Share ?` (ожидает подтверждения) или `передано`.

Пороги модалки: **≥ 120 с** поездки, **≥ 5** событий.

---

## Converge (вечер 0) — без изменения UX

Телеметрия converge (`converge_transition`, `converge_blocked_tick`, …) собирается параллельно. **Hard-stop / blink GPS не меняем** до накопления данных `npm run converge:report`.

---

## Дорожная карта

| Вечер | Задача | Статус |
|-------|--------|--------|
| 0 | Телеметрия converge в JSONL | ✅ |
| 0b | Воронка + модалка Share + превью | ✅ |
| 1 | Обрезка трека 500 м от старта/финиша при экспорте | план |
| 2 | Режим «только метки» + кольцевой буфер вокруг МЕТКИ | план |
| 3 | Dev-viewer JSONL на карте (`scripts/telemetry-viewer`) | план |
| 4 | Опциональный upload на сервер (с отдельным согласием) | out of scope |

---

## Dev-tooling

```bash
# Включить запись в браузере
localStorage.setItem('moto-hud-telemetry-enabled', '1')
# или ?telemetry=1

# Отчёты
npm run converge:report -- fixtures/*.jsonl
npm run funnel:report -- fixtures/*.jsonl

# Сборка
npm run build
```

Ключи localStorage:

- `moto-hud-telemetry-enabled` — запись вкл/выкл
- `moto-hud-telemetry-ask-v1` — онбординг включения
- `moto-hud-telemetry-send-ask-v1` — глобальный отказ от напоминаний
- `moto-hud-telemetry-send-skip-each` — не показывать модалку после каждой поездки
- `moto-hud-telemetry-funnel-v1` — локальные счётчики воронки

---

## Out of scope (пока)

- Автоматическая загрузка на бэкенд без явного действия пользователя.
- Идентификация пользователя (аккаунты, device fingerprint).
- Редактирование/маскирование трека в UI (только план на вечер 1).
