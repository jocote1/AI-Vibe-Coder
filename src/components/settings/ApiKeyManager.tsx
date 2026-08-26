import React, { useState } from 'react';
import { ProviderKeys } from '../../types/ai';
import { 
  Key, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Save, 
  Check, 
  Cpu, 
  Sparkles, 
  Server, 
  Terminal,
  ExternalLink
} from 'lucide-react';

interface ApiKeyManagerProps {
  keys: ProviderKeys;
  onSaveKeys: (keys: ProviderKeys) => void;
  isOsKeychain: boolean;
}

export const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({
  keys,
  onSaveKeys,
  isOsKeychain,
}) => {
  const [formKeys, setFormKeys] = useState<ProviderKeys>({ ...keys });
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleShow = (keyId: string) => {
    setShowKeyMap((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveKeys(formKeys);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* OS Keychain Encryption Status Banner */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-neon-cyan flex-shrink-0" />
          <div>
            <div className="font-bold text-white flex items-center gap-1.5">
              Zero-Cloud-Cost & Local Keychain Encryption
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-neon-cyan/20 text-neon-cyan font-bold">
                {isOsKeychain ? 'OS KEYCHAIN ACTIVE' : 'AES-256 STORE ACTIVE'}
              </span>
            </div>
            <p className="text-gray-400 text-[11px] mt-0.5">
              All credentials are stored encrypted on your local machine only. Never sent to any central server.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Google Gemini API */}
        <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/70 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Google Gemini API Key (AI Studio)
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-neon-cyan hover:underline flex items-center gap-1"
            >
              Get Free Key <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <div className="relative flex items-center">
            <input
              type={showKeyMap['gemini'] ? 'text' : 'password'}
              value={formKeys.geminiApiKey || ''}
              onChange={(e) => setFormKeys({ ...formKeys, geminiApiKey: e.target.value })}
              placeholder="AIzaSy..."
              className="w-full bg-background/90 text-xs text-white rounded-lg border border-border px-3 py-2 pr-10 focus:outline-none focus:border-primary font-mono"
            />
            <button
              type="button"
              onClick={() => toggleShow('gemini')}
              className="absolute right-2.5 text-gray-400 hover:text-white"
            >
              {showKeyMap['gemini'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* DeepSeek API */}
        <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/70 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              DeepSeek API Key (Direct)
            </label>
            <a
              href="https://platform.deepseek.com/api_keys"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-neon-cyan hover:underline flex items-center gap-1"
            >
              Get DeepSeek Key <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <div className="relative flex items-center">
            <input
              type={showKeyMap['deepseek'] ? 'text' : 'password'}
              value={formKeys.deepseekApiKey || ''}
              onChange={(e) => setFormKeys({ ...formKeys, deepseekApiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full bg-background/90 text-xs text-white rounded-lg border border-border px-3 py-2 pr-10 focus:outline-none focus:border-primary font-mono"
            />
            <button
              type="button"
              onClick={() => toggleShow('deepseek')}
              className="absolute right-2.5 text-gray-400 hover:text-white"
            >
              {showKeyMap['deepseek'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* xAI Grok API */}
        <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/70 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              xAI Grok API Key
            </label>
            <a
              href="https://console.x.ai/"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-neon-cyan hover:underline flex items-center gap-1"
            >
              Get Grok Key <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <div className="relative flex items-center">
            <input
              type={showKeyMap['grok'] ? 'text' : 'password'}
              value={formKeys.grokApiKey || ''}
              onChange={(e) => setFormKeys({ ...formKeys, grokApiKey: e.target.value })}
              placeholder="xai-..."
              className="w-full bg-background/90 text-xs text-white rounded-lg border border-border px-3 py-2 pr-10 focus:outline-none focus:border-primary font-mono"
            />
            <button
              type="button"
              onClick={() => toggleShow('grok')}
              className="absolute right-2.5 text-gray-400 hover:text-white"
            >
              {showKeyMap['grok'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* OpenRouter API */}
        <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/70 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-neon-purple" />
              OpenRouter API Key (200+ Models)
            </label>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-neon-cyan hover:underline flex items-center gap-1"
            >
              Get OpenRouter Key <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          <div className="relative flex items-center">
            <input
              type={showKeyMap['openrouter'] ? 'text' : 'password'}
              value={formKeys.openrouterApiKey || ''}
              onChange={(e) => setFormKeys({ ...formKeys, openrouterApiKey: e.target.value })}
              placeholder="sk-or-v1-..."
              className="w-full bg-background/90 text-xs text-white rounded-lg border border-border px-3 py-2 pr-10 focus:outline-none focus:border-primary font-mono"
            />
            <button
              type="button"
              onClick={() => toggleShow('openrouter')}
              className="absolute right-2.5 text-gray-400 hover:text-white"
            >
              {showKeyMap['openrouter'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Ollama Local Base URL */}
        <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/70 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-neon-cyan" />
              Ollama Local Server URL (100% Free & Offline)
            </label>
          </div>
          <input
            type="text"
            value={formKeys.ollamaBaseUrl || 'http://localhost:11434'}
            onChange={(e) => setFormKeys({ ...formKeys, ollamaBaseUrl: e.target.value })}
            placeholder="http://localhost:11434"
            className="w-full bg-background/90 text-xs text-white rounded-lg border border-border px-3 py-2 focus:outline-none focus:border-primary font-mono"
          />
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-glow-purple"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-neon-green" />
                Saved to Keychain!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Encrypted Credentials
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
