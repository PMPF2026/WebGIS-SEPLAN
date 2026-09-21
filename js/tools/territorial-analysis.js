/**
 * WebGIS SEPLAN Passo Fundo - Diagnósticos Territoriais
 * Módulo de Análise Espacial Territorial: Geração de Faixas de Proteção Hidrográfica (Buffers)
 * 
 * Funcionalidades:
 * 1. Geração de buffers métricos (30 m, 50 m, 100 m) para Rio Passo Fundo e Malha Hídrica.
 * 2. Dissolução / união geométrica para formar polígonos contínuos sem sobreposições internas.
 * 3. Cálculo de área real em metros quadrados (m²) e hectares (ha).
 * 4. Controle individual de visibilidade, exclusão e exportação GeoJSON limpa.
 * 5. Integração dinâmica com a Legenda Cartográfica sem alterar camadas originais.
 * 6. Preservação 100% das camadas e arquitetura do portal.
 */

import { Notification } from '../ui/notification.js';

export class TerritorialAnalysisTool {
  constructor(mapEngine, layerManager, legendUI) {
    this.mapEngine = mapEngine;
    this.map = mapEngine.getOlMap();
    this.layerManager = layerManager;
    this.legendUI = legendUI;

    // Mapa de análises ativas: key -> { id, layerId, layerName, radiusMeters, title, fillColor, strokeColor, zIndex, areaM2, areaHa, geojson, olLayer, visible }
    this.activeAnalyses = new Map();
    this.selectedRadius = 30;
    this.selectedLayerId = 'rio_passo_fundo';

    // Integração desacoplada com a Legenda
    if (this.legendUI && typeof this.legendUI.setAnalysisTool === 'function') {
      this.legendUI.setAnalysisTool(this);
    }

    this.initUI();
  }

