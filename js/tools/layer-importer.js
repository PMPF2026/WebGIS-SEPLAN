/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Dynamic Layer Importer & Drag & Drop Handler (GeoJSON / KML)
 */

import { Notification } from '../ui/notification.js';

export class LayerImporter {
  constructor(mapEngine, layerManager, sidebarUI) {
    this.mapEngine = mapEngine;
    this.layerManager = layerManager;
    this.sidebarUI = sidebarUI;

    this.init();
  }

  init() {
    // 1. File Input Selector
    const fileInput = document.getElementById('input-import-geojson');
    const importBtn = document.getElementById('btn-import-layer');

    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.handleFile(file);
        }
      });
    }

    // 2. Drag & Drop on Window / Map
    const mapElement = document.getElementById('map');
    if (mapElement) {
      mapElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        mapElement.style.border = '2px dashed var(--dc-orange-primary)';
      });

      mapElement.addEventListener('dragleave', () => {
        mapElement.style.border = 'none';
      });

      mapElement.addEventListener('drop', (e) => {
        e.preventDefault();
        mapElement.style.border = 'none';
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          this.handleFile(file);
        }
      });
    }
  }

  /**
   * Reads, parses and loads a user-provided file into the map
   * @param {File} file 
   */
  async handleFile(file) {
    const fileName = file.name;
    const cleanName = fileName.replace(/\.[^/.]+$/, "");
    Notification.info(`Importando arquivo '${fileName}'...`);

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      if (!jsonData || (!jsonData.type && !jsonData.features)) {
        throw new Error('Formato GeoJSON inválido ou corrompido.');
      }

      // Generate a vibrant color for the custom layer
      const colors = ['#f43f5e', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const result = this.layerManager.addCustomGeoJsonLayer(cleanName, jsonData, color);

      // Refresh sidebar layer tree and legend
      this.sidebarUI.renderLayerTree();

      Notification.success(`Camada '${cleanName}' importada com sucesso (${result.featureCount} feições)!`);
    } catch (err) {
      console.error('[LayerImporter] Erro na importação:', err);
      Notification.error(`Falha ao importar '${fileName}': ${err.message}`);
    }
  }
}
