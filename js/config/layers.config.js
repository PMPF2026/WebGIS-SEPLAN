/**
 * WebGIS SEPLAN Passo Fundo - Diagnósticos Territoriais
 * Central Layer Registry & Symbology Configuration
 */

export const LAYER_GROUPS = [
  {
    id: 'divisao_territorial',
    title: '1. Divisão Territorial & Limites',
    iconClass: 'territory',
    iconName: 'map-pin',
    description: 'Limite municipal, perímetro do plano diretor, distritos, bairros, setores censitários do IBGE e RS'
  },
  {
    id: 'sistema_viario',
    title: '2. Sistema Viário & Transporte',
    iconClass: 'roads',
    iconName: 'navigation',
    description: 'Malha viária urbana, rodovias federais/estaduais, estradas municipais, pontes e ferrovia'
  },
  {
    id: 'hidrografia',
    title: '3. Hidrografia & Recursos Hídricos',
    iconClass: 'hydro',
    iconName: 'droplet',
    description: 'Cursos d’água, rios, arroios e divisores de bacias hidrográficas municipais'
  },
  {
    id: 'populacao',
    title: '4. População & Indicadores Econômicos',
    iconClass: 'population',
    iconName: 'users',
    description: 'Distribuição, densidade demográfica setorial e domicílios (Censo IBGE 2022)'
  },
  {
    id: 'areas_verdes',
    title: '5. Áreas Verdes',
    iconClass: 'nature',
    iconName: 'trees',
    description: 'Parques urbanos, praças públicas, áreas de preservação ambiental, corredores verdes e zonas de proteção natural',
    subgroups: [
      { id: 'pontos', title: '5.1 Pontos', icon: 'map-pin' },
      { id: 'linhas', title: '5.2 Linhas', icon: 'git-commit' },
      { id: 'poligonos', title: '5.3 Polígonos', icon: 'shapes' }
    ]
  },
  {
    id: 'esporte_cultura',
    title: '6. Esporte e Cultura',
    iconClass: 'sport-culture',
    iconName: 'trophy',
    description: 'Equipamentos esportivos, estádios, arenas, ginásios, teatros, museus e centros culturais municipais',
    subgroups: [
      { id: 'esporte', title: '6.1 Esporte', icon: 'activity' },
      { id: 'cultura', title: '6.2 Cultura', icon: 'landmark' }
    ]
  },
  {
    id: 'equipamentos_uso_coletivo',
    title: '7. Equipamentos de Uso Coletivo',
    iconClass: 'facilities',
    iconName: 'building-2',
    description: 'Equipamentos e serviços essenciais de uso coletivo: aeroporto, bombeiros, cemitérios, rede hoteleira, segurança pública, rodoviária e shopping centers'
  }
];

