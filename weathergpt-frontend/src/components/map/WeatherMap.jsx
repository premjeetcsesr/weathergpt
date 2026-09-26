import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import { useWeather } from '../../context/WeatherContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { MAP_TILE_BASE_URL } from '../../services/apiConfig';
import {
  createCustomMarkerIcon,
  createAlertMarkerIcon,
  createCommunityMarkerIcon,
  createCurrentLocationMarkerIcon,
  createChoiceLocationMarkerIcon,
} from './LocationMarker';
import { fetchAllActiveReports, getStoredReports, saveStoredReports } from '../../services/communityReportsApi';
import { reverseGeocode, fetchNearbyMapCommunityReports } from '../../services/mapApi';
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
  Camera,
  Navigation,
  MapPin,
  Store,
  Hospital,
  Pill,
  LocateFixed,
  Compass,
} from 'lucide-react';
import { ReportModal } from '../community/ReportModal';
import { fetchNearbyPlaces } from '../../services/nearbyPlacesApi';
import {
  fetchRadarStatus,
  fetchRadarLayer,
  fetchSatelliteStatus,
  fetchSatelliteLayer
} from '../../services/radarSatelliteApi';

function getDistanceKm(fromLat, fromLon, toLat, toLon) {
  const earthRadiusKm = 6371;
  const latDelta = ((toLat - fromLat) * Math.PI) / 180;
  const lonDelta = ((toLon - fromLon) * Math.PI) / 180;
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos((fromLat * Math.PI) / 180)
    * Math.cos((toLat * Math.PI) / 180)
    * Math.sin(lonDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  } catch {
    // audio permission fallback
  }
}

// Sub-component to handle smooth pan/fly to selected coordinates
function MapController({ center, zoom = 6 }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  }, [center, zoom, map]);
  return null;
}

