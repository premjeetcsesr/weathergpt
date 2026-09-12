import React, { useState } from 'react';
import { Send, Mic, MicOff, MapPin, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useWeather } from '../../context/WeatherContext';

export function ChatInput({ onSendMessage, suggestedPrompts = [], disabled = false }) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const { t } = useLanguage();
  const { selectedCity } = useWeather();

  const handleSend = (e) => {
    e?.preventDefault();
    if (inputText.trim() && !disabled) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handlePromptClick = (prompt) => {
    if (!disabled) {
      onSendMessage(prompt);
    }
  };

  const toggleMic = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      // Simulate speech-to-text recognition
      setTimeout(() => {
        setInputText(`What is the rain probability in ${selectedCity} for the next 24 hours?`);
        setIsRecording(false);
      }, 2500);
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
    <div className="w-full space-y-3">
      {/* Suggested Quick Questions */}
      {suggestedPrompts && suggestedPrompts.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <span className="text-slate-400 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-brand-500" />
            {t('suggestedQuestions')}:
          </span>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => handlePromptClick(prompt)}
              className="shrink-0 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/60 hover:text-brand-600 dark:hover:text-brand-400 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Main Input Bar */}
      <form
        onSubmit={handleSend}
        className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-card focus-within:ring-2 focus-within:ring-brand-500/30 focus-within:border-brand-500 transition-all"
      >
        {/* Attach Location Button */}
        <button
          type="button"
          onClick={attachLocation}
          title={`Attach location (${selectedCity})`}
          className="p-2 text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <MapPin className="w-4 h-4" />
        </button>

        {/* Input Field */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={disabled}
          placeholder={isRecording ? t('listening') : t('chatInputPlaceholder')}
          className="flex-1 px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none disabled:opacity-50"
        />

        {/* Microphone Simulation Button */}
        <button
          type="button"
          onClick={toggleMic}
          className={`p-2 rounded-xl transition-all ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={isRecording ? 'Listening...' : 'Voice Input'}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || disabled}
          className="ml-1 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <span>{t('send')}</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
