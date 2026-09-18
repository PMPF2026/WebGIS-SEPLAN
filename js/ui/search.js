/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Intelligent Spatial Search Engine & Autocomplete
 */

import { LAYERS_CONFIG } from '../config/layers.config.js';
import { toUTM22S, utmToLonLat } from '../utils/projection.js';

export class SearchUI {
  constructor(mapEngine, layerManager, popupUI) {
    this.mapEngine = mapEngine;
    this.layerManager = layerManager;
    this.popupUI = popupUI;
    
    this.searchInput = document.getElementById('search-input');
    this.clearBtn = document.getElementById('search-clear-btn');
    this.resultsDropdown = document.getElementById('search-results');
    
    this.debounceTimer = null;
    this.init();
  }

  init() {
    if (!this.searchInput || !this.resultsDropdown) return;

    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      const query = e.target.value.trim();

      if (query.length < 2) {
        this.hideResults();
        return;
      }

      this.debounceTimer = setTimeout(() => {
        this.performSearch(query);
      }, 200);
    });

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.hideResults();
        this.mapEngine.clearHighlight();
      });
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!this.searchInput.contains(e.target) && !this.resultsDropdown.contains(e.target)) {
        this.hideResults();
      }
    });
  }

  async performSearch(query) {
    const results = [];
    const queryLower = query.toLowerCase();

    // 1. Check if user typed coordinates (Lat, Lon or UTM X, Y)
    const coordMatch = query.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const v1 = parseFloat(coordMatch[1]);
      const v3 = parseFloat(coordMatch[3]);

      // Check if Geographic [Lat, Lon] (around -28, -52)
      if (Math.abs(v1) <= 90 && Math.abs(v3) <= 180) {
        results.push({
          title: `Coordenadas Geográficas: ${v1.toFixed(5)}, ${v3.toFixed(5)}`,
          meta: 'Navegação por Ponto de Coordenada',
          badge: 'Coordenada',
          type: 'coord_geo',
          coord: [v3, v1] // [lon, lat]
        });
      }
      // Check if UTM [Easting, Northing] (E: ~300k, N: ~6.8M)
      else if (v1 > 100000 && v3 > 1000000) {
        const lonLat = utmToLonLat([v1, v3]);
        results.push({
          title: `Coordenadas UTM: E ${v1.toLocaleString('pt-BR')} | N ${v3.toLocaleString('pt-BR')}`,
          meta: 'SIRGAS 2000 / Fuso 22S',
          badge: 'UTM 22S',
          type: 'coord_utm',
          coord: lonLat
        });
      }
    }

    // 2. Search loaded features in active and searchable layers
    const searchableLayers = LAYERS_CONFIG.filter(c => c.searchable);

    for (const config of searchableLayers) {
      const olLayer = this.layerManager.getLayer(config.id);
      if (!olLayer) continue;

      // Ensure layer data is loaded for core layers if not yet loaded
      if (olLayer.getSource().getFeatures().length === 0 && config.isCore) {
        await this.layerManager.loadLayerData(config.id);
      }

      const features = olLayer.getSource().getFeatures();
      
      for (const feature of features) {
        if (results.length >= 25) break; // limit to 25 items

        const props = feature.getProperties();
        let matched = false;
        let displayTitle = '';
        let displayMeta = config.name;

        for (const field of config.searchFields || []) {
          const val = props[field];
          if (val && String(val).toLowerCase().includes(queryLower)) {
            matched = true;
            displayTitle = String(val);
            break;
          }
        }

        if (matched) {
          // Enhance title for specific layers
          if (config.id === 'bairros') {
            displayTitle = props['Descri____'] || props['Name'] || displayTitle;
            displayMeta = `População 2022: ${(props['Pop_2022'] || 0).toLocaleString('pt-BR')} hab`;
          } else if (config.id === 'distritos') {
            displayTitle = `Distrito de ${props['nome']}`;
            displayMeta = `População: ${(props['Pop 2022'] || 0).toLocaleString('pt-BR')} hab`;
          } else if (config.id === 'malha_viaria') {
            displayTitle = `${props['NM_TIP_LOG'] || 'Rua'} ${props['NM_LOG'] || ''}`;
            displayMeta = `Residências: ${props['TOT_RES'] || 0} | Quadra: ${props['CD_QUADRA'] || '-'}`;
          }

          results.push({
            title: displayTitle,
            meta: displayMeta,
            badge: config.name,
            type: 'feature',
            feature: feature,
            layerConfig: config
          });
        }
      }
    }

    this.renderResults(results);
  }

  renderResults(results) {
    if (results.length === 0) {
      this.resultsDropdown.innerHTML = `
        <div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 12px;">
          Nenhum resultado encontrado para o termo pesquisado.
        </div>
      `;
      this.resultsDropdown.classList.add('active');
      return;
    }

    this.resultsDropdown.innerHTML = '';

    results.forEach(res => {
      const item = document.createElement('div');
      item.className = 'search-result-item';

      item.innerHTML = `
        <div>
          <div class="search-result-title">${res.title}</div>
          <div class="search-result-meta">${res.meta}</div>
        </div>
        <span class="search-result-badge">${res.badge}</span>
      `;

      item.addEventListener('click', () => {
        this.selectResult(res);
      });

      this.resultsDropdown.appendChild(item);
    });

    this.resultsDropdown.classList.add('active');
  }

  selectResult(result) {
    this.hideResults();

    if (result.type === 'coord_geo' || result.type === 'coord_utm') {
      const mapCoord = ol.proj.fromLonLat(result.coord);
      this.mapEngine.getOlMap().getView().animate({
        center: mapCoord,
        zoom: 16,
        duration: 800
      });
      return;
    }

    if (result.type === 'feature') {
      const feature = result.feature;
      const geom = feature.getGeometry();

      // Ensure layer is visible
      const olLayer = this.layerManager.getLayer(result.layerConfig.id);
      if (olLayer && !olLayer.getVisible()) {
        olLayer.setVisible(true);
        const cb = document.querySelector(`.layer-checkbox[data-layer-id="${result.layerConfig.id}"]`);
        if (cb) cb.checked = true;
      }

      // Highlight feature
      this.mapEngine.setHighlight(feature);

      // Fit view to feature
      const extent = geom.getExtent();
      this.mapEngine.zoomTo(extent, { maxZoom: geom.getType() === 'Point' ? 16 : 15 });

      // Open Popup
      let centerCoord;
      if (geom.getType() === 'Point') {
        centerCoord = geom.getCoordinates();
      } else {
        centerCoord = ol.extent.getCenter(extent);
      }

      setTimeout(() => {
        this.popupUI.showPopupForFeature(feature, result.layerConfig, centerCoord);
      }, 600);
    }
  }

  hideResults() {
    this.resultsDropdown.classList.remove('active');
  }
}
