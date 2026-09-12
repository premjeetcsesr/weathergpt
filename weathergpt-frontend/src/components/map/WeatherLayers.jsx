import React from 'react';
import { Thermometer, CloudRain, Wind, AlertTriangle, Layers } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function WeatherLayers({ activeLayer, setActiveLayer }) {
  const { t } = useLanguage();

  const layers = [
    { id: 'temperature', label: t('layerTemperature'), icon: Thermometer, color: 'text-amber-500' },
    { id: 'precipitation', label: t('layerRainfall'), icon: CloudRain, color: 'text-blue-500' },
    { id: 'wind', label: t('layerWind'), icon: Wind, color: 'text-teal-500' },
    { id: 'alerts', label: t('layerAlerts'), icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-elevated">
      <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-400">
        <Layers className="w-3.5 h-3.5 text-brand-500" />
        <span className="hidden sm:inline">Layer:</span>
      </div>
      {layers.map((layer) => {
        const Icon = layer.icon;
        const isActive = activeLayer === layer.id;
        return (
          <button
            key={layer.id}
            type="button"
            onClick={() => setActiveLayer(layer.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              isActive
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : layer.color}`} />
            <span>{layer.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function MapLegend({ activeLayer }) {
  if (activeLayer === 'temperature') {
    return (
      <div className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-elevated text-xs">
        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
          Temperature Scale (°C)
        </div>
        <div className="w-48 h-2.5 rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 via-amber-400 to-red-500 mb-1" />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>0°C</span>
          <span>15°C</span>
          <span>30°C</span>
          <span>45°C</span>
        </div>
      </div>
    );
  }

  if (activeLayer === 'precipitation') {
    return (
      <div className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-elevated text-xs">
        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
          Precipitation Radar (mm/hr)
        </div>
        <div className="w-48 h-2.5 rounded-full bg-gradient-to-r from-sky-200 via-blue-500 via-indigo-600 to-purple-600 mb-1" />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>0.1 (Light)</span>
          <span>10 (Moderate)</span>
          <span>50+ (Torrential)</span>
        </div>
      </div>
    );
  }

  if (activeLayer === 'wind') {
    return (
      <div className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-elevated text-xs">
        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
          Wind Velocity (km/h)
        </div>
        <div className="w-48 h-2.5 rounded-full bg-gradient-to-r from-teal-200 via-teal-500 to-emerald-700 mb-1" />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>0 (Calm)</span>
          <span>25 (Breezy)</span>
          <span>60+ (Gale)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-elevated text-xs">
      <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
        Weather Alert Threat Matrix
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="flex items-center gap-1 text-blue-500 font-medium">🔵 Info</span>
        <span className="flex items-center gap-1 text-amber-500 font-medium">🟡 Moderate</span>
        <span className="flex items-center gap-1 text-orange-500 font-medium">🟠 Severe</span>
        <span className="flex items-center gap-1 text-red-500 font-medium animate-pulse">🔴 Extreme</span>
      </div>
    </div>
  );
}
