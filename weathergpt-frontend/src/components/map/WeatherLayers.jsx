import React from 'react';
import { Thermometer, CloudRain, Wind, AlertTriangle, Layers, Radio, Satellite, Map as MapIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export function WeatherLayers({
  activeLayer,
  setActiveLayer,
  radarStatus = 'NOT_CONFIGURED',
  satelliteStatus = 'NOT_CONFIGURED',
  baseMapStyle = 'dark',
  setBaseMapStyle,
}) {
  const { t } = useLanguage();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-0.5 ml-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
        );
      case 'CONFIGURED':
        return (
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 ml-auto">
            Ready
          </span>
        );
      default:
        return null;
    }
  };

  const layers = [
    { id: 'precipitation', label: 'Radar Rain', icon: CloudRain, color: 'text-sky-400' },
    { id: 'temperature', label: 'Temp', icon: Thermometer, color: 'text-amber-400' },
    { id: 'wind', label: 'Wind', icon: Wind, color: 'text-teal-400' },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, color: 'text-rose-400' },
    {
      id: 'radar',
      label: 'Doppler',
      icon: Radio,
      color: 'text-purple-400',
      status: radarStatus,
    },
    {
      id: 'satellite',
      label: 'INSAT-3D',
      icon: Satellite,
      color: 'text-cyan-400',
      status: satelliteStatus,
    },
  ];

  return (
    <div className="flex flex-col gap-1.5 p-2.5 sm:p-3 bg-[#0d1526]/90 dark:bg-[#0b1329]/95 backdrop-blur-xl rounded-3xl border border-slate-700/60 shadow-2xl w-40 sm:w-44 text-xs select-none">
      {/* Panel Header */}
      <div className="flex items-center gap-2 px-2 py-1 text-slate-300 font-extrabold tracking-wide text-xs">
        <Layers className="w-4 h-4 text-sky-400 shrink-0" />
        <span>Layers:</span>
      </div>

      {/* Layer Toggle Items */}
      <div className="flex flex-col gap-1">
        {layers.map((layer) => {
          const Icon = layer.icon;
          const isActive = activeLayer === layer.id;
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => setActiveLayer(layer.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl font-bold transition-all text-left ${
                isActive
                  ? 'bg-[#0088ff] text-white shadow-lg shadow-sky-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : layer.color}`} />
              <span className="truncate">{layer.label}</span>
              {layer.status && getStatusBadge(layer.status)}
            </button>
          );
        })}
      </div>

      {/* Base Map Style Switcher (Image 1 Dark vs Image 2 Topo/Terrain) */}
      {setBaseMapStyle && (
        <div className="mt-2 pt-2 border-t border-slate-700/60 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 px-2 text-[10px] uppercase font-bold text-slate-400">
            <MapIcon className="w-3 h-3 text-slate-400" />
            <span>Map Style</span>
          </div>
          <div className="grid grid-cols-2 gap-1 bg-slate-800/80 p-0.5 rounded-xl text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setBaseMapStyle('dark')}
              className={`py-1 px-1.5 rounded-lg transition-all ${
                baseMapStyle === 'dark'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Dark Canvas Map (Image 1)"
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setBaseMapStyle('topo')}
              className={`py-1 px-1.5 rounded-lg transition-all ${
                baseMapStyle === 'topo'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Esri Topographic/Terrain Map (Image 2)"
            >
              Terrain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MapLegend({ activeLayer }) {
  if (activeLayer === 'temperature') {
    return (
      <div className="p-2.5 sm:p-3 bg-[#0d1526]/90 dark:bg-[#0b1329]/95 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl text-[11px] sm:text-xs text-white">
        <div className="font-semibold text-slate-200 mb-1">
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
      <div className="p-2.5 sm:p-3 bg-[#0d1526]/90 dark:bg-[#0b1329]/95 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl text-[11px] sm:text-xs text-white">
        <div className="font-semibold text-slate-200 mb-1">
          Precipitation (mm/hr)
        </div>
        <div className="w-36 sm:w-48 h-2 rounded-full bg-gradient-to-r from-sky-200 via-blue-500 via-indigo-600 to-purple-600 mb-0.5" />
        <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-400 font-mono">
          <span>0.1 (Light)</span>
          <span>10 (Moderate)</span>
          <span>50+ (Heavy)</span>
        </div>
      </div>
    );
  }

  if (activeLayer === 'wind') {
    return (
      <div className="p-2.5 sm:p-3 bg-[#0d1526]/90 dark:bg-[#0b1329]/95 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl text-[11px] sm:text-xs text-white">
        <div className="font-semibold text-slate-200 mb-1">
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
      <div className="p-2.5 sm:p-3 bg-[#0d1526]/90 dark:bg-[#0b1329]/95 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl text-[11px] sm:text-xs text-white">
        <div className="font-semibold text-slate-200 mb-1 flex items-center justify-between">
          <span>Doppler (dBZ)</span>
          <span className="text-[9px] text-purple-400 font-bold">DWR</span>
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
      <div className="p-2.5 sm:p-3 bg-[#0d1526]/90 dark:bg-[#0b1329]/95 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl text-[11px] sm:text-xs text-white">
        <div className="font-semibold text-slate-200 mb-1 flex items-center justify-between">
          <span>Cloud Top Temp</span>
          <span className="text-[9px] text-sky-400 font-bold">INSAT-3D</span>
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
    <div className="p-2.5 sm:p-3 bg-[#0d1526]/90 dark:bg-[#0b1329]/95 backdrop-blur-md rounded-2xl border border-slate-700/60 shadow-2xl text-[11px] sm:text-xs text-white">
      <div className="font-semibold text-slate-200 mb-1">
        Alert Threat Matrix
      </div>
      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="text-blue-400 font-bold">🔵 Info</span>
        <span className="text-amber-400 font-bold">🟡 Mod</span>
        <span className="text-orange-400 font-bold">🟠 Sev</span>
        <span className="text-red-400 font-bold animate-pulse">🔴 Ext</span>
      </div>
    </div>
  );
}
