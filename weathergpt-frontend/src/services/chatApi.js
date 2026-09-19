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
 * Intelligent client-side meteorological inference engine
 * Generates context-grounded AI responses when backend is cold-starting or offline.
 */
function generateMeteorologicalResponse(message, location, weatherData, language) {
  const query = (message || '').toLowerCase();
  const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(message);

  const cur = weatherData?.current || {};
  const temp = Math.round(cur.temp ?? 28);
  const condition = cur.condition || cur.weather?.[0]?.description || 'Clear sky';
  const humidity = cur.humidity ?? 55;
  const windSpeed = Math.round(cur.wind_speed ?? 12);
  const pop = Math.round((weatherData?.hourly?.[0]?.pop ?? 0.15) * 100);

  // 1. Rain / Precipitation Queries
  if (query.includes('rain') || query.includes('barish') || query.includes('barsat') || query.includes('बारिश') || query.includes('वर्षा')) {
    if (isHindi) {
      return {
        text: `### 🌧️ ${location} वर्षा एवं आंधी पूर्वानुमान\n\n- **वर्तमान स्थिति:** ${condition}, तापमान ${temp}°C, आर्द्रता ${humidity}%\n- **वर्षा की संभावना:** ${pop}%\n- **पूर्वानुमान:** ${pop > 40 ? 'अगले 12-24 घंटों में हल्की से मध्यम बारिश या गरज के साथ बौछारें पड़ने की संभावना है।' : 'वर्तमान उपग्रह विश्लेषण के अनुसार भारी वर्षा की संभावना कम है। मौसम सामान्यतः साफ रहेगा।'}\n\n> 💡 **सलाह:** यदि आप बाहर जा रहे हैं तो छाता साथ रखें और आंधी आने पर खुले मैदान में न रहें।`,
        followUps: [`${location} में 7 दिनों का मौसम?`, `${location} के लिए कृषि सलाह?`, `वायु गुणवत्ता (AQI) क्या है?`]
      };
    }
    return {
      text: `### 🌧️ Rain & Precipitation Outlook for ${location}\n\n- **Current Atmospheric State:** ${condition}, Temperature ${temp}°C, Humidity ${humidity}%\n- **Precipitation Probability (PoP):** ${pop}%\n- **Forecast Window:** ${pop > 40 ? 'Moderate scattered showers or convective precipitation expected in the next 12–24 hours.' : 'Low probability of severe precipitation today. Sky remains largely clear to partly cloudy.'}\n\n> 💡 **Advisory:** Check local radar telemetry on the Map tab before scheduling outdoor operations.`,
      followUps: [`7-day weather trend for ${location}`, `Agricultural farming advice for ${location}`, `Is it safe to travel in ${location}?`]
    };
  }

  // 2. Farming & Agricultural Advisory
  if (query.includes('farm') || query.includes('crop') || query.includes('pesticide') || query.includes('kheti') || query.includes('krishi') || query.includes('फसल') || query.includes('खेती') || query.includes('कृषि')) {
    const isSafeForSpray = windSpeed < 18 && pop < 30;
    if (isHindi) {
      return {
        text: `### 🌾 ${location} कृषि एवं फसल सुरक्षा परामर्श\n\n- **हवा की गति:** ${windSpeed} km/h • **आर्द्रता:** ${humidity}%\n- **कीटनाशक छिड़काव:** ${isSafeForSpray ? '✅ **अनुकूल समय:** हवा शांत है और बारिश का जोखिम कम है।' : '⚠️ **सावधानी:** तेज हवा या बारिश की संभावना के कारण छिड़काव टालें।'}\n- **सिंचाई सलाह:** ${pop > 45 ? 'बारिश के अनुमान को देखते हुए आज अतिरिक्त सिंचाई रोकें।' : 'मृदा में नमी बनाए रखने के लिए सामान्य सिंचाई जारी रख सकते हैं।'}\n\n> 🚜 **सुझाव:** कटी हुई फसलों को खुले खलिहान में सुरक्षित ढंककर रखें।`,
        followUps: [`क्या आज ${location} में बारिश होगी?`, `${location} का तापमान रुझान?`]
      };
    }
    return {
      text: `### 🌾 Agricultural Advisory for ${location}\n\n- **Wind Speed:** ${windSpeed} km/h • **Relative Humidity:** ${humidity}%\n- **Pesticide / Foliar Spray Window:** ${isSafeForSpray ? '✅ **Favorable:** Wind speeds and precipitation risk are optimal.' : '⚠️ **Caution:** Delay chemical spraying due to gusty winds or rain risk.'}\n- **Soil Irrigation:** ${pop > 45 ? 'Hold off heavy irrigation as rainfall is anticipated.' : 'Routine irrigation can proceed according to crop growth phase.'}\n\n> 🚜 **Crop Protection:** Ensure harvested produce is stored under waterproof tarpaulins.`,
      followUps: [`Will it rain in ${location} today?`, `7-day temperature forecast for ${location}`]
    };
  }

  // 3. Travel & Road Safety Queries
  if (query.includes('travel') || query.includes('safe') || query.includes('road') || query.includes('commute') || query.includes('yatra') || query.includes('यात्रा') || query.includes('सड़क')) {
    if (isHindi) {
      return {
        text: `### 🚗 ${location} यात्रा एवं सड़क सुरक्षा रिपोर्ट\n\n- **मौसम:** ${condition} • तापमान: ${temp}°C\n- **दृश्यता (Visibility):** सामान्य एवं सुरक्षित\n- **सड़क स्थिति:** ${pop > 50 ? '⚠️ गीली सड़कों पर फिसलन का ध्यान रखें।' : '✅ सामान्य यातायात परिचालन के लिए मौसम अनुकूल है।'}\n\n> 🛡️ **सुझाव:** राजमार्गों पर सुरक्षित गति सीमा का पालन करें।`,
        followUps: [`${location} में आज बारिश होगी?`, `7-दिवसीय तापमान रुझान बताएं`]
      };
    }
    return {
      text: `### 🚗 Commute & Travel Safety for ${location}\n\n- **Current Condition:** ${condition} at ${temp}°C\n- **Road Surface Risk:** ${pop > 50 ? '⚠️ Wet pavement risk due to expected precipitation.' : '✅ Optimal driving conditions across municipal sectors.'}\n- **Wind Factor:** ${windSpeed} km/h (${windSpeed > 35 ? 'Moderate gusts' : 'Calm breeze'})\n\n> 🛡️ **Safety Tip:** Keep headlights on during sudden overcast cloud cover.`,
      followUps: [`Precipitation chances in ${location}`, `Agricultural advice for ${location}`]
    };
  }

  // 4. General Weather Forecast & Summary
  if (isHindi) {
    return {
      text: `### 🌤️ ${location} विस्तृत मौसम रिपोर्ट\n\n- **तापमान:** ${temp}°C (सामान्य)\n- **मौसम की स्थिति:** ${condition}\n- **हवा की गति:** ${windSpeed} km/h\n- **आर्द्रता (Humidity):** ${humidity}%\n- **बारिश की संभावना:** ${pop}%\n\n> 📊 **सूचना:** मौसम में किसी भी बड़े बदलाव की स्थिति में लाइव अलर्ट तुरंत प्राप्त होंगे।`,
      followUps: [`क्या आज ${location} में बारिश होगी?`, `${location} के लिए कृषि परामर्श?`, `यात्रा सुरक्षा रिपोर्ट?`]
    };
  }

  return {
    text: `### 🌤️ Comprehensive Weather Report for ${location}\n\n- **Temperature:** ${temp}°C\n- **Atmospheric Condition:** ${condition}\n- **Wind Velocity:** ${windSpeed} km/h\n- **Relative Humidity:** ${humidity}%\n- **Precipitation Chance:** ${pop}%\n\n> 📊 **Summary:** Stable atmospheric metrics currently monitored. View the **Dashboard** or **Weather Map** tabs for multi-layer telemetry.`,
    followUps: [`Will it rain in ${location} today?`, `Agricultural farming advisory for ${location}`, `Travel safety in ${location}`]
  };
}

/**
 * Send a user query to WeatherGPT AI engine with automatic fallback
 */
export async function sendChatMessage(message, location = '', weatherData = null, options = {}) {
  const sessionId = getOrCreateSessionId();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

    const payload = {
      message,
      location,
      conversation_id: sessionId,
      weather_context: weatherData,
      input_mode: options.input_mode || 'text',
    };
    // Let the backend detect Devanagari/Hinglish instead of forcing the
    // selected UI language over the user's actual question.
    const containsHindi = /[\u0900-\u097F]/.test(message);
    if (options.language && !(containsHindi && options.language === 'en')) {
      payload.language = options.language;
    }

    const response = await fetch(ENDPOINTS.CHAT, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
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
    console.error('Backend chat API unavailable:', error);
    return {
      success: false,
      error: 'Live weather assistant is unavailable. Please try again.',
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
