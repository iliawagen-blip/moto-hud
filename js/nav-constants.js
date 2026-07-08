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
export const OFF_ROUTE_ACC_FACTOR = 1.5;
export const OFF_ROUTE_HEADING_DIVERGE_DEG = 45;
export const OFF_ROUTE_HEADING_DIVERGE_MS = 3000;
export const OFF_ROUTE_HEADING_MIN_SPD = 5;
export const REROUTE_SEED_MAX_LATERAL_M = 80;
export const REROUTE_SEED_MAX_ANGLE_DEG = 90;

/** --- Maneuver filter (направление 6) — базовые; highway в maneuver-filter --- */
export const MANEUVER_BEND_DEFAULT_DEG = 20;
export const MANEUVER_MIN_ANGLE_DEG = 12;
export const MANEUVER_COLLAPSE_SEG_M = 30;
export const MANEUVER_COLLAPSE_GAP_M = 45;
export const MANEUVER_PASSED_M = 8;
export const MANEUVER_FORK_DROP_ANGLE_DEG = 20;
export const MANEUVER_FORK_MIN_SEG_M = 200;

/** --- Route quality / compass mode (направление 13) --- */
export const ROUTE_LOW_AVG_SEG_M = 15;
export const ROUTE_LOW_MANEUVER_PER_KM = 25;

/** --- Heading fusion (направление 8) --- */
export const FUSION_GPS_WEIGHT_MIN = 0.02;
export const FUSION_GPS_WEIGHT_SPAN = 25;

/** --- Battery / render (направление 12) --- */
export const PATH_SKIP_DS_M = 2;
export const PATH_SKIP_FRAMES = 2;
export const GPS_INVALIDATE_ACC_M = 50;
export const GPS_LOST_RECONVERGE_MS = 60000;

/** --- GPS speed sanity (отображение и навигация) --- */
/** Макс. правдоподобная скорость, м/с (~198 км/ч) */
export const GPS_SPEED_MAX_MPS = 55;
/** Доверять speed от чипа только при acc ≤ этого порога, м */
export const GPS_SPEED_ACC_TRUST_M = 25;
/** Движение меньше этого при плохом acc — считаем стоянку, м */
export const GPS_SPEED_STATIONARY_DIST_M = 12;
/** Мин. смещение для расчёта meas speed, м */
export const GPS_SPEED_MEAS_MIN_DIST_M = 1.5;
/** Device speed > meas * ratio — отбрасываем показания чипа */
export const GPS_SPEED_DEVICE_MEAS_RATIO = 2.5;
