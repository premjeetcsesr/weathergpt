import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentWeather, getForecast, getWeatherAlerts, getCityByCoordinates } from '../services/weatherApi';
import { defaultCity } from '../data/mockWeather';

const WeatherContext = createContext();

export function WeatherProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState(() => {
    return localStorage.getItem('weathergpt_city') || defaultCity;
  });

  const [weatherData, setWeatherData] = useState(null);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [dailyForecast, setDailyForecast] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

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
      return saved ? JSON.parse(saved) : ['Kanpur', 'New Delhi', 'Mumbai', 'Bengaluru'];
    } catch {
      return ['Kanpur', 'New Delhi', 'Mumbai', 'Bengaluru'];
    }
  });

  // Persist preferences
  useEffect(() => {
    localStorage.setItem('weathergpt_city', selectedCity);
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
        throw new Error('Failed to load weather data');
      }

      if (forecastRes.success) {
        setHourlyForecast(forecastRes.hourly || []);
        setDailyForecast(forecastRes.daily || []);
      }

      if (alertsRes.success) {
        setAlerts(alertsRes.alerts || []);
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
        // Default to Kanpur or notify
        alert('Could not determine exact location. Showing default city (Kanpur).');
      },
      { timeout: 8000 }
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

  // Manual refresh
  const refreshWeather = () => {
    loadCityWeather(selectedCity);
  };

  return (
    <WeatherContext.Provider
      value={{
        selectedCity,
        weatherData,
        hourlyForecast,
        dailyForecast,
        alerts,
        loading,
        error,
        isLocating,
        tempUnit,
        setTempUnit,
        windUnit,
        setWindUnit,
        recentSearches,
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
