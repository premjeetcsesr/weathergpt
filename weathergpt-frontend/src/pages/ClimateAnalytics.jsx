import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchClimateSummary,
  fetchTemperatureTrend,
  fetchRainfallTrend,
  fetchHumidityTrend,
  fetchClimateAnomalies,
  fetchClimateComparison,
  generateClimateInsights,
} from '../services/climateApi';
import { searchLocations } from '../services/weatherApi';
import { useWeather } from '../context/WeatherContext';
import { useLanguage } from '../context/LanguageContext';
import {
  TemperatureTrendChart,
  RainfallDistributionChart,
  HumidityTrendChart,
} from '../components/climate/ClimateChart';
import { VoiceOutput } from '../components/VoiceOutput';
import { Loading } from '../components/common/Loading';
import {
  BarChart3,
  Thermometer,
  CloudRain,
  Droplets,
  Wind,
  Calendar,
  Search,
  MapPin,
  Sparkles,
  AlertTriangle,
  Info,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Flame,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export function ClimateAnalytics() {
  const { selectedCity, searchCity } = useWeather();
  const { currentLanguage, t } = useLanguage();

  // Location search state
  const [activeCity, setActiveCity] = useState(selectedCity || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Time range selector state
  const [rangeKey, setRangeKey] = useState('last_30_days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [tempData, setTempData] = useState(null);
  const [rainData, setRainData] = useState(null);
  const [humidityData, setHumidityData] = useState(null);
  const [anomaliesData, setAnomaliesData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);

  // AI Insights state
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Keep activeCity synchronized with global selectedCity
  useEffect(() => {
    if (selectedCity && selectedCity !== activeCity) {
      setActiveCity(selectedCity);
    }
  }, [selectedCity]);

  // Location autocomplete search
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      searchLocations(searchQuery).then((results) => {
        setSuggestions(results || []);
        setShowSuggestions(true);
      });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  const loadClimateData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const queryParams = {
      city: activeCity,
      range_key: rangeKey,
      start_date: rangeKey === 'custom' ? customStart : undefined,
      end_date: rangeKey === 'custom' ? customEnd : undefined,
    };

    try {
      const [summary, temp, rain, hum, anom, comp] = await Promise.all([
        fetchClimateSummary(queryParams),
        fetchTemperatureTrend(queryParams),
        fetchRainfallTrend(queryParams),
        fetchHumidityTrend(queryParams),
        fetchClimateAnomalies(queryParams),
        fetchClimateComparison(queryParams),
      ]);

      setSummaryData(summary);
      setTempData(temp);
      setRainData(rain);
      setHumidityData(hum);
      setAnomaliesData(anom);
      setComparisonData(comp);

      // Trigger grounded AI explanation if summary metrics are available
      if (summary?.metrics?.avg_temperature !== undefined && summary.metrics.avg_temperature !== null) {
        setAiLoading(true);
        generateClimateInsights({
          location: activeCity,
          period: summary.period?.range_key || rangeKey,
          metrics: {
            ...summary.metrics,
            temperature_change: comp?.metrics?.find((m) => m.metric_name === 'Average Temperature')?.delta,
            rainfall_change: comp?.metrics?.find((m) => m.metric_name === 'Total Rainfall')?.percentage_change,
          },
          language: currentLanguage,
        })
          .then((res) => {
            setAiInsight(res.insight || '');
          })
          .finally(() => setAiLoading(false));
      } else {
        setAiInsight('');
      }
    } catch (err) {
      console.error('Failed to load climate analytics:', err);
      setError('Unable to retrieve meteorological archive records. Please try another period or location.');
    } finally {
      setLoading(false);
    }
  }, [activeCity, rangeKey, customStart, customEnd, currentLanguage]);

  useEffect(() => {
    loadClimateData();
  }, [loadClimateData]);

  const handleSelectCity = (cityObj) => {
    const name = cityObj.name || cityObj.city || searchQuery;
    setActiveCity(name);
    searchCity(name);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const timeRangeOptions = [
    { key: 'last_7_days', label: 'Last 7 Days' },
    { key: 'last_30_days', label: 'Last 30 Days' },
    { key: 'last_3_months', label: 'Last 3 Months' },
    { key: 'last_6_months', label: 'Last 6 Months' },
    { key: 'last_1_year', label: 'Last 1 Year' },
    { key: 'custom', label: 'Custom Range' },
  ];

  const metrics = summaryData?.metrics || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-subtle">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Climate Analytics & Long-Term Trends
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Empirical observation history, Z-score anomaly classification, and period comparisons.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Location Selector + Refresh */}
        <div className="flex items-center gap-2">
          {/* Location Search Input */}
          <div className="relative">
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-1.5 shadow-sm text-xs w-56 sm:w-64">
              <MapPin className="w-3.5 h-3.5 text-brand-500 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Location: ${activeCity}`}
                className="bg-transparent w-full focus:outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute right-0 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-elevated z-50 p-1 max-h-48 overflow-y-auto">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectCity(item)}
                    className="w-full text-left px-3 py-1.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-[10px] text-slate-400">{item.country || 'IN'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={loadClimateData}
            title="Refresh Climate Telemetry"
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand-500 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Time Range Selector Bar */}
      <div className="p-2.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <Calendar className="w-4 h-4 text-slate-400 ml-2 mr-1 shrink-0" />
          {timeRangeOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRangeKey(opt.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                rangeKey === opt.key
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Pickers */}
        {rangeKey === 'custom' && (
          <div className="flex items-center gap-2 text-xs pr-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Transparency Data Source Banner */}
      {summaryData && (
        <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>
              Source: <strong>{summaryData.source}</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span>
              Location: <strong>{summaryData.location?.name}</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span>
              Period: {summaryData.period?.start_date} → {summaryData.period?.end_date}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Updated: {new Date(summaryData.last_updated).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-center shadow-card">
          <Loading message="Aggregating verified meteorological historical records..." />
        </div>
      )}

      {/* Error / Empty State */}
      {!loading && summaryData && !summaryData.data_available && (
        <div className="p-8 rounded-3xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-center space-y-3">
          <Info className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
            Historical Climate Data Unavailable
          </h3>
          <p className="text-xs text-amber-800 dark:text-amber-300 max-w-md mx-auto">
            {summaryData.message || 'Historical climate data is not available for this period from the configured source.'}
          </p>
          <div className="pt-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Search for a city to load its live climate analytics.
            </span>
          </div>
        </div>
      )}

      {/* Analytics Dashboard Grid */}
      {!loading && summaryData && summaryData.data_available && (
        <>
          {/* C. Climate Metric Snapshot Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Avg Temp */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Avg Temperature</span>
                <Thermometer className="w-4 h-4 text-brand-500" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {metrics.avg_temperature !== null ? `${metrics.avg_temperature}°C` : '--'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Mean observed across period</span>
            </div>

            {/* Max Temp */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Maximum Temp</span>
                <Flame className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {metrics.max_temperature !== null ? `${metrics.max_temperature}°C` : '--'}
              </span>
              <span className="text-[10px] text-rose-500 block mt-0.5">Peak daytime heat index</span>
            </div>

            {/* Min Temp */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Minimum Temp</span>
                <Thermometer className="w-4 h-4 text-cyan-500" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {metrics.min_temperature !== null ? `${metrics.min_temperature}°C` : '--'}
              </span>
              <span className="text-[10px] text-cyan-500 block mt-0.5">Low nocturnal reading</span>
            </div>

            {/* Total Rainfall */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Total Rainfall</span>
                <CloudRain className="w-4 h-4 text-sky-500" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {metrics.total_rainfall !== null ? `${metrics.total_rainfall} mm` : '0 mm'}
              </span>
              <span className="text-[10px] text-sky-500 block mt-0.5">{metrics.rainy_days} rainy day(s)</span>
            </div>

            {/* Avg Humidity */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Average Humidity</span>
                <Droplets className="w-4 h-4 text-teal-500" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {metrics.avg_humidity !== null ? `${metrics.avg_humidity}%` : '--'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Relative air moisture</span>
            </div>

            {/* Avg Wind Speed */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Average Wind</span>
                <Wind className="w-4 h-4 text-indigo-500" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {metrics.avg_wind_speed !== null ? `${metrics.avg_wind_speed} km/h` : '--'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Mean surface vector</span>
            </div>

            {/* Rainy Days */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Rainy Days</span>
                <CloudRain className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {metrics.rainy_days}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Precipitation ≥ 0.1mm</span>
            </div>

            {/* Extreme Weather Events */}
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Extreme Events</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {metrics.extreme_weather_events || 0}
              </span>
              <span className="text-[10px] text-amber-500 block mt-0.5">Heatwaves / heavy storms</span>
            </div>
          </div>

          {/* AI Climate Insight Card with Voice Output */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-brand-50/80 via-white to-sky-50/50 dark:from-brand-950/40 dark:via-slate-900 dark:to-slate-900 border border-brand-200/80 dark:border-brand-800/80 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <h3 className="font-bold text-sm">Grounded AI Climate Interpretation</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-semibold uppercase tracking-wider">
                  Verified Telemetry
                </span>
              </div>
              {aiInsight && <VoiceOutput text={aiInsight} language={currentLanguage} />}
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
              {aiLoading ? (
                <span className="text-slate-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-500" />
                  Synthesizing verified climate telemetry explanation...
                </span>
              ) : aiInsight ? (
                `"${aiInsight}"`
              ) : (
                'Numerical metrics calculated above reflect verified meteorological baseline records.'
              )}
            </p>
          </div>

          {/* D. Temperature Trend Chart */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-brand-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Temperature Trend & Range (Min / Avg / Max)
                </h3>
              </div>
            </div>
            {tempData?.points?.length > 0 ? (
              <TemperatureTrendChart data={tempData.points} trend={tempData.trend} />
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                No temperature points available.
              </div>
            )}
          </div>

          {/* Charts Row: Rainfall Trend & Humidity Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* E. Rainfall Trend Chart */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-sky-500" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Precipitation Distribution & Cumulative Total
                  </h3>
                </div>
              </div>
              {rainData?.points?.length > 0 ? (
                <RainfallDistributionChart
                  data={rainData.points}
                  totalRainfall={rainData.total_rainfall}
                  rainyDays={rainData.rainy_days}
                />
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                  No rainfall readings available.
                </div>
              )}
            </div>

            {/* F. Humidity Trend Chart */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-teal-500" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Relative Humidity Profile
                  </h3>
                </div>
              </div>
              {humidityData?.points?.length > 0 ? (
                <HumidityTrendChart data={humidityData.points} />
              ) : (
                <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                  No humidity readings available.
                </div>
              )}
            </div>
          </div>

          {/* G. Weather Comparison Card */}
          {comparisonData && (
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Period Comparison Analysis
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {comparisonData.comparison_label || 'Current Period vs Previous Equivalent Period'}
                    </p>
                  </div>
                </div>
              </div>

              {comparisonData.sufficient_data_for_comparison && comparisonData.metrics?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {comparisonData.metrics.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1"
                    >
                      <span className="text-slate-400 block text-[11px] font-medium">{m.metric_name}</span>
                      <div className="flex items-baseline justify-between">
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {m.current_value} {m.unit}
                        </span>
                        <span
                          className={`font-semibold text-xs flex items-center gap-0.5 ${
                            m.delta > 0
                              ? 'text-rose-500'
                              : m.delta < 0
                              ? 'text-sky-500'
                              : 'text-slate-500'
                          }`}
                        >
                          {m.delta > 0 ? '+' : ''}
                          {m.delta} {m.unit}
                          {m.percentage_change !== null && ` (${m.percentage_change}%)`}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Previous: {m.previous_value} {m.unit}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{comparisonData.message || 'Comparison requires historical data for the previous equivalent window.'}</span>
                </div>
              )}
            </div>
          )}

          {/* 2. Statistical Climate Anomaly Detection */}
          {anomaliesData?.anomalies?.length > 0 && (
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Statistical Climate Anomaly Detection
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Z-score deviation against historical observational baseline (|z| &lt; 1 Normal, 1 ≤ |z| &lt; 2 Moderate, |z| ≥ 2 Significant)
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {anomaliesData.anomalies.map((anom, idx) => {
                  const isSig = anom.classification === 'Significant anomaly';
                  const isMod = anom.classification === 'Moderate anomaly';

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                        isSig
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                          : isMod
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                          : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold capitalize text-slate-900 dark:text-slate-100">
                          {anom.metric} Anomaly
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSig
                              ? 'bg-rose-500 text-white'
                              : isMod
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          {anom.classification}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between text-slate-600 dark:text-slate-300">
                        <span>Z-Score: <strong>{anom.z_score > 0 ? `+${anom.z_score}` : anom.z_score}</strong></span>
                        <span className="text-[10px] text-slate-400">
                          Baseline μ: {anom.baseline_mean} (σ: {anom.standard_deviation})
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-tight">
                        {anom.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
export default ClimateAnalytics;
