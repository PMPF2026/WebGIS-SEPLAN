/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Feature Identification Tool (Multi-Feature Spatial Query)
 */

export class IdentifyTool {
  constructor(mapEngine, layerManager, popupUI, elevationQueryTool = null) {
    this.mapEngine = mapEngine;
    this.map = mapEngine.getOlMap();
    this.layerManager = layerManager;
    this.popupUI = popupUI;
    this.elevationQueryTool = elevationQueryTool;
    this.isActive = true;

    this.init();
  }

  setElevationQueryTool(tool) {
    this.elevationQueryTool = tool;
  }

  init() {
    this.map.on('singleclick', (evt) => {
      if (!this.isActive) return;

      // Do not open popup if user is currently measuring distance or area
      if (this.map.get('measuringActive')) return;

      const pixel = evt.pixel;
      const clickedFeatures = [];

      // Query all features intersecting the pixel with an 8px hit tolerance
      this.map.forEachFeatureAtPixel(pixel, (feature, layer) => {
        if (!layer || !layer.get('isThematicLayer')) return;
        const layerConfig = layer.get('layerConfig') || {
          id: layer.get('layerId'),
          name: layer.get('layerName') || 'Camada Customizada',
          group: layer.get('isCustomLayer') ? 'camada_customizada' : 'outros',
          zIndex: layer.getZIndex ? layer.getZIndex() : 75
        };
        clickedFeatures.push({ feature, layerConfig, layer });
      }, {
        hitTolerance: 8
      });

      // Separar feições operacionais das feições puramente topográficas
      const operationalFeatures = clickedFeatures.filter(item => item.layerConfig?.group !== 'topografia_relevo');
      const isElevationActive = this.elevationQueryTool && this.elevationQueryTool.isActive();

      // Ordenação inteligente de feições para o popup:
      // Se houver PBZPA (Restrições Aeronáuticas), ele vai para 1º lugar (Feição 1), e a camada importada vai para o final (Feição N de N)
      const sortFeaturesForPopup = (features) => {
        const hasPbzpa = features.some(f => f.layerConfig?.id === 'pbzpa_superficies');

        return features.sort((a, b) => {
          const getPriority = (item) => {
            const id = item.layerConfig?.id;
            const isCustom = item.layer?.get('isCustomLayer') || item.layerConfig?.group === 'camada_customizada';

            // 1. Superfície PBZPA (Gabarito no Lote e Restrições do Aeroporto): prioridade máxima
            if (id === 'pbzpa_superficies') return 10000;
            if (id === 'pbzpa_cotas_rotulos' || id === 'pbzpa_linhas_operacionais') return 5000;

            // 2. Camadas do usuário importadas (KML, KMZ, DXF, SHP):
            // Se houver PBZPA, fica na última posição conforme solicitado pelo arquiteto (ex: 6 de 6)
            // Se NÃO houver PBZPA, fica em 1º lugar na frente de bairros/limites gerais
            if (isCustom) return hasPbzpa ? -10000 : 8000;

            // 3. Demais camadas pelo zIndex decrescente
            return item.layerConfig?.zIndex || 0;
          };

          return getPriority(b) - getPriority(a);
        });
      };

      if (operationalFeatures.length > 0) {
        // Usuário clicou em feição vetorial temática específica
        if (this.elevationQueryTool) {
          this.elevationQueryTool.hide();
        }
        sortFeaturesForPopup(operationalFeatures);
        this.popupUI.showMultiFeatures(operationalFeatures, evt.coordinate);
      } else if (isElevationActive) {
        // Topografia/Hipsometria ativa: consulta cota altimétrica do terreno ou da curva clicada
        this.popupUI.close();
        this.elevationQueryTool.query(evt.coordinate);
      } else if (clickedFeatures.length > 0) {
        // Caso normal sem modo de topografia
        sortFeaturesForPopup(clickedFeatures);
        this.popupUI.showMultiFeatures(clickedFeatures, evt.coordinate);
      } else {
        if (this.elevationQueryTool) {
          this.elevationQueryTool.hide();
        }
        this.popupUI.close();
      }
    });

    // Pointer hover feedback
    this.map.on('pointermove', (e) => {
      if (e.dragging || this.map.get('measuringActive')) return;
      const hit = this.map.hasFeatureAtPixel(e.pixel, {
        layerFilter: (l) => l.get('isThematicLayer') === true,
        hitTolerance: 6
      });
      const isElevationActive = this.elevationQueryTool && this.elevationQueryTool.isActive();
      this.map.getTargetElement().style.cursor = hit ? 'pointer' : (isElevationActive ? 'crosshair' : '');
    });
  }

  setActive(active) {
    this.isActive = active;
  }
}
