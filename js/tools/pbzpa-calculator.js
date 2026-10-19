/**
 * WebGIS SEPLAN Passo Fundo - Diagnósticos Territoriais
 * PBZPA Altimetric Interpolator Engine (DECEA Portaria nº 846 / Processo SAGA RS0006)
 * 
 * Interpolação analítica contínua tridimensional de cotas aeronáuticas máximas (Z_aero)
 * no ponto exato clicado (lote de interesse), combinada com a matriz topográfica (DEM)
 * para apuração do gabarito máximo edificável (H_max = Z_aero - Z_terreno).
 */

import { toUTM22S } from '../utils/projection.js';
import { formatNumber } from '../utils/formatters.js';

// Coordenadas oficiais das cabeceiras em WGS84 (Portaria DECEA nº 846)
export const CAB09_WGS84 = [-52.336488888889, -28.246866666667]; // Cota: 715.06m
export const CAB27_WGS84 = [-52.320458333333, -28.241541666667]; // Cota: 725.29m

/**
 * Calcula a distância euclidiana de um ponto P a um segmento de reta AB em metros
 */
function distToSegment(px, py, ax, ay, bx, by) {
  const abX = bx - ax;
  const abY = by - ay;
  const apX = px - ax;
  const apY = py - ay;
  const lenSq = abX * abX + abY * abY;
  if (lenSq === 0) return Math.hypot(apX, apY);
  const t = Math.max(0, Math.min(1, (apX * abX + apY * abY) / lenSq));
  const projX = ax + t * abX;
  const projY = ay + t * abY;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Calcula a projeção escalar [0, 1] de um ponto P sobre o eixo direcionado AB
 */
function projectAlongAxis(px, py, ax, ay, bx, by) {
  const abX = bx - ax;
  const abY = by - ay;
  const apX = px - ax;
  const apY = py - ay;
  const lenSq = abX * abX + abY * abY;
  if (lenSq === 0) return 0;
  return Math.max(0, Math.min(1, (apX * abX + apY * abY) / lenSq));
}

/**
 * Interpola a cota altimétrica máxima exata da superfície aeronáutica PBZPA no ponto clicado
 * @param {ol.Feature} feature Feição da camada pbzpa_superficies
 * @param {Array<number>} coordinate Coordenada do mapa em EPSG:3857 [x, y]
 * @returns {Object} Dados analíticos calculados para o lote
 */
export function interpolatePbzpaAtCoordinate(feature, coordinate) {
  if (!feature || !coordinate) return null;

  const props = feature.getProperties ? feature.getProperties() : feature.properties || {};
  const nome = props.nome || '';
  const categoria = props.categoria || nome;
  const cotaMin = parseFloat(props.cota_min_metros) || 725.29;
  const cotaMax = parseFloat(props.cota_max_metros) || 845.29;

  // Converter ponto clicado para coordenadas métricas UTM 22S
  const isCoordLonLat = Math.abs(coordinate[0]) <= 180 && Math.abs(coordinate[1]) <= 90;
  const pUTM = toUTM22S(coordinate, isCoordLonLat ? 'EPSG:4326' : 'EPSG:3857');
  const cab09UTM = toUTM22S(CAB09_WGS84, 'EPSG:4326');
  const cab27UTM = toUTM22S(CAB27_WGS84, 'EPSG:4326');
  const midRunwayUTM = [(cab09UTM[0] + cab27UTM[0]) / 2, (cab09UTM[1] + cab27UTM[1]) / 2];

  let cotaAero = cotaMin;
  let fractionT = 0;
  let isRamp = false;
  let tipoInterpolacao = 'Cota Fixa / Superfície Horizontal';

  // 1. Superfícies Planas Horizontais (Cota constante em toda a mancha)
  if (cotaMin === cotaMax || nome === 'Horizontal Interna' || nome === 'Horizontal Externa' || nome.includes('Seção Horizontal') || nome.includes('Aproximação 3')) {
    cotaAero = cotaMax;
    fractionT = 1.0;
    tipoInterpolacao = 'Plano Horizontal Fixo (Cota Constante)';
  }
  // 2. Superfície Cônica (CO) - Gradiente radial de 5% de 4.000m até 5.500m
  else if (nome === 'Cônica') {
    isRamp = true;
    tipoInterpolacao = 'Superfície Cônica (Rampa Radial Ascendente 5%)';
    const d = distToSegment(pUTM[0], pUTM[1], cab09UTM[0], cab09UTM[1], cab27UTM[0], cab27UTM[1]);
    const dCone = Math.max(0, Math.min(1500, d - 4000));
    fractionT = dCone / 1500.0;
    cotaAero = 770.29 + 0.05 * dCone;
  }
  // 3. Pista e Faixa de Pista - Gradiente longitudinal entre cabeceiras (1.680m)
  else if (nome === 'Pista' || nome === 'Faixa de Pista') {
    isRamp = true;
    tipoInterpolacao = 'Eixo da Pista (Gradiente Longitudinal 0,61%)';
    fractionT = projectAlongAxis(pUTM[0], pUTM[1], cab09UTM[0], cab09UTM[1], cab27UTM[0], cab27UTM[1]);
    cotaAero = cotaMin + fractionT * (cotaMax - cotaMin);
  }
  // 4. Superfícies de Aproximação e Decolagem (Rampas Trapezoidais 3D)
  else {
    isRamp = true;
    tipoInterpolacao = 'Rampa de Voo (Interpolação Longitudinal)';

    const geom = feature.getGeometry ? feature.getGeometry() : null;
    let ringCoordinates = [];

    let rawCoords = null;
    if (geom && typeof geom.getCoordinates === 'function') {
      rawCoords = geom.getCoordinates();
    } else if (feature.geometry && feature.geometry.coordinates) {
      rawCoords = feature.geometry.coordinates;
    }

    if (rawCoords) {
      let current = rawCoords;
      while (Array.isArray(current) && current.length > 0 && Array.isArray(current[0]) && Array.isArray(current[0][0])) {
        current = current[0];
      }
      ringCoordinates = current;
    }

    if (ringCoordinates.length >= 4) {
      const ringUTM = ringCoordinates.map(pt => {
        const isLonLat = Math.abs(pt[0]) <= 180 && Math.abs(pt[1]) <= 90;
        return toUTM22S(pt, isLonLat ? 'EPSG:4326' : 'EPSG:3857');
      });

      let innerMid = null;
      let outerMid = null;

      // Trapézio de 4 lados (5 vértices com o fechamento)
      if (ringUTM.length === 5) {
        const midA = [(ringUTM[3][0] + ringUTM[0][0]) / 2, (ringUTM[3][1] + ringUTM[0][1]) / 2];
        const midB = [(ringUTM[1][0] + ringUTM[2][0]) / 2, (ringUTM[1][1] + ringUTM[2][1]) / 2];

        const distA = Math.hypot(midA[0] - midRunwayUTM[0], midA[1] - midRunwayUTM[1]);
        const distB = Math.hypot(midB[0] - midRunwayUTM[0], midB[1] - midRunwayUTM[1]);

        if (distA <= distB) {
          innerMid = midA;
          outerMid = midB;
        } else {
          innerMid = midB;
          outerMid = midA;
        }
      }
      // Polígono de Decolagem (7 vértices com fechamento)
      else if (ringUTM.length === 7) {
        innerMid = [(ringUTM[5][0] + ringUTM[0][0]) / 2, (ringUTM[5][1] + ringUTM[0][1]) / 2];
        outerMid = [(ringUTM[2][0] + ringUTM[3][0]) / 2, (ringUTM[2][1] + ringUTM[3][1]) / 2];
      }

      if (innerMid && outerMid) {
        fractionT = projectAlongAxis(pUTM[0], pUTM[1], innerMid[0], innerMid[1], outerMid[0], outerMid[1]);
        cotaAero = cotaMin + fractionT * (cotaMax - cotaMin);
      }
    }
  }

  // Garantir limites numéricos
  cotaAero = Math.max(cotaMin, Math.min(cotaMax, cotaAero));

  return {
    nome,
    categoria,
    cotaAero: Number(cotaAero.toFixed(2)),
    cotaAeroFormat: `${cotaAero.toFixed(2).replace('.', ',')} m`,
    cotaMin,
    cotaMax,
    intervaloFormat: `${cotaMin.toFixed(2).replace('.', ',')} m a ${cotaMax.toFixed(2).replace('.', ',')} m`,
    fractionT: Number(fractionT.toFixed(3)),
    percentAlongRamp: Math.round(fractionT * 100),
    isRamp,
    tipoInterpolacao,
    utm: {
      easting: Math.round(pUTM[0]),
      northing: Math.round(pUTM[1])
    }
  };
}

/**
 * Avalia o gabarito arquitetônico completo no lote (combinando Z_aero interpolado e Z_terreno do DEM)
 * @param {ol.Feature} feature 
 * @param {Array<number>} coordinate 
 * @param {Object} elevationQueryTool Instância do ElevationQueryTool
 * @returns {Object} Relatório analítico de gabarito para arquitetos
 */
export function evaluateLotBuildingClearance(feature, coordinate, elevationQueryTool = null) {
  const interp = interpolatePbzpaAtCoordinate(feature, coordinate);
  if (!interp) return null;

  let zTerreno = null;
  if (elevationQueryTool && typeof elevationQueryTool.getElevationAtCoordinate === 'function') {
    zTerreno = elevationQueryTool.getElevationAtCoordinate(coordinate);
  }

  let gabaritoMax = null;
  let pavimentosEstimados = null;

  if (zTerreno !== null && !isNaN(zTerreno)) {
    zTerreno = Number(zTerreno.toFixed(2));
    gabaritoMax = Number(Math.max(0, interp.cotaAero - zTerreno).toFixed(2));
    pavimentosEstimados = Math.max(0, Math.floor(gabaritoMax / 3.0));
  }

  return {
    ...interp,
    zTerreno,
    zTerrenoFormat: zTerreno !== null ? `${zTerreno.toFixed(2).replace('.', ',')} m` : 'Carregando MDE...',
    gabaritoMax,
    gabaritoMaxFormat: gabaritoMax !== null ? `${gabaritoMax.toFixed(2).replace('.', ',')} m` : '--',
    pavimentosEstimados,
    pavimentosFormat: pavimentosEstimados !== null ? `~${pavimentosEstimados} pavimentos (pé-direito 3m)` : '--',
    hasTerrain: zTerreno !== null
  };
}
