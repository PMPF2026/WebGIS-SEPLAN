/**
 * WebGIS SEPLAN Passo Fundo - Diagnósticos Territoriais
 * Módulo de Visualização Analítica e Gráficos Estatísticos (Chart.js)
 * 
 * Análises territoriais oficiais auditadas:
 * 1. Extensão da Infraestrutura Viária (Donut / Rosca)
 * 2. Extensão da Rede Hidrográfica Municipal (Donut / Rosca)
 * 3. Densidade Setorial - hab/km² (Barras / Histograma)
 * 4. Estrutura Etária da População - Censo 2022 (Barras)
 * 5. Distribuição da Renda Média Domiciliar por Setor (Barras)
 */

import { formatNumber } from '../utils/formatters.js';
import { BAIRROS_DEMOGRAFIA } from './demographics-bairros.js';
import { EDUCACAO_BAIRROS, EDUCACAO_GENERO, EDUCACAO_RACA, EDUCACAO_IDADE, EDUCACAO_MUNICIPAL } from './demographics-education.js';

export const METRICS_ANALYTICAL_DATA = {
  roads: {
    labels: ['Malha Urbana', 'Estradas Rurais', 'Rod. Estaduais', 'Rod. Federais', 'Ferrovia'],
    data: [1501.61, 285.29, 66.86, 50.29, 55.29],
    colors: ['#64748b', '#d97706', '#ea580c', '#dc2626', '#334155'],
    total: 1959.34,
    unit: 'km'
  },
  hydro: {
    labels: ['Rio Passo Fundo', 'Demais Cursos d\'Água'],
    data: [19.76, 1654.98],
    colors: ['#0284c7', '#38bdf8'],
    total: 1674.74,
    trechos: 3682,
    unit: 'km'
  },
  density: {
    labels: ['<50', '50-500', '500-2k', '2k-5k', '>5k'],
    data: [23, 13, 42, 110, 133],
    colors: ['#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000'],
    total: 321,
    unit: 'setores'
  },
  age: {
    labels: ['0 a 4', '5 a 9', '10 a 14', '15 a 19', '20 a 24', '25 a 29', '30 a 39', '40 a 49', '50 a 59', '60 a 69', '70+'],
    homens: [6392, 6762, 6330, 6275, 7910, 8206, 16125, 13677, 11028, 8494, 6067],
    mulheres: [6064, 6407, 6191, 6212, 8390, 8600, 17185, 15082, 13188, 11238, 9508],
    totalPorFaixa: [12482, 13200, 12560, 12533, 16337, 16830, 33328, 28767, 24234, 19750, 15606],
    total: 205710,
    totalHomens: 97467,
    totalMulheres: 108243,
    pctHomens: 47.38,
    pctMulheres: 52.62,
    razaoSexo: 90.04,
    indiceEnvelhecimento: 92.45,
    unit: 'habitantes'
  },
  income: {
    labels: ['< R$ 2k', 'R$ 2k-3k', 'R$ 3k-4.5k', 'R$ 4.5k-7k', '> R$ 7k'],
    data: [25, 107, 84, 70, 21],
    colors: ['#d73027', '#fc8d59', '#fee090', '#91bfdb', '#4575b4'],
    total: 307,
    media: 3895.50,
    unit: 'setores'
  },
  bairros: {
    data: BAIRROS_DEMOGRAFIA,
    total: 24,
    maiorEnvelhecimento: { nome: 'Centro e Vila Vergueiro', valor: 205.49 },
    menorEnvelhecimento: { nome: 'José Alexandre Zachia', valor: 40.97 }
  },
  educacao: {
    bairros: EDUCACAO_BAIRROS,
    genero: EDUCACAO_GENERO,
    raca: EDUCACAO_RACA,
    idade: EDUCACAO_IDADE,
    municipal: EDUCACAO_MUNICIPAL
  }
};

export class MetricsCharts {
  constructor(layerManager, mapEngine) {
    this.layerManager = layerManager;
    this.mapEngine = mapEngine;
    this.activeBairrosMetric = {
      sidebar: 'envelhecimento',
      modal: 'envelhecimento'
    };
    this.activeEducacaoDimension = {
      sidebar: 'bairros',
      modal: 'bairros'
    };
    this.charts = {
      sidebar: {},
      modal: {}
    };
  }

