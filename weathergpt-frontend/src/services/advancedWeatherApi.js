/**
 * API client for Advanced Weather Intelligence, Official Warnings,
 * Nowcasting, Advisories, and Provider Statuses (SIH Step 7).
 */

import { ENDPOINTS, REQUEST_TIMEOUT } from './apiConfig';

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function fetchAdvancedWeather(city = '', lat = null, lon = null) {
  const params = new URLSearchParams();
  if (city) params.append('city', city);
  if (lat !== null && lon !== null) {
    params.append('lat', lat);
    params.append('lon', lon);
  }
  return await request(`${ENDPOINTS.WEATHER_ADVANCED}?${params.toString()}`);
}

export async function fetchNowcast(city = '', lat = null, lon = null) {
  const params = new URLSearchParams();
  if (city) params.append('city', city);
  if (lat !== null && lon !== null) {
    params.append('lat', lat);
    params.append('lon', lon);
  }
  return await request(`${ENDPOINTS.WEATHER_NOWCAST}?${params.toString()}`);
}

export async function fetchOfficialWarnings(city = '') {
  return await request(`${ENDPOINTS.WEATHER_WARNINGS}?city=${encodeURIComponent(city)}`);
}

export async function fetchSevereWeather(city = '') {
  return await request(`${ENDPOINTS.WEATHER_SEVERE}?city=${encodeURIComponent(city)}`);
}

export async function fetchWeatherAdvisory(city = '') {
  return await request(`${ENDPOINTS.WEATHER_ADVISORY}?city=${encodeURIComponent(city)}`);
}

export async function fetchWeatherSource(city = '') {
  return await request(`${ENDPOINTS.WEATHER_SOURCE}?city=${encodeURIComponent(city)}`);
}

export async function fetchProviderStatuses() {
  return await request(ENDPOINTS.WEATHER_PROVIDERS);
}
