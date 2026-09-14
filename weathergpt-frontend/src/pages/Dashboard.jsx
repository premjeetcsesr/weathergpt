import React, { useState, useEffect } from 'react';
import { useWeather } from '../context/WeatherContext';
import { useLanguage } from '../context/LanguageContext';
import { SearchBar } from '../components/common/SearchBar';
import { CurrentWeather } from '../components/dashboard/CurrentWeather';
import { HourlyForecast } from '../components/dashboard/HourlyForecast';
import { DailyForecast } from '../components/dashboard/DailyForecast';
import { WeatherAlert } from '../components/dashboard/WeatherAlert';
import { AIInsight } from '../components/dashboard/AIInsight';
import { OfficialWarningBanner } from '../components/dashboard/OfficialWarningBanner';
import { WeatherRiskIndicator } from '../components/dashboard/WeatherRiskIndicator';
import { NowcastCard } from '../components/dashboard/NowcastCard';
import { ActionableAdvisoryCard } from '../components/dashboard/ActionableAdvisoryCard';
import { SourceTransparencyBadge } from '../components/dashboard/SourceTransparencyBadge';
import { fetchAdvancedWeather } from '../services/advancedWeatherApi';
import { Loading } from '../components/common/Loading';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { RefreshCw } from 'lucide-react';

export function Dashboard() {
  const { loading, error, refreshWeather, selectedCity, weatherData } = useWeather();
  const { t } = useLanguage();

  const [advancedData, setAdvancedData] = useState(null);

  useEffect(() => {
    if (selectedCity) {
      fetchAdvancedWeather(selectedCity)
        .then((data) => setAdvancedData(data))
        .catch((err) => console.debug('Advanced weather telemetry fallback:', err));
    }
  }, [selectedCity]);

  if (loading) {
    return <Loading message={`Synchronizing meteorological models for ${selectedCity}...`} />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refreshWeather} />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Official Warning Banner (Prominent on EXTREME / SEVERE warnings) */}
      {advancedData?.warnings && (
        <OfficialWarningBanner warningsData={advancedData.warnings} />
      )}

      {/* Top Search & Geolocation Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 w-full">
          <SearchBar />
        </div>
        <button
          type="button"
          onClick={() => {
            refreshWeather();
            if (selectedCity) {
              fetchAdvancedWeather(selectedCity).then(setAdvancedData).catch(() => {});
            }
          }}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-brand-500 shadow-subtle transition-colors shrink-0"
          title="Refresh Weather"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Source Provenance & Freshness Badge */}
      <SourceTransparencyBadge
        source={advancedData?.source || weatherData?.source || 'OpenWeatherMap'}
        location={selectedCity}
        updated_at={advancedData?.updated_at || weatherData?.current?.dt}
      />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left / Main Column (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Hero Current Weather */}
          <CurrentWeather />

          {/* Step 7: Short-term Nowcast Timeline */}
          {advancedData?.nowcast && (
            <NowcastCard nowcastData={advancedData.nowcast} />
          )}

          {/* Horizontally Scrollable 24-Hour Timeline */}
          <HourlyForecast />

          {/* Step 7: Severe Weather Risk Indicator */}
          {advancedData?.severe_weather && (
            <WeatherRiskIndicator severeData={advancedData.severe_weather} />
          )}

          {/* AI Weather Insight Card */}
          <AIInsight />
        </div>

        {/* Right Column (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Step 7: Actionable Safety Advisories */}
          {advancedData?.advisory && (
            <ActionableAdvisoryCard advisoryData={advancedData.advisory} />
          )}

          {/* Active Weather Alert Box */}
          <WeatherAlert />

          {/* 7-Day Outlook */}
          <DailyForecast />
        </div>

      </div>
    </div>
  );
}
