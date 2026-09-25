/**
 * WebGIS SEPLAN Passo Fundo - Diagnósticos Territoriais
 * Downloads UI Controller: Catálogo de Dados Espaciais Temático & Exportação
 */

import { LAYER_GROUPS, LAYERS_CONFIG } from '../config/layers.config.js';
import { Notification } from './notification.js';

export const DOWNLOAD_THEMATIC_GROUPS = [
  {
    id: 'hidrografia',
    title: 'Hidrografia e Recursos Hídricos',
    shortTitle: 'Hidrografia',
    iconName: 'droplet',
    layerIds: [
      'rio_passo_fundo',
      'malha_hidrica',
      'bacias_hidrograficas'
    ]
  },
  {
    id: 'sistema_viario',
    title: 'Sistema Viário e Transporte',
    shortTitle: 'Sistema Viário',
    iconName: 'navigation',
    layerIds: [
      'rodovia_federal',
      'rodovia_estadual',
      'estradas_municipais',
      'malha_viaria',
      'pontes',
      'ferrovia'
    ]
  },
  {
    id: 'limites_territoriais',
    title: 'Limites e Divisão Territorial',
    shortTitle: 'Limites',
    iconName: 'map-pin',
    layerIds: [
      'limite_territorial',
      'bairros',
      'distritos',
      'limite_plano_diretor',
      'municipios_rs'
    ]
  },
  {
    id: 'censo_ibge',
    title: 'Censo Demográfico IBGE',
    shortTitle: 'Censo IBGE',
    iconName: 'users',
    layerIds: [
      'setores_censitarios',
      'censo_pop_0a4',
      'censo_pop_5a9',
      'censo_pop_10a14',
      'censo_pop_15a19',
      'censo_pop_20a59',
      'censo_pop_m60',
      'censo_densidade_2022',
      'censo_renda_vulnerabilidade',
      'censo_alfabetizacao_2022'
    ]
  },
  {
    id: 'equipamentos_servicos',
    title: 'Equipamentos e Serviços Públicos',
    shortTitle: 'Equipamentos',
    iconName: 'building-2',
    subsections: [
      {
        title: 'Esporte e Cultura',
        layerIds: [
          'equipamentos_esportivos',
          'estadios_ginasios',
          'equipamentos_culturais'
        ]
      },
      {
        title: 'Uso Coletivo e Serviços',
        layerIds: [
          'aeroporto_aeroclube',
          'corpo_bombeiros',
          'cemiterios_municipais',
          'cemiterios_privados',
          'hoteis',
          'seguranca_policia',
          'terminal_rodoviario',
          'shopping_centers'
        ]
      }
    ]
  },
  {
    id: 'areas_verdes',
    title: 'Áreas Verdes e Meio Ambiente',
    shortTitle: 'Áreas Verdes',
    iconName: 'trees',
    subsections: [
      {
        title: 'Praças, Parques e Projetos',
        layerIds: [
          'pracas',
          'parques_urbanos_pontos',
          'areas_verdes_pontos',
          'areas_privadas',
          'projetos_multigares'
        ]
      },
      {
        title: 'Corredores e Parques Lineares',
        layerIds: [
          'corredores_verdes',
          'parque_linear_pres_vargas',
          'parque_linear_rui_barbosa'
        ]
      },
      {
        title: 'Polígonos e Áreas de Preservação',
        layerIds: [
          'areas_publicas',
          'parques_poligonos',
          'multigares_poligonos',
          'rppn',
          'zpnm'
        ]
      },
      {
        title: 'Raios de Abrangência e Acessibilidade',
        layerIds: [
          'abrangencia_infraestruturas_verdes',
          'raio_400m_pracas',
          'raio_400m_parque_a_brasil',
          'raio_400m_parque_pres_vargas',
          'raio_400m_parque_setimo_ceu',
          'raio_800m_parques_lineares',
          'raio_1600m_parques',
          'raio_1600m_multigares'
        ]
      }
    ]
  }
];

export class DownloadsUI {
  constructor(layerManager) {
    this.layerManager = layerManager;
    this.container = document.getElementById('downloads-list-container');
    this.searchInput = document.getElementById('download-search-input');
    this.searchClearBtn = document.getElementById('download-search-clear');
    this.countBadge = document.getElementById('download-layers-count');
    this.pillsBar = document.getElementById('downloads-pills-bar');

    this.downloadableLayers = [];
    this.activeFilter = 'all';
    this.searchQuery = '';
    this.expandedGroups = new Set(); // Todos os grupos começam recolhidos por padrão

    this.init();
  }

