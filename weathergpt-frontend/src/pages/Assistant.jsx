import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ChatWindow } from '../components/chat/ChatWindow';
import { ChatInput } from '../components/chat/ChatInput';
import { sendChatMessage, getSuggestedPrompts, getInitialMessages } from '../services/chatApi';
import { useWeather } from '../context/WeatherContext';
import { useLanguage } from '../context/LanguageContext';
import { Bot, Sparkles, Zap, ShieldCheck } from 'lucide-react';

export function Assistant() {
  const { selectedCity, weatherData } = useWeather();
  const { t } = useLanguage();
  const locationState = useLocation();

  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('weathergpt_assistant_messages');
      return saved ? JSON.parse(saved) : getInitialMessages();
    } catch {
      return getInitialMessages();
    }
  });

  const [isThinking, setIsThinking] = useState(false);
  const suggestedPrompts = getSuggestedPrompts();

  // Save session messages
  useEffect(() => {
    sessionStorage.setItem('weathergpt_assistant_messages', JSON.stringify(messages));
  }, [messages]);

  // Handle incoming prompt passed via navigation state (e.g. from Dashboard)
  useEffect(() => {
    if (locationState.state?.prompt) {
      handleSendMessage(locationState.state.prompt);
      // Clear history state to avoid re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [locationState.state]);

  const handleSendMessage = async (text) => {
    if (!text || !text.trim() || isThinking) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: text.trim()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const res = await sendChatMessage(text, selectedCity, weatherData);
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
          text: "I encountered a momentary issue querying the atmospheric simulation database. Please try your question again."
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleClearChat = () => {
    setMessages(getInitialMessages());
    sessionStorage.removeItem('weathergpt_assistant_messages');
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-7.5rem)] flex flex-col gap-4 pb-4">
      {/* Header Info Banner */}
      <div className="flex items-center justify-between px-4 py-2 bg-brand-50/60 dark:bg-brand-950/40 rounded-2xl border border-brand-200/60 dark:border-brand-800/60 text-xs">
        <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
          <Sparkles className="w-4 h-4 text-brand-500" />
          <span className="font-semibold">Context Active:</span>
          <span>Hyperlocal data synchronized for <strong>{selectedCity}</strong></span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Real-time Agro & Travel Intelligence</span>
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 min-h-0">
        <ChatWindow
          messages={messages}
          isThinking={isThinking}
          onClearChat={handleClearChat}
          onFollowUpClick={handleSendMessage}
        />
      </div>

      {/* Chat Input Bar */}
      <div className="shrink-0">
        <ChatInput
          onSendMessage={handleSendMessage}
          suggestedPrompts={suggestedPrompts}
          disabled={isThinking}
        />
      </div>
    </div>
  );
}
