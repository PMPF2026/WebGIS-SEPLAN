/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Feature Identification Tool (Multi-Feature Spatial Query)
 */

export class IdentifyTool {
  constructor(mapEngine, layerManager, popupUI) {
    this.mapEngine = mapEngine;
    this.map = mapEngine.getOlMap();
    this.layerManager = layerManager;
    this.popupUI = popupUI;
    this.isActive = true;

    this.init();
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

      if (clickedFeatures.length > 0) {
        // Sort features by importance / z-index descending
        clickedFeatures.sort((a, b) => (b.layerConfig.zIndex || 0) - (a.layerConfig.zIndex || 0));
        this.popupUI.showMultiFeatures(clickedFeatures, evt.coordinate);
      } else {
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
      this.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
  }

  setActive(active) {
    this.isActive = active;
  }
}