  init() {
    this.prepareLayerCatalog();
    this.setupGlobalControls();
    this.setupSearch();
    this.render();
  }

  /**
   * Prepara o catálogo oficial das 56 camadas com descrições curadas,
   * classificação temática e metadados institucionais.
   */
  prepareLayerCatalog() {
    const descriptions = {
      'rio_passo_fundo': 'Traçado vetorial do curso d’água principal do Rio Passo Fundo em sua travessia pelo perímetro urbano e rural.',
      'malha_hidrica': 'Rede hidrográfica com cursos d’água, rios, arroios e tributários do município de Passo Fundo.',
      'bacias_hidrograficas': 'Divisores topográficos e delimitação das microbacias hidrográficas do município.',
      'rodovia_federal': 'Eixos e trechos das rodovias federais (BR-285 e BR-153) que cruzam o território municipal (DNIT).',
      'rodovia_estadual': 'Malha rodoviária estadual que cruza o município de Passo Fundo (ERS-135, ERS-324 e ERS-153 - DAER).',
      'estradas_municipais': 'Malha de estradas vicinais e vias rurais do interior de Passo Fundo.',
      'ferrovia': 'Traçado da malha ferroviária operacional concedida que atravessa o território municipal (ANTT).',
      'pontes': 'Mapeamento de pontes e transposições sobre cursos d’água no sistema viário municipal.',
      'malha_viaria': 'Malha viária urbana completa de logradouros, ruas e avenidas do município de Passo Fundo.',
      'limite_territorial': 'Polígono oficial do limite territorial e administrativo do município de Passo Fundo (IBGE 2022).',
      'bairros': 'Delimitação das regiões urbanas, vilas e bairros municipais de Passo Fundo.',
      'distritos': 'Sedes dos distritos municipais de Passo Fundo (Sede, São Roque, Bom Recreio, Bela Vista, Capinzal, Sede Independência e Pulador).',
      'limite_plano_diretor': 'Perímetro urbano oficial e diretrizes de ordenamento territorial do Plano Diretor Municipal.',
      'municipios_rs': 'Malha territorial dos municípios do Rio Grande do Sul e confrontações limítrofes com Passo Fundo (IBGE).',
      'setores_censitarios': 'Malha territorial dos 321 setores censitários do IBGE com dados agregados (Censo 2022).',
      'censo_pop_0a4': 'Distribuição setorial da população de 0 a 4 anos (Primeira Infância) do Censo IBGE 2022.',
      'censo_pop_5a9': 'Distribuição setorial da população de 5 a 9 anos (Crianças) do Censo IBGE 2022.',
      'censo_pop_10a14': 'Distribuição setorial da população de 10 a 14 anos do Censo IBGE 2022.',
      'censo_pop_15a19': 'Distribuição setorial da população de 15 a 19 anos (Jovens) do Censo IBGE 2022.',
      'censo_pop_20a59': 'Distribuição setorial da população de 20 a 59 anos (Adultos) do Censo IBGE 2022.',
      'censo_pop_m60': 'Distribuição setorial da população idosa com 60 anos ou mais (Censo IBGE 2022).',
      'censo_densidade_2022': 'Densidade demográfica setorial calculada em habitantes por km² (Censo IBGE 2022).',
      'censo_renda_vulnerabilidade': 'Rendimento médio domiciliar per capita por setor censitário em Reais (Censo IBGE 2022).',
      'censo_alfabetizacao_2022': 'Taxa setorial de alfabetização da população de 15 anos ou mais por setor censitário (Censo IBGE 2022).',
      'equipamentos_esportivos': 'Mapeamento dos equipamentos esportivos, quadras e centros poliesportivos públicos de Passo Fundo.',
      'estadios_ginasios': 'Localização de estádios, arenas e ginásios poliesportivos municipais.',
      'equipamentos_culturais': 'Teatros, museus, centros culturais e espaços artísticos do município.',
      'aeroporto_aeroclube': 'Localização do Aeroporto Lauro Kurtz e do Aeroclube de Passo Fundo.',
      'corpo_bombeiros': 'Unidades operacionais do Corpo de Bombeiros Militar do Estado do Rio Grande do Sul.',
      'cemiterios_municipais': 'Cemitérios públicos sob gestão municipal em Passo Fundo.',
      'cemiterios_privados': 'Cemitérios e memoriais privados cadastrados no município.',
      'hoteis': 'Rede hoteleira, pousadas e meios de hospedagem do município de Passo Fundo.',
      'seguranca_policia': 'Delegacias de Polícia Civil, Brigada Militar, Polícia Rodoviária e postos de segurança pública.',
      'terminal_rodoviario': 'Terminal rodoviário intermunicipal e interestadual de passageiros de Passo Fundo.',
      'shopping_centers': 'Centros comerciais e shopping centers de Passo Fundo.',
      'pracas': 'Praças públicas urbanas cadastradas pelo planejamento municipal.',
      'parques_urbanos_pontos': 'Pontos de referência e localização dos parques urbanos de Passo Fundo.',
      'areas_verdes_pontos': 'Áreas verdes e recantos arborizados cadastrados no município.',
      'areas_privadas': 'Áreas privadas de preservação e interesse ambiental cadastradas.',
      'projetos_multigares': 'Locais e intervenções do Programa Estratégico Multigares.',
      'corredores_verdes': 'Eixos lineares de conectividade ecológica e corredores verdes urbanos.',
      'parque_linear_pres_vargas': 'Traçado e diretrizes do Parque Linear da Avenida Presidente Vargas.',
      'parque_linear_rui_barbosa': 'Traçado e diretrizes do Parque Linear da Avenida Rui Barbosa.',
      'areas_publicas': 'Polígonos de áreas públicas municipais destinadas a preservação e uso coletivo.',
      'parques_poligonos': 'Delimitação poligonal oficial dos parques urbanos de Passo Fundo.',
      'multigares_poligonos': 'Polígonos das áreas do projeto urbanístico Multigares.',
      'rppn': 'Reservas Particulares do Patrimônio Natural cadastradas em Passo Fundo.',
      'zpnm': 'Zonas de Preservação Natural Municipal instituídas pela legislação municipal.',
      'abrangencia_infraestruturas_verdes': 'Área de cobertura e alcance territorial consolidado das infraestruturas verdes.',
      'raio_400m_pracas': 'Área de influência e acessibilidade peatonal de 400m ao redor das praças públicas.',
      'raio_400m_parque_a_brasil': 'Área de influência e cobertura de 400m ao redor do Parque Arthur Brasil.',
      'raio_400m_parque_pres_vargas': 'Área de influência e cobertura de 400m ao redor do Parque Linear Pres. Vargas.',
      'raio_400m_parque_setimo_ceu': 'Área de influência e cobertura de 400m ao redor do Parque Sétimo Céu.',
      'raio_800m_parques_lineares': 'Área de influência de 800m ao longo dos parques lineares municipais.',
      'raio_1600m_parques': 'Área de cobertura urbana de 1.600m dos parques municipais.',
      'raio_1600m_multigares': 'Área de cobertura urbana de 1.600m das intervenções do Multigares.'
    };

    const layerMetaMap = {};
    DOWNLOAD_THEMATIC_GROUPS.forEach(group => {
      if (group.subsections) {
        group.subsections.forEach(sub => {
          sub.layerIds.forEach(id => {
            layerMetaMap[id] = {
              groupId: group.id,
              groupTitle: group.title,
              subsectionTitle: sub.title
            };
          });
        });
      } else if (group.layerIds) {
        group.layerIds.forEach(id => {
          layerMetaMap[id] = {
            groupId: group.id,
            groupTitle: group.title,
            subsectionTitle: null
          };
        });
      }
    });

    this.downloadableLayers = LAYERS_CONFIG
      .filter(l => !l.isRaster && l.fileName && l.fileName.endsWith('.geojson'))
      .map(l => {
        const meta = layerMetaMap[l.id] || { groupId: 'outros', groupTitle: 'Outros', subsectionTitle: null };
        const geom = this.getGeometryInfo(l.geometryType);
        return {
          ...l,
          thematicGroupId: meta.groupId,
          thematicGroupTitle: meta.groupTitle,
          thematicSubsection: meta.subsectionTitle,
          description: descriptions[l.id] || l.description || `Dados geoespaciais vetoriais da camada ${l.name}.`,
          geomIcon: geom.icon,
          geomLabel: geom.label
        };
      });
  }

