import { ENDPOINTS } from './apiConfig';
import { getAuthHeaders } from './authApi';

export const defaultCity = 'Kanpur';

/**
 * Capitalize first letter of string
 */
function capitalize(str = '') {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Map OpenWeatherMap icon code to WeatherGPT Lucide icon name
 */
function mapOWMIcon(iconCode = '01d', mainCondition = 'Clear') {
  if (!iconCode) return 'cloud-sun';
  const code = iconCode.toLowerCase();
  
  if (code.startsWith('01')) {
    return code.endsWith('n') ? 'moon' : 'sun';
  }
  if (code.startsWith('02')) {
    return code.endsWith('n') ? 'moon' : 'cloud-sun';
  }
  if (code.startsWith('03') || code.startsWith('04')) {
    return 'cloud';
  }
  if (code.startsWith('09')) {
    return 'cloud-drizzle';
  }
  if (code.startsWith('10')) {
    return 'cloud-rain';
  }
  if (code.startsWith('11')) {
    return 'cloud-lightning';
  }
  if (code.startsWith('13')) {
    return 'cloud-snow';
  }
  if (code.startsWith('50')) {
    return 'cloud-fog';
  }

  const cond = mainCondition.toLowerCase();
  if (cond.includes('thunder')) return 'cloud-lightning';
  if (cond.includes('drizzle')) return 'cloud-drizzle';
  if (cond.includes('rain')) return 'cloud-rain';
  if (cond.includes('snow')) return 'cloud-snow';
  if (cond.includes('cloud')) return 'cloud';
  if (cond.includes('fog') || cond.includes('mist') || cond.includes('haze')) return 'cloud-fog';
  if (cond.includes('clear')) return 'sun';

  return 'cloud-sun';
}

/**
 * Compute compass direction from degrees
 */
function getWindDirection(deg = 0) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index] || 'N';
}

/**
 * Format unix timestamp to AM/PM string with timezone offset
 */
