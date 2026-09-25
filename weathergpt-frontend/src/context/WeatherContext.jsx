import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getCurrentWeather,
  getForecast,
  getWeatherAlerts,
  getCityByCoordinates,
  fetchSavedLocations,
  saveLocationToBackend,
  deleteSavedLocationFromBackend,
} from '../services/weatherApi';
import { useAlertWebSocket } from '../services/useAlertWebSocket';

const WeatherContext = createContext();

export function WeatherProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState(() => {
    return localStorage.getItem('weathergpt_city_v2') || '';
  });
  const [locationReady, setLocationReady] = useState(() => {
    return !!localStorage.getItem('weathergpt_city_v2');
  });
  const [locationError, setLocationError] = useState(null);

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
    if (!locationReady) return;
    loadSavedLocations();
  }, [locationReady]);

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
      let activeCity = city.trim();
      let [currentRes, forecastRes, alertsRes] = await Promise.all([
        getCurrentWeather(activeCity),
        getForecast(activeCity),
        getWeatherAlerts(activeCity)
      ]);

      // If failed and city has multiple words (e.g. "Kanpur dehat"), attempt base city fallback
      if ((!currentRes.success || !currentRes.data) && activeCity.includes(' ')) {
        const baseCity = activeCity.split(' ')[0];
        try {
          const [fallbackCurrent, fallbackForecast, fallbackAlerts] = await Promise.all([
            getCurrentWeather(baseCity),
            getForecast(baseCity),
            getWeatherAlerts(baseCity)
          ]);
          if (fallbackCurrent.success && fallbackCurrent.data) {
            activeCity = baseCity;
            currentRes = fallbackCurrent;
            forecastRes = fallbackForecast;
            alertsRes = fallbackAlerts;
          }
        } catch {
          // ignore fallback error
        }
      }

      if (currentRes.success && currentRes.data) {
        if (currentRes.data.location?.city?.toLowerCase()?.includes('alok mishra')) {
          currentRes.data.location.city = 'Kanpur';
        }
        setWeatherData(currentRes.data);
      } else {
        throw new Error(`Location not found: "${city}". Please check spelling or choose your current location.`);
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

          const alertKey = notableAlert ? (notableAlert.id || notableAlert.alert_id || `${activeCity}-${notableAlert.event}`) : null;
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
      setError(`Location not found: "${city}". Please check spelling or choose your current location.`);
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
    setLocationReady(true);
    setRecentSearches((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== formatted.toLowerCase());
      return [formatted, ...filtered].slice(0, 6);
    });
  };

  // Browser Geolocation with IP Fallback
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          let detectedCity = await getCityByCoordinates(lat, lon);
          if (detectedCity && detectedCity.toLowerCase().includes('alok mishra')) {
            detectedCity = 'Kanpur';
          }
          if (detectedCity) {
            searchCity(detectedCity);
            setLocationReady(true);
          } else {
            setLocationError('Could not resolve your location to a city.');
          }
        } catch (err) {
          console.error('Geolocation reverse lookup error:', err);
          setLocationError('Could not determine your location. Please try again.');
        } finally {
          setIsLocating(false);
        }
      },
      async (geoError) => {
        console.warn('Geolocation access denied or timed out:', geoError.message, 'Attempting IP fallback.');
        try {
          // IP-based Fallback
          const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
          if (ipRes.ok) {
            const data = await ipRes.json();
            if (data.city) {
              const detected = data.city.toLowerCase().includes('alok mishra') ? 'Kanpur' : data.city;
              searchCity(detected);
              setLocationReady(true);
              setIsLocating(false);
              return;
            }
          }
        } catch (ipErr) {
          console.warn('IP fallback failed:', ipErr);
        }

        setIsLocating(false);
        setLocationError(
          geoError.code === 1
            ? 'Location permission denied. Please enter your city manually.'
            : 'Could not determine your location. Please try again or enter it manually.'
        );
      },
      { timeout: 25000, enableHighAccuracy: true }
    );
  };

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

  // Manual refresh / retry handler
  const refreshWeather = () => {
    if (error && error.toLowerCase().includes('not found')) {
      // If stuck on an invalid city, automatically trigger current location detection!
      useCurrentLocation();
    } else {
      loadCityWeather(selectedCity || 'Kanpur');
    }
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
        locationReady,
        locationError,
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
