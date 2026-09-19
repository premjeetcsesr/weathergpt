import { ENDPOINTS } from './apiConfig';

const TOKEN_KEY = 'weathergpt_auth_token';
const USER_KEY = 'weathergpt_auth_user';

/**
 * Retrieve saved JWT token from localStorage
 */
export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Return authorization header dict if logged in
 */
export function getAuthHeaders() {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Store auth credentials in localStorage
 */
export function setAuthSession(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save auth session:', e);
  }
}

/**
 * Remove auth session on logout
 */
export function clearAuthSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error('Failed to clear auth session:', e);
  }
}

/**
 * Retrieve stored user profile object
 */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Register a new user in MongoDB
 */
export async function registerUser({ email, username, password, fullName, preferences }) {
  try {
    const response = await fetch(ENDPOINTS.AUTH_REGISTER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        username,
        password,
        full_name: fullName,
        preferences: preferences || {
          unit: 'celsius',
          theme: 'dark',
          language: 'en',
          default_city: '',
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || data.error?.message || 'Registration failed');
    }

    setAuthSession(data.access_token, data.user);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Login user with MongoDB
 */
export async function loginUser(emailOrUsername, password) {
  try {
    const response = await fetch(ENDPOINTS.AUTH_LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_or_username: emailOrUsername,
        password,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || data.error?.message || 'Invalid credentials');
    }

    setAuthSession(data.access_token, data.user);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch fresh user profile from backend
 */
export async function getCurrentUserProfile() {
  const token = getAuthToken();
  if (!token) return { success: false, error: 'No active session' };

  try {
    const response = await fetch(ENDPOINTS.AUTH_ME, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthSession();
      }
      throw new Error('Session expired');
    }

    const user = await response.json();
    setAuthSession(token, user);
    return { success: true, user };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Update user preferences in MongoDB
 */
export async function updateUserPreferences(preferences) {
  try {
    const response = await fetch(ENDPOINTS.AUTH_PREFERENCES, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(preferences),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to update preferences');
    }

    const token = getAuthToken();
    setAuthSession(token, data);
    return { success: true, user: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
