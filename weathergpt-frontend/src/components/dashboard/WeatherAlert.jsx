import React from 'react';
import { AlertTriangle, Clock, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useWeather } from '../../context/WeatherContext';
import { useLanguage } from '../../context/LanguageContext';
import { SeverityBadge } from '../common/Badge';
import { Link } from 'react-router-dom';

export function WeatherAlert() {
  const { alerts } = useWeather();
  const { t } = useLanguage();

  if (!alerts || alerts.length === 0) {
    return (
      <div className="rounded-3xl p-5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 shadow-subtle flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              No Severe Weather Alerts Active
            </h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Atmospheric conditions are stable across your monitored zone.
            </p>
          </div>
        </div>
        <Link
          to="/alerts"
          className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
        >
          {t('viewAllAlerts')}
        </Link>
      </div>
    );
  }

  const primaryAlert = alerts[0];

  const severityBg = {
    Information: "bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60",
    Moderate: "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60",
    Severe: "bg-orange-50/80 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/60",
    Extreme: "bg-red-50/90 dark:bg-red-950/50 border-red-300 dark:border-red-900",
  }[primaryAlert.severity] || "bg-amber-50 dark:bg-amber-950/40 border-amber-200";

  return (
    <div className={`rounded-3xl p-6 border shadow-card transition-all ${severityBg}`}>
      {/* Alert Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 animate-bounce" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {primaryAlert.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={primaryAlert.severity} />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            📍 {primaryAlert.location}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
        {primaryAlert.description}
      </p>

      {/* Safety Recommendation Box */}
      <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 mb-4 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block text-brand-600 dark:text-brand-400 mb-0.5">
            {t('safetyRecommendation')}:
          </span>
          {primaryAlert.safetyRecommendation}
        </div>
      </div>

      {/* Time Range & View All Link */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Active: {primaryAlert.startTime} → {primaryAlert.endTime}</span>
        </div>
        <Link
          to="/alerts"
          className="inline-flex items-center gap-1 font-semibold text-brand-600 dark:text-brand-400 hover:underline"
        >
          <span>{t('viewAllAlerts')} ({alerts.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
