/**
 * WebGIS SEPLAN Passo Fundo - Diagnósticos Territoriais
 * Controlador da Interface do Painel de Métricas Territoriais
 */

import { TERRITORIAL_METRICS, TERRITORIAL_METRICS_GROUPS } from './metrics-data.js';
import { LAYERS_CONFIG } from '../config/layers.config.js';
import { Notification } from '../ui/notification.js';
import { MetricsCharts } from './metrics-charts.js';

export class MetricsUI {
  constructor(layerManager, mapEngine, sidebarUI) {
    this.layerManager = layerManager;
    this.mapEngine = mapEngine;
    this.sidebarUI = sidebarUI;

    this.activeFilter = 'all';
    this.searchQuery = '';
    this.isModalOpen = false;
    this.modalViewMode = 'cards';

    // DOM Elements
    this.modal = document.getElementById('metrics-modal');
    this.modalBody = document.getElementById('metrics-modal-body');
    this.searchInput = document.getElementById('metrics-search-input');
    this.filterContainer = document.getElementById('metrics-filter-pills');
    this.viewToggle = document.getElementById('metrics-view-toggle');
    this.openBtnHeader = document.getElementById('btn-open-metrics');
    this.closeBtnModal = document.getElementById('btn-close-metrics-modal');
    this.sidebarContainer = document.getElementById('sidebar-metrics-container');

    this.metricsCharts = new MetricsCharts(layerManager, mapEngine);

    this.init();
  }

  init() {
    this.setupEvents();
    this.renderSidebarMetrics();
  }

