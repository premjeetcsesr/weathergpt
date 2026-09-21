import React from 'react';
import { CalendarDays, Droplets } from 'lucide-react';
import { useWeather } from '../../context/WeatherContext';
import { useLanguage } from '../../context/LanguageContext';
import { WeatherIcon } from './CurrentWeather';

export function DailyForecast() {
  const { dailyForecast, formatTemp } = useWeather();
  const { t } = useLanguage();

  if (!dailyForecast || dailyForecast.length === 0) return null;

  return (
    <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-brand-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t('dailyForecast')}
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          7-Day Outlook
        </span>
      </div>

      {/* 7-Day List */}
      <div className="space-y-2.5">
        {dailyForecast.map((day, idx) => {
          return (
            <div
              key={`${day.day}-${idx}`}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
            >
              {/* Day & Date */}
              <div className="w-24 sm:w-28 shrink-0">
                <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  {idx === 0 ? t('today') : day.day}
                </div>
                <div className="text-[11px] text-slate-400">
                  {day.date}
                </div>
              </div>

              {/* Weather Condition Icon & Text */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0 px-2">
                <WeatherIcon iconName={day.icon} className="w-6 h-6 shrink-0" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate hidden sm:inline">
                  {day.condition}
                </span>
              </div>

              {/* Precipitation Chance */}
              <div className="flex items-center gap-1 w-16 shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>{day.pop}%</span>
              </div>

              {/* Min - Max Temperature with Visual Range Bar */}
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-xs font-medium text-slate-400 w-8 text-right">
                  {formatTemp(day.temp_min)}
                </span>
                
                {/* Visual Bar */}
                <div className="w-12 sm:w-20 md:w-24 lg:w-28 xl:w-36 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex transition-all">
                  <div className="h-full bg-gradient-to-r from-sky-400 via-brand-500 to-amber-500 rounded-full w-full" />
                </div>

                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 w-8">
                  {formatTemp(day.temp_max)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
