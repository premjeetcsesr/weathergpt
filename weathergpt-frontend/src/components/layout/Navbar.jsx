import React, { useState, useEffect } from 'react';
import {
  CloudLightning,
  Globe,
  Bell,
  Sparkles,
  AlertTriangle,
  User,
  LogOut,
  Settings as SettingsIcon,
  LayoutDashboard,
  MapPin,
  CheckCircle,
  ShieldCheck,
  Check,
  Menu,
  X,
  Bot,
  Map,
  BarChart3,
  Users,
  ChevronRight,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useWeather } from '../../context/WeatherContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/notificationApi';

export function Navbar() {
  const { tempUnit, setTempUnit, alerts, wsStatus, triggerAlertToast } = useWeather();
  const { currentLanguage, setLanguage, languages, t } = useLanguage();
  const { user, isAuthenticated, logout, updatePreferences } = useAuth();
  const navigate = useNavigate();

  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileNavMenu, setShowMobileNavMenu] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications on mount and periodically
  const fetchNotificationsData = async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
      const res = await getNotifications(false);
      if (res.success && res.data?.items) {
        setNotifications(res.data.items);
      }
    } catch (e) {
      console.warn('Failed to load notifications in navbar:', e);
    }
  };

  useEffect(() => {
    fetchNotificationsData();
    const interval = setInterval(fetchNotificationsData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const toggleTempUnit = async () => {
    const nextUnit = tempUnit === 'C' ? 'F' : 'C';
    setTempUnit(nextUnit);
    if (isAuthenticated) {
      await updatePreferences({ unit: nextUnit === 'C' ? 'celsius' : 'fahrenheit' });
    }
  };

  const handleMarkAsRead = async (id) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const navMenuItems = [
    { to: '/', label: 'AI Assistant', icon: Sparkles, badge: null },
    { to: '/dashboard', label: t('navDashboard') || 'Dashboard', icon: LayoutDashboard, badge: null },
    { to: '/map', label: t('navMap') || 'Weather Map', icon: Map, badge: null },
    { to: '/alerts', label: t('navAlerts') || 'Severe Alerts', icon: AlertTriangle, badge: alerts?.length > 0 ? alerts.length : null },
    { to: '/climate', label: t('navClimate') || 'Climate Analytics', icon: BarChart3, badge: null },
    { to: '/community-reports', label: t('navCommunityReports') || 'Community Reports', icon: Users, badge: null },
    { to: '/settings', label: t('navSettings') || 'Settings', icon: SettingsIcon, badge: null },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0c1527]/95 backdrop-blur-md border-b border-[#1a2c4e] transition-colors pt-[max(env(safe-area-inset-top,0px),0.25rem)]">
      <div className="w-full px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={() => setShowMobileNavMenu(false)}
          className="flex items-center gap-2 group shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform duration-200">
            <CloudLightning className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base md:text-lg tracking-tight bg-gradient-to-r from-slate-900 via-brand-600 to-sky-500 dark:from-white dark:via-brand-400 dark:to-sky-300 bg-clip-text text-transparent">
                WeatherGPT
              </span>
              <span className="hidden sm:inline px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden lg:block leading-none mt-0.5">
              {t('tagline')}
            </p>
          </div>
        </Link>

        {/* Desktop Quick Mode Switcher */}
        <div className="hidden md:flex items-center bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold shadow-inner">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`
            }
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            <span>AI Assistant</span>
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`
            }
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>{t('navDashboard') || 'Dashboard'}</span>
          </NavLink>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          
          {/* Desktop WebSocket Status */}
          <div
            className="hidden lg:flex items-center text-xs font-semibold"
            title={`Real-Time WebSocket: ${wsStatus}`}
          >
            {wsStatus === 'connected' && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live</span>
              </span>
            )}
            {wsStatus === 'connecting' && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                <span>Syncing</span>
              </span>
            )}
          </div>

          {/* Temperature Toggle (°C / °F) */}
          <button
            type="button"
            onClick={toggleTempUnit}
            title="Toggle °C / °F"
            className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl p-1 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <span
              className={`px-1.5 py-0.5 rounded-lg text-[11px] transition-all ${
                tempUnit === 'C'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              °C
            </span>
            <span
              className={`px-1.5 py-0.5 rounded-lg text-[11px] transition-all ${
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
                setShowUserDropdown(false);
                setShowMobileNavMenu(false);
              }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-brand-500" />
              <span className="hidden sm:inline font-semibold">
                {languages.find((l) => l.code === currentLanguage)?.native || 'English'}
              </span>
              <span className="sm:hidden font-bold uppercase text-[11px]">{currentLanguage}</span>
            </button>

            {showLangDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-elevated z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Languages
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
                          ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{lang.native}</span>
                      <span className="text-[10px] text-slate-400">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAlertsDropdown(!showAlertsDropdown);
                setShowLangDropdown(false);
                setShowUserDropdown(false);
                setShowMobileNavMenu(false);
                if (!showAlertsDropdown) fetchNotificationsData();
              }}
              className="relative p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors"
              title="Weather Alerts & Notifications"
            >
              <Bell className="w-4 h-4" />
              {(unreadCount > 0 || (alerts && alerts.length > 0)) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount || alerts?.length}
                </span>
              )}
            </button>

            {showAlertsDropdown && (
              <div className="absolute right-0 mt-2 w-72 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 p-3.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Weather Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {notifications && notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.is_read) handleMarkAsRead(n.id);
                          setShowAlertsDropdown(false);
                          triggerAlertToast({
                            id: n.id,
                            event: n.title,
                            severity: n.severity === 'critical' ? 'extreme' : (n.severity === 'high' ? 'severe' : 'moderate'),
                            location: n.location,
                            headline: n.message,
                            description: n.message,
                          });
                        }}
                        className={`p-2.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] ${
                          n.is_read
                            ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                            : 'bg-brand-50/40 dark:bg-brand-950/30 border-brand-200/80 dark:border-brand-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1">
                            {!n.is_read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block" />
                            )}
                            {n.title}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              n.severity === 'high' || n.severity === 'critical'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {n.severity}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                          {n.message}
                        </p>
                        {n.location && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                            <MapPin className="w-3 h-3 text-brand-500" />
                            <span>{n.location}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      <CheckCircle className="w-8 h-8 mx-auto text-emerald-500/60 mb-2" />
                      <p className="font-medium text-slate-600 dark:text-slate-300">All clear</p>
                      <p className="text-[11px] mt-0.5">No severe weather alerts in your region</p>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                  <Link
                    to="/alerts"
                    onClick={() => setShowAlertsDropdown(false)}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    View Alert Map & History →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Desktop User Auth Profile / Sign In */}
          <div className="hidden md:block relative pl-1 border-l border-slate-200 dark:border-slate-800">
            {isAuthenticated && user ? (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(!showUserDropdown);
                    setShowLangDropdown(false);
                    setShowAlertsDropdown(false);
                  }}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[90px] truncate">
                    {user.username}
                  </span>
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl z-50 p-3 animate-in fade-in">
                    <div className="flex items-center gap-2.5 pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-500 text-white font-bold text-sm flex items-center justify-center shadow-subtle">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {user.full_name || user.username}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between px-2.5 py-1.5 text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-brand-500" /> Default City
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {user.preferences?.default_city || 'No location selected'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between px-2.5 py-1.5 text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> MongoDB Sync
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                          Connected
                        </span>
                      </div>

                      <Link
                        to="/settings"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <SettingsIcon className="w-4 h-4 text-slate-400" />
                        <span>Account & Weather Settings</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setShowUserDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors font-medium text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth?tab=login"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white rounded-xl text-xs font-semibold shadow-glow transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          {/* Mobile Top Navigation Menu Trigger */}
          <div className="relative md:hidden">
            <button
              type="button"
              onClick={() => {
                setShowMobileNavMenu(!showMobileNavMenu);
                setShowLangDropdown(false);
                setShowAlertsDropdown(false);
              }}
              className="flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 transition-colors"
              aria-label="Navigation Menu"
            >
              {showMobileNavMenu ? (
                <X className="w-4 h-4 text-brand-500" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Top Dropdown Drawer Menu */}
      {showMobileNavMenu && (
        <>
          <div
            className="md:hidden fixed inset-0 top-14 z-40 bg-slate-950/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setShowMobileNavMenu(false)}
          />
          <div className="md:hidden fixed top-14 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xl p-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-top duration-200">
            
            {/* User Profile / Auth Header on Mobile */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-brand-500/10 via-sky-500/5 to-slate-50 dark:to-slate-800/80 border border-brand-200/60 dark:border-brand-900/60 mb-3">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 text-white font-bold text-sm flex items-center justify-center shadow-sm shrink-0">
                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {user.full_name || user.username}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setShowMobileNavMenu(false);
                    }}
                    className="p-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-xs font-semibold shrink-0"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">WeatherGPT Cloud Account</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Sign in to sync your conversation history, alerts & favorite cities.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      to="/auth?tab=login"
                      onClick={() => setShowMobileNavMenu(false)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-brand-600 to-sky-500 text-white rounded-xl text-xs font-bold shadow-sm"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </Link>
                    <Link
                      to="/auth?tab=signup"
                      onClick={() => setShowMobileNavMenu(false)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Register</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Preferences Row */}
            <div className="mb-3">
              {/* Temp Unit Toggle */}
              <button
                type="button"
                onClick={toggleTempUnit}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300"
              >
                <span>Temperature Unit</span>
                <span className="px-2.5 py-1 rounded-lg bg-brand-500 text-white font-bold text-[11px]">
                  °{tempUnit}
                </span>
              </button>
            </div>

            {/* Navigation Links Grid */}
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Menu & Views
              </div>
              <div className="grid grid-cols-1 gap-1">
                {navMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setShowMobileNavMenu(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-brand-500" />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-bold">
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>

          </div>
        </>
      )}
    </header>
  );
}

export default Navbar;
