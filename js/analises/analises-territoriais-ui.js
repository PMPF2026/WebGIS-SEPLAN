/**
 * WebGIS SEPLAN Passo Fundo - Diagnósticos Territoriais
 * Módulo de Interface do Usuário: Análises Territoriais Integradas (Censo 2022)
 */

import { ANALISES_TERRITORIAIS_DATA } from './analises-data.js';

export class AnalisesTerritoriaisUI {
  constructor(mapEngine, layerManager, sidebarUI) {
    this.mapEngine = mapEngine;
    this.map = mapEngine ? mapEngine.getOlMap() : null;
    this.layerManager = layerManager;
    this.sidebarUI = sidebarUI;

    this.container = null;
    this.activeAxis = 'acessibilidade'; // 'acessibilidade', 'drenagem', 'arborizacao', 'pavimentacao'
    this.data = ANALISES_TERRITORIAIS_DATA;
  }

  async init() {
    this.container = document.getElementById('analises-territoriais-container');
    if (!this.container) {
      console.warn('[AnalisesTerritoriaisUI] Container #analises-territoriais-container não localizado.');
      return;
    }

    this.render();
  }

  switchAxis(axisId) {
    this.activeAxis = axisId;
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="analises-header">
        <h2 class="analises-title">
          <i class="fas fa-layer-group"></i>
          <span>Análises Territoriais</span>
        </h2>
        <p class="analises-subtitle">
          Inteligência espacial e cruzamento de indicadores temáticos baseados no <strong>Censo Demográfico IBGE 2022</strong>.
        </p>
      </div>

      <!-- Navegação entre os 4 Eixos Temáticos -->
      <nav class="analises-axes-nav" aria-label="Eixos de Análise Territorial">
        <button type="button" class="analises-axis-btn ${this.activeAxis === 'acessibilidade' ? 'active' : ''}" data-axis="acessibilidade">
          <span class="axis-icon">♿</span>
          <span>1. Acessibilidade</span>
          <small style="font-size:0.65rem; opacity:0.8;">Idosos & Calçadas</small>
        </button>

        <button type="button" class="analises-axis-btn ${this.activeAxis === 'drenagem' ? 'active' : ''}" data-axis="drenagem">
          <span class="axis-icon">🌊</span>
          <span>2. Drenagem</span>
          <small style="font-size:0.65rem; opacity:0.8;">Resiliência & Bueiros</small>
        </button>

        <button type="button" class="analises-axis-btn ${this.activeAxis === 'arborizacao' ? 'active' : ''}" data-axis="arborizacao">
          <span class="axis-icon">🌳</span>
          <span>3. Arborização</span>
          <small style="font-size:0.65rem; opacity:0.8;">Clima & Ilhas de Calor</small>
        </button>

        <button type="button" class="analises-axis-btn ${this.activeAxis === 'pavimentacao' ? 'active' : ''}" data-axis="pavimentacao">
          <span class="axis-icon">🚜</span>
          <span>4. Pavimentação</span>
          <small style="font-size:0.65rem; opacity:0.8;">Malha & Conectividade</small>
        </button>
      </nav>

      <!-- Conteúdo Dinâmico do Eixo Selecionado -->
      <div class="analises-axis-content" id="analises-axis-content">
        ${this.getAxisHtml(this.activeAxis)}
      </div>

      <div class="analises-footer">
        SEPLAN Passo Fundo &bull; Censo IBGE 2022 &bull; 23 Regiões Urbanas
      </div>
    `;

    this.bindEvents();
  }

  getAxisHtml(axisId) {
    switch (axisId) {
      case 'acessibilidade':
        return this.getAcessibilidadeHtml();
      case 'drenagem':
        return this.getDrenagemHtml();
      case 'arborizacao':
        return this.getArborizacaoHtml();
      case 'pavimentacao':
        return this.getPavimentacaoHtml();
      default:
        return '';
    }
  }

  getAcessibilidadeHtml() {
    const topCríticos = [...this.data].sort((a, b) => b.irpi - a.irpi).slice(0, 5);

    return `
      <div class="analises-card">
        <div class="analises-card-title">
          <span>♿ Acessibilidade Ativa & Cidade Amiga do Idoso</span>
          <span class="analises-bairro-badge badge-critical">IRPI</span>
        </div>
        <p class="analises-card-desc">
          Cruza a proporção de <strong>munícipes idosos (60+ anos)</strong> com os déficits físicos de acessibilidade (ausência de rampas, calçadas obstruídas e desníveis).
        </p>

        <div class="analises-kpi-grid">
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">População Idosa</div>
            <div class="analises-kpi-value">37.135</div>
            <div class="analises-kpi-sub">17,8% da cidade</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Idosos em Alto Risco</div>
            <div class="analises-kpi-value" style="color: #f43f5e;">22.846</div>
            <div class="analises-kpi-sub">61,5% dos idosos</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Déficit de Rampas</div>
            <div class="analises-kpi-value" style="color: #f59e0b;">83,5%</div>
            <div class="analises-kpi-sub">Sem guia rebaixada</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Calçadas Obstruídas</div>
            <div class="analises-kpi-value">68,2%</div>
            <div class="analises-kpi-sub">Degraus e postes</div>
          </div>
        </div>

        <div class="analises-actions">
          <button type="button" class="analises-btn-action analises-btn-primary" id="btn-activate-acessibilidade-layers">
            <i class="fas fa-eye"></i>
            <span>Ativar Camadas de Acessibilidade no Mapa</span>
          </button>
        </div>
      </div>

      <div class="analises-card">
        <div class="analises-card-title">
          <span>🚨 Bairros Mais Críticos (Prioridade Máxima)</span>
          <span style="font-size:0.7rem; color:#94a3b8;">Score IRPI</span>
        </div>
        <div class="analises-bairros-list">
          ${topCríticos.map(b => `
            <div class="analises-bairro-item" data-bairro="${b.bairro}">
              <div class="analises-bairro-info">
                <span class="analises-bairro-name">${b.bairro} (${b.setorId})</span>
                <span class="analises-bairro-sub">${b.pctIdosos.toFixed(1)}% idosos &bull; Rampas: ${b.pctRampa.toFixed(1)}%</span>
              </div>
              <span class="analises-bairro-badge badge-critical">${b.irpi.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  getDrenagemHtml() {
    const topCríticos = [...this.data].sort((a, b) => b.pes - a.pes).slice(0, 5);

    return `
      <div class="analises-card">
        <div class="analises-card-title">
          <span>🌊 Resiliência Climática & Drenagem Urbana</span>
          <span class="analises-bairro-badge badge-high">PES</span>
        </div>
        <p class="analises-card-desc">
          Modelagem da <strong>Pressão de Escoamento Superficial (PES)</strong> combinando a taxa de impermeabilização (asfalto) com o déficit de bocas de lobo e relevo.
        </p>

        <div class="analises-kpi-grid">
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Sem Microdrenagem</div>
            <div class="analises-kpi-value" style="color: #38bdf8;">22.464</div>
            <div class="analises-kpi-sub">Moradores em risco</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Pior Vulnerabilidade</div>
            <div class="analises-kpi-value" style="color: #a855f7; font-size:0.95rem;">Vila Rodrigues</div>
            <div class="analises-kpi-sub">43,6% sem bueiro</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Bairros em Alerta</div>
            <div class="analises-kpi-value" style="color: #f43f5e;">6</div>
            <div class="analises-kpi-sub">Risco Alto/Extremo</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Impermeabilidade</div>
            <div class="analises-kpi-value">96,8%</div>
            <div class="analises-kpi-sub">Vias pavimentadas</div>
          </div>
        </div>

        <div class="analises-actions">
          <button type="button" class="analises-btn-action analises-btn-primary" id="btn-activate-drenagem-layers">
            <i class="fas fa-eye"></i>
            <span>Ativar Camadas de Drenagem no Mapa</span>
          </button>
        </div>
      </div>

      <div class="analises-card">
        <div class="analises-card-title">
          <span>⚠️ Bairros com Maior Sobrecarga de Enxurrada</span>
          <span style="font-size:0.7rem; color:#94a3b8;">Score PES</span>
        </div>
        <div class="analises-bairros-list">
          ${topCríticos.map(b => `
            <div class="analises-bairro-item" data-bairro="${b.bairro}">
              <div class="analises-bairro-info">
                <span class="analises-bairro-name">${b.bairro} (${b.setorId})</span>
                <span class="analises-bairro-sub">Bueiros: ${b.pctBueiro.toFixed(1)}% &bull; ${b.popSemDrenagem.toLocaleString('pt-BR')} hab. sem bueiro</span>
              </div>
              <span class="analises-bairro-badge badge-high">${b.pes.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  getArborizacaoHtml() {
    const topCríticos = [...this.data].sort((a, b) => a.pctArbor - b.pctArbor).slice(0, 5);

    return `
      <div class="analises-card">
        <div class="analises-card-title">
          <span>🌳 Cobertura Arbórea & Desertos Verdes</span>
          <span class="analises-bairro-badge badge-good">IVTDV</span>
        </div>
        <p class="analises-card-desc">
          Identifica <strong>desertos verdes</strong> e ilhas de calor onde o asfalto é contínuo e a presença de árvores viárias é nula ou deficiente.
        </p>

        <div class="analises-kpi-grid">
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Pop. sem Árvores</div>
            <div class="analises-kpi-value" style="color: #f59e0b;">60.187</div>
            <div class="analises-kpi-sub">28,9% da cidade</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Deserto Crítico</div>
            <div class="analises-kpi-value" style="color: #f43f5e; font-size:0.95rem;">Santa Marta</div>
            <div class="analises-kpi-sub">Apenas 39,6% árvores</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Ilha de Calor Central</div>
            <div class="analises-kpi-value">11.065</div>
            <div class="analises-kpi-sub">Hab. Centro sem árvore</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Bairro Mais Verde</div>
            <div class="analises-kpi-value" style="color: #10b981; font-size:0.95rem;">Alviverde</div>
            <div class="analises-kpi-sub">86,2% arborizado</div>
          </div>
        </div>

        <div class="analises-actions">
          <button type="button" class="analises-btn-action analises-btn-primary" id="btn-activate-arborizacao-layers">
            <i class="fas fa-eye"></i>
            <span>Ativar Camadas de Arborização no Mapa</span>
          </button>
        </div>
      </div>

      <div class="analises-card">
        <div class="analises-card-title">
          <span>🏜️ Bairros com Menor Arborização Viária</span>
          <span style="font-size:0.7rem; color:#94a3b8;">% Árvores</span>
        </div>
        <div class="analises-bairros-list">
          ${topCríticos.map(b => `
            <div class="analises-bairro-item" data-bairro="${b.bairro}">
              <div class="analises-bairro-info">
                <span class="analises-bairro-name">${b.bairro} (${b.setorId})</span>
                <span class="analises-bairro-sub">Arborização: ${b.pctArbor.toFixed(1)}% &bull; ${b.popSemArvore.toLocaleString('pt-BR')} hab. sem sombra</span>
              </div>
              <span class="analises-bairro-badge ${b.pctArbor < 50 ? 'badge-critical' : 'badge-high'}">${b.pctArbor.toFixed(1)}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  getPavimentacaoHtml() {
    const topCríticos = [...this.data].sort((a, b) => b.ipp - a.ipp).slice(0, 5);

    return `
      <div class="analises-card">
        <div class="analises-card-title">
          <span>🚜 Plano de Pavimentação & Expansão</span>
          <span class="analises-bairro-badge badge-high">IPP</span>
        </div>
        <p class="analises-card-desc">
          Priorização técnica de pavimentação cruzando <strong>extensão em terra</strong>, <strong>famílias beneficiadas</strong> e o <strong>crescimento demográfico</strong> (2010→2022).
        </p>

        <div class="analises-kpi-grid">
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Famílias em Terra</div>
            <div class="analises-kpi-value" style="color: #f59e0b;">1.516</div>
            <div class="analises-kpi-sub">Domicílios urbanos</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Extensão Total</div>
            <div class="analises-kpi-value" style="color: #f43f5e;">48,2 km</div>
            <div class="analises-kpi-sub">438 faces de quadra</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Top 3 Bairros</div>
            <div class="analises-kpi-value">57,5%</div>
            <div class="analises-kpi-sub">871 famílias em 3 bairros</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Custo Estimado</div>
            <div class="analises-kpi-value" style="color: #10b981; font-size:0.95rem;">R$ 86,7 mi</div>
            <div class="analises-kpi-sub">Para zerar o chão batido</div>
          </div>
        </div>

        <div class="analises-actions">
          <button type="button" class="analises-btn-action analises-btn-primary" id="btn-activate-pavimentacao-layers">
            <i class="fas fa-eye"></i>
            <span>Ativar Camadas de Pavimentação no Mapa</span>
          </button>
        </div>
      </div>

      <div class="analises-card">
        <div class="analises-card-title">
          <span>🎯 Bairros com Maior Prioridade de Asfalto</span>
          <span style="font-size:0.7rem; color:#94a3b8;">Score IPP</span>
        </div>
        <div class="analises-bairros-list">
          ${topCríticos.map(b => `
            <div class="analises-bairro-item" data-bairro="${b.bairro}">
              <div class="analises-bairro-info">
                <span class="analises-bairro-name">${b.bairro} (${b.setorId})</span>
                <span class="analises-bairro-sub">${b.paviNao} famílias em terra &bull; ${b.kmNaoPavi.toFixed(2)} km (R$ ${b.custoMilhoes.toFixed(2)} mi)</span>
              </div>
              <span class="analises-bairro-badge ${b.ipp > 100 ? 'badge-critical' : 'badge-high'}">${b.ipp.toFixed(1)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 1. Alternador dos 4 Eixos Temáticos
    const navButtons = this.container.querySelectorAll('.analises-axis-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const axis = btn.getAttribute('data-axis');
        if (axis) this.switchAxis(axis);
      });
    });

    // 2. Clique nos bairros para zoom no mapa
    const bairroItems = this.container.querySelectorAll('.analises-bairro-item');
    bairroItems.forEach(item => {
      item.addEventListener('click', () => {
        const bName = item.getAttribute('data-bairro');
        if (bName) this.zoomToBairro(bName);
      });
    });

    // 3. Botões de ativação de camadas no mapa
    const btnAces = document.getElementById('btn-activate-acessibilidade-layers');
    if (btnAces) {
      btnAces.addEventListener('click', () => {
        this.activateLayers(['entorno_calcadas', 'entorno_rampas', 'censo_m60_2022', 'bairros']);
      });
    }

    const btnDren = document.getElementById('btn-activate-drenagem-layers');
    if (btnDren) {
      btnDren.addEventListener('click', () => {
        this.activateLayers(['entorno_bueiros', 'rio_passo_fundo', 'malha_hidrica', 'bairros']);
      });
    }

    const btnArbor = document.getElementById('btn-activate-arborizacao-layers');
    if (btnArbor) {
      btnArbor.addEventListener('click', () => {
        this.activateLayers(['entorno_arborizacao', 'areas_verdes', 'pracas', 'bairros']);
      });
    }

    const btnPavi = document.getElementById('btn-activate-pavimentacao-layers');
    if (btnPavi) {
      btnPavi.addEventListener('click', () => {
        this.activateLayers(['entorno_pavimentacao', 'malha_viaria', 'bairros']);
      });
    }
  }

  async activateLayers(layerIds) {
    if (!this.layerManager) return;
    for (const id of layerIds) {
      const cb = document.querySelector(`.layer-checkbox[data-layer-id="${id}"]`);
      if (cb) cb.checked = true;
      await this.layerManager.setLayerVisibility(id, true);
    }
  }

  zoomToBairro(bairroName) {
    if (!this.mapEngine || !this.layerManager) return;
    const bairrosLayer = this.layerManager.layers.get('bairros');
    if (!bairrosLayer) return;

    const source = bairrosLayer.getSource();
    if (!source) return;

    const norm = (s) => (s || '').replace(/[^\p{L}\p{Nd}]/gu, '').toLowerCase();
    const targetNorm = norm(bairroName);

    const features = source.getFeatures();
    const feat = features.find(f => {
      const p = f.getProperties();
      return norm(p.Nome || p.nome || p.NOME || p.bairro) === targetNorm;
    });

    if (feat && feat.getGeometry()) {
      const geom = feat.getGeometry();
      const extent = geom.getExtent();
      const olMap = this.mapEngine.getOlMap();
      if (olMap && olMap.getView()) {
        olMap.getView().fit(extent, { duration: 700, padding: [60, 60, 60, 60] });
      }
    }
  }
}
