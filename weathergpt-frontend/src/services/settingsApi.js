import { ENDPOINTS } from './apiConfig';
import { getAuthHeaders } from './authApi';

/**
 * Fetch current user language preference from backend.
 */
export async function getLanguagePreference() {
  try {
    const response = await fetch(ENDPOINTS.SETTINGS_LANGUAGE, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) return { language: 'en' };
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch language preference:', error);
    return { language: 'en' };
  }
}

/**
 * Update user language preference on backend.
 * @param {string} language - 'en' or 'hi'
 */
export async function updateLanguagePreference(language) {
  try {
    const response = await fetch(ENDPOINTS.SETTINGS_LANGUAGE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ language }),
    });
    if (!response.ok) return { language, status: 'error' };
    return await response.json();
  } catch (error) {
    console.warn('Failed to update language preference:', error);
    return { language, status: 'local_only' };
  }
}
