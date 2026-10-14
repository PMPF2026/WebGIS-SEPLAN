/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Componente Modular e Dinâmico: Legenda Cartográfica Temática Exclusiva do Item 6
 * (6. População & Vulnerabilidade Social)
 * 
 * Regra Fundamental: COR DO MAPA = COR DA LEGENDA (consumo direto de choroplethBreaks)
 */

import { LAYERS_CONFIG } from '../config/layers.config.js';

// Mapeamento exclusivo das 8 camadas do Item 6 e sua hierarquia de títulos
export const ITEM6_LAYER_DEFINITIONS = {
  censo_pop_0a4: {
    title: 'População de 0 a 4 anos',
    subtitle: 'Primeira Infância',
    unitNote: 'Proporção por setor censitário &bull; Censo 2022'
  },
  censo_pop_5a9: {
    title: 'População de 5 a 9 anos',
    subtitle: 'Crianças',
    unitNote: 'Proporção por setor censitário &bull; Censo 2022'
  },
  censo_pop_10a14: {
    title: 'População de 10 a 14 anos',
    subtitle: '',
    unitNote: 'Proporção por setor censitário &bull; Censo 2022'
  },
  censo_pop_15a19: {
    title: 'População de 15 a 19 anos',
    subtitle: 'Jovens',
    unitNote: 'Proporção por setor censitário &bull; Censo 2022'
  },
  censo_pop_20a59: {
    title: 'População de 20 a 59 anos',
    subtitle: 'Adultos',
    unitNote: 'Proporção por setor censitário &bull; Censo 2022'
  },
  censo_pop_m60: {
    title: 'População Idosa — 60 anos ou mais',
    subtitle: 'Grupo Prioritário',
    unitNote: 'Proporção por setor censitário &bull; Censo 2022'
  },
  censo_densidade_2022: {
    title: 'Densidade Demográfica Setorial',
    subtitle: 'Censo 2022 (hab/km²)',
    unitNote: 'Habitantes por km² (hab/km²)'
  },
  censo_renda_vulnerabilidade: {
    title: 'Rendimento Médio Domiciliar',
    subtitle: 'Censo Demográfico 2022 (IBGE)',
    unitNote: 'Rendimento nominal médio mensal por domicílio (R$)'
  },
  censo_alfabetizacao_2022: {
    title: 'Taxa de Alfabetização Setorial',
    subtitle: 'Censo Demográfico 2022 (IBGE)',
    unitNote: 'Classificação cartográfica descritiva da SEPLAN (15+ anos)'
  },
  // --- 9. Infraestrutura Urbana & Entorno dos Domicílios ---
  entorno_pavimentacao: {
    title: 'Pavimentação de Vias',
    subtitle: 'Censo Demográfico 2022 (IBGE)',
    unitNote: 'Proporção de domicílios em vias pavimentadas (%)'
  },
  entorno_calcadas: {
    title: 'Calçadas e Passeios Públicos',
    subtitle: 'Censo Demográfico 2022 (IBGE)',
    unitNote: 'Proporção de domicílios em faces com calçada (%)'
  },
  entorno_obstaculos: {
    title: 'Obstáculos nas Calçadas',
    subtitle: 'Censo Demográfico 2022 (IBGE)',
    unitNote: 'Proporção de domicílios com interferências no passeio (%)'
  },
  entorno_rampas: {
    title: 'Acessibilidade & Rampas',
    subtitle: 'Censo Demográfico 2022 (IBGE)',
    unitNote: 'Proporção de domicílios com rampas para cadeirantes (%)'
  },
  entorno_bueiros: {
    title: 'Drenagem Pluvial (Bueiros)',
    subtitle: 'Censo Demográfico 2022 (IBGE)',
    unitNote: 'Proporção de domicílios com bueiro/boca de lobo (%)'
  },
  entorno_iluminacao: {
    title: 'Iluminação Pública',
    subtitle: 'Censo Demográfico 2022 (IBGE)',
    unitNote: 'Proporção de domicílios com iluminação pública (%)'
  },
  entorno_arborizacao: {
    title: 'Arborização Urbana no Entorno',
    subtitle: 'Censo Demográfico 2022 (IBGE)',
    unitNote: 'Proporção de domicílios com árvores na face (%)'
  }
};

export const ITEM6_LAYER_IDS = Object.keys(ITEM6_LAYER_DEFINITIONS);

