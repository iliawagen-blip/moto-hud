/**
 * Пороги навигации — единый источник для A/B и калибровки harness.
 * @module nav-constants
 */

/** --- Snap-quality (направление 1) --- */
export const SNAP_QUALITY_GOOD_IN = 1.2;
export const SNAP_QUALITY_GOOD_OUT = 1.0;
export const SNAP_QUALITY_DEGRADED_IN = 2.5;
export const SNAP_QUALITY_LOST_IN = 2.5;
export const SNAP_QUALITY_DEGRADED_OUT = 2.0;
export const SNAP_QUALITY_LOST_LATERAL_M = 80;
export const SNAP_QUALITY_DEGRADED_EXIT_LATERAL_M = 60;
/**
 * Score-based LOST только при существенном lateral.
 * Иначе lat≈39 / acc≈8 → score>2.5 → sticky LOST на минуты (field 18-51).
 */
export const SNAP_QUALITY_LOST_SCORE_MIN_LATERAL_M = 55;
export const SNAP_QUALITY_ACC_FLOOR_M = 5;
export const SNAP_QUALITY_TICKS_REQUIRED = 2;
export const SNAP_QUALITY_TICK_WINDOW = 3;
export const SNAP_QUALITY_HOLD_MS = 1500;
export const SNAP_QUALITY_JUMP_DEGRADED_MS = 3000;
export const SNAP_QUALITY_JUMP_DS_M = 50;
export const SNAP_QUALITY_DEGRADED_TIMEOUT_MS = 30000;
export const SNAP_CURVATURE_RADIUS_M = 30;
export const SNAP_CURVATURE_THRESHOLD_MULT = 1.5;

/** --- Heading-gate (направление 2) --- */
export const SNAP_HEADING_ACCEPT_DEG = 45;
export const SNAP_HEADING_REJECT_DEG = 90;
export const SNAP_HEADING_GATE_MIN_SPD = 3.0;
export const SNAP_HEADING_GATE_ACC_MAX_M = 25;
export const SNAP_HEADING_MAX_AGE_MS = 3000;
export const SNAP_MIN_DOT = 0.71;

/** --- Snap inertia (направление 3) --- */
export const SNAP_WINDOW_BASE_M = 10;
export const SNAP_WINDOW_ACC_MULT = 3;
export const SNAP_WINDOW_DT_CAP_S = 2.0;
/** Ниже этой скорости snap не двигается вперёд по дуге (шум GPS). */
export const SNAP_STATIONARY_SPD_MPS = 0.6;
export const SNAP_JUMP_PENALTY = 3.0;
export const SNAP_ANGLE_PENALTY = 2;
export const SNAP_COLD_START_SKIP_FIXES = 3;
export const SNAP_REVERSE_EPS = 5;
export const SNAP_FALLBACK_BACK_M = 60;
export const SNAP_FALLBACK_FWD_M = 220;

/** --- GPS cold start (направление 4) --- */
export const GPS_CONVERGE_MIN_FIXES = 5;
export const GPS_CONVERGE_LAST3_ACC_M = 15;
export const GPS_CONVERGE_ACC_M = 20;
export const GPS_CONVERGE_RE_MIN_FIXES = 2;
export const GPS_CONVERGE_RE_ACC_M = 25;
export const GPS_CONVERGE_JUMP_PAD_M = 5;

/** --- Off-route / reroute (направление 5) --- */
export const OFF_ROUTE_ENTER_M = 50;
export const OFF_ROUTE_EXIT_M = 25;
export const OFF_ROUTE_CONFIRM_MS = 8000;
export const OFF_ROUTE_CONFIRM_MS_HIGH_SPD = 10000;
export const OFF_ROUTE_CONFIRM_DIST_M = 100;
export const OFF_ROUTE_CONFIRM_DIST_HIGH_M = 200;
export const OFF_ROUTE_HIGH_SPD_MPS = 25;
export const OFF_ROUTE_GPS_ACC_GATE_M = 30;
/**
 * Lateral-скачок без телепорта spdSrc — junk GPS (field 18-41: lat_off 500–1000 м).
 * Не входить в SUSPECT / не копить confirm.
 */
