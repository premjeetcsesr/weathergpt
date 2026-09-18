import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, ImageOverlay, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { useWeather } from '../../context/WeatherContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { MAP_TILE_BASE_URL } from '../../services/apiConfig';
import { createCustomMarkerIcon, createAlertMarkerIcon, createCommunityMarkerIcon } from './LocationMarker';
import { fetchCommunityReports } from '../../services/communityReportsApi';
import { WeatherLayers, MapLegend } from './WeatherLayers';
import {
  CloudRain,
  Wind,
  Droplets,
  ArrowUpRight,
  ShieldAlert,
  Radio,
  Satellite,
  Info,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Camera
} from 'lucide-react';
import { ReportModal } from '../community/ReportModal';
import {
  fetchRadarStatus,
  fetchRadarLayer,
  fetchSatelliteStatus,
  fetchSatelliteLayer
} from '../../services/radarSatelliteApi';

// Key meteorological anchor cities across India for regional context
const REGIONAL_HUBS = [
  { city: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lon: 80.3319 },
  { city: 'New Delhi', state: 'Delhi', lat: 28.6139, lon: 77.2090 },
  { city: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lon: 72.8777 },
  { city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lon: 77.5946 },
  { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lon: 88.3639 },
  { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lon: 80.2707 },
  { city: 'Hyderabad', state: 'Telangana', lat: 17.3850, lon: 78.4867 },
  { city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lon: 72.5714 },
];

function formatISTTime(isoTimestamp) {
  if (!isoTimestamp) {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST';
  }
  try {
    const d = new Date(isoTimestamp);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST';
  } catch {
    return 'Recent';
  }
}

function playCommunityAlertChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  } catch {
    // browser audio permission fallback
  }
}

// Sub-component to handle smooth pan/fly to selected coordinates
function MapController({ center, zoom = 6 }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [center, zoom, map]);
  return null;
}

