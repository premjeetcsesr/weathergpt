import React from 'react';
import { Clock, CloudRain, Droplets, Wind, Info } from 'lucide-react';

export function NowcastCard({ nowcastData }) {
  if (!nowcastData) return null;

  if (!nowcastData.available || !nowcastData.points?.length) {
    return (
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-4 h-4 text-slate-400 shrink-0" />
        <span>
          {nowcastData.message || 'Short-term nowcast is currently unavailable for this location from the configured provider.'}
        </span>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1527] border border-slate-200/90 dark:border-[#1a2c4e] shadow-card space-y-3 font-sans backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Short-Term Nowcast (Next 3 Hours)
          </h3>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-[#112437] text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-[#1d4653]">
          Peak Rain: {nowcastData.max_rain_probability}%
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-[#8ba2c4]">
        {nowcastData.summary}
      </p>

      {/* 3-Hour Timeline horizontal steps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {nowcastData.points.slice(0, 4).map((pt, idx) => {
          const timeLabel = new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const isHighPop = pt.precipitation_probability >= 50;

          return (
            <div
              key={idx}
              className="p-2.5 rounded-2xl bg-slate-50 dark:bg-[#111f38] border border-slate-200/60 dark:border-[#1e355b] text-center space-y-1 text-xs"
            >
              <span className="text-[11px] font-semibold text-slate-500 dark:text-[#8ba2c4] block">
                {timeLabel}
              </span>
              <div className="flex items-center justify-center gap-1 font-bold text-slate-800 dark:text-white">
                <CloudRain className={`w-3.5 h-3.5 ${isHighPop ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{pt.precipitation_probability}%</span>
              </div>
              <div className="text-[10px] text-slate-400 dark:text-[#8ba2c4]">
                {pt.temperature !== null ? `${pt.temperature}°C` : pt.condition}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
