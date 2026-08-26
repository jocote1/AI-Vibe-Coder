import React, { useState } from 'react';
import { AVAILABLE_MODELS } from '../../lib/ai/provider-router';
import { ChevronDown, Check, Zap, Cpu, Key } from 'lucide-react';

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

  const getProviderTag = (provider: string) => {
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.15] transition-all text-xs font-medium text-gray-200 hover:text-white shadow-sm"
      >
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="truncate max-w-[130px] font-semibold">{currentModel.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-gray-300 font-mono">
          {currentModel.speed}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 max-h-[460px] overflow-y-auto z-50 rounded-2xl glass-panel p-2.5 shadow-2xl border border-white/[0.1]">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] px-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Universal Model Hub</span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings();
                }}
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Key className="w-3 h-3" />
                Manage Keys
              </button>
            </div>

            <div className="space-y-1.5">
              {AVAILABLE_MODELS.map((model) => {
                const isSelected = model.id === selectedModelId;
                const badge = getProviderTag(model.provider);
                const hasKey = hasKeyForProvider(model.provider);

                return (
                  <div
                    key={model.id}
                    onClick={() => {
                      onSelectModel(model.id);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm'
                        : 'hover:bg-white/[0.03] border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{model.name}</span>
                        {model.recommended && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                            TOP VIBE
                          </span>
                        )}
                      </div>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-cyan-400" />
                      ) : !hasKey && model.provider !== 'ollama' ? (
                        <span className="text-[10px] text-amber-400 font-mono">Requires Key</span>
                      ) : null}
                    </div>

                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-1 leading-relaxed">{model.description}</p>

                    <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-white/[0.04] text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded-md border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-gray-400 flex items-center gap-1 font-mono">
                        <Zap className="w-2.5 h-2.5" />
                        {model.contextWindow}
                      </span>
                      <span className="text-gray-400 flex items-center gap-1 ml-auto font-mono">
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
