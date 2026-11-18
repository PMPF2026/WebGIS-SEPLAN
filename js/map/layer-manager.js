/**

 * Portal Defesa Civil Passo Fundo - WebGIS Institucional

 * Advanced Vector Layer Manager, Symbology & Canvas Pattern Engine

 */



import { LAYERS_CONFIG, LAYER_GROUPS } from '../config/layers.config.js?v=20261118_escala2km_v1';

import { loadGeoJson } from '../utils/async-loader.js?v=20261117_prefeitura_v3';

import { EPSG_UTM22S, EPSG_WEBMERCATOR } from '../utils/projection.js';



export class LayerManager {

  constructor(mapEngine) {

    this.mapEngine = mapEngine;

    this.map = mapEngine.getOlMap();

    

    // Map of layerId -> ol.layer.Vector

    this.layers = new Map();

    // Map of layerId -> Config Object

    this.configs = new Map();

    // Custom user-imported layers

    this.customLayers = new Map();



    // Reusable canvas patterns

    this.hazardPattern = this.createHazardPattern();



    // GeoJSON format reader configured for EPSG:31982 to EPSG:3857

    this.geoJsonFormat = new ol.format.GeoJSON({

      dataProjection: EPSG_UTM22S,

      featureProjection: EPSG_WEBMERCATOR

    });



    // Listeners for layer load events

    this.loadCallbacks = [];

  }



  /**

   * Generates a diagonal hazard stripe pattern on an offscreen canvas

   */

  createHazardPattern() {

    const canvas = document.createElement('canvas');

    canvas.width = 16;

    canvas.height = 16;

    const ctx = canvas.getContext('2d');

    

    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';

    ctx.fillRect(0, 0, 16, 16);



    ctx.strokeStyle = 'rgba(185, 28, 28, 0.7)';

    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.moveTo(0, 16);

    ctx.lineTo(16, 0);

    ctx.moveTo(-4, 4);

    ctx.lineTo(4, -4);

    ctx.moveTo(12, 20);

    ctx.lineTo(20, 12);

    ctx.stroke();



    return ctx.createPattern(canvas, 'repeat');

  }



  /**

   * Register a callback when a layer finishes loading

   */

  onLayerLoaded(cb) {

    this.loadCallbacks.push(cb);

  }



  /**

   * Initialize all registered thematic layers

   */

  async initLayers() {

    console.log('[LayerManager] Registrando camadas temáticas institucionais...');



    for (const config of LAYERS_CONFIG) {

      this.configs.set(config.id, config);



      // Tratamento para camadas Raster / Ortofotos (Web XYZ Tiles)

      if (config.isXYZTiles || config.tileUrl) {

        const xyzSource = new ol.source.XYZ({

          url: config.tileUrl,

          minZoom: config.minZoom || 13,

          maxZoom: config.maxZoom || 19,

          attributions: config.attribution || config.source,

          crossOrigin: 'anonymous',

          wrapX: false

        });



        if (config.validTiles && config.validTiles instanceof Set) {

          const originalTileUrlFn = xyzSource.getTileUrlFunction();

          xyzSource.setTileUrlFunction((tileCoord, pixelRatio, projection) => {

            const url = originalTileUrlFn(tileCoord, pixelRatio, projection);

            if (!url) return undefined;

            const match = url.match(/(\d+)\/(\d+)\/(\d+)\.webp$/);

            if (match) {

              const key = `${match[1]}/${match[2]}/${match[3]}`;

              return config.validTiles.has(key) ? url : undefined;

            }

            return url;

          });

        }



        const rasterLayer = new ol.layer.Tile({

          source: xyzSource,

          visible: config.defaultVisible,

          opacity: config.defaultOpacity || 1,

          zIndex: config.zIndex || 5 // Acima do mapa-base (0) e estritamente abaixo de todos os vetores (10-75)

        });



        rasterLayer.set('layerId', config.id);

        rasterLayer.set('layerConfig', config);

        rasterLayer.set('isThematicLayer', true);

        rasterLayer.set('isRaster', true);



        this.map.addLayer(rasterLayer);

        this.layers.set(config.id, rasterLayer);

        continue;

      }



      // Tratamento para Imagens Georreferenciadas Estáticas (ex: Densidade de Kernel)

      if (config.isImageStatic || config.imageUrl) {

        const imageExtent = config.extent3857 || (config.extent ? ol.proj.transformExtent(config.extent, config.crs || 'EPSG:31982', 'EPSG:3857') : null);

        const imageSource = new ol.source.ImageStatic({

          url: config.imageUrl || config.fileName,

          imageExtent: imageExtent,

          projection: 'EPSG:3857',

          attributions: config.attribution || config.source

        });



        const imageLayer = new ol.layer.Image({

          source: imageSource,

          visible: config.defaultVisible,

          opacity: config.defaultOpacity !== undefined ? config.defaultOpacity : 0.85,

          zIndex: config.zIndex || 5

        });



        imageLayer.set('layerId', config.id);

        imageLayer.set('layerConfig', config);

        imageLayer.set('isThematicLayer', true);

        imageLayer.set('isRaster', true);



        this.map.addLayer(imageLayer);

        this.layers.set(config.id, imageLayer);

        continue;

      }



      // Tratamento legado para GeoTIFFs individuais diretos

      if (config.isGeoTIFF) {

        let rasterLayer;

        try {

          if (ol.source && ol.source.GeoTIFF && ol.layer && ol.layer.WebGLTile) {

            const geotiffSource = new ol.source.GeoTIFF({

              sources: config.files.map(f => ({

                url: f,

                bands: [1, 2, 3]

              })),

              convertToRGB: true,

              normalize: false

            });



            rasterLayer = new ol.layer.WebGLTile({

              source: geotiffSource,

              visible: config.defaultVisible,

              opacity: config.defaultOpacity || 1,

              zIndex: config.zIndex || 5

            });

          }

        } catch (err) {

          console.warn('[LayerManager] WebGLTile GeoTIFF fallback:', err);

        }



        if (!rasterLayer) {

          rasterLayer = new ol.layer.Group({

            visible: config.defaultVisible,

            opacity: config.defaultOpacity || 1,

            zIndex: config.zIndex || 5

          });

        }



        rasterLayer.set('layerId', config.id);

        rasterLayer.set('layerConfig', config);

        rasterLayer.set('isThematicLayer', true);

        rasterLayer.set('isRaster', true);



        this.map.addLayer(rasterLayer);

        this.layers.set(config.id, rasterLayer);

        continue;

      }



      const vectorSource = new ol.source.Vector();

      const styleFunction = this.createLayerStyle(config);



      // Create Vector Layer with optimized rendering

      const vectorLayer = new ol.layer.Vector({

        source: vectorSource,

        visible: config.defaultVisible,

        opacity: config.defaultOpacity || 1,

        zIndex: config.zIndex || 10,

        style: styleFunction,

        declutter: config.declutter !== false,

        // High-performance image rendering mode for heavy layers

        renderMode: config.isLazy || config.id === 'malha_hidrica' ? 'image' : 'vector'

      });



      vectorLayer.set('layerId', config.id);

      vectorLayer.set('layerConfig', config);

      vectorLayer.set('isThematicLayer', true);



      this.map.addLayer(vectorLayer);

      this.layers.set(config.id, vectorLayer);



      // Eagerly load core layers (Território, Enchente 2024, Bairros, Distritos)

      if (config.defaultVisible && !config.isLazy) {

        this.loadLayerData(config.id).catch(err => {

          console.error(`[LayerManager] Falha ao carregar camada inicial ${config.id}:`, err);

        });

      }

    }

  }



  /**

   * Load GeoJSON data into layer vector source with automatic CRS reprojection

   */

