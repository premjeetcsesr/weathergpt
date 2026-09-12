import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, History, X, Compass } from 'lucide-react';
import { useWeather } from '../../context/WeatherContext';
import { useLanguage } from '../../context/LanguageContext';
import { searchLocations } from '../../services/weatherApi';

export function SearchBar() {
  const { selectedCity, weatherData, searchCity, useCurrentLocation, isLocating, recentSearches } = useWeather();
  const { t } = useLanguage();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Quick suggestions query
  useEffect(() => {
    if (query.trim().length > 0) {
      searchLocations(query).then((results) => {
        setSuggestions(results);
        setIsOpen(true);
      });
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      searchCity(query.trim());
      setIsOpen(false);
      setQuery('');
    }
  };

  const handleSelectCity = (city) => {
    searchCity(city);
    setQuery('');
    setIsOpen(false);
  };

  const locationInfo = weatherData?.location || {
    city: selectedCity,
    state: "Uttar Pradesh",
    country: "India",
    lat: 26.4499,
    lon: 80.3319
  };

  return (
    <div className="w-full" ref={containerRef}>
      {/* Search and Location Bar Header */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-3">
        {/* Search Input Box */}
        <form onSubmit={handleSubmit} className="relative flex-1">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.trim().length > 0 && setIsOpen(true)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-10 pr-24 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all shadow-subtle"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-20 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-medium transition-colors shadow-sm"
            >
              {t('send') || 'Search'}
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-elevated z-50 overflow-hidden max-h-60 overflow-y-auto">
              <div className="p-1.5">
                {suggestions.map((item, idx) => (
                  <button
                    key={`${item.city}-${idx}`}
                    type="button"
                    onClick={() => handleSelectCity(item.city)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-500 shrink-0" />
                      <span className="font-medium">{item.city}</span>
                      <span className="text-xs text-slate-400">
                        {item.state ? `${item.state}, ` : ''}{item.country}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {item.lat?.toFixed(2)}°, {item.lon?.toFixed(2)}°
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Location Action & Coordinates Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={isLocating}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800/80 rounded-2xl text-xs font-medium transition-all shadow-subtle disabled:opacity-50"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-brand-500' : ''}`} />
            <span>{isLocating ? t('locating') : t('useMyLocation')}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-400 shadow-subtle">
            <Compass className="w-3.5 h-3.5 text-brand-500" />
            <span className="font-medium text-slate-800 dark:text-slate-200">{locationInfo.city}</span>
            <span className="text-slate-400">({locationInfo.country})</span>
            <span className="font-mono text-[11px] text-slate-400">
              {locationInfo.lat?.toFixed(2)}°N, {locationInfo.lon?.toFixed(2)}°E
            </span>
          </div>
        </div>
      </div>

      {/* Quick City Suggestion Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
        <span className="text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <History className="w-3 h-3" />
          {t('popularCities')}:
        </span>
        {recentSearches.map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => searchCity(city)}
            className={`shrink-0 px-2.5 py-1 rounded-full font-medium transition-all ${
              selectedCity.toLowerCase() === city.toLowerCase()
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200/60 dark:border-slate-700/60'
            }`}
          >
            {city}
          </button>
        ))}
      </div>
    </div>
  );
}
