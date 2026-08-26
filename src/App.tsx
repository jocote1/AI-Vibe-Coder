import React, { useState, useEffect, useRef } from 'react';
import { ModelSelector } from './components/agent/ModelSelector';
import { ChatInterface } from './components/agent/ChatInterface';
import { LivePreview } from './components/preview/LivePreview';
import { TerminalDrawer } from './components/preview/TerminalDrawer';
import { ExportModal } from './components/export/ExportModal';
import { ApiKeyManager } from './components/settings/ApiKeyManager';
import { OAuthLoginModal } from './components/settings/OAuthLoginModal';
import { CodeEditorModal } from './components/editor/CodeEditorModal';
import { AutonomousAgentRuntime } from './lib/ai/agent-runtime';
import { AVAILABLE_MODELS } from './lib/ai/provider-router';
import { ChatMessage, ProviderKeys, ToolCall } from './types/ai';
import { 
  FolderOpen, 
  Download, 
  Settings, 
  Sparkles, 
  FileCode, 
  ShieldCheck, 
  X 
} from 'lucide-react';

export const App: React.FC = () => {
  const [projectDir, setProjectDir] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-2.5-flash');
  const [keys, setKeys] = useState<ProviderKeys>({});
  const [isOsKeychain, setIsOsKeychain] = useState<boolean>(true);

  // Agent State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [activeStatus, setActiveStatus] = useState<string>('');
  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCall[]>([]);

  // UI Modals & Drawer State
  const [isTerminalExpanded, setIsTerminalExpanded] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isOAuthModalOpen, setIsOAuthModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState<boolean>(false);

  const agentRuntimeRef = useRef<AutonomousAgentRuntime | null>(null);

  // Load encrypted keys and default workspace on mount
  useEffect(() => {
    const initApp = async () => {
      if (window.electronAPI) {
        try {
          const allStored = await window.electronAPI.secureStorage.getAll();
          setKeys(allStored as ProviderKeys);

          const osKeychainAvailable = await window.electronAPI.secureStorage.isOsKeychain();
          setIsOsKeychain(osKeychainAvailable);
        } catch (e) {
          console.warn('Failed to load secure keys from Electron storage:', e);
        }
      }
    };
    initApp();
  }, []);

  // Update Agent runtime instance when projectDir, model, or keys change
  useEffect(() => {
    agentRuntimeRef.current = new AutonomousAgentRuntime(projectDir, selectedModelId, keys);
  }, [projectDir, selectedModelId, keys]);

  const handleOpenFolder = async () => {
    if (window.electronAPI) {
      const selected = await window.electronAPI.openDirectory();
      if (selected) {
        setProjectDir(selected);
      }
    }
  };

  const handleSaveKeys = async (newKeys: ProviderKeys) => {
    setKeys(newKeys);
    if (window.electronAPI) {
      for (const [k, v] of Object.entries(newKeys)) {
        if (v) {
          await window.electronAPI.secureStorage.setItem(k, v);
        } else {
          await window.electronAPI.secureStorage.removeItem(k);
        }
      }
    }
  };

  const hasKeyForProvider = (provider: string): boolean => {
    switch (provider) {
      case 'gemini':
        return !!keys.geminiApiKey;
      case 'vertex-ai':
        return !!keys.googleOAuthToken;
      case 'deepseek':
        return !!keys.deepseekApiKey;
      case 'grok':
        return !!keys.grokApiKey;
      case 'openrouter':
        return !!keys.openrouterApiKey;
      case 'ollama':
        return true; // Local default
      default:
        return true;
    }
  };

  const handleSendMessage = async (prompt: string) => {
    if (!prompt.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setCurrentToolCalls([]);
    setActiveStatus('Reasoning & Planning...');

    const assistantMessageId = `msg_asst_${Date.now()}`;
    let accumulatedContent = '';
    const executedToolCalls: ToolCall[] = [];

    // Append placeholder assistant message
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
        toolCalls: [],
      },
    ]);

    try {
      if (!agentRuntimeRef.current) {
        agentRuntimeRef.current = new AutonomousAgentRuntime(projectDir, selectedModelId, keys);
      }

      await agentRuntimeRef.current.executePrompt(prompt, {
        onStreamingContent: (chunk) => {
          accumulatedContent += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: accumulatedContent }
                : msg
            )
          );
        },
        onToolCallStart: (tc) => {
          setCurrentToolCalls((prev) => [...prev, tc]);
          setActiveStatus(`Running tool: ${tc.name}...`);
        },
        onToolCallComplete: (tc) => {
          setCurrentToolCalls((prev) =>
            prev.map((item) => (item.id === tc.id ? tc : item))
          );
          executedToolCalls.push(tc);
        },
        onToolCallFailed: (tc, error) => {
          setCurrentToolCalls((prev) =>
            prev.map((item) => (item.id === tc.id ? { ...tc, error } : item))
          );
          executedToolCalls.push({ ...tc, error });
        },
        onStatusUpdate: (status) => {
          setActiveStatus(status);
        },
      });

      // Finalize assistant message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: accumulatedContent,
                isStreaming: false,
                toolCalls: executedToolCalls,
              }
            : msg
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: (accumulatedContent ? accumulatedContent + '\n\n' : '') + `⚠️ **Error:** ${err.message}`,
                isStreaming: false,
                toolCalls: executedToolCalls,
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      setCurrentToolCalls([]);
      setActiveStatus('');
    }
  };

  const handleStopStreaming = () => {
    agentRuntimeRef.current?.abort();
    setIsStreaming(false);
    setActiveStatus('Stopped');
  };

  const activeModel = AVAILABLE_MODELS.find((m) => m.id === selectedModelId) || AVAILABLE_MODELS[0];

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-gray-100 overflow-hidden font-sans select-none">
      {/* 🚀 Top Navigation Toolbar */}
      <header className="h-13 bg-card/90 border-b border-border flex items-center justify-between px-4 z-30 backdrop-blur-xl">
        {/* Brand Logo & Vibe Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary via-neon-purple to-neon-cyan p-0.5 shadow-glow-cyan">
              <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-neon-cyan animate-pulse" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan via-primary to-neon-purple">
                VIBE-STUDIO
              </span>
              <span className="text-[9px] ml-1.5 px-1.5 py-0.2 rounded bg-neon-cyan/10 text-neon-cyan font-bold border border-neon-cyan/20">
                v1.0
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-border/80 mx-1 hidden sm:block" />

          {/* Workspace Folder Picker */}
          <button
            onClick={handleOpenFolder}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border text-xs text-gray-200 hover:text-white transition-all max-w-[220px]"
            title={projectDir || 'Select Project Directory'}
          >
            <FolderOpen className="w-3.5 h-3.5 text-neon-cyan flex-shrink-0" />
            <span className="truncate font-mono text-[11px]">
              {projectDir ? projectDir.split('/').pop() || projectDir : 'Open Workspace'}
            </span>
          </button>
        </div>

        {/* Center / Right Tools */}
        <div className="flex items-center gap-2">
          {/* Universal Model Selector */}
          <ModelSelector
            selectedModelId={selectedModelId}
            onSelectModel={setSelectedModelId}
            hasKeyForProvider={hasKeyForProvider}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />

          {/* Code Explorer / File Tree Modal */}
          <button
            onClick={() => setIsEditorModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border text-xs text-gray-200 hover:text-white transition-all"
            title="Browse Files & Code"
          >
            <FileCode className="w-3.5 h-3.5 text-neon-purple" />
            <span className="hidden md:inline font-medium">Files</span>
          </button>

          {/* One-Click Export Modal */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/40 text-xs text-white transition-all shadow-glow-purple/20 font-bold"
            title="One-Click .EXE / .ZIP / .JAR Exporter"
          >
            <Download className="w-3.5 h-3.5 text-neon-cyan" />
            <span className="hidden sm:inline">Export Studio</span>
          </button>

          {/* Google Cloud PKCE Login */}
          <button
            onClick={() => setIsOAuthModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all ${
              keys.googleOAuthToken
                ? 'bg-emerald-950/30 border-emerald-900/60 text-neon-green font-semibold'
                : 'bg-secondary/80 hover:bg-secondary border-border text-gray-300'
            }`}
            title="Google Cloud & Vertex AI OAuth PKCE"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden lg:inline">
              {keys.googleOAuthToken ? 'Vertex AI Active' : 'OAuth PKCE'}
            </span>
          </button>

          {/* BYOK Settings Modal */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary border border-border text-gray-400 hover:text-white transition-all"
            title="API Keys & Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 🧩 Main Workspace Body (Side-by-Side Agent Chat & Live Preview) */}
      <main className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* Left Panel: Autonomous Agent Chat & Action Stream */}
        <section className="w-full lg:w-[48%] h-full flex flex-col min-w-[340px]">
          <ChatInterface
            messages={messages}
            isStreaming={isStreaming}
            activeStatus={activeStatus}
            onSendMessage={handleSendMessage}
            onStopStreaming={handleStopStreaming}
            currentToolCalls={currentToolCalls}
            currentModelName={activeModel.name}
          />
        </section>

        {/* Right Panel: Sandboxed Live Preview & Hot-Reload Engine */}
        <section className="hidden lg:flex flex-1 h-full flex-col min-w-[400px]">
          <LivePreview
            initialUrl="http://localhost:5173"
            projectDir={projectDir}
          />
        </section>
      </main>

      {/* 💻 Bottom Interactive Terminal Drawer */}
      <TerminalDrawer
        projectDir={projectDir}
        isExpanded={isTerminalExpanded}
        onToggleExpand={() => setIsTerminalExpanded(!isTerminalExpanded)}
      />

      {/* 📦 Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        projectDir={projectDir}
      />

      <OAuthLoginModal
        isOpen={isOAuthModalOpen}
        onClose={() => setIsOAuthModalOpen(false)}
        keys={keys}
        onUpdateKeys={handleSaveKeys}
      />

      <CodeEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        projectDir={projectDir}
      />

      {/* BYOK Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
          <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide">BRING YOUR OWN KEYS (BYOK)</h2>
                  <p className="text-xs text-gray-400">Zero-cost, 100% private OS keychain credential storage</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <ApiKeyManager
                keys={keys}
                onSaveKeys={handleSaveKeys}
                isOsKeychain={isOsKeychain}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
