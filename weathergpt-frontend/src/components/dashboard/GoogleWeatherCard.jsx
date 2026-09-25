import React, { useState, useMemo } from 'react';
import { 
  MapPin, 
  Crosshair, 
  MoreVertical, 
  RefreshCw, 
  Share2, 
  Check, 
  Wind as WindIcon,
  Droplets,
  CloudRain
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { useWeather } from '../../context/WeatherContext';
import { GoogleWeatherIcon } from './GoogleWeatherIcon';
import { AreaSelectorModal } from './AreaSelectorModal';
import { getStateForCity } from '../../data/indianLocations';

/**
 * Format hourly item to am/pm time label (e.g. "9 am", "12 pm")
 */
function formatHourLabel(timeStr, index) {
  if (!timeStr) return '';
  // Check if string is already formatted or HH:MM
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    let hour = parseInt(match[1], 10);
    const ampm = hour >= 12 ? 'pm' : 'am';
    hour = hour % 12 || 12;
    return `${hour} ${ampm}`;
  }
  if (timeStr.toLowerCase() === 'now') {
    const currentH = new Date().getHours();
    const ampm = currentH >= 12 ? 'pm' : 'am';
    const h = currentH % 12 || 12;
    return `${h} ${ampm}`;
  }
  return timeStr;
}