// Click listener to set choice location on map click
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (e?.latlng) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export function WeatherMap({ height = "550px", focusCoords = null, focusReportId = null }) {
  const { selectedCity, weatherData, alerts, savedLocations, searchCity, formatTemp, formatWind } = useWeather();
  const { theme } = useTheme();
  const { t } = useLanguage();

  const [activeLayer, setActiveLayer] = useState('precipitation');
  const [baseMapStyle, setBaseMapStyle] = useState('dark'); // 'dark' (Image 1) or 'topo' (Image 2)

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
  const [nearbyCategory, setNearbyCategory] = useState(null);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);

  // Live GPS Device Location state
  const [currentGpsLocation, setCurrentGpsLocation] = useState(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  // Choice Location state (clicked or selected location)
  const [choiceLocation, setChoiceLocation] = useState(null);
  const [isResolvingChoice, setIsResolvingChoice] = useState(false);

  // Community Reports Layer State & Real-time Alert - ALWAYS initialized with stored reports so pins never vanish!
  const [communityReports, setCommunityReports] = useState(() => getStoredReports());
  const [showCommunityReports, setShowCommunityReports] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalCoords, setReportModalCoords] = useState(null);
  const [activeCommunityAlert, setActiveCommunityAlert] = useState(null);
  const [highlightedReportId, setHighlightedReportId] = useState(focusReportId || null);
  const [flyTarget, setFlyTarget] = useState(focusCoords || null);

  // Initial GPS device location request
  const detectGpsLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCurrentGpsLocation({ lat, lon });
        setIsLocatingGps(false);
      },
      (err) => {
        console.warn('GPS location request warning:', err.message);
        setIsLocatingGps(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    detectGpsLocation();
  }, [detectGpsLocation]);

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

  // Sync choice location when weatherData changes (e.g. from search)
  useEffect(() => {
    if (weatherData?.location?.lat && weatherData?.location?.lon) {
      setChoiceLocation({
        lat: weatherData.location.lat,
        lon: weatherData.location.lon,
        name: weatherData.location.city,
        city: weatherData.location.city,
        state: weatherData.location.state || '',
        country: weatherData.location.country || '',
        temp: formatTemp(weatherData.current?.temp),
        condition: weatherData.current?.condition,
      });
    }
  }, [weatherData, formatTemp]);

  // Handle map click: set choice location and reverse-geocode via backend
  const handleMapClick = useCallback(async (lat, lon) => {
    setIsResolvingChoice(true);
    setChoiceLocation({
      lat,
      lon,
      name: `Resolving (${lat.toFixed(3)}, ${lon.toFixed(3)})...`,
      city: null,
      state: null,
    });
    setFlyTarget([lat, lon]);

    try {
      const geoResult = await reverseGeocode(lat, lon);
      if (geoResult) {
        setChoiceLocation({
          lat,
          lon,
          name: geoResult.name || geoResult.city || `Location (${lat.toFixed(3)}, ${lon.toFixed(3)})`,
          city: geoResult.city,
          district: geoResult.district,
          state: geoResult.state,
          country: geoResult.country,
          display_name: geoResult.display_name,
        });
      }
    } catch (err) {
      console.warn('Map reverse geocoding failed:', err);
    } finally {
      setIsResolvingChoice(false);
    }
  }, []);

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

    // Fetch all active & user community reports for map display
    async function loadReports() {
      try {
        const items = await fetchAllActiveReports();
        if (Array.isArray(items) && items.length > 0) {
          setCommunityReports((prev) => {
            const map = new Map();
            for (const p of prev) {
              if (p && p.id) map.set(String(p.id), p);
            }
            for (const it of items) {
              if (it && it.id) map.set(String(it.id), it);
            }
            const merged = Array.from(map.values());
            saveStoredReports(merged);
            return merged;
          });
        }
      } catch (err) {
        console.warn('Could not load community reports for map:', err);
      }
    }
    loadReports();
  }, [checkStatuses]);

  // Real-time listener: When a user reports from current location, pin appears instantly on map
  useEffect(() => {
    const handleNewReport = (event) => {
      const rep = event.detail;
      if (rep) {
        setCommunityReports((prev) => {
          const map = new Map();
          map.set(String(rep.id), rep);
          for (const p of prev) {
            if (p && p.id && !map.has(String(p.id))) {
              map.set(String(p.id), p);
            }
          }
          const updated = Array.from(map.values());
          saveStoredReports(updated);
          return updated;
        });
        setShowCommunityReports(true);
        setActiveCommunityAlert(rep);
        setHighlightedReportId(rep.id);
        const repLat = rep?.latitude ?? rep?.location?.latitude ?? (Array.isArray(rep?.location?.coordinates) ? rep.location.coordinates[1] : null);
        const repLon = rep?.longitude ?? rep?.location?.longitude ?? (Array.isArray(rep?.location?.coordinates) ? rep.location.coordinates[0] : null);
        if (repLat && repLon) {
          setFlyTarget([repLat, repLon]);
        }
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

  // Center coordinate determination (Choice Location -> GPS Location -> Weather Location -> Default India)
  const defaultCenter = [22.5, 82.0]; // Centered on India
  const activeFocusCenter = choiceLocation
    ? [choiceLocation.lat, choiceLocation.lon]
    : currentGpsLocation
    ? [currentGpsLocation.lat, currentGpsLocation.lon]
    : weatherData?.location?.lat && weatherData?.location?.lon
    ? [weatherData.location.lat, weatherData.location.lon]
    : defaultCenter;

  // Query nearby places around choice location or current location
  const queryCenterLat = choiceLocation?.lat || currentGpsLocation?.lat || weatherData?.location?.lat;
  const queryCenterLon = choiceLocation?.lon || currentGpsLocation?.lon || weatherData?.location?.lon;

  useEffect(() => {
    if (!nearbyCategory || !queryCenterLat || !queryCenterLon) return;
    let active = true;
    setIsLoadingNearby(true);
    fetchNearbyPlaces({
      lat: queryCenterLat,
      lon: queryCenterLon,
      category: nearbyCategory,
    }).then((items) => {
      if (active) setNearbyPlaces(items);
    }).catch(() => {
      if (active) setNearbyPlaces([]);
    }).finally(() => {
      if (active) setIsLoadingNearby(false);
    });
    return () => { active = false; };
  }, [nearbyCategory, queryCenterLat, queryCenterLon]);

  const isDark = theme === 'dark' || baseMapStyle === 'dark';

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-700/80 bg-[#0a0f1d]" style={{ height }}>
      {/* LEFT FLOATING VERTICAL LAYERS PANEL (Matching Image 1) */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-[400] pointer-events-auto">
        <WeatherLayers
          activeLayer={activeLayer}
          setActiveLayer={setActiveLayer}
          radarStatus={radarStatus}
          satelliteStatus={satelliteStatus}
          baseMapStyle={baseMapStyle}
          setBaseMapStyle={setBaseMapStyle}
        />
      </div>

      {/* TOP FLOATING ACTION BAR (Matching Image 1: Hospitals, Pharmacies, Emergency, Shops, Reports, Report Hazard) */}
      <div className="absolute top-3 left-48 sm:left-52 right-3 sm:right-4 z-[400] pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full justify-start md:justify-end">
          {/* Nearby Amenities Filter Pills */}
          {[
            { id: 'hospital', label: 'Hospitals', icon: Hospital },
            { id: 'pharmacy', label: 'Pharmacies', icon: Pill },
            { id: 'emergency_room', label: 'Emergency', icon: ShieldAlert },
            { id: 'shop', label: 'Shops', icon: Store },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setNearbyCategory((current) => current === id ? null : id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold shadow-lg transition-all shrink-0 border ${
                nearbyCategory === id
                  ? 'bg-rose-500 text-white border-rose-400 shadow-rose-500/30'
                  : 'bg-[#0f172a]/90 text-slate-200 border-slate-700/80 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}

          {/* Green Reports Pill Button (Matching Image 1) */}
          <button
            type="button"
            onClick={() => setShowCommunityReports(!showCommunityReports)}
            className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-lg flex items-center gap-1.5 shrink-0 border ${
              showCommunityReports
                ? 'bg-[#10b981] text-white border-emerald-400 shadow-emerald-500/30'
                : 'bg-[#0f172a]/90 text-slate-300 border-slate-700/80 hover:bg-slate-800'
            }`}
            title="Toggle Community Incident Reports"
          >
            <span>📸</span>
            <span>Reports</span>
            {communityReports.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/25 text-white font-mono">
                {communityReports.length}
              </span>
            )}
          </button>

          {/* Orange Report Hazard (Current Location) Pill Button (Matching Image 1) */}
          <button
            type="button"
            onClick={() => {
              if (currentGpsLocation) {
                setReportModalCoords({ lat: currentGpsLocation.lat, lon: currentGpsLocation.lon });
              } else if (choiceLocation) {
                setReportModalCoords({ lat: choiceLocation.lat, lon: choiceLocation.lon });
              }
              setIsReportModalOpen(true);
            }}
            className="px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-lg flex items-center gap-2 bg-gradient-to-r from-[#f97316] via-[#ea580c] to-[#e11d48] hover:from-[#ea580c] hover:to-[#be123c] text-white shrink-0 border border-orange-400/40 shadow-orange-500/30"
          >
            <Camera className="w-4 h-4" />
            <span>Report Hazard (Current Location)</span>
          </button>

          {/* Current GPS Re-center button */}
          <button
            type="button"
            onClick={() => {
              if (currentGpsLocation) {
                setFlyTarget([currentGpsLocation.lat, currentGpsLocation.lon]);
              } else {
                detectGpsLocation();
              }
            }}
            className={`p-2 rounded-2xl shadow-lg border border-slate-700/80 shrink-0 transition-colors ${
              currentGpsLocation
                ? 'bg-sky-500 text-white hover:bg-sky-600'
                : 'bg-[#0f172a]/90 text-slate-300 hover:text-white'
            }`}
            title="Locate Device GPS"
          >
            <LocateFixed className={`w-4 h-4 ${isLocatingGps ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Live Feed Status Pill & Opacity Controls for Radar / Satellite */}
        {(activeLayer === 'radar' || activeLayer === 'satellite') && (
          <div className="pointer-events-auto mt-2 flex items-center gap-2 p-1.5 bg-[#0f172a]/95 backdrop-blur-md rounded-2xl border border-slate-700 shadow-xl text-xs w-fit ml-auto">
            <div className="flex items-center gap-1.5 px-2 font-bold text-slate-200">
              {activeLayer === 'radar' ? <Radio className="w-3.5 h-3.5 text-purple-400" /> : <Satellite className="w-3.5 h-3.5 text-sky-400" />}
              <span>{activeLayer === 'radar' ? 'Doppler DWR' : 'INSAT-3D'}</span>
            </div>

            {(activeLayer === 'radar' ? radarStatus : satelliteStatus) === 'ACTIVE' ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                {(activeLayer === 'radar' ? radarStatus : satelliteStatus).replace('_', ' ')}
              </span>
            )}

            {/* Opacity Slider */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 text-[11px] text-slate-400">
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
                className="w-16 h-1 bg-slate-700 rounded-lg cursor-pointer"
                title="Layer Opacity"
              />
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM LEFT FLOATING LEGEND (Matching Image 1) */}
      <div className="absolute bottom-4 left-4 z-[400] pointer-events-auto">
        <MapLegend activeLayer={activeLayer} />
      </div>

      {/* NEARBY PLACES DRAWER */}
      {nearbyCategory && (
        <aside className="absolute right-3 top-20 z-[400] w-[min(22rem,calc(100%-1.5rem))] max-h-[min(28rem,calc(100%-7rem))] overflow-y-auto rounded-3xl border border-slate-700 bg-[#0f172a]/95 p-4 shadow-2xl backdrop-blur-xl text-white">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-white">
                Nearby {nearbyCategory === 'hospital' ? 'Hospitals' : nearbyCategory === 'pharmacy' ? 'Pharmacies' : nearbyCategory === 'emergency_room' ? 'Emergency Services' : 'Shops'}
              </h3>
              <p className="text-xs text-slate-400">
                Within 5 km of {choiceLocation?.name ? choiceLocation.name : 'your location'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNearbyCategory(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg"
            >
              ✕
            </button>
          </div>
          {isLoadingNearby && <p className="py-4 text-center text-sm text-slate-400 animate-pulse">Finding nearby places...</p>}
          {!isLoadingNearby && nearbyPlaces.length === 0 && (
            <p className="rounded-2xl bg-slate-800/80 p-3 text-sm text-slate-300">
              No places found nearby.
            </p>
          )}
          <div className="space-y-2">
            {nearbyPlaces.map((place) => {
              const distance = queryCenterLat && queryCenterLon && place.latitude && place.longitude
                ? getDistanceKm(queryCenterLat, queryCenterLon, place.latitude, place.longitude)
                : null;
              return (
                <div key={place.id} className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-3 hover:border-slate-600 transition-colors">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-bold text-white">{place.name}</h4>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-300">{place.address}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-sky-400">
                          {distance !== null ? `${distance.toFixed(1)} km away` : 'Nearby'}
                        </span>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl bg-sky-600 hover:bg-sky-500 px-2.5 py-1.5 text-xs font-bold text-white"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                          Directions
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* Live Community Incident Alert Banner */}
      {activeCommunityAlert && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[450] w-[94%] sm:w-auto max-w-lg bg-[#0f172a]/95 backdrop-blur-md border-2 border-red-500 rounded-3xl p-3.5 sm:p-4 shadow-2xl animate-fade-in text-white">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 text-white flex items-center justify-center text-2xl shrink-0 shadow-md">
              {activeCommunityAlert.category_icon || '⚠️'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-[11px] font-extrabold text-red-400 uppercase tracking-wide">
                    Live Community Hazard Alert
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCommunityAlert(null)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <h4 className="text-xs sm:text-sm font-extrabold text-white truncate mt-0.5">
                {activeCommunityAlert.category_name || activeCommunityAlert.category}: {activeCommunityAlert.location_name || 'Current Location'}
              </h4>

              <p className="text-[11px] sm:text-xs text-slate-300 line-clamp-2 mt-1 italic">
                &ldquo;{activeCommunityAlert.description}&rdquo;
              </p>

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
                  className="px-2.5 py-1 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-[11px] font-medium transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEAFLET MAP CONTAINER */}
      <MapContainer
        center={activeFocusCenter}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="z-10"
      >
        <MapController center={flyTarget || activeFocusCenter} zoom={flyTarget ? 13 : 5} />
        <MapClickHandler onMapClick={handleMapClick} />

        {/* Base Tile Layer (Dark Canvas for Image 1, Esri Topographic / National Geographic for Image 2) */}
        {baseMapStyle === 'dark' ? (
          <TileLayer
            key="esri-dark-base"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, DeLorme, NAVTEQ'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
          />
        ) : (
          <TileLayer
            key="esri-topo-base"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, DeLorme, NAVTEQ'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
          />
        )}

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

        {/* 1. CURRENT GPS DEVICE LOCATION MARKER ("current mark ho") */}
        {currentGpsLocation && (
          <Marker
            position={[currentGpsLocation.lat, currentGpsLocation.lon]}
            icon={createCurrentLocationMarkerIcon()}
          >
            <Popup>
              <div className="p-2.5 max-w-xs text-slate-900">
                <div className="flex items-center gap-1.5 font-black text-xs text-sky-600 mb-1">
                  <Compass className="w-4 h-4" />
                  <span>Your Live GPS Device Location</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  {currentGpsLocation.lat.toFixed(4)}° N, {currentGpsLocation.lon.toFixed(4)}° E
                </p>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleMapClick(currentGpsLocation.lat, currentGpsLocation.lon)}
                    className="w-full py-1.5 px-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-[11px] font-bold transition-colors"
                  >
                    Select as Active Choice Location
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 2. CHOICE LOCATION MARKER ("choise location ke according mark ho") */}
        {choiceLocation && (
          <Marker
            position={[choiceLocation.lat, choiceLocation.lon]}
            icon={createChoiceLocationMarkerIcon(choiceLocation.name || 'Selected Point')}
          >
            <Popup>
              <div className="p-3 max-w-xs text-slate-900">
                <div className="flex items-center justify-between mb-1 border-b border-slate-200 pb-1">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      📍 {choiceLocation.name || 'Selected Location'}
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      {choiceLocation.district ? `${choiceLocation.district}, ` : ''}
                      {choiceLocation.state ? `${choiceLocation.state}, ` : ''}
                      {choiceLocation.country || ''}
                    </span>
                  </div>
                  {choiceLocation.temp && (
                    <span className="text-sm font-black text-sky-600">
                      {choiceLocation.temp}
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 font-mono mb-2">
                  {choiceLocation.lat.toFixed(4)}° N, {choiceLocation.lon.toFixed(4)}° E
                </div>

                {choiceLocation.condition && (
                  <p className="text-xs text-slate-700 font-medium mb-2">
                    Condition: {choiceLocation.condition}
                  </p>
                )}

                <div className="flex flex-col gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cityName = choiceLocation.city || choiceLocation.name;
                      if (cityName) searchCity(cityName);
                    }}
                    className="w-full py-1.5 px-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                  >
                    <span>Check Weather Here</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReportModalCoords({ lat: choiceLocation.lat, lon: choiceLocation.lon });
                      setIsReportModalOpen(true);
                    }}
                    className="w-full py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <Camera className="w-3 h-3 text-orange-500" />
                    <span>Report Hazard At This Spot</span>
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Choice Location Weather Radar Circle */}
        {choiceLocation && (
          <Circle
            center={[choiceLocation.lat, choiceLocation.lon]}
            radius={activeLayer === 'precipitation' ? 45000 : 35000}
            pathOptions={{
              color: '#0284c7',
              fillColor: '#38bdf8',
              fillOpacity: 0.25,
              weight: 2,
              dashArray: '4, 4',
            }}
          />
        )}

        {/* Nearby places markers */}
        {nearbyPlaces.map((place) => (
          <Marker key={place.id} position={[place.latitude, place.longitude]}>
            <Popup>
              <div className="p-2 max-w-xs text-slate-900">
                <h4 className="font-bold text-xs text-slate-900">{place.name}</h4>
                <p className="text-[11px] text-slate-600 mt-1">{place.address}</p>
                {place.rating && <p className="text-[11px] text-amber-600 mt-1">★ {place.rating} ({place.user_ratings_total || 0})</p>}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:underline"
                >
                  <Navigation className="w-3 h-3" /> Get Directions
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

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
                  <div className="p-3 max-w-xs text-slate-900">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 mb-1">
                      <ShieldAlert className="w-4 h-4" />
                      <span>{alert.severity?.toUpperCase() || 'SEVERE'} ALERT</span>
                    </div>
                    <h4 className="font-semibold text-xs text-slate-900 mb-1">
                      {alertTitle} ({alertLoc})
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-snug mb-2">
                      {alert.headline || alert.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => searchCity(alertLoc)}
                      className="w-full py-1.5 px-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-semibold text-center transition-colors"
                    >
                      View Live Weather
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* User Saved Locations */}
        {savedLocations && savedLocations.map((item) => {
          if (!item.latitude || !item.longitude) return null;
          if (item.name?.toLowerCase() === selectedCity?.toLowerCase()) return null;

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
                <div className="p-2.5 max-w-xs text-slate-900">
                  <h4 className="font-bold text-xs text-slate-900">
                    ⭐ {item.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Saved Favorite Location
                  </p>
                  <button
                    type="button"
                    onClick={() => searchCity(item.name)}
                    className="w-full py-1 px-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
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
            const repId = report.id || report._id;
            const rLat = report.latitude ?? report.location?.latitude ?? (Array.isArray(report.location?.coordinates) ? report.location.coordinates[1] : null);
            const rLon = report.longitude ?? report.location?.longitude ?? (Array.isArray(report.location?.coordinates) ? report.location.coordinates[0] : null);
            if (!rLat || !rLon) return null;
            const isHighlighted = repId && repId === highlightedReportId;
            const isVerified = report.status === 'VERIFIED' || report.is_verified;
            return (
              <Marker
                key={`comm-${repId || Math.random()}`}
                position={[rLat, rLon]}
                icon={createCommunityMarkerIcon(
                  report.category,
                  report.category_icon,
                  isVerified,
                  isHighlighted
                )}
              >
                <Popup>
                  <div className="p-2.5 max-w-xs text-xs space-y-1.5 text-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-bold flex items-center gap-1 text-slate-900">
                        <span>{report.category_icon || '📍'}</span>
                        <span>{report.category_name || report.category}</span>
                      </span>
                      {isVerified ? (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 shadow-xs">
                          <span>✨</span>
                          <span>AI Verified</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          ⏳ Under Review
                        </span>
                      )}
                    </div>

                    <p className="text-slate-700 leading-snug">
                      &ldquo;{report.description}&rdquo;
                    </p>

                    {report.ai_verification_notes && (
                      <p className="text-[10px] text-emerald-700 bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-200/70 leading-tight font-medium">
                        {report.ai_verification_notes}
                      </p>
                    )}

                    {report.image_url && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 mt-1 shadow-xs group relative">
                        <img
                          src={report.image_url}
                          alt="Incident Photo"
                          className="w-full h-32 object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                          onClick={() => window.open(report.image_url, '_blank')}
                          title="Click to view full photo"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                          📷 Ground Photo
                        </span>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between items-center">
                      <span>📍 {report.location_name || 'Ground Location'}</span>
                      <span className="font-semibold text-sky-600">Citizen Report</span>
                    </div>

                    {report.location_name && (
                      <button
                        type="button"
                        onClick={() => searchCity(report.location_name)}
                        className="w-full mt-1.5 py-1 px-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[10px] transition-colors text-center"
                      >
                        Check Weather in {report.location_name}
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Community Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportModalCoords(null);
        }}
        onSuccess={(newReport) => {
          if (newReport) {
            const repId = newReport.id || newReport._id;
            setCommunityReports((prev) => {
              const updated = [newReport, ...prev.filter((r) => (r.id || r._id) !== repId)];
              saveStoredReports(updated);
              return updated;
            });
            setShowCommunityReports(true);
            setHighlightedReportId(repId);
          }
        }}
        initialCoordinates={reportModalCoords}
      />
    </div>
  );
}
