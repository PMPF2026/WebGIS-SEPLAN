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
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h2 class="analises-title" style="margin-bottom:0;">
            <i class="fas fa-layer-group"></i>
            <span>Análises Territoriais</span>
          </h2>
          <button type="button" id="btn-close-analises-territoriais" title="Fechar e voltar às Camadas" style="background:transparent; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer; padding:4px 8px; border-radius:4px;">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <p class="analises-subtitle" style="margin-top:6px;">
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

        <button type="button" class="analises-axis-btn ${this.activeAxis === 'iqeu' ? 'active' : ''}" data-axis="iqeu">
          <span class="axis-icon">📊</span>
          <span>5. IQEU-PF</span>
          <small style="font-size:0.65rem; opacity:0.8;">Qualidade do Entorno</small>
        </button>

        <button type="button" class="analises-axis-btn ${this.activeAxis === 'declividade' ? 'active' : ''}" data-axis="declividade">
          <span class="axis-icon">⛰️</span>
          <span>6. Declividade</span>
          <small style="font-size:0.65rem; opacity:0.8;">Relevo, Mobilidade &amp; Erosão</small>
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
      case 'iqeu':
        return this.getIqeuHtml();
      case 'declividade':
        return this.getDeclividadeHtml();
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

      <!-- CARD 3: DEMOGRAFIA PCD & AUTISMO (CENSO IBGE 2022) -->
      <div class="analises-card">
        <div class="analises-card-title">
          <span>👥 População com Deficiência (PcD) &amp; Autismo (TEA)</span>
          <span class="analises-bairro-badge badge-moderate">Censo 2022</span>
        </div>
        <p class="analises-card-desc">
          Dados oficiais do <strong>Censo Demográfico IBGE 2022</strong> (Amostra / Metodologia Washington Group e Lei Federal nº 13.861/2019) para o município de Passo Fundo:
        </p>

        <div class="analises-kpi-grid">
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Locomoção / Membros Inf.</div>
            <div class="analises-kpi-value" style="color: #38bdf8;">4.684</div>
            <div class="analises-kpi-sub">Cadeirantes / Próteses</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Total PcD (&ge; 2 anos)</div>
            <div class="analises-kpi-value" style="color: #a855f7;">13.412</div>
            <div class="analises-kpi-sub">6,7% da população</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">Autismo (TEA)</div>
            <div class="analises-kpi-value" style="color: #34d399;">2.803</div>
            <div class="analises-kpi-sub">1,4% (Diagnóstico médico)</div>
          </div>
          <div class="analises-kpi-item">
            <div class="analises-kpi-label">PcDs Idosas (60+ anos)</div>
            <div class="analises-kpi-value" style="color: #f59e0b;">6.451</div>
            <div class="analises-kpi-sub">48,1% do total de PcDs</div>
          </div>
        </div>

        <div style="margin-top: 8px;">
          <div style="font-size: 0.72rem; font-weight: 600; color: #cbd5e1; margin-bottom: 6px;">
            Dificuldades Funcionais Severas (Passo Fundo):
          </div>
          <div class="analises-stat-row">
            <span class="analises-stat-label">👁️ Dificuldade para enxergar (Visual)</span>
            <span class="analises-stat-val">7.060 pessoas</span>
          </div>
          <div class="analises-stat-row">
            <span class="analises-stat-label">♿ Dificuldade para andar/subir degraus (Motora)</span>
            <span class="analises-stat-val" style="color:#38bdf8;">4.684 pessoas</span>
          </div>
          <div class="analises-stat-row">
            <span class="analises-stat-label">👂 Dificuldade para ouvir (Auditiva)</span>
            <span class="analises-stat-val">2.806 pessoas</span>
          </div>
          <div class="analises-stat-row">
            <span class="analises-stat-label">🧠 Cognitiva / Funções mentais / Comunicação</span>
            <span class="analises-stat-val">2.703 pessoas</span>
          </div>
          <div class="analises-stat-row">
            <span class="analises-stat-label">🖐️ Coordenação motora fina (pegar objetos)</span>
            <span class="analises-stat-val">2.687 pessoas</span>
          </div>
        </div>

        <!-- NOTA METODOLÓGICA E LINKS OFICIAIS DE AUDITORIA -->
        <div class="analises-source-box">
          <div class="analises-source-title">
            <i class="fas fa-certificate"></i>
            <span>Nota Metodológica &amp; Auditoria Oficial</span>
          </div>
          <div>
            Dados municipais apurados pelo <strong>IBGE — Censo Demográfico 2022</strong> (<em>Resultados preliminares da amostra</em>). Categorias de deficiência segundo as diretrizes internacionais do <em>Washington Group on Disability Statistics</em> e autismo conforme a <strong>Lei Federal nº 13.861/2019</strong>. Dados sujeitos a eventuais refinamentos residuais na publicação final dos microdados.
          </div>
          <div class="analises-source-links">
            <a href="https://sidra.ibge.gov.br/tabela/10127" target="_blank" rel="noopener noreferrer" class="analises-source-link" title="Consultar no portal SIDRA/IBGE">
              <i class="fas fa-external-link-alt"></i>
              <span>SIDRA Tabela 10127 — Pessoas com deficiência por tipo de dificuldade</span>
            </a>
            <a href="https://sidra.ibge.gov.br/tabela/10125" target="_blank" rel="noopener noreferrer" class="analises-source-link" title="Consultar no portal SIDRA/IBGE">
              <i class="fas fa-external-link-alt"></i>
              <span>SIDRA Tabela 10125 — População com deficiência por sexo e grupos de idade</span>
            </a>
            <a href="https://sidra.ibge.gov.br/tabela/10145" target="_blank" rel="noopener noreferrer" class="analises-source-link" title="Consultar no portal SIDRA/IBGE">
              <i class="fas fa-external-link-alt"></i>
              <span>SIDRA Tabela 10145 — População diagnosticada com Autismo (TEA)</span>
            </a>
            <a href="https://servicodados.ibge.gov.br/api/v3/agregados/10127/periodos/2022/variaveis/12785?localidades=N6[4314100]&classificacao=1509[all]" target="_blank" rel="noopener noreferrer" class="analises-source-link" title="Consultar JSON na API do IBGE">
              <i class="fas fa-code"></i>
              <span>API Serviço de Dados IBGE (Passo Fundo - 4314100 em JSON)</span>
            </a>
          </div>
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

  getIqeuHtml() {
    const sorted = [...this.data].sort((a, b) => (b.iqeu || 0) - (a.iqeu || 0));
    const mediaGeral = 74.18;
    const lider = sorted[0];
    const menor = sorted[sorted.length - 1];

    return `
      <div class="analises-card">
        <div class="analises-card-title">
          <span>📊 5. Índice de Qualidade do Entorno Urbano (IQEU-PF)</span>
        </div>
        <p class="analises-card-desc">
          Indicador sintético composto (escore de 0 a 100) integrando <strong>7 variáveis do Censo IBGE 2022</strong>: Pavimentação (20%), Calçadas (20%), Rampas (15%), Bueiros (15%), Iluminação (10%), Arborização (10%) e Penalidade por Obstáculos (10%).
        </p>

        <div class="analises-kpi-grid">
          <div class="analises-kpi-card">
            <span class="analises-kpi-label">MÉDIA MUNICIPAL</span>
            <span class="analises-kpi-val" style="color:#38bdf8;">${mediaGeral.toFixed(2)}</span>
            <span class="analises-kpi-sub">Classe B &bull; 69.176 Dom.</span>
          </div>
          <div class="analises-kpi-card">
            <span class="analises-kpi-label">LÍDER MUNICIPAL</span>
            <span class="analises-kpi-val" style="color:#34d399;">${lider ? (lider.iqeu ? lider.iqeu.toFixed(2) : '87.93') : '--'}</span>
            <span class="analises-kpi-sub">${lider ? lider.bairro : 'Centro'} (Classe A)</span>
          </div>
          <div class="analises-kpi-card">
            <span class="analises-kpi-label">MENOR ESCORE</span>
            <span class="analises-kpi-val" style="color:#fb7185;">${menor ? (menor.iqeu ? menor.iqeu.toFixed(2) : '65.37') : '--'}</span>
            <span class="analises-kpi-sub">${menor ? menor.bairro : 'Zachia'} (Classe C)</span>
          </div>
          <div class="analises-kpi-card">
            <span class="analises-kpi-label">DISPARIDADE</span>
            <span class="analises-kpi-val" style="color:#f59e0b;">22.56</span>
            <span class="analises-kpi-sub">Delta Centro-Periferia</span>
          </div>
        </div>

        <button type="button" class="analises-activate-btn" id="btn-activate-iqeu-layers">
          <i class="fas fa-layer-group"></i>
          <span>Ativar Camadas do Entorno no Mapa</span>
        </button>
      </div>

      <div class="analises-card">
        <div class="analises-card-title">
          <span>🏆 Ranking de Qualidade do Entorno por Bairro</span>
          <span style="font-size:0.7rem; color:#94a3b8;">IQEU [0-100]</span>
        </div>
        <div class="analises-bairros-list">
          ${sorted.map((b, idx) => {
            const score = b.iqeu || 70.0;
            let badgeClass = 'badge-moderate';
            let classeLabel = 'Classe B';
            if (score >= 80.0) {
              badgeClass = 'badge-low';
              classeLabel = 'Classe A';
            } else if (score < 70.0) {
              badgeClass = 'badge-critical';
              classeLabel = 'Classe C';
            }

            let gargaloDesc = 'Equilibrado';
            if (b.pctRampa < 5.0) gargaloDesc = `Falta de Rampas (${b.pctRampa.toFixed(1)}%)`;
            else if (b.pctBueiro < 70.0) gargaloDesc = `Falta de Bueiros (${b.pctBueiro.toFixed(1)}%)`;
            else if (b.pctArbor < 50.0) gargaloDesc = `Deserto Verde (${b.pctArbor.toFixed(1)}%)`;
            else if (b.pctCalcada < 80.0) gargaloDesc = `Pouca Calçada (${b.pctCalcada.toFixed(1)}%)`;
            else if (b.pctNaoPavi > 5.0) gargaloDesc = `Vias de Terra (${b.pctNaoPavi.toFixed(1)}%)`;

            return `
              <div class="analises-bairro-item" data-bairro="${b.bairro}">
                <div class="analises-bairro-info">
                  <span class="analises-bairro-name">${idx + 1}º ${b.bairro} (${b.setorId})</span>
                  <span class="analises-bairro-sub">${classeLabel} &bull; Gargalo: <strong>${gargaloDesc}</strong></span>
                </div>
                <span class="analises-bairro-badge ${badgeClass}">${score.toFixed(2)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  getDeclividadeHtml() {
    const sorted = [...this.data].sort((a, b) => (b.slopeMediaPct || 0) - (a.slopeMediaPct || 0));
    const topDesnível = [...this.data].sort((a, b) => (b.ampAltimetrica || 0) - (a.ampAltimetrica || 0));
    const roselandia = topDesnível[0];
    const petropolis = [...this.data].find(b => b.bairro.includes('Petr')) || this.data[1];

    return `
      <div class="analises-card">
        <div class="analises-card-title">
          <span>⛰️ 6. Declividade do Relevo vs. Mobilidade &amp; Erosão</span>
        </div>
        <p class="analises-card-desc">
          Cruzamento da topografia do município (<strong>DEM 28,5m e Curvas de Nível de 10m</strong>) com barreiras de acessibilidade da <strong>NBR 9050 (declividade longitudinal &gt; 8,33%)</strong> e potencial de ravinamento/erosão em vias não pavimentadas (&gt; 15%).
        </p>

        <div class="analises-kpi-grid">
          <div class="analises-kpi-card">
            <span class="analises-kpi-label">MAIOR DESNÍVEL</span>
            <span class="analises-kpi-val" style="color:#2dd4bf;">${roselandia ? roselandia.ampAltimetrica.toFixed(1) : '152.4'} m</span>
            <span class="analises-kpi-sub">${roselandia ? roselandia.bairro : 'Roselândia'} (577m a 730m)</span>
          </div>
          <div class="analises-kpi-card">
            <span class="analises-kpi-label">RAMPA MÁXIMA</span>
            <span class="analises-kpi-val" style="color:#fb7185;">${petropolis ? petropolis.slopeMaxPct.toFixed(1) : '38.0'}%</span>
            <span class="analises-kpi-sub">${petropolis ? petropolis.bairro : 'Petrópolis'} (Pico de rampa)</span>
          </div>
          <div class="analises-kpi-card">
            <span class="analises-kpi-label">ÁREA > 8%</span>
            <span class="analises-kpi-val" style="color:#a78bfa;">44,6%</span>
            <span class="analises-kpi-sub">Barreira NBR 9050</span>
          </div>
          <div class="analises-kpi-card">
            <span class="analises-kpi-label">DECLIVIDADE MÉDIA</span>
            <span class="analises-kpi-val" style="color:#fbbf24;">8,1%</span>
            <span class="analises-kpi-sub">Relevo Ondulado</span>
          </div>
        </div>

        <button type="button" class="analises-activate-btn" id="btn-activate-declividade-layers">
          <i class="fas fa-layer-group"></i>
          <span>Ativar Hipsometria e Curvas no Mapa</span>
        </button>
      </div>

      <div class="analises-card">
        <div class="analises-card-title">
          <span>⚠️ Bairros com Relevo Crítico</span>
          <span style="font-size:0.7rem; color:#94a3b8;">Decliv. Máx.</span>
        </div>
        <div class="analises-bairros-list">
          ${sorted.slice(0, 10).map(b => {
            const slope = b.slopeMediaPct || 8.0;
            const gt8 = b.pctDeclivGt8 || 40.0;
            const amp = b.ampAltimetrica || 60.0;

            let badgeClass = 'badge-moderate';
            if (slope >= 9.0 || gt8 > 50.0) badgeClass = 'badge-critical';
            else if (slope >= 8.3) badgeClass = 'badge-high';

            return `
              <div class="analises-bairro-item" data-bairro="${b.bairro}">
                <div class="analises-bairro-info">
                  <span class="analises-bairro-name">${b.bairro} (${b.setorId})</span>
                  <span class="analises-bairro-sub">Decliv. Méd: <strong>${slope.toFixed(1)}%</strong> &bull; Desnível: <strong>${amp.toFixed(1)} m</strong> &bull; ${gt8.toFixed(1)}% &gt; 8%</span>
                </div>
                <span class="analises-bairro-badge ${badgeClass}">${b.slopeMaxPct ? b.slopeMaxPct.toFixed(1) + '%' : slope.toFixed(1) + '%'}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 1. Alternador dos 6 Eixos Temáticos
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

    const btnIqeu = document.getElementById('btn-activate-iqeu-layers');
    if (btnIqeu) {
      btnIqeu.addEventListener('click', () => {
        this.activateLayers(['entorno_calcadas', 'entorno_rampas', 'entorno_pavimentacao', 'bairros']);
      });
    }

    const btnDecliv = document.getElementById('btn-activate-declividade-layers');
    if (btnDecliv) {
      btnDecliv.addEventListener('click', () => {
        this.activateLayers(['curvas_nivel_10m', 'hipsometria_relevo', 'malha_viaria', 'bairros']);
      });
    }

    // 4. Botão fechar painel e voltar para Camadas
    const btnClose = this.container.querySelector('#btn-close-analises-territoriais');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        if (this.sidebarUI) {
          this.sidebarUI.switchTab('camadas');
        }
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
