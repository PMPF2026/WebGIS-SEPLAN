/**
 * WebGIS SEPLAN Passo Fundo - Diagnósticos Territoriais
 * Legenda Cartográfica Dinâmica, Inteligente e Institucional
 */

import { LAYERS_CONFIG, LAYER_GROUPS } from '../config/layers.config.js?v=20261118_escala2km_v1';

export class LegendUI {
  constructor(layerManager, containerId = 'legend-container') {
    this.layerManager = layerManager;
    this.container = document.getElementById(containerId);
    this.analysisTool = null;
    this.collapsedGroups = new Set();
    this._renderScheduled = false;

    // Escutar término de carregamento de camadas no layerManager
    if (this.layerManager && typeof this.layerManager.onLayerLoaded === 'function') {
      this.layerManager.onLayerLoaded(() => this.scheduleRender());
    }

    // Escutar eventos globais de alteração de visibilidade e camadas personalizadas
    window.addEventListener('layer:visibility-changed', () => this.scheduleRender());
    window.addEventListener('custom-layers:updated', () => this.scheduleRender());

    // Delegação de eventos para expansão e recolhimento dos grupos temáticos
    if (this.container) {
      this.container.addEventListener('click', (e) => {
        const header = e.target.closest('.legend-group-header');
        if (header) {
          const groupId = header.dataset.groupId;
          const card = header.closest('.legend-group-card');
          if (card && groupId) {
            if (this.collapsedGroups.has(groupId)) {
              this.collapsedGroups.delete(groupId);
              card.classList.remove('collapsed');
            } else {
              this.collapsedGroups.add(groupId);
              card.classList.add('collapsed');
            }
          }
        }
      });
    }
  }

  setAnalysisTool(analysisTool) {
    this.analysisTool = analysisTool;
    this.scheduleRender();
  }

