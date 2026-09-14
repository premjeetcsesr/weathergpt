import React, { useEffect, useState } from 'react';
import { Thermometer, CloudRain, Wind, AlertTriangle, Layers, Radio, Satellite } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { fetchRadarStatus, fetchSatelliteStatus } from '../../services/radarSatelliteApi';

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
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        );
      case 'CONFIGURED':
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Configured
          </span>
        );
      case 'UNAVAILABLE':
      case 'ERROR':
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30">
            Unavailable
          </span>
        );
      case 'LOADING':
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 animate-pulse">
            Checking
          </span>
        );
      case 'NOT_CONFIGURED':
      default:
        return (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500">
            Not configured
          </span>
        );
    }
  };

  const layers = [
    { id: 'temperature', label: t('layerTemperature') || 'Temperature', icon: Thermometer, color: 'text-amber-500' },
    { id: 'precipitation', label: t('layerRainfall') || 'Precipitation', icon: CloudRain, color: 'text-blue-500' },
    { id: 'wind', label: t('layerWind') || 'Wind Stream', icon: Wind, color: 'text-teal-500' },
    { id: 'alerts', label: t('layerAlerts') || 'Active Alerts', icon: AlertTriangle, color: 'text-red-500' },
    {
      id: 'radar',
      label: 'Doppler Radar',
      icon: Radio,
      color: 'text-purple-500',
      status: radarStatus,
    },
    {
      id: 'satellite',
      label: 'INSAT-3D Satellite',
      icon: Satellite,
      color: 'text-sky-500',
      status: satelliteStatus,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-elevated">
      <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-slate-400">
        <Layers className="w-3.5 h-3.5 text-brand-500" />
        <span className="hidden sm:inline">Layers:</span>
      </div>
      {layers.map((layer) => {
        const Icon = layer.icon;
        const isActive = activeLayer === layer.id;
        return (
          <button
            key={layer.id}
            type="button"
            onClick={() => setActiveLayer(layer.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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

  if (activeLayer === 'radar') {
    return (
      <div className="p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-elevated text-xs">
        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
          <span>Doppler Reflectivity (dBZ)</span>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">DWR</span>
        </div>
        <div className="w-52 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-500 via-amber-400 via-red-500 to-fuchsia-600 mb-1" />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>10 (Drizzle)</span>
          <span>35 (Rain)</span>
          <span>50 (Hail/Storm)</span>
          <span>65+</span>
        </div>
      </div>
    );
  }

  if (activeLayer === 'satellite') {
    return (
      <div className="p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-elevated text-xs">
        <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
          <span>Cloud Top Temperature</span>
          <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">INSAT-3D</span>
        </div>
        <div className="w-52 h-2.5 rounded-full bg-gradient-to-r from-fuchsia-700 via-indigo-600 via-cyan-400 via-yellow-200 to-slate-200 mb-1" />
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>-80°C (Deep Convection)</span>
          <span>-40°C</span>
          <span>0°C</span>
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
