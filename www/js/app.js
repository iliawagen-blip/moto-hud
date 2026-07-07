var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// js/theme-tokens.js
function readProp(style, name, fallback) {
  const v = style.getPropertyValue(name).trim();
  return v || fallback;
}
function readNum(style, name, fallback) {
  const v = parseFloat(readProp(style, name, String(fallback)));
  return Number.isFinite(v) ? v : fallback;
}
function invalidateThemeTokens() {
  _cache = null;
  if (typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent("themechange"));
  }
}
function getThemeTokens() {
  if (_cache) return _cache;
  const el = typeof document !== "undefined" ? document.documentElement : null;
  const style = el ? getComputedStyle(el) : null;
  const g = (n, fb) => style ? readProp(style, n, fb) : fb;
  const gn = (n, fb) => style ? readNum(style, n, fb) : fb;
  _cache = {
    bg: g("--bg", "#000000"),
    accent: g("--accent", "#ffd400"),
    line: g("--line", "#1a2332"),
    fg: g("--fg", "#ffffff"),
    fgDim: g("--fg-dim", "#8b9cb3"),
    pathEdge: g("--path-edge", "#00ff88"),
    pathFill: g("--path-fill", "#00aa5c"),
    pathFillOpacity: gn("--path-fill-opacity", 0.22),
    pathEdgeW: gn("--path-edge-w", 5),
    pathTurnScale: gn("--path-turn-scale", 1),
    pathCenterOpacity: gn("--path-center-opacity", 0.45),
    pathDash: g("--path-dash", "none"),
    pathContext: g("--path-context", g("--fg-dim", "#8b9cb3")),
    pathContextOpacity: gn("--path-context-opacity", 0.35),
    strokeW: gn("--stroke-w", 3),
    arrowStyle: g("--arrow-style", "filled"),
    arrowShape: g("--arrow-shape", "parametric"),
    compassStyle: g("--compass-style", "tape"),
    glow: g("--glow", "none"),
    glowOpacity: gn("--glow-opacity", 0),
    svgHalo: g("--svg-halo", "#000000"),
    svgBgOverlay: g("--svg-bg-overlay", "rgba(0,0,0,0.72)"),
    turnPrimary: g("--turn-primary", "#ffd400"),
    turnSecondary: g("--turn-secondary", "#00cc70"),
    semWarn: g("--sem-warn", "#FFB000"),
    semDanger: g("--sem-danger", "#E10600"),
    semOk: g("--sem-ok", "#33CC66"),
    curveYellow: g("--curve-yellow", "#FFB000"),
    curveRed: g("--curve-red", "#E10600"),
    gradeFlat: g("--grade-flat", "#00ff88"),
    gradeMid: g("--grade-mid", "#FFB000"),
    gradeSteep: g("--grade-steep", "#E10600"),
    routeStart: g("--route-start", "#33CC66"),
    routeFinish: g("--route-finish", "#ffd400"),
    routeAlt0: g("--route-alt-0", "#00ff88"),
    routeAlt1: g("--route-alt-1", "#66ccff"),
    routeAlt2: g("--route-alt-2", "#ffd400"),
    fontNum: g("--font-num", "sans-serif"),
    fontLabel: g("--font-label", "sans-serif")
  };
  return _cache;
}
function getThemeObject() {
  const t = getThemeTokens();
  return {
    bg: t.bg,
    fg: t.fg,
    dim: t.fgDim,
    accent: t.accent,
    ok: t.semOk,
    warn: t.semWarn,
    alert: t.semDanger,
    hud: t.pathEdge,
    hudDim: t.pathEdge,
    ribbonFill: t.pathFill,
    curveYellow: t.curveYellow,
    curveRed: t.curveRed,
    routeStart: t.routeStart,
    routeFinish: t.routeFinish,
    routeAlts: [t.routeAlt0, t.routeAlt1, t.routeAlt2],
    grade: { flat: t.gradeFlat, mid: t.gradeMid, steep: t.gradeSteep },
    fuel: {
      yes: t.semOk,
      queue: t.semWarn,
      low: "#ff9500",
      no: t.semDanger,
      unknown: t.routeAlt1
    }
  };
}
var _cache;
var init_theme_tokens = __esm({
  "js/theme-tokens.js"() {
    _cache = null;
  }
});

// js/theme.js
function applyThemeCss() {
  if (typeof document === "undefined") return;
  invalidateThemeTokens();
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#000";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", bg);
}
var THEME, FUEL_COLORS;
var init_theme = __esm({
  "js/theme.js"() {
    init_theme_tokens();
    init_theme_tokens();
    THEME = new Proxy({}, {
      get(_t, prop) {
        const o = getThemeObject();
        return o[prop];
      }
    });
    FUEL_COLORS = new Proxy({}, {
      get(_t, prop) {
        return getThemeObject().fuel[prop];
      }
    });
  }
});

// js/state.js
var DEFAULT_FUEL_PLANNER_COUNT, MIN_FUEL_PLANNER_COUNT, MAX_FUEL_PLANNER_COUNT, DEFAULT_CAM_SPEED_TOL, DEFAULT_PATH_CHEVRON_MAX, S, L2, CAM_H, CAM_B, CAM_PITCH, ROAD_MAX, ROAD_HALF, RUN_KEY, FAV_KEY, ELEV_OPTS_KEY, CURVE_OPTS_KEY, HUD_OPTS_KEY, APP_OPTS_KEY, DEFAULT_ELEV_EXAG, DEFAULT_ELEV_PROFILE_H, MIN_ELEV_PROFILE_H, MAX_ELEV_PROFILE_H, DEFAULT_ELEV_PROFILE_LEN_KM, MIN_ELEV_PROFILE_LEN_KM, MAX_ELEV_PROFILE_LEN_KM, FUEL_CORRIDOR;
var init_state = __esm({
  "js/state.js"() {
    init_theme();
    DEFAULT_FUEL_PLANNER_COUNT = 5;
    MIN_FUEL_PLANNER_COUNT = 1;
    MAX_FUEL_PLANNER_COUNT = 10;
    DEFAULT_CAM_SPEED_TOL = 15;
    DEFAULT_PATH_CHEVRON_MAX = 3;
    S = {
      gps: null,
      finish: null,
      route: null,
      routeAlternatives: [],
      // варианты маршрута (OSRM alternatives)
      selectedRouteIdx: 0,
      cameras: [],
      camLoadStatus: "idle",
      // idle | loading | ok | err | off
      camWarned: /* @__PURE__ */ new Set(),
      offRouteState: "ON_ROUTE",
      snapQuality: "GOOD",
      gpsConverged: false,
      gpsFixCount: 0,
      lastReliableHeadingTs: 0,
      routeQuality: "OK",
      compassMode: false,
      routerBackend: "osrm",
      rerouting: false,
      rerouteBackoffStep: 0,
      rerouteBackoffUntil: 0,
      viewMode: "hud",
      lastAppliedClipboardHash: "",
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
      showCrossingContext: true,
      showPathChevrons: true,
      pathChevronLabels: true,
      pathChevronMax: DEFAULT_PATH_CHEVRON_MAX,
      showElevProfile: true,
      elevExag: 1.8,
      elevProfileH: 72,
      elevProfileLenKm: 3,
      showCompass: false,
      cams: true,
      backOnly: true,
      tolerance: 45,
      noDirPolicy: "skip",
      limit: 60,
      /** Допуск над лимитом камеры перед тревогой, км/ч */
      camSpeedTol: DEFAULT_CAM_SPEED_TOL,
      lastVoiceTs: 0,
      curveWarn: true,
      curveStrict: "normal",
      // relaxed | normal | strict
      showFinishDist: true,
      showFinishEta: true,
      showFinishTime: true,
      /** Сколько ближайших АЗС показывать в планировщике (1–10) */
      fuelPlannerCount: DEFAULT_FUEL_PLANNER_COUNT,
      // Топливный ассистент
      fuelStations: [],
      // [{lat,lon,brand,name,osmId,status,distGps,offRoute,distAhead,aheadOnRoute}]
      fuelStatus: "idle",
      // idle | loading | ready | error
      fuelMode: 0,
      // 0 выкл, 1 «по маршруту», 2 «ближайшая + маршрут»
      fuelSel: null,
      // выбранная АЗС
      fuelOrigFinish: null
      // финиш до перехвата ассистентом (для восстановления)
    };
    L2 = {
      W: 1e3,
      H: 1600,
      roadH: 1600,
      cx: 500,
      land: false,
      hdgTop: 120,
      hdgPxPerDeg: 10,
      hdgHalf: 30,
      horizonY: 520,
      spX: 120,
      spCenterY: 820,
      spHalfH: 300,
      spPxPerKmh: 7.5,
      camFocal: 1700,
      camVoff: 1200,
      mnX: 820,
      mnSymY: 220,
      mnDistY: 400,
      wlY: 1380,
      gpsY: 1550,
      fontK: 1
    };
    CAM_H = 6;
    CAM_B = 10;
    CAM_PITCH = 22 * Math.PI / 180;
    ROAD_MAX = 500;
    ROAD_HALF = 4.5;
    RUN_KEY = "moto-hud-last-run";
    FAV_KEY = "moto-hud-favs";
    ELEV_OPTS_KEY = "moto-hud-elev-opts";
    CURVE_OPTS_KEY = "moto-hud-curve-opts";
    HUD_OPTS_KEY = "moto-hud-hud-opts";
    APP_OPTS_KEY = "moto-hud-app-opts";
    DEFAULT_ELEV_EXAG = 1.8;
    DEFAULT_ELEV_PROFILE_H = 72;
    MIN_ELEV_PROFILE_H = 36;
    MAX_ELEV_PROFILE_H = 160;
    DEFAULT_ELEV_PROFILE_LEN_KM = 3;
    MIN_ELEV_PROFILE_LEN_KM = 1;
    MAX_ELEV_PROFILE_LEN_KM = 5;
    FUEL_CORRIDOR = 600;
  }
});

// js/geo.js
function haversine(a, b) {
  const R = 6371e3, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const s2 = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s2), Math.sqrt(1 - s2));
}
function bearing(a, b) {
  const r = Math.PI / 180, d = 180 / Math.PI;
  const f1 = a.lat * r, f2 = b.lat * r, dl = (b.lon - a.lon) * r;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return (Math.atan2(y, x) * d + 360) % 360;
}
function distToSegment(p, a, b) {
  const r = Math.PI / 180;
  const ax = a.lon * r * Math.cos(a.lat * r), ay = a.lat * r;
  const bx = b.lon * r * Math.cos(b.lat * r), by = b.lat * r;
  const px = p.lon * r * Math.cos(p.lat * r), py = p.lat * r;
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  const cx = ax + t * dx, cy = ay + t * dy;
  const dLat = py - cy, dLon = (px - cx) / Math.cos(p.lat * r || 1);
  return Math.sqrt(dLat * dLat + dLon * dLon) * 6371e3;
}
function angleDiff(a, b) {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
function destPoint(from, brgDeg, distM) {
  const r = Math.PI / 180;
  const br = brgDeg * r;
  const d = distM / 6371e3;
  const lat1 = from.lat * r;
  const lon1 = from.lon * r;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(br) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );
  return { lat: lat2 / r, lon: lon2 / r };
}
function parseInput(raw) {
  const s2 = String(raw || "").trim();
  if (!s2) return null;
  const coord = s2.match(/(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)/);
  if (coord) return { lat: parseFloat(coord[1]), lon: parseFloat(coord[2]), label: "\u041A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u044B" };
  const ll = s2.match(/[?&]ll=(-?\d+\.\d+)%2C(-?\d+\.\d+)/i) || s2.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/i);
  if (ll) return { lat: parseFloat(ll[1]), lon: parseFloat(ll[2]), label: "\u042F\u043D\u0434\u0435\u043A\u0441" };
  const pt = s2.match(/[?&]pt=(-?\d+\.\d+)%2C(-?\d+\.\d+)/i) || s2.match(/[?&]pt=(-?\d+\.\d+),(-?\d+\.\d+)/i);
  if (pt) return { lat: parseFloat(pt[2]), lon: parseFloat(pt[1]), label: "\u042F\u043D\u0434\u0435\u043A\u0441 pt" };
  const at = s2.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lon: parseFloat(at[2]), label: "Google" };
  return null;
}
var init_geo = __esm({
  "js/geo.js"() {
  }
});

// js/util.js
function fmtClock(d) {
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
function fmtTime(sec) {
  const m = Math.floor(sec / 60), s2 = Math.floor(sec % 60);
  return m + ":" + String(s2).padStart(2, "0");
}
function fmtRemainDur(sec) {
  if (!isFinite(sec) || sec < 0) return "\u2014";
  sec = Math.round(sec);
  if (sec < 60) return sec + " \u0441\u0435\u043A";
  const m = Math.round(sec / 60);
  if (m < 60) return m + " \u043C\u0438\u043D";
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? h + " \u0447 " + rm + " \u043C\u0438\u043D" : h + " \u0447";
}
function escapeHtml(s2) {
  return String(s2 || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}
var $;
var init_util = __esm({
  "js/util.js"() {
    $ = (id) => document.getElementById(id);
  }
});

// node_modules/@capacitor/core/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  Capacitor: () => Capacitor,
  CapacitorCookies: () => CapacitorCookies,
  CapacitorException: () => CapacitorException,
  CapacitorHttp: () => CapacitorHttp,
  ExceptionCode: () => ExceptionCode,
  WebPlugin: () => WebPlugin,
  WebView: () => WebView,
  buildRequestInit: () => buildRequestInit,
  registerPlugin: () => registerPlugin
});
var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, WebPlugin, WebView, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp;
var init_dist = __esm({
  "node_modules/@capacitor/core/dist/index.js"() {
    (function(ExceptionCode2) {
      ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
      ExceptionCode2["Unavailable"] = "UNAVAILABLE";
    })(ExceptionCode || (ExceptionCode = {}));
    CapacitorException = class extends Error {
      constructor(message, code, data) {
        super(message);
        this.message = message;
        this.code = code;
        this.data = data;
      }
    };
    getPlatformId = (win) => {
      var _a, _b;
      if (win === null || win === void 0 ? void 0 : win.androidBridge) {
        return "android";
      } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
        return "ios";
      } else {
        return "web";
      }
    };
    createCapacitor = (win) => {
      const capCustomPlatform = win.CapacitorCustomPlatform || null;
      const cap = win.Capacitor || {};
      const Plugins = cap.Plugins = cap.Plugins || {};
      const getPlatform = () => {
        return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
      };
      const isNativePlatform = () => getPlatform() !== "web";
      const isPluginAvailable = (pluginName) => {
        const plugin = registeredPlugins.get(pluginName);
        if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
          return true;
        }
        if (getPluginHeader(pluginName)) {
          return true;
        }
        return false;
      };
      const getPluginHeader = (pluginName) => {
        var _a;
        return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
      };
      const handleError = (err) => win.console.error(err);
      const registeredPlugins = /* @__PURE__ */ new Map();
      const registerPlugin2 = (pluginName, jsImplementations = {}) => {
        const registeredPlugin = registeredPlugins.get(pluginName);
        if (registeredPlugin) {
          console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
          return registeredPlugin.proxy;
        }
        const platform = getPlatform();
        const pluginHeader = getPluginHeader(pluginName);
        let jsImplementation;
        const loadPluginImplementation = async () => {
          if (!jsImplementation && platform in jsImplementations) {
            jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
          } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
            jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
          }
          return jsImplementation;
        };
        const createPluginMethod = (impl, prop) => {
          var _a, _b;
          if (pluginHeader) {
            const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
            if (methodHeader) {
              if (methodHeader.rtype === "promise") {
                return (options) => cap.nativePromise(pluginName, prop.toString(), options);
              } else {
                return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
              }
            } else if (impl) {
              return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
            }
          } else if (impl) {
            return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
          } else {
            throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
          }
        };
        const createPluginMethodWrapper = (prop) => {
          let remove;
          const wrapper = (...args) => {
            const p = loadPluginImplementation().then((impl) => {
              const fn = createPluginMethod(impl, prop);
              if (fn) {
                const p2 = fn(...args);
                remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                return p2;
              } else {
                throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
              }
            });
            if (prop === "addListener") {
              p.remove = async () => remove();
            }
            return p;
          };
          wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
          Object.defineProperty(wrapper, "name", {
            value: prop,
            writable: false,
            configurable: false
          });
          return wrapper;
        };
        const addListener = createPluginMethodWrapper("addListener");
        const removeListener = createPluginMethodWrapper("removeListener");
        const addListenerNative = (eventName, callback) => {
          const call = addListener({ eventName }, callback);
          const remove = async () => {
            const callbackId = await call;
            removeListener({
              eventName,
              callbackId
            }, callback);
          };
          const p = new Promise((resolve) => call.then(() => resolve({ remove })));
          p.remove = async () => {
            console.warn(`Using addListener() without 'await' is deprecated.`);
            await remove();
          };
          return p;
        };
        const proxy = new Proxy({}, {
          get(_, prop) {
            switch (prop) {
              // https://github.com/facebook/react/issues/20030
              case "$$typeof":
                return void 0;
              case "toJSON":
                return () => ({});
              case "addListener":
                return pluginHeader ? addListenerNative : addListener;
              case "removeListener":
                return removeListener;
              default:
                return createPluginMethodWrapper(prop);
            }
          }
        });
        Plugins[pluginName] = proxy;
        registeredPlugins.set(pluginName, {
          name: pluginName,
          proxy,
          platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
        });
        return proxy;
      };
      if (!cap.convertFileSrc) {
        cap.convertFileSrc = (filePath) => filePath;
      }
      cap.getPlatform = getPlatform;
      cap.handleError = handleError;
      cap.isNativePlatform = isNativePlatform;
      cap.isPluginAvailable = isPluginAvailable;
      cap.registerPlugin = registerPlugin2;
      cap.Exception = CapacitorException;
      cap.DEBUG = !!cap.DEBUG;
      cap.isLoggingEnabled = !!cap.isLoggingEnabled;
      return cap;
    };
    initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
    Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
    registerPlugin = Capacitor.registerPlugin;
    WebPlugin = class {
      constructor() {
        this.listeners = {};
        this.retainedEventArguments = {};
        this.windowListeners = {};
      }
      addListener(eventName, listenerFunc) {
        let firstListener = false;
        const listeners = this.listeners[eventName];
        if (!listeners) {
          this.listeners[eventName] = [];
          firstListener = true;
        }
        this.listeners[eventName].push(listenerFunc);
        const windowListener = this.windowListeners[eventName];
        if (windowListener && !windowListener.registered) {
          this.addWindowListener(windowListener);
        }
        if (firstListener) {
          this.sendRetainedArgumentsForEvent(eventName);
        }
        const remove = async () => this.removeListener(eventName, listenerFunc);
        const p = Promise.resolve({ remove });
        return p;
      }
      async removeAllListeners() {
        this.listeners = {};
        for (const listener in this.windowListeners) {
          this.removeWindowListener(this.windowListeners[listener]);
        }
        this.windowListeners = {};
      }
      notifyListeners(eventName, data, retainUntilConsumed) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
          if (retainUntilConsumed) {
            let args = this.retainedEventArguments[eventName];
            if (!args) {
              args = [];
            }
            args.push(data);
            this.retainedEventArguments[eventName] = args;
          }
          return;
        }
        listeners.forEach((listener) => listener(data));
      }
      hasListeners(eventName) {
        var _a;
        return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
      }
      registerWindowListener(windowEventName, pluginEventName) {
        this.windowListeners[pluginEventName] = {
          registered: false,
          windowEventName,
          pluginEventName,
          handler: (event) => {
            this.notifyListeners(pluginEventName, event);
          }
        };
      }
      unimplemented(msg = "not implemented") {
        return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
      }
      unavailable(msg = "not available") {
        return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
      }
      async removeListener(eventName, listenerFunc) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
          return;
        }
        const index = listeners.indexOf(listenerFunc);
        this.listeners[eventName].splice(index, 1);
        if (!this.listeners[eventName].length) {
          this.removeWindowListener(this.windowListeners[eventName]);
        }
      }
      addWindowListener(handle) {
        window.addEventListener(handle.windowEventName, handle.handler);
        handle.registered = true;
      }
      removeWindowListener(handle) {
        if (!handle) {
          return;
        }
        window.removeEventListener(handle.windowEventName, handle.handler);
        handle.registered = false;
      }
      sendRetainedArgumentsForEvent(eventName) {
        const args = this.retainedEventArguments[eventName];
        if (!args) {
          return;
        }
        delete this.retainedEventArguments[eventName];
        args.forEach((arg) => {
          this.notifyListeners(eventName, arg);
        });
      }
    };
    WebView = /* @__PURE__ */ registerPlugin("WebView");
    encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
    decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
    CapacitorCookiesPluginWeb = class extends WebPlugin {
      async getCookies() {
        const cookies = document.cookie;
        const cookieMap = {};
        cookies.split(";").forEach((cookie) => {
          if (cookie.length <= 0)
            return;
          let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
          key = decode(key).trim();
          value = decode(value).trim();
          cookieMap[key] = value;
        });
        return cookieMap;
      }
      async setCookie(options) {
        try {
          const encodedKey = encode(options.key);
          const encodedValue = encode(options.value);
          const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
          const path = (options.path || "/").replace("path=", "");
          const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
          document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async deleteCookie(options) {
        try {
          document.cookie = `${options.key}=; Max-Age=0`;
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async clearCookies() {
        try {
          const cookies = document.cookie.split(";") || [];
          for (const cookie of cookies) {
            document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async clearAllCookies() {
        try {
          await this.clearCookies();
        } catch (error) {
          return Promise.reject(error);
        }
      }
    };
    CapacitorCookies = registerPlugin("CapacitorCookies", {
      web: () => new CapacitorCookiesPluginWeb()
    });
    readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result;
        resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
    normalizeHttpHeaders = (headers = {}) => {
      const originalKeys = Object.keys(headers);
      const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
      const normalized = loweredKeys.reduce((acc, key, index) => {
        acc[key] = headers[originalKeys[index]];
        return acc;
      }, {});
      return normalized;
    };
    buildUrlParams = (params, shouldEncode = true) => {
      if (!params)
        return null;
      const output = Object.entries(params).reduce((accumulator, entry) => {
        const [key, value] = entry;
        let encodedValue;
        let item;
        if (Array.isArray(value)) {
          item = "";
          value.forEach((str) => {
            encodedValue = shouldEncode ? encodeURIComponent(str) : str;
            item += `${key}=${encodedValue}&`;
          });
          item.slice(0, -1);
        } else {
          encodedValue = shouldEncode ? encodeURIComponent(value) : value;
          item = `${key}=${encodedValue}`;
        }
        return `${accumulator}&${item}`;
      }, "");
      return output.substr(1);
    };
    buildRequestInit = (options, extra = {}) => {
      const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
      const headers = normalizeHttpHeaders(options.headers);
      const type = headers["content-type"] || "";
      if (typeof options.data === "string") {
        output.body = options.data;
      } else if (type.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(options.data || {})) {
          params.set(key, value);
        }
        output.body = params.toString();
      } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
        const form = new FormData();
        if (options.data instanceof FormData) {
          options.data.forEach((value, key) => {
            form.append(key, value);
          });
        } else {
          for (const key of Object.keys(options.data)) {
            form.append(key, options.data[key]);
          }
        }
        output.body = form;
        const headers2 = new Headers(output.headers);
        headers2.delete("content-type");
        output.headers = headers2;
      } else if (type.includes("application/json") || typeof options.data === "object") {
        output.body = JSON.stringify(options.data);
      }
      return output;
    };
    CapacitorHttpPluginWeb = class extends WebPlugin {
      /**
       * Perform an Http request given a set of options
       * @param options Options to build the HTTP request
       */
      async request(options) {
        const requestInit = buildRequestInit(options, options.webFetchExtra);
        const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
        const url = urlParams ? `${options.url}?${urlParams}` : options.url;
        const response = await fetch(url, requestInit);
        const contentType = response.headers.get("content-type") || "";
        let { responseType = "text" } = response.ok ? options : {};
        if (contentType.includes("application/json")) {
          responseType = "json";
        }
        let data;
        let blob;
        switch (responseType) {
          case "arraybuffer":
          case "blob":
            blob = await response.blob();
            data = await readBlobAsBase64(blob);
            break;
          case "json":
            data = await response.json();
            break;
          case "document":
          case "text":
          default:
            data = await response.text();
        }
        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        return {
          data,
          headers,
          status: response.status,
          url: response.url
        };
      }
      /**
       * Perform an Http GET request given a set of options
       * @param options Options to build the HTTP request
       */
      async get(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
      }
      /**
       * Perform an Http POST request given a set of options
       * @param options Options to build the HTTP request
       */
      async post(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
      }
      /**
       * Perform an Http PUT request given a set of options
       * @param options Options to build the HTTP request
       */
      async put(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
      }
      /**
       * Perform an Http PATCH request given a set of options
       * @param options Options to build the HTTP request
       */
      async patch(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
      }
      /**
       * Perform an Http DELETE request given a set of options
       * @param options Options to build the HTTP request
       */
      async delete(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
      }
    };
    CapacitorHttp = registerPlugin("CapacitorHttp", {
      web: () => new CapacitorHttpPluginWeb()
    });
  }
});

// js/platform.js
function isSim() {
  return !!window.__SIM__;
}
function isNative() {
  return Capacitor.isNativePlatform() && !isSim();
}
function isAndroidNative() {
  return isNative() && Capacitor.getPlatform() === "android";
}
var init_platform = __esm({
  "js/platform.js"() {
    init_dist();
  }
});

// node_modules/@capacitor/synapse/dist/synapse.mjs
function s(t) {
  t.CapacitorUtils.Synapse = new Proxy(
    {},
    {
      get(e, n) {
        return new Proxy({}, {
          get(w, o) {
            return (c, p, r) => {
              const i = t.Capacitor.Plugins[n];
              if (i === void 0) {
                r(new Error(`Capacitor plugin ${n} not found`));
                return;
              }
              if (typeof i[o] != "function") {
                r(new Error(`Method ${o} not found in Capacitor plugin ${n}`));
                return;
              }
              (async () => {
                try {
                  const a = await i[o](c);
                  p(a);
                } catch (a) {
                  r(a);
                }
              })();
            };
          }
        });
      }
    }
  );
}
function u(t) {
  t.CapacitorUtils.Synapse = new Proxy(
    {},
    {
      get(e, n) {
        return t.cordova.plugins[n];
      }
    }
  );
}
function f(t = false) {
  typeof window > "u" || (window.CapacitorUtils = window.CapacitorUtils || {}, window.Capacitor !== void 0 && !t ? s(window) : window.cordova !== void 0 && u(window));
}
var init_synapse = __esm({
  "node_modules/@capacitor/synapse/dist/synapse.mjs"() {
  }
});

// node_modules/@capacitor/geolocation/dist/esm/definitions.js
var init_definitions = __esm({
  "node_modules/@capacitor/geolocation/dist/esm/definitions.js"() {
  }
});

// node_modules/@capacitor/geolocation/dist/esm/web.js
var web_exports = {};
__export(web_exports, {
  Geolocation: () => Geolocation,
  GeolocationWeb: () => GeolocationWeb
});
var GeolocationWeb, Geolocation;
var init_web = __esm({
  "node_modules/@capacitor/geolocation/dist/esm/web.js"() {
    init_dist();
    GeolocationWeb = class extends WebPlugin {
      async getCurrentPosition(options) {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition((pos) => {
            resolve(pos);
          }, (err) => {
            reject(err);
          }, Object.assign({ enableHighAccuracy: false, timeout: 1e4, maximumAge: 0 }, options));
        });
      }
      async watchPosition(options, callback) {
        const id = navigator.geolocation.watchPosition((pos) => {
          callback(pos);
        }, (err) => {
          callback(null, err);
        }, Object.assign({ enableHighAccuracy: false, timeout: 1e4, maximumAge: 0, minimumUpdateInterval: 5e3 }, options));
        return `${id}`;
      }
      async clearWatch(options) {
        navigator.geolocation.clearWatch(parseInt(options.id, 10));
      }
      async checkPermissions() {
        if (typeof navigator === "undefined" || !navigator.permissions) {
          throw this.unavailable("Permissions API not available in this browser");
        }
        const permission = await navigator.permissions.query({
          name: "geolocation"
        });
        return { location: permission.state, coarseLocation: permission.state };
      }
      async requestPermissions() {
        throw this.unimplemented("Not implemented on web.");
      }
    };
    Geolocation = new GeolocationWeb();
  }
});

// node_modules/@capacitor/geolocation/dist/esm/index.js
var Geolocation2;
var init_esm = __esm({
  "node_modules/@capacitor/geolocation/dist/esm/index.js"() {
    init_dist();
    init_synapse();
    init_definitions();
    Geolocation2 = registerPlugin("Geolocation", {
      web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.GeolocationWeb())
    });
    f();
  }
});

// node_modules/@capacitor/local-notifications/dist/esm/definitions.js
var Weekday;
var init_definitions2 = __esm({
  "node_modules/@capacitor/local-notifications/dist/esm/definitions.js"() {
    (function(Weekday2) {
      Weekday2[Weekday2["Sunday"] = 1] = "Sunday";
      Weekday2[Weekday2["Monday"] = 2] = "Monday";
      Weekday2[Weekday2["Tuesday"] = 3] = "Tuesday";
      Weekday2[Weekday2["Wednesday"] = 4] = "Wednesday";
      Weekday2[Weekday2["Thursday"] = 5] = "Thursday";
      Weekday2[Weekday2["Friday"] = 6] = "Friday";
      Weekday2[Weekday2["Saturday"] = 7] = "Saturday";
    })(Weekday || (Weekday = {}));
  }
});

// node_modules/@capacitor/local-notifications/dist/esm/web.js
var web_exports2 = {};
__export(web_exports2, {
  LocalNotificationsWeb: () => LocalNotificationsWeb
});
var LocalNotificationsWeb;
var init_web2 = __esm({
  "node_modules/@capacitor/local-notifications/dist/esm/web.js"() {
    init_dist();
    LocalNotificationsWeb = class extends WebPlugin {
      constructor() {
        super(...arguments);
        this.pending = [];
        this.deliveredNotifications = [];
        this.hasNotificationSupport = () => {
          if (!("Notification" in window) || !Notification.requestPermission) {
            return false;
          }
          if (Notification.permission !== "granted") {
            try {
              new Notification("");
            } catch (e) {
              if (e.name == "TypeError") {
                return false;
              }
            }
          }
          return true;
        };
      }
      async getDeliveredNotifications() {
        const deliveredSchemas = [];
        for (const notification of this.deliveredNotifications) {
          const deliveredSchema = {
            title: notification.title,
            id: parseInt(notification.tag),
            body: notification.body
          };
          deliveredSchemas.push(deliveredSchema);
        }
        return {
          notifications: deliveredSchemas
        };
      }
      async removeDeliveredNotifications(delivered) {
        for (const toRemove of delivered.notifications) {
          const found = this.deliveredNotifications.find((n) => n.tag === String(toRemove.id));
          found === null || found === void 0 ? void 0 : found.close();
          this.deliveredNotifications = this.deliveredNotifications.filter(() => !found);
        }
      }
      async removeAllDeliveredNotifications() {
        for (const notification of this.deliveredNotifications) {
          notification.close();
        }
        this.deliveredNotifications = [];
      }
      async createChannel() {
        throw this.unimplemented("Not implemented on web.");
      }
      async deleteChannel() {
        throw this.unimplemented("Not implemented on web.");
      }
      async listChannels() {
        throw this.unimplemented("Not implemented on web.");
      }
      async schedule(options) {
        if (!this.hasNotificationSupport()) {
          throw this.unavailable("Notifications not supported in this browser.");
        }
        for (const notification of options.notifications) {
          this.sendNotification(notification);
        }
        return {
          notifications: options.notifications.map((notification) => ({
            id: notification.id
          }))
        };
      }
      async getPending() {
        return {
          notifications: this.pending
        };
      }
      async registerActionTypes() {
        throw this.unimplemented("Not implemented on web.");
      }
      async cancel(pending) {
        this.pending = this.pending.filter((notification) => !pending.notifications.find((n) => n.id === notification.id));
      }
      async areEnabled() {
        const { display } = await this.checkPermissions();
        return {
          value: display === "granted"
        };
      }
      async changeExactNotificationSetting() {
        throw this.unimplemented("Not implemented on web.");
      }
      async checkExactNotificationSetting() {
        throw this.unimplemented("Not implemented on web.");
      }
      async requestPermissions() {
        if (!this.hasNotificationSupport()) {
          throw this.unavailable("Notifications not supported in this browser.");
        }
        const display = this.transformNotificationPermission(await Notification.requestPermission());
        return { display };
      }
      async checkPermissions() {
        if (!this.hasNotificationSupport()) {
          throw this.unavailable("Notifications not supported in this browser.");
        }
        const display = this.transformNotificationPermission(Notification.permission);
        return { display };
      }
      transformNotificationPermission(permission) {
        switch (permission) {
          case "granted":
            return "granted";
          case "denied":
            return "denied";
          default:
            return "prompt";
        }
      }
      sendPending() {
        var _a;
        const toRemove = [];
        const now = (/* @__PURE__ */ new Date()).getTime();
        for (const notification of this.pending) {
          if (((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) && notification.schedule.at.getTime() <= now) {
            this.buildNotification(notification);
            toRemove.push(notification);
          }
        }
        this.pending = this.pending.filter((notification) => !toRemove.find((n) => n === notification));
      }
      sendNotification(notification) {
        var _a;
        if ((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) {
          const diff = notification.schedule.at.getTime() - (/* @__PURE__ */ new Date()).getTime();
          this.pending.push(notification);
          setTimeout(() => {
            this.sendPending();
          }, diff);
          return;
        }
        this.buildNotification(notification);
      }
      buildNotification(notification) {
        const localNotification = new Notification(notification.title, {
          body: notification.body,
          tag: String(notification.id)
        });
        localNotification.addEventListener("click", this.onClick.bind(this, notification), false);
        localNotification.addEventListener("show", this.onShow.bind(this, notification), false);
        localNotification.addEventListener("close", () => {
          this.deliveredNotifications = this.deliveredNotifications.filter(() => !this);
        }, false);
        this.deliveredNotifications.push(localNotification);
        return localNotification;
      }
      onClick(notification) {
        const data = {
          actionId: "tap",
          notification
        };
        this.notifyListeners("localNotificationActionPerformed", data);
      }
      onShow(notification) {
        this.notifyListeners("localNotificationReceived", notification);
      }
    };
  }
});

// node_modules/@capacitor/local-notifications/dist/esm/index.js
var LocalNotifications;
var init_esm2 = __esm({
  "node_modules/@capacitor/local-notifications/dist/esm/index.js"() {
    init_dist();
    init_definitions2();
    LocalNotifications = registerPlugin("LocalNotifications", {
      web: () => Promise.resolve().then(() => (init_web2(), web_exports2)).then((m) => new m.LocalNotificationsWeb())
    });
  }
});

// js/native-gps.js
function mapCapPosition(pos) {
  const c = pos.coords;
  const fix = {
    lat: c.latitude,
    lon: c.longitude,
    speed: c.speed != null && !isNaN(c.speed) && c.speed >= 0 ? c.speed : null,
    heading: c.heading == null || isNaN(c.heading) ? null : c.heading,
    acc: c.accuracy,
    ts: pos.timestamp
  };
  return tagFixQuality(fix);
}
function mapBgLocation(loc) {
  const fix = {
    lat: loc.latitude,
    lon: loc.longitude,
    speed: loc.speed != null && !isNaN(loc.speed) && loc.speed >= 0 ? loc.speed : null,
    heading: loc.bearing == null || isNaN(loc.bearing) ? null : loc.bearing,
    acc: loc.accuracy,
    ts: loc.time,
    provider: loc.provider || null
  };
  return tagFixQuality(fix);
}
function tagFixQuality(fix) {
  const acc = fix.acc;
  if (acc == null) return fix;
  if (acc > 80 || fix.provider === "network") fix.provider = "network";
  else if (acc > 40) fix.lowAccuracy = true;
  return fix;
}
async function ensureNativePermissions(forNavigation) {
  const geo = await Geolocation2.requestPermissions();
  if (geo.location === "denied" || geo.location === "prompt-with-rationale") {
    throw new Error("\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u0433\u0435\u043E\u043B\u043E\u043A\u0430\u0446\u0438\u0438");
  }
  if (forNavigation && isAndroidNative()) {
    try {
      await LocalNotifications.requestPermissions();
    } catch (e) {
    }
  }
}
async function startSetupGps(onFix, onError) {
  await stopSetupGps();
  await ensureNativePermissions(false);
  setupWatchId = await Geolocation2.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 15e3,
      maximumAge: 1e3
    },
    (pos, err) => {
      if (err) {
        onError(err);
        return;
      }
      if (pos) onFix(mapCapPosition(pos));
    }
  );
}
async function stopSetupGps() {
  if (setupWatchId) {
    try {
      await Geolocation2.clearWatch({ id: setupWatchId });
    } catch (e) {
    }
    setupWatchId = null;
  }
}
async function startNavGps(onFix, onError) {
  await stopNavGps();
  await stopSetupGps();
  await ensureNativePermissions(true);
  navWatcherId = await BackgroundGeolocation.addWatcher(
    {
      backgroundTitle: "\u041C\u043E\u0442\u043E \u0418\u041B\u0421 \u2014 \u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F",
      backgroundMessage: "\u041D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F \u0430\u043A\u0442\u0438\u0432\u043D\u0430. \u041D\u0435 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u0439\u0442\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435.",
      requestPermissions: false,
      stale: false,
      distanceFilter: 0
    },
    (location2, error) => {
      if (error) {
        if (error.code === "NOT_AUTHORIZED") {
          onError(new Error("\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u0433\u0435\u043E\u043B\u043E\u043A\u0430\u0446\u0438\u0438"));
          BackgroundGeolocation.openSettings?.();
        } else {
          onError(error);
        }
        return;
      }
      if (location2) onFix(mapBgLocation(location2));
    }
  );
}
async function stopNavGps() {
  if (navWatcherId) {
    try {
      await BackgroundGeolocation.removeWatcher({ id: navWatcherId });
    } catch (e) {
    }
    navWatcherId = null;
  }
}
var BackgroundGeolocation, setupWatchId, navWatcherId;
var init_native_gps = __esm({
  "js/native-gps.js"() {
    init_esm();
    init_esm2();
    init_dist();
    init_platform();
    BackgroundGeolocation = registerPlugin("BackgroundGeolocation");
    setupWatchId = null;
    navWatcherId = null;
  }
});

// js/nav-constants.js
var SNAP_QUALITY_GOOD_OUT, SNAP_QUALITY_DEGRADED_IN, SNAP_QUALITY_LOST_IN, SNAP_QUALITY_DEGRADED_OUT, SNAP_QUALITY_LOST_LATERAL_M, SNAP_QUALITY_DEGRADED_EXIT_LATERAL_M, SNAP_QUALITY_ACC_FLOOR_M, SNAP_QUALITY_TICKS_REQUIRED, SNAP_QUALITY_TICK_WINDOW, SNAP_QUALITY_JUMP_DEGRADED_MS, SNAP_QUALITY_JUMP_DS_M, SNAP_QUALITY_DEGRADED_TIMEOUT_MS, SNAP_CURVATURE_RADIUS_M, SNAP_CURVATURE_THRESHOLD_MULT, SNAP_HEADING_ACCEPT_DEG, SNAP_HEADING_REJECT_DEG, SNAP_HEADING_GATE_MIN_SPD, SNAP_HEADING_GATE_ACC_MAX_M, SNAP_HEADING_MAX_AGE_MS, SNAP_MIN_DOT, SNAP_WINDOW_BASE_M, SNAP_WINDOW_ACC_MULT, SNAP_WINDOW_DT_CAP_S, SNAP_JUMP_PENALTY, SNAP_ANGLE_PENALTY, SNAP_COLD_START_SKIP_FIXES, SNAP_REVERSE_EPS, SNAP_FALLBACK_BACK_M, SNAP_FALLBACK_FWD_M, GPS_CONVERGE_MIN_FIXES, GPS_CONVERGE_LAST3_ACC_M, GPS_CONVERGE_ACC_M, GPS_CONVERGE_RE_MIN_FIXES, GPS_CONVERGE_RE_ACC_M, GPS_CONVERGE_JUMP_PAD_M, OFF_ROUTE_ENTER_M, OFF_ROUTE_EXIT_M, OFF_ROUTE_CONFIRM_MS, OFF_ROUTE_CONFIRM_MS_HIGH_SPD, OFF_ROUTE_CONFIRM_DIST_M, OFF_ROUTE_CONFIRM_DIST_HIGH_M, OFF_ROUTE_HIGH_SPD_MPS, OFF_ROUTE_GPS_ACC_GATE_M, OFF_ROUTE_ACC_FACTOR, OFF_ROUTE_HEADING_DIVERGE_DEG, OFF_ROUTE_HEADING_DIVERGE_MS, OFF_ROUTE_HEADING_MIN_SPD, REROUTE_SEED_MAX_LATERAL_M, REROUTE_SEED_MAX_ANGLE_DEG, MANEUVER_BEND_DEFAULT_DEG, MANEUVER_MIN_ANGLE_DEG, MANEUVER_COLLAPSE_SEG_M, MANEUVER_COLLAPSE_GAP_M, MANEUVER_PASSED_M, MANEUVER_FORK_DROP_ANGLE_DEG, MANEUVER_FORK_MIN_SEG_M, ROUTE_LOW_AVG_SEG_M, ROUTE_LOW_MANEUVER_PER_KM, FUSION_GPS_WEIGHT_MIN, FUSION_GPS_WEIGHT_SPAN, PATH_SKIP_DS_M, PATH_SKIP_FRAMES, GPS_INVALIDATE_ACC_M, GPS_LOST_RECONVERGE_MS;
var init_nav_constants = __esm({
  "js/nav-constants.js"() {
    SNAP_QUALITY_GOOD_OUT = 1;
    SNAP_QUALITY_DEGRADED_IN = 2.5;
    SNAP_QUALITY_LOST_IN = 2.5;
    SNAP_QUALITY_DEGRADED_OUT = 2;
    SNAP_QUALITY_LOST_LATERAL_M = 80;
    SNAP_QUALITY_DEGRADED_EXIT_LATERAL_M = 60;
    SNAP_QUALITY_ACC_FLOOR_M = 5;
    SNAP_QUALITY_TICKS_REQUIRED = 2;
    SNAP_QUALITY_TICK_WINDOW = 3;
    SNAP_QUALITY_JUMP_DEGRADED_MS = 3e3;
    SNAP_QUALITY_JUMP_DS_M = 50;
    SNAP_QUALITY_DEGRADED_TIMEOUT_MS = 3e4;
    SNAP_CURVATURE_RADIUS_M = 30;
    SNAP_CURVATURE_THRESHOLD_MULT = 1.5;
    SNAP_HEADING_ACCEPT_DEG = 45;
    SNAP_HEADING_REJECT_DEG = 90;
    SNAP_HEADING_GATE_MIN_SPD = 3;
    SNAP_HEADING_GATE_ACC_MAX_M = 25;
    SNAP_HEADING_MAX_AGE_MS = 3e3;
    SNAP_MIN_DOT = 0.71;
    SNAP_WINDOW_BASE_M = 10;
    SNAP_WINDOW_ACC_MULT = 3;
    SNAP_WINDOW_DT_CAP_S = 2;
    SNAP_JUMP_PENALTY = 3;
    SNAP_ANGLE_PENALTY = 2;
    SNAP_COLD_START_SKIP_FIXES = 3;
    SNAP_REVERSE_EPS = 5;
    SNAP_FALLBACK_BACK_M = 60;
    SNAP_FALLBACK_FWD_M = 220;
    GPS_CONVERGE_MIN_FIXES = 5;
    GPS_CONVERGE_LAST3_ACC_M = 15;
    GPS_CONVERGE_ACC_M = 20;
    GPS_CONVERGE_RE_MIN_FIXES = 2;
    GPS_CONVERGE_RE_ACC_M = 25;
    GPS_CONVERGE_JUMP_PAD_M = 5;
    OFF_ROUTE_ENTER_M = 50;
    OFF_ROUTE_EXIT_M = 25;
    OFF_ROUTE_CONFIRM_MS = 8e3;
    OFF_ROUTE_CONFIRM_MS_HIGH_SPD = 1e4;
    OFF_ROUTE_CONFIRM_DIST_M = 100;
    OFF_ROUTE_CONFIRM_DIST_HIGH_M = 200;
    OFF_ROUTE_HIGH_SPD_MPS = 25;
    OFF_ROUTE_GPS_ACC_GATE_M = 30;
    OFF_ROUTE_ACC_FACTOR = 1.5;
    OFF_ROUTE_HEADING_DIVERGE_DEG = 45;
    OFF_ROUTE_HEADING_DIVERGE_MS = 3e3;
    OFF_ROUTE_HEADING_MIN_SPD = 5;
    REROUTE_SEED_MAX_LATERAL_M = 80;
    REROUTE_SEED_MAX_ANGLE_DEG = 90;
    MANEUVER_BEND_DEFAULT_DEG = 20;
    MANEUVER_MIN_ANGLE_DEG = 12;
    MANEUVER_COLLAPSE_SEG_M = 30;
    MANEUVER_COLLAPSE_GAP_M = 45;
    MANEUVER_PASSED_M = 8;
    MANEUVER_FORK_DROP_ANGLE_DEG = 20;
    MANEUVER_FORK_MIN_SEG_M = 200;
    ROUTE_LOW_AVG_SEG_M = 15;
    ROUTE_LOW_MANEUVER_PER_KM = 25;
    FUSION_GPS_WEIGHT_MIN = 0.02;
    FUSION_GPS_WEIGHT_SPAN = 25;
    PATH_SKIP_DS_M = 2;
    PATH_SKIP_FRAMES = 2;
    GPS_INVALIDATE_ACC_M = 50;
    GPS_LOST_RECONVERGE_MS = 6e4;
  }
});

// js/heading.js
function readMotion(e) {
  const rr = e.rotationRate;
  if (!rr || rr.alpha == null || isNaN(rr.alpha)) return;
  const now = Date.now();
  const dt = lastMotionTs ? Math.min(0.5, (now - lastMotionTs) / 1e3) : 0;
  lastMotionTs = now;
  if (dt <= 0) return;
  const base = gyroHeading != null ? gyroHeading : sensorHeading;
  if (base == null) return;
  gyroHeading = (base - rr.alpha * dt + 360) % 360;
  gyroTs = now;
}
function readOrientation(e) {
  let h = null;
  if (typeof e.webkitCompassHeading === "number" && !isNaN(e.webkitCompassHeading)) {
    h = e.webkitCompassHeading;
  } else if (e.absolute && e.alpha != null && !isNaN(e.alpha)) {
    h = (360 - e.alpha) % 360;
  }
  if (h == null || isNaN(h)) return;
  sensorHeading = (h + 360) % 360;
  sensorTs = Date.now();
}
function blendAngles(a, b, wB) {
  const r = Math.PI / 180;
  const sx = Math.sin(a * r) * (1 - wB) + Math.sin(b * r) * wB;
  const sy = Math.cos(a * r) * (1 - wB) + Math.cos(b * r) * wB;
  return (Math.atan2(sx, sy) * 180 / Math.PI + 360) % 360;
}
function startHeadingSensors() {
  if (typeof window === "undefined") return;
  if (!listening) {
    window.addEventListener("deviceorientationabsolute", readOrientation, true);
    window.addEventListener("deviceorientation", readOrientation, true);
    listening = true;
  }
  if (!motionListening && window.DeviceMotionEvent) {
    window.addEventListener("devicemotion", readMotion, true);
    motionListening = true;
  }
}
async function requestHeadingPermission() {
  const DO = window.DeviceOrientationEvent;
  if (DO && typeof DO.requestPermission === "function") {
    try {
      const st = await DO.requestPermission();
      return st === "granted";
    } catch (e) {
      return false;
    }
  }
  return true;
}
function startCompassCalibration(durationMs = 15e3) {
  calibratingUntil = Date.now() + durationMs;
  forceGps = false;
  disagreeSince = 0;
  startHeadingSensors();
}
function isCalibrating() {
  return Date.now() < calibratingUntil;
}
function getHeadingHealth() {
  return {
    forceGps,
    calibrating: isCalibrating(),
    interference: forceGps && !isCalibrating(),
    sensorFresh: sensorHeading != null && Date.now() - sensorTs < 2500
  };
}
function updateHeadingHealth(gpsHeading, speedMps) {
  const spd = speedMps ?? 0;
  const sensorFresh = sensorHeading != null && Date.now() - sensorTs < 2500;
  if (isCalibrating()) {
    forceGps = false;
    disagreeSince = 0;
    return getHeadingHealth();
  }
  if (!sensorFresh || gpsHeading == null || isNaN(gpsHeading)) {
    disagreeSince = 0;
    return getHeadingHealth();
  }
  const diff = angleDiff(gpsHeading, sensorHeading);
  if (spd < 8 && diff > DISAGREE_DEG) {
    if (!disagreeSince) disagreeSince = Date.now();
    else if (Date.now() - disagreeSince > DISAGREE_MS) forceGps = true;
  } else {
    disagreeSince = 0;
    if (diff < RECOVER_DEG && spd > 4) forceGps = false;
  }
  return getHeadingHealth();
}
function fuseHeading(gpsHeading, speedMps) {
  const sensorFresh = sensorHeading != null && Date.now() - sensorTs < 2500;
  const gyroFresh = gyroHeading != null && Date.now() - gyroTs < 1500;
  const spd = speedMps ?? 0;
  if (forceGps && !isCalibrating() && gpsHeading != null && !isNaN(gpsHeading) && spd >= 3.2) {
    return gpsHeading;
  }
  const blendSensor = gyroFresh && spd < 5 ? gyroHeading : sensorFresh ? sensorHeading : null;
  if (!blendSensor) return gpsHeading ?? null;
  const gpsWeight = Math.min(1, FUSION_GPS_WEIGHT_MIN + spd / FUSION_GPS_WEIGHT_SPAN);
  if (gpsHeading == null || isNaN(gpsHeading)) return blendSensor;
  if (gpsWeight >= 0.95) return gpsHeading;
  if (gpsWeight <= 0.05) return blendSensor;
  if (angleDiff(gpsHeading, blendSensor) > 45 && spd < 3) {
    return blendSensor;
  }
  return blendAngles(gpsHeading, blendSensor, 1 - gpsWeight);
}
var sensorHeading, sensorTs, listening, motionListening, gyroHeading, gyroTs, lastMotionTs, forceGps, disagreeSince, calibratingUntil, DISAGREE_DEG, DISAGREE_MS, RECOVER_DEG;
var init_heading = __esm({
  "js/heading.js"() {
    init_geo();
    init_nav_constants();
    sensorHeading = null;
    sensorTs = 0;
    listening = false;
    motionListening = false;
    gyroHeading = null;
    gyroTs = 0;
    lastMotionTs = 0;
    forceGps = false;
    disagreeSince = 0;
    calibratingUntil = 0;
    DISAGREE_DEG = 55;
    DISAGREE_MS = 4500;
    RECOVER_DEG = 28;
  }
});

// js/telemetry.js
function r6(n) {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(n * 1e6) / 1e6;
}
function r2(n) {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
function isEnabledPref() {
  try {
    if (new URLSearchParams(location.search).get("telemetry") === "1") return true;
    return localStorage.getItem(ENABLE_KEY) === "1";
  } catch (e) {
    return false;
  }
}
function setEnabledPref(on) {
  try {
    localStorage.setItem(ENABLE_KEY, on ? "1" : "0");
  } catch (e) {
  }
}
function openDb() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("sessions")) {
        db.createObjectStore("sessions", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("events")) {
        const ev = db.createObjectStore("events", { keyPath: "id", autoIncrement: true });
        ev.createIndex("sessionId", "sessionId", { unique: false });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}
function tx(store, mode) {
  return _db.transaction(store, mode).objectStore(store);
}
async function putSession(rec) {
  await openDb();
  return new Promise((resolve, reject) => {
    const r = tx("sessions", "readwrite").put(rec);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}
async function getSession(id) {
  await openDb();
  return new Promise((resolve, reject) => {
    const r = tx("sessions", "readonly").get(id);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}
async function listSessionsRaw() {
  await openDb();
  return new Promise((resolve, reject) => {
    const r = tx("sessions", "readonly").getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}
async function deleteSessionData(id) {
  await openDb();
  return new Promise((resolve, reject) => {
    const t = _db.transaction(["sessions", "events"], "readwrite");
    t.objectStore("sessions").delete(id);
    const idx = t.objectStore("events").index("sessionId");
    const range = IDBKeyRange.only(id);
    const cur = idx.openCursor(range);
    cur.onsuccess = (e) => {
      const c = e.target.result;
      if (c) {
        c.delete();
        c.continue();
      }
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
async function pruneOldSessions() {
  const all = await listSessionsRaw();
  all.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
  while (all.length > MAX_SESSIONS) {
    const drop = all.pop();
    if (drop?.id) await deleteSessionData(drop.id);
  }
}
async function markDirtyIncomplete() {
  try {
    const all = await listSessionsRaw();
    for (const s2 of all) {
      if (!s2.endedAt && !s2.dirty) {
        s2.dirty = true;
        await putSession(s2);
      }
    }
  } catch (e) {
    console.warn("telemetry dirty scan:", e);
  }
}
async function flushBuffer(force) {
  if (!_buffer.length && !force) return;
  const batch = _buffer.splice(0, _buffer.length);
  if (!batch.length) return;
  await openDb();
  await new Promise((resolve, reject) => {
    const t = _db.transaction("events", "readwrite");
    const st = t.objectStore("events");
    for (const row of batch) {
      st.add({ sessionId: row.sessionId, ...row.ev });
    }
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  if (_sessionId) {
    const sess = await getSession(_sessionId);
    if (sess) {
      sess.eventCount = (sess.eventCount || 0) + batch.length;
      const marks = batch.filter((b) => b.ev.type === "mark").length;
      if (marks) sess.markCount = (sess.markCount || 0) + marks;
      await putSession(sess);
    }
  }
}
function scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setInterval(() => {
    flushBuffer(false).catch((e) => console.warn("telemetry flush:", e));
  }, FLUSH_MS);
}
function stopTimers() {
  if (_flushTimer) {
    clearInterval(_flushTimer);
    _flushTimer = null;
  }
  if (_batteryTimer) {
    clearInterval(_batteryTimer);
    _batteryTimer = null;
  }
  if (_perfTimer) {
    clearInterval(_perfTimer);
    _perfTimer = null;
  }
}
function startSysTimers() {
  stopTimers();
  scheduleFlush();
  _batteryTimer = setInterval(() => {
    if (!_active) return;
    if (navigator.getBattery) {
      navigator.getBattery().then((b) => {
        log("sys", { sub: "battery", level: r2(b.level * 100), charging: !!b.charging });
      }).catch(() => {
      });
    }
  }, 6e4);
  _perfTimer = setInterval(() => flushPerfAggregate(), 3e4);
}
function relT() {
  return _sessionStart ? Date.now() - _sessionStart : 0;
}
function pushEvent(type, data) {
  if (!_active || !_sessionId) return;
  const ev = { t: relT(), type, ...data };
  _buffer.push({ sessionId: _sessionId, ev });
}
function log(type, data) {
  if (!_active) return;
  pushEvent(type, data || {});
}
function flushPerfAggregate() {
  if (!_active || !_perfFrames) return;
  log("perf", {
    frames: _perfFrames,
    avg_ms: r2(_perfSum / _perfFrames),
    frames_over_32ms: _perfOver32
  });
  _perfFrames = 0;
  _perfSum = 0;
  _perfOver32 = 0;
  _perfLastTs = 0;
}
function tickPerfFrame() {
  if (!_active) return;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (_perfLastTs) {
    const dt = now - _perfLastTs;
    _perfFrames++;
    _perfSum += dt;
    if (dt > 32) _perfOver32++;
  }
  _perfLastTs = now;
}
function logSnapFromResult(snap) {
  if (!_active || !snap) return;
  const s0 = r2(snap.s);
  const latOff = r2(snap.lateral);
  let jump = false;
  if (_lastSnapS0 != null && s0 != null && Math.abs(s0 - _lastSnapS0) > 50) jump = true;
  if (s0 != null) _lastSnapS0 = s0;
  log("snap", { s0, lat_off: latOff, jump, quality: S.snapQuality || "GOOD" });
}
function pct(arr, p) {
  if (!arr.length) return null;
  const s2 = [...arr].sort((a, b) => a - b);
  const i = Math.min(s2.length - 1, Math.floor(p / 100 * s2.length));
  return s2[i];
}
function computeSessionAggregate() {
  if (!_buffer.length) return null;
  const snaps = _buffer.map((b) => b.ev).filter((e) => e.type === "snap");
  const latOffs = snaps.map((s2) => s2.lat_off).filter((v) => v != null && Number.isFinite(v));
  const marks = _buffer.map((b) => b.ev).filter((e) => e.type === "mark");
  return {
    snap_count: snaps.length,
    lat_off_p50: r2(pct(latOffs, 50)),
    lat_off_p95: r2(pct(latOffs, 95)),
    snap_jumps: snaps.filter((s2) => s2.jump).length,
    snap_lost: snaps.filter((s2) => s2.quality === "LOST").length,
    snap_degraded: snaps.filter((s2) => s2.quality === "DEGRADED").length,
    mark_count: marks.length,
    phantom_marks: marks.filter(
      (m) => (m.tags || []).includes("phantom_turn") || /phantom/i.test(m.note || "")
    ).length
  };
}
async function start(meta) {
  if (_active) return _sessionId;
  if (!isEnabledPref()) return null;
  await openDb();
  await markDirtyIncomplete();
  _sessionId = uid();
  _sessionStart = Date.now();
  _lastSnapS0 = null;
  _active = true;
  const rec = {
    id: _sessionId,
    startedAt: _sessionStart,
    endedAt: null,
    userAgent: navigator.userAgent || "",
    appVersion: APP_VERSION,
    dirty: false,
    eventCount: 0,
    markCount: 0,
    meta: meta || {}
  };
  await putSession(rec);
  await pruneOldSessions();
  startSysTimers();
  document.documentElement.classList.add("telemetry-on");
  log("meta", { sub: "start", appVersion: APP_VERSION, ...meta || {} });
  updateMarkButtonVisibility();
  return _sessionId;
}
async function stop() {
  if (!_active) return;
  flushPerfAggregate();
  const agg = computeSessionAggregate();
  if (agg) log("meta", { sub: "session_aggregate", ...agg });
  log("meta", { sub: "stop" });
  await flushBuffer(true);
  const id = _sessionId;
  const ended = Date.now();
  if (id) {
    const sess = await getSession(id);
    if (sess) {
      sess.endedAt = ended;
      await putSession(sess);
    }
  }
  _active = false;
  _sessionId = null;
  _sessionStart = 0;
  _lastSnapS0 = null;
  document.documentElement.classList.remove("telemetry-on");
  stopTimers();
  updateMarkButtonVisibility();
}
function mark(noteOrObj) {
  if (!_active) return;
  if (typeof noteOrObj === "string") {
    log("mark", noteOrObj ? { note: noteOrObj } : {});
  } else {
    log("mark", noteOrObj || {});
  }
}
function isActive() {
  return _active;
}
function isEnabled() {
  return isEnabledPref();
}
async function setEnabled(on) {
  setEnabledPref(!!on);
  if (!on && _active) await stop();
  document.documentElement.classList.toggle("telemetry-on", !!on && _active);
  updateMarkButtonVisibility();
}
function updateMarkButtonVisibility() {
  const btn = document.getElementById("btn-telemetry-mark");
  if (!btn) return;
  const enabled = isEnabledPref();
  btn.classList.toggle("hidden", !enabled);
  btn.classList.toggle("tel-idle", enabled && !_active);
}
async function listSessions() {
  const all = await listSessionsRaw();
  all.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
  return all.map((s2) => ({
    id: s2.id,
    startedAt: s2.startedAt,
    endedAt: s2.endedAt,
    dirty: !!s2.dirty,
    eventCount: s2.eventCount || 0,
    markCount: s2.markCount || 0,
    durationMs: (s2.endedAt || Date.now()) - (s2.startedAt || 0)
  }));
}
async function getSessionEvents(sessionId) {
  await openDb();
  return new Promise((resolve, reject) => {
    const idx = tx("events", "readonly").index("sessionId");
    const r = idx.getAll(IDBKeyRange.only(sessionId));
    r.onsuccess = () => {
      const rows = (r.result || []).map((row) => {
        const { id, sessionId: _sid, ...ev } = row;
        return ev;
      });
      rows.sort((a, b) => (a.t || 0) - (b.t || 0));
      resolve(rows);
    };
    r.onerror = () => reject(r.error);
  });
}
function formatExportFilename(startedAt) {
  const d = new Date(startedAt || Date.now());
  const p = (n) => String(n).padStart(2, "0");
  return "telemetry_" + d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "_" + p(d.getHours()) + "-" + p(d.getMinutes()) + ".jsonl";
}
async function exportSession(sessionId) {
  const sess = await getSession(sessionId);
  if (!sess) throw new Error("\u0421\u0435\u0441\u0441\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430");
  const events = await getSessionEvents(sessionId);
  const head = {
    type: "session",
    id: sess.id,
    startedAt: sess.startedAt,
    endedAt: sess.endedAt,
    dirty: !!sess.dirty,
    userAgent: sess.userAgent,
    appVersion: sess.appVersion,
    eventCount: events.length,
    markCount: sess.markCount || 0
  };
  const lines = [JSON.stringify(head), ...events.map((e) => JSON.stringify(e))];
  const blob = new Blob([lines.join("\n") + "\n"], { type: "application/x-ndjson" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = formatExportFilename(sess.startedAt);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5e3);
}
async function deleteSession(sessionId) {
  if (_active && _sessionId === sessionId) await stop();
  await deleteSessionData(sessionId);
}
async function storageStats() {
  const all = await listSessionsRaw();
  let events = 0;
  for (const s2 of all) events += s2.eventCount || 0;
  return { sessions: all.length, events, maxSessions: MAX_SESSIONS };
}
function onVisibility() {
  if (!_active) return;
  log("sys", { sub: "visibility", state: document.visibilityState });
  if (document.visibilityState === "hidden") {
    flushBuffer(true).catch(() => {
    });
  }
}
function bindGlobalHandlers() {
  window.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", () => {
    if (_active) flushBuffer(true).catch(() => {
    });
  });
  window.addEventListener("error", (e) => {
    log("sys", {
      sub: "error",
      message: String(e.message || e.error || "").slice(0, 200),
      stack: (e.error?.stack || "").split("\n")[0]?.slice(0, 200) || ""
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    log("sys", {
      sub: "error",
      message: String(reason?.message || reason || "").slice(0, 200),
      stack: (reason?.stack || "").split("\n")[0]?.slice(0, 200) || ""
    });
  });
}
async function initTelemetry() {
  if (typeof indexedDB === "undefined") return;
  if (new URLSearchParams(location.search).get("telemetry") === "1") {
    setEnabledPref(true);
  }
  bindGlobalHandlers();
  try {
    await openDb();
    await markDirtyIncomplete();
  } catch (e) {
    console.warn("telemetry init:", e);
  }
}
var DB_NAME, DB_VER, MAX_SESSIONS, FLUSH_MS, ENABLE_KEY, APP_VERSION, _db, _active, _sessionId, _sessionStart, _buffer, _flushTimer, _batteryTimer, _perfTimer, _lastSnapS0, _perfFrames, _perfSum, _perfOver32, _perfLastTs, telemetry, telemetry_default;
var init_telemetry = __esm({
  "js/telemetry.js"() {
    init_state();
    DB_NAME = "moto-telemetry";
    DB_VER = 1;
    MAX_SESSIONS = 20;
    FLUSH_MS = 15e3;
    ENABLE_KEY = "moto-hud-telemetry-enabled";
    APP_VERSION = "1.0.0";
    _db = null;
    _active = false;
    _sessionId = null;
    _sessionStart = 0;
    _buffer = [];
    _flushTimer = null;
    _batteryTimer = null;
    _perfTimer = null;
    _lastSnapS0 = null;
    _perfFrames = 0;
    _perfSum = 0;
    _perfOver32 = 0;
    _perfLastTs = 0;
    telemetry = {
      start,
      stop,
      log,
      mark,
      export: exportSession,
      listSessions,
      deleteSession,
      storageStats,
      isActive,
      isEnabled,
      setEnabled,
      tickPerfFrame,
      logSnapFromResult,
      updateMarkButtonVisibility,
      /** @param {object} fix */
      logFix(fix) {
        if (!_active) return;
        log("fix", {
          lat: r6(fix.lat),
          lon: r6(fix.lon),
          acc: r2(fix.acc),
          spd: r2(fix.speed),
          hdg: r2(fix.heading),
          alt: fix.alt != null ? r2(fix.alt) : null,
          ts: fix.ts,
          rcv: fix.rcv ?? Date.now()
        });
      }
    };
    telemetry_default = telemetry;
  }
});

// js/maneuver-filter.js
function resetManeuverFilterLog() {
  _filterLogged.clear();
}
function logFiltered(step, s2, reason) {
  const key = (step?.type || "") + "|" + (step?.modifier || "") + "|" + Math.round((s2 || 0) / 50) + "|" + reason;
  if (_filterLogged.has(key)) return;
  _filterLogged.add(key);
  telemetry_default.log("nav", {
    sub: "maneuver_filtered",
    type: step?.type,
    modifier: step?.modifier,
    highway: step?.highway || null,
    s: s2 != null ? Math.round(s2) : null,
    reason
  });
}
function bendThresholdForStep(step) {
  const hw = step?.highway || step?.roadClass || "";
  return HIGHWAY_BEND[hw] ?? MANEUVER_BEND_DEFAULT_DEG;
}
function hasTurnModifier(step) {
  const m = step.modifier || "";
  if (!m || m === "straight") return false;
  return m === "uturn" || m.includes("left") || m.includes("right");
}
function isNavManeuverType(step) {
  if (!step || step.type === "depart" || step.type === "arrive") return false;
  if (INFO_TYPES.has(step.type) || step.type === "merge") return false;
  if (step.type === "roundabout" || step.type === "rotary" || step.type === "exit roundabout") return true;
  if (step.type === "on ramp" || step.type === "off ramp") return hasTurnModifier(step) || !!step.exit;
  if (!NAV_TYPES.has(step.type)) return false;
  if (step.type === "fork" || step.type === "end of road") return hasTurnModifier(step);
  return step.type === "turn" && hasTurnModifier(step);
}
function stepTurnAngleDeg(step, maneuver) {
  if (step?.bearing_before != null && step?.bearing_after != null) {
    let d = step.bearing_after - step.bearing_before;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return Math.abs(d);
  }
  if (maneuver?.angle != null && Number.isFinite(maneuver.angle)) return Math.abs(maneuver.angle);
  return null;
}
function isSignificantManeuver(m, _geom) {
  if (!m?.step || !isNavManeuverType(m.step)) return false;
  const mod = m.step.modifier || "";
  const ang = stepTurnAngleDeg(m.step, m);
  if (mod === "straight") return false;
  if (ang == null) {
    return mod === "uturn" || m.step.type === "roundabout" || m.step.type === "rotary";
  }
  const bend = bendThresholdForStep(m.step);
  if (m.step.type === "fork" && ang < MANEUVER_FORK_DROP_ANGLE_DEG && (m.step.distance || 0) > MANEUVER_FORK_MIN_SEG_M) {
    return false;
  }
  if (mod.includes("slight") && ang < bend) return false;
  if ((mod === "straight" || !mod) && ang < bend) return false;
  if (mod === "uturn" || mod.includes("sharp")) return ang >= 8;
  if (ang < MANEUVER_MIN_ANGLE_DEG) return false;
  if (ang < bend && (mod.includes("slight") || mod === "straight")) return false;
  return true;
}
function pickStrongerManeuver(a, b) {
  const aa = stepTurnAngleDeg(a.step, a) || 0;
  const ab = stepTurnAngleDeg(b.step, b) || 0;
  if (ab > aa + 4) return b;
  if (aa > ab + 4) return a;
  const pri = (s2) => {
    if (s2.type === "roundabout" || s2.type === "rotary") return 3;
    if (s2.modifier === "uturn" || (s2.modifier || "").includes("sharp")) return 2;
    return 1;
  };
  return pri(b.step) > pri(a.step) ? b : a;
}
function refineManeuvers(maneuvers) {
  if (!maneuvers?.length) return [];
  const sorted = [...maneuvers].sort((a, b) => a.s - b.s);
  const kept = [];
  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    if (!isNavManeuverType(m.step)) {
      logFiltered(m.step, m.s, "not_nav_type");
      continue;
    }
    const segM = m.step.distance || 0;
    const ang = stepTurnAngleDeg(m.step, m) || 0;
    const bend = bendThresholdForStep(m.step);
    const next = sorted[i + 1];
    if (segM < MANEUVER_COLLAPSE_SEG_M && ang < bend) {
      if (next && isNavManeuverType(next.step) && next.s - m.s < MANEUVER_COLLAPSE_GAP_M) {
        logFiltered(m.step, m.s, "collapse_micro");
        continue;
      }
    }
    if (kept.length) {
      const prev = kept[kept.length - 1];
      const gap = m.s - prev.s;
      const prevAng = stepTurnAngleDeg(prev.step, prev) || 0;
      if (gap < MANEUVER_COLLAPSE_GAP_M && prevAng < bend && ang < bend) {
        logFiltered(prev.step, prev.s, "collapse_pair");
        kept[kept.length - 1] = pickStrongerManeuver(prev, m);
        continue;
      }
    }
    kept.push(m);
  }
  return kept.filter((m) => {
    const ok = isSignificantManeuver(m);
    if (!ok) logFiltered(m.step, m.s, "not_significant");
    return ok;
  });
}
var MANEUVER_BEND_ANGLE, HIGHWAY_BEND, HIGHWAY_CLASSES, _filterLogged, INFO_TYPES, NAV_TYPES;
var init_maneuver_filter = __esm({
  "js/maneuver-filter.js"() {
    init_nav_constants();
    init_telemetry();
    MANEUVER_BEND_ANGLE = MANEUVER_BEND_DEFAULT_DEG;
    HIGHWAY_BEND = {
      motorway: 25,
      trunk: 25,
      primary: 18,
      secondary: 16,
      tertiary: 14,
      residential: 12,
      living_street: 12,
      unclassified: 18
    };
    HIGHWAY_CLASSES = Object.keys(HIGHWAY_BEND);
    _filterLogged = /* @__PURE__ */ new Set();
    INFO_TYPES = /* @__PURE__ */ new Set(["new name", "continue", "notification"]);
    NAV_TYPES = /* @__PURE__ */ new Set([
      "turn",
      "fork",
      "on ramp",
      "off ramp",
      "roundabout",
      "rotary",
      "exit roundabout",
      "end of road"
    ]);
  }
});

// js/snap-quality.js
function resetSnapQuality() {
  S.snapQuality = SnapQuality.GOOD;
  _hist.length = 0;
  _degradedSince = 0;
  _jumpUntil = 0;
  _frozenS = null;
  _lastNm = null;
  _forceReeval = false;
  _lostSince = 0;
}
function takeForceReeval() {
  const v = _forceReeval;
  _forceReeval = false;
  return v;
}
function curvatureMult(geom, s2, override) {
  if (override != null) return override;
  return 1;
}
function rawScore(snap, gps) {
  const acc = Math.max(gps?.acc ?? SNAP_QUALITY_ACC_FLOOR_M, SNAP_QUALITY_ACC_FLOOR_M);
  return snap.lateral / acc;
}
function classifyInstant(score, lateral, mult) {
  const s2 = score / mult;
  if (lateral > SNAP_QUALITY_LOST_LATERAL_M || s2 > SNAP_QUALITY_LOST_IN) return SnapQuality.LOST;
  if (s2 > SNAP_QUALITY_DEGRADED_IN) return SnapQuality.DEGRADED;
  return SnapQuality.GOOD;
}
function classifyExit(score, lateral, mult) {
  const s2 = score / mult;
  if (lateral > SNAP_QUALITY_LOST_LATERAL_M || s2 > SNAP_QUALITY_LOST_IN) return SnapQuality.LOST;
  if (lateral < SNAP_QUALITY_DEGRADED_EXIT_LATERAL_M && s2 <= SNAP_QUALITY_DEGRADED_OUT) return SnapQuality.GOOD;
  if (s2 <= SNAP_QUALITY_GOOD_OUT) return SnapQuality.GOOD;
  return SnapQuality.DEGRADED;
}
function pushHist(q) {
  _hist.push(q);
  while (_hist.length > SNAP_QUALITY_TICK_WINDOW) _hist.shift();
}
function histAgrees(target) {
  const n = _hist.filter((x) => x === target).length;
  return n >= SNAP_QUALITY_TICKS_REQUIRED;
}
function updateSnapQuality(snap, gps, geom, opts) {
  if (!snap || !gps) {
    S.snapQuality = SnapQuality.LOST;
    return S.snapQuality;
  }
  const now = Date.now();
  if (opts?.jump) _jumpUntil = now + SNAP_QUALITY_JUMP_DEGRADED_MS;
  const mult = curvatureMult(geom, snap.s, opts?.curvMult);
  const score = rawScore(snap, gps);
  const instant = now < _jumpUntil ? SnapQuality.DEGRADED : classifyInstant(score, snap.lateral, mult);
  pushHist(instant);
  const prev = S.snapQuality || SnapQuality.GOOD;
  let next = prev;
  if (prev === SnapQuality.GOOD) {
    if (instant === SnapQuality.LOST && histAgrees(SnapQuality.LOST)) next = SnapQuality.LOST;
    else if (instant !== SnapQuality.GOOD && histAgrees(SnapQuality.DEGRADED)) next = SnapQuality.DEGRADED;
  } else if (prev === SnapQuality.DEGRADED) {
    const exitQ = classifyExit(score, snap.lateral, mult);
    if (instant === SnapQuality.LOST && histAgrees(SnapQuality.LOST)) next = SnapQuality.LOST;
    else if (exitQ === SnapQuality.GOOD && histAgrees(SnapQuality.GOOD)) next = SnapQuality.GOOD;
  } else {
    const exitQ = classifyExit(score, snap.lateral, mult);
    if (exitQ !== SnapQuality.LOST && histAgrees(SnapQuality.DEGRADED)) next = SnapQuality.DEGRADED;
    if (exitQ === SnapQuality.GOOD && histAgrees(SnapQuality.GOOD)) next = SnapQuality.GOOD;
  }
  if (next === SnapQuality.DEGRADED && prev !== SnapQuality.DEGRADED) _degradedSince = now;
  if (next === SnapQuality.GOOD) _degradedSince = 0;
  if (next === SnapQuality.LOST && prev !== SnapQuality.LOST) _lostSince = now;
  if (next !== SnapQuality.LOST) _lostSince = 0;
  if (prev === SnapQuality.DEGRADED && _degradedSince && now - _degradedSince > SNAP_QUALITY_DEGRADED_TIMEOUT_MS) {
    _forceReeval = true;
  }
  S.snapQuality = next;
  if (next === SnapQuality.DEGRADED) {
    if (_frozenS == null) _frozenS = snap.s;
  } else if (next === SnapQuality.GOOD) {
    _frozenS = null;
  }
  return next;
}
function navSFromSnap(snap) {
  if (!snap) return null;
  if (S.snapQuality === SnapQuality.DEGRADED && _frozenS != null) return _frozenS;
  return snap.s;
}
function isSnapLost() {
  return S.snapQuality === SnapQuality.LOST;
}
function isSnapDegraded() {
  return S.snapQuality === SnapQuality.DEGRADED;
}
function lostDurationMs() {
  return _lostSince ? Date.now() - _lostSince : 0;
}
function cacheLastManeuver(nm) {
  _lastNm = nm;
}
function getCachedManeuver() {
  return _lastNm;
}
var SnapQuality, _hist, _degradedSince, _jumpUntil, _frozenS, _lastNm, _forceReeval, _lostSince;
var init_snap_quality = __esm({
  "js/snap-quality.js"() {
    init_state();
    init_nav_constants();
    SnapQuality = { GOOD: "GOOD", DEGRADED: "DEGRADED", LOST: "LOST" };
    _hist = [];
    _degradedSince = 0;
    _jumpUntil = 0;
    _frozenS = null;
    _lastNm = null;
    _forceReeval = false;
    _lostSince = 0;
  }
});

// js/route-geometry.js
function resetRouteSnap(opts) {
  _snap = null;
  _camHeadingRad = null;
  _camPitchRad = null;
  _snapMemoTs = null;
  _disp.inited = false;
  _dispLastTs = 0;
  _camLastTs = 0;
  _camPitchLastTs = 0;
  _prevFixTs = 0;
  _prevFixPos = null;
  _fixesSinceReset = 0;
  resetSnapQuality();
  if (opts?.seedS != null && S.route?.geometry) {
    const geom = S.route.geometry;
    const p = interpolateAtS(geom, opts.seedS);
    _snap = {
      s: opts.seedS,
      segIdx: findSegAtS(geom, opts.seedS),
      lat: p.lat,
      lon: p.lon,
      lateral: opts.lateral ?? 0,
      tangent: avgTangentDeg(geom, opts.seedS, 20),
      confidence: 0.7
    };
    _disp.s = opts.seedS;
    _disp.inited = true;
  }
}
function destPoint2(from, brgDeg, distM) {
  const r = Math.PI / 180;
  const br = brgDeg * r;
  const d = distM / 6371e3;
  const lat1 = from.lat * r;
  const lon1 = from.lon * r;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(br) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );
  return { lat: lat2 / r, lon: lon2 / r };
}
function turnAngleDeg(A, B, C) {
  const bIn = bearing(A, B);
  const bOut = bearing(B, C);
  return (bOut - bIn + 540) % 360 - 180;
}
function bezierCorner(A, B, C) {
  const turn = turnAngleDeg(A, B, C);
  if (Math.abs(turn) < ARC_ANGLE_THRESH) return null;
  const dAB = haversine(A, B);
  const dBC = haversine(B, C);
  const lead = Math.min(15, dAB * 0.35, dBC * 0.35);
  if (lead < 1.5) return null;
  const bIn = bearing(A, B);
  const bOut = bearing(B, C);
  const E = destPoint2(B, bIn + 180, lead);
  const X = destPoint2(B, bOut, lead);
  const n = Math.max(4, Math.ceil(Math.abs(turn) / 3));
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const u2 = 1 - t;
    pts.push({
      lat: u2 * u2 * E.lat + 2 * u2 * t * B.lat + t * t * X.lat,
      lon: u2 * u2 * E.lon + 2 * u2 * t * B.lon + t * t * X.lon
    });
  }
  return pts;
}
function pushUnique(lat, lon, la, lo) {
  const n = lat.length;
  if (n) {
    const d = haversine({ lat: lat[n - 1], lon: lon[n - 1] }, { lat: la, lon: lo });
    if (d < 0.4) return;
  }
  lat.push(la);
  lon.push(lo);
}
function interpolateSeg(lat, lon, a, b, stepM) {
  const d = haversine(a, b);
  const n = Math.max(1, Math.ceil(d / stepM));
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    pushUnique(
      lat,
      lon,
      a.lat + t * (b.lat - a.lat),
      a.lon + t * (b.lon - a.lon)
    );
  }
}
function densifyCoords(coords, stepM) {
  const lat = [];
  const lon = [];
  if (!coords || coords.length < 2) return { lat, lon };
  const first = { lat: coords[0][0], lon: coords[0][1] };
  pushUnique(lat, lon, first.lat, first.lon);
  for (let i = 0; i < coords.length - 1; i++) {
    const B = { lat: coords[i][0], lon: coords[i][1] };
    const C = { lat: coords[i + 1][0], lon: coords[i + 1][1] };
    const A = i > 0 ? { lat: coords[i - 1][0], lon: coords[i - 1][1] } : null;
    let segStart = B;
    if (A) {
      const arc = bezierCorner(A, B, C);
      if (arc && arc.length > 1) {
        if (lat.length) {
          const last = { lat: lat[lat.length - 1], lon: lon[lon.length - 1] };
          if (haversine(last, arc[0]) < 2) lat.pop(), lon.pop();
        }
        arc.forEach((p) => pushUnique(lat, lon, p.lat, p.lon));
        segStart = { lat: lat[lat.length - 1], lon: lon[lon.length - 1] };
      }
    }
    interpolateSeg(lat, lon, segStart, C, stepM);
  }
  return { lat, lon };
}
function buildArcLength(lat, lon) {
  const n = lat.length;
  const s2 = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    s2[i] = s2[i - 1] + haversine(
      { lat: lat[i - 1], lon: lon[i - 1] },
      { lat: lat[i], lon: lon[i] }
    );
  }
  return s2;
}
function findSForManeuver(sparseCoords, geom, targetLat, targetLon) {
  return findSForLatLon(geom, targetLat, targetLon);
}
function findSForLatLon(geom, lat, lon) {
  if (!geom || geom.n < 2) return 0;
  const gps = { lat, lon };
  let bestS = 0;
  let bestD = Infinity;
  for (let i = 0; i < geom.n - 1; i++) {
    const proj = projectOnSegment(
      gps,
      geom.lat[i],
      geom.lon[i],
      geom.lat[i + 1],
      geom.lon[i + 1]
    );
    const segLen = geom.s[i + 1] - geom.s[i];
    const s2 = geom.s[i] + proj.t * segLen;
    if (proj.lateral < bestD) {
      bestD = proj.lateral;
      bestS = s2;
    }
  }
  return bestS;
}
function buildManeuvers(steps, sparseCoords, geom) {
  if (!steps || !sparseCoords) return [];
  const full = { lat: geom.lat, lon: geom.lon, s: geom.s, n: geom.n };
  return steps.filter((st) => st.type !== "depart" && st.type !== "arrive").map((st) => {
    const s2 = findSForManeuver(sparseCoords, geom, st.lat, st.lon);
    return {
      s: s2,
      lat: st.lat,
      lon: st.lon,
      angle: Math.abs(turnAngleAtS(full, s2)),
      step: st
    };
  });
}
function denseStepForCoords(coords) {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += haversine(
      { lat: coords[i][0], lon: coords[i][1] },
      { lat: coords[i + 1][0], lon: coords[i + 1][1] }
    );
  }
  if (total > 12e4) return 8;
  if (total > 4e4) return 5;
  return DENSE_STEP;
}
function buildRouteGeometry(route) {
  if (!route || !route.coords || route.coords.length < 2) return null;
  resetManeuverFilterLog();
  const stepM = denseStepForCoords(route.coords);
  const { lat: latArr, lon: lonArr } = densifyCoords(route.coords, stepM);
  const n = latArr.length;
  if (n < 2) return null;
  const lat = Float64Array.from(latArr);
  const lon = Float64Array.from(lonArr);
  const s2 = buildArcLength(latArr, lonArr);
  const elev = new Float64Array(n);
  const grade = new Float64Array(n);
  const maneuvers = refineManeuvers(buildManeuvers(route.steps, route.coords, { s: s2, n, lat, lon }));
  return {
    lat,
    lon,
    s: s2,
    elev,
    grade,
    maneuvers,
    n,
    elevReady: false,
    curveReady: false,
    crossings: [],
    roundabouts: []
  };
}
function findSegAtS(geom, s2) {
  let lo = 0;
  let hi = geom.n - 2;
  while (lo < hi) {
    const mid = lo + hi + 1 >> 1;
    if (geom.s[mid] <= s2) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
function interpolateAtS(geom, s2) {
  if (s2 <= 0) return { lat: geom.lat[0], lon: geom.lon[0] };
  const total = geom.s[geom.n - 1];
  if (s2 >= total) return { lat: geom.lat[geom.n - 1], lon: geom.lon[geom.n - 1] };
  const i = findSegAtS(geom, s2);
  const s0 = geom.s[i];
  const s1 = geom.s[i + 1];
  const t = s1 > s0 ? (s2 - s0) / (s1 - s0) : 0;
  return {
    lat: geom.lat[i] + t * (geom.lat[i + 1] - geom.lat[i]),
    lon: geom.lon[i] + t * (geom.lon[i + 1] - geom.lon[i])
  };
}
function turnAngleAtS(geom, s2) {
  const ds = 18;
  const total = geom.s[geom.n - 1];
  const s0 = Math.max(0, s2 - ds);
  const s22 = Math.min(total, s2 + ds);
  if (s22 - s0 < 8) return 0;
  const p0 = interpolateAtS(geom, s0);
  const p1 = interpolateAtS(geom, s2);
  const p2 = interpolateAtS(geom, s22);
  const bIn = bearing(p0, p1);
  const bOut = bearing(p1, p2);
  return (bOut - bIn + 540) % 360 - 180;
}
function segmentBearing(geom, i) {
  return bearing(
    { lat: geom.lat[i], lon: geom.lon[i] },
    { lat: geom.lat[i + 1], lon: geom.lon[i + 1] }
  );
}
function projectOnSegment(gps, lat0, lon0, lat1, lon1) {
  const r = Math.PI / 180;
  const cosM = Math.cos((lat0 + lat1) / 2 * r);
  const ax = lon0 * r * cosM;
  const ay = lat0 * r;
  const bx = lon1 * r * cosM;
  const by = lat1 * r;
  const px = gps.lon * r * cosM;
  const py = gps.lat * r;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  const plat = (ay + t * dy) / r;
  const plon = (ax + t * dx) / (r * cosM);
  const lateral = haversine(gps, { lat: plat, lon: plon });
  return { t, lat: plat, lon: plon, lateral };
}
function headingDot(tangentDeg, gpsHdg) {
  if (gpsHdg == null || isNaN(gpsHdg)) return 1;
  const diff = angleDiff(tangentDeg, gpsHdg);
  return Math.cos(diff * Math.PI / 180);
}
function computeSnapWindow(spd, dt, acc) {
  const v = Math.max(spd || 0, 0);
  const a = Math.max(acc || 8, 8);
  if (v < 1) return Math.max(25, SNAP_WINDOW_ACC_MULT * a);
  return v * Math.min(dt, SNAP_WINDOW_DT_CAP_S) + SNAP_WINDOW_ACC_MULT * a + SNAP_WINDOW_BASE_M;
}
function headingGateReject(tangent, gpsHdg, spd, acc, headingAgeMs) {
  if (gpsHdg == null || isNaN(gpsHdg)) return false;
  const diff = angleDiff(tangent, gpsHdg);
  if (diff > SNAP_HEADING_REJECT_DEG) return true;
  const softGate = acc > SNAP_HEADING_GATE_ACC_MAX_M || headingAgeMs > SNAP_HEADING_MAX_AGE_MS;
  if (softGate) return false;
  if (spd >= SNAP_HEADING_GATE_MIN_SPD && diff > SNAP_HEADING_ACCEPT_DEG) return true;
  if (spd >= SNAP_HEADING_GATE_MIN_SPD) {
    const dot = headingDot(tangent, gpsHdg);
    if (dot < SNAP_MIN_DOT) return true;
  }
  return false;
}
function scanSnap(gps, geom, sMin, sMax, gpsHdg, requireDir, ctx) {
  let best = null;
  const i0 = findSegAtS(geom, sMin);
  const spd = ctx?.spd ?? 0;
  const acc = ctx?.acc ?? 8;
  const headingAgeMs = ctx?.headingAgeMs ?? 0;
  const prevS = ctx?.prevS ?? 0;
  const skipJump = ctx?.skipJumpPenalty ?? false;
  const dt = ctx?.dt ?? 1;
  for (let i = i0; i < geom.n - 1; i++) {
    if (geom.s[i] > sMax) break;
    const proj = projectOnSegment(
      gps,
      geom.lat[i],
      geom.lon[i],
      geom.lat[i + 1],
      geom.lon[i + 1]
    );
    const segLen = geom.s[i + 1] - geom.s[i];
    const s2 = geom.s[i] + proj.t * segLen;
    if (s2 < sMin - 1 || s2 > sMax + 1) continue;
    const tangent = segmentBearing(geom, i);
    const dot = headingDot(tangent, gpsHdg);
    if (requireDir && headingGateReject(tangent, gpsHdg, spd, acc, headingAgeMs)) continue;
    if (requireDir && dot < SNAP_MIN_DOT) continue;
    if (requireDir && spd > 1 && ctx?.prevPos) {
      const moveBrg = bearing(ctx.prevPos, gps);
      if (headingDot(tangent, moveBrg) < 0) continue;
    }
    let score = proj.lateral + SNAP_ANGLE_PENALTY * (gpsHdg != null ? (1 - dot) * 50 : 0);
    if (!skipJump && prevS > 0) {
      const maxJump2 = spd * dt + acc;
      const jumpExcess = Math.max(0, Math.abs(s2 - prevS) - maxJump2);
      score += SNAP_JUMP_PENALTY * jumpExcess / 10;
    }
    if (!best || score < best.score) {
      best = {
        s: s2,
        segIdx: i,
        lat: proj.lat,
        lon: proj.lon,
        lateral: proj.lateral,
        tangent,
        dot,
        score,
        confidence: dot >= SNAP_MIN_DOT ? 1 : 0.5
      };
    }
  }
  return best;
}
function snapNearS(gps, geom, hintS, gpsHdg) {
  const total = geom.s[geom.n - 1];
  const sMin = Math.max(0, hintS - 40);
  const sMax = Math.min(total, hintS + 85);
  return scanSnap(gps, geom, sMin, sMax, gpsHdg, false);
}
function snapToRoute(gps, geom, gpsHeadingDeg, meta) {
  if (!gps || !geom || geom.n < 2) return null;
  const prev = _snap;
  const total = geom.s[geom.n - 1];
  const prevS = prev ? prev.s : 0;
  const now = gps.ts || Date.now();
  const dt = _prevFixTs ? Math.min(SNAP_WINDOW_DT_CAP_S, (now - _prevFixTs) / 1e3) : 1;
  const spd = gps.speed != null && gps.speed >= 0 ? gps.speed : 0;
  const acc = gps.acc || 8;
  const headingAgeMs = meta?.headingAgeMs ?? 0;
  _fixesSinceReset++;
  const sWin = prevS > 0 ? computeSnapWindow(spd, dt, acc) : Math.min(200, total * 0.05);
  const sMin = Math.max(0, prevS - sWin);
  const sMax = Math.min(total, prevS + sWin);
  const ctx = {
    spd,
    acc,
    headingAgeMs,
    prevS,
    dt,
    skipJumpPenalty: prevS <= 0 || _fixesSinceReset <= SNAP_COLD_START_SKIP_FIXES,
    prevPos: _prevFixPos
  };
  let best = null;
  if (takeForceReeval() && prevS > 0) {
    const wide = 3 * acc + 100;
    best = scanSnap(
      gps,
      geom,
      Math.max(0, prevS - wide),
      Math.min(total, prevS + wide),
      gpsHeadingDeg,
      false,
      ctx
    );
  }
  if (!best) {
    best = scanSnap(gps, geom, sMin, sMax, gpsHeadingDeg, true, ctx);
  }
  if (!best) {
    best = scanSnap(
      gps,
      geom,
      Math.max(0, prevS - SNAP_FALLBACK_BACK_M),
      Math.min(total, prevS + SNAP_FALLBACK_FWD_M),
      gpsHeadingDeg,
      false,
      ctx
    );
  }
  if (!best) {
    if (prev) return prev;
    best = scanSnap(gps, geom, 0, Math.min(total, 200), gpsHeadingDeg, false, ctx);
    if (!best) return null;
  }
  const jump = prev && Math.abs(best.s - prev.s) > SNAP_QUALITY_JUMP_DS_M;
  if (prev && best.lateral < 40 && best.s < prev.s - SNAP_REVERSE_EPS) {
    best = { ...best, s: prev.s, segIdx: prev.segIdx, confidence: 0.4 };
  }
  if (prev && best.lateral < 35) {
    const ds = best.s - prev.s;
    if (ds > 0 && ds < 30) best.s = prev.s + ds * 0.65;
  }
  if (best.lateral > 60) best.confidence = Math.min(best.confidence, 0.3);
  const { R } = radiusAtS(geom, best.s);
  const curvMult = !isFinite(R) || R >= SNAP_CURVATURE_RADIUS_M ? 1 : SNAP_CURVATURE_THRESHOLD_MULT;
  updateSnapQuality(best, gps, geom, { jump, curvMult });
  _snap = best;
  _prevFixTs = now;
  _prevFixPos = { lat: gps.lat, lon: gps.lon };
  return best;
}
function getNavSnap(gpsHeadingDeg) {
  const raw = getRouteSnapForNav(gpsHeadingDeg);
  if (!raw) return null;
  const ns = navSFromSnap(raw);
  if (ns == null || ns === raw.s) return raw;
  const geom = S.route?.geometry;
  if (!geom) return raw;
  const p = interpolateAtS(geom, ns);
  return {
    ...raw,
    s: ns,
    lat: p.lat,
    lon: p.lon,
    segIdx: findSegAtS(geom, ns)
  };
}
function getRouteSnapForNav(gpsHeadingDeg) {
  const geom = S.route?.geometry;
  const gps = S.gps;
  if (!geom || !gps) return null;
  if (_snapMemoTs === gps.ts && _snap) return _snap;
  _snapMemoTs = gps.ts;
  const headingAgeMs = S.lastReliableHeadingTs ? Date.now() - S.lastReliableHeadingTs : SNAP_HEADING_MAX_AGE_MS + 1;
  return snapToRoute(gps, geom, gpsHeadingDeg, { headingAgeMs });
}
function frameDtSec() {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const dtMs = _dispLastTs ? Math.min(48, now - _dispLastTs) : 16;
  _dispLastTs = now;
  return dtMs / 1e3;
}
function getDisplaySnap(rawSnap, geom, speedMps, gpsHeadingDeg) {
  if (!rawSnap || !geom) return null;
  const dt = frameDtSec();
  const total = geom.s[geom.n - 1];
  const spd = Math.max(0, speedMps || 0);
  if (!_disp.inited) {
    _disp.s = rawSnap.s;
    _disp.inited = true;
  } else if (spd > 0.05) {
    _disp.s = Math.min(total, _disp.s + spd * dt);
  }
  let targetS = rawSnap.s;
  const pos = curPos();
  if (pos) {
    const hit = snapNearS(pos, geom, _disp.s, gpsHeadingDeg);
    if (hit) targetS = hit.s;
  }
  const tau = 0.11;
  const alpha = 1 - Math.exp(-dt / tau);
  _disp.s += (targetS - _disp.s) * alpha;
  _disp.s = Math.max(0, Math.min(total, _disp.s));
  const p = interpolateAtS(geom, _disp.s);
  return {
    s: _disp.s,
    lat: p.lat,
    lon: p.lon,
    segIdx: findSegAtS(geom, _disp.s),
    lateral: rawSnap.lateral,
    confidence: rawSnap.confidence
  };
}
function avgTangentDeg(geom, s2, windowM) {
  const end = Math.min(geom.s[geom.n - 1], s2 + windowM);
  let vx = 0;
  let vz = 0;
  const i0 = findSegAtS(geom, s2);
  for (let i = i0; i < geom.n - 1 && geom.s[i] < end; i++) {
    const r = Math.PI / 180;
    const midLat = (geom.lat[i] + geom.lat[i + 1]) / 2;
    const dLon = (geom.lon[i + 1] - geom.lon[i]) * Math.cos(midLat * r) * 111320;
    const dLat = (geom.lat[i + 1] - geom.lat[i]) * 110540;
    const len = Math.hypot(dLon, dLat) || 1;
    vx += dLon / len;
    vz += dLat / len;
  }
  if (vx === 0 && vz === 0) {
    const i = findSegAtS(geom, s2);
    return segmentBearing(geom, Math.min(i, geom.n - 2));
  }
  return (Math.atan2(vx, vz) * 180 / Math.PI + 360) % 360;
}
function camSmoothAlpha(dtSec) {
  return 1 - Math.pow(1 - CAM_SMOOTH_ALPHA, Math.max(1, dtSec * 60));
}
function updateCamHeading(geom, snap) {
  if (!geom || !snap) return _camHeadingRad;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const dt = _camLastTs ? Math.min(48, now - _camLastTs) / 1e3 : 1 / 60;
  _camLastTs = now;
  const tgt = avgTangentDeg(geom, snap.s, CAM_TANGENT_WINDOW) * Math.PI / 180;
  if (_camHeadingRad == null) {
    _camHeadingRad = tgt;
    return _camHeadingRad;
  }
  let diff = tgt - _camHeadingRad;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  _camHeadingRad += diff * camSmoothAlpha(dt);
  return _camHeadingRad;
}
function avgGradeAtS(geom, s2, windowM) {
  if (!geom?.elevReady) return 0;
  const total = geom.s[geom.n - 1];
  const sEnd = Math.min(total, s2 + windowM);
  const ds = sEnd - s2;
  if (ds < 0.5) return 0;
  const e0 = interpolateElevAtS(geom, s2);
  const e1 = interpolateElevAtS(geom, sEnd);
  return (e1 - e0) / ds;
}
function updateCamPitch(geom, snap, elevExag, enabled) {
  if (!enabled || !geom?.elevReady || !snap) {
    _camPitchRad = null;
    return CAM_PITCH;
  }
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const dt = _camPitchLastTs ? Math.min(48, now - _camPitchLastTs) / 1e3 : 1 / 60;
  _camPitchLastTs = now;
  const grade = avgGradeAtS(geom, snap.s, CAM_TANGENT_WINDOW);
  const roadPitch = Math.atan(grade * elevExag) * 0.35;
  const tgt = CAM_PITCH + Math.max(-0.14, Math.min(0.16, roadPitch));
  if (_camPitchRad == null) {
    _camPitchRad = tgt;
    return _camPitchRad;
  }
  _camPitchRad += (tgt - _camPitchRad) * camSmoothAlpha(dt);
  return _camPitchRad;
}
function getCamPitchRad() {
  return _camPitchRad != null ? _camPitchRad : CAM_PITCH;
}
function getCamHeadingRad() {
  return _camHeadingRad;
}
function interpolateElevAtS(geom, s2) {
  if (!geom.elevReady || !geom.elev.length) return 0;
  const i = findSegAtS(geom, s2);
  const s0 = geom.s[i];
  const s1 = geom.s[i + 1];
  const t = s1 > s0 ? (s2 - s0) / (s1 - s0) : 0;
  return geom.elev[i] + t * (geom.elev[i + 1] - geom.elev[i]);
}
function meterScale(lat) {
  const r = Math.PI / 180;
  return { kx: Math.cos(lat * r) * 111320, ky: 110540 };
}
function radiusAtS(geom, s2) {
  const ds = 2;
  const total = geom.s[geom.n - 1];
  const s0 = Math.max(0, s2 - ds);
  const s1 = s2;
  const s22 = Math.min(total, s2 + ds);
  const p0 = interpolateAtS(geom, s0);
  const p1 = interpolateAtS(geom, s1);
  const p2 = interpolateAtS(geom, s22);
  const { kx, ky } = meterScale(p1.lat);
  const ax = (p1.lon - p0.lon) * kx;
  const ay = (p1.lat - p0.lat) * ky;
  const bx = (p2.lon - p1.lon) * kx;
  const by = (p2.lat - p1.lat) * ky;
  const cross = ax * by - ay * bx;
  const la = Math.hypot(ax, ay);
  const lb = Math.hypot(bx, by);
  if (la < 0.01 || lb < 0.01) return { R: Infinity, turnSign: 0 };
  const dot = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
  const angle = Math.acos(dot);
  if (angle < 0.02) return { R: Infinity, turnSign: 0 };
  const R = Math.min(la, lb) / (2 * Math.sin(angle / 2));
  return { R, turnSign: cross > 0 ? 1 : -1 };
}
function ribbonStepAtS() {
  return RIBBON_STEP_M;
}
function extendRibbonNearCam(sections) {
  if (sections.length < 2) return sections;
  const s0 = sections[0];
  const s1 = sections[1];
  const dz = s1.cz - s0.cz;
  if (dz < 0.02) return sections;
  const inv = 1 / dz;
  const rate = {
    s: (s1.s - s0.s) * inv,
    elev: (s1.elev - s0.elev) * inv,
    cx: (s1.cx - s0.cx) * inv,
    lx: (s1.lx - s0.lx) * inv,
    lz: (s1.lz - s0.lz) * inv,
    rx: (s1.rx - s0.rx) * inv,
    rz: (s1.rz - s0.rz) * inv
  };
  const extra = [];
  for (let z = s0.cz - RIBBON_NEAR_Z_STEP; z >= RIBBON_NEAR_Z_MIN; z -= RIBBON_NEAR_Z_STEP) {
    const back = s0.cz - z;
    extra.push({
      s: s0.s - rate.s * back,
      lat: s0.lat,
      lon: s0.lon,
      elev: s0.elev - rate.elev * back,
      cx: s0.cx - rate.cx * back,
      cz: z,
      lx: s0.lx - rate.lx * back,
      lz: s0.lz - rate.lz * back,
      rx: s0.rx - rate.rx * back,
      rz: s0.rz - rate.rz * back
    });
  }
  return extra.length ? extra.concat(sections) : sections;
}
function computeRibbonSectionsCam(geom, snap, maxDist, halfW, headingRad) {
  const elev0 = geom.elevReady ? interpolateElevAtS(geom, snap.s) : 0;
  const sEnd = Math.min(geom.s[geom.n - 1], snap.s + maxDist);
  const step = ribbonStepAtS();
  const samples = [];
  for (let s2 = snap.s; s2 <= sEnd + 0.01; s2 += step) {
    const p = interpolateAtS(geom, s2);
    const c = worldToCamXZ(p.lat, p.lon, snap, headingRad);
    samples.push({
      s: s2,
      x: c.x,
      z: c.z,
      lat: p.lat,
      lon: p.lon,
      elev: geom.elevReady ? interpolateElevAtS(geom, s2) - elev0 : 0
    });
    if (s2 >= sEnd) break;
  }
  const sections = [];
  let prevNx = null;
  let prevNz = null;
  for (let i = 0; i < samples.length; i++) {
    const cur = samples[i];
    if (cur.z < 0.12) continue;
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(samples.length - 1, i + 1);
    let tx2 = samples[i1].x - samples[i0].x;
    let tz = samples[i1].z - samples[i0].z;
    const tl = Math.hypot(tx2, tz);
    if (tl < 0.08) continue;
    tx2 /= tl;
    tz /= tl;
    let nx = -tz;
    let nz = tx2;
    if (prevNx != null && nx * prevNx + nz * prevNz < 0) {
      nx = -nx;
      nz = -nz;
    }
    prevNx = nx;
    prevNz = nz;
    let leftW = halfW;
    let rightW = halfW;
    const { R, turnSign } = radiusAtS(geom, cur.s);
    if (R < Infinity && R < halfW * 5) {
      const maxOff = Math.max(0.55, R * 0.88);
      if (turnSign > 0) leftW = Math.min(leftW, maxOff);
      else if (turnSign < 0) rightW = Math.min(rightW, maxOff);
    }
    sections.push({
      s: cur.s,
      lat: cur.lat,
      lon: cur.lon,
      elev: cur.elev,
      cx: cur.x,
      cz: cur.z,
      lx: cur.x + nx * leftW,
      lz: cur.z + nz * leftW,
      rx: cur.x - nx * rightW,
      rz: cur.z - nz * rightW
    });
  }
  return sections;
}
function worldToCamXZ(lat, lon, snap, headingRad) {
  const { kx, ky } = meterScale(snap.lat);
  const dx = (lon - snap.lon) * kx;
  const dy = (lat - snap.lat) * ky;
  const cosH = Math.cos(headingRad);
  const sinH = Math.sin(headingRad);
  return {
    x: dx * cosH - dy * sinH,
    z: dx * sinH + dy * cosH
  };
}
function projectPointToRoute(geom, point) {
  if (!geom || geom.n < 2 || !point) return null;
  let best = null;
  for (let i = 0; i < geom.n - 1; i++) {
    const proj = projectOnSegment(
      point,
      geom.lat[i],
      geom.lon[i],
      geom.lat[i + 1],
      geom.lon[i + 1]
    );
    const segLen = geom.s[i + 1] - geom.s[i];
    const s2 = geom.s[i] + proj.t * segLen;
    if (!best || proj.lateral < best.lateral) {
      best = { s: s2, segIdx: i, lateral: proj.lateral, lat: proj.lat, lon: proj.lon };
    }
  }
  return best;
}
function latLngsSliceByS(geom, sFrom, sTo) {
  if (!geom || geom.n < 2) return [];
  const total = geom.s[geom.n - 1];
  const a = Math.max(0, Math.min(sFrom, total));
  const b = Math.max(a, Math.min(sTo, total));
  if (b - a < 0.5) return [];
  const out = [];
  const p0 = interpolateAtS(geom, a);
  out.push([p0.lat, p0.lon]);
  const i0 = findSegAtS(geom, a);
  const i1 = findSegAtS(geom, b);
  for (let i = i0 + 1; i <= i1 && i < geom.n; i++) {
    if (geom.s[i] > a + 0.01 && geom.s[i] < b - 0.01) {
      out.push([geom.lat[i], geom.lon[i]]);
    }
  }
  const p1 = interpolateAtS(geom, b);
  const last = out[out.length - 1];
  if (!last || Math.abs(last[0] - p1.lat) > 1e-7 || Math.abs(last[1] - p1.lon) > 1e-7) {
    out.push([p1.lat, p1.lon]);
  }
  return out;
}
function geometryToLatLngs(geom) {
  if (!geom) return [];
  const out = [];
  for (let i = 0; i < geom.n; i++) out.push([geom.lat[i], geom.lon[i]]);
  return out;
}
function remainingDistanceS(geom, snap) {
  if (!geom || !snap) return 0;
  return Math.max(0, geom.s[geom.n - 1] - snap.s);
}
var DENSE_STEP, ARC_ANGLE_THRESH, CAM_TANGENT_WINDOW, CAM_SMOOTH_ALPHA, RIBBON_STEP_M, _snap, _prevFixTs, _prevFixPos, _fixesSinceReset, _camHeadingRad, _camPitchRad, _snapMemoTs, _disp, _dispLastTs, _camLastTs, _camPitchLastTs, RIBBON_NEAR_Z_MIN, RIBBON_NEAR_Z_STEP;
var init_route_geometry = __esm({
  "js/route-geometry.js"() {
    init_geo();
    init_state();
    init_gps();
    init_maneuver_filter();
    init_snap_quality();
    init_nav_constants();
    DENSE_STEP = 3;
    ARC_ANGLE_THRESH = 15;
    CAM_TANGENT_WINDOW = 25;
    CAM_SMOOTH_ALPHA = 0.11;
    RIBBON_STEP_M = 2;
    _snap = null;
    _prevFixTs = 0;
    _prevFixPos = null;
    _fixesSinceReset = 0;
    _camHeadingRad = null;
    _camPitchRad = null;
    _snapMemoTs = null;
    _disp = { s: 0, inited: false };
    _dispLastTs = 0;
    _camLastTs = 0;
    _camPitchLastTs = 0;
    RIBBON_NEAR_Z_MIN = 0.06;
    RIBBON_NEAR_Z_STEP = 0.22;
  }
});

// js/gps-converge.js
function isNetworkFix(fix) {
  return fix.provider === "network" || fix.lowAccuracy === true;
}
function maxJump(v, dt, acc) {
  return (v || 0) * dt + (acc || GPS_CONVERGE_ACC_M) + GPS_CONVERGE_JUMP_PAD_M;
}
function checkBuffer(minFixes, accLimit) {
  if (_buf.length < minFixes) return false;
  const recent = _buf.slice(-minFixes);
  if (recent.some((f2) => isNetworkFix(f2) || f2.acc > accLimit)) return false;
  let gpsStreak = 0;
  for (const f2 of recent) {
    if (isNetworkFix(f2)) gpsStreak = 0;
    else gpsStreak++;
  }
  if (gpsStreak < 2) return false;
  for (let i = 1; i < recent.length; i++) {
    const a = recent[i - 1];
    const b = recent[i];
    const dt = Math.max(0.2, (b.ts - a.ts) / 1e3);
    const v = Math.max(a.speed || 0, b.speed || 0);
    const d = haversine(a, b);
    if (d > maxJump(v, dt, Math.max(a.acc, b.acc))) return false;
  }
  if (minFixes >= GPS_CONVERGE_MIN_FIXES) {
    const last3 = _buf.slice(-3);
    if (last3.length < 3 || last3.some((f2) => f2.acc > GPS_CONVERGE_LAST3_ACC_M)) return false;
  }
  return true;
}
function feedGpsConverge(fix) {
  if (!fix || fix.acc == null) return S.gpsConverged;
  if (!isNetworkFix(fix)) _gpsFixCount++;
  S.gpsFixCount = _gpsFixCount;
  _buf.push({
    lat: fix.lat,
    lon: fix.lon,
    acc: fix.acc,
    speed: fix.speed,
    ts: fix.ts,
    provider: fix.provider
  });
  while (_buf.length > 8) _buf.shift();
  const re = S.gpsConverged === false && _buf.length >= 2;
  const minFixes = re ? GPS_CONVERGE_RE_MIN_FIXES : GPS_CONVERGE_MIN_FIXES;
  const accLim = re ? GPS_CONVERGE_RE_ACC_M : GPS_CONVERGE_ACC_M;
  if (checkBuffer(minFixes, accLim)) S.gpsConverged = true;
  else if (!re && _buf.length < minFixes) S.gpsConverged = false;
  return S.gpsConverged;
}
function invalidateGpsConverge() {
  S.gpsConverged = false;
}
var _buf, _gpsFixCount;
var init_gps_converge = __esm({
  "js/gps-converge.js"() {
    init_state();
    init_geo();
    init_nav_constants();
    _buf = [];
    _gpsFixCount = 0;
  }
});

// js/gps.js
function curPos() {
  return RENDER_POS || S.gps;
}
function updateRenderPos() {
  if (!S.gps) {
    RENDER_POS = null;
    return;
  }
  const v = S.gps.speed != null && S.gps.speed > 0.6 ? S.gps.speed : 0;
  const hdg = S.smoothedHeading != null && !isNaN(S.smoothedHeading) ? S.smoothedHeading : S.gps.heading;
  if (!v || hdg == null || isNaN(hdg) || !S.fixPos) {
    RENDER_POS = S.gps;
    return;
  }
  const rad = Math.PI / 180;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  const dt = Math.min(1.6, Math.max(0, (now - S.fixAt) / 1e3));
  const dist = v * dt;
  RENDER_POS = {
    lat: S.fixPos.lat + dist * Math.cos(hdg * rad) / 110540,
    lon: S.fixPos.lon + dist * Math.sin(hdg * rad) / (Math.cos(S.fixPos.lat * rad) * 111320),
    speed: S.gps.speed,
    heading: S.gps.heading,
    acc: S.gps.acc
  };
}
function easeSpeed() {
  const el = $("v-speed");
  if (!el || !S.gps) return;
  const target = S.gps.speed != null && S.gps.speed >= 0 ? S.gps.speed * 3.6 : 0;
  S.dispSpeed += (target - S.dispSpeed) * 0.22;
  if (Math.abs(target - S.dispSpeed) < 0.3) S.dispSpeed = target;
  const shown = Math.round(S.dispSpeed);
  el.textContent = shown;
  el.classList.toggle("over", S.limit > 0 && target > S.limit + 3);
  el.classList.toggle("speed-3", shown >= 100);
}
function initGps(callbacks) {
  _onTick = callbacks.onTick || _onTick;
  _onVisual = callbacks.onVisual || _onVisual;
}
function visualLoop() {
  S.rafId = requestAnimationFrame(visualLoop);
  if (!$("hud").classList.contains("on")) return;
  telemetry_default.tickPerfFrame();
  updateRenderPos();
  easeSpeed();
  _onVisual();
}
function startVisualLoop() {
  if (!S.rafId) S.rafId = requestAnimationFrame(visualLoop);
}
function stopVisualLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = null;
  }
}
function updateGpsConvergeUI() {
  const el = $("gps-converge");
  if (el) {
    el.classList.toggle("on", $("hud").classList.contains("on") && !S.gpsConverged);
  }
  $("s-gps").textContent = S.gpsConverged ? "\u2705 GPS \xB1" + Math.round(S.gps?.acc || 0) + "\u043C" : "\u23F3 GPS \u0441\u0445\u043E\u0434\u0438\u0442\u0441\u044F\u2026";
  $("s-gps").className = S.gpsConverged ? "chip ok" : "chip";
  checkStartReady();
}
function checkStartReady() {
  const hasRoute = !!(S.route && S.route.coords && S.route.coords.length);
  $("btn-start").disabled = !(S.gps && S.finish && hasRoute);
  const buildBtn = $("btn-build-route");
  if (buildBtn) buildBtn.disabled = !(S.gps && S.finish);
}
function onGpsError() {
  $("s-gps").textContent = "\u274C GPS";
  $("s-gps").className = "chip err";
  invalidateGpsConverge();
  if (!_gpsLost) {
    _gpsLost = true;
    telemetry_default.log("nav", { sub: "gps_lost" });
  }
}
function applyGpsFix(next) {
  if (S.lastPos) {
    const d = haversine(S.lastPos, next);
    const dt = (next.ts - S.lastPos.ts) / 1e3;
    if (d > 3 && d < 500) S.distDone += d;
    if ((next.heading == null || isNaN(next.heading)) && d > 3) {
      next.heading = bearing(S.lastPos, next);
    }
    if (next.speed == null && dt > 0.2 && dt < 10) {
      const meas = d > 2.5 && d < 500 ? d / dt : 0;
      S.measSpeed = S.measSpeed == null ? meas : S.measSpeed * 0.6 + meas * 0.4;
      next.speed = S.measSpeed;
    }
  }
  updateHeadingHealth(next.heading, next.speed ?? S.measSpeed);
  const fused = fuseHeading(next.heading, next.speed ?? S.measSpeed);
  if (fused != null && !isNaN(fused)) next.heading = fused;
  if (next.heading != null && !isNaN(next.heading)) {
    if ((next.speed ?? 0) >= 3.2) S.lastReliableHeadingTs = Date.now();
    if (S.smoothedHeading == null) S.smoothedHeading = next.heading;
    else {
      const spd = next.speed ?? S.measSpeed ?? 0;
      const alpha = Math.min(1, FUSION_GPS_WEIGHT_MIN + spd / FUSION_GPS_WEIGHT_SPAN);
      const keep = 1 - alpha;
      const r = Math.PI / 180, d = 180 / Math.PI;
      const sx = Math.sin(S.smoothedHeading * r) * keep + Math.sin(next.heading * r) * alpha;
      const sy = Math.cos(S.smoothedHeading * r) * keep + Math.cos(next.heading * r) * alpha;
      S.smoothedHeading = (Math.atan2(sx, sy) * d + 360) % 360;
    }
  }
  S.lastPos = next;
  S.gps = next;
  S.fixPos = { lat: next.lat, lon: next.lon };
  S.fixAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  feedGpsConverge(next);
  if (next.acc != null && next.acc > GPS_INVALIDATE_ACC_M) invalidateGpsConverge();
  if ($("hud").classList.contains("on") && isSnapLost() && lostDurationMs() > GPS_LOST_RECONVERGE_MS) invalidateGpsConverge();
  updateGpsConvergeUI();
  if ($("hud").classList.contains("on")) _onTick();
  const rcv = Date.now();
  if (_gpsLost) {
    _gpsLost = false;
    telemetry_default.log("nav", { sub: "gps_restored" });
  }
  telemetry_default.logFix({
    lat: next.lat,
    lon: next.lon,
    acc: next.acc,
    speed: next.speed,
    heading: next.heading,
    alt: next.alt,
    ts: next.ts,
    rcv
  });
  if ($("hud").classList.contains("on") && S.route?.geometry) {
    const snap = getNavSnap(S.smoothedHeading);
    telemetry_default.logSnapFromResult(snap);
  }
}
function stopWebGps() {
  if (S.watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(S.watchId);
    S.watchId = null;
  }
}
function startWebGps() {
  if (!navigator.geolocation) {
    $("s-gps").textContent = "\u274C \u041D\u0435\u0442 GPS";
    $("s-gps").className = "chip err";
    return;
  }
  stopWebGps();
  $("s-gps").textContent = "\u23F3 GPS\u2026";
  $("s-gps").className = "chip";
  S.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const c = pos.coords;
      applyGpsFix({
        lat: c.latitude,
        lon: c.longitude,
        speed: c.speed != null && !isNaN(c.speed) && c.speed >= 0 ? c.speed : null,
        heading: c.heading == null ? null : c.heading,
        acc: c.accuracy,
        alt: c.altitude != null && !isNaN(c.altitude) ? c.altitude : null,
        ts: pos.timestamp
      });
    },
    onGpsError,
    { enableHighAccuracy: true, timeout: 15e3, maximumAge: 1e3 }
  );
}
function startGps() {
  _navMode = false;
  startHeadingSensors();
  if (isNative()) {
    $("s-gps").textContent = "\u23F3 GPS\u2026";
    $("s-gps").className = "chip";
    stopWebGps();
    startSetupGps(applyGpsFix, onGpsError).catch(onGpsError);
    return;
  }
  startWebGps();
}
async function startNavigationGps() {
  if (!isNative()) return;
  _navMode = true;
  await startNavGps(applyGpsFix, onGpsError);
}
async function stopNavigationGps() {
  if (!isNative()) return;
  _navMode = false;
  await stopNavGps();
  await startSetupGps(applyGpsFix, onGpsError).catch(onGpsError);
}
var RENDER_POS, _navMode, _gpsLost, _onTick, _onVisual;
var init_gps = __esm({
  "js/gps.js"() {
    init_state();
    init_geo();
    init_util();
    init_platform();
    init_native_gps();
    init_heading();
    init_telemetry();
    init_route_geometry();
    init_nav_constants();
    init_gps_converge();
    init_nav_constants();
    init_snap_quality();
    init_nav_constants();
    RENDER_POS = null;
    _navMode = false;
    _gpsLost = false;
    _onTick = () => {
    };
    _onVisual = () => {
    };
  }
});

// js/cam-status.js
function updateCamStatusUI() {
  const st = S.camLoadStatus || "idle";
  const n = S.cameras?.length || 0;
  const enabled = !!S.cams;
  const chip = $("s-cams");
  if (chip) {
    if (!enabled) {
      chip.textContent = "\u{1F4F7} \u0432\u044B\u043A\u043B";
      chip.className = "chip";
      chip.title = "\u041A\u0430\u043C\u0435\u0440\u044B \u043E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u044B \u0432 \u043E\u043F\u0446\u0438\u044F\u0445";
    } else if (st === "loading") {
      chip.textContent = "\u{1F4F7} \u2026";
      chip.className = "chip";
      chip.title = "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043A\u0430\u043C\u0435\u0440 \u043F\u043E \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0443\u2026";
    } else if (st === "ok") {
      chip.textContent = "\u{1F4F7} " + n;
      chip.className = "chip ok";
      chip.title = "\u041A\u0430\u043C\u0435\u0440 \u043D\u0430 \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0435: " + n;
    } else if (st === "err") {
      chip.textContent = "\u{1F4F7} \u2715";
      chip.className = "chip err";
      chip.title = "\u041A\u0430\u043C\u0435\u0440\u044B \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C";
    } else {
      chip.textContent = "\u{1F4F7} \u2014";
      chip.className = "chip";
      chip.title = "\u041A\u0430\u043C\u0435\u0440\u044B \u043F\u043E \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0443";
    }
  }
  const wrap = $("cam-status-wrap");
  const dot = $("cam-dot");
  const txt = $("cam-txt");
  if (!wrap || !dot || !txt) return;
  if (!enabled) {
    wrap.classList.add("hidden");
    return;
  }
  wrap.classList.remove("hidden");
  dot.classList.remove("ok", "err");
  if (st === "loading") {
    txt.textContent = "CAM\u2026";
    wrap.title = "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043A\u0430\u043C\u0435\u0440\u2026";
  } else if (st === "ok") {
    dot.classList.add("ok");
    txt.textContent = "CAM " + n;
    wrap.title = "\u041A\u0430\u043C\u0435\u0440 \u043D\u0430 \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0435: " + n;
  } else if (st === "err") {
    dot.classList.add("err");
    txt.textContent = "CAM \u2715";
    wrap.title = "\u041A\u0430\u043C\u0435\u0440\u044B \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C";
  } else {
    txt.textContent = "CAM";
    wrap.title = "\u041A\u0430\u043C\u0435\u0440\u044B \u043F\u043E \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0443";
  }
}
var init_cam_status = __esm({
  "js/cam-status.js"() {
    init_state();
    init_util();
  }
});

// js/curve-speed.js
function resetCurveRibbonState() {
  _ribbonState.clear();
}
function getCurveParams() {
  return PRESETS[S.curveStrict] || PRESETS.normal;
}
function vSafeFromR(R, params, gradeAt) {
  if (!isFinite(R) || R >= CURVE_R_WARN * 2) return Infinity;
  let v = Math.sqrt(params.aLat * Math.max(8, R));
  const grade = gradeAt || 0;
  if (grade < -0.02) v *= Math.max(0.72, 1 + grade * 2.2);
  return v;
}
function applySafeSpeedAtS(geom, s2, vSafe) {
  if (!isFinite(vSafe) || vSafe >= 80) return;
  const i = findSegAtS(geom, s2);
  if (!isFinite(geom.safeSpeed[i]) || geom.safeSpeed[i] > vSafe) {
    geom.safeSpeed[i] = vSafe;
  }
}
function computeCurveSpeed(geom, route) {
  if (!geom || geom.n < 3) return;
  resetCurveRibbonState();
  const n = geom.n;
  const params = getCurveParams();
  geom.radius = new Float64Array(n);
  geom.safeSpeed = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    const { R } = radiusAtS(geom, geom.s[j]);
    geom.radius[j] = R;
    geom.safeSpeed[j] = vSafeFromR(R, params, geom.grade?.[j]);
  }
  let spans = buildCurveSpans(geom);
  spans = spans.concat(buildManeuverCurveSpans(geom, route));
  geom._curveSpans = mergeSpans(spans);
  for (const sp of geom._curveSpans) {
    const v = vSafeFromR(sp.minR, params, geom.grade?.[findSegAtS(geom, sp.sApex)]);
    applySafeSpeedAtS(geom, sp.sApex, v);
  }
  geom.curveReady = true;
}
function buildCurveSpans(geom) {
  const spans = [];
  let active = false;
  let sStart = 0;
  let sMinR = 0;
  let minR = Infinity;
  for (let j = 0; j < geom.n; j++) {
    const R = geom.radius[j];
    const s2 = geom.s[j];
    const tight = R < CURVE_R_WARN;
    if (tight) {
      if (!active) {
        active = true;
        sStart = s2;
        minR = R;
        sMinR = s2;
      } else if (R < minR) {
        minR = R;
        sMinR = s2;
      }
    } else if (active) {
      if (s2 - sStart >= MIN_CURVE_LEN_M) {
        spans.push({ sEntry: sStart, sExit: s2, sApex: sMinR, minR });
      }
      active = false;
      minR = Infinity;
    }
  }
  if (active) {
    const s2 = geom.s[geom.n - 1];
    if (s2 - sStart >= MIN_CURVE_LEN_M) {
      spans.push({ sEntry: sStart, sExit: s2, sApex: sMinR, minR });
    }
  }
  return spans;
}
function buildManeuverCurveSpans(geom, route) {
  const out = [];
  const steps = route?.steps;
  if (steps?.length) {
    for (const st of steps) {
      if (st.type === "depart" || st.type === "arrive") continue;
      const m = geom.maneuvers?.find((mn) => mn.step === st);
      if (!m) continue;
      let turn = Math.abs(turnAngleAtS(geom, m.s));
      if (turn < 12 && st.modifier) {
        if (st.modifier === "uturn") turn = 160;
        else if (st.modifier.includes("sharp")) turn = Math.max(turn, 55);
        else if (st.modifier.includes("left") || st.modifier.includes("right")) turn = Math.max(turn, 28);
      }
      if (turn < 18) continue;
      const estR = Math.max(10, 280 / (turn / 22));
      if (estR >= CURVE_R_WARN) continue;
      const arc = Math.max(MIN_CURVE_LEN_M, estR * 0.55);
      out.push({
        sEntry: Math.max(0, m.s - arc * 0.35),
        sExit: m.s + arc * 0.65,
        sApex: m.s,
        minR: estR
      });
    }
  }
  if (out.length) return out;
  for (const m of geom.maneuvers || []) {
    const turn = Math.abs(turnAngleAtS(geom, m.s));
    if (turn < 22) continue;
    const estR = Math.max(10, 280 / (turn / 22));
    if (estR >= CURVE_R_WARN) continue;
    const arc = Math.max(MIN_CURVE_LEN_M, estR * 0.55);
    out.push({
      sEntry: Math.max(0, m.s - arc * 0.35),
      sExit: m.s + arc * 0.65,
      sApex: m.s,
      minR: estR
    });
  }
  return out;
}
function mergeSpans(spans) {
  if (!spans.length) return [];
  const sorted = spans.slice().sort((a, b) => a.sEntry - b.sEntry);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = out[out.length - 1];
    const cur = sorted[i];
    if (cur.sEntry <= prev.sExit + 30) {
      prev.sExit = Math.max(prev.sExit, cur.sExit);
      if (cur.minR < prev.minR) {
        prev.minR = cur.minR;
        prev.sApex = cur.sApex;
      }
    } else {
      out.push(cur);
    }
  }
  return out;
}
function curveSpanForApproach(s2, geom, leadM) {
  if (!geom?._curveSpans?.length) return null;
  let best = null;
  let bestDist = Infinity;
  for (const sp of geom._curveSpans) {
    const zoneStart = sp.sEntry - leadM;
    if (s2 >= zoneStart && s2 < sp.sEntry) {
      const d = sp.sEntry - s2;
      if (d < bestDist) {
        bestDist = d;
        best = sp;
      }
    }
  }
  return best;
}
function vSafeForSpan(geom, span) {
  if (!geom?.safeSpeed || !span) return Infinity;
  let vMin = Infinity;
  const i0 = findSegAtS(geom, span.sEntry);
  const i1 = findSegAtS(geom, Math.min(geom.s[geom.n - 1], span.sExit));
  for (let j = i0; j <= i1 && j < geom.n; j++) {
    const v = geom.safeSpeed[j];
    if (isFinite(v) && v < vMin) vMin = v;
  }
  if (isFinite(vMin) && vMin < 80) return vMin;
  const params = getCurveParams();
  return vSafeFromR(span.minR, params, geom.grade?.[findSegAtS(geom, span.sApex)]);
}
function ribbonCurveColor(sMid, geom, speedMps) {
  if (!S.curveWarn || !geom?.curveReady || speedMps < 3.5) return null;
  const leadM = Math.max(60, Math.min(280, speedMps * 7));
  const span = curveSpanForApproach(sMid, geom, leadM);
  if (!span) return null;
  const vSafe = vSafeForSpan(geom, span);
  if (!isFinite(vSafe) || vSafe < 2) return null;
  const ratio = speedMps / vSafe;
  const { yellow, red } = getCurveParams();
  const spanKey = Math.round(span.sEntry);
  let state = _ribbonState.get(spanKey) || null;
  if (state === "red") {
    if (ratio < red - RIBBON_HYST) state = ratio >= yellow ? "yellow" : null;
  } else if (state === "yellow") {
    if (ratio >= red) state = "red";
    else if (ratio < yellow - RIBBON_HYST) state = null;
  } else {
    if (ratio >= red) state = "red";
    else if (ratio >= yellow) state = "yellow";
  }
  _ribbonState.set(spanKey, state);
  if (state === "red") return THEME.curveRed;
  if (state === "yellow") return THEME.curveYellow;
  return null;
}
function pickCurveVoiceWarn(geom, snapS, speedMps) {
  if (!S.curveWarn || !geom?.curveReady || speedMps < 5 || !snapS) return null;
  const params = getCurveParams();
  for (const sp of geom._curveSpans || []) {
    if (sp.sEntry <= snapS + 5) continue;
    const dist = sp.sEntry - snapS;
    if (dist > 320) break;
    const vSafe = vSafeForSpan(geom, sp);
    if (speedMps <= vSafe * params.yellow) continue;
    const sec = dist / speedMps;
    if (sec > 7 || sec < 2.5) continue;
    return {
      key: "curve_" + Math.round(sp.sEntry),
      vSafeKmh: Math.round(vSafe * 3.6),
      sec: Math.round(sec)
    };
  }
  return null;
}
function loadCurveOptsFromStorage() {
  try {
    const raw = localStorage.getItem(CURVE_OPTS_KEY);
    if (!raw) return;
    const o = JSON.parse(raw);
    if (typeof o.enabled === "boolean") {
      const cb = document.getElementById("opt-curve-warn");
      if (cb) cb.checked = o.enabled;
    }
    if (typeof o.strict === "string") {
      const sel = document.getElementById("opt-curve-strict");
      if (sel) sel.value = o.strict;
    }
  } catch (e) {
  }
}
function saveCurveOptsToStorage() {
  try {
    localStorage.setItem(CURVE_OPTS_KEY, JSON.stringify({
      enabled: !!S.curveWarn,
      strict: S.curveStrict || "normal"
    }));
  } catch (e) {
  }
}
var CURVE_R_WARN, MIN_CURVE_LEN_M, G, RIBBON_HYST, _ribbonState, PRESETS;
var init_curve_speed = __esm({
  "js/curve-speed.js"() {
    init_state();
    init_theme();
    init_route_geometry();
    CURVE_R_WARN = 100;
    MIN_CURVE_LEN_M = 25;
    G = 9.81;
    RIBBON_HYST = 0.06;
    _ribbonState = /* @__PURE__ */ new Map();
    PRESETS = {
      relaxed: { aLat: 0.28 * G, yellow: 1, red: 1.12 },
      normal: { aLat: 0.32 * G, yellow: 0.88, red: 1.02 },
      strict: { aLat: 0.35 * G, yellow: 0.82, red: 0.96 }
    };
  }
});

// js/elevation.js
function getElevExag() {
  const v = S.elevExag;
  return typeof v === "number" && v > 0 ? v : DEFAULT_ELEV_EXAG;
}
function getElevProfileH() {
  const v = S.elevProfileH;
  if (typeof v !== "number" || !isFinite(v)) return DEFAULT_ELEV_PROFILE_H;
  return Math.max(MIN_ELEV_PROFILE_H, Math.min(MAX_ELEV_PROFILE_H, Math.round(v)));
}
function getElevProfileLenKm() {
  const v = S.elevProfileLenKm;
  if (typeof v !== "number" || !isFinite(v)) return DEFAULT_ELEV_PROFILE_LEN_KM;
  return Math.max(MIN_ELEV_PROFILE_LEN_KM, Math.min(MAX_ELEV_PROFILE_LEN_KM, v));
}
function getElevProfileLenM() {
  return getElevProfileLenKm() * 1e3;
}
function loadElevOptsFromStorage() {
  try {
    const raw = localStorage.getItem(ELEV_OPTS_KEY);
    if (!raw) return;
    const o = JSON.parse(raw);
    if (typeof o.show === "boolean" && typeof document !== "undefined") {
      const cb = document.getElementById("opt-elev-profile");
      if (cb) cb.checked = o.show;
    }
    if (typeof o.exag === "number") {
      const inp = document.getElementById("opt-elev-exag");
      if (inp) inp.value = String(o.exag);
    }
    if (typeof o.profileH === "number") {
      const inp = document.getElementById("opt-elev-profile-h");
      if (inp) inp.value = String(o.profileH);
    }
    if (typeof o.profileLenKm === "number") {
      const inp = document.getElementById("opt-elev-profile-len");
      if (inp) inp.value = String(o.profileLenKm);
    }
  } catch (e) {
  }
}
function saveElevOptsToStorage() {
  try {
    localStorage.setItem(ELEV_OPTS_KEY, JSON.stringify({
      show: !!S.showElevProfile,
      exag: getElevExag(),
      profileH: getElevProfileH(),
      profileLenKm: getElevProfileLenKm()
    }));
  } catch (e) {
  }
}
function notifyElevationReady() {
  _elevListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
    }
  });
}
function lonLatToTile(lon, lat, z) {
  const n = 2 ** z;
  const x = Math.floor((lon + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)), z };
}
function terrariumDecode(r, g, b) {
  return r * 256 + g + b / 256 - 32768;
}
async function fetchTerrariumTile(z, x, y) {
  const key = z + "/" + x + "/" + y;
  if (_tileCache.has(key)) return _tileCache.get(key);
  const url = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/" + z + "/" + x + "/" + y + ".png";
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, 256, 256).data);
    };
    img.onerror = () => reject(new Error("Terrarium tile"));
    img.src = url;
  });
  _tileCache.set(key, p);
  return p;
}
function sampleElevFromPixels(data, lon, lat, tile) {
  const n = 2 ** tile.z;
  const fx = (lon + 180) / 360 * n - tile.x;
  const latRad = lat * Math.PI / 180;
  const fy = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n - tile.y;
  const px = Math.max(0, Math.min(255, Math.floor(fx * 256)));
  const py = Math.max(0, Math.min(255, Math.floor(fy * 256)));
  const idx = (py * 256 + px) * 4;
  return terrariumDecode(data[idx], data[idx + 1], data[idx + 2]);
}
async function sampleElevTerrarium(lon, lat) {
  const tile = lonLatToTile(lon, lat, TERRARIUM_Z);
  const data = await fetchTerrariumTile(tile.z, tile.x, tile.y);
  return sampleElevFromPixels(data, lon, lat, tile);
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function fetchOpenTopoBatch(batch) {
  const locStr = batch.map((a) => a.lat.toFixed(6) + "," + a.lon.toFixed(6)).join("|");
  const url = "https://api.opentopodata.org/v1/aster30m?locations=" + encodeURIComponent(locStr);
  const r = await fetch(url);
  if (!r.ok) throw new Error("OpenTopo " + r.status);
  const j = await r.json();
  batch.forEach((a, i) => {
    const e = j.results?.[i]?.elevation;
    if (e != null && isFinite(e)) a.elev = e;
  });
}
function buildAnchors(geom) {
  const total = geom.s[geom.n - 1];
  const anchors = [];
  for (let s2 = 0; s2 <= total; s2 += ANCHOR_STEP_M) {
    const p = interpolateAtS(geom, s2);
    anchors.push({ s: s2, lat: p.lat, lon: p.lon, elev: null });
  }
  const last = anchors[anchors.length - 1];
  if (!last || last.s < total - 1) {
    const p = interpolateAtS(geom, total);
    anchors.push({ s: total, lat: p.lat, lon: p.lon, elev: null });
  }
  return anchors;
}
function elevFromAnchors(anchors, s2) {
  if (!anchors.length) return 0;
  if (s2 <= anchors[0].s) return anchors[0].elev ?? 0;
  const last = anchors[anchors.length - 1];
  if (s2 >= last.s) return last.elev ?? 0;
  let lo = 0;
  let hi = anchors.length - 1;
  while (lo < hi - 1) {
    const mid = lo + hi >> 1;
    if (anchors[mid].s <= s2) lo = mid;
    else hi = mid;
  }
  const a = anchors[lo];
  const b = anchors[hi];
  if (a.elev == null && b.elev == null) return 0;
  if (a.elev == null) return b.elev;
  if (b.elev == null) return a.elev;
  const t = b.s > a.s ? (s2 - a.s) / (b.s - a.s) : 0;
  return a.elev + t * (b.elev - a.elev);
}
function smoothElev(geom) {
  const n = geom.n;
  const half = SMOOTH_WINDOW_M;
  const out = new Float64Array(n);
  let j0 = 0;
  for (let i = 0; i < n; i++) {
    const s0 = geom.s[i];
    while (j0 < n && geom.s[j0] < s0 - half) j0++;
    let sum = 0;
    let wsum = 0;
    for (let j = j0; j < n && geom.s[j] <= s0 + half; j++) {
      const ds = Math.abs(geom.s[j] - s0);
      const w = 1 - ds / half;
      sum += geom.elev[j] * w;
      wsum += w;
    }
    out[i] = wsum > 0 ? sum / wsum : geom.elev[i];
  }
  geom.elev = out;
}
function computeGrade(geom) {
  const n = geom.n;
  for (let i = 0; i < n - 1; i++) {
    const ds = geom.s[i + 1] - geom.s[i];
    geom.grade[i] = ds > 0 ? (geom.elev[i + 1] - geom.elev[i]) / ds : 0;
  }
  geom.grade[n - 1] = geom.grade[n - 2] || 0;
  for (let i = 0; i < n; i++) {
    geom.grade[i] = Math.max(-0.25, Math.min(0.25, geom.grade[i]));
  }
}
function injectSimElevation(geom) {
  for (let j = 0; j < geom.n; j++) {
    const s2 = geom.s[j];
    geom.elev[j] = 150 + 28 * Math.sin(s2 / 320) + 14 * Math.sin(s2 / 85) + 6e-3 * s2;
  }
  smoothElev(geom);
  computeGrade(geom);
  geom.elevReady = true;
  computeCurveSpeed(geom, S.route);
  notifyElevationReady();
}
async function fetchElevationForGeometry(geom) {
  if (!geom || geom.n < 2) return;
  if (typeof document !== "undefined" && document.documentElement.getAttribute("data-sim") === "1") {
    injectSimElevation(geom);
    return;
  }
  const anchors = buildAnchors(geom);
  for (let i = 0; i < anchors.length; i += OPENTOPO_BATCH) {
    const batch = anchors.slice(i, i + OPENTOPO_BATCH);
    try {
      await fetchOpenTopoBatch(batch);
    } catch (e) {
      console.warn("OpenTopo batch:", e);
    }
    if (i + OPENTOPO_BATCH < anchors.length) await sleep(OPENTOPO_DELAY_MS);
  }
  for (const a of anchors) {
    if (a.elev != null) continue;
    try {
      a.elev = await sampleElevTerrarium(a.lon, a.lat);
    } catch (e) {
      a.elev = 0;
    }
  }
  for (let j = 0; j < geom.n; j++) {
    geom.elev[j] = elevFromAnchors(anchors, geom.s[j]);
  }
  smoothElev(geom);
  computeGrade(geom);
  geom.elevReady = true;
  computeCurveSpeed(geom, S.route);
  notifyElevationReady();
}
function loadRouteElevation() {
  if (!S.showElevProfile) return;
  const geom = S.route?.geometry;
  if (!geom || geom.elevReady) return;
  fetchElevationForGeometry(geom).catch((e) => console.warn("\u0412\u044B\u0441\u043E\u0442\u044B:", e));
}
function gradeColor(grade) {
  const t = getThemeTokens();
  const g = Math.abs(grade || 0);
  if (g < 0.04) return t.gradeFlat;
  if (g < 0.08) return t.gradeMid;
  return t.gradeSteep;
}
function renderElevProfile(snap, geom, W, H) {
  if (!S.showElevProfile || !geom?.elevReady || !snap) return "";
  const exag = getElevExag();
  const profileLenM = getElevProfileLenM();
  const s0 = snap.s;
  const s1 = Math.min(geom.s[geom.n - 1], s0 + profileLenM);
  if (s1 - s0 < 50) return "";
  const samples = [];
  for (let s2 = s0; s2 <= s1; s2 += 40) {
    const i = findSegAtS(geom, s2);
    const ds = geom.s[i + 1] - geom.s[i];
    const t = ds > 0 ? (s2 - geom.s[i]) / ds : 0;
    const elev = geom.elev[i] + t * (geom.elev[i + 1] - geom.elev[i]);
    samples.push({ s: s2 - s0, elev });
  }
  if (samples.length < 2) return "";
  const base = samples[0].elev;
  let minE = 0;
  let maxE = 0;
  samples.forEach((p) => {
    const d = (p.elev - base) * exag;
    minE = Math.min(minE, d);
    maxE = Math.max(maxE, d);
  });
  const pad = Math.max(8, (maxE - minE) * 0.15);
  minE -= pad;
  maxE += pad;
  const range = maxE - minE || 1;
  const mx = 8;
  const my = 4;
  const pw = W - mx * 2;
  const ph = H - my * 2;
  const toX = (ds) => mx + ds / profileLenM * pw;
  const toY = (d) => my + ph - (d - minE) / range * ph;
  let pathSegs = "";
  samples.forEach((p, i) => {
    if (i === 0) return;
    const a = samples[i - 1];
    const b = p;
    const sMid = s0 + (a.s + b.s) * 0.5;
    const gi = findSegAtS(geom, sMid);
    const col = gradeColor(geom.grade[gi] || 0);
    const x1 = toX(a.s);
    const y1 = toY((a.elev - base) * exag);
    const x2 = toX(b.s);
    const y2 = toY((b.elev - base) * exag);
    pathSegs += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="3" stroke-linecap="round"/>';
  });
  let marks = "";
  const tok = getThemeTokens();
  geom.maneuvers.forEach((m) => {
    if (m.s < s0 || m.s > s1) return;
    const x = toX(m.s - s0);
    marks += '<line x1="' + x.toFixed(1) + '" y1="' + my + '" x2="' + x.toFixed(1) + '" y2="' + (my + ph) + '" stroke="' + tok.accent + '" stroke-width="1" opacity="0.5"/>';
  });
  return '<g class="elev-profile" fill="none">' + marks + pathSegs + "</g>";
}
var TERRARIUM_Z, SMOOTH_WINDOW_M, ANCHOR_STEP_M, OPENTOPO_BATCH, OPENTOPO_DELAY_MS, _tileCache, _elevListeners;
var init_elevation = __esm({
  "js/elevation.js"() {
    init_state();
    init_route_geometry();
    init_theme_tokens();
    init_curve_speed();
    TERRARIUM_Z = 13;
    SMOOTH_WINDOW_M = 75;
    ANCHOR_STEP_M = 50;
    OPENTOPO_BATCH = 100;
    OPENTOPO_DELAY_MS = 1100;
    _tileCache = /* @__PURE__ */ new Map();
    _elevListeners = [];
  }
});

// js/crossings.js
function projectGround(x, z, elevDelta) {
  const pitch = getCamPitchRad();
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const dy = -CAM_H;
  const dz = z + CAM_B;
  const use3d = S.showElevProfile && S.route?.geometry?.elevReady;
  const elevLift = use3d ? (elevDelta || 0) * getElevExag() * 0.16 : 0;
  const Yc = dy * cp + dz * sp - elevLift;
  const Zc = -dy * sp + dz * cp;
  if (Zc < 0.85) return null;
  const sx = L2.cx + L2.camFocal * x / Zc;
  const sy = L2.camVoff - L2.camFocal * Yc / Zc;
  if (sx < -L2.W * 0.4 || sx > L2.W * 1.4) return null;
  return { x: sx, y: sy };
}
function resetCrossingTelemetry() {
  _crossLimitLoggedS = null;
}
function signedAngle(fromBrg, toBrg) {
  return (toBrg - fromBrg + 540) % 360 - 180;
}
function pickSideBearings(inter, travelBrg) {
  const inIdx = inter.in;
  const outIdx = inter.out;
  if (inIdx == null || outIdx == null || !inter.bearings?.length) return [];
  const sides = [];
  for (let i = 0; i < inter.bearings.length; i++) {
    if (i === inIdx || i === outIdx) continue;
    if (inter.entry && inter.entry[i] === false) continue;
    const brg = inter.bearings[i];
    const rel = signedAngle(travelBrg, brg);
    if (Math.abs(rel) < 12) continue;
    sides.push({ brg, side: rel < 0 ? "left" : "right", absRel: Math.abs(rel) });
  }
  const pick = (sideName) => sides.filter((s2) => s2.side === sideName).sort((a, b) => Math.abs(a.absRel - 90) - Math.abs(b.absRel - 90)).slice(0, 2).map((s2) => s2.brg);
  return pick("left").concat(pick("right"));
}
function buildWhiskers(lat, lon, sideBearings) {
  const axis = { lat, lon };
  return sideBearings.map((bearing2) => {
    const end = destPoint(axis, bearing2, WHISKER_LEN_M);
    return { bearing: bearing2, endLat: end.lat, endLon: end.lon };
  });
}
function mergeCrossings(list) {
  if (!list.length) return [];
  const sorted = list.slice().sort((a, b) => a.s - b.s);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = out[out.length - 1];
    const cur = sorted[i];
    if (cur.s - prev.s < CROSSING_MERGE_M) {
      const brgs = new Set(prev.sideBearings.concat(cur.sideBearings));
      prev.sideBearings = Array.from(brgs);
      prev.whiskers = buildWhiskers(prev.lat, prev.lon, prev.sideBearings);
      prev.isManeuver = prev.isManeuver || cur.isManeuver;
    } else {
      out.push(cur);
    }
  }
  return out;
}
function buildCrossingsData(steps, geom) {
  const raw = [];
  if (!steps?.length || !geom?.n) return { crossings: [], roundabouts: [] };
  for (const st of steps) {
    const ixList = st.intersections;
    if (!ixList?.length) continue;
    ixList.forEach((inter, ixIdx) => {
      const lat = inter.lat;
      const lon = inter.lon;
      const s2 = findSForLatLon(geom, lat, lon);
      const travelBrg = inter.out != null && inter.bearings?.[inter.out] != null ? inter.bearings[inter.out] : avgTangentDeg(geom, s2, 8);
      const sideBearings = pickSideBearings(inter, travelBrg);
      if (!sideBearings.length) return;
      const axis = interpolateAtS(geom, s2);
      const isManeuver = ixIdx === ixList.length - 1 || haversineLike(st.lat, st.lon, lat, lon) < 6;
      raw.push({
        s: s2,
        lat: axis.lat,
        lon: axis.lon,
        sideBearings,
        whiskers: buildWhiskers(axis.lat, axis.lon, sideBearings),
        isManeuver
      });
    });
  }
  const crossings = mergeCrossings(raw);
  const roundabouts = buildRoundabouts(steps, geom);
  telemetry_default.log("nav", {
    sub: "crossings_parsed",
    count: crossings.length,
    roundabouts: roundabouts.length
  });
  return { crossings, roundabouts };
}
function haversineLike(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 6371e3 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function buildRoundabouts(steps, geom) {
  const out = [];
  for (const st of steps) {
    if (st.type !== "roundabout" && st.type !== "rotary") continue;
    const ixList = st.intersections;
    if (!ixList?.length) continue;
    const firstIx = ixList[0];
    const sEnter = findSForLatLon(geom, firstIx.lat, firstIx.lon);
    const sExit = findSForLatLon(geom, st.lat, st.lon);
    let mainIx = ixList[0];
    for (const ix of ixList) {
      if ((ix.bearings?.length || 0) > (mainIx.bearings?.length || 0)) mainIx = ix;
    }
    const enterPt = interpolateAtS(geom, sEnter);
    const travelBrg = mainIx.out != null && mainIx.bearings?.[mainIx.out] != null ? mainIx.bearings[mainIx.out] : avgTangentDeg(geom, sEnter, 8);
    const inIdx = mainIx.in;
    const outIdx = mainIx.out;
    const exits = [];
    let totalExits = null;
    if (mainIx.bearings?.length && inIdx != null) {
      const exitBearings = [];
      for (let i = 0; i < mainIx.bearings.length; i++) {
        if (i === inIdx) continue;
        exitBearings.push(mainIx.bearings[i]);
      }
      totalExits = exitBearings.length || null;
      const targetBrg = outIdx != null ? mainIx.bearings[outIdx] : null;
      for (const brg of exitBearings) {
        exits.push({
          bearing: brg,
          isTarget: targetBrg != null && angleDiff(brg, targetBrg) < 25
        });
      }
    }
    out.push({
      sEnter,
      sExit,
      lat: enterPt.lat,
      lon: enterPt.lon,
      exitNumber: st.exit != null ? st.exit : 0,
      totalExits,
      exits,
      travelBearing: travelBrg
    });
  }
  return out.sort((a, b) => a.sEnter - b.sEnter);
}
function isCrossingContextEnabled() {
  return S.showCrossingContext !== false;
}
function getNextTurnManeuverS(geom, curS) {
  if (!geom?.maneuvers?.length || curS == null) return null;
  const sorted = geom.maneuvers.filter((m) => isSignificantManeuver(m, geom)).sort((a, b) => a.s - b.s);
  for (const m of sorted) {
    if (curS > m.s + MANEUVER_PASSED_M) continue;
    return m.s;
  }
  return null;
}
function crossingWindow(sManeuver, speedMps) {
  const v = Math.max(speedMps || 0, CROSSING_MIN_BACK_M / CROSSING_TIME_S);
  return {
    sMin: sManeuver - v * CROSSING_TIME_S,
    sMax: sManeuver + CROSSING_AHEAD_M
  };
}
function getVisibleCrossings(geom, curS, speedMps) {
  if (!geom?.crossings?.length || curS == null) return [];
  const sManeuver = getNextTurnManeuverS(geom, curS);
  if (sManeuver == null) return [];
  const { sMin, sMax } = crossingWindow(sManeuver, speedMps);
  const inRange = geom.crossings.filter((c) => c.s >= sMin && c.s <= sMax);
  if (!inRange.length) return [];
  if (inRange.length > CROSSING_MAX_VISIBLE) {
    if (_crossLimitLoggedS !== sManeuver) {
      _crossLimitLoggedS = sManeuver;
      telemetry_default.log("nav", { sub: "crossings_over_limit", s_maneuver: Math.round(sManeuver) });
    }
    inRange.sort((a, b) => Math.abs(a.s - sManeuver) - Math.abs(b.s - sManeuver));
    return inRange.slice(0, CROSSING_MAX_VISIBLE);
  }
  return inRange;
}
function getActiveRoundabout(geom, curS, speedMps) {
  if (!geom?.roundabouts?.length || curS == null) return null;
  const v = Math.max(speedMps || 0, CROSSING_MIN_BACK_M / CROSSING_TIME_S);
  const back = v * CROSSING_TIME_S;
  for (const rb of geom.roundabouts) {
    if (curS >= rb.sEnter - back && curS <= rb.sExit) return rb;
  }
  return null;
}
function renderCrossingWhiskers(snap, headingRad, geom, curS, speedMps) {
  if (!isCrossingContextEnabled()) return "";
  const crossings = getVisibleCrossings(geom, curS, speedMps);
  if (!crossings.length) return "";
  const tok = getThemeTokens();
  const sw = Math.max(1, tok.pathEdgeW * 0.5);
  const ctxCol = tok.pathContext;
  const ctxOp = tok.pathContextOpacity;
  const sorted = crossings.slice().sort((a, b) => b.s - a.s);
  let out = "";
  for (const cx of sorted) {
    const col = cx.isManeuver ? tok.accent : ctxCol;
    const op = cx.isManeuver ? 1 : ctxOp;
    for (const w of cx.whiskers) {
      const start2 = worldToCamXZ(cx.lat, cx.lon, snap, headingRad);
      const end = worldToCamXZ(w.endLat, w.endLon, snap, headingRad);
      if (start2.z < 2 || start2.z > ROAD_MAX) continue;
      if (end.z < 0.5) continue;
      const P0 = projectGround(start2.x, start2.z, 0);
      const P1 = projectGround(end.x, end.z, 0);
      if (!P0 || !P1) continue;
      out += '<line x1="' + P0.x.toFixed(1) + '" y1="' + P0.y.toFixed(1) + '" x2="' + P1.x.toFixed(1) + '" y2="' + P1.y.toFixed(1) + '" stroke="' + col + '" stroke-width="' + sw.toFixed(1) + '" stroke-linecap="round" stroke-opacity="' + op.toFixed(2) + '"/>';
    }
  }
  return out;
}
function renderRoundaboutSchema(rb, snap, headingRad) {
  if (!rb) return "";
  const tok = getThemeTokens();
  const loc = worldToCamXZ(rb.lat, rb.lon, snap, headingRad);
  if (loc.z < 5 || loc.z > ROAD_MAX) return "";
  const P = projectGround(loc.x, loc.z, 0);
  if (!P) return "";
  const r = L2.W * 0.085;
  const cx = P.x;
  const cy = P.y;
  const swRing = Math.max(1, tok.pathEdgeW * 0.5);
  let out = '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="none" stroke="' + tok.pathContext + '" stroke-width="' + swRing.toFixed(1) + '" stroke-opacity="' + tok.pathContextOpacity.toFixed(2) + '"/>';
  const showAll = rb.totalExits != null && rb.exits.length > 1;
  const exits = showAll ? rb.exits : rb.exits.filter((e) => e.isTarget);
  for (const ex of exits) {
    const rel = signedAngle(rb.travelBearing, ex.bearing) * Math.PI / 180;
    const tickLen = ex.isTarget ? r * 0.42 : r * 0.26;
    const sw = ex.isTarget ? Math.max(1.5, tok.pathEdgeW * 0.85) : swRing;
    const col = ex.isTarget ? tok.accent : tok.pathContext;
    const op = ex.isTarget ? 1 : tok.pathContextOpacity;
    const inner = r * 0.72;
    const x1 = cx + Math.sin(rel) * inner;
    const y1 = cy - Math.cos(rel) * inner;
    const x2 = cx + Math.sin(rel) * (inner + tickLen);
    const y2 = cy - Math.cos(rel) * (inner + tickLen);
    out += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + col + '" stroke-width="' + sw.toFixed(1) + '" stroke-linecap="round" stroke-opacity="' + op.toFixed(2) + '"/>';
  }
  return out;
}
var WHISKER_LEN_M, CROSSING_MERGE_M, CROSSING_MAX_VISIBLE, CROSSING_AHEAD_M, CROSSING_MIN_BACK_M, CROSSING_TIME_S, _crossLimitLoggedS;
var init_crossings = __esm({
  "js/crossings.js"() {
    init_state();
    init_geo();
    init_route_geometry();
    init_theme_tokens();
    init_elevation();
    init_telemetry();
    init_route();
    WHISKER_LEN_M = 18;
    CROSSING_MERGE_M = 10;
    CROSSING_MAX_VISIBLE = 6;
    CROSSING_AHEAD_M = 30;
    CROSSING_MIN_BACK_M = 150;
    CROSSING_TIME_S = 15;
    _crossLimitLoggedS = null;
  }
});

// js/fuel.js
function fuelRouteKey() {
  const r = S.route;
  if (!r) return "";
  return (r.distance || 0) + ":" + (r.coords?.length || 0) + ":" + (r.geometry?.n || 0);
}
function invalidateFuelRouteS() {
  _fuelRouteKey = null;
  S.fuelStations.forEach((st) => {
    delete st.routeS;
    delete st.offRoute;
  });
}
function fuelColor(status) {
  return FUEL_COLORS[status] || FUEL_COLORS.unknown;
}
function fuelStatusText(status) {
  return { yes: "\u0435\u0441\u0442\u044C", queue: "\u043E\u0447\u0435\u0440\u0435\u0434\u044C", low: "\u043C\u0430\u043B\u043E", no: "\u043D\u0435\u0442 \u0442\u043E\u043F\u043B\u0438\u0432\u0430" }[status] || "\u043D\u0430\u043B\u0438\u0447\u0438\u0435 ?";
}
function routeBBox(bufDeg) {
  const buf = bufDeg || 0.05;
  if (S.route && S.route.coords.length) {
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    S.route.coords.forEach((c) => {
      if (c[0] < minLat) minLat = c[0];
      if (c[0] > maxLat) maxLat = c[0];
      if (c[1] < minLon) minLon = c[1];
      if (c[1] > maxLon) maxLon = c[1];
    });
    return [minLat - buf, minLon - buf, maxLat + buf, maxLon + buf];
  }
  const p = curPos() || S.gps;
  if (!p) return null;
  return [p.lat - buf, p.lon - buf, p.lat + buf, p.lon + buf];
}
async function loadFromOverpass() {
  const bb = routeBBox();
  if (!bb) return [];
  const [minLat, minLon, maxLat, maxLon] = bb;
  const q = `[out:json][timeout:25];
    (node["amenity"="fuel"](${minLat},${minLon},${maxLat},${maxLon});
     way["amenity"="fuel"](${minLat},${minLon},${maxLat},${maxLon}););
    out center 300;`;
  const r = await fetch(
    "https://overpass-api.de/api/interpreter",
    { method: "POST", body: "data=" + encodeURIComponent(q) }
  );
  if (!r.ok) throw new Error("Overpass " + r.status);
  const j = await r.json();
  return (j.elements || []).map((e) => {
    const t = e.tags || {};
    const lat = e.lat != null ? e.lat : e.center && e.center.lat;
    const lon = e.lon != null ? e.lon : e.center && e.center.lon;
    if (lat == null || lon == null) return null;
    return {
      osmId: String(e.id),
      lat,
      lon,
      brand: t.brand || t.name || t.operator || "\u0410\u0417\u0421",
      name: t.name || t.brand || "\u0410\u0417\u0421",
      status: "unknown"
    };
  }).filter(Boolean);
}
async function enrichFromGdebenz(stations) {
  const sim = !!window.__SIM__;
  if (!isNative() && !sim) return;
  const p = curPos() || S.gps;
  if (!p) return;
  let data;
  try {
    if (sim) {
      const r = await fetch("https://gdebenz.ru/api/nearby?lat=" + p.lat + "&lon=" + p.lon + "&radius_km=40");
      data = await r.json();
    } else {
      const { CapacitorHttp: CapacitorHttp2 } = await Promise.resolve().then(() => (init_dist(), dist_exports));
      const resp = await CapacitorHttp2.get({
        url: "https://gdebenz.ru/api/nearby",
        params: { lat: String(p.lat), lon: String(p.lon), radius_km: "40" }
      });
      data = typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
    }
  } catch (e) {
    console.warn("\u0413\u0434\u0435\u0411\u0415\u041D\u0417 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D:", e);
    return;
  }
  if (!data || !Array.isArray(data.stations)) return;
  const byId = /* @__PURE__ */ new Map();
  data.stations.forEach((s2) => {
    if (s2.osm_id) byId.set(String(s2.osm_id), s2);
  });
  stations.forEach((st) => {
    const g = byId.get(st.osmId);
    if (g && g.status) {
      st.status = g.status;
      if (g.brand) st.brand = g.brand;
      st.confirmations = g.confirmations;
      st.lastAt = g.last_at;
    }
  });
  S.fuelSource = "gdebenz";
}
async function ensureFuelStations(force) {
  if (S.fuelStatus === "loading") return;
  if (!force && S.fuelStatus === "ready" && S.fuelStations.length) return;
  S.fuelStatus = "loading";
  S.fuelSource = "osm";
  try {
    const stations = await loadFromOverpass();
    await enrichFromGdebenz(stations);
    S.fuelStations = stations;
    S.fuelStatus = "ready";
  } catch (e) {
    console.warn("\u0410\u0417\u0421 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C:", e);
    S.fuelStatus = "error";
    S.fuelStations = [];
  }
}
function recomputeFuelGeometry() {
  const pos = curPos() || S.gps;
  if (!pos) return;
  const key = fuelRouteKey();
  if (key !== _fuelRouteKey) {
    _fuelRouteKey = key;
    S.fuelStations.forEach((st) => {
      delete st.routeS;
      delete st.offRoute;
    });
  }
  const geom = S.route?.geometry?.n > 1 ? S.route.geometry : null;
  const near = S.route ? findNearestOnRoute() : null;
  const curS = near?.s;
  S.fuelStations.forEach((st) => {
    st.distGps = haversine(pos, st);
    if (geom) {
      if (st.routeS == null) {
        const proj = projectPointToRoute(geom, st);
        if (proj) {
          st.routeS = proj.s;
          st.offRoute = proj.lateral;
        } else {
          st.offRoute = Infinity;
        }
      }
      st.aheadOnRoute = false;
      st.distAhead = Infinity;
      if (st.routeS != null && curS != null && st.offRoute <= FUEL_CORRIDOR && st.routeS >= curS - 20) {
        st.aheadOnRoute = true;
        st.distAhead = Math.max(0, st.routeS - curS);
      }
    } else {
      st.offRoute = Infinity;
      st.aheadOnRoute = false;
      st.distAhead = Infinity;
    }
  });
}
function resetFuelRouteBinding() {
  invalidateFuelRouteS();
}
function bestAlongRoute() {
  recomputeFuelGeometry();
  const cands = S.fuelStations.filter((s2) => s2.aheadOnRoute && s2.distAhead > 50);
  cands.sort((a, b) => a.distAhead - b.distAhead);
  return cands[0] || null;
}
function nearestOverall(exclude) {
  recomputeFuelGeometry();
  const cands = S.fuelStations.filter((s2) => s2.distGps > 50 && (!exclude || s2.osmId !== exclude.osmId));
  cands.sort((a, b) => a.distGps - b.distGps);
  return cands[0] || null;
}
async function searchNearestFuelStations(limit) {
  await ensureFuelStations(true);
  recomputeFuelGeometry();
  return S.fuelStations.filter((s2) => s2.distGps != null && isFinite(s2.distGps)).sort((a, b) => a.distGps - b.distGps).slice(0, Math.max(1, limit || 5));
}
function formatFuelDist(m) {
  if (m == null || !isFinite(m)) return "\u2014";
  if (m < 1e3) return Math.round(m) + " \u043C";
  return (m / 1e3).toFixed(1).replace(".", ",") + " \u043A\u043C";
}
async function prefetchFuelForMap() {
  try {
    await ensureFuelStations(true);
    recomputeFuelGeometry();
  } catch (e) {
    console.warn("\u0410\u0417\u0421 \u043D\u0430 \u043A\u0430\u0440\u0442\u0435:", e);
  }
}
function fuelStationsForMap(limit) {
  if (!S.fuelStations.length) return [];
  recomputeFuelGeometry();
  return S.fuelStations.filter((s2) => s2.routeS != null && (s2.offRoute ?? Infinity) <= FUEL_CORRIDOR + 150).sort((a, b) => a.routeS - b.routeS).slice(0, limit || 48);
}
function fuelStationsForRoad(maxDist) {
  if (S.fuelMode === 0 || !S.fuelStations.length) return [];
  recomputeFuelGeometry();
  return S.fuelStations.filter((s2) => s2.aheadOnRoute && s2.distAhead <= (maxDist || 3e3)).sort((a, b) => a.distAhead - b.distAhead).slice(0, 4);
}
var _fuelRouteKey;
var init_fuel = __esm({
  "js/fuel.js"() {
    init_state();
    init_geo();
    init_gps();
    init_route();
    init_route_geometry();
    init_platform();
    _fuelRouteKey = null;
  }
});

// node_modules/@capacitor-community/text-to-speech/dist/esm/definitions.js
var QueueStrategy;
var init_definitions3 = __esm({
  "node_modules/@capacitor-community/text-to-speech/dist/esm/definitions.js"() {
    (function(QueueStrategy2) {
      QueueStrategy2[QueueStrategy2["Flush"] = 0] = "Flush";
      QueueStrategy2[QueueStrategy2["Add"] = 1] = "Add";
    })(QueueStrategy || (QueueStrategy = {}));
  }
});

// node_modules/@capacitor-community/text-to-speech/dist/esm/web.js
var web_exports3 = {};
__export(web_exports3, {
  TextToSpeechWeb: () => TextToSpeechWeb
});
var TextToSpeechWeb;
var init_web3 = __esm({
  "node_modules/@capacitor-community/text-to-speech/dist/esm/web.js"() {
    init_dist();
    TextToSpeechWeb = class extends WebPlugin {
      constructor() {
        super();
        this.speechSynthesis = null;
        if ("speechSynthesis" in window) {
          this.speechSynthesis = window.speechSynthesis;
          window.addEventListener("beforeunload", () => {
            this.stop();
          });
        }
      }
      async speak(options) {
        if (!this.speechSynthesis) {
          this.throwUnsupportedError();
        }
        await this.stop();
        const speechSynthesis2 = this.speechSynthesis;
        const utterance = this.createSpeechSynthesisUtterance(options);
        return new Promise((resolve, reject) => {
          utterance.onend = () => {
            resolve();
          };
          utterance.onerror = (event) => {
            reject(event);
          };
          speechSynthesis2.speak(utterance);
        });
      }
      async stop() {
        if (!this.speechSynthesis) {
          this.throwUnsupportedError();
        }
        this.speechSynthesis.cancel();
      }
      async getSupportedLanguages() {
        const voices = this.getSpeechSynthesisVoices();
        const languages = voices.map((voice) => voice.lang);
        const filteredLanguages = languages.filter((v, i, a) => a.indexOf(v) == i);
        return { languages: filteredLanguages };
      }
      async getSupportedVoices() {
        const voices = this.getSpeechSynthesisVoices();
        return { voices };
      }
      async isLanguageSupported(options) {
        const result = await this.getSupportedLanguages();
        const isLanguageSupported = result.languages.includes(options.lang);
        return { supported: isLanguageSupported };
      }
      async openInstall() {
        this.throwUnimplementedError();
      }
      createSpeechSynthesisUtterance(options) {
        const voices = this.getSpeechSynthesisVoices();
        const utterance = new SpeechSynthesisUtterance();
        const { text, lang, rate, pitch, volume, voice } = options;
        if (voice) {
          utterance.voice = voices[voice];
        }
        if (volume) {
          utterance.volume = volume >= 0 && volume <= 1 ? volume : 1;
        }
        if (rate) {
          utterance.rate = rate >= 0.1 && rate <= 10 ? rate : 1;
        }
        if (pitch) {
          utterance.pitch = pitch >= 0 && pitch <= 2 ? pitch : 2;
        }
        if (lang) {
          utterance.lang = lang;
        }
        utterance.text = text;
        return utterance;
      }
      getSpeechSynthesisVoices() {
        if (!this.speechSynthesis) {
          this.throwUnsupportedError();
        }
        if (!this.supportedVoices || this.supportedVoices.length < 1) {
          this.supportedVoices = this.speechSynthesis.getVoices();
        }
        return this.supportedVoices;
      }
      throwUnsupportedError() {
        throw this.unavailable("SpeechSynthesis API not available in this browser.");
      }
      throwUnimplementedError() {
        throw this.unimplemented("Not implemented on web.");
      }
    };
  }
});

// node_modules/@capacitor-community/text-to-speech/dist/esm/index.js
var esm_exports = {};
__export(esm_exports, {
  QueueStrategy: () => QueueStrategy,
  TextToSpeech: () => TextToSpeech
});
var TextToSpeech;
var init_esm3 = __esm({
  "node_modules/@capacitor-community/text-to-speech/dist/esm/index.js"() {
    init_dist();
    init_definitions3();
    TextToSpeech = registerPlugin("TextToSpeech", {
      web: () => Promise.resolve().then(() => (init_web3(), web_exports3)).then((m) => new m.TextToSpeechWeb())
    });
    if ("speechSynthesis" in window) {
      window.speechSynthesis;
    }
  }
});

// js/tts-ru.js
function scoreRuVoice(v) {
  const name = String(v.name || v.voiceURI || v.identifier || "").toLowerCase();
  const lang = String(v.lang || v.language || "").toLowerCase();
  if (!lang.startsWith("ru")) return -1;
  let score = 0;
  const offline = v.localService === true || v.network === false || v.networkConnectionRequired === false;
  if (offline) score += 28;
  if (name.includes("google")) score += 55;
  if (/ruc|ru-ru-x|x-ruc/.test(name)) score += 35;
  if (name.includes("yandex")) score += 48;
  if (name.includes("microsoft")) score += 38;
  if (name.includes("pavel") || name.includes("dmitry")) score += 22;
  if (name.includes("irina") || name.includes("milena")) score += 14;
  if (v.default) score += 6;
  if (name.includes("e-speak") || name.includes("espeak") || name.includes("festival")) score -= 45;
  return score;
}
async function refreshRuVoice() {
  _voiceReady = true;
  if (isNative()) {
    try {
      const { TextToSpeech: TextToSpeech2 } = await Promise.resolve().then(() => (init_esm3(), esm_exports));
      const res = await TextToSpeech2.getSupportedVoices();
      const list2 = res.voices || [];
      let best2 = -1;
      let bestScore2 = -1;
      list2.forEach((v, i) => {
        const sc = scoreRuVoice(v);
        if (sc > bestScore2) {
          bestScore2 = sc;
          best2 = i;
        }
      });
      _nativeVoiceIdx = best2;
    } catch (e) {
      _nativeVoiceIdx = -1;
    }
    return;
  }
  if (!("speechSynthesis" in window)) {
    _webVoice = null;
    return;
  }
  const list = speechSynthesis.getVoices();
  let best = null;
  let bestScore = -1;
  for (const v of list) {
    const sc = scoreRuVoice(v);
    if (sc > bestScore) {
      bestScore = sc;
      best = v;
    }
  }
  _webVoice = best;
}
function initRuVoice() {
  refreshRuVoice();
  if ("speechSynthesis" in window) {
    speechSynthesis.addEventListener("voiceschanged", () => {
      refreshRuVoice();
    }, { once: false });
  }
}
function getNativeRuVoiceIdx() {
  return _nativeVoiceIdx;
}
function getWebRuVoice() {
  return _webVoice;
}
var _nativeVoiceIdx, _webVoice, _voiceReady;
var init_tts_ru = __esm({
  "js/tts-ru.js"() {
    init_platform();
    _nativeVoiceIdx = -1;
    _webVoice = null;
    _voiceReady = false;
  }
});

// js/voice.js
async function speakNative(text, phraseId) {
  await refreshRuVoice();
  const voiceIdx = getNativeRuVoiceIdx();
  const { TextToSpeech: TextToSpeech2 } = await Promise.resolve().then(() => (init_esm3(), esm_exports));
  telemetry_default.log("audio", { sub: "started", id: phraseId });
  const opts = {
    text,
    lang: "ru-RU",
    rate: TTS_RATE,
    pitch: TTS_PITCH,
    volume: 1,
    category: "playback"
  };
  if (voiceIdx >= 0) opts.voice = voiceIdx;
  await TextToSpeech2.speak(opts);
}
function speakWeb(text, phraseId) {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }
    try {
      speechSynthesis.cancel();
      const u2 = new SpeechSynthesisUtterance(text);
      u2.lang = "ru-RU";
      u2.rate = TTS_RATE;
      u2.pitch = TTS_PITCH;
      let voice = getWebRuVoice();
      if (!voice) {
        const list = speechSynthesis.getVoices().filter((v) => (v.lang || "").toLowerCase().startsWith("ru"));
        voice = list[0] || null;
      }
      if (voice) u2.voice = voice;
      u2.onstart = () => telemetry_default.log("audio", { sub: "started", id: phraseId });
      u2.onend = () => resolve();
      u2.onerror = () => reject(new Error("TTS"));
      speechSynthesis.speak(u2);
    } catch (e) {
      reject(e);
    }
  });
}
async function drainVoiceQueue() {
  if (_busy || !_queue.length) return;
  _busy = true;
  const item = _queue.shift();
  const text = item.text;
  const phraseId = item.id;
  try {
    if (isNative()) await speakNative(text, phraseId);
    else await speakWeb(text, phraseId);
  } catch (e) {
    console.warn("\u041E\u0437\u0432\u0443\u0447\u043A\u0430:", e);
    try {
      await speakWeb(text, phraseId);
    } catch (e2) {
    }
  } finally {
    _busy = false;
    if (_queue.length) drainVoiceQueue();
  }
}
function speak(text) {
  if (!S.voice || !text) return;
  const t = String(text);
  const now = Date.now();
  if (t === _lastText && now - _lastSpeakTs < DEDUPE_MS) return;
  _lastText = t;
  _lastSpeakTs = now;
  const phraseId = ++_phraseId;
  telemetry_default.log("audio", { sub: "queued", id: phraseId });
  _queue.push({ text: t, id: phraseId });
  while (_queue.length > MAX_QUEUE) _queue.shift();
  drainVoiceQueue();
}
function clearVoiceQueue() {
  _queue.length = 0;
  if ("speechSynthesis" in window) {
    try {
      speechSynthesis.cancel();
    } catch (e) {
    }
  }
}
function maneuverText(step) {
  if (!isTurnStep(step)) return "";
  const m = step.modifier || "";
  if (m === "uturn") return "\u0420\u0430\u0437\u0432\u043E\u0440\u043E\u0442";
  if (m.includes("left")) return "\u041F\u043E\u0432\u0435\u0440\u043D\u0438\u0442\u0435 \u043D\u0430\u043B\u0435\u0432\u043E";
  if (m.includes("right")) return "\u041F\u043E\u0432\u0435\u0440\u043D\u0438\u0442\u0435 \u043D\u0430\u043F\u0440\u0430\u0432\u043E";
  return "";
}
function isCameraBehind(cam, heading) {
  if (cam.dir == null || heading == null) return S.noDirPolicy === "warn";
  return angleDiff(cam.dir, heading) <= S.tolerance;
}
var _queue, _busy, _phraseId, MAX_QUEUE, _lastText, _lastSpeakTs, DEDUPE_MS, TTS_RATE, TTS_PITCH;
var init_voice = __esm({
  "js/voice.js"() {
    init_state();
    init_geo();
    init_platform();
    init_tts_ru();
    init_telemetry();
    init_maneuver_filter();
    _queue = [];
    _busy = false;
    _phraseId = 0;
    MAX_QUEUE = 4;
    _lastText = "";
    _lastSpeakTs = 0;
    DEDUPE_MS = 6500;
    TTS_RATE = 0.98;
    TTS_PITCH = 1;
  }
});

// js/router.js
function getRouterBackend() {
  return S.routerBackend || RouterBackend.OSRM;
}
function buildRouteRequestUrl(from, to, opts = {}) {
  const backend = getRouterBackend();
  if (backend === RouterBackend.VALHALLA) {
    throw new Error("Valhalla: \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D (\u0441\u043F\u0430\u0439\u043A \u0424\u0430\u0437\u0430 4)");
  }
  const pts = opts.waypoints?.length ? opts.waypoints : [from, to];
  const coordStr = pts.map((p) => `${p.lon},${p.lat}`).join(";");
  let url = OSRM_BASE + coordStr + "?overview=full&geometries=geojson&steps=true&annotations=false";
  if (opts.alternatives) url += "&alternatives=2";
  if (opts.rerouteBearing != null && opts.rerouteRadius != null && pts.length === 2) {
    url += "&bearings=" + opts.rerouteBearing + ",45;&radiuses=" + opts.rerouteRadius + ";";
  }
  return url;
}
function parseRouteResponse(json) {
  if (!json?.routes?.length) throw new Error("\u041C\u0430\u0440\u0448\u0440\u0443\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D");
  return json.routes;
}
var RouterBackend, OSRM_BASE;
var init_router = __esm({
  "js/router.js"() {
    init_state();
    RouterBackend = { OSRM: "osrm", VALHALLA: "valhalla" };
    OSRM_BASE = "https://router.project-osrm.org/route/v1/driving/";
  }
});

// js/route-quality.js
function assessRouteQuality(route) {
  const geom = route?.geometry;
  if (!geom || geom.n < 2) return RouteQuality.OK;
  const totalM = geom.s[geom.n - 1] || 0;
  if (totalM < 500) return RouteQuality.OK;
  let segSum = 0;
  for (let i = 1; i < geom.n; i++) segSum += geom.s[i] - geom.s[i - 1];
  const avgSeg = segSum / Math.max(1, geom.n - 1);
  const maneuvers = geom.maneuvers?.length || 0;
  const perKm = totalM > 0 ? maneuvers / totalM * 1e3 : 0;
  if (avgSeg < ROUTE_LOW_AVG_SEG_M || perKm > ROUTE_LOW_MANEUVER_PER_KM) {
    return RouteQuality.LOW;
  }
  return RouteQuality.OK;
}
var RouteQuality;
var init_route_quality = __esm({
  "js/route-quality.js"() {
    init_nav_constants();
    RouteQuality = { OK: "OK", LOW: "LOW" };
  }
});

// js/route.js
function getVisibleTurnManeuvers(geom, curS, limit) {
  const maxN = limit || 3;
  const sorted = geom.maneuvers.filter((m) => isSignificantManeuver(m, geom)).sort((a, b) => a.s - b.s);
  const out = [];
  for (const m of sorted) {
    if (curS > m.s + MANEUVER_PASSED_M) continue;
    const ahead = m.s - curS;
    if (ahead > 500) continue;
    out.push({ maneuver: m, distAhead: Math.max(0, ahead) });
    if (out.length >= maxN) break;
  }
  return out;
}
function ensureRouteGeometry(route) {
  if (!route) return null;
  if (route.geometry?.n > 1) {
    if (route.geometry.crossings == null && route.steps?.some((st) => st.intersections?.length)) {
      const { crossings, roundabouts } = buildCrossingsData(route.steps, route.geometry);
      route.geometry.crossings = crossings;
      route.geometry.roundabouts = roundabouts;
    }
    computeCurveSpeed(route.geometry, route);
    return route.geometry;
  }
  try {
    route.geometry = buildRouteGeometry(route);
    if (route.geometry) {
      const { crossings, roundabouts } = buildCrossingsData(route.steps, route.geometry);
      route.geometry.crossings = crossings;
      route.geometry.roundabouts = roundabouts;
      computeCurveSpeed(route.geometry, route);
    }
    loadRouteElevation();
    return route.geometry;
  } catch (e) {
    console.warn("RouteGeometry:", e);
    route.geometry = null;
    return null;
  }
}
function attachRouteGeometry(route) {
  ensureRouteGeometry(route);
  S.routeQuality = assessRouteQuality(route);
  S.compassMode = S.routeQuality === RouteQuality.LOW;
  resetRouteSnap();
  resetCrossingTelemetry();
  resetFuelRouteBinding();
}
function seedSnapAfterReroute() {
  const geom = S.route?.geometry;
  const gps = S.gps;
  if (!geom || !gps) return;
  const s0 = findSForLatLon(geom, gps.lat, gps.lon);
  const p = interpolateAtS(geom, s0);
  const lat = haversine(gps, p);
  const tan = avgTangentDeg(geom, s0, 25);
  const hdg = S.smoothedHeading;
  if (lat > REROUTE_SEED_MAX_LATERAL_M) return;
  if (hdg != null && angleDiff(hdg, tan) > REROUTE_SEED_MAX_ANGLE_DEG) return;
  resetRouteSnap({ seedS: s0, lateral: lat });
}
function scheduleGeometryBuild(routes, onDone) {
  if (!routes?.length) {
    if (onDone) onDone();
    return;
  }
  let i = 0;
  const step = () => {
    if (i >= routes.length) {
      if (onDone) onDone();
      return;
    }
    ensureRouteGeometry(routes[i]);
    i++;
    setTimeout(step, 0);
  };
  setTimeout(step, 50);
}
function saveLastRun() {
  try {
    const route = S.route ? { ...S.route, geometry: void 0 } : null;
    localStorage.setItem(RUN_KEY, JSON.stringify({
      route,
      cameras: S.cameras,
      finish: S.finish,
      ts: Date.now()
    }));
  } catch (e) {
  }
}
function loadLastRun() {
  try {
    const r = localStorage.getItem(RUN_KEY);
    return r ? JSON.parse(r) : null;
  } catch (e) {
    return null;
  }
}
async function searchAddress(query) {
  const url = "https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=ru&q=" + encodeURIComponent(query) + "&email=moto-hud-dev@users.noreply.github.com";
  const r = await fetch(url, {
    headers: { Accept: "application/json" },
    referrerPolicy: "no-referrer"
  });
  if (!r.ok) throw new Error("Nominatim " + r.status);
  return r.json();
}
function highwayFromIntersections(intersections) {
  for (const ix of intersections || []) {
    for (const c of ix.classes || []) {
      if (HIGHWAY_CLASSES.includes(c)) return c;
    }
  }
  return "";
}
function parseOsrmRoute(rt) {
  const coords = rt.geometry.coordinates.map((c) => [c[1], c[0]]);
  const steps = [];
  rt.legs.forEach((leg) => {
    leg.steps.forEach((st) => {
      const loc = st.maneuver.location;
      const m = st.maneuver;
      const intersections = (st.intersections || []).map((ix) => ({
        lat: ix.location[1],
        lon: ix.location[0],
        bearings: ix.bearings || [],
        entry: ix.entry,
        in: ix.in,
        out: ix.out,
        classes: ix.classes || []
      }));
      steps.push({
        lat: loc[1],
        lon: loc[0],
        type: m.type,
        modifier: m.modifier,
        name: st.name || "",
        distance: st.distance,
        exit: m.exit,
        bearing_before: m.bearing_before,
        bearing_after: m.bearing_after,
        highway: highwayFromIntersections(st.intersections),
        intersections
      });
    });
  });
  return { coords, steps, distance: rt.distance, duration: rt.duration };
}
async function fetchRouteAlternatives() {
  if (!S.gps || !S.finish) throw new Error("\u041D\u0443\u0436\u043D\u044B GPS \u0438 \u0444\u0438\u043D\u0438\u0448");
  S._usedCache = false;
  const url = buildRouteRequestUrl(S.gps, S.finish, { alternatives: true });
  const r = await fetch(url);
  if (!r.ok) throw new Error("OSRM HTTP " + r.status);
  const j = await r.json();
  return parseRouteResponse(j).map(parseOsrmRoute);
}
async function fetchRouteThroughWaypoints(waypoints) {
  if (!waypoints || waypoints.length < 2) throw new Error("\u041D\u0443\u0436\u043D\u043E \u22652 \u0442\u043E\u0447\u0435\u043A");
  S._usedCache = false;
  const url = buildRouteRequestUrl(null, null, { waypoints });
  const r = await fetch(url);
  if (!r.ok) throw new Error("OSRM HTTP " + r.status);
  const j = await r.json();
  return parseOsrmRoute(parseRouteResponse(j)[0]);
}
function buildDirectRouteFromWaypoints(waypoints) {
  if (!waypoints || waypoints.length < 2) throw new Error("\u041D\u0443\u0436\u043D\u043E \u22652 \u0442\u043E\u0447\u0435\u043A");
  const coords = waypoints.map((w) => [w.lat, w.lon]);
  let distance = 0;
  for (let i = 1; i < waypoints.length; i++) {
    distance += haversine(waypoints[i - 1], waypoints[i]);
  }
  const duration = distance / (50 / 3.6);
  const steps = waypoints.map((w, i) => ({
    lat: w.lat,
    lon: w.lon,
    type: i === 0 ? "depart" : i === waypoints.length - 1 ? "arrive" : "turn",
    modifier: "",
    name: w.label || "",
    distance: i > 0 ? haversine(waypoints[i - 1], w) : 0,
    bearing_before: i > 1 ? bearing(waypoints[i - 2], waypoints[i - 1]) : null,
    bearing_after: i < waypoints.length - 1 ? bearing(w, waypoints[i + 1]) : null,
    highway: "",
    intersections: []
  }));
  return { coords, steps, distance, duration, _direct: true };
}
function attachRouteFromImport(route, waypoints) {
  S.routeAlternatives = [route];
  S.selectedRouteIdx = 0;
  S.route = route;
  attachRouteGeometry(S.route);
  const last = waypoints[waypoints.length - 1];
  S.finish = { lat: last.lat, lon: last.lon, label: last.label || "\u042F\u043D\u0434\u0435\u043A\u0441" };
  S._usedCache = false;
}
function selectRouteIndex(idx) {
  if (!S.routeAlternatives.length) return;
  S.selectedRouteIdx = Math.max(0, Math.min(S.routeAlternatives.length - 1, idx));
  S.route = S.routeAlternatives[S.selectedRouteIdx];
  resetRouteSnap();
  resetFuelRouteBinding();
}
async function buildRoute(opts = {}) {
  const { reroute = false, allowCache = true } = opts;
  if (S.routeAlternatives.length) {
    selectRouteIndex(S.selectedRouteIdx);
    return;
  }
  S._usedCache = false;
  const rerouteOpts = {};
  if (reroute) {
    const spd = S.gps.speed != null ? S.gps.speed : 0;
    const hdg = S.smoothedHeading;
    if (spd > 3 && hdg != null && !isNaN(hdg)) {
      rerouteOpts.rerouteBearing = Math.round(hdg);
      rerouteOpts.rerouteRadius = Math.max(30, Math.round(S.gps.acc || 30));
    }
  }
  const url = buildRouteRequestUrl(S.gps, S.finish, rerouteOpts);
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("OSRM HTTP " + r.status);
    const j = await r.json();
    S.route = parseOsrmRoute(parseRouteResponse(j)[0]);
    attachRouteGeometry(S.route);
    if (!reroute) telemetry_default.log("nav", { sub: "route_built" });
  } catch (err) {
    if (!allowCache) {
      throw err;
    }
    const last = loadLastRun();
    if (last && last.route && S.finish && last.finish && haversine(last.finish, S.finish) < 60) {
      S.route = last.route;
      delete S.route.geometry;
      attachRouteGeometry(S.route);
      if (Array.isArray(last.cameras)) S.cameras = last.cameras;
      S._usedCache = true;
      return;
    }
    throw new Error("\u041D\u0435\u0442 \u0441\u0435\u0442\u0438 \u0438 \u043D\u0435\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u043E\u0433\u043E \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0430 \u043A \u044D\u0442\u043E\u0439 \u0442\u043E\u0447\u043A\u0435");
  }
}
function classifyRerouteError(err) {
  const msg = String(err?.message || err || "");
  if (err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(msg)) {
    return "network";
  }
  if (/не найден|no route|NoRoute/i.test(msg)) return "no_route";
  if (/OSRM HTTP/i.test(msg)) return "osrm_error";
  return "network";
}
async function recalcRoute() {
  if (S.rerouting) return false;
  S.rerouting = true;
  const t0 = Date.now();
  try {
    S.routeAlternatives = [];
    await buildRoute({ reroute: true, allowCache: false });
    seedSnapAfterReroute();
    telemetry_default.log("nav", { sub: "reroute" });
    Array.from(S.camWarned).forEach((k) => {
      if (typeof k === "string" && k.startsWith("st_")) S.camWarned.delete(k);
    });
    await loadCameras();
    if (S.camLoadStatus === "err") {
      console.warn("\u041A\u0430\u043C\u0435\u0440\u044B \u043F\u043E\u0441\u043B\u0435 \u043F\u0435\u0440\u0435\u0441\u0447\u0451\u0442\u0430 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C");
      telemetry_default.log("nav", { sub: "cameras_reload_failed" });
    }
    S.rerouteBackoffStep = 0;
    S.rerouteBackoffUntil = 0;
    return true;
  } catch (e) {
    console.warn("\u041F\u0435\u0440\u0435\u0441\u0447\u0451\u0442 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F:", e);
    const reason = classifyRerouteError(e);
    telemetry_default.log("nav", {
      sub: "reroute_failed",
      reason,
      dur_ms: Date.now() - t0
    });
    const delays = [5e3, 15e3, 6e4];
    const step = Math.min(S.rerouteBackoffStep, 2);
    S.rerouteBackoffUntil = Date.now() + delays[step];
    S.rerouteBackoffStep = Math.min(S.rerouteBackoffStep + 1, 2);
    return false;
  } finally {
    S.rerouting = false;
  }
}
async function loadCameras() {
  if (!S.cams || !S.route) {
    S.cameras = [];
    S.camLoadStatus = S.cams ? "idle" : "off";
    updateCamStatusUI();
    return;
  }
  if (S._usedCache && S.cameras.length) {
    S.camLoadStatus = "ok";
    updateCamStatusUI();
    return;
  }
  S.camLoadStatus = "loading";
  updateCamStatusUI();
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  S.route.coords.forEach((c) => {
    if (c[0] < minLat) minLat = c[0];
    if (c[0] > maxLat) maxLat = c[0];
    if (c[1] < minLon) minLon = c[1];
    if (c[1] > maxLon) maxLon = c[1];
  });
  const buf = 0.02;
  minLat -= buf;
  maxLat += buf;
  minLon -= buf;
  maxLon += buf;
  const q = `[out:json][timeout:20];
    (node["highway"="speed_camera"](${minLat},${minLon},${maxLat},${maxLon});
     node["enforcement"="maxspeed"](${minLat},${minLon},${maxLat},${maxLon}););
    out body;`;
  try {
    const r = await fetch(
      "https://overpass-api.de/api/interpreter",
      { method: "POST", body: "data=" + encodeURIComponent(q) }
    );
    if (!r.ok) throw new Error("Overpass " + r.status);
    const j = await r.json();
    S.cameras = (j.elements || []).map((e) => {
      const t = e.tags || {};
      let dir = null;
      if (t.direction != null) {
        const raw = String(t.direction).trim();
        const num = parseFloat(raw);
        if (!isNaN(num)) dir = (num % 360 + 360) % 360;
        else {
          const CARD = {
            N: 0,
            NNE: 22.5,
            NE: 45,
            ENE: 67.5,
            E: 90,
            ESE: 112.5,
            SE: 135,
            SSE: 157.5,
            S: 180,
            SSW: 202.5,
            SW: 225,
            WSW: 247.5,
            W: 270,
            WNW: 292.5,
            NW: 315,
            NNW: 337.5
          };
          const up = raw.toUpperCase();
          if (CARD[up] != null) dir = CARD[up];
        }
      }
      return { lat: e.lat, lon: e.lon, speed: t.maxspeed ? parseInt(t.maxspeed, 10) : null, dir };
    });
    S.camLoadStatus = "ok";
  } catch (e) {
    console.warn("\u041A\u0430\u043C\u0435\u0440\u044B \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C:", e);
    S.cameras = [];
    S.camLoadStatus = "err";
  }
  updateCamStatusUI();
}
function findNearestOnRoute() {
  if (!S.route) return null;
  const pos = curPos();
  if (!pos) return null;
  if (_nearMemoPos === pos) return _nearMemoVal;
  const geom = S.route.geometry || ensureRouteGeometry(S.route);
  if (geom) {
    const snap = getRouteSnapForNav(S.smoothedHeading);
    if (snap) {
      _nearIdx = snap.segIdx;
      _nearMemoPos = pos;
      _nearMemoVal = { idx: snap.segIdx, dist: snap.lateral, s: snap.s };
      return _nearMemoVal;
    }
  }
  const c = S.route.coords, n = c.length;
  const scan = (lo2, hi2) => {
    let best2 = { idx: lo2, dist: Infinity };
    for (let i = lo2; i < hi2; i++) {
      const d = distToSegment(
        pos,
        { lat: c[i][0], lon: c[i][1] },
        { lat: c[i + 1][0], lon: c[i + 1][1] }
      );
      if (d < best2.dist) {
        best2.dist = d;
        best2.idx = i;
      }
    }
    return best2;
  };
  const lo = Math.max(0, _nearIdx - 8), hi = Math.min(n - 1, _nearIdx + 60);
  let best = scan(lo, hi);
  if (best.dist > 60) best = scan(0, n - 1);
  _nearIdx = best.idx;
  _nearMemoPos = pos;
  _nearMemoVal = best;
  return best;
}
function stepCoordIndex(step) {
  if (step._ci != null) return step._ci;
  const c = S.route.coords;
  let bi = 0, bd = Infinity;
  for (let i = 0; i < c.length; i++) {
    const d = haversine({ lat: c[i][0], lon: c[i][1] }, step);
    if (d < bd) {
      bd = d;
      bi = i;
    }
  }
  step._ci = bi;
  return bi;
}
function findNextManeuver() {
  if (!S.route || !S.route.steps.length) return null;
  const geom = S.route.geometry;
  const snap = geom ? getNavSnap(S.smoothedHeading) : null;
  const curS = snap ? snap.s : null;
  const curIdx = snap ? snap.segIdx : findNearestOnRoute()?.idx ?? 0;
  if (geom && curS != null) {
    const sorted = geom.maneuvers.filter((m) => m.step.type !== "depart" && m.step.type !== "arrive").sort((a, b) => a.s - b.s);
    for (const m of sorted) {
      if (m.step.type === "arrive") {
        if (curS <= m.s + MANEUVER_PASSED_M) {
          const along2 = Math.max(0, m.s - curS);
          return { step: m.step, dist: along2 > 0 ? along2 : haversine(S.gps, m.step) };
        }
        continue;
      }
      if (!isSignificantManeuver(m, geom)) continue;
      if (curS > m.s + MANEUVER_PASSED_M) continue;
      const along = Math.max(0, m.s - curS);
      return { step: m.step, dist: along > 0 ? along : haversine(S.gps, m.step) };
    }
    return null;
  }
  for (const st of S.route.steps) {
    if (st.type === "depart") continue;
    if (stepCoordIndex(st) >= curIdx) {
      return { step: st, dist: haversine(S.gps, st) };
    }
  }
  return null;
}
function getRemainingDistance() {
  if (!S.route || !S.gps) return 0;
  const geom = S.route.geometry;
  const snap = geom ? getNavSnap(S.smoothedHeading) : null;
  if (snap) return remainingDistanceS(geom, snap);
  const near = findNearestOnRoute();
  let remaining = 0;
  if (near) {
    const c = S.route.coords;
    remaining = distToSegment(
      S.gps,
      { lat: c[near.idx][0], lon: c[near.idx][1] },
      { lat: c[near.idx + 1][0], lon: c[near.idx + 1][1] }
    );
    for (let i = near.idx + 1; i < c.length - 1; i++) {
      remaining += haversine(
        { lat: c[i][0], lon: c[i][1] },
        { lat: c[i + 1][0], lon: c[i + 1][1] }
      );
    }
  } else {
    remaining = haversine(S.gps, S.finish);
  }
  return remaining;
}
function maneuverTurnAngle(step) {
  if (!S.route || !step) return 0;
  const coords = S.route.coords;
  const si = stepCoordIndex(step);
  const distM = (i, j) => haversine(
    { lat: coords[i][0], lon: coords[i][1] },
    { lat: coords[j][0], lon: coords[j][1] }
  );
  let bi = si, ai = si;
  let acc = 0;
  while (bi > 0 && acc < 25) {
    bi--;
    acc += distM(bi, bi + 1);
  }
  acc = 0;
  while (ai < coords.length - 1 && acc < 25) {
    ai++;
    acc += distM(ai - 1, ai);
  }
  if (bi >= ai) return 0;
  const bIn = bearing(
    { lat: coords[bi][0], lon: coords[bi][1] },
    { lat: coords[bi + 1][0], lon: coords[bi + 1][1] }
  );
  const bOut = bearing(
    { lat: coords[ai - 1][0], lon: coords[ai - 1][1] },
    { lat: coords[ai][0], lon: coords[ai][1] }
  );
  return (bOut - bIn + 540) % 360 - 180;
}
var _nearMemoPos, _nearMemoVal, _nearIdx;
var init_route = __esm({
  "js/route.js"() {
    init_state();
    init_geo();
    init_gps();
    init_cam_status();
    init_route_geometry();
    init_crossings();
    init_elevation();
    init_curve_speed();
    init_fuel();
    init_voice();
    init_telemetry();
    init_maneuver_filter();
    init_nav_constants();
    init_router();
    init_maneuver_filter();
    init_route_quality();
    _nearMemoPos = null;
    _nearMemoVal = null;
    _nearIdx = 0;
  }
});

// js/render.js
function computePathLayout(w, h) {
  const aspect = Math.max(0.2, w / Math.max(1, h));
  L2.W = 1e3;
  L2.H = Math.max(480, Math.min(2400, Math.round(L2.W / aspect)));
  L2.roadH = L2.H;
  L2.cx = L2.W / 2;
  L2.land = aspect > 1;
  L2.camFocal = L2.land ? 900 : 1300;
  L2.camVoff = L2.H * 0.78;
  L2.horizonY = L2.camVoff - L2.camFocal * Math.tan(CAM_PITCH);
}
function projectGround2(x, z, elevDelta) {
  const pitch = getCamPitchRad();
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const dy = -CAM_H;
  const dz = z + CAM_B;
  const use3d = S.showElevProfile && S.route?.geometry?.elevReady;
  const elevLift = use3d ? (elevDelta || 0) * getElevExag() * 0.16 : 0;
  const Yc = dy * cp + dz * sp - elevLift;
  const Zc = -dy * sp + dz * cp;
  if (Zc < 0.85) return null;
  const sx = L2.cx + L2.camFocal * x / Zc;
  const sy = L2.camVoff - L2.camFocal * Yc / Zc;
  if (sx < -L2.W * 0.4 || sx > L2.W * 1.4) return null;
  return { x: sx, y: sy };
}
function toLocalFrenet(lat, lon, snap, headingRad) {
  return worldToCamXZ(lat, lon, snap, headingRad);
}
function projectWorld(lat, lon, elev, snap, headingRad) {
  const { x, z } = worldToCamXZ(lat, lon, snap, headingRad);
  return projectGround2(x, z, elev);
}
function triArea2(a, b, c) {
  if (!a || !b || !c) return 0;
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
function projectCam(x, z, elev) {
  return projectGround2(x, z, elev);
}
function buildStripMeshSvg(sections, geom, speedMps) {
  if (sections.length < 2) return { fill: "", edges: "" };
  const tok = getThemeTokens();
  const fillNone = tok.pathFill === "none" || tok.pathFill === "transparent";
  let fill = "";
  let edges = "";
  const pt = (p) => p.x.toFixed(1) + "," + p.y.toFixed(1);
  const edgeW = tok.pathEdgeW;
  const glowExtra = tok.glow !== "none" ? ' opacity="' + Math.max(0.1, tok.glowOpacity || 0.25) + '"' : "";
  for (let i = sections.length - 2; i >= 0; i--) {
    const a = sections[i];
    const b = sections[i + 1];
    if (b.cz <= a.cz + 0.05) continue;
    const aL = projectCam(a.lx, a.lz, a.elev);
    const aR = projectCam(a.rx, a.rz, a.elev);
    const bL = projectCam(b.lx, b.lz, b.elev);
    const bR = projectCam(b.rx, b.rz, b.elev);
    if (!aL || !aR || !bL || !bR) continue;
    const sMid = (a.s + b.s) * 0.5;
    const warnCol = ribbonCurveColor(sMid, geom, speedMps);
    const fillCol = warnCol || tok.pathFill;
    const edgeCol = warnCol || tok.pathEdge;
    const fillOp = warnCol ? 0.48 : tok.pathFillOpacity;
    const ew = warnCol ? edgeW + 2 : edgeW;
    if (!fillNone) {
      const t1 = triArea2(aL, bL, bR);
      const t2 = triArea2(aL, bR, aR);
      const bowTie = t1 * t2 <= 0;
      if (!bowTie || a.cz < 8 || b.cz < 8) {
        if (t1 > 1) {
          fill += '<polygon points="' + pt(aL) + " " + pt(bL) + " " + pt(bR) + '" fill="' + fillCol + '" fill-opacity="' + fillOp + '" stroke="none"/>';
        }
        if (t2 > 1) {
          fill += '<polygon points="' + pt(aL) + " " + pt(bR) + " " + pt(aR) + '" fill="' + fillCol + '" fill-opacity="' + fillOp + '" stroke="none"/>';
        }
      }
    }
    const dash = tok.pathDash !== "none" ? ' stroke-dasharray="' + tok.pathDash + '"' : "";
    edges += '<line x1="' + aL.x.toFixed(1) + '" y1="' + aL.y.toFixed(1) + '" x2="' + bL.x.toFixed(1) + '" y2="' + bL.y.toFixed(1) + '" stroke="' + edgeCol + '" stroke-width="' + ew + '" stroke-linecap="round"' + dash + glowExtra + '/><line x1="' + aR.x.toFixed(1) + '" y1="' + aR.y.toFixed(1) + '" x2="' + bR.x.toFixed(1) + '" y2="' + bR.y.toFixed(1) + '" stroke="' + edgeCol + '" stroke-width="' + ew + '" stroke-linecap="round"' + dash + glowExtra + "/>";
    if (tok.glow !== "none") {
      edges += '<line x1="' + aL.x.toFixed(1) + '" y1="' + aL.y.toFixed(1) + '" x2="' + bL.x.toFixed(1) + '" y2="' + bL.y.toFixed(1) + '" stroke="' + tok.glow + '" stroke-width="' + (ew + 4) + '" stroke-linecap="round" opacity="' + (tok.glowOpacity || 0.25) + '"/><line x1="' + aR.x.toFixed(1) + '" y1="' + aR.y.toFixed(1) + '" x2="' + bR.x.toFixed(1) + '" y2="' + bR.y.toFixed(1) + '" stroke="' + tok.glow + '" stroke-width="' + (ew + 4) + '" stroke-linecap="round" opacity="' + (tok.glowOpacity || 0.25) + '"/>';
    }
  }
  return { fill, edges };
}
function effectiveHeading() {
  if (S.smoothedHeading != null && !isNaN(S.smoothedHeading)) return S.smoothedHeading;
  const rad = getCamHeadingRad();
  if (rad != null) return (rad * 180 / Math.PI + 360) % 360;
  return null;
}
function turnAngleAt(step) {
  const coords = S.route.coords;
  let bi = 0;
  let bd = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const d = haversine({ lat: coords[i][0], lon: coords[i][1] }, step);
    if (d < bd) {
      bd = d;
      bi = i;
    }
  }
  if (bi <= 0 || bi >= coords.length - 1) return null;
  const bIn = bearing(
    { lat: coords[bi - 1][0], lon: coords[bi - 1][1] },
    { lat: coords[bi][0], lon: coords[bi][1] }
  );
  const bOut = bearing(
    { lat: coords[bi][0], lon: coords[bi][1] },
    { lat: coords[bi + 1][0], lon: coords[bi + 1][1] }
  );
  return (bOut - bIn + 540) % 360 - 180;
}
function modifierTurnSide(mod) {
  if (!mod) return 0;
  if (mod.includes("left")) return -1;
  if (mod.includes("right")) return 1;
  return 0;
}
function reconcileTurnAngle(ang, modifier) {
  const side = modifierTurnSide(modifier);
  if (modifier === "uturn") {
    if (Math.abs(ang) < 120) return side < 0 ? -175 : 175;
    return ang;
  }
  if (side === 0) return ang;
  if (side < 0 && ang > 0) return -Math.abs(ang);
  if (side > 0 && ang < 0) return Math.abs(ang);
  if (Math.abs(ang) < 10) return side * 25;
  return ang;
}
function chevronScreenBasis(snap, headingRad, geom, s2, modifier, ang) {
  const ds = 16;
  const total = geom.s[geom.n - 1];
  const p0 = interpolateAtS(geom, Math.max(0, s2 - ds));
  const p1 = interpolateAtS(geom, s2);
  const p2 = interpolateAtS(geom, Math.min(total, s2 + ds));
  const P0 = projectWorld(p0.lat, p0.lon, 0, snap, headingRad);
  const P1 = projectWorld(p1.lat, p1.lon, 0, snap, headingRad);
  const P2 = projectWorld(p2.lat, p2.lon, 0, snap, headingRad);
  if (!P1) return null;
  let ex = 0;
  let ey = 0;
  if (P0 && P2) {
    ex = P2.x - P1.x;
    ey = P2.y - P1.y;
    const el = Math.hypot(ex, ey);
    if (el > 1) {
      ex /= el;
      ey /= el;
      const ax = P1.x - P0.x;
      const ay = P1.y - P0.y;
      const al = Math.hypot(ax, ay);
      if (al > 1) {
        const cross = ax / al * ey - ay / al * ex;
        const modSide = modifierTurnSide(modifier);
        const geoSide = cross > 0.02 ? 1 : cross < -0.02 ? -1 : 0;
        if (modSide !== 0 && geoSide !== 0 && geoSide !== modSide) {
          const lx = -ay / al;
          const ly = ax / al;
          ex = modSide < 0 ? lx : -lx;
          ey = modSide < 0 ? ly : -ly;
        }
      }
    }
  }
  if (Math.hypot(ex, ey) < 0.05) {
    const side = modifierTurnSide(modifier) || (ang < 0 ? -1 : 1);
    ex = side;
    ey = 0;
  }
  return { P: P1, ex, ey };
}
function chevronPath(P, ex, ey, arm) {
  const tipX = P.x + ex * arm;
  const tipY = P.y + ey * arm;
  const bx = P.x - ex * arm * 0.55;
  const by = P.y - ey * arm * 0.55;
  const px = -ey;
  const py = ex;
  const wing = arm * 0.88;
  const x1 = (bx + px * wing).toFixed(1);
  const y1 = (by + py * wing).toFixed(1);
  const x2 = (bx - px * wing).toFixed(1);
  const y2 = (by - py * wing).toFixed(1);
  return "M " + x1 + " " + y1 + " L " + tipX.toFixed(1) + " " + tipY.toFixed(1) + " L " + x2 + " " + y2;
}
function textBBox(cx, cy, fontSize, text) {
  const n = Math.max(String(text || "").length, 1);
  const w = fontSize * n * 0.58;
  const h = fontSize * 1.12;
  return { left: cx - w * 0.5, right: cx + w * 0.5, top: cy - h * 0.82, bottom: cy + h * 0.18 };
}
function bboxOverlap(a, b, pad) {
  return a.left - pad < b.right + pad && a.right + pad > b.left - pad && a.top - pad < b.bottom + pad && a.bottom + pad > b.top - pad;
}
function clampLabelX(cx, halfW, vbX, vbW) {
  return Math.min(vbX + vbW - halfW - 4, Math.max(vbX + halfW + 4, cx));
}
function clampLabelY(cy, fontSize, vbY, vbH) {
  return Math.min(vbY + vbH - 4, Math.max(vbY + fontSize + 4, cy));
}
function layoutTurnLabels(markers, vb, vbX, vbY, vbW, vbH) {
  if (S.pathChevronLabels === false) return;
  const placed = [];
  const minSep = vb * 0.07;
  const pad = vb * 0.014;
  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];
    m.degX = null;
    m.degY = null;
    m.distX = null;
    m.distY = null;
    const prev = i > 0 ? markers[i - 1] : null;
    const sep = prev ? Math.hypot(m.P.x - prev.P.x, m.P.y - prev.P.y) : Infinity;
    const wantDeg = i === 0 && !!m.deg;
    const wantDist = i === 0 ? true : sep >= minSep;
    if (wantDeg) {
      const sides = [m.labelSide, -m.labelSide];
      for (const side of sides) {
        const off = m.arm + m.degFont * 0.35;
        let dx = m.P.x + m.nx * off * side;
        const halfW = m.degFont * Math.max(m.deg.length, 1) * 0.34;
        dx = clampLabelX(dx, halfW, vbX, vbW);
        let dy = clampLabelY(
          m.P.y + m.ny * off * side * 0.35 + m.degFont * 0.34,
          m.degFont,
          vbY,
          vbH
        );
        const box = textBBox(dx, dy, m.degFont, m.deg);
        if (!placed.some((p) => bboxOverlap(box, p, pad))) {
          m.degX = dx;
          m.degY = dy;
          placed.push(box);
          break;
        }
      }
    }
    if (!wantDist) continue;
    const distText = m.dist + " \u043C";
    const slots = [
      () => ({
        x: m.P.x + m.nx * m.arm * (1.5 + i * 0.25) * m.labelSide,
        y: m.P.y + m.ny * m.arm * 0.35 * m.labelSide + m.distFont * 0.15
      }),
      () => ({ x: m.P.x, y: m.tipY + m.distFont * (1.1 + i * 0.35) }),
      () => ({
        x: m.P.x - m.nx * m.arm * (1.5 + i * 0.25) * m.labelSide,
        y: m.P.y - m.ny * m.arm * 0.35 * m.labelSide
      }),
      () => ({ x: m.P.x, y: m.P.y - m.distFont * (0.6 + i * 0.4) })
    ];
    for (const slot of slots) {
      let { x, y } = slot();
      x = clampLabelX(x, m.distFont * distText.length * 0.32, vbX, vbW);
      y = clampLabelY(y, m.distFont, vbY, vbH);
      const box = textBBox(x, y, m.distFont, distText);
      if (!placed.some((p) => bboxOverlap(box, p, pad))) {
        m.distX = x;
        m.distY = y;
        placed.push(box);
        break;
      }
    }
  }
}
function isPathTurnStep(st) {
  return st && st.type !== "depart" && st.type !== "arrive" && st.modifier && st.modifier !== "straight";
}
function renderTurnsStr(svg, snap, headingRad, geom, curS) {
  if (!S.route || !snap || S.showPathChevrons === false) return "";
  const maxChevrons = Math.max(1, Math.min(3, S.pathChevronMax || 3));
  const tok = getThemeTokens();
  const scale = tok.pathTurnScale || 1;
  const bv = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
  const vb = bv && bv.width ? bv.width : L2.W;
  const vbX = bv ? bv.x : 0;
  const vbY = bv ? bv.y : 0;
  const vbW = bv ? bv.width : L2.W;
  const vbH = bv ? bv.height : L2.H;
  const pos = curPos();
  const items = geom && curS != null ? getVisibleTurnManeuvers(geom, curS, maxChevrons) : S.route.steps.filter(isPathTurnStep).map((st) => ({ maneuver: { step: st }, distAhead: haversine(pos, st) }));
  const markers = [];
  for (const item of items) {
    if (markers.length >= maxChevrons) break;
    const st = item.maneuver?.step;
    if (!st) continue;
    const loc = toLocalFrenet(st.lat, st.lon, snap, headingRad);
    if (loc.z < 5 || loc.z > ROAD_MAX) continue;
    const P = projectGround2(loc.x, loc.z, 0);
    if (!P) continue;
    let ang = null;
    let chev = null;
    const mS = item.maneuver?.s;
    if (geom && mS != null) {
      ang = reconcileTurnAngle(turnAngleAtS(geom, mS), st.modifier);
      chev = chevronScreenBasis(snap, headingRad, geom, mS, st.modifier, ang);
    }
    if (ang == null) {
      const raw = turnAngleAt(st);
      ang = raw == null ? modifierTurnSide(st.modifier) < 0 ? -25 : modifierTurnSide(st.modifier) > 0 ? 25 : 0 : reconcileTurnAngle(raw, st.modifier);
    }
    if (!chev) {
      const side = modifierTurnSide(st.modifier) || (ang < 0 ? -1 : 1);
      chev = { P, ex: side, ey: 0 };
    }
    const k = (markers.length === 0 ? 1 : 0.72) * scale;
    const degFont = vb * 0.12 * k;
    const distFont = vb * 0.05 * k;
    const arm = vb * 0.05 * k;
    const tipY = chev.P.y + chev.ey * arm;
    markers.push({
      P: chev.P,
      ex: chev.ex,
      ey: chev.ey,
      nx: -chev.ey,
      ny: chev.ex,
      arm,
      sw: Math.max(2, vb * 0.012 * k),
      col: markers.length === 0 ? tok.turnPrimary : tok.turnSecondary,
      deg: Math.abs(ang) >= 4 ? Math.round(Math.abs(ang)) + "\xB0" : "",
      dist: Math.round(item.distAhead != null ? item.distAhead : haversine(pos, st)),
      degFont,
      distFont,
      tipY,
      labelSide: ang < 0 ? 1 : -1
    });
  }
  layoutTurnLabels(markers, vb, vbX, vbY, vbW, vbH);
  let out = "";
  for (const m of markers) {
    out += '<g font-family="' + tok.fontNum + ',monospace" text-anchor="middle"><path d="' + chevronPath(m.P, m.ex, m.ey, m.arm) + '" fill="none" stroke="' + m.col + '" stroke-width="' + m.sw.toFixed(1) + '" stroke-linecap="round" stroke-linejoin="round"/>' + (m.degX != null ? '<text x="' + m.degX.toFixed(1) + '" y="' + m.degY.toFixed(1) + '" font-size="' + m.degFont.toFixed(1) + '" font-weight="900" fill="' + m.col + '">' + m.deg + "</text>" : "") + (m.distX != null ? '<text x="' + m.distX.toFixed(1) + '" y="' + m.distY.toFixed(1) + '" font-size="' + m.distFont.toFixed(1) + '" fill="' + m.col + '" opacity="0.9">' + m.dist + " \u043C</text>" : "") + "</g>";
  }
  return out;
}
function renderFuelStr(svg, snap, headingRad) {
  if (S.fuelMode === 0 || !snap) return "";
  const tok = getThemeTokens();
  const bv = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
  const vb = bv && bv.width ? bv.width : L2.W;
  const vbX = bv ? bv.x : 0;
  const vbY = bv ? bv.y : 0;
  const vbW = vb;
  const vbH = bv ? bv.height : L2.H;
  const stations = fuelStationsForRoad(ROAD_MAX);
  let out = "";
  for (const st of stations) {
    const loc = toLocalFrenet(st.lat, st.lon, snap, headingRad);
    if (loc.z < 5 || loc.z > ROAD_MAX) continue;
    const P = projectGround2(loc.x, loc.z, 0);
    if (!P) continue;
    const sel = S.fuelSel && S.fuelSel.osmId === st.osmId;
    const k = sel ? 0.62 : 0.46;
    const r = vb * 0.045 * k;
    const emoji = vb * 0.06 * k;
    const distFont = vb * 0.032 * k;
    const sw = Math.max(1.5, vb * 8e-3);
    const col = fuelColor(st.status);
    const dm = st.distAhead != null && isFinite(st.distAhead) ? st.distAhead : st.distGps;
    const distTxt = dm < 1e3 ? Math.round(dm / 10) * 10 + " \u043C" : (dm / 1e3).toFixed(1) + " \u043A\u043C";
    let cx = Math.min(vbX + vbW - r - 2, Math.max(vbX + r + 2, P.x));
    let cy = Math.min(vbY + vbH - r - distFont - 4, Math.max(vbY + r + 2, P.y));
    out += '<g text-anchor="middle" font-family="' + tok.fontNum + ',monospace"><circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="' + sw.toFixed(1) + '"/><text x="' + cx.toFixed(1) + '" y="' + (cy + emoji * 0.36).toFixed(1) + '" font-size="' + emoji.toFixed(1) + '">\u26FD</text><text x="' + cx.toFixed(1) + '" y="' + (cy + r + distFont * 1.05).toFixed(1) + '" font-size="' + distFont.toFixed(1) + '" font-weight="900" fill="' + col + '" stroke="' + tok.svgHalo + '" stroke-width="' + (distFont * 0.14).toFixed(1) + '" paint-order="stroke">' + distTxt + "</text></g>";
  }
  return out;
}
function renderPathway() {
  const block = $("block-path");
  const svg = $("path-svg");
  if (!block || !svg) return;
  const hud = $("hud");
  const kmh = S.gps && S.gps.speed != null && S.gps.speed >= 0 ? S.gps.speed * 3.6 : 0;
  if (!S.showPath || kmh < 25 || isSnapLost() || S.compassMode || S.gpsConverged === false) {
    block.classList.add("hidden");
    hud.classList.add("no-path");
    svg.innerHTML = "";
    return;
  }
  block.classList.remove("hidden");
  hud.classList.remove("no-path");
  const gpsHdg = S.smoothedHeading;
  if (S.route && !S.route.geometry) ensureRouteGeometry(S.route);
  const rawSnap = getNavSnap(gpsHdg);
  const geomReady = S.route?.geometry;
  if (!geomReady || !rawSnap) {
    svg.innerHTML = "";
    return;
  }
  const speedMps = Math.max(0, S.dispSpeed / 3.6);
  const snap = getDisplaySnap(rawSnap, geomReady, speedMps, gpsHdg);
  if (!snap) {
    svg.innerHTML = "";
    return;
  }
  if (S.snapQuality === "GOOD" && _pathLastS != null && Math.abs(snap.s - _pathLastS) < PATH_SKIP_DS_M && kmh >= 25) {
    _pathSkipFrames++;
    if (_pathSkipFrames <= PATH_SKIP_FRAMES) return;
  }
  _pathSkipFrames = 0;
  _pathLastS = snap.s;
  const maxDist = Math.max(100, Math.min(ROAD_MAX, Math.round(kmh * 8)));
  const rect = block.getBoundingClientRect();
  computePathLayout(rect.width || block.clientWidth || 300, rect.height || block.clientHeight || 200);
  svg.setAttribute("viewBox", "0 0 " + L2.W + " " + L2.H);
  svg.setAttribute("preserveAspectRatio", "xMidYMax slice");
  const headingRad = updateCamHeading(geomReady, snap);
  updateCamPitch(geomReady, snap, getElevExag(), S.showElevProfile);
  const activeRb = isCrossingContextEnabled() ? getActiveRoundabout(geomReady, rawSnap.s, speedMps) : null;
  let sections = extendRibbonNearCam(
    computeRibbonSectionsCam(geomReady, snap, maxDist, ROAD_HALF, headingRad)
  );
  if (activeRb) {
    sections = sections.filter((sec) => sec.s < activeRb.sEnter || sec.s > activeRb.sExit);
  }
  if (sections.length < 2) {
    svg.innerHTML = "";
    return;
  }
  let html = "";
  if (isCrossingContextEnabled()) {
    html += renderCrossingWhiskers(snap, headingRad, geomReady, rawSnap.s, speedMps);
    if (activeRb) html += renderRoundaboutSchema(activeRb, snap, headingRad);
  }
  const mesh = buildStripMeshSvg(sections, geomReady, speedMps);
  html += mesh.fill + mesh.edges;
  const tok = getThemeTokens();
  const centerS = sections.map((sec) => ({ p: projectCam(sec.cx, sec.cz, sec.elev), s: sec.s })).filter((x) => x.p);
  for (let ci = 0; ci < centerS.length - 1; ci++) {
    const a = centerS[ci];
    const b = centerS[ci + 1];
    if (!a.p || !b.p) continue;
    const dx = b.p.x - a.p.x;
    const dy = b.p.y - a.p.y;
    if (dx * dx + dy * dy > (L2.W * 0.32) ** 2) continue;
    const sMid = (a.s + b.s) * 0.5;
    const warnCol = ribbonCurveColor(sMid, geomReady, speedMps);
    const stroke = warnCol || tok.pathEdge;
    const sw = warnCol ? tok.strokeW + 1.5 : tok.strokeW;
    const op = warnCol ? 0.85 : tok.pathCenterOpacity;
    html += '<line x1="' + a.p.x.toFixed(1) + '" y1="' + a.p.y.toFixed(1) + '" x2="' + b.p.x.toFixed(1) + '" y2="' + b.p.y.toFixed(1) + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round" opacity="' + op + '"/>';
  }
  html += renderTurnsStr(svg, snap, headingRad, geomReady, rawSnap.s);
  html += renderFuelStr(svg, snap, headingRad);
  const profileH = getElevProfileH();
  const prof = renderElevProfile(snap, geomReady, L2.W, profileH);
  if (prof) html += '<g transform="translate(0,' + (L2.H - profileH - PROFILE_GAP) + ')">' + prof + "</g>";
  svg.innerHTML = html;
}
function computeArrowCenterline(turnDeg, H = 120) {
  const stemLen = H / 3;
  const exitLen = H / 3;
  const R = Math.abs(turnDeg) > 150 ? H / 3.2 : H / 4;
  const dirVec = (aDeg) => {
    const a2 = aDeg * Math.PI / 180;
    return [Math.sin(a2), -Math.cos(a2)];
  };
  let a = 0, x = 0, y = 0;
  const pts = [[x, y]];
  let d = dirVec(a);
  x += d[0] * stemLen;
  y += d[1] * stemLen;
  pts.push([x, y]);
  const N = Math.max(3, Math.round(Math.abs(turnDeg) / 5));
  const dA = turnDeg / N;
  const segLen = R * Math.abs(turnDeg) * Math.PI / 180 / N;
  for (let i = 0; i < N; i++) {
    a += dA;
    d = dirVec(a);
    x += d[0] * segLen;
    y += d[1] * segLen;
    pts.push([x, y]);
  }
  d = dirVec(a);
  x += d[0] * exitLen;
  y += d[1] * exitLen;
  pts.push([x, y]);
  return { pts, dir: d, tip: [x, y] };
}
function arrowViewBox(all, pad) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  all.forEach((p) => {
    minX = Math.min(minX, p[0]);
    minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]);
    maxY = Math.max(maxY, p[1]);
  });
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  return {
    vb: minX.toFixed(1) + " " + minY.toFixed(1) + " " + (maxX - minX).toFixed(1) + " " + (maxY - minY).toFixed(1)
  };
}
function renderParametricArrow(turnDeg) {
  const tok = getThemeTokens();
  const H = 120;
  const { pts, dir, tip } = computeArrowCenterline(turnDeg, H);
  const sw = Math.round(H * 0.12 * (tok.strokeW / 3));
  const col = tok.accent;
  const outline = tok.arrowStyle === "outline";
  const hl = sw * 2.1, hw = sw * 1.5;
  const back = [tip[0] - dir[0] * hl, tip[1] - dir[1] * hl];
  const perp = [-dir[1], dir[0]];
  const wingA = [back[0] + perp[0] * hw, back[1] + perp[1] * hw];
  const wingB = [back[0] - perp[0] * hw, back[1] - perp[1] * hw];
  const stem = pts.slice(0, pts.length - 1).concat([back]);
  const all = [...stem, tip, wingA, wingB];
  const { vb } = arrowViewBox(all, sw);
  const line = '<polyline points="' + stem.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ") + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>';
  const head = outline ? "" : '<polygon points="' + tip[0].toFixed(1) + "," + tip[1].toFixed(1) + " " + wingA[0].toFixed(1) + "," + wingA[1].toFixed(1) + " " + wingB[0].toFixed(1) + "," + wingB[1].toFixed(1) + '" fill="' + col + '"/>';
  const headOutline = outline ? '<polyline points="' + tip[0].toFixed(1) + "," + tip[1].toFixed(1) + " " + wingA[0].toFixed(1) + "," + wingA[1].toFixed(1) + " " + wingB[0].toFixed(1) + "," + wingB[1].toFixed(1) + " " + tip[0].toFixed(1) + "," + tip[1].toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' : "";
  return '<svg class="arrow-svg" viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet">' + line + head + headOutline + "</svg>";
}
function renderChopperArrow(turnDeg) {
  const tok = getThemeTokens();
  const col = tok.accent;
  const H = 120;
  const { pts, dir, tip } = computeArrowCenterline(turnDeg, H);
  const halfW = 11;
  const hl = 22, hw = 19;
  const back = [tip[0] - dir[0] * hl, tip[1] - dir[1] * hl];
  const perp = [-dir[1], dir[0]];
  const wingA = [back[0] + perp[0] * hw, back[1] + perp[1] * hw];
  const wingB = [back[0] - perp[0] * hw, back[1] - perp[1] * hw];
  const stem = pts.slice(0, pts.length - 1).concat([back]);
  const left = [], right = [];
  for (let i = 0; i < stem.length; i++) {
    const p = stem[i];
    let t;
    if (i < stem.length - 1) {
      const q = stem[i + 1];
      t = [q[0] - p[0], q[1] - p[1]];
    } else if (i > 0) {
      const q = stem[i - 1];
      t = [p[0] - q[0], p[1] - q[1]];
    } else {
      t = dir;
    }
    const len = Math.hypot(t[0], t[1]) || 1;
    const n = [-t[1] / len, t[0] / len];
    left.push([p[0] + n[0] * halfW, p[1] + n[1] * halfW]);
    right.push([p[0] - n[0] * halfW, p[1] - n[1] * halfW]);
  }
  const body = left.concat(right.slice().reverse());
  const bodyPts = body.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const headPts = tip[0].toFixed(1) + "," + tip[1].toFixed(1) + " " + wingA[0].toFixed(1) + "," + wingA[1].toFixed(1) + " " + wingB[0].toFixed(1) + "," + wingB[1].toFixed(1);
  const all = [...stem, tip, wingA, wingB, ...left, ...right];
  const { vb } = arrowViewBox(all, halfW + 4);
  const rim = tok.line || col;
  return '<svg class="arrow-svg arrow-chopper" viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet"><polygon points="' + bodyPts + '" fill="' + col + '" stroke="' + rim + '" stroke-width="2" stroke-linejoin="round"/><polygon points="' + headPts + '" fill="' + col + '" stroke="' + rim + '" stroke-width="2" stroke-linejoin="round"/></svg>';
}
function vfdSegmentBar(cx, cy, tdx, tdy, halfLen, thick, col) {
  const len = Math.hypot(tdx, tdy) || 1;
  const nx = -tdy / len, ny = tdx / len;
  const x1 = (cx - nx * halfLen).toFixed(1);
  const y1 = (cy - ny * halfLen).toFixed(1);
  const x2 = (cx + nx * halfLen).toFixed(1);
  const y2 = (cy + ny * halfLen).toFixed(1);
  return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + col + '" stroke-width="' + thick + '" stroke-linecap="butt"/>';
}
function sampleStem(stem, step) {
  const out = [];
  for (let i = 0; i < stem.length - 1; i++) {
    const a = stem[i], b = stem[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const seg = Math.hypot(dx, dy);
    if (seg < 0.01) continue;
    const n = Math.max(1, Math.ceil(seg / step));
    for (let s2 = 0; s2 < n; s2++) {
      if (i > 0 && s2 === 0) continue;
      const t = s2 / n;
      out.push({ x: a[0] + dx * t, y: a[1] + dy * t, dx, dy });
    }
  }
  const last = stem[stem.length - 1];
  const prev = out.length ? out[out.length - 1] : { dx: 0, dy: -1 };
  out.push({ x: last[0], y: last[1], dx: prev.dx, dy: prev.dy });
  return out;
}
function renderVintageArrow(turnDeg) {
  const tok = getThemeTokens();
  const col = tok.accent;
  const barHalf = 13;
  const barThick = 6.5;
  const barGap = 8;
  const hl = 22, hw = 17;
  const { pts, dir, tip } = computeArrowCenterline(turnDeg, 120);
  const back = [tip[0] - dir[0] * hl, tip[1] - dir[1] * hl];
  const stem = pts.slice(0, pts.length - 1).concat([back]);
  const samples = sampleStem(stem, barGap);
  const parts = samples.map((p) => vfdSegmentBar(p.x, p.y, p.dx, p.dy, barHalf, barThick, col));
  const headN = 7;
  for (let i = 0; i < headN; i++) {
    const t = i / (headN - 1);
    const along = hl * (0.06 + t * 0.94);
    const cx = tip[0] - dir[0] * along;
    const cy = tip[1] - dir[1] * along;
    const half = hw * (0.08 + t * 0.92);
    parts.push(vfdSegmentBar(cx, cy, dir[0], dir[1], half, barThick, col));
  }
  const all = [...stem, tip, back];
  const { vb } = arrowViewBox(all, barHalf + barThick + 2);
  return '<svg class="arrow-svg arrow-vintage" viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet" filter="url(#vfd-glow-cyan)">' + parts.join("") + "</svg>";
}
function renderManeuverArrow(turnDeg) {
  const shape = getThemeTokens().arrowShape || "parametric";
  if (shape === "chopper") return renderChopperArrow(turnDeg);
  if (shape === "vintage") return renderVintageArrow(turnDeg);
  return renderParametricArrow(turnDeg);
}
function arriveFlagSVG() {
  const tok = getThemeTokens();
  const sw = Math.max(4, tok.strokeW + 2);
  const col = tok.pathEdge;
  return '<svg class="arrow-svg" viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid meet"><rect x="-28" y="-32" width="56" height="40" fill="none" stroke="' + col + '" stroke-width="' + sw + '"/><path d="M-28 -32 L-28 8 L28 -12 Z" fill="' + (tok.arrowStyle === "outline" ? "none" : col) + '" stroke="' + col + '" stroke-width="' + sw * 0.5 + '"/><line x1="-28" y1="8" x2="-28" y2="28" stroke="' + col + '" stroke-width="' + sw + '"/></svg>';
}
function buildTurnArrowSVG(turnDeg) {
  const turn = Math.max(-178, Math.min(178, turnDeg || 0));
  return renderManeuverArrow(turn);
}
function buildArrowSVG(step) {
  if (!step) return "";
  if (step.type === "arrive") return arriveFlagSVG();
  let turn = maneuverTurnAngle(step);
  if (Math.abs(turn) < MANEUVER_BEND_ANGLE) {
    if (step.modifier === "uturn") turn = 175;
    else if (Math.abs(turn) < 4 && step.modifier) {
      if (step.modifier.includes("left")) turn = -8;
      else if (step.modifier.includes("right")) turn = 8;
      else turn = 0;
    } else {
      turn = 0;
    }
  }
  turn = Math.max(-178, Math.min(178, turn));
  return renderManeuverArrow(turn);
}
function renderCompass() {
  const el = $("compass-svg");
  if (!el) return;
  const tok = getThemeTokens();
  const hdg = effectiveHeading();
  if (tok.compassStyle === "rose") {
    renderCompassRose(el, tok, hdg);
    return;
  }
  const W = 400, H = 36, cx = W / 2, px = 1.8;
  let html = '<line x1="' + cx + '" y1="2" x2="' + cx + '" y2="' + H + '" stroke="' + tok.accent + '" stroke-width="2"/>';
  if (hdg != null && !isNaN(hdg)) {
    [["N", 0], ["E", 90], ["S", 180], ["W", 270]].forEach((d) => {
      let diff = (d[1] - hdg + 540) % 360 - 180;
      const x = cx + diff * px;
      if (x < 14 || x > W - 14) return;
      const near = Math.abs(diff) < 12;
      html += '<text x="' + x.toFixed(1) + '" y="29" text-anchor="middle" font-family="' + tok.fontLabel + ',sans-serif" font-size="27" font-weight="900" fill="' + (near ? tok.accent : tok.fg) + '">' + d[0] + "</text>";
    });
  }
  el.setAttribute("viewBox", "0 0 " + W + " " + H);
  el.innerHTML = html;
}
function renderCompassRose(el, tok, hdg) {
  const W = 400, H = 120, cx = W / 2, cy = H / 2, r = 44;
  let html = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + tok.dim + '" stroke-width="1.5"/>';
  if (hdg != null && !isNaN(hdg)) {
    [["N", 0], ["E", 90], ["S", 180], ["W", 270]].forEach((d) => {
      const a2 = (d[1] - hdg) * Math.PI / 180;
      const x = cx + Math.sin(a2) * r;
      const y = cy - Math.cos(a2) * r;
      const near = Math.abs((d[1] - hdg + 540) % 360 - 180) < 18;
      html += '<text x="' + x.toFixed(1) + '" y="' + (y + 8).toFixed(1) + '" text-anchor="middle" font-family="' + tok.fontLabel + ',sans-serif" font-size="22" font-weight="900" fill="' + (near ? tok.accent : tok.fg) + '">' + d[0] + "</text>";
    });
    const a = -hdg * Math.PI / 180;
    html += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.sin(a) * (r - 8)).toFixed(1) + '" y2="' + (cy - Math.cos(a) * (r - 8)).toFixed(1) + '" stroke="' + tok.accent + '" stroke-width="3"/>';
  }
  el.setAttribute("viewBox", "0 0 " + W + " " + H);
  el.innerHTML = html;
}
function renderVisualFrame() {
  renderCompass();
  renderPathway();
}
var _pathLastS, _pathSkipFrames, PROFILE_GAP;
var init_render = __esm({
  "js/render.js"() {
    init_state();
    init_util();
    init_geo();
    init_gps();
    init_route();
    init_fuel();
    init_route();
    init_route_geometry();
    init_snap_quality();
    init_nav_constants();
    init_elevation();
    init_curve_speed();
    init_theme_tokens();
    init_crossings();
    _pathLastS = null;
    _pathSkipFrames = 0;
    PROFILE_GAP = 6;
  }
});

// js/vintage-vfd.js
function initVintageVfd() {
  document.addEventListener("themechange", syncVintageVfdDomClasses);
  syncVintageVfdDomClasses();
}
function syncVintageVfdDomClasses() {
  const vintage = document.documentElement.classList.contains("theme-vintage");
  const speedVal = $("v-speed");
  const speedGhost = $("speed-ghost");
  const mdistInner = document.querySelector(".mdist-inner");
  if (speedVal) speedVal.classList.toggle("vfd-emissive-cyan", vintage);
  if (speedGhost && vintage) speedGhost.textContent = "888";
  if (mdistInner) mdistInner.classList.toggle("vfd-emissive-cyan", vintage);
}
function resetVintageVfd() {
}
var init_vintage_vfd = __esm({
  "js/vintage-vfd.js"() {
    init_util();
  }
});

// js/yandex-link.js
var yandex_link_exports = {};
__export(yandex_link_exports, {
  YANDEX_PARSER_REV: () => YANDEX_PARSER_REV,
  YANDEX_URL_RE: () => YANDEX_URL_RE,
  extractYandexUrl: () => extractYandexUrl,
  isYandexMapsUrl: () => isYandexMapsUrl,
  parseYandexRouteLink: () => parseYandexRouteLink
});
function extractYandexUrl(text) {
  const s2 = String(text || "").trim();
  if (!s2) return null;
  if (YANDEX_URL_RE.test(s2)) return s2.match(YANDEX_URL_RE)[0];
  const m = s2.match(YANDEX_URL_RE);
  return m ? m[0] : null;
}
function parseRtextPoint(part) {
  const s2 = String(part || "").trim();
  if (!s2) return null;
  const coord = s2.match(/^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/);
  if (coord) {
    const lat = parseFloat(coord[1]);
    const lon = parseFloat(coord[2]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon, label: s2 };
  }
  return null;
}
async function parseYandexRouteLink(rawUrl) {
  let url = String(rawUrl || "").trim();
  if (!url) throw new Error("\u041F\u0443\u0441\u0442\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430");
  if (!extractYandexUrl(url)) throw new Error("\u041D\u0435 \u0441\u0441\u044B\u043B\u043A\u0430 \u042F\u043D\u0434\u0435\u043A\u0441.\u041A\u0430\u0440\u0442");
  if (SHORT_RE.test(url)) {
    try {
      const res = await fetch(url, { redirect: "follow", method: "HEAD", mode: "cors" });
      if (res.url) url = res.url;
    } catch {
    }
  }
  const m = url.match(RTEXT_RE);
  if (!m) throw new Error("\u0412 \u0441\u0441\u044B\u043B\u043A\u0435 \u043D\u0435\u0442 \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0430 (rtext). \u041F\u043E\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u043C\u0430\u0440\u0448\u0440\u0443\u0442 \u0432 \u042F\u043D\u0434\u0435\u043A\u0441.\u041A\u0430\u0440\u0442\u0430\u0445 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F\xBB.");
  const parts = decodeURIComponent(m[1]).split("~");
  const waypoints = parts.map(parseRtextPoint).filter(Boolean);
  if (waypoints.length < 2) throw new Error("\u041C\u0430\u043B\u043E \u0442\u043E\u0447\u0435\u043A \u0432 rtext (\u043D\u0443\u0436\u043D\u043E \u22652)");
  return waypoints;
}
function isYandexMapsUrl(raw) {
  return !!extractYandexUrl(raw);
}
var YANDEX_PARSER_REV, YANDEX_URL_RE, SHORT_RE, RTEXT_RE;
var init_yandex_link = __esm({
  "js/yandex-link.js"() {
    YANDEX_PARSER_REV = 1;
    YANDEX_URL_RE = /https?:\/\/(?:yandex\.ru|ya\.ru)\/maps[^\s"'<>]*/i;
    SHORT_RE = /^https?:\/\/(?:yandex\.ru|ya\.ru)\/maps\/-/i;
    RTEXT_RE = /[?&]rtext=([^&]+)/i;
  }
});

// js/yandex-import.js
function openDb2() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME2, DB_VER2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("imports")) {
        db.createObjectStore("imports", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveYandexImportHistory(waypoints, mode) {
  try {
    const db = await openDb2();
    const name = (waypoints[0]?.label || "\u041C\u0430\u0440\u0448\u0440\u0443\u0442").split(/\s+/)[0].slice(0, 24);
    await new Promise((resolve, reject) => {
      const tx2 = db.transaction("imports", "readwrite");
      tx2.objectStore("imports").put({
        id: crypto.randomUUID(),
        name,
        ts: Date.now(),
        mode,
        waypointCount: waypoints.length
      });
      tx2.oncomplete = () => resolve();
      tx2.onerror = () => reject(tx2.error);
    });
    db.close();
  } catch (e) {
    console.warn("yandex history:", e);
  }
}
function waypointsToOsrmPoints(waypoints, gps) {
  const pts = waypoints.map((w) => ({ lat: w.lat, lon: w.lon }));
  if (gps && pts.length) {
    if (haversine(gps, pts[0]) > 500) pts.unshift({ lat: gps.lat, lon: gps.lon });
    else pts[0] = { lat: gps.lat, lon: gps.lon };
  }
  return pts;
}
function hideImportModal() {
  $("yandexImportModal")?.classList.remove("on");
  _pendingWaypoints = null;
  _pendingUrl = "";
}
function hideBanner() {
  const banner = $("yandex-banner");
  banner?.classList.remove("on");
  banner?.classList.add("hidden");
}
async function finishImport(mode) {
  const wps = _pendingWaypoints;
  const urlForInput = _pendingUrl;
  if (!wps?.length) return;
  hideImportModal();
  hideBanner();
  const status = $("s-finish");
  const btn = $("btn-build-route");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "\u23F3 \u0418\u043C\u043F\u043E\u0440\u0442\u2026";
  }
  if (status) {
    status.textContent = mode === "direct" ? "\u23F3 \u0411\u044B\u0441\u0442\u0440\u044B\u0439 \u0441\u0442\u0430\u0440\u0442\u2026" : "\u23F3 \u041F\u0435\u0440\u0435\u0441\u0447\u0451\u0442 OSRM\u2026";
    status.className = "status";
  }
  try {
    if (mode === "direct") {
      attachRouteFromImport(buildDirectRouteFromWaypoints(wps), wps);
    } else {
      const pts = waypointsToOsrmPoints(wps, S.gps);
      const route = await fetchRouteThroughWaypoints(pts);
      attachRouteFromImport(route, pts);
    }
    const { refreshRouteUi: refreshRouteUi2 } = await Promise.resolve().then(() => (init_setup(), setup_exports));
    refreshRouteUi2();
    await saveYandexImportHistory(wps, mode);
    telemetry_default.log("nav", { sub: "yandex_import", mode, n: wps.length });
    if (status) {
      status.textContent = "\u2705 \u041C\u0430\u0440\u0448\u0440\u0443\u0442 \u0438\u0437 \u042F\u043D\u0434\u0435\u043A\u0441.\u041A\u0430\u0440\u0442 \u2014 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041F\u041E\u0415\u0425\u0410\u041B\u0418\xBB";
      status.className = "status ok";
    }
    $("finish-input").value = urlForInput || `${wps.length} \u0442\u043E\u0447\u0435\u043A \u042F\u043D\u0434\u0435\u043A\u0441`;
  } catch (e) {
    if (status) {
      status.textContent = "\u274C " + (e.message || e);
      status.className = "status err";
    }
  } finally {
    if (btn) {
      btn.disabled = !(S.gps && S.finish);
      btn.textContent = "\u{1F5FA} \u041F\u043E\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u043C\u0430\u0440\u0448\u0440\u0443\u0442";
    }
  }
}
function offerYandexImport(waypoints, sourceUrl = "") {
  _pendingWaypoints = waypoints;
  _pendingUrl = sourceUrl || "";
  const modal = $("yandexImportModal");
  const info = $("yandex-import-info");
  if (info) {
    info.textContent = `\u0422\u043E\u0447\u0435\u043A: ${waypoints.length}. \u0414\u043B\u044F \u0442\u043E\u0447\u043D\u043E\u0433\u043E \u043F\u043E\u0432\u0442\u043E\u0440\u0435\u043D\u0438\u044F \u0433\u0435\u043E\u043C\u0435\u0442\u0440\u0438\u0438 \u042F\u043D\u0434\u0435\u043A\u0441\u0430 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0439\u0442\u0435 \u043F\u0440\u043E\u043C\u0435\u0436\u0443\u0442\u043E\u0447\u043D\u044B\u0435 \u0442\u043E\u0447\u043A\u0438 \u043A\u0430\u0436\u0434\u044B\u0435 3\u20135 \u043A\u043C \u2014 \u0438\u043D\u0430\u0447\u0435 OSRM \u043C\u043E\u0436\u0435\u0442 \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0434\u0440\u0443\u0433\u0438\u0435 \u0434\u043E\u0440\u043E\u0433\u0438.`;
  }
  modal?.classList.add("on");
}
async function importYandexFromText(rawText) {
  const { parseYandexRouteLink: parseYandexRouteLink2 } = await Promise.resolve().then(() => (init_yandex_link(), yandex_link_exports));
  const url = extractYandexUrl(rawText) || rawText.trim();
  const wps = await parseYandexRouteLink2(url);
  offerYandexImport(wps, url);
  return wps;
}
function showYandexBanner(message, onApply) {
  const banner = $("yandex-banner");
  const msg = $("yandex-banner-msg");
  if (!banner) return;
  if (msg) msg.textContent = message || "\u041D\u0430\u0439\u0434\u0435\u043D\u0430 \u0441\u0441\u044B\u043B\u043A\u0430 \u042F\u043D\u0434\u0435\u043A\u0441.\u041A\u0430\u0440\u0442";
  banner.classList.remove("hidden");
  banner.classList.add("on");
  const applyBtn = $("yandex-banner-apply");
  const dismissBtn = $("yandex-banner-dismiss");
  const onOk = () => {
    hideBanner();
    onApply?.();
  };
  const onNo = () => hideBanner();
  applyBtn?.replaceWith(applyBtn.cloneNode(true));
  dismissBtn?.replaceWith(dismissBtn.cloneNode(true));
  $("yandex-banner-apply")?.addEventListener("click", onOk, { once: true });
  $("yandex-banner-dismiss")?.addEventListener("click", onNo, { once: true });
}
function initYandexImportUi() {
  $("yandex-import-direct")?.addEventListener("click", () => {
    void finishImport("direct");
  });
  $("yandex-import-routed")?.addEventListener("click", () => {
    void finishImport("routed");
  });
  $("yandex-import-cancel")?.addEventListener("click", hideImportModal);
}
var DB_NAME2, DB_VER2, _pendingWaypoints, _pendingUrl;
var init_yandex_import = __esm({
  "js/yandex-import.js"() {
    init_state();
    init_util();
    init_geo();
    init_route();
    init_yandex_link();
    init_telemetry();
    DB_NAME2 = "moto-hud-yandex";
    DB_VER2 = 1;
    _pendingWaypoints = null;
    _pendingUrl = "";
  }
});

// js/hud-opts.js
function loadHudOptsFromStorage() {
  try {
    const raw = localStorage.getItem(HUD_OPTS_KEY);
    if (!raw) return;
    const o = JSON.parse(raw);
    if (typeof o.showFinishDist === "boolean") {
      const el = $("opt-finish-dist");
      if (el) el.checked = o.showFinishDist;
    }
    if (typeof o.showFinishTime === "boolean") {
      const el = $("opt-finish-time");
      if (el) el.checked = o.showFinishTime;
    }
    if (typeof o.showFinishEta === "boolean") {
      const el = $("opt-finish-eta");
      if (el) el.checked = o.showFinishEta;
    }
    if (typeof o.fuelPlannerCount === "number") {
      S.fuelPlannerCount = clampFuelPlannerCount(o.fuelPlannerCount);
      const el = $("opt-fuel-count");
      if (el) el.value = String(S.fuelPlannerCount);
    }
  } catch (e) {
  }
}
function clampFuelPlannerCount(n) {
  return Math.max(MIN_FUEL_PLANNER_COUNT, Math.min(
    MAX_FUEL_PLANNER_COUNT,
    parseInt(n, 10) || DEFAULT_FUEL_PLANNER_COUNT
  ));
}
function saveHudOptsToStorage() {
  try {
    localStorage.setItem(HUD_OPTS_KEY, JSON.stringify({
      showFinishDist: !!S.showFinishDist,
      showFinishTime: !!S.showFinishTime,
      showFinishEta: !!S.showFinishEta,
      fuelPlannerCount: clampFuelPlannerCount(S.fuelPlannerCount)
    }));
  } catch (e) {
  }
}
function applyFinishInfoVisibility() {
  const panel = $("finish-info");
  if (!panel) return;
  const any = !!(S.showFinishDist || S.showFinishTime || S.showFinishEta);
  panel.classList.toggle("hidden", !any);
  $("fi-dist-line")?.classList.toggle("hidden", !S.showFinishDist);
  $("fi-time-line")?.classList.toggle("hidden", !S.showFinishTime);
  $("fi-eta-line")?.classList.toggle("hidden", !S.showFinishEta);
}
var init_hud_opts = __esm({
  "js/hud-opts.js"() {
    init_state();
    init_util();
  }
});

// js/app-opts.js
function loadAppOptsFromStorage() {
  try {
    const raw = localStorage.getItem(APP_OPTS_KEY);
    if (!raw) return;
    const o = JSON.parse(raw);
    const setCheck = (id, v) => {
      if (typeof v !== "boolean") return;
      const el = $(id);
      if (el) el.checked = v;
    };
    const setVal = (id, v) => {
      if (v == null) return;
      const el = $(id);
      if (el) el.value = String(v);
    };
    setCheck("opt-voice", o.voice);
    setCheck("opt-path", o.showPath);
    setCheck("opt-crossings", o.showCrossingContext);
    setCheck("opt-path-chevrons", o.showPathChevrons !== false);
    setCheck("opt-chevron-labels", o.pathChevronLabels !== false);
    setVal("opt-chevron-max", o.pathChevronMax != null ? o.pathChevronMax : DEFAULT_PATH_CHEVRON_MAX);
    setCheck("opt-heading", o.showCompass);
    setCheck("opt-cams", o.cams);
    setCheck("opt-back-only", o.backOnly);
    setVal("opt-tol", o.tolerance);
    setVal("opt-nodir", o.noDirPolicy);
    setVal("opt-limit", o.limit);
    setVal("opt-cam-speed-tol", o.camSpeedTol != null ? o.camSpeedTol : DEFAULT_CAM_SPEED_TOL);
  } catch (e) {
  }
}
function saveAppOptsToStorage() {
  try {
    localStorage.setItem(APP_OPTS_KEY, JSON.stringify({
      voice: !!S.voice,
      showPath: !!S.showPath,
      showCrossingContext: S.showCrossingContext !== false,
      showPathChevrons: S.showPathChevrons !== false,
      pathChevronLabels: S.pathChevronLabels !== false,
      pathChevronMax: S.pathChevronMax,
      showCompass: !!S.showCompass,
      cams: !!S.cams,
      backOnly: !!S.backOnly,
      tolerance: S.tolerance,
      noDirPolicy: S.noDirPolicy,
      limit: S.limit,
      camSpeedTol: S.camSpeedTol
    }));
  } catch (e) {
  }
}
var init_app_opts = __esm({
  "js/app-opts.js"() {
    init_state();
    init_util();
  }
});

// node_modules/leaflet/dist/leaflet-src.js
var require_leaflet_src = __commonJS({
  "node_modules/leaflet/dist/leaflet-src.js"(exports, module) {
    (function(global2, factory) {
      typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global2 = typeof globalThis !== "undefined" ? globalThis : global2 || self, factory(global2.leaflet = {}));
    })(exports, (function(exports2) {
      "use strict";
      var version = "1.9.4";
      function extend(dest) {
        var i, j, len, src;
        for (j = 1, len = arguments.length; j < len; j++) {
          src = arguments[j];
          for (i in src) {
            dest[i] = src[i];
          }
        }
        return dest;
      }
      var create$2 = Object.create || /* @__PURE__ */ (function() {
        function F() {
        }
        return function(proto) {
          F.prototype = proto;
          return new F();
        };
      })();
      function bind(fn, obj) {
        var slice = Array.prototype.slice;
        if (fn.bind) {
          return fn.bind.apply(fn, slice.call(arguments, 1));
        }
        var args = slice.call(arguments, 2);
        return function() {
          return fn.apply(obj, args.length ? args.concat(slice.call(arguments)) : arguments);
        };
      }
      var lastId = 0;
      function stamp(obj) {
        if (!("_leaflet_id" in obj)) {
          obj["_leaflet_id"] = ++lastId;
        }
        return obj._leaflet_id;
      }
      function throttle(fn, time, context) {
        var lock, args, wrapperFn, later;
        later = function() {
          lock = false;
          if (args) {
            wrapperFn.apply(context, args);
            args = false;
          }
        };
        wrapperFn = function() {
          if (lock) {
            args = arguments;
          } else {
            fn.apply(context, arguments);
            setTimeout(later, time);
            lock = true;
          }
        };
        return wrapperFn;
      }
      function wrapNum(x, range, includeMax) {
        var max = range[1], min = range[0], d = max - min;
        return x === max && includeMax ? x : ((x - min) % d + d) % d + min;
      }
      function falseFn() {
        return false;
      }
      function formatNum(num, precision) {
        if (precision === false) {
          return num;
        }
        var pow = Math.pow(10, precision === void 0 ? 6 : precision);
        return Math.round(num * pow) / pow;
      }
      function trim(str) {
        return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, "");
      }
      function splitWords(str) {
        return trim(str).split(/\s+/);
      }
      function setOptions(obj, options) {
        if (!Object.prototype.hasOwnProperty.call(obj, "options")) {
          obj.options = obj.options ? create$2(obj.options) : {};
        }
        for (var i in options) {
          obj.options[i] = options[i];
        }
        return obj.options;
      }
      function getParamString(obj, existingUrl, uppercase) {
        var params = [];
        for (var i in obj) {
          params.push(encodeURIComponent(uppercase ? i.toUpperCase() : i) + "=" + encodeURIComponent(obj[i]));
        }
        return (!existingUrl || existingUrl.indexOf("?") === -1 ? "?" : "&") + params.join("&");
      }
      var templateRe = /\{ *([\w_ -]+) *\}/g;
      function template(str, data) {
        return str.replace(templateRe, function(str2, key) {
          var value = data[key];
          if (value === void 0) {
            throw new Error("No value provided for variable " + str2);
          } else if (typeof value === "function") {
            value = value(data);
          }
          return value;
        });
      }
      var isArray = Array.isArray || function(obj) {
        return Object.prototype.toString.call(obj) === "[object Array]";
      };
      function indexOf(array, el) {
        for (var i = 0; i < array.length; i++) {
          if (array[i] === el) {
            return i;
          }
        }
        return -1;
      }
      var emptyImageUrl = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
      function getPrefixed(name) {
        return window["webkit" + name] || window["moz" + name] || window["ms" + name];
      }
      var lastTime = 0;
      function timeoutDefer(fn) {
        var time = +/* @__PURE__ */ new Date(), timeToCall = Math.max(0, 16 - (time - lastTime));
        lastTime = time + timeToCall;
        return window.setTimeout(fn, timeToCall);
      }
      var requestFn = window.requestAnimationFrame || getPrefixed("RequestAnimationFrame") || timeoutDefer;
      var cancelFn = window.cancelAnimationFrame || getPrefixed("CancelAnimationFrame") || getPrefixed("CancelRequestAnimationFrame") || function(id) {
        window.clearTimeout(id);
      };
      function requestAnimFrame(fn, context, immediate) {
        if (immediate && requestFn === timeoutDefer) {
          fn.call(context);
        } else {
          return requestFn.call(window, bind(fn, context));
        }
      }
      function cancelAnimFrame(id) {
        if (id) {
          cancelFn.call(window, id);
        }
      }
      var Util = {
        __proto__: null,
        extend,
        create: create$2,
        bind,
        get lastId() {
          return lastId;
        },
        stamp,
        throttle,
        wrapNum,
        falseFn,
        formatNum,
        trim,
        splitWords,
        setOptions,
        getParamString,
        template,
        isArray,
        indexOf,
        emptyImageUrl,
        requestFn,
        cancelFn,
        requestAnimFrame,
        cancelAnimFrame
      };
      function Class() {
      }
      Class.extend = function(props) {
        var NewClass = function() {
          setOptions(this);
          if (this.initialize) {
            this.initialize.apply(this, arguments);
          }
          this.callInitHooks();
        };
        var parentProto = NewClass.__super__ = this.prototype;
        var proto = create$2(parentProto);
        proto.constructor = NewClass;
        NewClass.prototype = proto;
        for (var i in this) {
          if (Object.prototype.hasOwnProperty.call(this, i) && i !== "prototype" && i !== "__super__") {
            NewClass[i] = this[i];
          }
        }
        if (props.statics) {
          extend(NewClass, props.statics);
        }
        if (props.includes) {
          checkDeprecatedMixinEvents(props.includes);
          extend.apply(null, [proto].concat(props.includes));
        }
        extend(proto, props);
        delete proto.statics;
        delete proto.includes;
        if (proto.options) {
          proto.options = parentProto.options ? create$2(parentProto.options) : {};
          extend(proto.options, props.options);
        }
        proto._initHooks = [];
        proto.callInitHooks = function() {
          if (this._initHooksCalled) {
            return;
          }
          if (parentProto.callInitHooks) {
            parentProto.callInitHooks.call(this);
          }
          this._initHooksCalled = true;
          for (var i2 = 0, len = proto._initHooks.length; i2 < len; i2++) {
            proto._initHooks[i2].call(this);
          }
        };
        return NewClass;
      };
      Class.include = function(props) {
        var parentOptions = this.prototype.options;
        extend(this.prototype, props);
        if (props.options) {
          this.prototype.options = parentOptions;
          this.mergeOptions(props.options);
        }
        return this;
      };
      Class.mergeOptions = function(options) {
        extend(this.prototype.options, options);
        return this;
      };
      Class.addInitHook = function(fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        var init = typeof fn === "function" ? fn : function() {
          this[fn].apply(this, args);
        };
        this.prototype._initHooks = this.prototype._initHooks || [];
        this.prototype._initHooks.push(init);
        return this;
      };
      function checkDeprecatedMixinEvents(includes) {
        if (typeof L === "undefined" || !L || !L.Mixin) {
          return;
        }
        includes = isArray(includes) ? includes : [includes];
        for (var i = 0; i < includes.length; i++) {
          if (includes[i] === L.Mixin.Events) {
            console.warn("Deprecated include of L.Mixin.Events: this property will be removed in future releases, please inherit from L.Evented instead.", new Error().stack);
          }
        }
      }
      var Events = {
        /* @method on(type: String, fn: Function, context?: Object): this
         * Adds a listener function (`fn`) to a particular event type of the object. You can optionally specify the context of the listener (object the this keyword will point to). You can also pass several space-separated types (e.g. `'click dblclick'`).
         *
         * @alternative
         * @method on(eventMap: Object): this
         * Adds a set of type/listener pairs, e.g. `{click: onClick, mousemove: onMouseMove}`
         */
        on: function(types, fn, context) {
          if (typeof types === "object") {
            for (var type in types) {
              this._on(type, types[type], fn);
            }
          } else {
            types = splitWords(types);
            for (var i = 0, len = types.length; i < len; i++) {
              this._on(types[i], fn, context);
            }
          }
          return this;
        },
        /* @method off(type: String, fn?: Function, context?: Object): this
         * Removes a previously added listener function. If no function is specified, it will remove all the listeners of that particular event from the object. Note that if you passed a custom context to `on`, you must pass the same context to `off` in order to remove the listener.
         *
         * @alternative
         * @method off(eventMap: Object): this
         * Removes a set of type/listener pairs.
         *
         * @alternative
         * @method off: this
         * Removes all listeners to all events on the object. This includes implicitly attached events.
         */
        off: function(types, fn, context) {
          if (!arguments.length) {
            delete this._events;
          } else if (typeof types === "object") {
            for (var type in types) {
              this._off(type, types[type], fn);
            }
          } else {
            types = splitWords(types);
            var removeAll = arguments.length === 1;
            for (var i = 0, len = types.length; i < len; i++) {
              if (removeAll) {
                this._off(types[i]);
              } else {
                this._off(types[i], fn, context);
              }
            }
          }
          return this;
        },
        // attach listener (without syntactic sugar now)
        _on: function(type, fn, context, _once) {
          if (typeof fn !== "function") {
            console.warn("wrong listener type: " + typeof fn);
            return;
          }
          if (this._listens(type, fn, context) !== false) {
            return;
          }
          if (context === this) {
            context = void 0;
          }
          var newListener = { fn, ctx: context };
          if (_once) {
            newListener.once = true;
          }
          this._events = this._events || {};
          this._events[type] = this._events[type] || [];
          this._events[type].push(newListener);
        },
        _off: function(type, fn, context) {
          var listeners, i, len;
          if (!this._events) {
            return;
          }
          listeners = this._events[type];
          if (!listeners) {
            return;
          }
          if (arguments.length === 1) {
            if (this._firingCount) {
              for (i = 0, len = listeners.length; i < len; i++) {
                listeners[i].fn = falseFn;
              }
            }
            delete this._events[type];
            return;
          }
          if (typeof fn !== "function") {
            console.warn("wrong listener type: " + typeof fn);
            return;
          }
          var index2 = this._listens(type, fn, context);
          if (index2 !== false) {
            var listener = listeners[index2];
            if (this._firingCount) {
              listener.fn = falseFn;
              this._events[type] = listeners = listeners.slice();
            }
            listeners.splice(index2, 1);
          }
        },
        // @method fire(type: String, data?: Object, propagate?: Boolean): this
        // Fires an event of the specified type. You can optionally provide a data
        // object — the first argument of the listener function will contain its
        // properties. The event can optionally be propagated to event parents.
        fire: function(type, data, propagate) {
          if (!this.listens(type, propagate)) {
            return this;
          }
          var event = extend({}, data, {
            type,
            target: this,
            sourceTarget: data && data.sourceTarget || this
          });
          if (this._events) {
            var listeners = this._events[type];
            if (listeners) {
              this._firingCount = this._firingCount + 1 || 1;
              for (var i = 0, len = listeners.length; i < len; i++) {
                var l = listeners[i];
                var fn = l.fn;
                if (l.once) {
                  this.off(type, fn, l.ctx);
                }
                fn.call(l.ctx || this, event);
              }
              this._firingCount--;
            }
          }
          if (propagate) {
            this._propagateEvent(event);
          }
          return this;
        },
        // @method listens(type: String, propagate?: Boolean): Boolean
        // @method listens(type: String, fn: Function, context?: Object, propagate?: Boolean): Boolean
        // Returns `true` if a particular event type has any listeners attached to it.
        // The verification can optionally be propagated, it will return `true` if parents have the listener attached to it.
        listens: function(type, fn, context, propagate) {
          if (typeof type !== "string") {
            console.warn('"string" type argument expected');
          }
          var _fn = fn;
          if (typeof fn !== "function") {
            propagate = !!fn;
            _fn = void 0;
            context = void 0;
          }
          var listeners = this._events && this._events[type];
          if (listeners && listeners.length) {
            if (this._listens(type, _fn, context) !== false) {
              return true;
            }
          }
          if (propagate) {
            for (var id in this._eventParents) {
              if (this._eventParents[id].listens(type, fn, context, propagate)) {
                return true;
              }
            }
          }
          return false;
        },
        // returns the index (number) or false
        _listens: function(type, fn, context) {
          if (!this._events) {
            return false;
          }
          var listeners = this._events[type] || [];
          if (!fn) {
            return !!listeners.length;
          }
          if (context === this) {
            context = void 0;
          }
          for (var i = 0, len = listeners.length; i < len; i++) {
            if (listeners[i].fn === fn && listeners[i].ctx === context) {
              return i;
            }
          }
          return false;
        },
        // @method once(…): this
        // Behaves as [`on(…)`](#evented-on), except the listener will only get fired once and then removed.
        once: function(types, fn, context) {
          if (typeof types === "object") {
            for (var type in types) {
              this._on(type, types[type], fn, true);
            }
          } else {
            types = splitWords(types);
            for (var i = 0, len = types.length; i < len; i++) {
              this._on(types[i], fn, context, true);
            }
          }
          return this;
        },
        // @method addEventParent(obj: Evented): this
        // Adds an event parent - an `Evented` that will receive propagated events
        addEventParent: function(obj) {
          this._eventParents = this._eventParents || {};
          this._eventParents[stamp(obj)] = obj;
          return this;
        },
        // @method removeEventParent(obj: Evented): this
        // Removes an event parent, so it will stop receiving propagated events
        removeEventParent: function(obj) {
          if (this._eventParents) {
            delete this._eventParents[stamp(obj)];
          }
          return this;
        },
        _propagateEvent: function(e) {
          for (var id in this._eventParents) {
            this._eventParents[id].fire(e.type, extend({
              layer: e.target,
              propagatedFrom: e.target
            }, e), true);
          }
        }
      };
      Events.addEventListener = Events.on;
      Events.removeEventListener = Events.clearAllEventListeners = Events.off;
      Events.addOneTimeEventListener = Events.once;
      Events.fireEvent = Events.fire;
      Events.hasEventListeners = Events.listens;
      var Evented = Class.extend(Events);
      function Point(x, y, round) {
        this.x = round ? Math.round(x) : x;
        this.y = round ? Math.round(y) : y;
      }
      var trunc = Math.trunc || function(v) {
        return v > 0 ? Math.floor(v) : Math.ceil(v);
      };
      Point.prototype = {
        // @method clone(): Point
        // Returns a copy of the current point.
        clone: function() {
          return new Point(this.x, this.y);
        },
        // @method add(otherPoint: Point): Point
        // Returns the result of addition of the current and the given points.
        add: function(point) {
          return this.clone()._add(toPoint(point));
        },
        _add: function(point) {
          this.x += point.x;
          this.y += point.y;
          return this;
        },
        // @method subtract(otherPoint: Point): Point
        // Returns the result of subtraction of the given point from the current.
        subtract: function(point) {
          return this.clone()._subtract(toPoint(point));
        },
        _subtract: function(point) {
          this.x -= point.x;
          this.y -= point.y;
          return this;
        },
        // @method divideBy(num: Number): Point
        // Returns the result of division of the current point by the given number.
        divideBy: function(num) {
          return this.clone()._divideBy(num);
        },
        _divideBy: function(num) {
          this.x /= num;
          this.y /= num;
          return this;
        },
        // @method multiplyBy(num: Number): Point
        // Returns the result of multiplication of the current point by the given number.
        multiplyBy: function(num) {
          return this.clone()._multiplyBy(num);
        },
        _multiplyBy: function(num) {
          this.x *= num;
          this.y *= num;
          return this;
        },
        // @method scaleBy(scale: Point): Point
        // Multiply each coordinate of the current point by each coordinate of
        // `scale`. In linear algebra terms, multiply the point by the
        // [scaling matrix](https://en.wikipedia.org/wiki/Scaling_%28geometry%29#Matrix_representation)
        // defined by `scale`.
        scaleBy: function(point) {
          return new Point(this.x * point.x, this.y * point.y);
        },
        // @method unscaleBy(scale: Point): Point
        // Inverse of `scaleBy`. Divide each coordinate of the current point by
        // each coordinate of `scale`.
        unscaleBy: function(point) {
          return new Point(this.x / point.x, this.y / point.y);
        },
        // @method round(): Point
        // Returns a copy of the current point with rounded coordinates.
        round: function() {
          return this.clone()._round();
        },
        _round: function() {
          this.x = Math.round(this.x);
          this.y = Math.round(this.y);
          return this;
        },
        // @method floor(): Point
        // Returns a copy of the current point with floored coordinates (rounded down).
        floor: function() {
          return this.clone()._floor();
        },
        _floor: function() {
          this.x = Math.floor(this.x);
          this.y = Math.floor(this.y);
          return this;
        },
        // @method ceil(): Point
        // Returns a copy of the current point with ceiled coordinates (rounded up).
        ceil: function() {
          return this.clone()._ceil();
        },
        _ceil: function() {
          this.x = Math.ceil(this.x);
          this.y = Math.ceil(this.y);
          return this;
        },
        // @method trunc(): Point
        // Returns a copy of the current point with truncated coordinates (rounded towards zero).
        trunc: function() {
          return this.clone()._trunc();
        },
        _trunc: function() {
          this.x = trunc(this.x);
          this.y = trunc(this.y);
          return this;
        },
        // @method distanceTo(otherPoint: Point): Number
        // Returns the cartesian distance between the current and the given points.
        distanceTo: function(point) {
          point = toPoint(point);
          var x = point.x - this.x, y = point.y - this.y;
          return Math.sqrt(x * x + y * y);
        },
        // @method equals(otherPoint: Point): Boolean
        // Returns `true` if the given point has the same coordinates.
        equals: function(point) {
          point = toPoint(point);
          return point.x === this.x && point.y === this.y;
        },
        // @method contains(otherPoint: Point): Boolean
        // Returns `true` if both coordinates of the given point are less than the corresponding current point coordinates (in absolute values).
        contains: function(point) {
          point = toPoint(point);
          return Math.abs(point.x) <= Math.abs(this.x) && Math.abs(point.y) <= Math.abs(this.y);
        },
        // @method toString(): String
        // Returns a string representation of the point for debugging purposes.
        toString: function() {
          return "Point(" + formatNum(this.x) + ", " + formatNum(this.y) + ")";
        }
      };
      function toPoint(x, y, round) {
        if (x instanceof Point) {
          return x;
        }
        if (isArray(x)) {
          return new Point(x[0], x[1]);
        }
        if (x === void 0 || x === null) {
          return x;
        }
        if (typeof x === "object" && "x" in x && "y" in x) {
          return new Point(x.x, x.y);
        }
        return new Point(x, y, round);
      }
      function Bounds(a, b) {
        if (!a) {
          return;
        }
        var points = b ? [a, b] : a;
        for (var i = 0, len = points.length; i < len; i++) {
          this.extend(points[i]);
        }
      }
      Bounds.prototype = {
        // @method extend(point: Point): this
        // Extends the bounds to contain the given point.
        // @alternative
        // @method extend(otherBounds: Bounds): this
        // Extend the bounds to contain the given bounds
        extend: function(obj) {
          var min2, max2;
          if (!obj) {
            return this;
          }
          if (obj instanceof Point || typeof obj[0] === "number" || "x" in obj) {
            min2 = max2 = toPoint(obj);
          } else {
            obj = toBounds(obj);
            min2 = obj.min;
            max2 = obj.max;
            if (!min2 || !max2) {
              return this;
            }
          }
          if (!this.min && !this.max) {
            this.min = min2.clone();
            this.max = max2.clone();
          } else {
            this.min.x = Math.min(min2.x, this.min.x);
            this.max.x = Math.max(max2.x, this.max.x);
            this.min.y = Math.min(min2.y, this.min.y);
            this.max.y = Math.max(max2.y, this.max.y);
          }
          return this;
        },
        // @method getCenter(round?: Boolean): Point
        // Returns the center point of the bounds.
        getCenter: function(round) {
          return toPoint(
            (this.min.x + this.max.x) / 2,
            (this.min.y + this.max.y) / 2,
            round
          );
        },
        // @method getBottomLeft(): Point
        // Returns the bottom-left point of the bounds.
        getBottomLeft: function() {
          return toPoint(this.min.x, this.max.y);
        },
        // @method getTopRight(): Point
        // Returns the top-right point of the bounds.
        getTopRight: function() {
          return toPoint(this.max.x, this.min.y);
        },
        // @method getTopLeft(): Point
        // Returns the top-left point of the bounds (i.e. [`this.min`](#bounds-min)).
        getTopLeft: function() {
          return this.min;
        },
        // @method getBottomRight(): Point
        // Returns the bottom-right point of the bounds (i.e. [`this.max`](#bounds-max)).
        getBottomRight: function() {
          return this.max;
        },
        // @method getSize(): Point
        // Returns the size of the given bounds
        getSize: function() {
          return this.max.subtract(this.min);
        },
        // @method contains(otherBounds: Bounds): Boolean
        // Returns `true` if the rectangle contains the given one.
        // @alternative
        // @method contains(point: Point): Boolean
        // Returns `true` if the rectangle contains the given point.
        contains: function(obj) {
          var min, max;
          if (typeof obj[0] === "number" || obj instanceof Point) {
            obj = toPoint(obj);
          } else {
            obj = toBounds(obj);
          }
          if (obj instanceof Bounds) {
            min = obj.min;
            max = obj.max;
          } else {
            min = max = obj;
          }
          return min.x >= this.min.x && max.x <= this.max.x && min.y >= this.min.y && max.y <= this.max.y;
        },
        // @method intersects(otherBounds: Bounds): Boolean
        // Returns `true` if the rectangle intersects the given bounds. Two bounds
        // intersect if they have at least one point in common.
        intersects: function(bounds) {
          bounds = toBounds(bounds);
          var min = this.min, max = this.max, min2 = bounds.min, max2 = bounds.max, xIntersects = max2.x >= min.x && min2.x <= max.x, yIntersects = max2.y >= min.y && min2.y <= max.y;
          return xIntersects && yIntersects;
        },
        // @method overlaps(otherBounds: Bounds): Boolean
        // Returns `true` if the rectangle overlaps the given bounds. Two bounds
        // overlap if their intersection is an area.
        overlaps: function(bounds) {
          bounds = toBounds(bounds);
          var min = this.min, max = this.max, min2 = bounds.min, max2 = bounds.max, xOverlaps = max2.x > min.x && min2.x < max.x, yOverlaps = max2.y > min.y && min2.y < max.y;
          return xOverlaps && yOverlaps;
        },
        // @method isValid(): Boolean
        // Returns `true` if the bounds are properly initialized.
        isValid: function() {
          return !!(this.min && this.max);
        },
        // @method pad(bufferRatio: Number): Bounds
        // Returns bounds created by extending or retracting the current bounds by a given ratio in each direction.
        // For example, a ratio of 0.5 extends the bounds by 50% in each direction.
        // Negative values will retract the bounds.
        pad: function(bufferRatio) {
          var min = this.min, max = this.max, heightBuffer = Math.abs(min.x - max.x) * bufferRatio, widthBuffer = Math.abs(min.y - max.y) * bufferRatio;
          return toBounds(
            toPoint(min.x - heightBuffer, min.y - widthBuffer),
            toPoint(max.x + heightBuffer, max.y + widthBuffer)
          );
        },
        // @method equals(otherBounds: Bounds): Boolean
        // Returns `true` if the rectangle is equivalent to the given bounds.
        equals: function(bounds) {
          if (!bounds) {
            return false;
          }
          bounds = toBounds(bounds);
          return this.min.equals(bounds.getTopLeft()) && this.max.equals(bounds.getBottomRight());
        }
      };
      function toBounds(a, b) {
        if (!a || a instanceof Bounds) {
          return a;
        }
        return new Bounds(a, b);
      }
      function LatLngBounds(corner1, corner2) {
        if (!corner1) {
          return;
        }
        var latlngs = corner2 ? [corner1, corner2] : corner1;
        for (var i = 0, len = latlngs.length; i < len; i++) {
          this.extend(latlngs[i]);
        }
      }
      LatLngBounds.prototype = {
        // @method extend(latlng: LatLng): this
        // Extend the bounds to contain the given point
        // @alternative
        // @method extend(otherBounds: LatLngBounds): this
        // Extend the bounds to contain the given bounds
        extend: function(obj) {
          var sw = this._southWest, ne = this._northEast, sw2, ne2;
          if (obj instanceof LatLng) {
            sw2 = obj;
            ne2 = obj;
          } else if (obj instanceof LatLngBounds) {
            sw2 = obj._southWest;
            ne2 = obj._northEast;
            if (!sw2 || !ne2) {
              return this;
            }
          } else {
            return obj ? this.extend(toLatLng(obj) || toLatLngBounds(obj)) : this;
          }
          if (!sw && !ne) {
            this._southWest = new LatLng(sw2.lat, sw2.lng);
            this._northEast = new LatLng(ne2.lat, ne2.lng);
          } else {
            sw.lat = Math.min(sw2.lat, sw.lat);
            sw.lng = Math.min(sw2.lng, sw.lng);
            ne.lat = Math.max(ne2.lat, ne.lat);
            ne.lng = Math.max(ne2.lng, ne.lng);
          }
          return this;
        },
        // @method pad(bufferRatio: Number): LatLngBounds
        // Returns bounds created by extending or retracting the current bounds by a given ratio in each direction.
        // For example, a ratio of 0.5 extends the bounds by 50% in each direction.
        // Negative values will retract the bounds.
        pad: function(bufferRatio) {
          var sw = this._southWest, ne = this._northEast, heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio, widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;
          return new LatLngBounds(
            new LatLng(sw.lat - heightBuffer, sw.lng - widthBuffer),
            new LatLng(ne.lat + heightBuffer, ne.lng + widthBuffer)
          );
        },
        // @method getCenter(): LatLng
        // Returns the center point of the bounds.
        getCenter: function() {
          return new LatLng(
            (this._southWest.lat + this._northEast.lat) / 2,
            (this._southWest.lng + this._northEast.lng) / 2
          );
        },
        // @method getSouthWest(): LatLng
        // Returns the south-west point of the bounds.
        getSouthWest: function() {
          return this._southWest;
        },
        // @method getNorthEast(): LatLng
        // Returns the north-east point of the bounds.
        getNorthEast: function() {
          return this._northEast;
        },
        // @method getNorthWest(): LatLng
        // Returns the north-west point of the bounds.
        getNorthWest: function() {
          return new LatLng(this.getNorth(), this.getWest());
        },
        // @method getSouthEast(): LatLng
        // Returns the south-east point of the bounds.
        getSouthEast: function() {
          return new LatLng(this.getSouth(), this.getEast());
        },
        // @method getWest(): Number
        // Returns the west longitude of the bounds
        getWest: function() {
          return this._southWest.lng;
        },
        // @method getSouth(): Number
        // Returns the south latitude of the bounds
        getSouth: function() {
          return this._southWest.lat;
        },
        // @method getEast(): Number
        // Returns the east longitude of the bounds
        getEast: function() {
          return this._northEast.lng;
        },
        // @method getNorth(): Number
        // Returns the north latitude of the bounds
        getNorth: function() {
          return this._northEast.lat;
        },
        // @method contains(otherBounds: LatLngBounds): Boolean
        // Returns `true` if the rectangle contains the given one.
        // @alternative
        // @method contains (latlng: LatLng): Boolean
        // Returns `true` if the rectangle contains the given point.
        contains: function(obj) {
          if (typeof obj[0] === "number" || obj instanceof LatLng || "lat" in obj) {
            obj = toLatLng(obj);
          } else {
            obj = toLatLngBounds(obj);
          }
          var sw = this._southWest, ne = this._northEast, sw2, ne2;
          if (obj instanceof LatLngBounds) {
            sw2 = obj.getSouthWest();
            ne2 = obj.getNorthEast();
          } else {
            sw2 = ne2 = obj;
          }
          return sw2.lat >= sw.lat && ne2.lat <= ne.lat && sw2.lng >= sw.lng && ne2.lng <= ne.lng;
        },
        // @method intersects(otherBounds: LatLngBounds): Boolean
        // Returns `true` if the rectangle intersects the given bounds. Two bounds intersect if they have at least one point in common.
        intersects: function(bounds) {
          bounds = toLatLngBounds(bounds);
          var sw = this._southWest, ne = this._northEast, sw2 = bounds.getSouthWest(), ne2 = bounds.getNorthEast(), latIntersects = ne2.lat >= sw.lat && sw2.lat <= ne.lat, lngIntersects = ne2.lng >= sw.lng && sw2.lng <= ne.lng;
          return latIntersects && lngIntersects;
        },
        // @method overlaps(otherBounds: LatLngBounds): Boolean
        // Returns `true` if the rectangle overlaps the given bounds. Two bounds overlap if their intersection is an area.
        overlaps: function(bounds) {
          bounds = toLatLngBounds(bounds);
          var sw = this._southWest, ne = this._northEast, sw2 = bounds.getSouthWest(), ne2 = bounds.getNorthEast(), latOverlaps = ne2.lat > sw.lat && sw2.lat < ne.lat, lngOverlaps = ne2.lng > sw.lng && sw2.lng < ne.lng;
          return latOverlaps && lngOverlaps;
        },
        // @method toBBoxString(): String
        // Returns a string with bounding box coordinates in a 'southwest_lng,southwest_lat,northeast_lng,northeast_lat' format. Useful for sending requests to web services that return geo data.
        toBBoxString: function() {
          return [this.getWest(), this.getSouth(), this.getEast(), this.getNorth()].join(",");
        },
        // @method equals(otherBounds: LatLngBounds, maxMargin?: Number): Boolean
        // Returns `true` if the rectangle is equivalent (within a small margin of error) to the given bounds. The margin of error can be overridden by setting `maxMargin` to a small number.
        equals: function(bounds, maxMargin) {
          if (!bounds) {
            return false;
          }
          bounds = toLatLngBounds(bounds);
          return this._southWest.equals(bounds.getSouthWest(), maxMargin) && this._northEast.equals(bounds.getNorthEast(), maxMargin);
        },
        // @method isValid(): Boolean
        // Returns `true` if the bounds are properly initialized.
        isValid: function() {
          return !!(this._southWest && this._northEast);
        }
      };
      function toLatLngBounds(a, b) {
        if (a instanceof LatLngBounds) {
          return a;
        }
        return new LatLngBounds(a, b);
      }
      function LatLng(lat, lng, alt) {
        if (isNaN(lat) || isNaN(lng)) {
          throw new Error("Invalid LatLng object: (" + lat + ", " + lng + ")");
        }
        this.lat = +lat;
        this.lng = +lng;
        if (alt !== void 0) {
          this.alt = +alt;
        }
      }
      LatLng.prototype = {
        // @method equals(otherLatLng: LatLng, maxMargin?: Number): Boolean
        // Returns `true` if the given `LatLng` point is at the same position (within a small margin of error). The margin of error can be overridden by setting `maxMargin` to a small number.
        equals: function(obj, maxMargin) {
          if (!obj) {
            return false;
          }
          obj = toLatLng(obj);
          var margin = Math.max(
            Math.abs(this.lat - obj.lat),
            Math.abs(this.lng - obj.lng)
          );
          return margin <= (maxMargin === void 0 ? 1e-9 : maxMargin);
        },
        // @method toString(): String
        // Returns a string representation of the point (for debugging purposes).
        toString: function(precision) {
          return "LatLng(" + formatNum(this.lat, precision) + ", " + formatNum(this.lng, precision) + ")";
        },
        // @method distanceTo(otherLatLng: LatLng): Number
        // Returns the distance (in meters) to the given `LatLng` calculated using the [Spherical Law of Cosines](https://en.wikipedia.org/wiki/Spherical_law_of_cosines).
        distanceTo: function(other) {
          return Earth.distance(this, toLatLng(other));
        },
        // @method wrap(): LatLng
        // Returns a new `LatLng` object with the longitude wrapped so it's always between -180 and +180 degrees.
        wrap: function() {
          return Earth.wrapLatLng(this);
        },
        // @method toBounds(sizeInMeters: Number): LatLngBounds
        // Returns a new `LatLngBounds` object in which each boundary is `sizeInMeters/2` meters apart from the `LatLng`.
        toBounds: function(sizeInMeters) {
          var latAccuracy = 180 * sizeInMeters / 40075017, lngAccuracy = latAccuracy / Math.cos(Math.PI / 180 * this.lat);
          return toLatLngBounds(
            [this.lat - latAccuracy, this.lng - lngAccuracy],
            [this.lat + latAccuracy, this.lng + lngAccuracy]
          );
        },
        clone: function() {
          return new LatLng(this.lat, this.lng, this.alt);
        }
      };
      function toLatLng(a, b, c) {
        if (a instanceof LatLng) {
          return a;
        }
        if (isArray(a) && typeof a[0] !== "object") {
          if (a.length === 3) {
            return new LatLng(a[0], a[1], a[2]);
          }
          if (a.length === 2) {
            return new LatLng(a[0], a[1]);
          }
          return null;
        }
        if (a === void 0 || a === null) {
          return a;
        }
        if (typeof a === "object" && "lat" in a) {
          return new LatLng(a.lat, "lng" in a ? a.lng : a.lon, a.alt);
        }
        if (b === void 0) {
          return null;
        }
        return new LatLng(a, b, c);
      }
      var CRS = {
        // @method latLngToPoint(latlng: LatLng, zoom: Number): Point
        // Projects geographical coordinates into pixel coordinates for a given zoom.
        latLngToPoint: function(latlng, zoom2) {
          var projectedPoint = this.projection.project(latlng), scale2 = this.scale(zoom2);
          return this.transformation._transform(projectedPoint, scale2);
        },
        // @method pointToLatLng(point: Point, zoom: Number): LatLng
        // The inverse of `latLngToPoint`. Projects pixel coordinates on a given
        // zoom into geographical coordinates.
        pointToLatLng: function(point, zoom2) {
          var scale2 = this.scale(zoom2), untransformedPoint = this.transformation.untransform(point, scale2);
          return this.projection.unproject(untransformedPoint);
        },
        // @method project(latlng: LatLng): Point
        // Projects geographical coordinates into coordinates in units accepted for
        // this CRS (e.g. meters for EPSG:3857, for passing it to WMS services).
        project: function(latlng) {
          return this.projection.project(latlng);
        },
        // @method unproject(point: Point): LatLng
        // Given a projected coordinate returns the corresponding LatLng.
        // The inverse of `project`.
        unproject: function(point) {
          return this.projection.unproject(point);
        },
        // @method scale(zoom: Number): Number
        // Returns the scale used when transforming projected coordinates into
        // pixel coordinates for a particular zoom. For example, it returns
        // `256 * 2^zoom` for Mercator-based CRS.
        scale: function(zoom2) {
          return 256 * Math.pow(2, zoom2);
        },
        // @method zoom(scale: Number): Number
        // Inverse of `scale()`, returns the zoom level corresponding to a scale
        // factor of `scale`.
        zoom: function(scale2) {
          return Math.log(scale2 / 256) / Math.LN2;
        },
        // @method getProjectedBounds(zoom: Number): Bounds
        // Returns the projection's bounds scaled and transformed for the provided `zoom`.
        getProjectedBounds: function(zoom2) {
          if (this.infinite) {
            return null;
          }
          var b = this.projection.bounds, s2 = this.scale(zoom2), min = this.transformation.transform(b.min, s2), max = this.transformation.transform(b.max, s2);
          return new Bounds(min, max);
        },
        // @method distance(latlng1: LatLng, latlng2: LatLng): Number
        // Returns the distance between two geographical coordinates.
        // @property code: String
        // Standard code name of the CRS passed into WMS services (e.g. `'EPSG:3857'`)
        //
        // @property wrapLng: Number[]
        // An array of two numbers defining whether the longitude (horizontal) coordinate
        // axis wraps around a given range and how. Defaults to `[-180, 180]` in most
        // geographical CRSs. If `undefined`, the longitude axis does not wrap around.
        //
        // @property wrapLat: Number[]
        // Like `wrapLng`, but for the latitude (vertical) axis.
        // wrapLng: [min, max],
        // wrapLat: [min, max],
        // @property infinite: Boolean
        // If true, the coordinate space will be unbounded (infinite in both axes)
        infinite: false,
        // @method wrapLatLng(latlng: LatLng): LatLng
        // Returns a `LatLng` where lat and lng has been wrapped according to the
        // CRS's `wrapLat` and `wrapLng` properties, if they are outside the CRS's bounds.
        wrapLatLng: function(latlng) {
          var lng = this.wrapLng ? wrapNum(latlng.lng, this.wrapLng, true) : latlng.lng, lat = this.wrapLat ? wrapNum(latlng.lat, this.wrapLat, true) : latlng.lat, alt = latlng.alt;
          return new LatLng(lat, lng, alt);
        },
        // @method wrapLatLngBounds(bounds: LatLngBounds): LatLngBounds
        // Returns a `LatLngBounds` with the same size as the given one, ensuring
        // that its center is within the CRS's bounds.
        // Only accepts actual `L.LatLngBounds` instances, not arrays.
        wrapLatLngBounds: function(bounds) {
          var center = bounds.getCenter(), newCenter = this.wrapLatLng(center), latShift = center.lat - newCenter.lat, lngShift = center.lng - newCenter.lng;
          if (latShift === 0 && lngShift === 0) {
            return bounds;
          }
          var sw = bounds.getSouthWest(), ne = bounds.getNorthEast(), newSw = new LatLng(sw.lat - latShift, sw.lng - lngShift), newNe = new LatLng(ne.lat - latShift, ne.lng - lngShift);
          return new LatLngBounds(newSw, newNe);
        }
      };
      var Earth = extend({}, CRS, {
        wrapLng: [-180, 180],
        // Mean Earth Radius, as recommended for use by
        // the International Union of Geodesy and Geophysics,
        // see https://rosettacode.org/wiki/Haversine_formula
        R: 6371e3,
        // distance between two geographical points using spherical law of cosines approximation
        distance: function(latlng1, latlng2) {
          var rad = Math.PI / 180, lat1 = latlng1.lat * rad, lat2 = latlng2.lat * rad, sinDLat = Math.sin((latlng2.lat - latlng1.lat) * rad / 2), sinDLon = Math.sin((latlng2.lng - latlng1.lng) * rad / 2), a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon, c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return this.R * c;
        }
      });
      var earthRadius = 6378137;
      var SphericalMercator = {
        R: earthRadius,
        MAX_LATITUDE: 85.0511287798,
        project: function(latlng) {
          var d = Math.PI / 180, max = this.MAX_LATITUDE, lat = Math.max(Math.min(max, latlng.lat), -max), sin = Math.sin(lat * d);
          return new Point(
            this.R * latlng.lng * d,
            this.R * Math.log((1 + sin) / (1 - sin)) / 2
          );
        },
        unproject: function(point) {
          var d = 180 / Math.PI;
          return new LatLng(
            (2 * Math.atan(Math.exp(point.y / this.R)) - Math.PI / 2) * d,
            point.x * d / this.R
          );
        },
        bounds: (function() {
          var d = earthRadius * Math.PI;
          return new Bounds([-d, -d], [d, d]);
        })()
      };
      function Transformation(a, b, c, d) {
        if (isArray(a)) {
          this._a = a[0];
          this._b = a[1];
          this._c = a[2];
          this._d = a[3];
          return;
        }
        this._a = a;
        this._b = b;
        this._c = c;
        this._d = d;
      }
      Transformation.prototype = {
        // @method transform(point: Point, scale?: Number): Point
        // Returns a transformed point, optionally multiplied by the given scale.
        // Only accepts actual `L.Point` instances, not arrays.
        transform: function(point, scale2) {
          return this._transform(point.clone(), scale2);
        },
        // destructive transform (faster)
        _transform: function(point, scale2) {
          scale2 = scale2 || 1;
          point.x = scale2 * (this._a * point.x + this._b);
          point.y = scale2 * (this._c * point.y + this._d);
          return point;
        },
        // @method untransform(point: Point, scale?: Number): Point
        // Returns the reverse transformation of the given point, optionally divided
        // by the given scale. Only accepts actual `L.Point` instances, not arrays.
        untransform: function(point, scale2) {
          scale2 = scale2 || 1;
          return new Point(
            (point.x / scale2 - this._b) / this._a,
            (point.y / scale2 - this._d) / this._c
          );
        }
      };
      function toTransformation(a, b, c, d) {
        return new Transformation(a, b, c, d);
      }
      var EPSG3857 = extend({}, Earth, {
        code: "EPSG:3857",
        projection: SphericalMercator,
        transformation: (function() {
          var scale2 = 0.5 / (Math.PI * SphericalMercator.R);
          return toTransformation(scale2, 0.5, -scale2, 0.5);
        })()
      });
      var EPSG900913 = extend({}, EPSG3857, {
        code: "EPSG:900913"
      });
      function svgCreate(name) {
        return document.createElementNS("http://www.w3.org/2000/svg", name);
      }
      function pointsToPath(rings, closed) {
        var str = "", i, j, len, len2, points, p;
        for (i = 0, len = rings.length; i < len; i++) {
          points = rings[i];
          for (j = 0, len2 = points.length; j < len2; j++) {
            p = points[j];
            str += (j ? "L" : "M") + p.x + " " + p.y;
          }
          str += closed ? Browser.svg ? "z" : "x" : "";
        }
        return str || "M0 0";
      }
      var style = document.documentElement.style;
      var ie = "ActiveXObject" in window;
      var ielt9 = ie && !document.addEventListener;
      var edge = "msLaunchUri" in navigator && !("documentMode" in document);
      var webkit = userAgentContains("webkit");
      var android = userAgentContains("android");
      var android23 = userAgentContains("android 2") || userAgentContains("android 3");
      var webkitVer = parseInt(/WebKit\/([0-9]+)|$/.exec(navigator.userAgent)[1], 10);
      var androidStock = android && userAgentContains("Google") && webkitVer < 537 && !("AudioNode" in window);
      var opera = !!window.opera;
      var chrome = !edge && userAgentContains("chrome");
      var gecko = userAgentContains("gecko") && !webkit && !opera && !ie;
      var safari = !chrome && userAgentContains("safari");
      var phantom = userAgentContains("phantom");
      var opera12 = "OTransition" in style;
      var win = navigator.platform.indexOf("Win") === 0;
      var ie3d = ie && "transition" in style;
      var webkit3d = "WebKitCSSMatrix" in window && "m11" in new window.WebKitCSSMatrix() && !android23;
      var gecko3d = "MozPerspective" in style;
      var any3d = !window.L_DISABLE_3D && (ie3d || webkit3d || gecko3d) && !opera12 && !phantom;
      var mobile = typeof orientation !== "undefined" || userAgentContains("mobile");
      var mobileWebkit = mobile && webkit;
      var mobileWebkit3d = mobile && webkit3d;
      var msPointer = !window.PointerEvent && window.MSPointerEvent;
      var pointer = !!(window.PointerEvent || msPointer);
      var touchNative = "ontouchstart" in window || !!window.TouchEvent;
      var touch = !window.L_NO_TOUCH && (touchNative || pointer);
      var mobileOpera = mobile && opera;
      var mobileGecko = mobile && gecko;
      var retina = (window.devicePixelRatio || window.screen.deviceXDPI / window.screen.logicalXDPI) > 1;
      var passiveEvents = (function() {
        var supportsPassiveOption = false;
        try {
          var opts = Object.defineProperty({}, "passive", {
            get: function() {
              supportsPassiveOption = true;
            }
          });
          window.addEventListener("testPassiveEventSupport", falseFn, opts);
          window.removeEventListener("testPassiveEventSupport", falseFn, opts);
        } catch (e) {
        }
        return supportsPassiveOption;
      })();
      var canvas$1 = (function() {
        return !!document.createElement("canvas").getContext;
      })();
      var svg$1 = !!(document.createElementNS && svgCreate("svg").createSVGRect);
      var inlineSvg = !!svg$1 && (function() {
        var div = document.createElement("div");
        div.innerHTML = "<svg/>";
        return (div.firstChild && div.firstChild.namespaceURI) === "http://www.w3.org/2000/svg";
      })();
      var vml = !svg$1 && (function() {
        try {
          var div = document.createElement("div");
          div.innerHTML = '<v:shape adj="1"/>';
          var shape = div.firstChild;
          shape.style.behavior = "url(#default#VML)";
          return shape && typeof shape.adj === "object";
        } catch (e) {
          return false;
        }
      })();
      var mac = navigator.platform.indexOf("Mac") === 0;
      var linux = navigator.platform.indexOf("Linux") === 0;
      function userAgentContains(str) {
        return navigator.userAgent.toLowerCase().indexOf(str) >= 0;
      }
      var Browser = {
        ie,
        ielt9,
        edge,
        webkit,
        android,
        android23,
        androidStock,
        opera,
        chrome,
        gecko,
        safari,
        phantom,
        opera12,
        win,
        ie3d,
        webkit3d,
        gecko3d,
        any3d,
        mobile,
        mobileWebkit,
        mobileWebkit3d,
        msPointer,
        pointer,
        touch,
        touchNative,
        mobileOpera,
        mobileGecko,
        retina,
        passiveEvents,
        canvas: canvas$1,
        svg: svg$1,
        vml,
        inlineSvg,
        mac,
        linux
      };
      var POINTER_DOWN = Browser.msPointer ? "MSPointerDown" : "pointerdown";
      var POINTER_MOVE = Browser.msPointer ? "MSPointerMove" : "pointermove";
      var POINTER_UP = Browser.msPointer ? "MSPointerUp" : "pointerup";
      var POINTER_CANCEL = Browser.msPointer ? "MSPointerCancel" : "pointercancel";
      var pEvent = {
        touchstart: POINTER_DOWN,
        touchmove: POINTER_MOVE,
        touchend: POINTER_UP,
        touchcancel: POINTER_CANCEL
      };
      var handle = {
        touchstart: _onPointerStart,
        touchmove: _handlePointer,
        touchend: _handlePointer,
        touchcancel: _handlePointer
      };
      var _pointers = {};
      var _pointerDocListener = false;
      function addPointerListener(obj, type, handler) {
        if (type === "touchstart") {
          _addPointerDocListener();
        }
        if (!handle[type]) {
          console.warn("wrong event specified:", type);
          return falseFn;
        }
        handler = handle[type].bind(this, handler);
        obj.addEventListener(pEvent[type], handler, false);
        return handler;
      }
      function removePointerListener(obj, type, handler) {
        if (!pEvent[type]) {
          console.warn("wrong event specified:", type);
          return;
        }
        obj.removeEventListener(pEvent[type], handler, false);
      }
      function _globalPointerDown(e) {
        _pointers[e.pointerId] = e;
      }
      function _globalPointerMove(e) {
        if (_pointers[e.pointerId]) {
          _pointers[e.pointerId] = e;
        }
      }
      function _globalPointerUp(e) {
        delete _pointers[e.pointerId];
      }
      function _addPointerDocListener() {
        if (!_pointerDocListener) {
          document.addEventListener(POINTER_DOWN, _globalPointerDown, true);
          document.addEventListener(POINTER_MOVE, _globalPointerMove, true);
          document.addEventListener(POINTER_UP, _globalPointerUp, true);
          document.addEventListener(POINTER_CANCEL, _globalPointerUp, true);
          _pointerDocListener = true;
        }
      }
      function _handlePointer(handler, e) {
        if (e.pointerType === (e.MSPOINTER_TYPE_MOUSE || "mouse")) {
          return;
        }
        e.touches = [];
        for (var i in _pointers) {
          e.touches.push(_pointers[i]);
        }
        e.changedTouches = [e];
        handler(e);
      }
      function _onPointerStart(handler, e) {
        if (e.MSPOINTER_TYPE_TOUCH && e.pointerType === e.MSPOINTER_TYPE_TOUCH) {
          preventDefault(e);
        }
        _handlePointer(handler, e);
      }
      function makeDblclick(event) {
        var newEvent = {}, prop, i;
        for (i in event) {
          prop = event[i];
          newEvent[i] = prop && prop.bind ? prop.bind(event) : prop;
        }
        event = newEvent;
        newEvent.type = "dblclick";
        newEvent.detail = 2;
        newEvent.isTrusted = false;
        newEvent._simulated = true;
        return newEvent;
      }
      var delay = 200;
      function addDoubleTapListener(obj, handler) {
        obj.addEventListener("dblclick", handler);
        var last = 0, detail;
        function simDblclick(e) {
          if (e.detail !== 1) {
            detail = e.detail;
            return;
          }
          if (e.pointerType === "mouse" || e.sourceCapabilities && !e.sourceCapabilities.firesTouchEvents) {
            return;
          }
          var path = getPropagationPath(e);
          if (path.some(function(el) {
            return el instanceof HTMLLabelElement && el.attributes.for;
          }) && !path.some(function(el) {
            return el instanceof HTMLInputElement || el instanceof HTMLSelectElement;
          })) {
            return;
          }
          var now = Date.now();
          if (now - last <= delay) {
            detail++;
            if (detail === 2) {
              handler(makeDblclick(e));
            }
          } else {
            detail = 1;
          }
          last = now;
        }
        obj.addEventListener("click", simDblclick);
        return {
          dblclick: handler,
          simDblclick
        };
      }
      function removeDoubleTapListener(obj, handlers) {
        obj.removeEventListener("dblclick", handlers.dblclick);
        obj.removeEventListener("click", handlers.simDblclick);
      }
      var TRANSFORM = testProp(
        ["transform", "webkitTransform", "OTransform", "MozTransform", "msTransform"]
      );
      var TRANSITION = testProp(
        ["webkitTransition", "transition", "OTransition", "MozTransition", "msTransition"]
      );
      var TRANSITION_END = TRANSITION === "webkitTransition" || TRANSITION === "OTransition" ? TRANSITION + "End" : "transitionend";
      function get(id) {
        return typeof id === "string" ? document.getElementById(id) : id;
      }
      function getStyle(el, style2) {
        var value = el.style[style2] || el.currentStyle && el.currentStyle[style2];
        if ((!value || value === "auto") && document.defaultView) {
          var css = document.defaultView.getComputedStyle(el, null);
          value = css ? css[style2] : null;
        }
        return value === "auto" ? null : value;
      }
      function create$1(tagName, className, container) {
        var el = document.createElement(tagName);
        el.className = className || "";
        if (container) {
          container.appendChild(el);
        }
        return el;
      }
      function remove(el) {
        var parent = el.parentNode;
        if (parent) {
          parent.removeChild(el);
        }
      }
      function empty(el) {
        while (el.firstChild) {
          el.removeChild(el.firstChild);
        }
      }
      function toFront(el) {
        var parent = el.parentNode;
        if (parent && parent.lastChild !== el) {
          parent.appendChild(el);
        }
      }
      function toBack(el) {
        var parent = el.parentNode;
        if (parent && parent.firstChild !== el) {
          parent.insertBefore(el, parent.firstChild);
        }
      }
      function hasClass(el, name) {
        if (el.classList !== void 0) {
          return el.classList.contains(name);
        }
        var className = getClass(el);
        return className.length > 0 && new RegExp("(^|\\s)" + name + "(\\s|$)").test(className);
      }
      function addClass(el, name) {
        if (el.classList !== void 0) {
          var classes = splitWords(name);
          for (var i = 0, len = classes.length; i < len; i++) {
            el.classList.add(classes[i]);
          }
        } else if (!hasClass(el, name)) {
          var className = getClass(el);
          setClass(el, (className ? className + " " : "") + name);
        }
      }
      function removeClass(el, name) {
        if (el.classList !== void 0) {
          el.classList.remove(name);
        } else {
          setClass(el, trim((" " + getClass(el) + " ").replace(" " + name + " ", " ")));
        }
      }
      function setClass(el, name) {
        if (el.className.baseVal === void 0) {
          el.className = name;
        } else {
          el.className.baseVal = name;
        }
      }
      function getClass(el) {
        if (el.correspondingElement) {
          el = el.correspondingElement;
        }
        return el.className.baseVal === void 0 ? el.className : el.className.baseVal;
      }
      function setOpacity(el, value) {
        if ("opacity" in el.style) {
          el.style.opacity = value;
        } else if ("filter" in el.style) {
          _setOpacityIE(el, value);
        }
      }
      function _setOpacityIE(el, value) {
        var filter = false, filterName = "DXImageTransform.Microsoft.Alpha";
        try {
          filter = el.filters.item(filterName);
        } catch (e) {
          if (value === 1) {
            return;
          }
        }
        value = Math.round(value * 100);
        if (filter) {
          filter.Enabled = value !== 100;
          filter.Opacity = value;
        } else {
          el.style.filter += " progid:" + filterName + "(opacity=" + value + ")";
        }
      }
      function testProp(props) {
        var style2 = document.documentElement.style;
        for (var i = 0; i < props.length; i++) {
          if (props[i] in style2) {
            return props[i];
          }
        }
        return false;
      }
      function setTransform(el, offset, scale2) {
        var pos = offset || new Point(0, 0);
        el.style[TRANSFORM] = (Browser.ie3d ? "translate(" + pos.x + "px," + pos.y + "px)" : "translate3d(" + pos.x + "px," + pos.y + "px,0)") + (scale2 ? " scale(" + scale2 + ")" : "");
      }
      function setPosition(el, point) {
        el._leaflet_pos = point;
        if (Browser.any3d) {
          setTransform(el, point);
        } else {
          el.style.left = point.x + "px";
          el.style.top = point.y + "px";
        }
      }
      function getPosition(el) {
        return el._leaflet_pos || new Point(0, 0);
      }
      var disableTextSelection;
      var enableTextSelection;
      var _userSelect;
      if ("onselectstart" in document) {
        disableTextSelection = function() {
          on(window, "selectstart", preventDefault);
        };
        enableTextSelection = function() {
          off(window, "selectstart", preventDefault);
        };
      } else {
        var userSelectProperty = testProp(
          ["userSelect", "WebkitUserSelect", "OUserSelect", "MozUserSelect", "msUserSelect"]
        );
        disableTextSelection = function() {
          if (userSelectProperty) {
            var style2 = document.documentElement.style;
            _userSelect = style2[userSelectProperty];
            style2[userSelectProperty] = "none";
          }
        };
        enableTextSelection = function() {
          if (userSelectProperty) {
            document.documentElement.style[userSelectProperty] = _userSelect;
            _userSelect = void 0;
          }
        };
      }
      function disableImageDrag() {
        on(window, "dragstart", preventDefault);
      }
      function enableImageDrag() {
        off(window, "dragstart", preventDefault);
      }
      var _outlineElement, _outlineStyle;
      function preventOutline(element) {
        while (element.tabIndex === -1) {
          element = element.parentNode;
        }
        if (!element.style) {
          return;
        }
        restoreOutline();
        _outlineElement = element;
        _outlineStyle = element.style.outlineStyle;
        element.style.outlineStyle = "none";
        on(window, "keydown", restoreOutline);
      }
      function restoreOutline() {
        if (!_outlineElement) {
          return;
        }
        _outlineElement.style.outlineStyle = _outlineStyle;
        _outlineElement = void 0;
        _outlineStyle = void 0;
        off(window, "keydown", restoreOutline);
      }
      function getSizedParentNode(element) {
        do {
          element = element.parentNode;
        } while ((!element.offsetWidth || !element.offsetHeight) && element !== document.body);
        return element;
      }
      function getScale(element) {
        var rect = element.getBoundingClientRect();
        return {
          x: rect.width / element.offsetWidth || 1,
          y: rect.height / element.offsetHeight || 1,
          boundingClientRect: rect
        };
      }
      var DomUtil = {
        __proto__: null,
        TRANSFORM,
        TRANSITION,
        TRANSITION_END,
        get,
        getStyle,
        create: create$1,
        remove,
        empty,
        toFront,
        toBack,
        hasClass,
        addClass,
        removeClass,
        setClass,
        getClass,
        setOpacity,
        testProp,
        setTransform,
        setPosition,
        getPosition,
        get disableTextSelection() {
          return disableTextSelection;
        },
        get enableTextSelection() {
          return enableTextSelection;
        },
        disableImageDrag,
        enableImageDrag,
        preventOutline,
        restoreOutline,
        getSizedParentNode,
        getScale
      };
      function on(obj, types, fn, context) {
        if (types && typeof types === "object") {
          for (var type in types) {
            addOne(obj, type, types[type], fn);
          }
        } else {
          types = splitWords(types);
          for (var i = 0, len = types.length; i < len; i++) {
            addOne(obj, types[i], fn, context);
          }
        }
        return this;
      }
      var eventsKey = "_leaflet_events";
      function off(obj, types, fn, context) {
        if (arguments.length === 1) {
          batchRemove(obj);
          delete obj[eventsKey];
        } else if (types && typeof types === "object") {
          for (var type in types) {
            removeOne(obj, type, types[type], fn);
          }
        } else {
          types = splitWords(types);
          if (arguments.length === 2) {
            batchRemove(obj, function(type2) {
              return indexOf(types, type2) !== -1;
            });
          } else {
            for (var i = 0, len = types.length; i < len; i++) {
              removeOne(obj, types[i], fn, context);
            }
          }
        }
        return this;
      }
      function batchRemove(obj, filterFn) {
        for (var id in obj[eventsKey]) {
          var type = id.split(/\d/)[0];
          if (!filterFn || filterFn(type)) {
            removeOne(obj, type, null, null, id);
          }
        }
      }
      var mouseSubst = {
        mouseenter: "mouseover",
        mouseleave: "mouseout",
        wheel: !("onwheel" in window) && "mousewheel"
      };
      function addOne(obj, type, fn, context) {
        var id = type + stamp(fn) + (context ? "_" + stamp(context) : "");
        if (obj[eventsKey] && obj[eventsKey][id]) {
          return this;
        }
        var handler = function(e) {
          return fn.call(context || obj, e || window.event);
        };
        var originalHandler = handler;
        if (!Browser.touchNative && Browser.pointer && type.indexOf("touch") === 0) {
          handler = addPointerListener(obj, type, handler);
        } else if (Browser.touch && type === "dblclick") {
          handler = addDoubleTapListener(obj, handler);
        } else if ("addEventListener" in obj) {
          if (type === "touchstart" || type === "touchmove" || type === "wheel" || type === "mousewheel") {
            obj.addEventListener(mouseSubst[type] || type, handler, Browser.passiveEvents ? { passive: false } : false);
          } else if (type === "mouseenter" || type === "mouseleave") {
            handler = function(e) {
              e = e || window.event;
              if (isExternalTarget(obj, e)) {
                originalHandler(e);
              }
            };
            obj.addEventListener(mouseSubst[type], handler, false);
          } else {
            obj.addEventListener(type, originalHandler, false);
          }
        } else {
          obj.attachEvent("on" + type, handler);
        }
        obj[eventsKey] = obj[eventsKey] || {};
        obj[eventsKey][id] = handler;
      }
      function removeOne(obj, type, fn, context, id) {
        id = id || type + stamp(fn) + (context ? "_" + stamp(context) : "");
        var handler = obj[eventsKey] && obj[eventsKey][id];
        if (!handler) {
          return this;
        }
        if (!Browser.touchNative && Browser.pointer && type.indexOf("touch") === 0) {
          removePointerListener(obj, type, handler);
        } else if (Browser.touch && type === "dblclick") {
          removeDoubleTapListener(obj, handler);
        } else if ("removeEventListener" in obj) {
          obj.removeEventListener(mouseSubst[type] || type, handler, false);
        } else {
          obj.detachEvent("on" + type, handler);
        }
        obj[eventsKey][id] = null;
      }
      function stopPropagation(e) {
        if (e.stopPropagation) {
          e.stopPropagation();
        } else if (e.originalEvent) {
          e.originalEvent._stopped = true;
        } else {
          e.cancelBubble = true;
        }
        return this;
      }
      function disableScrollPropagation(el) {
        addOne(el, "wheel", stopPropagation);
        return this;
      }
      function disableClickPropagation(el) {
        on(el, "mousedown touchstart dblclick contextmenu", stopPropagation);
        el["_leaflet_disable_click"] = true;
        return this;
      }
      function preventDefault(e) {
        if (e.preventDefault) {
          e.preventDefault();
        } else {
          e.returnValue = false;
        }
        return this;
      }
      function stop2(e) {
        preventDefault(e);
        stopPropagation(e);
        return this;
      }
      function getPropagationPath(ev) {
        if (ev.composedPath) {
          return ev.composedPath();
        }
        var path = [];
        var el = ev.target;
        while (el) {
          path.push(el);
          el = el.parentNode;
        }
        return path;
      }
      function getMousePosition(e, container) {
        if (!container) {
          return new Point(e.clientX, e.clientY);
        }
        var scale2 = getScale(container), offset = scale2.boundingClientRect;
        return new Point(
          // offset.left/top values are in page scale (like clientX/Y),
          // whereas clientLeft/Top (border width) values are the original values (before CSS scale applies).
          (e.clientX - offset.left) / scale2.x - container.clientLeft,
          (e.clientY - offset.top) / scale2.y - container.clientTop
        );
      }
      var wheelPxFactor = Browser.linux && Browser.chrome ? window.devicePixelRatio : Browser.mac ? window.devicePixelRatio * 3 : window.devicePixelRatio > 0 ? 2 * window.devicePixelRatio : 1;
      function getWheelDelta(e) {
        return Browser.edge ? e.wheelDeltaY / 2 : (
          // Don't trust window-geometry-based delta
          e.deltaY && e.deltaMode === 0 ? -e.deltaY / wheelPxFactor : (
            // Pixels
            e.deltaY && e.deltaMode === 1 ? -e.deltaY * 20 : (
              // Lines
              e.deltaY && e.deltaMode === 2 ? -e.deltaY * 60 : (
                // Pages
                e.deltaX || e.deltaZ ? 0 : (
                  // Skip horizontal/depth wheel events
                  e.wheelDelta ? (e.wheelDeltaY || e.wheelDelta) / 2 : (
                    // Legacy IE pixels
                    e.detail && Math.abs(e.detail) < 32765 ? -e.detail * 20 : (
                      // Legacy Moz lines
                      e.detail ? e.detail / -32765 * 60 : (
                        // Legacy Moz pages
                        0
                      )
                    )
                  )
                )
              )
            )
          )
        );
      }
      function isExternalTarget(el, e) {
        var related = e.relatedTarget;
        if (!related) {
          return true;
        }
        try {
          while (related && related !== el) {
            related = related.parentNode;
          }
        } catch (err) {
          return false;
        }
        return related !== el;
      }
      var DomEvent = {
        __proto__: null,
        on,
        off,
        stopPropagation,
        disableScrollPropagation,
        disableClickPropagation,
        preventDefault,
        stop: stop2,
        getPropagationPath,
        getMousePosition,
        getWheelDelta,
        isExternalTarget,
        addListener: on,
        removeListener: off
      };
      var PosAnimation = Evented.extend({
        // @method run(el: HTMLElement, newPos: Point, duration?: Number, easeLinearity?: Number)
        // Run an animation of a given element to a new position, optionally setting
        // duration in seconds (`0.25` by default) and easing linearity factor (3rd
        // argument of the [cubic bezier curve](https://cubic-bezier.com/#0,0,.5,1),
        // `0.5` by default).
        run: function(el, newPos, duration, easeLinearity) {
          this.stop();
          this._el = el;
          this._inProgress = true;
          this._duration = duration || 0.25;
          this._easeOutPower = 1 / Math.max(easeLinearity || 0.5, 0.2);
          this._startPos = getPosition(el);
          this._offset = newPos.subtract(this._startPos);
          this._startTime = +/* @__PURE__ */ new Date();
          this.fire("start");
          this._animate();
        },
        // @method stop()
        // Stops the animation (if currently running).
        stop: function() {
          if (!this._inProgress) {
            return;
          }
          this._step(true);
          this._complete();
        },
        _animate: function() {
          this._animId = requestAnimFrame(this._animate, this);
          this._step();
        },
        _step: function(round) {
          var elapsed = +/* @__PURE__ */ new Date() - this._startTime, duration = this._duration * 1e3;
          if (elapsed < duration) {
            this._runFrame(this._easeOut(elapsed / duration), round);
          } else {
            this._runFrame(1);
            this._complete();
          }
        },
        _runFrame: function(progress, round) {
          var pos = this._startPos.add(this._offset.multiplyBy(progress));
          if (round) {
            pos._round();
          }
          setPosition(this._el, pos);
          this.fire("step");
        },
        _complete: function() {
          cancelAnimFrame(this._animId);
          this._inProgress = false;
          this.fire("end");
        },
        _easeOut: function(t) {
          return 1 - Math.pow(1 - t, this._easeOutPower);
        }
      });
      var Map2 = Evented.extend({
        options: {
          // @section Map State Options
          // @option crs: CRS = L.CRS.EPSG3857
          // The [Coordinate Reference System](#crs) to use. Don't change this if you're not
          // sure what it means.
          crs: EPSG3857,
          // @option center: LatLng = undefined
          // Initial geographic center of the map
          center: void 0,
          // @option zoom: Number = undefined
          // Initial map zoom level
          zoom: void 0,
          // @option minZoom: Number = *
          // Minimum zoom level of the map.
          // If not specified and at least one `GridLayer` or `TileLayer` is in the map,
          // the lowest of their `minZoom` options will be used instead.
          minZoom: void 0,
          // @option maxZoom: Number = *
          // Maximum zoom level of the map.
          // If not specified and at least one `GridLayer` or `TileLayer` is in the map,
          // the highest of their `maxZoom` options will be used instead.
          maxZoom: void 0,
          // @option layers: Layer[] = []
          // Array of layers that will be added to the map initially
          layers: [],
          // @option maxBounds: LatLngBounds = null
          // When this option is set, the map restricts the view to the given
          // geographical bounds, bouncing the user back if the user tries to pan
          // outside the view. To set the restriction dynamically, use
          // [`setMaxBounds`](#map-setmaxbounds) method.
          maxBounds: void 0,
          // @option renderer: Renderer = *
          // The default method for drawing vector layers on the map. `L.SVG`
          // or `L.Canvas` by default depending on browser support.
          renderer: void 0,
          // @section Animation Options
          // @option zoomAnimation: Boolean = true
          // Whether the map zoom animation is enabled. By default it's enabled
          // in all browsers that support CSS3 Transitions except Android.
          zoomAnimation: true,
          // @option zoomAnimationThreshold: Number = 4
          // Won't animate zoom if the zoom difference exceeds this value.
          zoomAnimationThreshold: 4,
          // @option fadeAnimation: Boolean = true
          // Whether the tile fade animation is enabled. By default it's enabled
          // in all browsers that support CSS3 Transitions except Android.
          fadeAnimation: true,
          // @option markerZoomAnimation: Boolean = true
          // Whether markers animate their zoom with the zoom animation, if disabled
          // they will disappear for the length of the animation. By default it's
          // enabled in all browsers that support CSS3 Transitions except Android.
          markerZoomAnimation: true,
          // @option transform3DLimit: Number = 2^23
          // Defines the maximum size of a CSS translation transform. The default
          // value should not be changed unless a web browser positions layers in
          // the wrong place after doing a large `panBy`.
          transform3DLimit: 8388608,
          // Precision limit of a 32-bit float
          // @section Interaction Options
          // @option zoomSnap: Number = 1
          // Forces the map's zoom level to always be a multiple of this, particularly
          // right after a [`fitBounds()`](#map-fitbounds) or a pinch-zoom.
          // By default, the zoom level snaps to the nearest integer; lower values
          // (e.g. `0.5` or `0.1`) allow for greater granularity. A value of `0`
          // means the zoom level will not be snapped after `fitBounds` or a pinch-zoom.
          zoomSnap: 1,
          // @option zoomDelta: Number = 1
          // Controls how much the map's zoom level will change after a
          // [`zoomIn()`](#map-zoomin), [`zoomOut()`](#map-zoomout), pressing `+`
          // or `-` on the keyboard, or using the [zoom controls](#control-zoom).
          // Values smaller than `1` (e.g. `0.5`) allow for greater granularity.
          zoomDelta: 1,
          // @option trackResize: Boolean = true
          // Whether the map automatically handles browser window resize to update itself.
          trackResize: true
        },
        initialize: function(id, options) {
          options = setOptions(this, options);
          this._handlers = [];
          this._layers = {};
          this._zoomBoundLayers = {};
          this._sizeChanged = true;
          this._initContainer(id);
          this._initLayout();
          this._onResize = bind(this._onResize, this);
          this._initEvents();
          if (options.maxBounds) {
            this.setMaxBounds(options.maxBounds);
          }
          if (options.zoom !== void 0) {
            this._zoom = this._limitZoom(options.zoom);
          }
          if (options.center && options.zoom !== void 0) {
            this.setView(toLatLng(options.center), options.zoom, { reset: true });
          }
          this.callInitHooks();
          this._zoomAnimated = TRANSITION && Browser.any3d && !Browser.mobileOpera && this.options.zoomAnimation;
          if (this._zoomAnimated) {
            this._createAnimProxy();
            on(this._proxy, TRANSITION_END, this._catchTransitionEnd, this);
          }
          this._addLayers(this.options.layers);
        },
        // @section Methods for modifying map state
        // @method setView(center: LatLng, zoom: Number, options?: Zoom/pan options): this
        // Sets the view of the map (geographical center and zoom) with the given
        // animation options.
        setView: function(center, zoom2, options) {
          zoom2 = zoom2 === void 0 ? this._zoom : this._limitZoom(zoom2);
          center = this._limitCenter(toLatLng(center), zoom2, this.options.maxBounds);
          options = options || {};
          this._stop();
          if (this._loaded && !options.reset && options !== true) {
            if (options.animate !== void 0) {
              options.zoom = extend({ animate: options.animate }, options.zoom);
              options.pan = extend({ animate: options.animate, duration: options.duration }, options.pan);
            }
            var moved = this._zoom !== zoom2 ? this._tryAnimatedZoom && this._tryAnimatedZoom(center, zoom2, options.zoom) : this._tryAnimatedPan(center, options.pan);
            if (moved) {
              clearTimeout(this._sizeTimer);
              return this;
            }
          }
          this._resetView(center, zoom2, options.pan && options.pan.noMoveStart);
          return this;
        },
        // @method setZoom(zoom: Number, options?: Zoom/pan options): this
        // Sets the zoom of the map.
        setZoom: function(zoom2, options) {
          if (!this._loaded) {
            this._zoom = zoom2;
            return this;
          }
          return this.setView(this.getCenter(), zoom2, { zoom: options });
        },
        // @method zoomIn(delta?: Number, options?: Zoom options): this
        // Increases the zoom of the map by `delta` ([`zoomDelta`](#map-zoomdelta) by default).
        zoomIn: function(delta, options) {
          delta = delta || (Browser.any3d ? this.options.zoomDelta : 1);
          return this.setZoom(this._zoom + delta, options);
        },
        // @method zoomOut(delta?: Number, options?: Zoom options): this
        // Decreases the zoom of the map by `delta` ([`zoomDelta`](#map-zoomdelta) by default).
        zoomOut: function(delta, options) {
          delta = delta || (Browser.any3d ? this.options.zoomDelta : 1);
          return this.setZoom(this._zoom - delta, options);
        },
        // @method setZoomAround(latlng: LatLng, zoom: Number, options: Zoom options): this
        // Zooms the map while keeping a specified geographical point on the map
        // stationary (e.g. used internally for scroll zoom and double-click zoom).
        // @alternative
        // @method setZoomAround(offset: Point, zoom: Number, options: Zoom options): this
        // Zooms the map while keeping a specified pixel on the map (relative to the top-left corner) stationary.
        setZoomAround: function(latlng, zoom2, options) {
          var scale2 = this.getZoomScale(zoom2), viewHalf = this.getSize().divideBy(2), containerPoint = latlng instanceof Point ? latlng : this.latLngToContainerPoint(latlng), centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale2), newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));
          return this.setView(newCenter, zoom2, { zoom: options });
        },
        _getBoundsCenterZoom: function(bounds, options) {
          options = options || {};
          bounds = bounds.getBounds ? bounds.getBounds() : toLatLngBounds(bounds);
          var paddingTL = toPoint(options.paddingTopLeft || options.padding || [0, 0]), paddingBR = toPoint(options.paddingBottomRight || options.padding || [0, 0]), zoom2 = this.getBoundsZoom(bounds, false, paddingTL.add(paddingBR));
          zoom2 = typeof options.maxZoom === "number" ? Math.min(options.maxZoom, zoom2) : zoom2;
          if (zoom2 === Infinity) {
            return {
              center: bounds.getCenter(),
              zoom: zoom2
            };
          }
          var paddingOffset = paddingBR.subtract(paddingTL).divideBy(2), swPoint = this.project(bounds.getSouthWest(), zoom2), nePoint = this.project(bounds.getNorthEast(), zoom2), center = this.unproject(swPoint.add(nePoint).divideBy(2).add(paddingOffset), zoom2);
          return {
            center,
            zoom: zoom2
          };
        },
        // @method fitBounds(bounds: LatLngBounds, options?: fitBounds options): this
        // Sets a map view that contains the given geographical bounds with the
        // maximum zoom level possible.
        fitBounds: function(bounds, options) {
          bounds = toLatLngBounds(bounds);
          if (!bounds.isValid()) {
            throw new Error("Bounds are not valid.");
          }
          var target = this._getBoundsCenterZoom(bounds, options);
          return this.setView(target.center, target.zoom, options);
        },
        // @method fitWorld(options?: fitBounds options): this
        // Sets a map view that mostly contains the whole world with the maximum
        // zoom level possible.
        fitWorld: function(options) {
          return this.fitBounds([[-90, -180], [90, 180]], options);
        },
        // @method panTo(latlng: LatLng, options?: Pan options): this
        // Pans the map to a given center.
        panTo: function(center, options) {
          return this.setView(center, this._zoom, { pan: options });
        },
        // @method panBy(offset: Point, options?: Pan options): this
        // Pans the map by a given number of pixels (animated).
        panBy: function(offset, options) {
          offset = toPoint(offset).round();
          options = options || {};
          if (!offset.x && !offset.y) {
            return this.fire("moveend");
          }
          if (options.animate !== true && !this.getSize().contains(offset)) {
            this._resetView(this.unproject(this.project(this.getCenter()).add(offset)), this.getZoom());
            return this;
          }
          if (!this._panAnim) {
            this._panAnim = new PosAnimation();
            this._panAnim.on({
              "step": this._onPanTransitionStep,
              "end": this._onPanTransitionEnd
            }, this);
          }
          if (!options.noMoveStart) {
            this.fire("movestart");
          }
          if (options.animate !== false) {
            addClass(this._mapPane, "leaflet-pan-anim");
            var newPos = this._getMapPanePos().subtract(offset).round();
            this._panAnim.run(this._mapPane, newPos, options.duration || 0.25, options.easeLinearity);
          } else {
            this._rawPanBy(offset);
            this.fire("move").fire("moveend");
          }
          return this;
        },
        // @method flyTo(latlng: LatLng, zoom?: Number, options?: Zoom/pan options): this
        // Sets the view of the map (geographical center and zoom) performing a smooth
        // pan-zoom animation.
        flyTo: function(targetCenter, targetZoom, options) {
          options = options || {};
          if (options.animate === false || !Browser.any3d) {
            return this.setView(targetCenter, targetZoom, options);
          }
          this._stop();
          var from = this.project(this.getCenter()), to = this.project(targetCenter), size = this.getSize(), startZoom = this._zoom;
          targetCenter = toLatLng(targetCenter);
          targetZoom = targetZoom === void 0 ? startZoom : targetZoom;
          var w0 = Math.max(size.x, size.y), w1 = w0 * this.getZoomScale(startZoom, targetZoom), u1 = to.distanceTo(from) || 1, rho = 1.42, rho2 = rho * rho;
          function r(i) {
            var s1 = i ? -1 : 1, s2 = i ? w1 : w0, t1 = w1 * w1 - w0 * w0 + s1 * rho2 * rho2 * u1 * u1, b1 = 2 * s2 * rho2 * u1, b = t1 / b1, sq = Math.sqrt(b * b + 1) - b;
            var log2 = sq < 1e-9 ? -18 : Math.log(sq);
            return log2;
          }
          function sinh(n) {
            return (Math.exp(n) - Math.exp(-n)) / 2;
          }
          function cosh(n) {
            return (Math.exp(n) + Math.exp(-n)) / 2;
          }
          function tanh(n) {
            return sinh(n) / cosh(n);
          }
          var r0 = r(0);
          function w(s2) {
            return w0 * (cosh(r0) / cosh(r0 + rho * s2));
          }
          function u2(s2) {
            return w0 * (cosh(r0) * tanh(r0 + rho * s2) - sinh(r0)) / rho2;
          }
          function easeOut(t) {
            return 1 - Math.pow(1 - t, 1.5);
          }
          var start2 = Date.now(), S2 = (r(1) - r0) / rho, duration = options.duration ? 1e3 * options.duration : 1e3 * S2 * 0.8;
          function frame() {
            var t = (Date.now() - start2) / duration, s2 = easeOut(t) * S2;
            if (t <= 1) {
              this._flyToFrame = requestAnimFrame(frame, this);
              this._move(
                this.unproject(from.add(to.subtract(from).multiplyBy(u2(s2) / u1)), startZoom),
                this.getScaleZoom(w0 / w(s2), startZoom),
                { flyTo: true }
              );
            } else {
              this._move(targetCenter, targetZoom)._moveEnd(true);
            }
          }
          this._moveStart(true, options.noMoveStart);
          frame.call(this);
          return this;
        },
        // @method flyToBounds(bounds: LatLngBounds, options?: fitBounds options): this
        // Sets the view of the map with a smooth animation like [`flyTo`](#map-flyto),
        // but takes a bounds parameter like [`fitBounds`](#map-fitbounds).
        flyToBounds: function(bounds, options) {
          var target = this._getBoundsCenterZoom(bounds, options);
          return this.flyTo(target.center, target.zoom, options);
        },
        // @method setMaxBounds(bounds: LatLngBounds): this
        // Restricts the map view to the given bounds (see the [maxBounds](#map-maxbounds) option).
        setMaxBounds: function(bounds) {
          bounds = toLatLngBounds(bounds);
          if (this.listens("moveend", this._panInsideMaxBounds)) {
            this.off("moveend", this._panInsideMaxBounds);
          }
          if (!bounds.isValid()) {
            this.options.maxBounds = null;
            return this;
          }
          this.options.maxBounds = bounds;
          if (this._loaded) {
            this._panInsideMaxBounds();
          }
          return this.on("moveend", this._panInsideMaxBounds);
        },
        // @method setMinZoom(zoom: Number): this
        // Sets the lower limit for the available zoom levels (see the [minZoom](#map-minzoom) option).
        setMinZoom: function(zoom2) {
          var oldZoom = this.options.minZoom;
          this.options.minZoom = zoom2;
          if (this._loaded && oldZoom !== zoom2) {
            this.fire("zoomlevelschange");
            if (this.getZoom() < this.options.minZoom) {
              return this.setZoom(zoom2);
            }
          }
          return this;
        },
        // @method setMaxZoom(zoom: Number): this
        // Sets the upper limit for the available zoom levels (see the [maxZoom](#map-maxzoom) option).
        setMaxZoom: function(zoom2) {
          var oldZoom = this.options.maxZoom;
          this.options.maxZoom = zoom2;
          if (this._loaded && oldZoom !== zoom2) {
            this.fire("zoomlevelschange");
            if (this.getZoom() > this.options.maxZoom) {
              return this.setZoom(zoom2);
            }
          }
          return this;
        },
        // @method panInsideBounds(bounds: LatLngBounds, options?: Pan options): this
        // Pans the map to the closest view that would lie inside the given bounds (if it's not already), controlling the animation using the options specific, if any.
        panInsideBounds: function(bounds, options) {
          this._enforcingBounds = true;
          var center = this.getCenter(), newCenter = this._limitCenter(center, this._zoom, toLatLngBounds(bounds));
          if (!center.equals(newCenter)) {
            this.panTo(newCenter, options);
          }
          this._enforcingBounds = false;
          return this;
        },
        // @method panInside(latlng: LatLng, options?: padding options): this
        // Pans the map the minimum amount to make the `latlng` visible. Use
        // padding options to fit the display to more restricted bounds.
        // If `latlng` is already within the (optionally padded) display bounds,
        // the map will not be panned.
        panInside: function(latlng, options) {
          options = options || {};
          var paddingTL = toPoint(options.paddingTopLeft || options.padding || [0, 0]), paddingBR = toPoint(options.paddingBottomRight || options.padding || [0, 0]), pixelCenter = this.project(this.getCenter()), pixelPoint = this.project(latlng), pixelBounds = this.getPixelBounds(), paddedBounds = toBounds([pixelBounds.min.add(paddingTL), pixelBounds.max.subtract(paddingBR)]), paddedSize = paddedBounds.getSize();
          if (!paddedBounds.contains(pixelPoint)) {
            this._enforcingBounds = true;
            var centerOffset = pixelPoint.subtract(paddedBounds.getCenter());
            var offset = paddedBounds.extend(pixelPoint).getSize().subtract(paddedSize);
            pixelCenter.x += centerOffset.x < 0 ? -offset.x : offset.x;
            pixelCenter.y += centerOffset.y < 0 ? -offset.y : offset.y;
            this.panTo(this.unproject(pixelCenter), options);
            this._enforcingBounds = false;
          }
          return this;
        },
        // @method invalidateSize(options: Zoom/pan options): this
        // Checks if the map container size changed and updates the map if so —
        // call it after you've changed the map size dynamically, also animating
        // pan by default. If `options.pan` is `false`, panning will not occur.
        // If `options.debounceMoveend` is `true`, it will delay `moveend` event so
        // that it doesn't happen often even if the method is called many
        // times in a row.
        // @alternative
        // @method invalidateSize(animate: Boolean): this
        // Checks if the map container size changed and updates the map if so —
        // call it after you've changed the map size dynamically, also animating
        // pan by default.
        invalidateSize: function(options) {
          if (!this._loaded) {
            return this;
          }
          options = extend({
            animate: false,
            pan: true
          }, options === true ? { animate: true } : options);
          var oldSize = this.getSize();
          this._sizeChanged = true;
          this._lastCenter = null;
          var newSize = this.getSize(), oldCenter = oldSize.divideBy(2).round(), newCenter = newSize.divideBy(2).round(), offset = oldCenter.subtract(newCenter);
          if (!offset.x && !offset.y) {
            return this;
          }
          if (options.animate && options.pan) {
            this.panBy(offset);
          } else {
            if (options.pan) {
              this._rawPanBy(offset);
            }
            this.fire("move");
            if (options.debounceMoveend) {
              clearTimeout(this._sizeTimer);
              this._sizeTimer = setTimeout(bind(this.fire, this, "moveend"), 200);
            } else {
              this.fire("moveend");
            }
          }
          return this.fire("resize", {
            oldSize,
            newSize
          });
        },
        // @section Methods for modifying map state
        // @method stop(): this
        // Stops the currently running `panTo` or `flyTo` animation, if any.
        stop: function() {
          this.setZoom(this._limitZoom(this._zoom));
          if (!this.options.zoomSnap) {
            this.fire("viewreset");
          }
          return this._stop();
        },
        // @section Geolocation methods
        // @method locate(options?: Locate options): this
        // Tries to locate the user using the Geolocation API, firing a [`locationfound`](#map-locationfound)
        // event with location data on success or a [`locationerror`](#map-locationerror) event on failure,
        // and optionally sets the map view to the user's location with respect to
        // detection accuracy (or to the world view if geolocation failed).
        // Note that, if your page doesn't use HTTPS, this method will fail in
        // modern browsers ([Chrome 50 and newer](https://sites.google.com/a/chromium.org/dev/Home/chromium-security/deprecating-powerful-features-on-insecure-origins))
        // See `Locate options` for more details.
        locate: function(options) {
          options = this._locateOptions = extend({
            timeout: 1e4,
            watch: false
            // setView: false
            // maxZoom: <Number>
            // maximumAge: 0
            // enableHighAccuracy: false
          }, options);
          if (!("geolocation" in navigator)) {
            this._handleGeolocationError({
              code: 0,
              message: "Geolocation not supported."
            });
            return this;
          }
          var onResponse = bind(this._handleGeolocationResponse, this), onError = bind(this._handleGeolocationError, this);
          if (options.watch) {
            this._locationWatchId = navigator.geolocation.watchPosition(onResponse, onError, options);
          } else {
            navigator.geolocation.getCurrentPosition(onResponse, onError, options);
          }
          return this;
        },
        // @method stopLocate(): this
        // Stops watching location previously initiated by `map.locate({watch: true})`
        // and aborts resetting the map view if map.locate was called with
        // `{setView: true}`.
        stopLocate: function() {
          if (navigator.geolocation && navigator.geolocation.clearWatch) {
            navigator.geolocation.clearWatch(this._locationWatchId);
          }
          if (this._locateOptions) {
            this._locateOptions.setView = false;
          }
          return this;
        },
        _handleGeolocationError: function(error) {
          if (!this._container._leaflet_id) {
            return;
          }
          var c = error.code, message = error.message || (c === 1 ? "permission denied" : c === 2 ? "position unavailable" : "timeout");
          if (this._locateOptions.setView && !this._loaded) {
            this.fitWorld();
          }
          this.fire("locationerror", {
            code: c,
            message: "Geolocation error: " + message + "."
          });
        },
        _handleGeolocationResponse: function(pos) {
          if (!this._container._leaflet_id) {
            return;
          }
          var lat = pos.coords.latitude, lng = pos.coords.longitude, latlng = new LatLng(lat, lng), bounds = latlng.toBounds(pos.coords.accuracy * 2), options = this._locateOptions;
          if (options.setView) {
            var zoom2 = this.getBoundsZoom(bounds);
            this.setView(latlng, options.maxZoom ? Math.min(zoom2, options.maxZoom) : zoom2);
          }
          var data = {
            latlng,
            bounds,
            timestamp: pos.timestamp
          };
          for (var i in pos.coords) {
            if (typeof pos.coords[i] === "number") {
              data[i] = pos.coords[i];
            }
          }
          this.fire("locationfound", data);
        },
        // TODO Appropriate docs section?
        // @section Other Methods
        // @method addHandler(name: String, HandlerClass: Function): this
        // Adds a new `Handler` to the map, given its name and constructor function.
        addHandler: function(name, HandlerClass) {
          if (!HandlerClass) {
            return this;
          }
          var handler = this[name] = new HandlerClass(this);
          this._handlers.push(handler);
          if (this.options[name]) {
            handler.enable();
          }
          return this;
        },
        // @method remove(): this
        // Destroys the map and clears all related event listeners.
        remove: function() {
          this._initEvents(true);
          if (this.options.maxBounds) {
            this.off("moveend", this._panInsideMaxBounds);
          }
          if (this._containerId !== this._container._leaflet_id) {
            throw new Error("Map container is being reused by another instance");
          }
          try {
            delete this._container._leaflet_id;
            delete this._containerId;
          } catch (e) {
            this._container._leaflet_id = void 0;
            this._containerId = void 0;
          }
          if (this._locationWatchId !== void 0) {
            this.stopLocate();
          }
          this._stop();
          remove(this._mapPane);
          if (this._clearControlPos) {
            this._clearControlPos();
          }
          if (this._resizeRequest) {
            cancelAnimFrame(this._resizeRequest);
            this._resizeRequest = null;
          }
          this._clearHandlers();
          if (this._loaded) {
            this.fire("unload");
          }
          var i;
          for (i in this._layers) {
            this._layers[i].remove();
          }
          for (i in this._panes) {
            remove(this._panes[i]);
          }
          this._layers = [];
          this._panes = [];
          delete this._mapPane;
          delete this._renderer;
          return this;
        },
        // @section Other Methods
        // @method createPane(name: String, container?: HTMLElement): HTMLElement
        // Creates a new [map pane](#map-pane) with the given name if it doesn't exist already,
        // then returns it. The pane is created as a child of `container`, or
        // as a child of the main map pane if not set.
        createPane: function(name, container) {
          var className = "leaflet-pane" + (name ? " leaflet-" + name.replace("Pane", "") + "-pane" : ""), pane = create$1("div", className, container || this._mapPane);
          if (name) {
            this._panes[name] = pane;
          }
          return pane;
        },
        // @section Methods for Getting Map State
        // @method getCenter(): LatLng
        // Returns the geographical center of the map view
        getCenter: function() {
          this._checkIfLoaded();
          if (this._lastCenter && !this._moved()) {
            return this._lastCenter.clone();
          }
          return this.layerPointToLatLng(this._getCenterLayerPoint());
        },
        // @method getZoom(): Number
        // Returns the current zoom level of the map view
        getZoom: function() {
          return this._zoom;
        },
        // @method getBounds(): LatLngBounds
        // Returns the geographical bounds visible in the current map view
        getBounds: function() {
          var bounds = this.getPixelBounds(), sw = this.unproject(bounds.getBottomLeft()), ne = this.unproject(bounds.getTopRight());
          return new LatLngBounds(sw, ne);
        },
        // @method getMinZoom(): Number
        // Returns the minimum zoom level of the map (if set in the `minZoom` option of the map or of any layers), or `0` by default.
        getMinZoom: function() {
          return this.options.minZoom === void 0 ? this._layersMinZoom || 0 : this.options.minZoom;
        },
        // @method getMaxZoom(): Number
        // Returns the maximum zoom level of the map (if set in the `maxZoom` option of the map or of any layers).
        getMaxZoom: function() {
          return this.options.maxZoom === void 0 ? this._layersMaxZoom === void 0 ? Infinity : this._layersMaxZoom : this.options.maxZoom;
        },
        // @method getBoundsZoom(bounds: LatLngBounds, inside?: Boolean, padding?: Point): Number
        // Returns the maximum zoom level on which the given bounds fit to the map
        // view in its entirety. If `inside` (optional) is set to `true`, the method
        // instead returns the minimum zoom level on which the map view fits into
        // the given bounds in its entirety.
        getBoundsZoom: function(bounds, inside, padding) {
          bounds = toLatLngBounds(bounds);
          padding = toPoint(padding || [0, 0]);
          var zoom2 = this.getZoom() || 0, min = this.getMinZoom(), max = this.getMaxZoom(), nw = bounds.getNorthWest(), se = bounds.getSouthEast(), size = this.getSize().subtract(padding), boundsSize = toBounds(this.project(se, zoom2), this.project(nw, zoom2)).getSize(), snap = Browser.any3d ? this.options.zoomSnap : 1, scalex = size.x / boundsSize.x, scaley = size.y / boundsSize.y, scale2 = inside ? Math.max(scalex, scaley) : Math.min(scalex, scaley);
          zoom2 = this.getScaleZoom(scale2, zoom2);
          if (snap) {
            zoom2 = Math.round(zoom2 / (snap / 100)) * (snap / 100);
            zoom2 = inside ? Math.ceil(zoom2 / snap) * snap : Math.floor(zoom2 / snap) * snap;
          }
          return Math.max(min, Math.min(max, zoom2));
        },
        // @method getSize(): Point
        // Returns the current size of the map container (in pixels).
        getSize: function() {
          if (!this._size || this._sizeChanged) {
            this._size = new Point(
              this._container.clientWidth || 0,
              this._container.clientHeight || 0
            );
            this._sizeChanged = false;
          }
          return this._size.clone();
        },
        // @method getPixelBounds(): Bounds
        // Returns the bounds of the current map view in projected pixel
        // coordinates (sometimes useful in layer and overlay implementations).
        getPixelBounds: function(center, zoom2) {
          var topLeftPoint = this._getTopLeftPoint(center, zoom2);
          return new Bounds(topLeftPoint, topLeftPoint.add(this.getSize()));
        },
        // TODO: Check semantics - isn't the pixel origin the 0,0 coord relative to
        // the map pane? "left point of the map layer" can be confusing, specially
        // since there can be negative offsets.
        // @method getPixelOrigin(): Point
        // Returns the projected pixel coordinates of the top left point of
        // the map layer (useful in custom layer and overlay implementations).
        getPixelOrigin: function() {
          this._checkIfLoaded();
          return this._pixelOrigin;
        },
        // @method getPixelWorldBounds(zoom?: Number): Bounds
        // Returns the world's bounds in pixel coordinates for zoom level `zoom`.
        // If `zoom` is omitted, the map's current zoom level is used.
        getPixelWorldBounds: function(zoom2) {
          return this.options.crs.getProjectedBounds(zoom2 === void 0 ? this.getZoom() : zoom2);
        },
        // @section Other Methods
        // @method getPane(pane: String|HTMLElement): HTMLElement
        // Returns a [map pane](#map-pane), given its name or its HTML element (its identity).
        getPane: function(pane) {
          return typeof pane === "string" ? this._panes[pane] : pane;
        },
        // @method getPanes(): Object
        // Returns a plain object containing the names of all [panes](#map-pane) as keys and
        // the panes as values.
        getPanes: function() {
          return this._panes;
        },
        // @method getContainer: HTMLElement
        // Returns the HTML element that contains the map.
        getContainer: function() {
          return this._container;
        },
        // @section Conversion Methods
        // @method getZoomScale(toZoom: Number, fromZoom: Number): Number
        // Returns the scale factor to be applied to a map transition from zoom level
        // `fromZoom` to `toZoom`. Used internally to help with zoom animations.
        getZoomScale: function(toZoom, fromZoom) {
          var crs = this.options.crs;
          fromZoom = fromZoom === void 0 ? this._zoom : fromZoom;
          return crs.scale(toZoom) / crs.scale(fromZoom);
        },
        // @method getScaleZoom(scale: Number, fromZoom: Number): Number
        // Returns the zoom level that the map would end up at, if it is at `fromZoom`
        // level and everything is scaled by a factor of `scale`. Inverse of
        // [`getZoomScale`](#map-getZoomScale).
        getScaleZoom: function(scale2, fromZoom) {
          var crs = this.options.crs;
          fromZoom = fromZoom === void 0 ? this._zoom : fromZoom;
          var zoom2 = crs.zoom(scale2 * crs.scale(fromZoom));
          return isNaN(zoom2) ? Infinity : zoom2;
        },
        // @method project(latlng: LatLng, zoom: Number): Point
        // Projects a geographical coordinate `LatLng` according to the projection
        // of the map's CRS, then scales it according to `zoom` and the CRS's
        // `Transformation`. The result is pixel coordinate relative to
        // the CRS origin.
        project: function(latlng, zoom2) {
          zoom2 = zoom2 === void 0 ? this._zoom : zoom2;
          return this.options.crs.latLngToPoint(toLatLng(latlng), zoom2);
        },
        // @method unproject(point: Point, zoom: Number): LatLng
        // Inverse of [`project`](#map-project).
        unproject: function(point, zoom2) {
          zoom2 = zoom2 === void 0 ? this._zoom : zoom2;
          return this.options.crs.pointToLatLng(toPoint(point), zoom2);
        },
        // @method layerPointToLatLng(point: Point): LatLng
        // Given a pixel coordinate relative to the [origin pixel](#map-getpixelorigin),
        // returns the corresponding geographical coordinate (for the current zoom level).
        layerPointToLatLng: function(point) {
          var projectedPoint = toPoint(point).add(this.getPixelOrigin());
          return this.unproject(projectedPoint);
        },
        // @method latLngToLayerPoint(latlng: LatLng): Point
        // Given a geographical coordinate, returns the corresponding pixel coordinate
        // relative to the [origin pixel](#map-getpixelorigin).
        latLngToLayerPoint: function(latlng) {
          var projectedPoint = this.project(toLatLng(latlng))._round();
          return projectedPoint._subtract(this.getPixelOrigin());
        },
        // @method wrapLatLng(latlng: LatLng): LatLng
        // Returns a `LatLng` where `lat` and `lng` has been wrapped according to the
        // map's CRS's `wrapLat` and `wrapLng` properties, if they are outside the
        // CRS's bounds.
        // By default this means longitude is wrapped around the dateline so its
        // value is between -180 and +180 degrees.
        wrapLatLng: function(latlng) {
          return this.options.crs.wrapLatLng(toLatLng(latlng));
        },
        // @method wrapLatLngBounds(bounds: LatLngBounds): LatLngBounds
        // Returns a `LatLngBounds` with the same size as the given one, ensuring that
        // its center is within the CRS's bounds.
        // By default this means the center longitude is wrapped around the dateline so its
        // value is between -180 and +180 degrees, and the majority of the bounds
        // overlaps the CRS's bounds.
        wrapLatLngBounds: function(latlng) {
          return this.options.crs.wrapLatLngBounds(toLatLngBounds(latlng));
        },
        // @method distance(latlng1: LatLng, latlng2: LatLng): Number
        // Returns the distance between two geographical coordinates according to
        // the map's CRS. By default this measures distance in meters.
        distance: function(latlng1, latlng2) {
          return this.options.crs.distance(toLatLng(latlng1), toLatLng(latlng2));
        },
        // @method containerPointToLayerPoint(point: Point): Point
        // Given a pixel coordinate relative to the map container, returns the corresponding
        // pixel coordinate relative to the [origin pixel](#map-getpixelorigin).
        containerPointToLayerPoint: function(point) {
          return toPoint(point).subtract(this._getMapPanePos());
        },
        // @method layerPointToContainerPoint(point: Point): Point
        // Given a pixel coordinate relative to the [origin pixel](#map-getpixelorigin),
        // returns the corresponding pixel coordinate relative to the map container.
        layerPointToContainerPoint: function(point) {
          return toPoint(point).add(this._getMapPanePos());
        },
        // @method containerPointToLatLng(point: Point): LatLng
        // Given a pixel coordinate relative to the map container, returns
        // the corresponding geographical coordinate (for the current zoom level).
        containerPointToLatLng: function(point) {
          var layerPoint = this.containerPointToLayerPoint(toPoint(point));
          return this.layerPointToLatLng(layerPoint);
        },
        // @method latLngToContainerPoint(latlng: LatLng): Point
        // Given a geographical coordinate, returns the corresponding pixel coordinate
        // relative to the map container.
        latLngToContainerPoint: function(latlng) {
          return this.layerPointToContainerPoint(this.latLngToLayerPoint(toLatLng(latlng)));
        },
        // @method mouseEventToContainerPoint(ev: MouseEvent): Point
        // Given a MouseEvent object, returns the pixel coordinate relative to the
        // map container where the event took place.
        mouseEventToContainerPoint: function(e) {
          return getMousePosition(e, this._container);
        },
        // @method mouseEventToLayerPoint(ev: MouseEvent): Point
        // Given a MouseEvent object, returns the pixel coordinate relative to
        // the [origin pixel](#map-getpixelorigin) where the event took place.
        mouseEventToLayerPoint: function(e) {
          return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(e));
        },
        // @method mouseEventToLatLng(ev: MouseEvent): LatLng
        // Given a MouseEvent object, returns geographical coordinate where the
        // event took place.
        mouseEventToLatLng: function(e) {
          return this.layerPointToLatLng(this.mouseEventToLayerPoint(e));
        },
        // map initialization methods
        _initContainer: function(id) {
          var container = this._container = get(id);
          if (!container) {
            throw new Error("Map container not found.");
          } else if (container._leaflet_id) {
            throw new Error("Map container is already initialized.");
          }
          on(container, "scroll", this._onScroll, this);
          this._containerId = stamp(container);
        },
        _initLayout: function() {
          var container = this._container;
          this._fadeAnimated = this.options.fadeAnimation && Browser.any3d;
          addClass(container, "leaflet-container" + (Browser.touch ? " leaflet-touch" : "") + (Browser.retina ? " leaflet-retina" : "") + (Browser.ielt9 ? " leaflet-oldie" : "") + (Browser.safari ? " leaflet-safari" : "") + (this._fadeAnimated ? " leaflet-fade-anim" : ""));
          var position = getStyle(container, "position");
          if (position !== "absolute" && position !== "relative" && position !== "fixed" && position !== "sticky") {
            container.style.position = "relative";
          }
          this._initPanes();
          if (this._initControlPos) {
            this._initControlPos();
          }
        },
        _initPanes: function() {
          var panes = this._panes = {};
          this._paneRenderers = {};
          this._mapPane = this.createPane("mapPane", this._container);
          setPosition(this._mapPane, new Point(0, 0));
          this.createPane("tilePane");
          this.createPane("overlayPane");
          this.createPane("shadowPane");
          this.createPane("markerPane");
          this.createPane("tooltipPane");
          this.createPane("popupPane");
          if (!this.options.markerZoomAnimation) {
            addClass(panes.markerPane, "leaflet-zoom-hide");
            addClass(panes.shadowPane, "leaflet-zoom-hide");
          }
        },
        // private methods that modify map state
        // @section Map state change events
        _resetView: function(center, zoom2, noMoveStart) {
          setPosition(this._mapPane, new Point(0, 0));
          var loading = !this._loaded;
          this._loaded = true;
          zoom2 = this._limitZoom(zoom2);
          this.fire("viewprereset");
          var zoomChanged = this._zoom !== zoom2;
          this._moveStart(zoomChanged, noMoveStart)._move(center, zoom2)._moveEnd(zoomChanged);
          this.fire("viewreset");
          if (loading) {
            this.fire("load");
          }
        },
        _moveStart: function(zoomChanged, noMoveStart) {
          if (zoomChanged) {
            this.fire("zoomstart");
          }
          if (!noMoveStart) {
            this.fire("movestart");
          }
          return this;
        },
        _move: function(center, zoom2, data, supressEvent) {
          if (zoom2 === void 0) {
            zoom2 = this._zoom;
          }
          var zoomChanged = this._zoom !== zoom2;
          this._zoom = zoom2;
          this._lastCenter = center;
          this._pixelOrigin = this._getNewPixelOrigin(center);
          if (!supressEvent) {
            if (zoomChanged || data && data.pinch) {
              this.fire("zoom", data);
            }
            this.fire("move", data);
          } else if (data && data.pinch) {
            this.fire("zoom", data);
          }
          return this;
        },
        _moveEnd: function(zoomChanged) {
          if (zoomChanged) {
            this.fire("zoomend");
          }
          return this.fire("moveend");
        },
        _stop: function() {
          cancelAnimFrame(this._flyToFrame);
          if (this._panAnim) {
            this._panAnim.stop();
          }
          return this;
        },
        _rawPanBy: function(offset) {
          setPosition(this._mapPane, this._getMapPanePos().subtract(offset));
        },
        _getZoomSpan: function() {
          return this.getMaxZoom() - this.getMinZoom();
        },
        _panInsideMaxBounds: function() {
          if (!this._enforcingBounds) {
            this.panInsideBounds(this.options.maxBounds);
          }
        },
        _checkIfLoaded: function() {
          if (!this._loaded) {
            throw new Error("Set map center and zoom first.");
          }
        },
        // DOM event handling
        // @section Interaction events
        _initEvents: function(remove2) {
          this._targets = {};
          this._targets[stamp(this._container)] = this;
          var onOff = remove2 ? off : on;
          onOff(this._container, "click dblclick mousedown mouseup mouseover mouseout mousemove contextmenu keypress keydown keyup", this._handleDOMEvent, this);
          if (this.options.trackResize) {
            onOff(window, "resize", this._onResize, this);
          }
          if (Browser.any3d && this.options.transform3DLimit) {
            (remove2 ? this.off : this.on).call(this, "moveend", this._onMoveEnd);
          }
        },
        _onResize: function() {
          cancelAnimFrame(this._resizeRequest);
          this._resizeRequest = requestAnimFrame(
            function() {
              this.invalidateSize({ debounceMoveend: true });
            },
            this
          );
        },
        _onScroll: function() {
          this._container.scrollTop = 0;
          this._container.scrollLeft = 0;
        },
        _onMoveEnd: function() {
          var pos = this._getMapPanePos();
          if (Math.max(Math.abs(pos.x), Math.abs(pos.y)) >= this.options.transform3DLimit) {
            this._resetView(this.getCenter(), this.getZoom());
          }
        },
        _findEventTargets: function(e, type) {
          var targets = [], target, isHover = type === "mouseout" || type === "mouseover", src = e.target || e.srcElement, dragging = false;
          while (src) {
            target = this._targets[stamp(src)];
            if (target && (type === "click" || type === "preclick") && this._draggableMoved(target)) {
              dragging = true;
              break;
            }
            if (target && target.listens(type, true)) {
              if (isHover && !isExternalTarget(src, e)) {
                break;
              }
              targets.push(target);
              if (isHover) {
                break;
              }
            }
            if (src === this._container) {
              break;
            }
            src = src.parentNode;
          }
          if (!targets.length && !dragging && !isHover && this.listens(type, true)) {
            targets = [this];
          }
          return targets;
        },
        _isClickDisabled: function(el) {
          while (el && el !== this._container) {
            if (el["_leaflet_disable_click"]) {
              return true;
            }
            el = el.parentNode;
          }
        },
        _handleDOMEvent: function(e) {
          var el = e.target || e.srcElement;
          if (!this._loaded || el["_leaflet_disable_events"] || e.type === "click" && this._isClickDisabled(el)) {
            return;
          }
          var type = e.type;
          if (type === "mousedown") {
            preventOutline(el);
          }
          this._fireDOMEvent(e, type);
        },
        _mouseEvents: ["click", "dblclick", "mouseover", "mouseout", "contextmenu"],
        _fireDOMEvent: function(e, type, canvasTargets) {
          if (e.type === "click") {
            var synth = extend({}, e);
            synth.type = "preclick";
            this._fireDOMEvent(synth, synth.type, canvasTargets);
          }
          var targets = this._findEventTargets(e, type);
          if (canvasTargets) {
            var filtered = [];
            for (var i = 0; i < canvasTargets.length; i++) {
              if (canvasTargets[i].listens(type, true)) {
                filtered.push(canvasTargets[i]);
              }
            }
            targets = filtered.concat(targets);
          }
          if (!targets.length) {
            return;
          }
          if (type === "contextmenu") {
            preventDefault(e);
          }
          var target = targets[0];
          var data = {
            originalEvent: e
          };
          if (e.type !== "keypress" && e.type !== "keydown" && e.type !== "keyup") {
            var isMarker = target.getLatLng && (!target._radius || target._radius <= 10);
            data.containerPoint = isMarker ? this.latLngToContainerPoint(target.getLatLng()) : this.mouseEventToContainerPoint(e);
            data.layerPoint = this.containerPointToLayerPoint(data.containerPoint);
            data.latlng = isMarker ? target.getLatLng() : this.layerPointToLatLng(data.layerPoint);
          }
          for (i = 0; i < targets.length; i++) {
            targets[i].fire(type, data, true);
            if (data.originalEvent._stopped || targets[i].options.bubblingMouseEvents === false && indexOf(this._mouseEvents, type) !== -1) {
              return;
            }
          }
        },
        _draggableMoved: function(obj) {
          obj = obj.dragging && obj.dragging.enabled() ? obj : this;
          return obj.dragging && obj.dragging.moved() || this.boxZoom && this.boxZoom.moved();
        },
        _clearHandlers: function() {
          for (var i = 0, len = this._handlers.length; i < len; i++) {
            this._handlers[i].disable();
          }
        },
        // @section Other Methods
        // @method whenReady(fn: Function, context?: Object): this
        // Runs the given function `fn` when the map gets initialized with
        // a view (center and zoom) and at least one layer, or immediately
        // if it's already initialized, optionally passing a function context.
        whenReady: function(callback, context) {
          if (this._loaded) {
            callback.call(context || this, { target: this });
          } else {
            this.on("load", callback, context);
          }
          return this;
        },
        // private methods for getting map state
        _getMapPanePos: function() {
          return getPosition(this._mapPane) || new Point(0, 0);
        },
        _moved: function() {
          var pos = this._getMapPanePos();
          return pos && !pos.equals([0, 0]);
        },
        _getTopLeftPoint: function(center, zoom2) {
          var pixelOrigin = center && zoom2 !== void 0 ? this._getNewPixelOrigin(center, zoom2) : this.getPixelOrigin();
          return pixelOrigin.subtract(this._getMapPanePos());
        },
        _getNewPixelOrigin: function(center, zoom2) {
          var viewHalf = this.getSize()._divideBy(2);
          return this.project(center, zoom2)._subtract(viewHalf)._add(this._getMapPanePos())._round();
        },
        _latLngToNewLayerPoint: function(latlng, zoom2, center) {
          var topLeft = this._getNewPixelOrigin(center, zoom2);
          return this.project(latlng, zoom2)._subtract(topLeft);
        },
        _latLngBoundsToNewLayerBounds: function(latLngBounds, zoom2, center) {
          var topLeft = this._getNewPixelOrigin(center, zoom2);
          return toBounds([
            this.project(latLngBounds.getSouthWest(), zoom2)._subtract(topLeft),
            this.project(latLngBounds.getNorthWest(), zoom2)._subtract(topLeft),
            this.project(latLngBounds.getSouthEast(), zoom2)._subtract(topLeft),
            this.project(latLngBounds.getNorthEast(), zoom2)._subtract(topLeft)
          ]);
        },
        // layer point of the current center
        _getCenterLayerPoint: function() {
          return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
        },
        // offset of the specified place to the current center in pixels
        _getCenterOffset: function(latlng) {
          return this.latLngToLayerPoint(latlng).subtract(this._getCenterLayerPoint());
        },
        // adjust center for view to get inside bounds
        _limitCenter: function(center, zoom2, bounds) {
          if (!bounds) {
            return center;
          }
          var centerPoint = this.project(center, zoom2), viewHalf = this.getSize().divideBy(2), viewBounds = new Bounds(centerPoint.subtract(viewHalf), centerPoint.add(viewHalf)), offset = this._getBoundsOffset(viewBounds, bounds, zoom2);
          if (Math.abs(offset.x) <= 1 && Math.abs(offset.y) <= 1) {
            return center;
          }
          return this.unproject(centerPoint.add(offset), zoom2);
        },
        // adjust offset for view to get inside bounds
        _limitOffset: function(offset, bounds) {
          if (!bounds) {
            return offset;
          }
          var viewBounds = this.getPixelBounds(), newBounds = new Bounds(viewBounds.min.add(offset), viewBounds.max.add(offset));
          return offset.add(this._getBoundsOffset(newBounds, bounds));
        },
        // returns offset needed for pxBounds to get inside maxBounds at a specified zoom
        _getBoundsOffset: function(pxBounds, maxBounds, zoom2) {
          var projectedMaxBounds = toBounds(
            this.project(maxBounds.getNorthEast(), zoom2),
            this.project(maxBounds.getSouthWest(), zoom2)
          ), minOffset = projectedMaxBounds.min.subtract(pxBounds.min), maxOffset = projectedMaxBounds.max.subtract(pxBounds.max), dx = this._rebound(minOffset.x, -maxOffset.x), dy = this._rebound(minOffset.y, -maxOffset.y);
          return new Point(dx, dy);
        },
        _rebound: function(left, right) {
          return left + right > 0 ? Math.round(left - right) / 2 : Math.max(0, Math.ceil(left)) - Math.max(0, Math.floor(right));
        },
        _limitZoom: function(zoom2) {
          var min = this.getMinZoom(), max = this.getMaxZoom(), snap = Browser.any3d ? this.options.zoomSnap : 1;
          if (snap) {
            zoom2 = Math.round(zoom2 / snap) * snap;
          }
          return Math.max(min, Math.min(max, zoom2));
        },
        _onPanTransitionStep: function() {
          this.fire("move");
        },
        _onPanTransitionEnd: function() {
          removeClass(this._mapPane, "leaflet-pan-anim");
          this.fire("moveend");
        },
        _tryAnimatedPan: function(center, options) {
          var offset = this._getCenterOffset(center)._trunc();
          if ((options && options.animate) !== true && !this.getSize().contains(offset)) {
            return false;
          }
          this.panBy(offset, options);
          return true;
        },
        _createAnimProxy: function() {
          var proxy = this._proxy = create$1("div", "leaflet-proxy leaflet-zoom-animated");
          this._panes.mapPane.appendChild(proxy);
          this.on("zoomanim", function(e) {
            var prop = TRANSFORM, transform = this._proxy.style[prop];
            setTransform(this._proxy, this.project(e.center, e.zoom), this.getZoomScale(e.zoom, 1));
            if (transform === this._proxy.style[prop] && this._animatingZoom) {
              this._onZoomTransitionEnd();
            }
          }, this);
          this.on("load moveend", this._animMoveEnd, this);
          this._on("unload", this._destroyAnimProxy, this);
        },
        _destroyAnimProxy: function() {
          remove(this._proxy);
          this.off("load moveend", this._animMoveEnd, this);
          delete this._proxy;
        },
        _animMoveEnd: function() {
          var c = this.getCenter(), z = this.getZoom();
          setTransform(this._proxy, this.project(c, z), this.getZoomScale(z, 1));
        },
        _catchTransitionEnd: function(e) {
          if (this._animatingZoom && e.propertyName.indexOf("transform") >= 0) {
            this._onZoomTransitionEnd();
          }
        },
        _nothingToAnimate: function() {
          return !this._container.getElementsByClassName("leaflet-zoom-animated").length;
        },
        _tryAnimatedZoom: function(center, zoom2, options) {
          if (this._animatingZoom) {
            return true;
          }
          options = options || {};
          if (!this._zoomAnimated || options.animate === false || this._nothingToAnimate() || Math.abs(zoom2 - this._zoom) > this.options.zoomAnimationThreshold) {
            return false;
          }
          var scale2 = this.getZoomScale(zoom2), offset = this._getCenterOffset(center)._divideBy(1 - 1 / scale2);
          if (options.animate !== true && !this.getSize().contains(offset)) {
            return false;
          }
          requestAnimFrame(function() {
            this._moveStart(true, options.noMoveStart || false)._animateZoom(center, zoom2, true);
          }, this);
          return true;
        },
        _animateZoom: function(center, zoom2, startAnim, noUpdate) {
          if (!this._mapPane) {
            return;
          }
          if (startAnim) {
            this._animatingZoom = true;
            this._animateToCenter = center;
            this._animateToZoom = zoom2;
            addClass(this._mapPane, "leaflet-zoom-anim");
          }
          this.fire("zoomanim", {
            center,
            zoom: zoom2,
            noUpdate
          });
          if (!this._tempFireZoomEvent) {
            this._tempFireZoomEvent = this._zoom !== this._animateToZoom;
          }
          this._move(this._animateToCenter, this._animateToZoom, void 0, true);
          setTimeout(bind(this._onZoomTransitionEnd, this), 250);
        },
        _onZoomTransitionEnd: function() {
          if (!this._animatingZoom) {
            return;
          }
          if (this._mapPane) {
            removeClass(this._mapPane, "leaflet-zoom-anim");
          }
          this._animatingZoom = false;
          this._move(this._animateToCenter, this._animateToZoom, void 0, true);
          if (this._tempFireZoomEvent) {
            this.fire("zoom");
          }
          delete this._tempFireZoomEvent;
          this.fire("move");
          this._moveEnd(true);
        }
      });
      function createMap(id, options) {
        return new Map2(id, options);
      }
      var Control = Class.extend({
        // @section
        // @aka Control Options
        options: {
          // @option position: String = 'topright'
          // The position of the control (one of the map corners). Possible values are `'topleft'`,
          // `'topright'`, `'bottomleft'` or `'bottomright'`
          position: "topright"
        },
        initialize: function(options) {
          setOptions(this, options);
        },
        /* @section
         * Classes extending L.Control will inherit the following methods:
         *
         * @method getPosition: string
         * Returns the position of the control.
         */
        getPosition: function() {
          return this.options.position;
        },
        // @method setPosition(position: string): this
        // Sets the position of the control.
        setPosition: function(position) {
          var map = this._map;
          if (map) {
            map.removeControl(this);
          }
          this.options.position = position;
          if (map) {
            map.addControl(this);
          }
          return this;
        },
        // @method getContainer: HTMLElement
        // Returns the HTMLElement that contains the control.
        getContainer: function() {
          return this._container;
        },
        // @method addTo(map: Map): this
        // Adds the control to the given map.
        addTo: function(map) {
          this.remove();
          this._map = map;
          var container = this._container = this.onAdd(map), pos = this.getPosition(), corner = map._controlCorners[pos];
          addClass(container, "leaflet-control");
          if (pos.indexOf("bottom") !== -1) {
            corner.insertBefore(container, corner.firstChild);
          } else {
            corner.appendChild(container);
          }
          this._map.on("unload", this.remove, this);
          return this;
        },
        // @method remove: this
        // Removes the control from the map it is currently active on.
        remove: function() {
          if (!this._map) {
            return this;
          }
          remove(this._container);
          if (this.onRemove) {
            this.onRemove(this._map);
          }
          this._map.off("unload", this.remove, this);
          this._map = null;
          return this;
        },
        _refocusOnMap: function(e) {
          if (this._map && e && e.screenX > 0 && e.screenY > 0) {
            this._map.getContainer().focus();
          }
        }
      });
      var control = function(options) {
        return new Control(options);
      };
      Map2.include({
        // @method addControl(control: Control): this
        // Adds the given control to the map
        addControl: function(control2) {
          control2.addTo(this);
          return this;
        },
        // @method removeControl(control: Control): this
        // Removes the given control from the map
        removeControl: function(control2) {
          control2.remove();
          return this;
        },
        _initControlPos: function() {
          var corners = this._controlCorners = {}, l = "leaflet-", container = this._controlContainer = create$1("div", l + "control-container", this._container);
          function createCorner(vSide, hSide) {
            var className = l + vSide + " " + l + hSide;
            corners[vSide + hSide] = create$1("div", className, container);
          }
          createCorner("top", "left");
          createCorner("top", "right");
          createCorner("bottom", "left");
          createCorner("bottom", "right");
        },
        _clearControlPos: function() {
          for (var i in this._controlCorners) {
            remove(this._controlCorners[i]);
          }
          remove(this._controlContainer);
          delete this._controlCorners;
          delete this._controlContainer;
        }
      });
      var Layers = Control.extend({
        // @section
        // @aka Control.Layers options
        options: {
          // @option collapsed: Boolean = true
          // If `true`, the control will be collapsed into an icon and expanded on mouse hover, touch, or keyboard activation.
          collapsed: true,
          position: "topright",
          // @option autoZIndex: Boolean = true
          // If `true`, the control will assign zIndexes in increasing order to all of its layers so that the order is preserved when switching them on/off.
          autoZIndex: true,
          // @option hideSingleBase: Boolean = false
          // If `true`, the base layers in the control will be hidden when there is only one.
          hideSingleBase: false,
          // @option sortLayers: Boolean = false
          // Whether to sort the layers. When `false`, layers will keep the order
          // in which they were added to the control.
          sortLayers: false,
          // @option sortFunction: Function = *
          // A [compare function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
          // that will be used for sorting the layers, when `sortLayers` is `true`.
          // The function receives both the `L.Layer` instances and their names, as in
          // `sortFunction(layerA, layerB, nameA, nameB)`.
          // By default, it sorts layers alphabetically by their name.
          sortFunction: function(layerA, layerB, nameA, nameB) {
            return nameA < nameB ? -1 : nameB < nameA ? 1 : 0;
          }
        },
        initialize: function(baseLayers, overlays, options) {
          setOptions(this, options);
          this._layerControlInputs = [];
          this._layers = [];
          this._lastZIndex = 0;
          this._handlingClick = false;
          this._preventClick = false;
          for (var i in baseLayers) {
            this._addLayer(baseLayers[i], i);
          }
          for (i in overlays) {
            this._addLayer(overlays[i], i, true);
          }
        },
        onAdd: function(map) {
          this._initLayout();
          this._update();
          this._map = map;
          map.on("zoomend", this._checkDisabledLayers, this);
          for (var i = 0; i < this._layers.length; i++) {
            this._layers[i].layer.on("add remove", this._onLayerChange, this);
          }
          return this._container;
        },
        addTo: function(map) {
          Control.prototype.addTo.call(this, map);
          return this._expandIfNotCollapsed();
        },
        onRemove: function() {
          this._map.off("zoomend", this._checkDisabledLayers, this);
          for (var i = 0; i < this._layers.length; i++) {
            this._layers[i].layer.off("add remove", this._onLayerChange, this);
          }
        },
        // @method addBaseLayer(layer: Layer, name: String): this
        // Adds a base layer (radio button entry) with the given name to the control.
        addBaseLayer: function(layer, name) {
          this._addLayer(layer, name);
          return this._map ? this._update() : this;
        },
        // @method addOverlay(layer: Layer, name: String): this
        // Adds an overlay (checkbox entry) with the given name to the control.
        addOverlay: function(layer, name) {
          this._addLayer(layer, name, true);
          return this._map ? this._update() : this;
        },
        // @method removeLayer(layer: Layer): this
        // Remove the given layer from the control.
        removeLayer: function(layer) {
          layer.off("add remove", this._onLayerChange, this);
          var obj = this._getLayer(stamp(layer));
          if (obj) {
            this._layers.splice(this._layers.indexOf(obj), 1);
          }
          return this._map ? this._update() : this;
        },
        // @method expand(): this
        // Expand the control container if collapsed.
        expand: function() {
          addClass(this._container, "leaflet-control-layers-expanded");
          this._section.style.height = null;
          var acceptableHeight = this._map.getSize().y - (this._container.offsetTop + 50);
          if (acceptableHeight < this._section.clientHeight) {
            addClass(this._section, "leaflet-control-layers-scrollbar");
            this._section.style.height = acceptableHeight + "px";
          } else {
            removeClass(this._section, "leaflet-control-layers-scrollbar");
          }
          this._checkDisabledLayers();
          return this;
        },
        // @method collapse(): this
        // Collapse the control container if expanded.
        collapse: function() {
          removeClass(this._container, "leaflet-control-layers-expanded");
          return this;
        },
        _initLayout: function() {
          var className = "leaflet-control-layers", container = this._container = create$1("div", className), collapsed = this.options.collapsed;
          container.setAttribute("aria-haspopup", true);
          disableClickPropagation(container);
          disableScrollPropagation(container);
          var section = this._section = create$1("section", className + "-list");
          if (collapsed) {
            this._map.on("click", this.collapse, this);
            on(container, {
              mouseenter: this._expandSafely,
              mouseleave: this.collapse
            }, this);
          }
          var link = this._layersLink = create$1("a", className + "-toggle", container);
          link.href = "#";
          link.title = "Layers";
          link.setAttribute("role", "button");
          on(link, {
            keydown: function(e) {
              if (e.keyCode === 13) {
                this._expandSafely();
              }
            },
            // Certain screen readers intercept the key event and instead send a click event
            click: function(e) {
              preventDefault(e);
              this._expandSafely();
            }
          }, this);
          if (!collapsed) {
            this.expand();
          }
          this._baseLayersList = create$1("div", className + "-base", section);
          this._separator = create$1("div", className + "-separator", section);
          this._overlaysList = create$1("div", className + "-overlays", section);
          container.appendChild(section);
        },
        _getLayer: function(id) {
          for (var i = 0; i < this._layers.length; i++) {
            if (this._layers[i] && stamp(this._layers[i].layer) === id) {
              return this._layers[i];
            }
          }
        },
        _addLayer: function(layer, name, overlay) {
          if (this._map) {
            layer.on("add remove", this._onLayerChange, this);
          }
          this._layers.push({
            layer,
            name,
            overlay
          });
          if (this.options.sortLayers) {
            this._layers.sort(bind(function(a, b) {
              return this.options.sortFunction(a.layer, b.layer, a.name, b.name);
            }, this));
          }
          if (this.options.autoZIndex && layer.setZIndex) {
            this._lastZIndex++;
            layer.setZIndex(this._lastZIndex);
          }
          this._expandIfNotCollapsed();
        },
        _update: function() {
          if (!this._container) {
            return this;
          }
          empty(this._baseLayersList);
          empty(this._overlaysList);
          this._layerControlInputs = [];
          var baseLayersPresent, overlaysPresent, i, obj, baseLayersCount = 0;
          for (i = 0; i < this._layers.length; i++) {
            obj = this._layers[i];
            this._addItem(obj);
            overlaysPresent = overlaysPresent || obj.overlay;
            baseLayersPresent = baseLayersPresent || !obj.overlay;
            baseLayersCount += !obj.overlay ? 1 : 0;
          }
          if (this.options.hideSingleBase) {
            baseLayersPresent = baseLayersPresent && baseLayersCount > 1;
            this._baseLayersList.style.display = baseLayersPresent ? "" : "none";
          }
          this._separator.style.display = overlaysPresent && baseLayersPresent ? "" : "none";
          return this;
        },
        _onLayerChange: function(e) {
          if (!this._handlingClick) {
            this._update();
          }
          var obj = this._getLayer(stamp(e.target));
          var type = obj.overlay ? e.type === "add" ? "overlayadd" : "overlayremove" : e.type === "add" ? "baselayerchange" : null;
          if (type) {
            this._map.fire(type, obj);
          }
        },
        // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see https://stackoverflow.com/a/119079)
        _createRadioElement: function(name, checked) {
          var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' + name + '"' + (checked ? ' checked="checked"' : "") + "/>";
          var radioFragment = document.createElement("div");
          radioFragment.innerHTML = radioHtml;
          return radioFragment.firstChild;
        },
        _addItem: function(obj) {
          var label = document.createElement("label"), checked = this._map.hasLayer(obj.layer), input;
          if (obj.overlay) {
            input = document.createElement("input");
            input.type = "checkbox";
            input.className = "leaflet-control-layers-selector";
            input.defaultChecked = checked;
          } else {
            input = this._createRadioElement("leaflet-base-layers_" + stamp(this), checked);
          }
          this._layerControlInputs.push(input);
          input.layerId = stamp(obj.layer);
          on(input, "click", this._onInputClick, this);
          var name = document.createElement("span");
          name.innerHTML = " " + obj.name;
          var holder = document.createElement("span");
          label.appendChild(holder);
          holder.appendChild(input);
          holder.appendChild(name);
          var container = obj.overlay ? this._overlaysList : this._baseLayersList;
          container.appendChild(label);
          this._checkDisabledLayers();
          return label;
        },
        _onInputClick: function() {
          if (this._preventClick) {
            return;
          }
          var inputs = this._layerControlInputs, input, layer;
          var addedLayers = [], removedLayers = [];
          this._handlingClick = true;
          for (var i = inputs.length - 1; i >= 0; i--) {
            input = inputs[i];
            layer = this._getLayer(input.layerId).layer;
            if (input.checked) {
              addedLayers.push(layer);
            } else if (!input.checked) {
              removedLayers.push(layer);
            }
          }
          for (i = 0; i < removedLayers.length; i++) {
            if (this._map.hasLayer(removedLayers[i])) {
              this._map.removeLayer(removedLayers[i]);
            }
          }
          for (i = 0; i < addedLayers.length; i++) {
            if (!this._map.hasLayer(addedLayers[i])) {
              this._map.addLayer(addedLayers[i]);
            }
          }
          this._handlingClick = false;
          this._refocusOnMap();
        },
        _checkDisabledLayers: function() {
          var inputs = this._layerControlInputs, input, layer, zoom2 = this._map.getZoom();
          for (var i = inputs.length - 1; i >= 0; i--) {
            input = inputs[i];
            layer = this._getLayer(input.layerId).layer;
            input.disabled = layer.options.minZoom !== void 0 && zoom2 < layer.options.minZoom || layer.options.maxZoom !== void 0 && zoom2 > layer.options.maxZoom;
          }
        },
        _expandIfNotCollapsed: function() {
          if (this._map && !this.options.collapsed) {
            this.expand();
          }
          return this;
        },
        _expandSafely: function() {
          var section = this._section;
          this._preventClick = true;
          on(section, "click", preventDefault);
          this.expand();
          var that = this;
          setTimeout(function() {
            off(section, "click", preventDefault);
            that._preventClick = false;
          });
        }
      });
      var layers = function(baseLayers, overlays, options) {
        return new Layers(baseLayers, overlays, options);
      };
      var Zoom = Control.extend({
        // @section
        // @aka Control.Zoom options
        options: {
          position: "topleft",
          // @option zoomInText: String = '<span aria-hidden="true">+</span>'
          // The text set on the 'zoom in' button.
          zoomInText: '<span aria-hidden="true">+</span>',
          // @option zoomInTitle: String = 'Zoom in'
          // The title set on the 'zoom in' button.
          zoomInTitle: "Zoom in",
          // @option zoomOutText: String = '<span aria-hidden="true">&#x2212;</span>'
          // The text set on the 'zoom out' button.
          zoomOutText: '<span aria-hidden="true">&#x2212;</span>',
          // @option zoomOutTitle: String = 'Zoom out'
          // The title set on the 'zoom out' button.
          zoomOutTitle: "Zoom out"
        },
        onAdd: function(map) {
          var zoomName = "leaflet-control-zoom", container = create$1("div", zoomName + " leaflet-bar"), options = this.options;
          this._zoomInButton = this._createButton(
            options.zoomInText,
            options.zoomInTitle,
            zoomName + "-in",
            container,
            this._zoomIn
          );
          this._zoomOutButton = this._createButton(
            options.zoomOutText,
            options.zoomOutTitle,
            zoomName + "-out",
            container,
            this._zoomOut
          );
          this._updateDisabled();
          map.on("zoomend zoomlevelschange", this._updateDisabled, this);
          return container;
        },
        onRemove: function(map) {
          map.off("zoomend zoomlevelschange", this._updateDisabled, this);
        },
        disable: function() {
          this._disabled = true;
          this._updateDisabled();
          return this;
        },
        enable: function() {
          this._disabled = false;
          this._updateDisabled();
          return this;
        },
        _zoomIn: function(e) {
          if (!this._disabled && this._map._zoom < this._map.getMaxZoom()) {
            this._map.zoomIn(this._map.options.zoomDelta * (e.shiftKey ? 3 : 1));
          }
        },
        _zoomOut: function(e) {
          if (!this._disabled && this._map._zoom > this._map.getMinZoom()) {
            this._map.zoomOut(this._map.options.zoomDelta * (e.shiftKey ? 3 : 1));
          }
        },
        _createButton: function(html, title, className, container, fn) {
          var link = create$1("a", className, container);
          link.innerHTML = html;
          link.href = "#";
          link.title = title;
          link.setAttribute("role", "button");
          link.setAttribute("aria-label", title);
          disableClickPropagation(link);
          on(link, "click", stop2);
          on(link, "click", fn, this);
          on(link, "click", this._refocusOnMap, this);
          return link;
        },
        _updateDisabled: function() {
          var map = this._map, className = "leaflet-disabled";
          removeClass(this._zoomInButton, className);
          removeClass(this._zoomOutButton, className);
          this._zoomInButton.setAttribute("aria-disabled", "false");
          this._zoomOutButton.setAttribute("aria-disabled", "false");
          if (this._disabled || map._zoom === map.getMinZoom()) {
            addClass(this._zoomOutButton, className);
            this._zoomOutButton.setAttribute("aria-disabled", "true");
          }
          if (this._disabled || map._zoom === map.getMaxZoom()) {
            addClass(this._zoomInButton, className);
            this._zoomInButton.setAttribute("aria-disabled", "true");
          }
        }
      });
      Map2.mergeOptions({
        zoomControl: true
      });
      Map2.addInitHook(function() {
        if (this.options.zoomControl) {
          this.zoomControl = new Zoom();
          this.addControl(this.zoomControl);
        }
      });
      var zoom = function(options) {
        return new Zoom(options);
      };
      var Scale = Control.extend({
        // @section
        // @aka Control.Scale options
        options: {
          position: "bottomleft",
          // @option maxWidth: Number = 100
          // Maximum width of the control in pixels. The width is set dynamically to show round values (e.g. 100, 200, 500).
          maxWidth: 100,
          // @option metric: Boolean = True
          // Whether to show the metric scale line (m/km).
          metric: true,
          // @option imperial: Boolean = True
          // Whether to show the imperial scale line (mi/ft).
          imperial: true
          // @option updateWhenIdle: Boolean = false
          // If `true`, the control is updated on [`moveend`](#map-moveend), otherwise it's always up-to-date (updated on [`move`](#map-move)).
        },
        onAdd: function(map) {
          var className = "leaflet-control-scale", container = create$1("div", className), options = this.options;
          this._addScales(options, className + "-line", container);
          map.on(options.updateWhenIdle ? "moveend" : "move", this._update, this);
          map.whenReady(this._update, this);
          return container;
        },
        onRemove: function(map) {
          map.off(this.options.updateWhenIdle ? "moveend" : "move", this._update, this);
        },
        _addScales: function(options, className, container) {
          if (options.metric) {
            this._mScale = create$1("div", className, container);
          }
          if (options.imperial) {
            this._iScale = create$1("div", className, container);
          }
        },
        _update: function() {
          var map = this._map, y = map.getSize().y / 2;
          var maxMeters = map.distance(
            map.containerPointToLatLng([0, y]),
            map.containerPointToLatLng([this.options.maxWidth, y])
          );
          this._updateScales(maxMeters);
        },
        _updateScales: function(maxMeters) {
          if (this.options.metric && maxMeters) {
            this._updateMetric(maxMeters);
          }
          if (this.options.imperial && maxMeters) {
            this._updateImperial(maxMeters);
          }
        },
        _updateMetric: function(maxMeters) {
          var meters = this._getRoundNum(maxMeters), label = meters < 1e3 ? meters + " m" : meters / 1e3 + " km";
          this._updateScale(this._mScale, label, meters / maxMeters);
        },
        _updateImperial: function(maxMeters) {
          var maxFeet = maxMeters * 3.2808399, maxMiles, miles, feet;
          if (maxFeet > 5280) {
            maxMiles = maxFeet / 5280;
            miles = this._getRoundNum(maxMiles);
            this._updateScale(this._iScale, miles + " mi", miles / maxMiles);
          } else {
            feet = this._getRoundNum(maxFeet);
            this._updateScale(this._iScale, feet + " ft", feet / maxFeet);
          }
        },
        _updateScale: function(scale2, text, ratio) {
          scale2.style.width = Math.round(this.options.maxWidth * ratio) + "px";
          scale2.innerHTML = text;
        },
        _getRoundNum: function(num) {
          var pow10 = Math.pow(10, (Math.floor(num) + "").length - 1), d = num / pow10;
          d = d >= 10 ? 10 : d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : 1;
          return pow10 * d;
        }
      });
      var scale = function(options) {
        return new Scale(options);
      };
      var ukrainianFlag = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" class="leaflet-attribution-flag"><path fill="#4C7BE1" d="M0 0h12v4H0z"/><path fill="#FFD500" d="M0 4h12v3H0z"/><path fill="#E0BC00" d="M0 7h12v1H0z"/></svg>';
      var Attribution = Control.extend({
        // @section
        // @aka Control.Attribution options
        options: {
          position: "bottomright",
          // @option prefix: String|false = 'Leaflet'
          // The HTML text shown before the attributions. Pass `false` to disable.
          prefix: '<a href="https://leafletjs.com" title="A JavaScript library for interactive maps">' + (Browser.inlineSvg ? ukrainianFlag + " " : "") + "Leaflet</a>"
        },
        initialize: function(options) {
          setOptions(this, options);
          this._attributions = {};
        },
        onAdd: function(map) {
          map.attributionControl = this;
          this._container = create$1("div", "leaflet-control-attribution");
          disableClickPropagation(this._container);
          for (var i in map._layers) {
            if (map._layers[i].getAttribution) {
              this.addAttribution(map._layers[i].getAttribution());
            }
          }
          this._update();
          map.on("layeradd", this._addAttribution, this);
          return this._container;
        },
        onRemove: function(map) {
          map.off("layeradd", this._addAttribution, this);
        },
        _addAttribution: function(ev) {
          if (ev.layer.getAttribution) {
            this.addAttribution(ev.layer.getAttribution());
            ev.layer.once("remove", function() {
              this.removeAttribution(ev.layer.getAttribution());
            }, this);
          }
        },
        // @method setPrefix(prefix: String|false): this
        // The HTML text shown before the attributions. Pass `false` to disable.
        setPrefix: function(prefix) {
          this.options.prefix = prefix;
          this._update();
          return this;
        },
        // @method addAttribution(text: String): this
        // Adds an attribution text (e.g. `'&copy; OpenStreetMap contributors'`).
        addAttribution: function(text) {
          if (!text) {
            return this;
          }
          if (!this._attributions[text]) {
            this._attributions[text] = 0;
          }
          this._attributions[text]++;
          this._update();
          return this;
        },
        // @method removeAttribution(text: String): this
        // Removes an attribution text.
        removeAttribution: function(text) {
          if (!text) {
            return this;
          }
          if (this._attributions[text]) {
            this._attributions[text]--;
            this._update();
          }
          return this;
        },
        _update: function() {
          if (!this._map) {
            return;
          }
          var attribs = [];
          for (var i in this._attributions) {
            if (this._attributions[i]) {
              attribs.push(i);
            }
          }
          var prefixAndAttribs = [];
          if (this.options.prefix) {
            prefixAndAttribs.push(this.options.prefix);
          }
          if (attribs.length) {
            prefixAndAttribs.push(attribs.join(", "));
          }
          this._container.innerHTML = prefixAndAttribs.join(' <span aria-hidden="true">|</span> ');
        }
      });
      Map2.mergeOptions({
        attributionControl: true
      });
      Map2.addInitHook(function() {
        if (this.options.attributionControl) {
          new Attribution().addTo(this);
        }
      });
      var attribution = function(options) {
        return new Attribution(options);
      };
      Control.Layers = Layers;
      Control.Zoom = Zoom;
      Control.Scale = Scale;
      Control.Attribution = Attribution;
      control.layers = layers;
      control.zoom = zoom;
      control.scale = scale;
      control.attribution = attribution;
      var Handler = Class.extend({
        initialize: function(map) {
          this._map = map;
        },
        // @method enable(): this
        // Enables the handler
        enable: function() {
          if (this._enabled) {
            return this;
          }
          this._enabled = true;
          this.addHooks();
          return this;
        },
        // @method disable(): this
        // Disables the handler
        disable: function() {
          if (!this._enabled) {
            return this;
          }
          this._enabled = false;
          this.removeHooks();
          return this;
        },
        // @method enabled(): Boolean
        // Returns `true` if the handler is enabled
        enabled: function() {
          return !!this._enabled;
        }
        // @section Extension methods
        // Classes inheriting from `Handler` must implement the two following methods:
        // @method addHooks()
        // Called when the handler is enabled, should add event hooks.
        // @method removeHooks()
        // Called when the handler is disabled, should remove the event hooks added previously.
      });
      Handler.addTo = function(map, name) {
        map.addHandler(name, this);
        return this;
      };
      var Mixin = { Events };
      var START = Browser.touch ? "touchstart mousedown" : "mousedown";
      var Draggable = Evented.extend({
        options: {
          // @section
          // @aka Draggable options
          // @option clickTolerance: Number = 3
          // The max number of pixels a user can shift the mouse pointer during a click
          // for it to be considered a valid click (as opposed to a mouse drag).
          clickTolerance: 3
        },
        // @constructor L.Draggable(el: HTMLElement, dragHandle?: HTMLElement, preventOutline?: Boolean, options?: Draggable options)
        // Creates a `Draggable` object for moving `el` when you start dragging the `dragHandle` element (equals `el` itself by default).
        initialize: function(element, dragStartTarget, preventOutline2, options) {
          setOptions(this, options);
          this._element = element;
          this._dragStartTarget = dragStartTarget || element;
          this._preventOutline = preventOutline2;
        },
        // @method enable()
        // Enables the dragging ability
        enable: function() {
          if (this._enabled) {
            return;
          }
          on(this._dragStartTarget, START, this._onDown, this);
          this._enabled = true;
        },
        // @method disable()
        // Disables the dragging ability
        disable: function() {
          if (!this._enabled) {
            return;
          }
          if (Draggable._dragging === this) {
            this.finishDrag(true);
          }
          off(this._dragStartTarget, START, this._onDown, this);
          this._enabled = false;
          this._moved = false;
        },
        _onDown: function(e) {
          if (!this._enabled) {
            return;
          }
          this._moved = false;
          if (hasClass(this._element, "leaflet-zoom-anim")) {
            return;
          }
          if (e.touches && e.touches.length !== 1) {
            if (Draggable._dragging === this) {
              this.finishDrag();
            }
            return;
          }
          if (Draggable._dragging || e.shiftKey || e.which !== 1 && e.button !== 1 && !e.touches) {
            return;
          }
          Draggable._dragging = this;
          if (this._preventOutline) {
            preventOutline(this._element);
          }
          disableImageDrag();
          disableTextSelection();
          if (this._moving) {
            return;
          }
          this.fire("down");
          var first = e.touches ? e.touches[0] : e, sizedParent = getSizedParentNode(this._element);
          this._startPoint = new Point(first.clientX, first.clientY);
          this._startPos = getPosition(this._element);
          this._parentScale = getScale(sizedParent);
          var mouseevent = e.type === "mousedown";
          on(document, mouseevent ? "mousemove" : "touchmove", this._onMove, this);
          on(document, mouseevent ? "mouseup" : "touchend touchcancel", this._onUp, this);
        },
        _onMove: function(e) {
          if (!this._enabled) {
            return;
          }
          if (e.touches && e.touches.length > 1) {
            this._moved = true;
            return;
          }
          var first = e.touches && e.touches.length === 1 ? e.touches[0] : e, offset = new Point(first.clientX, first.clientY)._subtract(this._startPoint);
          if (!offset.x && !offset.y) {
            return;
          }
          if (Math.abs(offset.x) + Math.abs(offset.y) < this.options.clickTolerance) {
            return;
          }
          offset.x /= this._parentScale.x;
          offset.y /= this._parentScale.y;
          preventDefault(e);
          if (!this._moved) {
            this.fire("dragstart");
            this._moved = true;
            addClass(document.body, "leaflet-dragging");
            this._lastTarget = e.target || e.srcElement;
            if (window.SVGElementInstance && this._lastTarget instanceof window.SVGElementInstance) {
              this._lastTarget = this._lastTarget.correspondingUseElement;
            }
            addClass(this._lastTarget, "leaflet-drag-target");
          }
          this._newPos = this._startPos.add(offset);
          this._moving = true;
          this._lastEvent = e;
          this._updatePosition();
        },
        _updatePosition: function() {
          var e = { originalEvent: this._lastEvent };
          this.fire("predrag", e);
          setPosition(this._element, this._newPos);
          this.fire("drag", e);
        },
        _onUp: function() {
          if (!this._enabled) {
            return;
          }
          this.finishDrag();
        },
        finishDrag: function(noInertia) {
          removeClass(document.body, "leaflet-dragging");
          if (this._lastTarget) {
            removeClass(this._lastTarget, "leaflet-drag-target");
            this._lastTarget = null;
          }
          off(document, "mousemove touchmove", this._onMove, this);
          off(document, "mouseup touchend touchcancel", this._onUp, this);
          enableImageDrag();
          enableTextSelection();
          var fireDragend = this._moved && this._moving;
          this._moving = false;
          Draggable._dragging = false;
          if (fireDragend) {
            this.fire("dragend", {
              noInertia,
              distance: this._newPos.distanceTo(this._startPos)
            });
          }
        }
      });
      function clipPolygon(points, bounds, round) {
        var clippedPoints, edges = [1, 4, 2, 8], i, j, k, a, b, len, edge2, p;
        for (i = 0, len = points.length; i < len; i++) {
          points[i]._code = _getBitCode(points[i], bounds);
        }
        for (k = 0; k < 4; k++) {
          edge2 = edges[k];
          clippedPoints = [];
          for (i = 0, len = points.length, j = len - 1; i < len; j = i++) {
            a = points[i];
            b = points[j];
            if (!(a._code & edge2)) {
              if (b._code & edge2) {
                p = _getEdgeIntersection(b, a, edge2, bounds, round);
                p._code = _getBitCode(p, bounds);
                clippedPoints.push(p);
              }
              clippedPoints.push(a);
            } else if (!(b._code & edge2)) {
              p = _getEdgeIntersection(b, a, edge2, bounds, round);
              p._code = _getBitCode(p, bounds);
              clippedPoints.push(p);
            }
          }
          points = clippedPoints;
        }
        return points;
      }
      function polygonCenter(latlngs, crs) {
        var i, j, p1, p2, f2, area, x, y, center;
        if (!latlngs || latlngs.length === 0) {
          throw new Error("latlngs not passed");
        }
        if (!isFlat(latlngs)) {
          console.warn("latlngs are not flat! Only the first ring will be used");
          latlngs = latlngs[0];
        }
        var centroidLatLng = toLatLng([0, 0]);
        var bounds = toLatLngBounds(latlngs);
        var areaBounds = bounds.getNorthWest().distanceTo(bounds.getSouthWest()) * bounds.getNorthEast().distanceTo(bounds.getNorthWest());
        if (areaBounds < 1700) {
          centroidLatLng = centroid(latlngs);
        }
        var len = latlngs.length;
        var points = [];
        for (i = 0; i < len; i++) {
          var latlng = toLatLng(latlngs[i]);
          points.push(crs.project(toLatLng([latlng.lat - centroidLatLng.lat, latlng.lng - centroidLatLng.lng])));
        }
        area = x = y = 0;
        for (i = 0, j = len - 1; i < len; j = i++) {
          p1 = points[i];
          p2 = points[j];
          f2 = p1.y * p2.x - p2.y * p1.x;
          x += (p1.x + p2.x) * f2;
          y += (p1.y + p2.y) * f2;
          area += f2 * 3;
        }
        if (area === 0) {
          center = points[0];
        } else {
          center = [x / area, y / area];
        }
        var latlngCenter = crs.unproject(toPoint(center));
        return toLatLng([latlngCenter.lat + centroidLatLng.lat, latlngCenter.lng + centroidLatLng.lng]);
      }
      function centroid(coords) {
        var latSum = 0;
        var lngSum = 0;
        var len = 0;
        for (var i = 0; i < coords.length; i++) {
          var latlng = toLatLng(coords[i]);
          latSum += latlng.lat;
          lngSum += latlng.lng;
          len++;
        }
        return toLatLng([latSum / len, lngSum / len]);
      }
      var PolyUtil = {
        __proto__: null,
        clipPolygon,
        polygonCenter,
        centroid
      };
      function simplify(points, tolerance) {
        if (!tolerance || !points.length) {
          return points.slice();
        }
        var sqTolerance = tolerance * tolerance;
        points = _reducePoints(points, sqTolerance);
        points = _simplifyDP(points, sqTolerance);
        return points;
      }
      function pointToSegmentDistance(p, p1, p2) {
        return Math.sqrt(_sqClosestPointOnSegment(p, p1, p2, true));
      }
      function closestPointOnSegment(p, p1, p2) {
        return _sqClosestPointOnSegment(p, p1, p2);
      }
      function _simplifyDP(points, sqTolerance) {
        var len = points.length, ArrayConstructor = typeof Uint8Array !== "undefined" ? Uint8Array : Array, markers = new ArrayConstructor(len);
        markers[0] = markers[len - 1] = 1;
        _simplifyDPStep(points, markers, sqTolerance, 0, len - 1);
        var i, newPoints = [];
        for (i = 0; i < len; i++) {
          if (markers[i]) {
            newPoints.push(points[i]);
          }
        }
        return newPoints;
      }
      function _simplifyDPStep(points, markers, sqTolerance, first, last) {
        var maxSqDist = 0, index2, i, sqDist;
        for (i = first + 1; i <= last - 1; i++) {
          sqDist = _sqClosestPointOnSegment(points[i], points[first], points[last], true);
          if (sqDist > maxSqDist) {
            index2 = i;
            maxSqDist = sqDist;
          }
        }
        if (maxSqDist > sqTolerance) {
          markers[index2] = 1;
          _simplifyDPStep(points, markers, sqTolerance, first, index2);
          _simplifyDPStep(points, markers, sqTolerance, index2, last);
        }
      }
      function _reducePoints(points, sqTolerance) {
        var reducedPoints = [points[0]];
        for (var i = 1, prev = 0, len = points.length; i < len; i++) {
          if (_sqDist(points[i], points[prev]) > sqTolerance) {
            reducedPoints.push(points[i]);
            prev = i;
          }
        }
        if (prev < len - 1) {
          reducedPoints.push(points[len - 1]);
        }
        return reducedPoints;
      }
      var _lastCode;
      function clipSegment(a, b, bounds, useLastCode, round) {
        var codeA = useLastCode ? _lastCode : _getBitCode(a, bounds), codeB = _getBitCode(b, bounds), codeOut, p, newCode;
        _lastCode = codeB;
        while (true) {
          if (!(codeA | codeB)) {
            return [a, b];
          }
          if (codeA & codeB) {
            return false;
          }
          codeOut = codeA || codeB;
          p = _getEdgeIntersection(a, b, codeOut, bounds, round);
          newCode = _getBitCode(p, bounds);
          if (codeOut === codeA) {
            a = p;
            codeA = newCode;
          } else {
            b = p;
            codeB = newCode;
          }
        }
      }
      function _getEdgeIntersection(a, b, code, bounds, round) {
        var dx = b.x - a.x, dy = b.y - a.y, min = bounds.min, max = bounds.max, x, y;
        if (code & 8) {
          x = a.x + dx * (max.y - a.y) / dy;
          y = max.y;
        } else if (code & 4) {
          x = a.x + dx * (min.y - a.y) / dy;
          y = min.y;
        } else if (code & 2) {
          x = max.x;
          y = a.y + dy * (max.x - a.x) / dx;
        } else if (code & 1) {
          x = min.x;
          y = a.y + dy * (min.x - a.x) / dx;
        }
        return new Point(x, y, round);
      }
      function _getBitCode(p, bounds) {
        var code = 0;
        if (p.x < bounds.min.x) {
          code |= 1;
        } else if (p.x > bounds.max.x) {
          code |= 2;
        }
        if (p.y < bounds.min.y) {
          code |= 4;
        } else if (p.y > bounds.max.y) {
          code |= 8;
        }
        return code;
      }
      function _sqDist(p1, p2) {
        var dx = p2.x - p1.x, dy = p2.y - p1.y;
        return dx * dx + dy * dy;
      }
      function _sqClosestPointOnSegment(p, p1, p2, sqDist) {
        var x = p1.x, y = p1.y, dx = p2.x - x, dy = p2.y - y, dot = dx * dx + dy * dy, t;
        if (dot > 0) {
          t = ((p.x - x) * dx + (p.y - y) * dy) / dot;
          if (t > 1) {
            x = p2.x;
            y = p2.y;
          } else if (t > 0) {
            x += dx * t;
            y += dy * t;
          }
        }
        dx = p.x - x;
        dy = p.y - y;
        return sqDist ? dx * dx + dy * dy : new Point(x, y);
      }
      function isFlat(latlngs) {
        return !isArray(latlngs[0]) || typeof latlngs[0][0] !== "object" && typeof latlngs[0][0] !== "undefined";
      }
      function _flat(latlngs) {
        console.warn("Deprecated use of _flat, please use L.LineUtil.isFlat instead.");
        return isFlat(latlngs);
      }
      function polylineCenter(latlngs, crs) {
        var i, halfDist, segDist, dist, p1, p2, ratio, center;
        if (!latlngs || latlngs.length === 0) {
          throw new Error("latlngs not passed");
        }
        if (!isFlat(latlngs)) {
          console.warn("latlngs are not flat! Only the first ring will be used");
          latlngs = latlngs[0];
        }
        var centroidLatLng = toLatLng([0, 0]);
        var bounds = toLatLngBounds(latlngs);
        var areaBounds = bounds.getNorthWest().distanceTo(bounds.getSouthWest()) * bounds.getNorthEast().distanceTo(bounds.getNorthWest());
        if (areaBounds < 1700) {
          centroidLatLng = centroid(latlngs);
        }
        var len = latlngs.length;
        var points = [];
        for (i = 0; i < len; i++) {
          var latlng = toLatLng(latlngs[i]);
          points.push(crs.project(toLatLng([latlng.lat - centroidLatLng.lat, latlng.lng - centroidLatLng.lng])));
        }
        for (i = 0, halfDist = 0; i < len - 1; i++) {
          halfDist += points[i].distanceTo(points[i + 1]) / 2;
        }
        if (halfDist === 0) {
          center = points[0];
        } else {
          for (i = 0, dist = 0; i < len - 1; i++) {
            p1 = points[i];
            p2 = points[i + 1];
            segDist = p1.distanceTo(p2);
            dist += segDist;
            if (dist > halfDist) {
              ratio = (dist - halfDist) / segDist;
              center = [
                p2.x - ratio * (p2.x - p1.x),
                p2.y - ratio * (p2.y - p1.y)
              ];
              break;
            }
          }
        }
        var latlngCenter = crs.unproject(toPoint(center));
        return toLatLng([latlngCenter.lat + centroidLatLng.lat, latlngCenter.lng + centroidLatLng.lng]);
      }
      var LineUtil = {
        __proto__: null,
        simplify,
        pointToSegmentDistance,
        closestPointOnSegment,
        clipSegment,
        _getEdgeIntersection,
        _getBitCode,
        _sqClosestPointOnSegment,
        isFlat,
        _flat,
        polylineCenter
      };
      var LonLat = {
        project: function(latlng) {
          return new Point(latlng.lng, latlng.lat);
        },
        unproject: function(point) {
          return new LatLng(point.y, point.x);
        },
        bounds: new Bounds([-180, -90], [180, 90])
      };
      var Mercator = {
        R: 6378137,
        R_MINOR: 6356752314245179e-9,
        bounds: new Bounds([-2003750834279e-5, -1549657073972e-5], [2003750834279e-5, 1876465623138e-5]),
        project: function(latlng) {
          var d = Math.PI / 180, r = this.R, y = latlng.lat * d, tmp = this.R_MINOR / r, e = Math.sqrt(1 - tmp * tmp), con = e * Math.sin(y);
          var ts = Math.tan(Math.PI / 4 - y / 2) / Math.pow((1 - con) / (1 + con), e / 2);
          y = -r * Math.log(Math.max(ts, 1e-10));
          return new Point(latlng.lng * d * r, y);
        },
        unproject: function(point) {
          var d = 180 / Math.PI, r = this.R, tmp = this.R_MINOR / r, e = Math.sqrt(1 - tmp * tmp), ts = Math.exp(-point.y / r), phi = Math.PI / 2 - 2 * Math.atan(ts);
          for (var i = 0, dphi = 0.1, con; i < 15 && Math.abs(dphi) > 1e-7; i++) {
            con = e * Math.sin(phi);
            con = Math.pow((1 - con) / (1 + con), e / 2);
            dphi = Math.PI / 2 - 2 * Math.atan(ts * con) - phi;
            phi += dphi;
          }
          return new LatLng(phi * d, point.x * d / r);
        }
      };
      var index = {
        __proto__: null,
        LonLat,
        Mercator,
        SphericalMercator
      };
      var EPSG3395 = extend({}, Earth, {
        code: "EPSG:3395",
        projection: Mercator,
        transformation: (function() {
          var scale2 = 0.5 / (Math.PI * Mercator.R);
          return toTransformation(scale2, 0.5, -scale2, 0.5);
        })()
      });
      var EPSG4326 = extend({}, Earth, {
        code: "EPSG:4326",
        projection: LonLat,
        transformation: toTransformation(1 / 180, 1, -1 / 180, 0.5)
      });
      var Simple = extend({}, CRS, {
        projection: LonLat,
        transformation: toTransformation(1, 0, -1, 0),
        scale: function(zoom2) {
          return Math.pow(2, zoom2);
        },
        zoom: function(scale2) {
          return Math.log(scale2) / Math.LN2;
        },
        distance: function(latlng1, latlng2) {
          var dx = latlng2.lng - latlng1.lng, dy = latlng2.lat - latlng1.lat;
          return Math.sqrt(dx * dx + dy * dy);
        },
        infinite: true
      });
      CRS.Earth = Earth;
      CRS.EPSG3395 = EPSG3395;
      CRS.EPSG3857 = EPSG3857;
      CRS.EPSG900913 = EPSG900913;
      CRS.EPSG4326 = EPSG4326;
      CRS.Simple = Simple;
      var Layer = Evented.extend({
        // Classes extending `L.Layer` will inherit the following options:
        options: {
          // @option pane: String = 'overlayPane'
          // By default the layer will be added to the map's [overlay pane](#map-overlaypane). Overriding this option will cause the layer to be placed on another pane by default.
          pane: "overlayPane",
          // @option attribution: String = null
          // String to be shown in the attribution control, e.g. "© OpenStreetMap contributors". It describes the layer data and is often a legal obligation towards copyright holders and tile providers.
          attribution: null,
          bubblingMouseEvents: true
        },
        /* @section
         * Classes extending `L.Layer` will inherit the following methods:
         *
         * @method addTo(map: Map|LayerGroup): this
         * Adds the layer to the given map or layer group.
         */
        addTo: function(map) {
          map.addLayer(this);
          return this;
        },
        // @method remove: this
        // Removes the layer from the map it is currently active on.
        remove: function() {
          return this.removeFrom(this._map || this._mapToAdd);
        },
        // @method removeFrom(map: Map): this
        // Removes the layer from the given map
        //
        // @alternative
        // @method removeFrom(group: LayerGroup): this
        // Removes the layer from the given `LayerGroup`
        removeFrom: function(obj) {
          if (obj) {
            obj.removeLayer(this);
          }
          return this;
        },
        // @method getPane(name? : String): HTMLElement
        // Returns the `HTMLElement` representing the named pane on the map. If `name` is omitted, returns the pane for this layer.
        getPane: function(name) {
          return this._map.getPane(name ? this.options[name] || name : this.options.pane);
        },
        addInteractiveTarget: function(targetEl) {
          this._map._targets[stamp(targetEl)] = this;
          return this;
        },
        removeInteractiveTarget: function(targetEl) {
          delete this._map._targets[stamp(targetEl)];
          return this;
        },
        // @method getAttribution: String
        // Used by the `attribution control`, returns the [attribution option](#gridlayer-attribution).
        getAttribution: function() {
          return this.options.attribution;
        },
        _layerAdd: function(e) {
          var map = e.target;
          if (!map.hasLayer(this)) {
            return;
          }
          this._map = map;
          this._zoomAnimated = map._zoomAnimated;
          if (this.getEvents) {
            var events = this.getEvents();
            map.on(events, this);
            this.once("remove", function() {
              map.off(events, this);
            }, this);
          }
          this.onAdd(map);
          this.fire("add");
          map.fire("layeradd", { layer: this });
        }
      });
      Map2.include({
        // @method addLayer(layer: Layer): this
        // Adds the given layer to the map
        addLayer: function(layer) {
          if (!layer._layerAdd) {
            throw new Error("The provided object is not a Layer.");
          }
          var id = stamp(layer);
          if (this._layers[id]) {
            return this;
          }
          this._layers[id] = layer;
          layer._mapToAdd = this;
          if (layer.beforeAdd) {
            layer.beforeAdd(this);
          }
          this.whenReady(layer._layerAdd, layer);
          return this;
        },
        // @method removeLayer(layer: Layer): this
        // Removes the given layer from the map.
        removeLayer: function(layer) {
          var id = stamp(layer);
          if (!this._layers[id]) {
            return this;
          }
          if (this._loaded) {
            layer.onRemove(this);
          }
          delete this._layers[id];
          if (this._loaded) {
            this.fire("layerremove", { layer });
            layer.fire("remove");
          }
          layer._map = layer._mapToAdd = null;
          return this;
        },
        // @method hasLayer(layer: Layer): Boolean
        // Returns `true` if the given layer is currently added to the map
        hasLayer: function(layer) {
          return stamp(layer) in this._layers;
        },
        /* @method eachLayer(fn: Function, context?: Object): this
         * Iterates over the layers of the map, optionally specifying context of the iterator function.
         * ```
         * map.eachLayer(function(layer){
         *     layer.bindPopup('Hello');
         * });
         * ```
         */
        eachLayer: function(method, context) {
          for (var i in this._layers) {
            method.call(context, this._layers[i]);
          }
          return this;
        },
        _addLayers: function(layers2) {
          layers2 = layers2 ? isArray(layers2) ? layers2 : [layers2] : [];
          for (var i = 0, len = layers2.length; i < len; i++) {
            this.addLayer(layers2[i]);
          }
        },
        _addZoomLimit: function(layer) {
          if (!isNaN(layer.options.maxZoom) || !isNaN(layer.options.minZoom)) {
            this._zoomBoundLayers[stamp(layer)] = layer;
            this._updateZoomLevels();
          }
        },
        _removeZoomLimit: function(layer) {
          var id = stamp(layer);
          if (this._zoomBoundLayers[id]) {
            delete this._zoomBoundLayers[id];
            this._updateZoomLevels();
          }
        },
        _updateZoomLevels: function() {
          var minZoom = Infinity, maxZoom = -Infinity, oldZoomSpan = this._getZoomSpan();
          for (var i in this._zoomBoundLayers) {
            var options = this._zoomBoundLayers[i].options;
            minZoom = options.minZoom === void 0 ? minZoom : Math.min(minZoom, options.minZoom);
            maxZoom = options.maxZoom === void 0 ? maxZoom : Math.max(maxZoom, options.maxZoom);
          }
          this._layersMaxZoom = maxZoom === -Infinity ? void 0 : maxZoom;
          this._layersMinZoom = minZoom === Infinity ? void 0 : minZoom;
          if (oldZoomSpan !== this._getZoomSpan()) {
            this.fire("zoomlevelschange");
          }
          if (this.options.maxZoom === void 0 && this._layersMaxZoom && this.getZoom() > this._layersMaxZoom) {
            this.setZoom(this._layersMaxZoom);
          }
          if (this.options.minZoom === void 0 && this._layersMinZoom && this.getZoom() < this._layersMinZoom) {
            this.setZoom(this._layersMinZoom);
          }
        }
      });
      var LayerGroup = Layer.extend({
        initialize: function(layers2, options) {
          setOptions(this, options);
          this._layers = {};
          var i, len;
          if (layers2) {
            for (i = 0, len = layers2.length; i < len; i++) {
              this.addLayer(layers2[i]);
            }
          }
        },
        // @method addLayer(layer: Layer): this
        // Adds the given layer to the group.
        addLayer: function(layer) {
          var id = this.getLayerId(layer);
          this._layers[id] = layer;
          if (this._map) {
            this._map.addLayer(layer);
          }
          return this;
        },
        // @method removeLayer(layer: Layer): this
        // Removes the given layer from the group.
        // @alternative
        // @method removeLayer(id: Number): this
        // Removes the layer with the given internal ID from the group.
        removeLayer: function(layer) {
          var id = layer in this._layers ? layer : this.getLayerId(layer);
          if (this._map && this._layers[id]) {
            this._map.removeLayer(this._layers[id]);
          }
          delete this._layers[id];
          return this;
        },
        // @method hasLayer(layer: Layer): Boolean
        // Returns `true` if the given layer is currently added to the group.
        // @alternative
        // @method hasLayer(id: Number): Boolean
        // Returns `true` if the given internal ID is currently added to the group.
        hasLayer: function(layer) {
          var layerId = typeof layer === "number" ? layer : this.getLayerId(layer);
          return layerId in this._layers;
        },
        // @method clearLayers(): this
        // Removes all the layers from the group.
        clearLayers: function() {
          return this.eachLayer(this.removeLayer, this);
        },
        // @method invoke(methodName: String, …): this
        // Calls `methodName` on every layer contained in this group, passing any
        // additional parameters. Has no effect if the layers contained do not
        // implement `methodName`.
        invoke: function(methodName) {
          var args = Array.prototype.slice.call(arguments, 1), i, layer;
          for (i in this._layers) {
            layer = this._layers[i];
            if (layer[methodName]) {
              layer[methodName].apply(layer, args);
            }
          }
          return this;
        },
        onAdd: function(map) {
          this.eachLayer(map.addLayer, map);
        },
        onRemove: function(map) {
          this.eachLayer(map.removeLayer, map);
        },
        // @method eachLayer(fn: Function, context?: Object): this
        // Iterates over the layers of the group, optionally specifying context of the iterator function.
        // ```js
        // group.eachLayer(function (layer) {
        // 	layer.bindPopup('Hello');
        // });
        // ```
        eachLayer: function(method, context) {
          for (var i in this._layers) {
            method.call(context, this._layers[i]);
          }
          return this;
        },
        // @method getLayer(id: Number): Layer
        // Returns the layer with the given internal ID.
        getLayer: function(id) {
          return this._layers[id];
        },
        // @method getLayers(): Layer[]
        // Returns an array of all the layers added to the group.
        getLayers: function() {
          var layers2 = [];
          this.eachLayer(layers2.push, layers2);
          return layers2;
        },
        // @method setZIndex(zIndex: Number): this
        // Calls `setZIndex` on every layer contained in this group, passing the z-index.
        setZIndex: function(zIndex) {
          return this.invoke("setZIndex", zIndex);
        },
        // @method getLayerId(layer: Layer): Number
        // Returns the internal ID for a layer
        getLayerId: function(layer) {
          return stamp(layer);
        }
      });
      var layerGroup = function(layers2, options) {
        return new LayerGroup(layers2, options);
      };
      var FeatureGroup = LayerGroup.extend({
        addLayer: function(layer) {
          if (this.hasLayer(layer)) {
            return this;
          }
          layer.addEventParent(this);
          LayerGroup.prototype.addLayer.call(this, layer);
          return this.fire("layeradd", { layer });
        },
        removeLayer: function(layer) {
          if (!this.hasLayer(layer)) {
            return this;
          }
          if (layer in this._layers) {
            layer = this._layers[layer];
          }
          layer.removeEventParent(this);
          LayerGroup.prototype.removeLayer.call(this, layer);
          return this.fire("layerremove", { layer });
        },
        // @method setStyle(style: Path options): this
        // Sets the given path options to each layer of the group that has a `setStyle` method.
        setStyle: function(style2) {
          return this.invoke("setStyle", style2);
        },
        // @method bringToFront(): this
        // Brings the layer group to the top of all other layers
        bringToFront: function() {
          return this.invoke("bringToFront");
        },
        // @method bringToBack(): this
        // Brings the layer group to the back of all other layers
        bringToBack: function() {
          return this.invoke("bringToBack");
        },
        // @method getBounds(): LatLngBounds
        // Returns the LatLngBounds of the Feature Group (created from bounds and coordinates of its children).
        getBounds: function() {
          var bounds = new LatLngBounds();
          for (var id in this._layers) {
            var layer = this._layers[id];
            bounds.extend(layer.getBounds ? layer.getBounds() : layer.getLatLng());
          }
          return bounds;
        }
      });
      var featureGroup = function(layers2, options) {
        return new FeatureGroup(layers2, options);
      };
      var Icon = Class.extend({
        /* @section
         * @aka Icon options
         *
         * @option iconUrl: String = null
         * **(required)** The URL to the icon image (absolute or relative to your script path).
         *
         * @option iconRetinaUrl: String = null
         * The URL to a retina sized version of the icon image (absolute or relative to your
         * script path). Used for Retina screen devices.
         *
         * @option iconSize: Point = null
         * Size of the icon image in pixels.
         *
         * @option iconAnchor: Point = null
         * The coordinates of the "tip" of the icon (relative to its top left corner). The icon
         * will be aligned so that this point is at the marker's geographical location. Centered
         * by default if size is specified, also can be set in CSS with negative margins.
         *
         * @option popupAnchor: Point = [0, 0]
         * The coordinates of the point from which popups will "open", relative to the icon anchor.
         *
         * @option tooltipAnchor: Point = [0, 0]
         * The coordinates of the point from which tooltips will "open", relative to the icon anchor.
         *
         * @option shadowUrl: String = null
         * The URL to the icon shadow image. If not specified, no shadow image will be created.
         *
         * @option shadowRetinaUrl: String = null
         *
         * @option shadowSize: Point = null
         * Size of the shadow image in pixels.
         *
         * @option shadowAnchor: Point = null
         * The coordinates of the "tip" of the shadow (relative to its top left corner) (the same
         * as iconAnchor if not specified).
         *
         * @option className: String = ''
         * A custom class name to assign to both icon and shadow images. Empty by default.
         */
        options: {
          popupAnchor: [0, 0],
          tooltipAnchor: [0, 0],
          // @option crossOrigin: Boolean|String = false
          // Whether the crossOrigin attribute will be added to the tiles.
          // If a String is provided, all tiles will have their crossOrigin attribute set to the String provided. This is needed if you want to access tile pixel data.
          // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
          crossOrigin: false
        },
        initialize: function(options) {
          setOptions(this, options);
        },
        // @method createIcon(oldIcon?: HTMLElement): HTMLElement
        // Called internally when the icon has to be shown, returns a `<img>` HTML element
        // styled according to the options.
        createIcon: function(oldIcon) {
          return this._createIcon("icon", oldIcon);
        },
        // @method createShadow(oldIcon?: HTMLElement): HTMLElement
        // As `createIcon`, but for the shadow beneath it.
        createShadow: function(oldIcon) {
          return this._createIcon("shadow", oldIcon);
        },
        _createIcon: function(name, oldIcon) {
          var src = this._getIconUrl(name);
          if (!src) {
            if (name === "icon") {
              throw new Error("iconUrl not set in Icon options (see the docs).");
            }
            return null;
          }
          var img = this._createImg(src, oldIcon && oldIcon.tagName === "IMG" ? oldIcon : null);
          this._setIconStyles(img, name);
          if (this.options.crossOrigin || this.options.crossOrigin === "") {
            img.crossOrigin = this.options.crossOrigin === true ? "" : this.options.crossOrigin;
          }
          return img;
        },
        _setIconStyles: function(img, name) {
          var options = this.options;
          var sizeOption = options[name + "Size"];
          if (typeof sizeOption === "number") {
            sizeOption = [sizeOption, sizeOption];
          }
          var size = toPoint(sizeOption), anchor = toPoint(name === "shadow" && options.shadowAnchor || options.iconAnchor || size && size.divideBy(2, true));
          img.className = "leaflet-marker-" + name + " " + (options.className || "");
          if (anchor) {
            img.style.marginLeft = -anchor.x + "px";
            img.style.marginTop = -anchor.y + "px";
          }
          if (size) {
            img.style.width = size.x + "px";
            img.style.height = size.y + "px";
          }
        },
        _createImg: function(src, el) {
          el = el || document.createElement("img");
          el.src = src;
          return el;
        },
        _getIconUrl: function(name) {
          return Browser.retina && this.options[name + "RetinaUrl"] || this.options[name + "Url"];
        }
      });
      function icon(options) {
        return new Icon(options);
      }
      var IconDefault = Icon.extend({
        options: {
          iconUrl: "marker-icon.png",
          iconRetinaUrl: "marker-icon-2x.png",
          shadowUrl: "marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          tooltipAnchor: [16, -28],
          shadowSize: [41, 41]
        },
        _getIconUrl: function(name) {
          if (typeof IconDefault.imagePath !== "string") {
            IconDefault.imagePath = this._detectIconPath();
          }
          return (this.options.imagePath || IconDefault.imagePath) + Icon.prototype._getIconUrl.call(this, name);
        },
        _stripUrl: function(path) {
          var strip = function(str, re, idx) {
            var match = re.exec(str);
            return match && match[idx];
          };
          path = strip(path, /^url\((['"])?(.+)\1\)$/, 2);
          return path && strip(path, /^(.*)marker-icon\.png$/, 1);
        },
        _detectIconPath: function() {
          var el = create$1("div", "leaflet-default-icon-path", document.body);
          var path = getStyle(el, "background-image") || getStyle(el, "backgroundImage");
          document.body.removeChild(el);
          path = this._stripUrl(path);
          if (path) {
            return path;
          }
          var link = document.querySelector('link[href$="leaflet.css"]');
          if (!link) {
            return "";
          }
          return link.href.substring(0, link.href.length - "leaflet.css".length - 1);
        }
      });
      var MarkerDrag = Handler.extend({
        initialize: function(marker2) {
          this._marker = marker2;
        },
        addHooks: function() {
          var icon2 = this._marker._icon;
          if (!this._draggable) {
            this._draggable = new Draggable(icon2, icon2, true);
          }
          this._draggable.on({
            dragstart: this._onDragStart,
            predrag: this._onPreDrag,
            drag: this._onDrag,
            dragend: this._onDragEnd
          }, this).enable();
          addClass(icon2, "leaflet-marker-draggable");
        },
        removeHooks: function() {
          this._draggable.off({
            dragstart: this._onDragStart,
            predrag: this._onPreDrag,
            drag: this._onDrag,
            dragend: this._onDragEnd
          }, this).disable();
          if (this._marker._icon) {
            removeClass(this._marker._icon, "leaflet-marker-draggable");
          }
        },
        moved: function() {
          return this._draggable && this._draggable._moved;
        },
        _adjustPan: function(e) {
          var marker2 = this._marker, map = marker2._map, speed = this._marker.options.autoPanSpeed, padding = this._marker.options.autoPanPadding, iconPos = getPosition(marker2._icon), bounds = map.getPixelBounds(), origin = map.getPixelOrigin();
          var panBounds = toBounds(
            bounds.min._subtract(origin).add(padding),
            bounds.max._subtract(origin).subtract(padding)
          );
          if (!panBounds.contains(iconPos)) {
            var movement = toPoint(
              (Math.max(panBounds.max.x, iconPos.x) - panBounds.max.x) / (bounds.max.x - panBounds.max.x) - (Math.min(panBounds.min.x, iconPos.x) - panBounds.min.x) / (bounds.min.x - panBounds.min.x),
              (Math.max(panBounds.max.y, iconPos.y) - panBounds.max.y) / (bounds.max.y - panBounds.max.y) - (Math.min(panBounds.min.y, iconPos.y) - panBounds.min.y) / (bounds.min.y - panBounds.min.y)
            ).multiplyBy(speed);
            map.panBy(movement, { animate: false });
            this._draggable._newPos._add(movement);
            this._draggable._startPos._add(movement);
            setPosition(marker2._icon, this._draggable._newPos);
            this._onDrag(e);
            this._panRequest = requestAnimFrame(this._adjustPan.bind(this, e));
          }
        },
        _onDragStart: function() {
          this._oldLatLng = this._marker.getLatLng();
          this._marker.closePopup && this._marker.closePopup();
          this._marker.fire("movestart").fire("dragstart");
        },
        _onPreDrag: function(e) {
          if (this._marker.options.autoPan) {
            cancelAnimFrame(this._panRequest);
            this._panRequest = requestAnimFrame(this._adjustPan.bind(this, e));
          }
        },
        _onDrag: function(e) {
          var marker2 = this._marker, shadow = marker2._shadow, iconPos = getPosition(marker2._icon), latlng = marker2._map.layerPointToLatLng(iconPos);
          if (shadow) {
            setPosition(shadow, iconPos);
          }
          marker2._latlng = latlng;
          e.latlng = latlng;
          e.oldLatLng = this._oldLatLng;
          marker2.fire("move", e).fire("drag", e);
        },
        _onDragEnd: function(e) {
          cancelAnimFrame(this._panRequest);
          delete this._oldLatLng;
          this._marker.fire("moveend").fire("dragend", e);
        }
      });
      var Marker = Layer.extend({
        // @section
        // @aka Marker options
        options: {
          // @option icon: Icon = *
          // Icon instance to use for rendering the marker.
          // See [Icon documentation](#L.Icon) for details on how to customize the marker icon.
          // If not specified, a common instance of `L.Icon.Default` is used.
          icon: new IconDefault(),
          // Option inherited from "Interactive layer" abstract class
          interactive: true,
          // @option keyboard: Boolean = true
          // Whether the marker can be tabbed to with a keyboard and clicked by pressing enter.
          keyboard: true,
          // @option title: String = ''
          // Text for the browser tooltip that appear on marker hover (no tooltip by default).
          // [Useful for accessibility](https://leafletjs.com/examples/accessibility/#markers-must-be-labelled).
          title: "",
          // @option alt: String = 'Marker'
          // Text for the `alt` attribute of the icon image.
          // [Useful for accessibility](https://leafletjs.com/examples/accessibility/#markers-must-be-labelled).
          alt: "Marker",
          // @option zIndexOffset: Number = 0
          // By default, marker images zIndex is set automatically based on its latitude. Use this option if you want to put the marker on top of all others (or below), specifying a high value like `1000` (or high negative value, respectively).
          zIndexOffset: 0,
          // @option opacity: Number = 1.0
          // The opacity of the marker.
          opacity: 1,
          // @option riseOnHover: Boolean = false
          // If `true`, the marker will get on top of others when you hover the mouse over it.
          riseOnHover: false,
          // @option riseOffset: Number = 250
          // The z-index offset used for the `riseOnHover` feature.
          riseOffset: 250,
          // @option pane: String = 'markerPane'
          // `Map pane` where the markers icon will be added.
          pane: "markerPane",
          // @option shadowPane: String = 'shadowPane'
          // `Map pane` where the markers shadow will be added.
          shadowPane: "shadowPane",
          // @option bubblingMouseEvents: Boolean = false
          // When `true`, a mouse event on this marker will trigger the same event on the map
          // (unless [`L.DomEvent.stopPropagation`](#domevent-stoppropagation) is used).
          bubblingMouseEvents: false,
          // @option autoPanOnFocus: Boolean = true
          // When `true`, the map will pan whenever the marker is focused (via
          // e.g. pressing `tab` on the keyboard) to ensure the marker is
          // visible within the map's bounds
          autoPanOnFocus: true,
          // @section Draggable marker options
          // @option draggable: Boolean = false
          // Whether the marker is draggable with mouse/touch or not.
          draggable: false,
          // @option autoPan: Boolean = false
          // Whether to pan the map when dragging this marker near its edge or not.
          autoPan: false,
          // @option autoPanPadding: Point = Point(50, 50)
          // Distance (in pixels to the left/right and to the top/bottom) of the
          // map edge to start panning the map.
          autoPanPadding: [50, 50],
          // @option autoPanSpeed: Number = 10
          // Number of pixels the map should pan by.
          autoPanSpeed: 10
        },
        /* @section
         *
         * In addition to [shared layer methods](#Layer) like `addTo()` and `remove()` and [popup methods](#Popup) like bindPopup() you can also use the following methods:
         */
        initialize: function(latlng, options) {
          setOptions(this, options);
          this._latlng = toLatLng(latlng);
        },
        onAdd: function(map) {
          this._zoomAnimated = this._zoomAnimated && map.options.markerZoomAnimation;
          if (this._zoomAnimated) {
            map.on("zoomanim", this._animateZoom, this);
          }
          this._initIcon();
          this.update();
        },
        onRemove: function(map) {
          if (this.dragging && this.dragging.enabled()) {
            this.options.draggable = true;
            this.dragging.removeHooks();
          }
          delete this.dragging;
          if (this._zoomAnimated) {
            map.off("zoomanim", this._animateZoom, this);
          }
          this._removeIcon();
          this._removeShadow();
        },
        getEvents: function() {
          return {
            zoom: this.update,
            viewreset: this.update
          };
        },
        // @method getLatLng: LatLng
        // Returns the current geographical position of the marker.
        getLatLng: function() {
          return this._latlng;
        },
        // @method setLatLng(latlng: LatLng): this
        // Changes the marker position to the given point.
        setLatLng: function(latlng) {
          var oldLatLng = this._latlng;
          this._latlng = toLatLng(latlng);
          this.update();
          return this.fire("move", { oldLatLng, latlng: this._latlng });
        },
        // @method setZIndexOffset(offset: Number): this
        // Changes the [zIndex offset](#marker-zindexoffset) of the marker.
        setZIndexOffset: function(offset) {
          this.options.zIndexOffset = offset;
          return this.update();
        },
        // @method getIcon: Icon
        // Returns the current icon used by the marker
        getIcon: function() {
          return this.options.icon;
        },
        // @method setIcon(icon: Icon): this
        // Changes the marker icon.
        setIcon: function(icon2) {
          this.options.icon = icon2;
          if (this._map) {
            this._initIcon();
            this.update();
          }
          if (this._popup) {
            this.bindPopup(this._popup, this._popup.options);
          }
          return this;
        },
        getElement: function() {
          return this._icon;
        },
        update: function() {
          if (this._icon && this._map) {
            var pos = this._map.latLngToLayerPoint(this._latlng).round();
            this._setPos(pos);
          }
          return this;
        },
        _initIcon: function() {
          var options = this.options, classToAdd = "leaflet-zoom-" + (this._zoomAnimated ? "animated" : "hide");
          var icon2 = options.icon.createIcon(this._icon), addIcon = false;
          if (icon2 !== this._icon) {
            if (this._icon) {
              this._removeIcon();
            }
            addIcon = true;
            if (options.title) {
              icon2.title = options.title;
            }
            if (icon2.tagName === "IMG") {
              icon2.alt = options.alt || "";
            }
          }
          addClass(icon2, classToAdd);
          if (options.keyboard) {
            icon2.tabIndex = "0";
            icon2.setAttribute("role", "button");
          }
          this._icon = icon2;
          if (options.riseOnHover) {
            this.on({
              mouseover: this._bringToFront,
              mouseout: this._resetZIndex
            });
          }
          if (this.options.autoPanOnFocus) {
            on(icon2, "focus", this._panOnFocus, this);
          }
          var newShadow = options.icon.createShadow(this._shadow), addShadow = false;
          if (newShadow !== this._shadow) {
            this._removeShadow();
            addShadow = true;
          }
          if (newShadow) {
            addClass(newShadow, classToAdd);
            newShadow.alt = "";
          }
          this._shadow = newShadow;
          if (options.opacity < 1) {
            this._updateOpacity();
          }
          if (addIcon) {
            this.getPane().appendChild(this._icon);
          }
          this._initInteraction();
          if (newShadow && addShadow) {
            this.getPane(options.shadowPane).appendChild(this._shadow);
          }
        },
        _removeIcon: function() {
          if (this.options.riseOnHover) {
            this.off({
              mouseover: this._bringToFront,
              mouseout: this._resetZIndex
            });
          }
          if (this.options.autoPanOnFocus) {
            off(this._icon, "focus", this._panOnFocus, this);
          }
          remove(this._icon);
          this.removeInteractiveTarget(this._icon);
          this._icon = null;
        },
        _removeShadow: function() {
          if (this._shadow) {
            remove(this._shadow);
          }
          this._shadow = null;
        },
        _setPos: function(pos) {
          if (this._icon) {
            setPosition(this._icon, pos);
          }
          if (this._shadow) {
            setPosition(this._shadow, pos);
          }
          this._zIndex = pos.y + this.options.zIndexOffset;
          this._resetZIndex();
        },
        _updateZIndex: function(offset) {
          if (this._icon) {
            this._icon.style.zIndex = this._zIndex + offset;
          }
        },
        _animateZoom: function(opt) {
          var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center).round();
          this._setPos(pos);
        },
        _initInteraction: function() {
          if (!this.options.interactive) {
            return;
          }
          addClass(this._icon, "leaflet-interactive");
          this.addInteractiveTarget(this._icon);
          if (MarkerDrag) {
            var draggable = this.options.draggable;
            if (this.dragging) {
              draggable = this.dragging.enabled();
              this.dragging.disable();
            }
            this.dragging = new MarkerDrag(this);
            if (draggable) {
              this.dragging.enable();
            }
          }
        },
        // @method setOpacity(opacity: Number): this
        // Changes the opacity of the marker.
        setOpacity: function(opacity) {
          this.options.opacity = opacity;
          if (this._map) {
            this._updateOpacity();
          }
          return this;
        },
        _updateOpacity: function() {
          var opacity = this.options.opacity;
          if (this._icon) {
            setOpacity(this._icon, opacity);
          }
          if (this._shadow) {
            setOpacity(this._shadow, opacity);
          }
        },
        _bringToFront: function() {
          this._updateZIndex(this.options.riseOffset);
        },
        _resetZIndex: function() {
          this._updateZIndex(0);
        },
        _panOnFocus: function() {
          var map = this._map;
          if (!map) {
            return;
          }
          var iconOpts = this.options.icon.options;
          var size = iconOpts.iconSize ? toPoint(iconOpts.iconSize) : toPoint(0, 0);
          var anchor = iconOpts.iconAnchor ? toPoint(iconOpts.iconAnchor) : toPoint(0, 0);
          map.panInside(this._latlng, {
            paddingTopLeft: anchor,
            paddingBottomRight: size.subtract(anchor)
          });
        },
        _getPopupAnchor: function() {
          return this.options.icon.options.popupAnchor;
        },
        _getTooltipAnchor: function() {
          return this.options.icon.options.tooltipAnchor;
        }
      });
      function marker(latlng, options) {
        return new Marker(latlng, options);
      }
      var Path = Layer.extend({
        // @section
        // @aka Path options
        options: {
          // @option stroke: Boolean = true
          // Whether to draw stroke along the path. Set it to `false` to disable borders on polygons or circles.
          stroke: true,
          // @option color: String = '#3388ff'
          // Stroke color
          color: "#3388ff",
          // @option weight: Number = 3
          // Stroke width in pixels
          weight: 3,
          // @option opacity: Number = 1.0
          // Stroke opacity
          opacity: 1,
          // @option lineCap: String= 'round'
          // A string that defines [shape to be used at the end](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-linecap) of the stroke.
          lineCap: "round",
          // @option lineJoin: String = 'round'
          // A string that defines [shape to be used at the corners](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-linejoin) of the stroke.
          lineJoin: "round",
          // @option dashArray: String = null
          // A string that defines the stroke [dash pattern](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dasharray). Doesn't work on `Canvas`-powered layers in [some old browsers](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setLineDash#Browser_compatibility).
          dashArray: null,
          // @option dashOffset: String = null
          // A string that defines the [distance into the dash pattern to start the dash](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dashoffset). Doesn't work on `Canvas`-powered layers in [some old browsers](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setLineDash#Browser_compatibility).
          dashOffset: null,
          // @option fill: Boolean = depends
          // Whether to fill the path with color. Set it to `false` to disable filling on polygons or circles.
          fill: false,
          // @option fillColor: String = *
          // Fill color. Defaults to the value of the [`color`](#path-color) option
          fillColor: null,
          // @option fillOpacity: Number = 0.2
          // Fill opacity.
          fillOpacity: 0.2,
          // @option fillRule: String = 'evenodd'
          // A string that defines [how the inside of a shape](https://developer.mozilla.org/docs/Web/SVG/Attribute/fill-rule) is determined.
          fillRule: "evenodd",
          // className: '',
          // Option inherited from "Interactive layer" abstract class
          interactive: true,
          // @option bubblingMouseEvents: Boolean = true
          // When `true`, a mouse event on this path will trigger the same event on the map
          // (unless [`L.DomEvent.stopPropagation`](#domevent-stoppropagation) is used).
          bubblingMouseEvents: true
        },
        beforeAdd: function(map) {
          this._renderer = map.getRenderer(this);
        },
        onAdd: function() {
          this._renderer._initPath(this);
          this._reset();
          this._renderer._addPath(this);
        },
        onRemove: function() {
          this._renderer._removePath(this);
        },
        // @method redraw(): this
        // Redraws the layer. Sometimes useful after you changed the coordinates that the path uses.
        redraw: function() {
          if (this._map) {
            this._renderer._updatePath(this);
          }
          return this;
        },
        // @method setStyle(style: Path options): this
        // Changes the appearance of a Path based on the options in the `Path options` object.
        setStyle: function(style2) {
          setOptions(this, style2);
          if (this._renderer) {
            this._renderer._updateStyle(this);
            if (this.options.stroke && style2 && Object.prototype.hasOwnProperty.call(style2, "weight")) {
              this._updateBounds();
            }
          }
          return this;
        },
        // @method bringToFront(): this
        // Brings the layer to the top of all path layers.
        bringToFront: function() {
          if (this._renderer) {
            this._renderer._bringToFront(this);
          }
          return this;
        },
        // @method bringToBack(): this
        // Brings the layer to the bottom of all path layers.
        bringToBack: function() {
          if (this._renderer) {
            this._renderer._bringToBack(this);
          }
          return this;
        },
        getElement: function() {
          return this._path;
        },
        _reset: function() {
          this._project();
          this._update();
        },
        _clickTolerance: function() {
          return (this.options.stroke ? this.options.weight / 2 : 0) + (this._renderer.options.tolerance || 0);
        }
      });
      var CircleMarker = Path.extend({
        // @section
        // @aka CircleMarker options
        options: {
          fill: true,
          // @option radius: Number = 10
          // Radius of the circle marker, in pixels
          radius: 10
        },
        initialize: function(latlng, options) {
          setOptions(this, options);
          this._latlng = toLatLng(latlng);
          this._radius = this.options.radius;
        },
        // @method setLatLng(latLng: LatLng): this
        // Sets the position of a circle marker to a new location.
        setLatLng: function(latlng) {
          var oldLatLng = this._latlng;
          this._latlng = toLatLng(latlng);
          this.redraw();
          return this.fire("move", { oldLatLng, latlng: this._latlng });
        },
        // @method getLatLng(): LatLng
        // Returns the current geographical position of the circle marker
        getLatLng: function() {
          return this._latlng;
        },
        // @method setRadius(radius: Number): this
        // Sets the radius of a circle marker. Units are in pixels.
        setRadius: function(radius) {
          this.options.radius = this._radius = radius;
          return this.redraw();
        },
        // @method getRadius(): Number
        // Returns the current radius of the circle
        getRadius: function() {
          return this._radius;
        },
        setStyle: function(options) {
          var radius = options && options.radius || this._radius;
          Path.prototype.setStyle.call(this, options);
          this.setRadius(radius);
          return this;
        },
        _project: function() {
          this._point = this._map.latLngToLayerPoint(this._latlng);
          this._updateBounds();
        },
        _updateBounds: function() {
          var r = this._radius, r23 = this._radiusY || r, w = this._clickTolerance(), p = [r + w, r23 + w];
          this._pxBounds = new Bounds(this._point.subtract(p), this._point.add(p));
        },
        _update: function() {
          if (this._map) {
            this._updatePath();
          }
        },
        _updatePath: function() {
          this._renderer._updateCircle(this);
        },
        _empty: function() {
          return this._radius && !this._renderer._bounds.intersects(this._pxBounds);
        },
        // Needed by the `Canvas` renderer for interactivity
        _containsPoint: function(p) {
          return p.distanceTo(this._point) <= this._radius + this._clickTolerance();
        }
      });
      function circleMarker(latlng, options) {
        return new CircleMarker(latlng, options);
      }
      var Circle = CircleMarker.extend({
        initialize: function(latlng, options, legacyOptions) {
          if (typeof options === "number") {
            options = extend({}, legacyOptions, { radius: options });
          }
          setOptions(this, options);
          this._latlng = toLatLng(latlng);
          if (isNaN(this.options.radius)) {
            throw new Error("Circle radius cannot be NaN");
          }
          this._mRadius = this.options.radius;
        },
        // @method setRadius(radius: Number): this
        // Sets the radius of a circle. Units are in meters.
        setRadius: function(radius) {
          this._mRadius = radius;
          return this.redraw();
        },
        // @method getRadius(): Number
        // Returns the current radius of a circle. Units are in meters.
        getRadius: function() {
          return this._mRadius;
        },
        // @method getBounds(): LatLngBounds
        // Returns the `LatLngBounds` of the path.
        getBounds: function() {
          var half = [this._radius, this._radiusY || this._radius];
          return new LatLngBounds(
            this._map.layerPointToLatLng(this._point.subtract(half)),
            this._map.layerPointToLatLng(this._point.add(half))
          );
        },
        setStyle: Path.prototype.setStyle,
        _project: function() {
          var lng = this._latlng.lng, lat = this._latlng.lat, map = this._map, crs = map.options.crs;
          if (crs.distance === Earth.distance) {
            var d = Math.PI / 180, latR = this._mRadius / Earth.R / d, top = map.project([lat + latR, lng]), bottom = map.project([lat - latR, lng]), p = top.add(bottom).divideBy(2), lat2 = map.unproject(p).lat, lngR = Math.acos((Math.cos(latR * d) - Math.sin(lat * d) * Math.sin(lat2 * d)) / (Math.cos(lat * d) * Math.cos(lat2 * d))) / d;
            if (isNaN(lngR) || lngR === 0) {
              lngR = latR / Math.cos(Math.PI / 180 * lat);
            }
            this._point = p.subtract(map.getPixelOrigin());
            this._radius = isNaN(lngR) ? 0 : p.x - map.project([lat2, lng - lngR]).x;
            this._radiusY = p.y - top.y;
          } else {
            var latlng2 = crs.unproject(crs.project(this._latlng).subtract([this._mRadius, 0]));
            this._point = map.latLngToLayerPoint(this._latlng);
            this._radius = this._point.x - map.latLngToLayerPoint(latlng2).x;
          }
          this._updateBounds();
        }
      });
      function circle(latlng, options, legacyOptions) {
        return new Circle(latlng, options, legacyOptions);
      }
      var Polyline = Path.extend({
        // @section
        // @aka Polyline options
        options: {
          // @option smoothFactor: Number = 1.0
          // How much to simplify the polyline on each zoom level. More means
          // better performance and smoother look, and less means more accurate representation.
          smoothFactor: 1,
          // @option noClip: Boolean = false
          // Disable polyline clipping.
          noClip: false
        },
        initialize: function(latlngs, options) {
          setOptions(this, options);
          this._setLatLngs(latlngs);
        },
        // @method getLatLngs(): LatLng[]
        // Returns an array of the points in the path, or nested arrays of points in case of multi-polyline.
        getLatLngs: function() {
          return this._latlngs;
        },
        // @method setLatLngs(latlngs: LatLng[]): this
        // Replaces all the points in the polyline with the given array of geographical points.
        setLatLngs: function(latlngs) {
          this._setLatLngs(latlngs);
          return this.redraw();
        },
        // @method isEmpty(): Boolean
        // Returns `true` if the Polyline has no LatLngs.
        isEmpty: function() {
          return !this._latlngs.length;
        },
        // @method closestLayerPoint(p: Point): Point
        // Returns the point closest to `p` on the Polyline.
        closestLayerPoint: function(p) {
          var minDistance = Infinity, minPoint = null, closest = _sqClosestPointOnSegment, p1, p2;
          for (var j = 0, jLen = this._parts.length; j < jLen; j++) {
            var points = this._parts[j];
            for (var i = 1, len = points.length; i < len; i++) {
              p1 = points[i - 1];
              p2 = points[i];
              var sqDist = closest(p, p1, p2, true);
              if (sqDist < minDistance) {
                minDistance = sqDist;
                minPoint = closest(p, p1, p2);
              }
            }
          }
          if (minPoint) {
            minPoint.distance = Math.sqrt(minDistance);
          }
          return minPoint;
        },
        // @method getCenter(): LatLng
        // Returns the center ([centroid](https://en.wikipedia.org/wiki/Centroid)) of the polyline.
        getCenter: function() {
          if (!this._map) {
            throw new Error("Must add layer to map before using getCenter()");
          }
          return polylineCenter(this._defaultShape(), this._map.options.crs);
        },
        // @method getBounds(): LatLngBounds
        // Returns the `LatLngBounds` of the path.
        getBounds: function() {
          return this._bounds;
        },
        // @method addLatLng(latlng: LatLng, latlngs?: LatLng[]): this
        // Adds a given point to the polyline. By default, adds to the first ring of
        // the polyline in case of a multi-polyline, but can be overridden by passing
        // a specific ring as a LatLng array (that you can earlier access with [`getLatLngs`](#polyline-getlatlngs)).
        addLatLng: function(latlng, latlngs) {
          latlngs = latlngs || this._defaultShape();
          latlng = toLatLng(latlng);
          latlngs.push(latlng);
          this._bounds.extend(latlng);
          return this.redraw();
        },
        _setLatLngs: function(latlngs) {
          this._bounds = new LatLngBounds();
          this._latlngs = this._convertLatLngs(latlngs);
        },
        _defaultShape: function() {
          return isFlat(this._latlngs) ? this._latlngs : this._latlngs[0];
        },
        // recursively convert latlngs input into actual LatLng instances; calculate bounds along the way
        _convertLatLngs: function(latlngs) {
          var result = [], flat = isFlat(latlngs);
          for (var i = 0, len = latlngs.length; i < len; i++) {
            if (flat) {
              result[i] = toLatLng(latlngs[i]);
              this._bounds.extend(result[i]);
            } else {
              result[i] = this._convertLatLngs(latlngs[i]);
            }
          }
          return result;
        },
        _project: function() {
          var pxBounds = new Bounds();
          this._rings = [];
          this._projectLatlngs(this._latlngs, this._rings, pxBounds);
          if (this._bounds.isValid() && pxBounds.isValid()) {
            this._rawPxBounds = pxBounds;
            this._updateBounds();
          }
        },
        _updateBounds: function() {
          var w = this._clickTolerance(), p = new Point(w, w);
          if (!this._rawPxBounds) {
            return;
          }
          this._pxBounds = new Bounds([
            this._rawPxBounds.min.subtract(p),
            this._rawPxBounds.max.add(p)
          ]);
        },
        // recursively turns latlngs into a set of rings with projected coordinates
        _projectLatlngs: function(latlngs, result, projectedBounds) {
          var flat = latlngs[0] instanceof LatLng, len = latlngs.length, i, ring;
          if (flat) {
            ring = [];
            for (i = 0; i < len; i++) {
              ring[i] = this._map.latLngToLayerPoint(latlngs[i]);
              projectedBounds.extend(ring[i]);
            }
            result.push(ring);
          } else {
            for (i = 0; i < len; i++) {
              this._projectLatlngs(latlngs[i], result, projectedBounds);
            }
          }
        },
        // clip polyline by renderer bounds so that we have less to render for performance
        _clipPoints: function() {
          var bounds = this._renderer._bounds;
          this._parts = [];
          if (!this._pxBounds || !this._pxBounds.intersects(bounds)) {
            return;
          }
          if (this.options.noClip) {
            this._parts = this._rings;
            return;
          }
          var parts = this._parts, i, j, k, len, len2, segment, points;
          for (i = 0, k = 0, len = this._rings.length; i < len; i++) {
            points = this._rings[i];
            for (j = 0, len2 = points.length; j < len2 - 1; j++) {
              segment = clipSegment(points[j], points[j + 1], bounds, j, true);
              if (!segment) {
                continue;
              }
              parts[k] = parts[k] || [];
              parts[k].push(segment[0]);
              if (segment[1] !== points[j + 1] || j === len2 - 2) {
                parts[k].push(segment[1]);
                k++;
              }
            }
          }
        },
        // simplify each clipped part of the polyline for performance
        _simplifyPoints: function() {
          var parts = this._parts, tolerance = this.options.smoothFactor;
          for (var i = 0, len = parts.length; i < len; i++) {
            parts[i] = simplify(parts[i], tolerance);
          }
        },
        _update: function() {
          if (!this._map) {
            return;
          }
          this._clipPoints();
          this._simplifyPoints();
          this._updatePath();
        },
        _updatePath: function() {
          this._renderer._updatePoly(this);
        },
        // Needed by the `Canvas` renderer for interactivity
        _containsPoint: function(p, closed) {
          var i, j, k, len, len2, part, w = this._clickTolerance();
          if (!this._pxBounds || !this._pxBounds.contains(p)) {
            return false;
          }
          for (i = 0, len = this._parts.length; i < len; i++) {
            part = this._parts[i];
            for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
              if (!closed && j === 0) {
                continue;
              }
              if (pointToSegmentDistance(p, part[k], part[j]) <= w) {
                return true;
              }
            }
          }
          return false;
        }
      });
      function polyline(latlngs, options) {
        return new Polyline(latlngs, options);
      }
      Polyline._flat = _flat;
      var Polygon = Polyline.extend({
        options: {
          fill: true
        },
        isEmpty: function() {
          return !this._latlngs.length || !this._latlngs[0].length;
        },
        // @method getCenter(): LatLng
        // Returns the center ([centroid](http://en.wikipedia.org/wiki/Centroid)) of the Polygon.
        getCenter: function() {
          if (!this._map) {
            throw new Error("Must add layer to map before using getCenter()");
          }
          return polygonCenter(this._defaultShape(), this._map.options.crs);
        },
        _convertLatLngs: function(latlngs) {
          var result = Polyline.prototype._convertLatLngs.call(this, latlngs), len = result.length;
          if (len >= 2 && result[0] instanceof LatLng && result[0].equals(result[len - 1])) {
            result.pop();
          }
          return result;
        },
        _setLatLngs: function(latlngs) {
          Polyline.prototype._setLatLngs.call(this, latlngs);
          if (isFlat(this._latlngs)) {
            this._latlngs = [this._latlngs];
          }
        },
        _defaultShape: function() {
          return isFlat(this._latlngs[0]) ? this._latlngs[0] : this._latlngs[0][0];
        },
        _clipPoints: function() {
          var bounds = this._renderer._bounds, w = this.options.weight, p = new Point(w, w);
          bounds = new Bounds(bounds.min.subtract(p), bounds.max.add(p));
          this._parts = [];
          if (!this._pxBounds || !this._pxBounds.intersects(bounds)) {
            return;
          }
          if (this.options.noClip) {
            this._parts = this._rings;
            return;
          }
          for (var i = 0, len = this._rings.length, clipped; i < len; i++) {
            clipped = clipPolygon(this._rings[i], bounds, true);
            if (clipped.length) {
              this._parts.push(clipped);
            }
          }
        },
        _updatePath: function() {
          this._renderer._updatePoly(this, true);
        },
        // Needed by the `Canvas` renderer for interactivity
        _containsPoint: function(p) {
          var inside = false, part, p1, p2, i, j, k, len, len2;
          if (!this._pxBounds || !this._pxBounds.contains(p)) {
            return false;
          }
          for (i = 0, len = this._parts.length; i < len; i++) {
            part = this._parts[i];
            for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
              p1 = part[j];
              p2 = part[k];
              if (p1.y > p.y !== p2.y > p.y && p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x) {
                inside = !inside;
              }
            }
          }
          return inside || Polyline.prototype._containsPoint.call(this, p, true);
        }
      });
      function polygon(latlngs, options) {
        return new Polygon(latlngs, options);
      }
      var GeoJSON = FeatureGroup.extend({
        /* @section
         * @aka GeoJSON options
         *
         * @option pointToLayer: Function = *
         * A `Function` defining how GeoJSON points spawn Leaflet layers. It is internally
         * called when data is added, passing the GeoJSON point feature and its `LatLng`.
         * The default is to spawn a default `Marker`:
         * ```js
         * function(geoJsonPoint, latlng) {
         * 	return L.marker(latlng);
         * }
         * ```
         *
         * @option style: Function = *
         * A `Function` defining the `Path options` for styling GeoJSON lines and polygons,
         * called internally when data is added.
         * The default value is to not override any defaults:
         * ```js
         * function (geoJsonFeature) {
         * 	return {}
         * }
         * ```
         *
         * @option onEachFeature: Function = *
         * A `Function` that will be called once for each created `Feature`, after it has
         * been created and styled. Useful for attaching events and popups to features.
         * The default is to do nothing with the newly created layers:
         * ```js
         * function (feature, layer) {}
         * ```
         *
         * @option filter: Function = *
         * A `Function` that will be used to decide whether to include a feature or not.
         * The default is to include all features:
         * ```js
         * function (geoJsonFeature) {
         * 	return true;
         * }
         * ```
         * Note: dynamically changing the `filter` option will have effect only on newly
         * added data. It will _not_ re-evaluate already included features.
         *
         * @option coordsToLatLng: Function = *
         * A `Function` that will be used for converting GeoJSON coordinates to `LatLng`s.
         * The default is the `coordsToLatLng` static method.
         *
         * @option markersInheritOptions: Boolean = false
         * Whether default Markers for "Point" type Features inherit from group options.
         */
        initialize: function(geojson, options) {
          setOptions(this, options);
          this._layers = {};
          if (geojson) {
            this.addData(geojson);
          }
        },
        // @method addData( <GeoJSON> data ): this
        // Adds a GeoJSON object to the layer.
        addData: function(geojson) {
          var features = isArray(geojson) ? geojson : geojson.features, i, len, feature;
          if (features) {
            for (i = 0, len = features.length; i < len; i++) {
              feature = features[i];
              if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
                this.addData(feature);
              }
            }
            return this;
          }
          var options = this.options;
          if (options.filter && !options.filter(geojson)) {
            return this;
          }
          var layer = geometryToLayer(geojson, options);
          if (!layer) {
            return this;
          }
          layer.feature = asFeature(geojson);
          layer.defaultOptions = layer.options;
          this.resetStyle(layer);
          if (options.onEachFeature) {
            options.onEachFeature(geojson, layer);
          }
          return this.addLayer(layer);
        },
        // @method resetStyle( <Path> layer? ): this
        // Resets the given vector layer's style to the original GeoJSON style, useful for resetting style after hover events.
        // If `layer` is omitted, the style of all features in the current layer is reset.
        resetStyle: function(layer) {
          if (layer === void 0) {
            return this.eachLayer(this.resetStyle, this);
          }
          layer.options = extend({}, layer.defaultOptions);
          this._setLayerStyle(layer, this.options.style);
          return this;
        },
        // @method setStyle( <Function> style ): this
        // Changes styles of GeoJSON vector layers with the given style function.
        setStyle: function(style2) {
          return this.eachLayer(function(layer) {
            this._setLayerStyle(layer, style2);
          }, this);
        },
        _setLayerStyle: function(layer, style2) {
          if (layer.setStyle) {
            if (typeof style2 === "function") {
              style2 = style2(layer.feature);
            }
            layer.setStyle(style2);
          }
        }
      });
      function geometryToLayer(geojson, options) {
        var geometry = geojson.type === "Feature" ? geojson.geometry : geojson, coords = geometry ? geometry.coordinates : null, layers2 = [], pointToLayer = options && options.pointToLayer, _coordsToLatLng = options && options.coordsToLatLng || coordsToLatLng, latlng, latlngs, i, len;
        if (!coords && !geometry) {
          return null;
        }
        switch (geometry.type) {
          case "Point":
            latlng = _coordsToLatLng(coords);
            return _pointToLayer(pointToLayer, geojson, latlng, options);
          case "MultiPoint":
            for (i = 0, len = coords.length; i < len; i++) {
              latlng = _coordsToLatLng(coords[i]);
              layers2.push(_pointToLayer(pointToLayer, geojson, latlng, options));
            }
            return new FeatureGroup(layers2);
          case "LineString":
          case "MultiLineString":
            latlngs = coordsToLatLngs(coords, geometry.type === "LineString" ? 0 : 1, _coordsToLatLng);
            return new Polyline(latlngs, options);
          case "Polygon":
          case "MultiPolygon":
            latlngs = coordsToLatLngs(coords, geometry.type === "Polygon" ? 1 : 2, _coordsToLatLng);
            return new Polygon(latlngs, options);
          case "GeometryCollection":
            for (i = 0, len = geometry.geometries.length; i < len; i++) {
              var geoLayer = geometryToLayer({
                geometry: geometry.geometries[i],
                type: "Feature",
                properties: geojson.properties
              }, options);
              if (geoLayer) {
                layers2.push(geoLayer);
              }
            }
            return new FeatureGroup(layers2);
          case "FeatureCollection":
            for (i = 0, len = geometry.features.length; i < len; i++) {
              var featureLayer = geometryToLayer(geometry.features[i], options);
              if (featureLayer) {
                layers2.push(featureLayer);
              }
            }
            return new FeatureGroup(layers2);
          default:
            throw new Error("Invalid GeoJSON object.");
        }
      }
      function _pointToLayer(pointToLayerFn, geojson, latlng, options) {
        return pointToLayerFn ? pointToLayerFn(geojson, latlng) : new Marker(latlng, options && options.markersInheritOptions && options);
      }
      function coordsToLatLng(coords) {
        return new LatLng(coords[1], coords[0], coords[2]);
      }
      function coordsToLatLngs(coords, levelsDeep, _coordsToLatLng) {
        var latlngs = [];
        for (var i = 0, len = coords.length, latlng; i < len; i++) {
          latlng = levelsDeep ? coordsToLatLngs(coords[i], levelsDeep - 1, _coordsToLatLng) : (_coordsToLatLng || coordsToLatLng)(coords[i]);
          latlngs.push(latlng);
        }
        return latlngs;
      }
      function latLngToCoords(latlng, precision) {
        latlng = toLatLng(latlng);
        return latlng.alt !== void 0 ? [formatNum(latlng.lng, precision), formatNum(latlng.lat, precision), formatNum(latlng.alt, precision)] : [formatNum(latlng.lng, precision), formatNum(latlng.lat, precision)];
      }
      function latLngsToCoords(latlngs, levelsDeep, closed, precision) {
        var coords = [];
        for (var i = 0, len = latlngs.length; i < len; i++) {
          coords.push(levelsDeep ? latLngsToCoords(latlngs[i], isFlat(latlngs[i]) ? 0 : levelsDeep - 1, closed, precision) : latLngToCoords(latlngs[i], precision));
        }
        if (!levelsDeep && closed && coords.length > 0) {
          coords.push(coords[0].slice());
        }
        return coords;
      }
      function getFeature(layer, newGeometry) {
        return layer.feature ? extend({}, layer.feature, { geometry: newGeometry }) : asFeature(newGeometry);
      }
      function asFeature(geojson) {
        if (geojson.type === "Feature" || geojson.type === "FeatureCollection") {
          return geojson;
        }
        return {
          type: "Feature",
          properties: {},
          geometry: geojson
        };
      }
      var PointToGeoJSON = {
        toGeoJSON: function(precision) {
          return getFeature(this, {
            type: "Point",
            coordinates: latLngToCoords(this.getLatLng(), precision)
          });
        }
      };
      Marker.include(PointToGeoJSON);
      Circle.include(PointToGeoJSON);
      CircleMarker.include(PointToGeoJSON);
      Polyline.include({
        toGeoJSON: function(precision) {
          var multi = !isFlat(this._latlngs);
          var coords = latLngsToCoords(this._latlngs, multi ? 1 : 0, false, precision);
          return getFeature(this, {
            type: (multi ? "Multi" : "") + "LineString",
            coordinates: coords
          });
        }
      });
      Polygon.include({
        toGeoJSON: function(precision) {
          var holes = !isFlat(this._latlngs), multi = holes && !isFlat(this._latlngs[0]);
          var coords = latLngsToCoords(this._latlngs, multi ? 2 : holes ? 1 : 0, true, precision);
          if (!holes) {
            coords = [coords];
          }
          return getFeature(this, {
            type: (multi ? "Multi" : "") + "Polygon",
            coordinates: coords
          });
        }
      });
      LayerGroup.include({
        toMultiPoint: function(precision) {
          var coords = [];
          this.eachLayer(function(layer) {
            coords.push(layer.toGeoJSON(precision).geometry.coordinates);
          });
          return getFeature(this, {
            type: "MultiPoint",
            coordinates: coords
          });
        },
        // @method toGeoJSON(precision?: Number|false): Object
        // Coordinates values are rounded with [`formatNum`](#util-formatnum) function with given `precision`.
        // Returns a [`GeoJSON`](https://en.wikipedia.org/wiki/GeoJSON) representation of the layer group (as a GeoJSON `FeatureCollection`, `GeometryCollection`, or `MultiPoint`).
        toGeoJSON: function(precision) {
          var type = this.feature && this.feature.geometry && this.feature.geometry.type;
          if (type === "MultiPoint") {
            return this.toMultiPoint(precision);
          }
          var isGeometryCollection = type === "GeometryCollection", jsons = [];
          this.eachLayer(function(layer) {
            if (layer.toGeoJSON) {
              var json = layer.toGeoJSON(precision);
              if (isGeometryCollection) {
                jsons.push(json.geometry);
              } else {
                var feature = asFeature(json);
                if (feature.type === "FeatureCollection") {
                  jsons.push.apply(jsons, feature.features);
                } else {
                  jsons.push(feature);
                }
              }
            }
          });
          if (isGeometryCollection) {
            return getFeature(this, {
              geometries: jsons,
              type: "GeometryCollection"
            });
          }
          return {
            type: "FeatureCollection",
            features: jsons
          };
        }
      });
      function geoJSON(geojson, options) {
        return new GeoJSON(geojson, options);
      }
      var geoJson = geoJSON;
      var ImageOverlay = Layer.extend({
        // @section
        // @aka ImageOverlay options
        options: {
          // @option opacity: Number = 1.0
          // The opacity of the image overlay.
          opacity: 1,
          // @option alt: String = ''
          // Text for the `alt` attribute of the image (useful for accessibility).
          alt: "",
          // @option interactive: Boolean = false
          // If `true`, the image overlay will emit [mouse events](#interactive-layer) when clicked or hovered.
          interactive: false,
          // @option crossOrigin: Boolean|String = false
          // Whether the crossOrigin attribute will be added to the image.
          // If a String is provided, the image will have its crossOrigin attribute set to the String provided. This is needed if you want to access image pixel data.
          // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
          crossOrigin: false,
          // @option errorOverlayUrl: String = ''
          // URL to the overlay image to show in place of the overlay that failed to load.
          errorOverlayUrl: "",
          // @option zIndex: Number = 1
          // The explicit [zIndex](https://developer.mozilla.org/docs/Web/CSS/CSS_Positioning/Understanding_z_index) of the overlay layer.
          zIndex: 1,
          // @option className: String = ''
          // A custom class name to assign to the image. Empty by default.
          className: ""
        },
        initialize: function(url, bounds, options) {
          this._url = url;
          this._bounds = toLatLngBounds(bounds);
          setOptions(this, options);
        },
        onAdd: function() {
          if (!this._image) {
            this._initImage();
            if (this.options.opacity < 1) {
              this._updateOpacity();
            }
          }
          if (this.options.interactive) {
            addClass(this._image, "leaflet-interactive");
            this.addInteractiveTarget(this._image);
          }
          this.getPane().appendChild(this._image);
          this._reset();
        },
        onRemove: function() {
          remove(this._image);
          if (this.options.interactive) {
            this.removeInteractiveTarget(this._image);
          }
        },
        // @method setOpacity(opacity: Number): this
        // Sets the opacity of the overlay.
        setOpacity: function(opacity) {
          this.options.opacity = opacity;
          if (this._image) {
            this._updateOpacity();
          }
          return this;
        },
        setStyle: function(styleOpts) {
          if (styleOpts.opacity) {
            this.setOpacity(styleOpts.opacity);
          }
          return this;
        },
        // @method bringToFront(): this
        // Brings the layer to the top of all overlays.
        bringToFront: function() {
          if (this._map) {
            toFront(this._image);
          }
          return this;
        },
        // @method bringToBack(): this
        // Brings the layer to the bottom of all overlays.
        bringToBack: function() {
          if (this._map) {
            toBack(this._image);
          }
          return this;
        },
        // @method setUrl(url: String): this
        // Changes the URL of the image.
        setUrl: function(url) {
          this._url = url;
          if (this._image) {
            this._image.src = url;
          }
          return this;
        },
        // @method setBounds(bounds: LatLngBounds): this
        // Update the bounds that this ImageOverlay covers
        setBounds: function(bounds) {
          this._bounds = toLatLngBounds(bounds);
          if (this._map) {
            this._reset();
          }
          return this;
        },
        getEvents: function() {
          var events = {
            zoom: this._reset,
            viewreset: this._reset
          };
          if (this._zoomAnimated) {
            events.zoomanim = this._animateZoom;
          }
          return events;
        },
        // @method setZIndex(value: Number): this
        // Changes the [zIndex](#imageoverlay-zindex) of the image overlay.
        setZIndex: function(value) {
          this.options.zIndex = value;
          this._updateZIndex();
          return this;
        },
        // @method getBounds(): LatLngBounds
        // Get the bounds that this ImageOverlay covers
        getBounds: function() {
          return this._bounds;
        },
        // @method getElement(): HTMLElement
        // Returns the instance of [`HTMLImageElement`](https://developer.mozilla.org/docs/Web/API/HTMLImageElement)
        // used by this overlay.
        getElement: function() {
          return this._image;
        },
        _initImage: function() {
          var wasElementSupplied = this._url.tagName === "IMG";
          var img = this._image = wasElementSupplied ? this._url : create$1("img");
          addClass(img, "leaflet-image-layer");
          if (this._zoomAnimated) {
            addClass(img, "leaflet-zoom-animated");
          }
          if (this.options.className) {
            addClass(img, this.options.className);
          }
          img.onselectstart = falseFn;
          img.onmousemove = falseFn;
          img.onload = bind(this.fire, this, "load");
          img.onerror = bind(this._overlayOnError, this, "error");
          if (this.options.crossOrigin || this.options.crossOrigin === "") {
            img.crossOrigin = this.options.crossOrigin === true ? "" : this.options.crossOrigin;
          }
          if (this.options.zIndex) {
            this._updateZIndex();
          }
          if (wasElementSupplied) {
            this._url = img.src;
            return;
          }
          img.src = this._url;
          img.alt = this.options.alt;
        },
        _animateZoom: function(e) {
          var scale2 = this._map.getZoomScale(e.zoom), offset = this._map._latLngBoundsToNewLayerBounds(this._bounds, e.zoom, e.center).min;
          setTransform(this._image, offset, scale2);
        },
        _reset: function() {
          var image = this._image, bounds = new Bounds(
            this._map.latLngToLayerPoint(this._bounds.getNorthWest()),
            this._map.latLngToLayerPoint(this._bounds.getSouthEast())
          ), size = bounds.getSize();
          setPosition(image, bounds.min);
          image.style.width = size.x + "px";
          image.style.height = size.y + "px";
        },
        _updateOpacity: function() {
          setOpacity(this._image, this.options.opacity);
        },
        _updateZIndex: function() {
          if (this._image && this.options.zIndex !== void 0 && this.options.zIndex !== null) {
            this._image.style.zIndex = this.options.zIndex;
          }
        },
        _overlayOnError: function() {
          this.fire("error");
          var errorUrl = this.options.errorOverlayUrl;
          if (errorUrl && this._url !== errorUrl) {
            this._url = errorUrl;
            this._image.src = errorUrl;
          }
        },
        // @method getCenter(): LatLng
        // Returns the center of the ImageOverlay.
        getCenter: function() {
          return this._bounds.getCenter();
        }
      });
      var imageOverlay = function(url, bounds, options) {
        return new ImageOverlay(url, bounds, options);
      };
      var VideoOverlay = ImageOverlay.extend({
        // @section
        // @aka VideoOverlay options
        options: {
          // @option autoplay: Boolean = true
          // Whether the video starts playing automatically when loaded.
          // On some browsers autoplay will only work with `muted: true`
          autoplay: true,
          // @option loop: Boolean = true
          // Whether the video will loop back to the beginning when played.
          loop: true,
          // @option keepAspectRatio: Boolean = true
          // Whether the video will save aspect ratio after the projection.
          // Relevant for supported browsers. See [browser compatibility](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit)
          keepAspectRatio: true,
          // @option muted: Boolean = false
          // Whether the video starts on mute when loaded.
          muted: false,
          // @option playsInline: Boolean = true
          // Mobile browsers will play the video right where it is instead of open it up in fullscreen mode.
          playsInline: true
        },
        _initImage: function() {
          var wasElementSupplied = this._url.tagName === "VIDEO";
          var vid = this._image = wasElementSupplied ? this._url : create$1("video");
          addClass(vid, "leaflet-image-layer");
          if (this._zoomAnimated) {
            addClass(vid, "leaflet-zoom-animated");
          }
          if (this.options.className) {
            addClass(vid, this.options.className);
          }
          vid.onselectstart = falseFn;
          vid.onmousemove = falseFn;
          vid.onloadeddata = bind(this.fire, this, "load");
          if (wasElementSupplied) {
            var sourceElements = vid.getElementsByTagName("source");
            var sources = [];
            for (var j = 0; j < sourceElements.length; j++) {
              sources.push(sourceElements[j].src);
            }
            this._url = sourceElements.length > 0 ? sources : [vid.src];
            return;
          }
          if (!isArray(this._url)) {
            this._url = [this._url];
          }
          if (!this.options.keepAspectRatio && Object.prototype.hasOwnProperty.call(vid.style, "objectFit")) {
            vid.style["objectFit"] = "fill";
          }
          vid.autoplay = !!this.options.autoplay;
          vid.loop = !!this.options.loop;
          vid.muted = !!this.options.muted;
          vid.playsInline = !!this.options.playsInline;
          for (var i = 0; i < this._url.length; i++) {
            var source = create$1("source");
            source.src = this._url[i];
            vid.appendChild(source);
          }
        }
        // @method getElement(): HTMLVideoElement
        // Returns the instance of [`HTMLVideoElement`](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement)
        // used by this overlay.
      });
      function videoOverlay(video, bounds, options) {
        return new VideoOverlay(video, bounds, options);
      }
      var SVGOverlay = ImageOverlay.extend({
        _initImage: function() {
          var el = this._image = this._url;
          addClass(el, "leaflet-image-layer");
          if (this._zoomAnimated) {
            addClass(el, "leaflet-zoom-animated");
          }
          if (this.options.className) {
            addClass(el, this.options.className);
          }
          el.onselectstart = falseFn;
          el.onmousemove = falseFn;
        }
        // @method getElement(): SVGElement
        // Returns the instance of [`SVGElement`](https://developer.mozilla.org/docs/Web/API/SVGElement)
        // used by this overlay.
      });
      function svgOverlay(el, bounds, options) {
        return new SVGOverlay(el, bounds, options);
      }
      var DivOverlay = Layer.extend({
        // @section
        // @aka DivOverlay options
        options: {
          // @option interactive: Boolean = false
          // If true, the popup/tooltip will listen to the mouse events.
          interactive: false,
          // @option offset: Point = Point(0, 0)
          // The offset of the overlay position.
          offset: [0, 0],
          // @option className: String = ''
          // A custom CSS class name to assign to the overlay.
          className: "",
          // @option pane: String = undefined
          // `Map pane` where the overlay will be added.
          pane: void 0,
          // @option content: String|HTMLElement|Function = ''
          // Sets the HTML content of the overlay while initializing. If a function is passed the source layer will be
          // passed to the function. The function should return a `String` or `HTMLElement` to be used in the overlay.
          content: ""
        },
        initialize: function(options, source) {
          if (options && (options instanceof LatLng || isArray(options))) {
            this._latlng = toLatLng(options);
            setOptions(this, source);
          } else {
            setOptions(this, options);
            this._source = source;
          }
          if (this.options.content) {
            this._content = this.options.content;
          }
        },
        // @method openOn(map: Map): this
        // Adds the overlay to the map.
        // Alternative to `map.openPopup(popup)`/`.openTooltip(tooltip)`.
        openOn: function(map) {
          map = arguments.length ? map : this._source._map;
          if (!map.hasLayer(this)) {
            map.addLayer(this);
          }
          return this;
        },
        // @method close(): this
        // Closes the overlay.
        // Alternative to `map.closePopup(popup)`/`.closeTooltip(tooltip)`
        // and `layer.closePopup()`/`.closeTooltip()`.
        close: function() {
          if (this._map) {
            this._map.removeLayer(this);
          }
          return this;
        },
        // @method toggle(layer?: Layer): this
        // Opens or closes the overlay bound to layer depending on its current state.
        // Argument may be omitted only for overlay bound to layer.
        // Alternative to `layer.togglePopup()`/`.toggleTooltip()`.
        toggle: function(layer) {
          if (this._map) {
            this.close();
          } else {
            if (arguments.length) {
              this._source = layer;
            } else {
              layer = this._source;
            }
            this._prepareOpen();
            this.openOn(layer._map);
          }
          return this;
        },
        onAdd: function(map) {
          this._zoomAnimated = map._zoomAnimated;
          if (!this._container) {
            this._initLayout();
          }
          if (map._fadeAnimated) {
            setOpacity(this._container, 0);
          }
          clearTimeout(this._removeTimeout);
          this.getPane().appendChild(this._container);
          this.update();
          if (map._fadeAnimated) {
            setOpacity(this._container, 1);
          }
          this.bringToFront();
          if (this.options.interactive) {
            addClass(this._container, "leaflet-interactive");
            this.addInteractiveTarget(this._container);
          }
        },
        onRemove: function(map) {
          if (map._fadeAnimated) {
            setOpacity(this._container, 0);
            this._removeTimeout = setTimeout(bind(remove, void 0, this._container), 200);
          } else {
            remove(this._container);
          }
          if (this.options.interactive) {
            removeClass(this._container, "leaflet-interactive");
            this.removeInteractiveTarget(this._container);
          }
        },
        // @namespace DivOverlay
        // @method getLatLng: LatLng
        // Returns the geographical point of the overlay.
        getLatLng: function() {
          return this._latlng;
        },
        // @method setLatLng(latlng: LatLng): this
        // Sets the geographical point where the overlay will open.
        setLatLng: function(latlng) {
          this._latlng = toLatLng(latlng);
          if (this._map) {
            this._updatePosition();
            this._adjustPan();
          }
          return this;
        },
        // @method getContent: String|HTMLElement
        // Returns the content of the overlay.
        getContent: function() {
          return this._content;
        },
        // @method setContent(htmlContent: String|HTMLElement|Function): this
        // Sets the HTML content of the overlay. If a function is passed the source layer will be passed to the function.
        // The function should return a `String` or `HTMLElement` to be used in the overlay.
        setContent: function(content) {
          this._content = content;
          this.update();
          return this;
        },
        // @method getElement: String|HTMLElement
        // Returns the HTML container of the overlay.
        getElement: function() {
          return this._container;
        },
        // @method update: null
        // Updates the overlay content, layout and position. Useful for updating the overlay after something inside changed, e.g. image loaded.
        update: function() {
          if (!this._map) {
            return;
          }
          this._container.style.visibility = "hidden";
          this._updateContent();
          this._updateLayout();
          this._updatePosition();
          this._container.style.visibility = "";
          this._adjustPan();
        },
        getEvents: function() {
          var events = {
            zoom: this._updatePosition,
            viewreset: this._updatePosition
          };
          if (this._zoomAnimated) {
            events.zoomanim = this._animateZoom;
          }
          return events;
        },
        // @method isOpen: Boolean
        // Returns `true` when the overlay is visible on the map.
        isOpen: function() {
          return !!this._map && this._map.hasLayer(this);
        },
        // @method bringToFront: this
        // Brings this overlay in front of other overlays (in the same map pane).
        bringToFront: function() {
          if (this._map) {
            toFront(this._container);
          }
          return this;
        },
        // @method bringToBack: this
        // Brings this overlay to the back of other overlays (in the same map pane).
        bringToBack: function() {
          if (this._map) {
            toBack(this._container);
          }
          return this;
        },
        // prepare bound overlay to open: update latlng pos / content source (for FeatureGroup)
        _prepareOpen: function(latlng) {
          var source = this._source;
          if (!source._map) {
            return false;
          }
          if (source instanceof FeatureGroup) {
            source = null;
            var layers2 = this._source._layers;
            for (var id in layers2) {
              if (layers2[id]._map) {
                source = layers2[id];
                break;
              }
            }
            if (!source) {
              return false;
            }
            this._source = source;
          }
          if (!latlng) {
            if (source.getCenter) {
              latlng = source.getCenter();
            } else if (source.getLatLng) {
              latlng = source.getLatLng();
            } else if (source.getBounds) {
              latlng = source.getBounds().getCenter();
            } else {
              throw new Error("Unable to get source layer LatLng.");
            }
          }
          this.setLatLng(latlng);
          if (this._map) {
            this.update();
          }
          return true;
        },
        _updateContent: function() {
          if (!this._content) {
            return;
          }
          var node = this._contentNode;
          var content = typeof this._content === "function" ? this._content(this._source || this) : this._content;
          if (typeof content === "string") {
            node.innerHTML = content;
          } else {
            while (node.hasChildNodes()) {
              node.removeChild(node.firstChild);
            }
            node.appendChild(content);
          }
          this.fire("contentupdate");
        },
        _updatePosition: function() {
          if (!this._map) {
            return;
          }
          var pos = this._map.latLngToLayerPoint(this._latlng), offset = toPoint(this.options.offset), anchor = this._getAnchor();
          if (this._zoomAnimated) {
            setPosition(this._container, pos.add(anchor));
          } else {
            offset = offset.add(pos).add(anchor);
          }
          var bottom = this._containerBottom = -offset.y, left = this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x;
          this._container.style.bottom = bottom + "px";
          this._container.style.left = left + "px";
        },
        _getAnchor: function() {
          return [0, 0];
        }
      });
      Map2.include({
        _initOverlay: function(OverlayClass, content, latlng, options) {
          var overlay = content;
          if (!(overlay instanceof OverlayClass)) {
            overlay = new OverlayClass(options).setContent(content);
          }
          if (latlng) {
            overlay.setLatLng(latlng);
          }
          return overlay;
        }
      });
      Layer.include({
        _initOverlay: function(OverlayClass, old, content, options) {
          var overlay = content;
          if (overlay instanceof OverlayClass) {
            setOptions(overlay, options);
            overlay._source = this;
          } else {
            overlay = old && !options ? old : new OverlayClass(options, this);
            overlay.setContent(content);
          }
          return overlay;
        }
      });
      var Popup = DivOverlay.extend({
        // @section
        // @aka Popup options
        options: {
          // @option pane: String = 'popupPane'
          // `Map pane` where the popup will be added.
          pane: "popupPane",
          // @option offset: Point = Point(0, 7)
          // The offset of the popup position.
          offset: [0, 7],
          // @option maxWidth: Number = 300
          // Max width of the popup, in pixels.
          maxWidth: 300,
          // @option minWidth: Number = 50
          // Min width of the popup, in pixels.
          minWidth: 50,
          // @option maxHeight: Number = null
          // If set, creates a scrollable container of the given height
          // inside a popup if its content exceeds it.
          // The scrollable container can be styled using the
          // `leaflet-popup-scrolled` CSS class selector.
          maxHeight: null,
          // @option autoPan: Boolean = true
          // Set it to `false` if you don't want the map to do panning animation
          // to fit the opened popup.
          autoPan: true,
          // @option autoPanPaddingTopLeft: Point = null
          // The margin between the popup and the top left corner of the map
          // view after autopanning was performed.
          autoPanPaddingTopLeft: null,
          // @option autoPanPaddingBottomRight: Point = null
          // The margin between the popup and the bottom right corner of the map
          // view after autopanning was performed.
          autoPanPaddingBottomRight: null,
          // @option autoPanPadding: Point = Point(5, 5)
          // Equivalent of setting both top left and bottom right autopan padding to the same value.
          autoPanPadding: [5, 5],
          // @option keepInView: Boolean = false
          // Set it to `true` if you want to prevent users from panning the popup
          // off of the screen while it is open.
          keepInView: false,
          // @option closeButton: Boolean = true
          // Controls the presence of a close button in the popup.
          closeButton: true,
          // @option autoClose: Boolean = true
          // Set it to `false` if you want to override the default behavior of
          // the popup closing when another popup is opened.
          autoClose: true,
          // @option closeOnEscapeKey: Boolean = true
          // Set it to `false` if you want to override the default behavior of
          // the ESC key for closing of the popup.
          closeOnEscapeKey: true,
          // @option closeOnClick: Boolean = *
          // Set it if you want to override the default behavior of the popup closing when user clicks
          // on the map. Defaults to the map's [`closePopupOnClick`](#map-closepopuponclick) option.
          // @option className: String = ''
          // A custom CSS class name to assign to the popup.
          className: ""
        },
        // @namespace Popup
        // @method openOn(map: Map): this
        // Alternative to `map.openPopup(popup)`.
        // Adds the popup to the map and closes the previous one.
        openOn: function(map) {
          map = arguments.length ? map : this._source._map;
          if (!map.hasLayer(this) && map._popup && map._popup.options.autoClose) {
            map.removeLayer(map._popup);
          }
          map._popup = this;
          return DivOverlay.prototype.openOn.call(this, map);
        },
        onAdd: function(map) {
          DivOverlay.prototype.onAdd.call(this, map);
          map.fire("popupopen", { popup: this });
          if (this._source) {
            this._source.fire("popupopen", { popup: this }, true);
            if (!(this._source instanceof Path)) {
              this._source.on("preclick", stopPropagation);
            }
          }
        },
        onRemove: function(map) {
          DivOverlay.prototype.onRemove.call(this, map);
          map.fire("popupclose", { popup: this });
          if (this._source) {
            this._source.fire("popupclose", { popup: this }, true);
            if (!(this._source instanceof Path)) {
              this._source.off("preclick", stopPropagation);
            }
          }
        },
        getEvents: function() {
          var events = DivOverlay.prototype.getEvents.call(this);
          if (this.options.closeOnClick !== void 0 ? this.options.closeOnClick : this._map.options.closePopupOnClick) {
            events.preclick = this.close;
          }
          if (this.options.keepInView) {
            events.moveend = this._adjustPan;
          }
          return events;
        },
        _initLayout: function() {
          var prefix = "leaflet-popup", container = this._container = create$1(
            "div",
            prefix + " " + (this.options.className || "") + " leaflet-zoom-animated"
          );
          var wrapper = this._wrapper = create$1("div", prefix + "-content-wrapper", container);
          this._contentNode = create$1("div", prefix + "-content", wrapper);
          disableClickPropagation(container);
          disableScrollPropagation(this._contentNode);
          on(container, "contextmenu", stopPropagation);
          this._tipContainer = create$1("div", prefix + "-tip-container", container);
          this._tip = create$1("div", prefix + "-tip", this._tipContainer);
          if (this.options.closeButton) {
            var closeButton = this._closeButton = create$1("a", prefix + "-close-button", container);
            closeButton.setAttribute("role", "button");
            closeButton.setAttribute("aria-label", "Close popup");
            closeButton.href = "#close";
            closeButton.innerHTML = '<span aria-hidden="true">&#215;</span>';
            on(closeButton, "click", function(ev) {
              preventDefault(ev);
              this.close();
            }, this);
          }
        },
        _updateLayout: function() {
          var container = this._contentNode, style2 = container.style;
          style2.width = "";
          style2.whiteSpace = "nowrap";
          var width = container.offsetWidth;
          width = Math.min(width, this.options.maxWidth);
          width = Math.max(width, this.options.minWidth);
          style2.width = width + 1 + "px";
          style2.whiteSpace = "";
          style2.height = "";
          var height = container.offsetHeight, maxHeight = this.options.maxHeight, scrolledClass = "leaflet-popup-scrolled";
          if (maxHeight && height > maxHeight) {
            style2.height = maxHeight + "px";
            addClass(container, scrolledClass);
          } else {
            removeClass(container, scrolledClass);
          }
          this._containerWidth = this._container.offsetWidth;
        },
        _animateZoom: function(e) {
          var pos = this._map._latLngToNewLayerPoint(this._latlng, e.zoom, e.center), anchor = this._getAnchor();
          setPosition(this._container, pos.add(anchor));
        },
        _adjustPan: function() {
          if (!this.options.autoPan) {
            return;
          }
          if (this._map._panAnim) {
            this._map._panAnim.stop();
          }
          if (this._autopanning) {
            this._autopanning = false;
            return;
          }
          var map = this._map, marginBottom = parseInt(getStyle(this._container, "marginBottom"), 10) || 0, containerHeight = this._container.offsetHeight + marginBottom, containerWidth = this._containerWidth, layerPos = new Point(this._containerLeft, -containerHeight - this._containerBottom);
          layerPos._add(getPosition(this._container));
          var containerPos = map.layerPointToContainerPoint(layerPos), padding = toPoint(this.options.autoPanPadding), paddingTL = toPoint(this.options.autoPanPaddingTopLeft || padding), paddingBR = toPoint(this.options.autoPanPaddingBottomRight || padding), size = map.getSize(), dx = 0, dy = 0;
          if (containerPos.x + containerWidth + paddingBR.x > size.x) {
            dx = containerPos.x + containerWidth - size.x + paddingBR.x;
          }
          if (containerPos.x - dx - paddingTL.x < 0) {
            dx = containerPos.x - paddingTL.x;
          }
          if (containerPos.y + containerHeight + paddingBR.y > size.y) {
            dy = containerPos.y + containerHeight - size.y + paddingBR.y;
          }
          if (containerPos.y - dy - paddingTL.y < 0) {
            dy = containerPos.y - paddingTL.y;
          }
          if (dx || dy) {
            if (this.options.keepInView) {
              this._autopanning = true;
            }
            map.fire("autopanstart").panBy([dx, dy]);
          }
        },
        _getAnchor: function() {
          return toPoint(this._source && this._source._getPopupAnchor ? this._source._getPopupAnchor() : [0, 0]);
        }
      });
      var popup = function(options, source) {
        return new Popup(options, source);
      };
      Map2.mergeOptions({
        closePopupOnClick: true
      });
      Map2.include({
        // @method openPopup(popup: Popup): this
        // Opens the specified popup while closing the previously opened (to make sure only one is opened at one time for usability).
        // @alternative
        // @method openPopup(content: String|HTMLElement, latlng: LatLng, options?: Popup options): this
        // Creates a popup with the specified content and options and opens it in the given point on a map.
        openPopup: function(popup2, latlng, options) {
          this._initOverlay(Popup, popup2, latlng, options).openOn(this);
          return this;
        },
        // @method closePopup(popup?: Popup): this
        // Closes the popup previously opened with [openPopup](#map-openpopup) (or the given one).
        closePopup: function(popup2) {
          popup2 = arguments.length ? popup2 : this._popup;
          if (popup2) {
            popup2.close();
          }
          return this;
        }
      });
      Layer.include({
        // @method bindPopup(content: String|HTMLElement|Function|Popup, options?: Popup options): this
        // Binds a popup to the layer with the passed `content` and sets up the
        // necessary event listeners. If a `Function` is passed it will receive
        // the layer as the first argument and should return a `String` or `HTMLElement`.
        bindPopup: function(content, options) {
          this._popup = this._initOverlay(Popup, this._popup, content, options);
          if (!this._popupHandlersAdded) {
            this.on({
              click: this._openPopup,
              keypress: this._onKeyPress,
              remove: this.closePopup,
              move: this._movePopup
            });
            this._popupHandlersAdded = true;
          }
          return this;
        },
        // @method unbindPopup(): this
        // Removes the popup previously bound with `bindPopup`.
        unbindPopup: function() {
          if (this._popup) {
            this.off({
              click: this._openPopup,
              keypress: this._onKeyPress,
              remove: this.closePopup,
              move: this._movePopup
            });
            this._popupHandlersAdded = false;
            this._popup = null;
          }
          return this;
        },
        // @method openPopup(latlng?: LatLng): this
        // Opens the bound popup at the specified `latlng` or at the default popup anchor if no `latlng` is passed.
        openPopup: function(latlng) {
          if (this._popup) {
            if (!(this instanceof FeatureGroup)) {
              this._popup._source = this;
            }
            if (this._popup._prepareOpen(latlng || this._latlng)) {
              this._popup.openOn(this._map);
            }
          }
          return this;
        },
        // @method closePopup(): this
        // Closes the popup bound to this layer if it is open.
        closePopup: function() {
          if (this._popup) {
            this._popup.close();
          }
          return this;
        },
        // @method togglePopup(): this
        // Opens or closes the popup bound to this layer depending on its current state.
        togglePopup: function() {
          if (this._popup) {
            this._popup.toggle(this);
          }
          return this;
        },
        // @method isPopupOpen(): boolean
        // Returns `true` if the popup bound to this layer is currently open.
        isPopupOpen: function() {
          return this._popup ? this._popup.isOpen() : false;
        },
        // @method setPopupContent(content: String|HTMLElement|Popup): this
        // Sets the content of the popup bound to this layer.
        setPopupContent: function(content) {
          if (this._popup) {
            this._popup.setContent(content);
          }
          return this;
        },
        // @method getPopup(): Popup
        // Returns the popup bound to this layer.
        getPopup: function() {
          return this._popup;
        },
        _openPopup: function(e) {
          if (!this._popup || !this._map) {
            return;
          }
          stop2(e);
          var target = e.layer || e.target;
          if (this._popup._source === target && !(target instanceof Path)) {
            if (this._map.hasLayer(this._popup)) {
              this.closePopup();
            } else {
              this.openPopup(e.latlng);
            }
            return;
          }
          this._popup._source = target;
          this.openPopup(e.latlng);
        },
        _movePopup: function(e) {
          this._popup.setLatLng(e.latlng);
        },
        _onKeyPress: function(e) {
          if (e.originalEvent.keyCode === 13) {
            this._openPopup(e);
          }
        }
      });
      var Tooltip = DivOverlay.extend({
        // @section
        // @aka Tooltip options
        options: {
          // @option pane: String = 'tooltipPane'
          // `Map pane` where the tooltip will be added.
          pane: "tooltipPane",
          // @option offset: Point = Point(0, 0)
          // Optional offset of the tooltip position.
          offset: [0, 0],
          // @option direction: String = 'auto'
          // Direction where to open the tooltip. Possible values are: `right`, `left`,
          // `top`, `bottom`, `center`, `auto`.
          // `auto` will dynamically switch between `right` and `left` according to the tooltip
          // position on the map.
          direction: "auto",
          // @option permanent: Boolean = false
          // Whether to open the tooltip permanently or only on mouseover.
          permanent: false,
          // @option sticky: Boolean = false
          // If true, the tooltip will follow the mouse instead of being fixed at the feature center.
          sticky: false,
          // @option opacity: Number = 0.9
          // Tooltip container opacity.
          opacity: 0.9
        },
        onAdd: function(map) {
          DivOverlay.prototype.onAdd.call(this, map);
          this.setOpacity(this.options.opacity);
          map.fire("tooltipopen", { tooltip: this });
          if (this._source) {
            this.addEventParent(this._source);
            this._source.fire("tooltipopen", { tooltip: this }, true);
          }
        },
        onRemove: function(map) {
          DivOverlay.prototype.onRemove.call(this, map);
          map.fire("tooltipclose", { tooltip: this });
          if (this._source) {
            this.removeEventParent(this._source);
            this._source.fire("tooltipclose", { tooltip: this }, true);
          }
        },
        getEvents: function() {
          var events = DivOverlay.prototype.getEvents.call(this);
          if (!this.options.permanent) {
            events.preclick = this.close;
          }
          return events;
        },
        _initLayout: function() {
          var prefix = "leaflet-tooltip", className = prefix + " " + (this.options.className || "") + " leaflet-zoom-" + (this._zoomAnimated ? "animated" : "hide");
          this._contentNode = this._container = create$1("div", className);
          this._container.setAttribute("role", "tooltip");
          this._container.setAttribute("id", "leaflet-tooltip-" + stamp(this));
        },
        _updateLayout: function() {
        },
        _adjustPan: function() {
        },
        _setPosition: function(pos) {
          var subX, subY, map = this._map, container = this._container, centerPoint = map.latLngToContainerPoint(map.getCenter()), tooltipPoint = map.layerPointToContainerPoint(pos), direction = this.options.direction, tooltipWidth = container.offsetWidth, tooltipHeight = container.offsetHeight, offset = toPoint(this.options.offset), anchor = this._getAnchor();
          if (direction === "top") {
            subX = tooltipWidth / 2;
            subY = tooltipHeight;
          } else if (direction === "bottom") {
            subX = tooltipWidth / 2;
            subY = 0;
          } else if (direction === "center") {
            subX = tooltipWidth / 2;
            subY = tooltipHeight / 2;
          } else if (direction === "right") {
            subX = 0;
            subY = tooltipHeight / 2;
          } else if (direction === "left") {
            subX = tooltipWidth;
            subY = tooltipHeight / 2;
          } else if (tooltipPoint.x < centerPoint.x) {
            direction = "right";
            subX = 0;
            subY = tooltipHeight / 2;
          } else {
            direction = "left";
            subX = tooltipWidth + (offset.x + anchor.x) * 2;
            subY = tooltipHeight / 2;
          }
          pos = pos.subtract(toPoint(subX, subY, true)).add(offset).add(anchor);
          removeClass(container, "leaflet-tooltip-right");
          removeClass(container, "leaflet-tooltip-left");
          removeClass(container, "leaflet-tooltip-top");
          removeClass(container, "leaflet-tooltip-bottom");
          addClass(container, "leaflet-tooltip-" + direction);
          setPosition(container, pos);
        },
        _updatePosition: function() {
          var pos = this._map.latLngToLayerPoint(this._latlng);
          this._setPosition(pos);
        },
        setOpacity: function(opacity) {
          this.options.opacity = opacity;
          if (this._container) {
            setOpacity(this._container, opacity);
          }
        },
        _animateZoom: function(e) {
          var pos = this._map._latLngToNewLayerPoint(this._latlng, e.zoom, e.center);
          this._setPosition(pos);
        },
        _getAnchor: function() {
          return toPoint(this._source && this._source._getTooltipAnchor && !this.options.sticky ? this._source._getTooltipAnchor() : [0, 0]);
        }
      });
      var tooltip = function(options, source) {
        return new Tooltip(options, source);
      };
      Map2.include({
        // @method openTooltip(tooltip: Tooltip): this
        // Opens the specified tooltip.
        // @alternative
        // @method openTooltip(content: String|HTMLElement, latlng: LatLng, options?: Tooltip options): this
        // Creates a tooltip with the specified content and options and open it.
        openTooltip: function(tooltip2, latlng, options) {
          this._initOverlay(Tooltip, tooltip2, latlng, options).openOn(this);
          return this;
        },
        // @method closeTooltip(tooltip: Tooltip): this
        // Closes the tooltip given as parameter.
        closeTooltip: function(tooltip2) {
          tooltip2.close();
          return this;
        }
      });
      Layer.include({
        // @method bindTooltip(content: String|HTMLElement|Function|Tooltip, options?: Tooltip options): this
        // Binds a tooltip to the layer with the passed `content` and sets up the
        // necessary event listeners. If a `Function` is passed it will receive
        // the layer as the first argument and should return a `String` or `HTMLElement`.
        bindTooltip: function(content, options) {
          if (this._tooltip && this.isTooltipOpen()) {
            this.unbindTooltip();
          }
          this._tooltip = this._initOverlay(Tooltip, this._tooltip, content, options);
          this._initTooltipInteractions();
          if (this._tooltip.options.permanent && this._map && this._map.hasLayer(this)) {
            this.openTooltip();
          }
          return this;
        },
        // @method unbindTooltip(): this
        // Removes the tooltip previously bound with `bindTooltip`.
        unbindTooltip: function() {
          if (this._tooltip) {
            this._initTooltipInteractions(true);
            this.closeTooltip();
            this._tooltip = null;
          }
          return this;
        },
        _initTooltipInteractions: function(remove2) {
          if (!remove2 && this._tooltipHandlersAdded) {
            return;
          }
          var onOff = remove2 ? "off" : "on", events = {
            remove: this.closeTooltip,
            move: this._moveTooltip
          };
          if (!this._tooltip.options.permanent) {
            events.mouseover = this._openTooltip;
            events.mouseout = this.closeTooltip;
            events.click = this._openTooltip;
            if (this._map) {
              this._addFocusListeners();
            } else {
              events.add = this._addFocusListeners;
            }
          } else {
            events.add = this._openTooltip;
          }
          if (this._tooltip.options.sticky) {
            events.mousemove = this._moveTooltip;
          }
          this[onOff](events);
          this._tooltipHandlersAdded = !remove2;
        },
        // @method openTooltip(latlng?: LatLng): this
        // Opens the bound tooltip at the specified `latlng` or at the default tooltip anchor if no `latlng` is passed.
        openTooltip: function(latlng) {
          if (this._tooltip) {
            if (!(this instanceof FeatureGroup)) {
              this._tooltip._source = this;
            }
            if (this._tooltip._prepareOpen(latlng)) {
              this._tooltip.openOn(this._map);
              if (this.getElement) {
                this._setAriaDescribedByOnLayer(this);
              } else if (this.eachLayer) {
                this.eachLayer(this._setAriaDescribedByOnLayer, this);
              }
            }
          }
          return this;
        },
        // @method closeTooltip(): this
        // Closes the tooltip bound to this layer if it is open.
        closeTooltip: function() {
          if (this._tooltip) {
            return this._tooltip.close();
          }
        },
        // @method toggleTooltip(): this
        // Opens or closes the tooltip bound to this layer depending on its current state.
        toggleTooltip: function() {
          if (this._tooltip) {
            this._tooltip.toggle(this);
          }
          return this;
        },
        // @method isTooltipOpen(): boolean
        // Returns `true` if the tooltip bound to this layer is currently open.
        isTooltipOpen: function() {
          return this._tooltip.isOpen();
        },
        // @method setTooltipContent(content: String|HTMLElement|Tooltip): this
        // Sets the content of the tooltip bound to this layer.
        setTooltipContent: function(content) {
          if (this._tooltip) {
            this._tooltip.setContent(content);
          }
          return this;
        },
        // @method getTooltip(): Tooltip
        // Returns the tooltip bound to this layer.
        getTooltip: function() {
          return this._tooltip;
        },
        _addFocusListeners: function() {
          if (this.getElement) {
            this._addFocusListenersOnLayer(this);
          } else if (this.eachLayer) {
            this.eachLayer(this._addFocusListenersOnLayer, this);
          }
        },
        _addFocusListenersOnLayer: function(layer) {
          var el = typeof layer.getElement === "function" && layer.getElement();
          if (el) {
            on(el, "focus", function() {
              this._tooltip._source = layer;
              this.openTooltip();
            }, this);
            on(el, "blur", this.closeTooltip, this);
          }
        },
        _setAriaDescribedByOnLayer: function(layer) {
          var el = typeof layer.getElement === "function" && layer.getElement();
          if (el) {
            el.setAttribute("aria-describedby", this._tooltip._container.id);
          }
        },
        _openTooltip: function(e) {
          if (!this._tooltip || !this._map) {
            return;
          }
          if (this._map.dragging && this._map.dragging.moving() && !this._openOnceFlag) {
            this._openOnceFlag = true;
            var that = this;
            this._map.once("moveend", function() {
              that._openOnceFlag = false;
              that._openTooltip(e);
            });
            return;
          }
          this._tooltip._source = e.layer || e.target;
          this.openTooltip(this._tooltip.options.sticky ? e.latlng : void 0);
        },
        _moveTooltip: function(e) {
          var latlng = e.latlng, containerPoint, layerPoint;
          if (this._tooltip.options.sticky && e.originalEvent) {
            containerPoint = this._map.mouseEventToContainerPoint(e.originalEvent);
            layerPoint = this._map.containerPointToLayerPoint(containerPoint);
            latlng = this._map.layerPointToLatLng(layerPoint);
          }
          this._tooltip.setLatLng(latlng);
        }
      });
      var DivIcon = Icon.extend({
        options: {
          // @section
          // @aka DivIcon options
          iconSize: [12, 12],
          // also can be set through CSS
          // iconAnchor: (Point),
          // popupAnchor: (Point),
          // @option html: String|HTMLElement = ''
          // Custom HTML code to put inside the div element, empty by default. Alternatively,
          // an instance of `HTMLElement`.
          html: false,
          // @option bgPos: Point = [0, 0]
          // Optional relative position of the background, in pixels
          bgPos: null,
          className: "leaflet-div-icon"
        },
        createIcon: function(oldIcon) {
          var div = oldIcon && oldIcon.tagName === "DIV" ? oldIcon : document.createElement("div"), options = this.options;
          if (options.html instanceof Element) {
            empty(div);
            div.appendChild(options.html);
          } else {
            div.innerHTML = options.html !== false ? options.html : "";
          }
          if (options.bgPos) {
            var bgPos = toPoint(options.bgPos);
            div.style.backgroundPosition = -bgPos.x + "px " + -bgPos.y + "px";
          }
          this._setIconStyles(div, "icon");
          return div;
        },
        createShadow: function() {
          return null;
        }
      });
      function divIcon(options) {
        return new DivIcon(options);
      }
      Icon.Default = IconDefault;
      var GridLayer = Layer.extend({
        // @section
        // @aka GridLayer options
        options: {
          // @option tileSize: Number|Point = 256
          // Width and height of tiles in the grid. Use a number if width and height are equal, or `L.point(width, height)` otherwise.
          tileSize: 256,
          // @option opacity: Number = 1.0
          // Opacity of the tiles. Can be used in the `createTile()` function.
          opacity: 1,
          // @option updateWhenIdle: Boolean = (depends)
          // Load new tiles only when panning ends.
          // `true` by default on mobile browsers, in order to avoid too many requests and keep smooth navigation.
          // `false` otherwise in order to display new tiles _during_ panning, since it is easy to pan outside the
          // [`keepBuffer`](#gridlayer-keepbuffer) option in desktop browsers.
          updateWhenIdle: Browser.mobile,
          // @option updateWhenZooming: Boolean = true
          // By default, a smooth zoom animation (during a [touch zoom](#map-touchzoom) or a [`flyTo()`](#map-flyto)) will update grid layers every integer zoom level. Setting this option to `false` will update the grid layer only when the smooth animation ends.
          updateWhenZooming: true,
          // @option updateInterval: Number = 200
          // Tiles will not update more than once every `updateInterval` milliseconds when panning.
          updateInterval: 200,
          // @option zIndex: Number = 1
          // The explicit zIndex of the tile layer.
          zIndex: 1,
          // @option bounds: LatLngBounds = undefined
          // If set, tiles will only be loaded inside the set `LatLngBounds`.
          bounds: null,
          // @option minZoom: Number = 0
          // The minimum zoom level down to which this layer will be displayed (inclusive).
          minZoom: 0,
          // @option maxZoom: Number = undefined
          // The maximum zoom level up to which this layer will be displayed (inclusive).
          maxZoom: void 0,
          // @option maxNativeZoom: Number = undefined
          // Maximum zoom number the tile source has available. If it is specified,
          // the tiles on all zoom levels higher than `maxNativeZoom` will be loaded
          // from `maxNativeZoom` level and auto-scaled.
          maxNativeZoom: void 0,
          // @option minNativeZoom: Number = undefined
          // Minimum zoom number the tile source has available. If it is specified,
          // the tiles on all zoom levels lower than `minNativeZoom` will be loaded
          // from `minNativeZoom` level and auto-scaled.
          minNativeZoom: void 0,
          // @option noWrap: Boolean = false
          // Whether the layer is wrapped around the antimeridian. If `true`, the
          // GridLayer will only be displayed once at low zoom levels. Has no
          // effect when the [map CRS](#map-crs) doesn't wrap around. Can be used
          // in combination with [`bounds`](#gridlayer-bounds) to prevent requesting
          // tiles outside the CRS limits.
          noWrap: false,
          // @option pane: String = 'tilePane'
          // `Map pane` where the grid layer will be added.
          pane: "tilePane",
          // @option className: String = ''
          // A custom class name to assign to the tile layer. Empty by default.
          className: "",
          // @option keepBuffer: Number = 2
          // When panning the map, keep this many rows and columns of tiles before unloading them.
          keepBuffer: 2
        },
        initialize: function(options) {
          setOptions(this, options);
        },
        onAdd: function() {
          this._initContainer();
          this._levels = {};
          this._tiles = {};
          this._resetView();
        },
        beforeAdd: function(map) {
          map._addZoomLimit(this);
        },
        onRemove: function(map) {
          this._removeAllTiles();
          remove(this._container);
          map._removeZoomLimit(this);
          this._container = null;
          this._tileZoom = void 0;
        },
        // @method bringToFront: this
        // Brings the tile layer to the top of all tile layers.
        bringToFront: function() {
          if (this._map) {
            toFront(this._container);
            this._setAutoZIndex(Math.max);
          }
          return this;
        },
        // @method bringToBack: this
        // Brings the tile layer to the bottom of all tile layers.
        bringToBack: function() {
          if (this._map) {
            toBack(this._container);
            this._setAutoZIndex(Math.min);
          }
          return this;
        },
        // @method getContainer: HTMLElement
        // Returns the HTML element that contains the tiles for this layer.
        getContainer: function() {
          return this._container;
        },
        // @method setOpacity(opacity: Number): this
        // Changes the [opacity](#gridlayer-opacity) of the grid layer.
        setOpacity: function(opacity) {
          this.options.opacity = opacity;
          this._updateOpacity();
          return this;
        },
        // @method setZIndex(zIndex: Number): this
        // Changes the [zIndex](#gridlayer-zindex) of the grid layer.
        setZIndex: function(zIndex) {
          this.options.zIndex = zIndex;
          this._updateZIndex();
          return this;
        },
        // @method isLoading: Boolean
        // Returns `true` if any tile in the grid layer has not finished loading.
        isLoading: function() {
          return this._loading;
        },
        // @method redraw: this
        // Causes the layer to clear all the tiles and request them again.
        redraw: function() {
          if (this._map) {
            this._removeAllTiles();
            var tileZoom = this._clampZoom(this._map.getZoom());
            if (tileZoom !== this._tileZoom) {
              this._tileZoom = tileZoom;
              this._updateLevels();
            }
            this._update();
          }
          return this;
        },
        getEvents: function() {
          var events = {
            viewprereset: this._invalidateAll,
            viewreset: this._resetView,
            zoom: this._resetView,
            moveend: this._onMoveEnd
          };
          if (!this.options.updateWhenIdle) {
            if (!this._onMove) {
              this._onMove = throttle(this._onMoveEnd, this.options.updateInterval, this);
            }
            events.move = this._onMove;
          }
          if (this._zoomAnimated) {
            events.zoomanim = this._animateZoom;
          }
          return events;
        },
        // @section Extension methods
        // Layers extending `GridLayer` shall reimplement the following method.
        // @method createTile(coords: Object, done?: Function): HTMLElement
        // Called only internally, must be overridden by classes extending `GridLayer`.
        // Returns the `HTMLElement` corresponding to the given `coords`. If the `done` callback
        // is specified, it must be called when the tile has finished loading and drawing.
        createTile: function() {
          return document.createElement("div");
        },
        // @section
        // @method getTileSize: Point
        // Normalizes the [tileSize option](#gridlayer-tilesize) into a point. Used by the `createTile()` method.
        getTileSize: function() {
          var s2 = this.options.tileSize;
          return s2 instanceof Point ? s2 : new Point(s2, s2);
        },
        _updateZIndex: function() {
          if (this._container && this.options.zIndex !== void 0 && this.options.zIndex !== null) {
            this._container.style.zIndex = this.options.zIndex;
          }
        },
        _setAutoZIndex: function(compare) {
          var layers2 = this.getPane().children, edgeZIndex = -compare(-Infinity, Infinity);
          for (var i = 0, len = layers2.length, zIndex; i < len; i++) {
            zIndex = layers2[i].style.zIndex;
            if (layers2[i] !== this._container && zIndex) {
              edgeZIndex = compare(edgeZIndex, +zIndex);
            }
          }
          if (isFinite(edgeZIndex)) {
            this.options.zIndex = edgeZIndex + compare(-1, 1);
            this._updateZIndex();
          }
        },
        _updateOpacity: function() {
          if (!this._map) {
            return;
          }
          if (Browser.ielt9) {
            return;
          }
          setOpacity(this._container, this.options.opacity);
          var now = +/* @__PURE__ */ new Date(), nextFrame = false, willPrune = false;
          for (var key in this._tiles) {
            var tile = this._tiles[key];
            if (!tile.current || !tile.loaded) {
              continue;
            }
            var fade = Math.min(1, (now - tile.loaded) / 200);
            setOpacity(tile.el, fade);
            if (fade < 1) {
              nextFrame = true;
            } else {
              if (tile.active) {
                willPrune = true;
              } else {
                this._onOpaqueTile(tile);
              }
              tile.active = true;
            }
          }
          if (willPrune && !this._noPrune) {
            this._pruneTiles();
          }
          if (nextFrame) {
            cancelAnimFrame(this._fadeFrame);
            this._fadeFrame = requestAnimFrame(this._updateOpacity, this);
          }
        },
        _onOpaqueTile: falseFn,
        _initContainer: function() {
          if (this._container) {
            return;
          }
          this._container = create$1("div", "leaflet-layer " + (this.options.className || ""));
          this._updateZIndex();
          if (this.options.opacity < 1) {
            this._updateOpacity();
          }
          this.getPane().appendChild(this._container);
        },
        _updateLevels: function() {
          var zoom2 = this._tileZoom, maxZoom = this.options.maxZoom;
          if (zoom2 === void 0) {
            return void 0;
          }
          for (var z in this._levels) {
            z = Number(z);
            if (this._levels[z].el.children.length || z === zoom2) {
              this._levels[z].el.style.zIndex = maxZoom - Math.abs(zoom2 - z);
              this._onUpdateLevel(z);
            } else {
              remove(this._levels[z].el);
              this._removeTilesAtZoom(z);
              this._onRemoveLevel(z);
              delete this._levels[z];
            }
          }
          var level = this._levels[zoom2], map = this._map;
          if (!level) {
            level = this._levels[zoom2] = {};
            level.el = create$1("div", "leaflet-tile-container leaflet-zoom-animated", this._container);
            level.el.style.zIndex = maxZoom;
            level.origin = map.project(map.unproject(map.getPixelOrigin()), zoom2).round();
            level.zoom = zoom2;
            this._setZoomTransform(level, map.getCenter(), map.getZoom());
            falseFn(level.el.offsetWidth);
            this._onCreateLevel(level);
          }
          this._level = level;
          return level;
        },
        _onUpdateLevel: falseFn,
        _onRemoveLevel: falseFn,
        _onCreateLevel: falseFn,
        _pruneTiles: function() {
          if (!this._map) {
            return;
          }
          var key, tile;
          var zoom2 = this._map.getZoom();
          if (zoom2 > this.options.maxZoom || zoom2 < this.options.minZoom) {
            this._removeAllTiles();
            return;
          }
          for (key in this._tiles) {
            tile = this._tiles[key];
            tile.retain = tile.current;
          }
          for (key in this._tiles) {
            tile = this._tiles[key];
            if (tile.current && !tile.active) {
              var coords = tile.coords;
              if (!this._retainParent(coords.x, coords.y, coords.z, coords.z - 5)) {
                this._retainChildren(coords.x, coords.y, coords.z, coords.z + 2);
              }
            }
          }
          for (key in this._tiles) {
            if (!this._tiles[key].retain) {
              this._removeTile(key);
            }
          }
        },
        _removeTilesAtZoom: function(zoom2) {
          for (var key in this._tiles) {
            if (this._tiles[key].coords.z !== zoom2) {
              continue;
            }
            this._removeTile(key);
          }
        },
        _removeAllTiles: function() {
          for (var key in this._tiles) {
            this._removeTile(key);
          }
        },
        _invalidateAll: function() {
          for (var z in this._levels) {
            remove(this._levels[z].el);
            this._onRemoveLevel(Number(z));
            delete this._levels[z];
          }
          this._removeAllTiles();
          this._tileZoom = void 0;
        },
        _retainParent: function(x, y, z, minZoom) {
          var x2 = Math.floor(x / 2), y2 = Math.floor(y / 2), z2 = z - 1, coords2 = new Point(+x2, +y2);
          coords2.z = +z2;
          var key = this._tileCoordsToKey(coords2), tile = this._tiles[key];
          if (tile && tile.active) {
            tile.retain = true;
            return true;
          } else if (tile && tile.loaded) {
            tile.retain = true;
          }
          if (z2 > minZoom) {
            return this._retainParent(x2, y2, z2, minZoom);
          }
          return false;
        },
        _retainChildren: function(x, y, z, maxZoom) {
          for (var i = 2 * x; i < 2 * x + 2; i++) {
            for (var j = 2 * y; j < 2 * y + 2; j++) {
              var coords = new Point(i, j);
              coords.z = z + 1;
              var key = this._tileCoordsToKey(coords), tile = this._tiles[key];
              if (tile && tile.active) {
                tile.retain = true;
                continue;
              } else if (tile && tile.loaded) {
                tile.retain = true;
              }
              if (z + 1 < maxZoom) {
                this._retainChildren(i, j, z + 1, maxZoom);
              }
            }
          }
        },
        _resetView: function(e) {
          var animating = e && (e.pinch || e.flyTo);
          this._setView(this._map.getCenter(), this._map.getZoom(), animating, animating);
        },
        _animateZoom: function(e) {
          this._setView(e.center, e.zoom, true, e.noUpdate);
        },
        _clampZoom: function(zoom2) {
          var options = this.options;
          if (void 0 !== options.minNativeZoom && zoom2 < options.minNativeZoom) {
            return options.minNativeZoom;
          }
          if (void 0 !== options.maxNativeZoom && options.maxNativeZoom < zoom2) {
            return options.maxNativeZoom;
          }
          return zoom2;
        },
        _setView: function(center, zoom2, noPrune, noUpdate) {
          var tileZoom = Math.round(zoom2);
          if (this.options.maxZoom !== void 0 && tileZoom > this.options.maxZoom || this.options.minZoom !== void 0 && tileZoom < this.options.minZoom) {
            tileZoom = void 0;
          } else {
            tileZoom = this._clampZoom(tileZoom);
          }
          var tileZoomChanged = this.options.updateWhenZooming && tileZoom !== this._tileZoom;
          if (!noUpdate || tileZoomChanged) {
            this._tileZoom = tileZoom;
            if (this._abortLoading) {
              this._abortLoading();
            }
            this._updateLevels();
            this._resetGrid();
            if (tileZoom !== void 0) {
              this._update(center);
            }
            if (!noPrune) {
              this._pruneTiles();
            }
            this._noPrune = !!noPrune;
          }
          this._setZoomTransforms(center, zoom2);
        },
        _setZoomTransforms: function(center, zoom2) {
          for (var i in this._levels) {
            this._setZoomTransform(this._levels[i], center, zoom2);
          }
        },
        _setZoomTransform: function(level, center, zoom2) {
          var scale2 = this._map.getZoomScale(zoom2, level.zoom), translate = level.origin.multiplyBy(scale2).subtract(this._map._getNewPixelOrigin(center, zoom2)).round();
          if (Browser.any3d) {
            setTransform(level.el, translate, scale2);
          } else {
            setPosition(level.el, translate);
          }
        },
        _resetGrid: function() {
          var map = this._map, crs = map.options.crs, tileSize = this._tileSize = this.getTileSize(), tileZoom = this._tileZoom;
          var bounds = this._map.getPixelWorldBounds(this._tileZoom);
          if (bounds) {
            this._globalTileRange = this._pxBoundsToTileRange(bounds);
          }
          this._wrapX = crs.wrapLng && !this.options.noWrap && [
            Math.floor(map.project([0, crs.wrapLng[0]], tileZoom).x / tileSize.x),
            Math.ceil(map.project([0, crs.wrapLng[1]], tileZoom).x / tileSize.y)
          ];
          this._wrapY = crs.wrapLat && !this.options.noWrap && [
            Math.floor(map.project([crs.wrapLat[0], 0], tileZoom).y / tileSize.x),
            Math.ceil(map.project([crs.wrapLat[1], 0], tileZoom).y / tileSize.y)
          ];
        },
        _onMoveEnd: function() {
          if (!this._map || this._map._animatingZoom) {
            return;
          }
          this._update();
        },
        _getTiledPixelBounds: function(center) {
          var map = this._map, mapZoom = map._animatingZoom ? Math.max(map._animateToZoom, map.getZoom()) : map.getZoom(), scale2 = map.getZoomScale(mapZoom, this._tileZoom), pixelCenter = map.project(center, this._tileZoom).floor(), halfSize = map.getSize().divideBy(scale2 * 2);
          return new Bounds(pixelCenter.subtract(halfSize), pixelCenter.add(halfSize));
        },
        // Private method to load tiles in the grid's active zoom level according to map bounds
        _update: function(center) {
          var map = this._map;
          if (!map) {
            return;
          }
          var zoom2 = this._clampZoom(map.getZoom());
          if (center === void 0) {
            center = map.getCenter();
          }
          if (this._tileZoom === void 0) {
            return;
          }
          var pixelBounds = this._getTiledPixelBounds(center), tileRange = this._pxBoundsToTileRange(pixelBounds), tileCenter = tileRange.getCenter(), queue = [], margin = this.options.keepBuffer, noPruneRange = new Bounds(
            tileRange.getBottomLeft().subtract([margin, -margin]),
            tileRange.getTopRight().add([margin, -margin])
          );
          if (!(isFinite(tileRange.min.x) && isFinite(tileRange.min.y) && isFinite(tileRange.max.x) && isFinite(tileRange.max.y))) {
            throw new Error("Attempted to load an infinite number of tiles");
          }
          for (var key in this._tiles) {
            var c = this._tiles[key].coords;
            if (c.z !== this._tileZoom || !noPruneRange.contains(new Point(c.x, c.y))) {
              this._tiles[key].current = false;
            }
          }
          if (Math.abs(zoom2 - this._tileZoom) > 1) {
            this._setView(center, zoom2);
            return;
          }
          for (var j = tileRange.min.y; j <= tileRange.max.y; j++) {
            for (var i = tileRange.min.x; i <= tileRange.max.x; i++) {
              var coords = new Point(i, j);
              coords.z = this._tileZoom;
              if (!this._isValidTile(coords)) {
                continue;
              }
              var tile = this._tiles[this._tileCoordsToKey(coords)];
              if (tile) {
                tile.current = true;
              } else {
                queue.push(coords);
              }
            }
          }
          queue.sort(function(a, b) {
            return a.distanceTo(tileCenter) - b.distanceTo(tileCenter);
          });
          if (queue.length !== 0) {
            if (!this._loading) {
              this._loading = true;
              this.fire("loading");
            }
            var fragment = document.createDocumentFragment();
            for (i = 0; i < queue.length; i++) {
              this._addTile(queue[i], fragment);
            }
            this._level.el.appendChild(fragment);
          }
        },
        _isValidTile: function(coords) {
          var crs = this._map.options.crs;
          if (!crs.infinite) {
            var bounds = this._globalTileRange;
            if (!crs.wrapLng && (coords.x < bounds.min.x || coords.x > bounds.max.x) || !crs.wrapLat && (coords.y < bounds.min.y || coords.y > bounds.max.y)) {
              return false;
            }
          }
          if (!this.options.bounds) {
            return true;
          }
          var tileBounds = this._tileCoordsToBounds(coords);
          return toLatLngBounds(this.options.bounds).overlaps(tileBounds);
        },
        _keyToBounds: function(key) {
          return this._tileCoordsToBounds(this._keyToTileCoords(key));
        },
        _tileCoordsToNwSe: function(coords) {
          var map = this._map, tileSize = this.getTileSize(), nwPoint = coords.scaleBy(tileSize), sePoint = nwPoint.add(tileSize), nw = map.unproject(nwPoint, coords.z), se = map.unproject(sePoint, coords.z);
          return [nw, se];
        },
        // converts tile coordinates to its geographical bounds
        _tileCoordsToBounds: function(coords) {
          var bp = this._tileCoordsToNwSe(coords), bounds = new LatLngBounds(bp[0], bp[1]);
          if (!this.options.noWrap) {
            bounds = this._map.wrapLatLngBounds(bounds);
          }
          return bounds;
        },
        // converts tile coordinates to key for the tile cache
        _tileCoordsToKey: function(coords) {
          return coords.x + ":" + coords.y + ":" + coords.z;
        },
        // converts tile cache key to coordinates
        _keyToTileCoords: function(key) {
          var k = key.split(":"), coords = new Point(+k[0], +k[1]);
          coords.z = +k[2];
          return coords;
        },
        _removeTile: function(key) {
          var tile = this._tiles[key];
          if (!tile) {
            return;
          }
          remove(tile.el);
          delete this._tiles[key];
          this.fire("tileunload", {
            tile: tile.el,
            coords: this._keyToTileCoords(key)
          });
        },
        _initTile: function(tile) {
          addClass(tile, "leaflet-tile");
          var tileSize = this.getTileSize();
          tile.style.width = tileSize.x + "px";
          tile.style.height = tileSize.y + "px";
          tile.onselectstart = falseFn;
          tile.onmousemove = falseFn;
          if (Browser.ielt9 && this.options.opacity < 1) {
            setOpacity(tile, this.options.opacity);
          }
        },
        _addTile: function(coords, container) {
          var tilePos = this._getTilePos(coords), key = this._tileCoordsToKey(coords);
          var tile = this.createTile(this._wrapCoords(coords), bind(this._tileReady, this, coords));
          this._initTile(tile);
          if (this.createTile.length < 2) {
            requestAnimFrame(bind(this._tileReady, this, coords, null, tile));
          }
          setPosition(tile, tilePos);
          this._tiles[key] = {
            el: tile,
            coords,
            current: true
          };
          container.appendChild(tile);
          this.fire("tileloadstart", {
            tile,
            coords
          });
        },
        _tileReady: function(coords, err, tile) {
          if (err) {
            this.fire("tileerror", {
              error: err,
              tile,
              coords
            });
          }
          var key = this._tileCoordsToKey(coords);
          tile = this._tiles[key];
          if (!tile) {
            return;
          }
          tile.loaded = +/* @__PURE__ */ new Date();
          if (this._map._fadeAnimated) {
            setOpacity(tile.el, 0);
            cancelAnimFrame(this._fadeFrame);
            this._fadeFrame = requestAnimFrame(this._updateOpacity, this);
          } else {
            tile.active = true;
            this._pruneTiles();
          }
          if (!err) {
            addClass(tile.el, "leaflet-tile-loaded");
            this.fire("tileload", {
              tile: tile.el,
              coords
            });
          }
          if (this._noTilesToLoad()) {
            this._loading = false;
            this.fire("load");
            if (Browser.ielt9 || !this._map._fadeAnimated) {
              requestAnimFrame(this._pruneTiles, this);
            } else {
              setTimeout(bind(this._pruneTiles, this), 250);
            }
          }
        },
        _getTilePos: function(coords) {
          return coords.scaleBy(this.getTileSize()).subtract(this._level.origin);
        },
        _wrapCoords: function(coords) {
          var newCoords = new Point(
            this._wrapX ? wrapNum(coords.x, this._wrapX) : coords.x,
            this._wrapY ? wrapNum(coords.y, this._wrapY) : coords.y
          );
          newCoords.z = coords.z;
          return newCoords;
        },
        _pxBoundsToTileRange: function(bounds) {
          var tileSize = this.getTileSize();
          return new Bounds(
            bounds.min.unscaleBy(tileSize).floor(),
            bounds.max.unscaleBy(tileSize).ceil().subtract([1, 1])
          );
        },
        _noTilesToLoad: function() {
          for (var key in this._tiles) {
            if (!this._tiles[key].loaded) {
              return false;
            }
          }
          return true;
        }
      });
      function gridLayer(options) {
        return new GridLayer(options);
      }
      var TileLayer = GridLayer.extend({
        // @section
        // @aka TileLayer options
        options: {
          // @option minZoom: Number = 0
          // The minimum zoom level down to which this layer will be displayed (inclusive).
          minZoom: 0,
          // @option maxZoom: Number = 18
          // The maximum zoom level up to which this layer will be displayed (inclusive).
          maxZoom: 18,
          // @option subdomains: String|String[] = 'abc'
          // Subdomains of the tile service. Can be passed in the form of one string (where each letter is a subdomain name) or an array of strings.
          subdomains: "abc",
          // @option errorTileUrl: String = ''
          // URL to the tile image to show in place of the tile that failed to load.
          errorTileUrl: "",
          // @option zoomOffset: Number = 0
          // The zoom number used in tile URLs will be offset with this value.
          zoomOffset: 0,
          // @option tms: Boolean = false
          // If `true`, inverses Y axis numbering for tiles (turn this on for [TMS](https://en.wikipedia.org/wiki/Tile_Map_Service) services).
          tms: false,
          // @option zoomReverse: Boolean = false
          // If set to true, the zoom number used in tile URLs will be reversed (`maxZoom - zoom` instead of `zoom`)
          zoomReverse: false,
          // @option detectRetina: Boolean = false
          // If `true` and user is on a retina display, it will request four tiles of half the specified size and a bigger zoom level in place of one to utilize the high resolution.
          detectRetina: false,
          // @option crossOrigin: Boolean|String = false
          // Whether the crossOrigin attribute will be added to the tiles.
          // If a String is provided, all tiles will have their crossOrigin attribute set to the String provided. This is needed if you want to access tile pixel data.
          // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
          crossOrigin: false,
          // @option referrerPolicy: Boolean|String = false
          // Whether the referrerPolicy attribute will be added to the tiles.
          // If a String is provided, all tiles will have their referrerPolicy attribute set to the String provided.
          // This may be needed if your map's rendering context has a strict default but your tile provider expects a valid referrer
          // (e.g. to validate an API token).
          // Refer to [HTMLImageElement.referrerPolicy](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/referrerPolicy) for valid String values.
          referrerPolicy: false
        },
        initialize: function(url, options) {
          this._url = url;
          options = setOptions(this, options);
          if (options.detectRetina && Browser.retina && options.maxZoom > 0) {
            options.tileSize = Math.floor(options.tileSize / 2);
            if (!options.zoomReverse) {
              options.zoomOffset++;
              options.maxZoom = Math.max(options.minZoom, options.maxZoom - 1);
            } else {
              options.zoomOffset--;
              options.minZoom = Math.min(options.maxZoom, options.minZoom + 1);
            }
            options.minZoom = Math.max(0, options.minZoom);
          } else if (!options.zoomReverse) {
            options.maxZoom = Math.max(options.minZoom, options.maxZoom);
          } else {
            options.minZoom = Math.min(options.maxZoom, options.minZoom);
          }
          if (typeof options.subdomains === "string") {
            options.subdomains = options.subdomains.split("");
          }
          this.on("tileunload", this._onTileRemove);
        },
        // @method setUrl(url: String, noRedraw?: Boolean): this
        // Updates the layer's URL template and redraws it (unless `noRedraw` is set to `true`).
        // If the URL does not change, the layer will not be redrawn unless
        // the noRedraw parameter is set to false.
        setUrl: function(url, noRedraw) {
          if (this._url === url && noRedraw === void 0) {
            noRedraw = true;
          }
          this._url = url;
          if (!noRedraw) {
            this.redraw();
          }
          return this;
        },
        // @method createTile(coords: Object, done?: Function): HTMLElement
        // Called only internally, overrides GridLayer's [`createTile()`](#gridlayer-createtile)
        // to return an `<img>` HTML element with the appropriate image URL given `coords`. The `done`
        // callback is called when the tile has been loaded.
        createTile: function(coords, done) {
          var tile = document.createElement("img");
          on(tile, "load", bind(this._tileOnLoad, this, done, tile));
          on(tile, "error", bind(this._tileOnError, this, done, tile));
          if (this.options.crossOrigin || this.options.crossOrigin === "") {
            tile.crossOrigin = this.options.crossOrigin === true ? "" : this.options.crossOrigin;
          }
          if (typeof this.options.referrerPolicy === "string") {
            tile.referrerPolicy = this.options.referrerPolicy;
          }
          tile.alt = "";
          tile.src = this.getTileUrl(coords);
          return tile;
        },
        // @section Extension methods
        // @uninheritable
        // Layers extending `TileLayer` might reimplement the following method.
        // @method getTileUrl(coords: Object): String
        // Called only internally, returns the URL for a tile given its coordinates.
        // Classes extending `TileLayer` can override this function to provide custom tile URL naming schemes.
        getTileUrl: function(coords) {
          var data = {
            r: Browser.retina ? "@2x" : "",
            s: this._getSubdomain(coords),
            x: coords.x,
            y: coords.y,
            z: this._getZoomForUrl()
          };
          if (this._map && !this._map.options.crs.infinite) {
            var invertedY = this._globalTileRange.max.y - coords.y;
            if (this.options.tms) {
              data["y"] = invertedY;
            }
            data["-y"] = invertedY;
          }
          return template(this._url, extend(data, this.options));
        },
        _tileOnLoad: function(done, tile) {
          if (Browser.ielt9) {
            setTimeout(bind(done, this, null, tile), 0);
          } else {
            done(null, tile);
          }
        },
        _tileOnError: function(done, tile, e) {
          var errorUrl = this.options.errorTileUrl;
          if (errorUrl && tile.getAttribute("src") !== errorUrl) {
            tile.src = errorUrl;
          }
          done(e, tile);
        },
        _onTileRemove: function(e) {
          e.tile.onload = null;
        },
        _getZoomForUrl: function() {
          var zoom2 = this._tileZoom, maxZoom = this.options.maxZoom, zoomReverse = this.options.zoomReverse, zoomOffset = this.options.zoomOffset;
          if (zoomReverse) {
            zoom2 = maxZoom - zoom2;
          }
          return zoom2 + zoomOffset;
        },
        _getSubdomain: function(tilePoint) {
          var index2 = Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
          return this.options.subdomains[index2];
        },
        // stops loading all tiles in the background layer
        _abortLoading: function() {
          var i, tile;
          for (i in this._tiles) {
            if (this._tiles[i].coords.z !== this._tileZoom) {
              tile = this._tiles[i].el;
              tile.onload = falseFn;
              tile.onerror = falseFn;
              if (!tile.complete) {
                tile.src = emptyImageUrl;
                var coords = this._tiles[i].coords;
                remove(tile);
                delete this._tiles[i];
                this.fire("tileabort", {
                  tile,
                  coords
                });
              }
            }
          }
        },
        _removeTile: function(key) {
          var tile = this._tiles[key];
          if (!tile) {
            return;
          }
          tile.el.setAttribute("src", emptyImageUrl);
          return GridLayer.prototype._removeTile.call(this, key);
        },
        _tileReady: function(coords, err, tile) {
          if (!this._map || tile && tile.getAttribute("src") === emptyImageUrl) {
            return;
          }
          return GridLayer.prototype._tileReady.call(this, coords, err, tile);
        }
      });
      function tileLayer(url, options) {
        return new TileLayer(url, options);
      }
      var TileLayerWMS = TileLayer.extend({
        // @section
        // @aka TileLayer.WMS options
        // If any custom options not documented here are used, they will be sent to the
        // WMS server as extra parameters in each request URL. This can be useful for
        // [non-standard vendor WMS parameters](https://docs.geoserver.org/stable/en/user/services/wms/vendor.html).
        defaultWmsParams: {
          service: "WMS",
          request: "GetMap",
          // @option layers: String = ''
          // **(required)** Comma-separated list of WMS layers to show.
          layers: "",
          // @option styles: String = ''
          // Comma-separated list of WMS styles.
          styles: "",
          // @option format: String = 'image/jpeg'
          // WMS image format (use `'image/png'` for layers with transparency).
          format: "image/jpeg",
          // @option transparent: Boolean = false
          // If `true`, the WMS service will return images with transparency.
          transparent: false,
          // @option version: String = '1.1.1'
          // Version of the WMS service to use
          version: "1.1.1"
        },
        options: {
          // @option crs: CRS = null
          // Coordinate Reference System to use for the WMS requests, defaults to
          // map CRS. Don't change this if you're not sure what it means.
          crs: null,
          // @option uppercase: Boolean = false
          // If `true`, WMS request parameter keys will be uppercase.
          uppercase: false
        },
        initialize: function(url, options) {
          this._url = url;
          var wmsParams = extend({}, this.defaultWmsParams);
          for (var i in options) {
            if (!(i in this.options)) {
              wmsParams[i] = options[i];
            }
          }
          options = setOptions(this, options);
          var realRetina = options.detectRetina && Browser.retina ? 2 : 1;
          var tileSize = this.getTileSize();
          wmsParams.width = tileSize.x * realRetina;
          wmsParams.height = tileSize.y * realRetina;
          this.wmsParams = wmsParams;
        },
        onAdd: function(map) {
          this._crs = this.options.crs || map.options.crs;
          this._wmsVersion = parseFloat(this.wmsParams.version);
          var projectionKey = this._wmsVersion >= 1.3 ? "crs" : "srs";
          this.wmsParams[projectionKey] = this._crs.code;
          TileLayer.prototype.onAdd.call(this, map);
        },
        getTileUrl: function(coords) {
          var tileBounds = this._tileCoordsToNwSe(coords), crs = this._crs, bounds = toBounds(crs.project(tileBounds[0]), crs.project(tileBounds[1])), min = bounds.min, max = bounds.max, bbox = (this._wmsVersion >= 1.3 && this._crs === EPSG4326 ? [min.y, min.x, max.y, max.x] : [min.x, min.y, max.x, max.y]).join(","), url = TileLayer.prototype.getTileUrl.call(this, coords);
          return url + getParamString(this.wmsParams, url, this.options.uppercase) + (this.options.uppercase ? "&BBOX=" : "&bbox=") + bbox;
        },
        // @method setParams(params: Object, noRedraw?: Boolean): this
        // Merges an object with the new parameters and re-requests tiles on the current screen (unless `noRedraw` was set to true).
        setParams: function(params, noRedraw) {
          extend(this.wmsParams, params);
          if (!noRedraw) {
            this.redraw();
          }
          return this;
        }
      });
      function tileLayerWMS(url, options) {
        return new TileLayerWMS(url, options);
      }
      TileLayer.WMS = TileLayerWMS;
      tileLayer.wms = tileLayerWMS;
      var Renderer = Layer.extend({
        // @section
        // @aka Renderer options
        options: {
          // @option padding: Number = 0.1
          // How much to extend the clip area around the map view (relative to its size)
          // e.g. 0.1 would be 10% of map view in each direction
          padding: 0.1
        },
        initialize: function(options) {
          setOptions(this, options);
          stamp(this);
          this._layers = this._layers || {};
        },
        onAdd: function() {
          if (!this._container) {
            this._initContainer();
            addClass(this._container, "leaflet-zoom-animated");
          }
          this.getPane().appendChild(this._container);
          this._update();
          this.on("update", this._updatePaths, this);
        },
        onRemove: function() {
          this.off("update", this._updatePaths, this);
          this._destroyContainer();
        },
        getEvents: function() {
          var events = {
            viewreset: this._reset,
            zoom: this._onZoom,
            moveend: this._update,
            zoomend: this._onZoomEnd
          };
          if (this._zoomAnimated) {
            events.zoomanim = this._onAnimZoom;
          }
          return events;
        },
        _onAnimZoom: function(ev) {
          this._updateTransform(ev.center, ev.zoom);
        },
        _onZoom: function() {
          this._updateTransform(this._map.getCenter(), this._map.getZoom());
        },
        _updateTransform: function(center, zoom2) {
          var scale2 = this._map.getZoomScale(zoom2, this._zoom), viewHalf = this._map.getSize().multiplyBy(0.5 + this.options.padding), currentCenterPoint = this._map.project(this._center, zoom2), topLeftOffset = viewHalf.multiplyBy(-scale2).add(currentCenterPoint).subtract(this._map._getNewPixelOrigin(center, zoom2));
          if (Browser.any3d) {
            setTransform(this._container, topLeftOffset, scale2);
          } else {
            setPosition(this._container, topLeftOffset);
          }
        },
        _reset: function() {
          this._update();
          this._updateTransform(this._center, this._zoom);
          for (var id in this._layers) {
            this._layers[id]._reset();
          }
        },
        _onZoomEnd: function() {
          for (var id in this._layers) {
            this._layers[id]._project();
          }
        },
        _updatePaths: function() {
          for (var id in this._layers) {
            this._layers[id]._update();
          }
        },
        _update: function() {
          var p = this.options.padding, size = this._map.getSize(), min = this._map.containerPointToLayerPoint(size.multiplyBy(-p)).round();
          this._bounds = new Bounds(min, min.add(size.multiplyBy(1 + p * 2)).round());
          this._center = this._map.getCenter();
          this._zoom = this._map.getZoom();
        }
      });
      var Canvas = Renderer.extend({
        // @section
        // @aka Canvas options
        options: {
          // @option tolerance: Number = 0
          // How much to extend the click tolerance around a path/object on the map.
          tolerance: 0
        },
        getEvents: function() {
          var events = Renderer.prototype.getEvents.call(this);
          events.viewprereset = this._onViewPreReset;
          return events;
        },
        _onViewPreReset: function() {
          this._postponeUpdatePaths = true;
        },
        onAdd: function() {
          Renderer.prototype.onAdd.call(this);
          this._draw();
        },
        _initContainer: function() {
          var container = this._container = document.createElement("canvas");
          on(container, "mousemove", this._onMouseMove, this);
          on(container, "click dblclick mousedown mouseup contextmenu", this._onClick, this);
          on(container, "mouseout", this._handleMouseOut, this);
          container["_leaflet_disable_events"] = true;
          this._ctx = container.getContext("2d");
        },
        _destroyContainer: function() {
          cancelAnimFrame(this._redrawRequest);
          delete this._ctx;
          remove(this._container);
          off(this._container);
          delete this._container;
        },
        _updatePaths: function() {
          if (this._postponeUpdatePaths) {
            return;
          }
          var layer;
          this._redrawBounds = null;
          for (var id in this._layers) {
            layer = this._layers[id];
            layer._update();
          }
          this._redraw();
        },
        _update: function() {
          if (this._map._animatingZoom && this._bounds) {
            return;
          }
          Renderer.prototype._update.call(this);
          var b = this._bounds, container = this._container, size = b.getSize(), m = Browser.retina ? 2 : 1;
          setPosition(container, b.min);
          container.width = m * size.x;
          container.height = m * size.y;
          container.style.width = size.x + "px";
          container.style.height = size.y + "px";
          if (Browser.retina) {
            this._ctx.scale(2, 2);
          }
          this._ctx.translate(-b.min.x, -b.min.y);
          this.fire("update");
        },
        _reset: function() {
          Renderer.prototype._reset.call(this);
          if (this._postponeUpdatePaths) {
            this._postponeUpdatePaths = false;
            this._updatePaths();
          }
        },
        _initPath: function(layer) {
          this._updateDashArray(layer);
          this._layers[stamp(layer)] = layer;
          var order = layer._order = {
            layer,
            prev: this._drawLast,
            next: null
          };
          if (this._drawLast) {
            this._drawLast.next = order;
          }
          this._drawLast = order;
          this._drawFirst = this._drawFirst || this._drawLast;
        },
        _addPath: function(layer) {
          this._requestRedraw(layer);
        },
        _removePath: function(layer) {
          var order = layer._order;
          var next = order.next;
          var prev = order.prev;
          if (next) {
            next.prev = prev;
          } else {
            this._drawLast = prev;
          }
          if (prev) {
            prev.next = next;
          } else {
            this._drawFirst = next;
          }
          delete layer._order;
          delete this._layers[stamp(layer)];
          this._requestRedraw(layer);
        },
        _updatePath: function(layer) {
          this._extendRedrawBounds(layer);
          layer._project();
          layer._update();
          this._requestRedraw(layer);
        },
        _updateStyle: function(layer) {
          this._updateDashArray(layer);
          this._requestRedraw(layer);
        },
        _updateDashArray: function(layer) {
          if (typeof layer.options.dashArray === "string") {
            var parts = layer.options.dashArray.split(/[, ]+/), dashArray = [], dashValue, i;
            for (i = 0; i < parts.length; i++) {
              dashValue = Number(parts[i]);
              if (isNaN(dashValue)) {
                return;
              }
              dashArray.push(dashValue);
            }
            layer.options._dashArray = dashArray;
          } else {
            layer.options._dashArray = layer.options.dashArray;
          }
        },
        _requestRedraw: function(layer) {
          if (!this._map) {
            return;
          }
          this._extendRedrawBounds(layer);
          this._redrawRequest = this._redrawRequest || requestAnimFrame(this._redraw, this);
        },
        _extendRedrawBounds: function(layer) {
          if (layer._pxBounds) {
            var padding = (layer.options.weight || 0) + 1;
            this._redrawBounds = this._redrawBounds || new Bounds();
            this._redrawBounds.extend(layer._pxBounds.min.subtract([padding, padding]));
            this._redrawBounds.extend(layer._pxBounds.max.add([padding, padding]));
          }
        },
        _redraw: function() {
          this._redrawRequest = null;
          if (this._redrawBounds) {
            this._redrawBounds.min._floor();
            this._redrawBounds.max._ceil();
          }
          this._clear();
          this._draw();
          this._redrawBounds = null;
        },
        _clear: function() {
          var bounds = this._redrawBounds;
          if (bounds) {
            var size = bounds.getSize();
            this._ctx.clearRect(bounds.min.x, bounds.min.y, size.x, size.y);
          } else {
            this._ctx.save();
            this._ctx.setTransform(1, 0, 0, 1, 0, 0);
            this._ctx.clearRect(0, 0, this._container.width, this._container.height);
            this._ctx.restore();
          }
        },
        _draw: function() {
          var layer, bounds = this._redrawBounds;
          this._ctx.save();
          if (bounds) {
            var size = bounds.getSize();
            this._ctx.beginPath();
            this._ctx.rect(bounds.min.x, bounds.min.y, size.x, size.y);
            this._ctx.clip();
          }
          this._drawing = true;
          for (var order = this._drawFirst; order; order = order.next) {
            layer = order.layer;
            if (!bounds || layer._pxBounds && layer._pxBounds.intersects(bounds)) {
              layer._updatePath();
            }
          }
          this._drawing = false;
          this._ctx.restore();
        },
        _updatePoly: function(layer, closed) {
          if (!this._drawing) {
            return;
          }
          var i, j, len2, p, parts = layer._parts, len = parts.length, ctx = this._ctx;
          if (!len) {
            return;
          }
          ctx.beginPath();
          for (i = 0; i < len; i++) {
            for (j = 0, len2 = parts[i].length; j < len2; j++) {
              p = parts[i][j];
              ctx[j ? "lineTo" : "moveTo"](p.x, p.y);
            }
            if (closed) {
              ctx.closePath();
            }
          }
          this._fillStroke(ctx, layer);
        },
        _updateCircle: function(layer) {
          if (!this._drawing || layer._empty()) {
            return;
          }
          var p = layer._point, ctx = this._ctx, r = Math.max(Math.round(layer._radius), 1), s2 = (Math.max(Math.round(layer._radiusY), 1) || r) / r;
          if (s2 !== 1) {
            ctx.save();
            ctx.scale(1, s2);
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y / s2, r, 0, Math.PI * 2, false);
          if (s2 !== 1) {
            ctx.restore();
          }
          this._fillStroke(ctx, layer);
        },
        _fillStroke: function(ctx, layer) {
          var options = layer.options;
          if (options.fill) {
            ctx.globalAlpha = options.fillOpacity;
            ctx.fillStyle = options.fillColor || options.color;
            ctx.fill(options.fillRule || "evenodd");
          }
          if (options.stroke && options.weight !== 0) {
            if (ctx.setLineDash) {
              ctx.setLineDash(layer.options && layer.options._dashArray || []);
            }
            ctx.globalAlpha = options.opacity;
            ctx.lineWidth = options.weight;
            ctx.strokeStyle = options.color;
            ctx.lineCap = options.lineCap;
            ctx.lineJoin = options.lineJoin;
            ctx.stroke();
          }
        },
        // Canvas obviously doesn't have mouse events for individual drawn objects,
        // so we emulate that by calculating what's under the mouse on mousemove/click manually
        _onClick: function(e) {
          var point = this._map.mouseEventToLayerPoint(e), layer, clickedLayer;
          for (var order = this._drawFirst; order; order = order.next) {
            layer = order.layer;
            if (layer.options.interactive && layer._containsPoint(point)) {
              if (!(e.type === "click" || e.type === "preclick") || !this._map._draggableMoved(layer)) {
                clickedLayer = layer;
              }
            }
          }
          this._fireEvent(clickedLayer ? [clickedLayer] : false, e);
        },
        _onMouseMove: function(e) {
          if (!this._map || this._map.dragging.moving() || this._map._animatingZoom) {
            return;
          }
          var point = this._map.mouseEventToLayerPoint(e);
          this._handleMouseHover(e, point);
        },
        _handleMouseOut: function(e) {
          var layer = this._hoveredLayer;
          if (layer) {
            removeClass(this._container, "leaflet-interactive");
            this._fireEvent([layer], e, "mouseout");
            this._hoveredLayer = null;
            this._mouseHoverThrottled = false;
          }
        },
        _handleMouseHover: function(e, point) {
          if (this._mouseHoverThrottled) {
            return;
          }
          var layer, candidateHoveredLayer;
          for (var order = this._drawFirst; order; order = order.next) {
            layer = order.layer;
            if (layer.options.interactive && layer._containsPoint(point)) {
              candidateHoveredLayer = layer;
            }
          }
          if (candidateHoveredLayer !== this._hoveredLayer) {
            this._handleMouseOut(e);
            if (candidateHoveredLayer) {
              addClass(this._container, "leaflet-interactive");
              this._fireEvent([candidateHoveredLayer], e, "mouseover");
              this._hoveredLayer = candidateHoveredLayer;
            }
          }
          this._fireEvent(this._hoveredLayer ? [this._hoveredLayer] : false, e);
          this._mouseHoverThrottled = true;
          setTimeout(bind(function() {
            this._mouseHoverThrottled = false;
          }, this), 32);
        },
        _fireEvent: function(layers2, e, type) {
          this._map._fireDOMEvent(e, type || e.type, layers2);
        },
        _bringToFront: function(layer) {
          var order = layer._order;
          if (!order) {
            return;
          }
          var next = order.next;
          var prev = order.prev;
          if (next) {
            next.prev = prev;
          } else {
            return;
          }
          if (prev) {
            prev.next = next;
          } else if (next) {
            this._drawFirst = next;
          }
          order.prev = this._drawLast;
          this._drawLast.next = order;
          order.next = null;
          this._drawLast = order;
          this._requestRedraw(layer);
        },
        _bringToBack: function(layer) {
          var order = layer._order;
          if (!order) {
            return;
          }
          var next = order.next;
          var prev = order.prev;
          if (prev) {
            prev.next = next;
          } else {
            return;
          }
          if (next) {
            next.prev = prev;
          } else if (prev) {
            this._drawLast = prev;
          }
          order.prev = null;
          order.next = this._drawFirst;
          this._drawFirst.prev = order;
          this._drawFirst = order;
          this._requestRedraw(layer);
        }
      });
      function canvas(options) {
        return Browser.canvas ? new Canvas(options) : null;
      }
      var vmlCreate = (function() {
        try {
          document.namespaces.add("lvml", "urn:schemas-microsoft-com:vml");
          return function(name) {
            return document.createElement("<lvml:" + name + ' class="lvml">');
          };
        } catch (e) {
        }
        return function(name) {
          return document.createElement("<" + name + ' xmlns="urn:schemas-microsoft.com:vml" class="lvml">');
        };
      })();
      var vmlMixin = {
        _initContainer: function() {
          this._container = create$1("div", "leaflet-vml-container");
        },
        _update: function() {
          if (this._map._animatingZoom) {
            return;
          }
          Renderer.prototype._update.call(this);
          this.fire("update");
        },
        _initPath: function(layer) {
          var container = layer._container = vmlCreate("shape");
          addClass(container, "leaflet-vml-shape " + (this.options.className || ""));
          container.coordsize = "1 1";
          layer._path = vmlCreate("path");
          container.appendChild(layer._path);
          this._updateStyle(layer);
          this._layers[stamp(layer)] = layer;
        },
        _addPath: function(layer) {
          var container = layer._container;
          this._container.appendChild(container);
          if (layer.options.interactive) {
            layer.addInteractiveTarget(container);
          }
        },
        _removePath: function(layer) {
          var container = layer._container;
          remove(container);
          layer.removeInteractiveTarget(container);
          delete this._layers[stamp(layer)];
        },
        _updateStyle: function(layer) {
          var stroke = layer._stroke, fill = layer._fill, options = layer.options, container = layer._container;
          container.stroked = !!options.stroke;
          container.filled = !!options.fill;
          if (options.stroke) {
            if (!stroke) {
              stroke = layer._stroke = vmlCreate("stroke");
            }
            container.appendChild(stroke);
            stroke.weight = options.weight + "px";
            stroke.color = options.color;
            stroke.opacity = options.opacity;
            if (options.dashArray) {
              stroke.dashStyle = isArray(options.dashArray) ? options.dashArray.join(" ") : options.dashArray.replace(/( *, *)/g, " ");
            } else {
              stroke.dashStyle = "";
            }
            stroke.endcap = options.lineCap.replace("butt", "flat");
            stroke.joinstyle = options.lineJoin;
          } else if (stroke) {
            container.removeChild(stroke);
            layer._stroke = null;
          }
          if (options.fill) {
            if (!fill) {
              fill = layer._fill = vmlCreate("fill");
            }
            container.appendChild(fill);
            fill.color = options.fillColor || options.color;
            fill.opacity = options.fillOpacity;
          } else if (fill) {
            container.removeChild(fill);
            layer._fill = null;
          }
        },
        _updateCircle: function(layer) {
          var p = layer._point.round(), r = Math.round(layer._radius), r23 = Math.round(layer._radiusY || r);
          this._setPath(layer, layer._empty() ? "M0 0" : "AL " + p.x + "," + p.y + " " + r + "," + r23 + " 0," + 65535 * 360);
        },
        _setPath: function(layer, path) {
          layer._path.v = path;
        },
        _bringToFront: function(layer) {
          toFront(layer._container);
        },
        _bringToBack: function(layer) {
          toBack(layer._container);
        }
      };
      var create = Browser.vml ? vmlCreate : svgCreate;
      var SVG = Renderer.extend({
        _initContainer: function() {
          this._container = create("svg");
          this._container.setAttribute("pointer-events", "none");
          this._rootGroup = create("g");
          this._container.appendChild(this._rootGroup);
        },
        _destroyContainer: function() {
          remove(this._container);
          off(this._container);
          delete this._container;
          delete this._rootGroup;
          delete this._svgSize;
        },
        _update: function() {
          if (this._map._animatingZoom && this._bounds) {
            return;
          }
          Renderer.prototype._update.call(this);
          var b = this._bounds, size = b.getSize(), container = this._container;
          if (!this._svgSize || !this._svgSize.equals(size)) {
            this._svgSize = size;
            container.setAttribute("width", size.x);
            container.setAttribute("height", size.y);
          }
          setPosition(container, b.min);
          container.setAttribute("viewBox", [b.min.x, b.min.y, size.x, size.y].join(" "));
          this.fire("update");
        },
        // methods below are called by vector layers implementations
        _initPath: function(layer) {
          var path = layer._path = create("path");
          if (layer.options.className) {
            addClass(path, layer.options.className);
          }
          if (layer.options.interactive) {
            addClass(path, "leaflet-interactive");
          }
          this._updateStyle(layer);
          this._layers[stamp(layer)] = layer;
        },
        _addPath: function(layer) {
          if (!this._rootGroup) {
            this._initContainer();
          }
          this._rootGroup.appendChild(layer._path);
          layer.addInteractiveTarget(layer._path);
        },
        _removePath: function(layer) {
          remove(layer._path);
          layer.removeInteractiveTarget(layer._path);
          delete this._layers[stamp(layer)];
        },
        _updatePath: function(layer) {
          layer._project();
          layer._update();
        },
        _updateStyle: function(layer) {
          var path = layer._path, options = layer.options;
          if (!path) {
            return;
          }
          if (options.stroke) {
            path.setAttribute("stroke", options.color);
            path.setAttribute("stroke-opacity", options.opacity);
            path.setAttribute("stroke-width", options.weight);
            path.setAttribute("stroke-linecap", options.lineCap);
            path.setAttribute("stroke-linejoin", options.lineJoin);
            if (options.dashArray) {
              path.setAttribute("stroke-dasharray", options.dashArray);
            } else {
              path.removeAttribute("stroke-dasharray");
            }
            if (options.dashOffset) {
              path.setAttribute("stroke-dashoffset", options.dashOffset);
            } else {
              path.removeAttribute("stroke-dashoffset");
            }
          } else {
            path.setAttribute("stroke", "none");
          }
          if (options.fill) {
            path.setAttribute("fill", options.fillColor || options.color);
            path.setAttribute("fill-opacity", options.fillOpacity);
            path.setAttribute("fill-rule", options.fillRule || "evenodd");
          } else {
            path.setAttribute("fill", "none");
          }
        },
        _updatePoly: function(layer, closed) {
          this._setPath(layer, pointsToPath(layer._parts, closed));
        },
        _updateCircle: function(layer) {
          var p = layer._point, r = Math.max(Math.round(layer._radius), 1), r23 = Math.max(Math.round(layer._radiusY), 1) || r, arc = "a" + r + "," + r23 + " 0 1,0 ";
          var d = layer._empty() ? "M0 0" : "M" + (p.x - r) + "," + p.y + arc + r * 2 + ",0 " + arc + -r * 2 + ",0 ";
          this._setPath(layer, d);
        },
        _setPath: function(layer, path) {
          layer._path.setAttribute("d", path);
        },
        // SVG does not have the concept of zIndex so we resort to changing the DOM order of elements
        _bringToFront: function(layer) {
          toFront(layer._path);
        },
        _bringToBack: function(layer) {
          toBack(layer._path);
        }
      });
      if (Browser.vml) {
        SVG.include(vmlMixin);
      }
      function svg(options) {
        return Browser.svg || Browser.vml ? new SVG(options) : null;
      }
      Map2.include({
        // @namespace Map; @method getRenderer(layer: Path): Renderer
        // Returns the instance of `Renderer` that should be used to render the given
        // `Path`. It will ensure that the `renderer` options of the map and paths
        // are respected, and that the renderers do exist on the map.
        getRenderer: function(layer) {
          var renderer = layer.options.renderer || this._getPaneRenderer(layer.options.pane) || this.options.renderer || this._renderer;
          if (!renderer) {
            renderer = this._renderer = this._createRenderer();
          }
          if (!this.hasLayer(renderer)) {
            this.addLayer(renderer);
          }
          return renderer;
        },
        _getPaneRenderer: function(name) {
          if (name === "overlayPane" || name === void 0) {
            return false;
          }
          var renderer = this._paneRenderers[name];
          if (renderer === void 0) {
            renderer = this._createRenderer({ pane: name });
            this._paneRenderers[name] = renderer;
          }
          return renderer;
        },
        _createRenderer: function(options) {
          return this.options.preferCanvas && canvas(options) || svg(options);
        }
      });
      var Rectangle = Polygon.extend({
        initialize: function(latLngBounds, options) {
          Polygon.prototype.initialize.call(this, this._boundsToLatLngs(latLngBounds), options);
        },
        // @method setBounds(latLngBounds: LatLngBounds): this
        // Redraws the rectangle with the passed bounds.
        setBounds: function(latLngBounds) {
          return this.setLatLngs(this._boundsToLatLngs(latLngBounds));
        },
        _boundsToLatLngs: function(latLngBounds) {
          latLngBounds = toLatLngBounds(latLngBounds);
          return [
            latLngBounds.getSouthWest(),
            latLngBounds.getNorthWest(),
            latLngBounds.getNorthEast(),
            latLngBounds.getSouthEast()
          ];
        }
      });
      function rectangle(latLngBounds, options) {
        return new Rectangle(latLngBounds, options);
      }
      SVG.create = create;
      SVG.pointsToPath = pointsToPath;
      GeoJSON.geometryToLayer = geometryToLayer;
      GeoJSON.coordsToLatLng = coordsToLatLng;
      GeoJSON.coordsToLatLngs = coordsToLatLngs;
      GeoJSON.latLngToCoords = latLngToCoords;
      GeoJSON.latLngsToCoords = latLngsToCoords;
      GeoJSON.getFeature = getFeature;
      GeoJSON.asFeature = asFeature;
      Map2.mergeOptions({
        // @option boxZoom: Boolean = true
        // Whether the map can be zoomed to a rectangular area specified by
        // dragging the mouse while pressing the shift key.
        boxZoom: true
      });
      var BoxZoom = Handler.extend({
        initialize: function(map) {
          this._map = map;
          this._container = map._container;
          this._pane = map._panes.overlayPane;
          this._resetStateTimeout = 0;
          map.on("unload", this._destroy, this);
        },
        addHooks: function() {
          on(this._container, "mousedown", this._onMouseDown, this);
        },
        removeHooks: function() {
          off(this._container, "mousedown", this._onMouseDown, this);
        },
        moved: function() {
          return this._moved;
        },
        _destroy: function() {
          remove(this._pane);
          delete this._pane;
        },
        _resetState: function() {
          this._resetStateTimeout = 0;
          this._moved = false;
        },
        _clearDeferredResetState: function() {
          if (this._resetStateTimeout !== 0) {
            clearTimeout(this._resetStateTimeout);
            this._resetStateTimeout = 0;
          }
        },
        _onMouseDown: function(e) {
          if (!e.shiftKey || e.which !== 1 && e.button !== 1) {
            return false;
          }
          this._clearDeferredResetState();
          this._resetState();
          disableTextSelection();
          disableImageDrag();
          this._startPoint = this._map.mouseEventToContainerPoint(e);
          on(document, {
            contextmenu: stop2,
            mousemove: this._onMouseMove,
            mouseup: this._onMouseUp,
            keydown: this._onKeyDown
          }, this);
        },
        _onMouseMove: function(e) {
          if (!this._moved) {
            this._moved = true;
            this._box = create$1("div", "leaflet-zoom-box", this._container);
            addClass(this._container, "leaflet-crosshair");
            this._map.fire("boxzoomstart");
          }
          this._point = this._map.mouseEventToContainerPoint(e);
          var bounds = new Bounds(this._point, this._startPoint), size = bounds.getSize();
          setPosition(this._box, bounds.min);
          this._box.style.width = size.x + "px";
          this._box.style.height = size.y + "px";
        },
        _finish: function() {
          if (this._moved) {
            remove(this._box);
            removeClass(this._container, "leaflet-crosshair");
          }
          enableTextSelection();
          enableImageDrag();
          off(document, {
            contextmenu: stop2,
            mousemove: this._onMouseMove,
            mouseup: this._onMouseUp,
            keydown: this._onKeyDown
          }, this);
        },
        _onMouseUp: function(e) {
          if (e.which !== 1 && e.button !== 1) {
            return;
          }
          this._finish();
          if (!this._moved) {
            return;
          }
          this._clearDeferredResetState();
          this._resetStateTimeout = setTimeout(bind(this._resetState, this), 0);
          var bounds = new LatLngBounds(
            this._map.containerPointToLatLng(this._startPoint),
            this._map.containerPointToLatLng(this._point)
          );
          this._map.fitBounds(bounds).fire("boxzoomend", { boxZoomBounds: bounds });
        },
        _onKeyDown: function(e) {
          if (e.keyCode === 27) {
            this._finish();
            this._clearDeferredResetState();
            this._resetState();
          }
        }
      });
      Map2.addInitHook("addHandler", "boxZoom", BoxZoom);
      Map2.mergeOptions({
        // @option doubleClickZoom: Boolean|String = true
        // Whether the map can be zoomed in by double clicking on it and
        // zoomed out by double clicking while holding shift. If passed
        // `'center'`, double-click zoom will zoom to the center of the
        //  view regardless of where the mouse was.
        doubleClickZoom: true
      });
      var DoubleClickZoom = Handler.extend({
        addHooks: function() {
          this._map.on("dblclick", this._onDoubleClick, this);
        },
        removeHooks: function() {
          this._map.off("dblclick", this._onDoubleClick, this);
        },
        _onDoubleClick: function(e) {
          var map = this._map, oldZoom = map.getZoom(), delta = map.options.zoomDelta, zoom2 = e.originalEvent.shiftKey ? oldZoom - delta : oldZoom + delta;
          if (map.options.doubleClickZoom === "center") {
            map.setZoom(zoom2);
          } else {
            map.setZoomAround(e.containerPoint, zoom2);
          }
        }
      });
      Map2.addInitHook("addHandler", "doubleClickZoom", DoubleClickZoom);
      Map2.mergeOptions({
        // @option dragging: Boolean = true
        // Whether the map is draggable with mouse/touch or not.
        dragging: true,
        // @section Panning Inertia Options
        // @option inertia: Boolean = *
        // If enabled, panning of the map will have an inertia effect where
        // the map builds momentum while dragging and continues moving in
        // the same direction for some time. Feels especially nice on touch
        // devices. Enabled by default.
        inertia: true,
        // @option inertiaDeceleration: Number = 3000
        // The rate with which the inertial movement slows down, in pixels/second².
        inertiaDeceleration: 3400,
        // px/s^2
        // @option inertiaMaxSpeed: Number = Infinity
        // Max speed of the inertial movement, in pixels/second.
        inertiaMaxSpeed: Infinity,
        // px/s
        // @option easeLinearity: Number = 0.2
        easeLinearity: 0.2,
        // TODO refactor, move to CRS
        // @option worldCopyJump: Boolean = false
        // With this option enabled, the map tracks when you pan to another "copy"
        // of the world and seamlessly jumps to the original one so that all overlays
        // like markers and vector layers are still visible.
        worldCopyJump: false,
        // @option maxBoundsViscosity: Number = 0.0
        // If `maxBounds` is set, this option will control how solid the bounds
        // are when dragging the map around. The default value of `0.0` allows the
        // user to drag outside the bounds at normal speed, higher values will
        // slow down map dragging outside bounds, and `1.0` makes the bounds fully
        // solid, preventing the user from dragging outside the bounds.
        maxBoundsViscosity: 0
      });
      var Drag = Handler.extend({
        addHooks: function() {
          if (!this._draggable) {
            var map = this._map;
            this._draggable = new Draggable(map._mapPane, map._container);
            this._draggable.on({
              dragstart: this._onDragStart,
              drag: this._onDrag,
              dragend: this._onDragEnd
            }, this);
            this._draggable.on("predrag", this._onPreDragLimit, this);
            if (map.options.worldCopyJump) {
              this._draggable.on("predrag", this._onPreDragWrap, this);
              map.on("zoomend", this._onZoomEnd, this);
              map.whenReady(this._onZoomEnd, this);
            }
          }
          addClass(this._map._container, "leaflet-grab leaflet-touch-drag");
          this._draggable.enable();
          this._positions = [];
          this._times = [];
        },
        removeHooks: function() {
          removeClass(this._map._container, "leaflet-grab");
          removeClass(this._map._container, "leaflet-touch-drag");
          this._draggable.disable();
        },
        moved: function() {
          return this._draggable && this._draggable._moved;
        },
        moving: function() {
          return this._draggable && this._draggable._moving;
        },
        _onDragStart: function() {
          var map = this._map;
          map._stop();
          if (this._map.options.maxBounds && this._map.options.maxBoundsViscosity) {
            var bounds = toLatLngBounds(this._map.options.maxBounds);
            this._offsetLimit = toBounds(
              this._map.latLngToContainerPoint(bounds.getNorthWest()).multiplyBy(-1),
              this._map.latLngToContainerPoint(bounds.getSouthEast()).multiplyBy(-1).add(this._map.getSize())
            );
            this._viscosity = Math.min(1, Math.max(0, this._map.options.maxBoundsViscosity));
          } else {
            this._offsetLimit = null;
          }
          map.fire("movestart").fire("dragstart");
          if (map.options.inertia) {
            this._positions = [];
            this._times = [];
          }
        },
        _onDrag: function(e) {
          if (this._map.options.inertia) {
            var time = this._lastTime = +/* @__PURE__ */ new Date(), pos = this._lastPos = this._draggable._absPos || this._draggable._newPos;
            this._positions.push(pos);
            this._times.push(time);
            this._prunePositions(time);
          }
          this._map.fire("move", e).fire("drag", e);
        },
        _prunePositions: function(time) {
          while (this._positions.length > 1 && time - this._times[0] > 50) {
            this._positions.shift();
            this._times.shift();
          }
        },
        _onZoomEnd: function() {
          var pxCenter = this._map.getSize().divideBy(2), pxWorldCenter = this._map.latLngToLayerPoint([0, 0]);
          this._initialWorldOffset = pxWorldCenter.subtract(pxCenter).x;
          this._worldWidth = this._map.getPixelWorldBounds().getSize().x;
        },
        _viscousLimit: function(value, threshold) {
          return value - (value - threshold) * this._viscosity;
        },
        _onPreDragLimit: function() {
          if (!this._viscosity || !this._offsetLimit) {
            return;
          }
          var offset = this._draggable._newPos.subtract(this._draggable._startPos);
          var limit = this._offsetLimit;
          if (offset.x < limit.min.x) {
            offset.x = this._viscousLimit(offset.x, limit.min.x);
          }
          if (offset.y < limit.min.y) {
            offset.y = this._viscousLimit(offset.y, limit.min.y);
          }
          if (offset.x > limit.max.x) {
            offset.x = this._viscousLimit(offset.x, limit.max.x);
          }
          if (offset.y > limit.max.y) {
            offset.y = this._viscousLimit(offset.y, limit.max.y);
          }
          this._draggable._newPos = this._draggable._startPos.add(offset);
        },
        _onPreDragWrap: function() {
          var worldWidth = this._worldWidth, halfWidth = Math.round(worldWidth / 2), dx = this._initialWorldOffset, x = this._draggable._newPos.x, newX1 = (x - halfWidth + dx) % worldWidth + halfWidth - dx, newX2 = (x + halfWidth + dx) % worldWidth - halfWidth - dx, newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;
          this._draggable._absPos = this._draggable._newPos.clone();
          this._draggable._newPos.x = newX;
        },
        _onDragEnd: function(e) {
          var map = this._map, options = map.options, noInertia = !options.inertia || e.noInertia || this._times.length < 2;
          map.fire("dragend", e);
          if (noInertia) {
            map.fire("moveend");
          } else {
            this._prunePositions(+/* @__PURE__ */ new Date());
            var direction = this._lastPos.subtract(this._positions[0]), duration = (this._lastTime - this._times[0]) / 1e3, ease = options.easeLinearity, speedVector = direction.multiplyBy(ease / duration), speed = speedVector.distanceTo([0, 0]), limitedSpeed = Math.min(options.inertiaMaxSpeed, speed), limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed), decelerationDuration = limitedSpeed / (options.inertiaDeceleration * ease), offset = limitedSpeedVector.multiplyBy(-decelerationDuration / 2).round();
            if (!offset.x && !offset.y) {
              map.fire("moveend");
            } else {
              offset = map._limitOffset(offset, map.options.maxBounds);
              requestAnimFrame(function() {
                map.panBy(offset, {
                  duration: decelerationDuration,
                  easeLinearity: ease,
                  noMoveStart: true,
                  animate: true
                });
              });
            }
          }
        }
      });
      Map2.addInitHook("addHandler", "dragging", Drag);
      Map2.mergeOptions({
        // @option keyboard: Boolean = true
        // Makes the map focusable and allows users to navigate the map with keyboard
        // arrows and `+`/`-` keys.
        keyboard: true,
        // @option keyboardPanDelta: Number = 80
        // Amount of pixels to pan when pressing an arrow key.
        keyboardPanDelta: 80
      });
      var Keyboard = Handler.extend({
        keyCodes: {
          left: [37],
          right: [39],
          down: [40],
          up: [38],
          zoomIn: [187, 107, 61, 171],
          zoomOut: [189, 109, 54, 173]
        },
        initialize: function(map) {
          this._map = map;
          this._setPanDelta(map.options.keyboardPanDelta);
          this._setZoomDelta(map.options.zoomDelta);
        },
        addHooks: function() {
          var container = this._map._container;
          if (container.tabIndex <= 0) {
            container.tabIndex = "0";
          }
          on(container, {
            focus: this._onFocus,
            blur: this._onBlur,
            mousedown: this._onMouseDown
          }, this);
          this._map.on({
            focus: this._addHooks,
            blur: this._removeHooks
          }, this);
        },
        removeHooks: function() {
          this._removeHooks();
          off(this._map._container, {
            focus: this._onFocus,
            blur: this._onBlur,
            mousedown: this._onMouseDown
          }, this);
          this._map.off({
            focus: this._addHooks,
            blur: this._removeHooks
          }, this);
        },
        _onMouseDown: function() {
          if (this._focused) {
            return;
          }
          var body = document.body, docEl = document.documentElement, top = body.scrollTop || docEl.scrollTop, left = body.scrollLeft || docEl.scrollLeft;
          this._map._container.focus();
          window.scrollTo(left, top);
        },
        _onFocus: function() {
          this._focused = true;
          this._map.fire("focus");
        },
        _onBlur: function() {
          this._focused = false;
          this._map.fire("blur");
        },
        _setPanDelta: function(panDelta) {
          var keys = this._panKeys = {}, codes = this.keyCodes, i, len;
          for (i = 0, len = codes.left.length; i < len; i++) {
            keys[codes.left[i]] = [-1 * panDelta, 0];
          }
          for (i = 0, len = codes.right.length; i < len; i++) {
            keys[codes.right[i]] = [panDelta, 0];
          }
          for (i = 0, len = codes.down.length; i < len; i++) {
            keys[codes.down[i]] = [0, panDelta];
          }
          for (i = 0, len = codes.up.length; i < len; i++) {
            keys[codes.up[i]] = [0, -1 * panDelta];
          }
        },
        _setZoomDelta: function(zoomDelta) {
          var keys = this._zoomKeys = {}, codes = this.keyCodes, i, len;
          for (i = 0, len = codes.zoomIn.length; i < len; i++) {
            keys[codes.zoomIn[i]] = zoomDelta;
          }
          for (i = 0, len = codes.zoomOut.length; i < len; i++) {
            keys[codes.zoomOut[i]] = -zoomDelta;
          }
        },
        _addHooks: function() {
          on(document, "keydown", this._onKeyDown, this);
        },
        _removeHooks: function() {
          off(document, "keydown", this._onKeyDown, this);
        },
        _onKeyDown: function(e) {
          if (e.altKey || e.ctrlKey || e.metaKey) {
            return;
          }
          var key = e.keyCode, map = this._map, offset;
          if (key in this._panKeys) {
            if (!map._panAnim || !map._panAnim._inProgress) {
              offset = this._panKeys[key];
              if (e.shiftKey) {
                offset = toPoint(offset).multiplyBy(3);
              }
              if (map.options.maxBounds) {
                offset = map._limitOffset(toPoint(offset), map.options.maxBounds);
              }
              if (map.options.worldCopyJump) {
                var newLatLng = map.wrapLatLng(map.unproject(map.project(map.getCenter()).add(offset)));
                map.panTo(newLatLng);
              } else {
                map.panBy(offset);
              }
            }
          } else if (key in this._zoomKeys) {
            map.setZoom(map.getZoom() + (e.shiftKey ? 3 : 1) * this._zoomKeys[key]);
          } else if (key === 27 && map._popup && map._popup.options.closeOnEscapeKey) {
            map.closePopup();
          } else {
            return;
          }
          stop2(e);
        }
      });
      Map2.addInitHook("addHandler", "keyboard", Keyboard);
      Map2.mergeOptions({
        // @section Mouse wheel options
        // @option scrollWheelZoom: Boolean|String = true
        // Whether the map can be zoomed by using the mouse wheel. If passed `'center'`,
        // it will zoom to the center of the view regardless of where the mouse was.
        scrollWheelZoom: true,
        // @option wheelDebounceTime: Number = 40
        // Limits the rate at which a wheel can fire (in milliseconds). By default
        // user can't zoom via wheel more often than once per 40 ms.
        wheelDebounceTime: 40,
        // @option wheelPxPerZoomLevel: Number = 60
        // How many scroll pixels (as reported by [L.DomEvent.getWheelDelta](#domevent-getwheeldelta))
        // mean a change of one full zoom level. Smaller values will make wheel-zooming
        // faster (and vice versa).
        wheelPxPerZoomLevel: 60
      });
      var ScrollWheelZoom = Handler.extend({
        addHooks: function() {
          on(this._map._container, "wheel", this._onWheelScroll, this);
          this._delta = 0;
        },
        removeHooks: function() {
          off(this._map._container, "wheel", this._onWheelScroll, this);
        },
        _onWheelScroll: function(e) {
          var delta = getWheelDelta(e);
          var debounce = this._map.options.wheelDebounceTime;
          this._delta += delta;
          this._lastMousePos = this._map.mouseEventToContainerPoint(e);
          if (!this._startTime) {
            this._startTime = +/* @__PURE__ */ new Date();
          }
          var left = Math.max(debounce - (+/* @__PURE__ */ new Date() - this._startTime), 0);
          clearTimeout(this._timer);
          this._timer = setTimeout(bind(this._performZoom, this), left);
          stop2(e);
        },
        _performZoom: function() {
          var map = this._map, zoom2 = map.getZoom(), snap = this._map.options.zoomSnap || 0;
          map._stop();
          var d2 = this._delta / (this._map.options.wheelPxPerZoomLevel * 4), d3 = 4 * Math.log(2 / (1 + Math.exp(-Math.abs(d2)))) / Math.LN2, d4 = snap ? Math.ceil(d3 / snap) * snap : d3, delta = map._limitZoom(zoom2 + (this._delta > 0 ? d4 : -d4)) - zoom2;
          this._delta = 0;
          this._startTime = null;
          if (!delta) {
            return;
          }
          if (map.options.scrollWheelZoom === "center") {
            map.setZoom(zoom2 + delta);
          } else {
            map.setZoomAround(this._lastMousePos, zoom2 + delta);
          }
        }
      });
      Map2.addInitHook("addHandler", "scrollWheelZoom", ScrollWheelZoom);
      var tapHoldDelay = 600;
      Map2.mergeOptions({
        // @section Touch interaction options
        // @option tapHold: Boolean
        // Enables simulation of `contextmenu` event, default is `true` for mobile Safari.
        tapHold: Browser.touchNative && Browser.safari && Browser.mobile,
        // @option tapTolerance: Number = 15
        // The max number of pixels a user can shift his finger during touch
        // for it to be considered a valid tap.
        tapTolerance: 15
      });
      var TapHold = Handler.extend({
        addHooks: function() {
          on(this._map._container, "touchstart", this._onDown, this);
        },
        removeHooks: function() {
          off(this._map._container, "touchstart", this._onDown, this);
        },
        _onDown: function(e) {
          clearTimeout(this._holdTimeout);
          if (e.touches.length !== 1) {
            return;
          }
          var first = e.touches[0];
          this._startPos = this._newPos = new Point(first.clientX, first.clientY);
          this._holdTimeout = setTimeout(bind(function() {
            this._cancel();
            if (!this._isTapValid()) {
              return;
            }
            on(document, "touchend", preventDefault);
            on(document, "touchend touchcancel", this._cancelClickPrevent);
            this._simulateEvent("contextmenu", first);
          }, this), tapHoldDelay);
          on(document, "touchend touchcancel contextmenu", this._cancel, this);
          on(document, "touchmove", this._onMove, this);
        },
        _cancelClickPrevent: function cancelClickPrevent() {
          off(document, "touchend", preventDefault);
          off(document, "touchend touchcancel", cancelClickPrevent);
        },
        _cancel: function() {
          clearTimeout(this._holdTimeout);
          off(document, "touchend touchcancel contextmenu", this._cancel, this);
          off(document, "touchmove", this._onMove, this);
        },
        _onMove: function(e) {
          var first = e.touches[0];
          this._newPos = new Point(first.clientX, first.clientY);
        },
        _isTapValid: function() {
          return this._newPos.distanceTo(this._startPos) <= this._map.options.tapTolerance;
        },
        _simulateEvent: function(type, e) {
          var simulatedEvent = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            // detail: 1,
            screenX: e.screenX,
            screenY: e.screenY,
            clientX: e.clientX,
            clientY: e.clientY
            // button: 2,
            // buttons: 2
          });
          simulatedEvent._simulated = true;
          e.target.dispatchEvent(simulatedEvent);
        }
      });
      Map2.addInitHook("addHandler", "tapHold", TapHold);
      Map2.mergeOptions({
        // @section Touch interaction options
        // @option touchZoom: Boolean|String = *
        // Whether the map can be zoomed by touch-dragging with two fingers. If
        // passed `'center'`, it will zoom to the center of the view regardless of
        // where the touch events (fingers) were. Enabled for touch-capable web
        // browsers.
        touchZoom: Browser.touch,
        // @option bounceAtZoomLimits: Boolean = true
        // Set it to false if you don't want the map to zoom beyond min/max zoom
        // and then bounce back when pinch-zooming.
        bounceAtZoomLimits: true
      });
      var TouchZoom = Handler.extend({
        addHooks: function() {
          addClass(this._map._container, "leaflet-touch-zoom");
          on(this._map._container, "touchstart", this._onTouchStart, this);
        },
        removeHooks: function() {
          removeClass(this._map._container, "leaflet-touch-zoom");
          off(this._map._container, "touchstart", this._onTouchStart, this);
        },
        _onTouchStart: function(e) {
          var map = this._map;
          if (!e.touches || e.touches.length !== 2 || map._animatingZoom || this._zooming) {
            return;
          }
          var p1 = map.mouseEventToContainerPoint(e.touches[0]), p2 = map.mouseEventToContainerPoint(e.touches[1]);
          this._centerPoint = map.getSize()._divideBy(2);
          this._startLatLng = map.containerPointToLatLng(this._centerPoint);
          if (map.options.touchZoom !== "center") {
            this._pinchStartLatLng = map.containerPointToLatLng(p1.add(p2)._divideBy(2));
          }
          this._startDist = p1.distanceTo(p2);
          this._startZoom = map.getZoom();
          this._moved = false;
          this._zooming = true;
          map._stop();
          on(document, "touchmove", this._onTouchMove, this);
          on(document, "touchend touchcancel", this._onTouchEnd, this);
          preventDefault(e);
        },
        _onTouchMove: function(e) {
          if (!e.touches || e.touches.length !== 2 || !this._zooming) {
            return;
          }
          var map = this._map, p1 = map.mouseEventToContainerPoint(e.touches[0]), p2 = map.mouseEventToContainerPoint(e.touches[1]), scale2 = p1.distanceTo(p2) / this._startDist;
          this._zoom = map.getScaleZoom(scale2, this._startZoom);
          if (!map.options.bounceAtZoomLimits && (this._zoom < map.getMinZoom() && scale2 < 1 || this._zoom > map.getMaxZoom() && scale2 > 1)) {
            this._zoom = map._limitZoom(this._zoom);
          }
          if (map.options.touchZoom === "center") {
            this._center = this._startLatLng;
            if (scale2 === 1) {
              return;
            }
          } else {
            var delta = p1._add(p2)._divideBy(2)._subtract(this._centerPoint);
            if (scale2 === 1 && delta.x === 0 && delta.y === 0) {
              return;
            }
            this._center = map.unproject(map.project(this._pinchStartLatLng, this._zoom).subtract(delta), this._zoom);
          }
          if (!this._moved) {
            map._moveStart(true, false);
            this._moved = true;
          }
          cancelAnimFrame(this._animRequest);
          var moveFn = bind(map._move, map, this._center, this._zoom, { pinch: true, round: false }, void 0);
          this._animRequest = requestAnimFrame(moveFn, this, true);
          preventDefault(e);
        },
        _onTouchEnd: function() {
          if (!this._moved || !this._zooming) {
            this._zooming = false;
            return;
          }
          this._zooming = false;
          cancelAnimFrame(this._animRequest);
          off(document, "touchmove", this._onTouchMove, this);
          off(document, "touchend touchcancel", this._onTouchEnd, this);
          if (this._map.options.zoomAnimation) {
            this._map._animateZoom(this._center, this._map._limitZoom(this._zoom), true, this._map.options.zoomSnap);
          } else {
            this._map._resetView(this._center, this._map._limitZoom(this._zoom));
          }
        }
      });
      Map2.addInitHook("addHandler", "touchZoom", TouchZoom);
      Map2.BoxZoom = BoxZoom;
      Map2.DoubleClickZoom = DoubleClickZoom;
      Map2.Drag = Drag;
      Map2.Keyboard = Keyboard;
      Map2.ScrollWheelZoom = ScrollWheelZoom;
      Map2.TapHold = TapHold;
      Map2.TouchZoom = TouchZoom;
      exports2.Bounds = Bounds;
      exports2.Browser = Browser;
      exports2.CRS = CRS;
      exports2.Canvas = Canvas;
      exports2.Circle = Circle;
      exports2.CircleMarker = CircleMarker;
      exports2.Class = Class;
      exports2.Control = Control;
      exports2.DivIcon = DivIcon;
      exports2.DivOverlay = DivOverlay;
      exports2.DomEvent = DomEvent;
      exports2.DomUtil = DomUtil;
      exports2.Draggable = Draggable;
      exports2.Evented = Evented;
      exports2.FeatureGroup = FeatureGroup;
      exports2.GeoJSON = GeoJSON;
      exports2.GridLayer = GridLayer;
      exports2.Handler = Handler;
      exports2.Icon = Icon;
      exports2.ImageOverlay = ImageOverlay;
      exports2.LatLng = LatLng;
      exports2.LatLngBounds = LatLngBounds;
      exports2.Layer = Layer;
      exports2.LayerGroup = LayerGroup;
      exports2.LineUtil = LineUtil;
      exports2.Map = Map2;
      exports2.Marker = Marker;
      exports2.Mixin = Mixin;
      exports2.Path = Path;
      exports2.Point = Point;
      exports2.PolyUtil = PolyUtil;
      exports2.Polygon = Polygon;
      exports2.Polyline = Polyline;
      exports2.Popup = Popup;
      exports2.PosAnimation = PosAnimation;
      exports2.Projection = index;
      exports2.Rectangle = Rectangle;
      exports2.Renderer = Renderer;
      exports2.SVG = SVG;
      exports2.SVGOverlay = SVGOverlay;
      exports2.TileLayer = TileLayer;
      exports2.Tooltip = Tooltip;
      exports2.Transformation = Transformation;
      exports2.Util = Util;
      exports2.VideoOverlay = VideoOverlay;
      exports2.bind = bind;
      exports2.bounds = toBounds;
      exports2.canvas = canvas;
      exports2.circle = circle;
      exports2.circleMarker = circleMarker;
      exports2.control = control;
      exports2.divIcon = divIcon;
      exports2.extend = extend;
      exports2.featureGroup = featureGroup;
      exports2.geoJSON = geoJSON;
      exports2.geoJson = geoJson;
      exports2.gridLayer = gridLayer;
      exports2.icon = icon;
      exports2.imageOverlay = imageOverlay;
      exports2.latLng = toLatLng;
      exports2.latLngBounds = toLatLngBounds;
      exports2.layerGroup = layerGroup;
      exports2.map = createMap;
      exports2.marker = marker;
      exports2.point = toPoint;
      exports2.polygon = polygon;
      exports2.polyline = polyline;
      exports2.popup = popup;
      exports2.rectangle = rectangle;
      exports2.setOptions = setOptions;
      exports2.stamp = stamp;
      exports2.svg = svg;
      exports2.svgOverlay = svgOverlay;
      exports2.tileLayer = tileLayer;
      exports2.tooltip = tooltip;
      exports2.transformation = toTransformation;
      exports2.version = version;
      exports2.videoOverlay = videoOverlay;
      var oldL = window.L;
      exports2.noConflict = function() {
        window.L = oldL;
        return this;
      };
      window.L = exports2;
    }));
  }
});

// js/map-providers.js
function getMapProviderId() {
  try {
    const id = localStorage.getItem(MAP_PROVIDER_KEY);
    if (id && MAP_PROVIDERS[id]) return id;
  } catch (e) {
  }
  return DEFAULT_MAP_PROVIDER;
}
function saveMapProviderId(id) {
  if (!MAP_PROVIDERS[id]) return;
  try {
    localStorage.setItem(MAP_PROVIDER_KEY, id);
  } catch (e) {
  }
}
function getMapProvider(id) {
  return MAP_PROVIDERS[id || getMapProviderId()] || MAP_PROVIDERS[DEFAULT_MAP_PROVIDER];
}
var MAP_PROVIDER_KEY, MAP_PROVIDERS, DEFAULT_MAP_PROVIDER;
var init_map_providers = __esm({
  "js/map-providers.js"() {
    MAP_PROVIDER_KEY = "moto-hud-map-provider";
    MAP_PROVIDERS = {
      "carto-voyager": {
        id: "carto-voyager",
        name: "CARTO Voyager",
        url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        opts: {
          subdomains: "abcd",
          maxZoom: 20,
          attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OSM'
        }
      },
      osm: {
        id: "osm",
        name: "OpenStreetMap",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        opts: {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        }
      },
      "carto-light": {
        id: "carto-light",
        name: "CARTO Positron (\u0441\u0432\u0435\u0442\u043B\u0430\u044F)",
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        opts: {
          subdomains: "abcd",
          maxZoom: 20,
          attribution: "&copy; CARTO &copy; OSM"
        }
      },
      "carto-dark": {
        id: "carto-dark",
        name: "CARTO Dark (\u0442\u0451\u043C\u043D\u0430\u044F)",
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        opts: {
          subdomains: "abcd",
          maxZoom: 20,
          attribution: "&copy; CARTO &copy; OSM"
        }
      },
      topo: {
        id: "topo",
        name: "OpenTopoMap (\u0440\u0435\u043B\u044C\u0435\u0444)",
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        opts: {
          maxZoom: 17,
          attribution: "&copy; OpenTopoMap &copy; OSM"
        }
      }
    };
    DEFAULT_MAP_PROVIDER = "carto-voyager";
  }
});

// js/route-map.js
function clearLayers() {
  if (!_map) return;
  _routeLayers.forEach((l) => _map.removeLayer(l));
  _hudWindowLayers.forEach((l) => _map.removeLayer(l));
  _markers.forEach((m) => _map.removeLayer(m));
  _routeLayers = [];
  _hudWindowLayers = [];
  _markers = [];
}
function routePolylineLatLngs(route) {
  if (route?.geometry?.n > 1) return geometryToLatLngs(route.geometry);
  const coords = route?.coords;
  if (!coords?.length) return [];
  return coords.map((c) => [c[0], c[1]]);
}
function latLngsForDistance(route, maxM, startS) {
  const geom = route?.geometry;
  if (geom?.n > 1) {
    return latLngsSliceByS(geom, startS || 0, (startS || 0) + maxM);
  }
  const coords = route?.coords;
  if (!coords || coords.length < 2) return [];
  const out = [[coords[0][0], coords[0][1]]];
  let acc = 0;
  for (let i = 0; i < coords.length - 1 && acc < maxM; i++) {
    const a = { lat: coords[i][0], lon: coords[i][1] };
    const b = { lat: coords[i + 1][0], lon: coords[i + 1][1] };
    const seg = haversine(a, b);
    if (acc + seg >= maxM) {
      const t = (maxM - acc) / seg;
      out.push([a.lat + t * (b.lat - a.lat), a.lon + t * (b.lon - a.lon)]);
      break;
    }
    acc += seg;
    out.push([b.lat, b.lon]);
  }
  return out;
}
function applyTileLayer(id) {
  const prov = getMapProvider(id);
  if (!_map) return;
  if (_tileLayer) _map.removeLayer(_tileLayer);
  _tileLayer = import_leaflet.default.tileLayer(prov.url, prov.opts);
  _tileLayer.addTo(_map);
}
function ensureMap() {
  const box = $("route-map");
  if (!box) return null;
  if (!_map) {
    box.innerHTML = "";
    _map = import_leaflet.default.map(box, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true
    });
    applyTileLayer(getMapProviderId());
  }
  return _map;
}
function initMapProviderSelect(onChange) {
  const sel = $("opt-map");
  if (!sel) return;
  sel.innerHTML = Object.values(MAP_PROVIDERS).map(
    (p) => '<option value="' + p.id + '">' + p.name + "</option>"
  ).join("");
  sel.value = getMapProviderId();
  sel.addEventListener("change", () => {
    saveMapProviderId(sel.value);
    applyTileLayer(sel.value);
    if (_lastRender) {
      renderRouteMap(
        _lastRender.alternatives,
        _lastRender.selectedIdx,
        _lastRender.start,
        _lastRender.finish
      );
    }
    if (onChange) onChange(sel.value);
  });
}
function renderRouteMap(alternatives, selectedIdx, start2, finish) {
  const section = $("route-section");
  if (!section) return;
  if (!alternatives || !alternatives.length) {
    section.classList.add("hidden");
    clearLayers();
    _lastRender = null;
    return;
  }
  _lastRender = { alternatives, selectedIdx, start: start2, finish };
  section.classList.remove("hidden");
  const map = ensureMap();
  if (!map) return;
  clearLayers();
  const bounds = import_leaflet.default.latLngBounds([]);
  alternatives.forEach((r, i) => {
    const latlngs = routePolylineLatLngs(r);
    latlngs.forEach((ll) => bounds.extend(ll));
    const sel = i === selectedIdx;
    const layer = import_leaflet.default.polyline(latlngs, {
      color: ROUTE_COLORS[i % ROUTE_COLORS.length],
      weight: sel ? 7 : 4,
      opacity: sel ? 1 : 0.45,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(map);
    layer.on("click", () => {
      if (_onSelect) _onSelect(i);
    });
    _routeLayers.push(layer);
    if (sel) {
      const hudLenM = getElevProfileLenM();
      const hudWin = latLngsForDistance(r, hudLenM, 0);
      if (hudWin.length > 1) {
        const glow = import_leaflet.default.polyline(hudWin, {
          color: "#ffffff",
          weight: 11,
          opacity: 0.28,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(map);
        const core = import_leaflet.default.polyline(hudWin, {
          color: ROUTE_COLORS[i % ROUTE_COLORS.length],
          weight: 5,
          opacity: 0.95,
          dashArray: "10,8",
          lineCap: "round",
          lineJoin: "round"
        }).addTo(map).bindTooltip("\u041E\u043A\u043D\u043E HUD ~" + hudLenM / 1e3 + " \u043A\u043C", { direction: "top", sticky: true });
        _hudWindowLayers.push(glow, core);
      }
    }
  });
  if (start2) {
    const m = import_leaflet.default.circleMarker([start2.lat, start2.lon], {
      radius: 9,
      color: "#000",
      weight: 2,
      fillColor: THEME.routeStart,
      fillOpacity: 1
    }).addTo(map).bindTooltip("\u0412\u044B", { permanent: false, direction: "top" });
    bounds.extend([start2.lat, start2.lon]);
    _markers.push(m);
  }
  if (finish) {
    const m = import_leaflet.default.circleMarker([finish.lat, finish.lon], {
      radius: 9,
      color: "#000",
      weight: 2,
      fillColor: THEME.routeFinish,
      fillOpacity: 1
    }).addTo(map).bindTooltip("\u0424\u0438\u043D\u0438\u0448", { permanent: false, direction: "top" });
    bounds.extend([finish.lat, finish.lon]);
    _markers.push(m);
  }
  const fuels = fuelStationsForMap(48);
  fuels.forEach((st) => {
    const col = fuelColor(st.status);
    const m = import_leaflet.default.circleMarker([st.lat, st.lon], {
      radius: 7,
      color: "#000",
      weight: 1,
      fillColor: col,
      fillOpacity: 0.92
    }).addTo(map).bindTooltip("\u26FD " + (st.brand || "\u0410\u0417\u0421"), { direction: "top", opacity: 0.92 });
    bounds.extend([st.lat, st.lon]);
    _markers.push(m);
  });
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
  }
  setTimeout(() => map.invalidateSize(), 120);
}
function renderRouteAlts(alternatives, selectedIdx, onPick) {
  const box = $("route-alts");
  if (!box) return;
  if (!alternatives || !alternatives.length) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = alternatives.map((r, i) => {
    const km = (r.distance / 1e3).toFixed(1);
    const min = Math.max(1, Math.round(r.duration / 60));
    const sel = i === selectedIdx;
    const col = ROUTE_COLORS[i % ROUTE_COLORS.length];
    return '<button type="button" class="route-alt' + (sel ? " sel" : "") + '" data-ri="' + i + '"><span class="ra-dot" style="background:' + col + '"></span><span class="ra-main">\u0412\u0430\u0440\u0438\u0430\u043D\u0442 ' + (i + 1) + '</span><span class="ra-meta">' + km + " \u043A\u043C \xB7 ~" + min + " \u043C\u0438\u043D</span></button>";
  }).join("");
  box.querySelectorAll(".route-alt").forEach((b) => {
    b.addEventListener("click", () => {
      const idx = parseInt(b.getAttribute("data-ri"), 10);
      if (!isNaN(idx)) onPick(idx);
    });
  });
}
function setRouteMapSelectHandler(fn) {
  _onSelect = fn;
}
function updateRouteInfo(route) {
  const el = $("route-info");
  if (!el || !route) {
    if (el) el.textContent = "";
    return;
  }
  const km = (route.distance / 1e3).toFixed(1);
  const min = Math.max(1, Math.round(route.duration / 60));
  el.textContent = "\u2705 " + km + " \u043A\u043C \xB7 ~" + min + " \u043C\u0438\u043D \u0434\u043E \u0444\u0438\u043D\u0438\u0448\u0430";
  el.className = "route-info ok";
}
function clearRouteMap() {
  $("route-section")?.classList.add("hidden");
  clearLayers();
  _lastRender = null;
  if ($("route-alts")) $("route-alts").innerHTML = "";
  if ($("route-info")) {
    $("route-info").textContent = "";
    $("route-info").className = "route-info";
  }
}
function invalidateRouteMapSize() {
  if (_map) setTimeout(() => _map.invalidateSize(), 150);
}
var import_leaflet, _onSelect, _map, _tileLayer, _routeLayers, _hudWindowLayers, _markers, _lastRender, ROUTE_COLORS;
var init_route_map = __esm({
  "js/route-map.js"() {
    import_leaflet = __toESM(require_leaflet_src());
    init_util();
    init_geo();
    init_elevation();
    init_route_geometry();
    init_map_providers();
    init_fuel();
    init_theme();
    _onSelect = null;
    _map = null;
    _tileLayer = null;
    _routeLayers = [];
    _hudWindowLayers = [];
    _markers = [];
    _lastRender = null;
    ROUTE_COLORS = THEME.routeAlts;
  }
});

// js/tts-health.js
async function auditTtsHealth() {
  if (!S.voice) {
    return { ok: true, offlineVoice: true, platform: "off", hint: "" };
  }
  if (isNative()) {
    try {
      const { TextToSpeech: TextToSpeech2 } = await Promise.resolve().then(() => (init_esm3(), esm_exports));
      const { supported } = await TextToSpeech2.isLanguageSupported({ lang: TTS_LANG });
      let offlineVoice = supported;
      let voices2 = 0;
      try {
        const res = await TextToSpeech2.getSupportedVoices();
        const list = res.voices || [];
        voices2 = list.length;
        const ru2 = list.filter((v) => (v.lang || "").toLowerCase().startsWith("ru"));
        if (ru2.length) {
          offlineVoice = ru2.some((v) => v.network === false || v.networkConnectionRequired === false);
        }
      } catch (e) {
      }
      return {
        ok: !!supported,
        offlineVoice,
        voices: voices2,
        platform: "native",
        hint: !supported ? "\u0420\u0443\u0441\u0441\u043A\u0438\u0439 \u0433\u043E\u043B\u043E\u0441 \u043D\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D \u2014 \u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F \u0431\u0443\u0434\u0435\u0442 \u0431\u0435\u0437 \u043E\u0437\u0432\u0443\u0447\u043A\u0438." : !offlineVoice ? "\u041D\u0435\u0442 \u043E\u0444\u043B\u0430\u0439\u043D-\u0433\u043E\u043B\u043E\u0441\u0430 \u2014 \u0432 \u0440\u0435\u0436\u0438\u043C\u0435 \xAB\u0432 \u0441\u0430\u043C\u043E\u043B\u0451\u0442\u0435\xBB \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438 \u043C\u043E\u0433\u0443\u0442 \u043D\u0435 \u0437\u0432\u0443\u0447\u0430\u0442\u044C." : ""
      };
    } catch (e) {
      return { ok: false, offlineVoice: false, platform: "native", hint: String(e.message || e) };
    }
  }
  if (!("speechSynthesis" in window)) {
    return { ok: false, offlineVoice: false, platform: "web", hint: "\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u043E\u0437\u0432\u0443\u0447\u043A\u0443." };
  }
  const voices = speechSynthesis.getVoices();
  const ru = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("ru"));
  const localRu = ru.filter((v) => v.localService);
  const best = ru.reduce((acc, v) => {
    const sc = scoreRuVoice(v);
    return sc > acc.score ? { score: sc, name: v.name } : acc;
  }, { score: -1, name: "" });
  return {
    ok: ru.length > 0,
    offlineVoice: localRu.length > 0,
    voices: ru.length,
    platform: "web",
    hint: !ru.length ? "\u0420\u0443\u0441\u0441\u043A\u0438\u0439 \u0433\u043E\u043B\u043E\u0441 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u2014 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043E\u0437\u0432\u0443\u0447\u043A\u0438 \u0441\u0438\u0441\u0442\u0435\u043C\u044B/\u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430." : !localRu.length ? "\u0422\u043E\u043B\u044C\u043A\u043E \u043E\u0431\u043B\u0430\u0447\u043D\u044B\u0435 \u0433\u043E\u043B\u043E\u0441\u0430 \u2014 \u0431\u0435\u0437 \u0441\u0435\u0442\u0438 \u043E\u0437\u0432\u0443\u0447\u043A\u0430 \u043C\u043E\u0436\u0435\u0442 \u043D\u0435 \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C." : best.name ? "\u0413\u043E\u043B\u043E\u0441: " + best.name : ""
  };
}
async function openTtsInstall() {
  if (!isNative()) return false;
  try {
    const { TextToSpeech: TextToSpeech2 } = await Promise.resolve().then(() => (init_esm3(), esm_exports));
    await TextToSpeech2.openInstall();
    return true;
  } catch (e) {
    console.warn("TTS install:", e);
    return false;
  }
}
function renderBanner(health) {
  const el = $("tts-banner");
  if (!el) return;
  if (!S.voice || health.ok && health.offlineVoice !== false) {
    el.classList.add("hidden");
    el.innerHTML = "";
    return;
  }
  el.classList.remove("hidden");
  let html = "<b>\u{1F50A} \u0413\u043E\u043B\u043E\u0441:</b> ";
  if (!health.ok) {
    html += health.hint || "\u0440\u0443\u0441\u0441\u043A\u0438\u0439 TTS \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D.";
  } else {
    html += health.hint || "\u043E\u0444\u043B\u0430\u0439\u043D-\u0433\u043E\u043B\u043E\u0441 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u2014 \u0441\u043A\u0430\u0447\u0430\u0439\u0442\u0435 \u044F\u0437\u044B\u043A\u043E\u0432\u043E\u0439 \u043F\u0430\u043A\u0435\u0442.";
  }
  if (isNative()) {
    html += ' <button type="button" class="linkish" id="btn-tts-install">\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0433\u043E\u043B\u043E\u0441\u0430</button>';
  }
  el.innerHTML = html;
  $("btn-tts-install")?.addEventListener("click", () => {
    openTtsInstall().then(() => setTimeout(refreshTtsBanner, 2e3));
  });
}
function applyTtsBanner(health) {
  renderBanner(health);
}
async function refreshTtsBanner() {
  const health = await auditTtsHealth();
  applyTtsBanner(health);
  return health;
}
function initTtsHealth() {
  initRuVoice();
  if ("speechSynthesis" in window) {
    speechSynthesis.addEventListener("voiceschanged", () => {
      refreshRuVoice();
      refreshTtsBanner();
    }, { once: false });
  }
  refreshTtsBanner();
}
var TTS_LANG;
var init_tts_health = __esm({
  "js/tts-health.js"() {
    init_state();
    init_util();
    init_platform();
    init_tts_ru();
    TTS_LANG = "ru-RU";
  }
});

// js/setup.js
var setup_exports = {};
__export(setup_exports, {
  applyCoordsOrLink: () => applyCoordsOrLink,
  bindSetupUI: () => bindSetupUI,
  doAddressSearch: () => doAddressSearch,
  doBuildRoute: () => doBuildRoute,
  doFuelSearch: () => doFuelSearch,
  initNativeHints: () => initNativeHints,
  invalidateRoute: () => invalidateRoute,
  refreshRouteUi: () => refreshRouteUi,
  setFinishQuiet: () => setFinishQuiet,
  setGoBarVisible: () => setGoBarVisible,
  syncOptionsFromDom: () => syncOptionsFromDom
});
function syncSimPath() {
  if (window.__SIM__?.setRoutePath && S.route?.coords?.length) {
    window.__SIM__.setRoutePath(S.route.coords);
  }
}
function setGoBarVisible(visible) {
  $("go-bar")?.classList.toggle("hidden", !visible);
  $("setup")?.classList.toggle("has-go-bar", !!visible);
}
function refreshRouteUi() {
  if (!S.route) return;
  renderRouteMap(S.routeAlternatives, S.selectedRouteIdx, S.gps, S.finish);
  renderRouteAlts(S.routeAlternatives, S.selectedRouteIdx, pickRoute);
  updateRouteInfo(S.route);
  syncSimPath();
  setGoBarVisible(true);
  loadCameras();
  checkStartReady();
  scheduleGeometryBuild(S.routeAlternatives, () => {
    renderRouteMap(S.routeAlternatives, S.selectedRouteIdx, S.gps, S.finish);
  });
}
function invalidateRoute() {
  S.route = null;
  S.routeAlternatives = [];
  S.selectedRouteIdx = 0;
  clearRouteMap();
  setGoBarVisible(false);
  checkStartReady();
  const b = $("btn-build-route");
  if (b) b.disabled = !(S.gps && S.finish);
}
function pickRoute(idx) {
  selectRouteIndex(idx);
  ensureRouteGeometry(S.route);
  renderRouteMap(S.routeAlternatives, S.selectedRouteIdx, S.gps, S.finish);
  renderRouteAlts(S.routeAlternatives, S.selectedRouteIdx, pickRoute);
  updateRouteInfo(S.route);
  syncSimPath();
  checkStartReady();
  loadCameras();
}
async function doBuildRoute() {
  if (!S.gps || !S.finish) {
    $("s-finish").textContent = "\u274C \u041D\u0443\u0436\u043D\u044B GPS \u0438 \u0444\u0438\u043D\u0438\u0448";
    $("s-finish").className = "status err";
    return;
  }
  const btn = $("btn-build-route");
  const prev = btn.textContent;
  btn.disabled = true;
  btn.textContent = "\u23F3 \u0421\u0442\u0440\u043E\u0438\u043C\u2026";
  $("route-info").textContent = "\u23F3 \u0417\u0430\u043F\u0440\u043E\u0441 \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u043E\u0432\u2026";
  $("route-info").className = "route-info";
  try {
    S.routeAlternatives = await fetchRouteAlternatives();
    S.selectedRouteIdx = 0;
    selectRouteIndex(0);
    renderRouteMap(S.routeAlternatives, 0, S.gps, S.finish);
    renderRouteAlts(S.routeAlternatives, 0, pickRoute);
    updateRouteInfo(S.route);
    syncSimPath();
    setGoBarVisible(true);
    loadCameras();
    telemetry_default.log("nav", { sub: "route_built", variants: S.routeAlternatives.length });
    $("s-finish").textContent = "\u2705 \u041C\u0430\u0440\u0448\u0440\u0443\u0442 \u043F\u043E\u0441\u0442\u0440\u043E\u0435\u043D \u2014 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0430\u0440\u0438\u0430\u043D\u0442 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041F\u041E\u0415\u0425\u0410\u041B\u0418\xBB \u0432\u043D\u0438\u0437\u0443";
    $("s-finish").className = "status ok";
    scheduleGeometryBuild(S.routeAlternatives, () => {
      renderRouteMap(S.routeAlternatives, S.selectedRouteIdx, S.gps, S.finish);
    });
    prefetchFuelForMap().then(() => {
      renderRouteMap(S.routeAlternatives, S.selectedRouteIdx, S.gps, S.finish);
    });
  } catch (e) {
    $("route-info").textContent = "\u274C " + e.message;
    $("route-info").className = "route-info";
    $("s-finish").textContent = "\u274C " + e.message;
    $("s-finish").className = "status err";
    clearRouteMap();
  } finally {
    btn.textContent = prev;
    btn.disabled = !(S.gps && S.finish);
    checkStartReady();
  }
}
async function doAddressSearch() {
  const q = $("finish-input").value.trim();
  if (!q) {
    $("s-finish").textContent = "\u274C \u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0430\u0434\u0440\u0435\u0441";
    $("s-finish").className = "status err";
    return;
  }
  if (parseInput(q)) {
    applyCoordsOrLink();
    return;
  }
  $("s-finish").textContent = "\u23F3 \u0418\u0449\u0435\u043C \u0430\u0434\u0440\u0435\u0441\u2026";
  $("s-finish").className = "status";
  S.finish = null;
  invalidateRoute();
  if (window.__motoHUD) window.__motoHUD._searchBusy = true;
  try {
    const res = await searchAddress(q);
    if (!res.length) {
      $("s-finish").textContent = "\u274C \u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E";
      $("s-finish").className = "status err";
      $("search-results").style.display = "none";
      return;
    }
    const box = $("search-results");
    box.innerHTML = "";
    res.forEach((r) => {
      const d = document.createElement("div");
      d.textContent = r.display_name;
      d.addEventListener("click", () => {
        S.finish = { lat: parseFloat(r.lat), lon: parseFloat(r.lon), label: r.display_name.split(",")[0] };
        $("s-finish").textContent = "\u2705 \u0424\u0438\u043D\u0438\u0448: " + r.display_name;
        $("s-finish").className = "status ok";
        $("finish-input").value = r.display_name;
        box.style.display = "none";
        invalidateRoute();
      });
      box.appendChild(d);
    });
    box.style.display = "block";
    box.scrollIntoView({ block: "nearest", behavior: "smooth" });
    $("s-finish").textContent = "\u{1F50E} \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0430\u0440\u0438\u0430\u043D\u0442 \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430";
    $("s-finish").className = "status";
  } catch (e) {
    $("s-finish").textContent = "\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u043E\u0438\u0441\u043A\u0430: " + e.message;
    $("s-finish").className = "status err";
  } finally {
    if (window.__motoHUD) window.__motoHUD._searchBusy = false;
  }
}
function applyFuelFinish(st) {
  const brand = st.brand || st.name || "\u0410\u0417\u0421";
  S.finish = { lat: st.lat, lon: st.lon, label: "\u26FD " + brand };
  const inputVal = st.name && st.name !== st.brand ? brand + " \u2014 " + st.name : brand;
  $("finish-input").value = inputVal;
  $("finish-input").dataset.userEdited = "1";
  $("s-finish").textContent = "\u2705 \u0424\u0438\u043D\u0438\u0448: " + inputVal + " \xB7 " + formatFuelDist(st.distGps);
  $("s-finish").className = "status ok";
  invalidateRoute();
  checkStartReady();
}
function fuelStationMetaLine(st) {
  const parts = ['<span class="fuel-st ' + (st.status || "unknown") + '">' + escapeHtml(fuelStatusText(st.status)) + "</span>"];
  if (st.confirmations) parts.push("\u043E\u0442\u0447\u0451\u0442\u043E\u0432: " + st.confirmations);
  if (st.lastAt) parts.push("\u0434\u0430\u043D\u043D\u044B\u0435: " + escapeHtml(String(st.lastAt).split(" ")[0]));
  return parts.join(" \xB7 ");
}
async function doFuelSearch() {
  if (!S.gps) {
    $("s-finish").textContent = "\u274C \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0435 GPS (\u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u{1F4CD} GPS)";
    $("s-finish").className = "status err";
    return;
  }
  const btn = $("btn-fuel-search");
  const prev = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "\u23F3 \u0418\u0449\u0435\u043C \u0410\u0417\u0421\u2026";
  }
  $("s-finish").textContent = "\u23F3 \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0437\u0430\u043F\u0440\u0430\u0432\u043E\u043A\u2026";
  $("s-finish").className = "status";
  try {
    syncOptionsFromDom();
    const limit = clampFuelPlannerCount(S.fuelPlannerCount);
    const list = await searchNearestFuelStations(limit);
    const box = $("search-results");
    box.innerHTML = "";
    if (!list.length) {
      $("s-finish").textContent = "\u274C \u0417\u0430\u043F\u0440\u0430\u0432\u043A\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B \u043F\u043E\u0431\u043B\u0438\u0437\u043E\u0441\u0442\u0438";
      $("s-finish").className = "status err";
      box.style.display = "none";
      return;
    }
    list.forEach((st) => {
      const row = document.createElement("div");
      row.className = "fuel-item";
      row.innerHTML = '<div class="fuel-title"><span>\u26FD ' + escapeHtml(st.brand || st.name || "\u0410\u0417\u0421") + '</span><span class="fuel-dist">' + formatFuelDist(st.distGps) + "</span></div>" + (st.name && st.name !== st.brand ? '<div class="fuel-meta">' + escapeHtml(st.name) + "</div>" : "") + '<div class="fuel-meta">' + fuelStationMetaLine(st) + "</div>";
      row.addEventListener("click", () => {
        applyFuelFinish(st);
        box.style.display = "none";
      });
      box.appendChild(row);
    });
    box.style.display = "block";
    box.scrollIntoView({ block: "nearest", behavior: "smooth" });
    $("s-finish").textContent = "\u26FD \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0437\u0430\u043F\u0440\u0430\u0432\u043A\u0443 (" + list.length + ")";
    $("s-finish").className = "status";
  } catch (e) {
    $("s-finish").textContent = "\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0410\u0417\u0421: " + e.message;
    $("s-finish").className = "status err";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = prev || "\u26FD \u0411\u043B\u0438\u0436\u0430\u0439\u0448\u0438\u0435 \u0437\u0430\u043F\u0440\u0430\u0432\u043A\u0438";
    }
  }
}
function setFinishQuiet(lat, lon, label = "\u0422\u043E\u0447\u043A\u0430") {
  S.finish = { lat, lon, label };
  $("s-finish").textContent = "\u2705 \u0424\u0438\u043D\u0438\u0448: " + lat.toFixed(5) + ", " + lon.toFixed(5);
  $("s-finish").className = "status ok";
  checkStartReady();
}
async function applyCoordsOrLink(opts = {}) {
  const hideSearch = opts.hideSearch !== false;
  const raw = $("finish-input").value.trim();
  if (await tryYandexRouteImport(raw)) return;
  const p = parseInput(raw);
  if (!p) {
    $("s-finish").textContent = "\u274C \u041D\u0435 \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u043B\u0438. \u041A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u044B, \u0441\u0441\u044B\u043B\u043A\u0430 \u0438\u043B\u0438 \xAB\u041D\u0430\u0439\u0442\u0438 \u0430\u0434\u0440\u0435\u0441\xBB";
    $("s-finish").className = "status err";
    return;
  }
  S.finish = p;
  $("s-finish").textContent = "\u2705 \u0424\u0438\u043D\u0438\u0448: " + p.lat.toFixed(5) + ", " + p.lon.toFixed(5);
  $("s-finish").className = "status ok";
  if (hideSearch) $("search-results").style.display = "none";
  invalidateRoute();
}
function isFullscreen() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}
function toggleFullscreen() {
  try {
    if (isFullscreen()) {
      (document.exitFullscreen || document.webkitExitFullscreen || function() {
      }).call(document);
    } else {
      const el = document.documentElement;
      (el.requestFullscreen || el.webkitRequestFullscreen || function() {
      }).call(el);
    }
  } catch (e) {
  }
}
function looksLikeCoordsOrLink(s2) {
  return /-?\d{1,2}\.\d+.*-?\d{1,3}\.\d+/.test(s2) || /[?&](ll|pt)=/.test(s2) || isYandexMapsUrl(s2);
}
async function tryYandexRouteImport(raw) {
  if (!isYandexMapsUrl(raw)) return false;
  try {
    await importYandexFromText(raw);
    return true;
  } catch (e) {
    $("s-finish").textContent = "\u274C " + (e.message || e);
    $("s-finish").className = "status err";
    return true;
  }
}
function bindSetupUI() {
  setRouteMapSelectHandler(pickRoute);
  initMapProviderSelect();
  $("s-gps").addEventListener("click", startGps);
  $("btn-search").addEventListener("click", doAddressSearch);
  $("btn-fuel-search")?.addEventListener("click", doFuelSearch);
  $("btn-parse").addEventListener("click", applyCoordsOrLink);
  $("btn-build-route").addEventListener("click", doBuildRoute);
  $("finish-input").addEventListener("input", () => {
    $("finish-input").dataset.userEdited = "1";
  });
  $("finish-input").addEventListener("focus", () => {
    if (window.__motoHUD) window.__motoHUD._finishFocused = true;
  });
  $("finish-input").addEventListener("blur", () => {
    if (window.__motoHUD) window.__motoHUD._finishFocused = false;
  });
  $("finish-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (looksLikeCoordsOrLink(e.target.value)) applyCoordsOrLink();
      else doAddressSearch();
    }
  });
  $("btn-paste").addEventListener("click", async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) {
        $("finish-input").value = t;
        if (await tryYandexRouteImport(t)) return;
        if (looksLikeCoordsOrLink(t)) await applyCoordsOrLink();
        else doAddressSearch();
      }
    } catch (e) {
      $("s-finish").textContent = "\u274C \u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u0431\u0443\u0444\u0435\u0440\u0443";
      $("s-finish").className = "status err";
    }
  });
  $("opt-voice").addEventListener("change", (e) => {
    S.voice = e.target.checked;
    refreshTtsBanner();
    saveAppOptsToStorage();
  });
  $("btn-compass-cal")?.addEventListener("click", async () => {
    const btn = $("btn-compass-cal");
    const ok = await requestHeadingPermission();
    if (!ok) {
      alert("\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A \u043A\u043E\u043C\u043F\u0430\u0441\u0443. \u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0434\u0430\u0442\u0447\u0438\u043A\u0438 \u043E\u0440\u0438\u0435\u043D\u0442\u0430\u0446\u0438\u0438 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430/\u0441\u0438\u0441\u0442\u0435\u043C\u044B.");
      return;
    }
    startCompassCalibration(15e3);
    if (btn) {
      btn.disabled = true;
      btn.textContent = "\u23F3 \u0412\u043E\u0441\u044C\u043C\u0451\u0440\u043A\u0430\u2026 15 \u0441";
    }
    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "\u{1F9ED} \u041A\u0430\u043B\u0438\u0431\u0440\u043E\u0432\u043A\u0430 \u043A\u043E\u043C\u043F\u0430\u0441\u0430";
      }
      if (!isCalibrating()) speak("\u041A\u0430\u043B\u0438\u0431\u0440\u043E\u0432\u043A\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430");
    }, 15e3);
  });
  $("opt-path").addEventListener("change", (e) => {
    S.showPath = e.target.checked;
    if (!S.showPath) {
      $("block-path").classList.add("hidden");
      $("hud").classList.add("no-path");
    } else {
      $("block-path").classList.remove("hidden");
      $("hud").classList.remove("no-path");
    }
    saveAppOptsToStorage();
  });
  $("opt-crossings")?.addEventListener("change", (e) => {
    S.showCrossingContext = e.target.checked;
    saveAppOptsToStorage();
  });
  function syncChevronInputs() {
    const on = S.showPathChevrons !== false;
    const labels = $("opt-chevron-labels");
    const maxEl = $("opt-chevron-max");
    if (labels) labels.disabled = !on;
    if (maxEl) maxEl.disabled = !on;
  }
  $("opt-path-chevrons")?.addEventListener("change", (e) => {
    S.showPathChevrons = e.target.checked;
    syncChevronInputs();
    saveAppOptsToStorage();
  });
  $("opt-chevron-labels")?.addEventListener("change", (e) => {
    S.pathChevronLabels = e.target.checked;
    saveAppOptsToStorage();
  });
  $("opt-chevron-max")?.addEventListener("change", (e) => {
    S.pathChevronMax = Math.max(1, Math.min(3, parseInt(e.target.value, 10) || DEFAULT_PATH_CHEVRON_MAX));
    e.target.value = String(S.pathChevronMax);
    saveAppOptsToStorage();
  });
  const bindFinishOpt = (id) => {
    $(id)?.addEventListener("change", () => {
      syncOptionsFromDom();
      saveHudOptsToStorage();
      applyFinishInfoVisibility();
    });
  };
  bindFinishOpt("opt-finish-dist");
  bindFinishOpt("opt-finish-time");
  bindFinishOpt("opt-finish-eta");
  $("opt-fuel-count")?.addEventListener("change", (e) => {
    S.fuelPlannerCount = clampFuelPlannerCount(e.target.value);
    e.target.value = String(S.fuelPlannerCount);
    saveHudOptsToStorage();
  });
  function syncElevInputs() {
    const on = S.showElevProfile;
    const exag = $("opt-elev-exag");
    const ph = $("opt-elev-profile-h");
    const plen = $("opt-elev-profile-len");
    if (exag) exag.disabled = !on;
    if (ph) ph.disabled = !on;
    if (plen) plen.disabled = !on;
  }
  $("opt-elev-profile").addEventListener("change", (e) => {
    S.showElevProfile = e.target.checked;
    syncElevInputs();
    saveElevOptsToStorage();
    if (S.showElevProfile && S.route?.geometry) loadRouteElevation();
  });
  $("opt-elev-exag").addEventListener("change", (e) => {
    S.elevExag = Math.max(0.5, Math.min(5, parseFloat(e.target.value) || DEFAULT_ELEV_EXAG));
    e.target.value = String(S.elevExag);
    saveElevOptsToStorage();
  });
  $("opt-elev-profile-h").addEventListener("change", (e) => {
    S.elevProfileH = Math.max(MIN_ELEV_PROFILE_H, Math.min(
      MAX_ELEV_PROFILE_H,
      parseInt(e.target.value, 10) || DEFAULT_ELEV_PROFILE_H
    ));
    e.target.value = String(S.elevProfileH);
    saveElevOptsToStorage();
  });
  $("opt-elev-profile-len").addEventListener("change", (e) => {
    S.elevProfileLenKm = Math.max(MIN_ELEV_PROFILE_LEN_KM, Math.min(
      MAX_ELEV_PROFILE_LEN_KM,
      parseInt(e.target.value, 10) || DEFAULT_ELEV_PROFILE_LEN_KM
    ));
    e.target.value = String(S.elevProfileLenKm);
    saveElevOptsToStorage();
    if (S.routeAlternatives?.length) renderRouteMap(S.routeAlternatives, S.selectedRouteIdx, S.gps, S.finish);
  });
  function syncCurveInputs() {
    const on = S.curveWarn;
    const sel = $("opt-curve-strict");
    if (sel) sel.disabled = !on;
  }
  function recomputeCurveIfReady() {
    const geom = S.route?.geometry;
    if (geom) computeCurveSpeed(geom, S.route);
  }
  $("opt-curve-warn").addEventListener("change", (e) => {
    S.curveWarn = e.target.checked;
    syncCurveInputs();
    saveCurveOptsToStorage();
  });
  $("opt-curve-strict").addEventListener("change", (e) => {
    const v = e.target.value;
    if (v === "relaxed" || v === "normal" || v === "strict") S.curveStrict = v;
    saveCurveOptsToStorage();
    recomputeCurveIfReady();
  });
  $("opt-heading").addEventListener("change", (e) => {
    S.showCompass = e.target.checked;
    $("hud").classList.toggle("show-compass", S.showCompass);
    saveAppOptsToStorage();
  });
  $("opt-cams").addEventListener("change", (e) => {
    S.cams = e.target.checked;
    if (!S.cams) {
      S.camLoadStatus = "off";
      S.cameras = [];
    }
    updateCamStatusUI();
    if (S.cams && S.route) loadCameras();
    saveAppOptsToStorage();
  });
  $("opt-back-only").addEventListener("change", (e) => {
    S.backOnly = e.target.checked;
    saveAppOptsToStorage();
  });
  $("opt-tol").addEventListener("change", (e) => {
    S.tolerance = Math.max(10, Math.min(90, parseInt(e.target.value, 10) || 45));
    saveAppOptsToStorage();
  });
  $("opt-nodir").addEventListener("change", (e) => {
    S.noDirPolicy = e.target.value;
    saveAppOptsToStorage();
  });
  $("opt-limit").addEventListener("change", (e) => {
    S.limit = parseInt(e.target.value, 10) || 0;
    saveAppOptsToStorage();
  });
  $("opt-cam-speed-tol")?.addEventListener("change", (e) => {
    S.camSpeedTol = Math.max(0, Math.min(50, parseInt(e.target.value, 10) || DEFAULT_CAM_SPEED_TOL));
    e.target.value = String(S.camSpeedTol);
    saveAppOptsToStorage();
  });
  $("btn-start").addEventListener("click", startHud);
  let stopArmed = false;
  let stopArmTimer = null;
  let stopLastTap = 0;
  $("btn-stop").addEventListener("click", (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - stopLastTap < 350) return;
    stopLastTap = now;
    if (stopArmed) {
      stopArmed = false;
      clearTimeout(stopArmTimer);
      $("btn-stop")?.classList.remove("armed");
      if (confirm("\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C \u043F\u043E\u0435\u0437\u0434\u043A\u0443?")) stopHud();
      return;
    }
    stopArmed = true;
    $("btn-stop")?.classList.add("armed");
    stopArmTimer = setTimeout(() => {
      stopArmed = false;
      $("btn-stop")?.classList.remove("armed");
    }, 1400);
  });
  $("btn-fuel").addEventListener("click", () => {
    cycleFuelAssist();
  });
  $("btn-gear").addEventListener("click", () => {
    $("setup").style.display = "block";
    $("setup").style.zIndex = "40";
  });
  $("qf-close").addEventListener("click", () => $("quickFinish").classList.remove("on"));
  $("btn-fs").addEventListener("click", toggleFullscreen);
  window.addEventListener("orientationchange", () => {
    invalidateRouteMapSize();
    setTimeout(() => {
      if ($("hud").classList.contains("on")) onTick();
    }, 250);
  });
  document.querySelectorAll(".setup-details").forEach((det) => {
    det.addEventListener("toggle", () => {
      if (det.open) setTimeout(() => det.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
    });
  });
}
function syncOptionsFromDom() {
  S.voice = $("opt-voice").checked;
  S.showPath = $("opt-path").checked;
  S.showCrossingContext = $("opt-crossings")?.checked ?? true;
  S.showPathChevrons = $("opt-path-chevrons")?.checked ?? true;
  S.pathChevronLabels = $("opt-chevron-labels")?.checked ?? true;
  S.pathChevronMax = Math.max(1, Math.min(
    3,
    parseInt($("opt-chevron-max")?.value, 10) || DEFAULT_PATH_CHEVRON_MAX
  ));
  if ($("opt-chevron-max")) $("opt-chevron-max").value = String(S.pathChevronMax);
  if ($("opt-chevron-labels")) $("opt-chevron-labels").disabled = !S.showPathChevrons;
  if ($("opt-chevron-max")) $("opt-chevron-max").disabled = !S.showPathChevrons;
  S.showFinishDist = $("opt-finish-dist")?.checked ?? true;
  S.showFinishTime = $("opt-finish-time")?.checked ?? true;
  S.showFinishEta = $("opt-finish-eta")?.checked ?? true;
  applyFinishInfoVisibility();
  S.fuelPlannerCount = clampFuelPlannerCount($("opt-fuel-count")?.value);
  if ($("opt-fuel-count")) $("opt-fuel-count").value = String(S.fuelPlannerCount);
  S.showElevProfile = $("opt-elev-profile").checked;
  S.elevExag = Math.max(0.5, Math.min(5, parseFloat($("opt-elev-exag").value) || DEFAULT_ELEV_EXAG));
  S.elevProfileH = Math.max(MIN_ELEV_PROFILE_H, Math.min(
    MAX_ELEV_PROFILE_H,
    parseInt($("opt-elev-profile-h")?.value, 10) || DEFAULT_ELEV_PROFILE_H
  ));
  S.elevProfileLenKm = Math.max(MIN_ELEV_PROFILE_LEN_KM, Math.min(
    MAX_ELEV_PROFILE_LEN_KM,
    parseInt($("opt-elev-profile-len")?.value, 10) || DEFAULT_ELEV_PROFILE_LEN_KM
  ));
  if ($("opt-elev-exag")) $("opt-elev-exag").value = String(S.elevExag);
  if ($("opt-elev-profile-h")) $("opt-elev-profile-h").value = String(S.elevProfileH);
  if ($("opt-elev-profile-len")) $("opt-elev-profile-len").value = String(S.elevProfileLenKm);
  if ($("opt-elev-exag")) $("opt-elev-exag").disabled = !S.showElevProfile;
  if ($("opt-elev-profile-h")) $("opt-elev-profile-h").disabled = !S.showElevProfile;
  if ($("opt-elev-profile-len")) $("opt-elev-profile-len").disabled = !S.showElevProfile;
  S.curveWarn = $("opt-curve-warn")?.checked ?? true;
  const strictEl = $("opt-curve-strict");
  if (strictEl) {
    S.curveStrict = strictEl.value || "normal";
    strictEl.disabled = !S.curveWarn;
  }
  S.showCompass = $("opt-heading").checked;
  S.cams = $("opt-cams").checked;
  S.backOnly = $("opt-back-only").checked;
  S.tolerance = parseInt($("opt-tol").value, 10) || 45;
  S.noDirPolicy = $("opt-nodir").value;
  S.limit = parseInt($("opt-limit").value, 10) || 60;
  S.camSpeedTol = Math.max(0, Math.min(
    50,
    parseInt($("opt-cam-speed-tol")?.value, 10) || DEFAULT_CAM_SPEED_TOL
  ));
  if ($("opt-cam-speed-tol")) $("opt-cam-speed-tol").value = String(S.camSpeedTol);
  $("hud")?.classList.toggle("show-compass", S.showCompass);
  if (!S.showPath) {
    $("block-path").classList.add("hidden");
    $("hud").classList.add("no-path");
  } else {
    $("block-path")?.classList.remove("hidden");
    $("hud")?.classList.remove("no-path");
  }
}
function initNativeHints() {
  if (!isAndroidNative()) return;
  const help = $("drawer-help")?.querySelector(".hint, .drawer-body");
  if (!help) return;
  help.innerHTML += '<span class="help-section"><b>Android-\u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435</b> \u041F\u0440\u0438 \u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u0438 \u2014 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435 \xAB\u041D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F \u0430\u043A\u0442\u0438\u0432\u043D\u0430\xBB (foreground-service GPS). \u0412 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u0441\u0438\u0441\u0442\u0435\u043C\u044B \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u044E \u0431\u0430\u0442\u0430\u0440\u0435\u0438 \u0434\u043B\u044F \xAB\u041C\u043E\u0442\u043E \u0418\u041B\u0421\xBB, \u0438\u043D\u0430\u0447\u0435 GPS \u043C\u043E\u0436\u0435\u0442 \u043E\u0442\u0432\u0430\u043B\u0438\u0432\u0430\u0442\u044C\u0441\u044F \u043D\u0430 Samsung/Xiaomi/Huawei. \u0427\u0435\u043A-\u043B\u0438\u0441\u0442: <code>docs/oem-gps-matrix.md</code>.</span>';
}
var init_setup = __esm({
  "js/setup.js"() {
    init_state();
    init_util();
    init_geo();
    init_yandex_link();
    init_yandex_import();
    init_gps();
    init_route();
    init_hud();
    init_cam_status();
    init_elevation();
    init_curve_speed();
    init_hud_opts();
    init_app_opts();
    init_platform();
    init_route_map();
    init_fuel();
    init_tts_health();
    init_heading();
    init_voice();
    init_telemetry();
  }
});

// js/favorites.js
function normalizeFav(raw, idx) {
  if (!raw || typeof raw !== "object") return null;
  const lat = typeof raw.lat === "number" ? raw.lat : parseFloat(raw.lat);
  const lon = typeof raw.lon === "number" ? raw.lon : parseFloat(raw.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const nameRaw = raw.name || raw.label || raw.title || raw.display_name;
  const name = typeof nameRaw === "string" && nameRaw.trim() ? nameRaw.trim().slice(0, 60) : "\u041C\u0435\u0441\u0442\u043E";
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : "f" + idx + "_" + Math.round(lat * 1e5) + "_" + Math.round(lon * 1e5),
    name,
    emoji: typeof raw.emoji === "string" && raw.emoji ? raw.emoji : "\u2B50",
    lat,
    lon
  };
}
function readFavsFromKey(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((f2, i) => normalizeFav(f2, i)).filter(Boolean);
  } catch (e) {
    return [];
  }
}
function loadFavs() {
  let list = readFavsFromKey(FAV_KEY);
  if (!list.length) {
    for (const key of LEGACY_FAV_KEYS) {
      if (key === FAV_KEY) continue;
      const legacy = readFavsFromKey(key);
      if (legacy.length) {
        list = legacy;
        saveFavs(list);
        break;
      }
    }
  }
  return list;
}
function saveFavs(list) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
  } catch (e) {
  }
}
function favNameHtml(f2) {
  return '<span class="fav-name"><span class="fav-emoji">' + (f2.emoji || "\u2B50") + "</span>" + escapeHtml(f2.name) + "</span>";
}
function refreshFavLists() {
  renderFavs();
  renderFavsEdit();
}
function renderFavs() {
  const box = $("favs-list");
  if (!box) return;
  const list = loadFavs();
  if (!list.length) {
    box.innerHTML = '<div class="favs-empty">\u041F\u0443\u0441\u0442\u043E. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043C\u0435\u0441\u0442\u0430 \u0432 \xAB\u2B50 \u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435 \u2014 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435\xBB \u043D\u0438\u0436\u0435.</div>';
    return;
  }
  box.innerHTML = list.map(
    (f2) => '<div class="fav-item"><button type="button" class="fav-apply" data-id="' + f2.id + '">' + favNameHtml(f2) + "</button></div>"
  ).join("");
  box.querySelectorAll(".fav-apply").forEach((b) => {
    b.addEventListener("click", () => applyFav(b.getAttribute("data-id")));
  });
}
function renderFavsEdit() {
  const box = $("favs-edit-list");
  if (!box) return;
  const list = loadFavs();
  if (!list.length) {
    box.innerHTML = '<div class="favs-empty">\u041D\u0435\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u043C\u0435\u0441\u0442.</div>';
    return;
  }
  box.innerHTML = list.map(
    (f2) => '<div class="fav-item-edit"><div class="fav-edit-info">' + favNameHtml(f2) + '</div><button type="button" class="fav-del" data-del="' + f2.id + '" aria-label="\u0423\u0434\u0430\u043B\u0438\u0442\u044C" title="\u0423\u0434\u0430\u043B\u0438\u0442\u044C">\u2715</button></div>'
  ).join("");
  box.querySelectorAll(".fav-del").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-del");
      const fav = loadFavs().find((x) => x.id === id);
      if (fav && confirm("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \xAB" + fav.name + "\xBB?")) deleteFav(id);
    });
  });
}
function addFav(name, point, emoji) {
  if (!point || typeof point.lat !== "number" || typeof point.lon !== "number") return;
  const list = loadFavs();
  list.push({
    id: "f" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
    name: (name || "\u041C\u0435\u0441\u0442\u043E").trim().slice(0, 60) || "\u041C\u0435\u0441\u0442\u043E",
    emoji: emoji || "\u2B50",
    lat: point.lat,
    lon: point.lon
  });
  saveFavs(list);
  refreshFavLists();
}
function deleteFav(id) {
  saveFavs(loadFavs().filter((f2) => f2.id !== id));
  refreshFavLists();
}
function applyFav(id) {
  const fav = loadFavs().find((f2) => f2.id === id);
  if (!fav) return;
  S.finish = { lat: fav.lat, lon: fav.lon, label: fav.name };
  $("s-finish").textContent = "\u2705 " + (fav.emoji || "\u2B50") + " " + fav.name + " (" + fav.lat.toFixed(5) + ", " + fav.lon.toFixed(5) + ")";
  $("s-finish").className = "status ok";
  $("finish-input").value = fav.lat + ", " + fav.lon;
  $("search-results").style.display = "none";
  invalidateRoute();
  checkStartReady();
}
function openFavModal(defaultName, point) {
  if (!point) {
    alert("\u041D\u0435\u0442 \u0442\u043E\u0447\u043A\u0438 \u0434\u043B\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F");
    return;
  }
  favModalState = { point, emoji: "\u2B50" };
  const row = $("emoji-row");
  row.innerHTML = FAV_EMOJIS.map(
    (e) => '<button type="button" data-e="' + e + '"' + (e === "\u2B50" ? ' class="sel"' : "") + ">" + e + "</button>"
  ).join("");
  row.querySelectorAll("button").forEach((b) => {
    b.addEventListener("click", () => {
      favModalState.emoji = b.getAttribute("data-e");
      row.querySelectorAll("button").forEach((x) => x.classList.remove("sel"));
      b.classList.add("sel");
    });
  });
  $("fav-name-input").value = defaultName || "";
  $("favModal").classList.add("on");
  setTimeout(() => $("fav-name-input").focus(), 100);
}
function closeFavModal() {
  $("favModal").classList.remove("on");
}
function openQuickFinish() {
  const box = $("qf-list");
  const list = loadFavs();
  if (!list.length) {
    box.innerHTML = '<div class="qf-empty">NO SAVED PLACES<br>\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u043C\u0435\u0441\u0442\u0430 \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445</div>';
  } else {
    box.innerHTML = list.map(
      (f2) => '<button class="qf-item" data-id="' + f2.id + '">' + (f2.emoji || "\u2B50") + " " + escapeHtml(f2.name) + '<span class="c">' + f2.lat.toFixed(4) + ", " + f2.lon.toFixed(4) + "</span></button>"
    ).join("");
    box.querySelectorAll(".qf-item").forEach((b) => {
      b.addEventListener("click", () => {
        selectQuickFinish(b.getAttribute("data-id"), loadFavs, async () => {
          await buildRoute();
          loadCameras();
        });
      });
    });
  }
  $("quickFinish").classList.add("on");
}
function initFavorites() {
  refreshFavLists();
  $("fav-modal-cancel")?.addEventListener("click", closeFavModal);
  $("fav-modal-ok")?.addEventListener("click", () => {
    const name = $("fav-name-input").value.trim() || "\u041C\u0435\u0441\u0442\u043E";
    addFav(name, favModalState.point, favModalState.emoji);
    closeFavModal();
  });
  $("btn-fav-save-finish")?.addEventListener("click", () => {
    if (!S.finish) {
      $("s-finish").textContent = "\u274C \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0434\u0430\u0439\u0442\u0435 \u0444\u0438\u043D\u0438\u0448, \u043F\u043E\u0442\u043E\u043C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435";
      $("s-finish").className = "status err";
      return;
    }
    const defaultName = S.finish.label && !/^Финиш|^Координаты/.test(S.finish.label) ? S.finish.label.split(",")[0] : "";
    openFavModal(defaultName, { lat: S.finish.lat, lon: S.finish.lon });
  });
  $("btn-fav-save-gps")?.addEventListener("click", () => {
    if (S.gps) {
      openFavModal("", { lat: S.gps.lat, lon: S.gps.lon });
      return;
    }
    $("s-gps").textContent = "\u23F3 GPS\u2026";
    $("s-gps").className = "chip";
    const check = setInterval(() => {
      if (S.gps) {
        clearInterval(check);
        openFavModal("", { lat: S.gps.lat, lon: S.gps.lon });
      }
    }, 500);
    setTimeout(() => clearInterval(check), 2e4);
    startGps();
  });
  $("btn-fav-export")?.addEventListener("click", () => {
    const list = loadFavs();
    if (!list.length) {
      alert("\u041D\u0435\u0442 \u043C\u0435\u0441\u0442 \u0434\u043B\u044F \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430");
      return;
    }
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "moto-hud-\u043C\u0435\u0441\u0442\u0430.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  });
  $("btn-fav-import")?.addEventListener("click", () => $("fav-file")?.click());
  $("fav-file")?.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error("format");
        const valid = imported.map((f2, i) => normalizeFav(f2, i)).filter(Boolean);
        if (!valid.length) {
          alert("\u0412 \u0444\u0430\u0439\u043B\u0435 \u043D\u0435\u0442 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0445 \u043C\u0435\u0441\u0442");
          return;
        }
        const cur = loadFavs();
        const seen = new Set(cur.map((f2) => f2.lat.toFixed(5) + "," + f2.lon.toFixed(5)));
        let added = 0;
        valid.forEach((f2) => {
          const key = f2.lat.toFixed(5) + "," + f2.lon.toFixed(5);
          if (seen.has(key)) return;
          seen.add(key);
          cur.push(f2);
          added++;
        });
        saveFavs(cur);
        refreshFavLists();
        alert("\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043E \u043C\u0435\u0441\u0442: " + added + (valid.length - added ? " (\u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E \u0434\u0443\u0431\u043B\u0435\u0439: " + (valid.length - added) + ")" : ""));
      } catch (err) {
        alert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0444\u0430\u0439\u043B: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });
  const mid = $("mid-info");
  if (mid) {
    let pressTimer = null;
    mid.addEventListener("pointerdown", () => {
      if (!$("hud").classList.contains("on")) return;
      pressTimer = setTimeout(openQuickFinish, 600);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => {
      mid.addEventListener(ev, () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      });
    });
  }
}
var FAV_EMOJIS, LEGACY_FAV_KEYS, favModalState;
var init_favorites = __esm({
  "js/favorites.js"() {
    init_state();
    init_util();
    init_gps();
    init_route();
    init_setup();
    init_hud();
    FAV_EMOJIS = ["\u{1F3E0}", "\u{1F3E2}", "\u26FD", "\u{1F354}", "\u{1F3CD}", "\u{1F3D4}", "\u{1F3D6}", "\u{1F6E0}", "\u{1F17F}", "\u2B50", "\u2764", "\u{1F4CD}"];
    LEGACY_FAV_KEYS = ["moto-hud-favs", "moto-hud-places", "mh-favs"];
    favModalState = { point: null, emoji: "\u2B50" };
  }
});

// node_modules/@capacitor-community/keep-awake/dist/esm/definitions.js
var init_definitions4 = __esm({
  "node_modules/@capacitor-community/keep-awake/dist/esm/definitions.js"() {
  }
});

// node_modules/@capacitor-community/keep-awake/dist/esm/web.js
var web_exports4 = {};
__export(web_exports4, {
  KeepAwakeWeb: () => KeepAwakeWeb
});
var KeepAwakeWeb;
var init_web4 = __esm({
  "node_modules/@capacitor-community/keep-awake/dist/esm/web.js"() {
    init_dist();
    KeepAwakeWeb = class extends WebPlugin {
      constructor() {
        super(...arguments);
        this.wakeLock = null;
        this._isSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;
        this.handleVisibilityChange = () => {
          if (document.visibilityState === "visible")
            this.keepAwake();
        };
      }
      async keepAwake() {
        if (!this._isSupported) {
          this.throwUnsupportedError();
        }
        if (this.wakeLock) {
          await this.allowSleep();
        }
        this.wakeLock = await navigator.wakeLock.request("screen");
        document.addEventListener("visibilitychange", this.handleVisibilityChange);
        document.addEventListener("fullscreenchange", this.handleVisibilityChange);
      }
      async allowSleep() {
        var _a;
        if (!this._isSupported) {
          this.throwUnsupportedError();
        }
        (_a = this.wakeLock) === null || _a === void 0 ? void 0 : _a.release();
        this.wakeLock = null;
        document.removeEventListener("visibilitychange", this.handleVisibilityChange);
        document.removeEventListener("fullscreenchange", this.handleVisibilityChange);
      }
      async isSupported() {
        const result = {
          isSupported: this._isSupported
        };
        return result;
      }
      async isKeptAwake() {
        if (!this._isSupported) {
          this.throwUnsupportedError();
        }
        const result = {
          isKeptAwake: !!this.wakeLock
        };
        return result;
      }
      throwUnsupportedError() {
        throw this.unavailable("Screen Wake Lock API not available in this browser.");
      }
    };
  }
});

// node_modules/@capacitor-community/keep-awake/dist/esm/index.js
var esm_exports2 = {};
__export(esm_exports2, {
  KeepAwake: () => KeepAwake
});
var KeepAwake;
var init_esm4 = __esm({
  "node_modules/@capacitor-community/keep-awake/dist/esm/index.js"() {
    init_dist();
    init_definitions4();
    KeepAwake = registerPlugin("KeepAwake", {
      web: () => Promise.resolve().then(() => (init_web4(), web_exports4)).then((m) => new m.KeepAwakeWeb())
    });
  }
});

// js/wake-lock.js
async function acquireWakeLock() {
  try {
    if (isNative()) {
      const { KeepAwake: KeepAwake2 } = await Promise.resolve().then(() => (init_esm4(), esm_exports2));
      await KeepAwake2.keepAwake();
      _nativeAwake = true;
      return;
    }
    if ("wakeLock" in navigator) {
      S.wakeLock = await navigator.wakeLock.request("screen");
      S.wakeLock.addEventListener?.("release", () => {
        telemetry_default.log("sys", { sub: "wakelock_lost" });
      });
    }
  } catch (e) {
    console.warn("Wake-lock:", e);
  }
}
async function releaseWakeLock() {
  try {
    if (_nativeAwake && isNative()) {
      const { KeepAwake: KeepAwake2 } = await Promise.resolve().then(() => (init_esm4(), esm_exports2));
      await KeepAwake2.allowSleep();
      _nativeAwake = false;
    }
  } catch (e) {
  }
  if (S.wakeLock) {
    try {
      S.wakeLock.release();
    } catch (e) {
    }
    S.wakeLock = null;
  }
}
var _nativeAwake;
var init_wake_lock = __esm({
  "js/wake-lock.js"() {
    init_state();
    init_platform();
    init_telemetry();
    _nativeAwake = false;
  }
});

// js/sun-mode.js
function sunTimes(lat, lon, date = /* @__PURE__ */ new Date()) {
  const zenith = 90.833;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  const lngHour = lon / 15;
  function calc(isSunrise) {
    const t = isSunrise ? dayOfYear + (6 - lngHour) / 24 : dayOfYear + (18 - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    let L5 = M + 1.916 * Math.sin(M * Math.PI / 180) + 0.02 * Math.sin(2 * M * Math.PI / 180) + 282.634;
    L5 = (L5 % 360 + 360) % 360;
    let RA = Math.atan(0.91764 * Math.tan(L5 * Math.PI / 180)) * 180 / Math.PI;
    RA = (RA % 360 + 360) % 360;
    const Lq = Math.floor(L5 / 90) * 90;
    const Rq = Math.floor(RA / 90) * 90;
    RA = (RA + (Lq - Rq)) / 15;
    const sinDec = 0.39782 * Math.sin(L5 * Math.PI / 180);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH = (Math.cos(zenith * Math.PI / 180) - sinDec * Math.sin(lat * Math.PI / 180)) / (cosDec * Math.cos(lat * Math.PI / 180));
    if (cosH > 1 || cosH < -1) {
      return isSunrise ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 6, 0, 0) : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0);
    }
    let H = Math.acos(cosH) * 180 / Math.PI / 15;
    if (!isSunrise) H = 24 - H;
    const T = H + RA - 0.06571 * t - 6.622;
    let ut = T - lngHour;
    ut = (ut % 24 + 24) % 24;
    const h = Math.floor(ut);
    const m = Math.floor((ut - h) * 60);
    const s2 = Math.floor(((ut - h) * 60 - m) * 60);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, s2);
  }
  return { sunrise: calc(true), sunset: calc(false) };
}
function resolveDisplayMode(pref, pos, now = /* @__PURE__ */ new Date()) {
  if (pref === "day") return "day";
  if (pref === "night") return "night";
  const lat = pos?.lat;
  const lon = pos?.lon;
  if (lat != null && lon != null && !isNaN(lat) && !isNaN(lon)) {
    const { sunrise, sunset } = sunTimes(lat, lon, now);
    const dawn = sunrise.getTime() + HYST_MS;
    const dusk = sunset.getTime() - HYST_MS;
    const ts = now.getTime();
    let target = ts >= dawn && ts < dusk ? "day" : "night";
    if (target !== _lastResolved && ts - _lastSwitchTs < HYST_MS) {
      return _lastResolved;
    }
    if (target !== _lastResolved) {
      _lastResolved = target;
      _lastSwitchTs = ts;
    }
    return target;
  }
  const h = now.getHours() + now.getMinutes() / 60;
  return h >= 7 && h < 21 ? "day" : "night";
}
function resetModeHysteresis() {
  _lastResolved = "night";
  _lastSwitchTs = 0;
}
var HYST_MS, _lastResolved, _lastSwitchTs;
var init_sun_mode = __esm({
  "js/sun-mode.js"() {
    HYST_MS = 20 * 60 * 1e3;
    _lastResolved = "night";
    _lastSwitchTs = 0;
  }
});

// js/theme-manager.js
function loadThemePrefs() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return { theme: "avionics", modePref: "night" };
    const o = JSON.parse(raw);
    return {
      theme: THEME_IDS.includes(o.theme) ? o.theme : "avionics",
      modePref: MODE_PREFS.includes(o.modePref) ? o.modePref : "night"
    };
  } catch (e) {
    return { theme: "avionics", modePref: "night" };
  }
}
function saveThemePrefs(prefs) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
  }
}
function applyTheme(theme, modePref, save = true) {
  const html = document.documentElement;
  THEME_IDS.forEach((id) => html.classList.remove("theme-" + id));
  const tid = THEME_IDS.includes(theme) ? theme : "avionics";
  html.classList.add("theme-" + tid);
  const pos = S.gps ? { lat: S.gps.lat, lon: S.gps.lon } : null;
  const mode = resolveDisplayMode(modePref, pos);
  html.setAttribute("data-mode", mode);
  if (save) saveThemePrefs({ theme: tid, modePref });
  applyThemeCss();
  syncThemeControls(tid, modePref);
  updateModeButtonLabel(modePref, mode);
  if ($2("hud")?.classList.contains("on")) renderVisualFrame();
  syncVintageVfdDomClasses();
}
function $2(id) {
  return document.getElementById(id);
}
function syncThemeControls(theme, modePref) {
  const sel = $2("opt-theme");
  if (sel) sel.value = theme;
  const mDay = $2("opt-mode-day");
  const mNight = $2("opt-mode-night");
  const mAuto = $2("opt-mode-auto");
  if (mDay) mDay.checked = modePref === "day";
  if (mNight) mNight.checked = modePref === "night";
  if (mAuto) mAuto.checked = modePref === "auto";
}
function updateModeButtonLabel(modePref, resolved) {
  const btn = $2("btn-mode");
  if (!btn) return;
  const lbl = btn.querySelector(".cb-lbl");
  if (!lbl) return;
  if (modePref === "auto") {
    lbl.textContent = resolved === "day" ? "\u0410\u0412\u0422\u041E\u2600" : "\u0410\u0412\u0422\u041E\u{1F319}";
  } else if (modePref === "day") {
    lbl.textContent = "\u0414\u0415\u041D\u042C";
  } else {
    lbl.textContent = "\u041D\u041E\u0427\u042C";
  }
}
function tickAutoMode() {
  const cur = loadThemePrefs();
  if (cur.modePref !== "auto") return;
  const now = Date.now();
  if (now - _lastAutoCheck < 3e4) return;
  _lastAutoCheck = now;
  const pos = S.gps ? { lat: S.gps.lat, lon: S.gps.lon } : null;
  const mode = resolveDisplayMode("auto", pos);
  const html = document.documentElement;
  if (html.getAttribute("data-mode") !== mode) {
    html.setAttribute("data-mode", mode);
    invalidateThemeTokens();
    applyThemeCss();
    updateModeButtonLabel("auto", mode);
    if ($2("hud")?.classList.contains("on")) renderVisualFrame();
  } else {
    updateModeButtonLabel("auto", mode);
  }
}
function initThemeManager() {
  const cur = loadThemePrefs();
  applyTheme(cur.theme, cur.modePref, false);
  $2("opt-theme")?.addEventListener("change", (e) => {
    applyTheme(e.target.value, loadThemePrefs().modePref);
  });
  ["opt-mode-day", "opt-mode-night", "opt-mode-auto"].forEach((id) => {
    $2(id)?.addEventListener("change", (e) => {
      if (!e.target.checked) return;
      const mode = id.replace("opt-mode-", "");
      if (mode !== "auto") resetModeHysteresis();
      applyTheme(loadThemePrefs().theme, mode);
    });
  });
}
var THEME_STORAGE_KEY, THEME_IDS, MODE_PREFS, _lastAutoCheck;
var init_theme_manager = __esm({
  "js/theme-manager.js"() {
    init_state();
    init_theme();
    init_sun_mode();
    init_render();
    init_vintage_vfd();
    THEME_STORAGE_KEY = "moto-hud-theme";
    THEME_IDS = ["avionics", "hitech", "space", "sport", "chopper", "vintage"];
    MODE_PREFS = ["day", "night", "auto"];
    _lastAutoCheck = 0;
  }
});

// js/offroute.js
function clearOffRouteWarn() {
  const el = $("offRouteWarn");
  if (!el) return;
  el.classList.remove("on");
  el.textContent = OFF_ROUTE_WARN_OK;
}
function showRerouteOk() {
  const el = $("offRouteWarn");
  if (!el) return;
  el.textContent = OFF_ROUTE_WARN_OK;
  el.classList.add("on");
  setTimeout(() => clearOffRouteWarn(), 2e3);
}
function showOfflineWarn() {
  const el = $("offRouteWarn");
  if (!el) return;
  el.textContent = OFF_ROUTE_WARN_FAIL;
  el.classList.add("on");
}
function resetBackoff() {
  S.rerouteBackoffStep = 0;
  S.rerouteBackoffUntil = 0;
}
function resetSuspectCtx() {
  _ctx.confirmMs = 0;
  _ctx.suspectDistM = 0;
  _ctx.headingDivergeSince = 0;
}
function resetOfflineCtx() {
  _ctx.offlineEntryVoice = false;
  _ctx.offlineVoiceBucket = null;
}
function resetCtx() {
  resetSuspectCtx();
  resetOfflineCtx();
  _ctx.lastFeedMs = 0;
  _ctx.rerouteBusy = false;
}
function resetOffRouteMachine() {
  S.offRouteState = OffRouteState.ON_ROUTE;
  resetBackoff();
  resetCtx();
  clearOffRouteWarn();
}
function isOfflineGuide() {
  return S.offRouteState === OffRouteState.OFFLINE_GUIDE;
}
function transition(from, to, meta) {
  S.offRouteState = to;
  telemetry_default.log("nav", {
    sub: "offroute_state",
    from,
    to,
    lateral: meta.lateral,
    spd: meta.spd,
    trigger: meta.trigger || void 0
  });
}
function metaFromFeed(feed) {
  return {
    lateral: feed.lateral,
    spd: feed.spdKmh,
    trigger: feed.trigger
  };
}
function confirmDistForSpeed(spdMps) {
  return spdMps > OFF_ROUTE_HIGH_SPD_MPS ? OFF_ROUTE_CONFIRM_DIST_HIGH_M : OFF_ROUTE_CONFIRM_DIST_M;
}
function confirmMsForSpeed(spdMps) {
  return spdMps > OFF_ROUTE_HIGH_SPD_MPS ? OFF_ROUTE_CONFIRM_MS_HIGH_SPD : OFF_ROUTE_CONFIRM_MS;
}
function headingDiverged(feed, now) {
  if (feed.spdMps <= OFF_ROUTE_HEADING_MIN_SPD) return false;
  if (feed.heading == null || isNaN(feed.heading)) return false;
  if (feed.tangent == null || isNaN(feed.tangent)) return false;
  if (angleDiff(feed.heading, feed.tangent) <= OFF_ROUTE_HEADING_DIVERGE_DEG) return false;
  if (!_ctx.headingDivergeSince) _ctx.headingDivergeSince = now;
  return now - _ctx.headingDivergeSince >= OFF_ROUTE_HEADING_DIVERGE_MS;
}
function canTriggerReroute(feed, now) {
  const distNeed = confirmDistForSpeed(feed.spdMps);
  const msNeed = confirmMsForSpeed(feed.spdMps);
  const distOk = _ctx.suspectDistM >= distNeed;
  const timeOk = _ctx.confirmMs >= msNeed;
  const hdgOk = headingDiverged(feed, now);
  const snapBad = S.snapQuality !== SnapQuality.GOOD || feed.lateral != null && feed.lateral > 80;
  if (!snapBad) return null;
  if (distOk && hdgOk) return "dist_heading";
  if (distOk && timeOk && hdgOk) return "conjunct";
  if (timeOk && hdgOk && feed.lateral > OFF_ROUTE_ENTER_M) return "time_heading";
  return null;
}
function enterOfflineGuide(feed) {
  showOfflineWarn();
  resetSuspectCtx();
  resetOfflineCtx();
  tickOfflineGuideVoice(feed.lateral);
}
function tickOfflineGuideVoice(lateral) {
  if (!S.voice || lateral == null) return;
  if (!_ctx.offlineEntryVoice) {
    _ctx.offlineEntryVoice = true;
    _ctx.offlineVoiceBucket = Math.ceil(lateral / OFFLINE_VOICE_STEP_M) * OFFLINE_VOICE_STEP_M;
    speak("\u041D\u0435\u0442 \u0441\u0432\u044F\u0437\u0438. \u0412\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u044E \u043D\u0430 \u043C\u0430\u0440\u0448\u0440\u0443\u0442");
    S.lastVoiceTs = Date.now();
    return;
  }
  const bucket = Math.ceil(lateral / OFFLINE_VOICE_STEP_M) * OFFLINE_VOICE_STEP_M;
  if (_ctx.offlineVoiceBucket == null) _ctx.offlineVoiceBucket = bucket;
  if (bucket <= _ctx.offlineVoiceBucket - OFFLINE_VOICE_STEP_M) {
    _ctx.offlineVoiceBucket = bucket;
    if (Date.now() - S.lastVoiceTs < 3e3) return;
    speak("\u0414\u043E \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0430 " + Math.round(lateral) + " \u043C\u0435\u0442\u0440\u043E\u0432");
    S.lastVoiceTs = Date.now();
  }
}
function beginReroute(fromState, feed, trigger) {
  if (_ctx.rerouteBusy || S.offRouteState === OffRouteState.REROUTING) return;
  _ctx.rerouteBusy = true;
  transition(fromState, OffRouteState.REROUTING, { ...metaFromFeed(feed), trigger });
  recalcRoute().then((ok) => {
    _ctx.rerouteBusy = false;
    if (ok) {
      transition(OffRouteState.REROUTING, OffRouteState.ON_ROUTE, metaFromFeed(feed));
      resetBackoff();
      resetSuspectCtx();
      showRerouteOk();
    } else {
      transition(OffRouteState.REROUTING, OffRouteState.OFFLINE_GUIDE, metaFromFeed(feed));
      enterOfflineGuide(feed);
    }
  });
}
function tickSuspectConfirm(feed, inDeadZone) {
  if (inDeadZone) return;
  const now = Date.now();
  const dtMs = feed.dtMs || 0;
  _ctx.confirmMs += dtMs;
  if (feed.spdMps > 0) _ctx.suspectDistM += feed.spdMps * (dtMs / 1e3);
  if (feed.spdMps > OFF_ROUTE_HEADING_MIN_SPD && feed.heading != null && !isNaN(feed.heading) && feed.tangent != null && !isNaN(feed.tangent)) {
    if (angleDiff(feed.heading, feed.tangent) > OFF_ROUTE_HEADING_DIVERGE_DEG) {
      if (!_ctx.headingDivergeSince) _ctx.headingDivergeSince = now;
    } else {
      _ctx.headingDivergeSince = 0;
    }
  } else {
    _ctx.headingDivergeSince = 0;
  }
  const trigger = canTriggerReroute(feed, now);
  if (!trigger) return;
  if (S.rerouteBackoffUntil && Date.now() < S.rerouteBackoffUntil) return;
  beginReroute(OffRouteState.SUSPECT, { ...feed, trigger }, trigger);
}
function tryReturnOnRoute(feed) {
  if (feed.lateral >= OFF_ROUTE_EXIT_M) return false;
  const from = S.offRouteState;
  transition(from, OffRouteState.ON_ROUTE, metaFromFeed(feed));
  resetBackoff();
  resetCtx();
  clearOffRouteWarn();
  return true;
}
function tickOffRouteMachine(feed) {
  if (S.compassMode || feed.lateral == null || !S.route) return;
  const now = Date.now();
  const dtMs = _ctx.lastFeedMs ? Math.min(3e3, now - _ctx.lastFeedMs) : 0;
  _ctx.lastFeedMs = now;
  feed = { ...feed, dtMs };
  if (S.offRouteState === OffRouteState.REROUTING || _ctx.rerouteBusy) return;
  if (S.offRouteState === OffRouteState.SUSPECT || S.offRouteState === OffRouteState.OFFLINE_GUIDE) {
    if (tryReturnOnRoute(feed)) return;
  }
  if (S.offRouteState === OffRouteState.OFFLINE_GUIDE) {
    tickOfflineGuideVoice(feed.lateral);
    if (S.rerouteBackoffUntil && now >= S.rerouteBackoffUntil) {
      transition(OffRouteState.OFFLINE_GUIDE, OffRouteState.SUSPECT, metaFromFeed(feed));
      beginReroute(OffRouteState.SUSPECT, { ...feed, trigger: "backoff_retry" }, "backoff_retry");
    }
    return;
  }
  if (feed.acc > OFF_ROUTE_GPS_ACC_GATE_M) return;
  const enterM = Math.max(OFF_ROUTE_ENTER_M, OFF_ROUTE_ACC_FACTOR * feed.acc);
  const inDeadZone = feed.lateral >= OFF_ROUTE_EXIT_M && feed.lateral <= OFF_ROUTE_ENTER_M;
  if (S.offRouteState === OffRouteState.ON_ROUTE) {
    if (feed.lateral > enterM) {
      resetSuspectCtx();
      transition(OffRouteState.ON_ROUTE, OffRouteState.SUSPECT, metaFromFeed(feed));
    }
    return;
  }
  if (S.offRouteState === OffRouteState.SUSPECT) {
    tickSuspectConfirm(feed, inDeadZone);
  }
}
var OffRouteState, OFFLINE_VOICE_STEP_M, OFF_ROUTE_WARN_OK, OFF_ROUTE_WARN_FAIL, _ctx;
var init_offroute = __esm({
  "js/offroute.js"() {
    init_state();
    init_util();
    init_geo();
    init_route();
    init_voice();
    init_telemetry();
    init_snap_quality();
    init_nav_constants();
    OffRouteState = {
      ON_ROUTE: "ON_ROUTE",
      SUSPECT: "SUSPECT",
      REROUTING: "REROUTING",
      OFFLINE_GUIDE: "OFFLINE_GUIDE"
    };
    OFFLINE_VOICE_STEP_M = 200;
    OFF_ROUTE_WARN_OK = "\u25C6 \u041F\u0415\u0420\u0415\u0421\u0427\u0401\u0422 \u041C\u0410\u0420\u0428\u0420\u0423\u0422\u0410 \u25C6";
    OFF_ROUTE_WARN_FAIL = "\u25C6 \u041D\u0415\u0422 \u0421\u0412\u042F\u0417\u0418 \u2014 \u0412\u0415\u0420\u041D\u0418\u0422\u0415\u0421\u042C \u041D\u0410 \u041C\u0410\u0420\u0428\u0420\u0423\u0422 \u25C6";
    _ctx = {
      confirmMs: 0,
      suspectDistM: 0,
      headingDivergeSince: 0,
      lastFeedMs: 0,
      rerouteBusy: false,
      offlineEntryVoice: false,
      offlineVoiceBucket: null
    };
  }
});

// js/nav-map.js
function routeLatLngs() {
  const route = S.route;
  if (!route) return [];
  if (route.geometry?.n > 1) return geometryToLatLngs(route.geometry);
  return (route.coords || []).map((c) => [c[0], c[1]]);
}
function applyTiles() {
  if (!_map2) return;
  const prov = getMapProvider(getMapProviderId());
  if (_tileLayer2) _map2.removeLayer(_tileLayer2);
  _tileLayer2 = import_leaflet2.default.tileLayer(prov.url, prov.opts);
  _tileLayer2.addTo(_map2);
}
function ensureMap2() {
  const box = $("nav-map-pane");
  if (!box) return null;
  if (!_map2) {
    box.innerHTML = "";
    _map2 = import_leaflet2.default.map(box, { zoomControl: false, attributionControl: true, preferCanvas: true });
    applyTiles();
    _routeLayer = import_leaflet2.default.polyline([], { color: "#ffd400", weight: 6 }).addTo(_map2);
    _posMarker = import_leaflet2.default.circleMarker([0, 0], {
      radius: 8,
      color: "#fff",
      weight: 2,
      fillColor: "#3399ff",
      fillOpacity: 1
    }).addTo(_map2);
    _finishMarker = import_leaflet2.default.circleMarker([0, 0], {
      radius: 7,
      color: "#fff",
      weight: 2,
      fillColor: "#39d353",
      fillOpacity: 1
    }).addTo(_map2);
    _maneuverMarker = import_leaflet2.default.circleMarker([0, 0], {
      radius: 6,
      color: "#000",
      weight: 1,
      fillColor: "#ffd400",
      fillOpacity: 1
    }).addTo(_map2);
  }
  return _map2;
}
function remainingLatLngs() {
  const route = S.route;
  if (!route?.geometry?.n) return routeLatLngs();
  const snap = getNavSnap(S.smoothedHeading);
  const s0 = snap?.s ?? 0;
  return latLngsSliceByS(route.geometry, s0, route.geometry.s[route.geometry.n - 1]);
}
function fitOverview() {
  const map = ensureMap2();
  if (!map) return;
  const pts = remainingLatLngs();
  const pos = curPos();
  if (pos) pts.push([pos.lat, pos.lon]);
  if (S.finish) pts.push([S.finish.lat, S.finish.lon]);
  if (pts.length < 1) return;
  map.fitBounds(import_leaflet2.default.latLngBounds(pts).pad(0.12), { padding: [40, 40], animate: false });
  _overviewFit = true;
}
function syncNavMap(mode) {
  const map = ensureMap2();
  if (!map || !S.route) return;
  map.invalidateSize();
  if (typeof map.start === "function") map.start();
  _routeLayer.setLatLngs(routeLatLngs());
  const pos = curPos();
  if (pos) _posMarker.setLatLng([pos.lat, pos.lon]);
  if (S.finish) _finishMarker.setLatLng([S.finish.lat, S.finish.lon]);
  const nm = findNextManeuver();
  if (nm?.step) {
    _maneuverMarker.setLatLng([nm.step.lat, nm.step.lon]);
    _maneuverMarker.setStyle({ opacity: 1, fillOpacity: 1 });
  } else {
    _maneuverMarker.setStyle({ opacity: 0, fillOpacity: 0 });
  }
  if (mode === "map_overview") {
    if (!_overviewFit) fitOverview();
  } else if (mode === "map_zoom" && pos) {
    const now = Date.now();
    if (now - _lastZoomPan > 2e3) {
      map.setView([pos.lat, pos.lon], 17, { animate: false });
      _lastZoomPan = now;
    } else {
      map.panTo([pos.lat, pos.lon], { animate: false });
    }
  }
}
function pauseNavMap() {
  if (_map2 && typeof _map2.stop === "function") _map2.stop();
  _overviewFit = false;
}
function destroyNavMap() {
  pauseNavMap();
  if (_map2) {
    _map2.remove();
    _map2 = null;
    _tileLayer2 = null;
    _routeLayer = null;
    _posMarker = null;
    _finishMarker = null;
    _maneuverMarker = null;
  }
  const box = $("nav-map-pane");
  if (box) box.innerHTML = "";
}
function tickNavMap() {
  if (S.viewMode === "hud" || !S.route) return;
  syncNavMap(S.viewMode);
}
var import_leaflet2, _map2, _tileLayer2, _routeLayer, _posMarker, _finishMarker, _maneuverMarker, _overviewFit, _lastZoomPan;
var init_nav_map = __esm({
  "js/nav-map.js"() {
    import_leaflet2 = __toESM(require_leaflet_src());
    init_state();
    init_util();
    init_gps();
    init_route_geometry();
    init_map_providers();
    init_route();
    _map2 = null;
    _tileLayer2 = null;
    _routeLayer = null;
    _posMarker = null;
    _finishMarker = null;
    _maneuverMarker = null;
    _overviewFit = false;
    _lastZoomPan = 0;
  }
});

// js/view-mode.js
function isExcludedTarget(el) {
  if (!el || !(el instanceof Element)) return true;
  return !!el.closest(".corner-btn, .statusbar, #camAlert, #fuelPanel, #quickFinish, #offRouteWarn, #gps-converge, .legal-modal");
}
function applyViewLayout(mode) {
  const hud = $("hud");
  if (!hud) return;
  hud.classList.remove("view-map", "view-map-overview", "view-map-zoom");
  if (mode === "hud") {
    pauseNavMap();
    return;
  }
  hud.classList.add("view-map");
  hud.classList.add(mode === "map_zoom" ? "view-map-zoom" : "view-map-overview");
  syncNavMap(mode);
}
function setViewMode(mode) {
  const m = VIEW_ORDER.includes(mode) ? mode : "hud";
  S.viewMode = m;
  applyViewLayout(m);
}
function cycleViewMode() {
  const i = VIEW_ORDER.indexOf(S.viewMode || "hud");
  setViewMode(VIEW_ORDER[(i + 1) % VIEW_ORDER.length]);
}
function onTouchEnd(e) {
  if (!document.getElementById("hud")?.classList.contains("on")) return;
  const t = e.changedTouches?.[0];
  if (!t || isExcludedTarget(t.target)) return;
  const now = Date.now();
  const dt = now - _lastTap.t;
  const dist = Math.hypot(t.clientX - _lastTap.x, t.clientY - _lastTap.y);
  if (dt < DBL_TAP_MS && dist < DBL_TAP_MAX_PX) {
    cycleViewMode();
    _lastTap.t = 0;
    e.preventDefault();
    return;
  }
  _lastTap = { t: now, x: t.clientX, y: t.clientY };
}
function initViewMode() {
  if (_bound) return;
  const hud = $("hud");
  if (!hud) return;
  hud.addEventListener("touchend", onTouchEnd, { passive: false });
  _bound = true;
  S.viewMode = "hud";
}
function resetViewMode() {
  setViewMode("hud");
  destroyNavMap();
}
var DBL_TAP_MS, DBL_TAP_MAX_PX, VIEW_ORDER, _lastTap, _bound;
var init_view_mode = __esm({
  "js/view-mode.js"() {
    init_state();
    init_util();
    init_nav_map();
    DBL_TAP_MS = 400;
    DBL_TAP_MAX_PX = 40;
    VIEW_ORDER = ["hud", "map_overview", "map_zoom"];
    _lastTap = { t: 0, x: 0, y: 0 };
    _bound = false;
  }
});

// js/hud.js
function getLastMarkContext() {
  return _lastMarkCtx;
}
function logManeuverContext(nm, snap, shown, filterReason) {
  const snap2 = getNavSnap(S.smoothedHeading);
  _lastMarkCtx = {
    maneuver_id: S.route?.steps?.indexOf(nm.step),
    type: nm.step.type,
    modifier: nm.step.modifier,
    dist: Math.round(nm.dist),
    ang_osrm: stepTurnAngleDeg(nm.step, nm),
    lat_off: snap2?.lateral != null ? Math.round(snap2.lateral) : null,
    snap_quality: S.snapQuality,
    shown: !!shown,
    filter_reason: filterReason || null
  };
  telemetry_default.log("nav", { sub: "maneuver_context", ..._lastMarkCtx });
}
function maneuverVoiceThresholds(kmh) {
  const mps = Math.max(kmh / 3.6, 4);
  return {
    mps,
    farM: Math.max(220, Math.min(850, mps * 9)),
    nearM: Math.max(35, Math.min(110, mps * 2.5))
  };
}
function formatManeuverLead(distM, mps) {
  if (mps >= 6 && distM >= 120) {
    const sec = Math.round(distM / mps);
    if (sec <= 20) {
      const w = sec === 1 ? "\u0441\u0435\u043A\u0443\u043D\u0434\u0443" : sec >= 2 && sec <= 4 ? "\u0441\u0435\u043A\u0443\u043D\u0434\u044B" : "\u0441\u0435\u043A\u0443\u043D\u0434";
      return "\u0427\u0435\u0440\u0435\u0437 " + sec + " " + w;
    }
  }
  const m = Math.max(50, Math.round(distM / 50) * 50);
  return "\u0427\u0435\u0440\u0435\u0437 " + m + " \u043C\u0435\u0442\u0440\u043E\u0432";
}
function checkCamerasILS() {
  if (!S.cams || !S.cameras.length) return;
  const now = Date.now();
  const kmh = S.gps.speed != null && S.gps.speed >= 0 ? S.gps.speed * 3.6 : 0;
  const heading = S.smoothedHeading;
  const radius = Math.max(200, Math.min(1e3, kmh * 10));
  const tol = S.camSpeedTol != null ? S.camSpeedTol : 15;
  let closest = null;
  S.cameras.forEach((c, i) => {
    const d = haversine(S.gps, c);
    if (d > radius) return;
    if (!c.speed) return;
    if (kmh <= c.speed + tol) return;
    if (S.backOnly && !isCameraBehind(c, heading)) return;
    if (heading != null && angleDiff(bearing(S.gps, c), heading) > 90) return;
    if (!closest || d < closest.dist) closest = { cam: c, dist: d, id: i };
  });
  const alertEl = $("camAlert");
  if (closest) {
    $("cam-dist").textContent = Math.round(closest.dist) + " M";
    $("cam-sub").textContent = closest.cam.speed ? "LIMIT " + closest.cam.speed + " KM/H" : closest.cam.dir != null ? "BRG " + String(Math.round(closest.cam.dir)).padStart(3, "0") : "DIR UNKNOWN";
    alertEl.classList.add("on");
    if (!S.camWarned.has(closest.id) && now - S.lastVoiceTs > 3e3) {
      S.camWarned.add(closest.id);
      S.lastVoiceTs = now;
      const dm = closest.dist < 200 ? "\u043C\u0435\u043D\u0435\u0435 200 \u043C\u0435\u0442\u0440\u043E\u0432" : closest.dist < 400 ? "\u0447\u0435\u0440\u0435\u0437 300 \u043C\u0435\u0442\u0440\u043E\u0432" : closest.dist < 700 ? "\u0447\u0435\u0440\u0435\u0437 500 \u043C\u0435\u0442\u0440\u043E\u0432" : "\u0447\u0435\u0440\u0435\u0437 " + Math.round(closest.dist / 100) * 100 + " \u043C\u0435\u0442\u0440\u043E\u0432";
      speak("\u041A\u0430\u043C\u0435\u0440\u0430 \u0432 \u0441\u043F\u0438\u043D\u0443 " + dm + (closest.cam.speed ? ", \u043B\u0438\u043C\u0438\u0442 " + closest.cam.speed : ""));
    }
  } else {
    alertEl.classList.remove("on");
    S.cameras.forEach((c, i) => {
      if (S.camWarned.has(i) && haversine(S.gps, c) > 2e3) S.camWarned.delete(i);
    });
  }
}
function estimateRemainSec(remaining, kmh) {
  if (remaining <= 0) return 0;
  if (kmh > 5) return remaining / (kmh / 3.6);
  if (S.route?.distance > 0 && S.route.duration > 0) {
    return remaining / S.route.distance * S.route.duration;
  }
  return null;
}
function updateFinishInfo(remaining, kmh, now) {
  const panel = $("finish-info");
  if (!panel) return;
  const any = S.showFinishDist || S.showFinishTime || S.showFinishEta;
  if (!any || !S.route) {
    panel.classList.add("hidden");
    return;
  }
  panel.classList.remove("hidden");
  if (S.showFinishDist) {
    $("fi-dist-line")?.classList.remove("hidden");
    const el = $("fi-dist-val");
    if (el) {
      el.textContent = remaining < 1e3 ? Math.round(remaining) + " \u043C" : (remaining / 1e3).toFixed(1) + " \u043A\u043C";
    }
  } else $("fi-dist-line")?.classList.add("hidden");
  const remainSec = estimateRemainSec(remaining, kmh);
  if (S.showFinishTime && remainSec != null) {
    $("fi-time-line")?.classList.remove("hidden");
    const el = $("fi-time-val");
    if (el) el.textContent = fmtRemainDur(remainSec);
  } else $("fi-time-line")?.classList.add("hidden");
  if (S.showFinishEta && remainSec != null) {
    $("fi-eta-line")?.classList.remove("hidden");
    const el = $("fi-eta-val");
    if (el) el.textContent = fmtClock(new Date(now.getTime() + remainSec * 1e3));
  } else $("fi-eta-line")?.classList.add("hidden");
}
function onTick() {
  if (!S.gps) return;
  const now = /* @__PURE__ */ new Date();
  $("clock").textContent = fmtClock(now);
  const dot = $("gps-dot");
  if (dot) {
    dot.classList.toggle("ok", !!S.gps);
  }
  $("gps-txt").textContent = "GPS \xB1" + Math.round(S.gps.acc || 0) + "\u043C";
  const kmh = S.gps.speed != null && S.gps.speed >= 0 ? S.gps.speed * 3.6 : 0;
  const hh = getHeadingHealth();
  const hw = $("heading-warn");
  if (hw) {
    hw.classList.toggle("on", !!hh.interference && kmh < 25);
    hw.textContent = hh.calibrating ? "\u{1F9ED} \u041A\u0430\u043B\u0438\u0431\u0440\u043E\u0432\u043A\u0430 \u043A\u043E\u043C\u043F\u0430\u0441\u0430 \u2014 \u0432\u043E\u0441\u044C\u043C\u0451\u0440\u043A\u0430 15 \u0441" : "\u26A0 \u041F\u043E\u043C\u0435\u0445\u0438 \u043A\u043E\u043C\u043F\u0430\u0441\u0430 \u2014 \u043A\u0443\u0440\u0441 \u043F\u043E GPS";
  }
  if (!S.route) {
    $("mid-info").textContent = S.startTs ? "T+" + fmtTime((Date.now() - S.startTs) / 1e3) : "\u2014";
    updateFinishInfo(0, kmh, now);
    return;
  }
  const gpsOk = S.gpsConverged !== false;
  const snap = gpsOk ? getNavSnap(S.smoothedHeading) : null;
  const spdMps = S.gps.speed != null && S.gps.speed >= 0 ? S.gps.speed : 0;
  if ($("hud").classList.contains("on") && !gpsOk) {
    $("street").textContent = "GPS \u0421\u0425\u041E\u0414\u0418\u0422\u0421\u042F";
    $("v-mdist").textContent = "\u2014";
    $("arrow-box").innerHTML = buildTurnArrowSVG(0);
    updateFinishInfo(getRemainingDistance(), kmh, now);
  }
  if (isSnapLost()) {
    $("street").textContent = "GPS \u041F\u041E\u0422\u0415\u0420\u042F\u041D";
    $("v-mdist").textContent = "\u2014";
    $("v-mdist-u").textContent = "";
    $("arrow-box").innerHTML = buildTurnArrowSVG(0);
    $("rb-exit-label")?.classList.add("hidden");
    updateFinishInfo(getRemainingDistance(), kmh, now);
    $("mid-info").textContent = S.startTs ? "T+" + fmtTime((Date.now() - S.startTs) / 1e3) : "\u2014";
    return;
  }
  const remaining = getRemainingDistance();
  const near = findNearestOnRoute();
  if (S.compassMode && S.finish && S.gps && !isOfflineGuide()) {
    const brg = bearing(S.gps, S.finish);
    const hdg = S.smoothedHeading != null && !isNaN(S.smoothedHeading) ? S.smoothedHeading : S.gps.heading;
    let turn = 0;
    if (hdg != null && !isNaN(hdg)) turn = (brg - hdg + 540) % 360 - 180;
    $("arrow-box").innerHTML = buildTurnArrowSVG(turn);
    const dFin = haversine(S.gps, S.finish);
    if (dFin < 1e3) {
      $("v-mdist").textContent = Math.max(0, Math.round(dFin / 10) * 10);
      $("v-mdist-u").textContent = "\u043C";
    } else {
      $("v-mdist").textContent = (dFin / 1e3).toFixed(1);
      $("v-mdist-u").textContent = "\u043A\u043C";
    }
    $("street").textContent = "\u041A \u0424\u0418\u041D\u0418\u0428\u0423";
    $("rb-exit-label")?.classList.add("hidden");
    const mid = $("mid-info");
    const tStr = S.startTs ? "T+" + fmtTime((Date.now() - S.startTs) / 1e3) : "\u2014";
    mid.textContent = tStr + " \xB7 \u041A\u041E\u041C\u041F\u0410\u0421";
    updateFinishInfo(remaining, kmh, now);
    tickAutoMode();
    checkCamerasILS();
    refreshFuelPanel();
    return;
  }
  if (!gpsOk) return;
  tickOffRouteMachine({
    lateral: near?.dist,
    acc: S.gps.acc || 0,
    spdMps,
    spdKmh: kmh,
    heading: S.smoothedHeading,
    tangent: snap?.tangent ?? null
  });
  if (isOfflineGuide() && snap && S.gps) {
    const brg = bearing(S.gps, { lat: snap.lat, lon: snap.lon });
    const hdg = S.smoothedHeading != null && !isNaN(S.smoothedHeading) ? S.smoothedHeading : S.gps.heading;
    let turn = 0;
    if (hdg != null && !isNaN(hdg)) turn = (brg - hdg + 540) % 360 - 180;
    $("arrow-box").innerHTML = buildTurnArrowSVG(turn);
    const dSnap = haversine(S.gps, { lat: snap.lat, lon: snap.lon });
    if (dSnap < 1e3) {
      $("v-mdist").textContent = Math.max(0, Math.round(dSnap / 10) * 10);
      $("v-mdist-u").textContent = "\u043C";
    } else {
      $("v-mdist").textContent = (dSnap / 1e3).toFixed(1);
      $("v-mdist-u").textContent = "\u043A\u043C";
    }
    $("street").textContent = "\u0412\u041E\u0417\u0412\u0420\u0410\u0422 \u041D\u0410 \u041C\u0410\u0420\u0428\u0420\u0423\u0422";
    $("rb-exit-label")?.classList.add("hidden");
  } else {
    let nm = isSnapDegraded() ? getCachedManeuver() : null;
    if (!nm) nm = findNextManeuver();
    if (nm) {
      cacheLastManeuver(nm);
      logManeuverContext(nm, snap, true, null);
      $("arrow-box").innerHTML = buildArrowSVG(nm.step);
      const rbEl = $("rb-exit-label");
      if (rbEl) {
        const geom = S.route.geometry;
        const rb = isCrossingContextEnabled() && geom && snap ? getActiveRoundabout(geom, snap.s, spdMps) : null;
        const isRbStep = nm.step.type === "roundabout" || nm.step.type === "rotary";
        if (rb && isRbStep && rb.exitNumber > 0) {
          rbEl.textContent = String(rb.exitNumber);
          rbEl.classList.remove("hidden");
        } else {
          rbEl.textContent = "";
          rbEl.classList.add("hidden");
        }
      }
      if (nm.dist < 1e3) {
        $("v-mdist").textContent = Math.max(0, Math.round(nm.dist / 10) * 10);
        $("v-mdist-u").textContent = "\u043C";
      } else {
        $("v-mdist").textContent = (nm.dist / 1e3).toFixed(1);
        $("v-mdist-u").textContent = "\u043A\u043C";
      }
      $("street").textContent = (nm.step.name || "").toUpperCase() || "\u2014";
      const stIdx = S.route.steps.indexOf(nm.step);
      const kFar = "st_" + stIdx + "_far";
      const kNear = "st_" + stIdx + "_near";
      if (isNavManeuverType(nm.step)) {
        const txt = maneuverText(nm.step);
        const { mps, farM, nearM } = maneuverVoiceThresholds(kmh);
        if (nm.dist <= farM && nm.dist > nearM + 15 && !S.camWarned.has(kFar) && txt) {
          S.camWarned.add(kFar);
          telemetry_default.log("nav", { sub: "maneuver_announced", id: stIdx, dist: Math.round(nm.dist), phase: "far" });
          speak(formatManeuverLead(nm.dist, mps) + " " + txt);
        }
        if (nm.dist <= nearM && !S.camWarned.has(kNear) && txt) {
          S.camWarned.add(kNear);
          telemetry_default.log("nav", { sub: "maneuver_announced", id: stIdx, dist: Math.round(nm.dist), phase: "near" });
          speak(txt);
        }
      }
    }
  }
  updateFinishInfo(remaining, kmh, now);
  const midLine = S.startTs ? "T+" + fmtTime((Date.now() - S.startTs) / 1e3) : "\u2014";
  if (S.routeQuality === RouteQuality.LOW && !S.compassMode) {
    $("mid-info").textContent = midLine + " \xB7 \u041D\u0418\u0417\u041A. OSM";
  } else {
    $("mid-info").textContent = midLine;
  }
  if (remaining < 30 && !S.camWarned.has("arrived")) {
    S.camWarned.add("arrived");
    speak("\u0412\u044B \u043F\u0440\u0438\u0431\u044B\u043B\u0438");
  }
  tickAutoMode();
  checkCamerasILS();
  checkCurveSpeedWarn(kmh);
  refreshFuelPanel();
  tickNavMap();
}
function checkCurveSpeedWarn(kmh) {
  if (!S.curveWarn || kmh < 20 || !S.route?.geometry?.curveReady) return;
  const snap = getNavSnap(S.smoothedHeading);
  if (!snap) return;
  const speedMps = kmh / 3.6;
  const warn = pickCurveVoiceWarn(S.route.geometry, snap.s, speedMps);
  if (!warn || S.camWarned.has(warn.key)) return;
  if (Date.now() - S.lastVoiceTs < 4e3) return;
  S.camWarned.add(warn.key);
  S.lastVoiceTs = Date.now();
  speak("\u0421\u043D\u0438\u0437\u044C\u0442\u0435 \u0441\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u043F\u0435\u0440\u0435\u0434 \u043F\u043E\u0432\u043E\u0440\u043E\u0442\u043E\u043C. \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442\u0441\u044F " + warn.vSafeKmh + " \u043A\u0438\u043B\u043E\u043C\u0435\u0442\u0440\u043E\u0432 \u0432 \u0447\u0430\u0441");
}
function r22(n) {
  return n != null && Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}
async function startHud() {
  applyFinishInfoVisibility();
  if (!S.route) {
    alert("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043E\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u043C\u0430\u0440\u0448\u0440\u0443\u0442");
    return;
  }
  saveLastRun();
  if (telemetry_default.isEnabled()) {
    telemetry_default.start({ routeKm: S.route?.distance ? r22(S.route.distance / 1e3) : null });
    telemetry_default.updateMarkButtonVisibility();
  }
  S.startTs = Date.now();
  S.distDone = 0;
  S.camWarned.clear();
  resetOffRouteMachine();
  resetRouteSnap();
  resetSnapQuality();
  resetCurveRibbonState();
  ensureRouteGeometry(S.route);
  $("setup").style.display = "none";
  $("setup").style.zIndex = "30";
  $("hud").classList.add("on");
  $("hud").classList.toggle("show-compass", !!S.showCompass);
  resetVintageVfd();
  syncVintageVfdDomClasses();
  updateCamStatusUI();
  loadCameras();
  acquireWakeLock();
  try {
    await startNavigationGps();
  } catch (e) {
    console.warn("FGS GPS:", e);
  }
  if (!window.__SIM__) {
    try {
      document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    } catch (e) {
    }
  }
  speak("\u041C\u0430\u0440\u0448\u0440\u0443\u0442 \u043F\u043E\u0441\u0442\u0440\u043E\u0435\u043D. \u0412 \u043F\u0443\u0442\u0438 " + Math.round(S.route.duration / 60) + " \u043C\u0438\u043D\u0443\u0442");
  S.dispSpeed = S.gps && S.gps.speed > 0 ? S.gps.speed * 3.6 : 0;
  onTick();
  startVisualLoop();
}
function stopHud() {
  telemetry_default.stop().catch(() => {
  });
  telemetry_default.updateMarkButtonVisibility();
  stopVisualLoop();
  resetVintageVfd();
  stopNavigationGps().catch(() => {
  });
  S.fuelMode = 0;
  S.fuelSel = null;
  S.fuelOrigFinish = null;
  $("fuelPanel")?.classList.remove("on");
  $("btn-fuel")?.classList.remove("active");
  $("hud").classList.remove("on");
  $("setup").style.display = "block";
  renderFavs();
  const goBar = $("go-bar");
  if (goBar) goBar.classList.toggle("hidden", !(S.route && S.route.coords?.length));
  releaseWakeLock();
  clearVoiceQueue();
  resetOffRouteMachine();
  resetViewMode();
  try {
    document.exitFullscreen && document.exitFullscreen();
  } catch (e) {
  }
}
function fmtDistPair(m) {
  if (m == null || !isFinite(m)) return { v: "\u2013", u: "\u043A\u043C" };
  if (m < 1e3) return { v: String(Math.round(m / 10) * 10), u: "\u043C" };
  return { v: (m / 1e3).toFixed(1), u: "\u043A\u043C" };
}
function setFuelPanel({ title, dist, sub, hint, color, searching }) {
  const panel = $("fuelPanel");
  if (!panel) return;
  panel.style.setProperty("--fuel-c", color || "#66ccff");
  panel.classList.toggle("searching", !!searching);
  if (title != null) $("fp-title").textContent = title;
  if (dist !== void 0) {
    const d = fmtDistPair(dist);
    $("fp-dist").textContent = d.v;
    $("fp-u").textContent = d.u;
  }
  if (sub != null) $("fp-sub").textContent = sub;
  if (hint != null) $("fp-hint").textContent = hint;
  panel.classList.add("on");
  _fuelPanelShownAt = Date.now();
}
function updateFuelButton() {
  const b = $("btn-fuel");
  if (b) b.classList.toggle("active", S.fuelMode > 0);
}
async function rerouteToFuel() {
  try {
    S.routeAlternatives = [];
    await buildRoute();
    loadCameras();
    S.camWarned.clear();
  } catch (e) {
    console.warn("\u041F\u0435\u0440\u0435\u0441\u0447\u0451\u0442 \u043A \u0437\u0430\u043F\u0440\u0430\u0432\u043A\u0435 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F:", e);
  }
}
function refreshFuelPanel() {
  const panel = $("fuelPanel");
  if (panel && panel.classList.contains("on") && _fuelPanelShownAt && Date.now() - _fuelPanelShownAt > FUEL_PANEL_MS) {
    panel.classList.remove("on");
  }
  if (S.fuelMode === 0 || !S.fuelSel) return;
  const sel = S.fuelSel;
  const dist = S.fuelMode === 2 ? getRemainingDistance() : sel.distAhead != null && isFinite(sel.distAhead) ? sel.distAhead : sel.distGps;
  const d = fmtDistPair(dist);
  $("fp-dist").textContent = d.v;
  $("fp-u").textContent = d.u;
}
async function cycleFuelAssist() {
  if (_fuelBusy) return;
  _fuelBusy = true;
  const b = $("btn-fuel");
  try {
    if (S.fuelMode === 0 && S.fuelStatus !== "ready") {
      setFuelPanel({ title: "\u26FD \u041F\u041E\u0418\u0421\u041A \u0417\u0410\u041F\u0420\u0410\u0412\u041E\u041A\u2026", dist: null, sub: "\u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0434\u0430\u043D\u043D\u044B\u0445", hint: "", color: "#66ccff", searching: true });
      await ensureFuelStations();
    }
    if (!S.fuelStations.length) {
      setFuelPanel({ title: "\u26FD \u0410\u0417\u0421 \u041D\u0415 \u041D\u0410\u0419\u0414\u0415\u041D\u042B", dist: null, sub: "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u043F\u043E\u0431\u043B\u0438\u0437\u043E\u0441\u0442\u0438", hint: "\u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u26FD \u0435\u0449\u0451 \u0440\u0430\u0437 \u2014 \u0441\u043A\u0440\u044B\u0442\u044C", color: "#ff3b30", searching: false });
      if (S.fuelMode !== 0) {
        await cancelFuelAssist(false);
      }
      S.fuelMode = 0;
      return;
    }
    const next = (S.fuelMode + 1) % 3;
    if (next === 1) {
      let sel = bestAlongRoute();
      let onRoute = !!sel;
      if (!sel) sel = nearestOverall();
      if (!sel) {
        S.fuelMode = 0;
        return;
      }
      S.fuelMode = 1;
      S.fuelSel = sel;
      const dist = onRoute ? sel.distAhead : sel.distGps;
      setFuelPanel({
        title: onRoute ? "\u26FD \u041F\u041E \u041C\u0410\u0420\u0428\u0420\u0423\u0422\u0423" : "\u26FD \u0420\u042F\u0414\u041E\u041C (\u043D\u0435\u0442 \u043F\u043E \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0443)",
        dist,
        sub: sel.brand + " \xB7 " + fuelStatusText(sel.status),
        hint: "\u26FD \u0435\u0449\u0451 \u0440\u0430\u0437 \u2014 \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0430\u044F \u0441 \u0437\u0430\u0435\u0437\u0434\u043E\u043C",
        color: fuelColor(sel.status)
      });
      const km = dist >= 1e3 ? Math.round(dist / 1e3) + " \u043A\u0438\u043B\u043E\u043C\u0435\u0442\u0440" : Math.round(dist / 100) * 100 + " \u043C\u0435\u0442\u0440\u043E\u0432";
      speak("\u0417\u0430\u043F\u0440\u0430\u0432\u043A\u0430 " + (onRoute ? "\u043F\u043E \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0443" : "\u0440\u044F\u0434\u043E\u043C") + " \u0447\u0435\u0440\u0435\u0437 " + km + ". " + sel.brand + (sel.status !== "unknown" ? ", " + fuelStatusText(sel.status) : ""));
    } else if (next === 2) {
      let sel = nearestOverall(S.fuelSel) || bestAlongRoute();
      if (!sel) {
        return;
      }
      if (!S.fuelOrigFinish) S.fuelOrigFinish = S.finish;
      S.fuelMode = 2;
      S.fuelSel = sel;
      S.finish = { lat: sel.lat, lon: sel.lon, label: sel.brand || "\u0410\u0417\u0421" };
      setFuelPanel({
        title: "\u26FD \u0411\u041B\u0418\u0416\u0410\u0419\u0428\u0410\u042F \u2014 \u041C\u0410\u0420\u0428\u0420\u0423\u0422\u2026",
        dist: sel.distGps,
        sub: sel.brand + " \xB7 " + fuelStatusText(sel.status),
        hint: "\u26FD \u0435\u0449\u0451 \u0440\u0430\u0437 \u2014 \u043E\u0442\u043C\u0435\u043D\u0430, \u0432\u0435\u0440\u043D\u0443\u0442\u044C \u043C\u0430\u0440\u0448\u0440\u0443\u0442",
        color: fuelColor(sel.status)
      });
      speak("\u0421\u0442\u0440\u043E\u044E \u043C\u0430\u0440\u0448\u0440\u0443\u0442 \u043A \u0431\u043B\u0438\u0436\u0430\u0439\u0448\u0435\u0439 \u0437\u0430\u043F\u0440\u0430\u0432\u043A\u0435. " + sel.brand);
      await rerouteToFuel();
      setFuelPanel({ title: "\u26FD \u0411\u041B\u0418\u0416\u0410\u0419\u0428\u0410\u042F \u0417\u0410\u041F\u0420\u0410\u0412\u041A\u0410", dist: getRemainingDistance() });
      onTick();
    } else {
      await cancelFuelAssist(true);
    }
  } finally {
    updateFuelButton();
    _fuelBusy = false;
  }
}
async function cancelFuelAssist(reroute) {
  const orig = S.fuelOrigFinish;
  S.fuelMode = 0;
  S.fuelSel = null;
  S.fuelOrigFinish = null;
  $("fuelPanel")?.classList.remove("on");
  if (reroute && orig) {
    S.finish = orig;
    speak("\u041E\u0442\u043C\u0435\u043D\u0430. \u0412\u043E\u0437\u0432\u0440\u0430\u0442 \u043A \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0443");
    await rerouteToFuel();
    onTick();
  }
}
async function selectQuickFinish(id, loadFavs2, buildAndLoad) {
  const fav = loadFavs2().find((f2) => f2.id === id);
  if (!fav) return;
  S.finish = { lat: fav.lat, lon: fav.lon, label: fav.name };
  $("quickFinish").classList.remove("on");
  $("mid-info").textContent = "\u041F\u0435\u0440\u0435\u0441\u0447\u0451\u0442\u2026";
  speak("\u041D\u043E\u0432\u044B\u0439 \u0444\u0438\u043D\u0438\u0448 " + fav.name + ". \u041F\u0435\u0440\u0435\u0441\u0447\u0451\u0442 \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0430");
  try {
    await buildAndLoad();
    S.camWarned.clear();
    onTick();
  } catch (e) {
    console.warn("\u0421\u043C\u0435\u043D\u0430 \u0444\u0438\u043D\u0438\u0448\u0430 \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C:", e);
    $("mid-info").textContent = "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0435\u0440\u0435\u0441\u0447\u0451\u0442\u0430";
  }
}
var _lastMarkCtx, _fuelBusy, _fuelPanelShownAt, FUEL_PANEL_MS;
var init_hud = __esm({
  "js/hud.js"() {
    init_state();
    init_util();
    init_geo();
    init_gps();
    init_route();
    init_voice();
    init_render();
    init_vintage_vfd();
    init_gps();
    init_fuel();
    init_cam_status();
    init_route_geometry();
    init_snap_quality();
    init_route_quality();
    init_maneuver_filter();
    init_crossings();
    init_route();
    init_curve_speed();
    init_favorites();
    init_wake_lock();
    init_voice();
    init_heading();
    init_theme_manager();
    init_hud_opts();
    init_offroute();
    init_telemetry();
    init_view_mode();
    _lastMarkCtx = null;
    _fuelBusy = false;
    _fuelPanelShownAt = 0;
    FUEL_PANEL_MS = 9e3;
  }
});

// node_modules/@capacitor/app/dist/esm/definitions.js
var init_definitions5 = __esm({
  "node_modules/@capacitor/app/dist/esm/definitions.js"() {
  }
});

// node_modules/@capacitor/app/dist/esm/web.js
var web_exports5 = {};
__export(web_exports5, {
  AppWeb: () => AppWeb
});
var AppWeb;
var init_web5 = __esm({
  "node_modules/@capacitor/app/dist/esm/web.js"() {
    init_dist();
    AppWeb = class extends WebPlugin {
      constructor() {
        super();
        this.handleVisibilityChange = () => {
          const data = {
            isActive: document.hidden !== true
          };
          this.notifyListeners("appStateChange", data);
          if (document.hidden) {
            this.notifyListeners("pause", null);
          } else {
            this.notifyListeners("resume", null);
          }
        };
        document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
      }
      exitApp() {
        throw this.unimplemented("Not implemented on web.");
      }
      async getInfo() {
        throw this.unimplemented("Not implemented on web.");
      }
      async getLaunchUrl() {
        return { url: "" };
      }
      async getState() {
        return { isActive: document.hidden !== true };
      }
      async minimizeApp() {
        throw this.unimplemented("Not implemented on web.");
      }
      async toggleBackButtonHandler() {
        throw this.unimplemented("Not implemented on web.");
      }
    };
  }
});

// node_modules/@capacitor/app/dist/esm/index.js
var esm_exports3 = {};
__export(esm_exports3, {
  App: () => App
});
var App;
var init_esm5 = __esm({
  "node_modules/@capacitor/app/dist/esm/index.js"() {
    init_dist();
    init_definitions5();
    App = registerPlugin("App", {
      web: () => Promise.resolve().then(() => (init_web5(), web_exports5)).then((m) => new m.AppWeb())
    });
  }
});

// js/main.js
init_state();
init_gps();
init_hud();
init_render();
init_setup();
init_favorites();
init_cam_status();
init_elevation();
init_curve_speed();
init_hud_opts();
init_app_opts();
init_theme();
init_theme_manager();
init_tts_health();
init_telemetry();

// js/telemetry-ui.js
init_telemetry();
init_hud();
init_util();
var _tapCount = 0;
var _tapTimer = null;
var MARK_TAP_MS = 450;
function bindMarkButton() {
  const btn = $("btn-telemetry-mark");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "1";
  btn.addEventListener("click", () => {
    _tapCount++;
    clearTimeout(_tapTimer);
    _tapTimer = setTimeout(() => {
      const n = _tapCount;
      _tapCount = 0;
      const ctx = getLastMarkContext();
      if (n >= 3) {
        telemetry_default.mark({
          tags: ["phantom_turn"],
          note: "phantom_turn",
          ...ctx || {}
        });
        btn.classList.add("critical-flash");
        setTimeout(() => btn.classList.remove("critical-flash"), 400);
        try {
          navigator.vibrate?.([30, 40, 30, 40, 30]);
        } catch (e) {
        }
      } else if (n >= 2) {
        telemetry_default.mark("critical");
        btn.classList.add("critical-flash");
        setTimeout(() => btn.classList.remove("critical-flash"), 400);
        try {
          navigator.vibrate?.([30, 40, 30]);
        } catch (e) {
        }
      } else {
        telemetry_default.mark(ctx ? { note: "mark", ...ctx } : void 0);
        try {
          navigator.vibrate?.(25);
        } catch (e) {
        }
      }
      btn.classList.add("flash");
      setTimeout(() => btn.classList.remove("flash"), 200);
    }, MARK_TAP_MS);
  });
}
function fmtDur(ms) {
  if (!ms || ms < 0) return "\u2014";
  const s2 = Math.floor(ms / 1e3);
  const m = Math.floor(s2 / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return h + "\u0447 " + m % 60 + "\u043C";
  if (m > 0) return m + "\u043C " + s2 % 60 + "\u0441";
  return s2 + "\u0441";
}
function fmtDate(ts) {
  if (!ts) return "\u2014";
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}
async function refreshSessionsList() {
  const list = $("telemetry-sessions");
  const stats = $("telemetry-stats");
  if (!list) return;
  try {
    const sessions = await telemetry_default.listSessions();
    const st = await telemetry_default.storageStats();
    if (stats) {
      stats.textContent = "\u0421\u0435\u0441\u0441\u0438\u0439: " + st.sessions + " / " + st.maxSessions + " \xB7 \u0441\u043E\u0431\u044B\u0442\u0438\u0439: ~" + st.events;
    }
    if (!sessions.length) {
      list.innerHTML = '<div class="hint">\u0417\u0430\u043F\u0438\u0441\u0435\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442. \u0412\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0442\u0435\u043B\u0435\u043C\u0435\u0442\u0440\u0438\u044E \u0438 \u043D\u0430\u0447\u043D\u0438\u0442\u0435 \u043F\u043E\u0435\u0437\u0434\u043A\u0443.</div>';
      return;
    }
    list.innerHTML = sessions.map((s2) => {
      const dirty = s2.dirty ? ' <span class="tel-dirty">dirty</span>' : "";
      return '<div class="tel-row" data-id="' + s2.id + '"><div class="tel-main"><strong>' + fmtDate(s2.startedAt) + "</strong>" + dirty + '<span class="tel-meta">' + fmtDur(s2.durationMs) + " \xB7 " + s2.eventCount + " \u0441\u043E\u0431. \xB7 \u043C\u0435\u0442\u043E\u043A " + s2.markCount + '</span></div><div class="tel-actions"><button type="button" class="tel-btn" data-act="export" data-id="' + s2.id + '">\u{1F4E4}</button><button type="button" class="tel-btn" data-act="delete" data-id="' + s2.id + '">\u{1F5D1}</button></div></div>';
    }).join("");
  } catch (e) {
    list.innerHTML = '<div class="hint err">IndexedDB: ' + e.message + "</div>";
  }
}
function bindSessionsList() {
  const list = $("telemetry-sessions");
  if (!list || list.dataset.bound) return;
  list.dataset.bound = "1";
  list.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act === "export") {
      try {
        await telemetry_default.export(id);
      } catch (err) {
        alert(err.message);
      }
    } else if (btn.dataset.act === "delete") {
      if (!confirm("\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u0435\u0441\u0441\u0438\u044E \u0438 \u0432\u0441\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F?")) return;
      await telemetry_default.deleteSession(id);
      await refreshSessionsList();
    }
  });
  $("btn-telemetry-export-all")?.addEventListener("click", async () => {
    const sessions = await telemetry_default.listSessions();
    for (const s2 of sessions) {
      try {
        await telemetry_default.export(s2.id);
      } catch (e) {
        console.warn(e);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  });
}
function initTelemetryUI() {
  bindMarkButton();
  bindSessionsList();
  const toggle = $("opt-telemetry");
  if (toggle) {
    toggle.checked = telemetry_default.isEnabled();
    toggle.addEventListener("change", async () => {
      await telemetry_default.setEnabled(toggle.checked);
      telemetry_default.updateMarkButtonVisibility();
      await refreshSessionsList();
    });
  }
  document.getElementById("drawer-telemetry")?.addEventListener("toggle", (e) => {
    if (e.target.open) refreshSessionsList();
  });
  refreshSessionsList();
  telemetry_default.updateMarkButtonVisibility();
}

// js/sw-register.js
function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || window.__SIM__ || location.protocol === "file:") return;
  const raw = window.__BUILD_ID__;
  const buildId = raw && raw !== "__BUILD_ID__" ? raw : "dev";
  const url = "sw.js?v=" + encodeURIComponent(buildId);
  navigator.serviceWorker.register(url, { scope: "./" }).then((reg) => {
    const reloadIfWaiting = (worker) => {
      if (!worker) return;
      worker.postMessage({ type: "SKIP_WAITING" });
      if (navigator.serviceWorker.controller) location.reload();
    };
    if (reg.waiting) reloadIfWaiting(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed") reloadIfWaiting(nw);
      });
    });
  }).catch(() => {
  });
}

// js/main.js
init_vintage_vfd();

// js/legal-consent.js
init_platform();
var LEGAL_DISCLAIMER_VERSION = 1;
var LEGAL_STORAGE_KEY = "moto-hud-legal-consent";
function readConsent() {
  try {
    const raw = localStorage.getItem(LEGAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function hasValidLegalConsent() {
  const data = readConsent();
  return data?.version === LEGAL_DISCLAIMER_VERSION && typeof data?.ts === "string";
}
function saveConsent() {
  localStorage.setItem(LEGAL_STORAGE_KEY, JSON.stringify({
    version: LEGAL_DISCLAIMER_VERSION,
    ts: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
function showBlockedScreen() {
  document.getElementById("legalModal")?.classList.remove("on");
  document.getElementById("legalBlocked")?.classList.add("on");
  document.body.classList.add("legal-blocked");
}
function applyStoreLegalUi() {
  if (!isNative()) return;
  document.querySelectorAll(".pwa-only").forEach((el) => {
    el.style.display = "none";
  });
}
async function onDecline() {
  try {
    const { App: App2 } = await Promise.resolve().then(() => (init_esm5(), esm_exports3));
    const { Capacitor: Capacitor2 } = await Promise.resolve().then(() => (init_dist(), dist_exports));
    if (Capacitor2.isNativePlatform()) {
      await App2.exitApp();
      return;
    }
  } catch {
  }
  showBlockedScreen();
}
function initLegalConsent() {
  applyStoreLegalUi();
  if (hasValidLegalConsent()) return;
  const modal = document.getElementById("legalModal");
  if (!modal) return;
  modal.classList.add("on");
  document.body.classList.add("legal-gate");
  document.getElementById("legal-accept")?.addEventListener("click", () => {
    saveConsent();
    modal.classList.remove("on");
    document.body.classList.remove("legal-gate");
  }, { once: true });
  document.getElementById("legal-decline")?.addEventListener("click", () => {
    void onDecline();
  }, { once: true });
}

// js/main.js
init_yandex_import();

// js/yandex-clipboard.js
init_state();
init_yandex_link();
init_yandex_import();
var _clipDebounce = null;
async function sha256(text) {
  if (!crypto?.subtle) return text.slice(0, 64);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function initYandexClipboard() {
  if (!navigator.clipboard?.readText) return;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    clearTimeout(_clipDebounce);
    _clipDebounce = setTimeout(async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!isYandexMapsUrl(text)) return;
        const hash = await sha256(text);
        if (hash === S.lastAppliedClipboardHash) return;
        showYandexBanner("\u041D\u0430\u0439\u0434\u0435\u043D\u0430 \u043D\u043E\u0432\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u042F\u043D\u0434\u0435\u043A\u0441.\u041A\u0430\u0440\u0442", async () => {
          S.lastAppliedClipboardHash = hash;
          try {
            await importYandexFromText(text);
          } catch (e) {
            alert(e.message || e);
          }
        });
      } catch {
      }
    }, 400);
  });
}

// js/yandex-share.js
init_yandex_link();
init_yandex_import();
function sharedTextFromLocation() {
  const q = new URLSearchParams(location.search);
  return q.get("shared_url") || q.get("shared_text") || q.get("text") || q.get("url") || "";
}
async function handleSharedText(raw) {
  const text = String(raw || "").trim();
  if (!text) return;
  const url = extractYandexUrl(text);
  if (!url && !isYandexMapsUrl(text)) return;
  showYandexBanner("\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u043C\u0430\u0440\u0448\u0440\u0443\u0442 \u0438\u0437 \u042F\u043D\u0434\u0435\u043A\u0441.\u041A\u0430\u0440\u0442?", async () => {
    try {
      await importYandexFromText(url || text);
    } catch (e) {
      alert(e.message || e);
    }
  });
}
function initYandexShare() {
  const fromUrl = sharedTextFromLocation();
  if (fromUrl) void handleSharedText(fromUrl);
  window.addEventListener("motohud-share", () => {
    const t = window.__sharedYandexText || window.__sharedYandexUrl || "";
    if (t) void handleSharedText(t);
  });
  if (window.__sharedYandexText || window.__sharedYandexUrl) {
    void handleSharedText(window.__sharedYandexText || window.__sharedYandexUrl);
  }
}

// js/main.js
init_view_mode();
applyThemeCss();
initLegalConsent();
initYandexImportUi();
initYandexClipboard();
initYandexShare();
initViewMode();
initThemeManager();
initVintageVfd();
initTelemetry().then(() => initTelemetryUI());
initGps({ onTick, onVisual: renderVisualFrame });
loadElevOptsFromStorage();
loadCurveOptsFromStorage();
loadHudOptsFromStorage();
loadAppOptsFromStorage();
syncOptionsFromDom();
updateCamStatusUI();
bindSetupUI();
initFavorites();
initNativeHints();
initTtsHealth();
window.__motoHUD = {
  S,
  applyCoordsOrLink,
  setFinishQuiet,
  startHud,
  startGps,
  doBuildRoute,
  doAddressSearch,
  onTick,
  _searchBusy: false,
  _finishFocused: false
};
window.applyTheme = applyTheme;
window.addEventListener("load", () => {
  setTimeout(startGps, 400);
  registerServiceWorker();
  if (window.__SIM__?.boot && !window.__SIM__._bootScheduled) {
    window.__SIM__._bootScheduled = true;
    setTimeout(() => window.__SIM__.boot(), 500);
  }
});
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)

leaflet/dist/leaflet-src.js:
  (* @preserve
   * Leaflet 1.9.4, a JS library for interactive maps. https://leafletjs.com
   * (c) 2010-2023 Vladimir Agafonkin, (c) 2010-2011 CloudMade
   *)
*/
//# sourceMappingURL=app.js.map
