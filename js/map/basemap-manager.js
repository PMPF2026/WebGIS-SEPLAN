/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Basemap Switcher & Layer Manager
 */

import { BASEMAPS_CONFIG } from '../config/basemaps.config.js';

export class BasemapManager {
  constructor(mapEngine) {
    this.mapEngine = mapEngine;
    this.map = mapEngine.getOlMap();
    this.basemapLayers = new Map();
    this.activeBasemapId = null;
    
    this.init();
  }

  init() {
    // Create OpenLayers TileLayer for each configured basemap
    BASEMAPS_CONFIG.forEach((cfg) => {
      let source;
      if (cfg.type === 'osm') {
        source = new ol.source.OSM({
          attributions: cfg.attribution
        });
      } else {
        source = new ol.source.XYZ({
          url: cfg.url,
          maxZoom: cfg.maxZoom || 19,
          attributions: cfg.attribution,
          crossOrigin: 'anonymous'
        });
      }

      const layer = new ol.layer.Tile({
        source: source,
        visible: false,
        zIndex: 0
      });
      layer.set('basemapId', cfg.id);
      layer.set('isBasemap', true);

      this.map.addLayer(layer);
      this.basemapLayers.set(cfg.id, layer);
    });

    // Activate default basemap
    const defaultCfg = BASEMAPS_CONFIG.find(b => b.isDefault) || BASEMAPS_CONFIG[0];
    this.setBasemap(defaultCfg.id);
  }

  /**
   * Switch active basemap
   * @param {string} basemapId 
   */
  setBasemap(basemapId) {
    if (!this.basemapLayers.has(basemapId)) return;

    this.basemapLayers.forEach((layer, id) => {
      const isTarget = (id === basemapId);
      layer.setVisible(isTarget);
    });

    this.activeBasemapId = basemapId;

    // Update UI active card states
    document.querySelectorAll('.basemap-card').forEach(card => {
      const id = card.getAttribute('data-basemap-id');
      if (id === basemapId) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    console.log(`[BasemapManager] Mapa base alterado para: ${basemapId}`);
  }

  /**
   * Render Basemap cards into target container
   * @param {string} containerId 
   */
  renderBasemapSelector(containerId = 'basemap-grid') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    BASEMAPS_CONFIG.forEach(cfg => {
      const card = document.createElement('div');
      card.className = `basemap-card ${cfg.id === this.activeBasemapId ? 'active' : ''}`;
      card.setAttribute('data-basemap-id', cfg.id);

      card.innerHTML = `
        <div class="basemap-thumb" style="background-image: url('${cfg.thumbnail}');"></div>
        <div class="basemap-title">${cfg.name}</div>
      `;

      card.addEventListener('click', () => {
        this.setBasemap(cfg.id);
      });

      container.appendChild(card);
    });
  }

  getActiveBasemapId() {
    return this.activeBasemapId;
  }
}
