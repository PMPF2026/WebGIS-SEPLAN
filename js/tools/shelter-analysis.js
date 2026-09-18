/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Módulo Avançado de Análise Espacial e Populacional dos Abrigos da Defesa Civil
 */

import { loadGeoJson } from '../utils/async-loader.js';
import { formatNumber } from '../utils/formatters.js';
import { Notification } from '../ui/notification.js';

export class ShelterAnalysisTool {
  constructor(mapEngine, layerManager, popupUI) {
    this.mapEngine = mapEngine;
    this.map = mapEngine.getOlMap();
    this.layerManager = layerManager;
    this.popupUI = popupUI;

    this.abrigosData = null;
    this.bairrosData = null;
    this.analysisResults = null;
    this.activeRadius = null;

    // Vector layer for temporary highlight lines & proximity rings on map
    this.highlightSource = new ol.source.Vector();
    this.highlightLayer = new ol.layer.Vector({
      source: this.highlightSource,
      zIndex: 920,
      style: (feature) => this.getFeatureStyle(feature)
    });
    this.map.addLayer(this.highlightLayer);

    // Chart instances
    this.charts = {};

    this.initUI();
  }

  getFeatureStyle(feature) {
    const type = feature.get('analysisType');
    if (type === 'connectionLine') {
      const dist = feature.get('distance');
      return [
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: '#2563eb',
            width: 3.5,
            lineDash: [8, 6]
          })
        }),
        new ol.style.Style({
          geometry: feature.getGeometry(),
          text: new ol.style.Text({
            text: `Distância: ${formatNumber(dist, 1)} m`,
            font: 'bold 12px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#ffffff' }),
            stroke: new ol.style.Stroke({ color: '#0f172a', width: 3.5 }),
            backgroundFill: new ol.style.Fill({ color: 'rgba(37, 99, 235, 0.90)' }),
            padding: [4, 8, 4, 8],
            offsetY: -12
          })
        })
      ];
    }

    if (type === 'targetPoint') {
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 12,
          fill: new ol.style.Fill({ color: 'rgba(37, 99, 235, 0.4)' }),
          stroke: new ol.style.Stroke({ color: '#2563eb', width: 3 })
        })
      });
    }

    if (type === 'nearestPoint') {
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 10,
          fill: new ol.style.Fill({ color: 'rgba(16, 185, 129, 0.4)' }),
          stroke: new ol.style.Stroke({ color: '#10b981', width: 2.5 })
        })
      });
    }

    if (type === 'proximityBuffer') {
      return new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: '#2563eb',
          width: 2,
          lineDash: [6, 4]
        }),
        fill: new ol.style.Fill({
          color: 'rgba(37, 99, 235, 0.15)'
        })
      });
    }

    return null;
  }

  async initUI() {
    // 1. Header Open Button
    const btnOpenModal = document.getElementById('btn-open-shelter-analysis-modal');
    const modal = document.getElementById('shelter-analysis-modal');
    const btnCloseModal = document.getElementById('btn-close-shelter-analysis-modal');

    if (btnOpenModal && modal) {
      btnOpenModal.addEventListener('click', async () => {
        modal.classList.add('active');
        await this.runAnalysis();
        this.renderModal();
      });
    }

    if (btnCloseModal && modal) {
      btnCloseModal.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    // Close modal on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
        modal.classList.remove('active');
      }
    });

    // 2. Sidebar Tool Button (in Tab Análise)
    const btnSidebarRun = document.getElementById('btn-run-shelter-analysis');
    if (btnSidebarRun) {
      btnSidebarRun.addEventListener('click', async () => {
        if (btnOpenModal) {
          btnOpenModal.click();
        } else {
          await this.runAnalysis();
          this.renderModal();
        }
      });
    }

    // 3. Clear shelter analysis graphics button
    const btnClearAnalysis = document.getElementById('btn-clear-shelter-map');
    if (btnClearAnalysis) {
      btnClearAnalysis.addEventListener('click', () => {
        this.clearMapHighlights();
      });
    }
  }

  /**
   * Main calculation engine for shelters and demographic cross-referencing
   */
  async runAnalysis() {
    if (this.analysisResults) {
      return this.analysisResults;
    }

    try {
      const [abrigosGeo, bairrosGeo] = await Promise.all([
        loadGeoJson('Abrigos da Defesa Civil.geojson'),
        loadGeoJson('Bairros Passo Fundo.geojson')
      ]);

      this.abrigosData = abrigosGeo;
      this.bairrosData = bairrosGeo;

      const rawAbrigos = abrigosGeo.features.map(f => ({
        id: f.properties.ID || f.properties.id,
        nome: f.properties.Nome || f.properties.nome,
        tipo: f.properties.Tipo || f.properties.tipo,
        area: f.properties['Área de Alojamento'] || f.properties.area_alojamento || '-',
        endereco: f.properties['Endereço'] || f.properties.endereco || '-',
        x: f.geometry.coordinates[0],
        y: f.geometry.coordinates[1]
      }));

      // 1. Spatial point-in-polygon matching with Bairros
      const abrigos = rawAbrigos.map(a => {
        let matchedBairro = 'São José';
        let pop2022 = 9969;

        for (const b of bairrosGeo.features) {
          if (this.isPointInGeometry([a.x, a.y], b.geometry)) {
            const raw = b.properties.Descri____ || b.properties.Name || '';
            matchedBairro = raw.replace(/^Região do Bairro\s*/i, '').replace(/^Região do bairro\s*/i, '').trim();
            pop2022 = parseInt(b.properties.Pop_2022, 10) || 0;
            break;
          }
        }

        if (a.nome.includes('Canaã')) {
          matchedBairro = 'São José';
          pop2022 = 9969;
        }

        return { ...a, bairro: matchedBairro, popBairro2022: pop2022 };
      });

      // 2. Pairwise Distance Calculations
      const n = abrigos.length;
      let minPairDist = Infinity;
      let minPair = null;
      let maxPairDist = -Infinity;
      let maxPair = null;
      const allPairDists = [];
      const nearestDists = [];

      const matrix = [];

      for (let i = 0; i < n; i++) {
        const a1 = abrigos[i];
        const dists = [];

        for (let j = 0; j < n; j++) {
          if (i !== j) {
            const a2 = abrigos[j];
            const dx = a1.x - a2.x;
            const dy = a1.y - a2.y;
            const d = Math.sqrt(dx * dx + dy * dy);

            dists.push({
              target: a2,
              dist: d
            });

            if (i < j) {
              allPairDists.push(d);
              if (d < minPairDist) {
                minPairDist = d;
                minPair = { a1, a2, dist: d };
              }
              if (d > maxPairDist) {
                maxPairDist = d;
                maxPair = { a1, a2, dist: d };
              }
            }
          }
        }

        dists.sort((a, b) => a.dist - b.dist);
        const nn1 = dists[0];
        const nn2 = dists[1];
        nearestDists.push(nn1.dist);

        const count1km = dists.filter(d => d.dist <= 1000).length;
        const count2km = dists.filter(d => d.dist <= 2000).length;
        const count5km = dists.filter(d => d.dist <= 5000).length;

        matrix.push({
          abrigo: a1,
          nn1: nn1.target,
          nn1Dist: nn1.dist,
          nn2: nn2 ? nn2.target : null,
          nn2Dist: nn2 ? nn2.dist : null,
          count1km,
          count2km,
          count5km,
          allDists: dists
        });
      }

      const avgPairDist = allPairDists.reduce((s, v) => s + v, 0) / allPairDists.length;
      const avgNNDist = nearestDists.reduce((s, v) => s + v, 0) / nearestDists.length;

      // 3. Aggregate by Neighborhood
      const bairroMap = new Map();
      abrigos.forEach(a => {
        if (!bairroMap.has(a.bairro)) {
          bairroMap.set(a.bairro, {
            bairro: a.bairro,
            pop2022: a.popBairro2022,
            abrigos: [],
            totalAreaM2: 0
          });
        }
        const bEntry = bairroMap.get(a.bairro);
        bEntry.abrigos.push(a);
        const numArea = parseFloat(a.area.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        bEntry.totalAreaM2 += numArea;
      });

      const bairroStats = Array.from(bairroMap.values()).map(b => {
        const qtd = b.abrigos.length;
        const popPorAbrigo = qtd > 0 ? Math.round(b.pop2022 / qtd) : 0;
        const abrigosPor10k = b.pop2022 > 0 ? Number(((qtd / b.pop2022) * 10000).toFixed(2)) : 0;

        return {
          ...b,
          qtdAbrigos: qtd,
          popPorAbrigo,
          abrigosPor10k
        };
      });

      bairroStats.sort((a, b) => b.qtdAbrigos - a.qtdAbrigos || b.pop2022 - a.pop2022);

      this.analysisResults = {
        totalAbrigos: n,
        abrigos,
        matrix,
        minPair,
        maxPair,
        avgPairDist,
        avgNNDist,
        bairroStats
      };

      return this.analysisResults;
    } catch (err) {
      console.error('[ShelterAnalysisTool] Erro ao processar análise de abrigos:', err);
      Notification.error('Erro ao calcular análise dos abrigos: ' + err.message);
      return null;
    }
  }

  isPointInGeometry(point, geom) {
    const [px, py] = point;
    if (geom.type === 'Polygon') {
      return this.isPointInPolygon(px, py, geom.coordinates);
    }
    if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        if (this.isPointInPolygon(px, py, poly)) return true;
      }
    }
    return false;
  }

  isPointInPolygon(px, py, rings) {
    let inside = false;
    for (const ring of rings) {
      const n = ring.length;
      let j = n - 1;
      for (let i = 0; i < n; i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const intersect = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
        j = i;
      }
      if (inside) break;
    }
    return inside;
  }

  /**
   * Render the complete modal contents
   */
  renderModal() {
    const res = this.analysisResults;
    if (!res) return;

    // 1. Populate KPI Summary Cards
    const kpiTotal = document.getElementById('shelter-kpi-total');
    const kpiMinDist = document.getElementById('shelter-kpi-min-dist');
    const kpiMinPair = document.getElementById('shelter-kpi-min-pair');
    const kpiMaxDist = document.getElementById('shelter-kpi-max-dist');
    const kpiMaxPair = document.getElementById('shelter-kpi-max-pair');
    const kpiAvgNN = document.getElementById('shelter-kpi-avg-nn');
    const kpiAvgNet = document.getElementById('shelter-kpi-avg-net');

    if (kpiTotal) kpiTotal.textContent = res.totalAbrigos;
    if (kpiMinDist) kpiMinDist.textContent = `${formatNumber(res.minPair.dist, 1)} m`;
    if (kpiMinPair) kpiMinPair.textContent = `${res.minPair.a1.id} e ${res.minPair.a2.id}`;
    if (kpiMaxDist) kpiMaxDist.textContent = `${formatNumber(res.maxPair.dist / 1000, 2)} km`;
    if (kpiMaxPair) kpiMaxPair.textContent = `${res.maxPair.a1.id} e ${res.maxPair.a2.id}`;
    if (kpiAvgNN) kpiAvgNN.textContent = `${formatNumber(res.avgNNDist, 1)} m`;
    if (kpiAvgNet) kpiAvgNet.textContent = `${formatNumber(res.avgPairDist / 1000, 2)} km`;

    // 2. Render Distance Matrix Table
    this.renderShelterTable(res.matrix);

    // 3. Render Neighborhoods Table
    this.renderBairrosTable(res.bairroStats);

    // 4. Render Charts
    this.renderCharts(res);

    // 5. Render Conclusions & Diagnostic Insights
    this.renderConclusions(res);

    // 6. Bind Tabs inside modal
    this.bindModalTabs();

    // 7. Bind Proximity Radii Buttons
    this.bindRadiiButtons();

    // 8. Bind Filter Search Input
    this.bindTableSearch();
  }

  renderShelterTable(matrix) {
    const tbody = document.getElementById('shelter-table-body');
    if (!tbody) return;

    let html = '';
    matrix.forEach(item => {
      const a = item.abrigo;
      html += `
        <tr class="shelter-row" data-abrigo-id="${a.id}">
          <td style="font-weight:700; color:var(--dc-orange-primary); white-space:nowrap;">${a.id}</td>
          <td>
            <div style="font-weight:600; color:var(--text-main);">${a.nome}</div>
            <div style="font-size:11px; color:var(--text-muted);">${a.endereco}</div>
          </td>
          <td><span class="badge-bairro">${a.bairro}</span></td>
          <td style="text-align:right; font-weight:600;">${formatNumber(a.popBairro2022)}</td>
          <td>
            <div style="font-weight:600; color:#60a5fa;">${item.nn1.id} &bull; ${item.nn1.nome}</div>
            <div style="font-size:11px; color:var(--text-muted);">2º: ${item.nn2 ? item.nn2.id + ' (' + formatNumber(item.nn2Dist, 0) + 'm)' : '-'}</div>
          </td>
          <td style="text-align:right; font-weight:700; color:var(--dc-info-cyan);">${formatNumber(item.nn1Dist, 1)} m</td>
          <td style="text-align:center;"><span class="badge-count ${item.count1km > 0 ? 'active' : ''}">${item.count1km}</span></td>
          <td style="text-align:center;"><span class="badge-count ${item.count2km > 0 ? 'active' : ''}">${item.count2km}</span></td>
          <td style="text-align:center;"><span class="badge-count ${item.count5km > 0 ? 'active' : ''}">${item.count5km}</span></td>
          <td style="text-align:center;">
            <button class="mini-btn btn-view-shelter-map" data-id="${a.id}" title="Destacar abrigo e conexão no mapa">
              <i class="lucide-crosshair"></i> Mapa
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Click event to highlight on map
    tbody.querySelectorAll('.btn-view-shelter-map').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        this.highlightShelterOnMap(id);
        const modal = document.getElementById('shelter-analysis-modal');
        if (modal) modal.classList.remove('active');
        Notification.info(`Abrigo ${id} destacado no mapa com conexão ao vizinho mais próximo.`);
      });
    });

    tbody.querySelectorAll('.shelter-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-abrigo-id');
        this.highlightShelterOnMap(id);
        const modal = document.getElementById('shelter-analysis-modal');
        if (modal) modal.classList.remove('active');
        Notification.info(`Abrigo ${id} destacado no mapa com conexão ao vizinho mais próximo.`);
      });
    });
  }

  renderBairrosTable(bairroStats) {
    const tbody = document.getElementById('shelter-bairros-table-body');
    if (!tbody) return;

    let html = '';
    bairroStats.forEach(b => {
      html += `
        <tr>
          <td style="font-weight:700; color:var(--text-main);">${b.bairro}</td>
          <td style="text-align:right; font-weight:600;">${formatNumber(b.pop2022)} hab</td>
          <td style="text-align:center;"><span class="badge-count active" style="font-size:12px;">${b.qtdAbrigos}</span></td>
          <td style="text-align:right; font-weight:600; color:var(--text-muted);">${formatNumber(b.popPorAbrigo)} hab/abrigo</td>
          <td style="text-align:right; font-weight:700; color:var(--dc-safe-green);">${b.abrigosPor10k}</td>
          <td style="font-size:11.5px; color:var(--text-subtle);">${b.abrigos.map(a => a.id).join(', ')}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  renderCharts(res) {
    if (typeof Chart === 'undefined') return;

    // 1. Chart Abrigos por Bairro
    const ctxBairros = document.getElementById('chart-shelters-by-bairro');
    if (ctxBairros) {
      if (this.charts.bairros) this.charts.bairros.destroy();
      this.charts.bairros = new Chart(ctxBairros, {
        type: 'bar',
        data: {
          labels: res.bairroStats.map(b => b.bairro),
          datasets: [{
            label: 'Quantidade de Abrigos',
            data: res.bairroStats.map(b => b.qtdAbrigos),
            backgroundColor: 'rgba(37, 99, 235, 0.75)',
            borderColor: '#2563eb',
            borderWidth: 1.5,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } }
          }
        }
      });
    }

    // 2. Chart População por Bairro com Abrigo
    const ctxPop = document.getElementById('chart-shelters-pop');
    if (ctxPop) {
      if (this.charts.pop) this.charts.pop.destroy();
      this.charts.pop = new Chart(ctxPop, {
        type: 'bar',
        data: {
          labels: res.bairroStats.map(b => b.bairro),
          datasets: [{
            label: 'População IBGE 2022',
            data: res.bairroStats.map(b => b.pop2022),
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: '#10b981',
            borderWidth: 1.5,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } }
          }
        }
      });
    }

    // 3. Chart Distância até o Vizinho Mais Próximo
    const ctxDist = document.getElementById('chart-shelters-nn-dist');
    if (ctxDist) {
      if (this.charts.dist) this.charts.dist.destroy();
      this.charts.dist = new Chart(ctxDist, {
        type: 'bar',
        data: {
          labels: res.matrix.map(m => m.abrigo.id),
          datasets: [{
            label: 'Distância ao Vizinho Mais Próximo (metros)',
            data: res.matrix.map(m => Math.round(m.nn1Dist)),
            backgroundColor: 'rgba(245, 158, 11, 0.75)',
            borderColor: '#f59e0b',
            borderWidth: 1.5,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } }
          }
        }
      });
    }
  }

  renderConclusions(res) {
    const el = document.getElementById('shelter-conclusions-box');
    if (!el) return;

    const topBairroAbrigos = res.bairroStats[0];
    const topBairroPop = [...res.bairroStats].sort((a, b) => b.pop2022 - a.pop2022)[0];

    const abrigosComVizinho1km = res.matrix.filter(m => m.count1km > 0).length;
    const pct1km = Math.round((abrigosComVizinho1km / res.totalAbrigos) * 100);

    el.innerHTML = `
      <div class="conclusion-card">
        <div class="conclusion-header">
          <i class="lucide-check-circle-2" style="color:var(--dc-safe-green);"></i>
          <strong>Síntese Estratégica da Rede de Abrigos de Passo Fundo</strong>
        </div>
        <ul class="conclusion-list">
          <li><strong>Rede Cadastrada:</strong> A Defesa Civil Municipal conta com <strong>${res.totalAbrigos} abrigos</strong> estruturados distribuídos por <strong>${res.bairroStats.length} grandes regiões urbanas</strong>.</li>
          <li><strong>Bairro com Maior Concentração de Abrigos:</strong> <strong>${topBairroAbrigos.bairro}</strong> com <strong>${topBairroAbrigos.qtdAbrigos} abrigos</strong> (População: ${formatNumber(topBairroAbrigos.pop2022)} hab).</li>
          <li><strong>Bairro Mais Populoso com Abrigo:</strong> <strong>${topBairroPop.bairro}</strong> com <strong>${formatNumber(topBairroPop.pop2022)} habitantes</strong> e <strong>${topBairroPop.qtdAbrigos} abrigo(s)</strong>.</li>
          <li><strong>Maior Proximidade Entre Abrigos:</strong> O par mais próximo é formado por <strong>${res.minPair.a1.id} (${res.minPair.a1.nome})</strong> e <strong>${res.minPair.a2.id} (${res.minPair.a2.nome})</strong>, distantes apenas <strong>${formatNumber(res.minPair.dist, 1)} metros</strong>.</li>
          <li><strong>Extensão Territorial da Rede:</strong> O par de abrigos mais distante compreende <strong>${res.maxPair.a1.id} (${res.maxPair.a1.nome})</strong> e <strong>${res.maxPair.a2.id} (${res.maxPair.a2.nome})</strong>, distantes <strong>${formatNumber(res.maxPair.dist / 1000, 2)} km</strong>, cobrindo o eixo norte-sul/leste-oeste do município.</li>
          <li><strong>Densidade de Proximidade:</strong> A distância média até o abrigo vizinho mais próximo é de <strong>${formatNumber(res.avgNNDist, 0)} metros</strong>, e <strong>${pct1km}% dos abrigos (${abrigosComVizinho1km} de ${res.totalAbrigos})</strong> possuem outro abrigo a menos de 1 km.</li>
          <li><strong>Informação de Capacidade:</strong> Capacidade de pessoas por abrigo não declarada na base cadastral utilizada (disponível apenas Área de Alojamento em m² para estimativa operacional de resposta a desastres).</li>
        </ul>
      </div>
    `;
  }

  bindModalTabs() {
    const tabs = document.querySelectorAll('.shelter-modal-tab-btn');
    const panels = document.querySelectorAll('.shelter-modal-tab-panel');

    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) targetPanel.classList.add('active');

        // Trigger chart resize if charts tab opened
        if (targetId === 'shelter-tab-charts') {
          setTimeout(() => {
            Object.values(this.charts).forEach(c => c.resize());
          }, 100);
        }
      });
    });
  }

  bindRadiiButtons() {
    const buttons = document.querySelectorAll('.shelter-radius-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const radiusMeters = parseInt(btn.getAttribute('data-radius'), 10);
        if (this.activeRadius === radiusMeters) {
          this.activeRadius = null;
          buttons.forEach(b => b.classList.remove('active'));
          this.clearBufferCircles();
          Notification.info('Raio de proximidade desativado.');
        } else {
          this.activeRadius = radiusMeters;
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.drawProximityBuffers(radiusMeters);
          Notification.success(`Raios de proximidade de ${radiusMeters >= 1000 ? (radiusMeters/1000) + ' km' : radiusMeters + ' m'} gerados no mapa.`);
        }
      });
    });
  }

  bindTableSearch() {
    const input = document.getElementById('shelter-table-search');
    if (!input) return;

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      const rows = document.querySelectorAll('#shelter-table-body tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    });
  }

  /**
   * Highlights a selected shelter on the map and draws a connection line to its nearest neighbor
   * @param {string} shelterId 
   */
  highlightShelterOnMap(shelterId) {
    if (!this.analysisResults) return;

    const item = this.analysisResults.matrix.find(m => m.abrigo.id === shelterId);
    if (!item) return;

    this.highlightSource.clear();

    const a1 = item.abrigo;
    const a2 = item.nn1;

    // 1. Target Point
    const p1Feat = new ol.Feature({
      geometry: new ol.geom.Point([a1.x, a1.y]),
      analysisType: 'targetPoint'
    });

    // 2. Nearest Point
    const p2Feat = new ol.Feature({
      geometry: new ol.geom.Point([a2.x, a2.y]),
      analysisType: 'nearestPoint'
    });

    // 3. Connection Line
    const lineFeat = new ol.Feature({
      geometry: new ol.geom.LineString([[a1.x, a1.y], [a2.x, a2.y]]),
      analysisType: 'connectionLine',
      distance: item.nn1Dist
    });

    this.highlightSource.addFeatures([p1Feat, p2Feat, lineFeat]);

    // Zoom and center map
    const extent = ol.extent.boundingExtent([[a1.x, a1.y], [a2.x, a2.y]]);
    const bufferedExtent = ol.extent.buffer(extent, Math.max(item.nn1Dist * 0.4, 300));

    this.map.getView().fit(bufferedExtent, {
      duration: 800,
      maxZoom: 17
    });

    // Open popup for selected shelter
    setTimeout(() => {
      if (this.popupUI) {
        const layerConfig = this.layerManager.getLayerConfig('abrigos_defesa_civil');
        if (layerConfig) {
          this.popupUI.showPopup([a1.x, a1.y], {
            Nome: a1.nome,
            ID: a1.id,
            Tipo: a1.tipo,
            'Área de Alojamento': a1.area,
            'Endereço': a1.endereco,
            'Vizinho Mais Próximo': `${a2.id} - ${a2.nome} (${formatNumber(item.nn1Dist, 1)} m)`,
            Coord_X: Math.round(a1.x),
            Coord_Y: Math.round(a1.y)
          }, layerConfig);
        }
      }
    }, 850);
  }

  drawProximityBuffers(radiusMeters) {
    if (!this.analysisResults) return;

    // Clear previous buffer features
    const existingBuffers = this.highlightSource.getFeatures().filter(f => f.get('analysisType') === 'proximityBuffer');
    existingBuffers.forEach(f => this.highlightSource.removeFeature(f));

    const bufferFeatures = [];

    this.analysisResults.abrigos.forEach(a => {
      // Create circle geometry in UTM coordinates (meters)
      const circleGeom = new ol.geom.Circle([a.x, a.y], radiusMeters);
      const polyGeom = ol.geom.Polygon.fromCircle(circleGeom, 64);

      const feat = new ol.Feature({
        geometry: polyGeom,
        analysisType: 'proximityBuffer',
        radiusMeters
      });
      bufferFeatures.push(feat);
    });

    this.highlightSource.addFeatures(bufferFeatures);
  }

  clearBufferCircles() {
    const existingBuffers = this.highlightSource.getFeatures().filter(f => f.get('analysisType') === 'proximityBuffer');
    existingBuffers.forEach(f => this.highlightSource.removeFeature(f));
  }

  clearMapHighlights() {
    this.highlightSource.clear();
    this.activeRadius = null;
    document.querySelectorAll('.shelter-radius-btn').forEach(b => b.classList.remove('active'));
    Notification.info('Análise espacial limpa no mapa.');
  }
}
