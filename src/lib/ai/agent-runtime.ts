import { ModelMessage, UniversalProviderRouter } from './provider-router';
import { ProviderKeys, ToolCall } from '../../types/ai';

export interface AgentStepCallback {
  onStreamingContent?: (chunk: string) => void;
  onToolCallStart?: (toolCall: ToolCall) => void;
  onToolCallComplete?: (toolCall: ToolCall) => void;
  onToolCallFailed?: (toolCall: ToolCall, error: string) => void;
  onStatusUpdate?: (status: string) => void;
}

export class AutonomousAgentRuntime {
  private messages: ModelMessage[] = [];
  private projectDir: string;
  private keys: ProviderKeys;
  private modelId: string;
  private abortController: AbortController | null = null;
  private maxTurns = 40;

  constructor(projectDir: string, modelId: string, keys: ProviderKeys) {
    this.projectDir = projectDir;
    this.modelId = modelId;
    this.keys = keys;
  }

  public setProjectDir(dir: string): void {
    this.projectDir = dir;
  }

  public setModel(modelId: string): void {
    this.modelId = modelId;
  }

  public setKeys(keys: ProviderKeys): void {
    this.keys = keys;
  }

  public abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Main entry point to run an autonomous vibe-coding session from a user prompt
   */
  public async executePrompt(
    userPrompt: string,
    callbacks: AgentStepCallback
  ): Promise<{ fullResponse: string; toolCallsExecuted: ToolCall[] }> {
    this.abortController = new AbortController();
    const executedToolCalls: ToolCall[] = [];

    // Append user message
    this.messages.push({
      role: 'user',
      content: userPrompt,
    });

    let currentTurn = 0;
    let finalAssistantText = '';
    let hasCreatedFiles = false;

    while (currentTurn < this.maxTurns) {
      if (this.abortController.signal.aborted) {
        callbacks.onStatusUpdate?.('Execution stopped by user.');
        break;
      }

      currentTurn++;
      callbacks.onStatusUpdate?.(`Autonomous Agent Building (Step ${currentTurn}/${this.maxTurns})...`);

      let turnText = '';
      const turnEvent = await UniversalProviderRouter.callModel(
        this.modelId,
        this.messages,
        this.keys,
        (event) => {
          if (event.textChunk) {
            turnText += event.textChunk;
            callbacks.onStreamingContent?.(event.textChunk);
          }
        },
        this.abortController.signal
      );

      finalAssistantText += (finalAssistantText ? '\n' : '') + turnText;

      const modelToolCalls = turnEvent.toolCalls || [];

      // Record assistant's response in history
      this.messages.push({
        role: 'assistant',
        content: turnText,
        tool_calls: modelToolCalls.length > 0 ? modelToolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })) : undefined,
      });

      // Autonomous Continuation Check 1: Model hit token length cutoff
      if (turnEvent.finishReason === 'length') {
        callbacks.onStatusUpdate?.('Token limit reached — auto-continuing generation...');
        this.messages.push({
          role: 'user',
          content: 'Please continue directly from where you were cut off without repeating code.',
        });
        continue;
      }

      // Autonomous Continuation Check 2: Model explained plan or did a read-only scan but hasn't created the requested files yet
      const indicatesPendingWork = /(?:let me (?:now )?(?:create|write|implement|build)|next,? (?:i will|we will|let's)|i will now|now i'll create|now we need to create|now let's create)/i.test(turnText);
      const isCreationPrompt = /(?:create|build|generate|make|write|add|code|implement|fix)/i.test(userPrompt);

      if (modelToolCalls.length === 0) {
        if (!hasCreatedFiles && isCreationPrompt && currentTurn <= 3) {
          callbacks.onStatusUpdate?.('Auto-prompting agent to write project files...');
          this.messages.push({
            role: 'user',
            content: 'Please proceed now to create all the code and project files in the workspace using the write_file tool.',
          });
          continue;
        }

        if (indicatesPendingWork && currentTurn < 10) {
          callbacks.onStatusUpdate?.('Auto-continuing with next step in plan...');
          this.messages.push({
            role: 'user',
            content: 'Please continue immediately with the next step and write the necessary files.',
          });
          continue;
        }

        // If no more tools and no pending work indicated, task is complete!
        callbacks.onStatusUpdate?.('Application built & ready! ✨');
        break;
      }

      // Execute each tool call
      for (const rawCall of modelToolCalls) {
        if (this.abortController.signal.aborted) break;

        const toolCall: ToolCall = {
          id: rawCall.id,
          name: rawCall.name,
          parameters: rawCall.arguments,
          status: 'running',
        };

        callbacks.onToolCallStart?.(toolCall);

        try {
          const toolResult = await this.dispatchTool(toolCall.name, toolCall.parameters, toolCall.id);
          toolCall.status = 'completed';
          toolCall.result = toolResult;
          if (toolCall.name === 'write_file' || toolCall.name === 'apply_patch_diff') {
            hasCreatedFiles = true;
          }
          callbacks.onToolCallComplete?.(toolCall);
          executedToolCalls.push(toolCall);

          let contentStr = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2);
          if (contentStr.length > 20000) {
            contentStr = contentStr.slice(0, 20000) + '\n... [Remaining content truncated for context limit safety]';
          }

          // Append tool response to message history
          this.messages.push({
            role: 'tool',
            name: toolCall.name,
            tool_call_id: toolCall.id,
            content: contentStr,
          });
        } catch (err: any) {
          const errMsg = err.message || 'Unknown tool execution error';
          toolCall.status = 'failed';
          toolCall.error = errMsg;
          callbacks.onToolCallFailed?.(toolCall, errMsg);
          executedToolCalls.push(toolCall);

          // Auto-heal interceptor: Feed error back to model
          this.messages.push({
            role: 'tool',
            name: toolCall.name,
            tool_call_id: toolCall.id,
            content: `ERROR: Tool execution failed with message:\n${errMsg}\nPlease diagnose and auto-heal this issue.`,
          });
        }
      }
    }

    return {
      fullResponse: finalAssistantText,
      toolCallsExecuted: executedToolCalls,
    };
  }

  private formatAsciiTree(nodes: any[], indent = ''): string {
    let result = '';
    for (const node of nodes) {
      if (node.isDirectory) {
        result += `${indent}📁 ${node.name}/\n`;
        if (node.children && node.children.length > 0) {
          result += this.formatAsciiTree(node.children, indent + '  ');
        }
      } else {
        result += `${indent}📄 ${node.name}\n`;
      }
    }
    return result;
  }

  /**
   * Dispatches tool execution to Electron native layer or browser simulation
   */
  private async dispatchTool(name: string, params: Record<string, any>, taskId: string): Promise<any> {
    const api = window.electronAPI;

    switch (name) {
      case 'read_directory_tree': {
        const targetPath = params.path ? this.resolvePath(params.path) : this.projectDir;
        if (api) {
          const rawTree = await api.readDirectoryTree(targetPath, params.max_depth || 3);
          if (!rawTree || rawTree.length === 0) {
            return `Project workspace (${this.projectDir || 'workspace'}) is currently empty. Ready to create files with write_file.`;
          }
          return `Project Workspace Structure:\n` + this.formatAsciiTree(rawTree);
        }
        return `Project workspace is currently empty. Ready to create files with write_file.`;
      }

      case 'read_file': {
        const filePath = this.resolvePath(params.path);
        if (api) {
          return await api.readFile(filePath);
        }
        return `// Mock content for ${params.path}`;
      }

      case 'write_file': {
        const filePath = this.resolvePath(params.path);
        if (api) {
          const res = await api.writeFile(filePath, params.content);
          if (!res.success) throw new Error(res.error || 'Failed to write file');
          return `Successfully wrote ${params.content.length} characters to ${params.path}`;
        }
        return `Simulated write to ${params.path}`;
      }

      case 'apply_patch_diff': {
        const filePath = this.resolvePath(params.path);
        if (api) {
          const res = await api.applyPatchDiff(filePath, params.search_chunk, params.replace_chunk);
          if (!res.success) throw new Error(res.error || 'Patch failed');
          return `Successfully patched ${params.path}`;
        }
        return `Simulated patch on ${params.path}`;
      }

      case 'execute_terminal_command': {
        const cwd = params.cwd ? this.resolvePath(params.cwd) : this.projectDir;
        if (api) {
          const res = await api.executeAgentCommand(params.command, cwd, taskId);
          if (res.exitCode !== 0) {
            throw new Error(`Command "${params.command}" failed with exit code ${res.exitCode}.\nStderr: ${res.stderr || res.stdout}`);
          }
          return res.stdout || 'Command completed successfully with empty output.';
        }
        return `Simulated execution of: ${params.command}`;
      }

      case 'auto_heal_error': {
        return {
          diagnosed: true,
          action: 'Applying automatic code fix for detected error logs.',
          suggested_fix: params.suggested_fix,
        };
      }

      default:
        throw new Error(`Unknown tool name: ${name}`);
    }
  }

  private resolvePath(targetPath: string): string {
    if (!targetPath) return this.projectDir;
    if (targetPath.startsWith('/') || /^[a-zA-Z]:\\/.test(targetPath)) {
      return targetPath;
    }
    const cleanRel = targetPath.replace(/^[\\/]+/, '');
    return `${this.projectDir.replace(/[\\/]+$/, '')}/${cleanRel}`;
  }
}
