import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Map,
  AlertTriangle,
  BarChart3,
  Settings,
  Users,
  Menu,
  X,
  Sparkles,
  User,
  LogIn,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useWeather } from '../../context/WeatherContext';
import { useAuth } from '../../context/AuthContext';

export function MobileNav() {
  const { t } = useLanguage();
  const { alerts } = useWeather();
  const { user, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const primaryItems = [
    { to: '/', label: 'Assistant', icon: Sparkles, isSpecial: true },
    { to: '/dashboard', label: t('navDashboard') || 'Dashboard', icon: LayoutDashboard },
    { to: '/map', label: t('navMap') || 'Map', icon: Map },
    { to: '/alerts', label: t('navAlerts') || 'Alerts', icon: AlertTriangle, badge: alerts?.length > 0 ? alerts.length : null },
  ];

  const moreItems = [
    { to: '/community-reports', label: t('navCommunityReports') || 'Community', icon: Users },
    { to: '/climate', label: t('navClimate') || 'Climate Analytics', icon: BarChart3 },
    { to: '/settings', label: t('navSettings') || 'Settings', icon: Settings },
    {
      to: isAuthenticated ? '/settings' : '/auth?tab=login',
      label: isAuthenticated ? (user?.username || 'My Account') : 'Sign In',
      icon: isAuthenticated ? User : LogIn,
    },
  ];

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      {isMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={closeMenu}
          className="md:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
        />
      )}

      <div
        className={`md:hidden fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xl transition-all duration-200 ${
          isMenuOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
        aria-hidden={!isMenuOpen}
      >
        <div className="flex items-center gap-2 px-2 pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800">
          <Sparkles className="w-4 h-4 text-brand-500" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">WeatherGPT Quick Menu</span>
          <span className="ml-auto text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Features</span>
        </div>
        <nav className="grid grid-cols-2 gap-2">
          {moreItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300'
                      : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
              >
                <span className="relative">
                  <Icon className="w-4 h-4 text-brand-500" />
                  {item.badge && (
                    <span className="absolute -top-2 -right-2 min-w-3.5 h-3.5 rounded-full bg-red-500 px-0.5 text-[9px] text-white text-center font-bold">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 pt-1 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-elevated">
        <nav className="flex items-center justify-around max-w-md mx-auto">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={closeMenu}
                className={({ isActive }) =>
                  `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl transition-all relative ${
                    isActive
                      ? 'text-brand-600 dark:text-brand-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`
                }
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${item.isSpecial ? 'text-brand-500' : ''}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight truncate max-w-[70px]">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
          
          {/* More Toggle */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl transition-all ${
              isMenuOpen
                ? 'text-brand-600 dark:text-brand-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        </nav>
      </div>
    </>
  );
}

export default MobileNav;
