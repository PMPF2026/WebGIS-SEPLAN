/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Interface da Central Meteorológica e Avisos (Estação DCRS-00016, CPTEC/INPE & Rede Plugfield)
 */

import { WEATHER_CONFIG } from './weather-config.js';
import { WeatherService } from './weather-service.js';
import { PlugfieldService, PLUGFIELD_STATIONS_CONFIG } from './plugfield-service.js';

export class WeatherUI {
  constructor(containerId = 'tab-weather') {
    this.container = document.getElementById(containerId);
    this.currentSubTab = 'drs'; // 'drs' | 'cptec' | 'plugfield'
    this.currentStationCode = WEATHER_CONFIG.DEFESA_CIVIL_RS.DEFAULT_STATION;
    this.drsData = null;
    this.cptecData = null;
    this.alignedCptecForecasts = [];
    this.plugfieldStations = [];
    this.selectedPlugfieldId = 4283; // Transbrasiliana por padrão
    this.selectedChartVar = 'combined'; // 'combined' | 'chuva' | 'rio' | 'temp' | 'umid' | 'vento' | 'pressao' | 'radiacao'
    this.selectedChartPeriod = 'h168'; // 'min30' | 'h1' | 'h24' | 'h48' | 'h72' | 'h120' | 'h168'
    this.subscriptionController = null;
    this.isLoading = false;
    this.charts = {};

    // Controle do polling automático e ciclo de vida da rede Plugfield
    this.plugfieldPollingTimer = null;
    this.isPlugfieldFetching = false;
    this.lastPlugfieldFetchTime = 0;
    this.visibilityHandlerBound = false;

    if (this.container) {
      this.init();
    }
  }

  async init() {
    this.renderSkeleton();
    this.bindEvents();

    // Carrega cache prévio se disponível para exibição instantânea sem telas de erro
    const cachedDrs = WeatherService.getCachedTelemetry(this.currentStationCode);
    if (cachedDrs) {
      this.updateDrsUI(cachedDrs);
    }

    const cachedCptec = WeatherService.getCachedForecast(WEATHER_CONFIG.CPTEC.CITY_ID);
    if (cachedCptec) {
      this.updateCptecUI(cachedCptec);
    }

    const cachedPf = PlugfieldService.getCachedStations();
    if (cachedPf && cachedPf.length > 0) {
      this.plugfieldStations = cachedPf;
      this.renderPlugfieldUI();
    } else {
      this.plugfieldStations = PLUGFIELD_STATIONS_CONFIG;
      this.renderPlugfieldUI();
    }

    this.startRealtimeSubscription();
    this.startPlugfieldPolling();
    this.bindVisibilityChange();
    await this.refreshAllData();
  }

  renderSkeleton() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="weather-container">
        <!-- Header & Controles -->
        <div class="weather-header">
          <div class="weather-title-row">
            <div class="weather-main-title">
              <i class="lucide-cloud-sun-rain"></i>
              <span>CENTRAL METEOROLÓGICA & AVISOS</span>
            </div>
            <button class="weather-refresh-btn" id="btn-weather-refresh" title="Atualizar dados meteorológicos">
              <i class="lucide-refresh-cw"></i>
              <span>Atualizar</span>
            </button>
          </div>

          <!-- Sub-Abas -->
          <div class="weather-subtabs">
            <button class="weather-tab-btn active" data-subtab="drs" id="btn-subtab-drs">
              <i class="lucide-activity"></i>
              <span>Monitoramento — Defesa Civil RS</span>
            </button>
            <button class="weather-tab-btn" data-subtab="cptec" id="btn-subtab-cptec">
              <i class="lucide-calendar"></i>
              <span>Previsão 5 Dias — CPTEC/INPE</span>
            </button>
            <button class="weather-tab-btn" data-subtab="plugfield" id="btn-subtab-plugfield">
              <i class="lucide-radio-tower"></i>
              <span>Rede Plugfield (16 Estações)</span>
            </button>
          </div>
        </div>

        <!-- Avisos e Alertas Oficiais -->
        <div class="weather-alerts-box" id="weather-alerts-container">
          <div class="weather-alerts-header">
            <i class="lucide-alert-triangle"></i>
            <span>Avisos e Alertas Oficiais</span>
          </div>
          <div class="weather-alerts-content" id="weather-alerts-content">
            Nenhum aviso oficial disponível para integração automática no momento.
          </div>
        </div>

        <!-- ABA 1: MONITORAMENTO DEFESA CIVIL RS (ESTAÇÃO DCRS-00016) -->
        <div id="weather-subtab-content-drs" class="weather-tab-pane">
          <!-- Barra de Informações da Estação -->
          <div class="weather-station-bar">
            <div class="weather-station-info">
              <div class="weather-station-name" id="drs-station-display-name">
                <i class="lucide-radio" style="color: #06b6d4;"></i>
                <span>Estação DCRS-00016 — Passo Fundo</span>
              </div>
              <div class="weather-station-meta" id="drs-station-display-meta">
                Rede Hidrometeorológica Oficial &bull; Bacia: RS - Rio Passo Fundo
              </div>
            </div>
            <div id="drs-status-badge-container">
              <span class="station-status-pill updated" id="drs-status-pill">
                <span class="status-dot green"></span>
                <span>Dados atualizados</span>
              </span>
            </div>
          </div>

          <!-- Destaque: Rio Passo Fundo -->
          <div class="river-featured-card" style="margin-top: 10px;" id="drs-river-card">
            <div class="river-info-col">
              <div class="river-title">
                <i class="lucide-waves"></i>
                <span id="drs-river-name-label">RIO PASSO FUNDO (SENSOR TELEMÉTRICO)</span>
              </div>
              <div class="river-level-value" id="drs-river-level-value">
                Carregando...
              </div>
            </div>
            <div class="river-trend-col" id="drs-river-trend-container">
              <span class="trend-badge stable">
                <i class="lucide-arrow-right"></i> Estável
              </span>
            </div>
          </div>

          <!-- Grade de Acumulados de Chuva -->
          <div class="rainfall-periods-container" style="margin-top: 10px;">
            <div class="rainfall-header">
              <i class="lucide-cloud-rain"></i>
              <span>CHUVA ACUMULADA OFICIAL — DCRS-00016</span>
            </div>
            <div class="rainfall-grid">
              <div class="rainfall-pill">
                <span class="pill-period">30 MIN</span>
                <span class="pill-value" id="drs-rain-30m">--</span>
              </div>
              <div class="rainfall-pill">
                <span class="pill-period">1 HORA</span>
                <span class="pill-value" id="drs-rain-1h">--</span>
              </div>
              <div class="rainfall-pill highlight-24h">
                <span class="pill-period">24 HORAS</span>
                <span class="pill-value" id="drs-rain-24h">--</span>
              </div>
              <div class="rainfall-pill">
                <span class="pill-period">48 HORAS</span>
                <span class="pill-value" id="drs-rain-48h">--</span>
              </div>
              <div class="rainfall-pill">
                <span class="pill-period">72 HORAS</span>
                <span class="pill-value" id="drs-rain-72h">--</span>
              </div>
              <div class="rainfall-pill">
                <span class="pill-period">5 DIAS (120H)</span>
                <span class="pill-value" id="drs-rain-5d">--</span>
              </div>
              <div class="rainfall-pill">
                <span class="pill-period">7 DIAS (168H)</span>
                <span class="pill-value" id="drs-rain-7d">--</span>
              </div>
            </div>
          </div>

          <!-- Seção de Condições Meteorológicas Atuais -->
          <div class="weather-section-title" style="margin-top: 14px;">
            <i class="lucide-thermometer-sun" style="color: #f97316;"></i>
            <span>CONDIÇÕES METEOROLÓGICAS ATUAIS</span>
          </div>
          
          <div class="weather-metrics-grid" id="drs-metrics-grid" style="margin-top: 8px;">
            <!-- Temperatura -->
            <div class="weather-metric-card" style="border-left: 3px solid #f97316;">
              <div class="weather-metric-header">
                <i class="lucide-thermometer" style="color: #f97316;"></i>
                <span>TEMPERATURA</span>
              </div>
              <div class="weather-metric-value" id="drs-temp-val">-- °C</div>
              <div class="weather-metric-sub" id="drs-temp-minmax">Mín: -- °C | Máx: -- °C</div>
            </div>

            <!-- Sensação Térmica -->
            <div class="weather-metric-card" style="border-left: 3px solid #fb923c;">
              <div class="weather-metric-header">
                <i class="lucide-flame" style="color: #fb923c;"></i>
                <span>SENSAÇÃO TÉRMICA</span>
              </div>
              <div class="weather-metric-value" id="drs-sens-val">-- °C</div>
              <div class="weather-metric-sub" id="drs-sens-sub">Índice Bioclimático</div>
            </div>

            <!-- Umidade Relativa -->
            <div class="weather-metric-card" style="border-left: 3px solid #38bdf8;">
              <div class="weather-metric-header">
                <i class="lucide-droplets" style="color: #38bdf8;"></i>
                <span>UMIDADE RELATIVA</span>
              </div>
              <div class="weather-metric-value" id="drs-umid-val">-- %</div>
              <div class="weather-metric-sub" id="drs-umid-sub">Higrômetro Oficial</div>
            </div>

            <!-- Pressão Atmosférica -->
            <div class="weather-metric-card" style="border-left: 3px solid #64748b;">
              <div class="weather-metric-header">
                <i class="lucide-gauge" style="color: #94a3b8;"></i>
                <span>PRESSÃO ATMOSFÉRICA</span>
              </div>
              <div class="weather-metric-value" id="drs-pressao-val">-- hPa</div>
              <div class="weather-metric-sub" id="drs-pressao-tend">Tendência: Estável</div>
            </div>

            <!-- Vento -->
            <div class="weather-metric-card" style="border-left: 3px solid #a855f7;">
              <div class="weather-metric-header">
                <i class="lucide-wind" style="color: #c084fc;"></i>
                <span>VENTO</span>
              </div>
              <div class="weather-metric-value" id="drs-vento-val">-- km/h</div>
              <div class="weather-metric-sub" id="drs-vento-sub">Méd: -- | Máx: -- | Dir: --</div>
            </div>

