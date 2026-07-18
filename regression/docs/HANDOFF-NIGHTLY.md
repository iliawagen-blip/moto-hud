# Handoff: Nightly — post-Varshavka gate (1613e94)

> **Режим:** без вопросов пользователю до закрытия gates или явного stop  
> **Проект:** `C:\Users\Илья\Documents\jul26\moto-hud`  
> **Handoff:** 2026-07-18  
> **Фокус:** не сломали развязки/sim после field-фикса «ложный съезд + спам голоса + slew скорости»  
> **HEAD ожидаемый:** `1613e94`+ (`0f18377` docs ok)  
> **Лог:** `regression/results/2026-07-18/session-log.md` (создать)

---

## TL;DR

Dev залил `1613e94` после полевой телеметрии 16-51 (Варшавка / Cardo):

| Фикс | Суть |
|------|------|
| slight ramp/fork | &lt;18° / &lt;20° → не «Съезд» |
| path_diverge voice | один far + один near (не `dist/50`) |
| findNextManeuver | далёкие рампы (&gt;1.2 км) не держат HUD |
| diverge geometry | lateral 40 м + min turn 14° |
| GPS speed | slew + coast, жёстче meas |

**Задача Nightly:** прогнать gates и поймать регресс (false_reroute / pass% / interchange unit).

1. `npm run build` + `npm run interchange:test` — **P0**, должен быть OK (новые кейсы 10° / gentle arc)
2. **P0:** `npm run regression:sim:moscow -- --date 2026-07-18 --force --mode on_route` (≥90%, fr≤1)
3. **P0:** ноги с развязками/серпантином: `nw` + `south` (on_route) — ≥90%, fr≤1 каждая
4. **P1:** полный sim `npm run regression:sim -- --date 2026-07-18 --force` (≥330/348, fr on_route ≤1)
5. GH burn — **defer**
6. Код продукта **не трогать**, пока нет массового false_reroute / падения interchange-test

---

## Команды

```bash
cd C:\Users\Илья\Documents\jul26\moto-hud
git pull
npm run build
npm run interchange:test

npm run regression:sim:moscow -- --date 2026-07-18 --force --mode on_route
npm run regression:sim:russia -- --leg nw --date 2026-07-18 --force --mode on_route
npm run regression:sim:russia -- --leg south --date 2026-07-18 --force --mode on_route

# P1 если успеешь:
npm run regression:sim -- --date 2026-07-18 --force

npm run regression:rebuild-sim-summary -- --date 2026-07-18
npm run regression:report -- --date 2026-07-18
npm run regression:state
```

Session-log: таблица gate → pass/fail / false_reroute; отдельно отметить `interchange:test`.

---

## Критерии успеха

| Gate | Цель |
|------|------|
| `interchange:test` | **OK** |
| Moscow on_route | ≥ 90%, false_reroute ≤ 1 |
| nw + south on_route | каждая ≥ 90%, fr ≤ 1 |
| Full sim (P1) | ≥ 330/348; fr on_route ≤ 1 |
| vs 2026-07-15 / Russia tour | не хуже по fr; snap P2 (`good_snap` / `p95`) — копить id, не ослаблять пороги |

---

## Что смотреть в fail (польза Dev)

1. **false_reroute** — регресс offroute? не ослаблять gates
2. **«Пропали» реальные съезды** — если moscow/mkad roundabouts или south сыпятся на маневрах → возможно порог 18° жёсткий; описать fixture id в HANDOFF-TO-DEV (код не откатывать без явного P0)
3. **good_snap / p95** — известный P2 (`019f1539`, `0f6d2613`, `3142523b`, `bd7a87a4`, `cfd81eec`)
4. Speed/slew в sim обычно не видно — поле отдельно

---

## Архив (не перегонять без причины)

- Russia tour 2026-07-17: 111/116 on_route, fr=0; volga 89% snap-only — `session-russia.md`
- Moscow interchanges утро 2026-07-17: 25/26, fr=0

---

## Запрещено

- Ослаблять `false_reroute_max` / sim gates
- Откатывать `1613e94` без контрпримера + записи в HANDOFF-TO-DEV
- GH burn
- Трогать темы / finish-info / UI ради метрик

---

## Stop / DONE

1. interchange-test OK  
2. Moscow + nw + south on_route задокументированы  
3. session-log + report/state (хотя бы по прогнанным fx)  
4. Краткий апдейт `HANDOFF-TO-DEV.md` (статус post-Varshavka)

**ready to push** — только если правили код и gates зелёные (как обычно).