export function GoogleWeatherCard() {
  const {
    weatherData,
    hourlyForecast,
    dailyForecast,
    tempUnit,
    setTempUnit,
    windUnit,
    formatWind,
    useCurrentLocation,
    isLocating,
    refreshWeather,
    selectedCity,
    searchCity
  } = useWeather();

  const [activeTab, setActiveTab] = useState('temperature'); // 'temperature' | 'precipitation' | 'wind'
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState(() => {
    try {
      const s = localStorage.getItem('weathergpt_selected_area');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const handleSelectArea = (area) => {
    setSelectedArea(area);
    if (area) {
      localStorage.setItem('weathergpt_selected_area', JSON.stringify(area));
    } else {
      localStorage.removeItem('weathergpt_selected_area');
    }
  };

  if (!weatherData || !weatherData.current) return null;

  const { current, location } = weatherData;

  // Compute location header display string
  const locationDisplay = useMemo(() => {
    let cleanCity = (location.city || selectedCity || 'Kanpur').trim();
    if (cleanCity.toLowerCase().includes('alok mishra')) cleanCity = 'Kanpur';

    // 1. If an area is explicitly selected
    if (selectedArea) {
      const areaCity = selectedArea.city || cleanCity;
      const stateName = selectedArea.state || location.state || getStateForCity(areaCity);
      const statePart = stateName ? `, ${stateName}` : '';
      const pin = selectedArea.pincode ? ` ${selectedArea.pincode}` : '';
      return `${selectedArea.name}, ${areaCity}${statePart}${pin}`;
    }

    // 2. City without sub-area
    const stateName = location.state || getStateForCity(cleanCity);
    const parts = [];
    if (cleanCity) parts.push(cleanCity);
    if (stateName && stateName.toLowerCase() !== cleanCity.toLowerCase()) {
      parts.push(stateName);
    }
    if (location.postal_code) {
      parts.push(location.postal_code);
    } else if (cleanCity.toLowerCase() === 'kanpur') {
      parts.push('208007');
    } else if (location.country && location.country !== 'IN') {
      parts.push(location.country);
    }

    return parts.join(', ') || cleanCity;
  }, [location, selectedCity, selectedArea]);

  // Current day name (e.g., Wednesday)
  const currentDayName = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  }, []);

  // Temperature calculations
  const rawCurrentTemp = current.temp ?? 25;
  const currentTemp = tempUnit === 'F' ? Math.round((rawCurrentTemp * 9) / 5 + 32) : Math.round(rawCurrentTemp);

  // Precipitation probability
  const currentPop = current.pop !== undefined ? current.pop : (hourlyForecast?.[0]?.pop ?? 0);

  // Prepare Chart Data from real backend hourly forecast
  const chartData = useMemo(() => {
    if (hourlyForecast && hourlyForecast.length > 0) {
      return hourlyForecast.slice(0, 10).map((hour, idx) => {
        const timeLabel = formatHourLabel(hour.time, idx);
        const rawT = hour.temp ?? hour.temperature ?? (current.temp ?? current.temperature ?? 25);
        const displayTemp = tempUnit === 'F' ? Math.round((rawT * 9) / 5 + 32) : Math.round(rawT);
        const rawWind = hour.wind_speed ?? (current.wind_speed ?? 0);
        const displayWind = windUnit === 'mph' ? Math.round(rawWind * 0.621371) : Math.round(rawWind);

        return {
          timeLabel,
          displayTemp,
          rawTemp: Math.round(rawT),
          pop: hour.pop ?? 0,
          displayWind,
          condition: hour.condition || current.condition || 'Clear',
          icon: hour.icon || current.icon || 'cloud'
        };
      });
    }

    // Dynamic fallback strictly based on real current temperature from backend (NO fake thunderstorm dummy data)
    const curTemp = Math.round(current.temp ?? current.temperature ?? 25);
    const curDisplay = tempUnit === 'F' ? Math.round((curTemp * 9) / 5 + 32) : curTemp;
    const curPop = current.pop ?? 0;
    const curWind = Math.round(current.wind_speed ?? 0);
    const curDisplayWind = windUnit === 'mph' ? Math.round(curWind * 0.621371) : curWind;

    return [
      { timeLabel: 'Now', displayTemp: curDisplay, rawTemp: curTemp, pop: curPop, displayWind: curDisplayWind, condition: current.condition || 'Clear', icon: current.icon || 'cloud' },
      { timeLabel: '+3h', displayTemp: curDisplay, rawTemp: curTemp, pop: curPop, displayWind: curDisplayWind, condition: current.condition || 'Clear', icon: current.icon || 'cloud' },
      { timeLabel: '+6h', displayTemp: curDisplay, rawTemp: curTemp, pop: curPop, displayWind: curDisplayWind, condition: current.condition || 'Clear', icon: current.icon || 'cloud' },
      { timeLabel: '+9h', displayTemp: curDisplay, rawTemp: curTemp, pop: curPop, displayWind: curDisplayWind, condition: current.condition || 'Clear', icon: current.icon || 'cloud' },
    ];
  }, [hourlyForecast, tempUnit, windUnit, current]);

  // Construct forecast strip array strictly from backend dailyForecast
  const eightDayForecast = useMemo(() => {
    if (dailyForecast && dailyForecast.length > 0) {
      return dailyForecast.map((item) => ({
        day: item.day,
        date: item.date,
        temp_max: item.temp_max ?? item.max_temp ?? rawCurrentTemp,
        temp_min: item.temp_min ?? item.min_temp ?? rawCurrentTemp,
        condition: item.condition || current.condition || 'Clear',
        icon: item.icon || current.icon || 'cloud',
        pop: item.pop ?? 0,
        summary: item.summary
      }));
    }

    // Single active day from real current telemetry while daily is loading (NO fake dummy cards)
    return [
      {
        day: 'Today',
        date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date()),
        temp_max: Math.round(rawCurrentTemp),
        temp_min: Math.round(rawCurrentTemp - 4),
        condition: current.condition || 'Clear',
        icon: current.icon || 'cloud',
        pop: currentPop
      }
    ];
  }, [dailyForecast, rawCurrentTemp, current, currentPop]);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Custom chart tooltip
  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#202124] text-white border border-slate-700/80 px-3 py-2 rounded-xl shadow-2xl text-xs space-y-1 backdrop-blur-md">
          <div className="font-semibold text-slate-300">{data.timeLabel}</div>
          <div className="flex items-center gap-2">
            <GoogleWeatherIcon condition={data.icon} className="w-5 h-5" />
            <span className="font-bold text-amber-400">{data.displayTemp}°{tempUnit}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300">{data.condition}</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-0.5 border-t border-slate-800">
            <span>Rain: {data.pop}%</span>
            <span>Wind: {data.displayWind} {windUnit === 'mph' ? 'mph' : 'km/h'}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-[#0c1527] text-[#e8eaed] rounded-3xl p-5 sm:p-7 shadow-2xl border border-[#1a2c4e] transition-all font-sans relative overflow-hidden backdrop-blur-md">
      
      {/* 1. TOP LOCATION & ACTIONS ROW */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        {/* Location title + Choose area */}
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <MapPin className="w-5 h-5 text-white shrink-0" />
          <div className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-1.5 flex-wrap">
            <span>{locationDisplay}</span>
            <span className="text-[#9aa0a6] font-normal mx-0.5">·</span>
            <button
              type="button"
              onClick={() => setAreaModalOpen(true)}
              className="text-[#8ab4f8] hover:underline cursor-pointer font-normal text-sm sm:text-base inline-flex items-center transition-colors"
            >
              Choose area
            </button>
          </div>
        </div>

        {/* Action buttons: "Use precise location" & Three dots */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#5f6368] hover:border-[#8ab4f8] bg-[#303134]/50 hover:bg-[#303134] text-xs font-medium text-[#8ab4f8] transition-all disabled:opacity-50"
            title="Use device precise GPS location"
          >
            <Crosshair className={`w-3.5 h-3.5 text-[#8ab4f8] ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLocating ? 'Locating...' : 'Use precise location'}</span>
          </button>

          {/* Three dots dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-full text-[#9aa0a6] hover:text-white hover:bg-[#303134] transition-colors"
              title="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#303134] border border-[#5f6368] rounded-2xl shadow-2xl py-1.5 z-50 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setTempUnit(tempUnit === 'C' ? 'F' : 'C');
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#3c4043] text-white flex items-center justify-between"
                >
                  <span>Switch Unit to °{tempUnit === 'C' ? 'F' : 'C'}</span>
                  <span className="text-[#9aa0a6] font-mono">°C / °F</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    refreshWeather();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#3c4043] text-white flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#9aa0a6]" />
                  <span>Refresh Weather</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleShare();
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#3c4043] text-white flex items-center gap-2"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-[#9aa0a6]" />}
                  <span>{copied ? 'Copied URL!' : 'Share Weather'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. HERO WEATHER INFO SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 my-3">
        {/* Left: Big Icon + Temperature + Telemetry */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Big Weather Icon */}
          <div className="shrink-0 -my-2">
            <GoogleWeatherIcon
              condition={selectedDayIdx > 0 && eightDayForecast[selectedDayIdx] ? (eightDayForecast[selectedDayIdx].icon || eightDayForecast[selectedDayIdx].condition) : (current.icon || current.condition)}
              className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28"
            />
          </div>

          {/* Temperature with inline °C | °F Switcher */}
          <div className="flex items-start">
            <span className="text-6xl sm:text-7xl md:text-8xl font-normal tracking-tight text-white leading-none">
              {selectedDayIdx > 0 && eightDayForecast[selectedDayIdx] 
                ? (tempUnit === 'F' ? Math.round((eightDayForecast[selectedDayIdx].temp_max * 9) / 5 + 32) : Math.round(eightDayForecast[selectedDayIdx].temp_max))
                : currentTemp}
            </span>
            <div className="text-lg sm:text-xl font-normal ml-1 mt-1 text-[#9aa0a6] select-none flex items-center">
              <button
                type="button"
                onClick={() => setTempUnit('C')}
                className={`transition-colors ${tempUnit === 'C' ? 'text-white font-semibold' : 'hover:text-white'}`}
              >
                °C
              </button>
              <span className="mx-1 text-[#5f6368]">|</span>
              <button
                type="button"
                onClick={() => setTempUnit('F')}
                className={`transition-colors ${tempUnit === 'F' ? 'text-white font-semibold' : 'hover:text-white'}`}
              >
                °F
              </button>
            </div>
          </div>

          {/* Telemetry Stats beside temp */}
          <div className="text-xs sm:text-sm text-[#9aa0a6] space-y-1 pl-2 sm:pl-4 border-l border-[#3c4043]">
            <div>Precipitation: <span className="text-[#e8eaed]">{selectedDayIdx > 0 && eightDayForecast[selectedDayIdx] ? eightDayForecast[selectedDayIdx].pop : currentPop}%</span></div>
            <div>Humidity: <span className="text-[#e8eaed]">{current.humidity}%</span></div>
            <div>Wind: <span className="text-[#e8eaed]">{formatWind(current.wind_speed)}</span></div>
          </div>
        </div>

        {/* Right: Weather header / Day / Condition */}
        <div className="text-left md:text-right space-y-0.5 self-start md:self-center">
          <div className="text-xl sm:text-2xl font-normal text-white">Weather</div>
          <div className="text-sm sm:text-base text-[#bdc1c6] font-normal">
            {selectedDayIdx > 0 && eightDayForecast[selectedDayIdx] 
              ? `${eightDayForecast[selectedDayIdx].day}${eightDayForecast[selectedDayIdx].date ? ` (${eightDayForecast[selectedDayIdx].date})` : ''}` 
              : currentDayName}
          </div>
          <div className="text-sm sm:text-base text-[#9aa0a6] capitalize">
            {selectedDayIdx > 0 && eightDayForecast[selectedDayIdx] 
              ? eightDayForecast[selectedDayIdx].condition 
              : (current.description || current.condition || 'Clear')}
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE METRIC TABS */}
      <div className="flex items-center gap-6 sm:gap-8 border-b border-[#3c4043] mt-6 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('temperature')}
          className={`pb-2.5 transition-all relative ${
            activeTab === 'temperature'
              ? 'text-white font-semibold'
              : 'text-[#9aa0a6] hover:text-[#e8eaed]'
          }`}
        >
          Temperature
          {activeTab === 'temperature' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#fbc02d] rounded-t-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('precipitation')}
          className={`pb-2.5 transition-all relative ${
            activeTab === 'precipitation'
              ? 'text-white font-semibold'
              : 'text-[#9aa0a6] hover:text-[#e8eaed]'
          }`}
        >
          Precipitation
          {activeTab === 'precipitation' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#38bdf8] rounded-t-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wind')}
          className={`pb-2.5 transition-all relative ${
            activeTab === 'wind'
              ? 'text-white font-semibold'
              : 'text-[#9aa0a6] hover:text-[#e8eaed]'
          }`}
        >
          Wind
          {activeTab === 'wind' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2dd4bf] rounded-t-full" />
          )}
        </button>
      </div>

      {/* 4. SMOOTH CURVE CHART */}
      <div className="w-full h-44 sm:h-52 pt-4 relative select-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 25, right: 16, left: 16, bottom: 5 }}
          >
            <defs>
              {/* Temperature Golden Gradient */}
              <linearGradient id="googleTempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbc02d" stopOpacity={0.35} />
                <stop offset="60%" stopColor="#fbc02d" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#fbc02d" stopOpacity={0.0} />
              </linearGradient>

              {/* Precipitation Blue Gradient */}
              <linearGradient id="googlePrecipGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
                <stop offset="70%" stopColor="#0284c7" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#0284c7" stopOpacity={0.0} />
              </linearGradient>

              {/* Wind Teal Gradient */}
              <linearGradient id="googleWindGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.4} />
                <stop offset="70%" stopColor="#0f766e" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#0f766e" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            {/* XAxis with time labels: 9 am, 12 pm, etc. */}
            <XAxis
              dataKey="timeLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9aa0a6', fontSize: 12, dy: 8 }}
            />

            {/* Hidden Y-Axis with padded domain */}
            <YAxis
              hide={true}
              domain={
                activeTab === 'temperature'
                  ? ['dataMin - 3', 'dataMax + 4']
                  : activeTab === 'precipitation'
                  ? [0, 100]
                  : ['dataMin - 2', 'dataMax + 5']
              }
            />

            <Tooltip content={<CustomChartTooltip />} />

            {/* TEMPERATURE CURVE */}
            {activeTab === 'temperature' && (
              <Area
                type="monotone"
                dataKey="displayTemp"
                stroke="#fbc02d"
                strokeWidth={2.5}
                fill="url(#googleTempGrad)"
                dot={{ r: 2.5, fill: '#fbc02d', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#ffffff', stroke: '#fbc02d', strokeWidth: 2 }}
                animationDuration={600}
              >
                <LabelList
                  dataKey="displayTemp"
                  position="top"
                  offset={10}
                  fill="#e8eaed"
                  fontSize={12}
                  fontWeight={600}
                  formatter={(v) => `${v}`}
                />
              </Area>
            )}

            {/* PRECIPITATION CURVE */}
            {activeTab === 'precipitation' && (
              <Area
                type="monotone"
                dataKey="pop"
                stroke="#38bdf8"
                strokeWidth={2.5}
                fill="url(#googlePrecipGrad)"
                dot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#ffffff', stroke: '#38bdf8', strokeWidth: 2 }}
                animationDuration={600}
              >
                <LabelList
                  dataKey="pop"
                  position="top"
                  offset={10}
                  fill="#7dd3fc"
                  fontSize={12}
                  fontWeight={600}
                  formatter={(v) => `${v}%`}
                />
              </Area>
            )}

            {/* WIND CURVE */}
            {activeTab === 'wind' && (
              <Area
                type="monotone"
                dataKey="displayWind"
                stroke="#2dd4bf"
                strokeWidth={2.5}
                fill="url(#googleWindGrad)"
                dot={{ r: 3, fill: '#2dd4bf', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#ffffff', stroke: '#2dd4bf', strokeWidth: 2 }}
                animationDuration={600}
              >
                <LabelList
                  dataKey="displayWind"
                  position="top"
                  offset={10}
                  fill="#5eead4"
                  fontSize={12}
                  fontWeight={600}
                  formatter={(v) => `${v}`}
                />
              </Area>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 5. 8-DAY HORIZONTAL DAILY FORECAST STRIP */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mt-4 pt-3 border-t border-[#1a2c4e]">
        {eightDayForecast.map((item, idx) => {
          const isSelected = idx === selectedDayIdx;
          const maxT = tempUnit === 'F' ? Math.round((item.temp_max * 9) / 5 + 32) : Math.round(item.temp_max);
          const minT = tempUnit === 'F' ? Math.round((item.temp_min * 9) / 5 + 32) : Math.round(item.temp_min);

          return (
            <button
              key={`${item.day}-${idx}`}
              type="button"
              onClick={() => setSelectedDayIdx(idx)}
              className={`flex flex-col items-center justify-between p-2.5 rounded-2xl transition-all cursor-pointer text-center ${
                isSelected
                  ? 'bg-[#112437] ring-1 ring-[#1e3b66] shadow-md'
                  : 'hover:bg-[#111f38]/60'
              }`}
            >
              {/* Day Name */}
              <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-white font-semibold' : 'text-[#bdc1c6]'}`}>
                {item.day}
              </span>

              {/* Weather Icon */}
              <div className="my-2">
                <GoogleWeatherIcon
                  condition={item.icon || item.condition}
                  className="w-8 h-8 sm:w-9 sm:h-9"
                />
              </div>

              {/* Temp Range: High Low */}
              <div className="text-xs flex items-center justify-center gap-1.5 font-medium">
                <span className="text-white font-semibold">{maxT}°</span>
                <span className="text-[#9aa0a6]">{minT}°</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Area Selector Modal */}
      <AreaSelectorModal
        isOpen={areaModalOpen}
        onClose={() => setAreaModalOpen(false)}
        currentCity={(location.city?.toLowerCase()?.includes('alok mishra') ? 'Kanpur' : location.city) || selectedCity || 'Kanpur'}
        currentState={location.state || getStateForCity((location.city?.toLowerCase()?.includes('alok mishra') ? 'Kanpur' : location.city) || selectedCity || 'Kanpur')}
        selectedArea={selectedArea}
        onSelectArea={handleSelectArea}
        onSwitchCity={(newCity) => {
          searchCity(newCity);
          handleSelectArea(null);
        }}
      />
    </div>
  );
}
