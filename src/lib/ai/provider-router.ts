import { ModelOption, ProviderKeys } from '../../types/ai';
import { VIBE_STUDIO_TOOLS, VIBE_SYSTEM_PROMPT } from './tools-definition';

export const AVAILABLE_MODELS: ModelOption[] = [
  // Google Gemini
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    description: 'Ultra-fast multimodal model with lightning execution and tool calling.',
    contextWindow: '1M tokens',
    speed: 'Ultra-Fast',
    recommended: true,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'gemini',
    description: 'State-of-the-art coding and complex multi-file architectural reasoning.',
    contextWindow: '2M tokens',
    speed: 'Deep Reasoning',
    recommended: true,
  },
  {
    id: 'gemini-3.0-flash',
    name: 'Gemini 3.0 Flash Preview',
    provider: 'gemini',
    description: 'Next-gen hyper-performant agentic coding engine.',
    contextWindow: '1M tokens',
    speed: 'Ultra-Fast',
  },
  // Vertex AI (PKCE Auth)
  {
    id: 'vertex-gemini-2.5-pro',
    name: 'Vertex AI Gemini 2.5 Pro',
    provider: 'vertex-ai',
    description: 'Direct enterprise Google Cloud Vertex AI quota via PKCE OAuth.',
    contextWindow: '2M tokens',
    speed: 'Deep Reasoning',
  },
  // DeepSeek
  {
    id: 'deepseek-chat',
    name: 'DeepSeek-V3',
    provider: 'deepseek',
    description: 'Ultra-low cost high-performance flagship model.',
    contextWindow: '64k tokens',
    speed: 'Fast',
    recommended: true,
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek-R1 (Reasoning)',
    provider: 'deepseek',
    description: 'Autonomous step-by-step reasoning with chain-of-thought verification.',
    contextWindow: '64k tokens',
    speed: 'Deep Reasoning',
  },
  // xAI Grok
  {
    id: 'grok-3',
    name: 'Grok 3 (Beta)',
    provider: 'grok',
    description: 'Super-intelligence code reasoning from xAI.',
    contextWindow: '128k tokens',
    speed: 'Deep Reasoning',
  },
  {
    id: 'grok-2-1212',
    name: 'Grok 2',
    provider: 'grok',
    description: 'High-speed coding and logic assistant by xAI.',
    contextWindow: '128k tokens',
    speed: 'Fast',
  },
  // OpenRouter
  {
    id: 'openrouter/anthropic/claude-3.7-sonnet',
    name: 'OpenRouter Claude 3.7 Sonnet',
    provider: 'openrouter',
    description: 'Top-tier coding agent intelligence via OpenRouter aggregator.',
    contextWindow: '200k tokens',
    speed: 'Deep Reasoning',
  },
  {
    id: 'openrouter/openai/gpt-4o',
    name: 'OpenRouter GPT-4o',
    provider: 'openrouter',
    description: 'Omni-model coding assistant via OpenRouter.',
    contextWindow: '128k tokens',
    speed: 'Fast',
  },
  // Ollama (Local & Free)
  {
    id: 'llama3.3:latest',
    name: 'Ollama: Llama 3.3 (Local)',
    provider: 'ollama',
    description: '100% Free, Private, and Offline local LLM running on your GPU/CPU.',
    contextWindow: '128k tokens',
    speed: 'Balanced',
    recommended: true,
  },
  {
    id: 'qwen2.5-coder:latest',
    name: 'Ollama: Qwen 2.5 Coder (Local)',
    provider: 'ollama',
    description: 'State-of-the-art open-source code generation model running locally.',
    contextWindow: '32k tokens',
    speed: 'Fast',
  },
  // Custom API
  {
    id: 'custom-endpoint',
    name: 'Custom OpenAI-Compatible API',
    provider: 'custom',
    description: 'Connect any OpenAI-compatible API base URL, vLLM, or LM Studio.',
    contextWindow: 'Configurable',
    speed: 'Balanced',
  },
];

