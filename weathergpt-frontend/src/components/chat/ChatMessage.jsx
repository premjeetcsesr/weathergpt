import React from 'react';
import { Bot, User, Droplets, Wind, AlertTriangle, CloudSun, MapPin, Sparkles, Mic } from 'lucide-react';
import { SeverityBadge } from '../common/Badge';
import { VoiceOutput } from '../VoiceOutput';

export function ChatMessage({ message, onFollowUpClick }) {
  const isAi = message.sender === 'ai';
  const messageText = message.reply || message.text || message.message || '';

  // Simple Markdown parser for bullet points, bold text, headers, and blockquotes
  const renderFormattedText = (rawText) => {
    if (!rawText) return null;
    const lines = rawText.split('\n');

    return (
      <div className="space-y-2 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          // Header 3
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="font-bold text-base text-slate-900 dark:text-white mt-2 mb-1 flex items-center gap-1.5">
                {line.replace('### ', '')}
              </h3>
            );
          }
          // Blockquote
          if (line.startsWith('> ')) {
            return (
              <blockquote key={idx} className="border-l-4 border-brand-500 pl-3 py-1 bg-brand-50/50 dark:bg-brand-950/40 text-brand-900 dark:text-brand-200 text-xs rounded-r-xl italic my-2">
                {line.replace('> ', '')}
              </blockquote>
            );
          }
          // Bullet point
          if (line.startsWith('- ') || line.startsWith('* ')) {
            const clean = line.substring(2);
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-brand-500 font-bold">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInline(clean) }} />
              </div>
            );
          }
          // Numbered list
          if (/^\d+\.\s/.test(line)) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-brand-500 font-bold">{line.match(/^\d+\./)[0]}</span>
                <span dangerouslySetInnerHTML={{ __html: formatInline(line.replace(/^\d+\.\s/, '')) }} />
              </div>
            );
          }
          if (line.trim() === '') return <div key={idx} className="h-1" />;
          return (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
          );
        })}
      </div>
    );
  };

  const formatInline = (str) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs font-mono">$1</code>');
  };

  return (
    <div className={`flex gap-3 my-4 ${isAi ? 'justify-start' : 'justify-end'}`}>
      {/* AI Avatar */}
      {isAi && (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-subtle mt-1">
          <Bot className="w-5 h-5" />
        </div>
      )}

      {/* Bubble Container */}
      <div className={`max-w-[88%] sm:max-w-xl md:max-w-2xl ${isAi ? 'items-start' : 'items-end'}`}>
        
        {/* Message Box */}
        <div
          className={`p-4 sm:p-5 rounded-3xl transition-all shadow-subtle ${
            isAi
              ? 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200'
              : 'bg-brand-500 text-white font-medium rounded-br-none ml-auto'
          }`}
        >
          {isAi ? renderFormattedText(messageText) : <p className="text-sm">{messageText}</p>}

          {/* AI Voice Output Controls */}
          {isAi && messageText && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <VoiceOutput text={messageText} language={message.language || 'en'} />
                {message.language === 'hi' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium">
                    हिन्दी
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Embedded Weather Telemetry Card */}
          {message.weatherCard && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-200">
              <div className="flex items-center justify-between font-bold text-sm mb-2 text-slate-900 dark:text-slate-100">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-brand-500" />
                  {message.weatherCard.city}
                </span>
                <span className="text-brand-600 dark:text-brand-400 font-bold">
                  {message.weatherCard.temp}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <span className="text-slate-400 block text-[10px]">Condition</span>
                  <span className="font-semibold">{message.weatherCard.condition}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Rain Chance</span>
                  <span className="font-semibold text-blue-500 flex items-center gap-0.5">
                    <Droplets className="w-3 h-3" /> {message.weatherCard.pop}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Humidity</span>
                  <span className="font-semibold">{message.weatherCard.humidity}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Wind</span>
                  <span className="font-semibold flex items-center gap-0.5">
                    <Wind className="w-3 h-3 text-teal-500" /> {message.weatherCard.wind}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Embedded Alert Card */}
          {message.alertCard && (
            <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold">{message.alertCard.title}</span>
                  <SeverityBadge severity={message.alertCard.severity} />
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                  {message.alertCard.action}
                </p>
              </div>
            </div>
          )}

          {/* Follow-up Prompt Pills */}
          {message.followUps && message.followUps.length > 0 && onFollowUpClick && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-500" /> Suggested Follow-ups:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {message.followUps.map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => onFollowUpClick(prompt)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/50 hover:text-brand-600 dark:hover:text-brand-400 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 text-left transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timestamp & Voice Badge */}
        <div className={`flex items-center gap-2 mt-1 px-2 ${isAi ? 'justify-start' : 'justify-end'}`}>
          {!isAi && message.input_mode === 'voice' && (
            <span className="inline-flex items-center gap-1 text-[10px] text-brand-600 dark:text-brand-400 font-semibold bg-brand-50 dark:bg-brand-950/50 px-1.5 py-0.5 rounded-md border border-brand-200/60 dark:border-brand-800/60">
              <Mic className="w-2.5 h-2.5" /> Voice
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            {message.timestamp}
          </span>
        </div>
      </div>

      {/* User Avatar */}
      {!isAi && (
        <div className="w-9 h-9 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 shadow-subtle mt-1">
          <User className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}