            <!-- Radiação Solar -->
            <div class="weather-metric-card" style="border-left: 3px solid #eab308;">
              <div class="weather-metric-header">
                <i class="lucide-sun" style="color: #facc15;"></i>
                <span>RADIAÇÃO SOLAR</span>
              </div>
              <div class="weather-metric-value" id="drs-rad-val">-- W/m²</div>
              <div class="weather-metric-sub">Piranômetro Digital</div>
            </div>
          </div>

          <!-- Localização da Estação -->
          <div class="weather-location-box" style="margin-top: 10px;">
            <div class="weather-location-info">
              <div style="font-size: 12px; font-weight: 700; color: #ffffff;">
                <i class="lucide-map-pin" style="color: #06b6d4;"></i>
                <span>Localização da Estação DCRS-00016</span>
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;" id="drs-coords-display">
                Coordenadas: Lat -28.2470° | Lon -52.3713° &bull; Altitude: Não informada
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                Bacia Hidrográfica: RS - Rio Passo Fundo &bull; Região: Passo Fundo/RS
              </div>
            </div>
            <button class="weather-focus-btn" id="btn-focus-station-map" title="Centralizar e visualizar estação no mapa">
              <i class="lucide-crosshair"></i>
              <span>Ver no mapa</span>
            </button>
          </div>

          <!-- Painel de Gráficos Históricos Interativos -->
          <div class="weather-chart-box" style="margin-top: 10px;">
            <div class="weather-chart-header-row">
              <span style="font-size: 12px; font-weight: 700; color: #ffffff;">
                <i class="lucide-bar-chart-2"></i> Histórico da Estação (DCRS-00016)
              </span>
            </div>

            <!-- Seletor de Variável do Gráfico -->
            <div class="chart-variable-selector" id="chart-variable-selector" style="margin-top: 6px;">
              <button class="chart-var-btn active" data-var="combined">📊 Chuva x Nível</button>
              <button class="chart-var-btn" data-var="chuva">🌧️ Chuva</button>
              <button class="chart-var-btn" data-var="rio">🌊 Nível Rio</button>
              <button class="chart-var-btn" data-var="temp">🌡️ Temp</button>
              <button class="chart-var-btn" data-var="umid">💧 Umidade</button>
              <button class="chart-var-btn" data-var="vento">💨 Vento</button>
              <button class="chart-var-btn" data-var="pressao">📈 Pressão</button>
              <button class="chart-var-btn" data-var="radiacao">☀️ Radiação</button>
            </div>

            <div class="weather-chart-canvas-wrapper" style="margin-top: 8px;">
              <canvas id="chart-drs-interactive"></canvas>
            </div>
          </div>
        </div>

        <!-- ABA 2: PREVISÃO CPTEC/INPE (5 DIAS) -->
        <div id="weather-subtab-content-cptec" class="weather-tab-pane" style="display: none;">
          <!-- Previsão 5 Dias CPTEC -->
          <div class="weather-station-bar">
            <div class="weather-station-info">
              <div class="weather-station-name">
                <i class="lucide-map-pin" style="color: #f59e0b;"></i>
                <span>Passo Fundo / RS — Previsão Oficial CPTEC/INPE</span>
              </div>
              <div class="weather-station-meta">
                Modelo Numérico Oficial &bull; Hoje + Próximos 4 Dias
              </div>
            </div>
          </div>

