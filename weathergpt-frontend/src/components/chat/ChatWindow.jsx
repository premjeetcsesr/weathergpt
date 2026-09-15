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
      <div className="px-5 py-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-sky-400 via-indigo-500 to-pink-500 text-white flex items-center justify-center shadow-subtle">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                WeatherGPT Assistant
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online" />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <MapPin className="w-3 h-3 text-brand-500" />
              <span>{selectedCity}</span>
              <span>•</span>
              <span className="text-brand-600 dark:text-brand-400 font-medium">Gemini Atmospheric Engine</span>
            </div>
          </div>
        </div>

        {/* Action Controls: New Chat */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 text-xs font-semibold transition-colors border border-brand-200 dark:border-brand-800 shadow-xs"
            title="Start a new conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-2">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onFollowUpClick={onFollowUpClick}
          />
        ))}

        {/* AI Generating Response State */}
        {isThinking && (
          <div className="flex gap-3 my-4 items-start">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-subtle mt-1">
              <Bot className="w-5 h-5" />
            </div>
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2.5 shadow-subtle">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              <span>{t('aiThinking')}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
