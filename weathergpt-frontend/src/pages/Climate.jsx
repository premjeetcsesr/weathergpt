import React, { useState, useEffect } from 'react';
import { 
  TemperatureTrendChart, 
  RainfallDistributionChart, 
  ClimateAnomalyChart 
} from '../components/climate/ClimateChart';
import { getClimateAnalytics } from '../services/weatherApi';
import { useLanguage } from '../context/LanguageContext';
import { useWeather } from '../context/WeatherContext';
import { Loading } from '../components/common/Loading';
import { 
  BarChart3, 
  TrendingUp, 
  CloudRain, 
  Flame, 
  Layers, 
  Activity, 
  Globe2 
} from 'lucide-react';

export function Climate() {
  const { t } = useLanguage();
  const { selectedCity } = useWeather();
  const [climateData, setClimateData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getClimateAnalytics(selectedCity)
      .then((res) => {
        if (res.success) {
          setClimateData(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedCity]);

  if (loading || !climateData) {
    return <Loading message="Loading long-term climatological models..." />;
  }

  const { monthlyTrends, yearlyAnomalies, summaryStats } = climateData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('climateTitle')}
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('climateSubtitle')} for the Indian Subcontinent & Global Baseline.
        </p>
      </div>

      {/* Key Metric Snapshot Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-red-500" />
            <span>Mean Temp Anomaly</span>
          </div>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {summaryStats.meanAnnualTempRise}
          </span>
          <span className="text-[10px] text-red-500 block mt-0.5">Vs Pre-industrial</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <CloudRain className="w-3.5 h-3.5 text-blue-500" />
            <span>Monsoon Intensity</span>
          </div>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {summaryStats.monsoonSurgeIndex}
          </span>
          <span className="text-[10px] text-blue-500 block mt-0.5">Extreme Spells Surge</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Record Max Heat</span>
          </div>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            47.2°C
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Recorded in Gangetic Plain</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Dry Spell Days</span>
          </div>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {summaryStats.drySpellsTrend}
          </span>
          <span className="text-[10px] text-emerald-500 block mt-0.5">Consecutive Dry Days</span>
        </div>
      </div>

      {/* Grid of Modular Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Temperature Trend */}
        <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {t('tempTrend')}
              </h2>
              <p className="text-[11px] text-slate-400">
                Observed monthly averages vs 30-year climatological normal
              </p>
            </div>
            <Globe2 className="w-4 h-4 text-brand-500" />
          </div>
          <TemperatureTrendChart data={monthlyTrends} />
        </div>

        {/* Chart 2: Rainfall Distribution */}
        <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {t('rainfallDistribution')}
              </h2>
              <p className="text-[11px] text-slate-400">
                Monthly precipitation accumulation in millimeters (mm)
              </p>
            </div>
            <CloudRain className="w-4 h-4 text-blue-500" />
          </div>
          <RainfallDistributionChart data={monthlyTrends} />
        </div>

        {/* Chart 3: 10-Year Decadal Anomaly */}
        <div className="lg:col-span-2 rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {t('climateAnomaly')} (2016 – 2026)
              </h2>
              <p className="text-[11px] text-slate-400">
                Annual mean surface temperature anomalies (°C above baseline)
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-red-500" />
          </div>
          <ClimateAnomalyChart data={yearlyAnomalies} />
        </div>

      </div>
    </div>
  );
}
