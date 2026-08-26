import React, { useState, useEffect, useRef } from 'react';
import { ModelSelector } from './components/agent/ModelSelector';
import { ChatInterface } from './components/agent/ChatInterface';
import { LivePreview } from './components/preview/LivePreview';
import { TerminalDrawer } from './components/preview/TerminalDrawer';
import { ExportModal } from './components/export/ExportModal';
import { ApiKeyManager } from './components/settings/ApiKeyManager';
import { OAuthLoginModal } from './components/settings/OAuthLoginModal';
import { CodeEditorModal } from './components/editor/CodeEditorModal';
import { NewProjectModal, TEMPLATES } from './components/project/NewProjectModal';
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
  X,
  Plus
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
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [defaultBaseDir, setDefaultBaseDir] = useState<string>('');

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

          const defaultWorkspace = await window.electronAPI.getDefaultWorkspace();
          if (defaultWorkspace) {
            setProjectDir(defaultWorkspace);
            setDefaultBaseDir(defaultWorkspace.substring(0, defaultWorkspace.lastIndexOf('/')) || defaultWorkspace);
          }
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

  const handleCreateProject = (folderPath: string, templateId: string, projectName: string) => {
    setProjectDir(folderPath);
    setMessages([]);
    const tmpl = TEMPLATES.find((t) => t.id === templateId);
    if (tmpl && tmpl.starterPrompt) {
      setTimeout(() => {
        handleSendMessage(`Project: ${projectName}\n${tmpl.starterPrompt}`);
      }, 300);
    }
  };

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
    <div className="flex flex-col h-screen w-screen bg-vibe-mesh text-gray-100 overflow-hidden font-sans select-none">
      {/* 🚀 Top Navigation Toolbar */}
      <header className="h-12 bg-surface/90 border-b border-white/[0.06] flex items-center justify-between px-4 z-30 backdrop-blur-2xl">
        {/* Brand Logo & Project Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-sm shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0a0c10] rounded-[6px] flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs tracking-wider text-white">
                VIBE STUDIO
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/[0.06] text-gray-400 font-mono">
                v1.0
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-white/[0.08] mx-1 hidden sm:block" />

          {/* New Project Button */}
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-xs text-indigo-300 font-semibold transition-all shadow-sm"
            title="Start New Project Folder"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">New Project</span>
          </button>

          {/* Workspace Folder Picker */}
          <button
            onClick={handleOpenFolder}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-white/[0.04] border border-white/[0.08] text-xs text-gray-300 hover:text-white transition-all max-w-[180px]"
            title={projectDir || 'Select Project Directory'}
          >
            <FolderOpen className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate font-mono text-[11px]">
              {projectDir ? projectDir.split('/').pop() || projectDir : 'Open'}
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
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 hover:bg-white/[0.04] border border-white/[0.08] text-xs text-gray-300 hover:text-white transition-all"
            title="Browse Files & Code"
          >
            <FileCode className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline text-[11px] font-medium">Files</span>
          </button>

          {/* One-Click Export Modal */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-xs text-white transition-all shadow-sm shadow-indigo-600/30 font-semibold"
            title="One-Click .EXE / .ZIP / .JAR Exporter"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline text-[11px]">Export</span>
          </button>

          {/* Google Cloud PKCE Login */}
          <button
            onClick={() => setIsOAuthModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all ${
              keys.googleOAuthToken
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium'
                : 'bg-black/40 hover:bg-white/[0.04] border-white/[0.08] text-gray-300'
            }`}
            title="Google Cloud & Vertex AI OAuth PKCE"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden lg:inline text-[11px]">
              {keys.googleOAuthToken ? 'Vertex AI' : 'OAuth'}
            </span>
          </button>

          {/* BYOK Settings Modal */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-1.5 rounded-lg bg-black/40 hover:bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white transition-all"
            title="API Keys & Settings"
          >
            <Settings className="w-3.5 h-3.5" />
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

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
        defaultBaseDir={defaultBaseDir || '~/VibeProjects'}
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
