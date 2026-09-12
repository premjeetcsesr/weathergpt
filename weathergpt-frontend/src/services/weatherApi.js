import { USE_MOCK_DATA, ENDPOINTS, OPENWEATHER_API_KEY, OPENWEATHER_ENDPOINTS } from './apiConfig';
import { mockWeatherDatabase, defaultCity } from '../data/mockWeather';
import { mockAlertsDatabase } from '../data/mockAlerts';
import { mockClimateData } from '../data/mockClimate';

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
    return {
      aqi: 68,
      pm2_5: 22.4,
      pm10: 45.0,
      label: 'Moderate',
      color: 'text-amber-500',
      advice: 'Air quality is acceptable for most individuals.'
    };
  }

  const item = pollutionData.list[0];
  const aqiLevel = item.main?.aqi || 2;
  const pm2_5 = item.components?.pm2_5 || 24;
  const pm10 = item.components?.pm10 || 48;

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
      return {
        aqi: 80,
        pm2_5: Number(pm2_5.toFixed(1)),
        pm10: Number(pm10.toFixed(1)),
        label: 'Moderate',
        color: 'text-amber-500',
        advice: 'Sensitive individuals should take precautions.'
      };
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
 * Fetch current weather from OpenWeatherMap or fallback
 * @param {string} location - City name
 */
export async function getCurrentWeather(location = defaultCity) {
  // If user explicitly configured mock data or no key
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const key = location.toLowerCase().trim();
    const cityData = mockWeatherDatabase[key] || mockWeatherDatabase[defaultCity.toLowerCase()];
    return {
      success: true,
      data: cityData
    };
  }

  // 1. Try Live OpenWeatherMap API
  if (OPENWEATHER_API_KEY) {
    try {
      const url = `${OPENWEATHER_ENDPOINTS.CURRENT_WEATHER}?q=${encodeURIComponent(location)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const rawData = await response.json();
        const lat = rawData.coord?.lat;
        const lon = rawData.coord?.lon;

        // Fetch Air Quality in parallel if coordinates are available
        let airQuality = null;
        if (lat && lon) {
          try {
            const airRes = await fetch(`${OPENWEATHER_ENDPOINTS.AIR_POLLUTION}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`);
            if (airRes.ok) {
              const airJson = await airRes.json();
              airQuality = mapAirQuality(airJson);
            }
          } catch (e) {
            console.warn('Air pollution API fetch error:', e);
          }
        }
        if (!airQuality) {
          airQuality = mapAirQuality(null);
        }

        const timezoneOffset = rawData.timezone || 0;
        const mainCond = rawData.weather?.[0]?.main || 'Clear';
        const iconCode = rawData.weather?.[0]?.icon || '01d';
        const description = rawData.weather?.[0]?.description ? capitalize(rawData.weather[0].description) : mainCond;
        const windSpeedKmh = Math.round((rawData.wind?.speed || 0) * 3.6);
        const windDeg = rawData.wind?.deg || 0;
        const dewPoint = Math.round(rawData.main.temp - ((100 - rawData.main.humidity) / 5));

        const mappedCurrent = {
          temp: Math.round(rawData.main.temp),
          feels_like: Math.round(rawData.main.feels_like),
          temp_min: Math.round(rawData.main.temp_min),
          temp_max: Math.round(rawData.main.temp_max),
          condition: mainCond,
          condition_code: mainCond.toLowerCase().replace(/\s+/g, '_'),
          description: description,
          icon: mapOWMIcon(iconCode, mainCond),
          humidity: rawData.main.humidity,
          wind_speed: windSpeedKmh,
          wind_direction: getWindDirection(windDeg),
          wind_degree: windDeg,
          pressure: rawData.main.pressure,
          visibility: ((rawData.visibility || 10000) / 1000).toFixed(1),
          uv_index: Math.min(11, Math.max(2, Math.round(8 - (rawData.clouds?.all || 0) / 20))),
          dew_point: dewPoint,
          cloud_cover: rawData.clouds?.all || 0,
          sunrise: formatUnixTime(rawData.sys?.sunrise, timezoneOffset),
          sunset: formatUnixTime(rawData.sys?.sunset, timezoneOffset),
          air_quality: airQuality
        };

        const mappedLocation = {
          city: rawData.name || location,
          state: rawData.sys?.country || '',
          country: rawData.sys?.country || 'Global',
          lat: lat || 26.4499,
          lon: lon || 80.3319,
          elevation: `${Math.round(rawData.main?.sea_level || rawData.main?.grnd_level || 120)} m`,
          timezone: `UTC${timezoneOffset >= 0 ? '+' : ''}${(timezoneOffset / 3600).toFixed(1)}`
        };

        const ai_insight = generateLiveAiInsight(mappedLocation.city, mappedCurrent);

        return {
          success: true,
          data: {
            location: mappedLocation,
            current: mappedCurrent,
            ai_insight
          }
        };
      } else {
        console.warn(`OpenWeatherMap API responded with status ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.warn('OpenWeatherMap API network error:', err);
    }
  }

  // 2. Try Backend API endpoint if configured
  try {
    const response = await fetch(`${ENDPOINTS.CURRENT_WEATHER}?location=${encodeURIComponent(location)}`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
  } catch {
    // Ignore backend connection errors and proceed to fallback
  }

  // 3. Fallback to mock database
  const key = location.toLowerCase().trim();
  const fallback = mockWeatherDatabase[key] || mockWeatherDatabase[defaultCity.toLowerCase()];
  return { success: true, data: fallback, isFallback: true };
}

/**
 * Fetch forecast (hourly + 7-day) for a location
 * @param {string} location
 */