export interface ModelMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface StreamEvent {
  textChunk?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, any>;
  }>;
  finishReason?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export class UniversalProviderRouter {
  /**
   * Dispatches a chat completion call with streaming and tool calling support
   */
  public static async callModel(
    modelId: string,
    messages: ModelMessage[],
    keys: ProviderKeys,
    onChunk: (event: StreamEvent) => void,
    signal?: AbortSignal
  ): Promise<StreamEvent> {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId) || AVAILABLE_MODELS[0];

    switch (model.provider) {
      case 'gemini':
        return this.callGemini(modelId, messages, keys.geminiApiKey || '', onChunk, signal);

      case 'vertex-ai':
        return this.callVertexAI(modelId, messages, keys.googleOAuthToken || '', onChunk, signal);

      case 'deepseek':
        return this.callOpenAICompatible({
          baseUrl: 'https://api.deepseek.com',
          apiKey: keys.deepseekApiKey || '',
          model: modelId,
          messages,
          onChunk,
          signal,
        });

      case 'grok':
        return this.callOpenAICompatible({
          baseUrl: 'https://api.x.ai/v1',
          apiKey: keys.grokApiKey || '',
          model: modelId,
          messages,
          onChunk,
          signal,
        });

      case 'openrouter':
        const cleanOpenRouterModel = modelId.replace('openrouter/', '');
        return this.callOpenAICompatible({
          baseUrl: 'https://openrouter.ai/api/v1',
          apiKey: keys.openrouterApiKey || '',
          model: cleanOpenRouterModel,
          messages,
          onChunk,
          signal,
        });

      case 'ollama':
        const ollamaBase = keys.ollamaBaseUrl || 'http://localhost:11434';
        return this.callOpenAICompatible({
          baseUrl: `${ollamaBase.replace(/\/$/, '')}/v1`,
          apiKey: 'ollama',
          model: modelId,
          messages,
          onChunk,
          signal,
        });

      case 'custom':
        return this.callOpenAICompatible({
          baseUrl: (keys.customBaseUrl || 'http://localhost:8000/v1').replace(/\/$/, ''),
          apiKey: keys.customApiKey || 'none',
          model: keys.customModelName || 'gpt-4o',
          messages,
          onChunk,
          signal,
        });

      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  }

  /**
   * Google Gemini Native API caller with function calling
   */
  private static async callGemini(
    modelId: string,
    messages: ModelMessage[],
    apiKey: string,
    onChunk: (event: StreamEvent) => void,
    signal?: AbortSignal
  ): Promise<StreamEvent> {
    if (!apiKey) {
      throw new Error('Google Gemini API Key is missing. Please configure it in Settings or BYOK Manager.');
    }

    const cleanModelName = modelId.startsWith('gemini-') ? modelId : 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:streamGenerateContent?key=${apiKey}&alt=sse`;

    // Convert messages to Gemini format
    const contents: any[] = [];
    let systemInstruction = VIBE_SYSTEM_PROMPT;

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction += `\n${msg.content}`;
      } else if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        const parts: any[] = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.tool_calls) {
          for (const tc of msg.tool_calls) {
            parts.push({
              functionCall: {
                name: tc.name || tc.function?.name,
                args: typeof tc.parameters === 'object' ? tc.parameters : JSON.parse(tc.function?.arguments || '{}'),
              },
            });
          }
        }
        contents.push({ role: 'model', parts });
      } else if (msg.role === 'tool') {
        contents.push({
          role: 'function',
          parts: [
            {
              functionResponse: {
                name: msg.name || 'tool_response',
                response: { output: msg.content },
              },
            },
          ],
        });
      }
    }

    // Convert VIBE tools to Gemini declarations
    const geminiTools = [
      {
        functionDeclarations: VIBE_STUDIO_TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    ];

    const bodyPayload = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents,
      tools: geminiTools,
      generationConfig: {
        temperature: 0.2,
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${err}`);
    }

    let fullText = '';
    const toolCalls: Array<{ id: string; name: string; arguments: Record<string, any> }> = [];

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error('Failed to create stream reader.');

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr);
            const candidate = data.candidates?.[0];
            const parts = candidate?.content?.parts || [];

            for (const part of parts) {
              if (part.text) {
                fullText += part.text;
                onChunk({ textChunk: part.text });
              }
              if (part.functionCall) {
                toolCalls.push({
                  id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                  name: part.functionCall.name,
                  arguments: part.functionCall.args || {},
                });
              }
            }
          } catch {
            // Ignore parse errors on partial frames
          }
        }
      }
    }

    const finalEvent: StreamEvent = {
      textChunk: fullText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
    onChunk(finalEvent);
    return finalEvent;
  }

  /**
   * Google Cloud Vertex AI via OAuth Token
   */
  private static async callVertexAI(
    _modelId: string,
    messages: ModelMessage[],
    oauthToken: string,
    onChunk: (event: StreamEvent) => void,
    signal?: AbortSignal
  ): Promise<StreamEvent> {
    if (!oauthToken) {
      throw new Error('Google OAuth Token missing. Please log in with your Google Cloud account in Settings.');
    }

    // Vertex AI endpoint for generative models
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${oauthToken}`,
      },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : m.role === 'user' ? 'user' : 'user',
          parts: [{ text: m.content }],
        })),
      }),
      signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Vertex AI Error (${response.status}): ${err}`);
    }

    let text = '';
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        text += chunk;
        onChunk({ textChunk: chunk });
      }
    }

    return { textChunk: text };
  }

  /**
   * Standard OpenAI-compatible Chat Completions API with SSE streaming & tool calling
   */
  private static async callOpenAICompatible(options: {
    baseUrl: string;
    apiKey: string;
    model: string;
    messages: ModelMessage[];
    onChunk: (event: StreamEvent) => void;
    signal?: AbortSignal;
  }): Promise<StreamEvent> {
    const { baseUrl, apiKey, model, messages, onChunk, signal } = options;

    const formattedTools = VIBE_STUDIO_TOOLS.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const formattedMessages = [
      { role: 'system', content: VIBE_SYSTEM_PROMPT },
      ...messages.map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'tool',
            content: m.content,
            tool_call_id: m.tool_call_id || 'call_default',
            name: m.name,
          };
        }
        return {
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls,
        };
      }),
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        tools: formattedTools,
        tool_choice: 'auto',
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Provider Error (${response.status}): ${errText}`);
    }

    let accumulatedText = '';
    const toolCallsMap: Record<number, { id: string; name: string; arguments: string }> = {};

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error('Failed to read stream.');

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const delta = data.choices?.[0]?.delta;

            if (delta?.content) {
              accumulatedText += delta.content;
              onChunk({ textChunk: delta.content });
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallsMap[idx]) {
                  toolCallsMap[idx] = {
                    id: tc.id || `call_${idx}_${Date.now()}`,
                    name: tc.function?.name || '',
                    arguments: '',
                  };
                }
                if (tc.function?.name) toolCallsMap[idx].name = tc.function.name;
                if (tc.function?.arguments) toolCallsMap[idx].arguments += tc.function.arguments;
              }
            }
          } catch {
            // Ignore incomplete chunks
          }
        }
      }
    }

    // Assemble final tool calls
    const finalToolCalls = Object.values(toolCallsMap).map((tc) => {
      let args = {};
      try {
        args = JSON.parse(tc.arguments || '{}');
      } catch {
        args = { raw: tc.arguments };
      }
      return {
        id: tc.id,
        name: tc.name,
        arguments: args,
      };
    });

    const finalEvent: StreamEvent = {
      textChunk: accumulatedText,
      toolCalls: finalToolCalls.length > 0 ? finalToolCalls : undefined,
    };
    onChunk(finalEvent);
    return finalEvent;
  }
}
