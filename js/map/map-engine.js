/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * OpenLayers Map Engine Core
 */

import { initProjections, formatCursorCoordinates, EPSG_UTM22S, EPSG_WEBMERCATOR } from '../utils/projection.js';

// Passo Fundo Geographic Coordinates Centroid [Lon, Lat]
export const PASSO_FUNDO_CENTER_LONLAT = [-52.4083, -28.2612];
export const DEFAULT_ZOOM = 12;
export const MIN_ZOOM = 7;
export const MAX_ZOOM = 20;

export class MapEngine {
  constructor(targetElementId = 'map') {
    this.targetId = targetElementId;
    this.map = null;
    this.highlightLayer = null;
    this.popupOverlay = null;
    this.measureOverlays = [];
    
    this.init();
  }

  init() {
    // 1. Register Proj4 projections (EPSG:31982)
    initProjections();

    const centerWebMercator = ol.proj.fromLonLat(PASSO_FUNDO_CENTER_LONLAT);

    // 2. Base View
    const view = new ol.View({
      center: centerWebMercator,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      enableRotation: true
    });

    // 3. Popup Overlay
    const popupElement = document.getElementById('popup');
    this.popupOverlay = new ol.Overlay({
      element: popupElement,
      autoPan: {
        animation: {
          duration: 250
        },
        margin: 40
      },
      stopEvent: true,
      positioning: 'bottom-center',
      offset: [0, -10]
    });

    // 4. Highlight Vector Layer (for selected features in search or click)
    const highlightSource = new ol.source.Vector();
    this.highlightLayer = new ol.layer.Vector({
      source: highlightSource,
      zIndex: 999,
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: '#ffffff',
          width: 5
        }),
        fill: new ol.style.Fill({
          color: 'rgba(255, 120, 0, 0.45)'
        }),
        image: new ol.style.Circle({
          radius: 10,
          fill: new ol.style.Fill({ color: '#ff7800' }),
          stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 })
        })
      })
    });

    // 5. Initialize OpenLayers Map Instance
    this.map = new ol.Map({
      target: this.targetId,
      layers: [],
      overlays: [this.popupOverlay],
      view: view,
      controls: ol.control.defaults.defaults({
        zoom: false, // Custom floating zoom controls
        attribution: true,
        rotate: false
      }).extend([
        new ol.control.ScaleLine({
          units: 'metric',
          bar: false,
          steps: 4,
          minWidth: 100
        })
      ])
    });

    // Add highlight layer on top
    this.map.addLayer(this.highlightLayer);

    // 6. Setup Mouse Move Event for Cursor Coordinates
    this.map.on('pointermove', (evt) => {
      if (evt.dragging) return;
      const coords = evt.coordinate;
      const formatted = formatCursorCoordinates(coords);
      
      const utmSpan = document.getElementById('status-coords-utm');
      const geoSpan = document.getElementById('status-coords-geo');
      if (utmSpan) utmSpan.textContent = formatted.utm;
      if (geoSpan) geoSpan.textContent = formatted.geographic;
    });

    console.log('[MapEngine] OpenLayers 10 inicializado com sucesso em Passo Fundo/RS.');
  }

  /**
   * Reset view to Passo Fundo default center and zoom
   */
  resetView() {
    this.map.getView().animate({
      center: ol.proj.fromLonLat(PASSO_FUNDO_CENTER_LONLAT),
      zoom: DEFAULT_ZOOM,
      duration: 700
    });
  }

  /**
   * Zoom In by 1
   */
  zoomIn() {
    const view = this.map.getView();
    view.animate({ zoom: view.getZoom() + 1, duration: 250 });
  }

  /**
   * Zoom Out by 1
   */
  zoomOut() {
    const view = this.map.getView();
    view.animate({ zoom: view.getZoom() - 1, duration: 250 });
  }

  /**
   * Zoom to a given geometry or extent
   * @param {ol.geom.Geometry|Array<number>} geomOrExtent 
   * @param {Object} options 
   */
  zoomTo(geomOrExtent, options = {}) {
    const defaultOptions = {
      padding: [60, 60, 60, 60],
      duration: 800,
      maxZoom: 17
    };
    const opts = { ...defaultOptions, ...options };
    this.map.getView().fit(geomOrExtent, opts);
  }

  /**
   * Clear any highlighted feature on map
   */
  clearHighlight() {
    if (this.highlightLayer) {
      this.highlightLayer.getSource().clear();
    }
  }

  /**
   * Highlight a feature geometry
   * @param {ol.Feature} feature 
   */
  setHighlight(feature) {
    this.clearHighlight();
    if (feature) {
      const clone = feature.clone();
      this.highlightLayer.getSource().addFeature(clone);
    }
  }

  /**
   * Close and hide popup overlay
   */
  closePopup() {
    if (this.popupOverlay) {
      this.popupOverlay.setPosition(undefined);
    }
    this.clearHighlight();
  }

  /**
   * Get raw OL map instance
   */
  getOlMap() {
    return this.map;
  }
}
