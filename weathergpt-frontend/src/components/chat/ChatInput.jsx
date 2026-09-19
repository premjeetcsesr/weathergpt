import React, { useState } from 'react';
import { Send, MapPin, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useWeather } from '../../context/WeatherContext';
import { VoiceInput } from '../VoiceInput';

export function ChatInput({ onSendMessage, suggestedPrompts = [], disabled = false }) {
  const [inputText, setInputText] = useState('');
  const { t, currentLanguage } = useLanguage();
  const { selectedCity } = useWeather();

  const handleSend = (e) => {
    e?.preventDefault();
    if (inputText.trim() && !disabled) {
      onSendMessage(inputText.trim(), { input_mode: 'text' });
      setInputText('');
    }
  };

  const handlePromptClick = (prompt) => {
    if (!disabled) {
      onSendMessage(prompt, { input_mode: 'text' });
    }
  };

  const handleVoiceTranscript = (spokenText) => {
    if (spokenText && spokenText.trim() && !disabled) {
      setInputText(spokenText);
      onSendMessage(spokenText.trim(), { input_mode: 'voice' });
      setInputText('');
    }
  };

  const attachLocation = () => {
    setInputText((prev) => {
      const trimmed = prev.trim();
      if (trimmed.toLowerCase().includes(selectedCity.toLowerCase())) {
        return trimmed;
      }
      return trimmed ? `${trimmed} in ${selectedCity}` : `Weather forecast for ${selectedCity}`;
    });
  };

  return (
    <div className="w-full space-y-2">
      {/* Suggested Quick Questions */}
      {suggestedPrompts && suggestedPrompts.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs px-0.5">
          <span className="text-slate-400 shrink-0 flex items-center gap-1 font-medium text-[11px]">
            <Sparkles className="w-3 h-3 text-brand-500" />
            <span className="hidden xs:inline">{t('suggestedQuestions') || 'Suggestions'}:</span>
          </span>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => handlePromptClick(prompt)}
              className="shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 hover:bg-brand-50 dark:hover:bg-brand-950/60 hover:text-brand-600 dark:hover:text-brand-400 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 text-[11px] font-medium transition-all shadow-xs disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Main Gemini Capsule Input Bar */}
      <form
        onSubmit={handleSend}
        className="relative flex items-center bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-elevated focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500/80 transition-all backdrop-blur-md gap-1"
      >
        {/* Attach / Show Location Pill Button */}
        <button
          type="button"
          onClick={attachLocation}
          title={`Click to add ${selectedCity} to query`}
          className="flex items-center gap-1 px-2 py-1.5 text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors border border-transparent shrink-0"
        >
          <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
          <span className="max-w-[65px] sm:max-w-[120px] truncate">{selectedCity}</span>
        </button>

        {/* Input Field */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={disabled}
          placeholder={
            currentLanguage === 'hi'
              ? 'मौसम या खेती के बारे में पूछें...'
              : 'Ask weather, rain, farming...'
          }
          className="flex-1 px-2 py-1.5 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none disabled:opacity-50 min-w-0"
        />

        {/* Real-time Voice Input Button */}
        <div className="shrink-0">
          <VoiceInput onTranscript={handleVoiceTranscript} disabled={disabled} />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || disabled}
          className="p-2 sm:px-3.5 sm:py-2 bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 disabled:from-slate-200 disabled:to-slate-200 dark:disabled:from-slate-800 dark:disabled:to-slate-800 disabled:text-slate-400 text-white rounded-xl sm:rounded-2xl text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition-all shrink-0 active:scale-95"
          title="Send query"
        >
          <span className="hidden sm:inline">{t('send') || 'Ask'}</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Small Disclaimer */}
      <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 px-2 leading-tight">
        WeatherGPT AI provides real-time meteorological intelligence.
      </p>
    </div>
  );
}

export default ChatInput;