export async function getForecast(location = defaultCity) {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const key = location.toLowerCase().trim();
    const cityData = mockWeatherDatabase[key] || mockWeatherDatabase[defaultCity.toLowerCase()];
    return {
      success: true,
      hourly: cityData.hourly,
      daily: cityData.daily,
      location: cityData.location
    };
  }

  // 1. Try Live OpenWeatherMap Forecast API
  if (OPENWEATHER_API_KEY) {
    try {
      const url = `${OPENWEATHER_ENDPOINTS.FORECAST}?q=${encodeURIComponent(location)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const { hourly, daily } = mapOWMForecast(data);
        return {
          success: true,
          hourly,
          daily,
          location: {
            city: data.city?.name || location,
            country: data.city?.country || '',
            lat: data.city?.coord?.lat,
            lon: data.city?.coord?.lon
          }
        };
      }
    } catch (err) {
      console.warn('OpenWeatherMap forecast API error:', err);
    }
  }

  // 2. Try Backend Forecast API
  try {
    const response = await fetch(`${ENDPOINTS.FORECAST}?location=${encodeURIComponent(location)}`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, ...data };
    }
  } catch {
    // Ignore backend failure
  }

  // 3. Fallback to mock data
  const key = location.toLowerCase().trim();
  const fallback = mockWeatherDatabase[key] || mockWeatherDatabase[defaultCity.toLowerCase()];
  return { success: true, hourly: fallback.hourly, daily: fallback.daily, isFallback: true };
}

/**
 * Fetch weather alerts filtered by location and/or category
 * @param {string} location
 * @param {string} category
 */
export async function getWeatherAlerts(location = '', category = 'All') {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    let filtered = [...mockAlertsDatabase];

    if (category && category !== 'All') {
      filtered = filtered.filter(
        (a) => a.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (location) {
      const locLower = location.toLowerCase();
      const locationSpecific = filtered.filter(
        (a) => a.location.toLowerCase().includes(locLower) || a.region.toLowerCase().includes(locLower)
      );
      if (locationSpecific.length > 0) {
        return { success: true, alerts: locationSpecific };
      }
    }

    return { success: true, alerts: filtered };
  }

  try {
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (category && category !== 'All') params.append('category', category);

    const response = await fetch(`${ENDPOINTS.ALERTS}?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, alerts: data.alerts || data };
    }
  } catch {
    // Fallback to local database
  }

  let filtered = [...mockAlertsDatabase];
  if (category && category !== 'All') {
    filtered = filtered.filter(
      (a) => a.category.toLowerCase() === category.toLowerCase()
    );
  }
  return { success: true, alerts: filtered, isFallback: true };
}

/**
 * Fetch climate analytics & historical trends
 * @param {string} location
 */
export async function getClimateAnalytics(location = defaultCity) {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      success: true,
      data: mockClimateData
    };
  }

  try {
    const response = await fetch(`${ENDPOINTS.CLIMATE}?location=${encodeURIComponent(location)}`);
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }
  } catch {
    // Fallback
  }

  return { success: true, data: mockClimateData, isFallback: true };
}

/**
 * Search locations matching input text via OpenWeather Geocoding API or fallback
 * @param {string} query
 */
export async function searchLocations(query) {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim();

  // Try OpenWeatherMap Direct Geocoding API
  if (OPENWEATHER_API_KEY && !USE_MOCK_DATA) {
    try {
      const geoUrl = `${OPENWEATHER_ENDPOINTS.GEO_DIRECT}?q=${encodeURIComponent(q)}&limit=5&appid=${OPENWEATHER_API_KEY}`;
      const response = await fetch(geoUrl);
      if (response.ok) {
        const results = await response.json();
        if (Array.isArray(results) && results.length > 0) {
          return results.map((item) => ({
            city: item.name,
            state: item.state || '',
            country: item.country || '',
            lat: item.lat,
            lon: item.lon
          }));
        }
      }
    } catch (e) {
      console.warn('OpenWeatherMap geocoding error:', e);
    }
  }

  // Fallback to local database search
  const qLower = q.toLowerCase();
  const allCities = Object.values(mockWeatherDatabase).map((c) => ({
    city: c.location.city,
    state: c.location.state,
    country: c.location.country,
    lat: c.location.lat,
    lon: c.location.lon
  }));

  const matches = allCities.filter(
    (c) =>
      c.city.toLowerCase().includes(qLower) ||
      c.state.toLowerCase().includes(qLower) ||
      c.country.toLowerCase().includes(qLower)
  );

  return matches;
}

/**
 * Reverse geocode / find closest city by latitude and longitude
 * @param {number} lat
 * @param {number} lon
 */
export async function getCityByCoordinates(lat, lon) {
  // Try OpenWeatherMap Reverse Geocoding API
  if (OPENWEATHER_API_KEY && !USE_MOCK_DATA) {
    try {
      const revUrl = `${OPENWEATHER_ENDPOINTS.GEO_REVERSE}?lat=${lat}&lon=${lon}&limit=1&appid=${OPENWEATHER_API_KEY}`;
      const response = await fetch(revUrl);
      if (response.ok) {
        const results = await response.json();
        if (Array.isArray(results) && results.length > 0 && results[0].name) {
          return results[0].name;
        }
      }
    } catch (e) {
      console.warn('OpenWeatherMap reverse geocoding error:', e);
    }
  }

  // Fallback to Euclidean closest city in local database
  let closest = Object.values(mockWeatherDatabase)[0];
  let minDistance = Infinity;

  for (const item of Object.values(mockWeatherDatabase)) {
    const dist = Math.hypot(item.location.lat - lat, item.location.lon - lon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = item;
    }
  }

  return closest?.location?.city || defaultCity;
}
