/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Real-time Geodesic Measurement Tools (Distance & Area)
 */

import { formatArea, formatDistance } from '../utils/formatters.js';
import { Notification } from '../ui/notification.js';

export class MeasureTool {
  constructor(mapEngine) {
    this.mapEngine = mapEngine;
    this.map = mapEngine.getOlMap();
    
    // Measurement Vector Layer & Source
    this.source = new ol.source.Vector();
    this.vectorLayer = new ol.layer.Vector({
      source: this.source,
      zIndex: 900,
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 120, 0, 0.2)'
        }),
        stroke: new ol.style.Stroke({
          color: '#ff7800',
          width: 2.5,
          lineDash: [6, 6]
        }),
        image: new ol.style.Circle({
          radius: 6,
          stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 }),
          fill: new ol.style.Fill({ color: '#ff7800' })
        })
      })
    });
    this.map.addLayer(this.vectorLayer);

    this.draw = null;
    this.sketch = null;
    this.helpTooltipElement = null;
    this.helpTooltip = null;
    this.measureTooltipElement = null;
    this.measureTooltip = null;
    this.overlays = [];
    this.activeType = null; // 'distance' | 'area' | null

    this.initControls();
  }

  initControls() {
    const distBtn = document.getElementById('btn-measure-dist');
    const areaBtn = document.getElementById('btn-measure-area');
    const clearBtn = document.getElementById('btn-measure-clear');

    if (distBtn) {
      distBtn.addEventListener('click', () => {
        if (this.activeType === 'distance') {
          this.stopMeasurement();
        } else {
          this.startMeasurement('LineString');
          distBtn.classList.add('active');
          if (areaBtn) areaBtn.classList.remove('active');
        }
      });
    }

    if (areaBtn) {
      areaBtn.addEventListener('click', () => {
        if (this.activeType === 'area') {
          this.stopMeasurement();
        } else {
          this.startMeasurement('Polygon');
          areaBtn.classList.add('active');
          if (distBtn) distBtn.classList.remove('active');
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearAll();
      });
    }
  }

  startMeasurement(type) {
    this.stopMeasurement();
    this.activeType = (type === 'LineString') ? 'distance' : 'area';
    this.map.set('measuringActive', true);

    Notification.info(
      type === 'LineString' 
        ? 'Modo Medição de Distância: Clique no mapa para traçar o percurso (duplo clique finaliza).' 
        : 'Modo Medição de Área: Clique no mapa para delimitar o polígono (duplo clique finaliza).'
    );

    this.createMeasureTooltip();
    this.createHelpTooltip();

    this.draw = new ol.interaction.Draw({
      source: this.source,
      type: type,
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 120, 0, 0.25)'
        }),
        stroke: new ol.style.Stroke({
          color: '#ea580c',
          lineDash: [8, 6],
          width: 3
        }),
        image: new ol.style.Circle({
          radius: 6,
          stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 }),
          fill: new ol.style.Fill({ color: '#ea580c' })
        })
      })
    });

    this.map.addInteraction(this.draw);

    let listener;
    this.draw.on('drawstart', (evt) => {
      this.sketch = evt.feature;
      let tooltipCoord = evt.coordinate;

      listener = this.sketch.getGeometry().on('change', (e) => {
        const geom = e.target;
        let output;
        if (geom instanceof ol.geom.Polygon) {
          output = formatArea(ol.sphere.getArea(geom));
          tooltipCoord = geom.getInteriorPoint().getCoordinates();
        } else if (geom instanceof ol.geom.LineString) {
          output = formatDistance(ol.sphere.getLength(geom));
          tooltipCoord = geom.getLastCoordinate();
        }
        this.measureTooltipElement.innerHTML = output;
        this.measureTooltip.setPosition(tooltipCoord);
      });
    });

    this.draw.on('drawend', () => {
      this.measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
      this.measureTooltip.setOffset([0, -7]);
      this.sketch = null;
      this.measureTooltipElement = null;
      this.createMeasureTooltip();
      ol.Observable.unByKey(listener);
    });

    this.pointerMoveHandler = (evt) => {
      if (evt.dragging) return;
      let helpMsg = 'Clique para iniciar a medição';
      if (this.sketch) {
        const geom = this.sketch.getGeometry();
        if (geom instanceof ol.geom.Polygon) {
          helpMsg = 'Clique para continuar | Duplo clique fecha o polígono';
        } else if (geom instanceof ol.geom.LineString) {
          helpMsg = 'Clique para continuar | Duplo clique finaliza a linha';
        }
      }
      this.helpTooltipElement.innerHTML = helpMsg;
      this.helpTooltip.setPosition(evt.coordinate);
      this.helpTooltipElement.classList.remove('hidden');
    };

    this.map.on('pointermove', this.pointerMoveHandler);
  }

  stopMeasurement() {
    if (this.draw) {
      this.map.removeInteraction(this.draw);
      this.draw = null;
    }
    if (this.pointerMoveHandler) {
      this.map.un('pointermove', this.pointerMoveHandler);
    }
    if (this.helpTooltipElement) {
      this.helpTooltipElement.remove();
    }
    this.activeType = null;
    this.map.set('measuringActive', false);

    document.querySelectorAll('#btn-measure-dist, #btn-measure-area').forEach(b => b.classList.remove('active'));
  }

  clearAll() {
    this.stopMeasurement();
    this.source.clear();
    this.overlays.forEach(ov => this.map.removeOverlay(ov));
    this.overlays = [];
    Notification.info('Medições limpas do mapa.');
  }

  createHelpTooltip() {
    if (this.helpTooltipElement) {
      this.helpTooltipElement.remove();
    }
    this.helpTooltipElement = document.createElement('div');
    this.helpTooltipElement.className = 'ol-tooltip hidden';
    this.helpTooltip = new ol.Overlay({
      element: this.helpTooltipElement,
      offset: [15, 0],
      positioning: 'center-left'
    });
    this.map.addOverlay(this.helpTooltip);
    this.overlays.push(this.helpTooltip);
  }

  createMeasureTooltip() {
    if (this.measureTooltipElement) {
      this.measureTooltipElement.remove();
    }
    this.measureTooltipElement = document.createElement('div');
    this.measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
    this.measureTooltip = new ol.Overlay({
      element: this.measureTooltipElement,
      offset: [0, -15],
      positioning: 'bottom-center',
      stopEvent: false
    });
    this.map.addOverlay(this.measureTooltip);
    this.overlays.push(this.measureTooltip);
  }
}
