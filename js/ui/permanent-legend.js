/**
 * WebGIS SEPLAN Passo Fundo - Diagnósticos Territoriais
 * Legenda Cartográfica Flutuante Permanente (SEPLAN)
 * Posicionada no canto inferior direito da área cartográfica
 */

import { LAYER_GROUPS, LAYERS_CONFIG } from '../config/layers.config.js?v=20261118_escala2km_v1';

export class PermanentLegendUI {
  /**
   * @param {Object} layerManager - Gerenciador central de camadas do WebGIS
   * @param {Object} legendUI - Gerenciador da legenda com renderizadores de símbolos
   * @param {string} containerId - ID do container HTML no DOM
   */
  constructor(layerManager, legendUI, containerId = 'permanent-floating-legend') {
    this.layerManager = layerManager;
    this.legendUI = legendUI;
    this.containerId = containerId;
    this.container = document.getElementById(containerId);

    // Estado da legenda: aberta e visível por padrão ao acessar o portal
    this.isCollapsed = false;
    this.activeTab = 'active'; // 'active' (No Mapa) ou 'all' (Catálogo Completo)
    this.collapsedGroups = new Set();
    this._renderScheduled = false;

    // Inicializar grupos do modo 'all' inicialmente recolhidos, exceto os que possuem camadas ativas
    LAYER_GROUPS.forEach(g => {
      this.collapsedGroups.add(g.id);
    });
  }

