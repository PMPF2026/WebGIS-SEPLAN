import { ComparativoData, MUNICIPAL_DATA } from './comparativo-data.js';
import { EPSG_UTM22S, EPSG_WEBMERCATOR } from '../utils/projection.js';

export class ComparativoCensoUI {
  constructor(mapEngine, layerManager) {
    this.mapEngine = mapEngine;
    this.layerManager = layerManager;
    this.map = mapEngine ? mapEngine.getOlMap() : null;

    this.data = new ComparativoData();
    this.container = null;
    this.comparativoLayer = null;
    this.currentTheme = 'var_pct'; // 'var_pct' | 'pop2022' | 'pop2010'
    this.layerVisible = false;
    this.selectedBairroId = null;
    this.sortColumn = 'VAR_POP_PCT';
    this.sortAsc = false;
    this.sectorSearchMode = '2010'; // '2010' | '2022'
    this.isInitialized = false;
  }

  async init() {
    this.container = document.getElementById('comparativo-censo-container');
    if (!this.container) {
      console.warn('[ComparativoCensoUI] Contêiner #comparativo-censo-container não encontrado.');
      return;
    }

    this.renderLoading();

    try {
      await this.data.loadAll();
      this.initMapLayer();
      this.render();
      this.bindEvents();
      this.isInitialized = true;
      console.log('[ComparativoCensoUI] Módulo Censo 2010 × 2022 inicializado com sucesso.');
    } catch (err) {
      console.error('[ComparativoCensoUI] Falha na inicialização:', err);
      this.renderError(err.message);
    }
  }

  renderLoading() {
    this.container.innerHTML = `
      <div style="padding: 24px; text-align: center; color: #94a3b8;">
        <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: #38bdf8; margin-bottom: 8px;"></i>
        <p style="margin: 0; font-size: 0.85rem;">Carregando diagnósticos comparativos dos Censos 2010 e 2022...</p>
      </div>
    `;
  }

  renderError(msg) {
    this.container.innerHTML = `
      <div class="comparativo-section" style="border-color: #ef4444; background: rgba(239, 68, 68, 0.1);">
        <h4 style="color: #f87171; margin: 0 0 6px 0; font-size: 0.9rem;">
          <i class="fas fa-exclamation-triangle"></i> Erro ao carregar dados comparativos
        </h4>
        <p style="font-size: 0.775rem; color: #cbd5e1; margin: 0;">${msg}</p>
      </div>
    `;
  }

  initMapLayer() {
    if (!this.map || !window.ol) return;

    const geoJsonFormat = new ol.format.GeoJSON({
      dataProjection: EPSG_UTM22S,
      featureProjection: EPSG_WEBMERCATOR
    });

    const vectorSource = new ol.source.Vector({
      features: geoJsonFormat.readFeatures(this.data.getBairrosGeoJson())
    });

    this.comparativoLayer = new ol.layer.Vector({
      source: vectorSource,
      visible: false,
      zIndex: 45,
      style: (feature) => this.getFeatureStyle(feature)
    });

    this.comparativoLayer.set('id', 'layer-censo-comparativo');
    this.comparativoLayer.set('title', 'Censo 2010 × 2022 (Regiões de Bairro)');

    this.map.addLayer(this.comparativoLayer);

    // Click handler no mapa
    this.map.on('singleclick', (evt) => {
      if (!this.layerVisible) return;
      const feature = this.map.forEachFeatureAtPixel(evt.pixel, (f, l) => {
        if (l === this.comparativoLayer) return f;
      });
      if (feature) {
        const id = feature.get('ID_REGIAO');
        if (id) {
          this.selectBairro(id, false);
        }
      }
    });
  }

