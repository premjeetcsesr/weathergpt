/**
 * Community Weather Reports API Client Service.
 * Connects frontend with FastAPI community reports endpoints, Cloudinary uploads, and moderation.
 */

import { ENDPOINTS, REQUEST_TIMEOUT } from './apiConfig';
import { getAuthToken } from './authApi';

export const REPORT_CATEGORIES = [
  { id: 'waterlogging', name: 'Waterlogging', icon: '🌊', color: 'blue', desc: 'Water accumulation, flooded roads, choked drains' },
  { id: 'hailstorm', name: 'Hailstorm', icon: '🧊', color: 'cyan', desc: 'Hail precipitation, icy pellets, property damage' },
  { id: 'storm', name: 'Storm', icon: '🌪️', color: 'indigo', desc: 'Dust storm, squall, thunderstorm with strong winds' },
  { id: 'fallen_tree', name: 'Fallen Tree', icon: '🌳', color: 'emerald', desc: 'Uprooted trees or heavy branches blocking roads' },
  { id: 'road_blocked', name: 'Road Blocked', icon: '🚧', color: 'amber', desc: 'Inundation, debris, landslides or traffic halts' },
  { id: 'heavy_rain', name: 'Heavy Rain', icon: '🌧️', color: 'sky', desc: 'Torrential downpour, zero visibility rainfall' },
  { id: 'lightning', name: 'Lightning', icon: '⚡', color: 'yellow', desc: 'Frequent cloud-to-ground strikes, electrical danger' },
  { id: 'poor_visibility', name: 'Poor Visibility', icon: '🌫️', color: 'slate', desc: 'Dense fog, smog, or heavy particulate haze' },
  { id: 'extreme_heat', name: 'Extreme Heat', icon: '🔥', color: 'orange', desc: 'Loo conditions, heatwave observation' },
  { id: 'high_wind', name: 'High Wind', icon: '💨', color: 'teal', desc: 'Gale force winds, loose objects, blowing dust' },
  { id: 'other_weather_incident', name: 'Other Weather Incident', icon: '🌳', color: 'purple', desc: 'Unusual meteorological phenomena' },
  { id: 'other', name: 'Other', icon: '📍', color: 'gray', desc: 'General weather or environmental observation' },
];

function getHeaders(isMultipart = false) {
  const token = getAuthToken();
  const headers = {};
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch available report categories from backend
 */
export async function fetchReportCategories() {
  try {
    const res = await fetch(ENDPOINTS.COMMUNITY_REPORTS_CATEGORIES);
    if (!res.ok) return REPORT_CATEGORIES;
    return await res.json();
  } catch {
    return REPORT_CATEGORIES;
  }
}

/**
 * Submit a community weather report with optional photo
 */
export async function createCommunityReport(formData) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required. Please sign in to submit a community report.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT * 2); // 20s for image uploads

  try {
    const res = await fetch(ENDPOINTS.COMMUNITY_REPORTS, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to submit community report.');
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your network connection.');
    }
    throw err;
  }
}

/**
 * Retrieve public verified reports with filters and pagination
 */
export async function fetchCommunityReports({ category, status, timeFilter, page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  if (status) params.append('status', status);
  if (timeFilter && timeFilter !== 'all') params.append('time_filter', timeFilter);
  params.append('page', page);
  params.append('page_size', pageSize);

  const res = await fetch(`${ENDPOINTS.COMMUNITY_REPORTS}?${params.toString()}`, {
    headers: getHeaders()
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to fetch community reports.');
  }
  return await res.json();
}

/**
 * Query nearby verified reports by GPS coordinates and radius
 */
export async function fetchNearbyReports({ latitude, longitude, radiusKm = 25, category, limit = 50 }) {
  const params = new URLSearchParams();
  params.append('latitude', latitude);
  params.append('longitude', longitude);
  params.append('radius_km', radiusKm);
  if (category && category !== 'all') params.append('category', category);
  params.append('limit', limit);

  const res = await fetch(`${ENDPOINTS.COMMUNITY_REPORTS_NEARBY}?${params.toString()}`, {
    headers: getHeaders()
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to fetch nearby community reports.');
  }
  return await res.json();
}

/**
 * Fetch authenticated user's submitted reports
 */
export async function fetchMyReports() {
  const token = getAuthToken();
  if (!token) return [];

  const res = await fetch(ENDPOINTS.COMMUNITY_REPORTS_MY, {
    headers: getHeaders()
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to fetch your reports.');
  }
  return await res.json();
}

/**
 * Fetch single report details by ID
 */
export async function fetchReportById(reportId) {
  const res = await fetch(`${ENDPOINTS.COMMUNITY_REPORTS}/${reportId}`, {
    headers: getHeaders()
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Report not found.');
  }
  return await res.json();
}

/**
 * Moderate a report (Admin only)
 */
export async function moderateCommunityReport(reportId, status, rejectionReason = null) {
  const payload = { status };
  if (rejectionReason) payload.rejection_reason = rejectionReason;

  const res = await fetch(`${ENDPOINTS.COMMUNITY_REPORTS}/${reportId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to moderate report.');
  }
  return await res.json();
}

/**
 * Delete a report (Admin or owner of pending report)
 */
export async function deleteCommunityReport(reportId) {
  const res = await fetch(`${ENDPOINTS.COMMUNITY_REPORTS}/${reportId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to delete report.');
  }
  return await res.json();
}
