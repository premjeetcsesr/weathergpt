import React from 'react';
import { Thermometer, CloudRain, Wind, AlertTriangle, Layers, Radio, Satellite } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function WeatherLayers({
  activeLayer,
  setActiveLayer,
  radarStatus = 'NOT_CONFIGURED',
  satelliteStatus = 'NOT_CONFIGURED',
}) {
  const { t } = useLanguage();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        );
      case 'CONFIGURED':
        return (
          <span className="text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Ready
          </span>
        );
      case 'UNAVAILABLE':
      case 'ERROR':
      case 'NOT_CONFIGURED':
      default:
        return null;
    }
  };

  const layers = [
    { id: 'precipitation', label: 'Radar Rain', icon: CloudRain, color: 'text-blue-500' },
    { id: 'temperature', label: 'Temp', icon: Thermometer, color: 'text-amber-500' },
    { id: 'wind', label: 'Wind', icon: Wind, color: 'text-teal-500' },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, color: 'text-red-500' },
    {
      id: 'radar',
      label: 'Doppler',
      icon: Radio,
      color: 'text-purple-500',
      status: radarStatus,
    },
    {
      id: 'satellite',
      label: 'INSAT-3D',
      icon: Satellite,
      color: 'text-sky-500',
      status: satelliteStatus,
    },
  ];

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-elevated overflow-x-auto no-scrollbar max-w-[calc(100vw-2rem)] sm:max-w-none">
      <div className="hidden sm:flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-400 shrink-0">
        <Layers className="w-3.5 h-3.5 text-brand-500" />
        <span>Layers:</span>
      </div>
      {layers.map((layer) => {
        const Icon = layer.icon;
        const isActive = activeLayer === layer.id;
        return (
          <button
            key={layer.id}
            type="button"
            onClick={() => setActiveLayer(layer.id)}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shrink-0 ${
              isActive
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : layer.color}`} />
            <span>{layer.label}</span>
            {layer.status && getStatusBadge(layer.status)}
          </button>
        );
      })}
    </div>
  );
}

export function MapLegend({ activeLayer }) {
  if (activeLayer === 'temperature') {
    return (
      <div className="p-2.5 sm:p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-elevated text-[11px] sm:text-xs">
        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
          Temperature Scale (°C)
        </div>
        <div className="w-36 sm:w-48 h-2 rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 via-amber-400 to-red-500 mb-0.5" />
        <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-400 font-mono">
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
      <div className="p-2.5 sm:p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-elevated text-[11px] sm:text-xs">
        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
          Precipitation (mm/hr)
        </div>
        <div className="w-36 sm:w-48 h-2 rounded-full bg-gradient-to-r from-sky-200 via-blue-500 via-indigo-600 to-purple-600 mb-0.5" />
        <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-400 font-mono">
          <span>0.1 (Light)</span>
          <span>10 (Moderate)</span>
          <span>50+ (Torrential)</span>
        </div>
      </div>
    );
  }

  if (activeLayer === 'wind') {
    return (
      <div className="p-2.5 sm:p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-elevated text-[11px] sm:text-xs">
        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
          Wind Velocity (km/h)
        </div>
        <div className="w-36 sm:w-48 h-2 rounded-full bg-gradient-to-r from-teal-200 via-teal-500 to-emerald-700 mb-0.5" />
        <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-400 font-mono">
          <span>0</span>
          <span>25</span>
          <span>60+</span>
        </div>
      </div>
    );
  }

  if (activeLayer === 'radar') {
    return (
      <div className="p-2.5 sm:p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-elevated text-[11px] sm:text-xs">
        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
          <span>Doppler (dBZ)</span>
          <span className="text-[9px] text-purple-600 dark:text-purple-400 font-bold">DWR</span>
        </div>
        <div className="w-36 sm:w-52 h-2 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-500 via-amber-400 via-red-500 to-fuchsia-600 mb-0.5" />
        <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-400 font-mono">
          <span>10</span>
          <span>35</span>
          <span>50</span>
          <span>65+</span>
        </div>
      </div>
    );
  }

  if (activeLayer === 'satellite') {
    return (
      <div className="p-2.5 sm:p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-elevated text-[11px] sm:text-xs">
        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
          <span>Cloud Top Temp</span>
          <span className="text-[9px] text-sky-600 dark:text-sky-400 font-bold">INSAT-3D</span>
        </div>
        <div className="w-36 sm:w-52 h-2 rounded-full bg-gradient-to-r from-fuchsia-700 via-indigo-600 via-cyan-400 via-yellow-200 to-slate-200 mb-0.5" />
        <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-400 font-mono">
          <span>-80°C</span>
          <span>-40°C</span>
          <span>0°C</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2.5 sm:p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-elevated text-[11px] sm:text-xs">
      <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
        Alert Threat Matrix
      </div>
      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="text-blue-500 font-bold">🔵 Info</span>
        <span className="text-amber-500 font-bold">🟡 Mod</span>
        <span className="text-orange-500 font-bold">🟠 Sev</span>
        <span className="text-red-500 font-bold animate-pulse">🔴 Ext</span>
      </div>
    </div>
  );
}
