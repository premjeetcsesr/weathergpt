import React from 'react';
import { Compass, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';

export function ActionableAdvisoryCard({ advisoryData }) {
  const advisories = advisoryData?.advisories || [];
  if (!advisoryData || advisories.length === 0) return null;

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#202124] border border-slate-200/80 dark:border-[#303134] shadow-card hover:shadow-elevated transition-all font-sans space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
            Actionable Weather Advisories
          </h3>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
          Telemetry Active
        </span>
      </div>

      <div className="space-y-3">
        {advisories.map((adv, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-[#2b2c2f] border border-indigo-100 dark:border-[#3c4043] space-y-2.5 text-xs transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-950 dark:text-indigo-200 text-xs sm:text-sm">
                {adv.headline}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-[#202124] text-slate-500 dark:text-[#9aa0a6] border border-slate-200/60 dark:border-[#3c4043]">
                {adv.category}
              </span>
            </div>

            <ul className="space-y-1.5 text-slate-700 dark:text-[#e8eaed]">
              {adv.recommendations.map((rec, rIdx) => (
                <li key={rIdx} className="flex items-start gap-2 leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-slate-400 dark:text-[#9aa0a6] italic pt-1 border-t border-slate-100 dark:border-[#303134]">
        Practical recommendations synthesized from live weather sensors.
      </div>
    </div>
  );
}
