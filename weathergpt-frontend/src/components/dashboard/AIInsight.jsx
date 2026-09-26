import React from 'react';
import { Sparkles, Bot, Sprout, Car, ArrowRight, Zap } from 'lucide-react';
import { useWeather } from '../../context/WeatherContext';
import { useLanguage } from '../../context/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';

export function AIInsight() {
  const { weatherData } = useWeather();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!weatherData || !weatherData.ai_insight) return null;

  const { ai_insight, location = {} } = weatherData;

  const handleAskGPT = () => {
    navigate('/', {
      state: { prompt: `Tell me more about the weather forecast and travel conditions in ${location.city}` }
    });
  };

  return (
    <div className="rounded-3xl p-6 bg-gradient-to-br from-brand-900 via-slate-900 to-indigo-950 text-white shadow-elevated border border-brand-800/50 relative overflow-hidden transition-all">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-500/30 border border-brand-400/40 flex items-center justify-center text-brand-300">
            <Sparkles className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-semibold text-brand-300 uppercase tracking-wider block transition-all">
              {t('aiInsightTitle')}
            </span>
            <h2 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-white tracking-tight transition-all">
              {ai_insight.headline}
            </h2>
          </div>
        </div>

        {/* Category Pill */}
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-500/20 text-brand-300 border border-brand-400/30">
          {ai_insight.category}
        </span>
      </div>

      {/* Insight Summary */}
      <p className="text-sm lg:text-base xl:text-lg text-slate-200 leading-relaxed mb-5 relative z-10 transition-all">
        "{ai_insight.summary}"
      </p>

      {/* Contextual Grid: Farming & Travel Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 relative z-10">
        {/* Farming Tip */}
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs flex items-start gap-2.5 backdrop-blur-sm">
          <Sprout className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-emerald-300 block mb-0.5">
              {t('farmingAdvice')}
            </span>
            <span className="text-slate-300">
              {ai_insight.farming_tip}
            </span>
          </div>
        </div>

        {/* Travel Advisory */}
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs flex items-start gap-2.5 backdrop-blur-sm">
          <Car className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-sky-300 block mb-0.5">
              {t('travelAdvice')} • Best: {ai_insight.ideal_window}
            </span>
            <span className="text-slate-300">
              Safety Index: <strong className="text-white">{ai_insight.travel_score}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Action CTA Button */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10 relative z-10">
        <span className="text-xs text-slate-400">
          Powered by WeatherGPT Foundation Model
        </span>
        <button
          type="button"
          onClick={handleAskGPT}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold shadow-glow transition-all transform hover:scale-105"
        >
          <Bot className="w-4 h-4" />
          <span>{t('askWeatherGPT')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
