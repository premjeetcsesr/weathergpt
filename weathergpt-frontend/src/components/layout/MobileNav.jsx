import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Bot, Map, AlertTriangle, BarChart3, Settings, Users } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useWeather } from '../../context/WeatherContext';

export function MobileNav() {
  const { t } = useLanguage();
  const { alerts } = useWeather();

  const navItems = [
    { to: '/', label: t('navAssistant') || 'Assistant', icon: Bot, isSpecial: true },
    { to: '/dashboard', label: t('navDashboard'), icon: LayoutDashboard },
    { to: '/map', label: t('navMap'), icon: Map },
    { to: '/community-reports', label: t('navCommunityReports') || 'Reports', icon: Users },
    { to: '/alerts', label: t('navAlerts'), icon: AlertTriangle, badge: alerts?.length > 0 ? alerts.length : null },
    { to: '/climate', label: t('navClimate'), icon: BarChart3 },
    { to: '/settings', label: t('navSettings'), icon: Settings }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 transition-colors shadow-elevated">
      <nav className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all relative ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${item.isSpecial ? 'text-brand-500' : ''}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[54px]">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
