/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Cartographic Projections & Coordinate Systems
 * 
 * Target CRS: SIRGAS 2000 / UTM Zone 22S (EPSG:31982)
 * Display CRS: Web Mercator (EPSG:3857) and WGS84 (EPSG:4326)
 */

export const EPSG_UTM22S = 'EPSG:31982';
export const EPSG_WGS84 = 'EPSG:4326';
export const EPSG_WEBMERCATOR = 'EPSG:3857';

// Proj4 Definition string for SIRGAS 2000 / UTM Zone 22S
export const PROJ4_DEF_31982 = '+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs';

/**
 * Initializes Proj4 and registers EPSG:31982 into OpenLayers projection registry
 */
export function initProjections() {
  if (typeof proj4 !== 'undefined') {
    // Register UTM 22S
    proj4.defs(EPSG_UTM22S, PROJ4_DEF_31982);
    
    // Register in OpenLayers if ol.proj.proj4 exists
    if (window.ol && window.ol.proj && window.ol.proj.proj4 && window.ol.proj.proj4.register) {
      window.ol.proj.proj4.register(proj4);
    }
  } else {
    console.warn('[Projection] Proj4 library not detected in global scope.');
  }
}

/**
 * Converts Web Mercator (EPSG:3857) or WGS84 coordinates to UTM 22S (EPSG:31982)
 * @param {Array<number>} coord [x, y] or [lon, lat]
 * @param {string} fromProj source projection ('EPSG:3857' or 'EPSG:4326')
 * @returns {Array<number>} [easting, northing] in meters
 */
export function toUTM22S(coord, fromProj = EPSG_WEBMERCATOR) {
  if (!coord || coord.length < 2) return [0, 0];
  try {
    if (fromProj === EPSG_WEBMERCATOR && window.ol && window.ol.proj) {
      const lonLat = window.ol.proj.toLonLat(coord);
      return proj4(EPSG_WGS84, EPSG_UTM22S, lonLat);
    }
    return proj4(fromProj, EPSG_UTM22S, coord);
  } catch (err) {
    return [0, 0];
  }
}

/**
 * Converts UTM 22S (EPSG:31982) to WGS84 [lon, lat]
 * @param {Array<number>} utmCoord [easting, northing]
 * @returns {Array<number>} [lon, lat]
 */
export function utmToLonLat(utmCoord) {
  if (!utmCoord || utmCoord.length < 2) return [0, 0];
  try {
    return proj4(EPSG_UTM22S, EPSG_WGS84, utmCoord);
  } catch (err) {
    return [0, 0];
  }
}

/**
 * Formats cursor coordinates for the footer status bar
 * @param {Array<number>} mapCoord Map coordinate in EPSG:3857
 * @returns {{ utm: string, geographic: string }}
 */
export function formatCursorCoordinates(mapCoord) {
  if (!mapCoord || !window.ol || !window.ol.proj) {
    return { utm: 'E: - | N: -', geographic: 'Lat: - | Lon: -' };
  }
  
  const lonLat = window.ol.proj.toLonLat(mapCoord);
  const lon = lonLat[0];
  const lat = lonLat[1];
  
  let utmX = 0;
  let utmY = 0;
  
  if (typeof proj4 !== 'undefined') {
    try {
      const utm = proj4(EPSG_WGS84, EPSG_UTM22S, [lon, lat]);
      utmX = Math.round(utm[0]);
      utmY = Math.round(utm[1]);
    } catch (e) {
      // ignore
    }
  }

  const latFormatted = `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonFormatted = `${Math.abs(lon).toFixed(5)}° ${lon >= 0 ? 'E' : 'O'}`;
  
  const utmFormatted = `E: ${utmX.toLocaleString('pt-BR')} m | N: ${utmY.toLocaleString('pt-BR')} m (Fuso 22S)`;
  const geoFormatted = `${latFormatted}, ${lonFormatted}`;

  return { utm: utmFormatted, geographic: geoFormatted, rawLonLat: [lon, lat], rawUtm: [utmX, utmY] };
}
