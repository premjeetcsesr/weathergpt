import { ENDPOINTS, REQUEST_TIMEOUT } from './apiConfig';
import { getAuthHeaders } from './authApi';

/**
 * Fetch Doppler Weather Radar operational feed status.
 */
export async function fetchRadarStatus() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    const res = await fetch(ENDPOINTS.WEATHER_RADAR_STATUS, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      return await res.json();
    }
    return { provider: 'IMD', status: 'UNAVAILABLE', configured: false, message: `HTTP ${res.status}` };
  } catch (err) {
    return { provider: 'IMD', status: 'ERROR', configured: false, message: err.message };
  }
}

/**
 * Fetch available Doppler Radar products list.
 */
export async function fetchRadarProducts() {
  try {
    const res = await fetch(ENDPOINTS.WEATHER_RADAR_PRODUCTS, { headers: getAuthHeaders() });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch radar products:', err);
  }
  return { provider: 'IMD', status: 'NOT_CONFIGURED', products: [] };
}

/**
 * Fetch active Doppler Radar layer definition and tile/image proxy URLs.
 */
export async function fetchRadarLayer(product = 'reflectivity') {
  try {
    const url = `${ENDPOINTS.WEATHER_RADAR_LAYER}?product=${encodeURIComponent(product)}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch radar layer:', err);
  }
  return {
    provider: 'IMD',
    status: 'NOT_CONFIGURED',
    product,
    attribution: 'India Meteorological Department (DWR Network)',
    message: 'Authorized radar data source is not configured.',
    bounds: [[6.0, 68.0], [38.0, 98.0]],
    frames: [],
  };
}

/**
 * Fetch INSAT-3D/3DR meteorological satellite status.
 */
export async function fetchSatelliteStatus() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    const res = await fetch(ENDPOINTS.WEATHER_SATELLITE_STATUS, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      return await res.json();
    }
    return { provider: 'IMD', satellite: 'INSAT-3D', status: 'UNAVAILABLE', configured: false, message: `HTTP ${res.status}` };
  } catch (err) {
    return { provider: 'IMD', satellite: 'INSAT-3D', status: 'ERROR', configured: false, message: err.message };
  }
}

/**
 * Fetch available satellite channel products.
 */
export async function fetchSatelliteProducts() {
  try {
    const res = await fetch(ENDPOINTS.WEATHER_SATELLITE_PRODUCTS, { headers: getAuthHeaders() });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch satellite products:', err);
  }
  return { provider: 'IMD', satellite: 'INSAT-3D', status: 'NOT_CONFIGURED', products: [] };
}

/**
 * Fetch active satellite channel layer definition, image/tile URLs, and spatial bounds.
 */
export async function fetchSatelliteLayer(product = 'visible') {
  try {
    const url = `${ENDPOINTS.WEATHER_SATELLITE_LAYER}?product=${encodeURIComponent(product)}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch satellite layer:', err);
  }
  return {
    provider: 'IMD',
    satellite: 'INSAT-3D',
    status: 'NOT_CONFIGURED',
    product,
    attribution: 'India Meteorological Department / ISRO (INSAT-3D/3DR)',
    message: 'Authorized satellite data source is not configured.',
    bounds: [[-10.0, 40.0], [50.0, 115.0]],
    frames: [],
  };
}

/**
 * Fetch operational statuses for all meteorological providers (OpenWeather, IMD, Radar, Satellite, NWP).
 */
export async function fetchProviderStatuses() {
  try {
    const res = await fetch(ENDPOINTS.WEATHER_PROVIDERS, { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data.providers || [];
    }
  } catch (err) {
    console.warn('Failed to fetch provider statuses:', err);
  }
  return [];
}
