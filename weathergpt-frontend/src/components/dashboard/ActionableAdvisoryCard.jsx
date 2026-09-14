import React from 'react';
import { Compass, CheckCircle2, ShieldAlert } from 'lucide-react';

export function ActionableAdvisoryCard({ advisoryData }) {
  const advisories = advisoryData?.advisories || [];
  if (!advisoryData || advisories.length === 0) return null;

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Actionable Weather Advisories
          </h3>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
          Weather-Based Advisory
        </span>
      </div>

      <div className="space-y-3">
        {advisories.map((adv, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-950 dark:text-indigo-200">
                {adv.headline}
              </span>
              <span className="text-[10px] text-slate-400">{adv.category}</span>
            </div>

            <ul className="space-y-1 text-slate-700 dark:text-slate-300">
              {adv.recommendations.map((rec, rIdx) => (
                <li key={rIdx} className="flex items-start gap-1.5 leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-slate-400 dark:text-slate-500 italic pt-1">
        Disclaimer: Practical recommendations generated from verified sensor telemetry. Not an official civil protection order.
      </div>
    </div>
  );
}
