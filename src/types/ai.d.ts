export type AIProviderId = 
  | 'gemini' 
  | 'vertex-ai'
  | 'deepseek' 
  | 'grok' 
  | 'openrouter' 
  | 'ollama' 
  | 'custom';

export interface ModelOption {
  id: string;
  name: string;
  provider: AIProviderId;
  description: string;
  contextWindow: string;
  speed: 'Ultra-Fast' | 'Fast' | 'Balanced' | 'Deep Reasoning';
  recommended?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
  result?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  diffSummary?: {
    file: string;
    additions: number;
    deletions: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
  tokensUsed?: number;
}

export interface ProviderKeys {
  geminiApiKey?: string;
  deepseekApiKey?: string;
  grokApiKey?: string;
  openrouterApiKey?: string;
  ollamaBaseUrl?: string;
  customBaseUrl?: string;
  customApiKey?: string;
  customModelName?: string;
  googleOAuthToken?: string;
  googleOAuthRefreshToken?: string;
  googleUserEmail?: string;
}

export interface AgentActionStep {
  id: string;
  title: string;
  type: 'read_tree' | 'read_file' | 'write_file' | 'apply_patch' | 'terminal_command' | 'auto_heal';
  status: 'running' | 'success' | 'error';
  details?: string;
  diff?: {
    before?: string;
    after?: string;
    filePath?: string;
  };
  output?: string;
}
