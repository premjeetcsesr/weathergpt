import React, { useState } from 'react';
import { 
  AlertCircle, 
  MapPin, 
  Navigation, 
  RefreshCw, 
  Search, 
  Building2,
  HelpCircle
} from 'lucide-react';
import { useWeather } from '../../context/WeatherContext';

export function ErrorMessage({ 
  message = "An error occurred while loading weather data.", 
  onRetry 
}) {
  const { 
    useCurrentLocation, 
    searchCity, 
    isLocating, 
    selectedCity 
  } = useWeather();

  const [inputQuery, setInputQuery] = useState('');

  // Detect if error is a missing location error
  const isLocationNotFound = 
    message.toLowerCase().includes('not found') || 
    message.toLowerCase().includes('unable to load') ||
    message.toLowerCase().includes('failed to load');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (inputQuery.trim()) {
      searchCity(inputQuery.trim());
      setInputQuery('');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto my-12 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#202124] border border-red-200/80 dark:border-red-900/60 shadow-2xl text-center space-y-5 transition-all">
      
      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900/80 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto shadow-sm">
        {isLocationNotFound ? <MapPin className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
      </div>

      {/* Title & Description */}
      <div className="space-y-1.5">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {isLocationNotFound ? 'Location Not Found' : 'Weather Telemetry Notice'}
        </h2>
        <p className="text-sm text-slate-600 dark:text-[#9aa0a6] max-w-md mx-auto leading-relaxed">
          {isLocationNotFound && selectedCity ? (
            <>
              Could not find weather records for <strong className="text-red-500 dark:text-red-400 font-semibold">"{selectedCity}"</strong>. Please check spelling or use your live location.
            </>
          ) : (
            message
          )}
        </p>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {/* Use Current Location Button */}
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={isLocating}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-2xl text-sm font-semibold transition-all shadow-md disabled:opacity-50"
        >
          <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
          <span>{isLocating ? 'Detecting Location...' : 'Use My Current Location'}</span>
        </button>

        {/* Fallback to Kanpur */}
        <button
          type="button"
          onClick={() => searchCity('Kanpur')}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#303134] dark:hover:bg-[#3c4043] text-slate-800 dark:text-white rounded-2xl text-sm font-medium transition-all border border-slate-200 dark:border-[#5f6368]"
        >
          <Building2 className="w-4 h-4 text-sky-400" />
          <span>Switch to Kanpur</span>
        </button>

        {/* Retry */}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs text-slate-500 dark:text-[#9aa0a6] hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        )}
      </div>

      {/* Direct Search Bar inside Error Card */}
      <div className="pt-3 border-t border-slate-200/80 dark:border-[#303134]">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center max-w-md mx-auto">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Type another city name (e.g. Kanpur, Delhi, Lucknow)..."
            className="w-full pl-10 pr-20 py-2 bg-slate-50 dark:bg-[#303134] border border-slate-200 dark:border-[#5f6368] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-all"
          />
          <button
            type="submit"
            className="absolute right-1 px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Search
          </button>
        </form>

        {/* Quick Suggestions */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap mt-3 text-xs text-slate-500 dark:text-[#9aa0a6]">
          <span>Try:</span>
          {['Kanpur', 'Lucknow', 'Delhi', 'Mumbai', 'Varanasi'].map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => searchCity(city)}
              className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#303134] hover:bg-slate-200 dark:hover:bg-[#3c4043] text-slate-700 dark:text-slate-300 transition-colors"
            >
              {city}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
