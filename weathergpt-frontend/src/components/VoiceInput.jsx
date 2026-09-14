import React, { useEffect } from 'react';
import { Mic, MicOff, AlertCircle, Loader2 } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useLanguage } from '../context/LanguageContext';

/**
 * Accessible VoiceInput component with live visual pulse and state indicator.
 * @param {function} onTranscript - Callback when final speech is transcribed: (text) => void
 * @param {boolean} disabled - Whether voice input is temporarily disabled
 */
export function VoiceInput({ onTranscript, disabled = false }) {
  const { currentLanguage, speechLocale } = useLanguage();

  const {
    state,
    isListening,
    interimTranscript,
    errorMessage,
    isSupported,
    startListening,
    stopListening,
    reset,
  } = useSpeechRecognition({
    defaultLocale: speechLocale,
    onResult: (text) => {
      if (onTranscript && text) {
        onTranscript(text);
      }
    },
  });

  // Toggle listening
  const handleClick = (e) => {
    e.preventDefault();
    if (isListening) {
      stopListening();
    } else {
      startListening({ locale: speechLocale });
    }
  };

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Voice input is not supported in this browser"
        className="p-2.5 rounded-xl text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-60 transition-colors"
      >
        <MicOff className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={
          isListening
            ? `Listening in ${currentLanguage === 'hi' ? 'Hindi' : 'English'}... Click to stop`
            : `Voice Input (${currentLanguage === 'hi' ? 'Hindi / हिन्दी' : 'English'})`
        }
        className={`relative p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${
          isListening
            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105 animate-pulse'
            : 'text-slate-500 dark:text-slate-400 hover:text-brand-500 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isListening ? (
          <>
            <Mic className="w-5 h-5 text-white animate-bounce" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-400 rounded-full animate-ping" />
          </>
        ) : state === 'processing' ? (
          <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {/* Live Interim Transcript or Error Overlay Toast */}
      {isListening && interimTranscript && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 bg-slate-900/90 text-white text-xs rounded-xl shadow-xl backdrop-blur-md border border-slate-700 whitespace-nowrap flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="font-medium text-slate-200 italic max-w-xs truncate">
            "{interimTranscript}"
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="absolute bottom-full mb-3 right-0 z-50 px-3 py-2 bg-rose-950/90 text-rose-200 text-xs rounded-xl shadow-xl backdrop-blur-md border border-rose-800 max-w-xs flex items-start gap-1.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{errorMessage}</p>
            <button
              onClick={reset}
              className="mt-1 text-[11px] underline text-rose-300 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
