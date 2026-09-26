import { ENDPOINTS, REQUEST_TIMEOUT } from './apiConfig';

/**
 * Reverse geocode latitude and longitude to get detailed location details.
 */
export async function reverseGeocode(latitude, longitude) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const url = new URL(ENDPOINTS.MAP_REVERSE_GEOCODE);
    url.searchParams.set('lat', latitude);
    url.searchParams.set('lon', longitude);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocode failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.location || null;
  } catch (error) {
    console.warn('Reverse geocode error:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Get normalized location info for coordinates.
 */
export async function getMapLocation(latitude, longitude) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const url = new URL(ENDPOINTS.MAP_LOCATION);
    url.searchParams.set('lat', latitude);
    url.searchParams.set('lon', longitude);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Map location fetch failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.location || null;
  } catch (error) {
    console.warn('Map location fetch error:', error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch verified community reports within radius of coordinates.
 */
export async function fetchNearbyMapCommunityReports({ lat, lon, radiusKm = 10, category = null }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const url = new URL(ENDPOINTS.MAP_COMMUNITY_REPORTS_NEARBY);
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lon);
    url.searchParams.set('radius_km', radiusKm);
    if (category) {
      url.searchParams.set('category', category);
    }

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Nearby reports fetch failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.reports || [];
  } catch (error) {
    console.warn('Nearby reports fetch error:', error);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