  /**
   * Agenda renderização via microtask/requestAnimationFrame para consolidar múltiplos toggles (ex: presets)
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
   * Renderiza a legenda dinâmica com as camadas e análises ativas
   */
  render() {
    if (!this.container) return;

    // 1. Filtrar camadas nativas que estão visíveis no mapa
    const visibleLayers = LAYERS_CONFIG.filter(cfg => {
      const olLayer = this.layerManager ? this.layerManager.getLayer(cfg.id) : null;
      return olLayer && olLayer.getVisible();
    });

    // 2. Filtrar camadas customizadas do usuário visíveis
    const visibleCustomLayers = (this.layerManager && typeof this.layerManager.getCustomLayersList === 'function')
      ? this.layerManager.getCustomLayersList().filter(cl => cl.visible)
      : [];

    // 3. Recuperar análises espaciais ativas (Buffers / Faixas de Proteção)
    const analysisItems = (this.analysisTool && typeof this.analysisTool.getActiveAnalysisLegends === 'function')
      ? this.analysisTool.getActiveAnalysisLegends()
      : [];

    // Se nenhuma camada ou análise estiver visível, apresentar mensagem institucional limpa
    if (visibleLayers.length === 0 && visibleCustomLayers.length === 0 && analysisItems.length === 0) {
      this.container.innerHTML = `
        <div class="legend-empty">
          <i class="lucide-layers"></i>
          <p>Nenhuma camada ativa para exibição na legenda.</p>
          <span>Ative camadas temáticas na aba anterior ou selecione um cenário rápido de planejamento.</span>
        </div>
      `;
      return;
    }

    let html = '<div class="legend-content">';

    // 4. Renderizar grupos temáticos do WebGIS SEPLAN
    LAYER_GROUPS.forEach(group => {
      const groupVisibleLayers = visibleLayers.filter(l => l.group === group.id);
      if (groupVisibleLayers.length === 0) return; // Grupo vazio não aparece

      const isCollapsed = this.collapsedGroups.has(group.id);
      const collapsedClass = isCollapsed ? ' collapsed' : '';

      html += `
        <div class="legend-group-card${collapsedClass}">
          <div class="legend-group-header" data-group-id="${group.id}" title="Clique para expandir/recolher">
            <div class="legend-group-title">
              <i class="lucide-${group.iconName || 'folder'}"></i>
              <span>${group.title}</span>
            </div>
            <div class="legend-group-meta">
              <span class="legend-group-badge">${groupVisibleLayers.length}</span>
              <i class="lucide-chevron-down legend-group-chevron"></i>
            </div>
          </div>
          <div class="legend-group-body">
      `;

      groupVisibleLayers.forEach(layer => {
        html += this.generateLayerLegendItem(layer);
      });

      html += `
          </div>
        </div>
      `;
    });

    // 5. Camadas Personalizadas Importadas pelo Usuário
    if (visibleCustomLayers.length > 0) {
      const isCustomCollapsed = this.collapsedGroups.has('custom_layers');
      const customCollapsedClass = isCustomCollapsed ? ' collapsed' : '';

      html += `
        <div class="legend-group-card${customCollapsedClass}">
          <div class="legend-group-header" data-group-id="custom_layers" title="Clique para expandir/recolher">
            <div class="legend-group-title">
              <i class="lucide-upload"></i>
              <span>Camadas Importadas (Usuário)</span>
            </div>
            <div class="legend-group-meta">
              <span class="legend-group-badge">${visibleCustomLayers.length}</span>
              <i class="lucide-chevron-down legend-group-chevron"></i>
            </div>
          </div>
          <div class="legend-group-body">
      `;

      visibleCustomLayers.forEach(cl => {
        const color = cl.color || '#3b82f6';
        let symHtml = '';
        if (cl.geomType === 'Point' || cl.geomType === 'MultiPoint') {
          symHtml = `<span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${color}; border:1.8px solid #ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>`;
        } else if (cl.geomType === 'LineString' || cl.geomType === 'MultiLineString') {
          symHtml = `<span style="display:inline-block; width:22px; height:0px; border-top:2.2px solid ${color};"></span>`;
        } else {
          symHtml = `<span style="display:inline-block; width:18px; height:13px; border-radius:2px; background:${color}33; border:1.5px solid ${color};"></span>`;
        }
        html += this.renderItemRow(symHtml, cl.name, `${cl.format || 'Camada Externa'} • ${cl.featuresCount || 0} feições`);
      });

      html += `
          </div>
        </div>
      `;
    }

    // 6. Análise Espacial Territorial (Faixas de Proteção / Buffers)
    if (analysisItems.length > 0) {
      const isAnalysisCollapsed = this.collapsedGroups.has('analise_espacial');
      const analysisCollapsedClass = isAnalysisCollapsed ? ' collapsed' : '';

      html += `
        <div class="legend-group-card${analysisCollapsedClass}">
          <div class="legend-group-header" data-group-id="analise_espacial" title="Clique para expandir/recolher">
            <div class="legend-group-title">
              <i class="lucide-radar"></i>
              <span>Análise Espacial — Faixas de Proteção</span>
            </div>
            <div class="legend-group-meta">
              <span class="legend-group-badge">${analysisItems.length}</span>
              <i class="lucide-chevron-down legend-group-chevron"></i>
            </div>
          </div>
          <div class="legend-group-body">
            ${analysisItems.map(item => {
              const swatch = `<span style="display:inline-block; width:18px; height:14px; border-radius:3px; background:${item.fillColor}; border:1.5px solid ${item.strokeColor}; flex-shrink:0;"></span>`;
              return this.renderItemRow(swatch, item.title, item.areaFormatted || 'Faixa de Proteção Territorial');
            }).join('')}
          </div>
        </div>
      `;
    }

    html += '</div>';
    this.container.innerHTML = html;
  }

