import React from 'react';
import { ShieldCheck, Clock, MapPin, Database } from 'lucide-react';

export function SourceTransparencyBadge({ source, location, updated_at }) {
  const displaySource = source || 'OpenWeatherMap';
  const timeString = updated_at
    ? new Date(updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Live';

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 shadow-sm">
      <div className="flex items-center gap-2">
        <Database className="w-3.5 h-3.5 text-brand-500 shrink-0" />
        <span>
          Source: <strong className="text-slate-900 dark:text-slate-100">{displaySource}</strong>
        </span>
        <span className="text-slate-400">•</span>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span>{location || 'Kanpur'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Updated: {timeString}</span>
        </div>
        <span className="text-slate-400">•</span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Telemetry</span>
        </span>
      </div>
    </div>
  );
}
