/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Motor de Espacialização Climática (IDW) — Etapa 3
 * 
 * Produto: TEMPERATURA MÉDIA DIÁRIA ESPACIALIZADA POR IDW
 * Sistema Cartográfico: SIRGAS 2000 / UTM Zona 22S (EPSG:31982)
 * Cálculo de Distâncias: Métrico euclidiano (metros)
 * Potência: p = 2 (Inverse Distance Squared)
 * Limite Geográfico: Limite Municipal de Passo Fundo
 */

import { PLUGFIELD_STATIONS_CONFIG } from '../weather/plugfield-service.js';
import { loadGeoJson } from '../utils/async-loader.js';
import { Notification } from '../ui/notification.js';

export class ClimateMapsEngine {
  constructor(mapEngine) {
    this.mapEngine = mapEngine;
    this.map = mapEngine ? mapEngine.getOlMap() : null;
    this.climateLayer = null;
    this.isolineLayer = null;
    this.currentResult = null;
    this.boundaryData = null;
    this.mapClickListener = null;
    this.legendEl = null;

    // Cache isolado em memória e sessionStorage específico para o módulo climático
    this.sessionCacheKeyPrefix = 'pf_climate_idw_';
  }

  /**
   * Converte data ISO (YYYY-MM-DD) para formato aceito pela API (DD/MM/AAAA)
   */
  static formatApiDate(isoDateStr) {
    const parts = isoDateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDateStr;
  }

  /**
   * Converte coordenadas [lon, lat] (WGS84) para SIRGAS 2000 / UTM Zona 22S (metros)
   */
  static toUTM22S(lon, lat) {
    if (typeof proj4 !== 'undefined') {
      try {
        return proj4('EPSG:4326', 'EPSG:31982', [lon, lat]);
      } catch (e) {
        console.warn('[ClimateMapsEngine] Falha na conversão proj4:', e);
      }
    }
    // Fallback matemático rigoroso para UTM 22S (Meridiano Central -51°)
    return ClimateMapsEngine.mathLonLatToUTM22S(lon, lat);
  }

  static mathLonLatToUTM22S(lon, lat) {
    const a = 6378137.0;
    const f = 1 / 298.257222101;
    const e2 = 2 * f - f * f;
    const ePrime2 = e2 / (1 - e2);
    const k0 = 0.9996;
    const lon0 = -51.0 * Math.PI / 180.0;
    const phi = lat * Math.PI / 180.0;
    const lambda = lon * Math.PI / 180.0;

    const N = a / Math.sqrt(1 - e2 * Math.sin(phi) * Math.sin(phi));
    const T = Math.tan(phi) * Math.tan(phi);
    const C = ePrime2 * Math.cos(phi) * Math.cos(phi);
    const A = (lambda - lon0) * Math.cos(phi);

    const M = a * (
      (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * phi -
      (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * phi) +
      (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * phi) -
      (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * phi)
    );

    const x = k0 * N * (A + (1 - T + C) * Math.pow(A, 3) / 6 +
      (5 - 18 * T + T * T + 72 * C - 58 * ePrime2) * Math.pow(A, 5) / 120) + 500000.0;

    let y = k0 * (M + N * Math.tan(phi) * (
      Math.pow(A, 2) / 2 +
      (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24 +
      (61 - 58 * T + T * T + 600 * C - 330 * ePrime2) * Math.pow(A, 6) / 720
    ));
    y += 10000000.0; // Hemisfério Sul

    return [x, y];
  }

  /**
   * Converte coordenadas [x_utm, y_utm] para Web Mercator EPSG:3857
   */
  static utmToWebMercator(utmX, utmY) {
    if (typeof proj4 !== 'undefined') {
      try {
        return proj4('EPSG:31982', 'EPSG:3857', [utmX, utmY]);
      } catch (e) {
        console.warn('[ClimateMapsEngine] Falha na conversão para EPSG:3857:', e);
      }
    }
    if (window.ol && window.ol.proj) {
      return window.ol.proj.transform([utmX, utmY], 'EPSG:31982', 'EPSG:3857');
    }
    return [utmX, utmY];
  }

  /**
   * Converte coordenadas [x_3857, y_3857] para UTM 22S (EPSG:31982)
   */
  static webMercatorToUTM(x3857, y3857) {
    if (typeof proj4 !== 'undefined') {
      try {
        return proj4('EPSG:3857', 'EPSG:31982', [x3857, y3857]);
      } catch (e) {
        console.warn('[ClimateMapsEngine] Falha na conversão de EPSG:3857 para UTM:', e);
      }
    }
    if (window.ol && window.ol.proj) {
      return window.ol.proj.transform([x3857, y3857], 'EPSG:3857', 'EPSG:31982');
    }
    return [x3857, y3857];
  }

  /**
   * Algoritmo Ray-Casting para verificação de Ponto dentro de Polígono (Point-in-Polygon)
   * @param {number} x Coordenada X
   * @param {number} y Coordenada Y
   * @param {Array<Array<number>>} vs Anel externo do polígono [[x1, y1], [x2, y2], ...]
   * @returns {boolean} True se o ponto estiver estritamente dentro do polígono
   */
  static pointInPolygon(x, y, vs) {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Carrega a geometria oficial do Limite Territorial de Passo Fundo (EPSG:31982)
   */
  async loadBoundary() {
    if (this.boundaryData) return this.boundaryData;

    try {
      const geojson = await loadGeoJson('Limite Territorial Passo Fundo.geojson');
      if (!geojson || !geojson.features || geojson.features.length === 0) {
        throw new Error('Falha ao obter feição do Limite Territorial.');
      }

      const geom = geojson.features[0].geometry;
      let ring = null;
      if (geom.type === 'MultiPolygon') {
        ring = geom.coordinates[0][0];
      } else if (geom.type === 'Polygon') {
        ring = geom.coordinates[0];
      }

      if (!ring || ring.length < 3) {
        throw new Error('Polígono de limite territorial inválido.');
      }

      // Calcula BBOX em UTM 22S (metros)
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const pt of ring) {
        if (pt[0] < minX) minX = pt[0];
        if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] < minY) minY = pt[1];
        if (pt[1] > maxY) maxY = pt[1];
      }

      // Converte cantos do BBOX para Web Mercator (EPSG:3857)
      const sw3857 = ClimateMapsEngine.utmToWebMercator(minX, minY);
      const ne3857 = ClimateMapsEngine.utmToWebMercator(maxX, maxY);

      this.boundaryData = {
        ring,
        bboxUTM: [minX, minY, maxX, maxY],
        bbox3857: [sw3857[0], sw3857[1], ne3857[0], ne3857[1]],
        widthMeters: maxX - minX,
        heightMeters: maxY - minY
      };

      return this.boundaryData;
    } catch (err) {
      console.error('[ClimateMapsEngine] Erro ao carregar limite municipal:', err);
      throw err;
    }
  }