  getGeometryInfo(geomType) {
    if (geomType === 'Point' || geomType === 'MultiPoint') {
      return { icon: 'map-pin', label: 'Ponto' };
    }
    if (geomType === 'LineString' || geomType === 'MultiLineString') {
      return { icon: 'spline', label: 'Linha' };
    }
    if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
      return { icon: 'hexagon', label: 'Polígono' };
    }
    return { icon: 'layers', label: 'Vetor' };
  }

  setupGlobalControls() {
    const btnExpandAll = document.getElementById('btn-expand-all-downloads');
    if (btnExpandAll) {
      btnExpandAll.addEventListener('click', () => {
        DOWNLOAD_THEMATIC_GROUPS.forEach(g => this.expandedGroups.add(g.id));
        this.render();
      });
    }

    const btnCollapseAll = document.getElementById('btn-collapse-all-downloads');
    if (btnCollapseAll) {
      btnCollapseAll.addEventListener('click', () => {
        this.expandedGroups.clear();
        this.render();
      });
    }

    if (this.pillsBar) {
      this.pillsBar.querySelectorAll('.download-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const filter = pill.getAttribute('data-group-filter');
          this.setFilter(filter);
        });
      });
    }
  }

  setFilter(filter) {
    this.activeFilter = filter;

    if (this.pillsBar) {
      this.pillsBar.querySelectorAll('.download-pill').forEach(p => {
        const match = p.getAttribute('data-group-filter') === filter;
        p.classList.toggle('active', match);
      });
    }

    if (filter !== 'all') {
      this.expandedGroups.add(filter);
    }

    this.render();
  }

  setupSearch() {
    if (!this.searchInput) return;

    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = (e.target.value || '').toLowerCase().trim();
      this.render();
    });

    if (this.searchClearBtn) {
      this.searchClearBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.searchQuery = '';
        this.render();
      });
    }
  }

  render() {
    if (!this.container) return;

    let filteredLayers = this.downloadableLayers;
    if (this.searchQuery) {
      filteredLayers = this.downloadableLayers.filter(l => {
        const text = `${l.name} ${l.description} ${l.thematicGroupTitle} ${l.thematicSubsection || ''} ${l.source || ''} ${l.geomLabel}`.toLowerCase();
        return text.includes(this.searchQuery);
      });
    }

    if (this.countBadge) {
      this.countBadge.textContent = filteredLayers.length;
    }

    DOWNLOAD_THEMATIC_GROUPS.forEach(g => {
      const pillCountEl = document.getElementById(`pill-count-${g.id}`);
      if (pillCountEl) {
        const countInGroup = this.downloadableLayers.filter(l => l.thematicGroupId === g.id).length;
        pillCountEl.textContent = countInGroup;
      }
    });
    const pillCountAll = document.getElementById('pill-count-all');
    if (pillCountAll) {
      pillCountAll.textContent = this.downloadableLayers.length;
    }

    if (filteredLayers.length === 0) {
      this.container.innerHTML = `
        <div style="text-align: center; padding: 24px 16px; color: var(--text-muted);">
          <i class="lucide-search" style="font-size: 24px; opacity: 0.4; margin-bottom: 6px; display: block;"></i>
          <p style="font-size: 12.5px; font-weight: 600; color: var(--text-main);">Nenhuma camada encontrada</p>
          <p style="font-size: 11px; margin-top: 3px;">Tente outro termo ou limpe o campo de busca.</p>
        </div>
      `;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
      return;
    }

    let html = '';

    DOWNLOAD_THEMATIC_GROUPS.forEach(group => {
      if (this.activeFilter !== 'all' && this.activeFilter !== group.id) {
        return;
      }

      const groupLayers = filteredLayers.filter(l => l.thematicGroupId === group.id);

      if (this.searchQuery && groupLayers.length === 0) {
        return;
      }

      const isExpanded = this.searchQuery ? true : this.expandedGroups.has(group.id);
      const countText = `${groupLayers.length} ${groupLayers.length === 1 ? 'camada' : 'camadas'}`;

      html += `
        <div class="download-group-item ${isExpanded ? 'expanded' : ''}" data-group-id="${group.id}">
          <button type="button" class="download-group-header" aria-expanded="${isExpanded}">
            <div class="download-group-header-left">
              <i class="lucide-${group.iconName} download-group-icon"></i>
              <span class="download-group-title">${group.title}</span>
            </div>
            <div class="download-group-header-right">
              <span class="download-group-badge">${countText}</span>
              <i class="lucide-chevron-down download-group-chevron"></i>
            </div>
          </button>

          <div class="download-group-body" style="${isExpanded ? 'display: flex;' : 'display: none;'}">
      `;

      if (group.subsections) {
        group.subsections.forEach(sub => {
          const subLayers = groupLayers.filter(l => l.thematicSubsection === sub.title);
          if (subLayers.length > 0) {
            html += `
              <div class="download-subsection-header">
                <span>${sub.title}</span>
                <span class="download-subsection-badge">${subLayers.length}</span>
              </div>
            `;
            subLayers.forEach(layer => {
              html += this.createLayerCardHtml(layer);
            });
          }
        });
      } else {
        groupLayers.forEach(layer => {
          html += this.createLayerCardHtml(layer);
        });
      }

      html += `
          </div>
        </div>
      `;
    });

    this.container.innerHTML = html;

    this.container.querySelectorAll('.download-group-header').forEach(header => {
      header.addEventListener('click', (e) => {
        e.preventDefault();
        const groupItem = header.closest('.download-group-item');
        if (!groupItem) return;
        const groupId = groupItem.getAttribute('data-group-id');
        const isCurrentlyExpanded = groupItem.classList.contains('expanded');

        if (isCurrentlyExpanded) {
          groupItem.classList.remove('expanded');
          groupItem.querySelector('.download-group-body').style.display = 'none';
          header.setAttribute('aria-expanded', 'false');
          this.expandedGroups.delete(groupId);
        } else {
          groupItem.classList.add('expanded');
          groupItem.querySelector('.download-group-body').style.display = 'flex';
          header.setAttribute('aria-expanded', 'true');
          this.expandedGroups.add(groupId);
        }
      });
    });

    this.bindDownloadEvents();

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  createLayerCardHtml(layer) {
    return `
      <div class="download-card" data-layer-id="${layer.id}">
        <div class="download-card-header">
          <div>
            <div class="download-card-title">${layer.name}</div>
            <div class="download-card-desc" style="margin-top: 3px;">${layer.description}</div>
          </div>
        </div>

        <div class="download-card-meta">
          <span class="download-badge-geom">
            <i class="lucide-${layer.geomIcon}"></i> ${layer.geomLabel}
          </span>
          <span>&bull;</span>
          <span><strong>Fonte:</strong> ${layer.source || 'Prefeitura de Passo Fundo'}</span>
          <span>&bull;</span>
          <span><strong>Ref:</strong> ${layer.refDate || '2026'}</span>
          <span>&bull;</span>
          <span><strong>CRS:</strong> SIRGAS 2000 / UTM 22S</span>
        </div>

        <div class="download-btn-group">
          <button type="button" class="btn-download-format geojson" data-format="geojson" data-layer-id="${layer.id}" title="Baixar arquivo GeoJSON nativo (SIRGAS 2000 / UTM 22S)">
            <i class="lucide-download"></i> GeoJSON
          </button>
          <button type="button" class="btn-download-format csv" data-format="csv" data-layer-id="${layer.id}" title="Baixar tabela de atributos e coordenadas em CSV (Excel)">
            <i class="lucide-file-spreadsheet"></i> CSV
          </button>
          <button type="button" class="btn-download-format kml" data-format="kml" data-layer-id="${layer.id}" title="Baixar camada KML para Google Earth (WGS84)">
            <i class="lucide-globe"></i> KML
          </button>
        </div>
      </div>
    `;
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
      Notification.error('Download temporariamente indisponível para esta camada.');
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
    Notification.success(`Download de "${downloadName}" concluído!`);
  }

  /**
   * Exports layer properties + coordinates as a CSV file with UTF-8 BOM
   */
  async downloadAsCsv(layer) {
    await this.layerManager.loadLayerData(layer.id);
    const olLayer = this.layerManager.getLayer(layer.id);
    if (!olLayer) throw new Error('Camada não encontrada');

    const features = olLayer.getSource().getFeatures();
    if (features.length === 0) throw new Error('Nenhuma feição encontrada');

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
    if (!olLayer) throw new Error('Camada não encontrada');

    const features = olLayer.getSource().getFeatures();
    if (features.length === 0) throw new Error('Nenhuma feição encontrada');

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