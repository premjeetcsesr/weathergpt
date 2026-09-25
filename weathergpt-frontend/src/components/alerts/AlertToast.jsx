import React, { useEffect } from 'react';
import { AlertTriangle, X, ExternalLink, Clock, MapPin, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function playAlertChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Autoplay policy or unsupported audio
  }
}

/**
 * Floating real-time alert toast for emergency alerts and warnings.
 */
export function AlertToast({ alert, onDismiss }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!alert) return;
    playAlertChime();

    // Auto-dismiss after 12 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 12000);

    return () => clearTimeout(timer);
  }, [alert, onDismiss]);

  if (!alert) return null;

  const severity = (alert.severity || 'moderate').toLowerCase();

  const severityStyles = {
    extreme: 'bg-red-500/15 border-red-500 text-red-700 dark:text-red-300 ring-red-500/30',
    severe: 'bg-orange-500/15 border-orange-500 text-orange-700 dark:text-orange-300 ring-orange-500/30',
    moderate: 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-amber-500/30',
    minor: 'bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300 ring-blue-500/30',
  }[severity] || 'bg-slate-500/15 border-slate-500 text-slate-700';

  const badgeBg = {
    extreme: 'bg-red-600 text-white',
    severe: 'bg-orange-600 text-white',
    moderate: 'bg-amber-600 text-white',
    minor: 'bg-blue-600 text-white',
  }[severity] || 'bg-slate-600 text-white';

  const handleView = () => {
    onDismiss();
    if (alert.is_community && alert.coordinates && alert.coordinates.length === 2) {
      navigate(`/map?lat=${alert.coordinates[0]}&lon=${alert.coordinates[1]}&reportId=${alert.report?.id || ''}`);
    } else {
      navigate('/alerts');
    }
  };

  const locName = typeof alert.location === 'object'
    ? alert.location?.name || alert.location?.city || 'Monitored Region'
    : alert.location || 'Monitored Region';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full sm:w-96 animate-slide-up shadow-2xl">
      <div className={`p-4 rounded-3xl border-2 backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 ring-1 ${severityStyles}`}>
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${badgeBg}`}>
              {alert.is_community ? 'COMMUNITY REPORT' : (alert.severity || 'ALERT')}
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {alert.is_community ? 'CITIZEN OBSERVATION' : 'LIVE METEOROLOGICAL ALERT'}
            </span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-2.5 flex items-start gap-2.5">
          <div className="p-2 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 shrink-0 shadow-sm">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {alert.event || alert.title || 'Severe Weather Warning'}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              <span className="truncate">{locName}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {alert.headline || alert.description || 'Active meteorological advisory issued for this region.'}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Just now
          </span>
          <button
            type="button"
            onClick={handleView}
            className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>{alert.is_community ? 'View on Map 📍' : 'View All Alerts'}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
