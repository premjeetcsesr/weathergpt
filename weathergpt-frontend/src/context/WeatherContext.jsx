import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getCurrentWeather,
  getForecast,
  getWeatherAlerts,
  getCityByCoordinates,
  getAreaDetailsByCoordinates,
  fetchSavedLocations,
  saveLocationToBackend,
  deleteSavedLocationFromBackend,
} from '../services/weatherApi';
import { useAlertWebSocket } from '../services/useAlertWebSocket';
import { triggerSevereWeatherAlert } from '../services/alertToneService';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

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

  // Dedicated alerts panel modal state
  const [isDedicatedPanelOpen, setIsDedicatedPanelOpen] = useState(false);
  const openDedicatedAlertsPanel = useCallback(() => setIsDedicatedPanelOpen(true), []);
  const closeDedicatedAlertsPanel = useCallback(() => setIsDedicatedPanelOpen(false), []);

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

  // Load weather for city or coordinates
  const loadCityWeather = useCallback(async (query) => {
    if (!query) {
      setWeatherData(null);
      setHourlyForecast([]);
      setDailyForecast([]);
      setAlerts([]);
      setLoading(false);
      setError('Search for a city or allow location access to load live weather.');
      return false;
    }
    setLoading(true);
    setError(null);

    const isCoordQuery = typeof query === 'object' && query !== null && query.lat != null && query.lon != null;
    const activeCity = isCoordQuery ? (query.city || query.name || null) : String(query).trim();
    const lat = isCoordQuery ? query.lat : null;
    const lon = isCoordQuery ? query.lon : null;

    try {
      let [currentRes, forecastRes, alertsRes] = await Promise.all([
        getCurrentWeather(activeCity, lat, lon),
        getForecast(activeCity, lat, lon),
        getWeatherAlerts(activeCity, 'All', lat, lon)
      ]);

      // If failed and city has multiple words (e.g. "Kanpur dehat"), attempt base city fallback
      if ((!currentRes.success || !currentRes.data) && !isCoordQuery && activeCity && activeCity.includes(' ')) {
        const baseCity = activeCity.split(' ')[0];
        try {
          const [fallbackCurrent, fallbackForecast, fallbackAlerts] = await Promise.all([
            getCurrentWeather(baseCity),
            getForecast(baseCity),
            getWeatherAlerts(baseCity)
          ]);
          if (fallbackCurrent.success && fallbackCurrent.data) {
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
        if (currentRes.data.location?.city) {
          setSelectedCity(currentRes.data.location.city);
        }
        setLocationReady(true);

        // Check if active heavy rain / severe precipitation exists
        const curCond = (currentRes.data.current?.condition || '').toLowerCase();
        if (curCond.includes('heavy rain') || curCond.includes('storm') || curCond.includes('flood') || curCond.includes('torrential')) {
          triggerSevereWeatherAlert({
            title: `Heavy Rain Alert for ${currentRes.data.location?.city || activeCity}`,
            body: `Doppler radar reports ${currentRes.data.current.condition}. Waterlogging caution advised.`,
            alertId: `rain-${activeCity}-${new Date().toISOString().slice(0, 13)}`,
            isReport: false
          });
        }
      } else {
        throw new Error(currentRes.error || `Could not find weather records for "${activeCity || 'selected location'}".`);
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

          const alertKey = notableAlert ? (notableAlert.id || notableAlert.alert_id || `${activeCity || 'loc'}-${notableAlert.event}`) : null;
          if (alertKey && lastAlertToastIdRef.current !== alertKey) {
            lastAlertToastIdRef.current = alertKey;
            setActiveToast(notableAlert);

            // Play siren tone & send mobile phone notification ("alert ay ak bar")
            triggerSevereWeatherAlert({
              title: notableAlert.event || notableAlert.title || 'Meteorological Alert',
              body: notableAlert.headline || notableAlert.description || `Severe weather alert for ${activeCity}`,
              alertId: alertKey,
              isReport: !!notableAlert.is_community
            });
          }
        }
      } else {
        setAlerts([]);
      }
      return true;
    } catch (err) {
      console.error('Weather load error:', err);
      setError(`Could not find weather records for "${activeCity || 'selected location'}". Please check spelling or use your live location.`);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load or city switch
  useEffect(() => {
    if (selectedCity) {
      loadCityWeather(selectedCity);
    }
  }, [selectedCity, loadCityWeather]);

  // Search & select city
  const searchCity = (city) => {
    if (!city || city.trim().length === 0) return;
    const formatted = city.trim();
    setSelectedCity(formatted);
    loadCityWeather(formatted);
    setLocationReady(true);
    setRecentSearches((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== formatted.toLowerCase());
      return [formatted, ...filtered].slice(0, 6);
    });
  };

  // Browser Geolocation with IP fallback
  const useCurrentLocation = () => {
    setIsLocating(true);
    setLocationError(null);
    setError(null);

    const tryIpFallback = async () => {
      console.warn('Attempting multi-service IP geolocation fallback...');
      const ipEndpoints = [
        'https://ipapi.co/json/',
        'https://get.geojs.io/v1/ip/geo.json',
        'https://ipwhois.app/json/'
      ];

      for (const ep of ipEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const res = await fetch(ep, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            const lat = parseFloat(data.latitude || data.lat);
            const lon = parseFloat(data.longitude || data.lon);
            const city = data.city || data.region || 'Kanpur';
            if (!isNaN(lat) && !isNaN(lon)) {
              const loaded = await loadCityWeather({ lat, lon, city });
              if (loaded) {
                setIsLocating(false);
                return true;
              }
            }
          }
        } catch (e) {
          console.warn(`IP endpoint ${ep} failed:`, e.message);
        }
      }
      return false;
    };

    const getPlatformLocation = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const permStatus = await Geolocation.checkPermissions();
          if (permStatus.location !== 'granted') {
            const reqStatus = await Geolocation.requestPermissions();
            if (reqStatus.location !== 'granted') {
              throw new Error('User denied location permission');
            }
          }
          const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
          return { position };
        } else {
          if (!navigator.geolocation) throw new Error('No geolocation in browser');
          const requestBrowserLocation = (options, allowRetry) => new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => resolve({ position }),
              (error) => {
                if (allowRetry && (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT)) {
                  requestBrowserLocation({ timeout: 20000, enableHighAccuracy: false, maximumAge: 300000 }, false).then(resolve);
                  return;
                }
                resolve({ error });
              },
              options
            );
          });
          return await requestBrowserLocation({ timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }, true);
        }
      } catch (e) {
        return { error: e };
      }
    };

    getPlatformLocation().then(async ({ position, error: geoError }) => {
      if (position) {
        const { latitude: lat, longitude: lon } = position.coords;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          geoError = { code: 2, message: 'Invalid coordinates returned by the device.' };
        } else {
          try {
            const areaDetails = await getAreaDetailsByCoordinates(lat, lon);
            if (areaDetails) {
              try {
                localStorage.setItem('weathergpt_selected_area', JSON.stringify(areaDetails));
                window.dispatchEvent(new CustomEvent('weathergpt-area-changed', { detail: areaDetails }));
              } catch {}
            }
            const city = areaDetails?.city || await getCityByCoordinates(lat, lon);
            const loaded = await loadCityWeather({
              lat,
              lon,
              ...(city ? { city } : {}),
            });
            if (loaded) {
              setLocationError(null);
              setIsLocating(false);
              return;
            }
          } catch (err) {
            console.error('GPS coordinates weather fetch error:', err);
          }
        }
      }

      if (geoError) {
        console.warn('Geolocation failed:', geoError.message);
      }
      const fallbackOk = await tryIpFallback();
      if (!fallbackOk) {
        setIsLocating(false);
        setLocationError(
          geoError?.code === 1
            ? 'Location permission denied. Please allow location access in your browser or Android app settings.'
            : 'Could not obtain your current location. Check device location services and try again.'
        );
      }
    });

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
    triggerSevereWeatherAlert({
      title: newAlert.event || newAlert.title || 'Severe Meteorological Warning',
      body: newAlert.headline || newAlert.description || 'New real-time weather advisory received.',
      alertId: alertId,
      isReport: !!newAlert.is_community
    });
  }, []);

  // Listen for community reports added across the application
  useEffect(() => {
    const handleCommunityReportAdded = (e) => {
      const rep = e.detail;
      const cat = rep?.category ? String(rep.category).replace('_', ' ') : 'Weather Incident';
      const loc = rep?.location_name || selectedCity || 'Monitored Region';
      triggerSevereWeatherAlert({
        title: `Citizen Report: ${cat}`,
        body: `New hazard reported at ${loc}: ${rep?.description || 'Exercise caution and verify routes.'}`,
        alertId: `report-${rep?.id || Date.now()}`,
        isReport: true
      });
    };
    window.addEventListener('community-report-added', handleCommunityReportAdded);
    return () => window.removeEventListener('community-report-added', handleCommunityReportAdded);
  }, [selectedCity]);

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

        // Dedicated Alerts Panel Modal
        isDedicatedPanelOpen,
        openDedicatedAlertsPanel,
        closeDedicatedAlertsPanel,

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
