/**
 * WebGIS SEPLAN Passo Fundo - Basemaps Configuration
 * Provedores Cartográficos Públicos, Estáveis e sem Exigência de Chave de API
 */

export const BASEMAPS_CONFIG = [
  {
    id: 'esri_imagery',
    name: 'Esri Satélite',
    type: 'xyz',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/10/593/366',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
    isDefault: true
  },
  {
    id: 'osm_standard',
    name: 'OpenStreetMap',
    type: 'osm',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    thumbnail: 'https://tile.openstreetmap.org/10/366/593.png',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
  },
  {
    id: 'carto_positron',
    name: 'CartoDB Positron (Claro)',
    type: 'xyz',
    url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png',
    thumbnail: 'https://a.basemaps.cartocdn.com/rastertiles/light_all/10/366/593.png',
    maxZoom: 20,
    attribution: '&copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>, &copy; OpenStreetMap contributors'
  },
  {
    id: 'carto_dark',
    name: 'CartoDB Dark Matter (Escuro)',
    type: 'xyz',
    url: 'https://{a-d}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
    thumbnail: 'https://a.basemaps.cartocdn.com/rastertiles/dark_all/10/366/593.png',
    maxZoom: 20,
    attribution: '&copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>, &copy; OpenStreetMap contributors'
  }
];
