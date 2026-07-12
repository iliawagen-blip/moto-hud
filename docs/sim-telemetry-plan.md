# План: sim + разбор телеметрии

> **Superseded:** объединён в [sim-dashboard-plan.md](sim-dashboard-plan.md) — три режима, раскладка карта/телефон/дашборд.

Ниже — статус задач телеметрии (режим **Телеметрия**).

---

## Статус

| Этап | Задача | Статус |
|------|--------|--------|
| **T1** | Загрузка JSONL + session summary | ✅ |
| **T2** | Карта: трек + цвет snap | ✅ |
| **T3** | Timeline + маркеры + filters | ✅ |
| **T4** | Replay sync (HUD follow, map-only) | 🔲 P1 → фаза B1 |
| **T5** | Incidents (расширить detect) | 🔲 P1 → фаза B2 |
| **T6** | Экспорт markdown | 🔲 P2 → фаза B4 |
| **T7** | Shared parser + regression compare | 🔲 P2 → фаза D5 |

**Код:** `js/telemetry-parse.mjs`, `js/sim-replay.js`, `js/sim-map-module.js` (telemetry layers).

**UI (цель):** контент tel-bar переезжает в `#sim-dashboard` режима «Телеметрия» — см. [sim-dashboard-plan.md](sim-dashboard-plan.md).

---

## Формат

JSONL: `session` + `fix` / `snap` / `nav` / `turn` / `perf` / `sys` / `meta`.

Эталон проверки: `telemetry_2026-07-10_18-09.jsonl` (~7700 строк).
