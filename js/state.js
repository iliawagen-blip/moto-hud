/** Глобальное состояние приложения и раскладка HUD */
export const S = {
  gps: null,
  finish: null,
  route: null,
  routeAlternatives: [],  // варианты маршрута (OSRM alternatives)
  selectedRouteIdx: 0,
  cameras: [],
  camLoadStatus: 'idle',  // idle | loading | ok | err | off
  camWarned: new Set(),
  offRouteSince: null,
  watchId: null,
  wakeLock: null,
  startTs: null,
  distDone: 0,
  lastPos: null,
  smoothedHeading: null,
  fixPos: null,
  fixAt: 0,
  measSpeed: null,
  dispSpeed: 0,
  rafId: null,
  voice: true,
  showPath: true,
  showElevProfile: true,
  elevExag: 1.8,
  elevProfileH: 72,
  elevProfileLenKm: 3,
  showCompass: false,
  cams: true,
  backOnly: true,
  tolerance: 45,
  noDirPolicy: 'skip',
  limit: 60,
  lastVoiceTs: 0,

  // Топливный ассистент (кнопка ⛽ на HUD)
  fuelStations: [],       // [{lat,lon,brand,name,osmId,status,distGps,offRoute,distAhead,aheadOnRoute}]
  fuelStatus: 'idle',     // idle | loading | ready | error
  fuelMode: 0,            // 0 выкл, 1 «по маршруту», 2 «ближайшая + маршрут»
  fuelSel: null,          // выбранная АЗС
  fuelOrigFinish: null    // финиш до перехвата ассистентом (для восстановления)
};

export const L = {
  W: 1000, H: 1600, cx: 500, land: false,
  hdgTop: 120, hdgPxPerDeg: 10, hdgHalf: 30,
  horizonY: 520,
  spX: 120, spCenterY: 820, spHalfH: 300, spPxPerKmh: 7.5,
  camFocal: 1700, camVoff: 1200,
  mnX: 820, mnSymY: 220, mnDistY: 400,
  wlY: 1380, gpsY: 1550, fontK: 1
};

export const CAM_H = 6;
export const CAM_B = 10;
export const CAM_PITCH = 22 * Math.PI / 180;
export const ROAD_MAX = 500;
export const ROAD_HALF = 4.5;
export const RUN_KEY = 'moto-hud-last-run';
export const FAV_KEY = 'moto-hud-favs';
export const ELEV_OPTS_KEY = 'moto-hud-elev-opts';
/** Усиление вертикали профиля высот по умолчанию */
export const DEFAULT_ELEV_EXAG = 1.8;
/** Высота полоски профиля в HUD, px (viewBox) */
export const DEFAULT_ELEV_PROFILE_H = 72;
export const MIN_ELEV_PROFILE_H = 36;
export const MAX_ELEV_PROFILE_H = 160;
/** Горизонтальный масштаб полоски профиля, км */
export const DEFAULT_ELEV_PROFILE_LEN_KM = 3;
export const MIN_ELEV_PROFILE_LEN_KM = 1;
export const MAX_ELEV_PROFILE_LEN_KM = 5;

// Цвета статуса наличия топлива (семантика ГдеБЕНЗ: yes/queue/low/no)
export const FUEL_COLORS = {
  yes:     '#39d353',  // есть
  queue:   '#ffd400',  // очередь
  low:     '#ff9500',  // мало
  no:      '#ff3b30',  // нет
  unknown: '#66ccff'   // нет данных о наличии — нейтральный
};
// Коридор вдоль маршрута (м): АЗС дальше него считается «не по маршруту»
export const FUEL_CORRIDOR = 600;
