import { ENDPOINTS } from './apiConfig';
import { getAuthHeaders } from './authApi';

/**
 * Fetch notifications from MongoDB backend
 */
export async function getNotifications(unreadOnly = false) {
  try {
    const url = `${ENDPOINTS.NOTIFICATIONS}?unread_only=${unreadOnly}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
  } catch (err) {
    console.warn('Notifications fetch error:', err);
  }

  return {
    success: true,
    data: {
      items: [],
      total: 0,
      unread_count: 0,
    }
  };
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount() {
  try {
    const response = await fetch(ENDPOINTS.NOTIFICATIONS_UNREAD, {
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      return data.unread_count || 0;
    }
  } catch (err) {
    console.warn('Unread count fetch error:', err);
  }
  return 0;
}

/**
 * Mark a single notification as read
 */
export async function markNotificationRead(notificationId) {
  try {
    const response = await fetch(`${ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead() {
  try {
    const response = await fetch(ENDPOINTS.NOTIFICATIONS_READ_ALL, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Create a new notification in MongoDB
 */
export async function createWeatherNotification({ title, message, type = 'alert', severity = 'medium', location = null }) {
  try {
    const response = await fetch(ENDPOINTS.NOTIFICATIONS, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title,
        message,
        type,
        severity,
        location,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
  } catch (err) {
    console.warn('Notification create error:', err);
  }
  return { success: false };
}
