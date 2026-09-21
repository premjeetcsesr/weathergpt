/**
 * Central API Configuration for WeatherGPT.
 */

const DEPLOYED_BACKEND_URL = import.meta.env.PROD 
  ? 'https://weathergpt-backend-pb1q.onrender.com' 
  : 'http://localhost:8000';

function withApiPrefix(value) {
  const url = (value || DEPLOYED_BACKEND_URL).trim().replace(/\/+$/, '');
  return url.endsWith('/api/v1') ? url : `${url}/api/v1`;
}

export const API_BASE_URL = withApiPrefix(import.meta.env.VITE_API_BASE_URL);

export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// Provider keys are securely managed on the backend server; frontend never handles external secrets.
export const OPENWEATHER_API_KEY = '';

// CARTO API configuration (Optional)
export const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || '';

export const GOOGLE_MAPS_JAVASCRIPT_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_JAVASCRIPT_API_KEY || '';

// Secure backend map tile proxy
export const MAP_TILE_BASE_URL = `${API_BASE_URL}/weather/tiles`;

// Environment-aware WebSocket URL (auto-upgrades to wss:// over HTTPS)
function getWebSocketUrl() {
  if (import.meta.env.VITE_WS_BASE_URL) {
    const configuredUrl = withApiPrefix(import.meta.env.VITE_WS_BASE_URL);
    if (configuredUrl.startsWith('http://') || configuredUrl.startsWith('https://')) {
      return configuredUrl.replace(/^http/, 'ws');
    }
    return configuredUrl;
  }
  return `${DEPLOYED_BACKEND_URL.replace(/^http/, 'ws')}/api/v1`;
}

export const WS_BASE_URL = getWebSocketUrl();
export const WS_ALERTS_URL = `${WS_BASE_URL}/ws/alerts`;


export const ENDPOINTS = {
  CURRENT_WEATHER: `${API_BASE_URL}/weather`,
  FORECAST: `${API_BASE_URL}/forecast`,
  ALERTS: `${API_BASE_URL}/alerts`,
  ALERTS_HISTORY: `${API_BASE_URL}/alerts/history`,
  ALERTS_SUBSCRIPTIONS: `${API_BASE_URL}/alerts/subscriptions`,
  CHAT: `${API_BASE_URL}/chat`,
  CHAT_HISTORY: `${API_BASE_URL}/chat/history`,
  CHAT_SESSIONS: `${API_BASE_URL}/chat/sessions`,
  CLIMATE: `${API_BASE_URL}/climate`,
  CLIMATE_SUMMARY: `${API_BASE_URL}/climate/summary`,
  CLIMATE_TEMPERATURE: `${API_BASE_URL}/climate/temperature`,
  CLIMATE_RAINFALL: `${API_BASE_URL}/climate/rainfall`,
  CLIMATE_HUMIDITY: `${API_BASE_URL}/climate/humidity`,
  CLIMATE_ANOMALIES: `${API_BASE_URL}/climate/anomalies`,
  CLIMATE_COMPARISON: `${API_BASE_URL}/climate/comparison`,
  CLIMATE_INSIGHTS: `${API_BASE_URL}/climate/insights`,
  LOCATIONS_SEARCH: `${API_BASE_URL}/locations/search`,
  LOCATIONS_SAVED: `${API_BASE_URL}/locations/saved`,
  WEATHER_HISTORY: `${API_BASE_URL}/weather/history`,
  WEATHER_POPULAR: `${API_BASE_URL}/weather/history/popular`,
  AUTH_REGISTER: `${API_BASE_URL}/auth/register`,
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  AUTH_ME: `${API_BASE_URL}/auth/me`,
  AUTH_PREFERENCES: `${API_BASE_URL}/auth/preferences`,
  NOTIFICATIONS: `${API_BASE_URL}/notifications`,
  NOTIFICATIONS_UNREAD: `${API_BASE_URL}/notifications/unread-count`,
  NOTIFICATIONS_READ_ALL: `${API_BASE_URL}/notifications/read-all`,
  SETTINGS_LANGUAGE: `${API_BASE_URL}/settings/language`,
  // Step 7: Advanced Intelligence & Official Warnings
  WEATHER_ADVANCED: `${API_BASE_URL}/weather/advanced`,
  WEATHER_NOWCAST: `${API_BASE_URL}/weather/nowcast`,
  WEATHER_WARNINGS: `${API_BASE_URL}/weather/warnings`,
  WEATHER_SEVERE: `${API_BASE_URL}/weather/severe`,
  WEATHER_ADVISORY: `${API_BASE_URL}/weather/advisory`,
  WEATHER_SOURCE: `${API_BASE_URL}/weather/source`,
  WEATHER_PROVIDERS: `${API_BASE_URL}/weather/providers`,
  // Real Radar & Satellite Imagery Architecture
  WEATHER_RADAR_STATUS: `${API_BASE_URL}/weather/radar/status`,
  WEATHER_RADAR_PRODUCTS: `${API_BASE_URL}/weather/radar/products`,
  WEATHER_RADAR_LAYER: `${API_BASE_URL}/weather/radar/layer`,
  WEATHER_RADAR_TILES: `${API_BASE_URL}/weather/radar/tiles`,
  WEATHER_RADAR_IMAGE: `${API_BASE_URL}/weather/radar/image`,

  WEATHER_SATELLITE_STATUS: `${API_BASE_URL}/weather/satellite/status`,
  WEATHER_SATELLITE_PRODUCTS: `${API_BASE_URL}/weather/satellite/products`,
  WEATHER_SATELLITE_LAYER: `${API_BASE_URL}/weather/satellite/layer`,
  WEATHER_SATELLITE_TILES: `${API_BASE_URL}/weather/satellite/tiles`,
  WEATHER_SATELLITE_IMAGE: `${API_BASE_URL}/weather/satellite/image`,
  // Community Weather Reports
  COMMUNITY_REPORTS: `${API_BASE_URL}/community-reports`,
  COMMUNITY_REPORTS_CATEGORIES: `${API_BASE_URL}/community-reports/categories`,
  COMMUNITY_REPORTS_NEARBY: `${API_BASE_URL}/community-reports/nearby`,
  COMMUNITY_REPORTS_MY: `${API_BASE_URL}/community-reports/my-reports`,
  PLACES_NEARBY: `${API_BASE_URL}/places/nearby`,
};

export const REQUEST_TIMEOUT = 10000; // 10 seconds
