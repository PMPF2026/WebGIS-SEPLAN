/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Serviço Frontend de Integração com a Rede Meteorológica Plugfield (16 Estações)
 */

export const PLUGFIELD_STATIONS_CONFIG = [
  { deviceId: 4283,  name: 'Transbrasiliana',                type: 'Urbana / Perimetral',        lat: -28.2721, lon: -52.3952 },
  { deviceId: 4253,  name: 'Capinzal',                       type: 'Rural / Bacia Hidrográfica', lat: -28.2250, lon: -52.4820 },
  { deviceId: 4798,  name: 'Sede Independência',             type: 'Urbana / Administrativa',    lat: -28.2580, lon: -52.4110 },
  { deviceId: 4416,  name: 'São Roque',                      type: 'Rural / Setor Leste',        lat: -28.2890, lon: -52.3210 },
  { deviceId: 3009,  name: 'Avena',                          type: 'Rural / Agrícola',           lat: -28.082155, lon: -52.639036 },
  { deviceId: 4931,  name: 'Pulador',                        type: 'Rural / Bacia Hidrográfica', lat: -28.3610, lon: -52.4190 },
  { deviceId: 4965,  name: 'Quinto Giongo (Victor Issler)',  type: 'Urbana / Victor Issler',     lat: -28.2430, lon: -52.3820 },
  { deviceId: 4678,  name: 'Fredolino Chimango (Centro)',    type: 'Urbana / Centro',            lat: -28.2620, lon: -52.4080 },
  { deviceId: 2856,  name: 'Fazenda Bugre',                  type: 'Rural / Bacia Hidrográfica', lat: -28.1820, lon: -52.4980 },
  { deviceId: 4712,  name: 'Bela Vista',                     type: 'Urbana / Bela Vista',        lat: -28.2490, lon: -52.4250 },
  { deviceId: 4713,  name: 'Bom Recreio',                    type: 'Rural / Setor Norte',        lat: -28.1690, lon: -52.3890 },
  { deviceId: 4714,  name: 'Lobo da Costa (Entre Rios)',     type: 'Rural / Bacia Hidrográfica', lat: -28.2120, lon: -52.3480 },
  { deviceId: 4717,  name: 'Camponesa',                      type: 'Urbana / Camponesa',         lat: -28.225341, lon: -52.277339 },
  { deviceId: 4431,  name: 'Avenida Brasil (Largo Literatura)', type: 'Urbana / Eixo Central',   lat: -28.253607, lon: -52.396017 },
  { deviceId: 10994, name: '2000 - ATITUS',                  type: 'Universitária / Campus Atitus', lat: -28.291063, lon: -52.351368 },
  { deviceId: 2041,  name: 'Veneza',                         type: 'Urbana / Vila Veneza',       lat: -28.249373, lon: -52.601557 }
];

export class PlugfieldService {
  static API_ENDPOINT = '/api/weather/plugfield';
  static CACHE_KEY_PREFIX = 'pf_real_v3_';
  static CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos = 120.000 ms

  /**
   * Obtém a lista e status das 16 estações Plugfield
   * @param {boolean} [forceRefresh=false] Quando true, ignora o cache do localStorage e busca da API
   */
  static async fetchAllStations(forceRefresh = false) {
    // 1. Tentar ler do cache local (ignorado se forceRefresh = true)
    if (!forceRefresh) {
      const cached = this.getLocalCache('all_stations');
      if (cached && cached.length > 0) {
        this.updateMapLayerWithTelemetry(cached);
        return cached;
      }
    }

    try {
      const response = await fetch(`${this.API_ENDPOINT}?action=devices`);
      if (!response.ok) {
        throw new Error(`Erro na API Plugfield: HTTP ${response.status}`);
      }

      const resJson = await response.json();
      if (!resJson.success || !resJson.data?.stations) {
        throw new Error('Resposta inválida do servidor Plugfield.');
      }

      const rawStations = resJson.data.stations;
      const normalizedStations = this.mergeAndNormalizeStations(rawStations);

      // Salva no cache local
      this.setLocalCache('all_stations', normalizedStations);
      this.updateMapLayerWithTelemetry(normalizedStations);
      return normalizedStations;
    } catch (err) {
      console.warn('[PlugfieldService] Consulta à API em andamento/offline. Utilizando base operacional:', err);
      // Fallback para último cache existente mesmo que expirado
      const fallback = this.getAnyLocalCache('all_stations');
      if (fallback && fallback.length > 0) {
        this.updateMapLayerWithTelemetry(fallback);
        return fallback;
      }

      // Retorna lista padrão operacional com status de conexão pendente (sem sobrescrever cache nem inventar dados)
      const defaultStations = this.getDefaultEmptyStations();
      this.updateMapLayerWithTelemetry(defaultStations);
      return defaultStations;
    }
  }

