import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  Filter, 
  ShieldAlert, 
  CloudRain, 
  Flame, 
  Waves, 
  Wind, 
  Zap, 
  Radio, 
  History, 
  BellRing, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { AlertCard } from '../components/alerts/AlertCard';
import { useLanguage } from '../context/LanguageContext';
import { useWeather } from '../context/WeatherContext';
import { 
  getActiveAlerts, 
  getAlertHistory, 
  createAlertSubscription, 
  getAlertSubscriptions, 
  deleteAlertSubscription 
} from '../services/alertApi';
import { Loading } from '../components/common/Loading';

const SEVERITY_RANK = {
  extreme: 4,
  severe: 3,
  moderate: 2,
  minor: 1,
  information: 1,
};

export function Alerts() {
  const { t } = useLanguage();
  const { selectedCity, wsStatus, triggerAlertToast } = useWeather();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history' | 'subscriptions'
  const [alerts, setAlerts] = useState([]);
  const [historyAlerts, setHistoryAlerts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  // Subscription Form State
  const [subCity, setSubCity] = useState('');
  const [subSeverity, setSubSeverity] = useState('moderate');
  const [subSuccess, setSubSuccess] = useState('');
  const [subError, setSubError] = useState('');

  const filterOptions = [
    { id: 'All', label: t('filterAll') || 'All', icon: Filter },
    { id: 'minor', label: 'Minor', icon: Wind },
    { id: 'moderate', label: 'Moderate', icon: CloudRain },
    { id: 'severe', label: 'Severe', icon: Zap },
    { id: 'extreme', label: 'Extreme', icon: Flame },
  ];

  // Fetch active alerts from backend
  const fetchActiveAlerts = useCallback(async () => {
    setLoading(true);
    const res = await getActiveAlerts(selectedCity, activeFilter !== 'All' ? activeFilter : '');
    if (res.success && res.alerts) {
      // Sort by priority EXTREME > SEVERE > MODERATE > MINOR
      const sorted = [...res.alerts].sort((a, b) => {
        const rA = SEVERITY_RANK[(a.severity || '').toLowerCase()] || 0;
        const rB = SEVERITY_RANK[(b.severity || '').toLowerCase()] || 0;
        return rB - rA;
      });
      setAlerts(sorted);
    } else {
      setAlerts([]);
    }
    setLoading(false);
  }, [selectedCity, activeFilter]);

  // Fetch alert history
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const res = await getAlertHistory(selectedCity, '', activeFilter !== 'All' ? activeFilter : '');
    if (res.success) {
      setHistoryAlerts(res.alerts);
    }
    setLoading(false);
  }, [selectedCity, activeFilter]);

  // Fetch user subscriptions
  const fetchSubs = useCallback(async () => {
    const res = await getAlertSubscriptions();
    if (res.success) {
      setSubscriptions(res.subscriptions);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'active') {
      fetchActiveAlerts();
    } else if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'subscriptions') {
      fetchSubs();
    }
  }, [activeTab, fetchActiveAlerts, fetchHistory, fetchSubs]);

  // Handle Add Subscription
  const handleAddSubscription = async (e) => {
    e.preventDefault();
    if (!subCity.trim()) return;

    setSubSuccess('');
    setSubError('');

    const res = await createAlertSubscription(subCity.trim(), subSeverity);
    if (res.success) {
      setSubSuccess(`Subscribed to ${subCity.trim()} alerts successfully!`);
      setSubCity('');
      fetchSubs();
    } else {
      setSubError(res.error || 'Failed to create subscription.');
    }
  };

  // Handle Delete Subscription
  const handleDeleteSub = async (subId) => {
    const res = await deleteAlertSubscription(subId);
    if (res.success) {
      setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
    }
  };

  const countBySeverity = {
    extreme: alerts.filter((a) => (a.severity || '').toLowerCase() === 'extreme').length,
    severe: alerts.filter((a) => (a.severity || '').toLowerCase() === 'severe').length,
    moderate: alerts.filter((a) => (a.severity || '').toLowerCase() === 'moderate').length,
    minor: alerts.filter((a) => (a.severity || '').toLowerCase() === 'minor').length,
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header with WebSocket Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-500/20 text-orange-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {t('alertsTitle') || 'Emergency Alerts & Warnings'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time meteorological warnings, live WebSocket broadcasts, and proactive disaster protection protocols.
          </p>
        </div>

        {/* WebSocket Connection Status Pill & Test Alert Button */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              triggerAlertToast({
                id: `demo-alert-${Date.now()}`,
                event: 'Severe Weather Warning',
                severity: 'severe',
                location: selectedCity,
                headline: `Intense meteorological advisory issued for ${selectedCity}. Heavy wind gusts and rain expected.`,
                description: `High-reflectivity radar echo detected near ${selectedCity}. Avoid low-lying flooded areas and secure loose outdoor belongings.`,
                starts_at: new Date().toISOString(),
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-bold transition-colors shadow-sm"
            title="Preview Alert Notification Popup"
          >
            <BellRing className="w-3.5 h-3.5 animate-bounce" />
            <span>Test Alert Popup</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <Radio className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[11px]">WebSocket:</span>
            {wsStatus === 'connected' && (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Stream
              </span>
            )}
            {wsStatus === 'connecting' && (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Connecting
              </span>
            )}
            {wsStatus === 'disconnected' && (
              <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Disconnected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'active'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Active Alerts</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {alerts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'subscriptions'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BellRing className="w-3.5 h-3.5" />
          <span>Location Subscriptions</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {subscriptions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Alert History</span>
        </button>
      </div>

      {/* Tab 1: ACTIVE ALERTS */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {/* Summary Stat Cards (EXTREME > SEVERE > MODERATE > MINOR) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-3xl bg-red-50/80 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-900/60 shadow-subtle">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400 block">
                EXTREME
              </span>
              <span className="text-2xl sm:text-3xl font-black text-red-700 dark:text-red-200">
                {countBySeverity.extreme}
              </span>
              <span className="text-[10px] text-red-500 block mt-0.5 font-medium">Life hazard imminent</span>
            </div>

            <div className="p-4 rounded-3xl bg-orange-50/80 dark:bg-orange-950/40 border-2 border-orange-300 dark:border-orange-900/60 shadow-subtle">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400 block">
                SEVERE
              </span>
              <span className="text-2xl sm:text-3xl font-black text-orange-700 dark:text-orange-200">
                {countBySeverity.severe}
              </span>
              <span className="text-[10px] text-orange-500 block mt-0.5 font-medium">High disruption expected</span>
            </div>

            <div className="p-4 rounded-3xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-subtle">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                MODERATE
              </span>
              <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-200">
                {countBySeverity.moderate}
              </span>
              <span className="text-[10px] text-amber-500 block mt-0.5 font-medium">Be prepared & monitor</span>
            </div>

            <div className="p-4 rounded-3xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 shadow-subtle">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                MINOR
              </span>
              <span className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-blue-200">
                {countBySeverity.minor}
              </span>
              <span className="text-[10px] text-blue-500 block mt-0.5 font-medium">General awareness</span>
            </div>
          </div>

          {/* Severity Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {filterOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = activeFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActiveFilter(opt.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Alerts List */}
          {loading ? (
            <Loading message="Syncing real-time meteorological warnings..." />
          ) : alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <AlertCard key={alert.id || alert.alert_id} alert={alert} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                No active severe weather alerts detected for {selectedCity}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No official severe disaster or storm warnings are currently issued by meteorological authorities for this location.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: LOCATION SUBSCRIPTIONS */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          {/* Add Subscription Form Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-brand-500" />
              <span>Subscribe to Location Weather Warnings</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Receive automatic real-time WebSocket notifications whenever new alerts are issued for your monitored cities.
            </p>

            <form onSubmit={handleAddSubscription} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  City Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kanpur, Lucknow, Delhi"
                  value={subCity}
                  onChange={(e) => setSubCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="w-full sm:w-48">
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Severity Threshold
                </label>
                <select
                  value={subSeverity}
                  onChange={(e) => setSubSeverity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="minor">Minor & Above</option>
                  <option value="moderate">Moderate & Above</option>
                  <option value="severe">Severe & Extreme Only</option>
                  <option value="extreme">Extreme Hazards Only</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Subscribe</span>
              </button>
            </form>

            {subSuccess && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{subSuccess}</span>
              </div>
            )}
            {subError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-semibold">
                {subError}
              </div>
            )}
          </div>

          {/* Subscriptions List */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
              Active Subscriptions ({subscriptions.length})
            </h3>
            {subscriptions.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                        {sub.location?.city || sub.location?.name}
                      </span>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Threshold: <strong className="capitalize">{sub.severity_threshold}</strong> • Status: Active
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSub(sub.id)}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Delete Subscription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                No location alert subscriptions saved yet. Add a city above to receive real-time notifications.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: ALERT HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Historical Weather Alerts for {selectedCity}
            </h3>
            <button
              type="button"
              onClick={fetchHistory}
              className="flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
            >
              <RefreshCw className="w-3 h-3" /> Refresh History
            </button>
          </div>

          {loading ? (
            <Loading message="Loading alert archive records..." />
          ) : historyAlerts.length > 0 ? (
            <div className="space-y-3">
              {historyAlerts.map((alert) => (
                <AlertCard key={alert.id || alert.alert_id} alert={alert} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <History className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                No historical archived alerts for {selectedCity}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Historical alerts will appear here as provider alerts are detected and archived.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
