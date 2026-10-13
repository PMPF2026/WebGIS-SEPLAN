/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Elevation Query Tool (Consulta Interativa de Cota Altimétrica por Clique)
 * 
 * Consulta de altitude instantânea em milissegundos via DEM otimizado no navegador (Client-Side).
 * Ativa quando a camada Hipsometria e Relevo ou Curvas de Nível está visível.
 */

import { toUTM22S } from '../utils/projection.js';
import { Notification } from '../ui/notification.js';

export class ElevationQueryTool {
  constructor(mapEngine, layerManager) {
    this.mapEngine = mapEngine;
    this.map = mapEngine.getOlMap();
    this.layerManager = layerManager;

    this.demLoaded = false;
    this.demLoading = false;
    this.loadPromise = null;
    this.meta = null;
    this.demGrid = null;

    this.containerEl = null;
    this.valueEl = null;
    this.closerBtn = null;
    this.overlay = null;

    this.init();
  }

  init() {
    this.createDomElements();
    this.createOverlay();
    this.bindEvents();
  }

  createDomElements() {
    let container = document.getElementById('elevation-bubble');
    if (!container) {
      container = document.createElement('div');
      container.id = 'elevation-bubble';
      container.className = 'elevation-speech-bubble';
      container.style.display = 'none';

      const valueSpan = document.createElement('span');
      valueSpan.id = 'elevation-bubble-value';
      valueSpan.className = 'elevation-bubble-value';
      valueSpan.textContent = '-- m';

      const closer = document.createElement('button');
      closer.id = 'elevation-bubble-closer';
      closer.className = 'elevation-bubble-closer';
      closer.type = 'button';
      closer.setAttribute('aria-label', 'Fechar');
      closer.innerHTML = '&times;';

      container.appendChild(valueSpan);
      container.appendChild(closer);

      const mapTarget = document.getElementById('map') || document.body;
      mapTarget.appendChild(container);
    }

    this.containerEl = container;
    this.valueEl = container.querySelector('#elevation-bubble-value') || container.querySelector('.elevation-bubble-value');
    this.closerBtn = container.querySelector('#elevation-bubble-closer') || container.querySelector('.elevation-bubble-closer');

    if (this.closerBtn) {
      this.closerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
      });
    }
  }

  createOverlay() {
    if (!window.ol || !window.ol.Overlay) return;

    this.overlay = new window.ol.Overlay({
      element: this.containerEl,
      autoPan: {
        animation: { duration: 250 },
        margin: 30
      },
      stopEvent: true,
      positioning: 'bottom-center',
      offset: [0, -8]
    });

    this.map.addOverlay(this.overlay);
  }

  bindEvents() {
    // Monitorar visibilidade das camadas no LayerManager
    const checkActiveLayers = () => {
      const active = this.isActive();
      if (active && !this.demLoaded && !this.demLoading) {
        this.loadDemData().catch(() => {});
      } else if (!active) {
        this.hide();
      }
    };

    // Escutar eventos de mapa ou checkboxes
    document.addEventListener('change', (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('layer-checkbox')) {
        const layerId = e.target.dataset.layerId;
        if (layerId === 'hipsometria_relevo' || layerId === 'curvas_nivel_10m') {
          setTimeout(checkActiveLayers, 100);
        }
      }
    });

    // Fechar ao pressionar Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.containerEl && this.containerEl.style.display !== 'none') {
        this.hide();
      }
    });
  }

  /**
   * Verifica se alguma das camadas de topografia/relevo está ativa
   */
  isActive() {
    const hipsoLayer = this.layerManager.getLayer('hipsometria_relevo');
    const curvasLayer = this.layerManager.getLayer('curvas_nivel_10m');
    const hipsoVis = hipsoLayer ? Boolean(hipsoLayer.getVisible()) : false;
    const curvasVis = curvasLayer ? Boolean(curvasLayer.getVisible()) : false;
    return hipsoVis || curvasVis;
  }

  /**
   * Carrega a matriz binária do DEM de Passo Fundo de forma assíncrona
   */
  async loadDemData() {
    if (this.demLoaded && this.demGrid) return this.demGrid;
    if (this.loadPromise) return this.loadPromise;

    this.demLoading = true;
    this.loadPromise = (async () => {
      try {
        console.log('[ElevationQuery] Baixando matriz DEM otimizada (dem_passo_fundo.bin)...');
        let response = await fetch('dem_passo_fundo.bin');
        if (!response.ok) {
          response = await fetch('data/dem_passo_fundo.bin');
        }
        if (!response.ok) {
          throw new Error(`Falha ao obter DEM: HTTP ${response.status}`);
        }

        const buffer = await response.arrayBuffer();
        this.parseDemBuffer(buffer);
        this.demLoaded = true;
        this.demLoading = false;
        console.log('[ElevationQuery] DEM carregado com sucesso:', {
          dimensoes: `${this.meta.cols}x${this.meta.rows}`,
          faixaAltimetrica: `471.3m - 754.5m`,
          tamanhoArray: this.demGrid.length
        });
        return this.demGrid;
      } catch (err) {
        this.demLoading = false;
        this.loadPromise = null;
        console.error('[ElevationQuery] Erro no carregamento do DEM:', err);
        throw err;
      }
    })();

    return this.loadPromise;
  }

  parseDemBuffer(buffer) {
    const view = new DataView(buffer);
    const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (magic !== 'PFDM') {
      throw new Error(`Assinatura de arquivo inválida: ${magic}`);
    }

    const version = view.getUint16(4, true);
    const cols = view.getUint16(6, true);
    const rows = view.getUint16(8, true);
    const xOrigin = view.getFloat64(10, true);
    const yOrigin = view.getFloat64(18, true);
    const pixelSize = view.getFloat32(26, true);
    const noData = view.getInt16(30, true);

    this.meta = {
      version,
      cols,
      rows,
      xOrigin,
      yOrigin,
      pixelSize,
      noData,
      scale: 10.0
    };

    // Int16Array com início no byte 32 (após cabeçalho de 32 bytes)
    this.demGrid = new Int16Array(buffer, 32, cols * rows);
  }

  /**
   * Calcula a altitude exata em metros via interpolação bilinear na grade DEM
   * @param {Array<number>} coordinate Coordenada do mapa em EPSG:3857
   * @returns {number|null} Altitude em metros ou null se fora da mancha de dados
   */
  getElevationAtCoordinate(coordinate) {
    if (!this.demLoaded || !this.demGrid || !this.meta) {
      return null;
    }

    const utm = toUTM22S(coordinate, 'EPSG:3857');
    const utmX = utm[0];
    const utmY = utm[1];

    const { xOrigin, yOrigin, pixelSize, cols, rows, noData, scale } = this.meta;

    const fx = (utmX - xOrigin) / pixelSize;
    const fy = (yOrigin - utmY) / pixelSize;

    const c0 = Math.floor(fx);
    const r0 = Math.floor(fy);

    // Validação de limites da grade
    if (c0 < 0 || c0 >= cols - 1 || r0 < 0 || r0 >= rows - 1) {
      return null;
    }

    const idx00 = r0 * cols + c0;
    const v00 = this.demGrid[idx00];
    const v01 = this.demGrid[idx00 + 1];
    const v10 = this.demGrid[(r0 + 1) * cols + c0];
    const v11 = this.demGrid[(r0 + 1) * cols + c0 + 1];

    // Se todos os 4 vizinhos têm dados válidos, executa interpolação bilinear contínua
    if (v00 !== noData && v01 !== noData && v10 !== noData && v11 !== noData &&
        v00 > 0 && v01 > 0 && v10 > 0 && v11 > 0) {
      const wx = fx - c0;
      const wy = fy - r0;
      const rawZ = (1 - wx) * (1 - wy) * v00 +
                   wx * (1 - wy) * v01 +
                   (1 - wx) * wy * v10 +
                   wx * wy * v11;
      return rawZ / scale;
    }

    // Fallback para vizinho mais próximo se estiver na borda
    const cNear = Math.round(fx);
    const rNear = Math.round(fy);
    if (cNear >= 0 && cNear < cols && rNear >= 0 && rNear < rows) {
      const vNear = this.demGrid[rNear * cols + cNear];
      if (vNear !== noData && vNear > 0) {
        return vNear / scale;
      }
    }

    return null;
  }

  /**
   * Consulta a altitude no ponto clicado e exibe o balão
   * @param {Array<number>} coordinate Coordenada EPSG:3857
   */
  async query(coordinate) {
    if (!this.isActive()) {
      this.hide();
      return;
    }

    // Se a matriz ainda não terminou de baixar, aguarda
    if (!this.demLoaded) {
      this.showLoading(coordinate);
      try {
        await this.loadDemData();
      } catch (err) {
        this.hide();
        Notification.warning('Não foi possível carregar os dados altimétricos.');
        return;
      }
    }

    const elevation = this.getElevationAtCoordinate(coordinate);
    if (elevation !== null && elevation >= 450 && elevation <= 780) {
      this.show(coordinate, elevation);
    } else {
      this.hide();
    }
  }

  show(coordinate, elevation) {
    const roundedMeters = Math.round(elevation);
    const utm = toUTM22S(coordinate, 'EPSG:3857');

    if (this.valueEl) {
      this.valueEl.textContent = `${roundedMeters} m`;
    }

    if (this.containerEl) {
      this.containerEl.setAttribute('title', `Altitude: ${elevation.toFixed(1)} m | UTM: E ${Math.round(utm[0])}, N ${Math.round(utm[1])}`);
      this.containerEl.style.display = 'inline-flex';
    }

    if (this.overlay) {
      this.overlay.setPosition(coordinate);
    }
  }

  showLoading(coordinate) {
    if (this.valueEl) {
      this.valueEl.textContent = '... m';
    }
    if (this.containerEl) {
      this.containerEl.style.display = 'inline-flex';
    }
    if (this.overlay) {
      this.overlay.setPosition(coordinate);
    }
  }

  hide() {
    if (this.overlay) {
      this.overlay.setPosition(undefined);
    }
    if (this.containerEl) {
      this.containerEl.style.display = 'none';
    }
  }
}