function formatUnixTime(timestamp, timezoneOffsetSec = 0) {
  if (!timestamp) return '--:--';
  const date = new Date((timestamp + timezoneOffsetSec) * 1000);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${formattedHours < 10 ? '0' : ''}${formattedHours}:${formattedMinutes} ${ampm}`;
}

/**
 * Map OpenWeatherMap Air Pollution data to UI AQI structure
 */
function mapAirQuality(pollutionData) {
  if (!pollutionData || !pollutionData.list || !pollutionData.list[0]) {
    return null;
  }

  const item = pollutionData.list[0];
  const aqiLevel = item.main?.aqi;
  const pm2_5 = item.components?.pm2_5;
  const pm10 = item.components?.pm10;
  if (!Number.isFinite(aqiLevel) || !Number.isFinite(pm2_5) || !Number.isFinite(pm10)) {
    return null;
  }

  switch (aqiLevel) {
    case 1:
      return {
        aqi: Math.min(50, Math.round(pm2_5 * 2 + 5)),
        pm2_5: Number(pm2_5.toFixed(1)),
        pm10: Number(pm10.toFixed(1)),
        label: 'Good',
        color: 'text-emerald-500',
        advice: 'Air quality is satisfactory and poses little to no risk.'
      };
    case 2:
      return {
        aqi: Math.round(50 + pm2_5 * 1.5),
        pm2_5: Number(pm2_5.toFixed(1)),
        pm10: Number(pm10.toFixed(1)),
        label: 'Fair',
        color: 'text-teal-500',
        advice: 'Air quality is acceptable; unusually sensitive individuals should monitor symptoms.'
      };
    case 3:
      return {
        aqi: Math.round(100 + pm2_5 * 1.2),
        pm2_5: Number(pm2_5.toFixed(1)),
        pm10: Number(pm10.toFixed(1)),
        label: 'Moderate',
        color: 'text-amber-500',
        advice: 'Sensitive individuals should wear a mask or reduce heavy exertion outdoors.'
      };
    case 4:
      return {
        aqi: Math.round(150 + pm2_5),
        pm2_5: Number(pm2_5.toFixed(1)),
        pm10: Number(pm10.toFixed(1)),
        label: 'Poor',
        color: 'text-orange-500',
        advice: 'Unhealthy air. Everyone should reduce prolonged outdoor exertion.'
      };
    case 5:
      return {
        aqi: Math.round(200 + pm2_5),
        pm2_5: Number(pm2_5.toFixed(1)),
        pm10: Number(pm10.toFixed(1)),
        label: 'Very Poor',
        color: 'text-red-500',
        advice: 'Health alert: avoid outdoor activities; keep windows and vents closed.'
      };
    default:
      return null;
  }
}

/**
 * Generate dynamic AI intelligence insight based on live telemetry
 */
function generateLiveAiInsight(city, current, popMax = 20) {
  const temp = current.temp;
  const condition = current.condition;
  const isRain = condition.toLowerCase().includes('rain') || condition.toLowerCase().includes('drizzle') || popMax >= 50;
  const isStorm = condition.toLowerCase().includes('thunder') || condition.toLowerCase().includes('storm');
  const isHot = temp >= 34;
  const isCold = temp <= 16;

  let headline = `Weather Intelligence for ${city}`;
  let summary = `Current temperature is ${temp}°C with ${current.condition.toLowerCase()}. Atmospheric conditions remain steady across the region with good visibility.`;
  let category = 'Daily Weather Briefing';
  let farming_tip = 'Normal irrigation schedules can proceed as planned for seasonal crops.';
  let travel_score = 'Optimal (9/10)';
  let ideal_window = '07:00 AM – 06:00 PM';

  if (isStorm) {
    headline = `Convective Storm Warning for ${city}`;
    summary = `Thunderstorm and lightning activity detected in the vicinity. Rapid wind shifts and brief heavy downpours are expected. Outdoor activities should be restricted.`;
    category = 'Severe Weather Warning';
    farming_tip = 'Secure loose farm structures and postpone spray operations to prevent wash-off.';
    travel_score = 'Caution (5/10)';
    ideal_window = 'Morning hours before 12:00 PM';
  } else if (isRain) {
    headline = `Rain & Precipitation Alert for ${city}`;
    summary = `High probability of rainfall (${popMax}%) over the next 24 hours. Keep umbrellas handy and expect slower transit on major roads.`;
    category = 'Precipitation Advisory';
    farming_tip = 'Ensure proper field drainage to prevent waterlogging around root zones.';
    travel_score = 'Moderate (7/10)';
    ideal_window = '08:00 AM – 01:00 PM';
  } else if (isHot) {
    headline = `High Heat & Sun Exposure Advisory for ${city}`;
    summary = `Peak temperatures reaching ${temp}°C with feels-like indices up to ${current.feels_like}°C. Direct sun exposure should be minimized during peak afternoon hours.`;
    category = 'Heat & UV Advisory';
    farming_tip = 'Schedule irrigation during dawn hours to minimize water loss from soil evaporation.';
    travel_score = 'Good (7/10)';
    ideal_window = '06:00 AM – 10:00 AM & 05:00 PM – 08:00 PM';
  } else if (isCold) {
    headline = `Chilly Weather & Temperature Dip for ${city}`;
    summary = `Temperatures dipping to ${temp}°C with brisk breezes. Warm layer clothing recommended for early morning and late evening commutes.`;
    category = 'Cool Weather Advisory';
    farming_tip = 'Protect cold-sensitive seedlings and nurseries with mulch coverings.';
    travel_score = 'Optimal (8/10)';
    ideal_window = '11:00 AM – 04:00 PM';
  }

  return {
    headline,
    summary,
    category,
    farming_tip,
    travel_score,
    ideal_window
  };
}

/**
 * Map OpenWeatherMap 5-day / 3-hour forecast to hourly (24h) and daily (7d)
 */
function mapOWMForecast(data) {
  if (!data || !data.list || data.list.length === 0) {
    return { hourly: [], daily: [] };
  }

  const timezoneOffset = data.city?.timezone || 0;

  // 1. Hourly (next 24 hours / 8 slots)
  const hourly = data.list.slice(0, 8).map((item, index) => {
    let timeLabel = 'Now';
    if (index > 0) {
      const d = new Date((item.dt + timezoneOffset) * 1000);
      const h = d.getUTCHours();
      timeLabel = `${h < 10 ? '0' : ''}${h}:00`;
    }

    const mainCond = item.weather[0]?.main || 'Clear';
    const iconCode = item.weather[0]?.icon || '01d';

    return {
      time: timeLabel,
      temp: Math.round(item.main.temp),
      condition: item.weather[0]?.description ? capitalize(item.weather[0].description) : mainCond,
      icon: mapOWMIcon(iconCode, mainCond),
      pop: Math.round((item.pop || 0) * 100),
      wind_speed: Math.round((item.wind?.speed || 0) * 3.6),
      humidity: item.main.humidity
    };
  });

  // 2. Daily (Group by local date)
  const daysMap = {};
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  data.list.forEach((item) => {
    const localDate = new Date((item.dt + timezoneOffset) * 1000);
    const dateKey = `${localDate.getUTCFullYear()}-${localDate.getUTCMonth()}-${localDate.getUTCDate()}`;

    if (!daysMap[dateKey]) {
      daysMap[dateKey] = {
        dayName: dayNames[localDate.getUTCDay()],
        dateStr: `${monthNames[localDate.getUTCMonth()]} ${localDate.getUTCDate()}`,
        temps: [],
        conditions: [],
        icons: [],
        pops: []
      };
    }

    daysMap[dateKey].temps.push(item.main.temp);
    daysMap[dateKey].conditions.push(item.weather[0]?.main || 'Clear');
    daysMap[dateKey].icons.push(item.weather[0]?.icon || '01d');
    daysMap[dateKey].pops.push(item.pop || 0);
  });

  const daily = Object.values(daysMap).slice(0, 7).map((d, idx) => {
    const minTemp = Math.round(Math.min(...d.temps));
    const maxTemp = Math.round(Math.max(...d.temps));
    const maxPop = Math.round(Math.max(...d.pops) * 100);
    const dominantCondition = d.conditions[Math.floor(d.conditions.length / 2)] || 'Clear';
    const midIcon = d.icons[Math.floor(d.icons.length / 2)] || '01d';

    return {
      day: idx === 0 ? 'Today' : d.dayName,
      date: d.dateStr,
      temp_min: minTemp,
      temp_max: maxTemp,
      condition: dominantCondition,
      icon: mapOWMIcon(midIcon, dominantCondition),
      pop: maxPop,
      summary: `${dominantCondition} conditions with temperatures from ${minTemp}°C to ${maxTemp}°C.`
    };
  });

  return { hourly, daily };
}

/**
 * Fetch current weather from FastAPI backend
 * @param {string} location - City name
 */
export async function getCurrentWeather(location = defaultCity) {
  try {
    const response = await fetch(`${ENDPOINTS.CURRENT_WEATHER}?city=${encodeURIComponent(location)}`, {
      headers: getAuthHeaders()
    });
    if (response.ok) {
      const data = await response.json();
      // Keep the UI model stable while consuming the backend's canonical
      // `temperature` field.
      if (data?.current) {
        data.current = {
          ...data.current,
          temp: data.current.temp ?? data.current.temperature,
          icon: data.current.icon || mapOWMIcon(data.current.condition_code, data.current.condition),
        };
      }
      return { success: true, data };
    }
    const errData = await response.json().catch(() => ({}));
    return { success: false, error: errData.detail || `Server returned ${response.status}` };
  } catch (err) {
    console.warn('Backend weather API error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch forecast (hourly + 7-day) from FastAPI backend
 * @param {string} location
 */
export async function getForecast(location = defaultCity) {
  try {
    const response = await fetch(`${ENDPOINTS.FORECAST}?city=${encodeURIComponent(location)}`, {
      headers: getAuthHeaders()
    });
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        hourly: data.hourly || [],
        daily: data.daily || [],
        location: data.location || { city: location }
      };
    }
    return { success: false, hourly: [], daily: [] };
  } catch (err) {
    console.warn('Backend forecast API error:', err);
    return { success: false, hourly: [], daily: [] };
  }
}

/**
 * Fetch weather alerts from FastAPI backend
 * @param {string} location
 * @param {string} category
 */
export async function getWeatherAlerts(location = '', category = 'All') {
  try {
    const params = new URLSearchParams();
    if (location) params.append('city', location);
    if (category && category !== 'All') params.append('severity', category.toLowerCase());

    const response = await fetch(`${ENDPOINTS.ALERTS}?${params.toString()}`, {
      headers: getAuthHeaders()
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, alerts: data.alerts || [] };
    }
    return { success: false, alerts: [] };
  } catch (err) {
    console.warn('Backend alerts API error:', err);
    return { success: false, alerts: [] };
  }
}

/**
 * Fetch climate analytics & historical trends from FastAPI backend
 * @param {string} location
 */
export async function getClimateAnalytics(location = defaultCity) {
  try {
    const response = await fetch(`${ENDPOINTS.CLIMATE_SUMMARY}?city=${encodeURIComponent(location)}`, {
      headers: getAuthHeaders()
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
    return { success: false, data: null };
  } catch (err) {
    console.warn('Backend climate API error:', err);
    return { success: false, data: null };
  }
}

/**
 * Search locations matching input text via Backend Geocoding API
 * @param {string} query
 */
export async function searchLocations(query) {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim();

  try {
    const url = `${ENDPOINTS.LOCATIONS_SEARCH}?query=${encodeURIComponent(q)}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (response.ok) {
      const results = await response.json();
      const items = results.items || results;
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item) => ({
          city: item.city || item.name,
          state: item.state || '',
          country: item.country || '',
          lat: item.lat || item.latitude,
          lon: item.lon || item.longitude
        }));
      }
    }
  } catch (e) {
    console.warn('Backend geocoding search error:', e);
  }

  return [];
}

