import React, { useState } from 'react';
import { AVAILABLE_MODELS } from '../../lib/ai/provider-router';
import { Sparkles, ChevronDown, Check, Zap, Cpu, ShieldCheck } from 'lucide-react';

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  hasKeyForProvider: (provider: string) => boolean;
  onOpenSettings: () => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModelId,
  onSelectModel,
  hasKeyForProvider,
  onOpenSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModelId) || AVAILABLE_MODELS[0];

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case 'gemini':
        return { label: 'Google AI Studio', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      case 'vertex-ai':
        return { label: 'Vertex AI (OAuth)', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      case 'deepseek':
        return { label: 'DeepSeek Direct', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'grok':
        return { label: 'xAI Grok', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'openrouter':
        return { label: 'OpenRouter', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'ollama':
        return { label: 'Ollama (Local / Free)', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
      default:
        return { label: 'Custom Endpoint', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-card/80 border border-border hover:border-primary/40 transition-all text-xs font-medium text-gray-200 hover:text-white shadow-sm"
      >
        <Sparkles className="w-3.5 h-3.5 text-neon-cyan animate-pulse" />
        <span className="truncate max-w-[140px] font-semibold">{currentModel.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
          {currentModel.speed}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 max-h-[460px] overflow-y-auto z-50 rounded-xl bg-card border border-border shadow-2xl p-2.5 backdrop-blur-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/80 px-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Universal Model Hub</span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings();
                }}
                className="text-[11px] text-neon-cyan hover:underline flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3" />
                Manage Keys
              </button>
            </div>

            <div className="space-y-1.5">
              {AVAILABLE_MODELS.map((model) => {
                const isSelected = model.id === selectedModelId;
                const badge = getProviderBadge(model.provider);
                const hasKey = hasKeyForProvider(model.provider);

                return (
                  <div
                    key={model.id}
                    onClick={() => {
                      onSelectModel(model.id);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-primary/10 border-primary/40 shadow-glow-cyan/10'
                        : 'hover:bg-secondary/60 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{model.name}</span>
                        {model.recommended && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-neon-cyan/20 text-neon-cyan font-bold">
                            TOP VIBE
                          </span>
                        )}
                      </div>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-neon-cyan" />
                      ) : !hasKey && model.provider !== 'ollama' ? (
                        <span className="text-[10px] text-amber-400">Requires Key</span>
                      ) : null}
                    </div>

                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{model.description}</p>

                    <div className="flex items-center gap-2 mt-2 pt-1 border-t border-border/40 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-gray-400 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" />
                        {model.contextWindow}
                      </span>
                      <span className="text-gray-400 flex items-center gap-1 ml-auto">
                        <Cpu className="w-2.5 h-2.5" />
                        {model.speed}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
