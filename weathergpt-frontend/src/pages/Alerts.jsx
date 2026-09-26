import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  RefreshCw,
  AlertCircle,
  Users,
  MapPin,
  Camera,
  Map as MapIcon,
  ArrowUpRight,
  Clock,
  ExternalLink,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AlertCard } from '../components/alerts/AlertCard';
import { useLanguage } from '../context/LanguageContext';
import { useWeather } from '../context/WeatherContext';
import { useAuth } from '../context/AuthContext';
import { 
  getActiveAlerts, 
  getAlertHistory, 
  createAlertSubscription, 
  getAlertSubscriptions, 
  deleteAlertSubscription 
} from '../services/alertApi';
import {
  fetchAllActiveReports,
  fetchMyReports,
  deleteCommunityReport,
  getStoredReports,
  INITIAL_COMMUNITY_REPORTS,
  REPORT_CATEGORIES
} from '../services/communityReportsApi';
import { ReportModal } from '../components/community/ReportModal';
import { Loading } from '../components/common/Loading';

const SEVERITY_RANK = {
  extreme: 4,
  severe: 3,
  moderate: 2,
  minor: 1,
  information: 1,
};

function formatRelativeTime(isoString) {
  if (!isoString) return 'Recently';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'Recently';
  }
}

export function Alerts() {
  const { t } = useLanguage();
  const { selectedCity, wsStatus } = useWeather();
  const { isAuthenticated, openAuthModal } = useAuth();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'incidents' | 'subscriptions' | 'history'
  const [alerts, setAlerts] = useState([]);
  const [historyAlerts, setHistoryAlerts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState('');
  const [providerNote, setProviderNote] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // Citizen Incident Reports State - ALWAYS initialized with stored reports so they never vanish
  const [communityReports, setCommunityReports] = useState(() => getStoredReports());
  const [myReports, setMyReports] = useState(() => {
    try {
      const cached = localStorage.getItem('weathergpt_user_my_reports');
      if (cached) {
        const p = JSON.parse(cached);
        if (Array.isArray(p) && p.length > 0) return p;
      }
    } catch {}
    return INITIAL_COMMUNITY_REPORTS.slice(0, 3);
  });
  const [incidentViewMode, setIncidentViewMode] = useState('all'); // 'all' | 'my'
  const [incidentCategoryFilter, setIncidentCategoryFilter] = useState('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

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
    if (!selectedCity || !selectedCity.trim()) {
      setAlerts([]);
      setRequestError('Select a city to load live weather alerts.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setRequestError('');
    setProviderNote('');
    const res = await getActiveAlerts(selectedCity, activeFilter !== 'All' ? activeFilter : '');
    if (res.success && res.alerts) {
      const sorted = [...res.alerts].sort((a, b) => {
        const rA = SEVERITY_RANK[(a.severity || '').toLowerCase()] || 0;
        const rB = SEVERITY_RANK[(b.severity || '').toLowerCase()] || 0;
        return rB - rA;
      });
      setAlerts(sorted);
      setProviderNote(res.providerNote || '');
    } else {
      setAlerts([]);
      setRequestError(res.error || 'Unable to load live weather alerts.');
    }
    setLoading(false);
  }, [selectedCity, activeFilter]);

  // Fetch community incidents & user's own submissions
  const fetchIncidents = useCallback(async () => {
    try {
      const items = await fetchAllActiveReports();
      if (Array.isArray(items) && items.length > 0) {
        setCommunityReports(items);
      }
    } catch (err) {
      console.warn('Could not load community reports:', err);
    }
    try {
      const my = await fetchMyReports();
      if (Array.isArray(my) && my.length > 0) {
        setMyReports(my);
      }
    } catch (err) {
      console.warn('Could not load personal reports:', err);
    }
  }, []);

  // Fetch alert history
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setRequestError('');
    const res = await getAlertHistory(selectedCity, '', activeFilter !== 'All' ? activeFilter : '');
    if (res.success) {
      setHistoryAlerts(res.alerts);
    } else {
      setRequestError('Unable to load alert history.');
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
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    if (activeTab === 'active') {
      fetchActiveAlerts();
    } else if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'subscriptions') {
      fetchSubs();
    }
  }, [activeTab, fetchActiveAlerts, fetchHistory, fetchSubs]);

  // Listen for real-time newly created reports
  useEffect(() => {
    const handleNewReport = (event) => {
      const rep = event.detail;
      if (rep) {
        setCommunityReports((prev) => [rep, ...prev.filter((p) => p.id !== rep.id)]);
        if (isAuthenticated) {
          setMyReports((prev) => [rep, ...prev.filter((p) => p.id !== rep.id)]);
        }
      }
    };
    window.addEventListener('community-report-added', handleNewReport);
    return () => window.removeEventListener('community-report-added', handleNewReport);
  }, [isAuthenticated]);

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

  // Handle Delete Incident
  const handleDeleteIncident = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this incident submission?')) return;
    try {
      await deleteCommunityReport(reportId);
      setMyReports((prev) => prev.filter((r) => r.id !== reportId));
      setCommunityReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err) {
      alert(err.message || 'Failed to delete report.');
    }
  };

  const countBySeverity = {
    extreme: alerts.filter((a) => (a.severity || '').toLowerCase() === 'extreme').length,
    severe: alerts.filter((a) => (a.severity || '').toLowerCase() === 'severe').length,
    moderate: alerts.filter((a) => (a.severity || '').toLowerCase() === 'moderate').length,
    minor: alerts.filter((a) => (a.severity || '').toLowerCase() === 'minor').length,
  };

  // Community reports filtered for the selected city or zone
  const activeZoneIncidents = useMemo(() => {
    if (!selectedCity) return communityReports;
    const cityLow = selectedCity.toLowerCase();
    const matched = communityReports.filter((r) => {
      const loc = (r.location_name || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();
      return loc.includes(cityLow) || desc.includes(cityLow);
    });
    return matched.length > 0 ? matched : communityReports;
  }, [communityReports, selectedCity]);

  // Incidents for the Dedicated Incident Tab
  const displayedTabIncidents = useMemo(() => {
    const sourceList = incidentViewMode === 'my' ? myReports : communityReports;
    if (incidentCategoryFilter === 'all') return sourceList;
    return sourceList.filter((r) => r.category === incidentCategoryFilter);
  }, [incidentViewMode, myReports, communityReports, incidentCategoryFilter]);

  return (
    <div className="space-y-6 max-w-screen-2xl mx-auto pb-12 transition-all duration-300">
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
            Real-time meteorological warnings, citizen ground truth incident telemetry, and proactive disaster protection protocols.
          </p>
        </div>

        {/* Action & WebSocket Connection Status Pill */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated && openAuthModal) {
                openAuthModal();
              } else {
                setIsReportModalOpen(true);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Report Incident</span>
          </button>

          <Link
            to="/map"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-sm"
          >
            <MapIcon className="w-3.5 h-3.5 text-sky-500" />
            <span>Hazard Map</span>
          </Link>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
            <Radio className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[11px]">Stream:</span>
            {wsStatus === 'connected' && (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
            {wsStatus === 'connecting' && (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Syncing
              </span>
            )}
            {wsStatus === 'disconnected' && (
              <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Offline
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'active'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Active Alerts</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {alerts.length + activeZoneIncidents.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('incidents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'incidents'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Citizen Incidents</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {communityReports.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
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
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'history'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Alert History</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: ACTIVE ALERTS (Official Meteorological + Citizen Alerts) */}
      {/* ============================================================== */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
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
                CITIZEN REPORTS
              </span>
              <span className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-blue-200">
                {activeZoneIncidents.length}
              </span>
              <span className="text-[10px] text-blue-500 block mt-0.5 font-medium">Ground hazard observations</span>
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

          {/* Official Meteorological Alerts List */}
          {loading ? (
            <Loading message="Syncing real-time meteorological warnings..." />
          ) : requestError ? (
            <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-3xl border border-red-200 dark:border-red-900/50">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Unable to load official alerts
              </h3>
              <p className="text-xs text-red-500 dark:text-red-400 mt-1 max-w-md mx-auto">
                {requestError}
              </p>
            </div>
          ) : alerts.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                <span>Official Meteorological Warnings ({alerts.length})</span>
              </h3>
              {alerts.map((alert) => (
                <AlertCard key={alert.id || alert.alert_id} alert={alert} />
              ))}
            </div>
          ) : (
            <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Official Government Storm Advisories for {selectedCity || 'Selected Region'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {providerNote || 'Standard atmospheric metrics are stable according to radar telemetry.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CITIZEN GROUND-TRUTH HAZARD ALERTS SECTION */}
          {activeZoneIncidents.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-orange-500/15 text-orange-500 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Citizen Ground-Truth Hazard Alerts</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400">
                        {activeZoneIncidents.length} Active
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      User-reported conditions: waterlogging, heavy rain, road blockages, and severe local events.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('incidents')}
                  className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                >
                  <span>View All Citizen Reports</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {activeZoneIncidents.map((report) => {
                  const repLat = report.latitude ?? report.location?.latitude ?? (Array.isArray(report.location?.coordinates) ? report.location.coordinates[1] : null);
                  const repLon = report.longitude ?? report.location?.longitude ?? (Array.isArray(report.location?.coordinates) ? report.location.coordinates[0] : null);
                  const isVerified = report.status === 'VERIFIED' || report.is_verified;

                  return (
                    <div
                      key={`alert-inc-${report.id}`}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 relative overflow-hidden"
                    >
                      {/* Top ribbon: Category Icon, Name & Status */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl p-2 rounded-2xl bg-orange-50 dark:bg-slate-800">
                              {report.category_icon || '⚠️'}
                            </span>
                            <div>
                              <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                                {report.category_name || report.category}
                              </h4>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(report.reported_at)}
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200">
                              ⏳ Under Review
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2">
                          &ldquo;{report.description}&rdquo;
                        </p>

                        {/* Photo Attachment if present */}
                        {report.image_url && (
                          <div
                            onClick={() => setSelectedImage(report.image_url)}
                            className="mt-2.5 rounded-2xl overflow-hidden cursor-pointer group relative border border-slate-100 dark:border-slate-800"
                          >
                            <img
                              src={report.image_url}
                              alt="Incident Attachment"
                              className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                              <span>Click to enlarge 🔍</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Footer: Location & View On Map Action */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 truncate max-w-[140px]">
                          <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                          <span>{report.location_name || 'Ground Location'}</span>
                        </span>

                        {repLat && repLon ? (
                          <Link
                            to={`/map?lat=${repLat}&lon=${repLon}&reportId=${report.id}`}
                            className="px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center gap-1 transition-colors border border-sky-200 dark:border-sky-800"
                          >
                            <MapIcon className="w-3 h-3" />
                            <span>View on Map 📍</span>
                          </Link>
                        ) : (
                          <span className="text-[10px] text-slate-400">Citizen Observation</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: CITIZEN INCIDENTS (All Incidents & My Submissions)       */}
      {/* ============================================================== */}
      {activeTab === 'incidents' && (
        <div className="space-y-5 animate-fade-in">
          {/* Sub Header & Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-500" />
                <span>Citizen Weather Hazards & Incident Log</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ground-truth reports posted by community members and weather spotters.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle: All vs My Submissions */}
              <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIncidentViewMode('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    incidentViewMode === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All Hazards ({communityReports.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated && openAuthModal) {
                      openAuthModal();
                    } else {
                      setIncidentViewMode('my');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    incidentViewMode === 'my'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  My Submissions ({myReports.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated && openAuthModal) {
                    openAuthModal();
                  } else {
                    setIsReportModalOpen(true);
                  }
                }}
                className="px-3.5 py-2 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Incident</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
            <button
              type="button"
              onClick={() => setIncidentCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-colors ${
                incidentCategoryFilter === 'all'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              All Categories
            </button>
            {REPORT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setIncidentCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1.5 transition-colors ${
                  incidentCategoryFilter === cat.id
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* List of Incidents */}
          {displayedTabIncidents.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <Camera className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {incidentViewMode === 'my' ? 'No Submissions Yet' : 'No Community Incidents Found'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {incidentViewMode === 'my'
                  ? 'You have not submitted any weather hazard reports. Click "+ New Incident" to report conditions in your area.'
                  : 'No reports match this category filter. Be the first to report local weather incidents!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedTabIncidents.map((report) => {
                const repLat = report.latitude ?? report.location?.latitude ?? (Array.isArray(report.location?.coordinates) ? report.location.coordinates[1] : null);
                const repLon = report.longitude ?? report.location?.longitude ?? (Array.isArray(report.location?.coordinates) ? report.location.coordinates[0] : null);
                const isVerified = report.status === 'VERIFIED' || report.is_verified;

                return (
                  <div
                    key={`inc-tab-${report.id}`}
                    className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3"
                  >
                    <div>
                      {/* Top Bar: Icon, Category Name, Relative Time & Status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl p-2 rounded-2xl bg-slate-100 dark:bg-slate-800">
                            {report.category_icon || '⚠️'}
                          </span>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                              {report.category_name || report.category}
                            </h4>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(report.reported_at)}
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center gap-1.5">
                          {isVerified && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200">
                              ✓ Verified
                            </span>
                          )}
                          {report.status === 'PENDING' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200">
                              ⏳ Under Review
                            </span>
                          )}
                          {report.status === 'REJECTED' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200">
                              ✕ Rejected
                            </span>
                          )}

                          {/* Delete option if it's user's pending report */}
                          {incidentViewMode === 'my' && report.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteIncident(report.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete Submission"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {report.description}
                      </p>

                      {/* Photo Thumbnail */}
                      {report.image_url && (
                        <div
                          onClick={() => setSelectedImage(report.image_url)}
                          className="mt-3 rounded-2xl overflow-hidden cursor-pointer group relative border border-slate-100 dark:border-slate-800"
                        >
                          <img
                            src={report.image_url}
                            alt="Incident Photo"
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded-lg bg-black/60 text-white text-[10px] font-medium flex items-center gap-1 backdrop-blur-sm">
                            <Camera className="w-3 h-3" />
                            <span>Photo Attached</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer with Location and Map Button */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 truncate max-w-[150px]">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>{report.location_name || 'Ground Location'}</span>
                      </span>

                      {repLat && repLon && (
                        <Link
                          to={`/map?lat=${repLat}&lon=${repLon}&reportId=${report.id}`}
                          className="px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center gap-1 transition-colors border border-sky-200 dark:border-sky-800"
                        >
                          <MapIcon className="w-3 h-3" />
                          <span>View on Map 📍</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: LOCATION SUBSCRIPTIONS                                  */}
      {/* ============================================================== */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand-500" />
              <span>Subscribe to Emergency Alerts for a City</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Receive high-priority WebSocket events and browser push notifications when severe alerts trigger.
            </p>

            <form onSubmit={handleAddSubscription} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={subCity}
                onChange={(e) => setSubCity(e.target.value)}
                placeholder="Enter city name (e.g. Kanpur, Azamgarh, Mumbai)"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <select
                value={subSeverity}
                onChange={(e) => setSubSeverity(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="minor">Minor & above</option>
                <option value="moderate">Moderate & above</option>
                <option value="severe">Severe & above</option>
                <option value="extreme">Extreme only</option>
              </select>
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

      {/* ============================================================== */}
      {/* TAB 4: ALERT HISTORY                                           */}
      {/* ============================================================== */}
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

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          fetchIncidents();
        }}
        onSuccess={(newReport) => {
          if (newReport) {
            const repId = newReport.id || newReport._id;
            setCommunityReports((prev) => [newReport, ...prev.filter((r) => (r.id || r._id) !== repId)]);
            setMyReports((prev) => [newReport, ...prev.filter((r) => (r.id || r._id) !== repId)]);
          }
          fetchIncidents();
        }}
      />

      {/* Photo Zoom Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl bg-slate-900 p-2">
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Full incident photo"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
