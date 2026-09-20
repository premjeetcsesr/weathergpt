import { ENDPOINTS, REQUEST_TIMEOUT } from './apiConfig';
import { getAuthHeaders } from './authApi';

export async function fetchNearbyPlaces({ lat, lon, category, radius = 5000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      category,
      radius: String(radius),
    });
    const response = await fetch(`${ENDPOINTS.PLACES_NEARBY}?${params}`, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Nearby places request failed (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
