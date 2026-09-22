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
  }
};

export class MetricsCharts {
  constructor(layerManager, mapEngine) {
    this.layerManager = layerManager;
    this.mapEngine = mapEngine;
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

        <!-- 4. Estrutura Etária -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title">
              <i class="lucide-users" style="color: #10b981;"></i>
              Estrutura Etária da População Residente (Censo IBGE 2022)
            </span>
            <span class="chart-badge">Total: 206.215 habitantes</span>
          </div>
          <div class="chart-wrapper" style="height: 230px;">
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

    // 4. Age Structure (Bar)
    const ageCtx = document.getElementById('chart-age-sidebar');
    if (ageCtx) {
      this.charts.sidebar.age = new Chart(ageCtx, {
        type: 'bar',
        data: {
          labels: METRICS_ANALYTICAL_DATA.age.labels,
          datasets: [{
            label: 'Habitantes',
            data: METRICS_ANALYTICAL_DATA.age.data,
            backgroundColor: METRICS_ANALYTICAL_DATA.age.colors,
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
                  const total = METRICS_ANALYTICAL_DATA.age.total;
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${formatNumber(val, 0)} habitantes (${pct}%)`;
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

    // 4. Age (Modal)
    const ageCtx = document.getElementById('chart-age-modal');
    if (ageCtx) {
      this.charts.modal.age = new Chart(ageCtx, {
        type: 'bar',
        data: {
          labels: METRICS_ANALYTICAL_DATA.age.labels,
          datasets: [{
            label: 'Habitantes',
            data: METRICS_ANALYTICAL_DATA.age.data,
            backgroundColor: METRICS_ANALYTICAL_DATA.age.colors,
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
                  const total = METRICS_ANALYTICAL_DATA.age.total;
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${formatNumber(val, 0)} habitantes (${pct}%)`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 10.5 } },
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
