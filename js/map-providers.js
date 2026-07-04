/** Реестр растровых подложек для карты маршрута (экран настройки) */
export const MAP_PROVIDER_KEY = 'moto-hud-map-provider';

export const MAP_PROVIDERS = {
  'carto-voyager': {
    id: 'carto-voyager',
    name: 'CARTO Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    opts: {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OSM'
    }
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    opts: {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }
  },
  'carto-light': {
    id: 'carto-light',
    name: 'CARTO Positron (светлая)',
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
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    opts: {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; CARTO &copy; OSM'
    }
  },
  topo: {
    id: 'topo',
    name: 'OpenTopoMap (рельеф)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    opts: {
      maxZoom: 17,
      attribution: '&copy; OpenTopoMap &copy; OSM'
    }
  }
};

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
