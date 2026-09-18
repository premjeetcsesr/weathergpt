import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useWeather } from '../context/WeatherContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { 
  Settings as SettingsIcon, 
  Globe, 
  Thermometer, 
  Wind, 
  Bell, 
  Volume2, 
  Palette, 
  Check, 
  Save, 
  MapPin,
  User,
  ShieldCheck,
  Sparkles,
  LogOut
} from 'lucide-react';

export function Settings() {
  const { currentLanguage, setLanguage, languages, t } = useLanguage();
  const { tempUnit, setTempUnit, windUnit, setWindUnit, selectedCity, searchCity } = useWeather();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, openAuthModal, logout, updatePreferences } = useAuth();

  const [pushAlerts, setPushAlerts] = useState(() => (
    localStorage.getItem('weathergpt_push_alerts') !== 'false'
  ));
  const [morningDigest, setMorningDigest] = useState(true);
  const [rainWarnings, setRainWarnings] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [defaultCityInput, setDefaultCityInput] = useState(selectedCity);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    if (user?.preferences?.default_city) {
      setDefaultCityInput(user.preferences.default_city);
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (defaultCityInput.trim()) {
      searchCity(defaultCityInput.trim());
    }

    if (isAuthenticated) {
      await updatePreferences({
        unit: tempUnit === 'C' ? 'celsius' : 'fahrenheit',
        language: currentLanguage,
        default_city: defaultCityInput.trim() || 'Kanpur',
        theme: theme === 'system' ? 'dark' : theme,
      });
    }

    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const handlePushAlertsChange = async (enabled) => {
    setPushAlerts(enabled);
    localStorage.setItem('weathergpt_push_alerts', String(enabled));
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('settingsTitle')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('settingsSubtitle')}
          </p>
        </div>

        {/* Saved Toast */}
        {showSavedToast && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-500 text-white text-xs font-semibold shadow-glow animate-bounce">
            <Check className="w-4 h-4" />
            <span>{t('savedSuccess')}</span>
          </div>
        )}
      </div>

      {/* User Account & MongoDB Sync Card */}
      <div className="rounded-3xl p-6 bg-gradient-to-br from-brand-500/10 via-sky-500/5 to-white dark:to-slate-900 border border-brand-200/60 dark:border-brand-900/60 shadow-card">
        {isAuthenticated && user ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 text-white text-lg font-bold flex items-center justify-center shadow-md">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {user.full_name || user.username}
                  </h3>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-3 h-3" /> MongoDB Connected
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/40 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Sync with MongoDB Cloud
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sign in or create an account to save chat history, favorite locations & custom alerts.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white rounded-2xl text-xs font-semibold shadow-glow transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* 1. Language & Regional Settings */}
        <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Globe className="w-4 h-4 text-brand-500" />
            <span>{t('languageSection')}</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                {t('selectLanguage')} (English & Indian Languages)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold transition-all ${
                      currentLanguage === lang.code
                        ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-600 dark:text-brand-400 shadow-subtle'
                        : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{lang.native}</span>
                    <span className="text-[11px] text-slate-400 font-normal">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Units & Default Location */}
        <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Thermometer className="w-4 h-4 text-amber-500" />
            <span>Units & Default Location</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Temperature Unit */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                {t('temperatureUnit')}
              </label>
              <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setTempUnit('C')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    tempUnit === 'C'
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t('celsius')}
                </button>
                <button
                  type="button"
                  onClick={() => setTempUnit('F')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    tempUnit === 'F'
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t('fahrenheit')}
                </button>
              </div>
            </div>

            {/* Wind Unit */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                {t('windUnit')}
              </label>
              <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setWindUnit('kmh')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    windUnit === 'kmh'
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  km/h
                </button>
                <button
                  type="button"
                  onClick={() => setWindUnit('mph')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                    windUnit === 'mph'
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  mph
                </button>
              </div>
            </div>

            {/* Default City */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Default Monitoring Location
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={defaultCityInput}
                  onChange={(e) => setDefaultCityInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Appearance (Theme) */}
        <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Palette className="w-4 h-4 text-indigo-500" />
            <span>{t('themeSection')}</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: t('themeLight'), icon: '☀️' },
              { id: 'dark', label: t('themeDark'), icon: '🌙' },
              { id: 'system', label: t('themeSystem'), icon: '💻' }
            ].map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => setTheme(th.id)}
                className={`p-3.5 rounded-2xl border text-xs font-semibold text-center transition-all ${
                  theme === th.id
                    ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-600 dark:text-brand-400 shadow-subtle'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="text-base block mb-1">{th.icon}</span>
                <span>{th.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Notification Preferences & Voice */}
        <div className="rounded-3xl p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Bell className="w-4 h-4 text-red-500" />
            <span>{t('notificationsSection')}</span>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {t('enablePushAlerts')}
              </span>
              <input
                type="checkbox"
                checked={pushAlerts}
                onChange={(e) => handlePushAlertsChange(e.target.checked)}
                className="w-4 h-4 accent-brand-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {t('morningDigest')}
              </span>
              <input
                type="checkbox"
                checked={morningDigest}
                onChange={(e) => setMorningDigest(e.target.checked)}
                className="w-4 h-4 accent-brand-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {t('rainWarnings')}
              </span>
              <input
                type="checkbox"
                checked={rainWarnings}
                onChange={(e) => setRainWarnings(e.target.checked)}
                className="w-4 h-4 accent-brand-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
              <div className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {t('enableVoice')}
                </span>
              </div>
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="w-4 h-4 accent-brand-500 rounded"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-glow transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{t('saveChanges')}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