export function WeatherMap({ height = "550px", focusCoords = null, focusReportId = null }) {
  const { selectedCity, weatherData, alerts, savedLocations, searchCity, formatTemp, formatWind } = useWeather();
  const { theme } = useTheme();
  const { t } = useLanguage();

  const [activeLayer, setActiveLayer] = useState('precipitation');

  // Doppler Radar & Satellite Provider State
  const [radarStatus, setRadarStatus] = useState('NOT_CONFIGURED');
  const [radarLayerData, setRadarLayerData] = useState(null);
  const [radarProduct, setRadarProduct] = useState('reflectivity');
  const [radarOpacity, setRadarOpacity] = useState(0.75);

  const [satelliteStatus, setSatelliteStatus] = useState('NOT_CONFIGURED');
  const [satelliteLayerData, setSatelliteLayerData] = useState(null);
  const [satelliteProduct, setSatelliteProduct] = useState('visible');
  const [satelliteOpacity, setSatelliteOpacity] = useState(0.75);

  const [isLoadingFeed, setIsLoadingFeed] = useState(false);

  // Community Reports Layer State & Real-time Alert
  const [communityReports, setCommunityReports] = useState([]);
  const [showCommunityReports, setShowCommunityReports] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeCommunityAlert, setActiveCommunityAlert] = useState(null);
  const [highlightedReportId, setHighlightedReportId] = useState(focusReportId || null);
  const [flyTarget, setFlyTarget] = useState(focusCoords || null);

  // Sync external focus coords if provided
  useEffect(() => {
    if (focusCoords && focusCoords[0] && focusCoords[1]) {
      setFlyTarget(focusCoords);
      setShowCommunityReports(true);
      if (focusReportId) {
        setHighlightedReportId(focusReportId);
      }
    }
  }, [focusCoords, focusReportId]);

  // Poll / Check provider statuses on mount
  const checkStatuses = useCallback(async () => {
    try {
      const [rStat, sStat] = await Promise.all([
        fetchRadarStatus(),
        fetchSatelliteStatus(),
      ]);
      setRadarStatus(rStat?.status || 'NOT_CONFIGURED');
      setSatelliteStatus(sStat?.status || 'NOT_CONFIGURED');
    } catch (e) {
      console.warn('Provider status probe error:', e);
    }
  }, []);

  useEffect(() => {
    checkStatuses();

    // Fetch verified community reports for map display
    async function loadReports() {
      try {
        const data = await fetchCommunityReports({ pageSize: 50 });
        setCommunityReports(data.items || []);
      } catch (err) {
        console.warn('Could not load community reports for map:', err);
      }
    }
    loadReports();
  }, [checkStatuses]);

  // Real-time listener: When a user clicks photo and reports from current location, pin appears instantly on map with alert!
  useEffect(() => {
    const handleNewReport = (event) => {
      const rep = event.detail;
      if (rep && rep.location?.latitude && rep.location?.longitude) {
        setCommunityReports((prev) => [rep, ...prev.filter((p) => p.id !== rep.id)]);
        setShowCommunityReports(true);
        setActiveCommunityAlert(rep);
        setHighlightedReportId(rep.id);
        setFlyTarget([rep.location.latitude, rep.location.longitude]);
        playCommunityAlertChime();
      }
    };
    window.addEventListener('community-report-added', handleNewReport);
    return () => window.removeEventListener('community-report-added', handleNewReport);
  }, []);



  // Load active layer definitions when switched to radar or satellite
  useEffect(() => {
    let isCurrent = true;
    async function loadFeed() {
      if (activeLayer === 'radar') {
        setIsLoadingFeed(true);
        const data = await fetchRadarLayer(radarProduct);
        if (isCurrent) {
          setRadarLayerData(data);
          setRadarStatus(data.status || 'NOT_CONFIGURED');
          setIsLoadingFeed(false);
        }
      } else if (activeLayer === 'satellite') {
        setIsLoadingFeed(true);
        const data = await fetchSatelliteLayer(satelliteProduct);
        if (isCurrent) {
          setSatelliteLayerData(data);
          setSatelliteStatus(data.status || 'NOT_CONFIGURED');
          setIsLoadingFeed(false);
        }
      }
    }
    loadFeed();
    return () => { isCurrent = false; };
  }, [activeLayer, radarProduct, satelliteProduct]);

  // Center on currently selected city or default
  const defaultCenter = [26.4499, 80.3319]; // Kanpur coordinates
  const currentCenter = weatherData?.location?.lat && weatherData?.location?.lon
    ? [weatherData.location.lat, weatherData.location.lon]
    : defaultCenter;

  const isDark = theme === 'dark';

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-card border border-slate-200/80 dark:border-slate-800 bg-slate-900" style={{ height }}>
      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          <WeatherLayers
            activeLayer={activeLayer}
            setActiveLayer={setActiveLayer}
            radarStatus={radarStatus}
            satelliteStatus={satelliteStatus}
          />
          <button
            type="button"
            onClick={() => setShowCommunityReports(!showCommunityReports)}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all shadow-elevated flex items-center gap-1.5 ${
              showCommunityReports
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-white/95 dark:bg-slate-900/95 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
            title="Toggle Community Incident Reports"
          >
            <span>📸 Incident Reports</span>
            {communityReports.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 text-white font-mono">
                {communityReports.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{t('reportIncidentBtn') || 'Report Hazard (Current Location)'}</span>
          </button>
        </div>

        {/* Live Feed Status Pill & Opacity Controls for Radar / Satellite */}
        {(activeLayer === 'radar' || activeLayer === 'satellite') && (
          <div className="pointer-events-auto flex items-center gap-2 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-elevated text-xs">
            <div className="flex items-center gap-1.5 px-2 font-bold text-slate-700 dark:text-slate-200">
              {activeLayer === 'radar' ? <Radio className="w-3.5 h-3.5 text-purple-500" /> : <Satellite className="w-3.5 h-3.5 text-sky-500" />}
              <span>{activeLayer === 'radar' ? 'Doppler DWR' : 'INSAT-3D'}</span>
            </div>

            {/* Live or Status Badge */}
            {(activeLayer === 'radar' ? radarStatus : satelliteStatus) === 'ACTIVE' ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500">
                {(activeLayer === 'radar' ? radarStatus : satelliteStatus).replace('_', ' ')}
              </span>
            )}

            {/* Product Selector */}
            {activeLayer === 'radar' ? (
              <select
                value={radarProduct}
                onChange={(e) => setRadarProduct(e.target.value)}
                className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-purple-500"
              >
                <option value="reflectivity">Reflectivity (MAXZ)</option>
                <option value="precipitation_intensity">Precipitation Rate (PAC)</option>
                <option value="precipitation_accumulation">24h Accumulation</option>
              </select>
            ) : (
              <select
                value={satelliteProduct}
                onChange={(e) => setSatelliteProduct(e.target.value)}
                className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-sky-500"
              >
                <option value="visible">Visible (VIS 0.65µm)</option>
                <option value="infrared_tir1">Thermal IR (TIR1 10.8µm)</option>
                <option value="water_vapour">Water Vapour (WV 6.7µm)</option>
              </select>
            )}

            {/* Opacity Slider */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 text-[11px] text-slate-500">
              <Sliders className="w-3 h-3" />
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={activeLayer === 'radar' ? radarOpacity : satelliteOpacity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (activeLayer === 'radar') setRadarOpacity(val);
                  else setSatelliteOpacity(val);
                }}
                className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                title="Layer Opacity"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Legend */}
      <div className="absolute bottom-4 left-4 z-[400] pointer-events-auto">
        <MapLegend activeLayer={activeLayer} />
      </div>

      {/* Professional Disaster-Management Overlay when Radar or Satellite feed is NOT_CONFIGURED or UNAVAILABLE */}
      {activeLayer === 'radar' && radarStatus !== 'ACTIVE' && (
        <div className="absolute inset-0 z-[350] bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4 pointer-events-auto">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-purple-500/30 shadow-2xl space-y-4 animate-fade-in text-center sm:text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Live Doppler Weather Radar
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    S-band / C-band Radar Telemetry Architecture
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                {radarStatus.replace('_', ' ')}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/60 text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
              <p className="font-semibold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-purple-500 shrink-0" />
                <span>Live Doppler Radar is currently unavailable.</span>
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Authorized radar data source is not configured in this environment. WeatherGPT is architecturally ready to ingest verified radar mosaics. In accordance with meteorological data honesty rules, simulated or fake tiles are not displayed.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block font-medium">Authorized Source</span>
                <strong className="text-slate-800 dark:text-slate-200">India Meteorological Dept</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Selected Product</span>
                <strong className="text-slate-800 dark:text-slate-200">Reflectivity (0-70 dBZ)</strong>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setActiveLayer('precipitation')}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                View Precipitation Radar
              </button>
              <button
                type="button"
                onClick={checkStatuses}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Probe Feed</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Disaster-Management Overlay when Satellite feed is NOT_CONFIGURED or UNAVAILABLE */}
      {activeLayer === 'satellite' && satelliteStatus !== 'ACTIVE' && (
        <div className="absolute inset-0 z-[350] bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4 pointer-events-auto">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-sky-500/30 shadow-2xl space-y-4 animate-fade-in text-center sm:text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Satellite className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    INSAT-3D/3DR Satellite Imagery
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Geostationary Meteorological Observation Payload
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                {satelliteStatus.replace('_', ' ')}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-900/60 text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
              <p className="font-semibold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Live INSAT-3D satellite imagery is currently unavailable.</span>
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Authorized satellite data source is not configured in this environment. WeatherGPT is architecturally ready to ingest live VIS, TIR1, and Water Vapour sectoral passes.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block font-medium">Platform & Sensor</span>
                <strong className="text-slate-800 dark:text-slate-200">IMD / ISRO (INSAT-3D)</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Supported Channels</span>
                <strong className="text-slate-800 dark:text-slate-200">VIS, TIR1, WV</strong>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setActiveLayer('temperature')}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                View Temperature Layer
              </button>
              <button
                type="button"
                onClick={checkStatuses}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Probe Feed</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Community Incident Alert Banner */}
      {activeCommunityAlert && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[450] w-[94%] sm:w-auto max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-red-500 rounded-3xl p-3.5 sm:p-4 shadow-2xl animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 text-white flex items-center justify-center text-2xl shrink-0 shadow-md">
              {activeCommunityAlert.category_icon || '⚠️'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[11px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wide">
                    {t('communityAlertTitle') || 'Live Community Hazard Alert'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCommunityAlert(null)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                {activeCommunityAlert.category_name || activeCommunityAlert.category}: {activeCommunityAlert.location_name || 'Current Location'}
              </h4>

              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1 italic">
                &ldquo;{activeCommunityAlert.description}&rdquo;
              </p>

              {activeCommunityAlert.image_url && (
                <div className="mt-2 flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80">
                  <img
                    src={activeCommunityAlert.image_url}
                    alt="Live Photo"
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                  />
                  <div className="text-[10px] text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                      📸 Live Ground Photo Attached
                    </span>
                    <span>
                      {activeCommunityAlert.location?.latitude ? `${activeCommunityAlert.location.latitude.toFixed(4)}, ${activeCommunityAlert.location.longitude.toFixed(4)}` : ''}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (activeCommunityAlert.location) {
                      setFlyTarget([activeCommunityAlert.location.latitude, activeCommunityAlert.location.longitude]);
                    }
                  }}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1 shadow-sm"
                >
                  <span>Focus Map Pin 🎯</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCommunityAlert(null)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-[11px] font-medium transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaflet Map Container */}
      <MapContainer
        center={currentCenter}
        zoom={6}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="z-10"
      >
        <MapController center={flyTarget || currentCenter} zoom={flyTarget ? 14 : 7} />
        
        {/* Base Tile Layer */}
        <TileLayer
          key={isDark ? 'esri-dark-base' : 'esri-light-base'}
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>, DeLorme, NAVTEQ'
          url={
            isDark
              ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
              : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
          }
          maxZoom={16}
        />

        {/* Live Weather Tile Layers via Backend Proxy */}
        {activeLayer === 'precipitation' && (
          <TileLayer
            key="owm-precipitation"
            url={`${MAP_TILE_BASE_URL}/precipitation_new/{z}/{x}/{y}`}
            opacity={0.65}
            zIndex={10}
          />
        )}

        {activeLayer === 'temperature' && (
          <TileLayer
            key="owm-temperature"
            url={`${MAP_TILE_BASE_URL}/temp_new/{z}/{x}/{y}`}
            opacity={0.55}
            zIndex={10}
          />
        )}

        {activeLayer === 'wind' && (
          <TileLayer
            key="owm-wind"
            url={`${MAP_TILE_BASE_URL}/wind_new/{z}/{x}/{y}`}
            opacity={0.55}
            zIndex={10}
          />
        )}

        {/* REAL Doppler Radar Layer when ACTIVE */}
        {activeLayer === 'radar' && radarStatus === 'ACTIVE' && radarLayerData?.tile_url_template && (
          <TileLayer
            key={`radar-${radarProduct}`}
            url={radarLayerData.tile_url_template}
            opacity={radarOpacity}
            zIndex={15}
          />
        )}

        {/* REAL Satellite Layer when ACTIVE */}
        {activeLayer === 'satellite' && satelliteStatus === 'ACTIVE' && satelliteLayerData?.tile_url_template && (
          <TileLayer
            key={`sat-${satelliteProduct}`}
            url={satelliteLayerData.tile_url_template}
            opacity={satelliteOpacity}
            zIndex={15}
          />
        )}

        {/* Active City Weather Circles */}
        {weatherData?.location?.lat && weatherData?.location?.lon && (
          <Circle
            center={[weatherData.location.lat, weatherData.location.lon]}
            radius={activeLayer === 'precipitation' ? 45000 : 35000}
            pathOptions={{
              color: activeLayer === 'temperature'
                ? (weatherData.current?.temp > 32 ? '#ef4444' : weatherData.current?.temp > 24 ? '#f59e0b' : '#0284c7')
                : '#0284c7',
              fillColor: activeLayer === 'temperature'
                ? (weatherData.current?.temp > 32 ? '#ef4444' : weatherData.current?.temp > 24 ? '#f59e0b' : '#38bdf8')
                : '#38bdf8',
              fillOpacity: 0.35,
              weight: 2,
            }}
          />
        )}

        {/* Active Real-time Alert Markers */}
        {(activeLayer === 'alerts' || activeLayer === 'precipitation') &&
          alerts && alerts.map((alert) => {
            let pos = null;
            if (alert.coordinates && Array.isArray(alert.coordinates) && alert.coordinates.length === 2) {
              pos = alert.coordinates;
            } else if (alert.location?.latitude && alert.location?.longitude) {
              pos = [alert.location.latitude, alert.location.longitude];
            } else if (weatherData?.location?.lat && weatherData?.location?.lon) {
              pos = [weatherData.location.lat, weatherData.location.lon];
            }

            if (!pos) return null;

            const alertTitle = alert.event || alert.title || 'Meteorological Alert';
            const alertLoc = typeof alert.location === 'object' ? alert.location?.name : (alert.location || selectedCity);

            return (
              <Marker
                key={alert.id || alert.alert_id || Math.random()}
                position={pos}
                icon={createAlertMarkerIcon(alertTitle, alert.severity || 'severe')}
              >
                <Popup>
                  <div className="p-3 max-w-xs">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 mb-1">
                      <ShieldAlert className="w-4 h-4" />
                      <span>{alert.severity?.toUpperCase() || 'SEVERE'} ALERT</span>
                    </div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 mb-1">
                      {alertTitle} ({alertLoc})
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug mb-2">
                      {alert.headline || alert.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => searchCity(alertLoc)}
                      className="w-full py-1.5 px-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-semibold text-center transition-colors"
                    >
                      View Live Weather
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Selected City Live Weather Marker */}
        {weatherData?.location?.lat && weatherData?.location?.lon && (
          <Marker
            position={[weatherData.location.lat, weatherData.location.lon]}
            icon={createCustomMarkerIcon(
              weatherData.location.city,
              formatTemp(weatherData.current?.temp),
              'selected'
            )}
          >
            <Popup>
              <div className="p-3 max-w-xs">
                <div className="flex items-center justify-between mb-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {weatherData.location.city}
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {weatherData.location.state || ''}{weatherData.location.country ? `, ${weatherData.location.country}` : ''}
                    </span>
                  </div>
                  <span className="text-base font-extrabold text-brand-600 dark:text-brand-400">
                    {formatTemp(weatherData.current?.temp)}
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mb-2">
                  {weatherData.current?.condition}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 mb-3 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                  <div className="flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-blue-500" />
                    <span>{weatherData.current?.humidity}% Hum</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wind className="w-3 h-3 text-teal-500" />
                    <span>{formatWind(weatherData.current?.wind_speed)}</span>
                  </div>
                </div>

                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Currently Monitored City</span>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Regional Anchor Cities */}
        {REGIONAL_HUBS.filter(
          (h) => h.city.toLowerCase() !== selectedCity.toLowerCase()
        ).map((item) => (
          <Marker
            key={`hub-${item.city}`}
            position={[item.lat, item.lon]}
            icon={createCustomMarkerIcon(item.city, '', 'city')}
            eventHandlers={{
              click: () => {
                searchCity(item.city);
              }
            }}
          >
            <Popup>
              <div className="p-2.5 max-w-xs">
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  {item.city}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                  {item.state}, India
                </p>
                <button
                  type="button"
                  onClick={() => searchCity(item.city)}
                  className="w-full py-1 px-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Load City Telemetry</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* User Saved Locations */}
        {savedLocations && savedLocations.map((item) => {
          if (!item.latitude || !item.longitude) return null;
          if (item.name?.toLowerCase() === selectedCity.toLowerCase()) return null;

          return (
            <Marker
              key={`saved-${item.id || item.name}`}
              position={[item.latitude, item.longitude]}
              icon={createCustomMarkerIcon(item.name, 'Saved', 'saved')}
              eventHandlers={{
                click: () => {
                  searchCity(item.name);
                }
              }}
            >
              <Popup>
                <div className="p-2.5 max-w-xs">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    ⭐ {item.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    Saved Favorite Location
                  </p>
                  <button
                    type="button"
                    onClick={() => searchCity(item.name)}
                    className="w-full py-1 px-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>View Weather</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Verified & Live Community Incident Reports */}
        {showCommunityReports &&
          communityReports.map((report) => {
            if (!report.location?.latitude || !report.location?.longitude) return null;
            const isHighlighted = report.id === highlightedReportId;
            return (
              <Marker
                key={`comm-${report.id}`}
                position={[report.location.latitude, report.location.longitude]}
                icon={createCommunityMarkerIcon(
                  report.category,
                  report.category_icon,
                  report.is_verified,
                  isHighlighted
                )}
              >
                <Popup>
                  <div className="p-2.5 max-w-xs text-xs space-y-1.5">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      <span className="font-bold flex items-center gap-1 text-slate-900 dark:text-slate-100">
                        <span>{report.category_icon}</span>
                        <span>{report.category_name}</span>
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ Verified Community
                      </span>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 leading-snug">
                      &ldquo;{report.description}&rdquo;
                    </p>

                    {report.image_url && (
                      <div className="rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 mt-1">
                        <img
                          src={report.image_url}
                          alt="Incident Photo"
                          className="w-full h-28 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(report.image_url, '_blank')}
                          title="Click to view full photo"
                        />
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                      <span>📍 {report.location_name || 'Ground Location'}</span>
                      <span className="font-semibold text-brand-600">Community Report</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Community Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
