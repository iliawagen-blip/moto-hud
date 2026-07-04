# Чек-лист тем оформления (Шаг 4)

## Визуальная проверка в sim.html

| Тема | День | Ночь | Прямая | Поворот | Разворот |
|------|------|------|--------|---------|----------|
| avionics | ☐ | ☐ | ☐ | ☐ | ☐ |
| hitech | ☐ | ☐ | ☐ | ☐ | ☐ |
| space | ☐ | ☐ | ☐ | ☐ | ☐ |
| sport | ☐ | ☐ | ☐ | ☐ | ☐ |
| chopper | ☐ | ☐ | ☐ | ☐ | ☐ |
| vintage | ☐ | ☐ | ☐ | ☐ | ☐ |

## Инварианты

- [ ] `--sem-warn` (#FFB000), `--sem-danger` (#E10600), `--sem-ok` (#33CC66) одинаковы во всех темах
- [ ] Смена темы не вызывает пересчёт геометрии маршрута (только перекраска SVG/CSS)
- [ ] `getComputedStyle` не вызывается в rAF-цикле (`getThemeTokens()` с кэшем)
- [ ] Нет SVG-фильтров и анимированных box-shadow в HUD
- [ ] Режим «авто»: переключение по GPS + гистерезис ±20 мин; fallback 07:00–21:00
- [ ] Выбор темы сохраняется в localStorage, boot-скрипт в `<head>` без вспышки

## Дополнительные токены (не в исходном списке)

- `--sem-warn`, `--sem-danger`, `--sem-ok` — семантика
- `--fg-label`, `--accent-on`, `--font-feature-num` — лейблы и цифры
- `--path-center-opacity`, `--path-dash`, `--speed-ghost-opacity` — дорожка/винтаж
- `--svg-halo`, `--svg-bg-overlay` — SVG-подложки
- `--turn-primary`, `--turn-secondary` — маркеры поворотов
- `--curve-yellow`, `--curve-red`, `--grade-*`, `--route-*`, `--map-bg` — карта/профиль

## Vintage

- [ ] Пиксельная стрелка — **TODO**, fallback на outline (см. css/themes.css)
