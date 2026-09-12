import React, { useState, useEffect } from 'react';
import { AlertTriangle, Filter, ShieldAlert, CloudRain, Flame, Waves, Wind, Zap } from 'lucide-react';
import { AlertCard } from '../components/alerts/AlertCard';
import { useLanguage } from '../context/LanguageContext';
import { getWeatherAlerts } from '../services/weatherApi';
import { Loading } from '../components/common/Loading';

export function Alerts() {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  const filterOptions = [
    { id: 'All', label: t('filterAll'), icon: Filter },
    { id: 'Rain', label: t('filterRain'), icon: CloudRain },
    { id: 'Thunderstorm', label: t('filterThunderstorm'), icon: Zap },
    { id: 'Flood', label: t('filterFlood'), icon: Waves },
    { id: 'Cyclone', label: t('filterCyclone'), icon: Wind },
    { id: 'Heatwave', label: t('filterHeatwave'), icon: Flame },
  ];

  useEffect(() => {
    setLoading(true);
    getWeatherAlerts('', activeFilter)
      .then((res) => {
        if (res.success) {
          setAlerts(res.alerts);
        }
      })
      .finally(() => setLoading(false));
  }, [activeFilter]);

  const countBySeverity = {
    extreme: alerts.filter((a) => a.severity === 'Extreme').length,
    severe: alerts.filter((a) => a.severity === 'Severe').length,
    moderate: alerts.filter((a) => a.severity === 'Moderate').length,
    info: alerts.filter((a) => a.severity === 'Information').length,
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('alertsTitle')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time severe weather warnings, disaster mitigation protocols, and emergency safety guidelines.
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 shadow-subtle">
          <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block">
            Extreme Threats
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-red-700 dark:text-red-200">
            {countBySeverity.extreme}
          </span>
          <span className="text-[10px] text-red-500 block mt-0.5">Immediate Life Hazard</span>
        </div>

        <div className="p-4 rounded-3xl bg-orange-50/80 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60 shadow-subtle">
          <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 block">
            Severe Warnings
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-orange-700 dark:text-orange-200">
            {countBySeverity.severe}
          </span>
          <span className="text-[10px] text-orange-500 block mt-0.5">High Impact Expected</span>
        </div>

        <div className="p-4 rounded-3xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-subtle">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
            Moderate Watches
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-700 dark:text-amber-200">
            {countBySeverity.moderate}
          </span>
          <span className="text-[10px] text-amber-500 block mt-0.5">Be Prepared</span>
        </div>

        <div className="p-4 rounded-3xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 shadow-subtle">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
            Informational
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-blue-700 dark:text-blue-200">
            {countBySeverity.info}
          </span>
          <span className="text-[10px] text-blue-500 block mt-0.5">General Awareness</span>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {filterOptions.map((opt) => {
          const Icon = opt.icon;
          const isActive = activeFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setActiveFilter(opt.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Alerts List */}
      {loading ? (
        <Loading message="Filtering meteorological threat bulletins..." />
      ) : alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No active alerts found for {activeFilter}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            There are currently no matching hazard advisories in this category.
          </p>
        </div>
      )}
    </div>
  );
}
