import React, { useMemo, useState } from 'react';
import {
  Ambulance,
  Bike,
  CloudRain,
  Droplets,
  Flame,
  Home,
  Lightbulb,
  School,
  ShieldCheck,
  Sprout,
  TrainFront,
  TreePine,
  Waves,
} from 'lucide-react';

const MODES = [
  { id: 'flood', label: 'Flood & Waterlogging', icon: Waves },
  { id: 'lightning', label: 'Lightning Safety', icon: Lightbulb },
  { id: 'travel', label: 'Travel Safety', icon: TrainFront },
  { id: 'school', label: 'School / College', icon: School },
  { id: 'farmer', label: 'Farmer Mode', icon: Sprout },
  { id: 'water', label: 'Water Saving', icon: Droplets },
  { id: 'heat', label: 'Heatwave Protection', icon: Flame },
  { id: 'rider', label: 'Rider Safety', icon: Bike },
  { id: 'home', label: 'Home Protection', icon: Home },
  { id: 'emergency', label: 'Emergency Services', icon: Ambulance },
  { id: 'wind', label: 'Wind / Falling Objects', icon: TreePine },
];

function getSignals(weatherData, advancedData) {
  const current = weatherData?.current || advancedData?.current || {};
  const forecast = advancedData?.forecast_summary || '';
  const condition = String(current.condition || '').toLowerCase();
  const temperature = Number.isFinite(current.temperature) ? current.temperature : null;
  const wind = Number.isFinite(current.wind_speed) ? current.wind_speed : null;
  const rain = /rain|storm|thunder|drizzle/.test(condition) || /rain/i.test(forecast);
  const lightning = /thunder|lightning/.test(condition);
  const hot = temperature !== null && temperature >= 38;
  const strongWind = wind !== null && wind >= 40;
  return { current, temperature, wind, rain, lightning, hot, strongWind };
}

function recommendationsFor(mode, signals) {
  const { current, temperature, wind, rain, lightning, hot, strongWind } = signals;
  const unavailable = 'Not enough verified telemetry is available for this recommendation.';
  const temp = temperature === null ? 'Data unavailable' : `${temperature}°C`;
  const windValue = wind === null ? 'Data unavailable' : `${wind} km/h`;

  switch (mode) {
    case 'flood':
      return rain
        ? ['Heavy rain conditions detected; avoid underpasses and low-lying roads.', 'Do not cross moving water. Follow local authority instructions.']
        : ['No current rain signal is available. Check local drainage and official warnings before travel.'];
    case 'lightning':
      return lightning
        ? ['Move indoors immediately and stay away from windows, metal structures and isolated trees.', 'Avoid open fields, rooftops and water until the storm passes.']
        : ['No lightning signal is present in current provider data.', unavailable];
    case 'travel':
      return rain || strongWind
        ? ['Delay non-essential travel where possible and use safer main roads.', 'Expect reduced visibility or waterlogging; check route conditions before departure.']
        : ['Conditions appear suitable for normal travel based on available telemetry.', 'Continue monitoring live warnings before leaving.'];
    case 'school':
      return rain || lightning || hot
        ? ['Review the institution safety plan and avoid outdoor activities during the risk period.', 'Parents and staff should follow official school and district notices.']
        : ['No severe signal is currently detected. Keep normal campus safety procedures active.'];
    case 'farmer':
      return rain
        ? ['Pause pesticide spraying during rain or strong wind and protect stored inputs.', 'Check field drainage before irrigation.']
        : ['Use the forecast rain probability before irrigation or spraying.', `Current temperature: ${temp}. Keep crop stress and soil moisture under observation.`];
    case 'water':
      return rain
        ? ['Clean roof gutters and safely collect rainfall where harvesting systems are installed.', 'Avoid contaminated runoff and keep drinking-water storage covered.']
        : ['Use water efficiently and inspect tanks, taps and drainage for leaks.', 'Rainwater harvesting advice requires a verified rainfall forecast.'];
    case 'heat':
      return hot
        ? [`Heat risk is elevated at ${temp}; hydrate regularly and limit direct sun exposure.`, 'Check on children, older adults and outdoor workers.']
        : [`Current temperature: ${temp}. No heatwave threshold is confirmed by available telemetry.`, 'Use normal hydration and sun protection.'];
    case 'rider':
      return rain || strongWind
        ? ['Reduce speed, increase following distance and avoid flooded roads.', 'Wear high-visibility waterproof gear and stop riding during lightning.']
        : ['No severe riding hazard is detected in available telemetry.', 'Continue checking visibility and live alerts during the trip.'];
    case 'home':
      return rain || strongWind
        ? ['Secure balcony items, check drains and close windows before the weather worsens.', 'Keep emergency lights and phones charged.']
        : ['No immediate home-protection trigger is detected.', 'Keep drains clear and secure loose outdoor objects as a routine precaution.'];
    case 'emergency':
      return ['For immediate danger, call your local emergency number first.', 'Use the map/search tools to locate the nearest hospital, pharmacy, police or fire service.'];
    case 'wind':
      return strongWind
        ? [`Strong wind signal detected (${windValue}); avoid trees, hoardings and loose structures.`, 'Secure rooftop sheets, signs and balcony objects.']
        : [`Current wind: ${windValue}. No high-wind threshold is confirmed.`, 'Avoid parking below weak trees during gusty weather.'];
    default:
      return [unavailable];
  }
}

export function SafetyModes({ weatherData, advancedData }) {
  const [activeMode, setActiveMode] = useState('travel');
  const signals = useMemo(() => getSignals(weatherData, advancedData), [weatherData, advancedData]);
  const mode = MODES.find((item) => item.id === activeMode) || MODES[0];
  const Icon = mode.icon;

  return (
    <section className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Weather-to-Action Modes</h2>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Practical guidance based on available weather telemetry, not an official emergency order.
          </p>
        </div>
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
          {advancedData?.source || weatherData?.source || 'Provider data'}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {MODES.map((item) => {
          const ModeIcon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveMode(item.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold border transition-colors ${
                activeMode === item.id
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <ModeIcon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/50">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{mode.label}</h3>
        </div>
        <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
          {recommendationsFor(activeMode, signals).map((recommendation) => (
            <li key={recommendation} className="flex items-start gap-2">
              <CloudRain className="w-3.5 h-3.5 mt-0.5 text-brand-500 shrink-0" />
              <span>{recommendation}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