  /**
   * Helper para renderizar linha de item com símbolo à esquerda e textos à direita
   */
  renderItemRow(symbolHtml, title, desc = '') {
    return `
      <div class="legend-item-row">
        <div class="legend-symbol-wrapper">
          ${symbolHtml}
        </div>
        <div class="legend-item-info">
          <span class="legend-item-name">${title}</span>
          ${desc ? `<span class="legend-item-desc">${desc}</span>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Gera o item de legenda correspondente à camada geográfica com representação cartográfica fiel
   * @param {Object} layerConfig 
   * @returns {string}
   */
  generateLayerLegendItem(layerConfig) {
    const s = layerConfig.style || {};

    // -------------------------------------------------------------
    // 0. EQUIPAMENTOS DE SAÚDE (HOSPITAIS, CAIS, UBS / ESF)
    // -------------------------------------------------------------
    if (layerConfig.id === 'hospitais') {
      const hospSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="18" height="18" style="vertical-align:middle;">
          <circle cx="16" cy="16" r="14.5" fill="#e11d48" stroke="#ffffff" stroke-width="2"/>
          <path d="M10.5 8.5 L13.5 8.5 L13.5 14 L18.5 14 L18.5 8.5 L21.5 8.5 L21.5 23.5 L18.5 23.5 L18.5 16.8 L13.5 16.8 L13.5 23.5 L10.5 23.5 Z" fill="#ffffff"/>
        </svg>
      `;
      return this.renderItemRow(hospSvg, layerConfig.name, 'Alta Complexidade Hospitalar (5 unidades)');
    }

    if (layerConfig.id === 'cais') {
      const caisSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="18" height="18" style="vertical-align:middle;">
          <circle cx="16" cy="16" r="14.5" fill="#0891b2" stroke="#ffffff" stroke-width="2"/>
          <path d="M6.5 16.5 L11 16.5 L13.2 11 L16 22 L18.8 13.5 L21 16.5 L25.5 16.5" 
                fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      return this.renderItemRow(caisSvg, layerConfig.name, 'Pronto Atendimento e Especialidades (4 unidades)');
    }

    if (layerConfig.id === 'ubs_esf') {
      const ubsSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="18" height="18" style="vertical-align:middle;">
          <circle cx="16" cy="16" r="14.5" fill="#059669" stroke="#ffffff" stroke-width="2"/>
          <path d="M13.5 7.5 L18.5 7.5 L18.5 13.5 L24.5 13.5 L24.5 18.5 L18.5 18.5 L18.5 24.5 L13.5 24.5 L13.5 18.5 L7.5 18.5 L7.5 13.5 L13.5 13.5 Z" fill="#ffffff"/>
        </svg>
      `;
      return this.renderItemRow(ubsSvg, layerConfig.name, 'Atenção Primária à Saúde nos Bairros (33 unidades)');
    }

    // -------------------------------------------------------------
    // 0.1. PATRIMÔNIO HISTÓRICO E CULTURAL (MONUMENTO CLÁSSICO)
    // -------------------------------------------------------------
    if (layerConfig.id === 'patrimonio_historico') {
      const defSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="18" height="18" style="vertical-align:middle;">
          <circle cx="16" cy="16" r="14.5" fill="#881337" stroke="#f59e0b" stroke-width="2"/>
          <polygon points="16,6.8 8,12 24,12" fill="#ffffff"/>
          <rect x="8.5" y="12.4" width="15" height="1.4" fill="#f59e0b"/>
          <rect x="9.8" y="14.2" width="2.2" height="6.8" fill="#ffffff"/>
          <rect x="14.9" y="14.2" width="2.2" height="6.8" fill="#ffffff"/>
          <rect x="20" y="14.2" width="2.2" height="6.8" fill="#ffffff"/>
          <rect x="7.5" y="23" width="17" height="1.6" fill="#ffffff"/>
        </svg>
      `;
      const provSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="18" height="18" style="vertical-align:middle;">
          <circle cx="16" cy="16" r="14.5" fill="#881337" stroke="#38bdf8" stroke-width="2"/>
          <polygon points="16,6.8 8,12 24,12" fill="#ffffff"/>
          <rect x="8.5" y="12.4" width="15" height="1.4" fill="#38bdf8"/>
          <rect x="9.8" y="14.2" width="2.2" height="6.8" fill="#ffffff"/>
          <rect x="14.9" y="14.2" width="2.2" height="6.8" fill="#ffffff"/>
          <rect x="20" y="14.2" width="2.2" height="6.8" fill="#ffffff"/>
          <rect x="7.5" y="23" width="17" height="1.6" fill="#ffffff"/>
        </svg>
      `;
      const combinedIcons = `<span style="display:inline-flex; align-items:center; gap:4px;">${defSvg}${provSvg}</span>`;
      return this.renderItemRow(combinedIcons, layerConfig.name, 'Tombamento Definitivo (17) e Provisório (7)');
    }

    // -------------------------------------------------------------
    // 1. DISTRITOS DE PASSO FUNDO (MAP PIN VERMELHO #DC2626)
    // -------------------------------------------------------------
    if (layerConfig.id === 'distritos') {
      const prefSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="18" height="18" style="vertical-align:middle;">
          <circle cx="16" cy="16" r="14.5" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
          <polygon points="16,6.5 7,12.5 25,12.5" fill="#ffffff"/>
          <rect x="7.5" y="12.8" width="17" height="1.5" fill="#ffffff"/>
          <rect x="8.5" y="14.8" width="2.2" height="6.4" fill="#ffffff"/>
          <rect x="12.5" y="14.8" width="2.2" height="6.4" fill="#ffffff"/>
          <rect x="17.3" y="14.8" width="2.2" height="6.4" fill="#ffffff"/>
          <rect x="21.3" y="14.8" width="2.2" height="6.4" fill="#ffffff"/>
          <rect x="6.5" y="22.5" width="19" height="2" fill="#ffffff"/>
        </svg>
      `;
      const pinSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="14" height="19" style="vertical-align:middle;">
          <ellipse cx="12" cy="30.5" rx="5" ry="1.5" fill="rgba(0,0,0,0.35)"/>
          <path d="M12 2 C7 2 3 6.2 3 11.5 C3 18.5 12 30 12 30 C12 30 21 18.5 21 11.5 C21 6.2 17 2 12 2 Z" fill="#dc2626" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
          <circle cx="12" cy="11.5" r="4.0" fill="#ffffff"/>
          <circle cx="12" cy="11.5" r="2.0" fill="#991b1b"/>
        </svg>
      `;
      const combinedIcons = `<span style="display:inline-flex; align-items:center; gap:4px;">${prefSvg}${pinSvg}</span>`;
      return this.renderItemRow(combinedIcons, layerConfig.name, 'Prefeitura Municipal (Sede) e Distritos do Interior');
    }

    // -------------------------------------------------------------
    // 2. AEROPORTO LAURO KURTZ & AEROCLUBE (ÍCONE AERONÁUTICO)
    // -------------------------------------------------------------
    if (layerConfig.id === 'aeroporto_aeroclube') {
      const airportSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="22" height="22" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));">
          <circle cx="18" cy="18" r="16" fill="#0284c7" stroke="#ffffff" stroke-width="2.2"/>
          <path d="M18 7 L18 19 L28 24 L28 26 L18 22 L18 27 L21 29 L21 30.5 L18 29.5 L15 30.5 L15 29 L18 27 L18 22 L8 26 L8 24 L18 19 Z" fill="#ffffff"/>
        </svg>
      `;
      return this.renderItemRow(airportSvg, layerConfig.name, 'Aeroporto Regional Lauro Kurtz (SBPF) & Aeroclube');
    }

    // -------------------------------------------------------------
    // 3. RODOVIAS FEDERAIS E ESTADUAIS (DUAL CASING + BADGE)
    // -------------------------------------------------------------
    if (layerConfig.isHighway || layerConfig.id === 'rodovia_federal' || layerConfig.id === 'rodovia_estadual') {
      const isFederal = layerConfig.highwayType === 'BR' || layerConfig.id === 'rodovia_federal';
      const mainColor = isFederal ? '#dc2626' : '#ea580c';
      const badgeText = isFederal ? 'BR' : 'ERS';
      const desc = isFederal
        ? 'Eixos rodoviários federais (BR-285, BR-153)'
        : 'Rodovias estaduais pavimentadas (ERS-324, ERS-135, RSC-153)';

      const highwaySymbol = `
        <div style="display:flex; align-items:center; gap:5px;">
          <div style="position:relative; width:22px; height:6px; display:flex; align-items:center;">
            <div style="position:absolute; width:100%; height:4.5px; background:#ffffff; border-radius:1px;"></div>
            <div style="position:absolute; width:100%; height:2.2px; background:${mainColor}; border-radius:1px;"></div>
          </div>
          <span style="font-size:8.5px; font-weight:800; background:${mainColor}; color:#ffffff; padding:0 3.5px; border-radius:3px; border:0.8px solid #ffffff; line-height:12px; font-family:'Inter',sans-serif;">${badgeText}</span>
        </div>
      `;
      return this.renderItemRow(highwaySymbol, layerConfig.name, desc);
    }

    // -------------------------------------------------------------
    // 4. ESCOLAS MUNICIPAIS (EMEIs E EMEFs)
    // -------------------------------------------------------------
    if (layerConfig.id === 'escolas_infantil_emei') {
      const dot = `<span style="display:inline-block; width:13px; height:13px; border-radius:50%; background:#ec4899; border:1.8px solid #ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.35);"></span>`;
      return this.renderItemRow(dot, layerConfig.name, 'Escolas de Educação Infantil (Pública Municipal)');
    }
    if (layerConfig.id === 'escolas_fundamental_emef') {
      const dot = `<span style="display:inline-block; width:13px; height:13px; border-radius:50%; background:#2563eb; border:1.8px solid #ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.35);"></span>`;
      return this.renderItemRow(dot, layerConfig.name, 'Escolas de Ensino Fundamental (Pública Municipal)');
    }

    // -------------------------------------------------------------
    // 5. HIDROGRAFIA & RESERVATÓRIOS
    // -------------------------------------------------------------
    if (layerConfig.id === 'areas_risco_hidrologico') {
      const box = `<span style="display:inline-block; width:20px; height:14px; border-radius:3px; background:rgba(245, 158, 11, 0.35); border:1.8px solid #d97706;"></span>`;
      return this.renderItemRow(box, layerConfig.name, 'Áreas com histórico de inundação e planícies de atenção hidrológica');
    }
    if (layerConfig.id === 'reservatorio_miranda' || layerConfig.id === 'reservatorio_barragem') {
      const box = `<span style="display:inline-block; width:20px; height:14px; border-radius:3px; background:rgba(56, 189, 248, 0.35); border:1.5px solid #0284c7;"></span>`;
      const desc = layerConfig.id === 'reservatorio_miranda'
        ? "Lâmina d'água — Reservatório Miranda"
        : "Lâmina d'água — Reservatório da Barragem (Captação Corsan)";
      return this.renderItemRow(box, layerConfig.name, desc);
    }
    if (layerConfig.id === 'rio_passo_fundo') {
      const line = `<span style="display:inline-block; width:22px; height:0px; border-top:2.8px solid #0284c7;"></span>`;
      return this.renderItemRow(line, layerConfig.name, 'Curso principal completo da bacia hidrográfica municipal (47,27 km)');
    }
    if (layerConfig.id === 'arroio_miranda') {
      const line = `<span style="display:inline-block; width:22px; height:0px; border-top:2.2px solid #0ea5e9;"></span>`;
      return this.renderItemRow(line, layerConfig.name, "Cursos d'água da bacia do Arroio Miranda");
    }
    if (layerConfig.id === 'arroio_santo_antonio') {
      const line = `<span style="display:inline-block; width:22px; height:0px; border-top:2.2px solid #38bdf8;"></span>`;
      return this.renderItemRow(line, layerConfig.name, "Cursos d'água da sub-bacia Santo Antônio");
    }
    if (layerConfig.id === 'malha_hidrica') {
      const line = `<span style="display:inline-block; width:22px; height:0px; border-top:1.6px solid #0284c7;"></span>`;
      return this.renderItemRow(line, layerConfig.name, 'Rede hidrográfica (rios, arroios e sangas)');
    }
    if (layerConfig.id === 'bacias_hidrograficas') {
      const line = `<span style="display:inline-block; width:22px; height:0px; border-top:1.8px dashed #7c3aed;"></span>`;
      return this.renderItemRow(line, layerConfig.name, 'Divisores topográficos das bacias hidrográficas');
    }

    // -------------------------------------------------------------
    // 6. FERROVIA
    // -------------------------------------------------------------
    if (layerConfig.isRailway || layerConfig.id === 'ferrovia') {
      const rail = `
        <div style="width: 24px; height: 10px; background: #0f172a; border-radius: 2px; position: relative; display: flex; align-items: center; justify-content: center; border: 1px solid #475569;">
          <div style="width: 100%; height: 2px; background: #ffffff; border-top: 1px dashed #ffffff;"></div>
        </div>
      `;
      return this.renderItemRow(rail, layerConfig.name, 'Linha férrea / Malha ferroviária regional');
    }

    // -------------------------------------------------------------
    // 7. DIVISÃO TERRITORIAL E LIMITES
    // -------------------------------------------------------------
    if (layerConfig.id === 'limite_territorial') {
      const box = `<span style="display:inline-block; width:20px; height:14px; border-radius:3px; background:transparent; border:2.4px solid #B71C1C;"></span>`;
      return this.renderItemRow(box, layerConfig.name, 'Perímetro e limite territorial oficial de Passo Fundo');
    }
    if (layerConfig.id === 'bairros') {
      const box = `<span style="display:inline-block; width:20px; height:14px; border-radius:3px; background:rgba(16, 185, 129, 0.12); border:1.6px solid #059669;"></span>`;
      return this.renderItemRow(box, layerConfig.name, 'Delimitação de bairros e regiões urbanas');
    }
    if (layerConfig.id === 'limite_plano_diretor') {
      const box = `<span style="display:inline-block; width:20px; height:14px; border-radius:3px; background:rgba(147, 51, 234, 0.12); border:1.8px dashed #9333ea;"></span>`;
      return this.renderItemRow(box, layerConfig.name, 'Perímetro urbano consolidado pelo Plano Diretor');
    }
    if (layerConfig.id === 'setores_censitarios') {
      const box = `<span style="display:inline-block; width:20px; height:14px; border-radius:3px; background:rgba(100, 116, 139, 0.12); border:1.4px solid #475569;"></span>`;
      return this.renderItemRow(box, layerConfig.name, 'Setores censitários oficiais (IBGE Censo 2022)');
    }
    if (layerConfig.id === 'municipios_rs') {
      const box = `<span style="display:inline-block; width:20px; height:14px; border-radius:3px; background:rgba(71, 85, 105, 0.08); border:1.2px solid #64748b;"></span>`;
      return this.renderItemRow(box, layerConfig.name, 'Divisão territorial dos municípios do Rio Grande do Sul');
    }

    // -------------------------------------------------------------
    // 8. EQUIPAMENTOS DE USO COLETIVO & ESPECÍFICOS
    // -------------------------------------------------------------
    if (layerConfig.id === 'sede_defesa_civil') {
      const icon = `
        <span style="display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; background:#ff7800; border:1.8px solid #ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="#ffffff" stroke="#ffffff" stroke-width="1.5">
            <polygon points="12,2 22,20 2,20"/>
          </svg>
        </span>
      `;
      return this.renderItemRow(icon, layerConfig.name, 'Sede Operacional — Defesa Civil Passo Fundo');
    }
    if (layerConfig.id === 'zph_helicoptero') {
      const icon = `
        <span style="display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; background:#0284c7; border:1.8px solid #ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.3);">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 3h18M12 3v3M6 14h12a4 4 0 0 0 0-8H6a4 4 0 0 0 0 8zm14 0 2 3M4 17l2-3M4 21h16M7 17v4M17 17v4"/>
          </svg>
        </span>
      `;
      return this.renderItemRow(icon, layerConfig.name, 'Zonas de Pouso de Helicóptero (Resgate Aéreo)');
    }
    if (layerConfig.id === 'domicilios_risco_sgb_2025') {
      const dot = `<span style="display:inline-block; width:13px; height:13px; border-radius:50%; background:#f97316; border:1.8px solid #ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.35);"></span>`;
      return this.renderItemRow(dot, layerConfig.name, '1.115 Domicílios em Setores de Risco (SGB, 2025)');
    }
    if (layerConfig.id === 'mapeamento_sgb_2025') {
      const box = `<span style="display:inline-block; width:20px; height:14px; border-radius:3px; background:rgba(234, 88, 12, 0.35); border:1.8px solid #ea580c;"></span>`;
      return this.renderItemRow(box, layerConfig.name, '25 Setores de Alto e Muito Alto Risco — R3/R4 (SGB, 2025)');
    }
    if (layerConfig.id === 'corpo_bombeiros') {
      const dot = `<span style="display:inline-block; width:13px; height:13px; border-radius:50%; background:#dc2626; border:1.8px solid #ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>`;
      return this.renderItemRow(dot, layerConfig.name, 'Unidades e Quartéis do Corpo de Bombeiros');
    }
    if (layerConfig.id === 'seguranca_policia') {
      const dot = `<span style="display:inline-block; width:13px; height:13px; border-radius:50%; background:#2563eb; border:1.8px solid #ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>`;
      return this.renderItemRow(dot, layerConfig.name, 'Segurança Pública (Polícia Civil e Brigada Militar)');
    }
    if (layerConfig.id === 'terminal_rodoviario') {
      const dot = `<span style="display:inline-block; width:13px; height:13px; border-radius:50%; background:#0d9488; border:1.8px solid #ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>`;
      return this.renderItemRow(dot, layerConfig.name, 'Estação Rodoviária Municipal');
    }
    if (layerConfig.id === 'shopping_centers') {
      const dot = `<span style="display:inline-block; width:13px; height:13px; border-radius:50%; background:#7c3aed; border:1.8px solid #ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>`;
      return this.renderItemRow(dot, layerConfig.name, 'Centros Comerciais e Shopping Centers');
    }
    if (layerConfig.id === 'hoteis') {
      const dot = `<span style="display:inline-block; width:13px; height:13px; border-radius:50%; background:#d97706; border:1.8px solid #ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>`;
      return this.renderItemRow(dot, layerConfig.name, 'Rede Hoteleira & Meios de Hospedagem');
    }
    if (layerConfig.id === 'cemiterios_municipais' || layerConfig.id === 'cemiterios_privados') {
      const color = layerConfig.id === 'cemiterios_municipais' ? '#475569' : '#64748b';
      const dot = `<span style="display:inline-block; width:13px; height:13px; border-radius:50%; background:${color}; border:1.8px solid #ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>`;
      return this.renderItemRow(dot, layerConfig.name, layerConfig.id === 'cemiterios_municipais' ? 'Necrópoles públicas municipais' : 'Cemitérios privados');
    }

