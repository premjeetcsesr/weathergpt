import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Share2, 
  ExternalLink,
  Users,
  Compass
} from 'lucide-react';
import { SeverityBadge, CategoryBadge } from '../common/Badge';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useWeather } from '../../context/WeatherContext';

export function AlertCard({ alert }) {
  const { t } = useLanguage();
  const { searchCity } = useWeather();
  const navigate = useNavigate();

  const severityColors = {
    Information: "border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20",
    Moderate: "border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20",
    Severe: "border-orange-200 dark:border-orange-900/60 bg-orange-50/40 dark:bg-orange-950/20",
    Extreme: "border-red-300 dark:border-red-900/80 bg-red-50/60 dark:bg-red-950/30",
  }[alert.severity] || "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";

  const handleViewCity = () => {
    searchCity(alert.location);
    navigate('/');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: alert.title,
        text: `${alert.severity} Alert for ${alert.location}: ${alert.headline}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      alert(`Alert details copied: ${alert.title} - ${alert.location}`);
    }
  };

  return (
    <div className={`rounded-3xl p-6 border shadow-card transition-all ${severityColors}`}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <SeverityBadge severity={alert.severity} />
            <CategoryBadge category={alert.category} />
            <span className="text-xs text-slate-400 font-mono">
              {alert.urgency} Urgency
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {alert.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-brand-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{alert.location}</span>
            <span>({alert.region})</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
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
            className="px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <span>View Forecast</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Headline & Description */}
      <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 mb-4">
        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 mb-1">
          {alert.headline}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {alert.description}
        </p>
      </div>

      {/* Safety Instructions Card */}
      <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 mb-4 flex items-start gap-3">
        <div className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
            {t('safetyRecommendation')}
          </span>
          <p className="text-slate-600 dark:text-slate-300">
            {alert.safetyRecommendation}
          </p>
        </div>
      </div>

      {/* Affected Zones Chips */}
      {alert.affectedZones && (
        <div className="mb-4">
          <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 flex items-center gap-1">
            <Users className="w-3 h-3" /> {t('affectedZones')}:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {alert.affectedZones.map((zone, zIdx) => (
              <span
                key={zIdx}
                className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-300"
              >
                {zone}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer Timing & Source */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Validity: {alert.startTime} — {alert.endTime}</span>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          Source: {alert.source}
        </span>
      </div>
    </div>
  );
}
