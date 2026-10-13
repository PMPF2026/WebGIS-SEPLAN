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
        const layerConfig = layer.get('layerConfig') || { name: layer.get('layerName') || 'Camada Customizada' };
        clickedFeatures.push({ feature, layerConfig, layer });
      }, {
        hitTolerance: 8
      });

      // Separar feições operacionais das feições puramente topográficas
      const operationalFeatures = clickedFeatures.filter(item => item.layerConfig?.group !== 'topografia_relevo');
      const isElevationActive = this.elevationQueryTool && this.elevationQueryTool.isActive();

      if (operationalFeatures.length > 0) {
        // Usuário clicou em feição vetorial temática específica
        if (this.elevationQueryTool) {
          this.elevationQueryTool.hide();
        }
        operationalFeatures.sort((a, b) => (b.layerConfig.zIndex || 0) - (a.layerConfig.zIndex || 0));
        this.popupUI.showMultiFeatures(operationalFeatures, evt.coordinate);
      } else if (isElevationActive) {
        // Topografia/Hipsometria ativa: consulta cota altimétrica do terreno ou da curva clicada
        this.popupUI.close();
        this.elevationQueryTool.query(evt.coordinate);
      } else if (clickedFeatures.length > 0) {
        // Caso normal sem modo de topografia
        clickedFeatures.sort((a, b) => (b.layerConfig.zIndex || 0) - (a.layerConfig.zIndex || 0));
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