  async loadLayerData(layerId, onProgress = null) {

    const config = this.configs.get(layerId);

    const layer = this.layers.get(layerId);

    if (!config || !layer) return;



    const source = layer.getSource();

    if (source.getFeatures().length > 0) {

      return layer; // Data already loaded in memory

    }



    try {

      console.log(`[LayerManager] Carregando '${config.name}' (${config.fileName})...`);

      

      const geoJsonData = await loadGeoJson(config.fileName, onProgress);

      

      // Auto-detecção resiliente de CRS: verifica config, cabeçalho GeoJSON ou magnitude das coordenadas (> 180 graus)

      let hasUtmCoords = false;

      if (geoJsonData.features && geoJsonData.features.length > 0 && geoJsonData.features[0].geometry && geoJsonData.features[0].geometry.coordinates) {

        let sample = geoJsonData.features[0].geometry.coordinates;

        while (Array.isArray(sample) && sample.length > 0 && Array.isArray(sample[0])) {

          sample = sample[0];

        }

        if (Array.isArray(sample) && sample.length >= 2 && (Math.abs(sample[0]) > 180 || Math.abs(sample[1]) > 180)) {

          hasUtmCoords = true;

        }

      }



      const isUtm22s = (config.crs && config.crs.includes('31982')) || 

                       (geoJsonData.crs && geoJsonData.crs.properties && geoJsonData.crs.properties.name && geoJsonData.crs.properties.name.includes('31982')) ||

                       hasUtmCoords;

      const features = isUtm22s

        ? this.geoJsonFormat.readFeatures(geoJsonData)

        : new ol.format.GeoJSON().readFeatures(geoJsonData, {

            dataProjection: 'EPSG:4326',

            featureProjection: 'EPSG:3857'

          });



      // Tag features with layer metadata for popup/identification

      features.forEach(f => {

        f.set('_layerId', config.id);

        f.set('_layerName', config.name);

      });



      source.addFeatures(features);

      console.log(`[LayerManager] ✓ '${config.name}' carregada com ${features.length} feições.`);



      // Dispatch callbacks

      this.loadCallbacks.forEach(cb => cb(config.id, features.length, config, features));

      return layer;

    } catch (error) {

      console.error(`[LayerManager] ✗ Erro ao carregar camada '${config.name}':`, error);

      throw error;

    }

  }



  /**

   * Toggle visibility of a thematic layer

   */

  async setLayerVisibility(layerId, visible) {

    const layer = this.layers.get(layerId);

    if (!layer) return;



    const config = this.configs.get(layerId);

    if (visible && config && !config.isRaster) {

      await this.loadLayerData(layerId);

    }

    layer.setVisible(visible);



    window.dispatchEvent(new CustomEvent('layer:visibility-changed', {

      detail: { layerId, visible }

    }));

  }



  /**

   * Set opacity of a thematic layer (0.0 to 1.0)

   */

  setLayerOpacity(layerId, opacity) {

    const layer = this.layers.get(layerId);

    if (layer) {

      layer.setOpacity(Math.max(0, Math.min(1, opacity)));

    }

  }



  /**

   * Apply an operational scenario / preset

   */

  async applyPreset(preset) {

    console.log(`[LayerManager] Aplicando cenário: ${preset.name}`);

    for (const config of LAYERS_CONFIG) {

      const shouldBeVisible = preset.activeLayers.includes(config.id);

      const cb = document.querySelector(`.layer-checkbox[data-layer-id="${config.id}"]`);

      if (cb) cb.checked = shouldBeVisible;

      await this.setLayerVisibility(config.id, shouldBeVisible);

    }

  }



  /**

   * Zoom map to extent of a specific layer

   */

  async zoomToLayer(layerId) {

    const layer = this.layers.get(layerId);

    const config = this.configs.get(layerId);

    if (!layer || !config) return;



    if (config.isRaster && (config.extent3857 || config.extent)) {

      const extent3857 = config.extent3857 || ol.proj.transformExtent(config.extent, config.crs || 'EPSG:31982', 'EPSG:3857');

      this.mapEngine.zoomTo(extent3857);

      return;

    }



    await this.loadLayerData(layerId);

    const source = layer.getSource();

    if (source && source.getExtent) {

      const extent = source.getExtent();

      if (extent && !ol.extent.isEmpty(extent)) {

        this.mapEngine.zoomTo(extent);

      }

    }

  }



  /**

   * Create advanced cartographic styling for a layer

   */