  /**
   * Alias de compatibilidade para fetchAllStations
   * @param {boolean} [forceRefresh=false]
   */
  static async getAllStations(forceRefresh = false) {
    return this.fetchAllStations(forceRefresh);
  }

  /**
   * Retorna do cache local síncrono para inicialização instantânea da interface
   */
  static getCachedStations() {
    return this.getLocalCache('all_stations') || this.getAnyLocalCache('all_stations') || this.getDefaultEmptyStations();
  }

  /**
   * Atualiza a camada GeoJSON do mapa 'estacoes_plugfield' com as leituras em tempo real e coordenadas oficiais
   * @param {Array<Object>} stations
   * @param {Object} [layerManager]
   */
  static updateMapLayerWithTelemetry(stations, layerManager) {
    if (!stations || !Array.isArray(stations) || stations.length === 0) return;
    const lm = layerManager || window.webGis?.layerManager;
    if (!lm || typeof lm.getLayer !== 'function') return;

    const layer = lm.getLayer('estacoes_plugfield');
    if (!layer || typeof layer.getSource !== 'function') return;

    const source = layer.getSource();
    if (!source || typeof source.getFeatures !== 'function') return;

    const features = source.getFeatures();
    if (!features || features.length === 0) return;

    const stMap = new Map();
    stations.forEach(s => stMap.set(s.deviceId, s));

    features.forEach(f => {
      const devId = parseInt(f.get('deviceId'), 10);
      const st = stMap.get(devId);
      if (!st) return;

      // 1. Atualiza coordenadas caso a API tenha fornecido dados válidos
      if (st.lat != null && st.lon != null && !isNaN(st.lat) && !isNaN(st.lon)) {
        const geom = f.getGeometry();
        if (geom && typeof geom.setCoordinates === 'function' && typeof ol !== 'undefined' && ol.proj) {
          const mapCoord = ol.proj.fromLonLat([st.lon, st.lat]);
          geom.setCoordinates(mapCoord);
        }
      }

      // 2. Atualiza propriedades de telemetria no GeoJSON da camada
      const m = st.metrics || {};
      const isOnline = st.isOnline;
      f.set('status_comunicacao', isOnline ? 'Online' : (st.status === 'delayed' ? 'Comunicação atrasada' : (st.status === 'waiting' ? 'Conectando...' : 'Sem comunicação recente')));
      f.set('temperatura_atual', m.temperature != null ? `${m.temperature.toFixed(1).replace('.', ',')} °C` : '--');
      f.set('temperatura_min_max', (m.tempMin != null || m.tempMax != null)
        ? `${m.tempMin != null ? m.tempMin.toFixed(1).replace('.', ',') + ' °C' : '--'} / ${m.tempMax != null ? m.tempMax.toFixed(1).replace('.', ',') + ' °C' : '--'}`
        : '--');
      f.set('umidade_atual', m.humidity != null ? `${m.humidity.toFixed(0)} %` : '--');
      f.set('chuva_hoje', m.rain != null ? `${m.rain.toFixed(1).replace('.', ',')} mm` : '--');
      f.set('chuva_mes', m.rainAccumMonthly != null ? `${m.rainAccumMonthly.toFixed(1).replace('.', ',')} mm` : '--');
      f.set('vento_atual', m.windSpeed != null ? `${m.windSpeed.toFixed(1).replace('.', ',')} km/h` : '--');
      f.set('rajada_maxima', m.windGust != null ? `${m.windGust.toFixed(1).replace('.', ',')} km/h` : '--');
      f.set('direcao_vento', m.windDirectionText || (m.windDirection != null ? `${m.windDirection}°` : '--'));
      f.set('pressao_atual', m.pressure != null ? `${m.pressure.toFixed(1).replace('.', ',')} hPa` : '--');
      f.set('nivel_rio', m.riverLevel != null ? `${m.riverLevel.toFixed(2).replace('.', ',')} m` : (st.hasRiverSensor ? 'Sensor ativo (aguardando leitura)' : 'Não monitorado nesta estação'));
      f.set('ultima_atualizacao', st.lastUpdateText || 'Sem comunicação recente');
    });

    if (typeof source.changed === 'function') {
      source.changed();
    }
  }

