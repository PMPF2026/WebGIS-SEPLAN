/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Enhanced Contextual Feature Popup with Multi-Feature Pagination & Actions
 */

import { formatNumber, formatArea, formatDistance, escapeHtml } from '../utils/formatters.js';
import { toUTM22S } from '../utils/projection.js';
import { Notification } from './notification.js';
import { PlugfieldService } from '../weather/plugfield-service.js';
import { WeatherService } from '../weather/weather-service.js';

export class PopupUI {
  constructor(mapEngine, layerManager) {
    this.mapEngine = mapEngine;
    this.layerManager = layerManager;
    this.popupOverlay = mapEngine.popupOverlay;
    
    this.popupContainer = document.getElementById('popup');
    this.closerBtn = document.getElementById('popup-closer');
    this.contentEl = document.getElementById('popup-content');
    
    this.featureList = [];
    this.currentIndex = 0;
    this.lastCoordinate = null;

    this.init();
  }

  init() {
    if (this.closerBtn) {
      this.closerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
      });
    }
  }

  close() {
    this.mapEngine.closePopup();
    this.featureList = [];
    this.currentIndex = 0;
  }

  /**
   * Display popup for a list of features at clicked location
   * @param {Array<{feature: ol.Feature, layerConfig: Object}>} features 
   * @param {Array<number>} coordinate 
   */
  showMultiFeatures(features, coordinate) {
    if (!features || features.length === 0 || !this.contentEl) return;

    this.featureList = features;
    this.currentIndex = 0;
    this.lastCoordinate = coordinate;

    this.renderCurrentFeature();
    this.popupOverlay.setPosition(coordinate);
  }

  /**
   * Display single feature
   */
  showPopupForFeature(feature, layerConfig, coordinate) {
    this.showMultiFeatures([{ feature, layerConfig }], coordinate);
  }

  renderCurrentFeature() {
    if (this.featureList.length === 0) return;

    const currentItem = this.featureList[this.currentIndex];
    const feature = currentItem.feature;
    const layerConfig = currentItem.layerConfig || { name: feature.get('_layerName') || 'Camada' };
    const props = feature.getProperties();
    const pConfig = layerConfig.popupConfig || {};

    // 1. Determine Title
    let title = pConfig.defaultTitle || layerConfig.name;
    if (pConfig.titleField && props[pConfig.titleField]) {
      const prefix = pConfig.titlePrefix || '';
      title = `${prefix}${props[pConfig.titleField]}`;
    }

    // 2. Tag Class
    let tagClass = 'tag-defesa-civil';
    if (layerConfig.group === 'abrigos_cobertura') tagClass = 'tag-abrigos';
    if (layerConfig.group === 'hidrografia') tagClass = 'tag-hidrografia';
    if (layerConfig.group === 'sistema_viario') tagClass = 'tag-viario';
    if (layerConfig.group === 'divisao_territorial') tagClass = 'tag-territorial';
    if (layerConfig.group === 'planejamento_urbano') tagClass = 'tag-planejamento';
    if (layerConfig.group === 'populacao') tagClass = 'tag-populacao';
    if (layerConfig.group === 'areas_verdes') tagClass = 'tag-areas-verdes';

    // 3. Multi-feature pagination header if > 1 feature
    let paginationHtml = '';
    if (this.featureList.length > 1) {
      paginationHtml = `
        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.2); padding:4px 8px; border-radius:4px; margin-bottom:6px; font-size:11px; color:var(--text-muted);">
          <span>Feição <strong>${this.currentIndex + 1}</strong> de <strong>${this.featureList.length}</strong></span>
          <div style="display:flex; gap:4px;">
            <button class="popup-nav-btn" id="btn-popup-prev" ${this.currentIndex === 0 ? 'disabled' : ''} style="background:var(--dc-blue-border); color:#fff; border:none; border-radius:3px; padding:2px 6px; cursor:pointer;">&lt;</button>
            <button class="popup-nav-btn" id="btn-popup-next" ${this.currentIndex === this.featureList.length - 1 ? 'disabled' : ''} style="background:var(--dc-blue-border); color:#fff; border:none; border-radius:3px; padding:2px 6px; cursor:pointer;">&gt;</button>
          </div>
        </div>
      `;
    }

    // 4. Se for estação Plugfield, injeta telemetria em tempo real
    if (props['deviceId']) {
      const devId = parseInt(props['deviceId'], 10);
      const cachedStations = (typeof PlugfieldService !== 'undefined' && PlugfieldService.getCachedStations)
        ? PlugfieldService.getCachedStations()
        : null;
      const st = cachedStations ? cachedStations.find(s => s.deviceId === devId) : null;

      if (st) {
        const m = st.metrics || {};
        props['status_comunicacao'] = st.isOnline ? 'Online (em tempo real)' : (st.status === 'delayed' ? 'Comunicação atrasada' : 'Sem comunicação recente');
        props['temperatura_atual'] = m.temperature != null ? `${m.temperature.toFixed(1).replace('.', ',')} °C` : '--';
        props['temperatura_min_max'] = (m.tempMin != null || m.tempMax != null)
          ? `${m.tempMin != null ? m.tempMin.toFixed(1).replace('.', ',') + ' °C' : '--'} / ${m.tempMax != null ? m.tempMax.toFixed(1).replace('.', ',') + ' °C' : '--'}`
          : '--';
        props['umidade_atual'] = m.humidity != null ? `${m.humidity.toFixed(0)} %` : '--';
        props['chuva_hoje'] = m.rain != null ? `${m.rain.toFixed(1).replace('.', ',')} mm` : '--';
        props['chuva_mes'] = m.rainAccumMonthly != null ? `${m.rainAccumMonthly.toFixed(1).replace('.', ',')} mm` : '--';
        props['vento_atual'] = m.windSpeed != null ? `${m.windSpeed.toFixed(1).replace('.', ',')} km/h` : '--';
        props['rajada_maxima'] = m.windGust != null ? `${m.windGust.toFixed(1).replace('.', ',')} km/h` : '--';
        props['direcao_vento'] = m.windDirectionText || (m.windDirection != null ? `${m.windDirection}°` : '--');
        props['pressao_atual'] = m.pressure != null ? `${m.pressure.toFixed(1).replace('.', ',')} hPa` : '--';
        props['nivel_rio'] = m.riverLevel != null ? `${m.riverLevel.toFixed(2).replace('.', ',')} m` : (st.hasRiverSensor ? 'Sensor ativo (aguardando leitura)' : 'Não monitorado nesta estação');
        props['ultima_atualizacao'] = st.lastUpdateText || 'Sem comunicação recente';
      }
    }

    // 4.1. Se for estação oficial DCRS-00016, injeta telemetria da Defesa Civil RS
    if (props['estacao_cod'] === 'DCRS-00016') {
      let drsTelemetry = null;
      try {
        if (typeof WeatherService !== 'undefined' && WeatherService.getCachedTelemetry) {
          drsTelemetry = WeatherService.getCachedTelemetry('DCRS-00016');
        }
        if (!drsTelemetry) {
          const rawLocal = localStorage.getItem('dcrs_last_telemetry_DCRS-00016');
          if (rawLocal) drsTelemetry = JSON.parse(rawLocal);
        }
      } catch {}

      if (drsTelemetry && drsTelemetry.success) {
        props['status_comunicacao'] = drsTelemetry.status === 'updated' ? 'Online (em tempo real)' : (drsTelemetry.status === 'delayed' ? 'Aguardando atualização' : 'Sem comunicação recente');
        props['nivel_rio'] = drsTelemetry.rio?.nivel != null ? `${drsTelemetry.rio.nivel.toFixed(2).replace('.', ',')} m` : 'Dado não disponível';
        const trend = drsTelemetry.rio?.tendencia || 0;
        props['tendencia_rio'] = trend > 0.005 ? 'Subindo ⬆️' : (trend < -0.005 ? 'Descendo ⬇️' : 'Estável ➡️');
        const c1h = drsTelemetry.chuva?.h1 != null ? `${drsTelemetry.chuva.h1.toFixed(1).replace('.', ',')} mm` : '0,0 mm';
        const c24h = drsTelemetry.chuva?.h24 != null ? `${drsTelemetry.chuva.h24.toFixed(1).replace('.', ',')} mm` : '0,0 mm';
        const c120h = drsTelemetry.chuva?.h120 != null ? `${drsTelemetry.chuva.h120.toFixed(1).replace('.', ',')} mm` : null;
        props['chuva_hoje'] = c120h ? `${c1h} (1h) / ${c24h} (24h) • ${c120h} (5d)` : `${c1h} (1h) / ${c24h} (24h)`;
        props['temperatura_atual'] = drsTelemetry.temperatura?.atual != null ? `${drsTelemetry.temperatura.atual.toFixed(1).replace('.', ',')} °C` : '--';
        if (drsTelemetry.timestamp) {
          try {
            const dt = new Date(drsTelemetry.timestamp);
            const pad = (n) => String(n).padStart(2, '0');
            props['ultima_atualizacao'] = `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} às ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
          } catch {}
        }
      } else if (typeof WeatherService !== 'undefined' && WeatherService.fetchDefesaCivilRSTelemetry) {
        WeatherService.fetchDefesaCivilRSTelemetry('DCRS-00016').then(liveData => {
          if (liveData && liveData.success) {
            this.renderCurrentFeature();
          }
        }).catch(() => {});
      }
    }

    // 5. Build Attribute Rows
    let rowsHtml = '';
    const fieldsToRender = pConfig.fields || Object.keys(props).filter(k => !k.startsWith('_') && k !== 'geometry').map(k => ({ key: k, label: k }));

    fieldsToRender.forEach(field => {
      let val = props[field.key];
      
      // Se for o campo de distância e estiver vazio, calcular sob demanda
      if ((field.key === 'dist_rio_m' || field.format === 'distance_m') && (val === undefined || val === null || val === '')) {
        const computed = this.computeDistanceToRio(feature);
        if (computed !== null) {
          val = computed;
          props['dist_rio_m'] = computed;
        }
      }

      if (val === undefined || val === null || val === '') {
        if (field.defaultValue !== undefined) {
          val = field.defaultValue;
        } else {
          return;
        }
      }

      // Destaque visual para Distância até a calha do Rio Passo Fundo (1 casa decimal)
      if (field.key === 'dist_rio_m' || field.format === 'distance_m') {
        const num = parseFloat(val);
        const distStr = !isNaN(num) ? `${formatNumber(num, 1)} m` : escapeHtml(String(val));
        rowsHtml += `
          <tr style="background: rgba(234, 88, 12, 0.15); border-left: 3px solid #ea580c;">
            <th style="color: #fdba74; font-weight: 700;">${escapeHtml(field.label)}</th>
            <td style="font-weight: 800; color: #ffffff; font-size: 13px;">
              <span style="background: #ea580c; color: #ffffff; padding: 2px 8px; border-radius: 4px; display: inline-block;">${distStr}</span>
            </td>
          </tr>
        `;
        return;
      }

      // Destaque para Faixa de Risco
      if (field.key === 'faixa_dist') {
        rowsHtml += `
          <tr style="background: rgba(245, 158, 11, 0.10);">
            <th style="color: #fcd34d; font-weight: 700;">${escapeHtml(field.label)}</th>
            <td style="font-weight: 700; color: #fef08a;">${escapeHtml(String(val))}</td>
          </tr>
        `;
        return;
      }

      let formattedVal = escapeHtml(String(val));

      if (field.format === 'number') {
        const num = parseFloat(val);
        if (!isNaN(num)) formattedVal = formatNumber(num);
      } else if (field.format === 'currency') {
        const num = parseFloat(val);
        if (!isNaN(num)) formattedVal = `R$ ${formatNumber(num, 2)}`;
      } else if (field.format === 'area') {
        const num = parseFloat(val);
        if (!isNaN(num)) formattedVal = formatArea(num);
      } else if (field.format === 'distance') {
        const num = parseFloat(val);
        if (!isNaN(num)) formattedVal = formatDistance(num);
      }

      rowsHtml += `
        <tr>
          <th>${escapeHtml(field.label)}</th>
          <td>${formattedVal}</td>
        </tr>
      `;
    });

    // 4.9. Contexto Climático Mensal: Se a camada de superfície climática mensal estiver ativa e for estação Plugfield
    let climateMonthlyCardHtml = '';
    if (props['deviceId']) {
      const devId = parseInt(props['deviceId'], 10);
      const climateEngine = window.webGis?.climateMapsUI?.climateEngine;
      const climateResult = climateEngine?.currentResult;

      if (climateEngine?.climateLayer?.getVisible() && climateResult && climateResult.scale === 'mensal') {
        const auditItem = climateResult.allStationAudit?.find(s => s.deviceId === devId);
        const validItem = climateResult.validStations?.find(s => s.deviceId === devId);
        const stName = props['nome_estacao'] || props['name'] || `Estação ${devId}`;
        const isPrecip = climateResult.variable === 'precipitacao';

        if (isPrecip) {
          if (auditItem && auditItem.participates && auditItem.precipMonthlyTotal !== null) {
            const valFormatted = auditItem.precipMonthlyTotal.toFixed(2).replace('.', ',');
            const compFormatted = auditItem.completenessPercent.toFixed(2).replace('.', ',');
            climateMonthlyCardHtml = `
              <div style="background: linear-gradient(135deg, rgba(2, 132, 199, 0.16), rgba(15, 23, 42, 0.95)); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom: 6px;">
                  <span style="font-size:16px;">🌧️</span>
                  <strong style="color:#38bdf8; font-size:13px;">Estação Meteorológica — ${escapeHtml(stName)}</strong>
                </div>
                <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">
                  Precipitação acumulada mensal: <span style="color:#38bdf8;">${valFormatted} mm</span>
                </div>
                <div style="display:grid; grid-template-columns: 1fr; gap:3px; font-size: 11px; color:#cbd5e1;">
                  <div>📅 <strong>Período:</strong> ${climateResult.periodLabel}</div>
                  <div>📊 <strong>Dias válidos:</strong> ${auditItem.validDaysCount}/${auditItem.daysInMonth}</div>
                  <div>📈 <strong>Completude:</strong> ${compFormatted}% <span style="color:#4ade80; font-weight:700;">(Aprovada ≥ 95%)</span></div>
                  <div style="margin-top:4px; font-size:10px; color:#94a3b8; font-style:italic;">
                    ℹ️ Fonte: dados observados pelas estações Plugfield (Precipitação Mensal Derivada).
                  </div>
                </div>
              </div>
            `;
          } else if (auditItem && !auditItem.participates) {
            const compFormatted = auditItem.completenessPercent.toFixed(2).replace('.', ',');
            climateMonthlyCardHtml = `
              <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom: 4px;">
                  <span style="font-size:15px;">⚠️</span>
                  <strong style="color:#f87171; font-size:12px;">Estação Meteorológica — ${escapeHtml(stName)}</strong>
                </div>
                <div style="font-size: 11px; color: #cbd5e1;">
                  <div>📅 <strong>Período:</strong> ${climateResult.periodLabel}</div>
                  <div>📊 <strong>Dias válidos:</strong> ${auditItem.validDaysCount}/${auditItem.daysInMonth} (Completude: ${compFormatted}%)</div>
                  <div style="color:#fca5a5; margin-top:4px; font-weight:600;">
                    🚫 Excluída logicamente da espacialização mensal por insuficiência de dados válidos (&lt; 95%).
                  </div>
                </div>
              </div>
            `;
          }
        } else {
          if (auditItem && auditItem.participates && auditItem.tempMonthlyMean !== null) {
            const meanFormatted = auditItem.tempMonthlyMean.toFixed(2).replace('.', ',');
            const compFormatted = auditItem.completenessPercent.toFixed(2).replace('.', ',');
            climateMonthlyCardHtml = `
              <div style="background: linear-gradient(135deg, rgba(2, 132, 199, 0.16), rgba(15, 23, 42, 0.95)); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom: 6px;">
                  <span style="font-size:16px;">🌡️</span>
                  <strong style="color:#38bdf8; font-size:13px;">Estação Meteorológica — ${escapeHtml(stName)}</strong>
                </div>
                <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">
                  Temperatura média mensal: <span style="color:#fdba74;">${meanFormatted} °C</span>
                </div>
                <div style="display:grid; grid-template-columns: 1fr; gap:3px; font-size: 11px; color:#cbd5e1;">
                  <div>📅 <strong>Período:</strong> ${climateResult.periodLabel}</div>
                  <div>📊 <strong>Dias válidos:</strong> ${auditItem.validDaysCount}/${auditItem.daysInMonth}</div>
                  <div>📈 <strong>Completude:</strong> ${compFormatted}% <span style="color:#4ade80; font-weight:700;">(Aprovada ≥ 90%)</span></div>
                  <div style="margin-top:4px; font-size:10px; color:#94a3b8; font-style:italic;">
                    ℹ️ Fonte: dados observados pelas estações Plugfield (Média Mensal Derivada).
                  </div>
                </div>
              </div>
            `;
          } else if (auditItem && !auditItem.participates) {
            const compFormatted = auditItem.completenessPercent.toFixed(2).replace('.', ',');
            climateMonthlyCardHtml = `
              <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom: 4px;">
                  <span style="font-size:15px;">⚠️</span>
                  <strong style="color:#f87171; font-size:12px;">Estação Meteorológica — ${escapeHtml(stName)}</strong>
                </div>
                <div style="font-size: 11px; color: #cbd5e1;">
                  <div>📅 <strong>Período:</strong> ${climateResult.periodLabel}</div>
                  <div>📊 <strong>Dias válidos:</strong> ${auditItem.validDaysCount}/${auditItem.daysInMonth} (Completude: ${compFormatted}%)</div>
                  <div style="color:#fca5a5; margin-top:4px; font-weight:600;">
                    🚫 Excluída logicamente da espacialização mensal por insuficiência de dados válidos (&lt; 90%).
                  </div>
                </div>
              </div>
            `;
          }
        }
      }
    }

    // 5. Build HTML
    this.contentEl.innerHTML = `
      <div class="popup-header">
        ${paginationHtml}
        <div class="popup-layer-tag ${tagClass}">
          <i class="lucide-layers" style="font-size:10px;"></i>
          <span>${escapeHtml(layerConfig.name)}</span>
        </div>
        <div class="popup-title">${escapeHtml(title)}</div>
      </div>
      
      <div class="popup-body">
        ${climateMonthlyCardHtml}
        <table class="popup-props-table">
          <tbody>
            ${rowsHtml || '<tr><td colspan="2" style="color:var(--text-muted);">Sem atributos adicionais.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="popup-actions">
        ${(props['estacao_cod'] === 'DCRS-00016' || props['deviceId']) ? `
          <button class="popup-action-btn" id="btn-popup-view-weather" style="background: rgba(2, 132, 199, 0.22); color: #38bdf8; border-color: #0284c7; font-weight:700;" title="Ver monitoramento na Central Meteorológica">
            <i class="lucide-activity"></i> Ver Central
          </button>
        ` : ''}
        <button class="popup-action-btn" id="btn-popup-zoom" title="Aproximar para esta feição">
          <i class="lucide-zoom-in"></i> Zoom
        </button>
        <button class="popup-action-btn" id="btn-popup-streetview" title="Visualizar no Google Street View">
          <i class="lucide-eye"></i> Street View
        </button>
        <button class="popup-action-btn" id="btn-popup-copy" title="Copiar informações para a área de transferência">
          <i class="lucide-copy"></i> Copiar
        </button>
      </div>
    `;

    // Highlight current feature
    this.mapEngine.setHighlight(feature);

    // Bind Pagination Buttons
    const prevBtn = this.contentEl.querySelector('#btn-popup-prev');
    const nextBtn = this.contentEl.querySelector('#btn-popup-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.currentIndex > 0) {
          this.currentIndex--;
          this.renderCurrentFeature();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.currentIndex < this.featureList.length - 1) {
          this.currentIndex++;
          this.renderCurrentFeature();
        }
      });
    }

    // Bind Action Buttons
    const weatherBtn = this.contentEl.querySelector('#btn-popup-view-weather');
    if (weatherBtn) {
      weatherBtn.addEventListener('click', () => {
        if (window.webGis && window.webGis.sidebarUI) {
          window.webGis.sidebarUI.switchTab('weather');
        } else if (window.sidebarUI) {
          window.sidebarUI.switchTab('weather');
        }
        if (props['deviceId'] && window.webGis && window.webGis.weatherUI) {
          window.webGis.weatherUI.switchSubTab('plugfield');
          window.webGis.weatherUI.selectPlugfieldStation(props['deviceId']);
        }
      });
    }

    const zoomBtn = this.contentEl.querySelector('#btn-popup-zoom');
    if (zoomBtn) {
      zoomBtn.addEventListener('click', () => {
        const geom = feature.getGeometry();
        this.mapEngine.zoomTo(geom.getExtent(), { maxZoom: geom.getType() === 'Point' ? 16 : 15 });
      });
    }

    const svBtn = this.contentEl.querySelector('#btn-popup-streetview');
    if (svBtn) {
      svBtn.addEventListener('click', () => {
        if (this.lastCoordinate) {
          const lonLat = ol.proj.toLonLat(this.lastCoordinate);
          const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lonLat[1]},${lonLat[0]}`;
          window.open(url, '_blank');
        }
      });
    }

    const copyBtn = this.contentEl.querySelector('#btn-popup-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const summary = `${layerConfig.name} - ${title}\n` + 
          fieldsToRender.map(f => `${f.label}: ${props[f.key] || '-'}`).join('\n');
        navigator.clipboard.writeText(summary).then(() => {
          Notification.success('Atributos copiados com sucesso!');
        });
      });
    }
  }

  /**
   * Calcula a menor distância métrica (SIRGAS 2000 UTM 22S) entre o ponto da residência
   * e a geometria principal do Rio Passo Fundo
   */
  computeDistanceToRio(feature) {
    try {
      const geom = feature.getGeometry();
      if (!geom) return null;
      let ptCoord;
      if (geom.getType() === 'Point') {
        ptCoord = geom.getCoordinates();
      } else {
        const extent = geom.getExtent();
        ptCoord = [ (extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2 ];
      }
      
      const rioLayer = this.layerManager ? this.layerManager.getLayer('rio_passo_fundo') : null;
      if (!rioLayer) return null;
      const rioFeatures = rioLayer.getSource().getFeatures();
      if (!rioFeatures || rioFeatures.length === 0) return null;

      let minDist = Infinity;
      for (const rf of rioFeatures) {
        const rGeom = rf.getGeometry();
        if (rGeom && typeof rGeom.getClosestPoint === 'function') {
          const closestPt = rGeom.getClosestPoint(ptCoord);
          const d = Math.hypot(ptCoord[0] - closestPt[0], ptCoord[1] - closestPt[1]);
          if (d < minDist) {
            minDist = d;
          }
        }
      }
      return minDist !== Infinity ? Math.round(minDist * 10) / 10 : null;
    } catch (e) {
      console.warn('[PopupUI] Erro ao calcular distância geométrica até o rio:', e);
      return null;
    }
  }
}
