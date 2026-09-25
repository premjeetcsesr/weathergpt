import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Square, Loader2 } from 'lucide-react';

/**
 * Text-to-Speech playback button using browser SpeechSynthesis API.
 * Provides [ 🔊 Listen ] and [ ⏹️ Stop ] controls beside AI messages.
 *
 * @param {string} text - Message text to synthesize
 * @param {string} language - Language code ('hi' or 'en')
 */
export function VoiceOutput({ text, language = 'en' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => {
      // Clean up utterance on unmount
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getVoiceForLocale = (locale) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Exact match
    const exact = voices.find((v) => v.lang.toLowerCase() === locale.toLowerCase());
    if (exact) return exact;

    // 2. Language prefix match (e.g. 'hi' for 'hi-IN')
    const langPrefix = locale.split('-')[0].toLowerCase();
    const prefixMatch = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
    return prefixMatch || null;
  };

  const handleSpeak = (e) => {
    e.stopPropagation();

    if (!isSupported || !text) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Cancel any other speaking
    window.speechSynthesis.cancel();

    const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const matchedVoice = getVoiceForLocale(locale);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = (event) => {
      console.warn('SpeechSynthesis error:', event);
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  if (!isSupported || !text) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleSpeak}
      title={isPlaying ? 'Stop audio playback' : `Listen in ${language === 'hi' ? 'Hindi' : 'English'}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all duration-200 border ${
        isPlaying
          ? 'bg-brand-500 text-white border-brand-600 shadow-md shadow-brand-500/20 animate-pulse'
          : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-brand-600 dark:hover:text-brand-400'
      }`}
    >
      {isPlaying ? (
        <>
          <Square className="w-3.5 h-3.5 fill-current text-white" />
          <span>Stop</span>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5" />
          <span>Listen</span>
        </>
      )}
    </button>
  );
}
