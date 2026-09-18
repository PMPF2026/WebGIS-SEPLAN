/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Downloads UI Controller: Public Geospatial Data Catalog with GeoJSON, CSV & KML Exports
 */

import { LAYER_GROUPS, LAYERS_CONFIG } from '../config/layers.config.js';
import { Notification } from './notification.js';

export class DownloadsUI {
  constructor(layerManager) {
    this.layerManager = layerManager;
    this.container = document.getElementById('downloads-list-container');
    this.searchInput = document.getElementById('download-search-input');
    this.searchClearBtn = document.getElementById('download-search-clear');
    this.countBadge = document.getElementById('download-layers-count');

    this.downloadableLayers = [];
    this.init();
  }

  init() {
    this.prepareLayerCatalog();
    this.render();
    this.setupSearch();
  }

  /**
   * Prepares the list of downloadable layers with descriptions and metadata
   */
  prepareLayerCatalog() {
    const descriptions = {
      'sede_defesa_civil': 'Ponto de localização geográfica da Sede Oficial da Defesa Civil de Passo Fundo/RS com endereço e coordenadas UTM.',
      'areas_enchente_2024': 'Mancha oficial de inundação do evento hidrológico extremo de Maio/2024 (Decreto Estadual 57.600/2024 - ADA).',
      'app_30metros': 'Faixa de 30 metros ao longo do Rio Passo Fundo (Lei Federal 12.651/2012).',
      'edificacoes_app': '318 edificações residenciais e comerciais localizadas dentro da Faixa de 30 metros com distâncias métricas ao rio.',
      'abrigos_defesa_civil': '17 locais e ginásios públicos cadastrados pela Defesa Civil para acolhimento de emergência em desastres climáticos.',
      'cobertura_abrigos_2km': 'Área de influência e cobertura territorial de 2 km ao redor dos 17 abrigos da Defesa Civil.',
      'zph_helicoptero': '9 Zonas de Pouso de Helicóptero (ZPH) cadastradas para pouso de emergência e resgate aéreo da Defesa Civil.',
      'rio_passo_fundo': 'Traçado vetorial do curso d’água principal do Rio Passo Fundo em sua travessia pelo perímetro urbano e rural.',
      'malha_hidrica': 'Rede hidrogrÃ¡fica com mais de 3.600 trechos de rios, arroios e cÃ³rregos de Passo Fundo com ordem de Strahler.',
      'bacias_hidrograficas': 'Divisores topogrÃ¡ficos e delimitaÃ§Ã£o das microbacias hidrogrÃ¡ficas do municÃ­pio.',
      'rodovia_federal': 'Eixos e trechos das rodovias federais (BR-285 e BR-153) que cruzam o territÃ³rio municipal (DNIT).',
      'rodovia_estadual': 'Malha rodoviÃ¡ria estadual asfaltada e pavimentada de Passo Fundo (ERS-135, ERS-324, ERS-153 - DAER).',
      'estradas_municipais': 'Malha de estradas vicinais e acessos rurais do interior de Passo Fundo.',
      'ferrovia': 'TraÃ§ado da linha fÃ©rrea e malha ferroviÃ¡ria operacional concedida (ANTT / Rumo LogÃ­stica).',
      'pontes': 'Mapeamento das pontes e transposiÃ§Ãµes sobre cursos dâ€™Ã¡gua no sistema viÃ¡rio municipal.',
      'malha_viaria': 'Malha completa de logradouros, ruas e avenidas urbanas do municÃ­pio de Passo Fundo.',
      'limite_territorial': 'PolÃ­gono oficial do limite territorial e administrativo do municÃ­pio de Passo Fundo (IBGE 2022).',
      'bairros': 'DelimitaÃ§Ã£o das regiÃµes urbanas, vilas e bairros municipais com populaÃ§Ã£o residente do Censo 2022.',
      'distritos': 'Pontos sedes dos distritos municipais de Passo Fundo (Sede, SÃ£o Roque, Bom Recreio, Bela Vista, Capinzal, Sede IndependÃªncia e Pulador).',
      'setores_censitarios': 'Malha de 312 setores censitÃ¡rios do IBGE com dados demogrÃ¡ficos, domicÃ­lios e renda (Censo 2022).',
      'municipios_rs': 'Malha territorial dos 7 municÃ­pios limÃ­trofes que fazem fronteira com Passo Fundo (IBGE).',
      'limite_plano_diretor': 'Perímetro e zoneamento urbano oficial do Plano Diretor Municipal de Passo Fundo.',
      'mapeamento_sgb_2025': '25 polígonos de setores de risco geológico e hidrológico (R3 e R4) mapeados pelo Serviço Geológico do Brasil (SGB, 2025).',
      'domicilios_risco_sgb_2025': 'Mapeamento de 1.115 domicílios em áreas de risco geológico realizado pelo Serviço Geológico do Brasil (SGB, 2025).'
    };

    this.downloadableLayers = LAYERS_CONFIG.filter(l => !l.isRaster && l.fileName && l.fileName.endsWith('.geojson')).map(l => {
      const groupInfo = LAYER_GROUPS.find(g => g.id === l.group) || {};
      return {
        ...l,
        groupTitle: groupInfo.title || l.group,
        groupIcon: groupInfo.iconName || 'layers',
        groupClass: groupInfo.iconClass || 'dc',
        description: descriptions[l.id] || l.description || `Dados geoespaciais vetoriais da camada ${l.name}.`,
        geometryLabel: this.getGeometryLabel(l.geometryType)
      };
    });
  }

