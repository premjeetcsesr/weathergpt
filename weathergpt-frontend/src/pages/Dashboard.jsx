import React from 'react';
import { useWeather } from '../context/WeatherContext';
import { useLanguage } from '../context/LanguageContext';
import { SearchBar } from '../components/common/SearchBar';
import { CurrentWeather } from '../components/dashboard/CurrentWeather';
import { HourlyForecast } from '../components/dashboard/HourlyForecast';
import { DailyForecast } from '../components/dashboard/DailyForecast';
import { WeatherAlert } from '../components/dashboard/WeatherAlert';
import { AIInsight } from '../components/dashboard/AIInsight';
import { Loading } from '../components/common/Loading';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { RefreshCw } from 'lucide-react';

export function Dashboard() {
  const { loading, error, refreshWeather, selectedCity } = useWeather();
  const { t } = useLanguage();

  if (loading) {
    return <Loading message={`Synchronizing meteorological models for ${selectedCity}...`} />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refreshWeather} />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Search & Geolocation Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 w-full">
          <SearchBar />
        </div>
        <button
          type="button"
          onClick={refreshWeather}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-brand-500 shadow-subtle transition-colors shrink-0"
          title="Refresh Weather"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left / Main Column (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Hero Current Weather */}
          <CurrentWeather />

          {/* Horizontally Scrollable 24-Hour Timeline */}
          <HourlyForecast />

          {/* AI Weather Insight Card */}
          <AIInsight />
        </div>

        {/* Right Column (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Weather Alert Box */}
          <WeatherAlert />

          {/* 7-Day Outlook */}
          <DailyForecast />
        </div>

      </div>
    </div>
  );
}
