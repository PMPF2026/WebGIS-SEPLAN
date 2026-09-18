/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Advanced Vector Layer Manager, Symbology & Canvas Pattern Engine
 */

import { LAYERS_CONFIG, LAYER_GROUPS } from '../config/layers.config.js';
import { loadGeoJson } from '../utils/async-loader.js';
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
          crossOrigin: 'anonymous',
          wrapX: false
        });

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
      const isUtm22s = (config.crs && config.crs.includes('31982')) || 
                       (geoJsonData.crs && geoJsonData.crs.properties && geoJsonData.crs.properties.name && geoJsonData.crs.properties.name.includes('31982'));
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

    if (config.isRaster && config.extent) {
      const extent3857 = ol.proj.transformExtent(config.extent, 'EPSG:31982', 'EPSG:3857');
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

    // 3. Rodovias (Federal / Estadual): Dual Casing Style (Padrão Cartográfico Oficial Limpo)
    if (config.isHighway) {
      const isFederal = config.highwayType === 'BR';
      const mainColor = isFederal ? '#dc2626' : '#ea580c';
      const mainWidth = isFederal ? 1.8 : 1.4;
      const casingWidth = isFederal ? 2.8 : 2.2;

      return [
        // Linha externa (casing branco de contraste sutil)
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: '#ffffff',
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

    // Estação Hidrometeorológica DCRS-00016 (Rede Hidrometeorológica Defesa Civil RS)
    if (config.id === 'estacao_dcrs00016' || s.iconType === 'estacao_hidro') {
      const svgStation = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
          <circle cx="18" cy="18" r="17" fill="#0284c7" stroke="#ffffff" stroke-width="2.5" />
          <circle cx="18" cy="18" r="14" fill="#0369a1" />
          <!-- Símbolo Torre Telemétrica / Sensor de Radar Hidrometeorológico -->
          <path d="M18 7 L12 28 L15 28 L18 19 L21 28 L24 28 Z" fill="#ffffff" />
          <circle cx="18" cy="8" r="3" fill="#facc15" stroke="#ffffff" stroke-width="1" />
          <path d="M11 12 A 9 9 0 0 1 25 12" stroke="#38bdf8" stroke-width="1.8" fill="none" stroke-linecap="round"/>
          <path d="M8 9 A 13 13 0 0 1 28 9" stroke="#bae6fd" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        </svg>
      `);

      return (feature, resolution) => {
        const showText = resolution < 45;
        const name = feature.get('nome_estacao') || 'DCRS-00016 — Passo Fundo';

        return new ol.style.Style({
          image: new ol.style.Icon({
            src: svgStation,
            anchor: [0.5, 0.5],
            scale: 0.85
          }),
          text: showText ? new ol.style.Text({
            text: name,
            offsetY: 22,
            font: 'bold 11px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#ffffff' }),
            stroke: new ol.style.Stroke({ color: '#0369a1', width: 3.0 }),
            backgroundFill: new ol.style.Fill({ color: 'rgba(3, 105, 161, 0.92)' }),
            padding: [2, 6, 2, 6]
          }) : null
        });
      };
    }

    // Estações Meteorológicas Plugfield (16 Estações)
    if (config.id === 'estacoes_plugfield' || s.iconType === 'estacao_plugfield') {
      const svgPlugfield = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
          <circle cx="18" cy="18" r="17" fill="#10b981" stroke="#ffffff" stroke-width="2.5" />
          <circle cx="18" cy="18" r="14" fill="#059669" />
          <!-- Símbolo Sensor Meteorológico / Pluviômetro & Anemômetro -->
          <circle cx="18" cy="10" r="3.2" fill="#ffffff" />
          <line x1="18" y1="13" x2="18" y2="27" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>
          <line x1="12" y1="17" x2="24" y2="17" stroke="#ffffff" stroke-width="2.0" stroke-linecap="round"/>
          <circle cx="12" cy="17" r="2.2" fill="#34d399"/>
          <circle cx="24" cy="17" r="2.2" fill="#34d399"/>
          <path d="M14 27 L22 27" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      `);

      return (feature, resolution) => {
        const showText = resolution < 45;
        const name = feature.get('nome_estacao') || 'Estação Plugfield';

        return new ol.style.Style({
          image: new ol.style.Icon({
            src: svgPlugfield,
            anchor: [0.5, 0.5],
            scale: 0.82
          }),
          text: showText ? new ol.style.Text({
            text: name,
            offsetY: 22,
            font: 'bold 10.5px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#ffffff' }),
            stroke: new ol.style.Stroke({ color: '#065f46', width: 2.8 }),
            backgroundFill: new ol.style.Fill({ color: 'rgba(5, 150, 105, 0.92)' }),
            padding: [2, 5, 2, 5]
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

    if (config.geometryType === 'Point') {
      return (feature, resolution) => {
        const name = feature.get('nome') || '';
        return new ol.style.Style({
          image: new ol.style.Circle({
            radius: s.pointRadius || 7,
            fill: new ol.style.Fill({ color: s.pointColor || '#dc2626' }),
            stroke: new ol.style.Stroke({ color: s.strokeColor || '#ffffff', width: 2.0 })
          }),
          text: new ol.style.Text({
            text: name,
            offsetY: -15,
            font: 'bold 11.5px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#ffffff' }),
            stroke: new ol.style.Stroke({ color: '#0f172a', width: 3.0 }),
            backgroundFill: new ol.style.Fill({ color: 'rgba(15, 23, 42, 0.85)' }),
            padding: [2, 6, 2, 6]
          })
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
            font: 'bold 11px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#ffffff' }),
            stroke: new ol.style.Stroke({ color: '#064e3b', width: 2.8 }),
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

    // 7. Mapa Coroplético (Densidade Populacional)
    if (config.isChoropleth && config.choroplethBreaks) {
      return (feature) => {
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
   * Imports and injects a custom GeoJSON layer on the fly (Drag & Drop / Operator tool)
   */
  addCustomGeoJsonLayer(layerName, geoJsonData, color = '#ff7800') {
    const customId = `custom_${Date.now()}`;
    const source = new ol.source.Vector();

    // Check if CRS is EPSG:31982 or standard WGS84
    let features;
    if (geoJsonData.crs && geoJsonData.crs.properties && geoJsonData.crs.properties.name && geoJsonData.crs.properties.name.includes('31982')) {
      features = this.geoJsonFormat.readFeatures(geoJsonData);
    } else {
      features = new ol.format.GeoJSON().readFeatures(geoJsonData, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });
    }

    features.forEach(f => {
      f.set('_layerId', customId);
      f.set('_layerName', layerName);
    });

    source.addFeatures(features);

    const layer = new ol.layer.Vector({
      source: source,
      zIndex: 70,
      style: new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(255, 120, 0, 0.25)' }),
        stroke: new ol.style.Stroke({ color: color, width: 2.5 }),
        image: new ol.style.Circle({
          radius: 7,
          fill: new ol.style.Fill({ color: color }),
          stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
        })
      })
    });

    layer.set('layerId', customId);
    layer.set('layerName', layerName);
    layer.set('isThematicLayer', true);
    layer.set('isCustomLayer', true);

    this.map.addLayer(layer);
    this.customLayers.set(customId, layer);

    // Zoom to layer
    this.mapEngine.zoomTo(source.getExtent());

    return { id: customId, name: layerName, featureCount: features.length };
  }

  getLayer(layerId) {
    return this.layers.get(layerId) || this.customLayers.get(layerId);
  }

  getConfig(layerId) {
    return this.configs.get(layerId);
  }
}
