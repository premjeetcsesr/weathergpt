import React, { useRef, useEffect } from 'react';
import { Bot, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useLanguage } from '../../context/LanguageContext';

export function ChatWindow({ messages = [], isThinking = false, onClearChat, onFollowUpClick }) {
  const { t } = useLanguage();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-card overflow-hidden">
      {/* Top Conversation Header */}
      <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-500 text-white flex items-center justify-center shadow-subtle">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {t('chatHeader')}
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('chatSubheader')}
            </p>
          </div>
        </div>

        {/* Clear Button */}
        {messages.length > 1 && (
          <button
            type="button"
            onClick={onClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs font-medium transition-colors border border-slate-200/80 dark:border-slate-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('clearChat')}</span>
          </button>
        )}
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
