import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bot, 
  Map, 
  AlertTriangle, 
  BarChart3, 
  Settings,
  Sparkles,
  Zap
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useWeather } from '../../context/WeatherContext';

export function Sidebar() {
  const { t } = useLanguage();
  const { alerts } = useWeather();

  const navItems = [
    {
      to: '/',
      label: t('navDashboard'),
      icon: LayoutDashboard,
      badge: null
    },
    {
      to: '/assistant',
      label: t('navAssistant'),
      icon: Bot,
      badge: 'AI',
      badgeClass: 'bg-brand-500 text-white'
    },
    {
      to: '/map',
      label: t('navMap'),
      icon: Map,
      badge: 'Live',
      badgeClass: 'bg-emerald-500 text-white'
    },
    {
      to: '/alerts',
      label: t('navAlerts'),
      icon: AlertTriangle,
      badge: alerts?.length > 0 ? alerts.length : null,
      badgeClass: 'bg-red-500 text-white'
    },
    {
      to: '/climate',
      label: t('navClimate'),
      icon: BarChart3,
      badge: null
    },
    {
      to: '/settings',
      label: t('navSettings'),
      icon: Settings,
      badge: null
    }
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 min-h-[calc(100vh-4rem)] p-4 transition-colors">
      {/* Navigation Links */}
      <nav className="space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 shadow-subtle border border-brand-200/60 dark:border-brand-800/60'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeClass}`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Proactive WeatherGPT AI Widget Callout */}
      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-brand-900/90 via-slate-900 to-indigo-950 text-white shadow-elevated border border-brand-800/40 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-brand-500/20 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-2 text-brand-300 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Atmospheric Engine</span>
          </div>
          <p className="text-[11px] text-slate-300 mb-2.5 leading-relaxed">
            Hyperlocal precipitation modeling powered by machine intelligence.
          </p>
          <NavLink
            to="/assistant"
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Ask WeatherGPT</span>
          </NavLink>
        </div>
      </div>
    </aside>
  );
}
