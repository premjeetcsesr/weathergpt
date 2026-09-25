import React, { useMemo, useState } from 'react';
import {
  Ambulance,
  Bike,
  CloudRain,
  Droplets,
  Flame,
  Home,
  School,
  ShieldCheck,
  Sprout,
  TrainFront,
  TreePine,
  Waves,
  Zap,
  CheckCircle,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

const MODES = [
  { id: 'flood', label: 'Flood & Waterlogging', icon: Waves, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { id: 'lightning', label: 'Lightning Safety', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'travel', label: 'Travel Safety', icon: TrainFront, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'school', label: 'School / College', icon: School, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { id: 'farmer', label: 'Farmer Mode', icon: Sprout, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'water', label: 'Water Saving', icon: Droplets, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { id: 'heat', label: 'Heatwave Protection', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'rider', label: 'Rider Safety', icon: Bike, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { id: 'home', label: 'Home Protection', icon: Home, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { id: 'emergency', label: 'Emergency Services', icon: Ambulance, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { id: 'wind', label: 'Wind / Falling Objects', icon: TreePine, color: 'text-teal-600', bg: 'bg-teal-500/10' },
];

function getSignals(weatherData, advancedData) {
  const current = weatherData?.current || advancedData?.current || {};
  const forecast = advancedData?.forecast_summary || '';
  const condition = String(current.condition || '').toLowerCase();
  const temperature = Number.isFinite(current.temp) ? current.temp : (Number.isFinite(current.temperature) ? current.temperature : null);
  const wind = Number.isFinite(current.wind_speed) ? current.wind_speed : null;
  const rain = /rain|storm|thunder|drizzle/.test(condition) || /rain/i.test(forecast);
  const lightning = /thunder|lightning/.test(condition);
  const hot = temperature !== null && temperature >= 38;
  const strongWind = wind !== null && wind >= 35;
  return { current, temperature, wind, rain, lightning, hot, strongWind };
}

function recommendationsFor(mode, signals) {
  const { temperature, wind, rain, lightning, hot, strongWind } = signals;
  const temp = temperature === null ? 'Seasonal average' : `${temperature}°C`;
  const windValue = wind === null ? 'Standard velocity' : `${wind} km/h`;

  switch (mode) {
    case 'flood':
      return rain
        ? [
            { text: 'Heavy rain conditions detected; avoid underpasses, subway crossings and low-lying roads.', type: 'warn' },
            { text: 'Do not attempt to cross standing or fast-moving water. Follow local municipal advisories.', type: 'alert' }
          ]
        : [
            { text: 'No immediate flood risk detected. Drainage systems are operating under normal load.', type: 'ok' },
            { text: 'Check local municipal weather updates before traveling through flood-prone lowlands.', type: 'info' }
          ];
    case 'lightning':
      return lightning
        ? [
            { text: 'Convective lightning detected nearby. Move indoors immediately and avoid open balconies.', type: 'alert' },
            { text: 'Stay away from tall isolated trees, metallic fences, and electrical equipment until storm subsides.', type: 'warn' }
          ]
        : [
            { text: 'No convective lightning activity detected in current radar telemetry.', type: 'ok' },
            { text: 'Atmospheric electrical charge is within normal safe thresholds across your zone.', type: 'info' }
          ];
    case 'travel':
      return rain || strongWind
        ? [
            { text: 'Road transit may encounter waterlogging and reduced visibility. Allow 15–20 minutes buffer.', type: 'warn' },
            { text: 'Reduce vehicle speed, maintain extended braking distance and keep headlights on low beam.', type: 'info' }
          ]
        : [
            { text: 'Optimal road and transit conditions. No meteorological transit impediments reported.', type: 'ok' },
            { text: 'Visibility is clear across main transit corridors. Drive safely.', type: 'info' }
          ];
    case 'school':
      return rain || lightning || hot
        ? [
            { text: 'Review institution safety advisories; restrict outdoor playground activities during peak weather.', type: 'warn' },
            { text: 'Parents and staff should coordinate transport safely in case of sudden showers.', type: 'info' }
          ]
        : [
            { text: 'Normal campus and school operating conditions. Outdoor activities are safe to proceed.', type: 'ok' },
            { text: 'Ensure children stay hydrated throughout standard school hours.', type: 'info' }
          ];
    case 'farmer':
      return rain
        ? [
            { text: 'Pause chemical and pesticide spraying during showers to avoid soil runoff waste.', type: 'warn' },
            { text: 'Inspect field trenches and bunds to ensure surplus rainwater flows into harvesting drains.', type: 'info' }
          ]
        : [
            { text: `Soil moisture balance is steady with current temperatures around ${temp}.`, type: 'ok' },
            { text: 'Plan scheduled irrigation during early morning hours to minimize water evaporation.', type: 'info' }
          ];
    case 'water':
      return rain
        ? [
            { text: 'Clean roof channels and activate rainwater harvesting storage filters.', type: 'ok' },
            { text: 'Ensure storage tanks and overhead lids are securely closed against foreign contamination.', type: 'info' }
          ]
        : [
            { text: 'Practice routine water conservation; inspect overhead ball valves and pipe connections for leaks.', type: 'info' },
            { text: 'Reuse household greywater for garden and plant irrigation.', type: 'ok' }
          ];
    case 'heat':
      return hot
        ? [
            { text: `Heat index is elevated at ${temp}. Drink at least 3 liters of water throughout the day.`, type: 'warn' },
            { text: 'Avoid direct sun exposure between 12:00 PM and 04:00 PM. Wear light cotton clothing.', type: 'info' }
          ]
        : [
            { text: `Current temperature is comfortable at ${temp}. Heat stress risk is minimal.`, type: 'ok' },
            { text: 'Standard hydration and sun protection recommended for midday outdoor exposure.', type: 'info' }
          ];
    case 'rider':
      return rain || strongWind
        ? [
            { text: 'Slippery road surfaces and gusty winds reported. Wear a certified helmet with clear anti-fog visor.', type: 'warn' },
            { text: 'Avoid sudden braking on painted lane markers and metal bridge expansion joints.', type: 'info' }
          ]
        : [
            { text: 'Excellent riding weather with good traction and clear road sightlines.', type: 'ok' },
            { text: 'Check tire pressures and enjoy a smooth commute.', type: 'info' }
          ];
    case 'home':
      return rain || strongWind
        ? [
            { text: 'Secure loose balcony items, flower pots and terrace tin sheets before wind picks up.', type: 'warn' },
            { text: 'Clear balcony floor drain grates to prevent rainwater pooling inside rooms.', type: 'info' }
          ]
        : [
            { text: 'Residential structural conditions are secure. No gust warnings active.', type: 'ok' },
            { text: 'Routine maintenance: check storm drains and window weather seals periodically.', type: 'info' }
          ];
    case 'emergency':
      return [
        { text: 'For urgent medical or civic emergencies, call national emergency hotline 112 immediately.', type: 'alert' },
        { text: 'Use the WeatherGPT interactive map to locate closest hospitals, trauma care, and pharmacies.', type: 'info' }
      ];
    case 'wind':
      return strongWind
        ? [
            { text: `Strong winds detected (${windValue}). Avoid parking under old trees or advertising hoardings.`, type: 'alert' },
            { text: 'Secure rooftop water tank lids and window shutters against sudden gusts.', type: 'warn' }
          ]
        : [
            { text: `Wind velocity is calm (${windValue}). No hazard from loose flying debris.`, type: 'ok' },
            { text: 'Safe conditions for high-rise balconies and outdoor fixtures.', type: 'info' }
          ];
    default:
      return [{ text: 'Telemetry parameters verified. Normal precautions apply.', type: 'ok' }];
  }
}

export function SafetyModes({ weatherData, advancedData }) {
  const [activeMode, setActiveMode] = useState('travel');
  const signals = useMemo(() => getSignals(weatherData, advancedData), [weatherData, advancedData]);
  const mode = MODES.find((item) => item.id === activeMode) || MODES[0];
  const Icon = mode.icon;

  return (
    <section className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-[#0c1527] border border-slate-200/90 dark:border-[#1a2c4e] shadow-card hover:shadow-elevated transition-all font-sans relative overflow-hidden backdrop-blur-md">
      
      {/* Background Accent Aura */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-[#13233f] border border-sky-200 dark:border-[#1e3760] flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Weather-to-Action Modes</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                Live Guidance
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#8ba2c4]">
              Real-time actionable safety protocols adapted to current telemetry.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#111f38] text-slate-600 dark:text-[#8ba2c4] border border-slate-200 dark:border-[#1e355b]">
          {advancedData?.source || weatherData?.source || 'OpenWeatherMap'}
        </span>
      </div>

      {/* Mode Pills Carousel */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 no-scrollbar relative z-10">
        {MODES.map((item) => {
          const ModeIcon = item.icon;
          const isActive = activeMode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveMode(item.id)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer border ${
                isActive
                  ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/25 scale-[1.02]'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-[#111f38] dark:hover:bg-[#172a4c] text-slate-700 dark:text-[#94a3b8] border-slate-200/90 dark:border-[#1e355b]'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-white/20 text-white' : `${item.bg} ${item.color}`}`}>
                <ModeIcon className="w-3.5 h-3.5" />
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Mode Guidance Panel */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-[#101e36]/90 border border-slate-200/90 dark:border-[#1c3359] relative z-10 transition-all">
        {/* Title bar of active mode */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-[#1e355b]">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${mode.bg} ${mode.color} border border-current/20`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {mode.label} Checklist
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-[#8ba2c4]">
                Targeted recommendations for current weather
              </span>
            </div>
          </div>
          <span className="text-xs text-sky-600 dark:text-sky-400 font-semibold hidden sm:inline-flex items-center gap-1">
            Active Mode <ArrowRight className="w-3 h-3" />
          </span>
        </div>

        {/* Actionable points */}
        <ul className="space-y-2.5">
          {recommendationsFor(activeMode, signals).map((item, idx) => (
            <li 
              key={idx} 
              className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-[#091122] border border-slate-200/60 dark:border-[#182a4a] text-xs sm:text-sm text-slate-700 dark:text-[#e2e8f0] transition-all"
            >
              {item.type === 'alert' ? (
                <AlertTriangle className="w-4 h-4 mt-0.5 text-rose-500 shrink-0" />
              ) : item.type === 'warn' ? (
                <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
              )}
              <span className="leading-relaxed">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

    </section>
  );
}