  getFeatureStyle(feature) {
    const isSelected = feature.get('ID_REGIAO') === this.selectedBairroId;
    let fillColor = 'rgba(148, 163, 184, 0.4)';

    if (this.currentTheme === 'var_pct') {
      const v = feature.get('VAR_POP_PCT');
      if (v !== null && v !== undefined) {
        if (v < -20) fillColor = 'rgba(185, 28, 28, 0.75)'; // Vermelho escuro
        else if (v < -5) fillColor = 'rgba(239, 68, 68, 0.7)'; // Vermelho
        else if (v <= 5) fillColor = 'rgba(148, 163, 184, 0.6)'; // Estável
        else if (v <= 30) fillColor = 'rgba(52, 211, 153, 0.7)'; // Verde claro
        else if (v <= 60) fillColor = 'rgba(16, 185, 129, 0.75)'; // Verde médio
        else fillColor = 'rgba(5, 150, 105, 0.85)'; // Verde escuro
      }
    } else if (this.currentTheme === 'pop2022') {
      const p = feature.get('POP_2022') || 0;
      if (p < 3000) fillColor = 'rgba(221, 214, 254, 0.65)';
      else if (p < 7000) fillColor = 'rgba(167, 139, 250, 0.7)';
      else if (p < 12000) fillColor = 'rgba(139, 92, 246, 0.75)';
      else if (p < 18000) fillColor = 'rgba(109, 40, 217, 0.8)';
      else fillColor = 'rgba(76, 29, 149, 0.85)';
    } else if (this.currentTheme === 'pop2010') {
      const p = feature.get('POP_2010') || 0;
      if (p < 3000) fillColor = 'rgba(219, 234, 254, 0.65)';
      else if (p < 7000) fillColor = 'rgba(147, 197, 253, 0.7)';
      else if (p < 12000) fillColor = 'rgba(59, 130, 246, 0.75)';
      else if (p < 18000) fillColor = 'rgba(29, 78, 216, 0.8)';
      else fillColor = 'rgba(30, 58, 138, 0.85)';
    }

    return new ol.style.Style({
      fill: new ol.style.Fill({ color: fillColor }),
      stroke: new ol.style.Stroke({
        color: isSelected ? '#38bdf8' : '#ffffff',
        width: isSelected ? 3 : 1.2
      })
    });
  }

  updateMapTheme(theme) {
    this.currentTheme = theme;
    if (this.comparativoLayer) {
      this.comparativoLayer.changed();
    }

    // Atualiza botões
    const btns = this.container.querySelectorAll('.comparativo-theme-btn');
    btns.forEach(b => {
      b.classList.toggle('active', b.dataset.theme === theme);
    });
  }

  toggleMapLayer(forceState) {
    const newState = forceState !== undefined ? forceState : !this.layerVisible;
    this.layerVisible = newState;
    if (this.comparativoLayer) {
      this.comparativoLayer.setVisible(this.layerVisible);
    }
    const chk = this.container.querySelector('#comparativo-layer-toggle');
    if (chk) chk.checked = this.layerVisible;
  }

