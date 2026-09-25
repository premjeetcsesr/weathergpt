import { ENDPOINTS } from './apiConfig';
import { getAuthHeaders } from './authApi';

function buildQueryString(params = {}) {
  const cleanParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      cleanParams.append(key, val);
    }
  });
  const qs = cleanParams.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Fetch overall aggregated climate summary metrics for a location and period.
 */
export async function fetchClimateSummary(params = {}) {
  try {
    const qs = buildQueryString(params);
    const response = await fetch(`${ENDPOINTS.CLIMATE_SUMMARY}${qs}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`Climate summary error: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch climate summary:', error);
    return {
      success: false,
      data_available: false,
      message: error.message || 'Unable to connect to climate analytics engine.',
      metrics: {},
    };
  }
}

/**
 * Fetch temperature time-series observations and linear trend slope.
 */
export async function fetchTemperatureTrend(params = {}) {
  try {
    const qs = buildQueryString(params);
    const response = await fetch(`${ENDPOINTS.CLIMATE_TEMPERATURE}${qs}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`Temperature trend error: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch temperature trend:', error);
    return { success: false, data_available: false, points: [] };
  }
}

/**
 * Fetch precipitation telemetry, cumulative rain, and rainy days.
 */
export async function fetchRainfallTrend(params = {}) {
  try {
    const qs = buildQueryString(params);
    const response = await fetch(`${ENDPOINTS.CLIMATE_RAINFALL}${qs}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`Rainfall trend error: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch rainfall trend:', error);
    return { success: false, data_available: false, points: [], total_rainfall: 0, rainy_days: 0 };
  }
}

/**
 * Fetch relative humidity time-series observations and variation trend.
 */
export async function fetchHumidityTrend(params = {}) {
  try {
    const qs = buildQueryString(params);
    const response = await fetch(`${ENDPOINTS.CLIMATE_HUMIDITY}${qs}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`Humidity trend error: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch humidity trend:', error);
    return { success: false, data_available: false, points: [], avg_humidity: 0 };
  }
}

/**
 * Fetch calculated statistical anomalies (|z|<1 Normal, 1<=|z|<2 Moderate, |z|>=2 Significant).
 */
export async function fetchClimateAnomalies(params = {}) {
  try {
    const qs = buildQueryString(params);
    const response = await fetch(`${ENDPOINTS.CLIMATE_ANOMALIES}${qs}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`Climate anomalies error: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch climate anomalies:', error);
    return { success: false, data_available: false, anomalies: [] };
  }
}

/**
 * Fetch period-over-period comparison (e.g. Current 30 days vs Previous 30 days).
 */
export async function fetchClimateComparison(params = {}) {
  try {
    const qs = buildQueryString(params);
    const response = await fetch(`${ENDPOINTS.CLIMATE_COMPARISON}${qs}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error(`Climate comparison error: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch climate comparison:', error);
    return { success: false, data_available: false, sufficient_data_for_comparison: false, metrics: [] };
  }
}

/**
 * Generate AI-assisted climate insights from verified calculated metrics.
 */
export async function generateClimateInsights(payload) {
  try {
    const response = await fetch(ENDPOINTS.CLIMATE_INSIGHTS, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Climate insights error: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Failed to generate climate insights:', error);
    return {
      success: false,
      insight: 'Climate insights are temporarily unavailable. Numerical telemetry above reflects current observations.',
    };
  }
}