  /**
   * Inicializa o componente, vincula ouvintes de eventos e executa a renderização inicial
   */
  init() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.warn(`[PermanentLegendUI] Container #${this.containerId} não encontrado no DOM.`);
      return;
    }

    // Ouvintes reativos de alteração de visibilidade e término de carregamento
    window.addEventListener('layer:visibility-changed', () => this.scheduleRender());
    window.addEventListener('custom-layers:updated', () => this.scheduleRender());

    if (this.layerManager && typeof this.layerManager.onLayerLoaded === 'function') {
      this.layerManager.onLayerLoaded(() => this.scheduleRender());
    }

    // Atalho de teclado: Shift+L para alternar visibilidade/recolhimento
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      if ((e.key === 'L' && e.shiftKey) || (e.key === 'l' && e.altKey)) {
        e.preventDefault();
        this.toggleCollapse();
      }
    });

    // Vincular delegação de eventos de clique no container
    this.container.addEventListener('click', (e) => this.handleClick(e));

    // Renderização inicial
    this.render();
  }

  /**
   * Alterna entre estado aberto e minimizado
   */
  toggleCollapse(forceState = null) {
    this.isCollapsed = forceState !== null ? forceState : !this.isCollapsed;
    this.render();
  }

  /**
   * Alterna a aba de visualização ('active' ou 'all')
   */
  setTab(tab) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.render();
  }

  /**
   * Agenda renderização consolidada via requestAnimationFrame
   */
  scheduleRender() {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    const runner = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout;
    runner(() => {
      this._renderScheduled = false;
      this.render();
    });
  }

  /**
   * Trata cliques internos no container da legenda
   */
  handleClick(e) {
    // 1. Botão de reabrir quando minimizado
    const reopenBtn = e.target.closest('#btn-reopen-permanent-legend');
    if (reopenBtn) {
      this.isCollapsed = false;
      this.render();
      return;
    }

    // 2. Botão de minimizar no cabeçalho
    const minimizeBtn = e.target.closest('#btn-collapse-permanent-legend');
    if (minimizeBtn) {
      this.isCollapsed = true;
      this.render();
      return;
    }

    // 3. Botões de alternância de abas
    const tabBtn = e.target.closest('.permanent-legend-tab-btn');
    if (tabBtn && tabBtn.dataset.tab) {
      this.setTab(tabBtn.dataset.tab);
      return;
    }

    // 4. Cabeçalho de grupo no modo 'all' para expandir/recolher
    const groupHeader = e.target.closest('.permanent-legend-group-header');
    if (groupHeader && groupHeader.dataset.groupId) {
      const gId = groupHeader.dataset.groupId;
      const groupCard = groupHeader.closest('.permanent-legend-group');
      if (this.collapsedGroups.has(gId)) {
        this.collapsedGroups.delete(gId);
        if (groupCard) groupCard.classList.remove('collapsed');
      } else {
        this.collapsedGroups.add(gId);
        if (groupCard) groupCard.classList.add('collapsed');
      }
      return;
    }
  }

  /**
   * Retorna as camadas nativas atualmente ativas e visíveis no mapa
   */
  getActiveLayers() {
    return LAYERS_CONFIG.filter(cfg => {
      const olLayer = this.layerManager ? this.layerManager.getLayer(cfg.id) : null;
      return olLayer && olLayer.getVisible();
    });
  }

  /**
   * Renderiza a legenda flutuante permanente
   */
  render() {
    if (!this.container) return;

    const visibleLayers = this.getActiveLayers();
    const visibleCustomLayers = (this.layerManager && typeof this.layerManager.getCustomLayersList === 'function')
      ? this.layerManager.getCustomLayersList().filter(cl => cl.visible)
      : [];
    const totalActiveCount = visibleLayers.length + visibleCustomLayers.length;

    // Se estiver minimizada, renderizar o Pill flutuante discreto
    if (this.isCollapsed) {
      this.container.classList.add('minimized');
      this.container.innerHTML = `
        <div class="permanent-legend-minimized" id="btn-reopen-permanent-legend" title="Expandir Legenda Cartográfica Permanente (Shift+L)" role="button" tabindex="0" aria-label="Abrir Legenda">
          <div class="permanent-legend-minimized-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <span class="permanent-legend-minimized-text">Legenda</span>
          <span class="permanent-legend-minimized-badge" title="${totalActiveCount} camadas ativas no mapa">${totalActiveCount}</span>
        </div>
      `;
      return;
    }

    // Se estiver aberta, renderizar o Card flutuante completo
    this.container.classList.remove('minimized');

    let bodyContent = '';

    if (this.activeTab === 'active') {
      // -------------------------------------------------------------
      // MODO 1: CAMADAS ATIVAS NO MAPA
      // -------------------------------------------------------------
      if (totalActiveCount === 0) {
        bodyContent = `
          <div class="permanent-legend-empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>Nenhuma camada temática ativa no mapa.</p>
            <span style="font-size: 9.5px; color: #64748b;">Ative camadas no painel lateral ou consulte o <strong>Catálogo Geral</strong>.</span>
          </div>
        `;
      } else {
        // Agrupar camadas visíveis por grupo temático oficial
        LAYER_GROUPS.forEach(group => {
          const groupLayers = visibleLayers.filter(l => l.group === group.id);
          if (groupLayers.length === 0) return;

          bodyContent += `
            <div class="permanent-legend-group">
              <div class="permanent-legend-group-header" data-group-id="${group.id}">
                <div class="permanent-legend-group-title">
                  <i class="lucide-${group.iconName || 'folder'}" style="font-size: 11px;"></i>
                  <span>${group.title}</span>
                </div>
                <span style="font-size: 8.5px; opacity: 0.7;">${groupLayers.length}</span>
              </div>
              <div class="permanent-legend-group-items">
                ${groupLayers.map(l => this.renderLayerItem(l)).join('')}
              </div>
            </div>
          `;
        });

        // Camadas customizadas importadas pelo usuário
        if (visibleCustomLayers.length > 0) {
          bodyContent += `
            <div class="permanent-legend-group">
              <div class="permanent-legend-group-header" data-group-id="custom_layers">
                <div class="permanent-legend-group-title">
                  <i class="lucide-upload" style="font-size: 11px;"></i>
                  <span>Camadas Importadas (Usuário)</span>
                </div>
                <span style="font-size: 8.5px; opacity: 0.7;">${visibleCustomLayers.length}</span>
              </div>
              <div class="permanent-legend-group-items">
                ${visibleCustomLayers.map(cl => {
                  const color = cl.color || '#3b82f6';
                  let sym = '';
                  if (cl.geomType === 'Point' || cl.geomType === 'MultiPoint') {
                    sym = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${color}; border:1.8px solid #ffffff;"></span>`;
                  } else if (cl.geomType === 'LineString' || cl.geomType === 'MultiLineString') {
                    sym = `<span style="display:inline-block; width:20px; height:0px; border-top:2.2px solid ${color};"></span>`;
                  } else {
                    sym = `<span style="display:inline-block; width:18px; height:12px; border-radius:2px; background:${color}33; border:1.5px solid ${color};"></span>`;
                  }
                  return `
                    <div class="legend-item-row">
                      <div class="legend-symbol-wrapper">${sym}</div>
                      <div class="legend-item-info">
                        <span class="legend-item-name">${cl.name}</span>
                        <span class="legend-item-desc">${cl.format || 'Camada Externa'} • ${cl.featuresCount || 0} feições</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }
      }
    } else {
      // -------------------------------------------------------------
      // MODO 2: CATÁLOGO GERAL DE TODAS AS CATEGORIAS TEMÁTICAS
      // -------------------------------------------------------------
      LAYER_GROUPS.forEach(group => {
        const groupLayers = LAYERS_CONFIG.filter(l => l.group === group.id);
        if (groupLayers.length === 0) return;

        const isGroupCollapsed = this.collapsedGroups.has(group.id);
        const collapsedClass = isGroupCollapsed ? ' collapsed' : '';

        // Verificar quantas camadas deste grupo estão ativas
        const activeInGroup = groupLayers.filter(l => {
          const olLayer = this.layerManager ? this.layerManager.getLayer(l.id) : null;
          return olLayer && olLayer.getVisible();
        }).length;

        const badgeHtml = activeInGroup > 0
          ? `<span style="font-size: 8.5px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 1px 5px; border-radius: 8px; border: 0.5px solid rgba(56, 189, 248, 0.4);">${activeInGroup} no mapa</span>`
          : `<span style="font-size: 8.5px; opacity: 0.6;">${groupLayers.length}</span>`;

        bodyContent += `
          <div class="permanent-legend-group${collapsedClass}">
            <div class="permanent-legend-group-header" data-group-id="${group.id}" title="Clique para expandir/recolher grupo">
              <div class="permanent-legend-group-title">
                <i class="lucide-${group.iconName || 'folder'}" style="font-size: 11px;"></i>
                <span>${group.title}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                ${badgeHtml}
                <i class="lucide-chevron-down" style="font-size: 10px; transition: transform 0.2s ease;"></i>
              </div>
            </div>
            <div class="permanent-legend-group-items">
              ${groupLayers.map(l => this.renderLayerItem(l)).join('')}
            </div>
          </div>
        `;
      });
    }

    // Montagem completa do Card
    this.container.innerHTML = `
      <div class="permanent-legend-card" role="region" aria-label="Legenda Cartográfica do Geoportal">
        <!-- Cabeçalho -->
        <div class="permanent-legend-header">
          <div class="permanent-legend-title-wrap">
            <div class="permanent-legend-icon-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <div class="permanent-legend-titles">
              <span class="permanent-legend-title">Legenda Cartográfica</span>
              <span class="permanent-legend-subtitle">SEPLAN • Passo Fundo</span>
            </div>
          </div>
          <div class="permanent-legend-actions">
            <span class="permanent-legend-badge-count" title="${totalActiveCount} camadas atualmente visíveis no mapa">${totalActiveCount} no mapa</span>
            <button class="permanent-legend-btn-minimize" id="btn-collapse-permanent-legend" title="Recolher legenda (Shift+L)" aria-label="Recolher legenda">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Barra de Abas (No Mapa / Catálogo Geral) -->
        <div class="permanent-legend-tabs">
          <button class="permanent-legend-tab-btn${this.activeTab === 'active' ? ' active' : ''}" data-tab="active" title="Exibir apenas os elementos visíveis no mapa">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 14 14"></polyline>
            </svg>
            <span>No Mapa (${totalActiveCount})</span>
          </button>
          <button class="permanent-legend-tab-btn${this.activeTab === 'all' ? ' active' : ''}" data-tab="all" title="Consultar catálogo de todas as categorias temáticas">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            <span>Catálogo Geral</span>
          </button>
        </div>

        <!-- Corpo com Rolagem e Itens -->
        <div class="permanent-legend-body">
          ${bodyContent}
        </div>

        <!-- Rodapé Institucional -->
        <div class="permanent-legend-footer">
          <span>Passo Fundo/RS • SIRGAS 2000 (22S)</span>
          <span style="opacity:0.8;">Ref. Oficial</span>
        </div>
      </div>
    `;

    // Disparar atualização de ícones Lucide caso a biblioteca global esteja disponível
    if (typeof window.lucide !== 'undefined' && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  /**
   * Renderiza um item individual utilizando o renderizador oficial do LegendUI
   * @param {Object} layerConfig 
   * @returns {string}
   */
  renderLayerItem(layerConfig) {
    if (this.legendUI && typeof this.legendUI.generateLayerLegendItem === 'function') {
      return this.legendUI.generateLayerLegendItem(layerConfig);
    }

    // Fallback caso legendUI não esteja pronto
    const color = layerConfig.style ? (layerConfig.style.pointColor || layerConfig.style.lineColor || layerConfig.style.fillColor || '#38bdf8') : '#38bdf8';
    return `
      <div class="legend-item-row">
        <div class="legend-symbol-wrapper">
          <span style="display:inline-block; width:12px; height:12px; border-radius:3px; background:${color}; border:1px solid #fff;"></span>
        </div>
        <div class="legend-item-info">
          <span class="legend-item-name">${layerConfig.name}</span>
          <span class="legend-item-desc">${layerConfig.source || 'Camada Temática'}</span>
        </div>
      </div>
    `;
  }
}