  render() {
    const mun = this.data.getMunicipal();
    const ind = mun.indicadores_oficiais;

    this.container.innerHTML = `
      <div class="comparativo-header">
        <h3 class="comparativo-title">
          <i class="fas fa-chart-line"></i> Censo Demográfico 2010 × 2022
        </h3>
        <p class="comparativo-subtitle">Passo Fundo/RS — Comparativo Oficial e Evolução Territorial</p>
      </div>

      <!-- NÍVEL 1: VISÃO MUNICIPAL -->
      <div class="comparativo-section">
        <h4 class="comparativo-section-title">
          <i class="fas fa-city"></i> 1. Passo Fundo — Visão Municipal
        </h4>
        
        <div class="comparativo-kpi-grid">
          <!-- População -->
          <div class="comparativo-kpi-card">
            <span class="comparativo-kpi-label"><i class="fas fa-users"></i> População Total</span>
            <div class="comparativo-kpi-row">
              <span>Censo 2010:</span>
              <span class="comparativo-kpi-val">${ComparativoData.formatNumber(ind.pop_2010)}</span>
            </div>
            <div class="comparativo-kpi-row">
              <span>Censo 2022:</span>
              <span class="comparativo-kpi-val">${ComparativoData.formatNumber(ind.pop_2022)}</span>
            </div>
            <div class="comparativo-kpi-delta-box">
              <span class="comparativo-delta ${ind.var_pop_abs >= 0 ? 'positive' : 'negative'}">
                ${ComparativoData.formatDelta(ind.var_pop_abs)}
              </span>
              <span class="comparativo-delta ${ind.var_pop_pct >= 0 ? 'positive' : 'negative'}">
                ${ComparativoData.formatDelta(ind.var_pop_pct, true, 2)}
              </span>
            </div>
          </div>

          <!-- Domicílios -->
          <div class="comparativo-kpi-card">
            <span class="comparativo-kpi-label"><i class="fas fa-home"></i> Total Domicílios</span>
            <div class="comparativo-kpi-row">
              <span>Censo 2010:</span>
              <span class="comparativo-kpi-val">${ComparativoData.formatNumber(ind.dom_2010)}</span>
            </div>
            <div class="comparativo-kpi-row">
              <span>Censo 2022:</span>
              <span class="comparativo-kpi-val">${ComparativoData.formatNumber(ind.dom_2022)}</span>
            </div>
            <div class="comparativo-kpi-delta-box">
              <span class="comparativo-delta ${ind.var_dom_abs >= 0 ? 'positive' : 'negative'}">
                ${ComparativoData.formatDelta(ind.var_dom_abs)}
              </span>
              <span class="comparativo-delta ${ind.var_dom_pct >= 0 ? 'positive' : 'negative'}">
                ${ComparativoData.formatDelta(ind.var_dom_pct, true, 2)}
              </span>
            </div>
          </div>
        </div>

        <div class="comparativo-note">
          <strong>Fonte Oficial:</strong> ${ind.fonte_pop}.<br>
          <em>*Nota Técnica:</em> Em 2010, os 270 setores censitários agregaram 183.386 moradores em domicílios particulares. O total municipal oficial de 184.826 inclui a população de domicílios coletivos (1.440 hab). Em 2022, a soma dos 321 setores da malha vetorial totaliza 208.851 hab frente a 206.224 da publicação municipal de apuração preliminar.
        </div>
      </div>

      <!-- MAPA TEMÁTICO DAS REGIÕES -->
      <div class="comparativo-section">
        <h4 class="comparativo-section-title">
          <i class="fas fa-map-marked-alt"></i> Cartografia Comparativa (23 Regiões)
        </h4>

        <div class="comparativo-theme-bar">
          <label style="font-size: 0.75rem; color: #cbd5e1; display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <input type="checkbox" id="comparativo-layer-toggle" ${this.layerVisible ? 'checked' : ''}>
            <span>Exibir camada temática no mapa</span>
          </label>

          <div class="comparativo-theme-buttons">
            <button class="comparativo-theme-btn ${this.currentTheme === 'var_pct' ? 'active' : ''}" data-theme="var_pct">
              Variação % (10→22)
            </button>
            <button class="comparativo-theme-btn ${this.currentTheme === 'pop2022' ? 'active' : ''}" data-theme="pop2022">
              População 2022
            </button>
            <button class="comparativo-theme-btn ${this.currentTheme === 'pop2010' ? 'active' : ''}" data-theme="pop2010">
              População 2010
            </button>
          </div>
        </div>
      </div>

      <!-- NÍVEL 2: COMPARAÇÃO POR REGIÃO DE BAIRRO -->
      <div class="comparativo-section">
        <h4 class="comparativo-section-title">
          <i class="fas fa-th-list"></i> 2. Comparação por Região de Bairro
        </h4>

        <div class="comparativo-filter-row">
          <select id="comparativo-bairro-select" class="comparativo-select">
            <option value="">-- Selecione uma Região para detalhar --</option>
            ${this.data.getBairros().map(b => `
              <option value="${b.ID_REGIAO}">${b.ID_REGIAO}: ${b.NOME_REGIAO}</option>
            `).join('')}
          </select>
        </div>

        <div class="comparativo-table-container">
          <table class="comparativo-table">
            <thead>
              <tr>
                <th data-col="NOME_REGIAO">Região</th>
                <th data-col="POP_2010" class="comparativo-num">Pop. 10</th>
                <th data-col="POP_2022" class="comparativo-num">Pop. 22</th>
                <th data-col="VAR_POP_ABS" class="comparativo-num">Δ Pop.</th>
                <th data-col="VAR_POP_PCT" class="comparativo-num">Δ %</th>
                <th data-col="DOM_2010" class="comparativo-num">Dom. 10</th>
                <th data-col="DOM_2022" class="comparativo-num">Dom. 22</th>
              </tr>
            </thead>
            <tbody id="comparativo-bairros-tbody">
              <!-- Linhas renderizadas dinamicamente -->
            </tbody>
          </table>
        </div>

        <div id="comparativo-bairro-detail-container">
          <!-- Detalhe da região selecionada -->
        </div>
      </div>

      <!-- NÍVEL 3: CORRESPONDÊNCIA DOS SETORES CENSITÁRIOS -->
      <div class="comparativo-section">
        <h4 class="comparativo-section-title">
          <i class="fas fa-project-diagram"></i> 3. Correspondência dos Setores Censitários
        </h4>

        <div style="background: rgba(14, 165, 233, 0.1); border-left: 3px solid #38bdf8; padding: 8px 10px; border-radius: 4px; font-size: 0.725rem; color: #bae6fd; margin-bottom: 10px;">
          <i class="fas fa-info-circle"></i> <strong>Salvaguarda Metodológica:</strong>
          Os setores censitários de 2010 e 2022 possuem relações territoriais de formação definidas pelo IBGE e <strong>não devem</strong> ser interpretados automaticamente como unidades espaciais equivalentes.
        </div>

        <div class="comparativo-setores-nav">
          <div class="comparativo-setores-tab ${this.sectorSearchMode === '2010' ? 'active' : ''}" data-mode="2010">
            Origem: Censo 2010 → 2022
          </div>
          <div class="comparativo-setores-tab ${this.sectorSearchMode === '2022' ? 'active' : ''}" data-mode="2022">
            Destino: Censo 2022 → 2010
          </div>
        </div>

        <div class="comparativo-search-box">
          <input type="text" id="comparativo-sector-search" class="comparativo-input" 
                 placeholder="Digite o código do setor (ex: 43141000519 ou 0001)...">
        </div>

        <div id="comparativo-sector-results" class="comparativo-results-list">
          <!-- Resultados da busca de setores -->
        </div>
      </div>
    `;

    this.renderBairrosTable();
    this.renderSectorResults();
  }

