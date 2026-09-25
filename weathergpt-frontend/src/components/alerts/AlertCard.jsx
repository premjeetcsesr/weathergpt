import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Share2, 
  ExternalLink,
  ShieldAlert,
  Info
} from 'lucide-react';
import { SeverityBadge, CategoryBadge } from '../common/Badge';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useWeather } from '../../context/WeatherContext';

export function AlertCard({ alert }) {
  const { t } = useLanguage();
  const { searchCity } = useWeather();
  const navigate = useNavigate();

  const sevLower = (alert.severity || 'moderate').toLowerCase();

  const severityColors = {
    minor: "border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20",
    information: "border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20",
    moderate: "border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20",
    severe: "border-orange-300 dark:border-orange-900/70 bg-orange-50/50 dark:bg-orange-950/25 ring-1 ring-orange-500/20",
    extreme: "border-red-400 dark:border-red-900/80 bg-red-50/70 dark:bg-red-950/35 ring-2 ring-red-500/30",
  }[sevLower] || "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";

  const locationName = typeof alert.location === 'object' && alert.location !== null
    ? alert.location.name || alert.location.city || 'Unknown location'
    : alert.location || 'Unknown location';

  const eventTitle = alert.event || alert.title || 'Meteorological Advisory';
  const instruction = alert.instruction || alert.safety_recommendation || alert.safetyRecommendation;
  const startTime = alert.starts_at || alert.start_time || 'Immediate';
  const endTime = alert.ends_at || alert.end_time || 'Until further notice';
  const updatedTime = alert.updated_at 
    ? new Date(alert.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Recent';
  const sourceName = alert.source || 'OpenWeatherMap';

  const isDemo = alert.isDemo || alert.isFallback || alert.source === 'Demo / Mock' || alert.id?.startsWith('mock-');

  const handleViewCity = () => {
    searchCity(locationName);
    navigate('/');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: eventTitle,
        text: `${alert.severity?.toUpperCase()} Alert for ${locationName}: ${alert.headline || alert.description}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      alert(`Alert details copied: ${eventTitle} - ${locationName}`);
    }
  };

  return (
    <div className={`rounded-3xl p-4 sm:p-6 border shadow-card transition-all ${severityColors}`}>
      {/* Demo Warning Banner if Applicable (Section 15 Rule) */}
      {isDemo && (
        <div className="mb-3 sm:mb-4 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-black tracking-wider uppercase flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
          <span>DEMO ALERT — NOT A REAL WARNING</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3 sm:mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
            <SeverityBadge severity={alert.severity || 'Moderate'} />
            {alert.category && <CategoryBadge category={alert.category} />}
            <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-mono capitalize">
              {alert.urgency || 'Expected'} Urgency
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            {eventTitle}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mt-1">
            <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200">{locationName}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-500 transition-colors shadow-subtle"
            title="Share Alert"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleViewCity}
            className="px-3 py-1.5 sm:py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span>Forecast</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Headline & Description */}
      <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 mb-4">
        {alert.headline && (
          <p className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">
            {alert.headline}
          </p>
        )}
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {alert.description || 'Meteorological advisory in effect. Stay tuned to local advisories.'}
        </p>
      </div>

      {/* Public Safety Instructions */}
      {instruction && (
        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 mb-4 flex items-start gap-3">
          <div className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
              {t('safetyRecommendation')}
            </span>
            <p className="text-slate-600 dark:text-slate-300">
              {instruction}
            </p>
          </div>
        </div>
      )}

      {/* Footer Timing & Source (Required Section 15 fields) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Starts: <strong className="text-slate-700 dark:text-slate-300">{startTime}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 pl-5">
            <span>Ends: <strong className="text-slate-700 dark:text-slate-300">{endTime}</strong></span>
          </div>
        </div>

        <div className="sm:text-right space-y-1">
          <div>Source: <span className="font-semibold text-slate-700 dark:text-slate-300">{sourceName}</span></div>
          <div>Updated: <span className="text-slate-600 dark:text-slate-400">{updatedTime}</span></div>
        </div>
      </div>
    </div>
  );
}