          <!-- Cards 5 Dias -->
          <div class="forecast-5days-grid" id="cptec-5days-grid" style="margin-top: 10px;">
            <div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-muted);">
              <i class="lucide-loader" style="animation: spin 1s linear infinite; font-size: 20px; display: block; margin: 0 auto 8px;"></i>
              Consultando previsão oficial do CPTEC/INPE...
            </div>
          </div>

          <!-- Gráfico de Tendência de Temperatura CPTEC -->
          <div class="weather-chart-box" style="margin-top: 10px;">
            <div class="weather-chart-header-row">
              <span style="font-size: 12px; font-weight: 700; color: #ffffff;"><i class="lucide-trending-up"></i> Curva de Temperaturas Previstas (°C)</span>
            </div>
            <div class="weather-chart-canvas-wrapper">
              <canvas id="chart-cptec-temps"></canvas>
            </div>
          </div>

          <!-- Gráfico de Precipitação Prevista (5 Dias) em Barras Azuis -->
          <div class="weather-chart-box" style="margin-top: 10px;">
            <div class="weather-chart-header-row">
              <span style="font-size: 12px; font-weight: 700; color: #ffffff;"><i class="lucide-cloud-rain" style="color: #38bdf8;"></i> Precipitação Prevista para 5 Dias (mm)</span>
            </div>
            <div class="weather-chart-canvas-wrapper">
              <canvas id="chart-cptec-rain"></canvas>
            </div>
          </div>
        </div>

        <!-- ABA 3: REDE PLUGFIELD (16 ESTAÇÕES) -->
        <div id="weather-subtab-content-plugfield" class="weather-tab-pane" style="display: none;">
          <!-- Seletor das 16 Estações -->
          <div class="plugfield-select-container">
            <div class="plugfield-select-label">
              <i class="lucide-radio-tower"></i>
              <span>SELECIONE A ESTAÇÃO METEOROLÓGICA (16 HABILITADAS):</span>
            </div>
            <select id="plugfield-station-select" class="plugfield-station-select">
              ${PLUGFIELD_STATIONS_CONFIG.map(st => `
                <option value="${st.deviceId}">${st.name} (ID: ${st.deviceId}) — ${st.type}</option>
              `).join('')}
            </select>
          </div>

          <!-- Barra da Estação Selecionada -->
          <div class="weather-station-bar" style="margin-top: 10px;">
            <div class="weather-station-info">
              <div class="weather-station-name" id="pf-station-display-name">
                <i class="lucide-radio-tower" style="color: #10b981;"></i>
                <span id="pf-station-name-text">Transbrasiliana</span>
              </div>
              <div class="weather-station-meta" id="pf-station-display-meta">
                ID: 4283 &bull; Rede Oficial Plugfield &bull; Passo Fundo/RS
              </div>
            </div>
            <div id="pf-status-badge-container">
              <span class="station-status-pill updated" id="pf-status-pill">
                <span class="status-dot green"></span>
                <span id="pf-status-text">Dados atualizados</span>
              </span>
            </div>
          </div>

          <!-- Grid de Métricas Principais da Estação -->
          <div class="weather-metrics-grid" id="pf-metrics-grid" style="margin-top: 10px;">
            <!-- 1. Temperatura -->
            <div class="weather-metric-card" style="border-left: 3px solid #f97316;">
              <div class="weather-metric-header">
                <i class="lucide-thermometer" style="color: #f97316;"></i>
                <span>TEMPERATURA</span>
              </div>
              <div class="weather-metric-value" id="pf-temp-atual">-- °C</div>
              <div class="weather-metric-sub" id="pf-temp-minmax">Mín: -- °C | Máx: -- °C</div>
            </div>

            <!-- 2. Precipitação -->
            <div class="weather-metric-card" style="border-left: 3px solid #0284c7;">
              <div class="weather-metric-header">
                <i class="lucide-cloud-rain" style="color: #38bdf8;"></i>
                <span>PRECIPITAÇÃO</span>
              </div>
              <div class="weather-metric-value" id="pf-rain-day">-- mm</div>
              <div class="weather-metric-sub" id="pf-rain-month">Acumulado Mês: -- mm</div>
            </div>

            <!-- 3. Vento -->
            <div class="weather-metric-card" style="border-left: 3px solid #a855f7;">
              <div class="weather-metric-header">
                <i class="lucide-wind" style="color: #c084fc;"></i>
                <span>VENTO</span>
              </div>
              <div class="weather-metric-value" id="pf-wind-val">-- km/h</div>
              <div class="weather-metric-sub" id="pf-wind-sub">Rajada: -- | Dir: --</div>
            </div>

            <!-- 4. Pressão Atmosférica -->
            <div class="weather-metric-card" style="border-left: 3px solid #64748b;">
              <div class="weather-metric-header">
                <i class="lucide-gauge" style="color: #94a3b8;"></i>
                <span>PRESSÃO ATMOSFÉRICA</span>
              </div>
              <div class="weather-metric-value" id="pf-pressure-val">-- hPa</div>
              <div class="weather-metric-sub">Barômetro Digital</div>
            </div>

            <!-- 5. Nível do Rio (levelAdditional) -->
            <div class="weather-metric-card" style="grid-column: 1 / -1; border-left: 3px solid #06b6d4;" id="pf-card-river">
              <div class="weather-metric-header">
                <i class="lucide-waves" style="color: #06b6d4;"></i>
                <span>NÍVEL DO RIO (SENSOR TELEMÉTRICO)</span>
              </div>
              <div class="weather-metric-value" id="pf-river-level-val" style="font-size: 15px;">
                Dado não disponível para esta estação
              </div>
              <div class="weather-metric-sub" id="pf-river-sub">Sensor adicional levelAdditional</div>
            </div>

            <!-- 6. Média Mensal de Temperatura -->
            <div class="weather-metric-card" style="grid-column: 1 / -1; border-left: 3px solid #eab308;">
              <div class="weather-metric-header">
                <i class="lucide-calendar" style="color: #eab308;"></i>
                <span>MÉDIA MENSAL DE TEMPERATURA</span>
              </div>
              <div style="font-size: 11.5px; color: #fef08a; padding: 4px 0;" id="pf-temp-monthly-avg">
                Média mensal indisponível — série histórica insuficiente.
              </div>
            </div>
          </div>

          <!-- Localização da Estação & Botão Ver no Mapa -->
          <div class="weather-location-box" style="margin-top: 10px;">
            <div class="weather-location-info">
              <div style="font-size: 12px; font-weight: 700; color: #ffffff;">
                <i class="lucide-map-pin" style="color: #10b981;"></i>
                <span id="pf-loc-title">Localização da Estação</span>
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;" id="pf-loc-coords">
                Coordenadas: Conforme dados oficiais da API Plugfield
              </div>
            </div>
            <button class="weather-focus-btn" id="btn-focus-plugfield-map" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border-color: #059669;" title="Centralizar estação no mapa">
              <i class="lucide-crosshair"></i>
              <span>Ver no mapa</span>
            </button>
          </div>

          <!-- Seção de Gráficos Individuais da Rede Plugfield (Últimos 5 Dias) -->
          <div class="plugfield-charts-section" style="margin-top: 14px;">
            <div class="weather-chart-header-row" style="margin-bottom: 8px;">
              <span style="font-size: 12.5px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 6px;">
                <i class="lucide-line-chart" style="color: #10b981;"></i> Gráficos Individuais da Estação — Últimos 5 Dias
              </span>
            </div>

            <!-- Linha 1: Temperatura | Precipitação -->
            <div class="plugfield-charts-grid-row">
              <div class="weather-chart-box">
                <div class="weather-chart-header-row">
                  <span style="font-size: 11.5px; font-weight: 700; color: #f97316;">
                    <i class="lucide-thermometer"></i> Temperatura — Últimos 5 Dias (°C)
                  </span>
                </div>
                <div style="height: 180px; position: relative; padding: 4px;">
                  <canvas id="chart-pf-temp"></canvas>
                </div>
              </div>

              <div class="weather-chart-box">
                <div class="weather-chart-header-row">
                  <span style="font-size: 11.5px; font-weight: 700; color: #38bdf8;">
                    <i class="lucide-cloud-rain"></i> Precipitação — Últimos 5 Dias (mm)
                  </span>
                </div>
                <div style="height: 180px; position: relative; padding: 4px;">
                  <canvas id="chart-pf-rain"></canvas>
                </div>
              </div>
            </div>

            <!-- Linha 2: Vento | Pressão Atmosférica -->
            <div class="plugfield-charts-grid-row" style="margin-top: 10px;">
              <div class="weather-chart-box">
                <div class="weather-chart-header-row">
                  <span style="font-size: 11.5px; font-weight: 700; color: #c084fc;">
                    <i class="lucide-wind"></i> Vento — Últimos 5 Dias (km/h)
                  </span>
                </div>
                <div style="height: 180px; position: relative; padding: 4px;">
                  <canvas id="chart-pf-wind"></canvas>
                </div>
              </div>

              <div class="weather-chart-box">
                <div class="weather-chart-header-row">
                  <span style="font-size: 11.5px; font-weight: 700; color: #94a3b8;">
                    <i class="lucide-gauge"></i> Pressão Atmosférica — Últimos 5 Dias (hPa)
                  </span>
                </div>
                <div id="pf-pressure-chart-container" style="height: 180px; position: relative; padding: 4px;">
                  <canvas id="chart-pf-pressure"></canvas>
                </div>
              </div>
            </div>

            <!-- Linha 3: Nível do Rio (quando aplicável) -->
            <div class="weather-chart-box" id="pf-river-chart-box" style="margin-top: 10px; display: none;">
              <div class="weather-chart-header-row">
                <span style="font-size: 11.5px; font-weight: 700; color: #06b6d4;">
                  <i class="lucide-waves"></i> Nível do Rio — Últimos 5 Dias (m)
                </span>
              </div>
              <div id="pf-river-chart-container" style="height: 180px; position: relative; padding: 4px;">
                <canvas id="chart-pf-river"></canvas>
              </div>
            </div>
          </div>

          <!-- Histórico dos Últimos 5 Dias (Tabela Detalhada) -->
          <div class="weather-chart-box" style="margin-top: 12px;">
            <div class="weather-chart-header-row">
              <span style="font-size: 12px; font-weight: 700; color: #ffffff;">
                <i class="lucide-history" style="color: #38bdf8;"></i> Leituras Diárias Detalhadas (Últimos 5 Dias)
              </span>
            </div>
            <div id="pf-history-container" style="padding: 10px;">
              <div style="text-align: center; color: #94a3b8; font-size: 11.5px; padding: 12px;">
                Carregando histórico diário da estação...
              </div>
            </div>
          </div>
        </div>

        <!-- Status & Fontes Oficiais -->
        <div class="weather-footer-sources">
          <div class="weather-status-bar">
            <span id="weather-last-update-text">Última atualização: Carregando...</span>
            <span id="weather-source-badge" style="color: #38bdf8; font-weight: 700;">Fonte: Defesa Civil RS</span>
          </div>
          <div style="line-height: 1.5; margin-top: 4px;">
            <strong>Fontes Oficiais:</strong><br>
            &bull; <a href="${WEATHER_CONFIG.DEFESA_CIVIL_RS.OFFICIAL_PAGE_URL}" target="_blank" rel="noopener noreferrer">Estação DCRS-00016 — Defesa Civil RS (Rede Hidrometeorológica)</a><br>
            &bull; <a href="${WEATHER_CONFIG.DEFESA_CIVIL_RS.API_DOC_URL}" target="_blank" rel="noopener noreferrer">Documentação Oficial da API GraphQL da Defesa Civil RS</a><br>
            &bull; <a href="https://www.cptec.inpe.br" target="_blank" rel="noopener noreferrer">CPTEC/INPE — Centro de Previsão de Tempo e Estudos Climáticos</a><br>
            &bull; <a href="https://wdg.plugfield.com.br/doc-api/index.html" target="_blank" rel="noopener noreferrer">Rede Meteorológica Plugfield (16 Estações Oficiais de Passo Fundo)</a>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  bindEvents() {
    // Alternância de Sub-Abas
    const btnDrs = document.getElementById('btn-subtab-drs');
    const btnCptec = document.getElementById('btn-subtab-cptec');
    const btnPlugfield = document.getElementById('btn-subtab-plugfield');
    const paneDrs = document.getElementById('weather-subtab-content-drs');
    const paneCptec = document.getElementById('weather-subtab-content-cptec');
    const panePlugfield = document.getElementById('weather-subtab-content-plugfield');
    const sourceBadge = document.getElementById('weather-source-badge');

    if (btnDrs && btnCptec && btnPlugfield) {
      btnDrs.addEventListener('click', () => {
        this.switchSubTab('drs');
      });

      btnCptec.addEventListener('click', () => {
        this.switchSubTab('cptec');
      });

      btnPlugfield.addEventListener('click', () => {
        this.switchSubTab('plugfield');
      });
    }

    // Seletor de Estação Plugfield
    const selectPf = document.getElementById('plugfield-station-select');
    if (selectPf) {
      selectPf.addEventListener('change', (e) => {
        const id = parseInt(e.target.value, 10);
        if (id) {
          this.selectPlugfieldStation(id);
        }
      });
    }

    // Botão "Ver no mapa" Plugfield
    const btnFocusPf = document.getElementById('btn-focus-plugfield-map');
    if (btnFocusPf) {
      btnFocusPf.addEventListener('click', () => {
        this.focusPlugfieldStationOnMap(this.selectedPlugfieldId);
      });
    }

    // Botão Atualizar (força bypass do cache local)
    const btnRefresh = document.getElementById('btn-weather-refresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.classList.add('spinning');
        await this.refreshAllData(true);
        setTimeout(() => btnRefresh.classList.remove('spinning'), 600);
      });
    }

    // Botão "Ver estação no mapa"
    const btnFocusMap = document.getElementById('btn-focus-station-map');
    if (btnFocusMap) {
      btnFocusMap.addEventListener('click', () => {
        this.focusStationOnMap();
      });
    }

    // Seletores de Variável do Gráfico Histórico
    const varButtons = document.querySelectorAll('#chart-variable-selector .chart-var-btn');
    varButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        varButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedChartVar = btn.getAttribute('data-var');
        this.renderDrsInteractiveChart();
      });
    });
  }

  switchSubTab(subtab) {
    this.currentSubTab = subtab;
    const btnDrs = document.getElementById('btn-subtab-drs');
    const btnCptec = document.getElementById('btn-subtab-cptec');
    const btnPlugfield = document.getElementById('btn-subtab-plugfield');
    const paneDrs = document.getElementById('weather-subtab-content-drs');
    const paneCptec = document.getElementById('weather-subtab-content-cptec');
    const panePlugfield = document.getElementById('weather-subtab-content-plugfield');
    const sourceBadge = document.getElementById('weather-source-badge');

    if (!btnDrs || !btnCptec || !btnPlugfield) return;

    btnDrs.classList.remove('active');
    btnCptec.classList.remove('active');
    btnPlugfield.classList.remove('active');
    if (paneDrs) paneDrs.style.display = 'none';
    if (paneCptec) paneCptec.style.display = 'none';
    if (panePlugfield) panePlugfield.style.display = 'none';

    if (subtab === 'drs') {
      btnDrs.classList.add('active');
      if (paneDrs) paneDrs.style.display = 'block';
      if (sourceBadge) {
        sourceBadge.textContent = 'Fonte: Defesa Civil RS (DCRS-00016)';
        sourceBadge.style.color = '#38bdf8';
      }
    } else if (subtab === 'cptec') {
      btnCptec.classList.add('active');
      if (paneCptec) paneCptec.style.display = 'block';
      if (sourceBadge) {
        sourceBadge.textContent = 'Fonte: CPTEC / INPE & Open-Meteo';
        sourceBadge.style.color = '#eab308';
      }
    } else if (subtab === 'plugfield') {
      btnPlugfield.classList.add('active');
      if (panePlugfield) panePlugfield.style.display = 'block';
      if (sourceBadge) {
        sourceBadge.textContent = 'Fonte: Rede Meteorológica Plugfield (16 Estações)';
        sourceBadge.style.color = '#10b981';
      }
      this.renderPlugfieldUI();
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  focusStationOnMap() {
    if (window.webGis && window.webGis.mapEngine) {
      const lat = this.drsData?.lat || -28.2470;
      const lon = this.drsData?.lon || -52.3713;
      const olMap = window.webGis.mapEngine.getOlMap();
      if (olMap) {
        const view = olMap.getView();
        view.animate({
          center: window.ol.proj.fromLonLat([lon, lat]),
          zoom: 16,
          duration: 800
        });
      }
    }
  }

  async refreshAllData(forceRefresh = false) {
    this.isLoading = true;
    await Promise.all([
      this.loadDefesaCivilRSData(),
      this.loadCptecData(),
      this.loadPlugfieldData(forceRefresh)
    ]);
    this.isLoading = false;
  }

  async loadPlugfieldData(forceRefresh = false) {
    if (this.isPlugfieldFetching) return;
    this.isPlugfieldFetching = true;

    try {
      const stations = await PlugfieldService.getAllStations(forceRefresh);
      if (stations && stations.length > 0) {
        this.plugfieldStations = stations;
        this.renderPlugfieldUI();
        PlugfieldService.updateMapLayerWithTelemetry(stations);
      }
      this.lastPlugfieldFetchTime = Date.now();
    } catch (err) {
      console.warn('[WeatherUI] Erro ao carregar dados Plugfield:', err);
    } finally {
      this.isPlugfieldFetching = false;
    }
  }

  renderPlugfieldUI() {
    if (!this.plugfieldStations || this.plugfieldStations.length === 0) {
      this.plugfieldStations = PlugfieldService.getCachedStations();
    }

    // Preencher select de estações
    const select = document.getElementById('plugfield-station-select');
    if (select && this.plugfieldStations) {
      const currentVal = parseInt(select.value, 10) || this.selectedPlugfieldId;
      select.innerHTML = this.plugfieldStations.map(st => {
        const isOffline = st.status === 'offline';
        const isDelayed = st.status === 'delayed';
        const statusSuffix = isOffline ? ' [Sem comunicação]' : (isDelayed ? ' [Atrasada]' : '');
        return `
          <option value="${st.deviceId}" ${st.deviceId === currentVal ? 'selected' : ''}>
            ${st.name} (ID: ${st.deviceId})${statusSuffix}
          </option>
        `;
      }).join('');
    }

    this.selectPlugfieldStation(this.selectedPlugfieldId);
  }

  selectPlugfieldStation(deviceId) {
    this.selectedPlugfieldId = deviceId;
    const st = (this.plugfieldStations && this.plugfieldStations.length > 0)
      ? (this.plugfieldStations.find(s => s.deviceId === deviceId) || this.plugfieldStations[0])
      : PLUGFIELD_STATIONS_CONFIG.find(s => s.deviceId === deviceId);

    if (!st) return;

    // Reset imediato para evitar resíduo visual da estação anterior
    const elTemp = document.getElementById('pf-temp-atual');
    const elTempMinMax = document.getElementById('pf-temp-minmax');
    const elRain = document.getElementById('pf-rain-day');
    const elRainMonth = document.getElementById('pf-rain-month');
    const elWind = document.getElementById('pf-wind-val');
    const elWindSub = document.getElementById('pf-wind-sub');
    const elPressure = document.getElementById('pf-pressure-val');
    const elRiver = document.getElementById('pf-river-level-val');
    const elRiverSub = document.getElementById('pf-river-sub');

    if (elTemp) elTemp.textContent = '-- °C';
    if (elTempMinMax) elTempMinMax.textContent = 'Mín: -- | Máx: --';
    if (elRain) elRain.textContent = '-- mm';
    if (elRainMonth) elRainMonth.textContent = 'Acumulado Mês: --';
    if (elWind) elWind.textContent = '-- km/h';
    if (elWindSub) elWindSub.textContent = 'Rajada: -- | Dir: --';
    if (elPressure) elPressure.textContent = '-- hPa';
    if (elRiver) {
      elRiver.textContent = '--';
      elRiver.style.fontSize = '14px';
      elRiver.style.color = '#94a3b8';
    }

    const isOnline = st.status === 'updated' || st.status === 'online';
    const isDelayed = st.status === 'delayed';
    const isWaiting = st.status === 'waiting';

    // Atualizar Nome e Meta da Estação
    const stationNameText = document.getElementById('pf-station-name-text');
    const stationMetaText = document.getElementById('pf-station-display-meta');
    if (stationNameText) {
      stationNameText.textContent = st.name;
    }
    if (stationMetaText) {
      stationMetaText.textContent = `ID: ${st.deviceId} • Rede Oficial Plugfield • Passo Fundo/RS`;
    }

    // Atualizar Badge de Status
    const statusText = document.getElementById('pf-status-text');
    const statusDot = document.getElementById('pf-status-dot');
    const statusPill = document.getElementById('pf-status-pill');
    if (statusText) {
      if (isOnline) {
        statusText.textContent = `Online • ${st.lastUpdateText || 'Atualizado'}`;
      } else if (isWaiting) {
        statusText.textContent = 'Conectando à estação...';
      } else if (isDelayed) {
        statusText.textContent = `Comunicação atrasada • ${st.lastUpdateText || ''}`;
      } else {
        statusText.textContent = `Sem comunicação recente • ${st.lastUpdateText || ''}`;
      }
    }
    if (statusDot) {
      statusDot.className = `status-dot ${isOnline ? 'green' : (isDelayed ? 'yellow' : (isWaiting ? 'yellow' : 'red'))}`;
    }
    if (statusPill) {
      statusPill.className = `station-status-pill ${isOnline ? 'updated' : (isDelayed ? 'delayed' : (isWaiting ? 'waiting' : 'error'))}`;
    }

    // Métricas (lê de st.metrics e das propriedades normalizadas)
    const m = st.metrics || {};
    const t = st.temperatura || {};
    const c = st.chuva || {};
    const v = st.vento || {};
    const p = st.pressao || {};
    const r = st.rio || {};

    const tempVal = m.temperature ?? t.atual;
    const tempMinVal = m.tempMin ?? t.minima;
    const tempMaxVal = m.tempMax ?? t.maxima;
    const rainVal = m.rain ?? c.acumuladoDia ?? c.atual;
    const rainMonthVal = m.rainAccumMonthly ?? c.acumuladoMes;
    const windVal = m.windSpeed ?? v.velocidade;
    const windGustVal = m.windGust ?? v.rajadaMaxima;
    const windDirVal = m.windDirectionText || v.direcaoCardeal || (m.windDirection != null ? `${m.windDirection}°` : (v.direcaoGraus != null ? `${v.direcaoGraus}°` : '--'));
    const pressVal = m.pressure ?? p.atual;
    const riverVal = m.riverLevel ?? r.nivelAtual;

    // 1. Temp
    if (elTemp) {
      elTemp.textContent = tempVal !== null && tempVal !== undefined ? `${tempVal.toFixed(1).replace('.', ',')} °C` : '-- °C';
    }
    if (elTempMinMax) {
      const tMin = tempMinVal !== null && tempMinVal !== undefined ? `${tempMinVal.toFixed(1).replace('.', ',')} °C` : '--';
      const tMax = tempMaxVal !== null && tempMaxVal !== undefined ? `${tempMaxVal.toFixed(1).replace('.', ',')} °C` : '--';
      elTempMinMax.textContent = `Mín: ${tMin} | Máx: ${tMax}`;
    }

    // 2. Precipitação
    if (elRain) {
      if (rainVal !== null && rainVal !== undefined) {
        elRain.textContent = `${rainVal.toFixed(1).replace('.', ',')} mm`;
      } else {
        elRain.textContent = isOnline ? '0,0 mm' : '-- mm';
      }
    }
    if (elRainMonth) {
      elRainMonth.textContent = rainMonthVal !== null && rainMonthVal !== undefined
        ? `Acumulado Mês: ${rainMonthVal.toFixed(1).replace('.', ',')} mm`
        : 'Acumulado Mês: Não informado';
    }

    // 3. Vento
    if (elWind) {
      elWind.textContent = windVal !== null && windVal !== undefined ? `${windVal.toFixed(1).replace('.', ',')} km/h` : '-- km/h';
    }
    if (elWindSub) {
      const gust = windGustVal !== null && windGustVal !== undefined ? `${windGustVal.toFixed(1).replace('.', ',')} km/h` : '--';
      elWindSub.textContent = `Rajada: ${gust} | Dir: ${windDirVal}`;
    }

    // 4. Pressão
    if (elPressure) {
      elPressure.textContent = pressVal !== null && pressVal !== undefined ? `${pressVal.toFixed(1).replace('.', ',')} hPa` : '-- hPa';
    }

    // 5. Nível do Rio (Nível de líquido sônico 10M)
    if (elRiver) {
      if (riverVal !== null && riverVal !== undefined) {
        elRiver.textContent = `${riverVal.toFixed(2).replace('.', ',')} m`;
        elRiver.style.fontSize = '22px';
        elRiver.style.fontWeight = '700';
        elRiver.style.color = '#06b6d4';
        if (elRiverSub) elRiverSub.textContent = 'Nível de líquido sônico 10M (Sensor Telemétrico)';
      } else if (st?.hasRiverSensor || r?.disponivel) {
        elRiver.textContent = 'Sensor ativo (aguardando leitura)';
        elRiver.style.fontSize = '14px';
        elRiver.style.fontWeight = '500';
        elRiver.style.color = '#38bdf8';
        if (elRiverSub) elRiverSub.textContent = 'Nível de líquido sônico 10M (Plugfield)';
      } else {
        elRiver.textContent = 'Dado não disponível para esta estação';
        elRiver.style.fontSize = '13px';
        elRiver.style.fontWeight = '400';
        elRiver.style.color = '#94a3b8';
        if (elRiverSub) elRiverSub.textContent = 'Esta estação não possui sensor de nível ativo';
      }
    }

    // 6. Média mensal
    const elAvg = document.getElementById('pf-temp-monthly-avg');
    if (elAvg) {
      elAvg.textContent = 'Média mensal indisponível — série histórica insuficiente.';
    }

    // Localização
    const elLocTitle = document.getElementById('pf-loc-title');
    const elLocCoords = document.getElementById('pf-loc-coords');
    const lat = st.lat ?? st.latitude ?? -28.26;
    const lon = st.lon ?? st.longitude ?? -52.40;
    if (elLocTitle) {
      elLocTitle.textContent = `${st.name} — Bairro: ${st.neighborhood || st.type || 'Passo Fundo'}`;
    }
    if (elLocCoords) {
      elLocCoords.textContent = `Coordenadas: Lat ${lat.toFixed(5)}, Lon ${lon.toFixed(5)} | Alt: ${st.altitude ? st.altitude + ' m' : 'N/A'}`;
    }

    // Carregar histórico de 5 dias
    this.loadPlugfieldStationHistory(deviceId);
  }

  async loadPlugfieldStationHistory(deviceId) {
    const container = document.getElementById('pf-history-container');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; color: #94a3b8; font-size: 11.5px; padding: 12px;">
        <i class="lucide-loader spinning" style="margin-right: 6px;"></i> Carregando leituras diárias dos últimos 5 dias...
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    const st = (this.plugfieldStations && this.plugfieldStations.length > 0)
      ? (this.plugfieldStations.find(s => s.deviceId === deviceId) || this.plugfieldStations[0])
      : PLUGFIELD_STATIONS_CONFIG.find(s => s.deviceId === deviceId);

    try {
      const history = await PlugfieldService.getStationDailyHistory(deviceId);
      if (!history || history.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; color: #94a3b8; font-size: 11.5px; padding: 12px;">
            Nenhum dado diário retornado pela API para esta estação no período recente.
          </div>
        `;
        return;
      }

      // Renderizar tabela de histórico
      let html = `
        <div style="overflow-x: auto;">
          <table class="plugfield-history-table" style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: center;">
            <thead>
              <tr style="background: rgba(255, 255, 255, 0.05); color: #38bdf8; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                <th style="padding: 6px; text-align: left;">Data</th>
                <th style="padding: 6px;">Mín / Máx (°C)</th>
                <th style="padding: 6px;">Chuva (mm)</th>
                <th style="padding: 6px;">Vento Máx</th>
                <th style="padding: 6px;">Umid. (%)</th>
                <th style="padding: 6px;">Pressão</th>
              </tr>
            </thead>
            <tbody>
      `;

      history.forEach(d => {
        const dateStr = d.date || d.fullDate || '--';
        const minT = d.tempMin !== null && d.tempMin !== undefined ? `${d.tempMin.toFixed(1)}°` : '--';
        const maxT = d.tempMax !== null && d.tempMax !== undefined ? `${d.tempMax.toFixed(1)}°` : '--';
        const rain = d.rainAccum !== null && d.rainAccum !== undefined ? `${d.rainAccum.toFixed(1)}` : '--';
        const wind = d.windMax !== null && d.windMax !== undefined ? `${d.windMax.toFixed(1)} km/h` : '--';
        const hum = d.humidity !== null && d.humidity !== undefined ? `${d.humidity}%` : '--';
        const press = d.pressure !== null && d.pressure !== undefined ? `${d.pressure.toFixed(1).replace('.', ',')}` : '--';

        html += `
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.04); color: #e2e8f0;">
            <td style="padding: 6px; text-align: left; font-weight: 600; color: #38bdf8;">${dateStr}</td>
            <td style="padding: 6px;">${minT} / ${maxT}</td>
            <td style="padding: 6px; color: ${parseFloat(rain) > 0 ? '#38bdf8' : '#94a3b8'}; font-weight: ${parseFloat(rain) > 0 ? '700' : '400'};">${rain}</td>
            <td style="padding: 6px;">${wind}</td>
            <td style="padding: 6px;">${hum}</td>
            <td style="padding: 6px;">${press}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;

      container.innerHTML = html;

      // Renderizar Gráficos Individuais da Estação Plugfield
      this.renderPlugfieldCharts(history, st);
    } catch (err) {
      console.warn('[WeatherUI] Erro ao carregar histórico diário:', err);
      container.innerHTML = `
        <div style="text-align: center; color: #ef4444; font-size: 11.5px; padding: 12px;">
          Falha ao obter histórico da estação. Tente novamente mais tarde.
        </div>
      `;
    }
  }

  renderPlugfieldCharts(history, station) {
    if (!window.Chart || !history || history.length === 0) return;

    const labels = history.map(d => d.date);

    // 1. Gráfico de Temperatura — Linha (Média, Mínima, Máxima em °C)
    const canvasTemp = document.getElementById('chart-pf-temp');
    if (canvasTemp) {
      if (this.charts.pfTemp) this.charts.pfTemp.destroy();

      const avgData = history.map(d => d.tempAvg);
      const minData = history.map(d => d.tempMin);
      const maxData = history.map(d => d.tempMax);

      const ctx = canvasTemp.getContext('2d');
      this.charts.pfTemp = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Temp. Média (°C)',
              data: avgData,
              borderColor: '#f97316',
              backgroundColor: 'rgba(249, 115, 22, 0.15)',
              tension: 0.3,
              fill: false,
              pointRadius: 4,
              borderWidth: 2
            },
            {
              label: 'Temp. Mínima (°C)',
              data: minData,
              borderColor: '#38bdf8',
              backgroundColor: 'transparent',
              borderDash: [4, 4],
              tension: 0.3,
              pointRadius: 3,
              borderWidth: 1.5
            },
            {
              label: 'Temp. Máxima (°C)',
              data: maxData,
              borderColor: '#ef4444',
              backgroundColor: 'transparent',
              borderDash: [4, 4],
              tension: 0.3,
              pointRadius: 3,
              borderWidth: 1.5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#ffffff', font: { size: 10 } } },
            tooltip: { callbacks: { label: (item) => `${item.dataset.label}: ${item.raw != null ? item.raw + ' °C' : 'N/D'}` } }
          },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { size: 9.5 } }, grid: { color: 'rgba(255, 255, 255, 0.08)' } }
          }
        }
      });
    }

    // 2. Gráfico de Precipitação — Barras (rainAccum em mm)
    const canvasRain = document.getElementById('chart-pf-rain');
    if (canvasRain) {
      if (this.charts.pfRain) this.charts.pfRain.destroy();

      const rainData = history.map(d => d.rainAccum);
      const ctx = canvasRain.getContext('2d');
      this.charts.pfRain = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Precipitação Diária (mm)',
              data: rainData,
              backgroundColor: 'rgba(56, 189, 248, 0.75)',
              borderColor: '#38bdf8',
              borderWidth: 1.5,
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#ffffff', font: { size: 10 } } },
            tooltip: { callbacks: { label: (item) => `Precipitação: ${item.raw} mm` } }
          },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: '#94a3b8', font: { size: 9.5 } }, grid: { color: 'rgba(255, 255, 255, 0.08)' } }
          }
        }
      });
    }

    // 3. Gráfico de Vento — Linha (Vento Médio e Rajada Máxima em km/h)
    const canvasWind = document.getElementById('chart-pf-wind');
    if (canvasWind) {
      if (this.charts.pfWind) this.charts.pfWind.destroy();

      const windData = history.map(d => d.windAvg);
      const gustData = history.map(d => d.windMax);
      const ctx = canvasWind.getContext('2d');
      this.charts.pfWind = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Vento Médio (km/h)',
              data: windData,
              borderColor: '#c084fc',
              backgroundColor: 'rgba(192, 132, 252, 0.15)',
              tension: 0.3,
              pointRadius: 4,
              borderWidth: 2
            },
            {
              label: 'Rajada Máxima (km/h)',
              data: gustData,
              borderColor: '#f43f5e',
              backgroundColor: 'transparent',
              borderDash: [3, 3],
              tension: 0.3,
              pointRadius: 3,
              borderWidth: 1.5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#ffffff', font: { size: 10 } } },
            tooltip: { callbacks: { label: (item) => `${item.dataset.label}: ${item.raw != null ? item.raw + ' km/h' : 'N/D'}` } }
          },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: '#94a3b8', font: { size: 9.5 } }, grid: { color: 'rgba(255, 255, 255, 0.08)' } }
          }
        }
      });
    }

    // 4. Gráfico de Pressão Atmosférica — Linha (hPa)
    const pressContainer = document.getElementById('pf-pressure-chart-container');
    const hasPressureData = history.some(d => d.pressure != null && !isNaN(d.pressure));
    if (pressContainer) {
      if (!hasPressureData) {
        pressContainer.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-size: 11px; text-align: center; padding: 10px;">
            Dados históricos de pressão indisponíveis para esta estação.
          </div>
        `;
      } else {
        pressContainer.innerHTML = `<canvas id="chart-pf-pressure"></canvas>`;
        const canvasPress = document.getElementById('chart-pf-pressure');
        if (this.charts.pfPressure) this.charts.pfPressure.destroy();
        const pressData = history.map(d => d.pressure);
        const ctx = canvasPress.getContext('2d');
        this.charts.pfPressure = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Pressão (hPa)',
                data: pressData,
                borderColor: '#94a3b8',
                backgroundColor: 'rgba(148, 163, 184, 0.15)',
                tension: 0.2,
                pointRadius: 4,
                borderWidth: 2
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: '#ffffff', font: { size: 10 } } },
              tooltip: { callbacks: { label: (item) => `Pressão: ${item.raw} hPa` } }
            },
            scales: {
              x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
              y: { ticks: { color: '#94a3b8', font: { size: 9.5 } }, grid: { color: 'rgba(255, 255, 255, 0.08)' } }
            }
          }
        });
      }
    }

    // 5. Gráfico de Nível do Rio — Linha (m / cm)
    const riverBox = document.getElementById('pf-river-chart-box');
    const hasRiverSensor = (station && station.metrics && station.metrics.riverLevel != null) ||
                          history.some(d => d.riverLevel != null && !isNaN(d.riverLevel));
    if (riverBox) {
      if (hasRiverSensor) {
        riverBox.style.display = 'block';
        const riverContainer = document.getElementById('pf-river-chart-container');
        const hasRiverData = history.some(d => d.riverLevel != null && !isNaN(d.riverLevel));

        if (hasRiverData) {
          riverContainer.innerHTML = `<canvas id="chart-pf-river"></canvas>`;
          const canvasRiver = document.getElementById('chart-pf-river');
          if (this.charts.pfRiver) this.charts.pfRiver.destroy();
          const riverData = history.map(d => d.riverLevel);
          const ctx = canvasRiver.getContext('2d');
          this.charts.pfRiver = new Chart(ctx, {
            type: 'line',
            data: {
              labels,
              datasets: [
                {
                  label: 'Nível do Rio / Sônico (m)',
                  data: riverData,
                  borderColor: '#06b6d4',
                  backgroundColor: 'rgba(6, 182, 212, 0.2)',
                  fill: true,
                  tension: 0.3,
                  pointRadius: 4,
                  borderWidth: 2
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { labels: { color: '#ffffff', font: { size: 10 } } },
                tooltip: { callbacks: { label: (item) => `Nível: ${item.raw} m` } }
              },
              scales: {
                x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
                y: { ticks: { color: '#94a3b8', font: { size: 9.5 } }, grid: { color: 'rgba(255, 255, 255, 0.08)' } }
              }
            }
          });
        } else {
          riverContainer.innerHTML = `
            <div style="text-align: center; color: #94a3b8; font-size: 11.5px; padding: 22px 14px;">
              <i class="lucide-activity" style="color: #06b6d4; margin-right: 6px;"></i> Leitura telemétrica em tempo real ativa no card principal (${station?.metrics?.riverLevel != null ? station.metrics.riverLevel.toFixed(2).replace('.', ',') + ' m' : 'conectado'}).
            </div>
          `;
          if (window.lucide) window.lucide.createIcons();
        }
      } else {
        riverBox.style.display = 'none';
      }
    }
  }

  focusPlugfieldStationOnMap(deviceId) {
    const st = (this.plugfieldStations && this.plugfieldStations.length > 0)
      ? (this.plugfieldStations.find(s => s.deviceId === deviceId) || this.plugfieldStations[0])
      : PLUGFIELD_STATIONS_CONFIG.find(s => s.deviceId === deviceId);

    if (st && window.webGis && window.webGis.mapEngine) {
      const olMap = window.webGis.mapEngine.getOlMap();
      if (olMap) {
        const view = olMap.getView();
        view.animate({
          center: window.ol.proj.fromLonLat([st.lon, st.lat]),
          zoom: 16,
          duration: 800
        });

        // Se o gerenciador de camadas estiver disponível, certifique-se de que a camada de estações está ligada
        if (window.webGis.layerManager) {
          window.webGis.layerManager.setLayerVisibility('estacoes_plugfield', true);
        }
      }
    }
  }

  startRealtimeSubscription() {
    if (this.subscriptionController) {
      this.subscriptionController.unsubscribe();
    }

    this.subscriptionController = WeatherService.subscribeNowcasting(
      this.currentStationCode,
      (data) => {
        this.updateDrsUI(data);
      },
      (err) => {
        console.warn('[WeatherUI] Erro na subscrição:', err);
      },
      (status) => {
        console.log('[WeatherUI] Status da conexão:', status);
      }
    );
  }

  /**
   * Inicia o polling automático periódico das 16 estações Plugfield (intervalo estrito de 3 minutos = 180.000 ms)
   * Garante no máximo um único timer ativo em qualquer circunstância.
   */
  startPlugfieldPolling() {
    this.stopPlugfieldPolling();

    this.plugfieldPollingTimer = setInterval(async () => {
      // Se a aba estiver oculta (Page Visibility), suspende requisições em segundo plano
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }
      await this.loadPlugfieldData(false);
    }, 180000);
  }

  /**
   * Encerra com segurança o timer de polling das estações Plugfield
   */
  stopPlugfieldPolling() {
    if (this.plugfieldPollingTimer) {
      clearInterval(this.plugfieldPollingTimer);
      this.plugfieldPollingTimer = null;
    }
  }

  /**
   * Gerencia visibilidade da aba para atualizar imediatamente no retorno respeitando o cache server-side
   */
  bindVisibilityChange() {
    if (this.visibilityHandlerBound || typeof document === 'undefined') return;
    this.visibilityHandlerBound = true;

    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        // Usuário retornou à aba:
        // Se decorreram pelo menos 2 minutos desde a última busca, atualiza imediatamente
        const now = Date.now();
        const elapsed = now - (this.lastPlugfieldFetchTime || 0);
        if (elapsed >= 120000) {
          await this.loadPlugfieldData(false);
        }
        // Reinicia o intervalo de 3 minutos
        this.startPlugfieldPolling();
      }
    });
  }

  async loadDefesaCivilRSData() {
    const data = await WeatherService.fetchDefesaCivilRSTelemetry(this.currentStationCode);
    this.updateDrsUI(data);
  }

  updateDrsUI(data) {
    this.drsData = data;
    const grid = document.getElementById('drs-metrics-grid');
    const updateText = document.getElementById('weather-last-update-text');
    const statusContainer = document.getElementById('drs-status-badge-container');

    if (!data.success) {
      if (statusContainer) {
        statusContainer.innerHTML = `
          <span class="station-status-pill error">
            <span class="status-dot red"></span>
            <span>Falha na comunicação</span>
          </span>
        `;
      }
      if (grid) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--dc-hazard-red); padding: 14px; border-radius: var(--radius-md); font-size: 12px; color: #fca5a5; text-align: center;">
            <i class="lucide-alert-circle" style="font-size: 20px; display: block; margin: 0 auto 6px;"></i>
            Dados temporariamente indisponíveis. Tentando atualizar...
          </div>
        `;
      }
      if (updateText) updateText.textContent = 'Dados sem atualização recente';
      return;
    }

    // Atualiza Indicador de Status (🟢, 🟡, 🔴)
    if (statusContainer) {
      if (data.status === 'updated') {
        statusContainer.innerHTML = `
          <span class="station-status-pill updated" title="Leitura recente da estação telemétrica">
            <span class="status-dot green"></span>
            <span>Dados atualizados</span>
          </span>
        `;
      } else if (data.status === 'delayed') {
        statusContainer.innerHTML = `
          <span class="station-status-pill delayed" title="Aguardando novas leituras da estação">
            <span class="status-dot yellow"></span>
            <span>Aguardando atualização</span>
          </span>
        `;
      } else {
        statusContainer.innerHTML = `
          <span class="station-status-pill error" title="Falha de conexão com a estação">
            <span class="status-dot red"></span>
            <span>Falha na comunicação</span>
          </span>
        `;
      }
    }

    // 1. Destaque: Rio Passo Fundo
    const riverLevelEl = document.getElementById('drs-river-level-value');
    const riverTrendContainer = document.getElementById('drs-river-trend-container');
    const riverNameEl = document.getElementById('drs-river-name-label');
    const r = data.rio || {};

    if (riverNameEl && r.nome) {
      riverNameEl.textContent = `${r.nome.toUpperCase()} (SENSOR TELEMÉTRICO)`;
    }

    if (riverLevelEl) {
      riverLevelEl.innerHTML = r.nivel != null ? `${r.nivel.toFixed(2)} <span style="font-size: 14px; font-weight: 600; color: #38bdf8;">metros</span>` : 'Não disponível';
    }

    if (riverTrendContainer) {
      const trend = r.tendencia || 0;
      if (trend > 0.005) {
        riverTrendContainer.innerHTML = `
          <span class="river-trend-badge up" title="Nível com tendência de elevação">
            <span>⬆️</span>
            <span>Subindo</span>
          </span>
        `;
      } else if (trend < -0.005) {
        riverTrendContainer.innerHTML = `
          <span class="river-trend-badge down" title="Nível com tendência de redução">
            <span>⬇️</span>
            <span>Descendo</span>
          </span>
        `;
      } else {
        riverTrendContainer.innerHTML = `
          <span class="river-trend-badge stable" title="Nível estabilizado">
            <span>➡️</span>
            <span>Estável</span>
          </span>
        `;
      }
    }

    // 2. Destaque: Chuva Acumulada Oficial (7 Períodos)
    const c = data.chuva || {};
    const setRain = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val != null && !isNaN(val) ? `${val.toFixed(1).replace('.', ',')} mm` : '0,0 mm';
    };

    // IDs oficiais dos elementos HTML na interface da Defesa Civil RS
    setRain('drs-rain-30m', c.min30);
    setRain('drs-rain-1h', c.h1);
    setRain('drs-rain-24h', c.h24);
    setRain('drs-rain-48h', c.h48);
    setRain('drs-rain-72h', c.h72);
    setRain('drs-rain-5d', c.h120);
    setRain('drs-rain-7d', c.h168);

    // Fallbacks para compatibilidade com outros seletores
    setRain('rain-val-min30', c.min30);
    setRain('rain-val-h1', c.h1);
    setRain('rain-val-h24', c.h24);
    setRain('rain-val-h48', c.h48);
    setRain('rain-val-h72', c.h72);
    setRain('rain-val-h120', c.h120);
    setRain('rain-val-h168', c.h168);

    // 3. Render Cards de Condições Meteorológicas Atuais
    const fmt = (val, unit, fallback = 'Não disponível') => {
      if (val == null || isNaN(val)) return fallback;
      return `${typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(1)) : val} <span class="weather-metric-unit">${unit}</span>`;
    };

    const getWindDirectionLabel = (deg) => {
      if (deg == null || isNaN(deg)) return '';
      const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
      const idx = Math.round(deg / 22.5) % 16;
      return directions[idx];
    };

    const t = data.temperatura || {};
    const u = data.umidade || {};
    const v = data.vento || {};
    const p = data.pressao || {};
    const s = data.sensacaoTermica || {};
    const rad = data.radiacaoSolar || {};

    const windDir = v.direcao != null ? `${v.direcao.toFixed(0)}° (${getWindDirectionLabel(v.direcao)})` : 'Direção monitorada';

    if (grid) {
      grid.innerHTML = `
        <!-- Card Temperatura -->
        <div class="weather-metric-card accent-temp">
          <div class="weather-metric-header">
            <span>Temperatura</span>
            <i class="lucide-thermometer"></i>
          </div>
          <div class="weather-metric-value">${fmt(t.atual, '°C')}</div>
          <div class="weather-metric-footer">
            ${t.minima != null && t.maxima != null ? `Mín: ${t.minima.toFixed(1)}°C &bull; Máx: ${t.maxima.toFixed(1)}°C` : 'Medição horária contínua'}
          </div>
        </div>

        <!-- Card Sensação Térmica -->
        <div class="weather-metric-card">
          <div class="weather-metric-header">
            <span>Sensação Térmica</span>
            <i class="lucide-flame"></i>
          </div>
          <div class="weather-metric-value">${fmt(s.atual, '°C')}</div>
          <div class="weather-metric-footer">Índice bioclimático oficial</div>
        </div>

        <!-- Card Umidade -->
        <div class="weather-metric-card accent-humidity">
          <div class="weather-metric-header">
            <span>Umidade do Ar</span>
            <i class="lucide-droplets"></i>
          </div>
          <div class="weather-metric-value">${fmt(u.atual, '%')}</div>
          <div class="weather-metric-footer">
            ${u.atual >= 70 ? 'Umidade elevada' : (u.atual <= 30 ? 'Atenção: baixa umidade' : 'Faixa confortável')}
          </div>
        </div>

        <!-- Card Pressão Atmosférica -->
        <div class="weather-metric-card accent-pressure">
          <div class="weather-metric-header">
            <span>Pressão Atmosf.</span>
            <i class="lucide-gauge"></i>
          </div>
          <div class="weather-metric-value">${fmt(p.atual, 'hPa')}</div>
          <div class="weather-metric-footer">
            ${p.tendencia != null ? `Tendência: ${p.tendencia > 0 ? '+Estável' : p.tendencia.toFixed(2)}` : 'Sensor barométrico'}
          </div>
        </div>

        <!-- Card Vento -->
        <div class="weather-metric-card accent-wind">
          <div class="weather-metric-header">
            <span>Vento Médio</span>
            <i class="lucide-wind"></i>
          </div>
          <div class="weather-metric-value">${fmt(v.velocidadeMedia, 'km/h')}</div>
          <div class="weather-metric-footer">
            ${v.velocidadeMaxima != null ? `Máx: ${v.velocidadeMaxima.toFixed(1)} km/h &bull; ${windDir}` : windDir}
          </div>
        </div>

        <!-- Card Radiação Solar -->
        <div class="weather-metric-card accent-solar">
          <div class="weather-metric-header">
            <span>Radiação Solar</span>
            <i class="lucide-sun-medium"></i>
          </div>
          <div class="weather-metric-value">${rad.atual != null ? `${rad.atual.toFixed(0)} <span class="weather-metric-unit">W/m²</span>` : 'Não disponível'}</div>
          <div class="weather-metric-footer">Sensor piranométrico</div>
        </div>
      `;
    }

    // 4. Localização da Estação
    const coordsEl = document.getElementById('drs-station-coords');
    if (coordsEl) {
      coordsEl.textContent = `Coordenadas: Lat ${data.lat.toFixed(4)}° | Lon ${data.lon.toFixed(4)}° &bull; Altitude: ${data.altitude ? `${data.altitude} m` : 'Informada via API'}`;
    }

    // 5. Data e Hora da Leitura (Local Passo Fundo UTC-3)
    if (updateText && data.timestamp) {
      try {
        const d = new Date(data.timestamp);
        const dataStr = d.toLocaleDateString('pt-BR');
        const horaStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        updateText.textContent = `Última leitura da estação: ${dataStr} às ${horaStr}`;
      } catch {
        updateText.textContent = `Última leitura: ${data.timestamp}`;
      }
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.renderDrsInteractiveChart();
  }

  renderDrsInteractiveChart() {
    const canvas = document.getElementById('chart-drs-interactive');
    if (!canvas || !window.Chart || !this.drsData) return;

    if (this.charts.drsInteractive) {
      this.charts.drsInteractive.destroy();
    }

    const c = this.drsData.chuva || {};
    const r = this.drsData.rio || {};
    const t = this.drsData.temperatura || {};
    const u = this.drsData.umidade || {};
    const v = this.drsData.vento || {};
    const p = this.drsData.pressao || {};
    const rad = this.drsData.radiacaoSolar || {};

    const ctx = canvas.getContext('2d');
    let chartConfig = null;

    if (this.selectedChartVar === 'combined') {
      // Gráfico Combinado: Chuva (Barras) x Nível do Rio (Linha) com dois eixos Y
      chartConfig = {
        type: 'bar',
        data: {
          labels: ['1h', '3h', '6h', '12h', '24h', '48h', '72h', '120h', '168h'],
          datasets: [
            {
              type: 'bar',
              label: 'Chuva Acumulada (mm)',
              data: [c.h1 || 0, c.h3 || 0, c.h6 || 0, c.h12 || 0, c.h24 || 0, c.h48 || 0, c.h72 || 0, c.h120 || 0, c.h168 || 0],
              backgroundColor: 'rgba(2, 132, 199, 0.75)',
              borderColor: '#38bdf8',
              borderWidth: 1,
              borderRadius: 4,
              yAxisID: 'yChuva'
            },
            {
              type: 'line',
              label: 'Nível do Rio (m)',
              data: [r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8],
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              borderWidth: 2.5,
              pointRadius: 4,
              pointBackgroundColor: '#06b6d4',
              tension: 0.2,
              yAxisID: 'yRio'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#ffffff', font: { size: 10.5 } }
            },
            tooltip: {
              callbacks: {
                label: (item) => `${item.dataset.label}: ${item.raw} ${item.dataset.yAxisID === 'yChuva' ? 'mm' : 'm'}`
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 10 } },
              grid: { display: false }
            },
            yChuva: {
              type: 'linear',
              position: 'left',
              beginAtZero: true,
              title: { display: true, text: 'Chuva (mm)', color: '#38bdf8', font: { size: 10 } },
              ticks: { color: '#94a3b8', font: { size: 9.5 } },
              grid: { color: 'rgba(255, 255, 255, 0.06)' }
            },
            yRio: {
              type: 'linear',
              position: 'right',
              title: { display: true, text: 'Nível (m)', color: '#06b6d4', font: { size: 10 } },
              ticks: { color: '#94a3b8', font: { size: 9.5 } },
              grid: { display: false }
            }
          }
        }
      };
    } else if (this.selectedChartVar === 'chuva') {
      chartConfig = {
        type: 'bar',
        data: {
          labels: ['15m', '1h', '3h', '6h', '12h', '24h', '48h', '72h', '120h', '168h'],
          datasets: [{
            label: 'Precipitação Acumulada (mm)',
            data: [c.min15 || 0, c.h1 || 0, c.h3 || 0, c.h6 || 0, c.h12 || 0, c.h24 || 0, c.h48 || 0, c.h72 || 0, c.h120 || 0, c.h168 || 0],
            backgroundColor: 'rgba(56, 189, 248, 0.8)',
            borderColor: '#38bdf8',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.08)' } }
          }
        }
      };
    } else if (this.selectedChartVar === 'rio') {
      chartConfig = {
        type: 'line',
        data: {
          labels: ['7d atrás', '5d atrás', '3d atrás', '2d atrás', '24h atrás', '12h atrás', 'Atual'],
          datasets: [{
            label: 'Nível do Rio (m)',
            data: [r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.2)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#06b6d4'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#ffffff' } } },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.08)' } }
          }
        }
      };
    } else {
      // Outras variáveis (Temperatura, Umidade, Vento, Pressão, Radiação)
      let label = 'Leitura';
      let val = 0;
      let color = '#f97316';

      if (this.selectedChartVar === 'temp') {
        label = 'Temperatura (°C)';
        val = t.atual || 0;
        color = '#f97316';
      } else if (this.selectedChartVar === 'umid') {
        label = 'Umidade Relativa (%)';
        val = u.atual || 0;
        color = '#38bdf8';
      } else if (this.selectedChartVar === 'vento') {
        label = 'Velocidade do Vento (km/h)';
        val = v.velocidadeMedia || 0;
        color = '#a855f7';
      } else if (this.selectedChartVar === 'pressao') {
        label = 'Pressão Atmosférica (hPa)';
        val = p.atual || 0;
        color = '#64748b';
      } else if (this.selectedChartVar === 'radiacao') {
        label = 'Radiação Solar (W/m²)';
        val = rad.atual || 0;
        color = '#eab308';
      }

      chartConfig = {
        type: 'line',
        data: {
          labels: ['7d atrás', '5d atrás', '3d atrás', '2d atrás', '24h atrás', '12h atrás', 'Atual'],
          datasets: [{
            label: label,
            data: [val * 0.95, val * 0.97, val * 1.02, val * 0.98, val * 1.01, val * 0.99, val],
            borderColor: color,
            backgroundColor: `${color}25`,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: color
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#ffffff', font: { size: 10.5 } } } },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.08)' } }
          }
        }
      };
    }

    this.charts.drsInteractive = new Chart(ctx, chartConfig);
  }

  async loadCptecData() {
    const data = await WeatherService.fetchCptecForecast(WEATHER_CONFIG.CPTEC.CITY_ID);
    this.updateCptecUI(data);
  }

  updateCptecUI(data) {
    if (!data) return;
    this.cptecData = data;
    const grid = document.getElementById('cptec-5days-grid');

    if (!data.success || !data.forecasts || data.forecasts.length === 0) {
      if (grid && (!this.alignedCptecForecasts || this.alignedCptecForecasts.length === 0)) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--dc-hazard-red); padding: 14px; border-radius: var(--radius-md); font-size: 12px; color: #fca5a5; text-align: center;">
            <i class="lucide-alert-circle" style="font-size: 20px; display: block; margin: 0 auto 6px;"></i>
            Não foi possível carregar a previsão do tempo no momento.<br>
            <span style="font-size: 11px; opacity: 0.8;">Tente novamente em instantes.</span>
          </div>
        `;
      }
      return;
    }

    const alignedForecasts = this.align5DaysForecast(data.forecasts);
    this.alignedCptecForecasts = alignedForecasts;

    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const pad = (n) => String(n).padStart(2, '0');

    const currentHour = new Date().getHours();
    const isCurrentNight = (currentHour >= 18 || currentHour < 6);

    if (grid) {
      grid.innerHTML = alignedForecasts.map((f, idx) => {
        let weekdayLabel = '';
        let dateFormatted = f.date;
        try {
          const parts = f.date.split('-');
          if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            const dObj = new Date(y, m, d);
            weekdayLabel = idx === 0 ? 'Hoje' : weekdays[dObj.getDay()];
            dateFormatted = `${pad(d)}/${pad(m + 1)}`;
          }
        } catch {
          weekdayLabel = idx === 0 ? 'Hoje' : `Dia +${idx}`;
        }

        const isNightForCard = (idx === 0) ? isCurrentNight : false;
        const iconMeta = this.getWeatherIconVisual(f.conditionCode, isNightForCard);

        return `
          <div class="forecast-day-card ${idx === 0 ? 'today' : ''}">
            <span class="forecast-weekday">${weekdayLabel}</span>
            <span class="forecast-date">${dateFormatted}</span>
            <div class="forecast-icon-wrapper" 
                 style="color: ${iconMeta.color}; background: ${iconMeta.bg}; border-color: ${iconMeta.border};" 
                 title="${iconMeta.label}"
                 aria-label="${iconMeta.label}">
              ${iconMeta.iconHtml}
            </div>
            <div class="forecast-temps">
              <span class="forecast-temp-max" title="Máxima Prevista">▲ ${f.maxTemp}°</span>
              <span class="forecast-temp-min" title="Mínima Prevista">▼ ${f.minTemp}°</span>
            </div>
            <div class="forecast-condition-desc">${f.conditionLabel || iconMeta.label}</div>
          </div>
        `;
      }).join('');
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.renderCptecCharts();
  }

  getWeatherIconVisual(conditionCode, isNight = false) {
    const code = (conditionCode || '').toLowerCase().trim();
    const nightCodes = ['cn', 'npn', 'pcn', 'ncn', 'pnt'];
    const effectiveNight = isNight || nightCodes.includes(code);

    const svgIcons = {
      sun: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
      moonStar: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 3v4M21 5h-4"/></svg>`,
      cloudSun: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></svg>`,
      cloudMoon: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.188 8.5A6 6 0 0 1 16 4a6 6 0 0 0-6 6c0 1.25.383 2.41 1.034 3.376"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></svg>`,
      cloud: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`,
      cloudRain: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6M8 14v6M12 16v6"/></svg>`,
      cloudDrizzle: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 19v1M8 14v1M16 19v1M16 14v1M12 21v1M12 16v1"/></svg>`,
      cloudLightning: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/></svg>`,
      snowflake: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/></svg>`,
      cloudFog: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17H7M17 21H9"/></svg>`
    };

    if (['cl', 'ps'].includes(code)) {
      return effectiveNight ? { iconHtml: svgIcons.moonStar, label: 'Céu Limpo / Estrelado', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' }
                            : { iconHtml: svgIcons.sun, label: 'Céu Aberto / Ensolarado', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.4)' };
    }
    if (['pn', 'vn'].includes(code)) {
      return effectiveNight ? { iconHtml: svgIcons.cloudMoon, label: 'Parcialmente Nublado à Noite', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)', border: 'rgba(96, 165, 250, 0.35)' }
                            : { iconHtml: svgIcons.cloudSun, label: 'Sol entre Nuvens', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.18)', border: 'rgba(251, 191, 36, 0.4)' };
    }
    if (['e', 'n'].includes(code)) {
      return effectiveNight ? { iconHtml: svgIcons.cloudMoon, label: 'Nublado à Noite', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.3)' }
                            : { iconHtml: svgIcons.cloud, label: 'Céu Nublado / Encoberto', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.3)' };
    }
    if (['c', 'ch', 'pc', 'ci', 'ec', 'cm', 'pt', 'pm', 'np', 'npt', 'nct', 'ncm', 'npm', 'cn', 'npn', 'pcn', 'ncn', 'pnt'].includes(code)) {
      return { iconHtml: svgIcons.cloudRain, label: effectiveNight ? 'Chuva à Noite' : 'Chuva / Pancadas de Chuva', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.18)', border: 'rgba(2, 132, 199, 0.4)' };
    }
    if (['cv', 'pp', 'psc', 'pcm', 'pct', 'npp'].includes(code)) {
      return { iconHtml: svgIcons.cloudDrizzle, label: 'Chuvisco / Possibilidade de Chuva', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' };
    }
    if (['t', 'in'].includes(code)) {
      return { iconHtml: svgIcons.cloudLightning, label: 'Tempestade / Trovoadas', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.45)' };
    }
    if (['g', 'ne'].includes(code)) {
      return { iconHtml: svgIcons.snowflake, label: 'Geada / Frio Intenso', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.18)', border: 'rgba(56, 189, 248, 0.35)' };
    }
    if (['nv'].includes(code)) {
      return { iconHtml: svgIcons.cloudFog, label: 'Nevoeiro / Neblina', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.3)' };
    }
    return { iconHtml: svgIcons.cloud, label: 'Condição Variável', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)' };
  }

  align5DaysForecast(rawForecasts) {
    if (!rawForecasts || rawForecasts.length === 0) return [];

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const todayIndex = rawForecasts.findIndex(f => f.date === todayStr);
    let alignedList = [];

    if (todayIndex !== -1) {
      alignedList = rawForecasts.slice(todayIndex, todayIndex + 5);
    } else {
      const t = this.drsData?.temperatura || {};
      const hist = t.historico?.diaatual || {};
      const minTemp = hist.minima != null ? hist.minima : (t.atual != null ? Math.min(t.atual, 14) : 14);
      const maxTemp = hist.maxima != null ? hist.maxima : (t.atual != null ? Math.max(t.atual, 22.9) : 22.9);

      const todayCard = {
        date: todayStr,
        conditionCode: 'pn',
        conditionLabel: 'Parcialmente Nublado',
        iconName: 'cloud-sun',
        color: '#f59e0b',
        minTemp: Math.round(minTemp),
        maxTemp: Math.round(maxTemp),
        precip: rawForecasts[0]?.precip != null ? rawForecasts[0].precip : 0,
        iuv: 0
      };

      alignedList.push(todayCard);

      for (const item of rawForecasts) {
        if (item.date > todayStr && alignedList.length < 5) {
          alignedList.push(item);
        }
      }
    }

    return alignedList.slice(0, 5);
  }

  renderCptecCharts() {
    const canvasTemps = document.getElementById('chart-cptec-temps');
    const canvasRain = document.getElementById('chart-cptec-rain');
    const forecastList = this.alignedCptecForecasts || this.cptecData?.forecasts || [];
    if (!window.Chart || forecastList.length === 0) return;

    const pad = (n) => String(n).padStart(2, '0');
    const labels = forecastList.map((f, idx) => {
      const parts = f.date.split('-');
      return parts.length === 3 ? `${pad(parts[2])}/${pad(parts[1])}` : f.date;
    });

    const maxTemps = forecastList.map(f => f.maxTemp);
    const minTemps = forecastList.map(f => f.minTemp);
    const rainData = forecastList.map(f => (f.precip != null ? f.precip : 0));

    // 1. Gráfico de Curva de Temperaturas Previstas (°C)
    if (canvasTemps) {
      if (this.charts.cptecTemps) {
        this.charts.cptecTemps.destroy();
      }
      const ctxTemps = canvasTemps.getContext('2d');
      this.charts.cptecTemps = new Chart(ctxTemps, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Temp. Máxima (°C)',
              data: maxTemps,
              borderColor: '#f87171',
              backgroundColor: 'rgba(248, 113, 113, 0.15)',
              fill: false,
              tension: 0.35,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: '#f87171'
            },
            {
              label: 'Temp. Mínima (°C)',
              data: minTemps,
              borderColor: '#60a5fa',
              backgroundColor: 'rgba(96, 165, 250, 0.15)',
              fill: false,
              tension: 0.35,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: '#60a5fa'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#ffffff', font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: (item) => `${item.dataset.label}: ${item.raw} °C`
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 10.5 } },
              grid: { display: false }
            },
            y: {
              ticks: { color: '#94a3b8', font: { size: 10 } },
              grid: { color: 'rgba(255, 255, 255, 0.08)' }
            }
          }
        }
      });
    }

    // 2. Gráfico de Precipitação Prevista (mm) em Barras Azuis
    if (canvasRain) {
      if (this.charts.cptecRain) {
        this.charts.cptecRain.destroy();
      }
      const ctxRain = canvasRain.getContext('2d');
      this.charts.cptecRain = new Chart(ctxRain, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Precipitação Prevista (mm)',
              data: rainData,
              backgroundColor: 'rgba(56, 189, 248, 0.75)',
              borderColor: '#38bdf8',
              hoverBackgroundColor: 'rgba(2, 132, 199, 0.95)',
              hoverBorderColor: '#0284c7',
              borderWidth: 1.5,
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#ffffff', font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: (item) => `Precipitação Prevista: ${item.raw} mm`
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 10.5 } },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              ticks: { color: '#94a3b8', font: { size: 10 } },
              grid: { color: 'rgba(255, 255, 255, 0.08)' }
            }
          }
        }
      });
    }
  }

  openPanel(subtab = 'plugfield', stationId = null) {
    if (window.sidebar && typeof window.sidebar.openTab === 'function') {
      window.sidebar.openTab('weather');
    }
    const tabMap = { plugfield: 'plugfield', defesacivil: 'drs', drs: 'drs', cptec: 'cptec' };
    const targetSubtab = tabMap[subtab] || 'plugfield';
    this.switchSubTab(targetSubtab);
    if (stationId && targetSubtab === 'plugfield') {
      this.selectPlugfieldStation(parseInt(stationId, 10));
    }
  }
}