export class Item6ThematicLegendUI {
  /**
   * @param {Object} layerManager - Instância central de gerenciamento de camadas
   * @param {string} containerId - ID do elemento HTML onde a legenda será inserida
   */
  constructor(layerManager, containerId = 'item6-floating-legend') {
    this.layerManager = layerManager;
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this._initialized = false;
  }

  /**
   * Inicializa o componente e vincula os ouvintes reativos de visibilidade
   */
  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.warn(`[Item6ThematicLegendUI] Container #${this.containerId} não encontrado no DOM.`);
      return;
    }

    // Vincular ouvintes OpenLayers para cada camada temática
    ITEM6_LAYER_IDS.forEach(id => {
      const olLayer = this.layerManager.getLayer(id);
      if (olLayer) {
        olLayer.on('change:visible', () => this.update());
      }
    });

    // Ouvinte imediato para evento padronizado de visibilidade
    window.addEventListener('layer:visibility-changed', (e) => {
      if (e.detail && ITEM6_LAYER_IDS.includes(e.detail.layerId)) {
        const layer = this.layerManager.getLayer(e.detail.layerId);
        if (layer) {
          layer.on('change:visible', () => this.update());
        }
        this.update();
      }
    });

    // Ouvinte caso o LayerManager carregue feições assincronamente
    this.layerManager.onLayerLoaded((layerId) => {
      if (ITEM6_LAYER_IDS.includes(layerId)) {
        this.update();
      }
    });

    this._initialized = true;
    this.update();
  }

  /**
   * Identifica quais camadas do Item 6 estão ativas no momento
   * @returns {Array<Object>}
   */
  getActiveLayers() {
    return ITEM6_LAYER_IDS
      .map(id => {
        const config = this.layerManager.getConfig(id) || LAYERS_CONFIG.find(c => c.id === id);
        const olLayer = this.layerManager.getLayer(id);
        const isVisible = olLayer ? olLayer.getVisible() : false;
        return { id, config, olLayer, isVisible };
      })
      .filter(item => item.isVisible && item.config && item.config.isChoropleth);
  }

  /**
   * Atualiza a renderização da legenda de acordo com as camadas do Item 6 ativas
   */
  update() {
    if (!this.container) {
      this.container = document.getElementById(this.containerId);
      if (!this.container) return;
    }

    const activeLayers = this.getActiveLayers();

    // Quando nenhuma camada do Item 6 estiver ativa: não exibir a legenda
    if (activeLayers.length === 0) {
      this.container.style.display = 'none';
      this.container.innerHTML = '';
      return;
    }

    // Exibir o container (visível)
    this.container.style.display = 'flex';

    // Gerar o HTML para cada camada ativa
    let html = '';
    activeLayers.forEach(({ id, config }) => {
      html += this.renderLayerCard(id, config);
    });

    this.container.innerHTML = html;
  }

  /**
   * Renderiza o cartão de legenda de uma única camada
   * @param {string} layerId 
   * @param {Object} config 
   * @returns {string}
   */
  renderLayerCard(layerId, config) {
    const meta = ITEM6_LAYER_DEFINITIONS[layerId] || {
      title: config.name,
      subtitle: '',
      unitNote: 'Classificação temática IBGE'
    };

    const strokeColor = config.style?.strokeColor || 'rgba(255, 255, 255, 0.4)';
    const breaks = config.choroplethBreaks || [];

    let itemsHtml = '';
    breaks.forEach(b => {
      itemsHtml += `
        <div class="item6-legend-row">
          <span class="item6-legend-swatch" style="background-color: ${b.color}; border-color: ${strokeColor};"></span>
          <span class="item6-legend-label">${b.label}</span>
        </div>
      `;
    });

    const isEntorno = layerId.startsWith('entorno_');
    const badgeText = isEntorno ? 'Infraestrutura Urbana &amp; Entorno (Censo 2022)' : 'População &amp; Indicadores Socioeconômicos';
    const bulletColor = isEntorno ? '#38bdf8' : '#38bdf8';

    return `
      <div class="item6-legend-card" data-layer-id="${layerId}">
        <div class="item6-legend-header">
          <div class="item6-legend-badge">
            <span class="item6-legend-bullet" style="background: ${bulletColor};"></span>
            <span>${badgeText}</span>
          </div>
          <div class="item6-legend-title">${meta.title}</div>
          ${meta.subtitle ? `<div class="item6-legend-subtitle">${meta.subtitle}</div>` : ''}
        </div>

        <div class="item6-legend-classes">
          ${itemsHtml}
        </div>

        ${meta.unitNote ? `<div class="item6-legend-footnote">${meta.unitNote}</div>` : ''}
      </div>
    `;
  }
}
