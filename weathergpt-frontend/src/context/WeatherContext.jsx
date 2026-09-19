import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getCurrentWeather,
  getForecast,
  getWeatherAlerts,
  getCityByCoordinates,
  fetchSavedLocations,
  saveLocationToBackend,
  deleteSavedLocationFromBackend,
  defaultCity,
} from '../services/weatherApi';
import { useAlertWebSocket } from '../services/useAlertWebSocket';

const WeatherContext = createContext();

export function WeatherProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState(() => {
    return localStorage.getItem('weathergpt_city_v2') || defaultCity;
  });

  const [weatherData, setWeatherData] = useState(null);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [dailyForecast, setDailyForecast] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [savedLocations, setSavedLocations] = useState([]);

  // Active floating alert toast state
  const [activeToast, setActiveToast] = useState(null);
  const lastAlertToastIdRef = useRef(null);
  const lastBrowserNotificationIdRef = useRef(null);

  // Units: 'C' or 'F' for temperature, 'kmh' or 'mph' for wind
  const [tempUnit, setTempUnit] = useState(() => {
    return localStorage.getItem('weathergpt_temp_unit') || 'C';
  });
  const [windUnit, setWindUnit] = useState(() => {
    return localStorage.getItem('weathergpt_wind_unit') || 'kmh';
  });

  // Recent search history
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('weathergpt_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load saved locations from MongoDB
  const loadSavedLocations = async () => {
    const res = await fetchSavedLocations();
    if (res.success) {
      setSavedLocations(res.items);
    }
  };

  useEffect(() => {
    loadSavedLocations();
  }, []);

  const addSavedLocation = async (loc) => {
    const res = await saveLocationToBackend(loc);
    if (res.success) {
      await loadSavedLocations();
    }
    return res;
  };

  const removeSavedLocation = async (id) => {
    const success = await deleteSavedLocationFromBackend(id);
    if (success) {
      setSavedLocations((prev) => prev.filter((l) => l.id !== id));
    }
    return success;
  };

  // Persist preferences
  useEffect(() => {
    if (selectedCity) {
      localStorage.setItem('weathergpt_city_v2', selectedCity);
    } else {
      localStorage.removeItem('weathergpt_city_v2');
    }
  }, [selectedCity]);

  useEffect(() => {
    localStorage.setItem('weathergpt_temp_unit', tempUnit);
  }, [tempUnit]);

  useEffect(() => {
    localStorage.setItem('weathergpt_wind_unit', windUnit);
  }, [windUnit]);

  useEffect(() => {
    localStorage.setItem('weathergpt_recent_searches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  // Load weather for city
  const loadCityWeather = useCallback(async (city) => {
    if (!city || !city.trim()) {
      setWeatherData(null);
      setHourlyForecast([]);
      setDailyForecast([]);
      setAlerts([]);
      setLoading(false);
      setError('Search for a city or allow location access to load live weather.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [currentRes, forecastRes, alertsRes] = await Promise.all([
        getCurrentWeather(city),
        getForecast(city),
        getWeatherAlerts(city)
      ]);

      if (currentRes.success && currentRes.data) {
        setWeatherData(currentRes.data);
      } else {
        throw new Error(currentRes.error || 'Failed to load weather data');
      }

      if (forecastRes.success) {
        setHourlyForecast(forecastRes.hourly || []);
        setDailyForecast(forecastRes.daily || []);
      }

      if (alertsRes.success && alertsRes.alerts) {
        setAlerts(alertsRes.alerts);
        // If active alerts exist for this city, pop up notification toast for the most critical alert
        if (alertsRes.alerts.length > 0) {
          const notableAlert = alertsRes.alerts.find((a) =>
            ['extreme', 'severe', 'moderate'].includes((a.severity || '').toLowerCase())
          ) || alertsRes.alerts[0];

          const alertKey = notableAlert ? (notableAlert.id || notableAlert.alert_id || `${city}-${notableAlert.event}`) : null;
          if (alertKey && lastAlertToastIdRef.current !== alertKey) {
            lastAlertToastIdRef.current = alertKey;
            setActiveToast(notableAlert);
          }
        }
      } else {
        setAlerts([]);
      }
    } catch (err) {
      console.error('Weather load error:', err);
      setError('Unable to load weather information for ' + city + '. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load or city switch
  useEffect(() => {
    loadCityWeather(selectedCity);
  }, [selectedCity, loadCityWeather]);

  // Search & select city
  const searchCity = (city) => {
    if (!city || city.trim().length === 0) return;
    const formatted = city.trim();
    setSelectedCity(formatted);
    setRecentSearches((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== formatted.toLowerCase());
      return [formatted, ...filtered].slice(0, 6);
    });
  };

  // Browser Geolocation
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const detectedCity = await getCityByCoordinates(lat, lon);
          searchCity(detectedCity);
        } catch (err) {
          console.error('Geolocation reverse lookup error:', err);
        } finally {
          setIsLocating(false);
        }
      },
      (geoError) => {
        console.warn('Geolocation access denied or timed out:', geoError.message);
        setIsLocating(false);
        alert('Could not determine your location. Search for a city instead.');
      },
      { timeout: 8000 }
    );
  };

  useEffect(() => {
    if (!selectedCity) {
      useCurrentLocation();
    }
  }, [selectedCity]);

  // Temperature unit conversion helper
  const formatTemp = (tempInCelsius) => {
    if (tempInCelsius === undefined || tempInCelsius === null) return '--';
    if (tempUnit === 'F') {
      const fahrenheit = Math.round((tempInCelsius * 9) / 5 + 32);
      return `${fahrenheit}°F`;
    }
    return `${Math.round(tempInCelsius)}°C`;
  };

  // Wind speed conversion helper
  const formatWind = (windInKmh) => {
    if (windInKmh === undefined || windInKmh === null) return '--';
    if (windUnit === 'mph') {
      const mph = Math.round(windInKmh * 0.621371);
      return `${mph} mph`;
    }
    return `${Math.round(windInKmh)} km/h`;
  };

  // Manual refresh
  const refreshWeather = () => {
    loadCityWeather(selectedCity);
  };

  // Step 4: Real-time alerts WebSocket integration
  const handleNewAlert = useCallback((newAlert) => {
    setAlerts((prev) => {
      const id = newAlert.id || newAlert.alert_id;
      const exists = prev.some((a) => (a.id || a.alert_id) === id);
      if (exists) {
        return prev.map((a) => ((a.id || a.alert_id) === id ? newAlert : a));
      }
      return [newAlert, ...prev];
    });
    // Trigger toast popup on real-time event
    setActiveToast(newAlert);

    const alertId = newAlert.id || newAlert.alert_id;
    const pushEnabled = localStorage.getItem('weathergpt_push_alerts') !== 'false';
    if (
      pushEnabled &&
      alertId &&
      alertId !== lastBrowserNotificationIdRef.current &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      lastBrowserNotificationIdRef.current = alertId;
      new Notification(newAlert.event || newAlert.title || 'Weather Alert', {
        body: newAlert.headline || newAlert.description || 'A new weather alert was received.',
        tag: `weathergpt-alert-${alertId}`,
      });
    }
  }, []);

  const handleAlertExpired = useCallback((expiredId) => {
    setAlerts((prev) => prev.filter((a) => (a.id || a.alert_id) !== expiredId));
    setActiveToast((prev) => ((prev?.id || prev?.alert_id) === expiredId ? null : prev));
  }, []);

  const {
    status: wsStatus,
    latestToast: wsToast,
    dismissToast: dismissWsToast,
    subscribeCity: wsSubscribeCity,
  } = useAlertWebSocket({
    activeCity: selectedCity,
    onAlertReceived: handleNewAlert,
    onAlertExpired: handleAlertExpired,
  });

  // Sync WebSocket toast with activeToast
  useEffect(() => {
    if (wsToast) {
      setActiveToast(wsToast);
    }
  }, [wsToast]);

  const triggerAlertToast = useCallback((alertObj) => {
    if (!alertObj) return;
    setActiveToast(alertObj);
  }, []);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
    dismissWsToast();
  }, [dismissWsToast]);

  return (
    <WeatherContext.Provider
      value={{
        selectedCity,
        weatherData,
        hourlyForecast,
        dailyForecast,
        alerts,
        wsStatus,
        latestToast: activeToast,
        triggerAlertToast,
        dismissToast,
        wsSubscribeCity,

        loading,
        error,
        isLocating,
        tempUnit,
        setTempUnit,
        windUnit,
        setWindUnit,
        recentSearches,
        savedLocations,
        loadSavedLocations,
        addSavedLocation,
        removeSavedLocation,
        searchCity,
        useCurrentLocation,
        refreshWeather,
        formatTemp,
        formatWind
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
}