  createLayerStyle(config) {

    const s = config.style || {};



    // 1. Defesa Civil: Áreas de Enchente com padrão de hachura diagonal de perigo

    if (config.id === 'areas_enchente_2024') {

      return new ol.style.Style({

        fill: new ol.style.Fill({

          color: this.hazardPattern || 'rgba(239, 68, 68, 0.45)'

        }),

        stroke: new ol.style.Stroke({

          color: '#dc2626',

          width: 2.4

        })

      });

    }

    // 1.1. Áreas de Risco Hidrológico / Atenção Hidrológica (Opção 1: Âmbar Translúcido de Alerta)
    if (config.id === 'areas_risco_hidrologico') {
      return new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(245, 158, 11, 0.28)'
        }),
        stroke: new ol.style.Stroke({
          color: '#d97706',
          width: 1.8,
          lineCap: 'round',
          lineJoin: 'round'
        })
      });
    }

    // 2. Hidrografia: Espessura hierárquica calibrada e não invasiva

    if (config.id === 'malha_hidrica') {

      return (feature) => {

        const ordem = parseInt(feature.get('ordem'), 10) || 1;

        const width = ordem >= 4 ? 1.3 : (ordem === 3 ? 0.95 : (ordem === 2 ? 0.7 : 0.5));

        const color = ordem >= 4 ? '#0284c7' : (ordem === 3 ? '#0ea5e9' : (ordem === 2 ? '#38bdf8' : '#7dd3fc'));



        return new ol.style.Style({

          stroke: new ol.style.Stroke({

            color: color,

            width: width

          })

        });

      };

    }



    // 3. Rodovias (Federal / Estadual): Dual Casing Style com Rótulos Padronizados (Shield / Eixo)
    if (config.isHighway) {
      const isFederal = config.highwayType === 'BR';
      const mainColor = isFederal ? '#dc2626' : '#ea580c';
      const casingColor = '#ffffff';
      const mainWidth = isFederal ? 1.8 : 1.4;
      const casingWidth = isFederal ? 2.8 : 2.2;

      return (feature, resolution) => {
        const styles = [
          // Linha externa (casing branco de contraste sutil)
          new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: casingColor,
              width: casingWidth
            })
          }),
          // Linha interna principal
          new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: mainColor,
              width: mainWidth
            })
          })
        ];

        // Identificação nominal padronizada das rodovias (placement: 'line')
        let label = feature.get('nome') || '';
        const cod = feature.get('codTrechoR') || '';
        if (!label) {
          if (cod.includes('285')) label = 'BR-285';
          else if (cod.includes('153BRS') || cod.includes('BRS153')) label = 'BR-153';
          else if (cod.includes('324')) label = 'ERS-324';
          else if (cod.includes('135')) label = 'ERS-135';
          else if (cod.includes('153RSC') || cod.includes('RSC153')) label = 'RSC-153';
        }
        label = label.replace('BRS-', 'BR-');

        // Exibir código da rodovia em escala municipal e aproximação (resolution < 75)
        if (label && resolution < 75) {
          const repeatDist = resolution < 18 ? 600 : 1200;
          styles.push(new ol.style.Style({
            text: new ol.style.Text({
              text: label,
              font: '600 8px "Inter", sans-serif',
              placement: 'line',
              repeat: repeatDist,
              maxAngle: Math.PI / 4,
              keepUpright: true,
              fill: new ol.style.Fill({ color: '#ffffff' }),
              stroke: new ol.style.Stroke({
                color: isFederal ? '#991b1b' : '#c2410c',
                width: 2.2
              }),
              backgroundFill: new ol.style.Fill({
                color: isFederal ? 'rgba(185, 28, 28, 0.90)' : 'rgba(194, 65, 12, 0.90)'
              }),
              backgroundStroke: new ol.style.Stroke({
                color: '#ffffff',
                width: 0.6
              }),
              padding: [1, 3.5, 1, 3.5]
            })
          }));
        }

        return styles;
      };
    }




        // 3.1. Distritos Municipais: Prefeitura Municipal (Ícone Cívico) e Distritos do Interior (Map Pin #DC2626)
    if (config.id === 'distritos') {
      const svgPrefeitura = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
          <!-- Círculo base azul cívico com contorno branco -->
          <circle cx="16" cy="16" r="14.5" fill="#0284c7" stroke="#ffffff" stroke-width="2.2"/>
          <!-- Frontão triangular clássico -->
          <polygon points="16,6.5 7,12.5 25,12.5" fill="#ffffff"/>
          <circle cx="16" cy="10" r="1.1" fill="#0284c7"/>
          <!-- Arquitrave / Viga horizontal -->
          <rect x="7.5" y="12.8" width="17" height="1.5" rx="0.5" fill="#ffffff"/>
          <!-- 4 Colunas cívicas -->
          <rect x="8.5" y="14.8" width="2.2" height="6.4" rx="0.4" fill="#ffffff"/>
          <rect x="12.5" y="14.8" width="2.2" height="6.4" rx="0.4" fill="#ffffff"/>
          <rect x="17.3" y="14.8" width="2.2" height="6.4" rx="0.4" fill="#ffffff"/>
          <rect x="21.3" y="14.8" width="2.2" height="6.4" rx="0.4" fill="#ffffff"/>
          <!-- Estilóbato / Degraus de entrada -->
          <rect x="7.5" y="21.5" width="17" height="1.4" rx="0.4" fill="#ffffff"/>
          <rect x="6.5" y="23.2" width="19" height="1.6" rx="0.4" fill="#ffffff"/>
        </svg>
      `);

      const svgMapPin = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32">
          <!-- Sombra vetorial sólida na base -->
          <ellipse cx="12" cy="30.5" rx="5" ry="1.5" fill="rgba(0,0,0,0.35)"/>
          <!-- Corpo do pino vermelho (#DC2626) com contorno branco e ponta inferior exata em (12, 30) -->
          <path d="M12 2 C7 2 3 6.2 3 11.5 C3 18.5 12 30 12 30 C12 30 21 18.5 21 11.5 C21 6.2 17 2 12 2 Z" 
                fill="#dc2626" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
          <!-- Detalhe interno branco com núcleo vermelho -->
          <circle cx="12" cy="11.5" r="4.0" fill="#ffffff"/>
          <circle cx="12" cy="11.5" r="2.0" fill="#991b1b"/>
        </svg>
      `);

      return (feature, resolution) => {
        const rawName = feature.get('nome') || feature.get('Nome') || '';
        const name = rawName.trim();
        if (!name) return null;

        const isSede = name === 'Passo Fundo';

        if (isSede) {
          return new ol.style.Style({
            image: new ol.style.Icon({
              src: svgPrefeitura,
              anchor: [0.5, 0.5],
              anchorXUnits: 'fraction',
              anchorYUnits: 'fraction',
              scale: 0.68,
              imgSize: [32, 32]
            }),
            text: new ol.style.Text({
              text: 'Prefeitura Municipal de Passo Fundo',
              offsetY: -16,
              font: 'bold 8.5px "Inter", sans-serif',
              fill: new ol.style.Fill({ color: '#ffffff' }),
              stroke: new ol.style.Stroke({ color: '#0f172a', width: 2.2 }),
              backgroundFill: new ol.style.Fill({ color: 'rgba(15, 23, 42, 0.88)' }),
              backgroundStroke: new ol.style.Stroke({ color: 'rgba(255, 255, 255, 0.4)', width: 0.6 }),
              padding: [1.2, 4.5, 1.2, 4.5]
            })
          });
        }

        return new ol.style.Style({
          image: new ol.style.Icon({
            src: svgMapPin,
            anchor: [0.5, 1.0],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            scale: 0.62,
            imgSize: [24, 32]
          }),
          text: new ol.style.Text({
            text: name,
            offsetY: -22,
            font: '600 8px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#ffffff' }),
            stroke: new ol.style.Stroke({ color: '#0f172a', width: 2.2 }),
            backgroundFill: new ol.style.Fill({ color: 'rgba(15, 23, 42, 0.85)' }),
            backgroundStroke: new ol.style.Stroke({ color: 'rgba(255, 255, 255, 0.4)', width: 0.6 }),
            padding: [1, 3.8, 1, 3.8]
          })
        });
      };
    }

    // 3.2. Aeroporto Lauro Kurtz & Aeroclube: Ícone Aeronáutico com Etiqueta Compacta Padronizada
    if (config.id === 'aeroporto_aeroclube') {
      const svgAirport = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
          <circle cx="18" cy="18" r="16" fill="#0284c7" stroke="#ffffff" stroke-width="2.2"/>
          <path d="M18 7 L18 19 L28 24 L28 26 L18 22 L18 27 L21 29 L21 30.5 L18 29.5 L15 30.5 L15 29 L18 27 L18 22 L8 26 L8 24 L18 19 Z" fill="#ffffff"/>
        </svg>
      `);

      return (feature, resolution) => {
        const rawName = String(feature.get('NOME') || feature.get('nome') || '');
        const isAeroporto = rawName.toUpperCase().includes('AEROPORTO');
        const cleanName = isAeroporto ? 'Aeroporto Lauro Kurtz' : 'Aeroclube Passo Fundo';

        return new ol.style.Style({
          image: new ol.style.Icon({
            src: svgAirport,
            anchor: [0.5, 0.5],
            scale: 0.48
          }),
          text: new ol.style.Text({
            text: cleanName,
            offsetY: -12,
            font: '600 7.8px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#ffffff' }),
            stroke: new ol.style.Stroke({ color: '#0369a1', width: 2.0 }),
            backgroundFill: new ol.style.Fill({ color: 'rgba(15, 23, 42, 0.85)' }),
            backgroundStroke: new ol.style.Stroke({ color: 'rgba(56, 189, 248, 0.6)', width: 0.6 }),
            padding: [1, 3.5, 1, 3.5]
          })
        });
      };
    }

    // 3.2.1. Patrimônio Histórico e Cultural: Símbolo Monumental (#881337 com borda ouro #f59e0b)
    if (config.id === 'patrimonio_historico') {
      const svgDefinitivo = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
          <!-- Círculo base bordô nobre com contorno duplo ouro -->
          <circle cx="16" cy="16" r="14.5" fill="#881337" stroke="#f59e0b" stroke-width="2.2"/>
          <circle cx="16" cy="16" r="12" fill="none" stroke="#ffffff" stroke-width="0.8" stroke-dasharray="2,2"/>
          <!-- Frontão triangular de monumento clássico -->
          <polygon points="16,6.8 8,12 24,12" fill="#ffffff"/>
          <!-- Arquitrave -->
          <rect x="8.5" y="12.4" width="15" height="1.4" rx="0.4" fill="#f59e0b"/>
          <!-- 3 Colunas jônicas clássicas -->
          <rect x="9.8" y="14.2" width="2.2" height="6.8" rx="0.3" fill="#ffffff"/>
          <rect x="14.9" y="14.2" width="2.2" height="6.8" rx="0.3" fill="#ffffff"/>
          <rect x="20" y="14.2" width="2.2" height="6.8" rx="0.3" fill="#ffffff"/>
          <!-- Degraus / Base -->
          <rect x="8.5" y="21.4" width="15" height="1.4" rx="0.3" fill="#f59e0b"/>
          <rect x="7.5" y="23" width="17" height="1.6" rx="0.4" fill="#ffffff"/>
        </svg>
      `);

      const svgProvisorio = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
          <!-- Círculo base bordô com contorno ciano/azul para tombamento provisório -->
          <circle cx="16" cy="16" r="14.5" fill="#881337" stroke="#38bdf8" stroke-width="2.2"/>
          <circle cx="16" cy="16" r="12" fill="none" stroke="#ffffff" stroke-width="0.8" stroke-dasharray="2,2"/>
          <!-- Frontão -->
          <polygon points="16,6.8 8,12 24,12" fill="#ffffff"/>
          <!-- Arquitrave -->
          <rect x="8.5" y="12.4" width="15" height="1.4" rx="0.4" fill="#38bdf8"/>
          <!-- 3 Colunas -->
          <rect x="9.8" y="14.2" width="2.2" height="6.8" rx="0.3" fill="#ffffff"/>
          <rect x="14.9" y="14.2" width="2.2" height="6.8" rx="0.3" fill="#ffffff"/>
          <rect x="20" y="14.2" width="2.2" height="6.8" rx="0.3" fill="#ffffff"/>
          <!-- Base -->
          <rect x="8.5" y="21.4" width="15" height="1.4" rx="0.3" fill="#38bdf8"/>
          <rect x="7.5" y="23" width="17" height="1.6" rx="0.4" fill="#ffffff"/>
        </svg>
      `);

      return (feature, resolution) => {
        const tipo = feature.get('tipo_tombamento') || '';
        const isDef = tipo.toLowerCase().includes('definitivo');
        const iconSrc = isDef ? svgDefinitivo : svgProvisorio;
        const nome = feature.get('nome') || '';

        const style = new ol.style.Style({
          image: new ol.style.Icon({
            src: iconSrc,
            anchor: [0.5, 0.5],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            scale: 0.68,
            imgSize: [32, 32]
          })
        });

        // Toponímia elegante no zoom aproximado (resolução <= 4.8 / zoom >= 15)
        if (resolution <= 4.8 && nome) {
          style.setText(new ol.style.Text({
            text: nome,
            offsetY: 16,
            font: '600 8.5px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#ffffff' }),
            stroke: new ol.style.Stroke({ color: '#0f172a', width: 2.4 }),
            backgroundFill: new ol.style.Fill({ color: 'rgba(15, 23, 42, 0.88)' }),
            backgroundStroke: new ol.style.Stroke({ color: isDef ? 'rgba(245, 158, 11, 0.65)' : 'rgba(56, 189, 248, 0.65)', width: 0.8 }),
            padding: [1.2, 4.5, 1.2, 4.5]
          }));
        }

        return style;
      };
    }

    // 3.2.2. Hospitais: Marcador Circular #e11d48 com Letra H Branca em Destaque (Calibrado para Escala 2km)
    if (config.id === 'hospitais') {
      const svgHospital = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
          <circle cx="16" cy="16" r="14.5" fill="#e11d48" stroke="#ffffff" stroke-width="2.2"/>
          <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>
          <path d="M10.5 8.5 L13.5 8.5 L13.5 14 L18.5 14 L18.5 8.5 L21.5 8.5 L21.5 23.5 L18.5 23.5 L18.5 16.8 L13.5 16.8 L13.5 23.5 L10.5 23.5 Z" fill="#ffffff"/>
        </svg>
      `);

      return (feature, resolution) => {
        const nome = feature.get('nome') || '';
        const is2kmOuAproximada = resolution <= 28;
        const iconScale = is2kmOuAproximada ? 0.85 : 0.65;

        const style = new ol.style.Style({
          image: new ol.style.Icon({
            src: svgHospital,
            anchor: [0.5, 0.5],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            scale: iconScale,
            imgSize: [32, 32]
          })
        });

        // Toponímia elegante visível a partir da escala de 2km (resolução <= 28)
        if (is2kmOuAproximada && nome) {
          style.setText(new ol.style.Text({
            text: nome,
            offsetY: 18,
            font: 'bold 9px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#ffffff' }),
            stroke: new ol.style.Stroke({ color: '#881337', width: 2.6 }),
            backgroundFill: new ol.style.Fill({ color: 'rgba(15, 23, 42, 0.90)' }),
            backgroundStroke: new ol.style.Stroke({ color: 'rgba(225, 29, 72, 0.75)', width: 1.0 }),
            padding: [2, 5, 2, 5]
          }));
        }

        return style;
      };
    }

    // 3.2.3. Centros de Atenção Integral à Saúde (CAIS): Símbolo Heart-Pulse #0891b2 (Calibrado para Escala 2km)
    if (config.id === 'cais') {
      const svgCais = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
          <circle cx="16" cy="16" r="14.5" fill="#0891b2" stroke="#ffffff" stroke-width="2.2"/>
          <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>
          <path d="M6.5 16.5 L11 16.5 L13.2 11 L16 22 L18.8 13.5 L21 16.5 L25.5 16.5" 
                fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `);

      return (feature, resolution) => {
        const nome = feature.get('nome') || '';
        const is2kmOuAproximada = resolution <= 28;
        const iconScale = is2kmOuAproximada ? 0.78 : 0.62;

        const style = new ol.style.Style({
          image: new ol.style.Icon({
            src: svgCais,
            anchor: [0.5, 0.5],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            scale: iconScale,
            imgSize: [32, 32]
          })
        });

        if (is2kmOuAproximada && nome) {
          style.setText(new ol.style.Text({
            text: nome,
            offsetY: 18,
            font: 'bold 9px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#ffffff' }),
            stroke: new ol.style.Stroke({ color: '#0e7490', width: 2.6 }),
            backgroundFill: new ol.style.Fill({ color: 'rgba(15, 23, 42, 0.90)' }),
            backgroundStroke: new ol.style.Stroke({ color: 'rgba(8, 145, 178, 0.75)', width: 1.0 }),
            padding: [2, 5, 2, 5]
          }));
        }

        return style;
      };
    }

    // 3.2.4. Unidades Básicas de Saúde (UBS / ESF): Cruz Médica Clássica #059669 (Calibrado para Escala 2km)
    if (config.id === 'ubs_esf') {
      const svgUbs = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
          <circle cx="16" cy="16" r="14.5" fill="#059669" stroke="#ffffff" stroke-width="2.2"/>
          <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>
          <path d="M13.5 7.5 L18.5 7.5 L18.5 13.5 L24.5 13.5 L24.5 18.5 L18.5 18.5 L18.5 24.5 L13.5 24.5 L13.5 18.5 L7.5 18.5 L7.5 13.5 L13.5 13.5 Z" fill="#ffffff"/>
        </svg>
      `);

      return (feature, resolution) => {
        const nome = feature.get('nome') || '';
        const is2kmOuIntermediaria = resolution <= 28 && resolution >= 7;
        const isAproximada = resolution < 7;
        const showLabel = nome && (is2kmOuIntermediaria || isAproximada);
        const iconScale = resolution > 28 ? 0.45 : (resolution < 7 ? 0.70 : 0.62);

        const style = new ol.style.Style({
          image: new ol.style.Icon({
            src: svgUbs,
            anchor: [0.5, 0.5],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            scale: iconScale,
            imgSize: [32, 32]
          })
        });

        if (showLabel) {
          style.setText(new ol.style.Text({
            text: nome,
            offsetY: isAproximada ? -10 : -8,
            font: isAproximada ? '600 9.5px "Inter", sans-serif' : '600 8.5px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#ecfdf5' }),
            stroke: new ol.style.Stroke({ color: '#064e3b', width: 2.6 })
          }));
        }

        return style;
      };
    }

    // 3.3. Escolas de Educação Infantil (EMEIs): Marcador Progressivo Calibrado para Escala 2km
    if (config.id === 'escolas_infantil_emei') {
      return (feature, resolution) => {
        const rawName = feature.get('Escola') || feature.get('nome') || '';
        const name = rawName.trim();

        // Controle calibrado de escala:
        // - Visão Panorâmica Afastada (res > 28 / zoom <= 12): Ponto discreto (raio 2.4) para desobstruir a visão municipal geral
        // - Escala de 2km e Intermediária (res <= 28 e res >= 7 / zoom 12.5-15): Círculo nítido (raio 3.8) e nome com halo de contraste
        // - Escala Aproximada de Bairro/Rua (res < 7 / zoom 16+): Círculo expandido (raio 4.8) e nome com prefixo EMEI
        const is2kmOuIntermediaria = resolution <= 28 && resolution >= 7;
        const isAproximada = resolution < 7;
        const showLabel = name && (is2kmOuIntermediaria || isAproximada);
        const labelText = isAproximada ? `EMEI ${name}` : name;
        const circleRadius = resolution > 28 ? 2.4 : (resolution < 7 ? 4.8 : 3.8);
        const strokeWidth = resolution > 28 ? 0.8 : (resolution < 7 ? 1.4 : 1.2);

        return new ol.style.Style({
          image: new ol.style.Circle({
            radius: circleRadius,
            fill: new ol.style.Fill({ color: '#ec4899' }),
            stroke: new ol.style.Stroke({ color: '#ffffff', width: strokeWidth })
          }),
          text: showLabel ? new ol.style.Text({
            text: labelText,
            offsetY: isAproximada ? -10 : -8,
            font: isAproximada ? '600 9.5px "Inter", sans-serif' : '600 8.5px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#fdf2f8' }),
            stroke: new ol.style.Stroke({ color: '#831843', width: 2.8 })
          }) : null
        });
      };
    }

    // 3.4. Escolas de Ensino Fundamental (EMEFs): Marcador Progressivo Calibrado para Escala 2km
    if (config.id === 'escolas_fundamental_emef') {
      return (feature, resolution) => {
        const rawName = feature.get('Escola') || feature.get('nome') || '';
        const name = rawName.trim();

        const is2kmOuIntermediaria = resolution <= 28 && resolution >= 7;
        const isAproximada = resolution < 7;
        const showLabel = name && (is2kmOuIntermediaria || isAproximada);
        const labelText = isAproximada ? `EMEF ${name}` : name;
        const circleRadius = resolution > 28 ? 2.4 : (resolution < 7 ? 4.8 : 3.8);
        const strokeWidth = resolution > 28 ? 0.8 : (resolution < 7 ? 1.4 : 1.2);

        return new ol.style.Style({
          image: new ol.style.Circle({
            radius: circleRadius,
            fill: new ol.style.Fill({ color: '#2563eb' }),
            stroke: new ol.style.Stroke({ color: '#ffffff', width: strokeWidth })
          }),
          text: showLabel ? new ol.style.Text({
            text: labelText,
            offsetY: isAproximada ? -10 : -8,
            font: isAproximada ? '600 9.5px "Inter", sans-serif' : '600 8.5px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#eff6ff' }),
            stroke: new ol.style.Stroke({ color: '#1e3a8a', width: 2.8 })
          }) : null
        });
      };
    }

    // 3.5. Reservatórios e Espelhos d'Água: Texto Direto sobre o Mapa com Halo Branco de Contraste
    if (config.id === 'reservatorio_miranda' || config.id === 'reservatorio_barragem') {
      return (feature, resolution) => {
        const nome = feature.get('nome') || '';
        const comp = feature.get('compartimento') || '';
        
        // No Reservatório da Barragem, exibir o rótulo principal na bacia sul e evitar duplicidade
        let displayLabel = nome;
        if (config.id === 'reservatorio_barragem' && comp.includes('Norte')) {
          displayLabel = resolution < 16 ? 'Bacia Norte' : '';
        }

        const showLabel = displayLabel && resolution < 28;

        return new ol.style.Style({
          fill: new ol.style.Fill({
            color: 'rgba(56, 189, 248, 0.32)'
          }),
          stroke: new ol.style.Stroke({
            color: '#0284c7',
            width: 1.2
          }),
          text: showLabel ? new ol.style.Text({
            text: displayLabel,
            font: 'italic 600 8.5px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#0369a1' }),
            stroke: new ol.style.Stroke({ color: '#ffffff', width: 2.4 }),
            overflow: false
          }) : null
        });
      };
    }

    // 3.6. Cursos Hídricos Principais: Toponímia Hidrográfica Distribuída e Equilibrada
    if (config.id === 'rio_passo_fundo' || config.id === 'arroio_miranda' || config.id === 'arroio_santo_antonio') {
      const isRioPrincipal = config.id === 'rio_passo_fundo';
      const isMiranda = config.id === 'arroio_miranda';
      const strokeColor = config.style?.strokeColor || '#0284c7';
      const strokeWidth = config.style?.strokeWidth || (isRioPrincipal ? 2.6 : 2.0);

      // Toponímia oficial de cada curso
      const labelText = isRioPrincipal 
        ? 'Rio Passo Fundo' 
        : (isMiranda ? 'Arroio Miranda' : 'Arroio Santo Antônio');

      // Frações para visão detalhada (zoom >= 14 / resolution < 25)
      const detailFractions = isRioPrincipal 
        ? [0.10, 0.30, 0.50, 0.70, 0.90]
        : (isMiranda ? [0.15, 0.40, 0.65, 0.90] : [0.20, 0.50, 0.80]);

      // Frações espaçadas para visão geral inicial (resolution >= 25) para não poluir
      const overviewFractions = isRioPrincipal
        ? [0.35, 0.72]
        : (isMiranda ? [0.45, 0.82] : [0.50]);

      function extractPoints(geom, fractions) {
        const points = [];
        if (!geom) return points;
        const geomType = geom.getType();
        let targetLine = null;
        if (geomType === 'LineString') {
          targetLine = geom;
        } else if (geomType === 'MultiLineString') {
          const lines = geom.getLineStrings();
          if (lines && lines.length > 0) {
            targetLine = lines.reduce((max, l) => l.getLength() > max.getLength() ? l : max, lines[0]);
          }
        }
        if (targetLine) {
          for (const frac of fractions) {
            let coord = null;
            if (typeof targetLine.getCoordinateAt === 'function') {
              coord = targetLine.getCoordinateAt(frac);
            } else {
              const coords = targetLine.getCoordinates();
              if (coords && coords.length > 0) {
                const idx = Math.min(coords.length - 1, Math.max(0, Math.floor(coords.length * frac)));
                coord = coords[idx];
              }
            }
            if (coord) {
              points.push(new ol.geom.Point(coord));
            }
          }
        }
        return points;
      }

      return (feature, resolution) => {
        const styles = [
          new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: strokeColor,
              width: strokeWidth,
              lineCap: 'round',
              lineJoin: 'round'
            })
          })
        ];

        // Exibir toponímia em escala municipal e aproximação (resolution < 75)
        if (resolution < 75) {
          const isDetailZoom = resolution < 25;
          const currentFontSize = isRioPrincipal 
            ? (isDetailZoom ? '8.2px' : '6.8px') 
            : (isDetailZoom ? '7.2px' : '6.2px');
          const currentHalo = isRioPrincipal 
            ? (isDetailZoom ? 1.8 : 1.3) 
            : (isDetailZoom ? 1.6 : 1.2);
          const currentOffsetY = isDetailZoom ? -5 : -4;

          const cacheKey = isDetailZoom ? '_cachedDetailGeoms' : '_cachedOverviewGeoms';
          let labelPoints = feature.get(cacheKey);
          if (!labelPoints) {
            const fractions = isDetailZoom ? detailFractions : overviewFractions;
            labelPoints = extractPoints(feature.getGeometry(), fractions);
            feature.set(cacheKey, labelPoints);
          }

          for (const pt of labelPoints) {
            styles.push(new ol.style.Style({
              geometry: pt,
              text: new ol.style.Text({
                text: labelText,
                offsetY: currentOffsetY,
                font: `italic 600 ${currentFontSize} "Inter", sans-serif`,
                fill: new ol.style.Fill({ color: '#0369a1' }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: currentHalo }),
                overflow: true
              })
            }));
          }
        }

        return styles;
      };
    }

    // 4. Ferrovia (Linha Férrea com dormentes)

    if (config.isRailway) {

      return [

        new ol.style.Style({

          stroke: new ol.style.Stroke({ color: '#1e293b', width: 2.0 })

        }),

        new ol.style.Style({

          stroke: new ol.style.Stroke({ color: '#ffffff', width: 1.0, lineDash: [5, 5] })

        })

      ];

    }



    // 4.5. Sede da Defesa Civil: Ícone institucional emblemático da Defesa Civil

    if (config.id === 'sede_defesa_civil') {

      const svgSedeDefesaCivil = 'data:image/svg+xml;utf8,' + encodeURIComponent(`

        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="44" height="44">

          <!-- Círculo externo laranja oficial com sombra e borda branca -->

          <circle cx="22" cy="22" r="19" fill="#ff7800" stroke="#ffffff" stroke-width="2.6"/>

          <circle cx="22" cy="22" r="15.5" fill="#0f172a" stroke="#ffedd5" stroke-width="1.2"/>

          <!-- Triângulo institucional da Defesa Civil -->

          <polygon points="22,9 33,29 11,29" fill="#ff7800" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/>

          <polygon points="22,12.5 30.5,27.5 13.5,27.5" fill="#1e3a8a"/>

          <!-- Família / Pessoas estilizadas no centro -->

          <circle cx="18" cy="18" r="1.8" fill="#ffffff"/>

          <path d="M16 26 L17.5 21 C17.5 20.2 18.5 20.2 18.5 21 L20 26 Z" fill="#ffffff"/>

          <circle cx="25" cy="18" r="1.8" fill="#ffffff"/>

          <path d="M23 26 L24.5 21 C24.5 20.2 25.5 20.2 25.5 21 L27 26 Z" fill="#ffffff"/>

          <circle cx="21.5" cy="22" r="1.2" fill="#ffffff"/>

          <path d="M20.5 26 L21.5 23.5 L22.5 26 Z" fill="#ffffff"/>

        </svg>

      `);



      return (feature, resolution) => {

        const showText = resolution < 60;

        const name = 'Sede Defesa Civil';



        return new ol.style.Style({

          image: new ol.style.Icon({

            src: svgSedeDefesaCivil,

            anchor: [0.5, 0.5],

            scale: 0.85

          }),

          text: showText ? new ol.style.Text({

            text: name,

            offsetY: 22,

            font: 'bold 11.5px "Inter", sans-serif',

            fill: new ol.style.Fill({ color: '#ffffff' }),

            stroke: new ol.style.Stroke({ color: '#c2410c', width: 3.2 }),

            backgroundFill: new ol.style.Fill({ color: 'rgba(194, 65, 12, 0.95)' }),

            padding: [3, 8, 3, 8]

          }) : null

        });

      };

    }



    // 5. Distritos e Pontos Especializados (Residências em APP e Abrigos da Defesa Civil)

    if (config.id === 'edificacoes_app') {

      return new ol.style.Style({

        image: new ol.style.Circle({

          radius: s.pointRadius || 5.5,

          fill: new ol.style.Fill({ color: s.pointColor || '#ea580c' }),

          stroke: new ol.style.Stroke({ color: s.strokeColor || '#ffffff', width: s.strokeWidth || 1.8 })

        })

      });

    }



    if (config.id === 'abrigos_defesa_civil') {

      return new ol.style.Style({

        image: new ol.style.Circle({

          radius: s.pointRadius || 7.0,

          fill: new ol.style.Fill({ color: s.pointColor || '#1d4ed8' }),

          stroke: new ol.style.Stroke({ color: s.strokeColor || '#ffffff', width: s.strokeWidth || 2.2 })

        })

      });

    }



    // Zonas de Pouso de Helicóptero (ZPH): Ícone de helicóptero vetorial de alta visibilidade

    if (config.id === 'zph_helicoptero') {

      const svgHelicopter = 'data:image/svg+xml;utf8,' + encodeURIComponent(`

        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 38" width="38" height="38">

          <circle cx="19" cy="19" r="17" fill="#0284c7" stroke="#ffffff" stroke-width="2.4"/>

          <!-- Rotor superior -->

          <line x1="7" y1="8" x2="31" y2="8" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>

          <line x1="19" y1="8" x2="19" y2="12" stroke="#ffffff" stroke-width="2.2"/>

          <!-- Fuselagem / Cabine -->

          <ellipse cx="17" cy="17.5" rx="7.5" ry="5.2" fill="#ffffff"/>

          <circle cx="14" cy="16.5" r="2.4" fill="#0284c7"/>

          <!-- Cauda e rotor traseiro -->

          <path d="M24 17 L32 15 L32 19 Z" fill="#ffffff"/>

          <line x1="32" y1="12" x2="32" y2="21" stroke="#ffffff" stroke-width="2.0" stroke-linecap="round"/>

          <!-- Trem de pouso / Esquis -->

          <line x1="9" y1="26" x2="25" y2="26" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>

          <line x1="13" y1="22" x2="13" y2="26" stroke="#ffffff" stroke-width="1.8"/>

          <line x1="21" y1="22" x2="21" y2="26" stroke="#ffffff" stroke-width="1.8"/>

        </svg>

      `);



      return (feature, resolution) => {

        const showText = resolution < 35;

        const name = feature.get('Nome') || '';



        return new ol.style.Style({

          image: new ol.style.Icon({

            src: svgHelicopter,

            anchor: [0.5, 0.5],

            scale: 0.38

          }),

          text: showText ? new ol.style.Text({

            text: name,

            offsetY: 14,

            font: 'bold 11px "Inter", sans-serif',

            fill: new ol.style.Fill({ color: '#ffffff' }),

            stroke: new ol.style.Stroke({ color: '#0369a1', width: 3.0 }),

            backgroundFill: new ol.style.Fill({ color: 'rgba(3, 105, 161, 0.92)' }),

            padding: [2, 6, 2, 6]

          }) : null

        });

      };

    }



    // Domicílios em Área de Risco (SGB, 2025): Simbologia própria de risco geológico institucional

    if (config.id === 'domicilios_risco_sgb_2025') {

      return new ol.style.Style({

        image: new ol.style.Circle({

          radius: s.pointRadius || 4.8,

          fill: new ol.style.Fill({ color: s.pointColor || '#f97316' }),

          stroke: new ol.style.Stroke({ color: s.strokeColor || '#ffffff', width: s.strokeWidth || 1.5 })

        })

      });

    }



    // Setores de Risco Geológico e Hidrológico (SGB, 2025): Polígonos temáticos com graduação de risco

    if (config.id === 'mapeamento_sgb_2025') {

      return (feature, resolution) => {

        const risco = (feature.get('GRAU_RISCO') || '').toLowerCase();

        const isMuitoAlto = risco.includes('muito');

        const setor = feature.get('NUM_SETOR') || '';

        const showLabel = resolution < 35;



        const fillColor = isMuitoAlto ? 'rgba(220, 38, 38, 0.38)' : 'rgba(234, 88, 12, 0.30)';

        const strokeColor = isMuitoAlto ? '#dc2626' : '#ea580c';



        return new ol.style.Style({

          fill: new ol.style.Fill({ color: fillColor }),

          stroke: new ol.style.Stroke({ color: strokeColor, width: isMuitoAlto ? 2.4 : 2.0 }),

          text: showLabel ? new ol.style.Text({

            text: setor.replace('RS_PASSOFU_', ''),

            font: 'bold 10.5px "Inter", sans-serif',

            fill: new ol.style.Fill({ color: '#ffffff' }),

            stroke: new ol.style.Stroke({ color: strokeColor, width: 2.8 }),

            backgroundFill: new ol.style.Fill({ color: 'rgba(15, 23, 42, 0.88)' }),

            padding: [2, 5, 2, 5]

          }) : null

        });

      };

    }



    // 5.1. PBZPA - Superfícies Limitadoras de Obstáculos do Aeroporto Lauro Kurtz

    if (config.id === 'pbzpa_superficies') {

      const hexToRgba = (hex, alpha) => {

        let c = (hex || '#3b82f6').replace('#', '');

        if (c.length === 3) c = c.split('').map(x => x + x).join('');

        const num = parseInt(c, 16);

        return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;

      };



      return (feature, resolution) => {

        const hex = feature.get('cor_sugerida') || '#0284c7';

        const nome = feature.get('nome') || '';

        const cota = feature.get('gabarito_rotulo') || '';

        const showLabel = resolution < 75;



        let strokeDash = undefined;

        let strokeWidth = 2.0;



        if (nome === 'Horizontal Externa') {

          strokeDash = [8, 6];

          strokeWidth = 2.2;

        } else if (nome === 'Cônica') {

          strokeDash = [6, 4];

          strokeWidth = 2.0;

        } else if (nome === 'Pista' || nome === 'Faixa de Pista') {

          strokeWidth = 2.6;

        }



        return new ol.style.Style({

          fill: new ol.style.Fill({

            color: hexToRgba(hex, 0.20)

          }),

          stroke: new ol.style.Stroke({

            color: hex,

            width: strokeWidth,

            lineDash: strokeDash

          }),

          text: showLabel ? new ol.style.Text({

            text: `${nome} (${cota})`,

            font: 'bold 11px "Inter", sans-serif',

            fill: new ol.style.Fill({ color: '#ffffff' }),

            stroke: new ol.style.Stroke({ color: '#0f172a', width: 3.0 }),

            backgroundFill: new ol.style.Fill({ color: 'rgba(15, 23, 42, 0.88)' }),

            padding: [2, 6, 2, 6],

            overflow: false

          }) : null

        });

      };

    }



    // 5.2. PBZPA - Cotas Altimétricas Oficiais (Pontos de Referência Altimétrica)

    if (config.id === 'pbzpa_cotas_rotulos') {

      return (feature, resolution) => {

        const rotulo = feature.get('rotulo') || feature.get('nome') || '';

        const showLabel = resolution < 80;



        return new ol.style.Style({

          image: new ol.style.Circle({

            radius: 4.5,

            fill: new ol.style.Fill({ color: '#0284c7' }),

            stroke: new ol.style.Stroke({ color: '#ffffff', width: 1.8 })

          }),

          text: showLabel ? new ol.style.Text({

            text: `📍 ${rotulo}`,

            offsetY: -15,

            font: 'bold 11px "JetBrains Mono", "Inter", sans-serif',

            fill: new ol.style.Fill({ color: '#0369a1' }),

            stroke: new ol.style.Stroke({ color: '#ffffff', width: 3.2 }),

            backgroundFill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.95)' }),

            backgroundStroke: new ol.style.Stroke({ color: '#0284c7', width: 1.2 }),

            padding: [2, 6, 2, 6]

          }) : null

        });

      };

    }



    // 5.3. PBZPA - Linhas Operacionais e Voo Visual (SPVV)

    if (config.id === 'pbzpa_linhas_operacionais') {

      return (feature, resolution) => {

        const hex = feature.get('cor_sugerida') || '#f59e0b';

        const nome = feature.get('nome') || '';

        const showLabel = resolution < 35;



        const isDash = nome.includes('SPVV') || nome.includes('Transição');



        return new ol.style.Style({

          stroke: new ol.style.Stroke({

            color: hex,

            width: 2.2,

            lineDash: isDash ? [6, 4] : undefined

          }),

          text: showLabel ? new ol.style.Text({

            text: nome,

            font: '600 10.5px "Inter", sans-serif',

            fill: new ol.style.Fill({ color: '#ffffff' }),

            stroke: new ol.style.Stroke({ color: '#0f172a', width: 2.8 }),

            backgroundFill: new ol.style.Fill({ color: 'rgba(15, 23, 42, 0.88)' }),

            padding: [2, 5, 2, 5]

          }) : null

        });

      };

    }



    if (config.geometryType === 'Point' || config.geometryType === 'MultiPoint') {

      return (feature, resolution) => {

        const rawName = feature.get('Escola') || feature.get('nome') || feature.get('NOME') || feature.get('Nome') || '';

        const name = typeof rawName === 'string' ? rawName.trim() : '';

        const showLabel = name && (s.showLabels !== false) && (resolution < 40);



        return new ol.style.Style({

          image: new ol.style.Circle({

            radius: s.pointRadius || 7,

            fill: new ol.style.Fill({ color: s.pointColor || '#dc2626' }),

            stroke: new ol.style.Stroke({ color: s.strokeColor || '#ffffff', width: s.strokeWidth || 2.0 })

          }),

          text: showLabel ? new ol.style.Text({

            text: name,

            offsetY: -15,

            font: 'bold 11.5px "Inter", sans-serif',

            fill: new ol.style.Fill({ color: '#ffffff' }),

            stroke: new ol.style.Stroke({ color: '#0f172a', width: 3.0 }),

            backgroundFill: new ol.style.Fill({ color: 'rgba(15, 23, 42, 0.85)' }),

            padding: [2, 6, 2, 6]

          }) : null

        });

      };

    }





    // 6. Bairros e Regiões Urbanas (com rótulos dinâmicos a partir de zoom 12)

    if (config.id === 'bairros') {

      return (feature, resolution) => {

        // resolution ~19 corresponds to zoom 13+

        const showLabel = resolution < 40;

        let textStyle = null;



        if (showLabel) {

          const rawName = feature.get('Descri____') || feature.get('Name') || '';

          const cleanName = rawName.replace(/^Região do Bairro\s*/i, '').split(' e ')[0];



          textStyle = new ol.style.Text({
            text: cleanName,
            font: '600 11px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#ffffff' }),
            stroke: new ol.style.Stroke({ color: '#064e3b', width: 3.2 }),
            overflow: false
          });

        }



        return new ol.style.Style({

          fill: new ol.style.Fill({ color: s.fillColor || 'rgba(16, 185, 129, 0.08)' }),

          stroke: new ol.style.Stroke({ color: s.strokeColor || '#059669', width: s.strokeWidth || 1.0 }),

          text: textStyle

        });

      };

    }



    // 7. Mapa Coroplético (Densidade Populacional & Entorno IBGE 2022)

    if (config.isChoropleth && config.choroplethBreaks) {

      return (feature) => {

        // Se a camada pertencer ao Entorno e o setor tiver 1 ou 0 domicílios, desconsiderar 100% artificial e renderizar transparente

        if (config.group === 'infraestrutura_entorno') {

          const totDom = parseInt(feature.get('tot_domicilios'), 10);

          if (isNaN(totDom) || totDom <= 1) {

            return new ol.style.Style({

              fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.04)' }),

              stroke: new ol.style.Stroke({ color: 'rgba(148, 163, 184, 0.25)', width: 0.5, lineDash: [3, 3] })

            });

          }

        }



        const val = parseFloat(feature.get(config.choroplethField)) || 0;

        let fillColor = 'rgba(254, 240, 217, 0.75)';



        for (const item of config.choroplethBreaks) {

          if (val <= item.max) {

            fillColor = item.color;

            break;

          }

        }



        return new ol.style.Style({

          fill: new ol.style.Fill({ color: fillColor }),

          stroke: new ol.style.Stroke({ color: s.strokeColor || '#991b1b', width: 0.8 })

        });

      };

    }



    // 7.5. Curvas de nível — 10 m (Topografia & Relevo) com cotas altimétricas e seletor dinâmico de 3 cores

    if (config.id === 'curvas_nivel_10m') {

      return (feature, resolution) => {

        const activeColor = this.contourColor || config.style?.strokeColor || '#795548';

        const rawZ = feature.get('Z') ?? feature.get('ELEV') ?? 0;

        const zNum = parseFloat(rawZ);

        const isMaster = Math.round(zNum) % 50 === 0;



        // Regra de espessura cartográfica: curvas mestras (a cada 50m) com destaque sutil

        const strokeWidth = isMaster ? 1.4 : 0.85;



        // Controle de densidade e escala para os rótulos de cotas:

        let textStyle = null;

        const showMasterLabels = resolution <= 10 && isMaster;

        const showAllLabels = resolution <= 4.5;



        if (showMasterLabels || showAllLabels) {

          const zText = Number.isInteger(zNum) ? `${zNum} m` : `${zNum.toFixed(1)} m`;



          textStyle = new ol.style.Text({

            text: zText,

            font: isMaster ? 'bold 10.5px "Inter", sans-serif' : '500 9.5px "Inter", sans-serif',

            placement: 'line',

            repeat: resolution <= 2.5 ? 350 : 500, // Espaçamento calibrado em pixels ao longo da isolinha

            maxAngle: Math.PI / 4,

            overflow: false,

            keepUpright: true,

            fill: new ol.style.Fill({

              color: activeColor

            }),

            stroke: new ol.style.Stroke({

              color: 'rgba(255, 255, 255, 0.95)',

              width: 3.2

            })

          });

        }



        return new ol.style.Style({

          stroke: new ol.style.Stroke({

            color: activeColor,

            width: strokeWidth

          }),

          text: textStyle

        });

      };

    }



    // 8. Padrão genérico

    return new ol.style.Style({

      fill: s.fillColor ? new ol.style.Fill({ color: s.fillColor }) : undefined,

      stroke: new ol.style.Stroke({

        color: s.strokeColor || '#3b82f6',

        width: s.strokeWidth || 2,

        lineDash: s.strokeDash || undefined

      })

    });

  }



  /**

   * Adiciona uma camada personalizada importada com feições OpenLayers prontas (KML, KMZ, SHP, DXF, GeoJSON)

   */

  addCustomFeaturesLayer(layerName, features, options = {}) {

    const customId = `custom_${Date.now()}`;

    const color = options.color || '#0284c7';

    const formatType = options.formatType || 'Vetor';

    const source = new ol.source.Vector();



    features.forEach(f => {

      f.set('_layerId', customId);

      f.set('_layerName', layerName);

      f.set('_isCustom', true);

      f.set('_formatType', formatType);

    });



    source.addFeatures(features);



    // Estilo adaptável para Pontos, Linhas e Polígonos

    const layer = new ol.layer.Vector({

      source: source,

      zIndex: 75,

      style: (feat) => {

        const geomType = feat.getGeometry() ? feat.getGeometry().getType() : '';

        const fillColor = color.startsWith('#')

          ? `${color}33`

          : 'rgba(2, 132, 199, 0.20)';



        if (geomType === 'Point' || geomType === 'MultiPoint') {

          return new ol.style.Style({

            image: new ol.style.Circle({

              radius: 6.5,

              fill: new ol.style.Fill({ color: color }),

              stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })

            }),

            text: (feat.get('name') || feat.get('Name') || feat.get('layer') || feat.get('Layer')) ? new ol.style.Text({

              text: String(feat.get('name') || feat.get('Name') || feat.get('layer') || feat.get('Layer')),

              offsetY: -14,

              font: 'bold 11px "Inter", sans-serif',

              fill: new ol.style.Fill({ color: '#ffffff' }),

              stroke: new ol.style.Stroke({ color: '#0f172a', width: 3 }),

              backgroundFill: new ol.style.Fill({ color: 'rgba(15, 23, 42, 0.85)' }),

              padding: [2, 5, 2, 5]

            }) : null

          });

        }



        return new ol.style.Style({

          fill: new ol.style.Fill({ color: fillColor }),

          stroke: new ol.style.Stroke({

            color: color,

            width: 2.4

          })

        });

      }

    });



    layer.set('layerId', customId);

    layer.set('layerName', layerName);

    layer.set('isThematicLayer', true);

    layer.set('isCustomLayer', true);

    layer.set('customFormat', formatType);

    layer.set('customColor', color);

    layer.set('featureCount', features.length);



    this.map.addLayer(layer);

    this.customLayers.set(customId, layer);



    // Zoom suave para enquadrar a camada importada

    if (features.length > 0) {

      const extent = source.getExtent();

      if (!ol.extent.isEmpty(extent)) {

        this.mapEngine.zoomTo(extent, { padding: [80, 80, 80, 80], maxZoom: 18 });

      }

    }



    window.dispatchEvent(new CustomEvent('custom-layers:updated'));



    return { id: customId, name: layerName, featureCount: features.length, color, formatType };

  }



  /**

   * Imports and injects a custom GeoJSON layer on the fly (Drag & Drop / Operator tool)

   */

  addCustomGeoJsonLayer(layerName, geoJsonData, color = '#ff7800', formatType = 'GeoJSON') {

    let features;

    if (geoJsonData.crs && geoJsonData.crs.properties && geoJsonData.crs.properties.name && geoJsonData.crs.properties.name.includes('31982')) {

      features = this.geoJsonFormat.readFeatures(geoJsonData);

    } else {

      features = new ol.format.GeoJSON().readFeatures(geoJsonData, {

        dataProjection: 'EPSG:4326',

        featureProjection: 'EPSG:3857'

      });

    }

    return this.addCustomFeaturesLayer(layerName, features, { color, formatType });

  }



  /**

   * Remove uma camada personalizada

   */

  removeCustomLayer(customId) {

    const layer = this.customLayers.get(customId);

    if (!layer) return;



    this.map.removeLayer(layer);

    this.customLayers.delete(customId);

    window.dispatchEvent(new CustomEvent('custom-layers:updated'));

  }



  /**

   * Alterna visibilidade da camada personalizada

   */

  setCustomLayerVisibility(customId, visible) {

    const layer = this.customLayers.get(customId);

    if (!layer) return;



    layer.setVisible(visible);

    window.dispatchEvent(new CustomEvent('custom-layers:updated'));

  }



  /**

   * Centraliza no lote/feições da camada personalizada

   */

  zoomToCustomLayer(customId) {

    const layer = this.customLayers.get(customId);

    if (!layer) return;



    const source = layer.getSource();

    if (source && source.getExtent) {

      const extent = source.getExtent();

      if (!ol.extent.isEmpty(extent)) {

        this.mapEngine.zoomTo(extent, { padding: [80, 80, 80, 80], maxZoom: 18 });

      }

    }

  }



  /**

   * Retorna lista descritiva de todas as camadas personalizadas ativas

   */

  getCustomLayersList() {

    const list = [];

    this.customLayers.forEach((layer, id) => {

      list.push({

        id,

        name: layer.get('layerName') || 'Camada',

        color: layer.get('customColor') || '#0284c7',

        formatType: layer.get('customFormat') || 'Vetor',

        featureCount: layer.get('featureCount') || (layer.getSource() ? layer.getSource().getFeatures().length : 0),

        visible: Boolean(layer.getVisible())

      });

    });

    return list;

  }



  getLayer(layerId) {

    return this.layers.get(layerId) || this.customLayers.get(layerId);

  }



  getConfig(layerId) {

    return this.configs.get(layerId);

  }



  /**

   * Atualiza dinamicamente a cor da camada Curvas de nível — 10 m

   * Troca instantânea na simbologia sem novo download do GeoJSON

   * @param {string} color Código HEX (#795548, #222222, #D32F2F)

   */

  setContourColor(color) {

    this.contourColor = color;

    const config = this.configs.get('curvas_nivel_10m');

    const layer = this.layers.get('curvas_nivel_10m');



    if (config && config.style) {

      config.style.strokeColor = color;

      config.style.previewColor = color;

      config.contourColor = color;

    }



    if (layer) {

      layer.setStyle(this.createLayerStyle(config));

      layer.changed();

    }

  }

}

