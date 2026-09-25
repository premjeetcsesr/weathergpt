import React from 'react';
import { 
  Droplets, 
  Wind, 
  Gauge, 
  Eye, 
  SunMedium, 
  Sunrise, 
  Activity
} from 'lucide-react';
import { useWeather } from '../../context/WeatherContext';
import { useLanguage } from '../../context/LanguageContext';

export function WeatherDetailsGrid() {
  const { weatherData, formatTemp, formatWind } = useWeather();
  const { t } = useLanguage();

  if (!weatherData || !weatherData.current) return null;

  const { current } = weatherData;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-500" />
          <span>Atmospheric Conditions & Health</span>
        </h2>
        {current.air_quality && (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            AQI: <strong className={current.air_quality.color}>{current.air_quality.aqi} ({current.air_quality.label})</strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Humidity */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1527] border border-slate-200/80 dark:border-[#1a2c4e] shadow-sm hover:border-slate-300 dark:hover:border-[#1e3b66] transition-all">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#9aa0a6] text-xs mb-1">
            <Droplets className="w-3.5 h-3.5 text-blue-500" />
            <span>{t('humidity')}</span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {current.humidity}%
          </p>
          <span className="text-[11px] text-slate-400 dark:text-[#9aa0a6]">Dew point: {formatTemp(current.dew_point)}</span>
        </div>

        {/* Wind */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1527] border border-slate-200/80 dark:border-[#1a2c4e] shadow-sm hover:border-slate-300 dark:hover:border-[#1e3b66] transition-all">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#9aa0a6] text-xs mb-1">
            <Wind className="w-3.5 h-3.5 text-teal-500" />
            <span>{t('windSpeed')}</span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {formatWind(current.wind_speed)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-[#9aa0a6] font-mono">
            {current.wind_direction} ({current.wind_degree}°)
          </span>
        </div>

        {/* Pressure */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1527] border border-slate-200/80 dark:border-[#1a2c4e] shadow-sm hover:border-slate-300 dark:hover:border-[#1e3b66] transition-all">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#9aa0a6] text-xs mb-1">
            <Gauge className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t('pressure')}</span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {current.pressure} <span className="text-xs font-normal text-slate-400 dark:text-[#9aa0a6]">hPa</span>
          </p>
          <span className="text-[11px] text-emerald-500 font-medium">Barometric Normal</span>
        </div>

        {/* Visibility */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1527] border border-slate-200/80 dark:border-[#1a2c4e] shadow-sm hover:border-slate-300 dark:hover:border-[#1e3b66] transition-all">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#9aa0a6] text-xs mb-1">
            <Eye className="w-3.5 h-3.5 text-sky-500" />
            <span>{t('visibility')}</span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {current.visibility} <span className="text-xs font-normal text-slate-400 dark:text-[#9aa0a6]">km</span>
          </p>
          <span className="text-[11px] text-slate-400 dark:text-[#9aa0a6]">Atmosphere Clear</span>
        </div>

        {/* UV Index */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1527] border border-slate-200/80 dark:border-[#1a2c4e] shadow-sm hover:border-slate-300 dark:hover:border-[#1e3b66] transition-all">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#9aa0a6] text-xs mb-1">
            <SunMedium className="w-3.5 h-3.5 text-amber-500" />
            <span>{t('uvIndex')}</span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {current.uv_index} <span className="text-xs font-normal text-amber-500">/ 11</span>
          </p>
          <span className="text-[11px] text-slate-400 dark:text-[#9aa0a6]">
            {current.uv_index > 7 ? 'High (Sunscreen)' : 'Moderate Exposure'}
          </span>
        </div>

        {/* Sun Hours */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0c1527] border border-slate-200/80 dark:border-[#1a2c4e] shadow-sm hover:border-slate-300 dark:hover:border-[#1e3b66] transition-all">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#9aa0a6] text-xs mb-1">
            <Sunrise className="w-3.5 h-3.5 text-orange-500" />
            <span>Sun Horizon</span>
          </div>
          <div className="text-xs font-semibold text-slate-800 dark:text-white flex items-center justify-between">
            <span>🌅 {current.sunrise}</span>
          </div>
          <div className="text-xs font-semibold text-slate-800 dark:text-white flex items-center justify-between mt-1">
            <span>🌇 {current.sunset}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