export const OFF_ROUTE_LATERAL_JUNK_M = 280;
export const OFF_ROUTE_ACC_FACTOR = 1.5;
export const OFF_ROUTE_HEADING_DIVERGE_DEG = 45;
export const OFF_ROUTE_HEADING_DIVERGE_MS = 3000;
export const OFF_ROUTE_HEADING_MIN_SPD = 5;
/** Устойчивое возвращение на маршрут (анти-дребезг lateral на пробке) */
export const OFF_ROUTE_RETURN_HOLD_MS = 2000;
/** Боковой уход «жёсткий» — reroute без heading (стоянка / пробка вечером) */
export const OFF_ROUTE_LATERAL_HARD_M = 80;
/**
 * LOST + lateral ≥ ENTER без HARD 80: field 07-00 (lat≈60, acc≈4, 2+ мин без REROUTING).
 * Множитель к confirmMs (как lateral_time ×2).
 */
export const OFF_ROUTE_LOST_HOLD_CONFIRM_MULT = 2;
/** Пауза после успешного reroute — анти-thrash (field 07-21: 6× за 4 мин) */
export const REROUTE_SUCCESS_COOLDOWN_MS = 30000;
export const REROUTE_SEED_MAX_LATERAL_M = 80;
export const REROUTE_SEED_MAX_ANGLE_DEG = 90;

/** --- Maneuver filter (направление 6) — базовые; highway в maneuver-filter --- */
export const MANEUVER_BEND_DEFAULT_DEG = 20;
export const MANEUVER_MIN_ANGLE_DEG = 12;
/** Plain left/right (не slight): field 07-21/07-25 phantom left при ang≈14° */
export const MANEUVER_TURN_MIN_ANGLE_DEG = 25;
/** Soft / end of road: не показывать за горизонтом (field 20-23 / 18-06) */
export const MANEUVER_SOFT_MAX_AHEAD_M = 500;
/** Path-diverge (развязка): окно вдоль маршрута, м */
export const INTERCHANGE_DIVERGE_MIN_M = 80;
export const INTERCHANGE_DIVERGE_MAX_M = 800;
/** Боковой уход polyline от касательной → keep L/R (field 18-13: 40м всё ещё шумел) */
export const INTERCHANGE_DIVERGE_LATERAL_M = 55;
export const INTERCHANGE_DIVERGE_STEP_M = 40;
/** Мин. смена азимута polyline на diverge — иначе пологая дуга = ложный съезд */
export const INTERCHANGE_DIVERGE_MIN_TURN_DEG = 20;
/**
 * С OSRM-hint (slight ramp / lanes): turn/lateral мягче.
 * Иначе hybrid мёртв на корпусе slight-off &lt;18° (72/81) — geom turn тоже &lt;20°.
 */
export const INTERCHANGE_DIVERGE_MIN_TURN_WITH_HINT_DEG = 12;
export const INTERCHANGE_DIVERGE_LATERAL_WITH_HINT_M = 40;
/** Не показывать path_diverge в HUD дальше этого (анти-спам на дугах) */
export const INTERCHANGE_DIVERGE_HUD_MAX_M = 450;
/**
 * Гибрид: геометрия alone не создаёт «Съезд» — нужен слабый OSRM-сигнал
 * в окне ahead (field 06-58: ложные path_diverge на дугах).
 */
export const INTERCHANGE_DIVERGE_HINT_AHEAD_M = 500;
/** |s_hint − atS_diverge| для стыковки стороны/дистанции */
export const INTERCHANGE_DIVERGE_HINT_BAND_M = 240;
/** Значимый ix ближе diverge+slack → hybrid не нужен (OSRM уже покрыл) */
export const INTERCHANGE_DIVERGE_SIG_COVER_SLACK_M = 80;
/** Телеметрия probe: не чаще чем раз в N м вдоль s */
export const INTERCHANGE_DIVERGE_PROBE_MIN_DS_M = 120;
/**
 * slight off/on ramp ниже порога = смена полосы / «прямо» (field 16-51 Варшавка ang≈10°),
 * не голос «Съезд». Реальные съезды МКАД обычно ≥18° или без slight.
 */
export const INTERCHANGE_RAMP_MIN_ANGLE_DEG = 18;
/** Голос съезда раньше обычного поворота */
export const INTERCHANGE_VOICE_FAR_MIN_M = 800;
export const INTERCHANGE_VOICE_FAR_MAX_M = 1200;
export const INTERCHANGE_VOICE_NEAR_MIN_M = 80;
export const INTERCHANGE_VOICE_NEAR_MAX_M = 220;
export const MANEUVER_COLLAPSE_SEG_M = 30;
export const MANEUVER_COLLAPSE_GAP_M = 45;
export const MANEUVER_PASSED_M = 8;

/** Дальше этого расстояния до манёвра на HUD показывается текущая улица, не улица поворота */
export const STREET_LABEL_MANEUVER_M = 400;
export const MANEUVER_FORK_DROP_ANGLE_DEG = 20;
export const MANEUVER_FORK_MIN_SEG_M = 200;

