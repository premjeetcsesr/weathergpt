import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { WeatherMap } from '../components/map/WeatherMap';
import { SearchBar } from '../components/common/SearchBar';
import { useLanguage } from '../context/LanguageContext';
import { useWeather } from '../context/WeatherContext';
import { Map, Info, Sparkles } from 'lucide-react';

export function WeatherMapPage() {
  const { t } = useLanguage();
  const { selectedCity } = useWeather();
  const [searchParams] = useSearchParams();

  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');
  const reportId = searchParams.get('reportId');

  const focusCoords = latParam && lonParam ? [parseFloat(latParam), parseFloat(lonParam)] : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-500 flex items-center justify-center">
              <Map className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('mapTitle')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time geospatial radar telemetry, cloud satellite passes, and meteorological threat mapping.
          </p>
        </div>

        {/* Quick search */}
        <div className="w-full md:w-96">
          <SearchBar />
        </div>
      </div>

      {/* Map Card */}
      <div className="relative">
        <WeatherMap
          height="620px"
          focusCoords={focusCoords}
          focusReportId={reportId}
        />
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-3xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
            Geospatial Telemetry Note
          </span>
          <p>
            Click on any city marker or alert hotspot on the map to view instant microclimate metrics, air quality indices, and activate dashboard tracking. Real-time Doppler feeds are refreshed every 15 minutes.
          </p>
        </div>
      </div>
    </div>
  );
}
