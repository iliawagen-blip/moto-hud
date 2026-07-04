# 🏍 Мото HUD навигатор

Универсальный автономный веб-навигатор с крупным HUD и предупреждением о камерах,
которые **снимают задний номер** (фиксируют мотоцикл «в спину»). Один файл `index.html`,
без сборки и без бэкенда — только внешние публичные API (OSM/OSRM/Overpass/Nominatim).

## Возможности

- **Задание финиша** тремя способами:
  - поиск адреса по всему миру (Nominatim / OpenStreetMap);
  - координаты `55.7558, 37.6173`;
  - ссылка Яндекс.Карт (`ll=` / `pt=`) или Google Maps (`@lat,lon`).
- **HUD:** крупная стрелка манёвра + расстояние, название улицы, карта Leaflet+OSM с
  полилинией маршрута, точкой пользователя и камерами.
- **Плитки:** скорость (мигает при превышении лимита), остаток пути, ETA, время в пути.
- **Камеры «в спину»** (по данным OSM):
  - тег `direction` = азимут объектива камеры;
  - камера «стреляет в спину», если её `direction ≈ курс мотоциклиста` (± допуск, по умолчанию 45°);
  - камеры позади по ходу движения (уже проехали) отсекаются;
  - настраивается: вкл/выкл фильтр, допуск в градусах, поведение для камер без `direction`.
- **Прочее:** Wake Lock (экран не гаснет), fullscreen, голос через `SpeechSynthesis`,
  детектор схода с маршрута + автопересчёт.

> ⚠️ **Важно про направление камер.** Логика сейчас: `angleDiff(cam.dir, heading) ≤ tolerance`
> (объектив смотрит в ту же сторону, куда едет мотоцикл). Если в вашем регионе мапперы
> трактуют `direction` наоборот, поправьте одну строку в функции `isCameraBehind` в `index.html`:
> замените `angleDiff(cam.dir, heading)` на `angleDiff(cam.dir, (heading + 180) % 360)`.

## Требования к запуску

Геолокация в браузере работает **только по HTTPS** (или на `localhost`). GitHub Pages
отдаёт сайт по HTTPS — этого достаточно.

## Развёртывание на GitHub Pages

### Деплой (рекомендуется)

1. Репозиторий: `https://github.com/iliawagen-blip/moto-hud`
2. После `git push` workflow публикует файлы в ветку `gh-pages`.
3. **Один раз** включите Pages:
   - **Settings → Pages → Build and deployment**
   - **Source:** `Deploy from a branch`
   - **Branch:** `gh-pages` / `/ (root)` → **Save**
4. Через 1–2 минуты сайт будет доступен:
   `https://iliawagen-blip.github.io/moto-hud/`

**План развития продукта:**  
[docs/plan.html](https://iliawagen-blip.github.io/moto-hud/docs/plan.html) (локально: `docs/plan.html`).

**План подготовки к RuStore / APK / web-тестам:**  
[docs/release-plan.html](https://iliawagen-blip.github.io/moto-hud/docs/release-plan.html) (локально: `docs/release-plan.html`).

## Демо для друзей (симуляция)

Одна ссылка для рассылки — **HTTPS**, работает с телефона и ПК:

**https://iliawagen-blip.github.io/moto-hud/sim.html**

| Устройство | Что откроется |
|------------|----------------|
| **Телефон** | полноэкранный HUD с симулированным GPS (`index.html?sim=1`) |
| **ПК** | эмулятор в рамке телефона + регулятор скорости |

Прямая ссылка только на HUD (без рамки):  
`https://iliawagen-blip.github.io/moto-hud/index.html?sim=1`

> Нужен интернет: маршрут строится через OSRM, карта — OSM. Комментарии можно прислать автору в мессенджер или issue на GitHub.

> Если workflow `Deploy to GitHub Pages` падает с `Get Pages site failed` — Pages ещё не включён
> (шаг 3). После включения перезапустите workflow: **Actions → Deploy to GitHub Pages → Re-run jobs**.

### Локальный push

```bash
cd "D:\UNIGINE Projects\moto-hud-navigator"
git push -u origin main
```

## Локальная проверка

```bash
# любой статический сервер, например:
python -m http.server 8000
# затем открыть http://localhost:8000
```

## Используемые сервисы

| Задача            | Сервис                                   |
|-------------------|------------------------------------------|
| Карта / тайлы     | OpenStreetMap + Leaflet                  |
| Маршрут           | OSRM (`router.project-osrm.org`)         |
| Камеры            | Overpass API (`overpass-api.de`)         |
| Поиск адреса      | Nominatim (`nominatim.openstreetmap.org`)|

> Это публичные демо-серверы с ограничениями по нагрузке. Для постоянного/интенсивного
> использования рекомендуется поднять собственные инстансы OSRM/Overpass/Nominatim.
