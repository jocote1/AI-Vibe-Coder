import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ToolCall } from '../../types/ai';
import { AgentActionLog } from './AgentActionLog';
import { 
  Send, 
  Square, 
  Sparkles, 
  User, 
  Bot, 
  Wand2, 
  Zap,
  Code2
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
    { label: '✨ Modern React Dashboard', prompt: 'Build a modern, sleek analytics dashboard in React with Tailwind CSS, glowing charts, dark mode cards, and interactive metrics widgets.' },
    { label: '🚀 Fullstack FastAPI + SQLite App', prompt: 'Create a production-ready Python FastAPI backend with SQLite database, CRUD routes for task management, and interactive Swagger docs.' },
    { label: '🎮 Web Canvas Arcade Game', prompt: 'Build a retro arcade space shooter game in HTML5 Canvas with keyboard controls, particle explosion effects, score counter, and sound synthesizer.' },
    { label: '📦 Electron Desktop Widget', prompt: 'Create an Electron desktop productivity timer app with Pomodoro cycles, audio alerts, and system tray integration.' },
  ];

  return (
    <div className="flex flex-col h-full bg-card/40 backdrop-blur-md rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-card/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-neon-cyan animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
              VIBE AGENT RUNTIME
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-neon-purple/20 text-neon-purple font-semibold border border-neon-purple/30">
                AUTONOMOUS
              </span>
            </h2>
            <p className="text-[10px] text-gray-400">Model: {currentModelName}</p>
          </div>
        </div>

        {isStreaming && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-neon-cyan font-medium px-2.5 py-1 rounded-full bg-neon-cyan/10 border border-neon-cyan/20">
              <Zap className="w-3 h-3 animate-spin" />
              {activeStatus || 'Vibing & Building...'}
            </div>
            <button
              onClick={onStopStreaming}
              className="p-1.5 rounded-lg bg-neon-pink/10 hover:bg-neon-pink/20 text-neon-pink border border-neon-pink/30 text-xs flex items-center gap-1 transition-colors"
              title="Stop Agent"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="text-[10px] font-bold">STOP</span>
            </button>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary/20 via-neon-purple/20 to-neon-cyan/20 border border-neon-cyan/30 flex items-center justify-center shadow-glow-cyan">
              <Wand2 className="w-8 h-8 text-neon-cyan" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-base font-bold text-white tracking-tight">
                What do you want to build today?
              </h3>
              <p className="text-xs text-gray-400">
                Describe any application, UI, script, or feature. Vibe-Studio will create files, install dependencies, run dev servers, and live preview it instantly.
              </p>
            </div>

            {/* Prompt Inspiration Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-4">
              {promptChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(chip.prompt)}
                  className="p-2.5 text-left rounded-xl bg-card/70 border border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-all group text-xs text-gray-300"
                >
                  <div className="font-semibold text-white group-hover:text-neon-cyan transition-colors">
                    {chip.label}
                  </div>
                  <div className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{chip.prompt}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs leading-relaxed ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role !== 'user' && (
                <div className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-neon-cyan" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 border ${
                  msg.role === 'user'
                    ? 'bg-primary text-white border-primary/50 rounded-tr-none'
                    : 'bg-card/90 text-gray-200 border-border rounded-tl-none backdrop-blur-md'
                }`}
              >
                {/* Text Content */}
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                {/* Embedded Tool Calls */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <AgentActionLog toolCalls={msg.toolCalls} />
                )}

                {msg.isStreaming && (
                  <div className="inline-block w-2 h-3.5 bg-neon-cyan ml-1 animate-pulse" />
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Live In-Progress Tool Calls */}
        {isStreaming && currentToolCalls.length > 0 && (
          <div className="pl-10">
            <AgentActionLog toolCalls={currentToolCalls} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="p-3 border-t border-border/80 bg-card/80">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-background/90 rounded-xl border border-border/90 p-2 focus-within:border-primary/60 transition-all shadow-inner">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your vibe idea... (e.g. 'Build a real-time crypto price dashboard with WebSockets')"
            className="flex-1 bg-transparent text-xs text-gray-200 placeholder-gray-500 focus:outline-none resize-none px-2 py-1 max-h-32"
          />

          <div className="flex items-center gap-1.5">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="p-2 rounded-lg bg-neon-pink text-white hover:bg-neon-pink/90 transition-all shadow-glow-pink"
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
                    ? 'bg-primary hover:bg-primary-hover text-white shadow-glow-purple cursor-pointer'
                    : 'bg-secondary text-gray-500 cursor-not-allowed'
                }`}
                title="Send Prompt (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>

        <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <Code2 className="w-3 h-3 text-neon-green" />
            Autonomous File Edits & Terminal Enabled
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-secondary border border-border text-[9px]">Shift + Enter</kbd> newline
          </span>
        </div>
      </div>
    </div>
  );
};