/** --- Route quality / compass mode (направление 13) --- */
export const ROUTE_LOW_AVG_SEG_M = 15;
export const ROUTE_LOW_MANEUVER_PER_KM = 25;
/** Плохой OSM: ближе этого остатка — тихий пеленг на финиш (направление 13) */
export const ROUTE_LOW_BEARING_REMAIN_M = 400;

/** --- Heading fusion (направление 8) --- */
export const FUSION_GPS_WEIGHT_MIN = 0.02;
export const FUSION_GPS_WEIGHT_SPAN = 25;

/** Задержка автокарты вне маршрута, мс */
export const OFF_ROAD_MAP_ENTER_MS = 1500;
/** Зум Leaflet во дворе / на малой скорости */
export const LOW_SPEED_MAP_ZOOM = 18;
/** Гистерезис выхода из режима карты, км/ч */
export const LOW_SPEED_MAP_EXIT_PAD_KMH = 2;
/** --- Battery / render (направление 12) --- */
export const PATH_SKIP_DS_M = 2;
export const PATH_SKIP_FRAMES = 2;
export const GPS_INVALIDATE_ACC_M = 50;
/** На стоянке (spd≈0) invalidate только при экстремальном acc (field 19-03 thrash) */
export const GPS_INVALIDATE_ACC_STATIONARY_M = 120;
export const GPS_LOST_RECONVERGE_MS = 60000;

/** --- GPS speed sanity (отображение и навигация) --- */
/** Макс. правдоподобная скорость, м/с (~198 км/ч) */
export const GPS_SPEED_MAX_MPS = 55;
/** Доверять speed от чипа только при acc ≤ этого порога, м */
export const GPS_SPEED_ACC_TRUST_M = 25;
/** Макс. дрейф GPS на стоянке (legacy / док.), м; в resolveGpsSpeed — acc×0.55 на тик */
export const GPS_SPEED_STATIONARY_DIST_M = 12;
/** Мин. смещение для расчёта meas speed, м */
export const GPS_SPEED_MEAS_MIN_DIST_M = 1.5;
/** Device speed > meas * ratio — отбрасываем показания чипа */
export const GPS_SPEED_DEVICE_MEAS_RATIO = 2.5;
/** Макс. рост/спад скорости (м/с²) — field 16-51: 0↔43 m/s после тоннеля */
export const GPS_SPEED_SLEW_UP_MPS2 = 5;
export const GPS_SPEED_SLEW_DOWN_MPS2 = 8;
/**
 * Teleport / gap: шаг больше этого — не meas (field 18-13: 3 км за тик → lat 3197).
 * Ниже — шаг/dt можно брать как скорость даже при плохом acc.
 */
export const GPS_SPEED_TELEPORT_M = 400;
/** Пологий coast при дырках GPS (field 18-13: 6 с gap, едем, spd принудительно 0) */
export const GPS_SPEED_COAST_MAX_DT_S = 8;

/** --- Динамический лимит скорости (OSM maxspeed) --- */
/** Дистанция lookahead при поиске смены лимита, м */
export const SPEED_LIMIT_LOOKAHEAD_M = 300;
/** Grace после смены зоны: не алертить превышение, мс */
export const SPEED_LIMIT_GRACE_MS = 3000;
/** Допуск над лимитом перед красной скоростью, км/ч */
export const SPEED_LIMIT_OVERSPEED_KMH = 3;
/** Голос «впереди ограничение» — не ближе, м */
export const SPEED_LIMIT_VOICE_MIN_M = 150;
/** Голос «впереди ограничение» — не дальше, м */
export const SPEED_LIMIT_VOICE_MAX_M = 250;
/** Радиус эвристики «населённый пункт» для implicit (вечер 3), м */
export const SPEED_LIMIT_URBAN_PLACE_RADIUS_M = 500;

/** --- Круговое движение --- */
/** Множитель порога lateral snap на кольце */
export const ROUNDABOUT_LATERAL_MULTIPLIER = 2.0;
/** Heading-gate на кольце, ° */
export const ROUNDABOUT_HEADING_GATE_DEG = 90;
/** Интервал обновления HUD на кольце, мс */
export const ROUNDABOUT_TICK_MS = 250;
/** Мини-круг: радиус polyline < этого — обычная стрелка */
export const ROUNDABOUT_MIN_RADIUS_M = 15;
/** Клевер/развязка: радиус > этого — обычная стрелка */
export const ROUNDABOUT_MAX_RADIUS_M = 200;
