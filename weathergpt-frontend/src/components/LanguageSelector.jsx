import React from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Reusable LanguageSelector component for WeatherGPT.
 */
export function LanguageSelector({ variant = 'dropdown', className = '' }) {
  const { currentLanguage, setLanguage, languages } = useLanguage();

  if (variant === 'pills') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {languages.slice(0, 4).map((lang) => {
          const isActive = currentLanguage === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                isActive
                  ? 'bg-brand-500 text-white border-brand-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span>{lang.native}</span>
              <span className="ml-1 opacity-70">({lang.name})</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Default compact select
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Globe className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
      <select
        value={currentLanguage}
        onChange={(e) => setLanguage(e.target.value)}
        className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 appearance-none cursor-pointer"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.native} ({lang.name})
          </option>
        ))}
      </select>
    </div>
  );
}