  renderBairrosTable() {
    const tbody = this.container.querySelector('#comparativo-bairros-tbody');
    if (!tbody) return;

    let list = [...this.data.getBairros()];

    // Ordenação
    list.sort((a, b) => {
      let va = a[this.sortColumn];
      let vb = b[this.sortColumn];
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'string') {
        return this.sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return this.sortAsc ? va - vb : vb - va;
    });

    tbody.innerHTML = list.map(b => {
      const isSelected = b.ID_REGIAO === this.selectedBairroId;
      const deltaClass = b.VAR_POP_PCT > 0 ? 'positive' : (b.VAR_POP_PCT < 0 ? 'negative' : 'neutral');
      return `
        <tr data-id="${b.ID_REGIAO}" class="${isSelected ? 'selected' : ''}">
          <td style="font-weight: 500;">
            <span style="color: #38bdf8; font-size: 0.675rem; margin-right: 4px;">${b.ID_REGIAO}</span>
            ${b.NOME_REGIAO}
          </td>
          <td class="comparativo-num">${ComparativoData.formatNumber(b.POP_2010)}</td>
          <td class="comparativo-num">${ComparativoData.formatNumber(b.POP_2022)}</td>
          <td class="comparativo-num" style="color: ${b.VAR_POP_ABS >= 0 ? '#34d399' : '#f87171'}">
            ${ComparativoData.formatDelta(b.VAR_POP_ABS)}
          </td>
          <td class="comparativo-num">
            <span class="comparativo-delta ${deltaClass}" style="padding: 1px 4px; font-size: 0.7rem;">
              ${ComparativoData.formatDelta(b.VAR_POP_PCT, true, 1)}
            </span>
          </td>
          <td class="comparativo-num">${ComparativoData.formatNumber(b.DOM_2010)}</td>
          <td class="comparativo-num">${ComparativoData.formatNumber(b.DOM_2022)}</td>
        </tr>
      `;
    }).join('');
  }

