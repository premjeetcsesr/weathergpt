/**
 * Central API Configuration for WeatherGPT.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

// OpenWeatherMap API configuration
export const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '90acfad8e6afe22e4adac0746ec683e1';

// CARTO API configuration (Optional)
export const CARTO_API_KEY = import.meta.env.VITE_CARTO_API_KEY || '';

export const OPENWEATHER_ENDPOINTS = {
  CURRENT_WEATHER: 'https://api.openweathermap.org/data/2.5/weather',
  FORECAST: 'https://api.openweathermap.org/data/2.5/forecast',
  AIR_POLLUTION: 'https://api.openweathermap.org/data/2.5/air_pollution',
  GEO_DIRECT: 'https://api.openweathermap.org/geo/1.0/direct',
  GEO_REVERSE: 'https://api.openweathermap.org/geo/1.0/reverse',
  MAP_TILE: 'https://tile.openweathermap.org/map',
};

export const ENDPOINTS = {
  CURRENT_WEATHER: `${API_BASE_URL}/weather`,
  FORECAST: `${API_BASE_URL}/forecast`,
  ALERTS: `${API_BASE_URL}/alerts`,
  CHAT: `${API_BASE_URL}/chat`,
  CLIMATE: `${API_BASE_URL}/climate`,
  LOCATIONS_SEARCH: `${API_BASE_URL}/locations/search`,
};

export const REQUEST_TIMEOUT = 10000; // 10 seconds
