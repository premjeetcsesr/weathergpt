import React from 'react';
import { CloudRain, Loader2 } from 'lucide-react';

export function Loading({ message = "Fetching atmospheric telemetry..." }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[300px]">
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-4 border-brand-200 dark:border-brand-900 border-t-brand-500 animate-spin flex items-center justify-center"></div>
        <CloudRain className="w-6 h-6 text-brand-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 animate-pulse">
        {message}
      </p>
    </div>
  );
}

export function SkeletonCard({ className = "" }) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-800/60 rounded-2xl ${className}`} />
  );
}
