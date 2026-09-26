import React, { useState, useEffect } from 'react';
import { useWeather } from '../context/WeatherContext';
import { useLanguage } from '../context/LanguageContext';
import { SearchBar } from '../components/common/SearchBar';
import { GoogleWeatherCard } from '../components/dashboard/GoogleWeatherCard';
import { WeatherDetailsGrid } from '../components/dashboard/WeatherDetailsGrid';
import { WeatherAlert } from '../components/dashboard/WeatherAlert';
import { AIInsight } from '../components/dashboard/AIInsight';
import { OfficialWarningBanner } from '../components/dashboard/OfficialWarningBanner';
import { WeatherRiskIndicator } from '../components/dashboard/WeatherRiskIndicator';
import { NowcastCard } from '../components/dashboard/NowcastCard';
import { ActionableAdvisoryCard } from '../components/dashboard/ActionableAdvisoryCard';
import { SourceTransparencyBadge } from '../components/dashboard/SourceTransparencyBadge';
import { SafetyModes } from '../components/dashboard/SafetyModes';
import { WeatherAtmosphere } from '../components/dashboard/WeatherAtmosphere';
import { fetchAdvancedWeather } from '../services/advancedWeatherApi';
import { Loading } from '../components/common/Loading';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { RefreshCw } from 'lucide-react';

export function Dashboard() {
  const { loading, error, refreshWeather, selectedCity, weatherData, openDedicatedAlertsPanel } = useWeather();
  const { t } = useLanguage();

  const [advancedData, setAdvancedData] = useState(null);
  const [activeAtmosphere, setActiveAtmosphere] = useState('auto');

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
    <div className="space-y-6 max-w-screen-2xl mx-auto pb-12 transition-all duration-300 relative z-10">
      {/* Dynamic Natural Rain, Storm, Wind Atmosphere & Disaster Engine */}
      <WeatherAtmosphere 
        currentWeather={weatherData?.current} 
        activeThemeOverride={activeAtmosphere} 
        onThemeChange={setActiveAtmosphere} 
      />

      {/* Official Warning Banner (Exact replicate of Screenshot 3) */}
      <OfficialWarningBanner
        warningsData={advancedData?.warnings}
        onOpenDedicatedPanel={openDedicatedAlertsPanel}
        locationName={selectedCity || 'Kanpur'}
      />

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
          className="p-2.5 rounded-2xl bg-white dark:bg-[#202124] border border-slate-200 dark:border-[#303134] text-slate-600 dark:text-slate-300 hover:text-brand-500 shadow-subtle transition-colors shrink-0"
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

      {/* HERO SECTION: Google Weather Card (Exact replicate of Image 1) */}
      <GoogleWeatherCard />

      {/* Detailed Atmospheric & Environmental Health Conditions */}
      <WeatherDetailsGrid />

      {/* Secondary Intelligence & Advisory Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: AI Weather Insight & Safety Modes */}
        <div className="md:col-span-7 lg:col-span-8 space-y-6">
          {/* Step 7: Short-term Nowcast Timeline */}
          {advancedData?.nowcast && (
            <NowcastCard nowcastData={advancedData.nowcast} />
          )}

          {/* Step 7: Severe Weather Risk Indicator */}
          {advancedData?.severe_weather && (
            <WeatherRiskIndicator severeData={advancedData.severe_weather} />
          )}

          {/* AI Weather Insight Card */}
          <AIInsight />

          {/* Safety Modes (Heatwave, Storm, Flood, Normal) */}
          <SafetyModes weatherData={weatherData} advancedData={advancedData} />
        </div>

        {/* Right Column: Alerts & Safety Advisories */}
        <div className="md:col-span-5 lg:col-span-4 space-y-6">
          {/* Step 7: Actionable Safety Advisories */}
          {advancedData?.advisory && (
            <ActionableAdvisoryCard advisoryData={advancedData.advisory} />
          )}

          {/* Active Weather Alert Box */}
          <WeatherAlert />
        </div>
      </div>
    </div>
  );
}
