import React, { useState } from 'react';
import { CloudLightning, Moon, Sun, Globe, Bell, Sparkles, AlertTriangle } from 'lucide-react';
import { useWeather } from '../../context/WeatherContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { Link } from 'react-router-dom';

export function Navbar() {
  const { tempUnit, setTempUnit, alerts } = useWeather();
  const { currentLanguage, setLanguage, languages, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  const toggleTempUnit = () => {
    setTempUnit((prev) => (prev === 'C' ? 'F' : 'C'));
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform duration-200">
            <CloudLightning className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-brand-600 to-sky-500 dark:from-white dark:via-brand-400 dark:to-sky-300 bg-clip-text text-transparent">
                WeatherGPT
              </span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                AI Intelligence
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block leading-none mt-0.5">
              {t('tagline')}
            </p>
          </div>
        </Link>

        {/* Right Action Icons & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Temperature Unit Toggle Button (°C / °F) */}
          <button
            type="button"
            onClick={toggleTempUnit}
            title="Toggle °C / °F"
            className="flex items-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl p-1 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <span
              className={`px-2 py-1 rounded-lg transition-all ${
                tempUnit === 'C'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              °C
            </span>
            <span
              className={`px-2 py-1 rounded-lg transition-all ${
                tempUnit === 'F'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              °F
            </span>
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowLangDropdown(!showLangDropdown);
                setShowAlertsDropdown(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-brand-500" />
              <span className="hidden sm:inline">
                {languages.find((l) => l.code === currentLanguage)?.native || 'English'}
              </span>
              <span className="sm:hidden uppercase">{currentLanguage}</span>
            </button>

            {showLangDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-elevated z-50 p-1.5">
                <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Indian & Global Languages
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLangDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-left transition-colors ${
                        currentLanguage === lang.code
                          ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{lang.native}</span>
                      <span className="text-[11px] text-slate-400">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Alerts Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAlertsDropdown(!showAlertsDropdown);
                setShowLangDropdown(false);
              }}
              className="relative p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors"
              title="Active Weather Alerts"
            >
              <Bell className="w-4 h-4" />
              {alerts && alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {alerts.length}
                </span>
              )}
            </button>

            {showAlertsDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-elevated z-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t('alertsTitle')}</span>
                  </div>
                  <Link
                    to="/alerts"
                    onClick={() => setShowAlertsDropdown(false)}
                    className="text-[11px] text-brand-500 hover:underline"
                  >
                    {t('viewAllAlerts')}
                  </Link>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {alerts && alerts.length > 0 ? (
                    alerts.slice(0, 3).map((a) => (
                      <div
                        key={a.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs"
                      >
                        <div className="flex items-center justify-between font-medium text-slate-900 dark:text-slate-100 mb-1">
                          <span>{a.title}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              a.severity === 'Extreme'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {a.severity}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-2">
                          {a.headline}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-3">
                      {t('noActiveAlerts')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle (Dark / Light) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          {/* User Profile Avatar */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white text-xs font-semibold flex items-center justify-center shadow-subtle">
              AI
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
