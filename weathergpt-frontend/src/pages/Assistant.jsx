import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChatWindow } from '../components/chat/ChatWindow';
import { ChatInput } from '../components/chat/ChatInput';
import { sendChatMessage, getSuggestedPrompts } from '../services/chatApi';
import { useWeather } from '../context/WeatherContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  CloudRain,
  Sprout,
  Car,
  TrendingUp,
  MapPin,
  LayoutDashboard,
  ShieldCheck,
  ArrowRight,
  Sun,
  Thermometer,
} from 'lucide-react';

export function Assistant() {
  const { selectedCity, weatherData } = useWeather();
  const { t, currentLanguage } = useLanguage();
  const { user } = useAuth();
  const locationState = useLocation();

  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('weathergpt_assistant_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isThinking, setIsThinking] = useState(false);
  const suggestedPrompts = getSuggestedPrompts();

  // Save session messages
  useEffect(() => {
    sessionStorage.setItem('weathergpt_assistant_messages', JSON.stringify(messages));
  }, [messages]);

  // Handle incoming prompt passed via navigation state (e.g. from Dashboard or other pages)
  useEffect(() => {
    if (locationState.state?.prompt) {
      handleSendMessage(locationState.state.prompt);
      // Clear history state to avoid re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [locationState.state]);

  const handleSendMessage = async (text, options = {}) => {
    if (!text || !text.trim() || isThinking) return;

    const inputMode = options.input_mode || 'text';
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: text.trim(),
      input_mode: inputMode,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const res = await sendChatMessage(text, selectedCity, weatherData, {
        language: currentLanguage,
        input_mode: inputMode,
      });
      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data]);
      }
    } catch (err) {
      console.error('Chat AI response error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text:
            currentLanguage === 'hi'
              ? 'मौसम सेवा से संपर्क करने में समस्या आई। कृपया पुनः प्रयास करें।'
              : 'I encountered a momentary issue querying the atmospheric simulation database. Please try your question again.',
          language: currentLanguage,
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    sessionStorage.removeItem('weathergpt_assistant_messages');
  };

  // Gemini-style Prompt Suggestion Cards
  const geminiCards = [
    {
      icon: CloudRain,
      iconColor: 'text-sky-500 dark:text-sky-400',
      iconBg: 'bg-sky-50 dark:bg-sky-950/60 border-sky-200/60 dark:border-sky-800/60',
      title: currentLanguage === 'hi' ? 'वर्षा और आंधी पूर्वानुमान' : 'Precipitation & Rain Forecast',
      desc:
        currentLanguage === 'hi'
          ? `क्या आज ${selectedCity} में बारिश होगी? समय और संभावना जानें।`
          : `Will it rain in ${selectedCity} today or in the next 24 hours?`,
      prompt:
        currentLanguage === 'hi'
          ? `क्या आज ${selectedCity} में बारिश होगी? अगले 24 घंटों का प्रति घंटा वर्षा अनुमान और आंधी का जोखिम बताएं।`
          : `Will it rain in ${selectedCity} today or in the next 24 hours? Give me the hourly precipitation chance, expected rainfall volume, and thunderstorm risks.`,
    },
    {
      icon: Sprout,
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/60',
      title: currentLanguage === 'hi' ? 'कृषि एवं फसल परामर्श' : 'Agricultural Farming Advisory',
      desc:
        currentLanguage === 'hi'
          ? 'कीटनाशक छिड़काव, फसल कटाई और सिंचाई के लिए मौसम की अनुकूलता।'
          : 'Crop safety, pesticide spraying windows, and soil moisture conditions.',
      prompt:
        currentLanguage === 'hi'
          ? `${selectedCity} के लिए कृषि सलाह दें: क्या आज कीटनाशक छिड़काव, फसल कटाई या सिंचाई करना सुरक्षित है?`
          : `Provide an agricultural farming advisory for ${selectedCity} considering current humidity, wind speeds, and rain forecast: Is it safe for pesticide spraying, harvesting, or irrigation?`,
    },
    {
      icon: Car,
      iconColor: 'text-amber-500 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/60 dark:border-amber-800/60',
      title: currentLanguage === 'hi' ? 'यात्रा एवं वायु गुणवत्ता' : 'Travel & Air Quality Safety',
      desc:
        currentLanguage === 'hi'
          ? 'सड़क दृश्यता, कोहरा, और वर्तमान वायु प्रदूषण (AQI) स्तर।'
          : 'Road visibility, dense fog, air quality index, and safe travel windows.',
      prompt:
        currentLanguage === 'hi'
          ? `${selectedCity} में आज यात्रा या बाहर निकलना कितना सुरक्षित है? सड़क दृश्यता और एक्यूआई (AQI) कैसा रहेगा?`
          : `Is it safe to travel outdoors or commute today in ${selectedCity}? How is the road visibility, air quality index (AQI), and safe travel window?`,
    },
    {
      icon: TrendingUp,
      iconColor: 'text-purple-500 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200/60 dark:border-purple-800/60',
      title: currentLanguage === 'hi' ? '7-दिवसीय तापमान रुझान' : '7-Day Temperature Trend',
      desc:
        currentLanguage === 'hi'
          ? 'साप्ताहिक तापमान उतार-चढ़ाव और लू या शीतलहर का विश्लेषण।'
          : 'Weekly heat/cold shifts, climatic anomalies, and multi-day trend.',
      prompt:
        currentLanguage === 'hi'
          ? `${selectedCity} के लिए 7 दिनों का मौसम और तापमान रुझान बताएं। क्या कोई लू या शीतलहर की चेतावनी है?`
          : `Provide a detailed 7-day temperature trend and meteorological anomaly analysis for ${selectedCity}. Any expected heatwave or cold front?`,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-7.5rem)] flex flex-col justify-between pb-2">
      {/* Messages Stream or Gemini Hero Greeting */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center px-2 sm:px-4 py-4 overflow-y-auto animate-in fade-in duration-300">
          
          {/* Top Gemini Sparkle Badge */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 via-indigo-500 to-pink-500 p-[1.5px] shadow-glow">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14.5px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-500 dark:text-sky-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold tracking-widest uppercase bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 dark:from-brand-400 dark:via-indigo-300 dark:to-purple-300 bg-clip-text text-transparent">
                  WeatherGPT AI
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  Meteorological Copilot
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Atmospheric Intelligence • Real-Time AI Simulation</p>
            </div>
          </div>

          {/* Gemini Large Typography Headline */}
          <div className="mb-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-500 dark:from-sky-300 dark:via-indigo-300 dark:to-pink-300 bg-clip-text text-transparent">
                {user ? `Hello, ${user.full_name || user.username}` : currentLanguage === 'hi' ? 'नमस्ते!' : 'Hello, Explorer'}
              </span>
            </h1>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-slate-400 dark:text-slate-400 mt-1.5 tracking-tight">
              {currentLanguage === 'hi'
                ? 'आज मौसम के बारे में आप क्या जानना चाहते हैं?'
                : 'How can I help with the weather today?'}
            </h2>
          </div>

          {/* Active Context Bar with Quick Switch to Dashboard */}
          <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-brand-500" />
              <span>Location: <strong>{selectedCity}</strong></span>
              {weatherData?.current && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-brand-600 dark:text-brand-400 font-bold">
                    {Math.round(weatherData.current.temp)}°C
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 capitalize hidden sm:inline">
                    ({weatherData.current.weather[0]?.description})
                  </span>
                </>
              )}
            </div>

            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors font-semibold"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Open Telemetry Dashboard →</span>
            </Link>
          </div>

          {/* 4 Gemini-style Prompt Suggestion Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            {geminiCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(card.prompt)}
                  disabled={isThinking}
                  className="p-4 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-elevated transition-all text-left cursor-pointer group flex flex-col justify-between gap-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`p-2.5 rounded-2xl border ${card.iconBg} ${card.iconColor} shadow-xs`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-brand-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/60 transition-colors">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {card.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      ) : (
        /* Conversation Mode */
        <div className="flex-1 min-h-0 mb-3">
          <ChatWindow
            messages={messages}
            isThinking={isThinking}
            onClearChat={handleClearChat}
            onFollowUpClick={handleSendMessage}
          />
        </div>
      )}

      {/* Gemini-style Capsule Chat Input Bar */}
      <div className="shrink-0 mt-auto">
        <ChatInput
          onSendMessage={handleSendMessage}
          suggestedPrompts={messages.length > 0 ? suggestedPrompts : []}
          disabled={isThinking}
        />
      </div>
    </div>
  );
}

export default Assistant;