  selectBairro(id, zoomMap = true) {
    this.selectedBairroId = id;
    const b = this.data.getBairroById(id);

    // Atualiza tabela
    const rows = this.container.querySelectorAll('#comparativo-bairros-tbody tr');
    rows.forEach(r => {
      r.classList.toggle('selected', r.dataset.id === id);
    });

    // Atualiza select
    const sel = this.container.querySelector('#comparativo-bairro-select');
    if (sel) sel.value = id || '';

    // Renderiza detalhe
    const detailBox = this.container.querySelector('#comparativo-bairro-detail-container');
    if (!detailBox) return;

    if (!b) {
      detailBox.innerHTML = '';
      return;
    }

    const isAlviverde = b.ID_REGIAO === 'Setor 23';
    const isVilaRodrigues = b.ID_REGIAO === 'Setor 19';

    detailBox.innerHTML = `
      <div class="comparativo-detail-card">
        <div class="comparativo-detail-header">
          <h5 class="comparativo-detail-title">
            <i class="fas fa-map-marker-alt"></i> ${b.ID_REGIAO} — ${b.NOME_REGIAO}
          </h5>
          <span style="font-size: 0.7rem; color: #94a3b8;">${b.CD_SUBDIST}</span>
        </div>

        <div class="comparativo-detail-grid">
          <div class="comparativo-detail-item">
            <span>População 2010:</span>
            <strong style="color: #f1f5f9;">${ComparativoData.formatNumber(b.POP_2010)} hab</strong>
          </div>
          <div class="comparativo-detail-item">
            <span>População 2022:</span>
            <strong style="color: #f1f5f9;">${ComparativoData.formatNumber(b.POP_2022)} hab</strong>
          </div>
          <div class="comparativo-detail-item">
            <span>Variação Absoluta Pop.:</span>
            <strong style="color: ${b.VAR_POP_ABS >= 0 ? '#34d399' : '#f87171'}">
              ${ComparativoData.formatDelta(b.VAR_POP_ABS)} hab
            </strong>
          </div>
          <div class="comparativo-detail-item">
            <span>Taxa de Variação Pop.:</span>
            <strong style="color: ${b.VAR_POP_PCT >= 0 ? '#34d399' : '#f87171'}">
              ${ComparativoData.formatDelta(b.VAR_POP_PCT, true, 2)}
            </strong>
          </div>
          <div class="comparativo-detail-item">
            <span>Domicílios 2010:</span>
            <strong style="color: #f1f5f9;">${isAlviverde ? 'Não aplicável*' : ComparativoData.formatNumber(b.DOM_2010)}</strong>
          </div>
          <div class="comparativo-detail-item">
            <span>Domicílios 2022:</span>
            <strong style="color: #f1f5f9;">${isAlviverde ? 'Não aplicável*' : ComparativoData.formatNumber(b.DOM_2022)}</strong>
          </div>
        </div>

        ${isVilaRodrigues ? `
          <div style="margin-top: 8px; font-size: 0.7rem; color: #f87171; background: rgba(239, 68, 68, 0.1); padding: 6px; border-radius: 4px;">
            <i class="fas fa-check-circle"></i> <strong>Auditoria Vila Rodrigues (#19):</strong>
            Variação corrigida de 6.726 para 4.817 hab (-1.909 hab; -28,38%). O valor original do banco (+28) foi sanado.
          </div>
        ` : ''}

        ${isAlviverde ? `
          <div style="margin-top: 8px; font-size: 0.7rem; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 6px; border-radius: 4px;">
            <i class="fas fa-info-circle"></i> <strong>Alviverde (#23):</strong>
            Unidade Territorial Municipal Específica da SEPLAN (sem correspondência artificial a subdistrito IBGE).
          </div>
        ` : ''}
      </div>
    `;

    // Atualiza estilo no mapa
    if (this.comparativoLayer) {
      this.comparativoLayer.changed();

      if (zoomMap && this.map) {
        const source = this.comparativoLayer.getSource();
        const feat = source.getFeatures().find(f => f.get('ID_REGIAO') === id);
        if (feat && feat.getGeometry()) {
          this.map.getView().fit(feat.getGeometry().getExtent(), {
            duration: 600,
            maxZoom: 15,
            padding: [40, 40, 40, 40]
          });
        }
      }
    }
  }

  renderSectorResults(query = '') {
    const resBox = this.container.querySelector('#comparativo-sector-results');
    if (!resBox) return;

    let items = [];
    if (!query) {
      items = this.data.getCorrespondencias().slice(0, 15);
    } else {
      if (this.sectorSearchMode === '2010') {
        items = this.data.buscarSetor2010(query);
      } else {
        items = this.data.buscarSetor2022(query);
      }
    }

    if (items.length === 0) {
      resBox.innerHTML = `
        <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 0.75rem;">
          Nenhum setor censitário encontrado para o termo pesquisado.
        </div>
      `;
      return;
    }

    resBox.innerHTML = items.map(item => `
      <div class="comparativo-result-item">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
          <span style="font-weight: 700; color: #f8fafc; font-size: 0.775rem;">
            ${this.sectorSearchMode === '2010' ? `2010: ${item.setor_2010}` : `2022: ${item.setor_2022}`}
          </span>
          <span class="comparativo-badge-frm" title="${item.frm_descricao}">
            FRM ${item.frm}
          </span>
        </div>

        <div style="color: #94a3b8; font-size: 0.7rem;">
          <i class="fas fa-arrow-right" style="color: #38bdf8; font-size: 0.65rem;"></i>
          ${this.sectorSearchMode === '2010' ? `Destino 2022: <strong>${item.setor_2022}</strong>` : `Origem 2010: <strong>${item.setor_2010}</strong>`}
          &bull; <span>${item.regiao_nome}</span>
        </div>

        <div style="color: #64748b; font-size: 0.675rem; margin-top: 2px;">
          ${item.frm_descricao}
        </div>

        ${item.nota ? `
          <div class="comparativo-badge-special">
            <i class="fas fa-shield-alt"></i> ${item.nota}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  bindEvents() {
    // Map theme buttons
    this.container.querySelectorAll('.comparativo-theme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.updateMapTheme(e.currentTarget.dataset.theme);
        if (!this.layerVisible) {
          this.toggleMapLayer(true);
        }
      });
    });

    // Checkbox layer toggle
    const chk = this.container.querySelector('#comparativo-layer-toggle');
    if (chk) {
      chk.addEventListener('change', (e) => {
        this.toggleMapLayer(e.target.checked);
      });
    }

    // Select bairro
    const sel = this.container.querySelector('#comparativo-bairro-select');
    if (sel) {
      sel.addEventListener('change', (e) => {
        this.selectBairro(e.target.value, true);
      });
    }

    // Click row table
    const tbody = this.container.querySelector('#comparativo-bairros-tbody');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const tr = e.target.closest('tr');
        if (tr && tr.dataset.id) {
          this.selectBairro(tr.dataset.id, true);
        }
      });
    }

    // Sort table headers
    this.container.querySelectorAll('.comparativo-table th').forEach(th => {
      th.addEventListener('click', (e) => {
        const col = e.currentTarget.dataset.col;
        if (!col) return;
        if (this.sortColumn === col) {
          this.sortAsc = !this.sortAsc;
        } else {
          this.sortColumn = col;
          this.sortAsc = false;
        }
        this.renderBairrosTable();
      });
    });

    // Sector search modes
    this.container.querySelectorAll('.comparativo-setores-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.container.querySelectorAll('.comparativo-setores-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.sectorSearchMode = e.currentTarget.dataset.mode;
        const input = this.container.querySelector('#comparativo-sector-search');
        if (input) input.placeholder = this.sectorSearchMode === '2010' 
          ? 'Digite o código do setor de 2010...' 
          : 'Digite o código do setor de 2022...';
        this.renderSectorResults(input ? input.value : '');
      });
    });

    // Sector search input
    const searchInput = this.container.querySelector('#comparativo-sector-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.renderSectorResults(e.target.value.trim());
      });
    }

    // Escuta evento de abertura da aba para ativar mapa
    window.addEventListener('comparativo:tab-opened', () => {
      this.toggleMapLayer(true);
    });

    // Escuta quando outras abas forem abertas para ocultar camada
    window.addEventListener('comparativo:tab-closed', () => {
      this.toggleMapLayer(false);
    });
  }
}
