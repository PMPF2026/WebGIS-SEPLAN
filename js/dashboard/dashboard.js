/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Interactive Dashboard UI with Chart.js & Map Spatial Zoom Linking
 */

import { formatNumber } from '../utils/formatters.js';

export class DashboardUI {
  constructor(statsEngine, mapEngine, layerManager, popupUI) {
    this.statsEngine = statsEngine;
    this.mapEngine = mapEngine;
    this.layerManager = layerManager;
    this.popupUI = popupUI;

    this.charts = {};
    this.modalEl = document.getElementById('dashboard-modal');
    this.isRendered = false;

    this.init();
  }

  init() {
    // Open Expanded Dashboard Modal Button in Header
    const openModalBtn = document.getElementById('btn-open-dashboard-modal');
    if (openModalBtn) {
      openModalBtn.addEventListener('click', () => {
        this.openModal();
      });
    }

    // Modal Close Button
    const closeModalBtn = document.getElementById('btn-close-dashboard-modal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // Render initial sidebar dashboard
    this.render();
  }

  async render() {
    const stats = await this.statsEngine.getConsolidatedStats();
    this.updateKpiElements(stats);
    this.renderSidebarCharts(stats);
    this.isRendered = true;
  }

  openModal() {
    if (this.modalEl) {
      this.modalEl.classList.add('active');
      this.renderModalCharts();
      this.renderSheltersTable();
      this.renderSgbSectorsTable();
    }
  }

  closeModal() {
    if (this.modalEl) {
      this.modalEl.classList.remove('active');
    }
  }

  updateKpiElements(stats) {
    document.querySelectorAll('[data-kpi]').forEach(el => {
      const key = el.getAttribute('data-kpi');
      if (stats[key] !== undefined) {
        if (typeof stats[key] === 'number') {
          el.textContent = formatNumber(stats[key], key.includes('Km') || key.includes('Area') ? 2 : 0);
        } else {
          el.textContent = stats[key];
        }
      }
    });
  }

  renderSidebarCharts(stats) {
    if (typeof Chart === 'undefined') return;

    // 1. Chart: Roads Breakdown (Doughnut)
    const roadsCtx = document.getElementById('chart-roads-sidebar');
    if (roadsCtx) {
      if (this.charts.roadsSidebar) {
        this.charts.roadsSidebar.destroy();
      }
      this.charts.roadsSidebar = new Chart(roadsCtx, {
        type: 'doughnut',
        data: {
          labels: ['Malha Urbana', 'Estradas Rurais', 'Rod. Estaduais', 'Rod. Federais', 'Ferrovia'],
          datasets: [{
            data: [stats.viariaKm, stats.estradasMunicipaisKm, stats.rodoviaEstadualKm, stats.rodoviaFederalKm, stats.ferroviaKm],
            backgroundColor: ['#64748b', '#d97706', '#ea580c', '#dc2626', '#1e293b'],
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
              labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10, padding: 8 }
            }
          }
        }
      });
    }

    // 2. Chart: Population Density Histogram (Bar)
    const densCtx = document.getElementById('chart-density-sidebar');
    if (densCtx) {
      if (this.charts.densitySidebar) {
        this.charts.densitySidebar.destroy();
      }
      const b = stats.densityBuckets || { low: 18, medium: 42, high: 95, veryHigh: 105, extreme: 52 };
      this.charts.densitySidebar = new Chart(densCtx, {
        type: 'bar',
        data: {
          labels: ['<50', '50-500', '500-2k', '2k-5k', '>5k'],
          datasets: [{
            label: 'Qtd Setores',
            data: [b.low, b.medium, b.high, b.veryHigh, b.extreme],
            backgroundColor: ['#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000'],
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }

    // 3. Chart: Estrutura Etária da População (Bar)
    const ageCtx = document.getElementById('chart-age-sidebar');
    if (ageCtx) {
      if (this.charts.ageSidebar) this.charts.ageSidebar.destroy();
      const c = stats.censo2022 || {
        pop0a4: 12482, pop5a9: 13200, pop10a14: 12560, pop15a19: 12533, pop20a59: 119496, popM60: 35356
      };
      this.charts.ageSidebar = new Chart(ageCtx, {
        type: 'bar',
        data: {
          labels: ['0-4 anos', '5-9 anos', '10-14', '15-19', '20-59', '60+ anos'],
          datasets: [{
            label: 'Habitantes',
            data: [c.pop0a4, c.pop5a9, c.pop10a14, c.pop15a19, c.pop20a59, c.popM60],
            backgroundColor: ['#ea580c', '#f97316', '#d97706', '#65a30d', '#10b981', '#7c3aed'],
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
                label: (ctx) => `${formatNumber(ctx.raw, 0)} habitantes`
              }
            }
          },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 9.5 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }

    // 4. Chart: Grupos Prioritários em Emergências (Doughnut)
    const priorityCtx = document.getElementById('chart-priority-sidebar');
    if (priorityCtx) {
      if (this.charts.prioritySidebar) this.charts.prioritySidebar.destroy();
      const c = stats.censo2022 || { pop0a4: 12482, pop5a9: 13200, popM60: 35356, popTotal: 205627 };
      const demais = (c.popTotal || 205627) - (c.pop0a4 + c.pop5a9 + c.popM60);
      this.charts.prioritySidebar = new Chart(priorityCtx, {
        type: 'doughnut',
        data: {
          labels: ['Idosos 60+ (Prioritário)', '0-4 anos (1ª Infância)', '5-9 anos (Crianças)', 'Demais (10-59 anos)'],
          datasets: [{
            data: [c.popM60, c.pop0a4, c.pop5a9, demais],
            backgroundColor: ['#7c3aed', '#ea580c', '#f97316', '#334155'],
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
              labels: { color: '#94a3b8', font: { size: 9.5 }, boxWidth: 10, padding: 6 }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ${formatNumber(ctx.raw, 0)} hab`
              }
            }
          }
        }
      });
    }

    // 5. Chart: Renda Média por Setor Censitário (Bar)
    const incomeCtx = document.getElementById('chart-income-sidebar');
    if (incomeCtx) {
      if (this.charts.incomeSidebar) this.charts.incomeSidebar.destroy();
      const r = stats.censo2022?.rendaBuckets || { ate2000: 25, de2000a3000: 107, de3000a4500: 84, de4500a7000: 70, acima7000: 21 };
      this.charts.incomeSidebar = new Chart(incomeCtx, {
        type: 'bar',
        data: {
          labels: ['< R$2k', 'R$2k-3k', 'R$3k-4.5k', 'R$4.5k-7k', '> R$7k'],
          datasets: [{
            label: 'Setores Censitários',
            data: [r.ate2000, r.de2000a3000, r.de3000a4500, r.de4500a7000, r.acima7000],
            backgroundColor: ['#d73027', '#fc8d59', '#fee090', '#91bfdb', '#4575b4'],
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
                label: (ctx) => `${ctx.raw} setores censitários`
              }
            }
          },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }
  }

  async renderModalCharts() {
    if (typeof Chart === 'undefined') return;
    const stats = await this.statsEngine.getConsolidatedStats();
    this.updateKpiElements(stats);

    // 1. Chart: Roads Breakdown (Doughnut)
    const roadsModalCtx = document.getElementById('chart-roads-modal') || document.getElementById('chart-modal-vias');
    if (roadsModalCtx) {
      if (this.charts.roadsModal) this.charts.roadsModal.destroy();
      this.charts.roadsModal = new Chart(roadsModalCtx, {
        type: 'doughnut',
        data: {
          labels: ['Malha Urbana (1.501,6 km)', 'Estradas Rurais (285,3 km)', 'Rod. Estaduais (66,9 km)', 'Rod. Federais (50,3 km)', 'Ferrovia (55,3 km)'],
          datasets: [{
            data: [stats.viariaKm, stats.estradasMunicipaisKm, stats.rodoviaEstadualKm, stats.rodoviaFederalKm, stats.ferroviaKm],
            backgroundColor: ['#64748b', '#d97706', '#ea580c', '#dc2626', '#1e293b'],
            borderColor: '#0f172a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#cbd5e1', font: { size: 11 }, boxWidth: 12, padding: 8 }
            }
          }
        }
      });
    }

    // 2. Chart: Population Density Histogram (Bar)
    const densModalCtx = document.getElementById('chart-density-modal') || document.getElementById('chart-modal-densidade');
    if (densModalCtx) {
      if (this.charts.densityModal) this.charts.densityModal.destroy();
      const b = stats.densityBuckets || { low: 18, medium: 42, high: 95, veryHigh: 105, extreme: 52 };
      this.charts.densityModal = new Chart(densModalCtx, {
        type: 'bar',
        data: {
          labels: ['<50 hab/km²', '50-500 hab/km²', '500-2.000 hab/km²', '2.000-5.000 hab/km²', '>5.000 hab/km²'],
          datasets: [{
            label: 'Qtd Setores Censitários',
            data: [b.low, b.medium, b.high, b.veryHigh, b.extreme],
            backgroundColor: ['#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000'],
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.08)' } }
          }
        }
      });
    }

    // 3. Top 10 Bairros Mais Populosos (Bar Horizontal) with Click-to-Zoom!
    const bairrosCtx = document.getElementById('chart-bairros-modal') || document.getElementById('chart-modal-bairros');
    if (bairrosCtx) {
      if (this.charts.bairrosModal) this.charts.bairrosModal.destroy();
      const top10 = stats.bairrosList.slice(0, 10);
      this.charts.bairrosModal = new Chart(bairrosCtx, {
        type: 'bar',
        data: {
          labels: top10.map(b => b.name),
          datasets: [{
            label: 'População (Censo 2022)',
            data: top10.map(b => b.pop),
            backgroundColor: '#ff7800',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          onClick: async (evt, elements) => {
            if (elements && elements.length > 0) {
              const index = elements[0].index;
              const selectedBairro = top10[index];
              this.closeModal();
              this.zoomToBairroByName(selectedBairro.name);
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel: () => '👉 Clique para aproximar no mapa'
              }
            }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#f8fafc', font: { size: 11 } }, grid: { display: false } }
          }
        }
      });
    }

    // 4. Distritos Municipais População (Bar Vertical) with Click-to-Zoom!
    const distCtx = document.getElementById('chart-distritos-modal') || document.getElementById('chart-modal-distritos');
    if (distCtx) {
      if (this.charts.distritosModal) this.charts.distritosModal.destroy();
      this.charts.distritosModal = new Chart(distCtx, {
        type: 'bar',
        data: {
          labels: stats.distritosList.map(d => d.name),
          datasets: [{
            label: 'Habitantes',
            data: stats.distritosList.map(d => d.pop),
            backgroundColor: '#0284c7',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: async (evt, elements) => {
            if (elements && elements.length > 0) {
              const index = elements[0].index;
              const selectedDistrito = stats.distritosList[index];
              this.closeModal();
              this.zoomToDistritoByName(selectedDistrito.name);
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel: () => '👉 Clique para aproximar no mapa'
              }
            }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }

    // 5. SGB 2025 Domicílios em Risco por Bairro (Bar Horizontal) with Click-to-Zoom!
    const sgbCtx = document.getElementById('chart-sgb-bairros-modal');
    if (sgbCtx) {
      if (this.charts.sgbModal) this.charts.sgbModal.destroy();
      const sgbList = stats.sgbTopBairros || [
        { name: "Petrópolis", count: 316 },
        { name: "São Luiz Gonzaga", count: 273 },
        { name: "Vila Santa Maria", count: 142 },
        { name: "Vera Cruz", count: 93 },
        { name: "Vila Luiza", count: 88 },
        { name: "Victor Issler", count: 64 },
        { name: "Vila Cruzeiro", count: 38 },
        { name: "Outros / Periferia", count: 31 },
        { name: "Vila Mattos", count: 26 },
        { name: "Nenê Graeff", count: 20 }
      ];
      this.charts.sgbModal = new Chart(sgbCtx, {
        type: 'bar',
        data: {
          labels: sgbList.map(b => b.name),
          datasets: [{
            label: 'Domicílios em Risco (SGB 2025)',
            data: sgbList.map(b => b.count),
            backgroundColor: '#f97316',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          onClick: async (evt, elements) => {
            if (elements && elements.length > 0) {
              const index = elements[0].index;
              const selectedBairro = sgbList[index];
              this.closeModal();
              this.zoomToBairroByName(selectedBairro.name);
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel: () => '👉 Clique para aproximar no mapa'
              }
            }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#f8fafc', font: { size: 11 } }, grid: { display: false } }
          }
        }
      });
    }

    // 6. SGB 2025 Edificações e População por Grau de Risco (Bar Comparison)
    const sgbRiscoCtx = document.getElementById('chart-sgb-risco-modal');
    if (sgbRiscoCtx) {
      if (this.charts.sgbRiscoModal) this.charts.sgbRiscoModal.destroy();
      this.charts.sgbRiscoModal = new Chart(sgbRiscoCtx, {
        type: 'bar',
        data: {
          labels: ['Risco Alto (R3)', 'Risco Muito Alto (R4)'],
          datasets: [
            {
              label: 'Edificações em Risco',
              data: [505, 112],
              backgroundColor: '#ea580c',
              borderRadius: 4
            },
            {
              label: 'População Exposta',
              data: [2020, 448],
              backgroundColor: '#dc2626',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#e2e8f0', font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} (${ctx.raw === 505 || ctx.raw === 2020 ? '81,8%' : '18,2%'})`
              }
            }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }

    // 7. SGB 2025 Edificações e População por Grau de Vulnerabilidade (Bar Comparison)
    const sgbVulneCtx = document.getElementById('chart-sgb-vulne-modal');
    if (sgbVulneCtx) {
      if (this.charts.sgbVulneModal) this.charts.sgbVulneModal.destroy();
      this.charts.sgbVulneModal = new Chart(sgbVulneCtx, {
        type: 'bar',
        data: {
          labels: ['Vulnerabilidade Média', 'Vulnerabilidade Alta'],
          datasets: [
            {
              label: 'Edificações',
              data: [177, 440],
              backgroundColor: '#f59e0b',
              borderRadius: 4
            },
            {
              label: 'População Exposta',
              data: [708, 1760],
              backgroundColor: '#ef4444',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#e2e8f0', font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} (${ctx.raw === 177 || ctx.raw === 708 ? '28,7%' : '71,3%'})`
              }
            }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }

    // 8. Censo 2022: Distribuição por Faixa Etária (Bar)
    const ageModalCtx = document.getElementById('chart-age-modal');
    if (ageModalCtx) {
      if (this.charts.ageModal) this.charts.ageModal.destroy();
      const c = stats.censo2022 || {
        pop0a4: 12482, pop5a9: 13200, pop10a14: 12560, pop15a19: 12533, pop20a59: 119496, popM60: 35356
      };
      this.charts.ageModal = new Chart(ageModalCtx, {
        type: 'bar',
        data: {
          labels: ['0 a 4 anos (1ª Infância)', '5 a 9 anos (Crianças)', '10 a 14 anos', '15 a 19 anos (Jovens)', '20 a 59 anos (Adultos)', '60+ anos (Idosos)'],
          datasets: [{
            label: 'Habitantes',
            data: [c.pop0a4, c.pop5a9, c.pop10a14, c.pop15a19, c.pop20a59, c.popM60],
            backgroundColor: ['#ea580c', '#f97316', '#d97706', '#65a30d', '#10b981', '#7c3aed'],
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
                label: (ctx) => `${formatNumber(ctx.raw, 0)} habitantes (${((ctx.raw / 205627) * 100).toFixed(1)}%)`
              }
            }
          },
          scales: {
            x: { ticks: { color: '#cbd5e1', font: { size: 11 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.06)' } }
          }
        }
      });
    }

    // 9. Censo 2022: Vulnerabilidade Social / Rendimento Domiciliar Médio por Setor (Bar)
    const incomeModalCtx = document.getElementById('chart-income-modal');
    if (incomeModalCtx) {
      if (this.charts.incomeModal) this.charts.incomeModal.destroy();
      const r = stats.censo2022?.rendaBuckets || { ate2000: 25, de2000a3000: 107, de3000a4500: 84, de4500a7000: 70, acima7000: 21 };
      this.charts.incomeModal = new Chart(incomeModalCtx, {
        type: 'bar',
        data: {
          labels: ['Até R$ 2.000 (Alta Vuln.)', 'R$ 2.000 a 3.000 (Média-Alta)', 'R$ 3.000 a 4.500 (Média)', 'R$ 4.500 a 7.000 (Média-Baixa)', 'Acima de R$ 7.000 (Baixa Vuln.)'],
          datasets: [{
            label: 'Setores Censitários',
            data: [r.ate2000, r.de2000a3000, r.de3000a4500, r.de4500a7000, r.acima7000],
            backgroundColor: ['#d73027', '#fc8d59', '#fee090', '#91bfdb', '#4575b4'],
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
                label: (ctx) => `${ctx.raw} setores censitários`
              }
            }
          },
          scales: {
            x: { ticks: { color: '#cbd5e1', font: { size: 10.5 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.06)' } }
          }
        }
      });
    }
  }

  async zoomToBairroByName(nameQuery) {
    await this.layerManager.loadLayerData('bairros');
    const layer = this.layerManager.getLayer('bairros');
    const features = layer.getSource().getFeatures();
    const cleanQuery = nameQuery.toLowerCase().split('/')[0].trim();

    const matched = features.find(f => {
      const desc = (f.get('Descri____') || f.get('Name') || '').toLowerCase();
      return desc.includes(cleanQuery);
    });

    if (matched) {
      this.mapEngine.setHighlight(matched);
      const geom = matched.getGeometry();
      this.mapEngine.zoomTo(geom.getExtent());
      const cfg = this.layerManager.getConfig('bairros');
      this.popupUI.showPopupForFeature(matched, cfg, ol.extent.getCenter(geom.getExtent()));
    }
  }

  async zoomToDistritoByName(distName) {
    await this.layerManager.loadLayerData('distritos');
    const layer = this.layerManager.getLayer('distritos');
    const features = layer.getSource().getFeatures();
    const cleanName = distName.replace(/\(Sede\)/i, '').trim().toLowerCase();

    const matched = features.find(f => {
      const n = (f.get('nome') || '').toLowerCase();
      return n.includes(cleanName);
    });

    if (matched) {
      this.mapEngine.setHighlight(matched);
      const geom = matched.getGeometry();
      this.mapEngine.zoomTo(geom.getExtent(), { maxZoom: 16 });
      const cfg = this.layerManager.getConfig('distritos');
      this.popupUI.showPopupForFeature(matched, cfg, geom.getCoordinates());
    }
  }

  /**
   * Renders the interactive shelters table in the expanded dashboard modal
   */
  async renderSheltersTable() {
    const tbody = document.getElementById('dash-shelters-table-body');
    if (!tbody) return;

    await this.layerManager.loadLayerData('abrigos_defesa_civil');
    const layer = this.layerManager.getLayer('abrigos_defesa_civil');
    if (!layer) return;

    const features = layer.getSource().getFeatures();
    if (!features || features.length === 0) return;

    this.shelterFeatures = features;

    const renderRows = (list) => {
      tbody.innerHTML = '';
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:16px; color:var(--text-muted);">Nenhum abrigo localizado com o filtro informado.</td></tr>`;
        return;
      }

      list.forEach(f => {
        const props = f.getProperties();
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.15s; cursor:pointer;';
        tr.onmouseenter = () => tr.style.background = 'rgba(255,255,255,0.04)';
        tr.onmouseleave = () => tr.style.background = 'transparent';

        tr.innerHTML = `
          <td style="padding:7px 10px; font-weight:700; color:#38bdf8;">${props['ID'] || ''}</td>
          <td style="padding:7px 10px; font-weight:600; color:var(--text-main);">${props['Nome'] || ''}</td>
          <td style="padding:7px 10px;"><span class="badge-blue" style="font-size:10px;">${props['Tipo'] || 'ABRIGO'}</span></td>
          <td style="padding:7px 10px; color:var(--text-muted);">${props['Endereço'] || '-'}</td>
          <td style="padding:7px 10px; text-align:right; font-weight:700; color:var(--text-main);">${props['Área de Alojamento'] || '-'}</td>
          <td style="padding:7px 10px; text-align:center;">
            <button class="mini-btn btn-view-shelter-map" style="padding:3px 8px; font-size:11px;" title="Aproximar no Mapa">
              <i class="lucide-map-pin"></i> Ver
            </button>
          </td>
        `;

        const onSelect = () => {
          this.closeModal();
          this.zoomToShelterFeature(f);
        };

        tr.addEventListener('click', onSelect);
        tbody.appendChild(tr);
      });

      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    };

    renderRows(features);

    const searchInput = document.getElementById('dash-shelters-search');
    if (searchInput && !this.shelterSearchBound) {
      this.shelterSearchBound = true;
      searchInput.addEventListener('input', (e) => {
        const q = (e.target.value || '').toLowerCase().trim();
        if (!q) {
          renderRows(this.shelterFeatures);
        } else {
          const filtered = this.shelterFeatures.filter(f => {
            const p = f.getProperties();
            const str = `${p['ID']} ${p['Nome']} ${p['Tipo']} ${p['Endereço']}`.toLowerCase();
            return str.includes(q);
          });
          renderRows(filtered);
        }
      });
    }
  }

  /**
   * Zooms to the selected shelter on the map, highlights it and opens popup
   */
  async zoomToShelterFeature(feature) {
    const geom = feature.getGeometry();
    if (!geom) return;

    // Ensure layer is visible
    this.layerManager.setLayerVisibility('abrigos_defesa_civil', true);
    const checkbox = document.querySelector(`input[data-layer-id="abrigos_defesa_civil"]`);
    if (checkbox) checkbox.checked = true;

    const coords = geom.getCoordinates();
    this.mapEngine.setHighlight(feature);
    this.mapEngine.getOlMap().getView().animate({
      center: coords,
      zoom: 16.5,
      duration: 700
    });

    const cfg = this.layerManager.getConfig('abrigos_defesa_civil');
    this.popupUI.showPopupForFeature(feature, cfg, coords);
  }

  /**
   * Renders the interactive SGB risk sectors ranking table in the expanded dashboard modal
   */
  async renderSgbSectorsTable() {
    const tbody = document.getElementById('dash-sgb-sectors-table-body');
    if (!tbody) return;

    await Promise.all([
      this.layerManager.loadLayerData('mapeamento_sgb_2025'),
      this.layerManager.loadLayerData('abrigos_defesa_civil')
    ]);
    const layer = this.layerManager.getLayer('mapeamento_sgb_2025');
    const shelterLayer = this.layerManager.getLayer('abrigos_defesa_civil');
    if (!layer) return;

    const features = layer.getSource().getFeatures();
    if (!features || features.length === 0) return;

    const shelterFeatures = shelterLayer ? shelterLayer.getSource().getFeatures() : [];

    // Pre-calculate nearest shelters and IPP for each SGB sector
    const processedFeatures = features.map(f => {
      const props = f.getProperties();
      const geom = f.getGeometry();
      const edif = parseInt(props['NUM_EDIF'] || 0, 10);
      const pess = parseInt(props['NUM_PESS'] || 0, 10);
      const risco = props['GRAU_RISCO'] || 'Alto';
      const vulne = props['GRAU_VULNE'] || 'Alto';

      let nearestShelterName = 'Ginásio Municipal';
      let minDistance = 9999;

      if (geom && shelterFeatures.length > 0) {
        const center = ol.extent.getCenter(geom.getExtent());
        shelterFeatures.forEach(sf => {
          const sGeom = sf.getGeometry();
          if (sGeom) {
            const sCoords = sGeom.getCoordinates();
            const dx = center[0] - sCoords[0];
            const dy = center[1] - sCoords[1];
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistance) {
              minDistance = dist;
              nearestShelterName = sf.get('Nome') || 'Abrigo';
            }
          }
        });
      }

      const riskWeight = risco.toLowerCase().includes('muito') ? 40 : 25;
      const vulnWeight = vulne.toLowerCase().includes('alto') ? 25 : 15;
      const popWeight = Math.min(25, (pess / 352.0) * 25);
      const distWeight = Math.min(10, (minDistance / 2000.0) * 10);
      const ippScore = +(riskWeight + vulnWeight + popWeight + distWeight).toFixed(1);

      return {
        feature: f,
        props,
        geom,
        edif,
        pess,
        risco,
        vulne,
        nearestShelterName,
        minDistance: Math.round(minDistance),
        ippScore
      };
    });

    // Sort features by IPP priority score descending
    processedFeatures.sort((a, b) => b.ippScore - a.ippScore);
    this.sgbSectorFeatures = processedFeatures;

    const renderRows = (list) => {
      tbody.innerHTML = '';
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:16px; color:var(--text-muted);">Nenhum setor de risco SGB localizado com o filtro informado.</td></tr>`;
        return;
      }

      list.forEach(item => {
        const { feature, props, edif, pess, risco, vulne, nearestShelterName, minDistance, ippScore } = item;
        const isMuitoAlto = risco.toLowerCase().includes('muito');
        const isVulneAlta = vulne.toLowerCase().includes('alto');
        const distColor = minDistance <= 1000 ? '#34d399' : (minDistance <= 2000 ? '#60a5fa' : '#f59e0b');

        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.15s; cursor:pointer;';
        tr.onmouseenter = () => tr.style.background = 'rgba(255,255,255,0.04)';
        tr.onmouseleave = () => tr.style.background = 'transparent';

        tr.innerHTML = `
          <td style="padding:7px 10px; font-weight:700; color:#fdba74; font-family:var(--font-mono);">${props['NUM_SETOR'] || ''}</td>
          <td style="padding:7px 10px; font-weight:500; color:var(--text-main); max-width:220px; white-space:normal;">${props['LOCAL'] || '-'}</td>
          <td style="padding:7px 10px; text-align:center;">
            <span style="font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:10px; background:${isMuitoAlto ? 'rgba(220,38,38,0.2)' : 'rgba(234,88,12,0.2)'}; color:${isMuitoAlto ? '#fca5a5' : '#fdba74'}; border:1px solid ${isMuitoAlto ? '#dc2626' : '#ea580c'};">
              ${risco}
            </span>
          </td>
          <td style="padding:7px 10px; text-align:center;">
            <span style="font-size:10.5px; font-weight:600; padding:2px 8px; border-radius:10px; background:${isVulneAlta ? 'rgba(245,158,11,0.18)' : 'rgba(234,179,8,0.12)'}; color:${isVulneAlta ? '#fcd34d' : '#fef08a'};">
              ${vulne}
            </span>
          </td>
          <td style="padding:7px 10px; text-align:right; font-weight:700; color:var(--text-main);">${edif}</td>
          <td style="padding:7px 10px; text-align:right; font-weight:700; color:#f87171;">${pess}</td>
          <td style="padding:7px 10px; font-size:11px; color:var(--text-muted); max-width:180px; white-space:normal;">${nearestShelterName}</td>
          <td style="padding:7px 10px; text-align:center; font-weight:700; font-family:var(--font-mono); color:${distColor};">${minDistance}m</td>
          <td style="padding:7px 10px; text-align:center;">
            <span class="badge-blue" style="font-size:11px; font-weight:800; background:rgba(37,99,235,0.2); border:1px solid #2563eb; color:#93c5fd;" title="Índice de Prioridade de Proteção">${ippScore}</span>
          </td>
          <td style="padding:7px 10px; text-align:center;">
            <button class="mini-btn btn-view-sgb-map" style="padding:3px 8px; font-size:11px; background:#ea580c; border:none; color:#fff;" title="Aproximar no Setor de Risco">
              <i class="lucide-map-pin"></i> Ver
            </button>
          </td>
        `;

        const onSelect = () => {
          this.closeModal();
          this.zoomToSgbSectorFeature(feature);
        };

        tr.addEventListener('click', onSelect);
        tbody.appendChild(tr);
      });

      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    };

    renderRows(sortedFeatures);

    const searchInput = document.getElementById('dash-sgb-sectors-search');
    if (searchInput && !this.sgbSearchBound) {
      this.sgbSearchBound = true;
      searchInput.addEventListener('input', (e) => {
        const q = (e.target.value || '').toLowerCase().trim();
        if (!q) {
          renderRows(this.sgbSectorFeatures);
        } else {
          const filtered = this.sgbSectorFeatures.filter(f => {
            const p = f.getProperties();
            const str = `${p['NUM_SETOR']} ${p['LOCAL']} ${p['GRAU_RISCO']} ${p['GRAU_VULNE']} ${p['DESCRICAO']}`.toLowerCase();
            return str.includes(q);
          });
          renderRows(filtered);
        }
      });
    }
  }

  /**
   * Zooms to the selected SGB Risk Sector polygon on the map, highlights it and opens popup
   */
  async zoomToSgbSectorFeature(feature) {
    const geom = feature.getGeometry();
    if (!geom) return;

    // Ensure layer is visible
    this.layerManager.setLayerVisibility('mapeamento_sgb_2025', true);
    const checkbox = document.querySelector(`input[data-layer-id="mapeamento_sgb_2025"]`);
    if (checkbox) checkbox.checked = true;

    this.mapEngine.setHighlight(feature);
    const extent = geom.getExtent();
    this.mapEngine.zoomTo(extent);

    const cfg = this.layerManager.getConfig('mapeamento_sgb_2025');
    this.popupUI.showPopupForFeature(feature, cfg, ol.extent.getCenter(extent));
  }
}