/**
 * Reverse geocode / find closest city by latitude and longitude
 * @param {number} lat
 * @param {number} lon
 */
export async function getCityByCoordinates(lat, lon) {
  try {
    const url = `${ENDPOINTS.CURRENT_WEATHER}?lat=${lat}&lon=${lon}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (response.ok) {
      const data = await response.json();
      if (data?.location?.city) {
        return data.location.city;
      }
    }
  } catch (e) {
    console.warn('Backend reverse coordinate lookup error:', e);
  }

  return defaultCity;
}

/**
 * Fetch user saved locations from MongoDB backend
 */
export async function fetchSavedLocations() {
  try {
    const response = await fetch(ENDPOINTS.LOCATIONS_SAVED, {
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, items: data.items || [] };
    }
  } catch (e) {
    console.warn('Failed to fetch saved locations from MongoDB:', e);
  }
  return { success: false, items: [] };
}

/**
 * Save / Favorite a location in MongoDB backend
 */
export async function saveLocationToBackend({ name, latitude, longitude, state, country, tag = 'Favorite' }) {
  try {
    const response = await fetch(ENDPOINTS.LOCATIONS_SAVED, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name,
        latitude,
        longitude,
        state,
        country,
        tag,
      }),
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
  } catch (e) {
    console.warn('Failed to save location in MongoDB:', e);
  }
  return { success: false };
}

/**
 * Delete saved location from MongoDB
 */
export async function deleteSavedLocationFromBackend(locationId) {
  try {
    const response = await fetch(`${ENDPOINTS.LOCATIONS_SAVED}/${locationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch weather query history from MongoDB backend
 */
export async function fetchWeatherHistory() {
  try {
    const response = await fetch(ENDPOINTS.WEATHER_HISTORY, {
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      const data = await response.json();
      return { success: true, items: data.items || [] };
    }
  } catch (e) {
    console.warn('Failed to fetch weather history:', e);
  }
  return { success: false, items: [] };
}

/**
 * Fetch popular / trending cities from MongoDB
 */
export async function fetchPopularCities() {
  try {
    const response = await fetch(ENDPOINTS.WEATHER_POPULAR);
    if (response.ok) {
      const data = await response.json();
      return { success: true, items: data.items || [] };
    }
  } catch (e) {
    console.warn('Failed to fetch popular cities:', e);
  }
  return { success: false, items: [] };
}
