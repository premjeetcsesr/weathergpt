import React from 'react';
import { CloudLightning, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
import { useWeather } from '../../context/WeatherContext';

export function LocationPermissionGate() {
  const { useCurrentLocation, isLocating, locationError, searchCity } = useWeather();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section
        aria-labelledby="location-permission-title"
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-elevated dark:border-slate-800 dark:bg-slate-900 sm:p-9"
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
          <MapPin className="h-8 w-8" aria-hidden="true" />
        </div>

        <div className="mb-2 flex items-center justify-center gap-2">
          <CloudLightning className="h-5 w-5 text-brand-500" aria-hidden="true" />
          <span className="font-bold text-brand-600 dark:text-brand-400">WeatherGPT</span>
        </div>
        <h1 id="location-permission-title" className="text-2xl font-extrabold tracking-tight">
          Allow your current location
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          WeatherGPT needs your location to show local weather, alerts, and forecasts.
          Please allow location access to continue.
        </p>

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={isLocating}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
        >
          {isLocating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              Detecting location...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Use my current location
            </>
          )}
        </button>

        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            placeholder="Or enter city manually..."
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                searchCity(e.currentTarget.value.trim());
              }
            }}
          />
        </div>

        {locationError && (
          <p role="alert" className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">
            {locationError}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Your location is used only to find local weather
        </div>
      </section>
    </div>
  );
}
