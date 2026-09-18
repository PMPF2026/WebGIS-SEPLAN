/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Data Formatters & Locale Helpers (pt-BR)
 */

const ptBrNumberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const ptBrIntFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/**
 * Format numbers with thousand separators
 * @param {number} val 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatNumber(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  if (decimals === 0) return ptBrIntFormat.format(val);
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(val);
}

/**
 * Format area in m², hectares (ha), or km²
 * @param {number} areaSqMeters 
 * @returns {string}
 */
export function formatArea(areaSqMeters) {
  if (!areaSqMeters || isNaN(areaSqMeters)) return '0 m²';
  if (areaSqMeters >= 1000000) {
    const km2 = areaSqMeters / 1000000;
    const ha = areaSqMeters / 10000;
    return `${formatNumber(km2, 2)} km² (${formatNumber(ha, 1)} ha)`;
  } else if (areaSqMeters >= 10000) {
    const ha = areaSqMeters / 10000;
    return `${formatNumber(ha, 2)} ha (${formatNumber(areaSqMeters, 0)} m²)`;
  }
  return `${formatNumber(areaSqMeters, 1)} m²`;
}

/**
 * Format linear distance in meters or km
 * @param {number} lengthMeters 
 * @returns {string}
 */
export function formatDistance(lengthMeters) {
  if (!lengthMeters || isNaN(lengthMeters)) return '0 m';
  if (lengthMeters >= 1000) {
    return `${formatNumber(lengthMeters / 1000, 2)} km`;
  }
  return `${formatNumber(lengthMeters, 1)} m`;
}

/**
 * Clean and escape strings for HTML
 * @param {string} str 
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats date and time in Brazilian standard
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateTime(date = new Date()) {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