export const LAYERS_CONFIG = [
  // ================= 3. HIDROGRAFIA =================
  {
    id: 'rio_passo_fundo',
    name: 'Rio Passo Fundo (Curso Principal)',
    fileName: 'Rio Passo Fundo.geojson',
    source: 'Prefeitura Municipal de Passo Fundo',
    refDate: '2026',
    group: 'hidrografia',
    geometryType: 'MultiLineString',
    defaultVisible: true,
    defaultOpacity: 1.0,
    zIndex: 54,
    isCore: true,
    isLazy: false,
    style: {
      strokeColor: '#0284c7',
      strokeWidth: 1.8,
      previewColor: '#0284c7'
    },
    popupConfig: {
      titleField: 'Nome',
      defaultTitle: 'Rio Passo Fundo',
      fields: [
        { key: 'Nome', label: 'Curso Hídrico Principal' },
        { key: 'Distância', label: 'Extensão do Segmento (m)', format: 'number' },
        { key: 'Comp_total', label: 'Comprimento Total (m)', format: 'number' },
        { key: 'SubClasses', label: 'Entidade CAD/GIS' }
      ]
    },
    searchable: true,
    searchFields: ['Nome']
  },
  {
    id: 'malha_hidrica',
    name: 'Malha Hídrica (Rios e Arroios)',
    fileName: 'Malha Hídrica.geojson',
    source: 'Prefeitura Municipal de Passo Fundo',
    refDate: '2026',
    group: 'hidrografia',
    geometryType: 'MultiLineString',
    defaultVisible: true,
    defaultOpacity: 0.95,
    zIndex: 50,
    isLazy: false,
    style: {
      strokeColor: '#0284c7',
      strokeWidth: 0.8,
      isHierarchicalHydro: true, // Dynamic line width based on hydrologic stream order
      previewColor: '#0284c7'
    },
    popupConfig: {
      titleField: 'nome',
      defaultTitle: 'Curso D’água / Arroio',
      fields: [
        { key: 'nome', label: 'Nome do Rio/Arroio' },
        { key: 'ordem', label: 'Ordem Hidrológica (Strahler)' },
        { key: 'larguraMed', label: 'Largura Média (m)', format: 'number' },
        { key: 'd_dentroDe', label: 'Inserção Territorial' },
        { key: 'nomeAbrev', label: 'Identificação Abreviada' }
      ]
    },
    searchable: true,
    searchFields: ['nome', 'nomeAbrev']
  },
  {
    id: 'bacias_hidrograficas',
    name: 'Bacias Hidrográficas',
    fileName: 'Bacias Hidrográfias de Passo Fundo.geojson',
    source: 'Prefeitura Municipal de Passo Fundo',
    refDate: '2026',
    group: 'hidrografia',
    geometryType: 'MultiLineString',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 40,
    isLazy: true,
    style: {
      strokeColor: '#7c3aed',
      strokeWidth: 1.0,
      strokeDash: [6, 5],
      previewColor: '#7c3aed'
    },
    popupConfig: {
      titleField: 'Layer',
      defaultTitle: 'Divisor de Águas / Bacia',
      fields: [
        { key: 'Layer', label: 'Identificação da Bacia' },
        { key: 'SubClasses', label: 'Tipo de Entidade' },
        { key: 'EntityHand', label: 'Código Cartográfico' }
      ]
    },
    searchable: false
  },

  // ================= 4. SISTEMA VIÁRIO =================
  {
    id: 'rodovia_federal',
    name: 'Rodovia Federal (BR)',
    fileName: 'Rodovia Federal.geojson',
    source: 'DNIT / Infraestrutura Federal',
    refDate: '2024',
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: true,
    defaultOpacity: 1,
    zIndex: 55,
    isHighway: true,
    highwayType: 'BR',
    style: {
      strokeColor: '#dc2626',
      strokeWidth: 1.8,
      casingColor: '#ffffff',
      casingWidth: 2.8,
      previewColor: '#dc2626'
    },
    popupConfig: {
      titleField: 'codTrechoR',
      defaultTitle: 'Rodovia Federal',
      titlePrefix: 'Rodovia Federal - Trecho: ',
      fields: [
        { key: 'codTrechoR', label: 'Código do Trecho (SNV)' },
        { key: 'nome', label: 'Identificação' },
        { key: 'd_jurisdic', label: 'Jurisdição' },
        { key: 'd_tipoTrec', label: 'Tipo de Trecho' },
        { key: 'd_revestim', label: 'Tipo de Pavimento' },
        { key: 'd_administ', label: 'Administração' }
      ]
    },
    searchable: true,
    searchFields: ['codTrechoR', 'nome']
  },
  {
    id: 'rodovia_estadual',
    name: 'Rodovia Estadual (ERS)',
    fileName: 'Rodovia Estadual.geojson',
    source: 'DAER / Governo do Estado do RS',
    refDate: '2024',
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: true,
    defaultOpacity: 1,
    zIndex: 53,
    isHighway: true,
    highwayType: 'ERS',
    style: {
      strokeColor: '#ea580c',
      strokeWidth: 1.4,
      casingColor: '#ffffff',
      casingWidth: 2.2,
      previewColor: '#ea580c'
    },
    popupConfig: {
      titleField: 'nome',
      defaultTitle: 'Rodovia Estadual',
      fields: [
        { key: 'nome', label: 'Rodovia Estadual' },
        { key: 'codTrechoR', label: 'Código do Trecho (DAER)' },
        { key: 'd_jurisdic', label: 'Jurisdição' },
        { key: 'd_tipoTrec', label: 'Tipo de Trecho' },
        { key: 'd_revestim', label: 'Revestimento' }
      ]
    },
    searchable: true,
    searchFields: ['nome', 'codTrechoR']
  },
  {
    id: 'estradas_municipais',
    name: 'Estradas Municipais (Interior)',
    fileName: 'Estradas Municipais.geojson',
    source: 'Prefeitura Municipal de Passo Fundo',
    refDate: '2026',
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: false,
    defaultOpacity: 0.9,
    zIndex: 44,
    style: {
      strokeColor: '#d97706',
      strokeWidth: 1.0,
      previewColor: '#d97706'
    },
    popupConfig: {
      titleField: 'd_tipoTrec',
      defaultTitle: 'Estrada Municipal',
      fields: [
        { key: 'd_tipoTrec', label: 'Tipo de Estrada' },
        { key: 'd_jurisdic', label: 'Jurisdição' },
        { key: 'd_revestim', label: 'Tipo de Revestimento' },
        { key: 'd_administ', label: 'Órgão Responsável' }
      ]
    },
    searchable: false
  },
  {
    id: 'ferrovia',
    name: 'Ferrovia (Linha Férrea)',
    fileName: 'Ferrovia.geojson',
    source: 'ANTT / Concessionaria Ferroviaria',
    refDate: '2024',
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: false,
    defaultOpacity: 1,
    zIndex: 48,
    isRailway: true,
    style: {
      strokeColor: '#0f172a',
      strokeWidth: 1.6,
      previewColor: '#0f172a'
    },
    popupConfig: {
      titleField: 'nome',
      defaultTitle: 'Malha Ferroviária',
      fields: [
        { key: 'nome', label: 'Concessionária Operadora' },
        { key: 'd_bitola', label: 'Tipo de Bitola' },
        { key: 'd_nrLinhas', label: 'Número de Linhas' },
        { key: 'd_tipoTrec', label: 'Classificação da Linha' }
      ]
    },
    searchable: true,
    searchFields: ['nome']
  },
  {
    id: 'pontes',
    name: 'Pontes',
    fileName: 'Pontes.geojson',
    source: 'Prefeitura Municipal de Passo Fundo',
    refDate: '2026',
    group: 'sistema_viario',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 1,
    zIndex: 58,
    isCore: true,
    isLazy: false,
    style: {
      fillColor: 'rgba(217, 119, 6, 0.50)',
      strokeColor: '#b45309',
      strokeWidth: 1.8,
      previewColor: '#d97706'
    },
    popupConfig: {
      titleField: 'id',
      defaultTitle: 'Ponte',
      titlePrefix: 'Ponte — ID: ',
      fields: [
        { key: 'id', label: 'Identificador (ID)' },
        { key: 'Pontes', label: 'Tipo de Estrutura' },
        { key: 'AREA', label: 'Área da Estrutura (m²)', format: 'number' }
      ]
    },
    searchable: true,
    searchFields: ['id', 'Pontes']
  },
  {
    id: 'malha_viaria',
    name: 'Malha Viária Urbana (Ruas)',
    fileName: 'Malha Viária.geojson',
    source: 'Prefeitura Municipal de Passo Fundo',
    refDate: '2026',
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: false,
    defaultOpacity: 0.65,
    zIndex: 35,
    isLazy: true,
    minZoom: 14, // Scale-dependent visibility to prevent viewport clogging
    style: {
      strokeColor: '#64748b',
      strokeWidth: 0.9,
      previewColor: '#64748b'
    },
    popupConfig: {
      titleField: 'NM_LOG',
      defaultTitle: 'Logradouro Urbano',
      fields: [
        { key: 'NM_LOG', label: 'Nome da Rua/Avenida' },
        { key: 'NM_TIP_LOG', label: 'Tipo de Logradouro' },
        { key: 'TOT_RES', label: 'Residências no Trecho', format: 'number' },
        { key: 'TOT_GERAL', label: 'Total de Edificações', format: 'number' },
        { key: 'CD_SETOR', label: 'Setor Censitário IBGE' },
        { key: 'CD_QUADRA', label: 'Quadra' }
      ]
    },
    searchable: true,
    searchFields: ['NM_LOG', 'NM_TIP_LOG']
  },

  // ================= 5. DIVISÃO TERRITORIAL & LIMITES =================
  {
    id: 'limite_territorial',
    name: 'Limite Territorial Passo Fundo',
    fileName: 'Limite Territorial Passo Fundo.geojson',
    source: 'IBGE - Malha Municipal',
    refDate: '2022',
    group: 'divisao_territorial',
    geometryType: 'MultiPolygon',
    defaultVisible: true,
    defaultOpacity: 1,
    zIndex: 20,
    isCore: true,
    isLazy: false,
    style: {
      fillColor: 'rgba(0, 0, 0, 0)',
      strokeColor: '#B71C1C',
      strokeWidth: 2.592,
      strokeDash: [8, 5],
      previewColor: '#B71C1C'
    },
    popupConfig: {
      titleField: 'NM_MUN',
      defaultTitle: 'Município de Passo Fundo',
      fields: [
        { key: 'NM_MUN', label: 'Município' },
        { key: 'SIGLA_UF', label: 'Unidade Federativa' },
        { key: 'AREA_KM2', label: 'Área Territorial Oficial (km²)', format: 'number' },
        { key: 'CD_MUN', label: 'Código IBGE Oficial' },
        { key: 'NM_RGINT', label: 'Região Intermediária' }
      ]
    },
    searchable: true,
    searchFields: ['NM_MUN']
  },
  {
    id: 'bairros',
    name: 'Bairros e Regiões Urbanas',
    fileName: 'Bairros Passo Fundo.geojson',
    source: 'Prefeitura Municipal / IBGE Censo 2022',
    refDate: '2022',
    group: 'divisao_territorial',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.82,
    zIndex: 30,
    isCore: true,
    isLazy: false,
    style: {
      fillColor: 'rgba(16, 185, 129, 0.08)',
      strokeColor: '#059669',
      strokeWidth: 1.0,
      showCentroidLabels: true,
      minLabelZoom: 12,
      previewColor: '#059669'
    },
    popupConfig: {
      titleField: 'Descri____',
      defaultTitle: 'Bairro / Região Urbana',
      fields: [
        { key: 'Name', label: 'Identificador' },
        { key: 'Descri____', label: 'Região / Bairro' },
        { key: 'Pop_2022', label: 'População Estimada (2022)', format: 'number' },
        { key: 'Variaca(%)', label: 'Variação Populacional (%)', format: 'number' },
        { key: 'Dados', label: 'Vilas e Loteamentos Integrantes' }
      ]
    },
    searchable: true,
    searchFields: ['Name', 'Descri____', 'Dados']
  },
  {
    id: 'distritos',
    name: 'Distritos de Passo Fundo',
    fileName: 'Distritos de Passo Fundo.geojson',
    source: 'IBGE / Prefeitura Municipal',
    refDate: '2022',
    group: 'divisao_territorial',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1,
    zIndex: 75,
    isCore: true,
    isLazy: false,
    style: {
      pointColor: '#dc2626',
      pointRadius: 7,
      strokeColor: '#ffffff',
      strokeWidth: 2.0,
      previewColor: '#dc2626'
    },
    popupConfig: {
      titleField: 'nome',
      titlePrefix: 'Distrito Municipal de ',
      fields: [
        { key: 'nome', label: 'Nome do Distrito' },
        { key: 'Pop 2022', label: 'População (Censo 2022)', format: 'number' },
        { key: 'nomeAbrev', label: 'Abreviação Oficial' }
      ]
    },
    searchable: true,
    searchFields: ['nome']
  },
  {
    id: 'setores_censitarios',
    name: 'Setores Censitários (IBGE 2022)',
    fileName: 'Setores Censitários Passo Fundo.geojson',
    source: 'IBGE - Censo Demografico 2022',
    refDate: '2022',
    group: 'divisao_territorial',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.75,
    zIndex: 25,
    isLazy: true,
    style: {
      fillColor: 'rgba(100, 116, 139, 0.1)',
      strokeColor: '#475569',
      strokeWidth: 0.6,
      previewColor: '#475569'
    },
    popupConfig: {
      titleField: 'CD_SETOR',
      titlePrefix: 'Setor Censitário: ',
      fields: [
        { key: 'CD_SETOR', label: 'Código do Setor IBGE' },
        { key: 'V0001', label: 'População Residente (hab)', format: 'number' },
        { key: 'V0002', label: 'Total de Domicílios', format: 'number' },
        { key: 'DENSIDADE', label: 'Densidade (hab/km²)', format: 'number' },
        { key: 'AREA_KM2', label: 'Área do Setor (km²)', format: 'number' },
        { key: 'NM_DIST', label: 'Distrito de Pertencimento' },
        { key: 'RendaV06004_Vmed_mensal_pordomic', label: 'Renda Média Domiciliar (R$)', format: 'currency' }
      ]
    },
    searchable: true,
    searchFields: ['CD_SETOR', 'NM_DIST']
  },
  {
    id: 'municipios_rs',
    name: 'Municípios do Rio Grande do Sul',
    fileName: 'Municípios do RS.geojson',
    source: 'IBGE - Malha Municipal',
    refDate: '2022',
    group: 'divisao_territorial',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.7,
    zIndex: 10,
    isLazy: true,
    style: {
      fillColor: 'rgba(71, 85, 105, 0.05)',
      strokeColor: '#64748b',
      strokeWidth: 0.6,
      previewColor: '#64748b'
    },
    popupConfig: {
      titleField: 'NM_MUN',
      titlePrefix: 'Município: ',
      fields: [
        { key: 'NM_MUN', label: 'Município' },
        { key: 'AREA_KM2', label: 'Área Territorial (km²)', format: 'number' },
        { key: 'CD_MUN', label: 'Código IBGE' },
        { key: 'NM_RGINT', label: 'Região Intermediária' },
        { key: 'NM_RGI', label: 'Região Imediata' }
      ]
    },
    searchable: true,
    searchFields: ['NM_MUN', 'CD_MUN']
  },

  {
    id: 'limite_plano_diretor',
    name: 'Limite do Plano Diretor',
    fileName: 'Limite Plano Diretor.geojson',
    source: 'Plano Diretor / Prefeitura de Passo Fundo',
    refDate: '2024',
    group: 'divisao_territorial',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.8,
    zIndex: 22,
    isLazy: true,
    style: {
      fillColor: 'rgba(147, 51, 234, 0.12)',
      strokeColor: '#9333ea',
      strokeWidth: 1.4,
      strokeDash: [6, 6],
      previewColor: '#9333ea'
    },
    popupConfig: {
      titleField: 'Layer',
      defaultTitle: 'Perímetro do Plano Diretor',
      fields: [
        { key: 'Layer', label: 'Zoneamento / Perímetro' },
        { key: 'Linetype', label: 'Tipo de Linha' },
        { key: 'SubClasses', label: 'Classe CAD/GIS' }
      ]
    },
    searchable: false
  },

  // ================= 6. POPULAÇÃO & INDICADORES SOCIOECONÔMICOS =================
  {
    id: 'censo_pop_0a4',
    name: 'População de 0 a 4 anos (Primeira Infância)',
    fileName: 'cn22_pop03_0a4_tot_2_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop03_0a4_tot_2',
    choroplethBreaks: [
      { max: 0.04, color: 'rgba(254, 240, 217, 0.75)', label: '< 4,0% (Baixa proporção)' },
      { max: 0.06, color: 'rgba(253, 204, 138, 0.75)', label: '4,0% - 6,0% (Média)' },
      { max: 0.08, color: 'rgba(252, 141, 89, 0.75)', label: '6,0% - 8,0% (Alta)' },
      { max: 0.10, color: 'rgba(227, 74, 51, 0.75)', label: '8,0% - 10,0% (Muito Alta)' },
      { max: Infinity, color: 'rgba(179, 0, 0, 0.75)', label: '> 10,0% (Crítica / Vulnerabilidade)' }
    ],
    style: {
      strokeColor: '#9a3412',
      strokeWidth: 0.8,
      previewColor: '#ea580c'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'Primeira Infância (0-4 anos) — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop03_0a4_tot_2', label: 'Proporção 0 a 4 anos', format: 'percent' },
        { key: 'dem.v01031', label: 'Crianças de 0 a 4 anos (hab)', format: 'number' },
        { key: 'bas.v0001', label: 'População Total do Setor (hab)', format: 'number' }
      ]
    },
    description: 'Proporção e total de crianças de 0 a 4 anos (Primeira Infância) por setor censitário. Informação crítica para evacuação e resgate prioritário da Defesa Civil.',
    searchable: true,
    searchFields: ['id']
  },
  {
    id: 'censo_pop_5a9',
    name: 'População de 5 a 9 anos (Crianças)',
    fileName: 'cn22_pop03_5a9_tot_2_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop03_5a9_tot_2',
    choroplethBreaks: [
      { max: 0.04, color: 'rgba(254, 240, 217, 0.75)', label: '< 4,0% (Baixa proporção)' },
      { max: 0.06, color: 'rgba(253, 204, 138, 0.75)', label: '4,0% - 6,0% (Média)' },
      { max: 0.08, color: 'rgba(252, 141, 89, 0.75)', label: '6,0% - 8,0% (Alta)' },
      { max: 0.10, color: 'rgba(227, 74, 51, 0.75)', label: '8,0% - 10,0% (Muito Alta)' },
      { max: Infinity, color: 'rgba(179, 0, 0, 0.75)', label: '> 10,0% (Crítica)' }
    ],
    style: {
      strokeColor: '#c2410c',
      strokeWidth: 0.8,
      previewColor: '#f97316'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'Crianças (5-9 anos) — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop03_5a9_tot_2', label: 'Proporção 5 a 9 anos', format: 'percent' },
        { key: 'dem.v01032', label: 'Crianças de 5 a 9 anos (hab)', format: 'number' },
        { key: 'bas.v0001', label: 'População Total do Setor (hab)', format: 'number' }
      ]
    },
    description: 'Proporção e total de crianças de 5 a 9 anos por setor censitário pelo Censo IBGE 2022.',
    searchable: true,
    searchFields: ['id']
  },
  {
    id: 'censo_pop_10a14',
    name: 'População de 10 a 14 anos',
    fileName: 'cn22_pop03_10a14_tot_2_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop03_10a14_tot_2',
    choroplethBreaks: [
      { max: 0.04, color: 'rgba(254, 240, 217, 0.75)', label: '< 4,0%' },
      { max: 0.06, color: 'rgba(253, 204, 138, 0.75)', label: '4,0% - 6,0%' },
      { max: 0.08, color: 'rgba(252, 141, 89, 0.75)', label: '6,0% - 8,0%' },
      { max: 0.10, color: 'rgba(227, 74, 51, 0.75)', label: '8,0% - 10,0%' },
      { max: Infinity, color: 'rgba(179, 0, 0, 0.75)', label: '> 10,0%' }
    ],
    style: {
      strokeColor: '#b45309',
      strokeWidth: 0.8,
      previewColor: '#d97706'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'População 10-14 anos — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop03_10a14_tot_2', label: 'Proporção 10 a 14 anos', format: 'percent' },
        { key: 'dem.v01033', label: 'População de 10 a 14 anos (hab)', format: 'number' },
        { key: 'bas.v0001', label: 'População Total do Setor (hab)', format: 'number' }
      ]
    },
    description: 'Proporção e total de residentes com 10 a 14 anos por setor censitário pelo Censo IBGE 2022.',
    searchable: true,
    searchFields: ['id']
  },
  {
    id: 'censo_pop_15a19',
    name: 'População de 15 a 19 anos (Jovens)',
    fileName: 'cn22_pop03_15a19_tot_2_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop03_15a19_tot_2',
    choroplethBreaks: [
      { max: 0.04, color: 'rgba(254, 240, 217, 0.75)', label: '< 4,0%' },
      { max: 0.06, color: 'rgba(253, 204, 138, 0.75)', label: '4,0% - 6,0%' },
      { max: 0.08, color: 'rgba(252, 141, 89, 0.75)', label: '6,0% - 8,0%' },
      { max: 0.10, color: 'rgba(227, 74, 51, 0.75)', label: '8,0% - 10,0%' },
      { max: Infinity, color: 'rgba(179, 0, 0, 0.75)', label: '> 10,0%' }
    ],
    style: {
      strokeColor: '#4d7c0f',
      strokeWidth: 0.8,
      previewColor: '#65a30d'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'Jovens (15-19 anos) — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop03_15a19_tot_2', label: 'Proporção 15 a 19 anos', format: 'percent' },
        { key: 'dem.v01034', label: 'População de 15 a 19 anos (hab)', format: 'number' },
        { key: 'bas.v0001', label: 'População Total do Setor (hab)', format: 'number' }
      ]
    },
    description: 'Proporção e total de jovens de 15 a 19 anos por setor censitário pelo Censo IBGE 2022.',
    searchable: true,
    searchFields: ['id']
  },
  {
    id: 'censo_pop_20a59',
    name: 'População de 20 a 59 anos (Adultos)',
    fileName: 'cn22_pop03_20a59_tot_2_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop03_20a59_tot_2',
    choroplethBreaks: [
      { max: 0.50, color: 'rgba(237, 248, 251, 0.75)', label: '< 50,0%' },
      { max: 0.55, color: 'rgba(178, 226, 226, 0.75)', label: '50,0% - 55,0%' },
      { max: 0.60, color: 'rgba(102, 194, 164, 0.75)', label: '55,0% - 60,0%' },
      { max: 0.65, color: 'rgba(44, 162, 95, 0.75)', label: '60,0% - 65,0%' },
      { max: Infinity, color: 'rgba(0, 109, 44, 0.75)', label: '> 65,0%' }
    ],
    style: {
      strokeColor: '#047857',
      strokeWidth: 0.8,
      previewColor: '#10b981'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'População Adulta (20-59 anos) — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop03_20a59_tot_2', label: 'Proporção 20 a 59 anos', format: 'percent' },
        { key: 'cn22_pop03_20a59_tot_1', label: 'População de 20 a 59 anos (hab)', format: 'number' },
        { key: 'bas.v0001', label: 'População Total do Setor (hab)', format: 'number' }
      ]
    },
    description: 'Proporção e total da população adulta de 20 a 59 anos por setor censitário pelo Censo IBGE 2022.',
    searchable: true,
    searchFields: ['id']
  },
  {
    id: 'censo_pop_m60',
    name: 'População Idosa — 60 anos ou mais (Grupo Prioritário)',
    fileName: 'cn22_pop03_m60_tot_2_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop03_m60_tot_2',
    choroplethBreaks: [
      { max: 0.12, color: 'rgba(242, 240, 247, 0.75)', label: '< 12,0% (Baixa concentração)' },
      { max: 0.18, color: 'rgba(203, 201, 226, 0.75)', label: '12,0% - 18,0% (Média)' },
      { max: 0.24, color: 'rgba(158, 154, 200, 0.75)', label: '18,0% - 24,0% (Alta)' },
      { max: 0.30, color: 'rgba(117, 107, 177, 0.75)', label: '24,0% - 30,0% (Muito Alta)' },
      { max: Infinity, color: 'rgba(84, 39, 143, 0.75)', label: '> 30,0% (Crítica / Prioritária)' }
    ],
    style: {
      strokeColor: '#581c87',
      strokeWidth: 0.8,
      previewColor: '#7c3aed'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'População Idosa (60+ anos) — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop03_m60_tot_2', label: 'Proporção 60+ anos', format: 'percent' },
        { key: 'cn22_pop03_m60_tot_1', label: 'População Idosa (60+ anos) (hab)', format: 'number' },
        { key: 'bas.v0001', label: 'População Total do Setor (hab)', format: 'number' }
      ]
    },
    description: 'Proporção e contingente de pessoas idosas (60+ anos) por setor censitário. Dado essencial para resgate prioritário e acolhimento em abrigos pela Defesa Civil.',
    searchable: true,
    searchFields: ['id']
  },
  {
    id: 'censo_densidade_2022',
    name: 'Densidade Demográfica Setorial — Censo 2022 (hab/km²)',
    fileName: 'cn22_pop04_res_tot_kmtot_2_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop04_res_tot_kmtot_2',
    choroplethBreaks: [
      { max: 500, color: 'rgba(254, 240, 217, 0.75)', label: '< 500 hab/km² (Rural/Baixa)' },
      { max: 2500, color: 'rgba(253, 204, 138, 0.75)', label: '500 - 2.500 hab/km² (Média)' },
      { max: 5000, color: 'rgba(252, 141, 89, 0.75)', label: '2.500 - 5.000 hab/km² (Alta)' },
      { max: 10000, color: 'rgba(227, 74, 51, 0.75)', label: '5.000 - 10.000 hab/km² (Muito Alta)' },
      { max: Infinity, color: 'rgba(179, 0, 0, 0.75)', label: '> 10.000 hab/km² (Adensada/Vertical)' }
    ],
    style: {
      strokeColor: '#991b1b',
      strokeWidth: 0.8,
      previewColor: '#dc2626'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'Densidade Demográfica 2022 — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop04_res_tot_kmtot_2', label: 'Densidade Demográfica (hab/km²)', format: 'number' },
        { key: 'bas.v0001', label: 'População Residente (hab)', format: 'number' },
        { key: 'cn22_ter01_area_tot_0', label: 'Área Territorial do Setor (km²)', format: 'number' }
      ]
    },
    description: 'Densidade demográfica setorial em hab/km² com dados atualizados do Censo IBGE 2022.',
    searchable: true,
    searchFields: ['id']
  },
  {
    id: 'censo_renda_vulnerabilidade',
    name: 'Vulnerabilidade Social — Rendimento Médio Domiciliar (Censo 2022)',
    fileName: 'cn22_pop05_rsp_tot_0_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop05_rsp_tot_0',
    choroplethBreaks: [
      { max: 2000, color: 'rgba(247, 230, 197, 0.75)', label: 'Até R$ 2.000 (Alta Vulnerabilidade Social)' },
      { max: 3000, color: 'rgba(232, 195, 158, 0.75)', label: 'R$ 2.000 - R$ 3.000 (Média-Alta Vulnerabilidade)' },
      { max: 4500, color: 'rgba(201, 130, 91, 0.75)', label: 'R$ 3.000 - R$ 4.500 (Média Vulnerabilidade)' },
      { max: 7000, color: 'rgba(155, 79, 54, 0.75)', label: 'R$ 4.500 - R$ 7.000 (Média-Baixa Vulnerabilidade)' },
      { max: Infinity, color: 'rgba(90, 36, 24, 0.75)', label: '> R$ 7.000 (Baixa Vulnerabilidade)' }
    ],
    style: {
      strokeColor: '#5a2418',
      strokeWidth: 0.8,
      previewColor: '#9b4f36'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'Vulnerabilidade / Renda — Setor ',
      fields: [
        { key: 'rendimento_reais', label: 'Rendimento Médio Domiciliar' },
        { key: 'faixa_rendimento', label: 'Faixa de Rendimento (Cor)' }
      ]
    },
    description: 'Rendimento médio mensal domiciliar por setor censitário pelo Censo IBGE 2022, indicador chave de vulnerabilidade socioeconômica para a Defesa Civil.',
    searchable: true,
    searchFields: ['id']
  },
  // ================= 5. ÁREAS VERDES =================
  // --- 5.1 PONTOS ---
  {
    id: 'pracas',
    name: 'Praças',
    fileName: 'data/areas-verdes/Praças.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'pontos',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1,
    zIndex: 65,
    isLazy: true,
    style: {
      pointColor: '#10b981',
      pointRadius: 5.5,
      strokeColor: '#ffffff',
      strokeWidth: 1.8,
      previewColor: '#10b981'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Praça Pública',
      fields: [
        { key: 'NOME', label: 'Nome da Praça' }
      ]
    },
    description: 'Mapeamento georreferenciado das 60 praças públicas municipais de Passo Fundo.',
    searchable: true,
    searchFields: ['NOME']
  },
  {
    id: 'parques_urbanos_pontos',
    name: 'Parques Urbanos (Localização)',
    fileName: 'data/areas-verdes/Parques Urbanos.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'pontos',
    geometryType: 'MultiPoint',
    defaultVisible: false,
    defaultOpacity: 1,
    zIndex: 68,
    isLazy: true,
    style: {
      pointColor: '#047857',
      pointRadius: 6.5,
      strokeColor: '#ffffff',
      strokeWidth: 2.0,
      previewColor: '#047857'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Parque Urbano',
      fields: [
        { key: 'NOME', label: 'Nome do Parque' },
        { key: 'FID', label: 'Identificador' }
      ]
    },
    description: 'Pontos de localização dos principais parques urbanos e áreas de recreação pública.',
    searchable: true,
    searchFields: ['NOME']
  },
  {
    id: 'areas_verdes_pontos',
    name: 'Áreas Verdes Cadastradas',
    fileName: 'data/areas-verdes/Áreas Verdes.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'pontos',
    geometryType: 'MultiPoint',
    defaultVisible: false,
    defaultOpacity: 1,
    zIndex: 64,
    isLazy: true,
    style: {
      pointColor: '#22c55e',
      pointRadius: 4.5,
      strokeColor: '#ffffff',
      strokeWidth: 1.5,
      previewColor: '#22c55e'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Área Verde',
      fields: [
        { key: 'NOME', label: 'Denominação' },
        { key: 'NOME_2', label: 'Denominação Complementar' },
        { key: 'FID', label: 'Identificador' }
      ]
    },
    description: '118 registros de áreas verdes municipais cadastradas no planejamento urbano.',
    searchable: true,
    searchFields: ['NOME', 'NOME_2']
  },
  {
    id: 'areas_privadas',
    name: 'Áreas Privadas',
    fileName: 'data/areas-verdes/Áreas Privadas.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'pontos',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1,
    zIndex: 63,
    isLazy: true,
    style: {
      pointColor: '#b45309',
      pointRadius: 5.0,
      strokeColor: '#ffffff',
      strokeWidth: 1.6,
      previewColor: '#b45309'
    },
    popupConfig: {
      titleField: 'FID',
      titlePrefix: 'Área Privada #',
      defaultTitle: 'Área Privada',
      fields: [
        { key: 'FID', label: 'Código da Área Privada' }
      ]
    },
    description: 'Pontos de identificação de áreas verdes em regime de propriedade privada.',
    searchable: false
  },
  {
    id: 'projetos_multigares',
    name: 'Projetos Multigares',
    fileName: 'data/areas-verdes/Projetos Multigares.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'pontos',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1,
    zIndex: 66,
    isLazy: true,
    style: {
      pointColor: '#0d9488',
      pointRadius: 5.5,
      strokeColor: '#ffffff',
      strokeWidth: 1.8,
      previewColor: '#0d9488'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Projeto Multigar',
      fields: [
        { key: 'NOME', label: 'Nome do Projeto' },
        { key: 'FID', label: 'Identificador' }
      ]
    },
    description: 'Pontos de intervenção do programa de projetos multigares da SEPLAN.',
    searchable: true,
    searchFields: ['NOME']
  },

  // --- 5.2 LINHAS ---
  {
    id: 'corredores_verdes',
    name: 'Corredores Verdes',
    fileName: 'data/areas-verdes/Corredoes verdes.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'linhas',
    geometryType: 'MultiLineString',
    defaultVisible: false,
    defaultOpacity: 0.95,
    zIndex: 48,
    isLazy: true,
    style: {
      strokeColor: '#16a34a',
      strokeWidth: 2.4,
      previewColor: '#16a34a'
    },
    popupConfig: {
      titleField: 'layer',
      defaultTitle: 'Corredor Verde',
      fields: [
        { key: 'layer', label: 'Camada Cartográfica' },
        { key: 'cost', label: 'Extensão / Custo (m)', format: 'number' },
        { key: 'fid', label: 'Identificador do Segmento' }
      ]
    },
    description: '47 segmentos viários e faixas conectoras ecológicas de corredores verdes urbanos.',
    searchable: false
  },
  {
    id: 'parque_linear_pres_vargas',
    name: 'Parque Linear — Av. Presidente Vargas',
    fileName: 'data/areas-verdes/Parque Linear Av. Presidente Vargas.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'linhas',
    geometryType: 'MultiLineString',
    defaultVisible: false,
    defaultOpacity: 1,
    zIndex: 49,
    isLazy: true,
    style: {
      strokeColor: '#15803d',
      strokeWidth: 3.2,
      previewColor: '#15803d'
    },
    popupConfig: {
      defaultTitle: 'Parque Linear — Av. Presidente Vargas',
      fields: [
        { key: 'FID', label: 'Identificador' }
      ]
    },
    description: 'Eixo linear de intervenção urbanística e parque da Av. Presidente Vargas.',
    searchable: false
  },
  {
    id: 'parque_linear_rui_barbosa',
    name: 'Parque Linear — Av. Rui Barbosa',
    fileName: 'data/areas-verdes/Parque Linear Av. Rui Barbosa.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'linhas',
    geometryType: 'MultiLineString',
    defaultVisible: false,
    defaultOpacity: 1,
    zIndex: 49,
    isLazy: true,
    style: {
      strokeColor: '#15803d',
      strokeWidth: 3.2,
      strokeDash: [8, 4],
      previewColor: '#15803d'
    },
    popupConfig: {
      defaultTitle: 'Parque Linear — Av. Rui Barbosa',
      fields: [
        { key: 'FID', label: 'Identificador' }
      ]
    },
    description: 'Eixo linear de intervenção urbanística e parque da Av. Rui Barbosa.',
    searchable: false
  },

  // --- 5.3 POLÍGONOS ---
  {
    id: 'areas_publicas',
    name: 'Áreas Públicas',
    fileName: 'data/areas-verdes/Áreas Públicas.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'poligonos',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 32,
    isLazy: true,
    style: {
      fillColor: 'rgba(34, 197, 94, 0.22)',
      strokeColor: '#16a34a',
      strokeWidth: 1.2,
      previewColor: '#16a34a'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Área Pública',
      fields: [
        { key: 'NOME', label: 'Denominação' },
        { key: 'ÁREA m²', label: 'Área Superficial (m²)', format: 'area' }
      ]
    },
    description: '123 polígonos de áreas públicas municipais destinadas a lazer, recreação e conservação.',
    searchable: true,
    searchFields: ['NOME']
  },
  {
    id: 'parques_poligonos',
    name: 'Parques Urbanos (Polígonos)',
    fileName: 'data/areas-verdes/Parques.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'poligonos',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.88,
    zIndex: 34,
    isLazy: true,
    style: {
      fillColor: 'rgba(5, 150, 105, 0.28)',
      strokeColor: '#047857',
      strokeWidth: 1.8,
      previewColor: '#047857'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Parque Urbano',
      fields: [
        { key: 'NOME', label: 'Nome do Parque' },
        { key: 'ÁREA', label: 'Área Total (m²)', format: 'area' }
      ]
    },
    description: 'Delimitação perimetral e poligonal oficial dos parques urbanos de Passo Fundo.',
    searchable: true,
    searchFields: ['NOME']
  },
  {
    id: 'multigares_poligonos',
    name: 'Multigares (Polígonos)',
    fileName: 'data/areas-verdes/Multigares.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'poligonos',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 33,
    isLazy: true,
    style: {
      fillColor: 'rgba(13, 148, 136, 0.24)',
      strokeColor: '#0f766e',
      strokeWidth: 1.4,
      previewColor: '#0f766e'
    },
    popupConfig: {
      titleField: 'nome',
      defaultTitle: 'Multigar',
      fields: [
        { key: 'nome', label: 'Identificação' },
        { key: 'AREA', label: 'Área Total (m²)', format: 'area' }
      ]
    },
    description: '14 polígonos de zonas integradas do projeto Multigares.',
    searchable: true,
    searchFields: ['nome']
  },
  {
    id: 'rppn',
    name: 'RPPN — Reserva Particular do Patrimônio Natural',
    fileName: 'data/areas-verdes/RPPN.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'poligonos',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 35,
    isLazy: true,
    style: {
      fillColor: 'rgba(101, 163, 13, 0.25)',
      strokeColor: '#65a30d',
      strokeWidth: 2.0,
      previewColor: '#65a30d'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'RPPN',
      fields: [
        { key: 'NOME', label: 'Reserva Particular' },
        { key: 'ÁREA m²', label: 'Área Preservada (m²)', format: 'area' }
      ]
    },
    description: 'Reserva Particular do Patrimônio Natural (RPPN) oficialmente demarcada em Passo Fundo.',
    searchable: true,
    searchFields: ['NOME']
  },
  {
    id: 'zpnm',
    name: 'ZPNM — Zonas de Preservação Natural Municipal',
    fileName: 'data/areas-verdes/ZPNM.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'poligonos',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.82,
    zIndex: 31,
    isLazy: true,
    style: {
      fillColor: 'rgba(74, 222, 128, 0.20)',
      strokeColor: '#22c55e',
      strokeWidth: 1.6,
      strokeDash: [6, 4],
      previewColor: '#22c55e'
    },
    popupConfig: {
      titleField: 'FID',
      titlePrefix: 'Zona ZPNM #',
      defaultTitle: 'Zona de Preservação Natural Municipal',
      fields: [
        { key: 'FID', label: 'Código ZPNM' }
      ]
    },
    description: 'Zonas de Preservação Natural Municipal (ZPNM) estabelecidas pelo Plano Diretor e legislação ambiental.',
    searchable: false
  },
  {
    id: 'abrangencia_infraestruturas_verdes',
    name: 'Abrangência das Infraestruturas Verdes',
    fileName: 'data/areas-verdes/Abrangência das Infraestruturas Verdes.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'poligonos',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.8,
    zIndex: 26,
    isLazy: true,
    style: {
      fillColor: 'rgba(16, 185, 129, 0.15)',
      strokeColor: '#059669',
      strokeWidth: 1.5,
      strokeDash: [8, 4],
      previewColor: '#059669'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Abrangência de Infraestrutura Verde',
      fields: [
        { key: 'NOME', label: 'Denominação Principal' },
        { key: 'NOME_2', label: 'Espaço Associado' },
        { key: 'FID', label: 'Identificador' }
      ]
    },
    description: 'Polígonos de abrangência estratégica do sistema integrado de infraestruturas verdes.',
    searchable: true,
    searchFields: ['NOME', 'NOME_2']
  },
  {
    id: 'raio_400m_pracas',
    name: 'Raio de Abrangência — 400m Praças Públicas',
    fileName: 'data/areas-verdes/Raio 400m das Praças Públicas.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'poligonos',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.75,
    zIndex: 21,
    isLazy: true,
    style: {
      fillColor: 'rgba(16, 185, 129, 0.10)',
      strokeColor: '#10b981',
      strokeWidth: 1.0,
      strokeDash: [4, 4],
      previewColor: '#10b981'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Raio 400m — Praças Públicas',
      fields: [
        { key: 'NOME', label: 'Praça de Referência' }
      ]
    },
    description: 'Zona de caminhabilidade e influência direta de 400m (5 minutos a pé) ao redor das praças públicas.',
    searchable: false
  },
  {
    id: 'raio_400m_parque_a_brasil',
    name: 'Raio de Abrangência — 400m Parque Arthur Brasil',
    fileName: 'data/areas-verdes/Raio 400m parque A. Brasil.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'poligonos',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.75,
    zIndex: 22,
    isLazy: true,
    style: {
      fillColor: 'rgba(34, 197, 94, 0.11)',
      strokeColor: '#22c55e',
      strokeWidth: 1.0,
      strokeDash: [4, 4],
      previewColor: '#22c55e'
    },
    popupConfig: {
      defaultTitle: 'Raio 400m — Parque Arthur Brasil',
      fields: [
        { key: 'FID', label: 'Identificador' }
      ]
    },
    description: 'Área de atendimento e influência pedonal de 400m no entorno do Parque Arthur Brasil.',
    searchable: false
  },
  {
    id: 'raio_400m_parque_pres_vargas',
    name: 'Raio de Abrangência — 400m Parque Pres. Vargas',
    fileName: 'data/areas-verdes/Raio 400m parque Pres. Vargas.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'poligonos',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.75,
    zIndex: 22,
    isLazy: true,
    style: {
      fillColor: 'rgba(34, 197, 94, 0.11)',
      strokeColor: '#22c55e',
      strokeWidth: 1.0,
      strokeDash: [4, 4],
      previewColor: '#22c55e'
    },
    popupConfig: {
      defaultTitle: 'Raio 400m — Parque Presidente Vargas',
      fields: [
        { key: 'FID', label: 'Identificador' }
      ]
    },
    description: 'Área de atendimento e influência pedonal de 400m no entorno do Parque Presidente Vargas.',
    searchable: false
  },
  {
    id: 'raio_400m_parque_setimo_ceu',
    name: 'Raio de Abrangência — 400m Parque Sétimo Céu',
    fileName: 'data/areas-verdes/Raio 400m parque sétimo céu.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'poligonos',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.75,
    zIndex: 22,
    isLazy: true,
    style: {
      fillColor: 'rgba(34, 197, 94, 0.11)',
      strokeColor: '#22c55e',
      strokeWidth: 1.0,
      strokeDash: [4, 4],
      previewColor: '#22c55e'
    },
    popupConfig: {
      defaultTitle: 'Raio 400m — Parque Sétimo Céu',
      fields: [
        { key: 'FID', label: 'Identificador' }
      ]
    },
    description: 'Área de atendimento e influência pedonal de 400m no entorno do Parque Sétimo Céu.',
    searchable: false
  },
  {
    id: 'raio_800m_parques_lineares',
    name: 'Raio de Abrangência — 800m Parques Lineares',
    fileName: 'data/areas-verdes/Raio 800m dos Parques Lineares.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'poligonos',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.75,
    zIndex: 19,
    isLazy: true,
    style: {
      fillColor: 'rgba(21, 128, 61, 0.10)',
      strokeColor: '#15803d',
      strokeWidth: 1.0,
      strokeDash: [5, 5],
      previewColor: '#15803d'
    },
    popupConfig: {
      defaultTitle: 'Raio 800m — Parques Lineares',
      fields: [
        { key: 'FID_2', label: 'Zona de Influência' },
        { key: 'FID_3', label: 'Segmento' }
      ]
    },
    description: 'Área de influência intermediária de 800m (10 minutos a pé) ao longo dos parques lineares municipais.',
    searchable: false
  },
  {
    id: 'raio_1600m_parques',
    name: 'Raio de Abrangência — 1600m Parques Urbanos',
    fileName: 'data/areas-verdes/Raio 1600m dos Parques.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'poligonos',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.7,
    zIndex: 17,
    isLazy: true,
    style: {
      fillColor: 'rgba(4, 120, 87, 0.08)',
      strokeColor: '#047857',
      strokeWidth: 1.0,
      strokeDash: [6, 4],
      previewColor: '#047857'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Raio 1600m — Parques Urbanos',
      fields: [
        { key: 'NOME', label: 'Parque de Referência' }
      ]
    },
    description: 'Macro-zona de cobertura regional de 1.600m (20 minutos) no entorno dos grandes parques urbanos.',
    searchable: false
  },
  {
    id: 'raio_1600m_multigares',
    name: 'Raio de Abrangência — 1600m Multigares',
    fileName: 'data/areas-verdes/Raio 1600m dos Multigares.geojson',
    source: 'Secretaria Municipal de Planejamento (SEPLAN)',
    refDate: '2026',
    group: 'areas_verdes',
    subgroup: 'poligonos',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.7,
    zIndex: 16,
    isLazy: true,
    style: {
      fillColor: 'rgba(13, 148, 136, 0.08)',
      strokeColor: '#0f766e',
      strokeWidth: 1.0,
      strokeDash: [6, 4],
      previewColor: '#0f766e'
    },
    popupConfig: {
      defaultTitle: 'Raio 1600m — Multigares',
      fields: [
        { key: 'FID', label: 'Identificador da Zona' }
      ]
    },
    description: 'Macro-zona de cobertura regional de 1.600m no entorno dos projetos Multigares.',
    searchable: false
  },

  // ================= 6. ESPORTE E CULTURA =================
  {
    id: 'equipamentos_esportivos',
    name: 'Equipamentos Esportivos',
    fileName: 'data/esporte-cultura/Equipamentos esportivos.geojson',
    source: 'Secretaria Municipal de Esportes / SEPLAN',
    refDate: '2026',
    group: 'esporte_cultura',
    subgroup: 'esporte',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1.0,
    zIndex: 56,
    isLazy: true,
    style: {
      pointColor: '#0284c7',
      pointRadius: 7,
      strokeColor: '#ffffff',
      strokeWidth: 2.0,
      previewColor: '#0284c7'
    },
    popupConfig: {
      titleField: 'Nome',
      defaultTitle: 'Equipamento Esportivo',
      fields: [
        { key: 'Nome', label: 'Nome do Equipamento' }
      ]
    },
    description: 'Centros e complexos municipais de esporte e lazer comunitários de Passo Fundo.',
    searchable: true,
    searchFields: ['Nome', 'nome']
  },
  {
    id: 'estadios_ginasios',
    name: 'Estádios e Ginásios',
    fileName: 'data/esporte-cultura/Estádios e Ginásios.geojson',
    source: 'Secretaria Municipal de Esportes / SEPLAN',
    refDate: '2026',
    group: 'esporte_cultura',
    subgroup: 'esporte',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1.0,
    zIndex: 57,
    isLazy: true,
    style: {
      pointColor: '#ea580c',
      pointRadius: 7.5,
      strokeColor: '#ffffff',
      strokeWidth: 2.0,
      previewColor: '#ea580c'
    },
    popupConfig: {
      titleField: 'nome',
      defaultTitle: 'Estádio / Ginásio',
      fields: [
        { key: 'nome', label: 'Nome do Estádio / Ginásio' }
      ]
    },
    description: 'Estádios de futebol, arenas esportivas e grandes ginásios poliesportivos de Passo Fundo.',
    searchable: true,
    searchFields: ['nome', 'Nome']
  },
  {
    id: 'equipamentos_culturais',
    name: 'Equipamentos Culturais',
    fileName: 'data/esporte-cultura/Equipamentos culturais.geojson',
    source: 'Secretaria Municipal de Cultura / SEPLAN',
    refDate: '2026',
    group: 'esporte_cultura',
    subgroup: 'cultura',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1.0,
    zIndex: 58,
    isLazy: true,
    style: {
      pointColor: '#9333ea',
      pointRadius: 7,
      strokeColor: '#ffffff',
      strokeWidth: 2.0,
      previewColor: '#9333ea'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Equipamento Cultural',
      fields: [
        { key: 'NOME', label: 'Denominação do Espaço Cultural' }
      ]
    },
    description: 'Museus, teatros, bibliotecas, centros culturais e parques de eventos e tradições de Passo Fundo.',
    searchable: true,
    searchFields: ['NOME', 'nome', 'Nome']
  },

  // ================= 7. EQUIPAMENTOS DE USO COLETIVO =================
  {
    id: 'aeroporto_aeroclube',
    name: 'Aeroporto Lauro Kurtz & Aeroclube',
    fileName: 'data/equipamentos-uso-coletivo/Aeroporto Lauro Kurtz.geojson',
    source: 'SEPLAN / INFRAERO / DAC',
    refDate: '2026',
    group: 'equipamentos_uso_coletivo',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1.0,
    zIndex: 59,
    isLazy: true,
    style: {
      pointColor: '#0284c7',
      pointRadius: 7.5,
      strokeColor: '#ffffff',
      strokeWidth: 2.0,
      previewColor: '#0284c7'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Aeroporto / Aeroclube',
      fields: [
        { key: 'NOME', label: 'Nome da Instalação Aeroviária' }
      ]
    },
    description: 'Instalações do Aeroporto Regional Lauro Kortz e Aeroclube de Passo Fundo.',
    searchable: true,
    searchFields: ['NOME', 'nome', 'Nome']
  },
  {
    id: 'corpo_bombeiros',
    name: 'Corpo de Bombeiros',
    fileName: 'data/equipamentos-uso-coletivo/Bombeiros.geojson',
    source: 'Corpo de Bombeiros Militar RS / SEPLAN',
    refDate: '2026',
    group: 'equipamentos_uso_coletivo',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1.0,
    zIndex: 60,
    isLazy: true,
    style: {
      pointColor: '#dc2626',
      pointRadius: 7.5,
      strokeColor: '#ffffff',
      strokeWidth: 2.0,
      previewColor: '#dc2626'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Corpo de Bombeiros',
      fields: [
        { key: 'NOME', label: 'Unidade do Corpo de Bombeiros' }
      ]
    },
    description: 'Quartéis operacionais do Corpo de Bombeiros Militar no município de Passo Fundo.',
    searchable: true,
    searchFields: ['NOME', 'nome', 'Nome']
  },
  {
    id: 'cemiterios_municipais',
    name: 'Cemitérios Municipais',
    fileName: 'data/equipamentos-uso-coletivo/Cemitérios Municípais.geojson',
    source: 'Secretaria de Transportes e Serviços Gerais / SEPLAN',
    refDate: '2026',
    group: 'equipamentos_uso_coletivo',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1.0,
    zIndex: 61,
    isLazy: true,
    style: {
      pointColor: '#475569',
      pointRadius: 7.0,
      strokeColor: '#ffffff',
      strokeWidth: 2.0,
      previewColor: '#475569'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Cemitério Municipal',
      fields: [
        { key: 'NOME', label: 'Nome do Cemitério' },
        { key: 'ENTE', label: 'Gestão / Ente Administrativo' }
      ]
    },
    description: 'Cemitérios públicos sob administração municipal de Passo Fundo.',
    searchable: true,
    searchFields: ['NOME', 'nome', 'Nome', 'ENTE']
  },
  {
    id: 'cemiterios_privados',
    name: 'Cemitérios Privados',
    fileName: 'data/equipamentos-uso-coletivo/Cemitérios Privados.geojson',
    source: 'SEPLAN / Cadastro Imobiliário',
    refDate: '2026',
    group: 'equipamentos_uso_coletivo',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1.0,
    zIndex: 62,
    isLazy: true,
    style: {
      pointColor: '#64748b',
      pointRadius: 7.0,
      strokeColor: '#ffffff',
      strokeWidth: 2.0,
      previewColor: '#64748b'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Cemitério Privado / Confessional',
      fields: [
        { key: 'NOME', label: 'Nome do Cemitério' }
      ]
    },
    description: 'Cemitérios particulares e confessionais de Passo Fundo.',
    searchable: true,
    searchFields: ['NOME', 'nome', 'Nome']
  },
  {
    id: 'hoteis',
    name: 'Hotéis & Meios de Hospedagem',
    fileName: 'data/equipamentos-uso-coletivo/Hotéis.geojson',
    source: 'SEPLAN / Secretaria de Desenvolvimento Econômico',
    refDate: '2026',
    group: 'equipamentos_uso_coletivo',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1.0,
    zIndex: 63,
    isLazy: true,
    style: {
      pointColor: '#d97706',
      pointRadius: 7.0,
      strokeColor: '#ffffff',
      strokeWidth: 2.0,
      previewColor: '#d97706'
    },
    popupConfig: {
      titleField: 'nome',
      defaultTitle: 'Hotel / Meio de Hospedagem',
      fields: [
        { key: 'nome', label: 'Nome do Estabelecimento Hoteleiro' }
      ]
    },
    description: 'Rede hoteleira, pousadas e meios de hospedagem de Passo Fundo.',
    searchable: true,
    searchFields: ['nome', 'NOME', 'Nome']
  },
  {
    id: 'seguranca_policia',
    name: 'Segurança Pública (Polícia & Delegacias)',
    fileName: 'data/equipamentos-uso-coletivo/Polícia.geojson',
    source: 'Polícia Civil / Polícia Federal / PRF / SEPLAN',
    refDate: '2026',
    group: 'equipamentos_uso_coletivo',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1.0,
    zIndex: 64,
    isLazy: true,
    style: {
      pointColor: '#2563eb',
      pointRadius: 7.5,
      strokeColor: '#ffffff',
      strokeWidth: 2.0,
      previewColor: '#2563eb'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Unidade Policial / Delegacia',
      fields: [
        { key: 'NOME', label: 'Unidade Policial / Delegacia' }
      ]
    },
    description: 'Delegacias de Polícia Civil, Polícia Federal e postos da Polícia Rodoviária Federal em Passo Fundo.',
    searchable: true,
    searchFields: ['NOME', 'nome', 'Nome']
  },
  {
    id: 'terminal_rodoviario',
    name: 'Terminal Rodoviário',
    fileName: 'data/equipamentos-uso-coletivo/Rodoviária.geojson',
    source: 'Secretaria de Transportes / SEPLAN',
    refDate: '2026',
    group: 'equipamentos_uso_coletivo',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1.0,
    zIndex: 65,
    isLazy: true,
    style: {
      pointColor: '#0d9488',
      pointRadius: 7.5,
      strokeColor: '#ffffff',
      strokeWidth: 2.0,
      previewColor: '#0d9488'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Terminal Rodoviário',
      fields: [
        { key: 'NOME', label: 'Terminal / Estação Rodoviária' }
      ]
    },
    description: 'Terminal Rodoviário Intermunicipal de Passo Fundo.',
    searchable: true,
    searchFields: ['NOME', 'nome', 'Nome']
  },
  {
    id: 'shopping_centers',
    name: 'Shopping Centers',
    fileName: 'data/equipamentos-uso-coletivo/Shoppings.geojson',
    source: 'SEPLAN / Secretaria de Desenvolvimento Econômico',
    refDate: '2026',
    group: 'equipamentos_uso_coletivo',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1.0,
    zIndex: 66,
    isLazy: true,
    style: {
      pointColor: '#7c3aed',
      pointRadius: 7.5,
      strokeColor: '#ffffff',
      strokeWidth: 2.0,
      previewColor: '#7c3aed'
    },
    popupConfig: {
      titleField: 'NOME',
      defaultTitle: 'Shopping Center',
      fields: [
        { key: 'NOME', label: 'Nome do Shopping Center' }
      ]
    },
    description: 'Shopping centers e grandes complexos comerciais de Passo Fundo.',
    searchable: true,
    searchFields: ['NOME', 'nome', 'Nome']
  }

];

