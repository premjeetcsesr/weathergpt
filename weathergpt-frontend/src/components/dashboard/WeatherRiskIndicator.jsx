import React from 'react';
import { AlertTriangle, Flame, CloudRain, Wind, Zap, ShieldCheck } from 'lucide-react';

export function WeatherRiskIndicator({ severeData }) {
  const risks = severeData?.risks || [];

  if (!severeData || risks.length === 0) {
    return (
      <div className="p-4 rounded-3xl bg-white dark:bg-[#0c1527] border border-slate-200/90 dark:border-[#1a2c4e] shadow-card flex items-center justify-between font-sans backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Atmospheric Threat Matrix: Normal
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#8ba2c4]">
              No severe atmospheric risk signals detected from verified sensor feeds.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-[#112437] text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-[#1d4653]">
          LOW RISK
        </span>
      </div>
    );
  }

  const getRiskIcon = (type) => {
    switch (type) {
      case 'heatwave':
        return <Flame className="w-4 h-4 text-rose-500" />;
      case 'heavy_rain':
        return <CloudRain className="w-4 h-4 text-blue-500" />;
      case 'gale_wind':
      case 'strong_wind':
        return <Wind className="w-4 h-4 text-teal-500" />;
      case 'thunderstorm':
        return <Zap className="w-4 h-4 text-amber-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-[#0c1527] border border-slate-200/90 dark:border-[#1a2c4e] shadow-card space-y-3 font-sans backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Severe Weather Risk Intelligence
          </h3>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-[#251f15] text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
          {risks.length} Risk Signal(s)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {risks.map((risk, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#111f38] border border-slate-200/60 dark:border-[#1e355b] space-y-1.5 text-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold capitalize text-slate-800 dark:text-white">
                {getRiskIcon(risk.risk_type)}
                <span>{risk.risk_type.replace('_', ' ')}</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                risk.severity === 'extreme'
                  ? 'bg-red-500 text-white'
                  : risk.severity === 'severe'
                  ? 'bg-amber-500 text-white'
                  : 'bg-yellow-500 text-slate-900'
              }`}>
                {risk.severity}
              </span>
            </div>

            {risk.metric_trigger && (
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Trigger: {risk.metric_trigger}
              </p>
            )}

            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              {risk.recommended_action}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
