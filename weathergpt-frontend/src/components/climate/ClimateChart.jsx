import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Temperature Trend Chart with Min, Avg, Max temperatures and regression trend.
 */
export function TemperatureTrendChart({ data = [], trend = null }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  // Support both new data (points with date) and legacy data (month)
  const chartData = data.map((d) => ({
    ...d,
    label: d.date ? d.date.slice(5) : d.month || '',
    avgTemp: d.avg !== undefined ? d.avg : d.currentTemp,
    minTemp: d.min !== undefined ? d.min : null,
    maxTemp: d.max !== undefined ? d.max : null,
    histTemp: d.historicalAvgTemp,
  }));

  return (
    <div className="w-full space-y-2">
      {trend && (
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-1.5">
            {trend.direction === 'increasing' ? (
              <span className="flex items-center gap-1 font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                <TrendingUp className="w-3.5 h-3.5" /> Trend: Warming (+{trend.slope} {trend.unit})
              </span>
            ) : trend.direction === 'decreasing' ? (
              <span className="flex items-center gap-1 font-semibold text-sky-500 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-lg border border-sky-200 dark:border-sky-800">
                <TrendingDown className="w-3.5 h-3.5" /> Trend: Cooling ({trend.slope} {trend.unit})
              </span>
            ) : (
              <span className="flex items-center gap-1 font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <Minus className="w-3.5 h-3.5" /> Trend: Stable
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">{trend.description}</span>
        </div>
      )}

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAvgTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0e8ce6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0e8ce6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorMaxTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="label" stroke={textColor} fontSize={11} tickLine={false} />
            <YAxis stroke={textColor} fontSize={11} unit="°C" tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderColor: isDark ? '#334155' : '#e2e8f0',
                borderRadius: '1rem',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            {chartData.some((d) => d.maxTemp !== null) && (
              <Area
                type="monotone"
                dataKey="maxTemp"
                name="Max Temp (°C)"
                stroke="#f43f5e"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                fill="url(#colorMaxTemp)"
              />
            )}
            <Area
              type="monotone"
              dataKey="avgTemp"
              name="Avg Temp (°C)"
              stroke="#0e8ce6"
              strokeWidth={2.5}
              fill="url(#colorAvgTemp)"
            />
            {chartData.some((d) => d.minTemp !== null) && (
              <Area
                type="monotone"
                dataKey="minTemp"
                name="Min Temp (°C)"
                stroke="#06b6d4"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                fill="none"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Rainfall Trend Chart with Daily precipitation and Cumulative volume line.
 */
export function RainfallDistributionChart({ data = [], totalRainfall = null, rainyDays = null }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const chartData = data.map((d) => ({
    ...d,
    label: d.date ? d.date.slice(5) : d.month || '',
    dailyRain: d.rainfall !== undefined ? d.rainfall : d.actualRainfall,
    cumRain: d.cumulative !== undefined ? d.cumulative : null,
    histRain: d.historicalRainfall,
  }));

  return (
    <div className="w-full space-y-2">
      {totalRainfall !== null && (
        <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
          <span>
            Total Observed: <strong className="text-sky-500">{totalRainfall} mm</strong>
          </span>
          {rainyDays !== null && (
            <span>
              Rainy Days (≥0.1mm): <strong className="text-slate-800 dark:text-slate-200">{rainyDays}</strong>
            </span>
          )}
        </div>
      )}

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="label" stroke={textColor} fontSize={11} tickLine={false} />
            <YAxis stroke={textColor} fontSize={11} unit="mm" tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderColor: isDark ? '#334155' : '#e2e8f0',
                borderRadius: '1rem',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Bar dataKey="dailyRain" name="Daily Rainfall (mm)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            {chartData.some((d) => d.cumRain !== null) && (
              <Line
                type="monotone"
                dataKey="cumRain"
                name="Cumulative (mm)"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            )}
            {chartData.some((d) => d.histRain !== undefined) && (
              <Bar dataKey="histRain" name="Historical Average (mm)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Relative Humidity variation time-series.
 */
export function HumidityTrendChart({ data = [] }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const chartData = data.map((d) => ({
    ...d,
    label: d.date ? d.date.slice(5) : '',
    hum: d.humidity,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorHumidity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="label" stroke={textColor} fontSize={11} tickLine={false} />
          <YAxis stroke={textColor} fontSize={11} unit="%" tickLine={false} domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              borderRadius: '1rem',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Area
            type="monotone"
            dataKey="hum"
            name="Relative Humidity (%)"
            stroke="#14b8a6"
            strokeWidth={2}
            fill="url(#colorHumidity)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Backward-compatible Climate Anomaly Chart.
 */
export function ClimateAnomalyChart({ data = [] }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="year" stroke={textColor} fontSize={11} tickLine={false} />
          <YAxis stroke={textColor} fontSize={11} unit="°C" tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              borderRadius: '1rem',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Line
            type="monotone"
            dataKey="tempAnomaly"
            name="Temperature Anomaly (+°C above pre-industrial)"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ r: 4, fill: '#ef4444' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