    // -------------------------------------------------------------
    // 9. ESCOLAS - ÁREAS DE ABRANGÊNCIA
    // -------------------------------------------------------------
    if (layerConfig.id === 'abrangencia_emeis_800m') {
      const box = `<span style="display:inline-block; width:20px; height:14px; border-radius:3px; background:rgba(236, 72, 153, 0.18); border:1.5px solid #db2777;"></span>`;
      return this.renderItemRow(box, layerConfig.name, 'Raio de atendimento territorial de 800 metros (EMEIs)');
    }
    if (layerConfig.id === 'abrangencia_emefs_1500m') {
      const box = `<span style="display:inline-block; width:20px; height:14px; border-radius:3px; background:rgba(37, 99, 235, 0.16); border:1.5px solid #1d4ed8;"></span>`;
      return this.renderItemRow(box, layerConfig.name, 'Raio de atendimento territorial de 1.500 metros (EMEFs)');
    }

    // -------------------------------------------------------------
    // 10. CURVAS DE NÍVEL — 10 M (TOPOGRAFIA & RELEVO)
    // -------------------------------------------------------------
    if (layerConfig.id === 'curvas_nivel_10m') {
      const activeColor = this.layerManager?.contourColor || layerConfig.style?.strokeColor || '#795548';
      const line = `<span style="display:inline-block; width:24px; height:0px; border-top:2.2px solid ${activeColor};"></span>`;
      return this.renderItemRow(line, layerConfig.name, 'Isolinhas com equidistância altimétrica de 10 metros (MDE)');
    }