  /**
   * Obtém histórico dos últimos 5 dias normalizado para gráficos e tabelas (Sem mock artificial)
   * @param {number} deviceId 
   */
  static async getStationDailyHistory(deviceId) {
    const res = await this.fetchStationDetailsAndHistory(deviceId);
    if (!res || !res.history5Days || !Array.isArray(res.history5Days) || res.history5Days.length === 0) {
      return [];
    }

    return res.history5Days.map(item => {
      const rawDate = item.localDate || item.date || item.day || '';
      let dateLabel = rawDate;
      if (typeof rawDate === 'string' && rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length >= 2) dateLabel = `${parts[0]}/${parts[1]}`;
      } else if (typeof rawDate === 'string' && rawDate.includes('-')) {
        const parts = rawDate.split('-');
        if (parts.length >= 3) dateLabel = `${parts[2].slice(0, 2)}/${parts[1]}`;
      }

      const tempAvg = item.temp != null && !isNaN(parseFloat(item.temp)) ? parseFloat(item.temp) : (item.tempAvg != null && !isNaN(parseFloat(item.tempAvg)) ? parseFloat(item.tempAvg) : null);
      const tempMin = item.tempMin != null && !isNaN(parseFloat(item.tempMin)) ? parseFloat(item.tempMin) : (item.minTemp != null && !isNaN(parseFloat(item.minTemp)) ? parseFloat(item.minTemp) : null);
      const tempMax = item.tempMax != null && !isNaN(parseFloat(item.tempMax)) ? parseFloat(item.tempMax) : (item.maxTemp != null && !isNaN(parseFloat(item.maxTemp)) ? parseFloat(item.maxTemp) : null);
      const rain = item.rainAccum != null && !isNaN(parseFloat(item.rainAccum)) ? parseFloat(item.rainAccum) : (item.rain != null && !isNaN(parseFloat(item.rain)) ? parseFloat(item.rain) : (item.rainDay != null && !isNaN(parseFloat(item.rainDay)) ? parseFloat(item.rainDay) : null));
      const windAvg = item.wind != null && !isNaN(parseFloat(item.wind)) ? parseFloat(item.wind) : (item.windAvg != null && !isNaN(parseFloat(item.windAvg)) ? parseFloat(item.windAvg) : null);
      const windMax = item.windBurst != null && !isNaN(parseFloat(item.windBurst)) ? parseFloat(item.windBurst) : (item.winbMax != null && !isNaN(parseFloat(item.winbMax)) ? parseFloat(item.winbMax) : (item.windMax != null && !isNaN(parseFloat(item.windMax)) ? parseFloat(item.windMax) : null));
      const press = (item.prre != null && !isNaN(parseFloat(item.prre)))
        ? parseFloat(item.prre)
        : ((item.pressureRelative != null && !isNaN(parseFloat(item.pressureRelative)))
          ? parseFloat(item.pressureRelative)
          : ((item.relativePressure != null && !isNaN(parseFloat(item.relativePressure)))
            ? parseFloat(item.relativePressure)
            : null));
      const river = (item.sc != null && item.sc !== '' && !isNaN(parseFloat(item.sc)))
        ? parseFloat(item.sc)
        : ((item.riverLevel != null && item.riverLevel !== '' && !isNaN(parseFloat(item.riverLevel)))
          ? parseFloat(item.riverLevel)
          : ((item.levelAdditional != null && item.levelAdditional !== '' && !isNaN(parseFloat(item.levelAdditional)))
            ? parseFloat(item.levelAdditional)
            : null));
      const hum = item.humidity != null && !isNaN(parseFloat(item.humidity)) ? parseFloat(item.humidity) : (item.humi != null && !isNaN(parseFloat(item.humi)) ? parseFloat(item.humi) : null);

      return {
        date: dateLabel,
        fullDate: rawDate,
        tempAvg: tempAvg,
        tempMin: tempMin,
        tempMax: tempMax,
        rainAccum: rain,
        windAvg: windAvg,
        windMax: windMax,
        pressure: press,
        riverLevel: river,
        humidity: hum
      };
    });
  }

  /**
   * Obtém dados detalhados e histórico dos últimos 5 dias de uma estação
   * @param {number} deviceId 
   */
  static async fetchStationDetailsAndHistory(deviceId) {
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const endStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const fiveDaysAgo = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000));
    const beginStr = `${pad(fiveDaysAgo.getDate())}/${pad(fiveDaysAgo.getMonth() + 1)}/${fiveDaysAgo.getFullYear()}`;

    const cacheKey = `history_${deviceId}_${beginStr}_${endStr}`;
    const cached = this.getLocalCache(cacheKey);
    if (cached) return cached;

    try {
      const [devResp, dailyResp] = await Promise.all([
        fetch(`${this.API_ENDPOINT}?action=device&deviceId=${deviceId}`).catch(() => null),
        fetch(`${this.API_ENDPOINT}?action=daily&deviceId=${deviceId}&begin=${encodeURIComponent(beginStr)}&end=${encodeURIComponent(endStr)}`).catch(() => null)
      ]);

      let devData = null;
      if (devResp && devResp.ok) {
        const j = await devResp.json();
        if (j.success) devData = j.data;
      }

      let dailyDays = [];
      if (dailyResp && dailyResp.ok) {
        const j = await dailyResp.json();
        if (j.success && j.data?.days) dailyDays = j.data.days;
      }

      const result = {
        deviceId,
        device: devData,
        history5Days: dailyDays,
        updatedAt: new Date().toISOString()
      };

      this.setLocalCache(cacheKey, result);
      return result;
    } catch (e) {
      console.warn(`[PlugfieldService] Erro ao buscar histórico da estação ${deviceId}:`, e);
      return {
        deviceId,
        device: null,
        history5Days: [],
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Mescla as 16 estações configuradas com os dados retornados pela API oficial (Zero Mock)
   */
  static mergeAndNormalizeStations(apiStations) {
    const apiMap = new Map();
    if (Array.isArray(apiStations)) {
      apiStations.forEach(st => apiMap.set(st.deviceId || st.id, st));
    }

    return PLUGFIELD_STATIONS_CONFIG.map(cfg => {
      const apiData = apiMap.get(cfg.deviceId);
      const dash = apiData?.dashboard || {};

      let hasRiverSensor = false;
      let riverLevel = null;

      if (apiData?.riverLevel != null && !isNaN(parseFloat(apiData.riverLevel))) {
        riverLevel = parseFloat(apiData.riverLevel);
        hasRiverSensor = true;
      } else if (dash.sc != null && dash.sc !== '' && !isNaN(parseFloat(dash.sc))) {
        riverLevel = parseFloat(dash.sc);
        hasRiverSensor = true;
      } else if (dash.riverLevel != null && dash.riverLevel !== '' && !isNaN(parseFloat(dash.riverLevel))) {
        riverLevel = parseFloat(dash.riverLevel);
        hasRiverSensor = true;
      } else if (dash.levelAdditional != null && dash.levelAdditional !== '' && !isNaN(parseFloat(dash.levelAdditional))) {
        riverLevel = parseFloat(dash.levelAdditional);
        hasRiverSensor = true;
      } else if (dash.lastSensorData?.sensorDataList && Array.isArray(dash.lastSensorData.sensorDataList)) {
        const scSensor = dash.lastSensorData.sensorDataList.find(s =>
          s.sensorCode === 'sc' ||
          s.sensorId === 380 ||
          (s.sensorName && /n[íi]vel|s[ôo]nico|l[íi]quido/i.test(s.sensorName))
        );
        if (scSensor && scSensor.dataValue != null && !isNaN(parseFloat(scSensor.dataValue))) {
          riverLevel = parseFloat(scSensor.dataValue);
          hasRiverSensor = true;
        }
      }

      if (!hasRiverSensor && (apiData?.hasRiverSensor || (apiData?.sensors && Array.isArray(apiData.sensors)))) {
        const hasSensorDef = apiData?.hasRiverSensor || apiData.sensors.some(s =>
          s.code === 'sc' ||
          s.id === 380 ||
          (s.name && /n[íi]vel|s[ôo]nico|l[íi]quido/i.test(s.name))
        );
        if (hasSensorDef) {
          hasRiverSensor = true;
        }
      }

      // Leituras numéricas reais conforme a especificação oficial da Plugfield
      const tempAtual = (dash.temp != null && !isNaN(parseFloat(dash.temp))) ? parseFloat(dash.temp) : null;
      const tempMin = (dash.tempMin != null && !isNaN(parseFloat(dash.tempMin))) ? parseFloat(dash.tempMin) : null;
      const tempMax = (dash.tempMax != null && !isNaN(parseFloat(dash.tempMax))) ? parseFloat(dash.tempMax) : null;
      const rainDay = (dash.rainDay != null && !isNaN(parseFloat(dash.rainDay)))
        ? parseFloat(dash.rainDay)
        : ((dash.rain != null && !isNaN(parseFloat(dash.rain))) ? parseFloat(dash.rain) : null);
      const rainMonth = (dash.rainMonth != null && !isNaN(parseFloat(dash.rainMonth)))
        ? parseFloat(dash.rainMonth)
        : ((dash.rainAccumMonthly != null && !isNaN(parseFloat(dash.rainAccumMonthly))) ? parseFloat(dash.rainAccumMonthly) : null);
      const humi = (dash.humi != null && !isNaN(parseFloat(dash.humi)))
        ? parseFloat(dash.humi)
        : ((dash.humidity != null && !isNaN(parseFloat(dash.humidity))) ? parseFloat(dash.humidity) : null);
      const windSpd = (dash.wind != null && !isNaN(parseFloat(dash.wind))) ? parseFloat(dash.wind) : null;
      const windGst = (dash.winbMax != null && !isNaN(parseFloat(dash.winbMax)))
        ? parseFloat(dash.winbMax)
        : ((dash.winb != null && !isNaN(parseFloat(dash.winb))) ? parseFloat(dash.winb) : null);
      const windDir = (dash.dire != null && !isNaN(parseFloat(dash.dire)))
        ? parseFloat(dash.dire)
        : ((dash.direction != null && !isNaN(parseFloat(dash.direction))) ? parseFloat(dash.direction) : null);
      const windDirText = dash.direString || dash.directionString || null;
      const press = (dash.prre != null && !isNaN(parseFloat(dash.prre)))
        ? parseFloat(dash.prre)
        : ((dash.pressureRelative != null && !isNaN(parseFloat(dash.pressureRelative)))
          ? parseFloat(dash.pressureRelative)
          : ((dash.relativePressure != null && !isNaN(parseFloat(dash.relativePressure)))
            ? parseFloat(dash.relativePressure)
            : null));
      const solr = (dash.solr != null && !isNaN(parseFloat(dash.solr)))
        ? parseFloat(dash.solr)
        : ((dash.radiation != null && !isNaN(parseFloat(dash.radiation))) ? parseFloat(dash.radiation) : null);

      // Status temporal de comunicação baseado no timestamp oficial (Limiares: <= 30 min: Online, <= 120 min: Atrasada, > 120 min: Sem comunicação recente)
      let isOnline = false;
      let status = 'offline';
      let formattedDate = 'Sem comunicação recente';
      let parsedTimestamp = null;
      const ts = apiData?.lastUpdateTimestamp || dash.lastUpdateTimestamp || apiData?.timestamp || dash.timestamp;

      if (ts) {
        try {
          let numTs = typeof ts === 'number' ? ts : parseInt(ts, 10);
          if (!isNaN(numTs)) {
            // Se o timestamp estiver em segundos UNIX (10 dígitos), converter para milissegundos
            if (numTs < 10000000000) {
              numTs = numTs * 1000;
            }
          }
          const d = new Date(numTs || ts);
          if (!isNaN(d.getTime())) {
            parsedTimestamp = d.getTime();
            const diffMinutes = (Date.now() - d.getTime()) / (1000 * 60);

            // Limiares estritos de comunicação telemétrica:
            // - Até 30 minutos: Online (verde)
            // - Entre 30 minutos e 2 horas (120 min): Atrasada (amarelo)
            // - Acima de 2 horas: Sem comunicação recente (vermelho/cinza)
            if (diffMinutes <= 30) {
              isOnline = true;
              status = 'updated';
            } else if (diffMinutes <= 120) {
              isOnline = false;
              status = 'delayed';
            } else {
              isOnline = false;
              status = 'offline';
            }

            const pad = (n) => String(n).padStart(2, '0');
            formattedDate = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
          }
        } catch {
          // ignore
        }
      }

      // Prioridade absoluta para as coordenadas geográficas oficiais retornadas pela API
      const officialLat = (apiData?.latitude != null && !isNaN(parseFloat(apiData.latitude)))
        ? parseFloat(apiData.latitude)
        : cfg.lat;
      const officialLon = (apiData?.longitude != null && !isNaN(parseFloat(apiData.longitude)))
        ? parseFloat(apiData.longitude)
        : cfg.lon;
      const officialAlt = (apiData?.altitude != null && !isNaN(parseFloat(apiData.altitude)))
        ? parseFloat(apiData.altitude)
        : (cfg.altitude || null);

      const metrics = {
        temperature: tempAtual,
        tempMin: tempMin,
        tempMax: tempMax,
        rain: rainDay,
        rainAccumMonthly: rainMonth,
        windSpeed: windSpd,
        windGust: windGst,
        windDirection: windDir,
        windDirectionText: windDirText,
        pressure: press,
        riverLevel: riverLevel,
        humidity: humi,
        solarRadiation: solr
      };

      return {
        deviceId: cfg.deviceId,
        id: cfg.deviceId,
        name: apiData?.name || cfg.name,
        type: apiData?.type || cfg.type,
        neighborhood: cfg.type,
        status: status,
        isOnline: isOnline,
        lat: officialLat,
        lon: officialLon,
        lastUpdate: parsedTimestamp || null,
        lastUpdateText: formattedDate,
        timestamp: parsedTimestamp || null,
        metrics: metrics,
        hasRiverSensor: hasRiverSensor,
        riverLevel: riverLevel,

        // Compatibilidade com subestruturas
        temperatura: {
          atual: tempAtual,
          minima: tempMin,
          maxima: tempMax,
          mediaMensalInfo: 'Média mensal indisponível — série histórica insuficiente.'
        },
        chuva: {
          atual: rainDay,
          acumuladoDia: rainDay,
          acumuladoMes: rainMonth
        },
        vento: {
          velocidade: windSpd,
          rajadaMaxima: windGst,
          direcaoGraus: windDir,
          direcaoCardeal: windDirText
        },
        pressao: {
          atual: press
        },
        rio: {
          disponivel: hasRiverSensor,
          nivelAtual: riverLevel,
          mensagem: hasRiverSensor ? null : 'Dado não disponível para esta estação'
        },
        umidade: humi,
        radiacao: solr
      };
    });
  }

  static getDefaultEmptyStations() {
    return PLUGFIELD_STATIONS_CONFIG.map(cfg => ({
      deviceId: cfg.deviceId,
      id: cfg.deviceId,
      name: cfg.name,
      type: cfg.type,
      neighborhood: cfg.type,
      status: 'waiting',
      isOnline: null,
      lat: cfg.lat,
      lon: cfg.lon,
      altitude: null,
      lastUpdate: null,
      lastUpdateText: 'Conectando...',
      timestamp: null,
      metrics: {
        temperature: null,
        tempMin: null,
        tempMax: null,
        rain: null,
        rainAccumMonthly: null,
        windSpeed: null,
        windGust: null,
        windDirection: null,
        windDirectionText: null,
        pressure: null,
        riverLevel: null,
        humidity: null,
        solarRadiation: null
      },
      temperatura: {
        atual: null,
        minima: null,
        maxima: null,
        mediaMensalInfo: 'Média mensal indisponível — série histórica insuficiente.'
      },
      chuva: {
        atual: null,
        acumuladoDia: null,
        acumuladoMes: null
      },
      vento: {
        velocidade: null,
        rajadaMaxima: null,
        direcaoGraus: null,
        direcaoCardeal: null
      },
      pressao: {
        atual: null
      },
      rio: {
        disponivel: false,
        nivelAtual: null,
        mensagem: 'Dado não disponível para esta estação'
      },
      umidade: null,
      radiacao: null
    }));
  }

  static getLocalCache(key) {
    try {
      const raw = localStorage.getItem(`${this.CACHE_KEY_PREFIX}${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < this.CACHE_TTL_MS) {
        return parsed.data;
      }
    } catch {
      return null;
    }
    return null;
  }

  static getAnyLocalCache(key) {
    try {
      const raw = localStorage.getItem(`${this.CACHE_KEY_PREFIX}${key}`);
      if (!raw) return null;
      return JSON.parse(raw).data;
    } catch {
      return null;
    }
  }

  static setLocalCache(key, data) {
    try {
      localStorage.setItem(`${this.CACHE_KEY_PREFIX}${key}`, JSON.stringify({
        timestamp: Date.now(),
        data
      }));
    } catch {
      // Ignora erro de cota de storage
    }
  }
}