export const OPERATIONAL_PRESETS = [
  {
    id: 'preset_planejamento_geral',
    name: '🏛️ Visão Geral SEPLAN',
    description: 'Configuração padrão para diagnóstico territorial com limites, bairros, distritos e malha viária',
    activeLayers: ['limite_territorial', 'bairros', 'distritos', 'rio_passo_fundo', 'malha_viaria']
  },
  {
    id: 'preset_logistica',
    name: '🚚 Mobilidade & Logística Viária',
    description: 'Foco em rodovias federais/estaduais, estradas municipais, ferrovia, malha viária e pontes',
    activeLayers: ['rodovia_federal', 'rodovia_estadual', 'estradas_municipais', 'ferrovia', 'pontes', 'malha_viaria', 'limite_territorial']
  },
  {
    id: 'preset_hidrografia',
    name: '💧 Bacias Hidrográficas & Recursos Hídricos',
    description: 'Foco no Rio Passo Fundo, bacias hidrográficas e malha hídrica municipal',
    activeLayers: ['rio_passo_fundo', 'malha_hidrica', 'bacias_hidrograficas', 'limite_territorial']
  },
  {
    id: 'preset_demografico',
    name: '👥 Demografia & Indicadores IBGE 2022',
    description: 'Foco na densidade populacional, setores censitários, faixas etárias e limites municipais',
    activeLayers: ['censo_densidade_2022', 'setores_censitarios', 'bairros', 'distritos', 'limite_territorial']
  }
];