  /**
   * Retorna o HTML estruturado dos cards de gráficos para a barra lateral
   */
  getSidebarChartsHtml() {
    return `
      <div class="metrics-charts-section">
        <div class="metrics-charts-section-title">
          <span><i class="lucide-bar-chart-2"></i> Gráficos Analíticos</span>
          <span class="chart-badge">Passo Fundo</span>
        </div>

        <!-- 1. Infraestrutura Viária -->
        <div class="chart-card" style="margin-bottom: 12px;">
          <div class="chart-card-header">
            <span class="chart-card-title">
              <i class="lucide-pie-chart" style="color: var(--dc-orange-primary);"></i>
              Extensão da Infraestrutura Viária
            </span>
            <span class="chart-badge">${formatNumber(METRICS_ANALYTICAL_DATA.roads.total, 2)} km</span>
          </div>
          <div class="chart-wrapper" style="height: 190px;">
            <canvas id="chart-roads-sidebar"></canvas>
          </div>
        </div>

        <!-- 2. Rede Hidrográfica -->
        <div class="chart-card" style="margin-bottom: 12px;">
          <div class="chart-card-header">
            <span class="chart-card-title">
              <i class="lucide-droplet" style="color: #38bdf8;"></i>
              Extensão da Rede Hidrográfica
            </span>
            <span class="chart-badge">${formatNumber(METRICS_ANALYTICAL_DATA.hydro.total, 2)} km</span>
          </div>
          <div class="chart-wrapper" style="height: 180px;">
            <canvas id="chart-hydro-sidebar"></canvas>
          </div>
        </div>

        <!-- 3. Densidade Setorial -->
        <div class="chart-card" style="margin-bottom: 12px;">
          <div class="chart-card-header">
            <span class="chart-card-title">
              <i class="lucide-bar-chart" style="color: #ea580c;"></i>
              Densidade Setorial (hab/km²)
            </span>
            <span class="chart-badge">321 setores</span>
          </div>
          <div class="chart-wrapper" style="height: 180px;">
            <canvas id="chart-density-sidebar"></canvas>
          </div>
        </div>

        <!-- 4. Estrutura Etária / Pirâmide -->
        <div class="chart-card" style="margin-bottom: 12px;">
          <div class="chart-card-header">
            <span class="chart-card-title">
              <i class="lucide-users" style="color: #38bdf8;"></i>
              Pirâmide Etária — Censo 2022
            </span>
            <span class="chart-badge">♂ 47,4% · ♀ 52,6%</span>
          </div>
          <div class="chart-wrapper" style="height: 230px;">
            <canvas id="chart-age-sidebar"></canvas>
          </div>
        </div>

        <!-- 5. Renda Média Domiciliar -->
        <div class="chart-card" style="margin-bottom: 12px;">
          <div class="chart-card-header">
            <span class="chart-card-title">
              <i class="lucide-trending-up" style="color: #4575b4;"></i>
              Renda Média Domiciliar por Setor
            </span>
            <span class="chart-badge">Méd: R$ 3.895</span>
          </div>
          <div class="chart-wrapper" style="height: 180px;">
            <canvas id="chart-income-sidebar"></canvas>
          </div>
        </div>

        <!-- 6. Demografia por Bairro (Envelhecimento & Razão de Sexo) -->
        <div class="chart-card" style="margin-bottom: 12px;">
          <div class="chart-card-header" style="flex-wrap: wrap; gap: 6px;">
            <span class="chart-card-title">
              <i class="lucide-activity" style="color: #a855f7;"></i>
              Envelhecimento & Sexo por Bairro
            </span>
            <div class="chart-toggle-group">
              <button type="button" class="btn-chart-toggle ${this.activeBairrosMetric.sidebar === 'envelhecimento' ? 'active' : ''}" data-metric="envelhecimento" data-scope="sidebar" title="Visualizar Índice de Envelhecimento (%)">
                Envelh. (%)
              </button>
              <button type="button" class="btn-chart-toggle ${this.activeBairrosMetric.sidebar === 'razao' ? 'active' : ''}" data-metric="razao" data-scope="sidebar" title="Visualizar Razão de Sexo (Homens / 100 Mulheres)">
                Razão H/M
              </button>
            </div>
          </div>
          <div class="chart-wrapper" style="height: 440px;">
            <canvas id="chart-demografia-bairros-sidebar"></canvas>
          </div>
          <div class="bairros-chart-legend" id="bairros-sidebar-legend" style="font-size: 9px; justify-content: center;">
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #7c3aed;"></span>&gt;130%</span>
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #3b82f6;"></span>90-130%</span>
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #10b981;"></span>60-90%</span>
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #06b6d4;"></span>&lt;60%</span>
          </div>
        </div>

        <!-- 7. Alfabetização e Educação (Censo 2022) -->
        <div class="chart-card" style="margin-bottom: 12px;">
          <div class="chart-card-header" style="flex-wrap: wrap; gap: 6px;">
            <span class="chart-card-title">
              <i class="lucide-book-open" style="color: #10b981;"></i>
              Alfabetização & Educação
            </span>
            <div class="chart-toggle-group">
              <button type="button" class="btn-chart-toggle ${this.activeEducacaoDimension.sidebar === 'bairros' ? 'active' : ''}" data-educacao-dim="bairros" data-scope="sidebar" title="Visualizar por Bairros/Regiões SEPLAN">
                Bairros
              </button>
              <button type="button" class="btn-chart-toggle ${this.activeEducacaoDimension.sidebar === 'idade' ? 'active' : ''}" data-educacao-dim="idade" data-scope="sidebar" title="Visualizar por Faixas Etárias Oficiais">
                Idades
              </button>
              <button type="button" class="btn-chart-toggle ${this.activeEducacaoDimension.sidebar === 'raca' ? 'active' : ''}" data-educacao-dim="raca" data-scope="sidebar" title="Visualizar por Cor ou Raça">
                Cor/Raça
              </button>
              <button type="button" class="btn-chart-toggle ${this.activeEducacaoDimension.sidebar === 'genero' ? 'active' : ''}" data-educacao-dim="genero" data-scope="sidebar" title="Visualizar por Gênero">
                Gênero
              </button>
            </div>
          </div>
          <div class="chart-wrapper" style="height: 400px;">
            <canvas id="chart-educacao-sidebar"></canvas>
          </div>
          <div class="bairros-chart-legend" id="educacao-sidebar-legend" style="font-size: 9px; justify-content: center;">
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #15803d;"></span>&gt;99%</span>
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #22c55e;"></span>97,5-99%</span>
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #eab308;"></span>95-97,5%</span>
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #ef4444;"></span>&lt;95%</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Retorna o HTML estruturado dos gráficos em grade para o Modal Expandido
   */
  getModalChartsHtml() {
    return `
      <div class="modal-charts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 16px; padding: 6px 0 28px 0;">
        <!-- 1. Infraestrutura Viária -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">
              <i class="lucide-pie-chart" style="color: var(--dc-orange-primary);"></i>
              Extensão da Infraestrutura Viária e Ferroviária
            </span>
            <span class="chart-badge">Total: ${formatNumber(METRICS_ANALYTICAL_DATA.roads.total, 2)} km</span>
          </div>
          <div class="chart-wrapper" style="height: 230px;">
            <canvas id="chart-roads-modal"></canvas>
          </div>
        </div>

        <!-- 2. Rede Hidrográfica -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">
              <i class="lucide-droplet" style="color: #38bdf8;"></i>
              Extensão da Rede Hidrográfica Municipal
            </span>
            <span class="chart-badge">${formatNumber(METRICS_ANALYTICAL_DATA.hydro.total, 2)} km (3.682 trechos)</span>
          </div>
          <div class="chart-wrapper" style="height: 230px;">
            <canvas id="chart-hydro-modal"></canvas>
          </div>
        </div>

        <!-- 3. Densidade Setorial -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">
              <i class="lucide-bar-chart" style="color: #ea580c;"></i>
              Distribuição da Densidade Demográfica Setorial (hab/km²)
            </span>
            <span class="chart-badge">321 setores censitários</span>
          </div>
          <div class="chart-wrapper" style="height: 230px;">
            <canvas id="chart-density-modal"></canvas>
          </div>
        </div>

        <!-- 4. Pirâmide Etária -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">
              <i class="lucide-users" style="color: #38bdf8;"></i>
              Pirâmide Etária Oficial — Censo 2022 (Homens × Mulheres)
            </span>
            <span class="chart-badge">Razão: 90,0 H/100 M · Envelhecimento: 92,5%</span>
          </div>
          <div class="chart-wrapper" style="height: 260px;">
            <canvas id="chart-age-modal"></canvas>
          </div>
        </div>

        <!-- 5. Renda Média Domiciliar -->
        <div class="chart-card" style="grid-column: 1 / -1;">
          <div class="chart-card-header">
            <span class="chart-card-title">
              <i class="lucide-trending-up" style="color: #4575b4;"></i>
              Rendimento Nominal Médio Mensal Domiciliar por Setor Censitário (Censo 2022)
            </span>
            <span class="chart-badge">307 setores válidos • Média Municipal: R$ 3.895,50</span>
          </div>
          <div class="chart-wrapper" style="height: 240px;">
            <canvas id="chart-income-modal"></canvas>
          </div>
        </div>

        <!-- 6. Demografia por Bairro (Envelhecimento & Razão de Sexo) -->
        <div class="chart-card" style="grid-column: 1 / -1;">
          <div class="chart-card-header" style="flex-wrap: wrap; gap: 8px;">
            <span class="chart-card-title">
              <i class="lucide-activity" style="color: #a855f7;"></i>
              Índice de Envelhecimento e Razão de Sexo por Bairro / Região (Censo IBGE 2022)
            </span>
            <div class="chart-toggle-group">
              <button type="button" class="btn-chart-toggle ${this.activeBairrosMetric.modal === 'envelhecimento' ? 'active' : ''}" data-metric="envelhecimento" data-scope="modal" title="Visualizar Índice de Envelhecimento (%)">
                Índice de Envelhecimento (%)
              </button>
              <button type="button" class="btn-chart-toggle ${this.activeBairrosMetric.modal === 'razao' ? 'active' : ''}" data-metric="razao" data-scope="modal" title="Visualizar Razão de Sexo (Homens / 100 Mulheres)">
                Razão de Sexo (Homens / 100 Mulheres)
              </button>
            </div>
          </div>
          <div class="chart-wrapper" style="height: 520px;">
            <canvas id="chart-demografia-bairros-modal"></canvas>
          </div>
          <div class="bairros-chart-legend" id="bairros-modal-legend">
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #7c3aed;"></span>Altamente Envelhecido (&gt;130%)</span>
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #3b82f6;"></span>Envelhecimento Moderado (90-130%)</span>
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #10b981;"></span>Equilibrado (60-90%)</span>
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #06b6d4;"></span>População Jovem (&lt;60%)</span>
            <span style="margin-left: auto; font-size: 10.5px; color: var(--text-muted);"><i class="lucide-mouse-pointer" style="font-size: 11px;"></i> Clique em qualquer barra para aproximar no mapa</span>
          </div>
        </div>

        <!-- 7. Alfabetização e Educação (Censo 2022) -->
        <div class="chart-card" style="grid-column: 1 / -1;">
          <div class="chart-card-header" style="flex-wrap: wrap; gap: 8px;">
            <span class="chart-card-title">
              <i class="lucide-book-open" style="color: #10b981;"></i>
              Alfabetização e Educação Oficial — Censo IBGE 2022 (Passo Fundo/RS)
            </span>
            <div class="chart-toggle-group">
              <button type="button" class="btn-chart-toggle ${this.activeEducacaoDimension.modal === 'bairros' ? 'active' : ''}" data-educacao-dim="bairros" data-scope="modal" title="Taxa de Alfabetização por Regiões SEPLAN (15+ anos)">
                Bairros / Regiões
              </button>
              <button type="button" class="btn-chart-toggle ${this.activeEducacaoDimension.modal === 'idade' ? 'active' : ''}" data-educacao-dim="idade" data-scope="modal" title="Alfabetização por Grupos de Idade Oficiais">
                Faixas de Idade
              </button>
              <button type="button" class="btn-chart-toggle ${this.activeEducacaoDimension.modal === 'raca' ? 'active' : ''}" data-educacao-dim="raca" data-scope="modal" title="Alfabetização por Cor ou Raça">
                Cor ou Raça
              </button>
              <button type="button" class="btn-chart-toggle ${this.activeEducacaoDimension.modal === 'genero' ? 'active' : ''}" data-educacao-dim="genero" data-scope="modal" title="Alfabetização por Gênero / Sexo">
                Gênero
              </button>
            </div>
          </div>
          <div class="chart-wrapper" style="height: 520px;">
            <canvas id="chart-educacao-modal"></canvas>
          </div>
          <div class="bairros-chart-legend" id="educacao-modal-legend">
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #15803d;"></span>Maior ou igual a 99,0%</span>
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #22c55e;"></span>97,5% a 98,9%</span>
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #eab308;"></span>95,0% a 97,4%</span>
            <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #ef4444;"></span>Menor que 95,0%</span>
            <span style="margin-left: auto; font-size: 10.5px; color: var(--text-muted);"><i class="lucide-mouse-pointer" style="font-size: 11px;"></i> Clique em qualquer barra de bairro para aproximar no mapa</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Destroi instâncias do Chart.js de forma limpa
   */
  destroyCharts(scope = 'sidebar') {
    if (this.charts[scope]) {
      Object.keys(this.charts[scope]).forEach(key => {
        if (this.charts[scope][key]) {
          this.charts[scope][key].destroy();
          delete this.charts[scope][key];
        }
      });
    }
  }

  destroyAll() {
    this.destroyCharts('sidebar');
    this.destroyCharts('modal');
  }

  /**
   * Inicializa os 5 gráficos do Sidebar
   */
  initSidebarCharts() {
    if (typeof Chart === 'undefined') {
      console.warn('[MetricsCharts] Chart.js não está carregado no ambiente global.');
      return;
    }

    this.destroyCharts('sidebar');

    // 1. Roads (Doughnut)
    const roadsCtx = document.getElementById('chart-roads-sidebar');
    if (roadsCtx) {
      this.charts.sidebar.roads = new Chart(roadsCtx, {
        type: 'doughnut',
        data: {
          labels: METRICS_ANALYTICAL_DATA.roads.labels,
          datasets: [{
            data: METRICS_ANALYTICAL_DATA.roads.data,
            backgroundColor: METRICS_ANALYTICAL_DATA.roads.colors,
            borderColor: '#0f172a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10, padding: 6 }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw;
                  const total = METRICS_ANALYTICAL_DATA.roads.total;
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${ctx.label}: ${formatNumber(val, 2)} km (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }

    // 2. Hydro (Doughnut)
    const hydroCtx = document.getElementById('chart-hydro-sidebar');
    if (hydroCtx) {
      this.charts.sidebar.hydro = new Chart(hydroCtx, {
        type: 'doughnut',
        data: {
          labels: METRICS_ANALYTICAL_DATA.hydro.labels,
          datasets: [{
            data: METRICS_ANALYTICAL_DATA.hydro.data,
            backgroundColor: METRICS_ANALYTICAL_DATA.hydro.colors,
            borderColor: '#0f172a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10, padding: 6 }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw;
                  const total = METRICS_ANALYTICAL_DATA.hydro.total;
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${ctx.label}: ${formatNumber(val, 2)} km (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }

    // 3. Density (Bar)
    const densCtx = document.getElementById('chart-density-sidebar');
    if (densCtx) {
      this.charts.sidebar.density = new Chart(densCtx, {
        type: 'bar',
        data: {
          labels: METRICS_ANALYTICAL_DATA.density.labels,
          datasets: [{
            label: 'Setores',
            data: METRICS_ANALYTICAL_DATA.density.data,
            backgroundColor: METRICS_ANALYTICAL_DATA.density.colors,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw;
                  const total = METRICS_ANALYTICAL_DATA.density.total;
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${val} setores censitários (${pct}%)`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 10 } },
              grid: { display: false }
            },
            y: {
              ticks: { color: '#94a3b8', font: { size: 9 } },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
          }
        }
      });
    }

    // 4. Pirâmide Etária (Horizontal Divergent Bar)
    const ageCtx = document.getElementById('chart-age-sidebar');
    if (ageCtx) {
      this.charts.sidebar.age = new Chart(ageCtx, {
        type: 'bar',
        data: {
          labels: METRICS_ANALYTICAL_DATA.age.labels,
          datasets: [
            {
              label: 'Homens',
              data: METRICS_ANALYTICAL_DATA.age.homens.map(v => -v),
              backgroundColor: '#38bdf8',
              hoverBackgroundColor: '#0284c7',
              borderRadius: 3,
              borderSkipped: false
            },
            {
              label: 'Mulheres',
              data: METRICS_ANALYTICAL_DATA.age.mulheres,
              backgroundColor: '#f472b6',
              hoverBackgroundColor: '#db2777',
              borderRadius: 3,
              borderSkipped: false
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: '#cbd5e1',
                font: { size: 9.5, weight: '500' },
                boxWidth: 8,
                padding: 6
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const raw = Math.abs(ctx.raw);
                  const totalPop = METRICS_ANALYTICAL_DATA.age.total;
                  const pct = ((raw / totalPop) * 100).toFixed(2);
                  return ` ${ctx.dataset.label}: ${formatNumber(raw, 0)} hab (${pct}%)`;
                },
                footer: (items) => {
                  if (!items.length) return '';
                  const idx = items[0].dataIndex;
                  const tot = METRICS_ANALYTICAL_DATA.age.totalPorFaixa[idx];
                  const pct = ((tot / METRICS_ANALYTICAL_DATA.age.total) * 100).toFixed(2);
                  return `Total da faixa: ${formatNumber(tot, 0)} hab (${pct}%)`;
                }
              }
            }
          },
          scales: {
            x: {
              stacked: false,
              ticks: {
                color: '#94a3b8',
                font: { size: 8.5 },
                callback: (val) => {
                  const abs = Math.abs(val);
                  return abs >= 1000 ? `${(abs / 1000).toFixed(0)}k` : abs;
                }
              },
              grid: {
                color: (ctx) => ctx.tick && ctx.tick.value === 0 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                lineWidth: (ctx) => ctx.tick && ctx.tick.value === 0 ? 1.5 : 1
              }
            },
            y: {
              stacked: true,
              ticks: {
                color: '#cbd5e1',
                font: { size: 8.5 }
              },
              grid: { display: false }
            }
          }
        }
      });
    }

    // 5. Income (Bar)
    const incomeCtx = document.getElementById('chart-income-sidebar');
    if (incomeCtx) {
      this.charts.sidebar.income = new Chart(incomeCtx, {
        type: 'bar',
        data: {
          labels: METRICS_ANALYTICAL_DATA.income.labels,
          datasets: [{
            label: 'Setores',
            data: METRICS_ANALYTICAL_DATA.income.data,
            backgroundColor: METRICS_ANALYTICAL_DATA.income.colors,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw;
                  const total = METRICS_ANALYTICAL_DATA.income.total;
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${val} setores (${pct}%)`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 9 } },
              grid: { display: false }
            },
            y: {
              ticks: { color: '#94a3b8', font: { size: 9 } },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
          }
        }
      });
    }

    // 6. Demografia por Bairro (Envelhecimento & Razão de Sexo)
    this.initBairrosChart('sidebar');
    this.setupBairrosToggleButtons('sidebar');

    // 7. Alfabetização e Educação (Censo 2022)
    this.initEducationChart('sidebar');
    this.setupEducationToggleButtons('sidebar');
  }

  /**
   * Inicializa os 5 gráficos do Modal em alta resolução
   */
  initModalCharts() {
    if (typeof Chart === 'undefined') return;

    this.destroyCharts('modal');

    // 1. Roads (Modal)
    const roadsCtx = document.getElementById('chart-roads-modal');
    if (roadsCtx) {
      this.charts.modal.roads = new Chart(roadsCtx, {
        type: 'doughnut',
        data: {
          labels: METRICS_ANALYTICAL_DATA.roads.labels,
          datasets: [{
            data: METRICS_ANALYTICAL_DATA.roads.data,
            backgroundColor: METRICS_ANALYTICAL_DATA.roads.colors,
            borderColor: '#0f172a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, padding: 10 }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw;
                  const total = METRICS_ANALYTICAL_DATA.roads.total;
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${ctx.label}: ${formatNumber(val, 2)} km (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }

    // 2. Hydro (Modal)
    const hydroCtx = document.getElementById('chart-hydro-modal');
    if (hydroCtx) {
      this.charts.modal.hydro = new Chart(hydroCtx, {
        type: 'doughnut',
        data: {
          labels: METRICS_ANALYTICAL_DATA.hydro.labels,
          datasets: [{
            data: METRICS_ANALYTICAL_DATA.hydro.data,
            backgroundColor: METRICS_ANALYTICAL_DATA.hydro.colors,
            borderColor: '#0f172a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, padding: 10 }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw;
                  const total = METRICS_ANALYTICAL_DATA.hydro.total;
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${ctx.label}: ${formatNumber(val, 2)} km (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }

    // 3. Density (Modal)
    const densCtx = document.getElementById('chart-density-modal');
    if (densCtx) {
      this.charts.modal.density = new Chart(densCtx, {
        type: 'bar',
        data: {
          labels: METRICS_ANALYTICAL_DATA.density.labels,
          datasets: [{
            label: 'Setores Censitários',
            data: METRICS_ANALYTICAL_DATA.density.data,
            backgroundColor: METRICS_ANALYTICAL_DATA.density.colors,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw;
                  const total = METRICS_ANALYTICAL_DATA.density.total;
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${val} setores censitários (${pct}%)`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 11 } },
              grid: { display: false }
            },
            y: {
              ticks: { color: '#94a3b8', font: { size: 10 } },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
          }
        }
      });
    }

    // 4. Pirâmide Etária (Modal)
    const ageCtx = document.getElementById('chart-age-modal');
    if (ageCtx) {
      this.charts.modal.age = new Chart(ageCtx, {
        type: 'bar',
        data: {
          labels: METRICS_ANALYTICAL_DATA.age.labels,
          datasets: [
            {
              label: 'Homens (47,38% • 97.467 hab)',
              data: METRICS_ANALYTICAL_DATA.age.homens.map(v => -v),
              backgroundColor: '#38bdf8',
              hoverBackgroundColor: '#0284c7',
              borderRadius: 4,
              borderSkipped: false
            },
            {
              label: 'Mulheres (52,62% • 108.243 hab)',
              data: METRICS_ANALYTICAL_DATA.age.mulheres,
              backgroundColor: '#f472b6',
              hoverBackgroundColor: '#db2777',
              borderRadius: 4,
              borderSkipped: false
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: '#cbd5e1',
                font: { size: 11, weight: '500' },
                boxWidth: 12,
                padding: 10
              }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const raw = Math.abs(ctx.raw);
                  const isM = ctx.datasetIndex === 0;
                  const totalPop = METRICS_ANALYTICAL_DATA.age.total;
                  const pct = ((raw / totalPop) * 100).toFixed(2);
                  const nome = isM ? 'Homens' : 'Mulheres';
                  return ` ${nome}: ${formatNumber(raw, 0)} habitantes (${pct}% da população)`;
                },
                footer: (items) => {
                  if (!items.length) return '';
                  const idx = items[0].dataIndex;
                  const tot = METRICS_ANALYTICAL_DATA.age.totalPorFaixa[idx];
                  const pct = ((tot / METRICS_ANALYTICAL_DATA.age.total) * 100).toFixed(2);
                  return `Total da faixa etária: ${formatNumber(tot, 0)} hab (${pct}% do município)`;
                }
              }
            }
          },
          scales: {
            x: {
              stacked: false,
              ticks: {
                color: '#94a3b8',
                font: { size: 10 },
                callback: (val) => {
                  const abs = Math.abs(val);
                  return abs >= 1000 ? `${(abs / 1000).toFixed(0)}k` : abs;
                }
              },
              grid: {
                color: (ctx) => ctx.tick && ctx.tick.value === 0 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                lineWidth: (ctx) => ctx.tick && ctx.tick.value === 0 ? 1.5 : 1
              }
            },
            y: {
              stacked: true,
              ticks: {
                color: '#cbd5e1',
                font: { size: 9.5 }
              },
              grid: { display: false }
            }
          }
        }
      });
    }

    // 5. Income (Modal)
    const incomeCtx = document.getElementById('chart-income-modal');
    if (incomeCtx) {
      this.charts.modal.income = new Chart(incomeCtx, {
        type: 'bar',
        data: {
          labels: METRICS_ANALYTICAL_DATA.income.labels,
          datasets: [{
            label: 'Setores Censitários',
            data: METRICS_ANALYTICAL_DATA.income.data,
            backgroundColor: METRICS_ANALYTICAL_DATA.income.colors,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const val = ctx.raw;
                  const total = METRICS_ANALYTICAL_DATA.income.total;
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${val} setores censitários (${pct}%)`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 11 } },
              grid: { display: false }
            },
            y: {
              ticks: { color: '#94a3b8', font: { size: 10 } },
              grid: { color: 'rgba(255, 255, 255, 0.05)' }
            }
          }
        }
      });
    }

    // 6. Demografia por Bairro (Envelhecimento & Razão de Sexo)
    this.initBairrosChart('modal');
    this.setupBairrosToggleButtons('modal');

    // 7. Alfabetização e Educação (Censo 2022)
    this.initEducationChart('modal');
    this.setupEducationToggleButtons('modal');
  }

  /**
   * Configura os botões de alternância entre Envelhecimento e Razão de Sexo
   */
  setupBairrosToggleButtons(scope) {
    const container = scope === 'sidebar' 
      ? document.getElementById('sidebar-metrics-container')
      : document.getElementById('metrics-modal-body');
    if (!container) return;

    const buttons = container.querySelectorAll(`.btn-chart-toggle[data-metric][data-scope="${scope}"]`);
    buttons.forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const metric = btn.getAttribute('data-metric');
        if (metric && this.activeBairrosMetric[scope] !== metric) {
          this.activeBairrosMetric[scope] = metric;
          this.initBairrosChart(scope);
        }
      };
    });
  }

  /**
   * Inicializa o gráfico comparativo dos 23 bairros + Área Rural (Censo 2022)
   */
  initBairrosChart(scope = 'sidebar') {
    if (typeof Chart === 'undefined') return;

    const canvasId = `chart-demografia-bairros-${scope}`;
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.charts[scope] && this.charts[scope].bairros) {
      this.charts[scope].bairros.destroy();
      delete this.charts[scope].bairros;
    }

    const metric = this.activeBairrosMetric[scope] || 'envelhecimento';
    const isEnvelhecimento = metric === 'envelhecimento';

    // Sincroniza classes visuais ativas dos botões de alternância
    const container = scope === 'sidebar' 
      ? document.getElementById('sidebar-metrics-container')
      : document.getElementById('metrics-modal-body');
    if (container) {
      const toggleBtns = container.querySelectorAll(`.btn-chart-toggle[data-scope="${scope}"]`);
      toggleBtns.forEach(btn => {
        const m = btn.getAttribute('data-metric');
        btn.classList.toggle('active', m === metric);
      });
    }

    // Clona e ordena os dados conforme a métrica selecionada
    const sortedData = BAIRROS_DEMOGRAFIA.slice().sort((a, b) => {
      return isEnvelhecimento 
        ? b.indice_envelhecimento - a.indice_envelhecimento
        : b.razao_sexo - a.razao_sexo;
    });

    const labels = sortedData.map(b => b.nome);
    const dataValues = sortedData.map(b => isEnvelhecimento ? b.indice_envelhecimento : b.razao_sexo);

    // Cores temáticas auditadas
    let bgColors = [];
    let hoverColors = [];

    if (isEnvelhecimento) {
      bgColors = sortedData.map(b => {
        const val = b.indice_envelhecimento;
        if (val >= 130) return '#7c3aed'; // Roxo vibrante - Altamente Envelhecido
        if (val >= 90) return '#3b82f6';  // Azul institucional - Envelhecimento Moderado
        if (val >= 60) return '#10b981';  // Esmeralda - Equilibrado
        return '#06b6d4';                 // Ciano - População Jovem
      });
      hoverColors = sortedData.map(b => {
        const val = b.indice_envelhecimento;
        if (val >= 130) return '#6d28d9';
        if (val >= 90) return '#2563eb';
        if (val >= 60) return '#059669';
        return '#0891b2';
      });
    } else {
      bgColors = sortedData.map(b => {
        const r = b.razao_sexo;
        if (r >= 100) return '#0284c7'; // Azul céu - Predomínio Masculino
        if (r >= 88) return '#8b5cf6';  // Violeta - Equilíbrio / Predomínio Feminino Leve
        return '#ec4899';               // Rosa fúcsia - Forte Predomínio Feminino
      });
      hoverColors = sortedData.map(b => {
        const r = b.razao_sexo;
        if (r >= 100) return '#0369a1';
        if (r >= 88) return '#7c3aed';
        return '#db2777';
      });
    }

    // Atualiza legenda dinâmica se existir
    const legendEl = document.getElementById(`bairros-${scope}-legend`);
    if (legendEl) {
      if (isEnvelhecimento) {
        legendEl.innerHTML = `
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #7c3aed;"></span>${scope === 'sidebar' ? '>130%' : 'Altamente Envelhecido (>130%)'}</span>
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #3b82f6;"></span>${scope === 'sidebar' ? '90-130%' : 'Envelhecimento Moderado (90-130%)'}</span>
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #10b981;"></span>${scope === 'sidebar' ? '60-90%' : 'Equilibrado (60-90%)'}</span>
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #06b6d4;"></span>${scope === 'sidebar' ? '<60%' : 'População Jovem (<60%)'}</span>
          ${scope === 'modal' ? '<span style="margin-left: auto; font-size: 10.5px; color: var(--text-muted);"><i class="lucide-mouse-pointer" style="font-size: 11px;"></i> Clique em qualquer barra para aproximar no mapa</span>' : ''}
        `;
      } else {
        legendEl.innerHTML = `
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #0284c7;"></span>${scope === 'sidebar' ? '≥100 H/M' : 'Predomínio Masculino (≥100 H/M)'}</span>
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #8b5cf6;"></span>${scope === 'sidebar' ? '88-99 H/M' : 'Predomínio Feminino Leve (88-99 H/M)'}</span>
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #ec4899;"></span>${scope === 'sidebar' ? '<88 H/M' : 'Forte Predomínio Feminino (<88 H/M)'}</span>
          ${scope === 'modal' ? '<span style="margin-left: auto; font-size: 10.5px; color: var(--text-muted);"><i class="lucide-mouse-pointer" style="font-size: 11px;"></i> Clique em qualquer barra para aproximar no mapa</span>' : ''}
        `;
      }
    }

    this.charts[scope].bairros = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: isEnvelhecimento ? 'Índice de Envelhecimento (%)' : 'Razão de Sexo (Homens / 100 Mulheres)',
          data: dataValues,
          backgroundColor: bgColors,
          hoverBackgroundColor: hoverColors,
          borderRadius: scope === 'modal' ? 4 : 3,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: (evt, elements) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            const b = sortedData[idx];
            if (b) {
              this.zoomToBairro(b.id || b.nome);
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const b = sortedData[ctx.dataIndex];
                if (isEnvelhecimento) {
                  return ` Índice de Envelhecimento: ${b.indice_envelhecimento.toFixed(1).replace('.', ',')}% (${b.perfil})`;
                } else {
                  return ` Razão de Sexo: ${b.razao_sexo.toFixed(1).replace('.', ',')} homens / 100 mulheres`;
                }
              },
              afterLabel: (ctx) => {
                const b = sortedData[ctx.dataIndex];
                if (isEnvelhecimento) {
                  return [
                    ` População: ${formatNumber(b.pop, 0)} habitantes`,
                    ` Idosos (60+): ${formatNumber(b.idosos_60m, 0)} hab (${b.pct_idosos.toFixed(1).replace('.', ',')}%)`,
                    ` Jovens (0-14): ${formatNumber(b.jovens_0a14, 0)} hab (${b.pct_jovens.toFixed(1).replace('.', ',')}%)`
                  ];
                } else {
                  const status = b.razao_sexo > 100 ? 'Predomínio Masculino' : (b.razao_sexo === 100 ? 'Equilíbrio Exato' : 'Predomínio Feminino');
                  return [
                    ` Situação: ${status}`,
                    ` População: ${formatNumber(b.pop, 0)} habitantes`,
                    ` Mulheres: ${formatNumber(b.mulheres, 0)} hab (${b.pct_mulheres.toFixed(1).replace('.', ',')}%)`,
                    ` Homens: ${formatNumber(b.homens, 0)} hab (${b.pct_homens.toFixed(1).replace('.', ',')}%)`
                  ];
                }
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#94a3b8',
              font: { size: scope === 'modal' ? 10 : 8.5 },
              callback: (v) => isEnvelhecimento ? `${v}%` : v
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            }
          },
          y: {
            ticks: {
              color: '#cbd5e1',
              font: { size: scope === 'modal' ? 9.5 : 8 }
            },
            grid: { display: false }
          }
        }
      }
    });
  }

  /**
   * Configura os botões de alternância dimensional de Alfabetização e Educação
   */
  setupEducationToggleButtons(scope) {
    const container = scope === 'sidebar' 
      ? document.getElementById('sidebar-metrics-container')
      : document.getElementById('metrics-modal-body');
    if (!container) return;

    const buttons = container.querySelectorAll(`.btn-chart-toggle[data-educacao-dim][data-scope="${scope}"]`);
    buttons.forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const dim = btn.getAttribute('data-educacao-dim');
        if (dim && this.activeEducacaoDimension[scope] !== dim) {
          this.activeEducacaoDimension[scope] = dim;
          this.initEducationChart(scope);
        }
      };
    });
  }

  /**
   * Inicializa o gráfico analítico multidimensional de Alfabetização e Educação (Censo 2022)
   */
  initEducationChart(scope = 'sidebar') {
    if (typeof Chart === 'undefined') return;

    const canvasId = `chart-educacao-${scope}`;
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.charts[scope] && this.charts[scope].education) {
      this.charts[scope].education.destroy();
      delete this.charts[scope].education;
    }

    const dim = this.activeEducacaoDimension[scope] || 'bairros';

    // Sincroniza classes visuais ativas dos botões
    const container = scope === 'sidebar' 
      ? document.getElementById('sidebar-metrics-container')
      : document.getElementById('metrics-modal-body');
    if (container) {
      const toggleBtns = container.querySelectorAll(`.btn-chart-toggle[data-educacao-dim][data-scope="${scope}"]`);
      toggleBtns.forEach(btn => {
        const d = btn.getAttribute('data-educacao-dim');
        btn.classList.toggle('active', d === dim);
      });
    }

    let labels = [];
    let dataValues = [];
    let bgColors = [];
    let hoverColors = [];
    let datasetLabel = 'Taxa de Alfabetização (%)';
    let rawItems = [];

    if (dim === 'bairros') {
      const sorted = EDUCACAO_BAIRROS.slice().sort((a, b) => b.taxa_alfabetizacao - a.taxa_alfabetizacao);
      rawItems = sorted;
      labels = sorted.map(b => b.nome);
      dataValues = sorted.map(b => b.taxa_alfabetizacao);
      bgColors = sorted.map(b => {
        const v = b.taxa_alfabetizacao;
        if (v >= 99.0) return '#15803d'; // Verde escuro
        if (v >= 97.5) return '#22c55e'; // Verde claro
        if (v >= 95.0) return '#eab308'; // Âmbar
        return '#ef4444';                // Vermelho
      });
      hoverColors = sorted.map(b => {
        const v = b.taxa_alfabetizacao;
        if (v >= 99.0) return '#166534';
        if (v >= 97.5) return '#16a34a';
        if (v >= 95.0) return '#ca8a04';
        return '#dc2626';
      });
    } else if (dim === 'idade') {
      rawItems = EDUCACAO_IDADE;
      labels = EDUCACAO_IDADE.map(i => i.faixa);
      dataValues = EDUCACAO_IDADE.map(i => i.taxa_alfabetizacao);
      bgColors = ['#0284c7', '#0ea5e9', '#38bdf8', '#6366f1', '#8b5cf6', '#a855f7'];
      hoverColors = ['#0369a1', '#0284c7', '#0284c7', '#4f46e5', '#7c3aed', '#9333ea'];
    } else if (dim === 'raca') {
      const sorted = EDUCACAO_RACA.slice().sort((a, b) => b.taxa_alfabetizacao - a.taxa_alfabetizacao);
      rawItems = sorted;
      labels = sorted.map(r => r.cor_raca);
      dataValues = sorted.map(r => r.taxa_alfabetizacao);
      bgColors = sorted.map(r => {
        const v = r.taxa_alfabetizacao;
        if (v >= 98.0) return '#10b981';
        if (v >= 96.0) return '#3b82f6';
        return '#f59e0b';
      });
      hoverColors = sorted.map(r => {
        const v = r.taxa_alfabetizacao;
        if (v >= 98.0) return '#059669';
        if (v >= 96.0) return '#2563eb';
        return '#d97706';
      });
    } else if (dim === 'genero') {
      rawItems = EDUCACAO_GENERO;
      labels = EDUCACAO_GENERO.map(g => g.genero);
      dataValues = EDUCACAO_GENERO.map(g => g.taxa_alfabetizacao);
      bgColors = ['#38bdf8', '#f472b6'];
      hoverColors = ['#0284c7', '#db2777'];
    }

    // Atualiza legenda dinâmica
    const legendEl = document.getElementById(`educacao-${scope}-legend`);
    if (legendEl) {
      if (dim === 'bairros') {
        legendEl.innerHTML = `
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #15803d;"></span>${scope === 'sidebar' ? '≥99%' : 'Maior ou igual a 99,0%'}</span>
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #22c55e;"></span>${scope === 'sidebar' ? '97,5-99%' : '97,5% a 98,9%'}</span>
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #eab308;"></span>${scope === 'sidebar' ? '95-97,5%' : '95,0% a 97,4%'}</span>
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #ef4444;"></span>${scope === 'sidebar' ? '<95%' : 'Menor que 95,0%'}</span>
          ${scope === 'modal' ? '<span style="margin-left: auto; font-size: 10.5px; color: var(--text-muted);"><i class="lucide-mouse-pointer" style="font-size: 11px;"></i> Clique em qualquer barra de bairro para aproximar no mapa</span>' : ''}
        `;
      } else if (dim === 'idade') {
        legendEl.innerHTML = `
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #0284c7;"></span>Faixas de Idade (Censo IBGE 2022)</span>
          <span style="margin-left: auto; font-size: 10.5px; color: var(--text-muted);">População de 15 anos ou mais de idade</span>
        `;
      } else if (dim === 'raca') {
        legendEl.innerHTML = `
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #10b981;"></span>Cor ou Raça Autodeclarada</span>
          <span style="margin-left: auto; font-size: 10.5px; color: var(--text-muted);">Classificação oficial IBGE (15+ anos)</span>
        `;
      } else if (dim === 'genero') {
        legendEl.innerHTML = `
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #38bdf8;"></span>Homens: 97,83%</span>
          <span class="bairros-legend-item"><span class="bairros-legend-dot" style="background: #f472b6;"></span>Mulheres: 97,53%</span>
          <span style="margin-left: auto; font-size: 10.5px; color: var(--text-muted);">Diferença: +0,30 p.p. homens</span>
        `;
      }
    }

    this.charts[scope].education = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: datasetLabel,
          data: dataValues,
          backgroundColor: bgColors,
          hoverBackgroundColor: hoverColors,
          borderRadius: scope === 'modal' ? 4 : 3,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: (evt, elements) => {
          if (dim === 'bairros' && elements && elements.length > 0) {
            const idx = elements[0].index;
            const b = rawItems[idx];
            if (b) {
              this.zoomToBairro(b.id || b.nome);
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const item = rawItems[ctx.dataIndex];
                const taxa = item.taxa_alfabetizacao.toFixed(2).replace('.', ',');
                return ` Taxa de Alfabetização: ${taxa}%`;
              },
              afterLabel: (ctx) => {
                const item = rawItems[ctx.dataIndex];
                const total = item.pop_15m || item.total_pop || item.total;
                const alf = item.alfabetizados;
                const naoAlf = item.nao_alfabetizados;
                return [
                  ` Universo (15+ anos): ${formatNumber(total, 0)} pessoas`,
                  ` Alfabetizados: ${formatNumber(alf, 0)} pessoas (${((alf / total) * 100).toFixed(2).replace('.', ',')}%)`,
                  ` Não alfabetizados: ${formatNumber(naoAlf, 0)} pessoas (${((naoAlf / total) * 100).toFixed(2).replace('.', ',')}%)`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            min: dim === 'bairros' ? 90 : 85,
            max: 100,
            ticks: {
              color: '#94a3b8',
              font: { size: scope === 'modal' ? 10 : 8.5 },
              callback: (v) => `${v}%`
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            }
          },
          y: {
            ticks: {
              color: '#cbd5e1',
              font: { size: scope === 'modal' ? 9.5 : 8.5 }
            },
            grid: { display: false }
          }
        }
      }
    });
  }

  /**
   * Aproxima o mapa e destaca o bairro selecionado
   */
  zoomToBairro(identifier) {
    if (!this.layerManager || !this.mapEngine) return;
    const olLayer = this.layerManager.getLayer('bairros');
    if (!olLayer) return;
    const source = olLayer.getSource();
    if (!source) return;

    // Ativa visibilidade da camada de bairros caso esteja desligada
    this.layerManager.setLayerVisibility('bairros', true);

    const features = source.getFeatures();
    const idLower = String(identifier).toLowerCase().trim();
    const feat = features.find(f => {
      const p = f.getProperties();
      return (p['Name'] && p['Name'].toLowerCase().trim() === idLower) ||
             (p['Descri____'] && p['Descri____'].toLowerCase().trim() === idLower);
    });

    if (feat) {
      const geom = feat.getGeometry();
      if (geom) {
        this.mapEngine.getOlMap().getView().fit(geom.getExtent(), {
          padding: [80, 80, 80, 80],
          duration: 900,
          maxZoom: 15
        });
      }
    }
  }

  /**
   * Força recalcular tamanho dos gráficos se a aba ou viewport mudar
   */
  resizeCharts() {
    ['sidebar', 'modal'].forEach(scope => {
      if (this.charts[scope]) {
        Object.values(this.charts[scope]).forEach(chart => {
          if (chart && typeof chart.resize === 'function') {
            chart.resize();
          }
        });
      }
    });
  }
}
