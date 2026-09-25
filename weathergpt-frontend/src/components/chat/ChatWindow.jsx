import React, { useRef, useEffect } from 'react';
import { Bot, Trash2, Sparkles, Loader2, Plus, MapPin } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useLanguage } from '../../context/LanguageContext';
import { useWeather } from '../../context/WeatherContext';

export function ChatWindow({ messages = [], isThinking = false, onClearChat, onFollowUpClick }) {
  const { t } = useLanguage();
  const { selectedCity } = useWeather();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-card overflow-hidden">
      {/* Top Conversation Header */}
      <div className="px-3.5 sm:px-5 py-2.5 sm:py-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-sky-400 via-indigo-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-subtle">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                WeatherGPT Copilot
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Online" />
            </div>
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
              <MapPin className="w-3 h-3 text-brand-500 shrink-0" />
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{selectedCity}</span>
              <span className="hidden sm:inline">•</span>
              <span className="text-brand-600 dark:text-brand-400 font-medium hidden sm:inline">Gemini AI Engine</span>
            </div>
          </div>
        </div>

        {/* Action Controls: New Chat */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onClearChat}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 text-xs font-semibold transition-colors border border-brand-200 dark:border-brand-800 shadow-xs"
            title="Start a new conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-2.5">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onFollowUpClick={onFollowUpClick}
          />
        ))}

        {/* AI Generating Response State */}
        {isThinking && (
          <div className="flex gap-2.5 my-3 items-start">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-subtle mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2.5 shadow-subtle">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              <span>{t('aiThinking') || 'Synthesizing weather data...'}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default ChatWindow;