  setupEvents() {
    // Open from header button
    if (this.openBtnHeader) {
      this.openBtnHeader.addEventListener('click', () => {
        this.openModal('all');
      });
    }

    // Close button
    if (this.closeBtnModal) {
      this.closeBtnModal.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // Close on backdrop click
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      });
    }

    // Filter pills clicks
    if (this.filterContainer) {
      this.filterContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.metrics-pill');
        if (!pill) return;
        const group = pill.getAttribute('data-filter') || 'all';
        this.setFilter(group);
      });
    }

    // Search input
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderModalMetrics();
      });
    }

    // Toggle Cards vs Gráficos no Modal
    if (this.viewToggle) {
      this.viewToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.metrics-view-btn');
        if (!btn) return;
        const view = btn.getAttribute('data-view') || 'cards';
        this.setModalViewMode(view);
      });
    }

    // Keyboard ESC shortcut
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isModalOpen) {
        this.closeModal();
      }
    });

    // Delegate "Ver no mapa" clicks inside modal and sidebar
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.metric-btn-view-map');
      if (btn) {
        const layerId = btn.getAttribute('data-layer-id');
        if (layerId) {
          this.handleViewOnMap(layerId);
        }
      }

      const expandBtn = e.target.closest('#btn-expand-metrics-modal');
      if (expandBtn) {
        this.openModal('all');
      }
    });
  }

  openModal(defaultFilter = 'all') {
    if (!this.modal) return;
    this.isModalOpen = true;
    this.activeFilter = defaultFilter;
    this.searchQuery = '';
    if (this.searchInput) this.searchInput.value = '';

    this.updateFilterPillsUI();
    this.updateViewToggleUI();

    if (this.modalViewMode === 'charts') {
      if (this.filterContainer) this.filterContainer.style.display = 'none';
      const searchWrapper = this.modal ? this.modal.querySelector('.metrics-search-wrapper') : null;
      if (searchWrapper) searchWrapper.style.display = 'none';
      this.modalBody.innerHTML = this.metricsCharts.getModalChartsHtml();
      this.refreshIcons();
      this.metricsCharts.initModalCharts();
    } else {
      if (this.filterContainer) this.filterContainer.style.display = 'flex';
      const searchWrapper = this.modal ? this.modal.querySelector('.metrics-search-wrapper') : null;
      if (searchWrapper) searchWrapper.style.display = 'flex';
      this.renderModalMetrics();
    }

    this.modal.classList.add('active');
    this.refreshIcons();
  }

  setModalViewMode(mode) {
    this.modalViewMode = mode;
    this.updateViewToggleUI();

    if (mode === 'charts') {
      if (this.filterContainer) this.filterContainer.style.display = 'none';
      const searchWrapper = this.modal ? this.modal.querySelector('.metrics-search-wrapper') : null;
      if (searchWrapper) searchWrapper.style.display = 'none';
      this.modalBody.innerHTML = this.metricsCharts.getModalChartsHtml();
      this.refreshIcons();
      this.metricsCharts.initModalCharts();
    } else {
      if (this.filterContainer) this.filterContainer.style.display = 'flex';
      const searchWrapper = this.modal ? this.modal.querySelector('.metrics-search-wrapper') : null;
      if (searchWrapper) searchWrapper.style.display = 'flex';
      this.renderModalMetrics();
    }
  }

  updateViewToggleUI() {
    if (!this.viewToggle) return;
    this.viewToggle.querySelectorAll('.metrics-view-btn').forEach(btn => {
      const isTarget = btn.getAttribute('data-view') === this.modalViewMode;
      btn.classList.toggle('active', isTarget);
    });
  }

  closeModal() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
    this.isModalOpen = false;
  }

  setFilter(groupId) {
    this.activeFilter = groupId;
    this.updateFilterPillsUI();
    this.renderModalMetrics();
  }

  updateFilterPillsUI() {
    if (!this.filterContainer) return;
    const pills = this.filterContainer.querySelectorAll('.metrics-pill');
    pills.forEach(pill => {
      const f = pill.getAttribute('data-filter');
      if (f === this.activeFilter) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  getFilteredMetrics() {
    return TERRITORIAL_METRICS.filter(m => {
      // Group filter
      if (this.activeFilter !== 'all' && m.groupId !== this.activeFilter) {
        return false;
      }
      // Text search query
      if (this.searchQuery) {
        const q = this.searchQuery;
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchSubtitle = m.subtitle.toLowerCase().includes(q);
        const matchSource = m.source.toLowerCase().includes(q);
        const matchUnit = m.unit.toLowerCase().includes(q);
        const matchVal = String(m.value).toLowerCase().includes(q);
        return matchTitle || matchSubtitle || matchSource || matchUnit || matchVal;
      }
      return true;
    });
  }

  renderModalMetrics() {
    if (!this.modalBody) return;

    const filtered = this.getFilteredMetrics();

    if (filtered.length === 0) {
      this.modalBody.innerHTML = `
        <div class="metrics-empty-state">
          <i class="lucide-search-x"></i>
          <p style="font-size: 14px; font-weight: 600; color: var(--text-main); margin-top: 8px;">Nenhum indicador territorial encontrado</p>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Tente ajustar os termos da busca ou selecione outro grupo temático.</p>
        </div>
      `;
      this.refreshIcons();
      return;
    }

    // Group metrics by thematic group
    let html = '';
    TERRITORIAL_METRICS_GROUPS.forEach(grp => {
      const groupMetrics = filtered.filter(m => m.groupId === grp.id);
      if (groupMetrics.length === 0) return;

      html += `
        <div class="metrics-group-section" data-group-id="${grp.id}">
          <div class="metrics-group-header">
            <div class="metrics-group-title-wrapper">
              <i class="lucide-${grp.iconName}" style="color: var(--dc-orange-primary); font-size: 16px;"></i>
              <span class="metrics-group-title">${grp.title}</span>
            </div>
            <span class="metrics-group-badge">${groupMetrics.length} ${groupMetrics.length === 1 ? 'indicador' : 'indicadores'}</span>
          </div>
          <div class="metrics-grid">
            ${groupMetrics.map(m => this.generateCardHtml(m)).join('')}
          </div>
        </div>
      `;
    });

    this.modalBody.innerHTML = html;
    this.refreshIcons();
  }

  generateCardHtml(m) {
    // Check if associated layer exists in the active registry
    const layerExists = m.associatedLayerId && LAYERS_CONFIG.some(l => l.id === m.associatedLayerId);
    
    // Status label formatting
    const statusClass = m.calculationStatus || 'oficial';
    const statusLabel = statusClass === 'oficial' ? 'Oficial' : (statusClass === 'calculado' ? 'Calculado' : 'Derivado');

    const viewMapBtn = layerExists ? `
      <button class="metric-btn-view-map" data-layer-id="${m.associatedLayerId}" title="Ativar e visualizar camada '${m.title}' no mapa">
        <i class="lucide-eye" style="font-size: 11px;"></i> Ver no mapa
      </button>
    ` : '';

    return `
      <div class="metric-card" id="card-metric-${m.id}" title="Metodologia: ${this.escapeHtml(m.methodology || '')}">
        <div class="metric-card-header">
          <span class="metric-card-title">${this.escapeHtml(m.title)}</span>
          <i class="lucide-${m.iconName || 'bar-chart-2'} metric-card-icon"></i>
        </div>

        <div class="metric-card-body">
          <div class="metric-card-value-row">
            <span class="metric-card-value">${m.formattedValue}</span>
            <span class="metric-card-unit">${this.escapeHtml(m.unit)}</span>
          </div>
          <div class="metric-card-subtitle">${this.escapeHtml(m.subtitle)}</div>
        </div>

        <div class="metric-card-footer">
          <span class="metric-source-text" title="Fonte: ${this.escapeHtml(m.source)} (Ref: ${m.referenceYear || 'Oficial'})">
            ${this.escapeHtml(m.source)}
          </span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="metric-status-badge ${statusClass}" title="Classificação: Dado ${statusLabel}">
              ${statusLabel}
            </span>
            ${viewMapBtn}
          </div>
        </div>
      </div>
    `;
  }

  renderSidebarMetrics() {
    if (!this.sidebarContainer) return;

    // Featured key indicators for quick overview in sidebar tab
    const featuredIds = [
      'area_territorial_total',
      'total_bairros_oficiais',
      'extensao_total_malha_viaria',
      'extensao_rio_passo_fundo',
      'populacao_total_censo_2022',
      'total_domicilios_censo_2022',
      'densidade_demografica_media',
      'rendimento_medio_domiciliar'
    ];

    const featuredMetrics = featuredIds
      .map(id => TERRITORIAL_METRICS.find(m => m.id === id))
      .filter(Boolean);

    let html = `
      <div class="sidebar-metrics-banner">
        <div class="sidebar-metrics-banner-info">
          <h4>Indicadores Territoriais</h4>
          <p>${TERRITORIAL_METRICS.length} métricas auditadas oficiais</p>
        </div>
        <button class="sidebar-metrics-expand-btn" id="btn-expand-metrics-modal" title="Abrir painel completo com todos os indicadores">
          <i class="lucide-maximize-2"></i> Painel Completo
        </button>
      </div>

      <div class="sidebar-metrics-summary-grid">
    `;

    TERRITORIAL_METRICS_GROUPS.forEach(grp => {
      const items = featuredMetrics.filter(m => m.groupId === grp.id);
      if (items.length === 0) return;

      html += `
        <div style="background: var(--dc-blue-card); border: 1px solid var(--dc-blue-border); border-radius: var(--radius-md); padding: 12px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <i class="lucide-${grp.iconName}" style="color: var(--dc-orange-primary); font-size: 13px;"></i>
            <span>${grp.title}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${items.map(m => `
              <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 4px;">
                <span style="font-size: 11.5px; color: var(--text-muted);">${this.escapeHtml(m.title)}</span>
                <span style="font-size: 12.5px; font-weight: 700; color: #ffffff; font-family: 'JetBrains Mono', monospace;">
                  ${m.formattedValue} <span style="font-size: 10px; font-weight: 500; color: var(--text-muted);">${m.unit}</span>
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });

    html += `</div>`;

    // Gráficos Analíticos Territoriais (compatível com padrão institucional Defesa Civil)
    html += this.metricsCharts.getSidebarChartsHtml();

    this.sidebarContainer.innerHTML = html;
    this.refreshIcons();

    // Inicializar instâncias interativas do Chart.js
    this.metricsCharts.initSidebarCharts();
  }

  onTabActivated() {
    if (this.metricsCharts) {
      setTimeout(() => {
        this.metricsCharts.resizeCharts();
      }, 80);
    }
  }

  handleViewOnMap(layerId) {
    const config = LAYERS_CONFIG.find(c => c.id === layerId);
    if (!config) {
      Notification.warning('Camada não encontrada no registro de camadas.');
      return;
    }

    // Activate layer visibility in OpenLayers
    this.layerManager.setLayerVisibility(layerId, true);

    // Close the metrics modal so user sees the map
    this.closeModal();

    // Center on layer if it has extent
    const olLayer = this.layerManager.getLayer(layerId);
    if (olLayer && typeof olLayer.getSource === 'function') {
      const source = olLayer.getSource();
      if (source && typeof source.getFeatures === 'function') {
        const features = source.getFeatures();
        if (features.length > 0) {
          const extent = source.getExtent();
          if (extent && isFinite(extent[0])) {
            this.mapEngine.getOlMap().getView().fit(extent, {
              padding: [60, 60, 60, 60],
              duration: 800,
              maxZoom: 16
            });
          }
        }
      }
    }

    Notification.success(`Camada '${config.name}' ativada no mapa.`);
  }

  refreshIcons() {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
