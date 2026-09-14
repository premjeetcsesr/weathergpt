import { ENDPOINTS } from './apiConfig';
import { getAuthHeaders } from './authApi';

export const suggestedPrompts = [
  "What is the weather forecast for today?",
  "Will it rain in the next 24 hours?",
  "What are the current air quality and PM2.5 levels?",
  "Give me agricultural farming advice for this weather.",
  "Is it safe to travel outdoors right now?",
  "Explain the temperature trend over the coming week."
];

export const initialMessages = [
  {
    id: 'init-1',
    sender: 'ai',
    text: "Namaste! I am WeatherGPT, your Conversational AI for Meteorological Intelligence, Alerts, and Climate Information. Ask me anything about current forecasts, severe weather advisories, agricultural recommendations, or travel safety.",
    reply: "Namaste! I am WeatherGPT, your Conversational AI for Meteorological Intelligence, Alerts, and Climate Information. Ask me anything about current forecasts, severe weather advisories, agricultural recommendations, or travel safety.",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
];

function getOrCreateSessionId() {
  try {
    let sid = localStorage.getItem('weathergpt_session_id');
    if (!sid) {
      sid = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('weathergpt_session_id', sid);
    }
    return sid;
  } catch {
    return 'default-session';
  }
}

/**
 * Send a user query to WeatherGPT AI engine
 * @param {string} message - User query text
 * @param {string} location - Active city name
 * @param {object} weatherData - Active weather context
 */
export async function sendChatMessage(message, location = "Kanpur", weatherData = null, options = {}) {
  const sessionId = getOrCreateSessionId();

  try {
    const payload = {
      message,
      location,
      conversation_id: sessionId,
      weather_context: weatherData,
      input_mode: options.input_mode || 'text',
    };
    if (options.language) {
      payload.language = options.language;
    }

    const response = await fetch(ENDPOINTS.CHAT, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Chat API error: ${response.statusText}`);
    }

    const resData = await response.json();
    const replyText = resData.reply || resData.message || resData.response || '';
    const normalizedData = {
      ...resData,
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: replyText,
      reply: replyText,
      timestamp: resData.timestamp
        ? new Date(resData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    return { success: true, data: normalizedData };
  } catch (error) {
    console.error('Failed to send chat message to backend:', error);
    return {
      success: true,
      data: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Unable to reach the WeatherGPT neural intelligence service (${error.message}). Please verify the FastAPI backend server is running at ${ENDPOINTS.CHAT}.`,
        reply: `Unable to reach the WeatherGPT neural intelligence service (${error.message}). Please verify the FastAPI backend server is running at ${ENDPOINTS.CHAT}.`,
        language: options.language || 'en',
        source: 'error',
        isFallback: true
      }
    };
  }
}

/**
 * Fetch chat history from MongoDB backend
 */
export async function fetchChatHistory() {
  const sessionId = getOrCreateSessionId();
  try {
    const response = await fetch(`${ENDPOINTS.CHAT_HISTORY}?session_id=${sessionId}`, {
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, items: data.items || [] };
    }
  } catch (e) {
    console.warn('Chat history fetch failed:', e);
  }
  return { success: false, items: [] };
}

/**
 * Clear chat history from MongoDB
 */
export async function clearChatHistory() {
  const sessionId = getOrCreateSessionId();
  try {
    const response = await fetch(`${ENDPOINTS.CHAT_HISTORY}?session_id=${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function getSuggestedPrompts() {
  return suggestedPrompts;
}

export function getInitialMessages() {
  return initialMessages;
}
