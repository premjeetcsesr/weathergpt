import React from 'react';
import { 
  Sun, 
  CloudSun, 
  CloudRain, 
  CloudLightning, 
  CloudDrizzle, 
  Cloud, 
  Droplets, 
  Wind, 
  Compass, 
  Gauge, 
  Eye, 
  SunMedium, 
  Sunrise, 
  Sunset, 
  ShieldAlert,
  Sparkles,
  Thermometer,
  CloudSnow,
  CloudFog,
  Moon
} from 'lucide-react';
import { useWeather } from '../../context/WeatherContext';
import { useLanguage } from '../../context/LanguageContext';

export function WeatherIcon({ iconName, className = "w-8 h-8" }) {
  switch (iconName) {
    case 'sun':
      return <Sun className={`${className} text-amber-500 animate-spin-slow`} />;
    case 'moon':
      return <Moon className={`${className} text-indigo-400`} />;
    case 'cloud-sun':
      return <CloudSun className={`${className} text-sky-500`} />;
    case 'cloud':
      return <Cloud className={`${className} text-slate-400`} />;
    case 'cloud-rain':
      return <CloudRain className={`${className} text-blue-500`} />;
    case 'cloud-lightning':
      return <CloudLightning className={`${className} text-amber-400`} />;
    case 'cloud-drizzle':
      return <CloudDrizzle className={`${className} text-sky-400`} />;
    case 'cloud-snow':
      return <CloudSnow className={`${className} text-blue-300`} />;
    case 'cloud-fog':
      return <CloudFog className={`${className} text-slate-400`} />;
    default:
      return <CloudSun className={`${className} text-brand-500`} />;
  }
}

export function CurrentWeather() {
  const { weatherData, formatTemp, formatWind } = useWeather();
  const { t } = useLanguage();

  if (!weatherData || !weatherData.current) return null;

  const { current, location } = weatherData;

  return (
    <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-white via-slate-50 to-brand-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-brand-950/40 border border-slate-200/80 dark:border-slate-800 shadow-card relative overflow-hidden transition-all">
      {/* Background subtle radial glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-400/10 dark:bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top row: City Name & Live Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {location.city}
            </h1>
            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {location.state ? `${location.state}, ` : ''}{location.country}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Elevation {location.elevation} • Timezone {location.timezone}
          </p>
        </div>

        {/* Air Quality Index Pill */}
        {current.air_quality && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-subtle backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <div className="text-xs">
              <span className="text-slate-500 dark:text-slate-400">{t('airQuality')}: </span>
              <span className={`font-semibold ${current.air_quality.color}`}>
                AQI {current.air_quality.aqi} ({current.air_quality.label})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Center Hero: Temperature & Main Condition Icon */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-4 relative z-10">
        {/* Main Temperature Display */}
        <div className="md:col-span-6 flex items-center gap-6">
          <div className="p-4 rounded-3xl bg-brand-50/80 dark:bg-brand-950/50 border border-brand-100 dark:border-brand-800/60 shadow-subtle">
            <WeatherIcon iconName={current.icon} className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
                {formatTemp(current.temp)}
              </span>
            </div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-2">
              <span>{t('feelsLike')} {formatTemp(current.feels_like)}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                {formatTemp(current.temp_max)} / {formatTemp(current.temp_min)}
              </span>
            </div>
          </div>
        </div>

        {/* Condition Summary */}
        <div className="md:col-span-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>{current.condition}</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {current.description}
          </p>
        </div>
      </div>

      {/* Bottom Grid: Essential Telemetry Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 relative z-10">
        
        {/* Humidity */}
        <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 shadow-subtle">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <Droplets className="w-3.5 h-3.5 text-blue-500" />
            <span>{t('humidity')}</span>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            {current.humidity}%
          </p>
          <span className="text-[10px] text-slate-400">Dew point: {formatTemp(current.dew_point)}</span>
        </div>

        {/* Wind Speed & Direction */}
        <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 shadow-subtle">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <Wind className="w-3.5 h-3.5 text-teal-500" />
            <span>{t('windSpeed')}</span>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            {formatWind(current.wind_speed)}
          </p>
          <span className="text-[10px] text-slate-400 font-mono">
            {current.wind_direction} ({current.wind_degree}°)
          </span>
        </div>

        {/* Pressure */}
        <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 shadow-subtle">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <Gauge className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t('pressure')}</span>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            {current.pressure} <span className="text-xs font-normal text-slate-400">hPa</span>
          </p>
          <span className="text-[10px] text-emerald-500 font-medium">Stable</span>
        </div>

        {/* Visibility */}
        <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 shadow-subtle">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <Eye className="w-3.5 h-3.5 text-sky-500" />
            <span>{t('visibility')}</span>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            {current.visibility} <span className="text-xs font-normal text-slate-400">km</span>
          </p>
          <span className="text-[10px] text-slate-400">Atmosphere clear</span>
        </div>

        {/* UV Index */}
        <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 shadow-subtle">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <SunMedium className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('uvIndex')}</span>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            {current.uv_index} <span className="text-xs font-normal text-amber-500">/ 11</span>
          </p>
          <span className="text-[10px] text-slate-400">
            {current.uv_index > 7 ? 'High (Use sunscreen)' : 'Moderate'}
          </span>
        </div>

        {/* Sunrise / Sunset */}
        <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 shadow-subtle">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <Sunrise className="w-3.5 h-3.5 text-orange-500" />
            <span>Sun Hours</span>
          </div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span>🌅 {current.sunrise}</span>
          </div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between mt-0.5">
            <span>🌇 {current.sunset}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
