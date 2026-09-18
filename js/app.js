/**
 * WebGIS SEPLAN Passo Fundo - Diagnósticos Territoriais
 * Application Entry Point & Central Orchestrator
 */

import { MapEngine } from './map/map-engine.js';
import { BasemapManager } from './map/basemap-manager.js';
import { LayerManager } from './map/layer-manager.js';
import { SidebarUI } from './ui/sidebar.js';
import { LegendUI } from './ui/legend.js';
import { SearchUI } from './ui/search.js';
import { PopupUI } from './ui/popup.js';
import { Notification } from './ui/notification.js';
import { IdentifyTool } from './tools/identify.js';
import { MeasureTool } from './tools/measure.js';
import { ExportReportTool } from './tools/export-report.js';
import { LayerImporter } from './tools/layer-importer.js';
import { DownloadsUI } from './ui/downloads.js';
import { Item6ThematicLegendUI } from './ui/thematic-legend-item6.js';
import { MetricsUI } from './metrics/metrics-ui.js';

class WebGisApp {
  constructor() {
    this.mapEngine = null;
    this.basemapManager = null;
    this.layerManager = null;
    this.sidebarUI = null;
    this.legendUI = null;
    this.searchUI = null;
    this.popupUI = null;
    this.identifyTool = null;
    this.measureTool = null;
    this.exportReportTool = null;
    this.layerImporter = null;
    this.downloadsUI = null;
    this.item6ThematicLegendUI = null;
    this.metricsUI = null;
  }

  async start() {
    console.log('[WebGisApp] Inicializando WebGIS SEPLAN Passo Fundo...');

    try {
      // 1. Initialize OpenLayers Map Engine
      this.mapEngine = new MapEngine('map');

      // 2. Initialize Basemaps
      this.basemapManager = new BasemapManager(this.mapEngine);
      this.basemapManager.renderBasemapSelector('basemap-grid');

      // 3. Initialize Layer Manager
      this.layerManager = new LayerManager(this.mapEngine);

      // 4. Initialize Legend UI
      this.legendUI = new LegendUI(this.layerManager, 'legend-container');

      // 5. Initialize Sidebar UI
      this.sidebarUI = new SidebarUI(this.layerManager, this.legendUI, this.mapEngine);

      // 6. Initialize Popup UI
      this.popupUI = new PopupUI(this.mapEngine, this.layerManager);

      // 7. Initialize Search UI
      this.searchUI = new SearchUI(this.mapEngine, this.layerManager, this.popupUI);

      // 8. Initialize Identify Tool
      this.identifyTool = new IdentifyTool(this.mapEngine, this.layerManager, this.popupUI);

      // 9. Initialize Measurement Tool
      this.measureTool = new MeasureTool(this.mapEngine);

      // 10. Initialize Export & Report Tool
      this.exportReportTool = new ExportReportTool(this.mapEngine, this.layerManager, null);

      // 11. Initialize Downloads UI Catalog
      this.downloadsUI = new DownloadsUI(this.layerManager);

      // 12. Initialize Territorial Metrics UI Panel
      this.metricsUI = new MetricsUI(this.layerManager, this.mapEngine, this.sidebarUI);

      // 13. Initialize Dynamic Layer Importer (Drag & Drop)
      this.layerImporter = new LayerImporter(this.mapEngine, this.layerManager, this.sidebarUI);

      // 13. Bind Floating Controls and Keyboard Shortcuts
      this.bindFloatingControls();
      this.bindKeyboardShortcuts();
      this.refreshIcons();

      // 14. Load initial core layers
      await this.layerManager.initLayers();

      // 15. Inicializar Legenda Cartográfica Temática Dinâmica do Item 6 (População & Indicadores Econômicos)
      this.item6ThematicLegendUI = new Item6ThematicLegendUI(this.layerManager, 'item6-floating-legend');
      this.item6ThematicLegendUI.init();

      // 16. Refresh Lucide Icons across all rendered components
      this.refreshIcons();

      // 17. Hide Loading Overlay
      const loader = document.getElementById('loading-overlay');
      if (loader) {
        loader.classList.add('hidden');
      }

      Notification.success('WebGIS SEPLAN Passo Fundo carregado com sucesso!');
    } catch (err) {
      console.error('[WebGisApp] Falha na inicialização do WebGIS:', err);
      Notification.error(`Erro na inicialização: ${err.message}`);
      const loader = document.getElementById('loading-overlay');
      if (loader) loader.classList.add('hidden');
    }
  }

  refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      document.querySelectorAll('i[class*="lucide-"]').forEach(el => {
        const match = el.className.match(/lucide-([a-z0-9-]+)/);
        if (match && !el.getAttribute('data-lucide')) {
          el.setAttribute('data-lucide', match[1]);
        }
      });
      window.lucide.createIcons();
    }
  }

  bindFloatingControls() {
    // 0. North Indicator / Cartographic Compass Control
    const northBtn = document.getElementById('btn-north-indicator');
    const northArrow = document.getElementById('north-arrow-svg');
    if (northBtn) {
      northBtn.addEventListener('click', () => {
        const view = this.mapEngine.getOlMap().getView();
        if (view.getRotation() !== 0) {
          view.animate({
            rotation: 0,
            duration: 350
          });
          Notification.info('Orientação redefinida para o Norte.');
        } else {
          Notification.info('Mapa orientado para o Norte (0°).');
        }
      });

      this.mapEngine.getOlMap().getView().on('change:rotation', (e) => {
        const rotation = e.target.getRotation();
        if (northArrow) {
          northArrow.style.transform = `rotate(${rotation}rad)`;
        }
      });
    }

    const zoomInBtn = document.getElementById('btn-zoom-in');
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.mapEngine.zoomIn());

    const zoomOutBtn = document.getElementById('btn-zoom-out');
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.mapEngine.zoomOut());

    const homeBtn = document.getElementById('btn-home-view');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        this.mapEngine.resetView();
        Notification.info('Visualização restaurada para Passo Fundo/RS.');
      });
    }

    const locateBtn = document.getElementById('btn-my-location');
    if (locateBtn) {
      locateBtn.addEventListener('click', () => {
        if ('geolocation' in navigator) {
          Notification.info('Obtendo localização GPS...');
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lon = pos.coords.longitude;
              const lat = pos.coords.latitude;
              const coord = ol.proj.fromLonLat([lon, lat]);
              
              this.mapEngine.getOlMap().getView().animate({
                center: coord,
                zoom: 16,
                duration: 800
              });

              const marker = new ol.Feature({ geometry: new ol.geom.Point(coord) });
              this.mapEngine.setHighlight(marker);
              Notification.success('Localização centralizada.');
            },
            (err) => {
              Notification.warning(`Não foi possível obter a localização: ${err.message}`);
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        } else {
          Notification.warning('Geolocalização indisponível.');
        }
      });
    }

    const fsBtn = document.getElementById('btn-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            Notification.warning(`Erro ao entrar em tela cheia: ${err.message}`);
          });
        } else {
          document.exitFullscreen();
        }
      });
    }

    // Modal Sobre / Informações
    const aboutBtn = document.getElementById('btn-open-about');
    const aboutModal = document.getElementById('about-modal');
    const closeAboutBtn = document.getElementById('btn-close-about-modal');

    if (aboutBtn && aboutModal) {
      aboutBtn.addEventListener('click', () => {
        aboutModal.classList.add('active');
      });
    }
    if (closeAboutBtn && aboutModal) {
      closeAboutBtn.addEventListener('click', () => {
        aboutModal.classList.remove('active');
      });
    }
    if (aboutModal) {
      aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
          aboutModal.classList.remove('active');
        }
      });
    }
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key === 'Escape') {
        this.mapEngine.closePopup();
        this.measureTool.stopMeasurement();
        const aboutModal = document.getElementById('about-modal');
        if (aboutModal) aboutModal.classList.remove('active');
        if (this.metricsUI) this.metricsUI.closeModal();
      } else if (e.key === '+' || e.key === '=') {
        this.mapEngine.zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        this.mapEngine.zoomOut();
      } else if (e.key === 'h' || e.key === 'H') {
        this.mapEngine.resetView();
      }
    });
  }
}

// Start application on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.webGis = new WebGisApp();
  window.webGis.start();
});
