import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom React hook for Speech-to-Text using the Web Speech API (SpeechRecognition).
 * Supports both Hindi ('hi-IN') and English ('en-IN').
 * States: 'idle' | 'listening' | 'processing' | 'success' | 'error'
 */
export function useSpeechRecognition({ defaultLocale = 'en-IN', onResult = null } = {}) {
  const [state, setState] = useState('idle'); // idle | listening | processing | success | error
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef(null);
  const activeLocaleRef = useRef(defaultLocale);

  useEffect(() => {
    activeLocaleRef.current = defaultLocale;
  }, [defaultLocale]);

  // Check browser SpeechRecognition support on mount
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('SpeechRecognition stop error:', err);
      }
    }
  }, []);

  const startListening = useCallback(
    ({ locale = activeLocaleRef.current } = {}) => {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition || null;

      if (!SpeechRecognition) {
        setState('error');
        setErrorMessage('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
        return;
      }

      // If already running, stop previous instance first
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      setTranscript('');
      setInterimTranscript('');
      setErrorMessage('');
      setState('listening');

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = locale || 'en-IN';
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setState('listening');
        };

        recognition.onresult = (event) => {
          let currentInterim = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              finalTranscript += res[0].transcript;
            } else {
              currentInterim += res[0].transcript;
            }
          }

          if (currentInterim) {
            setInterimTranscript(currentInterim);
          }

          if (finalTranscript) {
            const cleanFinal = finalTranscript.trim();
            setTranscript(cleanFinal);
            setState('success');
            if (onResult && typeof onResult === 'function') {
              onResult(cleanFinal);
            }
          }
        };

        recognition.onerror = (event) => {
          console.warn('Speech recognition error event:', event.error);
          setState('error');
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser address bar.');
          } else if (event.error === 'no-speech') {
            setErrorMessage('No speech was detected. Please click the microphone and try speaking again.');
          } else if (event.error === 'network') {
            setErrorMessage('Network error during speech recognition. Please check your internet connection.');
          } else {
            setErrorMessage(`Speech recognition error: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setState((prevState) => (prevState === 'listening' ? 'idle' : prevState));
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setState('error');
        setErrorMessage('Unable to initialize speech recognition.');
      }
    },
    [onResult]
  );

  const reset = useCallback(() => {
    stopListening();
    setState('idle');
    setTranscript('');
    setInterimTranscript('');
    setErrorMessage('');
  }, [stopListening]);

  return {
    state,
    isListening: state === 'listening',
    transcript,
    interimTranscript,
    errorMessage,
    isSupported,
    startListening,
    stopListening,
    reset,
  };
}
