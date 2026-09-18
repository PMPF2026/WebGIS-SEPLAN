/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Advanced Sidebar Controller: Layer Filter, Operational Presets & Solo Mode
 */

import { LAYER_GROUPS, LAYERS_CONFIG, OPERATIONAL_PRESETS } from '../config/layers.config.js';
import { Notification } from './notification.js';

export class SidebarUI {
  constructor(layerManager, legendUI, mapEngine) {
    this.layerManager = layerManager;
    this.legendUI = legendUI;
    this.mapEngine = mapEngine;
    
    this.sidebarElement = document.getElementById('sidebar');
    this.toggleBtn = document.getElementById('sidebar-toggle-btn');
    this.layerTreeContainer = document.getElementById('layer-tree-container');
    this.layerFilterInput = document.getElementById('layer-filter-input');
    
    this.activeTab = 'camadas';
    this.isCollapsed = false;

    this.init();
  }

  init() {
    this.setupCollapseToggle();
    this.setupTabs();
    this.setupPresets();
    this.renderLayerTree();
    this.setupQuickActions();
    this.setupLayerFilter();
  }

  setupCollapseToggle() {
    if (!this.toggleBtn || !this.sidebarElement) return;

    this.toggleBtn.addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      this.sidebarElement.classList.toggle('collapsed', this.isCollapsed);
      
      const icon = this.toggleBtn.querySelector('i');
      if (icon) {
        icon.className = this.isCollapsed ? 'lucide-chevron-right' : 'lucide-chevron-left';
      }

      setTimeout(() => {
        this.mapEngine.getOlMap().updateSize();
      }, 300);
    });
  }

  setupTabs() {
    const tabButtons = document.querySelectorAll('.sidebar-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });
  }

  switchTab(tabId) {
    if (this.isCollapsed && this.sidebarElement) {
      this.isCollapsed = false;
      this.sidebarElement.classList.remove('collapsed');
      const icon = this.toggleBtn ? this.toggleBtn.querySelector('i') : null;
      if (icon) icon.className = 'lucide-chevron-left';
      setTimeout(() => {
        if (this.mapEngine && this.mapEngine.getOlMap()) {
          this.mapEngine.getOlMap().updateSize();
        }
      }, 300);
    }

    this.activeTab = tabId;

    document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('active', isTarget);
    });

    document.querySelectorAll('.tab-panel').forEach(panel => {
      const isTarget = panel.getAttribute('id') === `tab-${tabId}`;
      panel.classList.toggle('active', isTarget);
    });

    if (tabId === 'legenda') {
      this.legendUI.render();
    } else if (tabId === 'dashboard' && window.webGis && window.webGis.dashboardUI) {
      window.webGis.dashboardUI.render();
    }
  }

  setupPresets() {
    const presetContainer = document.getElementById('preset-container');
    if (!presetContainer) return;

    presetContainer.innerHTML = '';
    OPERATIONAL_PRESETS.forEach(preset => {
      const btn = document.createElement('button');
      btn.className = 'preset-badge-btn';
      btn.innerHTML = `<span>${preset.name}</span>`;
      btn.title = preset.description;

      btn.addEventListener('click', async () => {
        document.querySelectorAll('.preset-badge-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Notification.info(`Aplicando ${preset.name}...`);
        await this.layerManager.applyPreset(preset);
        this.legendUI.render();
        this.updateLayerCounters();
        Notification.success(`Cenário aplicado com sucesso!`);
      });

      presetContainer.appendChild(btn);
    });
  }

  setupLayerFilter() {
    if (!this.layerFilterInput) return;

    this.layerFilterInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      
      document.querySelectorAll('.layer-item').forEach(item => {
        const layerName = item.querySelector('.layer-name')?.textContent.toLowerCase() || '';
        const matches = layerName.includes(term);
        item.style.display = matches ? 'block' : 'none';
      });

      // Expand groups containing matches
      document.querySelectorAll('.layer-group').forEach(group => {
        const hasVisible = Array.from(group.querySelectorAll('.layer-item')).some(i => i.style.display !== 'none');
        group.style.display = hasVisible ? 'block' : 'none';
        if (term.length > 0 && hasVisible) {
          group.classList.add('expanded');
        }
      });
    });
  }

  renderLayerTree() {
    if (!this.layerTreeContainer) return;
    this.layerTreeContainer.innerHTML = '';

    LAYER_GROUPS.forEach((group, index) => {
      const groupLayers = LAYERS_CONFIG.filter(l => l.group === group.id);
      if (groupLayers.length === 0) return;

      const groupDiv = document.createElement('div');
      groupDiv.className = `layer-group ${index === 0 || index === 1 ? 'expanded' : ''}`;
      groupDiv.setAttribute('data-group-id', group.id);

      let groupHeader = `
        <div class="layer-group-header">
          <div class="layer-group-title-wrapper">
            <div class="group-icon ${group.iconClass}">
              <i class="lucide-${group.iconName}"></i>
            </div>
            <div>
              <span class="layer-group-title">${group.title}</span>
              <span class="layer-group-count" id="count-group-${group.id}">(${groupLayers.length})</span>
            </div>
          </div>
          <i class="lucide-chevron-down group-chevron"></i>
        </div>
      `;

      let groupBody = '<div class="layer-group-body">';
      groupLayers.forEach(layer => {
        groupBody += this.createLayerItemHtml(layer);
      });
      groupBody += '</div>';

      groupDiv.innerHTML = groupHeader + groupBody;

      const headerEl = groupDiv.querySelector('.layer-group-header');
      headerEl.addEventListener('click', () => {
        groupDiv.classList.toggle('expanded');
      });

      this.layerTreeContainer.appendChild(groupDiv);
    });

    this.bindLayerEvents();
    this.updateLayerCounters();
  }

  createLayerItemHtml(layer) {
    const s = layer.style || {};
    const previewColor = s.previewColor || s.strokeColor || '#ff7800';

    return `
      <div class="layer-item" data-layer-id="${layer.id}">
        <div class="layer-header-row">
          <label class="layer-toggle-label">
            <input type="checkbox" class="layer-checkbox" data-layer-id="${layer.id}" ${layer.defaultVisible ? 'checked' : ''} />
            <span class="layer-symbology-preview" style="background-color: ${previewColor};"></span>
            <span class="layer-name">${layer.name}</span>
          </label>
          <div class="layer-actions">
            <button class="layer-action-btn solo-layer-btn" data-layer-id="${layer.id}" title="Modo Solo: Exibir apenas esta camada">
              <i class="lucide-eye"></i>
            </button>
            <button class="layer-action-btn zoom-layer-btn" data-layer-id="${layer.id}" title="Aproximar para a camada">
              <i class="lucide-maximize-2"></i>
            </button>
            <button class="layer-action-btn toggle-subcontrols-btn" data-layer-id="${layer.id}" title="Opções de transparência">
              <i class="lucide-sliders"></i>
            </button>
          </div>
        </div>

        <div class="layer-subcontrols" id="subcontrols-${layer.id}" style="display: none;">
          <div class="opacity-slider-row">
            <span>Opacidade:</span>
            <input type="range" min="0" max="100" value="${(layer.defaultOpacity || 1) * 100}" class="opacity-slider" data-layer-id="${layer.id}" />
            <span class="opacity-val">${Math.round((layer.defaultOpacity || 1) * 100)}%</span>
          </div>
          <div class="layer-meta-badge" style="display:flex; flex-direction:column; gap:3px; font-size:10.5px; margin-top:6px; line-height:1.4;">
            <div><i class="lucide-database" style="font-size:10px; color:var(--dc-orange-primary);"></i> <strong>Fonte:</strong> ${layer.source || 'Prefeitura Municipal de Passo Fundo'}</div>
            ${layer.refDate ? `<div><i class="lucide-calendar" style="font-size:10px; color:#38bdf8;"></i> <strong>Referência:</strong> ${layer.refDate}</div>` : ''}
            <div><i class="lucide-file-text" style="font-size:10px; color:var(--text-muted);"></i> <span>${layer.fileName}</span></div>
          </div>
        </div>
      </div>
    `;
  }

  bindLayerEvents() {
    // Checkbox toggles
    document.querySelectorAll('.layer-checkbox').forEach(cb => {
      cb.addEventListener('change', async (e) => {
        const layerId = e.target.getAttribute('data-layer-id');
        const checked = e.target.checked;
        
        try {
          await this.layerManager.setLayerVisibility(layerId, checked);
          this.legendUI.render();
          this.updateLayerCounters();
          
          const cfg = this.layerManager.getConfig(layerId);
          Notification.info(`Camada '${cfg?.name || layerId}' ${checked ? 'ativada' : 'desativada'}.`);
        } catch (err) {
          Notification.error(`Erro ao ativar camada: ${err.message}`);
          e.target.checked = false;
        }
      });
    });

    // Solo Button: Turns off all other layers except this one
    document.querySelectorAll('.solo-layer-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-layer-id');
        
        for (const cfg of LAYERS_CONFIG) {
          const isTarget = (cfg.id === targetId);
          const cb = document.querySelector(`.layer-checkbox[data-layer-id="${cfg.id}"]`);
          if (cb) cb.checked = isTarget;
          await this.layerManager.setLayerVisibility(cfg.id, isTarget);
        }

        this.layerManager.zoomToLayer(targetId);
        this.legendUI.render();
        this.updateLayerCounters();
        const cfg = this.layerManager.getConfig(targetId);
        Notification.info(`Modo Solo ativado: '${cfg.name}'.`);
      });
    });

    // Zoom Buttons
    document.querySelectorAll('.zoom-layer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layerId = btn.getAttribute('data-layer-id');
        this.layerManager.zoomToLayer(layerId);
      });
    });

    // Subcontrols
    document.querySelectorAll('.toggle-subcontrols-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const layerId = btn.getAttribute('data-layer-id');
        const sub = document.getElementById(`subcontrols-${layerId}`);
        if (sub) {
          sub.style.display = (sub.style.display === 'none') ? 'flex' : 'none';
        }
      });
    });

    // Opacity Sliders
    document.querySelectorAll('.opacity-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const layerId = e.target.getAttribute('data-layer-id');
        const val = parseInt(e.target.value, 10);
        const opacity = val / 100;
        
        this.layerManager.setLayerOpacity(layerId, opacity);
        
        const parent = slider.closest('.opacity-slider-row');
        if (parent) {
          const valLabel = parent.querySelector('.opacity-val');
          if (valLabel) valLabel.textContent = `${val}%`;
        }
      });
    });
  }

  updateLayerCounters() {
    LAYER_GROUPS.forEach(group => {
      const countEl = document.getElementById(`count-group-${group.id}`);
      if (!countEl) return;

      const groupLayers = LAYERS_CONFIG.filter(l => l.group === group.id);
      const activeCount = groupLayers.filter(l => {
        const layer = this.layerManager.getLayer(l.id);
        return layer && layer.getVisible();
      }).length;

      countEl.textContent = `(${activeCount}/${groupLayers.length} ativas)`;
      countEl.style.color = activeCount > 0 ? 'var(--dc-orange-primary)' : 'var(--text-muted)';
    });
  }

  setupQuickActions() {
    const expandAllBtn = document.getElementById('btn-expand-all-layers');
    const collapseAllBtn = document.getElementById('btn-collapse-all-layers');
    const turnAllOffBtn = document.getElementById('btn-turn-all-off');

    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.layer-group').forEach(g => g.classList.add('expanded'));
      });
    }

    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.layer-group').forEach(g => g.classList.remove('expanded'));
      });
    }

    if (turnAllOffBtn) {
      turnAllOffBtn.addEventListener('click', async () => {
        for (const cfg of LAYERS_CONFIG) {
          const cb = document.querySelector(`.layer-checkbox[data-layer-id="${cfg.id}"]`);
          if (cb && cb.checked) {
            cb.checked = false;
            await this.layerManager.setLayerVisibility(cfg.id, false);
          }
        }
        this.legendUI.render();
        this.updateLayerCounters();
        Notification.info('Todas as camadas temáticas foram desativadas.');
      });
    }
  }
}