  /**
   * Busca as observações de temperatura média diária das estações para uma data específica
   * Utiliza exclusivamente o endpoint /api/weather/plugfield?action=daily
   * @param {string} isoDate YYYY-MM-DD
   */
  async fetchDailyObservations(isoDate) {
    const apiDate = ClimateMapsEngine.formatApiDate(isoDate);
    const sessionKey = `${this.sessionCacheKeyPrefix}${isoDate}`;

    // 1. Tentar ler do cache de sessão isolado
    try {
      const cached = sessionStorage.getItem(sessionKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.validStations) && parsed.validStations.length >= 3) {
          console.log(`[ClimateMapsEngine] Utilizando cache isolado de sessão para ${isoDate} (${parsed.validStations.length} estações).`);
          return parsed;
        }
      }
    } catch (e) {}

    console.log(`[ClimateMapsEngine] Consultando leituras diárias das estações para ${isoDate} (${apiDate})...`);

    // Consulta assíncrona concorrente das 16 estações
    const requests = PLUGFIELD_STATIONS_CONFIG.map(async (st) => {
      const devId = st.deviceId;
      const url = `/api/weather/plugfield?action=daily&deviceId=${devId}&begin=${encodeURIComponent(apiDate)}&end=${encodeURIComponent(apiDate)}`;

      try {
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const resJson = await resp.json();
        if (!resJson.success || !resJson.data?.days || resJson.data.days.length === 0) return null;

        const dayItem = resJson.data.days.find(d => d.localDate === isoDate) || resJson.data.days[0];
        if (!dayItem || dayItem.temp === null || isNaN(parseFloat(dayItem.temp))) return null;

        // Validação adicional de consistência temporal
        if (dayItem.localDate && dayItem.localDate !== isoDate) {
          console.warn(`[ClimateMapsEngine] Estação ${devId} (${st.name}) retornou data inconsistente: ${dayItem.localDate} vs solicitada ${isoDate}`);
          return null;
        }

        const utmCoord = ClimateMapsEngine.toUTM22S(st.lon, st.lat);

        return {
          id: devId,
          deviceId: devId,
          name: st.name,
          type: st.type,
          lon: st.lon,
          lat: st.lat,
          utmX: utmCoord[0],
          utmY: utmCoord[1],
          tempObserved: parseFloat(dayItem.temp),
          tempMinObserved: dayItem.tempMin !== null ? parseFloat(dayItem.tempMin) : null,
          tempMaxObserved: dayItem.tempMax !== null ? parseFloat(dayItem.tempMax) : null,
          rainAccum: dayItem.rainAccum !== null ? parseFloat(dayItem.rainAccum) : 0,
          localDate: dayItem.localDate
        };
      } catch (err) {
        console.warn(`[ClimateMapsEngine] Falha ao consultar estação ${devId} (${st.name}):`, err.message);
        return null;
      }
    });

    const results = await Promise.all(requests);
    const validStations = results.filter(st => st !== null);
    const excludedCount = PLUGFIELD_STATIONS_CONFIG.length - validStations.length;

    console.log(`[ClimateMapsEngine] Auditoria de Estações para ${isoDate}: ${validStations.length} válidas, ${excludedCount} excluídas logicamente.`);

    const payload = {
      isoDate,
      apiDate,
      totalConfigured: PLUGFIELD_STATIONS_CONFIG.length,
      validStations,
      excludedCount,
      timestamp: Date.now()
    };

    // Armazena no cache de sessão isolado
    if (validStations.length >= 3) {
      try {
        sessionStorage.setItem(sessionKey, JSON.stringify(payload));
      } catch (e) {}
    }

    return payload;
  }

  /**
   * Busca as observações diárias do mês inteiro para todas as estações e calcula a Média Mensal Derivada
   * Aplica estritamente o critério de completude de pelo menos 90% dos dias esperados
   * Utiliza exclusivamente o endpoint /api/weather/plugfield?action=daily
   * @param {string} yearMonth YYYY-MM (ex: "2026-08")
   */
  async fetchMonthlyObservations(yearMonth) {
    const parts = yearMonth.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);

    // 1. Cálculo dinâmico rigoroso de dias esperados no mês
    const daysInMonth = new Date(year, month, 0).getDate();
    const minDaysRequired = Math.ceil(daysInMonth * 0.90); // 90% de completude (ex: 31 * 0.90 = 27.9 -> 28 dias)

    const pad = (n) => String(n).padStart(2, '0');
    const beginStr = `01/${pad(month)}/${year}`;
    const endStr = `${pad(daysInMonth)}/${pad(month)}/${year}`;

    // Rótulo amigável em português
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthLabel = `${monthNames[month - 1]} de ${year}`;
    const monthShortLabel = `${monthNames[month - 1].slice(0, 3)}/${year}`;

    const sessionKey = `${this.sessionCacheKeyPrefix}monthly_${yearMonth}`;

    // 2. Tentar ler do cache de sessão isolado
    try {
      const cached = sessionStorage.getItem(sessionKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.validStations) && parsed.validStations.length >= 3) {
          console.log(`[ClimateMapsEngine] Utilizando cache isolado de sessão para ${monthLabel} (${parsed.validStations.length} estações).`);
          return parsed;
        }
      }
    } catch (e) {}

    console.log(`[ClimateMapsEngine] Consultando histórico mensal (${beginStr} a ${endStr}) para ${monthLabel}...`);

    // 3. Consulta assíncrona concorrente das 16 estações
    const requests = PLUGFIELD_STATIONS_CONFIG.map(async (st) => {
      const devId = st.deviceId;
      const url = `/api/weather/plugfield?action=daily&deviceId=${devId}&begin=${encodeURIComponent(beginStr)}&end=${encodeURIComponent(endStr)}`;

      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          return {
            id: devId,
            deviceId: devId,
            name: st.name,
            validDaysCount: 0,
            daysInMonth,
            completenessPercent: 0,
            tempMonthlyMean: null,
            participates: false,
            exclusionReason: `Falha na requisição HTTP (${resp.status})`
          };
        }

        const resJson = await resp.json();
        if (!resJson.success || !resJson.data?.days || !Array.isArray(resJson.data.days)) {
          return {
            id: devId,
            deviceId: devId,
            name: st.name,
            validDaysCount: 0,
            daysInMonth,
            completenessPercent: 0,
            tempMonthlyMean: null,
            participates: false,
            exclusionReason: 'Sem registros retornados pelo servidor Plugfield'
          };
        }

        const rawDays = resJson.data.days;

        // Eliminação de duplicidades por localDate
        const uniqueDayMap = new Map();
        rawDays.forEach(d => {
          const lDate = d.localDate || d.date || '';
          if (lDate && !uniqueDayMap.has(lDate)) {
            uniqueDayMap.set(lDate, d);
          }
        });

        // Filtragem de dias com temperatura válida
        let validSum = 0;
        let validCount = 0;
        const validDaysList = [];

        uniqueDayMap.forEach((dayObj, lDate) => {
          if (dayObj.temp !== null && dayObj.temp !== undefined && !isNaN(parseFloat(dayObj.temp))) {
            const val = parseFloat(dayObj.temp);
            validSum += val;
            validCount++;
            validDaysList.push({ localDate: lDate, temp: val });
          }
        });

        const completeness = Math.round((validCount / daysInMonth) * 10000) / 100; // 2 casas decimais
        const tempMonthlyMean = validCount > 0 ? (validSum / validCount) : null;
        const meetsThreshold = validCount >= minDaysRequired;

        const utmCoord = ClimateMapsEngine.toUTM22S(st.lon, st.lat);

        return {
          id: devId,
          deviceId: devId,
          name: st.name,
          type: st.type,
          lon: st.lon,
          lat: st.lat,
          utmX: utmCoord[0],
          utmY: utmCoord[1],
          validDaysCount: validCount,
          daysInMonth,
          completenessPercent: completeness,
          tempMonthlyMean: tempMonthlyMean !== null ? Math.round(tempMonthlyMean * 100) / 100 : null,
          tempObserved: tempMonthlyMean !== null ? Math.round(tempMonthlyMean * 100) / 100 : null, // Compatibilidade IDW
          participates: meetsThreshold,
          exclusionReason: meetsThreshold ? null : `Excluída logicamente da espacialização mensal por insuficiência de dados válidos (${validCount}/${daysInMonth} dias válidos • completude ${completeness}% < 90%)`
        };

      } catch (err) {
        console.warn(`[ClimateMapsEngine] Falha ao consultar histórico mensal da estação ${devId} (${st.name}):`, err);
        return {
          id: devId,
          deviceId: devId,
          name: st.name,
          validDaysCount: 0,
          daysInMonth,
          completenessPercent: 0,
          tempMonthlyMean: null,
          participates: false,
          exclusionReason: `Exceção de rede: ${err.message}`
        };
      }
    });

    const allStationAudit = await Promise.all(requests);
    const validStations = allStationAudit.filter(st => st.participates === true && st.tempObserved !== null);
    const excludedStations = allStationAudit.filter(st => !st.participates || st.tempObserved === null);

    console.log(`[ClimateMapsEngine] Auditoria Mensal para ${monthLabel}: ${validStations.length} participantes, ${excludedStations.length} excluídas logicamente.`);

    const payload = {
      variable: 'temperatura',
      scale: 'mensal',
      unit: '°C',
      yearMonth,
      monthLabel,
      monthShortLabel,
      daysInMonth,
      minDaysRequired,
      totalConfigured: PLUGFIELD_STATIONS_CONFIG.length,
      allStationAudit,
      validStations,
      excludedStations,
      timestamp: Date.now()
    };

    // Armazena no cache de sessão isolado
    if (validStations.length >= 3) {
      try {
        sessionStorage.setItem(sessionKey, JSON.stringify(payload));
      } catch (e) {}
    }

    return payload;
  }

  /**
   * Consulta os dados diários históricos de precipitação de todas as 16 estações Plugfield
   * e calcula os acumulados mensais e índice de completude para cada estação.
   * Critério estrito de corte: completude >= 95% dos dias válidos do mês (ex: 30 de 31 dias para Agosto).
   * @param {string} yearMonth YYYY-MM (ex: "2026-08")
   */
  async fetchMonthlyPrecipitationObservations(yearMonth) {
    // 1. Decomposição e cálculo dinâmico dos dias do mês
    const [yearStr, monthStr] = yearMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const daysInMonth = new Date(year, month, 0).getDate();
    const minDaysRequired = Math.ceil(daysInMonth * 0.95); // 95% de completude (ex: 31 * 0.95 = 29.45 -> 30 dias)

    const pad = (n) => String(n).padStart(2, '0');
    const beginStr = `01/${pad(month)}/${year}`;
    const endStr = `${pad(daysInMonth)}/${pad(month)}/${year}`;

    // Rótulo amigável em português
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthLabel = `${monthNames[month - 1]} de ${year}`;
    const monthShortLabel = `${monthNames[month - 1].slice(0, 3)}/${year}`;

    const sessionKey = `pf_climate_precip_monthly_${yearMonth}`;

    // 2. Tentar ler do cache de sessão isolado
    try {
      const cached = sessionStorage.getItem(sessionKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.validStations) && parsed.validStations.length >= 3) {
          console.log(`[ClimateMapsEngine] Utilizando cache isolado de sessão para precipitação de ${monthLabel} (${parsed.validStations.length} estações).`);
          return parsed;
        }
      }
    } catch (e) {}

    console.log(`[ClimateMapsEngine] Consultando histórico pluviométrico mensal (${beginStr} a ${endStr}) para ${monthLabel}...`);

    // 3. Consulta assíncrona concorrente das 16 estações
    const requests = PLUGFIELD_STATIONS_CONFIG.map(async (st) => {
      const devId = st.deviceId;
      const url = `/api/weather/plugfield?action=daily&deviceId=${devId}&begin=${encodeURIComponent(beginStr)}&end=${encodeURIComponent(endStr)}`;

      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          return {
            id: devId,
            deviceId: devId,
            name: st.name,
            validDaysCount: 0,
            daysInMonth,
            completenessPercent: 0,
            precipMonthlyTotal: null,
            participates: false,
            exclusionReason: `Falha na requisição HTTP (${resp.status})`
          };
        }

        const resJson = await resp.json();
        if (!resJson.success || !resJson.data?.days || !Array.isArray(resJson.data.days)) {
          return {
            id: devId,
            deviceId: devId,
            name: st.name,
            validDaysCount: 0,
            daysInMonth,
            completenessPercent: 0,
            precipMonthlyTotal: null,
            participates: false,
            exclusionReason: 'Sem registros retornados pelo servidor Plugfield'
          };
        }

        const rawDays = resJson.data.days;

        // Eliminação de duplicidades por localDate
        const uniqueDayMap = new Map();
        rawDays.forEach(d => {
          const lDate = d.localDate || d.date || '';
          if (lDate && !uniqueDayMap.has(lDate)) {
            uniqueDayMap.set(lDate, d);
          }
        });

        // Filtragem e somatório de dias com precipitação válida (0 mm é dia válido seco!)
        let validSum = 0;
        let validCount = 0;
        const validDaysList = [];

        uniqueDayMap.forEach((dayObj, lDate) => {
          if (dayObj.rainAccum !== null && dayObj.rainAccum !== undefined && !isNaN(parseFloat(dayObj.rainAccum))) {
            const val = parseFloat(dayObj.rainAccum);
            validSum += val;
            validCount++;
            validDaysList.push({ localDate: lDate, rainAccum: val });
          }
        });

        const completeness = Math.round((validCount / daysInMonth) * 10000) / 100; // 2 casas decimais
        const rainMonthlyTotal = validCount > 0 ? Math.round(validSum * 100) / 100 : null;
        const meetsThreshold = validCount >= minDaysRequired;

        const utmCoord = ClimateMapsEngine.toUTM22S(st.lon, st.lat);

        return {
          id: devId,
          deviceId: devId,
          name: st.name,
          type: st.type,
          lon: st.lon,
          lat: st.lat,
          utmX: utmCoord[0],
          utmY: utmCoord[1],
          validDaysCount: validCount,
          daysInMonth,
          completenessPercent: completeness,
          precipMonthlyTotal: rainMonthlyTotal,
          precipObserved: rainMonthlyTotal,
          tempObserved: rainMonthlyTotal, // Compatibilidade com loop genérico IDW
          participates: meetsThreshold,
          exclusionReason: meetsThreshold ? null : `Excluída logicamente da espacialização mensal por insuficiência de dados válidos (${validCount}/${daysInMonth} dias válidos • completude ${completeness}% < 95%)`
        };

      } catch (err) {
        console.warn(`[ClimateMapsEngine] Falha ao consultar histórico pluviométrico mensal da estação ${devId} (${st.name}):`, err);
        return {
          id: devId,
          deviceId: devId,
          name: st.name,
          validDaysCount: 0,
          daysInMonth,
          completenessPercent: 0,
          precipMonthlyTotal: null,
          participates: false,
          exclusionReason: `Exceção de rede: ${err.message}`
        };
      }
    });

    const allStationAudit = await Promise.all(requests);
    const validStations = allStationAudit.filter(st => st.participates === true && st.precipObserved !== null);
    const excludedStations = allStationAudit.filter(st => !st.participates || st.precipObserved === null);

    console.log(`[ClimateMapsEngine] Auditoria Pluviométrica Mensal para ${monthLabel}: ${validStations.length} participantes, ${excludedStations.length} excluídas logicamente.`);

    const payload = {
      variable: 'precipitacao',
      scale: 'mensal',
      unit: 'mm',
      yearMonth,
      monthLabel,
      monthShortLabel,
      daysInMonth,
      minDaysRequired,
      totalConfigured: PLUGFIELD_STATIONS_CONFIG.length,
      allStationAudit,
      validStations,
      excludedStations,
      timestamp: Date.now()
    };

    // Armazena no cache de sessão isolado
    if (validStations.length >= 3) {
      try {
        sessionStorage.setItem(sessionKey, JSON.stringify(payload));
      } catch (e) {}
    }

    return payload;
  }

  /**
   * Executa a interpolação IDW para Temperatura Média Mensal Espacializada (EPSG:31982, p=2)
   * @param {string} yearMonth YYYY-MM (ex: "2026-08")
   */
  async computeMonthlyIDWGrid(yearMonth) {
    const boundary = await this.loadBoundary();
    const monthlyData = await this.fetchMonthlyObservations(yearMonth);

    if (!monthlyData || !monthlyData.validStations || monthlyData.validStations.length < 3) {
      throw new Error(`Não há estações com completude suficiente (mínimo de 90%) para gerar a espacialização mensal de ${monthlyData?.monthLabel || yearMonth}.`);
    }

    const stations = monthlyData.validStations;

    // Estatísticas das médias mensais derivadas reais
    let minObs = Infinity, maxObs = -Infinity, sumObs = 0;
    for (const st of stations) {
      if (st.tempObserved < minObs) minObs = st.tempObserved;
      if (st.tempObserved > maxObs) maxObs = st.tempObserved;
      sumObs += st.tempObserved;
    }
    const meanObs = sumObs / stations.length;

    // Margem dinâmica para escala cromática harmoniosa
    const rangeMargin = Math.max(0.2, (maxObs - minObs) * 0.05);
    const colorMin = minObs - rangeMargin;
    const colorMax = maxObs + rangeMargin;

    // Resolução da grade: 220 colunas x 156 linhas (~207 metros por célula)
    const gridCols = 220;
    const gridRows = 156;

    const canvas = document.createElement('canvas');
    canvas.width = gridCols;
    canvas.height = gridRows;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(gridCols, gridRows);
    const data = imgData.data;

    const minX = boundary.bboxUTM[0];
    const maxX = boundary.bboxUTM[2];
    const minY = boundary.bboxUTM[1];
    const maxY = boundary.bboxUTM[3];

    const dx = (maxX - minX) / gridCols;
    const dy = (maxY - minY) / gridRows;

    const gridValues = new Float32Array(gridCols * gridRows);
    gridValues.fill(NaN);

    let computedCells = 0;
    let sumGridVal = 0;

    // Loop de cálculo raster IDW (p = 2)
    for (let row = 0; row < gridRows; row++) {
      const curY = maxY - (row + 0.5) * dy;
      const rowOffset = row * gridCols * 4;

      for (let col = 0; col < gridCols; col++) {
        const curX = minX + (col + 0.5) * dx;
        const pixelIdx = rowOffset + col * 4;
        const cellIdx = row * gridCols + col;

        // 1. Recorte espacial municipal
        if (!ClimateMapsEngine.pointInPolygon(curX, curY, boundary.ring)) {
          data[pixelIdx + 3] = 0;
          gridValues[cellIdx] = NaN;
          continue;
        }

        // 2. Cálculo IDW
        let sumW = 0;
        let sumWV = 0;
        let exactMatchVal = null;

        for (let s = 0; s < stations.length; s++) {
          const st = stations[s];
          const distSq = (curX - st.utmX) * (curX - st.utmX) + (curY - st.utmY) * (curY - st.utmY);

          if (distSq < 1.0) {
            exactMatchVal = st.tempObserved;
            break;
          }

          const w = 1.0 / distSq;
          sumW += w;
          sumWV += w * st.tempObserved;
        }

        const cellVal = exactMatchVal !== null ? exactMatchVal : (sumWV / sumW);
        gridValues[cellIdx] = cellVal;
        computedCells++;
        sumGridVal += cellVal;

        // 3. Rampa cromática contínua
        const normT = (cellVal - colorMin) / (colorMax - colorMin);
        const rgba = ClimateMapsEngine.getColorForValue(normT, 215);

        data[pixelIdx]     = rgba[0];
        data[pixelIdx + 1] = rgba[1];
        data[pixelIdx + 2] = rgba[2];
        data[pixelIdx + 3] = rgba[3];
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const result = {
      variable: 'temperatura',
      scale: 'mensal',
      unit: '°C',
      yearMonth,
      periodLabel: monthlyData.monthLabel,
      periodShortLabel: monthlyData.monthShortLabel,
      gridCols,
      gridRows,
      cellSizeMeters: Math.round(dx),
      computedCells,
      validStations: stations,
      allStationAudit: monthlyData.allStationAudit,
      excludedCount: monthlyData.excludedStations.length,
      daysInMonth: monthlyData.daysInMonth,
      minObserved: minObs,
      maxObserved: maxObs,
      meanObserved: meanObs,
      colorMin,
      colorMax,
      canvasDataUrl: canvas.toDataURL('image/png'),
      bboxUTM: boundary.bboxUTM,
      bbox3857: boundary.bbox3857,
      boundaryRing: boundary.ring,
      gridValues,
      gridMinX: minX,
      gridMaxX: maxX,
      gridMinY: minY,
      gridMaxY: maxY,
      gridDx: dx,
      gridDy: dy
    };

    this.currentResult = result;
    return result;
  }

  /**
   * Executa a interpolação IDW para Precipitação Acumulada Mensal Espacializada (EPSG:31982, p=2)
   * @param {string} yearMonth YYYY-MM (ex: "2026-08")
   */
  async computeMonthlyPrecipitationIDWGrid(yearMonth) {
    const boundary = await this.loadBoundary();
    const monthlyData = await this.fetchMonthlyPrecipitationObservations(yearMonth);

    if (!monthlyData || !monthlyData.validStations || monthlyData.validStations.length < 3) {
      throw new Error(`Não há estações com completude pluviométrica suficiente (mínimo de 95%) para gerar a espacialização mensal de ${monthlyData?.monthLabel || yearMonth}.`);
    }

    const stations = monthlyData.validStations;

    // Estatísticas dos acumulados mensais derivados reais
    let minObs = Infinity, maxObs = -Infinity, sumObs = 0;
    for (const st of stations) {
      const val = st.precipObserved;
      if (val < minObs) minObs = val;
      if (val > maxObs) maxObs = val;
      sumObs += val;
    }
    const meanObs = sumObs / stations.length;

    // Margem dinâmica para escala cromática pluviométrica harmoniosa
    const rangeMargin = Math.max(1.0, (maxObs - minObs) * 0.05);
    const colorMin = minObs - rangeMargin;
    const colorMax = maxObs + rangeMargin;

    // Resolução da grade: 220 colunas x 156 linhas (~207 metros por célula)
    const gridCols = 220;
    const gridRows = 156;

    const canvas = document.createElement('canvas');
    canvas.width = gridCols;
    canvas.height = gridRows;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(gridCols, gridRows);
    const data = imgData.data;

    const minX = boundary.bboxUTM[0];
    const maxX = boundary.bboxUTM[2];
    const minY = boundary.bboxUTM[1];
    const maxY = boundary.bboxUTM[3];

    const dx = (maxX - minX) / gridCols;
    const dy = (maxY - minY) / gridRows;

    const gridValues = new Float32Array(gridCols * gridRows);
    gridValues.fill(NaN);

    let computedCells = 0;
    let sumGridVal = 0;

    // Loop de cálculo raster IDW (p = 2)
    for (let row = 0; row < gridRows; row++) {
      const curY = maxY - (row + 0.5) * dy;
      const rowOffset = row * gridCols * 4;

      for (let col = 0; col < gridCols; col++) {
        const curX = minX + (col + 0.5) * dx;
        const pixelIdx = rowOffset + col * 4;
        const cellIdx = row * gridCols + col;

        // 1. Recorte espacial municipal
        if (!ClimateMapsEngine.pointInPolygon(curX, curY, boundary.ring)) {
          data[pixelIdx + 3] = 0;
          gridValues[cellIdx] = NaN;
          continue;
        }

        // 2. Cálculo IDW
        let sumW = 0;
        let sumWV = 0;
        let exactMatchVal = null;

        for (let s = 0; s < stations.length; s++) {
          const st = stations[s];
          const distSq = (curX - st.utmX) * (curX - st.utmX) + (curY - st.utmY) * (curY - st.utmY);

          if (distSq < 1.0) {
            exactMatchVal = st.precipObserved;
            break;
          }

          const w = 1.0 / distSq;
          sumW += w;
          sumWV += w * st.precipObserved;
        }

        const cellVal = exactMatchVal !== null ? exactMatchVal : (sumWV / sumW);
        gridValues[cellIdx] = cellVal;
        computedCells++;
        sumGridVal += cellVal;

        // 3. Rampa cromática contínua hidrológica/pluviométrica
        const normT = (cellVal - colorMin) / (colorMax - colorMin);
        const rgba = ClimateMapsEngine.getColorForPrecipitationValue(normT, 215);

        data[pixelIdx]     = rgba[0];
        data[pixelIdx + 1] = rgba[1];
        data[pixelIdx + 2] = rgba[2];
        data[pixelIdx + 3] = rgba[3];
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const result = {
      variable: 'precipitacao',
      scale: 'mensal',
      unit: 'mm',
      yearMonth,
      periodLabel: monthlyData.monthLabel,
      periodShortLabel: monthlyData.monthShortLabel,
      gridCols,
      gridRows,
      cellSizeMeters: Math.round(dx),
      computedCells,
      validStations: stations,
      allStationAudit: monthlyData.allStationAudit,
      excludedCount: monthlyData.excludedStations.length,
      daysInMonth: monthlyData.daysInMonth,
      minObserved: minObs,
      maxObserved: maxObs,
      meanObserved: meanObs,
      colorMin,
      colorMax,
      canvasDataUrl: canvas.toDataURL('image/png'),
      bboxUTM: boundary.bboxUTM,
      bbox3857: boundary.bbox3857,
      boundaryRing: boundary.ring,
      gridValues,
      gridMinX: minX,
      gridMaxX: maxX,
      gridMinY: minY,
      gridMaxY: maxY,
      gridDx: dx,
      gridDy: dy
    };

    this.currentResult = result;
    return result;
  }

  /**
   * Mapeia um valor numérico normalizado [0, 1] em uma rampa cromática contínua equilibrada
   * Paleta climatológica profissional e visualmente equilibrada:
   *  - 0.00: #0284c7 (Azul Sereno / 2, 132, 199)
   *  - 0.25: #0d9488 (Teal Suave / 13, 148, 136)
   *  - 0.50: #16a34a (Verde Esmeralda Suave / 22, 163, 74)
   *  - 0.75: #eab308 (Âmbar Dourado / 234, 179, 8)
   *  - 1.00: #ea580c (Laranja Quente / 234, 88, 12)
   */
  static getColorForValue(t, alpha = 205) {
    const clampedT = Math.max(0, Math.min(1, t));

    // Pontos de controle da escala
    const stops = [
      { pos: 0.00, r: 2,   g: 132, b: 199 }, // Azul sereno
      { pos: 0.25, r: 13,  g: 148, b: 136 }, // Teal
      { pos: 0.50, r: 22,  g: 163, b: 74  }, // Verde
      { pos: 0.75, r: 234, g: 179, b: 8   }, // Âmbar
      { pos: 1.00, r: 234, g: 88,  b: 12  }  // Laranja
    ];

    let lower = stops[0], upper = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (clampedT >= stops[i].pos && clampedT <= stops[i + 1].pos) {
        lower = stops[i];
        upper = stops[i + 1];
        break;
      }
    }

    const range = upper.pos - lower.pos;
    const factor = range === 0 ? 0 : (clampedT - lower.pos) / range;

    const r = Math.round(lower.r + factor * (upper.r - lower.r));
    const g = Math.round(lower.g + factor * (upper.g - lower.g));
    const b = Math.round(lower.b + factor * (upper.b - lower.b));

    return [r, g, b, alpha];
  }

  /**
   * Mapeia um valor numérico normalizado [0, 1] em uma rampa cromática pluviométrica contínua
   * Paleta hidrológica e pluviométrica internacional (Tons de Verde-Claro, Ciano, Azul e Índigo/Violeta):
   *  - 0.00: #e0f2fe (Azul Celeste Muito Claro / 224, 242, 254)
   *  - 0.25: #38bdf8 (Azul Claro Vibrante / 56, 189, 248)
   *  - 0.50: #0284c7 (Azul Oceano / 2, 132, 199)
   *  - 0.75: #1e40af (Azul Cobalto Profundo / 30, 64, 175)
   *  - 1.00: #6b21a8 (Violeta / Púrpura Intenso / 107, 33, 168)
   */
  static getColorForPrecipitationValue(t, alpha = 215) {
    const clampedT = Math.max(0, Math.min(1, t));

    const stops = [
      { pos: 0.00, r: 224, g: 242, b: 254 }, // Azul celeste claro
      { pos: 0.25, r: 56,  g: 189, b: 248 }, // Azul claro
      { pos: 0.50, r: 2,   g: 132, b: 199 }, // Azul oceano
      { pos: 0.75, r: 30,  g: 64,  b: 175 }, // Azul cobalto
      { pos: 1.00, r: 107, g: 33,  b: 168 }  // Violeta
    ];

    let lower = stops[0], upper = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (clampedT >= stops[i].pos && clampedT <= stops[i + 1].pos) {
        lower = stops[i];
        upper = stops[i + 1];
        break;
      }
    }

    const range = upper.pos - lower.pos;
    const factor = range === 0 ? 0 : (clampedT - lower.pos) / range;

    const r = Math.round(lower.r + factor * (upper.r - lower.r));
    const g = Math.round(lower.g + factor * (upper.g - lower.g));
    const b = Math.round(lower.b + factor * (upper.b - lower.b));

    return [r, g, b, alpha];
  }

  /**
   * Executa a interpolação IDW (Ponderação pelo Inverso da Distância, p=2) em coordenadas métricas (EPSG:31982)
   * Restrita estritamente ao polígono municipal de Passo Fundo
   */
  async computeIDWGrid(isoDate) {
    const boundary = await this.loadBoundary();
    const obsData = await this.fetchDailyObservations(isoDate);

    if (!obsData || !obsData.validStations || obsData.validStations.length < 3) {
      throw new Error('Não há dados observados suficientes para gerar a espacialização para esta data (mínimo de 3 estações ativas necessárias).');
    }

    const stations = obsData.validStations;

    // Estatísticas dos dados observados reais
    let minObs = Infinity, maxObs = -Infinity, sumObs = 0;
    for (const st of stations) {
      if (st.tempObserved < minObs) minObs = st.tempObserved;
      if (st.tempObserved > maxObs) maxObs = st.tempObserved;
      sumObs += st.tempObserved;
    }
    const meanObs = sumObs / stations.length;

    // Margem dinâmica para escala cromática harmoniosa
    const rangeMargin = Math.max(0.2, (maxObs - minObs) * 0.05);
    const colorMin = minObs - rangeMargin;
    const colorMax = maxObs + rangeMargin;

    // Resolução da grade: 220 colunas x 156 linhas (~207 metros por célula)
    // Equilíbrio perfeito entre fidelidade cartográfica contínua e altíssimo desempenho (< 10 ms)
    const gridCols = 220;
    const gridRows = 156;

    const canvas = document.createElement('canvas');
    canvas.width = gridCols;
    canvas.height = gridRows;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(gridCols, gridRows);
    const data = imgData.data;

    const minX = boundary.bboxUTM[0];
    const maxX = boundary.bboxUTM[2];
    const minY = boundary.bboxUTM[1];
    const maxY = boundary.bboxUTM[3];

    const dx = (maxX - minX) / gridCols;
    const dy = (maxY - minY) / gridRows;

    const gridValues = new Float32Array(gridCols * gridRows);
    gridValues.fill(NaN);

    let computedCells = 0;
    let sumGridVal = 0;

    // Loop de cálculo raster IDW (p = 2)
    for (let row = 0; row < gridRows; row++) {
      const curY = maxY - (row + 0.5) * dy; // Linha de cima para baixo
      const rowOffset = row * gridCols * 4;

      for (let col = 0; col < gridCols; col++) {
        const curX = minX + (col + 0.5) * dx;
        const pixelIdx = rowOffset + col * 4;
        const cellIdx = row * gridCols + col;

        // 1. Recorte espacial: verifica se está dentro do limite municipal
        if (!ClimateMapsEngine.pointInPolygon(curX, curY, boundary.ring)) {
          data[pixelIdx + 3] = 0; // Transparente fora do município
          gridValues[cellIdx] = NaN;
          continue;
        }

        // 2. Cálculo IDW (Inverso do quadrado da distância em metros)
        let sumW = 0;
        let sumWV = 0;
        let exactMatchVal = null;

        for (let s = 0; s < stations.length; s++) {
          const st = stations[s];
          const distSq = (curX - st.utmX) * (curX - st.utmX) + (curY - st.utmY) * (curY - st.utmY);

          // Se a distância for menor que 1 metro, assume o próprio valor observado da estação
          if (distSq < 1.0) {
            exactMatchVal = st.tempObserved;
            break;
          }

          const w = 1.0 / distSq; // p = 2
          sumW += w;
          sumWV += w * st.tempObserved;
        }

        const cellVal = exactMatchVal !== null ? exactMatchVal : (sumWV / sumW);
        gridValues[cellIdx] = cellVal;
        computedCells++;
        sumGridVal += cellVal;

        // 3. Normalização e mapeamento cromático
        const normT = (cellVal - colorMin) / (colorMax - colorMin);
        const rgba = ClimateMapsEngine.getColorForValue(normT, 215); // ~85% de opacidade

        data[pixelIdx]     = rgba[0];
        data[pixelIdx + 1] = rgba[1];
        data[pixelIdx + 2] = rgba[2];
        data[pixelIdx + 3] = rgba[3];
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const result = {
      variable: 'temperatura',
      scale: 'diario',
      unit: '°C',
      isoDate,
      apiDate: obsData.apiDate,
      gridCols,
      gridRows,
      cellSizeMeters: Math.round(dx),
      computedCells,
      validStations: stations,
      excludedCount: obsData.excludedCount,
      minObserved: minObs,
      maxObserved: maxObs,
      meanObserved: meanObs,
      colorMin,
      colorMax,
      canvasDataUrl: canvas.toDataURL('image/png'),
      bboxUTM: boundary.bboxUTM,
      bbox3857: boundary.bbox3857,
      boundaryRing: boundary.ring,
      gridValues,
      gridMinX: minX,
      gridMaxX: maxX,
      gridMinY: minY,
      gridMaxY: maxY,
      gridDx: dx,
      gridDy: dy
    };

    this.currentResult = result;
    return result;
  }

  /**
   * Determina as cotas/níveis de contorno para o intervalo de valores observado
   * @param {number} minVal Valor mínimo
   * @param {number} maxVal Valor máximo
   * @param {number} step Passo/intervalo padrão (ex: 10 mm para precipitação mensal)
   * @returns {Array<number>}
   */
  static calculateContourLevels(minVal, maxVal, step = 10) {
    if (minVal >= maxVal || step <= 0) return [];
    const levels = [];
    const start = Math.ceil(minVal / step) * step;
    for (let val = start; val <= maxVal; val += step) {
      levels.push(Math.round(val * 100) / 100);
    }
    return levels;
  }

  /**
   * Conecta segmentos desconexos de 2 pontos em polilinhas contínuas
   * @param {Array<[[number, number], [number, number]]>} segments
   * @returns {Array<Array<[number, number]>>}
   */
  static stitchSegmentsToPolylines(segments) {
    if (!segments || segments.length === 0) return [];

    const keyFor = (pt) => `${Math.round(pt[0] * 100)},${Math.round(pt[1] * 100)}`;

    const adj = new Map();
    const addEdge = (pA, pB) => {
      const kA = keyFor(pA);
      const kB = keyFor(pB);
      if (kA === kB) return;

      if (!adj.has(kA)) adj.set(kA, { pt: pA, edges: [] });
      if (!adj.has(kB)) adj.set(kB, { pt: pB, edges: [] });

      adj.get(kA).edges.push({ pt: pB, key: kB });
      adj.get(kB).edges.push({ pt: pA, key: kA });
    };

    segments.forEach(([pA, pB]) => addEdge(pA, pB));

    const visitedEdges = new Set();
    const edgeKey = (k1, k2) => (k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`);
    const polylines = [];

    const oddNodes = [];
    adj.forEach((node, k) => {
      if (node.edges.length === 1) {
        oddNodes.push(k);
      }
    });

    const buildLineFrom = (startKey) => {
      const line = [adj.get(startKey).pt];
      let curKey = startKey;

      while (true) {
        const curNode = adj.get(curKey);
        let nextEdge = null;
        for (const edge of curNode.edges) {
          const ek = edgeKey(curKey, edge.key);
          if (!visitedEdges.has(ek)) {
            nextEdge = edge;
            visitedEdges.add(ek);
            break;
          }
        }
        if (!nextEdge) break;

        line.push(nextEdge.pt);
        curKey = nextEdge.key;
        if (curKey === startKey) break;
      }
      return line;
    };

    // 1. Linhas que partem de pontas abertas
    for (const startK of oddNodes) {
      const line = buildLineFrom(startK);
      if (line.length > 1) {
        polylines.push(line);
      }
    }

    // 2. Ciclos fechados restantes
    adj.forEach((node, k) => {
      for (const edge of node.edges) {
        const ek = edgeKey(k, edge.key);
        if (!visitedEdges.has(ek)) {
          const line = buildLineFrom(k);
          if (line.length > 1) {
            polylines.push(line);
          }
        }
      }
    });

    return polylines;
  }

  /**
   * Gera segmentos e polilinhas de contorno via Marching Squares sobre a grade escalar
   * @param {Float32Array} gridValues Valores escalares das células (tamanho gridCols * gridRows)
   * @param {number} gridCols Número de colunas
   * @param {number} gridRows Número de linhas
   * @param {Array<number>} levels Lista de valores de corte (isovalues)
   * @param {Object} geom { minX, maxX, minY, maxY, dx, dy }
   * @returns {Array<{ level: number, polylines: Array<Array<[number, number]>> }>}
   */
  static generateContourLines(gridValues, gridCols, gridRows, levels, geom) {
    const { minX, maxY, dx, dy } = geom;
    const results = [];

    const interp = (vA, vB, coordA, coordB, L) => {
      const delta = vB - vA;
      if (Math.abs(delta) < 1e-9) return (coordA + coordB) / 2;
      const t = (L - vA) / delta;
      return coordA + t * (coordB - coordA);
    };

    for (let l = 0; l < levels.length; l++) {
      const L = levels[l];
      const segments = [];

      for (let r = 0; r < gridRows - 1; r++) {
        const rowOffset0 = r * gridCols;
        const rowOffset1 = (r + 1) * gridCols;

        const y0 = maxY - (r + 0.5) * dy;
        const y1 = y0 - dy;

        for (let c = 0; c < gridCols - 1; c++) {
          const val0 = gridValues[rowOffset0 + c];     // top-left
          const val1 = gridValues[rowOffset0 + c + 1]; // top-right
          const val2 = gridValues[rowOffset1 + c + 1]; // bottom-right
          const val3 = gridValues[rowOffset1 + c];     // bottom-left

          // Ignora células com qualquer vértice NaN (fora do perímetro municipal)
          if (isNaN(val0) || isNaN(val1) || isNaN(val2) || isNaN(val3)) {
            continue;
          }

          const b0 = val0 >= L ? 8 : 0;
          const b1 = val1 >= L ? 4 : 0;
          const b2 = val2 >= L ? 2 : 0;
          const b3 = val3 >= L ? 1 : 0;
          const caseIdx = b0 | b1 | b2 | b3;

          if (caseIdx === 0 || caseIdx === 15) {
            continue;
          }

          const x0 = minX + (c + 0.5) * dx;
          const x1 = x0 + dx;

          const pT = [interp(val0, val1, x0, x1, L), y0];
          const pR = [x1, interp(val1, val2, y0, y1, L)];
          const pB = [interp(val3, val2, x0, x1, L), y1];
          const pL = [x0, interp(val0, val3, y0, y1, L)];

          switch (caseIdx) {
            case 1:
              segments.push([pL, pB]);
              break;
            case 2:
              segments.push([pB, pR]);
              break;
            case 3:
              segments.push([pL, pR]);
              break;
            case 4:
              segments.push([pT, pR]);
              break;
            case 5: {
              const meanVal = (val0 + val1 + val2 + val3) * 0.25;
              if (meanVal >= L) {
                segments.push([pL, pT]);
                segments.push([pB, pR]);
              } else {
                segments.push([pL, pB]);
                segments.push([pT, pR]);
              }
              break;
            }
            case 6:
              segments.push([pT, pB]);
              break;
            case 7:
              segments.push([pL, pT]);
              break;
            case 8:
              segments.push([pL, pT]);
              break;
            case 9:
              segments.push([pT, pB]);
              break;
            case 10: {
              const meanVal = (val0 + val1 + val2 + val3) * 0.25;
              if (meanVal >= L) {
                segments.push([pT, pR]);
                segments.push([pL, pB]);
              } else {
                segments.push([pL, pT]);
                segments.push([pB, pR]);
              }
              break;
            }
            case 11:
              segments.push([pT, pR]);
              break;
            case 12:
              segments.push([pL, pR]);
              break;
            case 13:
              segments.push([pB, pR]);
              break;
            case 14:
              segments.push([pL, pB]);
              break;
          }
        }
      }

      const polylines = ClimateMapsEngine.stitchSegmentsToPolylines(segments);
      results.push({ level: L, polylines });
    }

    return results;
  }

  /**
   * Renderiza ou atualiza a camada vetorial de isolinhas (isoietas / isotermas)
   * @param {Object} idwResult Resultado do cálculo IDW com gridValues retido
   */
  renderIsolineLayer(idwResult) {
    if (!this.map) return;

    if (!idwResult.gridValues || !idwResult.gridCols || !idwResult.gridRows) {
      if (this.isolineLayer) this.isolineLayer.setVisible(false);
      return;
    }

    const isPrecip = idwResult.variable === 'precipitacao';
    let step = 10;
    if (isPrecip) {
      step = idwResult.scale === 'mensal' ? 10 : 5;
    } else {
      step = 1.0;
    }

    const levels = ClimateMapsEngine.calculateContourLevels(idwResult.minObserved, idwResult.maxObserved, step);
    if (levels.length === 0) {
      if (this.isolineLayer) this.isolineLayer.setVisible(false);
      return;
    }

    const geom = {
      minX: idwResult.gridMinX,
      maxX: idwResult.gridMaxX,
      minY: idwResult.gridMinY,
      maxY: idwResult.gridMaxY,
      dx: idwResult.gridDx,
      dy: idwResult.gridDy
    };

    const contourData = ClimateMapsEngine.generateContourLines(
      idwResult.gridValues,
      idwResult.gridCols,
      idwResult.gridRows,
      levels,
      geom
    );

    const vectorSource = new ol.source.Vector();
    const unit = isPrecip ? 'mm' : '°C';
    const strokeColor = isPrecip ? 'rgba(30, 58, 138, 0.85)' : 'rgba(154, 52, 18, 0.85)';
    const textColor = isPrecip ? '#1e3a8a' : '#7c2d12';

    contourData.forEach(({ level, polylines }) => {
      polylines.forEach(linePts => {
        if (linePts.length < 2) return;
        const coords3857 = linePts.map(pt => ClimateMapsEngine.utmToWebMercator(pt[0], pt[1]));
        const lineGeom = new ol.geom.LineString(coords3857);
        const feat = new ol.Feature({
          geometry: lineGeom,
          level,
          unit,
          variable: idwResult.variable
        });
        vectorSource.addFeature(feat);
      });
    });

    const isolineStyleFunction = (feature) => {
      const level = feature.get('level');
      const textVal = String(level);

      return new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: strokeColor,
          width: 1.5
        }),
        text: new ol.style.Text({
          text: textVal,
          font: 'bold 11px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          placement: 'line',
          repeat: 450,
          fill: new ol.style.Fill({
            color: textColor
          }),
          stroke: new ol.style.Stroke({
            color: 'rgba(255, 255, 255, 0.95)',
            width: 3
          }),
          textBaseline: 'middle'
        })
      });
    };

    const layerTitle = isPrecip
      ? (idwResult.scale === 'mensal' ? 'Isoietas Mensais' : 'Isoietas Diárias')
      : (idwResult.scale === 'mensal' ? 'Isotermas Mensais' : 'Isotermas Diárias');

    if (this.isolineLayer) {
      this.isolineLayer.setSource(vectorSource);
      this.isolineLayer.setStyle(isolineStyleFunction);
      this.isolineLayer.set('layerName', layerTitle);
      this.isolineLayer.setVisible(true);
    } else {
      this.isolineLayer = new ol.layer.Vector({
        source: vectorSource,
        style: isolineStyleFunction,
        zIndex: 25 // Acima da superfície (20) e abaixo das estações (95)
      });
      this.isolineLayer.set('layerId', 'clima_isolinhas');
      this.isolineLayer.set('layerName', layerTitle);
      this.isolineLayer.set('isIsolineLayer', true);
      this.map.addLayer(this.isolineLayer);
    }
  }

  /**
   * Adiciona ou atualiza a camada de superfície espacializada no mapa OpenLayers
   */
  async renderClimateLayer(idwResult) {
    if (!this.map) {
      console.warn('[ClimateMapsEngine] Mapa OpenLayers não disponível.');
      return;
    }

    const staticSource = new ol.source.ImageStatic({
      url: idwResult.canvasDataUrl,
      imageExtent: idwResult.bbox3857,
      projection: 'EPSG:3857'
    });

    const isMonthly = idwResult.scale === 'mensal';
    const isPrecip = idwResult.variable === 'precipitacao';
    let layerTitle = '';
    if (isPrecip) {
      layerTitle = isMonthly
        ? `Precipitação Acumulada Mensal Espacializada (IDW) • ${idwResult.periodLabel}`
        : `Precipitação Diária Espacializada (IDW) • ${idwResult.apiDate}`;
    } else {
      layerTitle = isMonthly
        ? `Temperatura Média Mensal Espacializada (IDW) • ${idwResult.periodLabel}`
        : `Temperatura Média Diária Espacializada (IDW) • ${idwResult.apiDate}`;
    }

    if (this.climateLayer) {
      this.climateLayer.setSource(staticSource);
      this.climateLayer.set('layerName', layerTitle);
      this.climateLayer.setVisible(true);
    } else {
      this.climateLayer = new ol.layer.Image({
        source: staticSource,
        opacity: 0.85,
        zIndex: 20 // Acima do mapa-base (0) e abaixo das feições e estações (95)
      });
      this.climateLayer.set('layerId', 'clima_temp_idw');
      this.climateLayer.set('layerName', layerTitle);
      this.map.addLayer(this.climateLayer);
    }

    // Garante que a camada das 16 estações esteja visível sobre a superfície
    const stationsLayer = this.mapEngine.layerManager?.getLayer('estacoes_plugfield');
    if (stationsLayer && !stationsLayer.getVisible()) {
      stationsLayer.setVisible(true);
    }

    // Renderiza ou atualiza a camada vetorial de isolinhas (isoietas / isotermas) a partir do grid numérico retido
    this.renderIsolineLayer(idwResult);

    // Configura o ouvinte de clique interativo na superfície espacializada
    this.setupMapClickListener(idwResult);

    // Exibe a legenda flutuante dedicada
    this.showFloatingLegend(idwResult);
  }

  /**
   * Configura o ouvinte de clique interativo na superfície espacializada
   * Preserva intacto o clique nas estações como DADOS OBSERVADOS
   */
  setupMapClickListener(idwResult) {
    if (this.mapClickListener) {
      ol.Observable.unByKey(this.mapClickListener);
      this.mapClickListener = null;
    }

    this.mapClickListener = this.map.on('singleclick', (evt) => {
      // 1. Se a camada climática estiver oculta, não intercepta
      if (!this.climateLayer || !this.climateLayer.getVisible()) return;

      // 2. Se o usuário clicou em uma feição vetorial (ex.: estação), não intercepta!
      // O IdentifyTool nativo cuidará de exibir o popup da estação
      let clickedFeature = false;
      this.map.forEachFeatureAtPixel(evt.pixel, (feat, layer) => {
        if (layer && layer.get('isThematicLayer')) {
          clickedFeature = true;
          return true;
        }
      }, { hitTolerance: 8 });

      if (clickedFeature) return;

      // 3. Converte a coordenada clicada para SIRGAS 2000 / UTM 22S (metros)
      const coord3857 = evt.coordinate;
      const utmCoord = ClimateMapsEngine.webMercatorToUTM(coord3857[0], coord3857[1]);
      const curX = utmCoord[0];
      const curY = utmCoord[1];

      // 4. Verifica se o ponto clicado está dentro do Limite Municipal
      if (!ClimateMapsEngine.pointInPolygon(curX, curY, idwResult.boundaryRing)) {
        return;
      }

      // 5. Calcula o valor IDW exato no ponto clicado
      const stations = idwResult.validStations;
      let sumW = 0;
      let sumWV = 0;
      let nearestDist = Infinity;
      let nearestName = '';

      for (const st of stations) {
        const dSq = (curX - st.utmX) * (curX - st.utmX) + (curY - st.utmY) * (curY - st.utmY);
        const d = Math.sqrt(dSq);
        if (d < nearestDist) {
          nearestDist = d;
          nearestName = st.name;
        }

        const obsVal = (st.precipObserved !== undefined && st.precipObserved !== null) ? st.precipObserved : st.tempObserved;

        if (dSq < 1.0) {
          sumWV = obsVal;
          sumW = 1.0;
          break;
        }
        const w = 1.0 / dSq;
        sumW += w;
        sumWV += w * obsVal;
      }

      const spatializedVal = (sumWV / sumW);
      const nearestDistKm = (nearestDist / 1000).toFixed(1).replace('.', ',');

      // 6. Apresenta o popup contextual rigorosamente com a nomenclatura ESPACIALIZADA
      this.showSpatializedPopup(spatializedVal, idwResult, coord3857, nearestName, nearestDistKm);
    });
  }

  /**
   * Exibe o popup oficial no ponto clicado da superfície espacializada
   */
  showSpatializedPopup(val, idwResult, coordinate, nearestName, nearestDistKm) {
    const popupContent = document.getElementById('popup-content');
    if (!popupContent || !this.mapEngine.popupOverlay) return;

    const isMonthly = idwResult.scale === 'mensal';
    const isPrecip = idwResult.variable === 'precipitacao';
    const icon = isPrecip ? '🌧️' : '🌡️';
    const unit = isPrecip ? 'mm' : '°C';
    const valFormatted = isPrecip ? val.toFixed(1).replace('.', ',') : val.toFixed(2).replace('.', ',');
    const thresholdPercent = isPrecip ? '95%' : '90%';

    let titleText = '';
    if (isPrecip) {
      titleText = isMonthly
        ? 'Precipitação Acumulada Mensal Espacializada'
        : 'Precipitação Diária Espacializada';
    } else {
      titleText = isMonthly
        ? 'Temperatura Média Mensal Espacializada'
        : 'Temperatura Média Diária Espacializada';
    }

    const periodText = isMonthly
      ? `${idwResult.periodLabel} • Passo Fundo / RS`
      : `${idwResult.apiDate} • Passo Fundo / RS`;

    const baseText = isMonthly
      ? `${idwResult.validStations.length} estações (${isPrecip ? 'acumulados mensais' : 'médias mensais'} com completude ≥ ${thresholdPercent})`
      : `${idwResult.validStations.length} estações com dados observados`;

    popupContent.innerHTML = `
      <div class="climate-surface-popup">
        <div class="climate-popup-header">
          <span style="font-size:18px;">${icon}</span>
          <div>
            <div class="climate-popup-title">${titleText}</div>
            <div class="climate-popup-subtitle">${periodText}</div>
          </div>
        </div>

        <div class="climate-popup-val-box">
          <span class="climate-popup-val-number">${valFormatted}</span>
          <span class="climate-popup-val-unit">${unit}</span>
        </div>

        <div class="climate-popup-meta">
          <div class="climate-popup-meta-row">
            <span>📐 <strong>Método:</strong></span>
            <span>IDW (Ponderação pelo Inverso da Distância, p=2)</span>
          </div>
          <div class="climate-popup-meta-row">
            <span>📡 <strong>Base:</strong></span>
            <span>${baseText}</span>
          </div>
          ${isMonthly ? `
          <div class="climate-popup-meta-row">
            <span>📊 <strong>Critério:</strong></span>
            <span>Completude mínima de ${thresholdPercent} dos dias válidos</span>
          </div>
          ` : ''}
          <div class="climate-popup-meta-row">
            <span>📍 <strong>Mais próxima:</strong></span>
            <span>Estação ${nearestName} (${nearestDistKm} km)</span>
          </div>
          <div class="climate-popup-meta-row">
            <span>🌐 <strong>Sistema:</strong></span>
            <span>SIRGAS 2000 / UTM Zona 22S (EPSG:31982)</span>
          </div>
        </div>

        <div class="climate-popup-footer-note">
          <i class="lucide-info"></i>
          <span>Superfície contínua espacializada derivada das observações telemétricas em campo. Não representa medição direta no ponto.</span>
        </div>
      </div>
    `;

    this.mapEngine.popupOverlay.setPosition(coordinate);

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  /**
   * Cria e gerencia a legenda flutuante da superfície climática no canto da tela
   */
  showFloatingLegend(idwResult) {
    let legend = document.getElementById('climate-floating-legend');
    if (!legend) {
      legend = document.createElement('div');
      legend.id = 'climate-floating-legend';
      legend.className = 'climate-floating-legend';
      const mapContainer = document.getElementById('map');
      if (mapContainer) mapContainer.appendChild(legend);
    }

    const isMonthly = idwResult.scale === 'mensal';
    const isPrecip = idwResult.variable === 'precipitacao';
    const icon = isPrecip ? '🌧️' : '🌡️';
    const unit = isPrecip ? 'mm' : '°C';
    const thresholdPercent = isPrecip ? '95%' : '90%';

    let titleText = '';
    if (isPrecip) {
      titleText = isMonthly
        ? 'Precipitação Acumulada Mensal Espacializada'
        : 'Precipitação Diária Espacializada';
    } else {
      titleText = isMonthly
        ? 'Temperatura Média Mensal Espacializada'
        : 'Temperatura Média Diária Espacializada';
    }

    const periodDisplay = isMonthly ? idwResult.periodShortLabel : idwResult.apiDate;

    const minStr = idwResult.minObserved.toFixed(1).replace('.', ',');
    const meanStr = idwResult.meanObserved.toFixed(1).replace('.', ',');
    const maxStr = idwResult.maxObserved.toFixed(1).replace('.', ',');

    const baseTagText = isMonthly
      ? (isPrecip ? `Base: Acumulados Mensais (≥${thresholdPercent})` : `Base: Médias Mensais (≥${thresholdPercent})`)
      : 'Base: Dados Observados';

    const barGradientStyle = isPrecip
      ? 'background: linear-gradient(to right, #e0f2fe, #38bdf8, #0284c7, #1e40af, #6b21a8);'
      : '';

    legend.innerHTML = `
      <div class="climate-legend-header">
        <div class="climate-legend-title">
          <span style="font-size:15px;">${icon}</span>
          <span>${titleText}</span>
        </div>
        <button class="climate-legend-close" id="btn-close-climate-legend" title="Ocultar Mapa Climático">&times;</button>
      </div>

      <div class="climate-legend-subtitle">
        <span>📅 <strong>${periodDisplay}</strong></span>
        <span>•</span>
        <span>${idwResult.validStations.length} estações válidas</span>
      </div>

      <!-- Barra de Gradiente Contínuo -->
      <div class="climate-legend-bar-container">
        <div class="climate-legend-gradient-bar" style="${barGradientStyle}"></div>
        <div class="climate-legend-labels">
          <span class="legend-val min">${minStr} ${unit}</span>
          <span class="legend-val mid">${meanStr} ${unit} (Média)</span>
          <span class="legend-val max">${maxStr} ${unit}</span>
        </div>
      </div>

      <!-- Metadados de Cartografia e Rigor Científico -->
      <div class="climate-legend-tags">
        <span class="climate-tag">Método: IDW (p=2)</span>
        <span class="climate-tag">EPSG:31982</span>
        <span class="climate-tag">${baseTagText}</span>
        <span class="climate-tag">Unidade: ${unit}</span>
      </div>

      <!-- Controles de Visibilidade e Opacidade -->
      <div class="climate-legend-controls">
        <label class="climate-toggle-label">
          <input type="checkbox" id="chk-climate-visibility" checked>
          <span>Exibir Superfície</span>
        </label>
        <div class="climate-opacity-box">
          <span>Opacidade:</span>
          <input type="range" id="rng-climate-opacity" min="20" max="100" value="85">
        </div>
      </div>

      <div class="climate-legend-controls" style="border-top: 1px dashed var(--dc-blue-border); padding-top: 8px; margin-top: -2px;">
        <label class="climate-toggle-label" id="lbl-climate-isolines">
          <input type="checkbox" id="chk-climate-isolines" checked>
          <span>${isPrecip ? 'Exibir Isoietas (Linhas de Contorno)' : 'Exibir Isotermas (Linhas de Contorno)'}</span>
        </label>
      </div>
    `;

    legend.style.display = 'flex';

    // Eventos dos Controles da Legenda
    const closeBtn = legend.querySelector('#btn-close-climate-legend');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideClimateLayer();
      });
    }

    const visChk = legend.querySelector('#chk-climate-visibility');
    if (visChk) {
      visChk.addEventListener('change', (e) => {
        if (this.climateLayer) {
          this.climateLayer.setVisible(e.target.checked);
        }
      });
    }

    const opRng = legend.querySelector('#rng-climate-opacity');
    if (opRng) {
      opRng.addEventListener('input', (e) => {
        if (this.climateLayer) {
          this.climateLayer.setOpacity(parseFloat(e.target.value) / 100);
        }
      });
    }

    const isoChk = legend.querySelector('#chk-climate-isolines');
    if (isoChk) {
      isoChk.addEventListener('change', (e) => {
        if (this.isolineLayer) {
          this.isolineLayer.setVisible(e.target.checked);
        }
      });
    }
  }

  /**
   * Oculta a camada e a legenda
   */
  hideClimateLayer() {
    if (this.climateLayer) {
      this.climateLayer.setVisible(false);
    }
    if (this.isolineLayer) {
      this.isolineLayer.setVisible(false);
    }
    const legend = document.getElementById('climate-floating-legend');
    if (legend) legend.style.display = 'none';

    if (this.mapEngine?.popupOverlay) {
      this.mapEngine.closePopup();
    }
  }
}