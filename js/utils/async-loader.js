/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Async Data Loader & Cache Manager
 */

const layerDataCache = new Map();

/**
 * Loads a GeoJSON file asynchronously with caching and error handling
 * @param {string} url Relative URL / path to the GeoJSON file
 * @param {Function} onProgress Optional progress callback (0 - 100)
 * @returns {Promise<Object>} GeoJSON Object
 */
export async function loadGeoJson(url, onProgress = null) {
  if (layerDataCache.has(url)) {
    return layerDataCache.get(url);
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: Falha ao carregar ${url}`);
    }

    const contentLength = response.headers.get('content-length');
    let data;

    if (!contentLength || !onProgress) {
      data = await response.json();
    } else {
      const total = parseInt(contentLength, 10);
      let loaded = 0;
      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (onProgress) {
          onProgress(Math.round((loaded / total) * 100));
        }
      }

      const allChunks = new Uint8Array(loaded);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }

      const text = new TextDecoder('utf-8').decode(allChunks);
      data = JSON.parse(text);
    }

    layerDataCache.set(url, data);
    return data;
  } catch (error) {
    console.error(`[AsyncLoader] Erro ao carregar GeoJSON '${url}':`, error);
    throw error;
  }
}

/**
 * Clear cached GeoJSON data
 */
export function clearDataCache() {
  layerDataCache.clear();
}
