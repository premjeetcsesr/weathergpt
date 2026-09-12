import { USE_MOCK_DATA, ENDPOINTS } from './apiConfig';
import { generateAIResponse, suggestedPrompts, initialMessages } from '../data/mockChat';

/**
 * Send a user query to WeatherGPT AI engine
 * @param {string} message - User query text
 * @param {string} location - Active city name
 * @param {object} weatherData - Active weather context
 */
export async function sendChatMessage(message, location = "Kanpur", weatherData = null) {
  if (USE_MOCK_DATA) {
    // Simulate AI inference latency (600ms) for realistic UX
    await new Promise((resolve) => setTimeout(resolve, 600));
    const response = generateAIResponse(message, location, weatherData);
    return {
      success: true,
      data: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.text,
        weatherCard: response.weatherCard,
        alertCard: response.alertCard,
        followUps: response.followUps
      }
    };
  }

  try {
    const response = await fetch(ENDPOINTS.CHAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        location,
        weather_context: weatherData
      })
    });

    if (!response.ok) throw new Error(`Chat API error: ${response.statusText}`);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send chat message to backend:', error);
    // Graceful fallback to mock AI logic
    const fallbackResponse = generateAIResponse(message, location, weatherData);
    return {
      success: true,
      data: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: fallbackResponse.text,
        weatherCard: fallbackResponse.weatherCard,
        alertCard: fallbackResponse.alertCard,
        followUps: fallbackResponse.followUps,
        isFallback: true
      }
    };
  }
}

export function getSuggestedPrompts() {
  return suggestedPrompts;
}

export function getInitialMessages() {
  return initialMessages;
}
