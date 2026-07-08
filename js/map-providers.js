/** Реестр растровых подложек для карты маршрута (setup, HUD, sim). */
export const MAP_PROVIDER_KEY = 'moto-hud-map-provider';

const WAYMARKED_ATTRIBUTION =
  'Trails &copy; <a href="https://waymarkedtrails.org">waymarkedtrails.org</a> (CC-BY-SA) | &copy; OSM';

const WAYMARKED_OVERLAY_OPTS = {
  maxZoom: 18,
  opacity: 0.92,
  attribution: WAYMARKED_ATTRIBUTION
};

/** @typedef {{ id: string, name: string, url?: string, opts?: object, group?: string, baseId?: string, overlayUrl?: string, overlayOpts?: object }} MapProvider */

/** @type {Record<string, MapProvider>} */
export const MAP_PROVIDERS = {
  'carto-voyager': {
    id: 'carto-voyager',
    name: 'CARTO Voyager',
    group: 'base',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    opts: {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OSM'
    }
  },
  'carto-voyager-nl': {
    id: 'carto-voyager-nl',
    name: 'CARTO Voyager (без подписей)',
    group: 'base',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
    opts: {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; CARTO &copy; OSM'
    }
  },
  'carto-light': {
    id: 'carto-light',
    name: 'CARTO Positron (светлая)',
    group: 'base',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    opts: {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; CARTO &copy; OSM'
    }
  },
  'carto-dark': {
    id: 'carto-dark',
    name: 'CARTO Dark (тёмная)',
    group: 'base',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    opts: {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; CARTO &copy; OSM'
    }
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    group: 'osm',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    opts: {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }
  },
  'osm-hot': {
    id: 'osm-hot',
    name: 'OSM Humanitarian (HOT)',
    group: 'osm',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    opts: {
      subdomains: 'abc',
      maxZoom: 19,
      attribution: '&copy; OSM HOT &copy; OSM'
    }
  },
  cyclosm: {
    id: 'cyclosm',
    name: 'CyclOSM (мото/вел)',
    group: 'osm',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    opts: {
      subdomains: 'abc',
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.cyclosm.org/">CyclOSM</a> &copy; OSM'
    }
  },
  wikimedia: {
    id: 'wikimedia',
    name: 'Wikimedia OSM',
    group: 'osm',
    url: 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png',
    opts: {
      maxZoom: 19,
      attribution: '&copy; <a href="https://wikimediafoundation.org/">Wikimedia</a> &copy; OSM'
    }
  },
  topo: {
    id: 'topo',
    name: 'OpenTopoMap (рельеф)',
    group: 'terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    opts: {
      maxZoom: 17,
      attribution: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a> &copy; OSM'
    }
  },
  'esri-topo': {
    id: 'esri-topo',
    name: 'Esri World Topo',
    group: 'terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    opts: {
      maxZoom: 19,
      attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>'
    }
  },
  'esri-imagery': {
    id: 'esri-imagery',
    name: 'Спутник (Esri)',
    group: 'satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    opts: {
      maxZoom: 19,
      attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>'
    }
  },
  'waymarked-hiking': {
    id: 'waymarked-hiking',
    name: 'Waymarked — пешие тропы',
    group: 'trails',
    baseId: 'carto-voyager',
    overlayUrl: 'https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png',
    overlayOpts: { ...WAYMARKED_OVERLAY_OPTS }
  },
  'waymarked-mtb': {
    id: 'waymarked-mtb',
    name: 'Waymarked — MTB',
    group: 'trails',
    baseId: 'carto-voyager',
    overlayUrl: 'https://tile.waymarkedtrails.org/mtb/{z}/{x}/{y}.png',
    overlayOpts: { ...WAYMARKED_OVERLAY_OPTS }
  },
  'waymarked-cycling': {
    id: 'waymarked-cycling',
    name: 'Waymarked — веломаршруты',
    group: 'trails',
    baseId: 'carto-voyager',
    overlayUrl: 'https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png',
    overlayOpts: { ...WAYMARKED_OVERLAY_OPTS }
  },
  'waymarked-riding': {
    id: 'waymarked-riding',
    name: 'Waymarked — конные',
    group: 'trails',
    baseId: 'carto-voyager',
    overlayUrl: 'https://tile.waymarkedtrails.org/riding/{z}/{x}/{y}.png',
    overlayOpts: { ...WAYMARKED_OVERLAY_OPTS }
  }
};

export const MAP_PROVIDER_GROUPS = [
  { id: 'base', label: 'Базовые' },
  { id: 'osm', label: 'OpenStreetMap' },
  { id: 'terrain', label: 'Рельеф' },
  { id: 'satellite', label: 'Спутник' },
  { id: 'trails', label: 'Тропы (Waymarked)' }
];

export const DEFAULT_MAP_PROVIDER = 'carto-voyager';

export function getMapProviderId(){
  try{
    const id = localStorage.getItem(MAP_PROVIDER_KEY);
    if(id && MAP_PROVIDERS[id]) return id;
  }catch(e){}
  return DEFAULT_MAP_PROVIDER;
}

export function saveMapProviderId(id){
  if(!MAP_PROVIDERS[id]) return;
  try{ localStorage.setItem(MAP_PROVIDER_KEY, id); }catch(e){}
}

export function getMapProvider(id){
  return MAP_PROVIDERS[id || getMapProviderId()] || MAP_PROVIDERS[DEFAULT_MAP_PROVIDER];
}

export function listMapProviderIds(){
  return Object.keys(MAP_PROVIDERS);
}

export function getMapProviderName(id){
  return MAP_PROVIDERS[id]?.name || id;
}

/**
 * Разрешить базовый слой и опциональный оверлей (Waymarked Trails).
 * @returns {{ base: { url: string, opts: object }, overlay: { url: string, opts: object } | null }}
 */
export function resolveMapLayers(providerId){
  const prov = getMapProvider(providerId);
  if(prov.overlayUrl){
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

/** HTML <option> / <optgroup> для селектора подложки. */
export function buildMapProviderSelectHtml(selectedId){
  const sel = selectedId || getMapProviderId();
  const parts = [];
  for(const g of MAP_PROVIDER_GROUPS){
    const items = Object.values(MAP_PROVIDERS).filter(p => p.group === g.id);
    if(!items.length) continue;
    parts.push('<optgroup label="' + g.label + '">');
    for(const p of items){
      parts.push(
        '<option value="' + p.id + '"' + (p.id === sel ? ' selected' : '') + '>' + p.name + '</option>'
      );
    }
    parts.push('</optgroup>');
  }
  const grouped = new Set(MAP_PROVIDER_GROUPS.flatMap(g =>
    Object.values(MAP_PROVIDERS).filter(p => p.group === g.id).map(p => p.id)
  ));
  const rest = Object.values(MAP_PROVIDERS).filter(p => !grouped.has(p.id));
  if(rest.length){
    parts.push('<optgroup label="Прочие">');
    for(const p of rest){
      parts.push(
        '<option value="' + p.id + '"' + (p.id === sel ? ' selected' : '') + '>' + p.name + '</option>'
      );
    }
    parts.push('</optgroup>');
  }
  return parts.join('');
}
