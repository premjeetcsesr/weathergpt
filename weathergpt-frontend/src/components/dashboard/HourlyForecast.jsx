import React from 'react';
import { Clock, Droplets, Wind } from 'lucide-react';
import { useWeather } from '../../context/WeatherContext';
import { useLanguage } from '../../context/LanguageContext';
import { WeatherIcon } from './CurrentWeather';

export function HourlyForecast() {
  const { hourlyForecast, formatTemp, formatWind } = useWeather();
  const { t } = useLanguage();

  if (!hourlyForecast || hourlyForecast.length === 0) return null;

  return (
    <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t('hourlyForecast')}
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          24-Hour Timeline
        </span>
      </div>

      {/* Horizontally Scrollable Timeline Container */}
      <div className="flex gap-3 overflow-x-auto pb-3 pt-1 -mx-2 px-2 no-scrollbar scroll-smooth">
        {hourlyForecast.map((hour, idx) => {
          const isHighRain = hour.pop >= 60;
          return (
            <div
              key={`${hour.time}-${idx}`}
              className={`shrink-0 flex flex-col items-center justify-between w-24 p-3.5 rounded-2xl border transition-all ${
                idx === 0
                  ? 'bg-brand-50/70 dark:bg-brand-950/40 border-brand-200 dark:border-brand-800/80 shadow-subtle'
                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800'
              }`}
            >
              {/* Time */}
              <span className={`text-xs font-semibold ${idx === 0 ? 'text-brand-600 dark:text-brand-400' : 'text-slate-600 dark:text-slate-400'}`}>
                {hour.time}
              </span>

              {/* Weather Icon */}
              <div className="my-2.5">
                <WeatherIcon iconName={hour.icon} className="w-8 h-8" />
              </div>

              {/* Temperature */}
              <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {formatTemp(hour.temp)}
              </span>

              {/* Rain Probability Pill */}
              <div
                className={`mt-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  isHighRain
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-slate-200/60 text-slate-600 dark:bg-slate-700/60 dark:text-slate-400'
                }`}
              >
                <Droplets className="w-3 h-3 text-blue-500" />
                <span>{hour.pop}%</span>
              </div>

              {/* Wind Indicator */}
              <span className="mt-1.5 text-[10px] text-slate-400 flex items-center gap-0.5">
                <Wind className="w-2.5 h-2.5" />
                {formatWind(hour.wind_speed)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
