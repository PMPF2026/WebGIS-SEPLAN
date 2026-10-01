import { ComparativoData, MUNICIPAL_DATA, MUNICIPAL_AGE_TRANSITION } from './comparativo-data.js';
import { EPSG_UTM22S, EPSG_WEBMERCATOR } from '../utils/projection.js';

export class ComparativoCensoUI {
  constructor(mapEngine, layerManager) {
    this.mapEngine = mapEngine;
    this.layerManager = layerManager;
    this.map = mapEngine ? mapEngine.getOlMap() : null;

    this.data = new ComparativoData();
    this.container = null;
    this.comparativoLayer = null;
    this.currentTheme = 'var_pct'; // 'var_pct' | 'pop2022' | 'pop2010' | 'indice_env_2022' | 'indice_env_2010' | 'var_indice_env' | 'var_idosos_pct'
    this.layerVisible = false;
    this.selectedBairroId = null;
    this.sortColumn = 'VAR_POP_PCT';
    this.sortAsc = false;
    this.sectorSearchMode = '2010'; // '2010' | '2022'
    this.ageChart = null;
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
      this.renderAgeChart();
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

    const geoData = this.data.getTransicaoEtariaGeoJson() || this.data.getBairrosGeoJson();
    const vectorSource = new ol.source.Vector({
      features: geoJsonFormat.readFeatures(geoData)
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
    } else if (this.currentTheme === 'indice_env_2022') {
      const ie = feature.get('INDICE_ENV_2022') || 0;
      if (ie < 50) fillColor = 'rgba(52, 211, 153, 0.75)'; // Jovem (<50)
      else if (ie < 75) fillColor = 'rgba(250, 204, 21, 0.75)'; // Transição (50-75)
      else if (ie < 100) fillColor = 'rgba(251, 146, 60, 0.75)'; // Maduro (75-100)
      else if (ie < 150) fillColor = 'rgba(239, 68, 68, 0.8)'; // Envelhecido (100-150)
      else fillColor = 'rgba(168, 85, 247, 0.85)'; // Superenvelhecido (>150)
    } else if (this.currentTheme === 'indice_env_2010') {
      const ie = feature.get('INDICE_ENV_2010') || 0;
      if (ie < 50) fillColor = 'rgba(52, 211, 153, 0.75)';
      else if (ie < 75) fillColor = 'rgba(250, 204, 21, 0.75)';
      else if (ie < 100) fillColor = 'rgba(251, 146, 60, 0.75)';
      else if (ie < 150) fillColor = 'rgba(239, 68, 68, 0.8)';
      else fillColor = 'rgba(168, 85, 247, 0.85)';
    } else if (this.currentTheme === 'var_indice_env') {
      const diff = feature.get('VAR_INDICE_ENV') || 0;
      if (diff < 0) fillColor = 'rgba(52, 211, 153, 0.75)'; // Rejuvenescimento
      else if (diff <= 25) fillColor = 'rgba(250, 204, 21, 0.75)'; // Baixa aceleração
      else if (diff <= 50) fillColor = 'rgba(251, 146, 60, 0.75)'; // Média aceleração
      else fillColor = 'rgba(239, 68, 68, 0.85)'; // Alta aceleração (>50 pp)
    } else if (this.currentTheme === 'var_idosos_pct') {
      const v = feature.get('VAR_IDO_PCT') || 0;
      if (v < 30) fillColor = 'rgba(148, 163, 184, 0.65)';
      else if (v <= 60) fillColor = 'rgba(251, 146, 60, 0.75)';
      else if (v <= 100) fillColor = 'rgba(239, 68, 68, 0.8)';
      else fillColor = 'rgba(168, 85, 247, 0.85)'; // Dobrou idosos (>100%)
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

        <!-- TRANSIÇÃO ETÁRIA & ENVELHECIMENTO (2010 × 2022) -->
        <div style="margin-top: 14px; border-top: 1px dashed rgba(148, 163, 184, 0.2); padding-top: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.775rem; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px;">
              <i class="fas fa-hourglass-half"></i> Transição Etária & Envelhecimento
            </span>
            <span style="font-size: 0.7rem; color: #94a3b8;">Oficial IBGE 2010 × 2022</span>
          </div>

          <div class="comparativo-kpi-grid">
            <!-- Jovens 0-14 -->
            <div class="comparativo-kpi-card">
              <span class="comparativo-kpi-label"><i class="fas fa-child"></i> Jovens (0 a 14 anos)</span>
              <div class="comparativo-kpi-row">
                <span>Censo 2010:</span>
                <span class="comparativo-kpi-val">${ComparativoData.formatNumber(munAge.jovens_2010)} <small>(${munAge.pct_jovens_2010.toFixed(1)}%)</small></span>
              </div>
              <div class="comparativo-kpi-row">
                <span>Censo 2022:</span>
                <span class="comparativo-kpi-val">${ComparativoData.formatNumber(munAge.jovens_2022)} <small>(${munAge.pct_jovens_2022.toFixed(1)}%)</small></span>
              </div>
              <div class="comparativo-kpi-delta-box">
                <span class="comparativo-delta ${munAge.var_jov_abs >= 0 ? 'positive' : 'negative'}">
                  ${ComparativoData.formatDelta(munAge.var_jov_abs)}
                </span>
                <span class="comparativo-delta ${munAge.var_jov_pct >= 0 ? 'positive' : 'negative'}">
                  ${ComparativoData.formatDelta(munAge.var_jov_pct, true, 2)}
                </span>
              </div>
            </div>

            <!-- Adultos 15-59 -->
            <div class="comparativo-kpi-card">
              <span class="comparativo-kpi-label"><i class="fas fa-user-tie"></i> Adultos (15 a 59 anos)</span>
              <div class="comparativo-kpi-row">
                <span>Censo 2010:</span>
                <span class="comparativo-kpi-val">${ComparativoData.formatNumber(munAge.adultos_2010)} <small>(${munAge.pct_adultos_2010.toFixed(1)}%)</small></span>
              </div>
              <div class="comparativo-kpi-row">
                <span>Censo 2022:</span>
                <span class="comparativo-kpi-val">${ComparativoData.formatNumber(munAge.adultos_2022)} <small>(${munAge.pct_adultos_2022.toFixed(1)}%)</small></span>
              </div>
              <div class="comparativo-kpi-delta-box">
                <span class="comparativo-delta ${munAge.var_adu_abs >= 0 ? 'positive' : 'negative'}">
                  ${ComparativoData.formatDelta(munAge.var_adu_abs)}
                </span>
                <span class="comparativo-delta ${munAge.var_adu_pct >= 0 ? 'positive' : 'negative'}">
                  ${ComparativoData.formatDelta(munAge.var_adu_pct, true, 2)}
                </span>
              </div>
            </div>

            <!-- Idosos 60+ -->
            <div class="comparativo-kpi-card">
              <span class="comparativo-kpi-label"><i class="fas fa-blind"></i> Idosos (60 anos ou mais)</span>
              <div class="comparativo-kpi-row">
                <span>Censo 2010:</span>
                <span class="comparativo-kpi-val">${ComparativoData.formatNumber(munAge.idosos_2010)} <small>(${munAge.pct_idosos_2010.toFixed(1)}%)</small></span>
              </div>
              <div class="comparativo-kpi-row">
                <span>Censo 2022:</span>
                <span class="comparativo-kpi-val">${ComparativoData.formatNumber(munAge.idosos_2022)} <small>(${munAge.pct_idosos_2022.toFixed(1)}%)</small></span>
              </div>
              <div class="comparativo-kpi-delta-box">
                <span class="comparativo-delta ${munAge.var_ido_abs >= 0 ? 'positive' : 'negative'}">
                  ${ComparativoData.formatDelta(munAge.var_ido_abs)}
                </span>
                <span class="comparativo-delta ${munAge.var_ido_pct >= 0 ? 'positive' : 'negative'}">
                  ${ComparativoData.formatDelta(munAge.var_ido_pct, true, 2)}
                </span>
              </div>
            </div>

            <!-- Índice de Envelhecimento -->
            <div class="comparativo-kpi-card" style="border-color: rgba(168, 85, 247, 0.4); background: rgba(168, 85, 247, 0.05);">
              <span class="comparativo-kpi-label" style="color: #c084fc;"><i class="fas fa-chart-line"></i> Índice de Envelhecimento</span>
              <div class="comparativo-kpi-row">
                <span>Censo 2010:</span>
                <span class="comparativo-kpi-val" style="color: #c084fc;">${munAge.indice_envelhecimento_2010.toFixed(2)}</span>
              </div>
              <div class="comparativo-kpi-row">
                <span>Censo 2022:</span>
                <span class="comparativo-kpi-val" style="color: #c084fc;">${munAge.indice_envelhecimento_2022.toFixed(2)}</span>
              </div>
              <div class="comparativo-kpi-delta-box">
                <span class="comparativo-delta positive" style="background: rgba(168, 85, 247, 0.2); color: #e9d5ff; border: 1px solid #a855f7;">
                  ${ComparativoData.formatDelta(munAge.var_indice_env, false, 2)} p.p.
                </span>
                <span style="font-size: 0.675rem; color: #cbd5e1; align-self: center;">Idosos p/ 100 Jovens</span>
              </div>
            </div>
          </div>

          <!-- GRÁFICO DINÂMICO DE ESTRUTURA ETÁRIA -->
          <div style="margin-top: 12px; background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span id="comparativo-chart-title" style="font-size: 0.75rem; font-weight: 600; color: #38bdf8;">
                <i class="fas fa-chart-bar" style="margin-right: 4px;"></i> Passo Fundo — Total Municipal
              </span>
              <button id="comparativo-chart-reset-btn" type="button" style="display: none; font-size: 0.675rem; padding: 2px 6px; border-radius: 4px; background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; color: #38bdf8; cursor: pointer;">
                <i class="fas fa-undo"></i> Ver Total Municipal
              </button>
            </div>
            <div style="position: relative; height: 190px; width: 100%;">
              <canvas id="comparativo-age-chart"></canvas>
            </div>
          </div>

          <!-- DOWNLOADS DIRETOS DO MÓDULO -->
          <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <a href="data/transicao-etaria-bairros-2010-2022.geojson" download="transicao_etaria_bairros_passo_fundo_2010_2022.geojson" class="comparativo-download-btn" style="text-align: center; text-decoration: none; padding: 6px 10px; background: rgba(56, 189, 248, 0.12); border: 1px solid #38bdf8; border-radius: 4px; color: #38bdf8; font-size: 0.725rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <i class="fas fa-download"></i> GeoJSON Transição
            </a>
            <a href="data/transicao-etaria-bairros-2010-2022.csv" download="transicao_etaria_bairros_passo_fundo_2010_2022.csv" class="comparativo-download-btn" style="text-align: center; text-decoration: none; padding: 6px 10px; background: rgba(168, 85, 247, 0.12); border: 1px solid #a855f7; border-radius: 4px; color: #c084fc; font-size: 0.725rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <i class="fas fa-file-csv"></i> CSV Transição
            </a>
          </div>
        </div>

        <div class="comparativo-note" style="margin-top: 10px;">
          <strong>Fontes Oficiais:</strong> IBGE Censo 2010 (Pessoa13_RS - Resultados do Universo / 15/06/2026) e IBGE Censo 2022 (Agregados por Setor Censitário).<br>
          <em>*Índice de Envelhecimento:</em> Razão entre o número de pessoas com 60 anos ou mais e a população de 0 a 14 anos, multiplicada por 100.
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
              Variação % Pop (10→22)
            </button>
            <button class="comparativo-theme-btn ${this.currentTheme === 'pop2022' ? 'active' : ''}" data-theme="pop2022">
              População 2022
            </button>
            <button class="comparativo-theme-btn ${this.currentTheme === 'pop2010' ? 'active' : ''}" data-theme="pop2010">
              População 2010
            </button>
            <button class="comparativo-theme-btn ${this.currentTheme === 'indice_env_2022' ? 'active' : ''}" data-theme="indice_env_2022">
              Índice Envelhecimento 2022
            </button>
            <button class="comparativo-theme-btn ${this.currentTheme === 'var_indice_env' ? 'active' : ''}" data-theme="var_indice_env">
              Δ Índice Envelhecimento
            </button>
            <button class="comparativo-theme-btn ${this.currentTheme === 'var_idosos_pct' ? 'active' : ''}" data-theme="var_idosos_pct">
              Crescimento Idosos %
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

        ${(() => {
          const trans = this.data.getTransicaoEtariaBairroById(id);
          if (!trans) return '';
          return `
            <div style="margin-top: 10px; padding: 10px; background: rgba(30, 41, 59, 0.7); border-radius: 6px; border: 1px solid rgba(168, 85, 247, 0.3);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 600; font-size: 0.775rem; color: #c084fc;">
                  <i class="fas fa-hourglass-half"></i> Transição Etária & Envelhecimento
                </span>
                <span style="background: rgba(168, 85, 247, 0.2); color: #e9d5ff; border: 1px solid #a855f7; padding: 2px 6px; border-radius: 4px; font-size: 0.675rem; font-weight: 600;">
                  ${trans.PERFIL_ETARIO_2022 || 'Em Transição'}
                </span>
              </div>

              <div class="comparativo-detail-grid">
                <div class="comparativo-detail-item">
                  <span>Jovens (0-14):</span>
                  <strong style="color: #f1f5f9;">${ComparativoData.formatNumber(trans.JOVENS_2010)} → ${ComparativoData.formatNumber(trans.JOVENS_2022)} <span style="color: ${trans.VAR_JOV_PCT >= 0 ? '#34d399' : '#f87171'}">(${ComparativoData.formatDelta(trans.VAR_JOV_PCT, true, 1)})</span></strong>
                </div>
                <div class="comparativo-detail-item">
                  <span>Adultos (15-59):</span>
                  <strong style="color: #f1f5f9;">${ComparativoData.formatNumber(trans.ADULTOS_2010)} → ${ComparativoData.formatNumber(trans.ADULTOS_2022)} <span style="color: ${trans.VAR_ADU_PCT >= 0 ? '#34d399' : '#f87171'}">(${ComparativoData.formatDelta(trans.VAR_ADU_PCT, true, 1)})</span></strong>
                </div>
                <div class="comparativo-detail-item">
                  <span>Idosos (60+):</span>
                  <strong style="color: #f1f5f9;">${ComparativoData.formatNumber(trans.IDOSOS_2010)} → ${ComparativoData.formatNumber(trans.IDOSOS_2022)} <span style="color: ${trans.VAR_IDO_PCT >= 0 ? '#34d399' : '#f87171'}">(${ComparativoData.formatDelta(trans.VAR_IDO_PCT, true, 1)})</span></strong>
                </div>
                <div class="comparativo-detail-item">
                  <span>Índice Envelhecimento:</span>
                  <strong style="color: #c084fc;">${trans.INDICE_ENV_2010.toFixed(1)} → ${trans.INDICE_ENV_2022.toFixed(1)} <span style="color: #e9d5ff">(${ComparativoData.formatDelta(trans.VAR_INDICE_ENV, false, 1)} p.p.)</span></strong>
                </div>
              </div>
            </div>
          `;
        })()}
      </div>
    `;

    // Atualiza gráfico dinâmico
    const transData = this.data.getTransicaoEtariaBairroById(id);
    this.renderAgeChart(transData);

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

  renderAgeChart(bairroTrans = null) {
    if (!window.Chart) {
      console.warn('[ComparativoCensoUI] Chart.js não está disponível.');
      return;
    }

    const canvas = this.container ? this.container.querySelector('#comparativo-age-chart') : document.getElementById('comparativo-age-chart');
    if (!canvas) return;

    const titleEl = this.container ? this.container.querySelector('#comparativo-chart-title') : null;
    const resetBtn = this.container ? this.container.querySelector('#comparativo-chart-reset-btn') : null;

    let chartTitle = 'Passo Fundo — Total Municipal';
    let data2010 = [];
    let data2022 = [];

    if (bairroTrans) {
      chartTitle = `${bairroTrans.ID_REGIAO} — ${bairroTrans.NOME_REGIAO}`;
      data2010 = [bairroTrans.JOVENS_2010 || 0, bairroTrans.ADULTOS_2010 || 0, bairroTrans.IDOSOS_2010 || 0];
      data2022 = [bairroTrans.JOVENS_2022 || 0, bairroTrans.ADULTOS_2022 || 0, bairroTrans.IDOSOS_2022 || 0];
      if (resetBtn) resetBtn.style.display = 'inline-flex';
    } else {
      const munAge = this.data.getTransicaoEtariaMunicipal();
      data2010 = [munAge.jovens_2010, munAge.adultos_2010, munAge.idosos_2010];
      data2022 = [munAge.jovens_2022, munAge.adultos_2022, munAge.idosos_2022];
      if (resetBtn) resetBtn.style.display = 'none';
    }

    if (titleEl) {
      titleEl.innerHTML = `<i class="fas fa-chart-bar" style="color: #38bdf8; margin-right: 4px;"></i> ${chartTitle}`;
    }

    if (this.ageChart) {
      this.ageChart.destroy();
      this.ageChart = null;
    }

    const ctx = canvas.getContext('2d');
    this.ageChart = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Jovens (0-14)', 'Adultos (15-59)', 'Idosos (60+)'],
        datasets: [
          {
            label: 'Censo 2010',
            data: data2010,
            backgroundColor: 'rgba(56, 189, 248, 0.75)',
            borderColor: '#38bdf8',
            borderWidth: 1.5,
            borderRadius: 4
          },
          {
            label: 'Censo 2022',
            data: data2022,
            backgroundColor: 'rgba(168, 85, 247, 0.75)',
            borderColor: '#a855f7',
            borderWidth: 1.5,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { size: 10, weight: '500' },
              boxWidth: 10,
              padding: 8
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 8,
            callbacks: {
              label: function(context) {
                const val = context.parsed.y || 0;
                return ` ${context.dataset.label}: ${val.toLocaleString('pt-BR')} hab`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 9 },
              callback: (val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
            }
          }
        }
      }
    });
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

    // Reset chart to municipal
    const resetBtn = this.container.querySelector('#comparativo-chart-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.selectBairro('', false);
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