    // -------------------------------------------------------------
    // 11. RESTRIÇÕES AERONÁUTICAS (PBZPA)
    // -------------------------------------------------------------
    if (layerConfig.id === 'pbzpa_superficies') {
      const surfaces = [
        { name: 'Horizontal Interna (SHI)', cota: '770,29 m', color: '#ef4444' },
        { name: 'Superfície Cônica (CO)', cota: '770,29 a 845,29 m', color: '#f97316' },
        { name: 'Horizontal Externa (SHE)', cota: '845,29 m', color: '#6366f1' },
        { name: 'Superfícies de Aproximação', cota: '715,06 a 875,29 m', color: '#0284c7' },
        { name: 'Superfícies de Decolagem', cota: '715,00 a 1.025,42 m', color: '#10b981' },
        { name: 'Pista e Faixa de Pista (1.680m)', cota: '715,06 a 725,29 m', color: '#0f172a' }
      ];

      return `
        <div class="legend-complex-item">
          <div class="legend-complex-header">
            <span class="legend-item-name">${layerConfig.name}</span>
            <span class="legend-item-desc">Portaria DECEA nº 846 • Gabarito vertical máximo (topo do edifício)</span>
          </div>
          <div class="legend-ramp-list">
            ${surfaces.map(sfc => `
              <div class="legend-ramp-row" style="justify-content: space-between;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="legend-ramp-swatch" style="background:${sfc.color};"></span>
                  <span style="color:var(--text-main); font-size:11px;">${sfc.name}</span>
                </div>
                <span style="font-weight:700; color:#38bdf8; font-family:'JetBrains Mono',monospace; font-size:10px;">${sfc.cota}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    if (layerConfig.id === 'pbzpa_linhas_operacionais') {
      const line = `<span style="display:inline-block; width:22px; height:0px; border-top:2.2px solid #f59e0b;"></span>`;
      return this.renderItemRow(line, layerConfig.name, 'Setor de Padrão de Voo Visual (SPVV Aeródromo)');
    }
    if (layerConfig.id === 'pbzpa_cotas_rotulos') {
      const dot = `<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#0284c7; border:1.5px solid #ffffff;"></span>`;
      return this.renderItemRow(dot, layerConfig.name, 'Pontos de Referência Altimétrica Oficial');
    }

    // -------------------------------------------------------------
    // 12. MAPA COROPLÉTICO (POPULAÇÃO & ENTORNO IBGE 2022)
    // -------------------------------------------------------------
    if (layerConfig.isChoropleth && layerConfig.choroplethBreaks) {
      return `
        <div class="legend-complex-item">
          <div class="legend-complex-header">
            <span class="legend-item-name">${layerConfig.name}</span>
            <span class="legend-item-desc">${layerConfig.source || 'Censo Demográfico IBGE 2022'}</span>
          </div>
          <div class="legend-ramp-list">
            ${layerConfig.choroplethBreaks.map(b => `
              <div class="legend-ramp-row">
                <span class="legend-ramp-swatch" style="background:${b.color};"></span>
                <span>${b.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // -------------------------------------------------------------
    // 13. HIPSOMETRIA E RELEVO SOMBREADO
    // -------------------------------------------------------------
    if (layerConfig.id === 'hipsometria_relevo' && layerConfig.hypsometryClasses) {
      return `
        <div class="legend-complex-item">
          <div class="legend-complex-header">
            <span class="legend-item-name">${layerConfig.name}</span>
            <span class="legend-item-desc">Modelo Digital de Elevação (Prefeitura de Passo Fundo / SEPLAN)</span>
          </div>
          <div class="legend-ramp-list">
            ${layerConfig.hypsometryClasses.map(c => `
              <div class="legend-ramp-row">
                <span class="legend-ramp-swatch" style="background:${c.color};"></span>
                <span>${c.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // -------------------------------------------------------------
    // 14. DENSIDADE ESPACIAL — KERNEL (EDUCAÇÃO)
    // -------------------------------------------------------------
    if (layerConfig.kernelClasses) {
      return `
        <div class="legend-complex-item">
          <div class="legend-complex-header">
            <span class="legend-item-name">${layerConfig.name}</span>
            <span class="legend-item-desc">Estimador de Densidade de Kernel (QGIS) • Raio 1.000 m</span>
          </div>
          <div class="legend-ramp-list">
            ${layerConfig.kernelClasses.map(c => `
              <div class="legend-ramp-row">
                <span class="legend-ramp-swatch" style="background:${c.color};"></span>
                <span style="color:var(--text-main); font-weight:500;">${c.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // -------------------------------------------------------------
    // 15. ORTOFOTOS E RASTERS
    // -------------------------------------------------------------
    if (layerConfig.isRaster || layerConfig.isGeoTIFF) {
      const icon = `
        <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:16px; border-radius:3px; background:linear-gradient(135deg, #0891b2, #065f46); border:1px solid rgba(255,255,255,0.4); color:#fff; font-size:10px;">
          <i class="lucide-camera" style="font-size:11px;"></i>
        </span>
      `;
      return this.renderItemRow(icon, layerConfig.name, 'Levantamento Aerofotogramétrico • Alta Resolução');
    }

    // -------------------------------------------------------------
    // 16. CAMADAS PONTUAIS GENÉRICAS / DEMAIS EQUIPAMENTOS
    // -------------------------------------------------------------
    if (layerConfig.geometryType === 'Point' || layerConfig.geometryType === 'MultiPoint') {
      const color = s.pointColor || s.previewColor || '#dc2626';
      const stroke = s.strokeColor || '#ffffff';
      const dot = `<span style="display:inline-block; width:13px; height:13px; border-radius:50%; background:${color}; border:1.8px solid ${stroke}; box-shadow:0 1px 3px rgba(0,0,0,0.3);"></span>`;
      return this.renderItemRow(dot, layerConfig.name, layerConfig.description || '');
    }

    // -------------------------------------------------------------
    // 17. CAMADAS LINEARES GENÉRICAS
    // -------------------------------------------------------------
    if (layerConfig.geometryType === 'MultiLineString' || layerConfig.geometryType === 'LineString') {
      const color = s.strokeColor || s.previewColor || '#3b82f6';
      const borderStyle = s.strokeDash ? 'dashed' : 'solid';
      const line = `<span style="display:inline-block; width:22px; height:0px; border-top:${s.strokeWidth || 2}px ${borderStyle} ${color};"></span>`;
      return this.renderItemRow(line, layerConfig.name, layerConfig.description || '');
    }

    // -------------------------------------------------------------
    // 18. CAMADAS POLIGONAIS GENÉRICAS
    // -------------------------------------------------------------
    const borderStyle = s.strokeDash ? 'dashed' : 'solid';
    const poly = `<span style="display:inline-block; width:20px; height:14px; border-radius:3px; background:${s.fillColor || 'rgba(59, 130, 246, 0.2)'}; border:${s.strokeWidth || 1.5}px ${borderStyle} ${s.strokeColor || '#3b82f6'};"></span>`;
    return this.renderItemRow(poly, layerConfig.name, layerConfig.description || '');
  }
}
