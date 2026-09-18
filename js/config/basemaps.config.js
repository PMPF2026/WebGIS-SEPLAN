/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Basemaps Configuration
 */

export const BASEMAPS_CONFIG = [
  {
    id: 'google_hybrid',
    name: 'Google Híbrido / Relevo',
    type: 'xyz',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    thumbnail: 'https://mt1.google.com/vt/lyrs=y&x=366&y=593&z=10',
    maxZoom: 20,
    attribution: '&copy; Google Maps',
    isDefault: true
  },
  {
    id: 'google_sat',
    name: 'Google Satélite',
    type: 'xyz',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    thumbnail: 'https://mt1.google.com/vt/lyrs=s&x=366&y=593&z=10',
    maxZoom: 20,
    attribution: '&copy; Google Earth / Maxar'
  },
  {
    id: 'google_roads',
    name: 'Google Maps (Ruas)',
    type: 'xyz',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    thumbnail: 'https://mt1.google.com/vt/lyrs=m&x=366&y=593&z=10',
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  },
  {
    id: 'esri_imagery',
    name: 'Esri World Imagery',
    type: 'xyz',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    thumbnail: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/10/593/366',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics'
  },
  {
    id: 'osm_standard',
    name: 'OpenStreetMap',
    type: 'osm',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  },
  {
    id: 'carto_dark',
    name: 'CartoDB Dark Matter',
    type: 'xyz',
    url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; CartoDB, OpenStreetMap'
  }
];
