# Sim: единый план — три режима, раскладка карта / телефон / дашборд

Цель — один экран `sim.html` для трёх сценариев без смены layout:

| Режим | Задача | Типичный пользователь |
|-------|--------|----------------------|
| **Синтетика** | Ручной прогон HUD, GPX, dev | разработчик |
| **Телеметрия** | Разбор полевой поездки (JSONL) | после ride |
| **Regression** | Разбор Nightly (sim-summary + tick JSONL) | после nightly |

**Prod:** [Мото ИЛС](https://iliawagen-blip.github.io/moto-hud/) · **Sim:** `sim.html`

Связанные документы (архив деталей, superseded этим файлом):
- [sim-telemetry-plan.md](sim-telemetry-plan.md) — полевая телеметрия
- [sim-regression-plan.md](sim-regression-plan.md) — Nightly regression
- [regression/docs/HANDOFF-NIGHTLY.md](../regression/docs/HANDOFF-NIGHTLY.md)

---

## Инвариант раскладки (не ломать)

На **десктопе (sim-wide)** три зоны фиксированы:

```
┌─ TOP BAR ─────────────────────────────────────────────────────────────┐
│ [режим: Синтетика | Телеметрия | Regression]  device  play  theme  nav │
├─ STAGE ─────────────────────────────────────────────────────────────────┤
│  ┌─ PHONE ─────────┐  ┌─ MAP ────────────────────────────────────────┐ │
│  │ iframe HUD        │  │ Leaflet: маршрут / трек / эталоны / cursor  │ │
│  │                   │  │ toolbar: подложка, старт, pick              │ │
│  └───────────────────┘  └────────────────────────────────────────────┘ │
├─ DASHBOARD ─────────────────────────────────────────────────────────────┤
│  Контент зависит от режима; слот один (scroll внутри)                   │
└─────────────────────────────────────────────────────────────────────────┘
```

На **мобиле (v1 — зафиксировано):**

- **Phone** — основная зона stage (HUD).
- **Tab bar под phone** — три вкладки: **HUD** (phone на весь stage) | **Карта** | **Дашборд**. **Swipe между экранами — не v1** (фаза D).
- **Переключение режимов** — если segmented control не влезает в top bar: кнопка **«Режим ▾»** (⋮ или иконка) → выпадающий список: Синтетика / Телеметрия / Regression. На desktop — segmented control в top bar.

Grid CSS (desktop, целевой):

```css
body.sim-wide .sim-phase-app {
  grid-template-rows: auto minmax(0, 1fr) minmax(200px, 40vh);
  grid-template-areas: "top" "stage" "dashboard";
}
.sim-dashboard { grid-area: dashboard; display: flex; flex-direction: column; min-height: 0; }
.sim-dashboard-resizer { grid-area: dashboard; /* handle между stage и dashboard */ }
```

**Resizer (v1):** горизонтальная ручка между stage и dashboard (`pointer-events`, drag → `--dashboard-height`, сохранение в `sessionStorage` только высоты панели, не данных). Альтернатива без resizer — минимум **200–250 px**, max **40vh** (не 120 px / 28vh).

---

## Текущее состояние UI

### Раскладка сейчас

| Зона | Реализация | Проблема |
|------|------------|----------|
| **Top** | `.sim-top` = controls-dock + theme-bar + nav-bar | Нет переключателя режима; tel-bar **отдельно** между top и stage |
| **Phone** | `.sim-phone-col` + iframe | OK |
| **Map** | `.sim-map-panel` справа (sim-wide) | Только live/sim route; telemetry-track частично |
| **Dashboard** | `#tel-replay-bar` (.tel-bar) | Появляется только при загрузке JSONL; **не** постоянный слот; скрыт на mobile |

### Три режима сейчас (неявные)

| Режим | Как включается | Dashboard | Map |
|-------|----------------|-----------|-----|
| **Синтетика** | по умолчанию; `btn-tel-mode-synth` | нет (hint скрыт в sim-wide) | live GPS + route |
| **Телеметрия** | загрузка JSONL → `#tel-replay-bar` show | summary, filters, timeline, incidents, debug | telemetry-track ✅ |
| **Regression** | только `?regression=1` в iframe | ❌ | ❌ |

### Что уже сделано (телеметрия T1–T3)

| Компонент | Статус |
|-----------|--------|
| `js/telemetry-parse.mjs` → `telemetry-parse.js` | ✅ |
| Загрузка JSONL, drag-drop, summary | ✅ |
| Timeline + snap strip + filters | ✅ |
| SimMap telemetry-track, incidents, replay marker | ✅ |
| `scripts/analyze-telemetry-full.mjs` на shared parser | ✅ |

### Что осталось (телеметрия T4–T7)

| ID | Задача | Приоритет |
|----|--------|-----------|
| T4 | Replay sync: HUD follow, map-only, timeScale 1/5/10 | P1 |
| T5 | Расширить incidents: converge_flap, gps_spike, perf_jank | P1 |
| T6 | Экспорт markdown-отчёта | P2 |
| T7 | Shared types + compare с regression JSONL | P2 |

### Regression (R0–R9) — всё в плане, в UI не начато

Ключевой кейс: **2026-07-11**, fail `9b63130e` on_route, `good_snap_ratio` 0.733.

---

## Целевое состояние UI

### Переключатель режимов (Top bar)

Segmented control — **одна точка входа**:

```
[ ● Синтетика ] [ ○ Телеметрия ] [ ○ Regression ]
```

| Действие | Поведение |
|----------|-----------|
| Смена режима | Pause replay; `SimMap.clearModeLayers()`; **сохранить** in-memory state режима (см. ниже); восстановить state целевого режима |
| URL | `history.replaceState` (не `pushState`) — см. § URL и deep links |
| Deep link regression | `?mode=regression&regressionDate=2026-07-11&fixture=9b63130e&runMode=on_route` |
| Deep link telemetry | `&telFile=…` (optional, v2) |

**Не дублировать** кнопку «↩ Синтетика» в tel-bar — только segmented control / mobile menu.

**Клавиатура (accessibility):**

| Клавиша | Действие |
|---------|----------|
| `1` / `2` / `3` | Синтетика / Телеметрия / Regression |
| `←` / `→` | Предыдущий / следующий режим (focus на segmented control) |
| `Space` | Play/pause replay (если режим telemetry/regression и focus не в input) |

Segmented control: `role="tablist"`, `aria-selected`, roving tabindex.

### Dashboard layout — телеметрия и regression (v1)

**Проблема:** timeline (широкая) + vertical scroll dashboard = два конкурирующих скролла.

**Решение (v1): timeline sticky сверху**

```
┌─ dashboard ─────────────────────────────┐
│ STICKY: timeline 80–120px             │  ← horizontal scroll только здесь
│         (snap strip + ticks + cursor)   │
├─────────────────────────────────────────┤
│ SCROLL: summary, transport, filters,    │  ← overflow-y: auto
│         incidents, debug, event panel   │
└─────────────────────────────────────────┘
```

Regression: sticky — matrix или run timeline (sim_s); scroll — nightly summary, assertions, debug.

**Не делать в v1:** два независимых horizontal scroll на одном уровне; timeline на весь dashboard без sticky.

### Dashboard по режимам (один слот `#sim-dashboard`)

#### 1. Синтетика

| Блок | Содержимое |
|------|------------|
| Статус | GPS speed, sim playing/paused, «ПОЕХАЛИ» в iframe |
| Подсказки | 2–3 строки: порядок действий, URL params |
| Опционально | live tick debug если `chk-telemetry` + запись в iframe |

Controls play/GPX/скорость остаются в **top bar** (как сейчас).

#### 2. Телеметрия

| Блок | Содержимое |
|------|------------|
| **Load** | file input + drag-drop zone (в dashboard, не отдельная tel-bar) |
| **Summary** | `#tel-summary` — duration, routeKm, snap %, off-route, converge |
| **Transport** | ▶ replay, speed 1/4/16, `#tel-time-label` |
| **Timeline** | snap strip + event ticks + scrubber |
| **Incidents** | кликабельный список → jump |
| **Debug** | `#tel-debug` + `#tel-event-panel` |
| **Filters** | snap / off-route / converge / voice / … |

#### 3. Regression

| Блок | Содержимое |
|------|------------|
| **Load** | date picker, folder `sim/`, `sim-summary.json`, optional fixtures+cache zip |
| **Nightly summary** | 14/15 pass, CI gate, git hash, trend vs prev |
| **Matrix 5×3** | fixtures × modes; ✓/✗; клик → run detail |
| **Run detail** | assertions pass/fail, metrics, screenshot thumb |
| **Timeline** | ось **sim_s**, lateral sparkline, snap band, пороги |
| **Debug** | tick hover: lateral, snap, off_route, acc |

### Map по режимам (один `#sim-map`, разные слои)

| Слой | Синтетика | Телеметрия | Regression |
|------|-----------|------------|------------|
| route (live) | ✅ | скрыт при replay | — |
| simPath / traveled | ✅ | — | — |
| telemetry-track | — | ✅ snap color | — |
| telemetry-incidents | — | ✅ | — |
| motohud polyline | — | — | ✅ |
| GH / ORS эталоны | — | — | ✅ toggle |
| regression-track | — | — | ✅ (после R0) |
| waypoints | start/finish | — | ✅ все WP |
| replay cursor | — | ✅ | ✅ |

API SimMap (целевой):

```javascript
SimMap.setMode('synth' | 'telemetry' | 'regression');
SimMap.clearModeLayers();
// synth: update(frame) как сейчас
// telemetry: setTelemetryTrack, setTelemetryIncidents, setReplayPosition
// regression: setRegressionContext, setReferenceRoutes, setRegressionTrack
```

### Phone (iframe) по режимам

| Режим | iframe |
|-------|--------|
| Синтетика | `__SIM__` play/pause, обычный HUD |
| Телеметрия | paused sim + injectFix на scrub/replay; опция T4 «HUD follow» |
| Regression | `prepareRegressionHud` + injectFix; R6 replay tick stream |

---

## Сравнение: сейчас → цель

```
СЕЙЧАС (desktop)                    ЦЕЛЬ (desktop)
─────────────────                    ───────────────
[controls][theme][nav]               [mode switch][controls][theme][nav]
[tel-bar — если JSONL]  ← лишнее     (нет отдельной tel-bar)
[phone | map]                        [phone | map]
(nет dashboard)                      [dashboard — mode panel]
```

| Аспект | Сейчас | Цель |
|--------|--------|------|
| Режимы | 2 неявных + regression только URL | 3 явных, segmented control |
| Dashboard | tel-bar conditional | постоянный `#sim-dashboard` |
| Переключение | «↩ Синтетика», reload | один switch, state preserved где можно |
| Map layers | смешиваются при смене | `clearModeLayers()` при switch |
| Mobile dashboard | hidden | tab bar: Карта / Дашборд / HUD |
| Mobile mode switch | — | menu «Режим ▾» если не влезает segmented |
| Regression matrix | нет | в dashboard режима Regression |
| State при switch | теряется | in-memory restore per mode |

---

## Единая дорожная карта

### Фаза A — Каркас UI (P0)

| ID | Задача |
|----|--------|
| **A1** | HTML/CSS: `#sim-dashboard`, grid 3-row + **resizer**; min dashboard **200px**; перенести tel-bar → `#dashboard-telemetry` |
| **A2** | `js/sim-mode.js`: enum, switch, **in-memory state**, `replaceState` URL |
| **A3** | Top bar: segmented control + **keyboard 1/2/3**; mobile: **«Режим ▾»** menu |
| **A4** | `SimMap.setMode` + clear layers при switch |
| **A5** | Mobile: **tab bar** (HUD / Карта / Дашборд), не swipe |
| **A6** | Dashboard layout: **timeline sticky** + scroll body (telemetry panel) |
| **A7** | **Error handling policy** (базовая): toast/inline для load errors |

**Оценка:** full-time **1–2 дня** · side-time (2–3 ч/вечер) **4–6 вечеров**.

**Acceptance фазы A (gate перед C1–C3):**

- Segmented control + пустые dashboard-панели для трёх режимов.
- Переключение режимов без поломки phone|map.
- **Скриншоты** desktop + mobile tab bar — на review пользователя.
- После подтверждения — C1–C3.

### Фаза B — Телеметрия polish (P1)

| ID | Задача | Было |
|----|--------|------|
| **B1** | T4 Replay sync: HUD follow, map-only | T4 |
| **B2** | T5 Incidents: converge_flap, gps_spike, perf_jank | T5 |
| **B3** | `js/sim-telemetry-ui.js` — вынести wiring из sim-replay | refactor |
| **B4** | T6 Export markdown | T6 |

**Оценка:** side-time **1–2 недели** (параллельно с C после gate A).

### Фаза C — Regression MVP (P0)

| ID | Задача | Было |
|----|--------|------|
| **C0** | lat/lon/dist_m в `regression_tick` | R0 |
| **C1** | `regression-parse.mjs` + `js/shared/assertions-shared.mjs` | R1, R9 |
| **C2** | Load bundle: sim-summary сразу; ticks **lazy** | R2 |
| **C3** | Matrix 5×3 + run detail + **progress** при load tick | R3 |
| **C4** | Map: MH + GH/ORS toggle + regression track | R4 |
| **C5** | Timeline sim_s + assertions panel | R5 |

**Оценка:**

| Контекст | Фаза C целиком |
|----------|----------------|
| Full-time | **3–4 рабочих дня** |
| Side-time (2–3 ч/вечер) | **8–12 вечеров (~2–3 недели)** |

| Подзадача | Side-time (ориентир) |
|-----------|----------------------|
| C0 bridge + tick fields | 1 вечер |
| C1 parse + assertions-shared | 2–3 вечера |
| C3 matrix + lazy load + UI | 2–3 вечера |
| C4 map layers + legend toggle | 1–2 вечера |
| C5 timeline sim_s | 1–2 вечера |

**Acceptance:** load `2026-07-11` → matrix 14✓/1✗ → drill `9b63130e` → fail 0.733.

### Фаза D — Regression advanced (P1–P2)

| ID | Задача | Было |
|----|--------|------|
| **D1** | Replay regression в iframe | R6 |
| **D2** | Multi-date trends | R7 |
| **D3** | Investigation export | R8 |
| **D4** | `regression:export-bundle` zip | optional |
| **D5** | T7 field vs regression compare | T7 |
| **D6** | Mobile swipe между HUD/Карта/Дашборд | optional UX |

---

## State management (in-memory, per mode)

**Не localStorage** — полевая JSONL 5–20 МБ, regression bundle до ~20 МБ суммарно.

Модуль `js/sim-mode.js` держит три слота:

```javascript
{
  synth: { /* minimal */ },
  telemetry: { parsed, fileName, pos, playing, speed, filters, selectedIncidentId, mapFitted },
  regression: { summary, bundleMeta, selectedCell, tickCache, pos, filters, loadedFixtures }
}
```

### Что сохраняется при switch режима

| Поле | Telemetry | Regression |
|------|-----------|------------|
| Parsed / summary data | ✅ | ✅ sim-summary + метаданные bundle |
| Scrub position (`pos` / `sim_s`) | ✅ | ✅ |
| Active filters | ✅ | ✅ (matrix filters) |
| Selected incident / matrix cell | ✅ | ✅ |
| Replay playing state | ❌ → pause | ❌ → pause |
| Map layer snapshot | ❌ → перерисовать из state | ❌ |
| Screenshot PNG blobs | ❌ | ❌ reload по клику |
| Tick JSONL raw text | ✅ если уже loaded | ✅ **lazy cache** по ключу `{fixtureId}_{runMode}` |
| Synth sim position / GPX | ✅ в `synth` slot | — |

### Правила вытеснения

- Новый файл JSONL / новый bundle **date** → confirm «Заменить текущую сессию?» → старый slot очищается.
- Новый tick JSONL для другой ячейки → **добавляется в tickCache**, не вытесняет другие ячейки (до лимита ~50 МБ RAM, затем LRU eviction старых ticks).
- Возврат в режим → **restore UI** из slot без re-read File (telemetry) или re-fetch tick если в cache.

### Сценарий (acceptance)

Пользователь загрузил field JSONL 40 мин, scrub t=147 s, selected incident #3 → switch Regression → load nightly → switch Telemetry → **тот же файл, t=147, incident #3**, map/track восстановлены.

---

## Производительность и lazy loading (regression)

| Данные | Когда грузится | Размер |
|--------|----------------|--------|
| `sim-summary.json` | сразу при выборе bundle | ~20–50 КБ |
| `summary.json` / fixtures (optional) | сразу или lazy per fixture | KB each |
| Tick `{fixture}_{mode}.jsonl` | **только клик по ячейке матрицы** | 100–500 КБ × 1 |
| Screenshot PNG | клик run detail | ~50–200 КБ |
| Reference polylines (GH/ORS) | клик fixture или toggle layer | cache files |

**Progress UI (не тихий спиннер):**

```
Загрузка 9b63130e · on_route … 240 KB · tick 842/842 · 1.2 s
```

При bulk folder pick — парсить только `sim-summary.json` + список имён файлов; ticks не читать.

**Ожидания по времени:** desktop 2–5 s на tick file; слабый mobile 10–30 s — progress обязателен.

---

## Error handling policy

| Ситуация | Поведение UI |
|----------|--------------|
| `sim-summary.json` invalid / missing | «Не удалось прочитать sim-summary: отсутствует поле `results`»; matrix не строится |
| Одна ячейка: tick JSONL missing | ячейка **⚠**, tooltip «файл не найден»; остальные 14 работают |
| Tick JSONL corrupt line | parse skip + «пропущено N строк»; partial timeline |
| Field JSONL не session/fix | «Формат не телеметрия: нет fix» |
| Regression tick без lat (старый run) | timeline ✅, map track «нет координат в tick (старый формат)» |
| Partial bundle (14/15 files) | matrix с ⚠ на битых ячейках |

Сообщения — **русский, без stack trace**; detail в `#sim-error-detail` (collapsible).

Реализация: фаза **A7** (базовая), полная — **C2**.

---

## URL и deep links

- Обновление query: **`history.replaceState`** при switch режима, load file, select matrix cell.
- **`pushState` не использовать** — кнопка «Назад» браузера уходит с sim.html, не между режимами.
- Параметр run mode regression: **`runMode=on_route`** (не `mode=`, чтобы не конфликтовать с `mode=regression`).

Пример после drill:

```
sim.html?mode=regression&regressionDate=2026-07-11&fixture=9b63130e&runMode=on_route
```

При switch Telemetry → Regression → Telemetry URL меняется через replaceState; история не растёт.

---

## Стратегия сборки модулей

Единый паттерн для **всех** shared parsers (как `telemetry-parse`):

| Артефакт | Назначение |
|----------|------------|
| `js/telemetry-parse.mjs` | ESM source; Node CLI import |
| `js/telemetry-parse.js` | IIFE `TelemetryParse`; browser `<script>` |
| `js/regression-parse.mjs` | ESM source; Node + re-export metrics |
| `js/regression-parse.js` | IIFE `RegressionParse`; browser |
| `js/shared/assertions-shared.mjs` | `summarizeTicks`, `evaluateMode` — **без DOM** |

**`js/shared/assertions-shared.mjs`** — единственный источник пороговой логики:

- import в `regression/playwright/lib/assertions.mjs` (re-export)
- import в `regression-parse.mjs`
- esbuild **не** бандлит shared в sim отдельно — только через `regression-parse.js`

`scripts/build-web.mjs`:

```javascript
esbuild { entry: js/regression-parse.mjs, outfile: js/regression-parse.js, format: iife, globalName: 'RegressionParse' }
```

**Не подключать `.mjs` напрямую в sim.html** — только собранные `.js` (file:// совместимость).

---

## Файловая структура (целевая)

| Файл | Назначение |
|------|------------|
| `sim.html` | layout: top / stage / dashboard; mode switch |
| `js/sim-mode.js` | режимы, **state slots**, URL replaceState, keyboard |
| `js/sim-telemetry-ui.js` | dashboard телеметрии (sticky timeline layout) |
| `js/sim-regression-ui.js` | matrix, lazy load, progress |
| `js/sim-replay.js` | replay engine (telemetry + regression ticks) |
| `js/telemetry-parse.mjs` → `.js` | полевая JSONL ✅ |
| `js/regression-parse.mjs` → `.js` | regression JSONL + metrics |
| `js/shared/assertions-shared.mjs` | summarizeTicks / evaluateMode (Node + browser via bundle) |
| `js/sim-map-module.js` | map layers по режиму |
| `js/regression-sim-bridge.js` | C0: coords in tick |

Сборка: `npm run build` → `telemetry-parse.js`, **`regression-parse.js`**, `sim-map.js`.

---

## Поведение при переключении режимов

```
User: Синтетика → Телеметрия
  1. snapshot synth slot (play state, spd)
  2. pause synthetic sim + tel replay if any
  3. SimMap.clearModeLayers(); setMode('telemetry')
  4. dashboard.show('telemetry')
  5. restore telemetry slot OR empty load prompt
  6. replaceState(?mode=telemetry&…)

User: Телеметрия → Regression
  1. snapshot telemetry slot (pos, filters, incident, parsed ref)
  2. pause replay
  3. clear telemetry map layers (data stays in slot)
  4. dashboard.show('regression'); restore regression slot
  5. replaceState(?mode=regression&…)

User: Regression → Телеметрия
  1. snapshot regression slot (selected cell, tickCache keys, pos)
  2. restore telemetry — **без re-load file**
  3. redraw map from telemetry slot

User: * → Синтетика
  1. snapshot current mode slot
  2. pause replay; clear overlay layers
  3. restore synth slot; SimMap.setMode('synth')
```

Confirm dialog только при **замене** loaded file/bundle внутри режима (v1.1 optional on page unload).

---

## Deep links и Nightly handoff

После nightly агент дописывает в `session-log.md`:

```markdown
### Sim review
sim.html?mode=regression&regressionDate=2026-07-11&fixture=9b63130e&runMode=on_route
Load folder: regression/results/2026-07-11/sim/
```

---

## Acceptance suite (сквозной)

| # | Сценарий |
|---|----------|
| 1 | Desktop: три режима, layout phone\|map + dashboard + resizer |
| 2 | **State:** telemetry load → scrub → regression → back → restore pos/incident |
| 3 | Telemetry: field JSONL 40 min, sticky timeline, snap LOST on map |
| 4 | Regression: matrix lazy load, progress text, 14✓/1✗ |
| 5 | Regression drill: `9b63130e` assertions 0.733 |
| 6 | Error: битый tick → ⚠ cell, остальное работает |
| 7 | Mobile: tab bar HUD/Карта/Дашборд; mode menu |
| 8 | Keyboard: `2` → telemetry, `←`/`→` cycle modes |
| 9 | URL: replaceState, Back leaves sim |
| 10 | `npm run build` + sim-e2e |

---

## Не делать

- Четвёртый режим / отдельные html-страницы
- Dashboard modal поверх карты на desktop
- Смешивать field JSONL и regression ticks в одном timeline
- Playwright из браузера
- Commit `regression/results/` в git
- **localStorage** для JSONL/bundle payload
- **pushState** для mode switch
- **Swipe** mobile navigation в v1

---

## Согласованный порядок работ

| Шаг | Что | Gate |
|-----|-----|------|
| **1** | Фаза **A** (каркас, mode switch, sticky layout, mobile tabs) | **Скриншоты** desktop + mobile → подтверждение пользователя |
| **2** | **C0** параллельно с A (lat/lon в regression_tick) | — |
| **3** | **C1–C3** после gate A | matrix + lazy load |
| **4** | C4–C5, B1 параллельно | regression MVP demo |

**Контекст оценок:** разработка side-time **2–3 ч/вечер**; фаза C ≈ **2–3 календарные недели**, фаза A ≈ **4–6 вечеров**.

Критерий «готово к demo»: один экран, три режима, state restore, nightly 2026-07-11 разбирается без grep.
