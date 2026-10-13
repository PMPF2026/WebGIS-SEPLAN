/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Componente Modular: Legenda Cartográfica Flutuante da Camada Hipsométrica
 * Posicionamento: Canto inferior direito da área do mapa
 */

export const HIPSOMETRIA_CLASSES = [
  { min: 474, max: 500, label: '474 – 500 m', color: '#006837' },
  { min: 500, max: 525, label: '500 – 525 m', color: '#1a9850' },
  { min: 525, max: 550, label: '525 – 550 m', color: '#66bd63' },
  { min: 550, max: 575, label: '550 – 575 m', color: '#a6d96a' },
  { min: 575, max: 600, label: '575 – 600 m', color: '#d9ef8b' },
  { min: 600, max: 625, label: '600 – 625 m', color: '#fee08b' },
  { min: 625, max: 650, label: '625 – 650 m', color: '#fdc863' },
  { min: 650, max: 675, label: '650 – 675 m', color: '#f4a340' },
  { min: 675, max: 700, label: '675 – 700 m', color: '#e67e33' },
  { min: 700, max: 725, label: '700 – 725 m', color: '#c96a3a' },
  { min: 725, max: 755, label: '725 – 755 m', color: '#f2f0e8' }
];

export class HipsometriaFloatingLegendUI {
  /**
   * @param {Object} layerManager - Instância central de gerenciamento de camadas
   * @param {string} containerId - ID do elemento HTML da legenda flutuante
   */
  constructor(layerManager, containerId = 'hipsometria-floating-legend') {
    this.layerManager = layerManager;
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this._initialized = false;
  }

  /**
   * Inicializa o componente e vincula ouvinte de visibilidade na camada
   */
  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.warn(`[HipsometriaFloatingLegendUI] Container #${this.containerId} não encontrado no DOM.`);
      return;
    }

    const olLayer = this.layerManager.getLayer('hipsometria_relevo');
    if (olLayer) {
      olLayer.on('change:visible', () => this.update());
    }

    // Ouvinte para quando camadas forem registradas/inicializadas
    this.layerManager.onLayerLoaded((layerId) => {
      if (layerId === 'hipsometria_relevo') {
        const layer = this.layerManager.getLayer('hipsometria_relevo');
        if (layer) {
          layer.on('change:visible', () => this.update());
        }
        this.update();
      }
    });

    this._initialized = true;
    this.update();
  }

  /**
   * Atualiza a renderização da legenda de acordo com a visibilidade da camada
   */
  update() {
    if (!this.container) {
      this.container = document.getElementById(this.containerId);
      if (!this.container) return;
    }

    const olLayer = this.layerManager.getLayer('hipsometria_relevo');
    const isVisible = olLayer ? olLayer.getVisible() : false;

    if (!isVisible) {
      this.container.style.display = 'none';
      this.container.innerHTML = '';
      return;
    }

    this.container.style.display = 'flex';
    this.container.innerHTML = this.renderCard();
  }

  /**
   * Renderiza o cartão de legenda com as 11 classes discretas
   * @returns {string}
   */
  renderCard() {
    let itemsHtml = '';
    HIPSOMETRIA_CLASSES.forEach(c => {
      itemsHtml += `
        <div class="hipsometria-legend-row">
          <span class="hipsometria-legend-swatch" style="background-color: ${c.color};"></span>
          <span class="hipsometria-legend-label">${c.label}</span>
        </div>
      `;
    });

    return `
      <div class="hipsometria-legend-card">
        <div class="hipsometria-legend-header">
          <div class="hipsometria-legend-badge">
            <span class="hipsometria-legend-bullet"></span>
            <span>Topografia &amp; Relevo</span>
          </div>
          <div class="hipsometria-legend-title">Hipsometria</div>
          <div class="hipsometria-legend-subtitle">Altitude (m)</div>
        </div>

        <div class="hipsometria-legend-classes">
          ${itemsHtml}
        </div>

        <div class="hipsometria-legend-footnote">
          MDE Passo Fundo &bull; SEPLAN / Defesa Civil
        </div>
      </div>
    `;
  }
}
