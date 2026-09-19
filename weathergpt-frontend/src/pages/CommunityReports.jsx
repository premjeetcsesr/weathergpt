import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  MapPin,
  Camera,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  ExternalLink,
  Info,
  Map as MapIcon,
  ListFilter
} from 'lucide-react';
import {
  REPORT_CATEGORIES,
  fetchCommunityReports,
  fetchMyReports,
  moderateCommunityReport,
  deleteCommunityReport
} from '../services/communityReportsApi';
import { ReportModal } from '../components/community/ReportModal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { createCommunityMarkerIcon } from '../components/map/LocationMarker';
import { MAP_TILE_BASE_URL } from '../services/apiConfig';

export function CommunityReports() {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'map' | 'my-reports' | 'moderation'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all'); // '1h' | '6h' | '24h' | '7d' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  const [reports, setReports] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [moderationReports, setModerationReports] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null); // Photo zoom modal

  const isAdmin = user?.role === 'admin';

  // Load verified public reports
  const loadPublicReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchCommunityReports({
        category: selectedCategory,
        timeFilter,
        page: 1,
        pageSize: 50
      });
      setReports(data.items || []);
    } catch (err) {
      console.warn('Failed to load community reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, timeFilter]);

  // Load user's own reports
  const loadMyReports = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await fetchMyReports();
      setMyReports(data || []);
    } catch (err) {
      console.warn('Failed to load user reports:', err);
    }
  }, [isAuthenticated]);

  // Load pending reports for moderation (admin only)
  const loadModerationQueue = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await fetchCommunityReports({
        status: 'PENDING',
        page: 1,
        pageSize: 50
      });
      setModerationReports(data.items || []);
    } catch (err) {
      console.warn('Failed to load moderation queue:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === 'feed' || activeTab === 'map') {
      loadPublicReports();
    } else if (activeTab === 'my-reports') {
      loadMyReports();
    } else if (activeTab === 'moderation') {
      loadModerationQueue();
    }
  }, [activeTab, loadPublicReports, loadMyReports, loadModerationQueue]);

  // Handle Admin Moderation Action
  const handleModerate = async (reportId, status, rejectionReason = null) => {
    try {
      await moderateCommunityReport(reportId, status, rejectionReason);
      loadModerationQueue();
      loadPublicReports();
    } catch (err) {
      alert(err.message || 'Failed to moderate report.');
    }
  };

  // Handle Delete Report
  const handleDelete = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteCommunityReport(reportId);
      if (activeTab === 'my-reports') loadMyReports();
      if (activeTab === 'moderation') loadModerationQueue();
      loadPublicReports();
    } catch (err) {
      alert(err.message || 'Failed to delete report.');
    }
  };

  // Format relative time helper
  const formatTime = (isoString) => {
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
  };

  // Filter reports by search query
  const filteredReports = reports.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.description?.toLowerCase().includes(q) ||
      r.location_name?.toLowerCase().includes(q) ||
      r.category_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Top Header & CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-500 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Community Weather Reports
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time citizen ground observations: waterlogging, fallen trees, road blockages, and severe conditions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              if (openAuthModal) openAuthModal();
            } else {
              setIsModalOpen(true);
            }
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-md transition-all self-start md:self-auto"
        >
          <Camera className="w-4 h-4" />
          <span>Report Incident</span>
        </button>
      </div>

      {/* Critical Disclaimer Banner */}
      <div className="p-4 rounded-3xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">
            Community Observation Notice
          </span>
          <p className="text-[11px] text-blue-800/90 dark:text-blue-300">
            Community reports are citizen-generated ground observations submitted by users and verified by moderators. They are strictly separate from and <strong>never represent official IMD warnings</strong>, government alerts, or meteorological forecasts.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'feed'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>Verified Reports</span>
          <span className="text-[10px] opacity-80">({reports.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'map'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Map View</span>
        </button>

        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setActiveTab('my-reports')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'my-reports'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>My Reports</span>
            {myReports.length > 0 && (
              <span className="text-[10px] opacity-80">({myReports.length})</span>
            )}
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('moderation')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'moderation'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Moderator Review</span>
            {moderationReports.length > 0 && (
              <span className="px-1.5 py-0.2 bg-red-500 text-white text-[9px] font-bold rounded-full">
                {moderationReports.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Filters Bar (Only on feed/map) */}
      {(activeTab === 'feed' || activeTab === 'map') && (
        <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Top filter row: search & time range */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search description or location..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Time filter selector */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400 mr-1">Time:</span>
              {['all', '1h', '6h', '24h', '7d'].map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeFilter(tf)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    timeFilter === tf
                      ? 'bg-brand-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tf === 'all' ? 'All' : `Last ${tf}`}
                </button>
              ))}
            </div>
          </div>

          {/* Category Pills Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Categories
            </button>
            {REPORT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 flex items-center gap-1.5 transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab 1: Feed View */}
      {activeTab === 'feed' && (
        <div>
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-brand-500" />
              <span className="text-xs">Loading verified community reports...</span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No Community Reports Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Be the first to report local weather incidents or hazard conditions!
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Incident</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Card Header: Category Icon, Name & Relative Time */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl p-2 rounded-2xl bg-slate-100 dark:bg-slate-800">
                          {report.category_icon}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {report.category_name}
                          </h4>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(report.reported_at)}
                          </span>
                        </div>
                      </div>

                      {/* Verified Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                      &ldquo;{report.description}&rdquo;
                    </p>

                    {/* Photo if present */}
                    {report.image_url ? (
                      <div
                        onClick={() => setSelectedImage(report.image_url)}
                        className="mb-3 rounded-2xl overflow-hidden cursor-pointer group relative border border-slate-100 dark:border-slate-800"
                      >
                        <img
                          src={report.image_url}
                          alt="Incident Observation"
                          className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-slate-950/70 text-white text-[10px] backdrop-blur-sm">
                          Click to enlarge
                        </span>
                      </div>
                    ) : (
                      <div className="mb-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 text-[11px] text-slate-400 italic text-center">
                        No photo attached
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Location & Source Tag */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 truncate max-w-[180px]">
                      <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      <span className="truncate">{report.location_name || 'Unknown location'}</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Community Report
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Map View */}
      {activeTab === 'map' && (
        <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative h-[600px]">
          <MapContainer
            center={[26.4499, 80.3319]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>, DeLorme, NAVTEQ'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
            />

            {filteredReports.map((report) => {
              if (!report.location?.latitude || !report.location?.longitude) return null;
              return (
                <Marker
                  key={`map-report-${report.id}`}
                  position={[report.location.latitude, report.location.longitude]}
                  icon={createCommunityMarkerIcon(
                    report.category,
                    report.category_icon,
                    report.is_verified
                  )}
                >
                  <Popup>
                    <div className="p-2 max-w-xs text-xs space-y-2">
                      <div className="flex items-center justify-between border-b pb-1">
                        <span className="font-bold flex items-center gap-1 text-slate-900">
                          <span>{report.category_icon}</span>
                          <span>{report.category_name}</span>
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          ✓ Verified
                        </span>
                      </div>

                      <p className="text-slate-700 leading-snug">
                        {report.description}
                      </p>

                      {report.image_url && (
                        <img
                          src={report.image_url}
                          alt="Report Photo"
                          className="w-full h-24 object-cover rounded-lg cursor-pointer"
                          onClick={() => setSelectedImage(report.image_url)}
                        />
                      )}

                      <div className="text-[10px] text-slate-500 pt-1 border-t flex justify-between">
                        <span>📍 {report.location_name || 'Reported Location'}</span>
                        <span>{formatTime(report.reported_at)}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      )}

      {/* Tab 3: My Reports */}
      {activeTab === 'my-reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              My Incident Submissions ({myReports.length})
            </h3>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-brand-500 text-white text-xs font-semibold inline-flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              <span>New Report</span>
            </button>
          </div>

          {myReports.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <Camera className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">You have not submitted any community reports yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {report.category_icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {report.category_name}
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          • {formatTime(report.reported_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {report.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                        <span>📍 {report.location_name || 'Ground Location'}</span>
                        {report.image_url && (
                          <span
                            onClick={() => setSelectedImage(report.image_url)}
                            className="text-brand-500 hover:underline cursor-pointer flex items-center gap-0.5"
                          >
                            <Camera className="w-3 h-3" /> Photo Attached
                          </span>
                        )}
                      </div>

                      {/* Rejection Note */}
                      {report.status === 'REJECTED' && report.rejection_reason && (
                        <div className="mt-2 p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-[11px] text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                          <strong>Moderation Note:</strong> {report.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status badge & delete */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {report.status === 'VERIFIED' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200">
                        ✓ Verified
                      </span>
                    )}
                    {report.status === 'PENDING' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200">
                        ⏳ Under Review
                      </span>
                    )}
                    {report.status === 'REJECTED' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200">
                        ✕ Rejected
                      </span>
                    )}

                    {report.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(report.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Delete Pending Report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Moderator Review Queue (Admin Only) */}
      {isAdmin && activeTab === 'moderation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-500" />
                <span>Pending Moderation Queue ({moderationReports.length})</span>
              </h3>
              <p className="text-xs text-slate-400">
                Review submitted citizen observations before they appear on the public map.
              </p>
            </div>
            <button
              type="button"
              onClick={loadModerationQueue}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand-500"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {moderationReports.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Moderation Queue is Clean!
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                All submitted community incident reports have been reviewed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {moderationReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {report.category_icon}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {report.category_name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • {formatTime(report.reported_at)}
                        </span>
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                          PENDING
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        {report.description}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>📍 {report.location_name || 'Ground Location'}</span>
                        <span>
                          Coords: {report.location?.latitude?.toFixed(4)},{' '}
                          {report.location?.longitude?.toFixed(4)}
                        </span>
                        {report.image_url && (
                          <span
                            onClick={() => setSelectedImage(report.image_url)}
                            className="text-brand-500 hover:underline cursor-pointer font-semibold"
                          >
                            📷 View Photo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Approve / Reject / Delete */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => handleModerate(report.id, 'VERIFIED')}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify & Publish</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const reason = prompt('Reason for rejection:');
                        if (reason) handleModerate(report.id, 'REJECTED', reason);
                      }}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(report.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submission Modal */}
      <ReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadPublicReports();
          if (isAuthenticated) loadMyReports();
        }}
      />

      {/* Image Preview Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl">
            <img
              src={selectedImage}
              alt="Expanded Observation Photo"
              className="w-full h-full object-contain max-h-[85vh]"
            />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 hover:bg-red-600 text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