  /**
   * Inicializa os ouvintes de eventos da interface da aba Análise
   */
  initUI() {
    // 1. Seletor de Camada Alvo
    const layerSelect = document.getElementById('analysis-layer-select');
    if (layerSelect) {
      this.selectedLayerId = layerSelect.value;
      layerSelect.addEventListener('change', (e) => {
        this.selectedLayerId = e.target.value;
      });
    }

    // 2. Botões Rápidos de Faixa (30m, 50m, 100m)
    const presetButtons = document.querySelectorAll('.analysis-preset-btn');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedRadius = parseInt(btn.getAttribute('data-radius'), 10) || 30;
      });
    });

    // 3. Botão Gerar Buffer
    const runBtn = document.getElementById('btn-run-analysis-buffer');
    if (runBtn) {
      runBtn.addEventListener('click', () => {
        this.executeBufferAnalysis(this.selectedLayerId, this.selectedRadius);
      });
    }

    // 4. Botão Limpar Análises
    const clearBtn = document.getElementById('btn-clear-analyses');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearAllAnalyses();
      });
    }

    this.renderResultsList();
  }

  /**
   * Costura segmentos lineares contíguos para evitar fragmentações e nós circulares
   */
  stitchLineSegments(lines, tolerance = 2e-5) {
    if (!lines || lines.length <= 1) return lines ? lines.slice() : [];

    const tolSq = tolerance * tolerance;
    const cellSize = Math.max(tolerance * 2, 1e-4);

    const distSq = (p1, p2) => {
      const dx = p1[0] - p2[0];
      const dy = p1[1] - p2[1];
      return dx * dx + dy * dy;
    };

    const cellKey = (pt) => `${Math.floor(pt[0] / cellSize)},${Math.floor(pt[1] / cellSize)}`;

    const segments = lines.map((coords, idx) => ({
      id: idx,
      coords: coords.map(p => [p[0], p[1]]),
      active: true
    }));

    const grid = new Map();
    for (const seg of segments) {
      const hKey = cellKey(seg.coords[0]);
      if (!grid.has(hKey)) grid.set(hKey, []);
      grid.get(hKey).push({ seg, isHead: true });

      const tKey = cellKey(seg.coords[seg.coords.length - 1]);
      if (!grid.has(tKey)) grid.set(tKey, []);
      grid.get(tKey).push({ seg, isHead: false });
    }

    const findNeighbor = (pt, excludeSeg) => {
      const cx = Math.floor(pt[0] / cellSize);
      const cy = Math.floor(pt[1] / cellSize);
      let best = null;
      let bestDist = tolSq;

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const entries = grid.get(`${cx + dx},${cy + dy}`);
          if (!entries) continue;
          for (const e of entries) {
            if (!e.seg.active || e.seg.id === excludeSeg.id) continue;
            const candPt = e.isHead ? e.seg.coords[0] : e.seg.coords[e.seg.coords.length - 1];
            const d = distSq(pt, candPt);
            if (d <= bestDist) {
              bestDist = d;
              best = e;
            }
          }
        }
      }
      return best;
    };

    const stitched = [];
    for (const startSeg of segments) {
      if (!startSeg.active) continue;
      startSeg.active = false;
      let currentCoords = startSeg.coords;

      // Extensão para frente (tail)
      let extending = true;
      while (extending) {
        extending = false;
        const tail = currentCoords[currentCoords.length - 1];
        const match = findNeighbor(tail, startSeg);
        if (match) {
          match.seg.active = false;
          let cand = match.seg.coords;
          if (!match.isHead) cand = cand.slice().reverse();
          currentCoords = currentCoords.concat(cand.slice(1));
          extending = true;
        }
      }

      // Extensão para trás (head)
      extending = true;
      while (extending) {
        extending = false;
        const head = currentCoords[0];
        const match = findNeighbor(head, startSeg);
        if (match) {
          match.seg.active = false;
          let cand = match.seg.coords;
          if (match.isHead) cand = cand.slice().reverse();
          currentCoords = cand.slice(0, -1).concat(currentCoords);
          extending = true;
        }
      }

      stitched.push(currentCoords);
    }

    return stitched;
  }

  /**
   * Executa a geração de buffer métrico e dissolução
   */
  async executeBufferAnalysis(layerId, radiusMeters) {
    if (typeof turf === 'undefined') {
      Notification.error('A biblioteca Turf.js não está carregada no ambiente.');
      return;
    }

    const runBtn = document.getElementById('btn-run-analysis-buffer');
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = '<i class="lucide-loader-2" style="animation: spin 1s linear infinite;"></i> Processando...';
    }

    const layerHumanName = layerId === 'rio_passo_fundo' ? 'Rio Passo Fundo' : "Cursos d'Água";
    Notification.info(`Gerando Faixa de ${radiusMeters} m — ${layerHumanName}...`);

    try {
      // 1. Carregamento seguro da camada de origem (somente leitura)
      await this.layerManager.loadLayerData(layerId);
      const layer = this.layerManager.getLayer(layerId);
      if (!layer) {
        Notification.warning(`Camada ${layerId} não encontrada no mapa.`);
        return;
      }

      const features = layer.getSource().getFeatures();
      if (!features || features.length === 0) {
        Notification.warning(`A camada ${layerHumanName} não possui feições carregadas.`);
        return;
      }

      // 2. Extração segura para GeoJSON em EPSG:4326 (WGS 84) para processamento geodésico no Turf
      const geoJsonFormat = new ol.format.GeoJSON();
      const rawLines = [];

      for (let i = 0; i < features.length; i++) {
        const geom = features[i].getGeometry();
        if (!geom) continue;

        try {
          const turfFeat = geoJsonFormat.writeFeatureObject(features[i], {
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4326'
          });

          if (turfFeat && turfFeat.geometry) {
            const g = turfFeat.geometry;
            if (g.type === 'LineString' && g.coordinates && g.coordinates.length >= 2) {
              rawLines.push(g.coordinates);
            } else if (g.type === 'MultiLineString' && g.coordinates) {
              for (const part of g.coordinates) {
                if (part && part.length >= 2) rawLines.push(part);
              }
            }
          }
        } catch (fErr) {
          console.warn('[TerritorialAnalysis] Erro ao extrair feição linear:', fErr);
        }
      }

      if (rawLines.length === 0) {
        Notification.warning('Nenhuma geometria linear válida identificada na camada.');
        return;
      }

      // 3. Normalização e costura topológica de segmentos contíguos
      const normalizedLines = [];
      for (const coords of rawLines) {
        const clean = [];
        for (const pt of coords) {
          if (!pt || pt.length < 2 || isNaN(pt[0]) || isNaN(pt[1])) continue;
          if (clean.length > 0) {
            const prev = clean[clean.length - 1];
            if (prev[0] === pt[0] && prev[1] === pt[1]) continue;
          }
          clean.push([pt[0], pt[1]]);
        }
        if (clean.length >= 2) normalizedLines.push(clean);
      }

      // Aplica costura para unir segmentos adjacentes
      const stitchedLines = (layerId === 'rio_passo_fundo' || normalizedLines.length <= 1500)
        ? this.stitchLineSegments(normalizedLines, 2e-5)
        : normalizedLines;

      // 4. Geração do buffer geodésico métrico com Turf
      const radiusKm = radiusMeters / 1000;
      const bufferedPolygons = [];

      for (const lineCoords of stitchedLines) {
        try {
          const ls = turf.lineString(lineCoords);
          const b = turf.buffer(ls, radiusKm, { units: 'kilometers' });
          if (b && b.geometry) {
            bufferedPolygons.push(b);
          }
        } catch (bufErr) {
          console.warn('[TerritorialAnalysis] Aviso ao aplicar buffer no trecho:', bufErr);
        }
      }

      if (bufferedPolygons.length === 0) {
        Notification.error('Não foi possível gerar as geometrias do buffer.');
        return;
      }

      // 5. Dissolução / União das geometrias sobrepostas
      let dissolvedFc = null;
      if (bufferedPolygons.length === 1) {
        dissolvedFc = turf.featureCollection(bufferedPolygons);
      } else {
        try {
          dissolvedFc = turf.dissolve(turf.featureCollection(bufferedPolygons));
        } catch (dissolveErr) {
          console.warn('[TerritorialAnalysis] Fallback para união iterativa de polígonos:', dissolveErr);
          let unified = bufferedPolygons[0];
          for (let i = 1; i < bufferedPolygons.length; i++) {
            try {
              const u = turf.union(unified, bufferedPolygons[i]);
              if (u) unified = u;
            } catch (uErr) {
              // Segue com o próximo polígono
            }
          }
          dissolvedFc = turf.featureCollection([unified]);
        }
      }

      // 6. Cálculo da área métrica real dissolvida
      let areaM2 = 0;
      try {
        areaM2 = turf.area(dissolvedFc);
      } catch (areaErr) {
        console.warn('[TerritorialAnalysis] Aviso ao calcular área com Turf:', areaErr);
      }
      const areaHa = areaM2 / 10000;

      // 7. Configuração de Estilo, Nomenclatura e Z-Index
      const key = `${layerId}_${radiusMeters}`;
      const title = `Faixa de ${radiusMeters} m — ${layerHumanName}`;

      let fillColor = 'rgba(6, 182, 212, 0.40)';
      let strokeColor = '#0284c7';
      let zIndex = 720;

      if (radiusMeters === 50) {
        fillColor = 'rgba(59, 130, 246, 0.30)';
        strokeColor = '#2563eb';
        zIndex = 710;
      } else if (radiusMeters === 100) {
        fillColor = 'rgba(99, 102, 241, 0.22)';
        strokeColor = '#4f46e5';
        zIndex = 700;
      }

      // 8. Criação da Camada Vetorial OpenLayers
      const olFeatures = geoJsonFormat.readFeatures(dissolvedFc, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });

      const vectorSource = new ol.source.Vector({ features: olFeatures });
      const vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        zIndex: zIndex,
        style: new ol.style.Style({
          fill: new ol.style.Fill({ color: fillColor }),
          stroke: new ol.style.Stroke({ color: strokeColor, width: 1.5 })
        })
      });

      // Se já existir análise idêntica anterior, remove e substitui de forma transparente
      if (this.activeAnalyses.has(key)) {
        const existing = this.activeAnalyses.get(key);
        if (existing && existing.olLayer) {
          this.map.removeLayer(existing.olLayer);
        }
      }

      this.map.addLayer(vectorLayer);

      // Metadados padronizados para exportação GeoJSON limpa
      const exportGeoJson = {
        type: 'FeatureCollection',
        name: title,
        crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::31982' } },
        features: (dissolvedFc.features || []).map((feat, idx) => ({
          type: 'Feature',
          id: idx + 1,
          properties: {
            origem: layerHumanName,
            buffer_m: radiusMeters,
            tipo_analise: 'Faixa de Proteção Hidrográfica',
            area_m2: parseFloat(areaM2.toFixed(2)),
            area_ha: parseFloat(areaHa.toFixed(4)),
            data_extracao: new Date().toISOString()
          },
          geometry: feat.geometry
        }))
      };

      // Registro da análise ativa
      this.activeAnalyses.set(key, {
        id: `analysisBuffer_${radiusMeters}_${layerId}`,
        key: key,
        layerId: layerId,
        layerName: layerHumanName,
        radiusMeters: radiusMeters,
        title: title,
        fillColor: fillColor,
        strokeColor: strokeColor,
        zIndex: zIndex,
        areaM2: areaM2,
        areaHa: areaHa,
        geojson: exportGeoJson,
        olLayer: vectorLayer,
        visible: true
      });

      this.renderResultsList();

      if (this.legendUI && typeof this.legendUI.render === 'function') {
        this.legendUI.render();
      }

      Notification.success(`${title} gerada com sucesso! (${areaHa.toFixed(2)} ha)`);
    } catch (err) {
      console.error('[TerritorialAnalysis] Erro ao gerar buffer:', err);
      Notification.error(`Erro ao gerar buffer: ${err.message}`);
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = '<i class="lucide-sparkles"></i> Gerar Buffer';
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
      }
    }
  }

  /**
   * Alterna a visibilidade individual de uma faixa de análise
   */
  toggleAnalysisVisibility(key) {
    if (!this.activeAnalyses.has(key)) return;
    const item = this.activeAnalyses.get(key);
    item.visible = !item.visible;
    if (item.olLayer) {
      item.olLayer.setVisible(item.visible);
    }
    this.renderResultsList();
    if (this.legendUI && typeof this.legendUI.render === 'function') {
      this.legendUI.render();
    }
  }

  /**
   * Exclui individualmente um resultado analítico
   */
  removeAnalysis(key) {
    if (!this.activeAnalyses.has(key)) return;
    const item = this.activeAnalyses.get(key);
    if (item.olLayer) {
      this.map.removeLayer(item.olLayer);
    }
    this.activeAnalyses.delete(key);
    this.renderResultsList();
    if (this.legendUI && typeof this.legendUI.render === 'function') {
      this.legendUI.render();
    }
    Notification.info(`${item.title} removida.`);
  }

  /**
   * Limpa todas as análises espaciais ativas sem tocar nas camadas originais
   */
  clearAllAnalyses() {
    if (this.activeAnalyses.size === 0) {
      Notification.info('Nenhuma análise espacial temporária ativa para limpar.');
      return;
    }

    this.activeAnalyses.forEach(item => {
      if (item.olLayer) {
        this.map.removeLayer(item.olLayer);
      }
    });

    this.activeAnalyses.clear();
    this.renderResultsList();

    if (this.legendUI && typeof this.legendUI.render === 'function') {
      this.legendUI.render();
    }

    Notification.success('Todas as análises espaciais temporárias foram removidas.');
  }

  /**
   * Exporta o GeoJSON limpo dissolvido de uma faixa analítica
   */
  downloadAnalysisGeoJson(key) {
    if (!this.activeAnalyses.has(key)) return;
    const item = this.activeAnalyses.get(key);
    if (!item.geojson) return;

    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(item.geojson, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `faixa_${item.radiusMeters}m_${item.layerId}.geojson`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      Notification.success(`Download de ${item.title} iniciado.`);
    } catch (err) {
      console.error('[TerritorialAnalysis] Erro ao exportar GeoJSON:', err);
      Notification.error('Erro ao realizar o download do GeoJSON.');
    }
  }

  /**
   * Retorna os itens de legenda das análises ativas para a LegendaUI
   */
  getActiveAnalysisLegends() {
    const list = [];
    this.activeAnalyses.forEach(item => {
      if (item.visible) {
        const haFormatted = item.areaHa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        list.push({
          id: item.id,
          title: item.title,
          fillColor: item.fillColor,
          strokeColor: item.strokeColor,
          areaFormatted: `${haFormatted} hectares (${item.areaM2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²)`
        });
      }
    });
    return list;
  }

  /**
   * Renderiza a listagem de cartões de resultados ativos no painel
   */
  renderResultsList() {
    const container = document.getElementById('analysis-results-container');
    const countBadge = document.getElementById('analysis-count-badge');
    if (!container) return;

    if (countBadge) {
      countBadge.textContent = this.activeAnalyses.size.toString();
    }

    if (this.activeAnalyses.size === 0) {
      container.innerHTML = `
        <div class="analysis-empty-placeholder">
          <i class="lucide-sparkles" style="font-size: 24px; display: block; margin-bottom: 8px; opacity: 0.5;"></i>
          Nenhuma análise espacial gerada no momento.<br>
          Selecione a camada, o raio desejado e clique em <strong>Gerar Buffer</strong>.
        </div>
      `;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
      return;
    }

    let html = '';
    this.activeAnalyses.forEach(item => {
      const eyeIcon = item.visible ? 'eye' : 'eye-off';
      const m2Formatted = item.areaM2.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const haFormatted = item.areaHa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      html += `
        <div class="analysis-result-card" data-analysis-key="${item.key}" style="opacity: ${item.visible ? '1' : '0.55'};">
          <div class="analysis-result-header">
            <div class="analysis-result-title">
              <span class="analysis-result-dot" style="background: ${item.fillColor}; border: 1.5px solid ${item.strokeColor};"></span>
              <span>${item.title}</span>
            </div>
            <div class="analysis-result-actions">
              <button class="analysis-icon-btn btn-toggle-vis" data-key="${item.key}" title="${item.visible ? 'Ocultar' : 'Exibir'} camada">
                <i class="lucide-${eyeIcon}"></i>
              </button>
              <button class="analysis-icon-btn btn-download-geojson" data-key="${item.key}" title="Baixar GeoJSON da faixa">
                <i class="lucide-download"></i>
              </button>
              <button class="analysis-icon-btn danger btn-remove-analysis" data-key="${item.key}" title="Remover esta análise">
                <i class="lucide-trash-2"></i>
              </button>
            </div>
          </div>
          <div class="analysis-metrics-row">
            <div class="analysis-metric-item">
              <span class="analysis-metric-val">${haFormatted} ha</span>
              <span class="analysis-metric-lbl">Área em Hectares</span>
            </div>
            <div class="analysis-metric-item">
              <span class="analysis-metric-val">${m2Formatted} m²</span>
              <span class="analysis-metric-lbl">Área Métrica Total</span>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Vincular eventos dos botões de cada cartão
    container.querySelectorAll('.btn-toggle-vis').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        this.toggleAnalysisVisibility(key);
      });
    });

    container.querySelectorAll('.btn-download-geojson').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        this.downloadAnalysisGeoJson(key);
      });
    });

    container.querySelectorAll('.btn-remove-analysis').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        this.removeAnalysis(key);
      });
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }
}
