# План: sim + Nightly regression

> **Superseded:** объединён в [sim-dashboard-plan.md](sim-dashboard-plan.md) — три режима, раскладка карта/телефон/дашборд.

Ниже — статус задач regression (режим **Regression**).

---

## Контекст 2026-07-11

- Sim **14/15** pass; fail: `9b63130e` on_route · `good_snap_ratio` 0.733 (< 0.75)
- Артефакты: `regression/results/2026-07-11/`, `regression/reports/2026-07-11/summary.md`

---

## Статус

| Этап | Задача | Статус |
|------|--------|--------|
| **R0** | lat/lon/dist_m в regression_tick | 🔲 P0 → C0 |
| **R1** | regression-parse + assertions-shared | 🔲 P0 → C1 |
| **R2** | Load nightly bundle | 🔲 P0 → C2 |
| **R3** | Matrix 5×3 | 🔲 P0 → C3 |
| **R4** | Map MH/GH/ORS + track | 🔲 P0 → C4 |
| **R5** | Timeline sim_s + assertions | 🔲 P0 → C5 |
| **R6** | Replay prepareRegressionHud | 🔲 P1 → D1 |
| **R7** | Multi-date trends | 🔲 P1 → D2 |
| **R8** | Investigation export | 🔲 P2 → D3 |
| **R9** | Shared lib report-lib | 🔲 P2 → C1 |

**UI (цель):** режим «Regression» в segmented control, dashboard = matrix + run detail — см. [sim-dashboard-plan.md](sim-dashboard-plan.md).

---

## Артефакты

```
regression/results/{date}/sim-summary.json
regression/results/{date}/sim/{fixture}_{mode}.jsonl
regression/reports/{date}/summary.json
```

Handoff: [regression/docs/HANDOFF-NIGHTLY.md](../regression/docs/HANDOFF-NIGHTLY.md).
