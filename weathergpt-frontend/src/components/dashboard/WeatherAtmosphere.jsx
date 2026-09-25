import React, { useEffect, useRef, useState } from 'react';
import { 
  CloudRain, 
  CloudLightning, 
  Wind, 
  Sun, 
  Sparkles, 
  AlertTriangle,
  Radio
} from 'lucide-react';

/**
 * Natural Ambient Atmospheric Engine:
 * Renders realistic dynamic rain droplets, lightning flashes, wind streams,
 * and disaster-mode ambient emergency lighting.
 */
export function WeatherAtmosphere({ 
  currentWeather, 
  activeThemeOverride = 'auto', 
  onThemeChange 
}) {
  const canvasRef = useRef(null);
  const [lightningFlash, setLightningFlash] = useState(false);

  // Determine current atmospheric condition
  const detectedCondition = (() => {
    if (activeThemeOverride && activeThemeOverride !== 'auto') {
      return activeThemeOverride;
    }
    const cond = (currentWeather?.condition || currentWeather?.description || '').toLowerCase();
    const icon = (currentWeather?.icon || '').toLowerCase();
    const rainAmount = Number(currentWeather?.rain ?? currentWeather?.precipitation ?? 0);

    // 1. Storm / Thunderstorm
    if (
      cond.includes('thunder') || 
      cond.includes('storm') || 
      cond.includes('tornado') || 
      cond.includes('cyclone') ||
      icon.includes('11') ||
      icon.includes('lightning')
    ) {
      return 'storm';
    }

    // 2. Active Rain ONLY if actual rain is occurring
    const isRaining = 
      cond.includes('rain') || 
      cond.includes('drizzle') || 
      cond.includes('shower') || 
      icon.includes('09') || 
      icon.includes('10') || 
      icon.includes('rain') ||
      rainAmount > 0.2;

    if (isRaining) {
      return 'rain';
    }

    // 3. High Wind
    if (cond.includes('wind') || (currentWeather?.wind_speed ?? 0) >= 35) {
      return 'wind';
    }

    // 4. Clear / Sun
    if (cond.includes('clear') || cond.includes('sun') || icon.includes('01') || icon.includes('sun')) {
      return 'sun';
    }

    // 5. Default is 'none' (normal clouds/haze/mist/overcast - NO RAIN!)
    return 'none';
  })();

  // Dynamic Canvas Rain & Wind Particle Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particle state
    const raindrops = [];
    const raindropCount = detectedCondition === 'storm' ? 180 : detectedCondition === 'rain' ? 110 : 0;

    for (let i = 0; i < raindropCount; i++) {
      raindrops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        length: Math.random() * 20 + 15,
        speed: Math.random() * 12 + 16,
        opacity: Math.random() * 0.4 + 0.25,
        thickness: Math.random() * 1.5 + 0.8,
      });
    }

    const windLines = [];
    const windCount = detectedCondition === 'wind' || detectedCondition === 'storm' ? 35 : 0;
    for (let i = 0; i < windCount; i++) {
      windLines.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        length: Math.random() * 100 + 60,
        speed: Math.random() * 8 + 10,
        opacity: Math.random() * 0.25 + 0.1,
      });
    }

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Rain
      if (raindrops.length > 0) {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineCap = 'round';
        for (let i = 0; i < raindrops.length; i++) {
          const drop = raindrops[i];
          ctx.beginPath();
          ctx.lineWidth = drop.thickness;
          ctx.globalAlpha = drop.opacity;
          // Angled wind slant
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - 3, drop.y + drop.length);
          ctx.stroke();

          // Move down
          drop.y += drop.speed;
          drop.x -= 2;

          // Wrap around
          if (drop.y > canvas.height) {
            drop.y = -drop.length;
            drop.x = Math.random() * canvas.width;
          }
          if (drop.x < 0) {
            drop.x = canvas.width;
          }
        }
      }

      // 2. Draw Wind Streams
      if (windLines.length > 0) {
        ctx.strokeStyle = '#99f6e4';
        ctx.lineCap = 'round';
        for (let i = 0; i < windLines.length; i++) {
          const stream = windLines[i];
          ctx.beginPath();
          ctx.lineWidth = 1.2;
          ctx.globalAlpha = stream.opacity;
          ctx.moveTo(stream.x, stream.y);
          ctx.bezierCurveTo(
            stream.x + stream.length * 0.3,
            stream.y - 10,
            stream.x + stream.length * 0.7,
            stream.y + 10,
            stream.x + stream.length,
            stream.y
          );
          ctx.stroke();

          stream.x += stream.speed;
          if (stream.x > canvas.width + stream.length) {
            stream.x = -stream.length;
            stream.y = Math.random() * canvas.height;
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [detectedCondition]);

  // Random Lightning Flash Generator during Storms
  useEffect(() => {
    if (detectedCondition !== 'storm') return;
    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        setLightningFlash(true);
        setTimeout(() => setLightningFlash(false), 120);
        setTimeout(() => {
          setLightningFlash(true);
          setTimeout(() => setLightningFlash(false), 80);
        }, 180);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [detectedCondition]);

  return (
    <>
      {/* Fullscreen Canvas for Falling Rain & Wind Particles (strictly background) */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0 w-full h-full"
      />

      {/* Atmospheric Background Ambient Lighting based on Weather */}
      <div 
        className={`fixed inset-0 pointer-events-none -z-10 transition-opacity duration-1000 ${
          detectedCondition === 'storm'
            ? 'bg-gradient-to-b from-slate-950 via-[#131b2e] to-[#0a0f1d] opacity-90'
            : detectedCondition === 'rain'
            ? 'bg-gradient-to-b from-[#0f172a] via-[#111c33] to-[#0b1326] opacity-80'
            : detectedCondition === 'wind'
            ? 'bg-gradient-to-b from-[#0c1a24] via-[#09151e] to-[#050b10] opacity-75'
            : 'bg-transparent opacity-0'
        }`}
      />

      {/* Lightning Flash Overlay */}
      {lightningFlash && (
        <div className="fixed inset-0 pointer-events-none z-10 bg-blue-100/15 backdrop-blur-[1px] transition-all" />
      )}

      {/* Top Floating Atmosphere Controller & Disaster Status Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 px-3.5 py-2.5 rounded-2xl bg-[#0c1527] border border-[#1a2c4e] shadow-sm text-xs">
        
        {/* Left: Weather Condition Status & Live Radio indicator */}
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              detectedCondition === 'storm' ? 'bg-red-400' : detectedCondition === 'rain' ? 'bg-blue-400' : 'bg-emerald-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              detectedCondition === 'storm' ? 'bg-red-500' : detectedCondition === 'rain' ? 'bg-blue-500' : 'bg-emerald-500'
            }`} />
          </span>
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>Atmospheric Engine:</span>
          </span>
          <span className="capitalize px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-sky-950/80 text-sky-300 border border-sky-700/50">
            {detectedCondition === 'storm' 
              ? '⛈️ Convective Storm Active' 
              : detectedCondition === 'rain' 
              ? '🌧️ Active Rain & Droplets' 
              : detectedCondition === 'wind' 
              ? '💨 High Wind Velocity' 
              : detectedCondition === 'sun' 
              ? '☀️ Clear Solar Ambiance'
              : `☁️ Ambient (${currentWeather?.condition || 'Stable'})`}
          </span>
        </div>

        {/* Right: Quick Atmosphere Mode Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Theme:</span>
          <button
            type="button"
            onClick={() => onThemeChange('auto')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all ${
              activeThemeOverride === 'auto'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            Auto Live
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('rain')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all ${
              activeThemeOverride === 'rain'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            <CloudRain className="w-3 h-3 text-blue-400" />
            Rain
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('storm')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all ${
              activeThemeOverride === 'storm'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            <CloudLightning className="w-3 h-3 text-amber-300" />
            Storm / Disaster
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('wind')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all ${
              activeThemeOverride === 'wind'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            <Wind className="w-3 h-3 text-teal-400" />
            Wind
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('sun')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all ${
              activeThemeOverride === 'sun'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3 h-3 text-yellow-300" />
            Sunny
          </button>
        </div>

      </div>
    </>
  );
}