  getGeometryLabel(geomType) {
    if (geomType === 'Point' || geomType === 'MultiPoint') return 'ðŸ“ Ponto';
    if (geomType === 'LineString' || geomType === 'MultiLineString') return 'ã€°ï¸ Linha';
    if (geomType === 'Polygon' || geomType === 'MultiPolygon') return 'â¬¡ PolÃ­gono';
    return 'ðŸ—ºï¸ Vetor';
  }

  render(layersToRender = this.downloadableLayers) {
    if (!this.container) return;

    if (this.countBadge) {
      this.countBadge.textContent = `${layersToRender.length} ${layersToRender.length === 1 ? 'Camada' : 'Camadas'}`;
    }

    if (layersToRender.length === 0) {
      this.container.innerHTML = `
        <div style="text-align: center; padding: 30px 16px; color: var(--text-muted);">
          <i class="lucide-search" style="font-size: 28px; opacity: 0.4; margin-bottom: 8px; display: block;"></i>
          <p style="font-size: 13px; font-weight: 600; color: var(--text-main);">Nenhuma camada encontrada</p>
          <p style="font-size: 11.5px; margin-top: 4px;">Tente buscar por outro termo ou limpe o filtro.</p>
        </div>
      `;
      return;
    }

    let html = '';
    layersToRender.forEach(layer => {
      html += `
        <div class="download-card" data-layer-id="${layer.id}">
          <div class="download-card-header">
            <div>
              <div class="download-card-title">${layer.name}</div>
              <div class="download-card-desc" style="margin-top: 4px;">${layer.description}</div>
            </div>
          </div>

          <div class="download-card-meta">
            <span class="badge-blue" style="font-size: 10px;">${layer.geometryLabel}</span>
            <span>&bull;</span>
            <span><strong>Fonte:</strong> ${layer.source || 'Prefeitura de Passo Fundo'}</span>
            <span>&bull;</span>
            <span><strong>Ref:</strong> ${layer.refDate || '2026'}</span>
            <span>&bull;</span>
            <span><strong>CRS:</strong> SIRGAS 2000 UTM 22S</span>
          </div>

          <div class="download-btn-group">
            <button class="btn-download-format geojson" data-format="geojson" data-layer-id="${layer.id}" title="Baixar arquivo GeoJSON nativo (SIRGAS 2000)">
              <i class="lucide-download"></i> GeoJSON
            </button>
            <button class="btn-download-format csv" data-format="csv" data-layer-id="${layer.id}" title="Baixar tabela de atributos e coordenadas em CSV (Excel)">
              <i class="lucide-file-spreadsheet"></i> CSV
            </button>
            <button class="btn-download-format kml" data-format="kml" data-layer-id="${layer.id}" title="Baixar camada KML para Google Earth (WGS84)">
              <i class="lucide-globe"></i> KML
            </button>
          </div>
        </div>
      `;
    });

    this.container.innerHTML = html;
    this.bindDownloadEvents();

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  setupSearch() {
    if (!this.searchInput) return;

    this.searchInput.addEventListener('input', (e) => {
      const query = (e.target.value || '').toLowerCase().trim();
      if (!query) {
        this.render(this.downloadableLayers);
      } else {
        const filtered = this.downloadableLayers.filter(l => {
          const text = `${l.name} ${l.description} ${l.groupTitle} ${l.source} ${l.geometryLabel}`.toLowerCase();
          return text.includes(query);
        });
        this.render(filtered);
      }
    });

    if (this.searchClearBtn) {
      this.searchClearBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.render(this.downloadableLayers);
      });
    }
  }

  bindDownloadEvents() {
    this.container.querySelectorAll('.btn-download-format').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const layerId = btn.getAttribute('data-layer-id');
        const format = btn.getAttribute('data-format');
        this.handleDownload(layerId, format);
      });
    });
  }

  async handleDownload(layerId, format) {
    const layer = this.downloadableLayers.find(l => l.id === layerId);
    if (!layer) return;

    Notification.info(`Preparando download da camada ${layer.name} (${format.toUpperCase()})...`);

    try {
      if (format === 'geojson') {
        await this.downloadDirectGeoJson(layer);
      } else if (format === 'csv') {
        await this.downloadAsCsv(layer);
      } else if (format === 'kml') {
        await this.downloadAsKml(layer);
      }
    } catch (err) {
      console.error(`[DownloadsUI] Erro ao baixar camada ${layerId}:`, err);
      Notification.error('Download temporariamente indisponÃ­vel para esta camada.');
    }
  }

  getStandardFileName(layerId, extension) {
    return `${layerId}_passo_fundo.${extension}`;
  }

  /**
   * Directly downloads the original static GeoJSON file with a clean filename
   */
  async downloadDirectGeoJson(layer) {
    const fileUrl = encodeURI(layer.fileName);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao carregar arquivo`);
    }

    const blob = await response.blob();
    const downloadName = this.getStandardFileName(layer.id, 'geojson');
    this.triggerFileDownload(blob, downloadName);
    Notification.success(`Download de "${downloadName}" concluÃ­do!`);
  }

  /**
   * Exports layer properties + coordinates as a CSV file with UTF-8 BOM
   */
  async downloadAsCsv(layer) {
    await this.layerManager.loadLayerData(layer.id);
    const olLayer = this.layerManager.getLayer(layer.id);
    if (!olLayer) throw new Error('Camada nÃ£o encontrada');

    const features = olLayer.getSource().getFeatures();
    if (features.length === 0) throw new Error('Nenhuma feiÃ§Ã£o encontrada');

    // Collect all property keys
    const allKeys = new Set();
    features.forEach(f => {
      const props = f.getProperties();
      Object.keys(props).forEach(k => {
        if (k !== 'geometry') allKeys.add(k);
      });
    });

    const headers = Array.from(allKeys);
    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';') + ';Coord_X_UTM;Coord_Y_UTM\n';

    features.forEach(f => {
      const props = f.getProperties();
      const geom = f.getGeometry();
      let x = '', y = '';
      if (geom) {
        if (geom.getType() === 'Point') {
          const coords = geom.getCoordinates();
          x = coords[0].toFixed(2);
          y = coords[1].toFixed(2);
        } else {
          const ext = geom.getExtent();
          const center = ol.extent.getCenter(ext);
          x = center[0].toFixed(2);
          y = center[1].toFixed(2);
        }
      }

      const row = headers.map(h => {
        const val = props[h] !== undefined && props[h] !== null ? String(props[h]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      row.push(x, y);
      csvContent += row.join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadName = this.getStandardFileName(layer.id, 'csv');
    this.triggerFileDownload(blob, downloadName);
    Notification.success(`Tabela CSV "${downloadName}" gerada com sucesso!`);
  }

  /**
   * Converts OpenLayers features to KML format (WGS84 EPSG:4326)
   */
  async downloadAsKml(layer) {
    await this.layerManager.loadLayerData(layer.id);
    const olLayer = this.layerManager.getLayer(layer.id);
    if (!olLayer) throw new Error('Camada nÃ£o encontrada');

    const features = olLayer.getSource().getFeatures();
    if (features.length === 0) throw new Error('Nenhuma feiÃ§Ã£o encontrada');

    const kmlFormat = new ol.format.KML({
      extractStyles: false,
      defaultStyle: null
    });

    const kmlString = kmlFormat.writeFeatures(features, {
      featureProjection: 'EPSG:3857',
      dataProjection: 'EPSG:4326'
    });

    const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8;' });
    const downloadName = this.getStandardFileName(layer.id, 'kml');
    this.triggerFileDownload(blob, downloadName);
    Notification.success(`Arquivo KML "${downloadName}" gerado com sucesso!`);
  }

  triggerFileDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}