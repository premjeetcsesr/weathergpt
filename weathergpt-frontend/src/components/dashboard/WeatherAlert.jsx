import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Radio, 
  Wind, 
  Waves 
} from 'lucide-react';
import { useWeather } from '../../context/WeatherContext';
import { useLanguage } from '../../context/LanguageContext';
import { SeverityBadge } from '../common/Badge';
import { Link } from 'react-router-dom';

export function WeatherAlert() {
  const { alerts, selectedCity } = useWeather();
  const { t } = useLanguage();

  // If no active alerts
  if (!alerts || alerts.length === 0) {
    return (
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0c1527] border border-slate-200/90 dark:border-[#1a2c4e] shadow-card hover:shadow-elevated transition-all font-sans relative overflow-hidden flex flex-col justify-between gap-4 backdrop-blur-md">
        
        {/* Subtle Emerald Glow Backdrop */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Main Content */}
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-[#112437] border border-emerald-200 dark:border-[#1d4653] text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All Clear
            </span>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              No Severe Weather Alerts Active
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#8ba2c4] mt-1 leading-relaxed">
              Atmospheric conditions are stable across your monitored zone ({selectedCity || 'Current location'}).
            </p>
          </div>

          {/* Quick Verified Badges */}
          <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-600 dark:text-[#bdc1c6]">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#111f38] border border-slate-200/60 dark:border-[#1e355b] flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Normal Storm Risk</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#111f38] border border-slate-200/60 dark:border-[#1e355b] flex items-center gap-2">
              <Wind className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>Safe Wind Velocity</span>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="pt-3 border-t border-slate-100 dark:border-[#1a2c4e] flex items-center justify-between relative z-10">
          <span className="text-[11px] text-slate-400 dark:text-[#8ba2c4]">National Weather Service</span>
          <Link
            to="/alerts"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors group"
          >
            <span>{t('viewAllAlerts')}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

      </div>
    );
  }

  // Active Alert Display
  const primaryAlert = alerts[0];

  const severityTheme = {
    Information: {
      card: "bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60",
      icon: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50",
      accent: "text-blue-700 dark:text-blue-300"
    },
    Moderate: {
      card: "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60",
      icon: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50",
      accent: "text-amber-700 dark:text-amber-300"
    },
    Severe: {
      card: "bg-orange-50/90 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/60",
      icon: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50",
      accent: "text-orange-700 dark:text-orange-300"
    },
    Extreme: {
      card: "bg-red-50/90 dark:bg-red-950/50 border-red-300 dark:border-red-900",
      icon: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50",
      accent: "text-red-700 dark:text-red-300"
    },
  }[primaryAlert.severity] || {
    card: "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60",
    icon: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50",
    accent: "text-amber-700 dark:text-amber-300"
  };

  return (
    <div className={`p-5 sm:p-6 rounded-3xl border shadow-card transition-all font-sans relative overflow-hidden ${severityTheme.card}`}>
      
      {/* Alert Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${severityTheme.icon} shadow-sm`}>
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {primaryAlert.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={primaryAlert.severity} />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            📍 {primaryAlert.location}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs sm:text-sm text-slate-700 dark:text-[#e8eaed] mb-4 leading-relaxed">
        {primaryAlert.description}
      </p>

      {/* Safety Recommendation Box */}
      {primaryAlert.safetyRecommendation && (
        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-[#202124]/90 border border-slate-200/80 dark:border-[#3c4043] text-xs text-slate-800 dark:text-slate-200 mb-4 flex items-start gap-2.5 shadow-sm">
          <ShieldAlert className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-brand-600 dark:text-brand-400 mb-0.5">
              {t('safetyRecommendation')}:
            </span>
            {primaryAlert.safetyRecommendation}
          </div>
        </div>
      )}

      {/* Time Range & View All Link */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-[#9aa0a6] pt-3 border-t border-current/15">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Active: {primaryAlert.startTime} → {primaryAlert.endTime}</span>
        </div>
        <Link
          to="/alerts"
          className={`inline-flex items-center gap-1 font-semibold ${severityTheme.accent} hover:underline`}
        >
          <span>{t('viewAllAlerts')} ({alerts.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
