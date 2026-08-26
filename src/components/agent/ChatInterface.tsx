import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ToolCall } from '../../types/ai';
import { AgentActionLog } from './AgentActionLog';
import { MarkdownRenderer } from './MarkdownRenderer';
import { 
  Square, 
  Sparkles, 
  Wand2, 
  Zap,
  Code2,
  Cpu,
  ArrowUp
} from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  activeStatus: string;
  onSendMessage: (prompt: string) => void;
  onStopStreaming: () => void;
  currentToolCalls: ToolCall[];
  currentModelName: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isStreaming,
  activeStatus,
  onSendMessage,
  onStopStreaming,
  currentToolCalls,
  currentModelName,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeStatus, currentToolCalls]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const promptChips = [
    { label: '🎮 HTML5 Canvas Arcade Game', prompt: 'Build a retro arcade space shooter game in HTML5 Canvas with keyboard controls, particle effects, score counter, and sound synthesizer.' },
    { label: '⚡ Real-Time Tic-Tac-Toe', prompt: 'Create an interactive Tic-Tac-Toe game with clean modern styling, sound effects, AI opponent with minimax algorithm, and score tracking.' },
    { label: '📊 Sleek Crypto & Stock Dashboard', prompt: 'Build a modern analytics dashboard in HTML/CSS/JS with live interactive widgets, glowing charts, dark mode, and portfolio calculator.' },
    { label: '⏱️ Pomodoro Focus Timer', prompt: 'Build a beautiful Pomodoro focus timer with ambient sound generators, progress rings, custom break presets, and task lists.' },
  ];

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-surface/80">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">Vibe Studio Agent</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              Autonomous
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStreaming ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-medium px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <Zap className="w-3 h-3 animate-spin" />
                <span className="truncate max-w-[200px]">{activeStatus || 'Auto-Building Files...'}</span>
              </div>
              <button
                onClick={onStopStreaming}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
                title="Stop Agent"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          ) : (
            <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-indigo-400" />
              {currentModelName}
            </span>
          )}
        </div>
      </div>

      {/* Message History Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <Wand2 className="w-7 h-7 text-cyan-400" />
            </div>

            <div className="max-w-sm space-y-1">
              <h3 className="text-sm font-bold text-white tracking-tight">
                What would you like to build?
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Describe any app, game, or tool. Vibe-Studio creates files and renders live previews with zero configuration.
              </p>
            </div>

            {/* Quick Inspiration Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg pt-2">
              {promptChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(chip.prompt)}
                  className="p-3 text-left rounded-xl glass-card hover:bg-white/[0.04] hover:border-indigo-500/40 transition-all group text-xs text-gray-300 shadow-sm"
                >
                  <div className="font-semibold text-white group-hover:text-cyan-400 transition-colors flex items-center justify-between">
                    <span>{chip.label}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 line-clamp-1 mt-1 font-normal">
                    {chip.prompt}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1.5 ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {/* Role Badge / Timestamp */}
              <div className="flex items-center gap-1.5 px-1 text-[10px] text-gray-500 font-mono">
                <span>{msg.role === 'user' ? 'You' : 'Vibe Agent'}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[90%] rounded-2xl p-4 transition-all ${
                  msg.role === 'user'
                    ? 'bg-indigo-600/90 text-white rounded-tr-sm shadow-md shadow-indigo-600/20 whitespace-pre-wrap font-sans text-xs'
                    : 'glass-card text-gray-200 rounded-tl-sm border border-white/[0.08] shadow-sm'
                }`}
              >
                {/* Content */}
                {msg.role === 'user' ? (
                  <div className="leading-relaxed">{msg.content}</div>
                ) : (
                  <MarkdownRenderer content={msg.content} />
                )}

                {/* Embedded Action Logs */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <AgentActionLog toolCalls={msg.toolCalls} />
                )}

                {msg.isStreaming && (
                  <div className="inline-block w-2 h-3.5 bg-cyan-400 ml-1 animate-pulse" />
                )}
              </div>
            </div>
          ))
        )}

        {/* Live Active Tool Calls */}
        {isStreaming && currentToolCalls.length > 0 && (
          <div className="w-full">
            <AgentActionLog toolCalls={currentToolCalls} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Prompt Composer */}
      <div className="p-3 border-t border-white/[0.06] bg-surface/80">
        <form 
          onSubmit={handleSubmit} 
          className="relative flex items-end gap-2 bg-black/40 rounded-xl border border-white/[0.08] p-2 focus-within:border-indigo-500/70 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all shadow-inner"
        >
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your vibe prompt... (e.g., 'Build a canvas particle simulator with physics controls')"
            className="flex-1 bg-transparent text-xs text-gray-100 placeholder-gray-500 focus:outline-none resize-none px-2 py-1 max-h-32 leading-relaxed"
          />

          <div className="flex items-center gap-1.5 pb-0.5">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="p-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-md shadow-rose-500/20"
                title="Stop generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className={`p-2 rounded-lg transition-all ${
                  input.trim()
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 cursor-pointer'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                }`}
                title="Send Prompt (Enter)"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </form>

        <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <Code2 className="w-3 h-3 text-emerald-400" />
            Autonomous Multi-Turn Code & File Generation Active
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono">Shift + Enter</kbd> newline
          </span>
        </div>
      </div>
    </div>
  );
};
