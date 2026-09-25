import React from 'react';
import { AlertTriangle, AlertOctagon, ShieldAlert, Clock, MapPin, ExternalLink } from 'lucide-react';

export function OfficialWarningBanner({ warningsData }) {
  if (!warningsData || !warningsData.has_active_warnings || !warningsData.warnings?.length) {
    return null;
  }

  const primaryWarning = warningsData.warnings[0];
  const severity = primaryWarning.severity?.toLowerCase() || 'moderate';
  const isExtreme = severity === 'extreme';
  const isSevere = severity === 'severe';

  const themeClasses = isExtreme
    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-xl ring-2 ring-red-500/50'
    : isSevere
    ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-lg'
    : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 text-white shadow-md';

  const IconComponent = isExtreme ? AlertOctagon : isSevere ? AlertTriangle : ShieldAlert;

  return (
    <div className={`p-4 sm:p-5 rounded-3xl ${themeClasses} transition-all duration-300 relative overflow-hidden animate-fade-in`}>
      {/* Decorative pulse background blur */}
      <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md shrink-0 mt-0.5">
            <IconComponent className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-black/30 border border-white/20">
                OFFICIAL METEOROLOGICAL WARNING
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/25">
                SEVERITY: {primaryWarning.severity?.toUpperCase()}
              </span>
              <span className="text-[10px] font-semibold opacity-90">
                Source: <strong>{primaryWarning.source || warningsData.source}</strong>
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
              {primaryWarning.headline || primaryWarning.event}
            </h2>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-3xl">
              {primaryWarning.description}
            </p>

            {primaryWarning.instruction && (
              <div className="pt-1 text-xs font-medium text-white/95 flex items-center gap-1.5">
                <span className="underline decoration-white/50">Instruction:</span> {primaryWarning.instruction}
              </div>
            )}
          </div>
        </div>

        {/* Location & Validity Metadata */}
        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 text-right text-xs opacity-90 border-t sm:border-t-0 border-white/20 pt-2 sm:pt-0 w-full sm:w-auto">
          <div className="flex items-center gap-1 text-white">
            <MapPin className="w-3.5 h-3.5" />
            <span className="font-bold">{warningsData.location?.name}</span>
          </div>
          {primaryWarning.valid_until && (
            <div className="flex items-center gap-1 text-[11px] text-white/80">
              <Clock className="w-3 h-3" />
              <span>Valid until: {new Date(primaryWarning.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
