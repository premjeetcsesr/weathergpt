import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { useWeather } from '../../context/WeatherContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { mockWeatherDatabase } from '../../data/mockWeather';
import { mockAlertsDatabase } from '../../data/mockAlerts';
import { OPENWEATHER_API_KEY, CARTO_API_KEY } from '../../services/apiConfig';
import { createCustomMarkerIcon, createAlertMarkerIcon } from './LocationMarker';
import { WeatherLayers, MapLegend } from './WeatherLayers';
import { CloudRain, Wind, Droplets, ArrowUpRight } from 'lucide-react';

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

export function WeatherMap({ height = "550px" }) {
  const { selectedCity, weatherData, searchCity, formatTemp, formatWind } = useWeather();
  const { theme } = useTheme();
  const { t } = useLanguage();

  const [activeLayer, setActiveLayer] = useState('precipitation');

  // Center on currently selected city or default
  const defaultCenter = [26.4499, 80.3319]; // Kanpur coordinates
  const currentCenter = weatherData?.location
    ? [weatherData.location.lat, weatherData.location.lon]
    : defaultCenter;

  const isDark = theme === 'dark';

  const allCities = Object.values(mockWeatherDatabase);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-card border border-slate-200/80 dark:border-slate-800 bg-slate-900" style={{ height }}>
      {/* Top Floating Controls */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto">
          <WeatherLayers activeLayer={activeLayer} setActiveLayer={setActiveLayer} />
        </div>
      </div>

      {/* Bottom Floating Legend */}
      <div className="absolute bottom-4 left-4 z-[400] pointer-events-auto">
        <MapLegend activeLayer={activeLayer} />
      </div>

      {/* Leaflet Map Container */}
      <MapContainer
        center={currentCenter}
        zoom={6}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="z-10"
      >
        <MapController center={currentCenter} zoom={7} />
        
        {/* Base Tile Layer: Use CARTO with API key if configured, otherwise clean Esri Canvas with no watermark */}
        {CARTO_API_KEY ? (
          <TileLayer
            key={isDark ? 'carto-dark' : 'carto-light'}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={
              isDark
                ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${CARTO_API_KEY}`
                : `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?api_key=${CARTO_API_KEY}`
            }
            maxZoom={19}
          />
        ) : (
          <>
            <TileLayer
              key={isDark ? 'esri-dark-base' : 'esri-light-base'}
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>, DeLorme, NAVTEQ'
              url={
                isDark
                  ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
                  : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
              }
              maxZoom={16}
            />
            <TileLayer
              key={isDark ? 'esri-dark-ref' : 'esri-light-ref'}
              url={
                isDark
                  ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
                  : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
              }
              maxZoom={16}
              zIndex={5}
            />
          </>
        )}

        {/* Live OpenWeatherMap Tile Layers */}
        {activeLayer === 'precipitation' && OPENWEATHER_API_KEY && (
          <TileLayer
            key="owm-precipitation"
            url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`}
            opacity={0.65}
            zIndex={10}
          />
        )}

        {activeLayer === 'temperature' && OPENWEATHER_API_KEY && (
          <TileLayer
            key="owm-temperature"
            url={`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`}
            opacity={0.55}
            zIndex={10}
          />
        )}

        {activeLayer === 'wind' && OPENWEATHER_API_KEY && (
          <TileLayer
            key="owm-wind"
            url={`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_API_KEY}`}
            opacity={0.55}
            zIndex={10}
          />
        )}

        {/* Simulated Radar / Temperature / Wind Circles depending on layer */}
        {activeLayer === 'precipitation' && allCities.map((c) => {
          const isSelected = c.location.city.toLowerCase() === selectedCity.toLowerCase();
          const radius = isSelected ? 45000 : 30000;
          return (
            <Circle
              key={`precip-${c.location.city}`}
              center={[c.location.lat, c.location.lon]}
              radius={radius}
              pathOptions={{
                color: '#0284c7',
                fillColor: '#38bdf8',
                fillOpacity: isSelected ? 0.35 : 0.2,
                weight: 1.5,
              }}
            />
          );
        })}

        {activeLayer === 'temperature' && allCities.map((c) => {
          const temp = c.current.temp;
          const heatColor = temp > 32 ? '#ef4444' : temp > 26 ? '#f59e0b' : '#3b82f6';
          return (
            <Circle
              key={`temp-${c.location.city}`}
              center={[c.location.lat, c.location.lon]}
              radius={38000}
              pathOptions={{
                color: heatColor,
                fillColor: heatColor,
                fillOpacity: 0.25,
                weight: 1,
              }}
            />
          );
        })}

        {/* Alert Markers */}
        {(activeLayer === 'alerts' || activeLayer === 'precipitation') &&
          mockAlertsDatabase.map((alert) => (
            <Marker
              key={alert.id}
              position={alert.coordinates}
              icon={createAlertMarkerIcon(alert.title, alert.severity)}
            >
              <Popup>
                <div className="p-3 max-w-xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 mb-1">
                    <span>⚠️ {alert.severity} Alert</span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 mb-1">
                    {alert.title} ({alert.location})
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug mb-2">
                    {alert.headline}
                  </p>
                  <button
                    onClick={() => searchCity(alert.location)}
                    className="w-full py-1 px-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-semibold text-center transition-colors"
                  >
                    View City Weather
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* City Markers */}
        {allCities.map((item) => {
          const isCurrent = item.location.city.toLowerCase() === selectedCity.toLowerCase();
          const markerIcon = createCustomMarkerIcon(
            item.location.city,
            formatTemp(item.current.temp),
            isCurrent ? 'selected' : 'city'
          );

          return (
            <Marker
              key={item.location.city}
              position={[item.location.lat, item.location.lon]}
              icon={markerIcon}
              eventHandlers={{
                click: () => {
                  searchCity(item.location.city);
                }
              }}
            >
              <Popup>
                <div className="p-3 max-w-xs">
                  <div className="flex items-center justify-between mb-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {item.location.city}
                      </h3>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.location.state}, {item.location.country}
                      </span>
                    </div>
                    <span className="text-base font-extrabold text-brand-600 dark:text-brand-400">
                      {formatTemp(item.current.temp)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mb-2">
                    {item.current.condition}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 mb-3 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                    <div className="flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-blue-500" />
                      <span>{item.current.humidity}% Hum</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Wind className="w-3 h-3 text-teal-500" />
                      <span>{formatWind(item.current.wind_speed)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => searchCity(item.location.city)}
                    className="w-full py-1.5 px-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Inspect Dashboard</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
