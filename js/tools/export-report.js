/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Map Export & Situation Report Generator (PDF / Print)
 */

import { formatDateTime, formatNumber, formatArea } from '../utils/formatters.js';
import { Notification } from '../ui/notification.js';
import { LAYERS_CONFIG } from '../config/layers.config.js';
import { WeatherService } from '../weather/weather-service.js';
import { PlugfieldService } from '../weather/plugfield-service.js';

export class ExportReportTool {
  constructor(mapEngine, layerManager, statsEngine) {
    this.mapEngine = mapEngine;
    this.map = mapEngine.getOlMap();
    this.layerManager = layerManager;
    this.statsEngine = statsEngine;

    this.initControls();
  }

  initControls() {
    const exportMapBtn = document.getElementById('btn-export-map-png');
    const reportBtn = document.getElementById('btn-generate-report');

    if (exportMapBtn) {
      exportMapBtn.addEventListener('click', () => {
        this.exportMapPng();
      });
    }

    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        this.generateSituationReport();
      });
    }
  }

  /**
   * Captures map canvas into a high-resolution PNG image
   */
  exportMapPng() {
    Notification.info('Preparando imagem do mapa em alta resolução...');

    this.map.once('rendercomplete', () => {
      const mapCanvas = document.createElement('canvas');
      const size = this.map.getSize();
      mapCanvas.width = size[0];
      mapCanvas.height = size[1];
      const mapContext = mapCanvas.getContext('2d');

      // Draw all OL canvas layers onto composite canvas
      Array.prototype.forEach.call(
        this.map.getViewport().querySelectorAll('.ol-layer canvas, canvas.ol-layer'),
        (canvas) => {
          if (canvas.width > 0) {
            const opacity = canvas.parentNode.style.opacity || canvas.style.opacity;
            mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
            let transform = canvas.style.transform;
            let matrix;
            if (transform) {
              const match = transform.match(/^matrix\(([^\(]*)\)$/);
              if (match) matrix = match[1].split(',').map(Number);
            }
            if (!matrix) {
              matrix = [
                parseFloat(canvas.style.width) / canvas.width || 1,
                0,
                0,
                parseFloat(canvas.style.height) / canvas.height || 1,
                0,
                0
              ];
            }
            CanvasRenderingContext2D.prototype.setTransform.apply(mapContext, matrix);
            mapContext.drawImage(canvas, 0, 0);
          }
        }
      );

      // Reset transform and draw watermark / footer header
      mapContext.setTransform(1, 0, 0, 1, 0, 0);
      mapContext.fillStyle = 'rgba(15, 23, 42, 0.85)';
      mapContext.fillRect(10, size[1] - 38, 420, 28);
      mapContext.strokeStyle = '#ff7800';
      mapContext.lineWidth = 1.5;
      mapContext.strokeRect(10, size[1] - 38, 420, 28);

      mapContext.fillStyle = '#ffffff';
      mapContext.font = 'bold 11px Inter, sans-serif';
      mapContext.fillText('DEFESA CIVIL DE PASSO FUNDO/RS - WEBGIS', 20, size[1] - 20);
      mapContext.fillStyle = '#94a3b8';
      mapContext.font = '10px Inter, sans-serif';
      mapContext.fillText(`Gerado em: ${formatDateTime()}`, 275, size[1] - 20);

      // Download file
      const dataUrl = mapCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `WebGIS_DefesaCivil_PassoFundo_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      Notification.success('Imagem do mapa exportada com sucesso!');
    });

    this.map.renderSync();
  }

  /**
   * Captures map snapshot for inline report embedding
   * @returns {Promise<string|null>}
   */
  async captureMapDataUrl() {
    return new Promise((resolve) => {
      this.map.once('rendercomplete', () => {
        try {
          const mapCanvas = document.createElement('canvas');
          const size = this.map.getSize();
          mapCanvas.width = size[0];
          mapCanvas.height = size[1];
          const mapContext = mapCanvas.getContext('2d');

          Array.prototype.forEach.call(
            this.map.getViewport().querySelectorAll('.ol-layer canvas, canvas.ol-layer'),
            (canvas) => {
              if (canvas.width > 0) {
                const opacity = canvas.parentNode.style.opacity || canvas.style.opacity;
                mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
                let transform = canvas.style.transform;
                let matrix;
                if (transform) {
                  const match = transform.match(/^matrix\(([^\(]*)\)$/);
                  if (match) matrix = match[1].split(',').map(Number);
                }
                if (!matrix) {
                  matrix = [
                    parseFloat(canvas.style.width) / canvas.width || 1,
                    0,
                    0,
                    parseFloat(canvas.style.height) / canvas.height || 1,
                    0,
                    0
                  ];
                }
                CanvasRenderingContext2D.prototype.setTransform.apply(mapContext, matrix);
                mapContext.drawImage(canvas, 0, 0);
              }
            }
          );

          mapContext.setTransform(1, 0, 0, 1, 0, 0);
          resolve(mapCanvas.toDataURL('image/png'));
        } catch (e) {
          console.warn('[ExportReport] Não foi possível obter snapshot do mapa:', e);
          resolve(null);
        }
      });
      this.map.renderSync();
    });
  }

  /**
   * Generates a complete Defesa Civil printable situation report
   */
  async generateSituationReport() {
    Notification.info('Gerando Boletim de Situação da Defesa Civil...');

    // 1. Obter estatísticas consolidadas da base
    const stats = await this.statsEngine.getConsolidatedStats();

    // 2. Extrair métricas detalhadas da camada de residências em APP
    let totalResidencias = stats.residenciasApp || 318;
    let distMin = 9.37;
    let distMax = 100.94;
    let distMedia = 27.45;
    let countMenor10m = 2;
    let count10a20m = 72;
    let count20a30m = 128;
    let countMaior30m = 116;

    try {
      const resLayer = this.layerManager.getLayer('edificacoes_app');
      if (resLayer && resLayer.getSource()) {
        const features = resLayer.getSource().getFeatures();
        if (features.length > 0) {
          totalResidencias = features.length;
          const dists = features.map(f => parseFloat(f.get('dist_rio_m'))).filter(d => !isNaN(d));
          if (dists.length > 0) {
            distMin = Math.min(...dists);
            distMax = Math.max(...dists);
            distMedia = dists.reduce((a, b) => a + b, 0) / dists.length;
            countMenor10m = dists.filter(d => d < 10).length;
            count10a20m = dists.filter(d => d >= 10 && d < 20).length;
            count20a30m = dists.filter(d => d >= 20 && d <= 30).length;
            countMaior30m = dists.filter(d => d > 30).length;
          }
        }
      }
    } catch (e) {
      console.warn('[ExportReport] Erro ao extrair estatísticas de residências:', e);
    }

    // 3. Obter camadas ativas na sessão
    const activeLayers = LAYERS_CONFIG.filter(c => {
      const l = this.layerManager.getLayer(c.id);
      return l && l.getVisible();
    }).map(c => c.name);

    // 4. Capturar composição cartográfica do mapa
    const mapSnapshot = await this.captureMapDataUrl();

    // 4.1. Consultar dados meteorológicos oficiais em tempo real (Defesa Civil RS - Estação DCRS-00016)
    let weatherData = null;
    try {
      weatherData = await WeatherService.fetchDefesaCivilRSTelemetry('DCRS-00016');
    } catch (err) {
      console.warn('[ExportReport] Erro ao consultar telemetria meteorológica para o boletim:', err);
    }

    // 4.2. Consultar dados da Rede Meteorológica Plugfield (16 Estações Oficiais)
    let plugfieldStations = [];
    try {
      plugfieldStations = await PlugfieldService.getAllStations();
    } catch (err) {
      console.warn('[ExportReport] Erro ao consultar Rede Plugfield para o boletim:', err);
    }

    // Função para converter graus de vento em direção cardeal
    const getWindDirectionLabel = (deg) => {
      if (deg == null || isNaN(deg)) return '';
      const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
      const idx = Math.round(deg / 22.5) % 16;
      return directions[idx];
    };

    let weatherReadingDateStr = 'Não disponível no momento da emissão';
    let tempStr = 'Não disponível';
    let sensStr = 'Não disponível';
    let umidStr = 'Não disponível';
    let pressStr = 'Não disponível';
    let ventoStr = 'Não disponível';
    let chuva1hStr = '0,0 mm';
    let chuva24hStr = '0,0 mm';
    let nivelRioRow = '';

    if (weatherData && weatherData.success) {
      if (weatherData.timestamp) {
        try {
          const d = new Date(weatherData.timestamp);
          const dateFormatted = d.toLocaleDateString('pt-BR');
          const timeFormatted = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          weatherReadingDateStr = `${dateFormatted} às ${timeFormatted}`;
        } catch {
          weatherReadingDateStr = weatherData.timestamp;
        }
      }

      if (weatherData.temperatura?.atual != null) {
        tempStr = `${weatherData.temperatura.atual.toFixed(1).replace('.', ',')} °C`;
      }
      if (weatherData.sensacaoTermica?.atual != null) {
        sensStr = `${weatherData.sensacaoTermica.atual.toFixed(1).replace('.', ',')} °C`;
      }
      if (weatherData.umidade?.atual != null) {
        umidStr = `${Math.round(weatherData.umidade.atual)} %`;
      }
      if (weatherData.pressao?.atual != null) {
        pressStr = `${weatherData.pressao.atual.toFixed(1).replace('.', ',')} hPa`;
      }
      if (weatherData.vento?.velocidadeMedia != null) {
        const dirLabel = getWindDirectionLabel(weatherData.vento.direcao);
        ventoStr = `${weatherData.vento.velocidadeMedia.toFixed(1).replace('.', ',')} km/h${dirLabel ? ` — direção ${dirLabel}` : ''}`;
        if (weatherData.vento.velocidadeMaxima != null) {
          ventoStr += ` (rajada: ${weatherData.vento.velocidadeMaxima.toFixed(1).replace('.', ',')} km/h)`;
        }
      }
      if (weatherData.chuva?.h1 != null) {
        chuva1hStr = `${weatherData.chuva.h1.toFixed(1).replace('.', ',')} mm`;
      }
      if (weatherData.chuva?.h24 != null) {
        chuva24hStr = `${weatherData.chuva.h24.toFixed(1).replace('.', ',')} mm`;
      }
      if (weatherData.rio?.nivel != null) {
        nivelRioRow = `
          <tr>
            <td><strong>Nível do sensor / rio</strong></td>
            <td><strong>${weatherData.rio.nivel.toFixed(2).replace('.', ',')} m</strong></td>
          </tr>
        `;
      }
    }

    // Linhas formatadas da tabela de 16 estações Plugfield
    let plugfieldRowsHtml = '';
    let plugfieldChartsHtml = '';
    if (plugfieldStations && plugfieldStations.length > 0) {
      plugfieldRowsHtml = plugfieldStations.map(st => {
        const m = st.metrics || {};
        const temp = m.temperature != null ? `${m.temperature.toFixed(1).replace('.', ',')} °C` : '--';
        const minMax = (m.tempMin != null && m.tempMax != null) ? `${m.tempMin.toFixed(1)}° / ${m.tempMax.toFixed(1)}°` : '--';
        const rainDay = m.rain != null ? `${m.rain.toFixed(1).replace('.', ',')} mm` : '--';
        const rainMonth = m.rainAccumMonthly != null ? `${m.rainAccumMonthly.toFixed(1).replace('.', ',')} mm` : 'N/D';
        const wind = m.windSpeed != null ? `${m.windSpeed.toFixed(1).replace('.', ',')} km/h` : '--';
        const gust = m.windGust != null ? `${m.windGust.toFixed(1).replace('.', ',')} km/h` : '--';
        const windDir = m.windDirectionText || (m.windDirection != null ? `${m.windDirection}°` : '--');
        const press = m.pressure != null ? `${m.pressure.toFixed(1).replace('.', ',')} hPa` : '--';
        const river = m.riverLevel != null ? `${m.riverLevel.toFixed(2).replace('.', ',')} m` : (st.hasRiverSensor ? 'Sensor ativo' : 'Dado não disponível para esta estação');
        const statusBadge = st.isOnline ? '<span style="color:#16a34a; font-weight:700;">Online</span>' : '<span style="color:#dc2626;">Offline</span>';

        return `
          <tr>
            <td><strong>${st.name}</strong> <span style="color:#64748b; font-size:10px;">(#${st.deviceId})</span></td>
            <td>${st.neighborhood || 'Passo Fundo'}</td>
            <td><strong>${temp}</strong></td>
            <td>${minMax}</td>
            <td style="color:${parseFloat(m.rain) > 0 ? '#0284c7' : 'inherit'}; font-weight:${parseFloat(m.rain) > 0 ? '700' : 'normal'};">${rainDay}</td>
            <td>${rainMonth}</td>
            <td>${wind} (Raj: ${gust}, ${windDir})</td>
            <td>${press}</td>
            <td style="font-size:10px; color:${m.riverLevel != null ? '#0891b2' : '#64748b'};">${river}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      }).join('');

      // Obter histórico de 5 dias da estação de referência
      try {
        const refStationId = window.webGis?.weatherUI?.selectedPlugfieldId || 4283;
        const refStation = plugfieldStations.find(s => s.deviceId === refStationId) || plugfieldStations[0];
        const refHistory = await PlugfieldService.getStationDailyHistory(refStation.deviceId);
        plugfieldChartsHtml = this.generatePlugfieldReportChartsHtml(refStation, refHistory);
      } catch (err) {
        console.warn('[ExportReport] Erro ao obter histórico de 5 dias para gráficos:', err);
      }
    }

    // 5. Abrir janela do relatório
    const reportWindow = window.open('', '_blank', 'width=960,height=900');
    if (!reportWindow) {
      Notification.warning('Permita popups no navegador para visualizar o relatório.');
      return;
    }

    const dataEmissao = formatDateTime();

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Boletim de Situação e Diagnóstico Territorial - Defesa Civil Passo Fundo/RS</title>
        <link rel="icon" type="image/jpeg" href="assets/logo-defesa-civil.jpg">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; 
            margin: 35px; 
            color: #0f172a; 
            background: #ffffff; 
            line-height: 1.5;
            font-size: 13px;
          }
          
          /* Header Oficial */
          .report-header { 
            border-bottom: 3px solid #ff7800; 
            padding-bottom: 16px; 
            margin-bottom: 20px; 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
          }
          .header-brand { display: flex; align-items: center; gap: 16px; }
          .header-logo { width: 68px; height: 68px; object-fit: contain; border-radius: 50%; border: 2px solid #ff7800; }
          .inst-title { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
          .inst-sub { font-size: 14px; font-weight: 700; color: #ff7800; margin-top: 1px; }
          .inst-dept { font-size: 11.5px; color: #475569; margin-top: 2px; }
          .meta-date { text-align: right; font-size: 12px; color: #64748b; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }

          /* Banner e Caixa Informativa */
          .meta-box { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-left: 4px solid #ff7800; 
            border-radius: 6px; 
            padding: 12px 14px; 
            margin-bottom: 20px; 
            font-size: 12.5px; 
            color: #334155;
          }

          /* Títulos de Seções */
          h3.section-title { 
            color: #0f172a; 
            font-size: 14.5px; 
            font-weight: 700; 
            margin: 24px 0 10px 0; 
            padding-bottom: 5px; 
            border-bottom: 1.5px solid #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          h3.section-title span.badge-num {
            background: #ff7800;
            color: #fff;
            font-size: 11px;
            padding: 2px 7px;
            border-radius: 4px;
            margin-right: 6px;
          }

          /* Tabelas de Indicadores */
          .kpi-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
          .kpi-table th, .kpi-table td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 12.5px; }
          .kpi-table th { background: #0f172a; color: #ffffff; text-align: left; font-weight: 600; font-size: 12px; letter-spacing: 0.2px; }
          .kpi-table tr:nth-child(even) { background: #f8fafc; }
          .kpi-table tr.highlight-row { background: #fff7ed; }
          .kpi-table tr.alert-row { background: #fef2f2; }

          /* Badges */
          .badge-alert { color: #b91c1c; font-weight: bold; background: #fee2e2; padding: 2px 8px; border-radius: 4px; font-size: 11px; border: 1px solid #fecaca; }
          .badge-orange { color: #c2410c; font-weight: bold; background: #ffedd5; padding: 2px 8px; border-radius: 4px; font-size: 11px; border: 1px solid #fed7aa; }
          .badge-blue { color: #0369a1; font-weight: bold; background: #e0f2fe; padding: 2px 8px; border-radius: 4px; font-size: 11px; border: 1px solid #bae6fd; }

          /* Grade 2 Colunas */
          .grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }

          /* Mapa no Relatório */
          .map-report-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            overflow: hidden;
            background: #0f172a;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          }
          .map-report-img {
            width: 100%;
            height: auto;
            max-height: 480px;
            object-fit: cover;
            display: block;
          }
          .map-report-caption {
            background: #f8fafc;
            border-top: 1px solid #cbd5e1;
            padding: 8px 12px;
            font-size: 11px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }

          /* Síntese Técnica */
          .synthesis-card {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 14px 16px;
            margin-bottom: 20px;
            font-size: 12.5px;
            line-height: 1.6;
            color: #1e293b;
          }

          /* Rodapé & Assinaturas */
          .signature-box {
            margin-top: 40px;
            display: flex;
            justify-content: center;
            text-align: center;
            page-break-inside: avoid;
          }
          .signature-line {
            border-top: 1px solid #0f172a;
            padding-top: 6px;
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
          }
          .signature-sub {
            font-size: 11px;
            color: #64748b;
          }

          .footer-info { 
            margin-top: 30px; 
            border-top: 1px solid #cbd5e1; 
            padding-top: 10px; 
            font-size: 11px; 
            color: #64748b; 
            display: flex; 
            justify-content: space-between; 
          }

          @media print {
            .no-print { display: none; }
            body { margin: 10mm 15mm; font-size: 12px; }
            .map-report-img { max-height: 380px; }
            .kpi-table th { background: #1e293b !important; color: #fff !important; -webkit-print-color-adjust: exact; }
            h3.section-title { page-break-after: avoid; }
            table { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <!-- Botão de Ação / Impressão -->
        <div class="no-print" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; background: #0f172a; padding: 10px 16px; border-radius: 6px; color: #fff;">
          <div>
            <strong>Boletim Oficial de Situação Territorial</strong> &bull; Pronto para exportação em PDF ou impressão
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="window.print()" style="background: #ff7800; color: #fff; border: none; padding: 8px 18px; font-weight: 700; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              🖨️ Imprimir / Salvar em PDF
            </button>
            <button onclick="window.close()" style="background: #334155; color: #fff; border: none; padding: 8px 14px; font-weight: 600; border-radius: 4px; cursor: pointer;">
              Fechar
            </button>
          </div>
        </div>

        <!-- 1. IDENTIFICAÇÃO INSTITUCIONAL -->
        <div class="report-header">
          <div class="header-brand">
            <img src="assets/logo-defesa-civil.jpg" alt="Logo Defesa Civil Passo Fundo" class="header-logo" />
            <div>
              <div class="inst-title">PREFEITURA MUNICIPAL DE PASSO FUNDO / RS</div>
              <div class="inst-sub">COORDENADORIA MUNICIPAL DE PROTEÇÃO E DEFESA CIVIL</div>
              <div class="inst-dept">PORTAL GEOESPACIAL E SISTEMA DE APOIO À DECISÃO OPERACIONAL (WEBGIS)</div>
            </div>
          </div>
          <div class="meta-date">
            <strong>Data / Hora de Emissão:</strong><br>${dataEmissao}<br>
            <span style="color:#0284c7; font-weight:700;">SIRGAS 2000 UTM 22S</span>
          </div>
        </div>

        <div class="meta-box">
          <strong>Finalidade do Documento:</strong> Este boletim técnico consolida em tempo real os indicadores espaciais, dados censitários e camadas cartográficas prioritárias para monitoramento preventivo, análise de riscos hidrológicos e suporte à gestão de desastres no Município de Passo Fundo / RS.
        </div>

        <!-- 2. INDICADORES TERRITORIAIS E DE RISCO -->
        <h3 class="section-title">
          <span><span class="badge-num">1</span> INDICADORES TERRITORIAIS E DE RISCO</span>
          <span class="badge-blue">BASE OFICIAL INTEGRADA</span>
        </h3>
        <table class="kpi-table">
          <thead>
            <tr>
              <th style="width:40%;">Indicador Geoespacial</th>
              <th style="width:30%;">Valor Registrado</th>
              <th style="width:30%;">Fonte / Metadado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Área Territorial Oficial</strong></td>
              <td><strong>${formatNumber(stats.totalAreaKm2, 2)} km²</strong></td>
              <td>IBGE / Limite Municipal Oficial</td>
            </tr>
            <tr>
              <td><strong>População Municipal Total</strong></td>
              <td><strong>${formatNumber(stats.totalPop, 0)} habitantes</strong></td>
              <td>Censo Demográfico IBGE 2022</td>
            </tr>
            <tr>
              <td><strong>Total de Domicílios Recenseados</strong></td>
              <td>${formatNumber(stats.totalDomicilios, 0)} domicílios</td>
              <td>Censo Demográfico IBGE 2022</td>
            </tr>
            <tr>
              <td><strong>Densidade Demográfica Média</strong></td>
              <td>${formatNumber(stats.avgDensity, 1)} hab/km²</td>
              <td>Cálculo Territorial Municipal</td>
            </tr>
            <tr class="highlight-row">
              <td><strong>Residências Identificadas na Faixa de 30 metros</strong></td>
              <td><strong style="color:#ea580c;">${formatNumber(totalResidencias, 0)} residências</strong></td>
              <td>Levantamento Cadastral de Risco (Rio Passo Fundo)</td>
            </tr>
            <tr class="highlight-row">
              <td><strong>Área da Faixa de 30 metros do Rio Passo Fundo</strong></td>
              <td><strong>${formatNumber(stats.app30mHa, 2)} hectares</strong> (${formatNumber(stats.app30mHa * 10000, 0)} m²)</td>
              <td>Faixa Legal de 30m (Lei Federal 12.651/2012)</td>
            </tr>
            <tr>
              <td><strong>Extensão do Curso Principal do Rio Passo Fundo</strong></td>
              <td><strong>${formatNumber(stats.rioPassoFundoKm, 2)} km</strong></td>
              <td>Mapeamento Cartográfico Hidrográfico</td>
            </tr>
            <tr class="alert-row">
              <td><strong>Área Atingida pela Enchente de 2024</strong></td>
              <td><strong style="color:#dc2626;">${formatNumber(stats.floodAreaKm2, 2)} km² (${formatNumber(stats.floodAreaHa, 2)} hectares)</strong></td>
              <td><span class="badge-alert">Decreto Emergencial 57.600/2024 (ADA)</span></td>
            </tr>
            <tr>
              <td><strong>Extensão Total da Malha Hidrográfica</strong></td>
              <td>${formatNumber(stats.hidroKm, 2)} km (${formatNumber(3739, 0)} trechos fluviais)</td>
              <td>Hidrografia Municipal de Passo Fundo</td>
            </tr>
            <tr>
              <td><strong>Extensão Total da Infraestrutura Viária</strong></td>
              <td>${formatNumber(stats.totalViasKm, 2)} km</td>
              <td>Malha Viária Urbana, Rodovias e Estradas Rurais</td>
            </tr>
          </tbody>
        </table>

        <!-- 2. CONDIÇÕES METEOROLÓGICAS NO MOMENTO DA EMISSÃO -->
        <h3 class="section-title">
          <span><span class="badge-num">2</span> CONDIÇÕES METEOROLÓGICAS NO MOMENTO DA EMISSÃO</span>
          <span class="badge-blue">REDE HIDROMETEOROLÓGICA OFICIAL RS</span>
        </h3>

        ${weatherData && weatherData.success ? `
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px; font-size: 12px; color: #475569;">
              <div><strong>Estação meteorológica:</strong> Passo Fundo — DCRS-00016</div>
              <div><strong>Leitura meteorológica:</strong> ${weatherReadingDateStr}</div>
            </div>

            <table class="kpi-table" style="margin-bottom: 8px;">
              <thead>
                <tr>
                  <th style="width:50%;">Parâmetro Hidrometeorológico</th>
                  <th style="width:50%;">Valor Registrado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Temperatura atual</strong></td>
                  <td><strong>${tempStr}</strong></td>
                </tr>
                <tr>
                  <td><strong>Sensação térmica</strong></td>
                  <td>${sensStr}</td>
                </tr>
                <tr>
                  <td><strong>Umidade relativa</strong></td>
                  <td>${umidStr}</td>
                </tr>
                <tr>
                  <td><strong>Pressão atmosférica</strong></td>
                  <td>${pressStr}</td>
                </tr>
                <tr>
                  <td><strong>Vento</strong></td>
                  <td>${ventoStr}</td>
                </tr>
                <tr>
                  <td><strong>Chuva acumulada — última 1 hora</strong></td>
                  <td>${chuva1hStr}</td>
                </tr>
                <tr class="highlight-row">
                  <td><strong>Chuva acumulada — últimas 24 horas</strong></td>
                  <td><strong style="color: #ea580c;">${chuva24hStr}</strong></td>
                </tr>
                ${nivelRioRow}
              </tbody>
            </table>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              <strong>Fonte:</strong> Rede Hidrometeorológica da Defesa Civil RS.
            </div>
          </div>
        ` : `
          <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px; color: #9f1239; font-size: 12px;">
            <strong>Estação meteorológica:</strong> Passo Fundo — DCRS-00016<br>
            <strong>Dados meteorológicos:</strong> indisponíveis no momento da emissão (tentativa registrada em ${dataEmissao}).
          </div>
        `}

        <!-- 2.1 REDE METEOROLÓGICA PLUGFIELD (16 ESTAÇÕES) -->
        <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 18px 0 8px 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <span>REDE METEOROLÓGICA PLUGFIELD (16 ESTAÇÕES OFICIAIS DE PASSO FUNDO)</span>
          <span style="font-size: 11px; font-weight: 600; color: #10b981; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 4px;">16 ESTAÇÕES MONITORADAS</span>
        </h4>
        <div style="font-size: 11.5px; color: #475569; margin-bottom: 8px;">
          <strong>Dados meteorológicos consultados em:</strong> ${dataEmissao} &bull; Fonte: API Oficial Plugfield
        </div>

        ${plugfieldRowsHtml ? `
          <div style="overflow-x: auto; margin-bottom: 16px;">
            <table class="kpi-table" style="font-size: 11px; margin-bottom: 6px;">
              <thead>
                <tr>
                  <th>Estação (ID)</th>
                  <th>Bairro / Local</th>
                  <th>Temp Atual</th>
                  <th>Mín / Máx</th>
                  <th>Chuva Hoje</th>
                  <th>Acum. Mês</th>
                  <th>Vento / Rajada / Dir</th>
                  <th>Pressão</th>
                  <th>Nível do Rio</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${plugfieldRowsHtml}
              </tbody>
            </table>
          </div>
          <div style="font-size: 10.5px; color: #64748b; margin-top: 0; margin-bottom: 18px;">
            *Nota: Média mensal de temperatura indisponível — série histórica insuficiente. Para estações sem sensor de nível ativo é registrado "Dado não disponível para esta estação".
          </div>

          ${plugfieldChartsHtml}
        ` : `
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 18px; color: #64748b; font-size: 12px;">
            Dados da Rede Meteorológica Plugfield em processamento ou indisponíveis no momento da consulta.
          </div>
        `}

        <!-- 3. RIO PASSO FUNDO — ANÁLISE HIDROLÓGICA E TERRITORIAL -->
        <h3 class="section-title">
          <span><span class="badge-num">3</span> RIO PASSO FUNDO — ANÁLISE HIDROLÓGICA E TERRITORIAL</span>
          <span class="badge-orange">CORPO HÍDRICO PRINCIPAL</span>
        </h3>
        <table class="kpi-table">
          <thead>
            <tr>
              <th>Parâmetro Hidrológico</th>
              <th>Valor / Especificação</th>
              <th>Enquadramento Legal e Técnico</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Nome do Curso D'água</strong></td>
              <td><strong>Rio Passo Fundo (Curso Principal)</strong></td>
              <td>Bacia Hidrográfica do Rio Passo Fundo / Rio da Várzea</td>
            </tr>
            <tr>
              <td><strong>Extensão Analisada no Município</strong></td>
              <td><strong>${formatNumber(stats.rioPassoFundoKm, 2)} km</strong> (17.680 metros)</td>
              <td>Vetorização contínua da calha fluvial</td>
            </tr>
            <tr>
              <td><strong>Largura da Faixa de 30 metros Considerada</strong></td>
              <td><strong>30 metros em ambas as margens</strong></td>
              <td>Art. 4º da Lei Federal 12.651/2012 (Código Florestal)</td>
            </tr>
            <tr>
              <td><strong>Área Total da Faixa de 30 metros</strong></td>
              <td><strong>${formatNumber(stats.app30mHa, 2)} hectares</strong></td>
              <td>Polígono de Proteção Permanente ao longo do curso</td>
            </tr>
            <tr>
              <td><strong>Residências Edificadas na Faixa de 30 metros</strong></td>
              <td><strong>${formatNumber(totalResidencias, 0)} edificações</strong></td>
              <td>Pontos cadastrados com menor distância linear calculada</td>
            </tr>
            <tr>
              <td><strong>Base Aerofotogramétrica / Ortofotos</strong></td>
              <td><strong>5 mosaicos de alta resolução (GSD 5cm a 10cm)</strong></td>
              <td>Levantamento de Julho de 2026 (SIRGAS 2000 UTM 22S)</td>
            </tr>
          </tbody>
        </table>

        <!-- 4. LEVANTAMENTO DE RESIDÊNCIAS NA FAIXA DE 30 METROS -->
        <h3 class="section-title">
          <span><span class="badge-num">4</span> LEVANTAMENTO DE RESIDÊNCIAS NA FAIXA DE 30 METROS</span>
          <span class="badge-orange">${totalResidencias} EDIFICAÇÕES MAPEADAS</span>
        </h3>
        <div class="grid-2col">
          <table class="kpi-table" style="margin-bottom:0;">
            <thead>
              <tr>
                <th>Faixa de Distância à Calha</th>
                <th>Residências</th>
                <th>Grau de Vulnerabilidade</th>
              </tr>
            </thead>
            <tbody>
              <tr class="alert-row">
                <td><strong>Menor que 10 metros</strong></td>
                <td><strong>${countMenor10m} un</strong></td>
                <td><span class="badge-alert">Risco Muito Alto (Margem Crítica)</span></td>
              </tr>
              <tr class="highlight-row">
                <td><strong>Entre 10 e 20 metros</strong></td>
                <td><strong>${count10a20m} un</strong></td>
                <td><span class="badge-orange">Risco Alto (Proximidade Direta)</span></td>
              </tr>
              <tr>
                <td><strong>Entre 20 e 30 metros</strong></td>
                <td><strong>${count20a30m} un</strong></td>
                <td><span class="badge-blue">Risco Moderado (Faixa Limítrofe)</span></td>
              </tr>
              <tr>
                <td><strong>Acima de 30 metros (Entorno)</strong></td>
                <td><strong>${countMaior30m} un</strong></td>
                <td>Faixa de Transição e Amortecimento</td>
              </tr>
              <tr>
                <td><strong>TOTAL ANALISADO</strong></td>
                <td><strong>${totalResidencias} un</strong></td>
                <td><strong>100% dos pontos inventariados</strong></td>
              </tr>
            </tbody>
          </table>

          <table class="kpi-table" style="margin-bottom:0;">
            <thead>
              <tr>
                <th>Métrica de Proximidade Linear</th>
                <th>Valor em Metros</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Menor Distância Registrada</strong></td>
                <td><strong style="color:#dc2626;">${formatNumber(distMin, 2)} metros</strong> (Residência ID 110)</td>
              </tr>
              <tr>
                <td><strong>Distância Média das Residências</strong></td>
                <td><strong>${formatNumber(distMedia, 2)} metros</strong></td>
              </tr>
              <tr>
                <td><strong>Maior Distância no Inventário</strong></td>
                <td>${formatNumber(distMax, 2)} metros</td>
              </tr>
              <tr>
                <td><strong>Identificação Individual</strong></td>
                <td>Numeração cadastral única (ID 1 a ${totalResidencias})</td>
              </tr>
              <tr>
                <td><strong>Camada Utilizada no WebGIS</strong></td>
                <td><code>Residências na Faixa de 30 metros (318 Pontos)</code></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 5. ENCHENTE 2024 — ÁREA DE IMPACTO -->
        <h3 class="section-title">
          <span><span class="badge-num">5</span> ENCHENTE 2024 — ÁREA DE IMPACTO E DIAGNÓSTICO DE VULNERABILIDADE</span>
          <span class="badge-alert">DECRETO 57.600/2024</span>
        </h3>
        <table class="kpi-table">
          <thead>
            <tr>
              <th>Parâmetro de Impacto</th>
              <th>Dimensão / Estimativa</th>
              <th>Contexto Operacional da Defesa Civil</th>
            </tr>
          </thead>
          <tbody>
            <tr class="alert-row">
              <td><strong>Mancha de Inundação Oficial (ADA)</strong></td>
              <td><strong>${formatNumber(stats.floodAreaKm2, 2)} km²</strong> (${formatNumber(stats.floodAreaHa, 2)} hectares)</td>
              <td>Mapeamento oficial pós-evento extremo de 2024</td>
            </tr>
            <tr>
              <td><strong>Setores Censitários no Perímetro</strong></td>
              <td><strong>14 setores censitários interceptados</strong></td>
              <td>Áreas com cotas altimétricas críticas na planície de inundação</td>
            </tr>
            <tr>
              <td><strong>População Potencialmente Exposta</strong></td>
              <td><strong>~1.450 a 2.100 moradores</strong> no perímetro direto</td>
              <td>Estimativa baseada nos microdados setoriais IBGE 2022</td>
            </tr>
            <tr>
              <td><strong>Domicílios no Entorno / Risco</strong></td>
              <td><strong>~580 a 820 domicílios</strong></td>
              <td>Cruzamento espacial da mancha ADA com malha urbana</td>
            </tr>
            <tr>
              <td><strong>Bairros com Trechos Atingidos</strong></td>
              <td>Petrópolis, Vila Luiza, Lucas Araújo, São Cristóvão e áreas ribeirinhas</td>
              <td>Monitoramento preventivo prioritário nas réguas fluviométricas</td>
            </tr>
          </tbody>
        </table>

        <!-- 6. MALHA HIDROGRÁFICA MUNICIPAL -->
        <h3 class="section-title">
          <span><span class="badge-num">6</span> MALHA HIDROGRÁFICA MUNICIPAL</span>
          <span class="badge-blue">BACIAS E CURSOS D'ÁGUA</span>
        </h3>
        <table class="kpi-table">
          <thead>
            <tr>
              <th>Componente Hidrográfico</th>
              <th>Extensão Linear</th>
              <th>Detalhamento</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Total da Rede Hidrográfica Mapeada</strong></td>
              <td><strong>${formatNumber(stats.hidroKm, 2)} km</strong></td>
              <td>3.739 segmentos fluviais classificados</td>
            </tr>
            <tr>
              <td><strong>Rio Passo Fundo (Calha Principal)</strong></td>
              <td><strong>${formatNumber(stats.rioPassoFundoKm, 2)} km</strong></td>
              <td>Curso receptor principal da drenagem urbana</td>
            </tr>
            <tr>
              <td><strong>Arroios, Córregos e Afluentes</strong></td>
              <td><strong>${formatNumber(stats.hidroKm - stats.rioPassoFundoKm, 2)} km</strong></td>
              <td>Arroio Miranda, Arroio Santo Antônio, Arroio Jerônimo Coelho e tributários</td>
            </tr>
          </tbody>
        </table>

        <!-- 7. INFRAESTRUTURA VIÁRIA E TRANSPORTES -->
        <h3 class="section-title">
          <span><span class="badge-num">7</span> INFRAESTRUTURA VIÁRIA E MOBILIDADE</span>
          <span>MALHA DE ACESSO E EVACUAÇÃO</span>
        </h3>
        <table class="kpi-table">
          <thead>
            <tr>
              <th>Tipo de Infraestrutura</th>
              <th>Extensão Linear</th>
              <th>Importância Operacional para Emergências</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Malha Viária Urbana</strong></td>
              <td><strong>${formatNumber(stats.viariaKm, 2)} km</strong> (11.595 trechos)</td>
              <td>Acesso a bairros, rotas de socorro e atendimento primário</td>
            </tr>
            <tr>
              <td><strong>Estradas Municipais Rurais</strong></td>
              <td><strong>${formatNumber(stats.estradasMunicipaisKm, 2)} km</strong> (164 trechos)</td>
              <td>Conexão com distritos do interior e escoamento</td>
            </tr>
            <tr>
              <td><strong>Rodovias Estaduais (ERS)</strong></td>
              <td><strong>${formatNumber(stats.rodoviaEstadualKm, 2)} km</strong></td>
              <td>ERS-135, ERS-324 (rotas intermunicipais estratégicas)</td>
            </tr>
            <tr>
              <td><strong>Rodovias Federais (BR)</strong></td>
              <td><strong>${formatNumber(stats.rodoviaFederalKm, 2)} km</strong></td>
              <td>BR-285, BR-153 (eixos de transporte regional)</td>
            </tr>
            <tr>
              <td><strong>Malha Ferroviária</strong></td>
              <td><strong>${formatNumber(stats.ferroviaKm, 2)} km</strong></td>
              <td>Linha Férrea ALL / Rumo Logística</td>
            </tr>
            <tr class="highlight-row">
              <td><strong>TOTAL DA MALHA VIÁRIA</strong></td>
              <td><strong>${formatNumber(stats.totalViasKm, 2)} km</strong></td>
              <td>Rede completa de circulação do Município de Passo Fundo</td>
            </tr>
          </tbody>
        </table>

        <!-- 8. INDICADORES DEMOGRÁFICOS DO CENSO 2022 -->
        <h3 class="section-title">
          <span><span class="badge-num">8</span> CENSO DEMOGRÁFICO & INDICADORES SETORIAIS (IBGE 2022)</span>
          <span class="badge-blue">DISTRIBUIÇÃO POPULACIONAL</span>
        </h3>
        <div class="grid-2col">
          <table class="kpi-table" style="margin-bottom:0;">
            <thead>
              <tr>
                <th>Top 5 Bairros Mais Populosos</th>
                <th>População (hab)</th>
              </tr>
            </thead>
            <tbody>
              ${stats.bairrosList.slice(0, 5).map(b => `
                <tr>
                  <td><strong>${b.name}</strong></td>
                  <td>${formatNumber(b.pop, 0)} hab</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <table class="kpi-table" style="margin-bottom:0;">
            <thead>
              <tr>
                <th>Distrito Municipal</th>
                <th>População (hab)</th>
              </tr>
            </thead>
            <tbody>
              ${stats.distritosList.slice(0, 5).map(d => `
                <tr>
                  <td><strong>${d.name}</strong></td>
                  <td>${formatNumber(d.pop, 0)} hab</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- 8.1 ESTRUTURA ETÁRIA E GRUPOS PRIORITÁRIOS (CENSO IBGE 2022) -->
        <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 16px 0 8px 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <span>ESTRUTURA ETÁRIA E GRUPOS PRIORITÁRIOS DE ATENÇÃO DA DEFESA CIVIL</span>
          <span style="font-size: 11px; font-weight: 600; color: #7c3aed; background: #f5f3ff; border: 1px solid #ddd6fe; padding: 2px 8px; border-radius: 4px;">205.627 RESIDENTES (CENSO 2022)</span>
        </h4>
        <table class="kpi-table">
          <thead>
            <tr>
              <th>Faixa Etária / Coorte</th>
              <th>População Residente</th>
              <th>Proporção Municipal</th>
              <th>Enquadramento Operacional da Defesa Civil</th>
            </tr>
          </thead>
          <tbody>
            <tr class="alert-row">
              <td><strong>Primeira Infância (0 a 4 anos)</strong></td>
              <td><strong>12.482 crianças</strong></td>
              <td><strong>6,1%</strong></td>
              <td><span class="badge-alert">Prioridade Máxima — Evacuação e Resgate</span></td>
            </tr>
            <tr class="highlight-row">
              <td><strong>Crianças (5 a 9 anos)</strong></td>
              <td><strong>13.200 crianças</strong></td>
              <td><strong>6,4%</strong></td>
              <td><span class="badge-orange">Alta Prioridade — Atendimento Infantil e Escolar</span></td>
            </tr>
            <tr>
              <td><strong>Adolescentes / Pré-jovens (10 a 14 anos)</strong></td>
              <td><strong>12.560 habitantes</strong></td>
              <td><strong>6,1%</strong></td>
              <td>População em idade escolar e dependência</td>
            </tr>
            <tr>
              <td><strong>Jovens (15 a 19 anos)</strong></td>
              <td><strong>12.533 habitantes</strong></td>
              <td><strong>6,1%</strong></td>
              <td>Juventude e apoio operacional voluntário</td>
            </tr>
            <tr>
              <td><strong>Adultos (20 a 59 anos)</strong></td>
              <td><strong>119.496 habitantes</strong></td>
              <td><strong>58,1%</strong></td>
              <td>População adulta economicamente ativa</td>
            </tr>
            <tr class="alert-row">
              <td><strong>População Idosa (60 anos ou mais)</strong></td>
              <td><strong style="color:#7c3aed;">35.356 idosos</strong></td>
              <td><strong>17,2%</strong></td>
              <td><span class="badge-alert" style="background:#f5f3ff; color:#6d28d9; border-color:#ddd6fe;">Grupo Prioritário Crítico — Mobilidade Reduzida e Abrigamento</span></td>
            </tr>
            <tr class="highlight-row">
              <td><strong>TOTAL GERAL RECENSEADO</strong></td>
              <td><strong>205.627 habitantes</strong></td>
              <td><strong>100,0%</strong></td>
              <td><strong>47.838 indivíduos (23,3%) em grupos de alta atenção (0-9 e 60+ anos)</strong></td>
            </tr>
          </tbody>
        </table>

        <!-- 8.2 VULNERABILIDADE SOCIAL E RENDIMENTO DOMICILIAR MÉDIO -->
        <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 16px 0 8px 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <span>VULNERABILIDADE SOCIAL — RENDIMENTO MÉDIO DOMICILIAR (CENSO IBGE 2022)</span>
          <span style="font-size: 11px; font-weight: 600; color: #0284c7; background: #f0f9ff; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 4px;">307 SETORES AVALIADOS</span>
        </h4>
        <table class="kpi-table">
          <thead>
            <tr>
              <th>Faixa de Rendimento Médio Domiciliar</th>
              <th>Qtd Setores</th>
              <th>% Setores</th>
              <th>Grau de Vulnerabilidade Socioeconômica</th>
            </tr>
          </thead>
          <tbody>
            <tr class="alert-row">
              <td><strong>Até R$ 2.000,00</strong> (Rendimento Mínimo: R$ 595,45)</td>
              <td><strong>25 setores</strong></td>
              <td><strong>8,1%</strong></td>
              <td><span class="badge-alert">Alta Vulnerabilidade — Baixa capacidade de auto-recuperação</span></td>
            </tr>
            <tr class="highlight-row">
              <td><strong>De R$ 2.000,01 a R$ 3.000,00</strong></td>
              <td><strong>107 setores</strong></td>
              <td><strong>34,9%</strong></td>
              <td><span class="badge-orange">Média-Alta Vulnerabilidade — Atenção prioritária da Defesa Civil</span></td>
            </tr>
            <tr>
              <td><strong>De R$ 3.000,01 a R$ 4.500,00</strong></td>
              <td><strong>84 setores</strong></td>
              <td><strong>27,4%</strong></td>
              <td><span class="badge-blue">Média Vulnerabilidade</span></td>
            </tr>
            <tr>
              <td><strong>De R$ 4.500,01 a R$ 7.000,00</strong></td>
              <td><strong>70 setores</strong></td>
              <td><strong>22,8%</strong></td>
              <td>Média-Baixa Vulnerabilidade</td>
            </tr>
            <tr>
              <td><strong>Acima de R$ 7.000,00</strong> (Rendimento Máximo: R$ 22.417,57)</td>
              <td><strong>21 setores</strong></td>
              <td><strong>6,8%</strong></td>
              <td>Baixa Vulnerabilidade Socioeconômica</td>
            </tr>
            <tr class="highlight-row">
              <td><strong>MÉDIA MUNICIPAL GERAL</strong></td>
              <td><strong>307 setores</strong></td>
              <td><strong>100,0%</strong></td>
              <td><strong>R$ 3.895,50 de rendimento médio mensal por responsável</strong></td>
            </tr>
          </tbody>
        </table>
        <div style="font-size:10.5px; color:#64748b; margin-top:-6px; margin-bottom:18px;">
          *Fonte dos microdados censitários: IBGE — Censo Demográfico 2022 (Malha Setorial de Rendimento e Demografia Redus Passo Fundo/RS - 4314100).
        </div>

        <!-- 9. EXPOSIÇÃO E COBERTURA DE PROTEÇÃO (SGB x REDE DE ABRIGOS) -->
        <h3 class="section-title">
          <span><span class="badge-num">9</span> EXPOSIÇÃO E COBERTURA DE PROTEÇÃO</span>
          <span class="badge-orange">DIAGNÓSTICO SGB 2025 x REDE DE ABRIGOS</span>
        </h3>
        <table class="kpi-table">
          <thead>
            <tr>
              <th>Dimensão Analítica</th>
              <th>Total / Percentual</th>
              <th>Detalhamento Geotécnico e Operacional</th>
            </tr>
          </thead>
          <tbody>
            <tr class="alert-row">
              <td><strong>População Total em Áreas de Risco</strong></td>
              <td><strong>2.468 habitantes</strong></td>
              <td>Mapeamento oficial do Serviço Geológico do Brasil (SGB, 2025)</td>
            </tr>
            <tr class="highlight-row">
              <td><strong>Edificações Mapeadas em Risco</strong></td>
              <td><strong>617 unidades</strong> (25 setores)</td>
              <td>Área territorial delimitada de 32,95 ha (Média: 4,0 hab/edif)</td>
            </tr>
            <tr>
              <td><strong>Distribuição por Grau de Risco</strong></td>
              <td><strong>21 Alto (81,8%) | 4 Muito Alto (18,2%)</strong></td>
              <td>505 edif. em Risco Alto (R3) e 112 edif. em Risco Muito Alto (R4)</td>
            </tr>
            <tr>
              <td><strong>Distribuição por Vulnerabilidade</strong></td>
              <td><strong>16 Alta (71,3%) | 9 Média (28,7%)</strong></td>
              <td>440 edif. com vulnerabilidade construtiva e ambiental alta</td>
            </tr>
            <tr>
              <td><strong>Cobertura Geral de Abrigos (Raio de 2 km)</strong></td>
              <td><strong style="color:#16a34a;">99,8% de atendimento</strong></td>
              <td>2.464 moradores (616 edif.) contemplados no raio de 2.000m dos 17 abrigos</td>
            </tr>
            <tr>
              <td><strong>Cobertura Imediata a Pé (Raio de 1 km)</strong></td>
              <td><strong>66,3% de atendimento direto</strong></td>
              <td>1.636 moradores (409 edif.) a menos de 1.000m de um abrigo municipal</td>
            </tr>
            <tr>
              <td><strong>População Fora do Raio Imediato de 1 km</strong></td>
              <td><strong>832 moradores (33,7%)</strong></td>
              <td>208 edif. situadas entre 1 km e 2 km de deslocamento até a estrutura de acolhimento</td>
            </tr>
            <tr>
              <td><strong>Top 3 Setores Mais Críticos (IPP*)</strong></td>
              <td><strong>Ocupação Floresta, Beco Manoel Portela e Entrerios</strong></td>
              <td>Setores prioritários identificados pelo Índice de Prioridade de Proteção (IPP)</td>
            </tr>
          </tbody>
        </table>
        <div style="font-size:11px; color:#64748b; margin-top:-6px; margin-bottom:16px;">
          *Fonte dos dados: Serviço Geológico do Brasil (SGB), 2025; Defesa Civil de Passo Fundo e demais fontes oficiais do portal.
        </div>

        <!-- 10. COMPOSIÇÃO CARTOGRÁFICA -->
        ${mapSnapshot ? `
          <h3 class="section-title">
            <span><span class="badge-num">10</span> COMPOSIÇÃO CARTOGRÁFICA DA SITUAÇÃO OPERACIONAL</span>
            <span class="badge-blue">MAPA GERADO NO MOMENTO DA EMISSÃO</span>
          </h3>
          <div class="map-report-card">
            <img src="${mapSnapshot}" alt="Composição Cartográfica WebGIS Defesa Civil Passo Fundo" class="map-report-img" />
            <div class="map-report-caption">
              <span><strong>Visualização Cartográfica:</strong> Projeção UTM Fuso 22S &bull; Datum SIRGAS 2000 (EPSG:31982)</span>
              <span><strong>Passo Fundo/RS</strong> &bull; Sistema WebGIS Defesa Civil</span>
            </div>
          </div>
        ` : ''}

        <!-- 11. SÍNTESE TÉCNICA OPERACIONAL DINÂMICA -->
        <h3 class="section-title">
          <span><span class="badge-num">11</span> SÍNTESE TÉCNICA E RECOMENDAÇÕES OPERACIONAIS</span>
          <span class="badge-orange">PARECER TÉCNICO</span>
        </h3>
        <div class="synthesis-card">
          <p>
            No território do Município de Passo Fundo / RS, com área de <strong>${formatNumber(stats.totalAreaKm2, 2)} km²</strong> e população de <strong>${formatNumber(stats.totalPop, 0)} habitantes</strong> (Censo 2022), foram cadastradas e georreferenciadas <strong>${formatNumber(totalResidencias, 0)} residências</strong> situadas no interior e entorno imediato da Faixa de 30 metros do Rio Passo Fundo.
          </p>
          <p style="margin-top:8px;">
            A análise métrica de proximidade indica que <strong>${countMenor10m} residências</strong> encontram-se a menos de 10 metros da margem do rio (menor distância aferida: <strong>${formatNumber(distMin, 2)} m</strong>, ID 110), e <strong>${count10a20m} residências</strong> situam-se na faixa crítica entre 10 e 20 metros. A distância média das edificações até a calha do rio é de <strong>${formatNumber(distMedia, 2)} metros</strong>.
          </p>
          <p style="margin-top:8px;">
            A mancha de inundação do evento extremo de 2024 totalizou <strong>${formatNumber(stats.floodAreaKm2, 2)} km² (${formatNumber(stats.floodAreaHa, 2)} hectares)</strong>, demonstrando a necessidade de manter o monitoramento contínuo das réguas hidrológicas ao longo dos <strong>${formatNumber(stats.rioPassoFundoKm, 2)} km</strong> do curso principal e dos <strong>${formatNumber(stats.hidroKm, 2)} km</strong> de malha hídrica municipal.
          </p>
          <p style="margin-top:8px;">
            A análise integrada de <strong>Exposição e Cobertura de Proteção</strong> demonstra que os <strong>25 setores de risco mapeados pelo SGB (2025)</strong>, englobando <strong>617 edificações e 2.468 moradores</strong>, contam com <strong>99,8% de cobertura da rede municipal de abrigos no raio de 2 km (2.464 moradores)</strong> e <strong>66,3% de cobertura imediata no raio de 1 km (1.636 moradores)</strong>, permitindo resposta célere em situações de contingência e evacuação.
          </p>
          <p style="margin-top:8px;">
            A incorporação dos microdados do <strong>Censo IBGE 2022</strong> revela que Passo Fundo possui <strong>47.838 indivíduos (23,3% da população)</strong> em faixas etárias de atenção prioritária para resgates e suporte humanitário, sendo <strong>12.482 crianças na primeira infância (0 a 4 anos)</strong> e <strong>35.356 pessoas idosas (60 anos ou mais)</strong>. Adicionalmente, <strong>132 setores censitários (43,0% do total avaliado)</strong> apresentam rendimento médio domiciliar de até R$ 3.000,00, caracterizando zonas de vulnerabilidade social que exigem assistência prioritária da Defesa Civil em eventos adversos.
          </p>
        </div>

        <!-- 12. INFORMAÇÕES DE CONTATO DA DEFESA CIVIL -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color:#0f172a; font-size:12.5px;">Sede da Defesa Civil Municipal de Passo Fundo:</strong><br>
            <span style="color:#475569;">Av. Brasil Leste, 1528 - Petrópolis, Passo Fundo - RS, 99050-144</span>
          </div>
          <div style="text-align: right;">
            <strong style="color:#0f172a;">Telefone Oficial:</strong> <span style="color:#0284c7; font-weight:700;">+55 54 9194-0449</span><br>
            <span style="color:#dc2626; font-weight:700;">Emergência 24h: 199 / 193 / 192</span>
          </div>
        </div>

        <!-- 13. IDENTIFICAÇÃO DE AUTORIA TÉCNICA -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #ff7800; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px; color: #334155;">
          <strong style="color:#0f172a; font-size:12px; display:block; margin-bottom:2px;">Elaboração técnica:</strong>
          <strong style="color:#0f172a; font-size:12.5px;">Vagner A. Duarte – Geógrafo</strong><br>
        </div>

        <!-- 14. FONTES DOS DADOS -->
        <h3 class="section-title">
          <span><span class="badge-num">12</span> FONTES DOS DADOS E METADADOS</span>
          <span class="badge-blue">TRANSPARÊNCIA PÚBLICA</span>
        </h3>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; font-size: 11.5px; color: #334155; line-height: 1.5;">
          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a;">• Instituto Nacional de Meteorologia (INMET):</strong>
            Previsão do tempo municipal para 120 horas, avisos de tempo severo (Alertas2) e monitoramento da Estação Automática Passo Fundo (A831).
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a;">• Defesa Civil do Rio Grande do Sul:</strong>
            Alertas meteorológicos estaduais, boletins hidrometeorológicos e rede telemétrica de monitoramento.
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a;">• CPTEC / INPE:</strong>
            Modelos numéricos de previsão de tempo, radar meteorológico e imagens de satélite.
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a;">• Serviço Geológico do Brasil (SGB, 2025):</strong>
            Mapeamento de Áreas de Risco Geológico e Hidrológico e Domicílios em Risco (25 setores e 1.115 domicílios inventariados).
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a;">• IBGE — Censo Demográfico 2022:</strong>
            Malhas territoriais e informações censitárias utilizadas nas análises, quando aplicável.
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a;">• Defesa Civil de Passo Fundo:</strong>
            Informações e dados temáticos relacionados à Defesa Civil, rede oficial de 17 abrigos, ZPHs, áreas de risco e decretos municipais de emergência.
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a;">• Prefeitura Municipal de Passo Fundo:</strong>
            Bases cartográficas, levantamentos, mapeamentos e informações geoespaciais municipais utilizadas no portal, conforme cada camada.
          </div>
          <div>
            <strong style="color: #0f172a;">• Outras fontes:</strong>
            Quando uma camada utilizar fonte diferente, indicar sua origem especificamente nos metadados ou na descrição da respectiva camada.
          </div>
        </div>

        <!-- 14. AVISO INSTITUCIONAL -->
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; font-size: 11px; color: #1e3a8a; line-height: 1.5;">
          <strong>Aviso:</strong> Este relatório possui caráter exclusivamente informativo e institucional. As informações apresentadas são baseadas nas fontes e bases de dados disponíveis no momento da elaboração e podem estar sujeitas a atualizações. A utilização das informações deve considerar sua fonte, escala, data de atualização e finalidade.
        </div>

        <div style="font-size:11px; color:#64748b; margin-bottom:20px;">
          <strong>Camadas Cartográficas Ativas na Emissão:</strong> ${activeLayers.join(', ') || 'Todas as camadas temáticas padrão'}.
        </div>

        <!-- SEDE DA DEFESA CIVIL -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #ff7800; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; font-size: 11.5px; color: #334155; line-height: 1.5; page-break-inside: avoid;">
          <div style="font-weight: 800; font-size: 12.5px; color: #0f172a; margin-bottom: 6px;">
            🏢 SEDE DA DEFESA CIVIL
          </div>
          <div><strong>Endereço Oficial:</strong> Av. Brasil Leste, 1528 - Petrópolis, Passo Fundo - RS</div>
          <div style="margin-top: 3px;"><strong>Coordenadas UTM:</strong> Este (X): 364.325 m &bull; Norte (Y): 6.874.997 m &bull; <strong>Sistema de Referência:</strong> SIRGAS 2000 / UTM Zona 22S (EPSG:31982)</div>
        </div>

        <!-- CONTATOS OFICIAIS DA DEFESA CIVIL -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #ff7800; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px; font-size: 11.5px; color: #334155; line-height: 1.5; page-break-inside: avoid;">
          <div style="font-weight: 800; font-size: 12.5px; color: #0f172a; margin-bottom: 8px;">
            CONTATOS — DEFESA CIVIL DE PASSO FUNDO
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <strong style="color: #ea580c; display: block; margin-bottom: 4px; font-size: 11.5px;">Defesa Civil de Passo Fundo:</strong>
              <div>📱 <strong>WhatsApp:</strong> <a href="https://wa.me/5554991940449" target="_blank" style="color: #0284c7; text-decoration: none; font-weight: 700;">(54) 99194-0449</a></div>
              <div>✉️ <strong>E-mail:</strong> <a href="mailto:defesacivil@pmpf.rs.gov.br" style="color: #0284c7; text-decoration: none;">defesacivil@pmpf.rs.gov.br</a></div>
              <div>☎️ <strong>Telefones:</strong> <a href="tel:+555433167108" style="color: #0284c7; text-decoration: none;">(54) 3316-7108</a> / <a href="tel:+555433133768" style="color: #0284c7; text-decoration: none;">(54) 3313-3768</a></div>
            </div>
            <div>
              <strong style="color: #ea580c; display: block; margin-bottom: 4px; font-size: 11.5px;">Coordenadoria de Administração e Planejamento:</strong>
              <div>✉️ <strong>E-mail:</strong> <a href="mailto:capseg@pmpf.rs.gov.br" style="color: #0284c7; text-decoration: none;">capseg@pmpf.rs.gov.br</a></div>
              <div>☎️ <strong>Telefone:</strong> <a href="tel:+555433138458" style="color: #0284c7; text-decoration: none;">(54) 3313-8458</a></div>
            </div>
          </div>
        </div>

        <!-- ASSINATURA INSTITUCIONAL -->
        <div class="signature-box">
          <div style="min-width: 320px; max-width: 380px;">
            <div class="signature-line">COORDENADORIA MUNICIPAL DE DEFESA CIVIL</div>
            <div class="signature-sub">Município de Passo Fundo / RS</div>
          </div>
        </div>

        <!-- RODAPÉ FINAL -->
        <div class="footer-info">
          <span>Defesa Civil de Passo Fundo/RS &bull; Telefone de Emergência: 199</span>
          <span>Documento emitido automaticamente pelo Portal Geoespacial WebGIS &bull; SIRGAS 2000 UTM 22S</span>
        </div>
      </body>
      </html>
    `);

    reportWindow.document.close();
    Notification.success('Boletim de Situação gerado com sucesso!');
  }

  /**
   * Gera gráficos vetoriais SVG nítidos e compatíveis com impressão/PDF para o relatório
   */
  generatePlugfieldReportChartsHtml(refStation, refHistory) {
    if (!refHistory || refHistory.length === 0) return '';

    const width = 420;
    const height = 135;
    const padding = { top: 22, right: 15, bottom: 24, left: 38 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const n = refHistory.length;

    const getX = (i) => padding.left + (i / Math.max(1, n - 1)) * chartW;

    // 1. Gráfico de Temperatura (Linha)
    const avgs = refHistory.map(d => d.tempAvg).filter(v => v !== null && !isNaN(v));
    const mins = refHistory.map(d => d.tempMin).filter(v => v !== null && !isNaN(v));
    const maxs = refHistory.map(d => d.tempMax).filter(v => v !== null && !isNaN(v));
    const allTemps = [...avgs, ...mins, ...maxs];
    const minTemp = allTemps.length ? Math.floor(Math.min(...allTemps) - 2) : 10;
    const maxTemp = allTemps.length ? Math.ceil(Math.max(...allTemps) + 2) : 30;
    const tempRange = maxTemp - minTemp || 1;
    const getYTemp = (val) => padding.top + chartH - ((val - minTemp) / tempRange) * chartH;

    const pointsTempAvg = refHistory.map((d, i) => d.tempAvg != null ? `${getX(i)},${getYTemp(d.tempAvg)}` : '').filter(Boolean).join(' ');
    const pointsTempMin = refHistory.map((d, i) => d.tempMin != null ? `${getX(i)},${getYTemp(d.tempMin)}` : '').filter(Boolean).join(' ');
    const pointsTempMax = refHistory.map((d, i) => d.tempMax != null ? `${getX(i)},${getYTemp(d.tempMax)}` : '').filter(Boolean).join(' ');

    const svgTemp = `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
        <text x="10" y="15" font-size="10.5" font-weight="bold" fill="#0f172a">Temperatura — Últimos 5 Dias (°C)</text>
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>
        ${pointsTempMin ? `<polyline fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3 3" points="${pointsTempMin}"/>` : ''}
        ${pointsTempMax ? `<polyline fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3 3" points="${pointsTempMax}"/>` : ''}
        ${pointsTempAvg ? `<polyline fill="none" stroke="#f97316" stroke-width="2.2" points="${pointsTempAvg}"/>` : ''}
        ${refHistory.map((d, i) => `
          ${d.tempAvg != null ? `<circle cx="${getX(i)}" cy="${getYTemp(d.tempAvg)}" r="3" fill="#f97316"/>` : ''}
          <text x="${getX(i)}" y="${padding.top + chartH + 14}" font-size="9" fill="#64748b" text-anchor="middle">${d.date}</text>
          ${d.tempAvg != null ? `<text x="${getX(i)}" y="${getYTemp(d.tempAvg) - 5}" font-size="8.5" font-weight="bold" fill="#f97316" text-anchor="middle">${d.tempAvg.toFixed(1)}°</text>` : ''}
        `).join('')}
        <text x="${padding.left - 4}" y="${padding.top + 8}" font-size="8.5" fill="#94a3b8" text-anchor="end">${maxTemp}°</text>
        <text x="${padding.left - 4}" y="${padding.top + chartH}" font-size="8.5" fill="#94a3b8" text-anchor="end">${minTemp}°</text>
      </svg>
    `;

    // 2. Gráfico de Precipitação (Barras)
    const rains = refHistory.map(d => d.rainAccum || 0);
    const maxRain = Math.max(...rains, 5);
    const getYRain = (val) => padding.top + chartH - (val / maxRain) * chartH;
    const barWidth = Math.min(26, (chartW / n) * 0.55);

    const svgRain = `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
        <text x="10" y="15" font-size="10.5" font-weight="bold" fill="#0f172a">Precipitação — Últimos 5 Dias (mm)</text>
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>
        ${refHistory.map((d, i) => {
          const r = d.rainAccum || 0;
          const y = getYRain(r);
          const h = (padding.top + chartH) - y;
          const x = getX(i) - barWidth / 2;
          return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(1, h)}" fill="#38bdf8" rx="2"/>
            <text x="${getX(i)}" y="${padding.top + chartH + 14}" font-size="9" fill="#64748b" text-anchor="middle">${d.date}</text>
            <text x="${getX(i)}" y="${Math.max(padding.top + 10, y - 4)}" font-size="8.5" font-weight="bold" fill="${r > 0 ? '#0284c7' : '#94a3b8'}" text-anchor="middle">${r.toFixed(1)}</text>
          `;
        }).join('')}
        <text x="${padding.left - 4}" y="${padding.top + 8}" font-size="8.5" fill="#94a3b8" text-anchor="end">${maxRain.toFixed(0)}</text>
        <text x="${padding.left - 4}" y="${padding.top + chartH}" font-size="8.5" fill="#94a3b8" text-anchor="end">0</text>
      </svg>
    `;

    // 3. Gráfico de Vento (Linha)
    const winds = refHistory.map(d => d.windAvg).filter(v => v !== null && !isNaN(v));
    const gusts = refHistory.map(d => d.windMax).filter(v => v !== null && !isNaN(v));
    const allWinds = [...winds, ...gusts];
    const maxWind = allWinds.length ? Math.ceil(Math.max(...allWinds) + 5) : 30;
    const getYWind = (val) => padding.top + chartH - (val / maxWind) * chartH;
    const pointsWindAvg = refHistory.map((d, i) => d.windAvg != null ? `${getX(i)},${getYWind(d.windAvg)}` : '').filter(Boolean).join(' ');
    const pointsWindGust = refHistory.map((d, i) => d.windMax != null ? `${getX(i)},${getYWind(d.windMax)}` : '').filter(Boolean).join(' ');

    const svgWind = `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
        <text x="10" y="15" font-size="10.5" font-weight="bold" fill="#0f172a">Vento — Últimos 5 Dias (km/h)</text>
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>
        ${pointsWindGust ? `<polyline fill="none" stroke="#f43f5e" stroke-width="1.5" stroke-dasharray="3 3" points="${pointsWindGust}"/>` : ''}
        ${pointsWindAvg ? `<polyline fill="none" stroke="#a855f7" stroke-width="2.2" points="${pointsWindAvg}"/>` : ''}
        ${refHistory.map((d, i) => `
          ${d.windAvg != null ? `<circle cx="${getX(i)}" cy="${getYWind(d.windAvg)}" r="3" fill="#a855f7"/>` : ''}
          <text x="${getX(i)}" y="${padding.top + chartH + 14}" font-size="9" fill="#64748b" text-anchor="middle">${d.date}</text>
          ${d.windAvg != null ? `<text x="${getX(i)}" y="${getYWind(d.windAvg) - 5}" font-size="8.5" font-weight="bold" fill="#a855f7" text-anchor="middle">${d.windAvg.toFixed(0)}</text>` : ''}
        `).join('')}
        <text x="${padding.left - 4}" y="${padding.top + 8}" font-size="8.5" fill="#94a3b8" text-anchor="end">${maxWind}</text>
        <text x="${padding.left - 4}" y="${padding.top + chartH}" font-size="8.5" fill="#94a3b8" text-anchor="end">0</text>
      </svg>
    `;

    // 4. Gráfico de Pressão (Linha)
    const hasPressure = refHistory.some(d => d.pressure != null && !isNaN(d.pressure));
    let svgPressure = '';
    if (hasPressure) {
      const pressures = refHistory.map(d => d.pressure).filter(v => v !== null && !isNaN(v));
      const minPress = Math.floor(Math.min(...pressures) - 2);
      const maxPress = Math.ceil(Math.max(...pressures) + 2);
      const pressRange = maxPress - minPress || 1;
      const getYPress = (val) => padding.top + chartH - ((val - minPress) / pressRange) * chartH;
      const pointsPress = refHistory.map((d, i) => d.pressure != null ? `${getX(i)},${getYPress(d.pressure)}` : '').filter(Boolean).join(' ');

      svgPressure = `
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
          <text x="10" y="15" font-size="10.5" font-weight="bold" fill="#0f172a">Pressão Atmosférica — Últimos 5 Dias (hPa)</text>
          <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>
          ${pointsPress ? `<polyline fill="none" stroke="#64748b" stroke-width="2" points="${pointsPress}"/>` : ''}
          ${refHistory.map((d, i) => `
            ${d.pressure != null ? `<circle cx="${getX(i)}" cy="${getYPress(d.pressure)}" r="3" fill="#64748b"/>` : ''}
            <text x="${getX(i)}" y="${padding.top + chartH + 14}" font-size="9" fill="#64748b" text-anchor="middle">${d.date}</text>
            ${d.pressure != null ? `<text x="${getX(i)}" y="${getYPress(d.pressure) - 5}" font-size="8.5" fill="#475569" text-anchor="middle">${d.pressure.toFixed(0)}</text>` : ''}
          `).join('')}
          <text x="${padding.left - 4}" y="${padding.top + 8}" font-size="8.5" fill="#94a3b8" text-anchor="end">${maxPress}</text>
          <text x="${padding.left - 4}" y="${padding.top + chartH}" font-size="8.5" fill="#94a3b8" text-anchor="end">${minPress}</text>
        </svg>
      `;
    } else {
      svgPressure = `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; height:${height}px; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:11px; text-align:center; padding:10px;">
          Dados históricos de pressão indisponíveis para esta estação.
        </div>
      `;
    }

    // 5. Gráfico de Nível do Rio (quando aplicável)
    const hasRiver = (refStation && refStation.metrics && refStation.metrics.riverLevel != null) ||
                    refHistory.some(d => d.riverLevel != null && !isNaN(d.riverLevel));
    let svgRiver = '';
    if (hasRiver) {
      const riverVals = refHistory.map(d => d.riverLevel).filter(v => v !== null && !isNaN(v));
      const minRiver = riverVals.length ? Math.floor(Math.min(...riverVals) - 5) : 0;
      const maxRiver = riverVals.length ? Math.ceil(Math.max(...riverVals) + 5) : 100;
      const riverRange = maxRiver - minRiver || 1;
      const getYRiver = (val) => padding.top + chartH - ((val - minRiver) / riverRange) * chartH;
      const pointsRiver = refHistory.map((d, i) => d.riverLevel != null ? `${getX(i)},${getYRiver(d.riverLevel)}` : '').filter(Boolean).join(' ');

      svgRiver = `
        <div style="margin-top:10px;">
          <svg width="100%" height="${height}" viewBox="0 0 ${width * 2 + 10} ${height}" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
            <text x="10" y="15" font-size="10.5" font-weight="bold" fill="#0f172a">Nível do Sensor Fluviométrico — Últimos 5 Dias (cm / m)</text>
            <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${(width * 2 + 10) - padding.right}" y2="${padding.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>
            ${pointsRiver ? `<polyline fill="none" stroke="#06b6d4" stroke-width="2.5" points="${pointsRiver}"/>` : ''}
            ${refHistory.map((d, i) => `
              ${d.riverLevel != null ? `<circle cx="${getX(i)}" cy="${getYRiver(d.riverLevel)}" r="3.5" fill="#06b6d4"/>` : ''}
              <text x="${getX(i)}" y="${padding.top + chartH + 14}" font-size="9" fill="#64748b" text-anchor="middle">${d.date}</text>
              ${d.riverLevel != null ? `<text x="${getX(i)}" y="${getYRiver(d.riverLevel) - 5}" font-size="8.5" font-weight="bold" fill="#0891b2" text-anchor="middle">${d.riverLevel.toFixed(1)} cm</text>` : ''}
            `).join('')}
          </svg>
        </div>
      `;
    }

    return `
      <div style="margin-top: 14px; margin-bottom: 18px; page-break-inside: avoid;">
        <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
          Gráficos Meteorológicos Consolidados (Últimos 5 Dias) — Estação de Referência: ${refStation.name} (#${refStation.deviceId})
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>${svgTemp}</div>
          <div>${svgRain}</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
          <div>${svgWind}</div>
          <div>${svgPressure}</div>
        </div>
        ${svgRiver}
      </div>
    `;
  }
}
