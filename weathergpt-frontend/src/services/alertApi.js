import { ENDPOINTS, REQUEST_TIMEOUT } from './apiConfig';

/**
 * Fetch active weather alerts from backend.
 * @param {string} city
 * @param {string} severity
 */
export async function getActiveAlerts(city = '', severity = '') {
  try {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (severity && severity !== 'All') params.append('severity', severity.toLowerCase());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const res = await fetch(`${ENDPOINTS.ALERTS}?${params.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return { success: true, location: data.location, alerts: data.alerts || [] };
    }
    return { success: false, alerts: [], error: `Status ${res.status}` };
  } catch (err) {
    return { success: false, alerts: [], error: err.message };
  }
}

/**
 * Fetch alert history with filters.
 */
export async function getAlertHistory(city = '', date = '', severity = '') {
  try {
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (date) params.append('date', date);
    if (severity && severity !== 'All') params.append('severity', severity.toLowerCase());

    const res = await fetch(`${ENDPOINTS.ALERTS_HISTORY}?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      return { success: true, alerts: data.alerts || [] };
    }
    return { success: false, alerts: [] };
  } catch {
    return { success: false, alerts: [] };
  }
}

/**
 * Fetch single alert details.
 */
export async function getAlertById(alertId) {
  try {
    const res = await fetch(`${ENDPOINTS.ALERTS}/${alertId}`);
    if (res.ok) {
      const alert = await res.json();
      return { success: true, alert };
    }
    return { success: false, error: 'Alert not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Create location alert subscription.
 */
export async function createAlertSubscription(city, severityThreshold = 'moderate', lat = null, lon = null, token = null) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(ENDPOINTS.ALERTS_SUBSCRIPTIONS, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        location: { city, latitude: lat, longitude: lon },
        severity_threshold: severityThreshold.toLowerCase(),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, subscription: data };
    }
    const errData = await res.json().catch(() => ({}));
    return { success: false, error: errData.detail || 'Failed to create subscription' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch registered subscriptions.
 */
export async function getAlertSubscriptions(token = null) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(ENDPOINTS.ALERTS_SUBSCRIPTIONS, { headers });
    if (res.ok) {
      const data = await res.json();
      return { success: true, subscriptions: data.subscriptions || [] };
    }
    return { success: false, subscriptions: [] };
  } catch {
    return { success: false, subscriptions: [] };
  }
}

/**
 * Delete a subscription by ID.
 */
export async function deleteAlertSubscription(subscriptionId, token = null) {
  try {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${ENDPOINTS.ALERTS_SUBSCRIPTIONS}/${subscriptionId}`, {
      method: 'DELETE',
      headers,
    });
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}
