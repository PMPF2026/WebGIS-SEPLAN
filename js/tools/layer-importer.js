/**
 * WebGIS SEPLAN Passo Fundo - Diagnósticos Territoriais
 * Multi-Format Dynamic Layer Importer & Drag & Drop Engine
 * 
 * Suporta formatos vetoriais:
 * - KML (.kml): XML do Google Earth via ol.format.KML nativo
 * - KMZ (.kmz): Pacote comprimido Google Earth descompactado via JSZip
 * - Shapefile (.zip): Arquivos .shp, .dbf, .shx e .prj descompactados e lidos via shpjs
 * - AutoCAD DXF (.dxf): Entidades gráficas CAD em coordenadas métricas UTM 22S via DxfParser
 * - GeoJSON (.geojson, .json): Formato nativo padronizado RFC 7946
 */

import { Notification } from '../ui/notification.js';

export class LayerImporter {
  constructor(mapEngine, layerManager, sidebarUI) {
    this.mapEngine = mapEngine;
    this.layerManager = layerManager;
    this.sidebarUI = sidebarUI;

    this.init();
  }

  init() {
    // 1. File Input Selector
    const fileInput = document.getElementById('input-import-geojson');
    const importBtn = document.getElementById('btn-import-layer');

    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => {
        fileInput.value = ''; // Limpar para permitir selecionar o mesmo arquivo novamente
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.handleFile(file);
        }
      });
    }

    // 2. Drag & Drop on Window / Map
    const mapElement = document.getElementById('map');
    if (mapElement) {
      window.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      });

      mapElement.addEventListener('dragenter', (e) => {
        e.preventDefault();
        mapElement.style.outline = '3px dashed var(--dc-orange-primary)';
        mapElement.style.outlineOffset = '-6px';
      });

      mapElement.addEventListener('dragleave', (e) => {
        if (!mapElement.contains(e.relatedTarget)) {
          mapElement.style.outline = 'none';
        }
      });

      mapElement.addEventListener('drop', (e) => {
        e.preventDefault();
        mapElement.style.outline = 'none';

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          this.handleFile(file);
        }
      });
    }
  }

  /**
   * Processa, converte e carrega o arquivo fornecido pelo usuário no mapa
   * @param {File} file 
   */
  async handleFile(file) {
    const fileName = file.name;
    const ext = fileName.split('.').pop().toLowerCase();
    const cleanName = fileName.replace(/\.[^/.]+$/, "");

    Notification.info(`Importando '${fileName}'...`);

    // Cores atraentes para camadas importadas
    const palette = ['#0284c7', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'];
    const chosenColor = palette[Math.floor(Math.random() * palette.length)];

    try {
      let result;

      switch (ext) {
        case 'kml':
          result = await this.parseKmlFile(file, cleanName, chosenColor);
          break;

        case 'kmz':
          result = await this.parseKmzFile(file, cleanName, chosenColor);
          break;

        case 'zip':
          result = await this.parseShapefileZip(file, cleanName, chosenColor);
          break;

        case 'shp':
          throw new Error('Arquivos Shapefile devem ser compactados em formato .ZIP (contendo os arquivos .shp, .dbf e .prj da mesma camada). Por favor, compacte os arquivos em um .zip e tente novamente.');

        case 'dxf':
          result = await this.parseDxfFile(file, cleanName, chosenColor);
          break;

        case 'geojson':
        case 'json':
          result = await this.parseGeoJsonFile(file, cleanName, chosenColor);
          break;

        default:
          throw new Error(`Extensão '.${ext}' não suportada. Formatos aceitos: .kml, .kmz, .zip (shapefile), .dxf, .geojson`);
      }

      if (this.sidebarUI && typeof this.sidebarUI.renderLayerTree === 'function') {
        this.sidebarUI.renderLayerTree();
      }

      Notification.success(`✓ '${cleanName}' importado com sucesso! (${result.featureCount} feições, formato: ${result.formatType})`);
    } catch (err) {
      console.error('[LayerImporter] Erro na importação:', err);
      Notification.error(`Falha ao importar '${fileName}': ${err.message}`);
    }
  }

  /**
   * Importador de GeoJSON padronizado
   */
  async parseGeoJsonFile(file, cleanName, color) {
    const text = await file.text();
    const jsonData = JSON.parse(text);

    if (!jsonData || (!jsonData.type && !jsonData.features)) {
      throw new Error('Formato GeoJSON inválido ou corrompido.');
    }

    return this.layerManager.addCustomGeoJsonLayer(cleanName, jsonData, color, 'GeoJSON');
  }

  /**
   * Importador de KML do Google Earth
   */
  async parseKmlFile(file, cleanName, color) {
    const text = await file.text();
    const kmlFormat = new ol.format.KML({
      extractStyles: true,
      extractAttributes: true
    });

    const features = kmlFormat.readFeatures(text, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });

    if (!features || features.length === 0) {
      throw new Error('Nenhuma feição geográfica encontrada no arquivo KML.');
    }

    return this.layerManager.addCustomFeaturesLayer(cleanName, features, { color, formatType: 'Google Earth (KML)' });
  }

  /**
   * Importador de KMZ (pacote compactado do Google Earth)
   */
  async parseKmzFile(file, cleanName, color) {
    if (typeof window.JSZip === 'undefined') {
      throw new Error('Biblioteca JSZip não carregada para processar arquivo KMZ.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const zip = await window.JSZip.loadAsync(arrayBuffer);

    let kmlContent = null;
    let kmlFileName = '';

    for (const filename of Object.keys(zip.files)) {
      if (filename.toLowerCase().endsWith('.kml') && !filename.startsWith('__MACOSX')) {
        kmlContent = await zip.files[filename].async('string');
        kmlFileName = filename;
        break;
      }
    }

    if (!kmlContent) {
      throw new Error('Nenhum arquivo KML encontrado dentro do pacote KMZ.');
    }

    const kmlFormat = new ol.format.KML({
      extractStyles: true,
      extractAttributes: true
    });

    const features = kmlFormat.readFeatures(kmlContent, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    });

    if (!features || features.length === 0) {
      throw new Error('Nenhuma feição geográfica encontrada no KML extraído do KMZ.');
    }

    return this.layerManager.addCustomFeaturesLayer(cleanName, features, { color, formatType: 'Google Earth (KMZ)' });
  }

  /**
   * Importador de Shapefiles compactados em ZIP (shpjs)
   */
  async parseShapefileZip(file, cleanName, color) {
    if (typeof window.shp === 'undefined') {
      throw new Error('Biblioteca Shapefile.js (shpjs) não disponível.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const geojson = await window.shp(arrayBuffer);

    const collections = Array.isArray(geojson) ? geojson : [geojson];
    let totalCount = 0;
    let lastResult = null;

    for (const coll of collections) {
      if (!coll || !coll.features || coll.features.length === 0) continue;
      const layerTitle = (collections.length > 1 && coll.fileName) ? `${cleanName} (${coll.fileName})` : cleanName;

      const features = new ol.format.GeoJSON().readFeatures(coll, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });

      if (features.length > 0) {
        lastResult = this.layerManager.addCustomFeaturesLayer(layerTitle, features, { color, formatType: 'Shapefile (SHP)' });
        totalCount += features.length;
      }
    }

    if (totalCount === 0 || !lastResult) {
      throw new Error('Nenhuma feição geográfica válida encontrada no arquivo ZIP (Shapefile).');
    }

    return { ...lastResult, featureCount: totalCount };
  }

  /**
   * Importador de AutoCAD DXF (.dxf)
   */
  async parseDxfFile(file, cleanName, color) {
    if (typeof window.DxfParser === 'undefined') {
      throw new Error('Biblioteca de leitura DXF (dxf-parser) não disponível.');
    }

    const text = await file.text();
    const parser = new window.DxfParser();
    const dxf = parser.parseSync(text);

    if (!dxf || !dxf.entities || dxf.entities.length === 0) {
      throw new Error('Nenhuma entidade gráfica encontrada no arquivo DXF.');
    }

    // Identificar limites numéricos para auto-detecção de sistema de coordenadas (UTM vs WGS84 vs Local)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    dxf.entities.forEach(ent => {
      if (ent.vertices) {
        ent.vertices.forEach(v => {
          if (v.x != null && v.y != null) {
            minX = Math.min(minX, v.x);
            maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y);
            maxY = Math.max(maxY, v.y);
          }
        });
      } else if (ent.position) {
        minX = Math.min(minX, ent.position.x);
        maxX = Math.max(maxX, ent.position.x);
        minY = Math.min(minY, ent.position.y);
        maxY = Math.max(maxY, ent.position.y);
      }
    });

    // Passo Fundo / RS: UTM Zona 22S (SIRGAS 2000 / EPSG:31982)
    // Coordenadas métricas típicas de Passo Fundo: X ~ 350.000 a 380.000; Y ~ 6.860.000 a 6.885.000
    const isUtm22s = (minX >= 100000 && maxX <= 900000 && minY >= 6000000 && maxY <= 8000000);
    const isWgs84 = (minX >= -180 && maxX <= 180 && minY >= -90 && maxY <= 90);

    if (!isUtm22s && !isWgs84) {
      Notification.warning('Atenção: O arquivo DXF parece estar em coordenadas locais de CAD. Para sobreposição precisa em Passo Fundo, recomenda-se exportar o CAD em coordenadas UTM SIRGAS 2000.');
    }

    const transformCoord = (x, y) => {
      if (isUtm22s) {
        return ol.proj.transform([x, y], 'EPSG:31982', 'EPSG:3857');
      } else if (isWgs84) {
        return ol.proj.transform([x, y], 'EPSG:4326', 'EPSG:3857');
      }
      if (x > 100000 && y > 1000000) {
        return ol.proj.transform([x, y], 'EPSG:31982', 'EPSG:3857');
      }
      return [x, y];
    };

    const features = [];

    dxf.entities.forEach(ent => {
      let geom = null;
      const props = {
        tipo_entidade: ent.type,
        layer_cad: ent.layer || '0',
        handle_cad: ent.handle || ''
      };

      if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
        if (ent.vertices && ent.vertices.length >= 2) {
          const coords = ent.vertices.map(v => transformCoord(v.x, v.y));
          const isClosed = ent.shape === true || 
            (coords.length > 2 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1]);

          if (isClosed && coords.length >= 3) {
            if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
              coords.push([...coords[0]]);
            }
            geom = new ol.geom.Polygon([coords]);
          } else {
            geom = new ol.geom.LineString(coords);
          }
        }
      } else if (ent.type === 'LINE') {
        if (ent.vertices && ent.vertices.length === 2) {
          const p1 = transformCoord(ent.vertices[0].x, ent.vertices[0].y);
          const p2 = transformCoord(ent.vertices[1].x, ent.vertices[1].y);
          geom = new ol.geom.LineString([p1, p2]);
        }
      } else if (ent.type === 'POINT') {
        if (ent.position) {
          geom = new ol.geom.Point(transformCoord(ent.position.x, ent.position.y));
        }
      } else if (ent.type === 'CIRCLE') {
        if (ent.center && ent.radius) {
          const center = ent.center;
          const r = ent.radius;
          const circleCoords = [];
          for (let a = 0; a <= 360; a += 10) {
            const rad = (a * Math.PI) / 180;
            circleCoords.push(transformCoord(center.x + r * Math.cos(rad), center.y + r * Math.sin(rad)));
          }
          geom = new ol.geom.Polygon([circleCoords]);
        }
      }

      if (geom) {
        const feat = new ol.Feature({ geometry: geom, ...props });
        features.push(feat);
      }
    });

    if (features.length === 0) {
      throw new Error('Nenhuma entidade gráfica reconhecível (LWPOLYLINE, LINE, POINT, CIRCLE) encontrada no DXF.');
    }

    return this.layerManager.addCustomFeaturesLayer(cleanName, features, { color, formatType: 'AutoCAD (DXF)' });
  }
}
