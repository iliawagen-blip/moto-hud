(() => {
  // js/map-providers.js
  var MAP_PROVIDER_KEY = "moto-hud-map-provider";
  var WAYMARKED_ATTRIBUTION = 'Trails &copy; <a href="https://waymarkedtrails.org">waymarkedtrails.org</a> (CC-BY-SA) | &copy; OSM';
  var WAYMARKED_OVERLAY_OPTS = {
    maxZoom: 18,
    opacity: 0.92,
    attribution: WAYMARKED_ATTRIBUTION
  };
  var MAP_PROVIDERS = {
    "carto-voyager": {
      id: "carto-voyager",
      name: "CARTO Voyager",
      group: "base",
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      opts: {
        subdomains: "abcd",
        maxZoom: 20,
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OSM'
      }
    },
    "carto-voyager-nl": {
      id: "carto-voyager-nl",
      name: "CARTO Voyager (\u0431\u0435\u0437 \u043F\u043E\u0434\u043F\u0438\u0441\u0435\u0439)",
      group: "base",
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
      opts: {
        subdomains: "abcd",
        maxZoom: 20,
        attribution: "&copy; CARTO &copy; OSM"
      }
    },
    "carto-light": {
      id: "carto-light",
      name: "CARTO Positron (\u0441\u0432\u0435\u0442\u043B\u0430\u044F)",
      group: "base",
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
      group: "base",
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      opts: {
        subdomains: "abcd",
        maxZoom: 20,
        attribution: "&copy; CARTO &copy; OSM"
      }
    },
    osm: {
      id: "osm",
      name: "OpenStreetMap",
      group: "osm",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      opts: {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      }
    },
    "osm-hot": {
      id: "osm-hot",
      name: "OSM Humanitarian (HOT)",
      group: "osm",
      url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      opts: {
        subdomains: "abc",
        maxZoom: 19,
        attribution: "&copy; OSM HOT &copy; OSM"
      }
    },
    cyclosm: {
      id: "cyclosm",
      name: "CyclOSM (\u043C\u043E\u0442\u043E/\u0432\u0435\u043B)",
      group: "osm",
      url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
      opts: {
        subdomains: "abc",
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.cyclosm.org/">CyclOSM</a> &copy; OSM'
      }
    },
    wikimedia: {
      id: "wikimedia",
      name: "Wikimedia OSM",
      group: "osm",
      url: "https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png",
      opts: {
        maxZoom: 19,
        attribution: '&copy; <a href="https://wikimediafoundation.org/">Wikimedia</a> &copy; OSM'
      }
    },
    topo: {
      id: "topo",
      name: "OpenTopoMap (\u0440\u0435\u043B\u044C\u0435\u0444)",
      group: "terrain",
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      opts: {
        maxZoom: 17,
        attribution: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a> &copy; OSM'
      }
    },
    "esri-topo": {
      id: "esri-topo",
      name: "Esri World Topo",
      group: "terrain",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      opts: {
        maxZoom: 19,
        attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>'
      }
    },
    "esri-imagery": {
      id: "esri-imagery",
      name: "\u0421\u043F\u0443\u0442\u043D\u0438\u043A (Esri)",
      group: "satellite",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      opts: {
        maxZoom: 19,
        attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>'
      }
    },
    "waymarked-hiking": {
      id: "waymarked-hiking",
      name: "Waymarked \u2014 \u043F\u0435\u0448\u0438\u0435 \u0442\u0440\u043E\u043F\u044B",
      group: "trails",
      baseId: "carto-voyager",
      overlayUrl: "https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png",
      overlayOpts: { ...WAYMARKED_OVERLAY_OPTS }
    },
    "waymarked-mtb": {
      id: "waymarked-mtb",
      name: "Waymarked \u2014 MTB",
      group: "trails",
      baseId: "carto-voyager",
      overlayUrl: "https://tile.waymarkedtrails.org/mtb/{z}/{x}/{y}.png",
      overlayOpts: { ...WAYMARKED_OVERLAY_OPTS }
    },
    "waymarked-cycling": {
      id: "waymarked-cycling",
      name: "Waymarked \u2014 \u0432\u0435\u043B\u043E\u043C\u0430\u0440\u0448\u0440\u0443\u0442\u044B",
      group: "trails",
      baseId: "carto-voyager",
      overlayUrl: "https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png",
      overlayOpts: { ...WAYMARKED_OVERLAY_OPTS }
    },
    "waymarked-riding": {
      id: "waymarked-riding",
      name: "Waymarked \u2014 \u043A\u043E\u043D\u043D\u044B\u0435",
      group: "trails",
      baseId: "carto-voyager",
      overlayUrl: "https://tile.waymarkedtrails.org/riding/{z}/{x}/{y}.png",
      overlayOpts: { ...WAYMARKED_OVERLAY_OPTS }
    }
  };
  var MAP_PROVIDER_GROUPS = [
    { id: "base", label: "\u0411\u0430\u0437\u043E\u0432\u044B\u0435" },
    { id: "osm", label: "OpenStreetMap" },
    { id: "terrain", label: "\u0420\u0435\u043B\u044C\u0435\u0444" },
    { id: "satellite", label: "\u0421\u043F\u0443\u0442\u043D\u0438\u043A" },
    { id: "trails", label: "\u0422\u0440\u043E\u043F\u044B (Waymarked)" }
  ];
  var DEFAULT_MAP_PROVIDER = "carto-voyager";
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
  function listMapProviderIds() {
    return Object.keys(MAP_PROVIDERS);
  }
  function getMapProviderName(id) {
    return MAP_PROVIDERS[id]?.name || id;
  }
  function resolveMapLayers(providerId) {
    const prov = getMapProvider(providerId);
    if (prov.overlayUrl) {
      const base = getMapProvider(prov.baseId || DEFAULT_MAP_PROVIDER);
      return {
        base: { url: base.url, opts: base.opts },
        overlay: { url: prov.overlayUrl, opts: prov.overlayOpts || {} }
      };
    }
    return {
      base: { url: prov.url, opts: prov.opts || {} },
      overlay: null
    };
  }
  function buildMapProviderSelectHtml(selectedId) {
    const sel = selectedId || getMapProviderId();
    const parts = [];
    for (const g of MAP_PROVIDER_GROUPS) {
      const items = Object.values(MAP_PROVIDERS).filter((p) => p.group === g.id);
      if (!items.length) continue;
      parts.push('<optgroup label="' + g.label + '">');
      for (const p of items) {
        parts.push(
          '<option value="' + p.id + '"' + (p.id === sel ? " selected" : "") + ">" + p.name + "</option>"
        );
      }
      parts.push("</optgroup>");
    }
    const grouped = new Set(MAP_PROVIDER_GROUPS.flatMap(
      (g) => Object.values(MAP_PROVIDERS).filter((p) => p.group === g.id).map((p) => p.id)
    ));
    const rest = Object.values(MAP_PROVIDERS).filter((p) => !grouped.has(p.id));
    if (rest.length) {
      parts.push('<optgroup label="\u041F\u0440\u043E\u0447\u0438\u0435">');
      for (const p of rest) {
        parts.push(
          '<option value="' + p.id + '"' + (p.id === sel ? " selected" : "") + ">" + p.name + "</option>"
        );
      }
      parts.push("</optgroup>");
    }
    return parts.join("");
  }

  // js/sim-map-module.js
  var map = null;
  var tileLayer = null;
  var overlayLayer = null;
  var routeLayer = null;
  var simPathLayer = null;
  var posMarker = null;
  var finishMarker = null;
  var startMarker = null;
  var lastRouteKey = "";
  var lastSimPathKey = "";
  var lastStartKey = "";
  var fittedOnce = false;
  var pickStartMode = false;
  var onStartPicked = null;
  var currentProviderId = DEFAULT_MAP_PROVIDER;
  function routeKey(coords) {
    if (!coords?.length) return "";
    const a = coords[0];
    const b = coords[coords.length - 1];
    return coords.length + ":" + a[0].toFixed(4) + "," + a[1].toFixed(4) + ":" + b[0].toFixed(4) + "," + b[1].toFixed(4);
  }
  function ensureLayers() {
    if (!map) return;
    if (!routeLayer) {
      routeLayer = L.polyline([], { color: "#4dabf7", weight: 5, opacity: 0.85 }).addTo(map);
    }
    if (!simPathLayer) {
      simPathLayer = L.polyline([], { color: "#8b949e", weight: 3, opacity: 0.45, dashArray: "6 8" }).addTo(map);
    }
    if (!posMarker) {
      posMarker = L.circleMarker([0, 0], {
        radius: 9,
        color: "#ffd400",
        weight: 3,
        fillColor: "#ffd400",
        fillOpacity: 0.9
      }).addTo(map);
    }
    if (!finishMarker) {
      finishMarker = L.circleMarker([0, 0], {
        radius: 8,
        color: "#ff6b6b",
        weight: 2,
        fillColor: "#ff6b6b",
        fillOpacity: 0.75
      }).addTo(map);
    }
    if (!startMarker) {
      startMarker = L.circleMarker([55.757, 37.616], {
        radius: 10,
        color: "#39d353",
        weight: 3,
        fillColor: "#39d353",
        fillOpacity: 0.85
      }).addTo(map);
      startMarker.bindTooltip("\u0421\u0442\u0430\u0440\u0442 \u043C\u0430\u0440\u0448\u0440\u0443\u0442\u0430", { direction: "top", permanent: false });
    }
  }
  function setStartMarker(lat, lon) {
    if (!startMarker) return;
    if (lat == null || lon == null) {
      startMarker.setStyle({ opacity: 0, fillOpacity: 0 });
      return;
    }
    startMarker.setLatLng([lat, lon]);
    startMarker.setStyle({ opacity: 1, fillOpacity: 0.85 });
    lastStartKey = lat.toFixed(5) + "," + lon.toFixed(5);
  }
  function fitToContent() {
    if (!map || !window.L) return;
    const bounds = L.latLngBounds([]);
    [routeLayer, simPathLayer, posMarker, finishMarker, startMarker].forEach((layer) => {
      if (!layer) return;
      try {
        const b = layer.getBounds?.();
        if (b?.isValid()) bounds.extend(b);
      } catch (e) {
      }
    });
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.12), { animate: false, maxZoom: 15 });
      fittedOnce = true;
    }
  }
  function setMapProvider(id) {
    if (!map || !MAP_PROVIDERS[id]) return false;
    currentProviderId = id;
    saveMapProviderId(id);
    const layers = resolveMapLayers(id);
    if (tileLayer) map.removeLayer(tileLayer);
    if (overlayLayer) {
      map.removeLayer(overlayLayer);
      overlayLayer = null;
    }
    tileLayer = L.tileLayer(layers.base.url, layers.base.opts).addTo(map);
    if (layers.overlay) {
      overlayLayer = L.tileLayer(layers.overlay.url, layers.overlay.opts).addTo(map);
    }
    tileLayer.bringToBack();
    if (overlayLayer) overlayLayer.bringToFront();
    return true;
  }
  function onMapClick(e) {
    if (!pickStartMode || !e?.latlng) return;
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    setStartMarker(lat, lon);
    if (typeof onStartPicked === "function") onStartPicked(lat, lon);
  }
  function init(container) {
    if (!window.L || !container || map) return;
    map = L.map(container, { zoomControl: true, attributionControl: false, preferCanvas: true });
    currentProviderId = getMapProviderId();
    setMapProvider(currentProviderId);
    map.setView([55.757, 37.616], 13);
    map.on("click", onMapClick);
    ensureLayers();
    setTimeout(() => map.invalidateSize(), 120);
  }
  function update(frameWin) {
    if (!map || !frameWin) return;
    let S = null;
    let simApi = null;
    try {
      S = frameWin.__motoHUD?.S;
      simApi = frameWin.__SIM__;
    } catch (e) {
      return;
    }
    ensureLayers();
    const coords = S?.route?.coords;
    const rk = routeKey(coords);
    if (rk !== lastRouteKey) {
      lastRouteKey = rk;
      if (coords?.length >= 2) {
        routeLayer.setLatLngs(coords.map((c) => [c[0], c[1]]));
        routeLayer.setStyle({ opacity: 0.85 });
      } else {
        routeLayer.setLatLngs([]);
      }
      fittedOnce = false;
    }
    let simPath = null;
    try {
      simPath = simApi?.path;
    } catch (e) {
    }
    const spk = simPath?.length ? simPath.length + ":" + simPath[0][0].toFixed(4) : "";
    if (spk !== lastSimPathKey) {
      lastSimPathKey = spk;
      if (simPath?.length >= 2) {
        simPathLayer.setLatLngs(simPath.map((p) => [p[0], p[1]]));
      } else {
        simPathLayer.setLatLngs([]);
      }
      fittedOnce = false;
    }
    let start = null;
    try {
      start = simApi?.start;
    } catch (e) {
    }
    const sk = start ? start[0].toFixed(5) + "," + start[1].toFixed(5) : "";
    if (sk && sk !== lastStartKey) setStartMarker(start[0], start[1]);
    const gps = S?.gps;
    if (gps?.lat != null && gps?.lon != null) {
      posMarker.setLatLng([gps.lat, gps.lon]);
      posMarker.setStyle({ opacity: 1, fillOpacity: 0.9 });
    } else {
      posMarker.setStyle({ opacity: 0, fillOpacity: 0 });
    }
    const fin = S?.finish;
    if (fin?.lat != null && fin?.lon != null) {
      finishMarker.setLatLng([fin.lat, fin.lon]);
      finishMarker.setStyle({ opacity: 1, fillOpacity: 0.75 });
    } else {
      finishMarker.setStyle({ opacity: 0, fillOpacity: 0 });
    }
    if (!fittedOnce && (coords?.length >= 2 || simPath?.length >= 2 || gps || start)) {
      fitToContent();
    } else if (gps && S?.route && fittedOnce) {
      const z = map.getZoom();
      if (z >= 10) map.panTo([gps.lat, gps.lon], { animate: true, duration: 0.35 });
    }
  }
  function invalidateSize() {
    if (map) setTimeout(() => map.invalidateSize(), 80);
  }
  function resetFit() {
    fittedOnce = false;
  }
  function setPickStartMode(on, cb) {
    pickStartMode = !!on;
    onStartPicked = typeof cb === "function" ? cb : null;
    if (map) {
      map.getContainer().style.cursor = pickStartMode ? "crosshair" : "";
    }
  }
  window.SimMap = {
    init,
    update,
    invalidateSize,
    resetFit,
    setMapProvider,
    setStartMarker,
    setPickStartMode,
    getProviderIds: listMapProviderIds,
    getProviderName: getMapProviderName,
    getCurrentProviderId: () => currentProviderId,
    buildProviderSelectHtml: () => buildMapProviderSelectHtml(currentProviderId)
  };
})();
