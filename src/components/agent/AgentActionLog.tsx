import React, { useState } from 'react';
import { ToolCall } from '../../types/ai';
import { 
  FileCode, 
  FolderTree, 
  Terminal, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ChevronDown, 
  ChevronRight,
  GitCommit,
  Flame
} from 'lucide-react';

interface AgentActionLogProps {
  toolCalls: ToolCall[];
}

export const AgentActionLog: React.FC<AgentActionLogProps> = ({ toolCalls }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!toolCalls || toolCalls.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getToolIcon = (name: string) => {
    switch (name) {
      case 'read_directory_tree':
        return <FolderTree className="w-4 h-4 text-neon-cyan" />;
      case 'read_file':
        return <FileCode className="w-4 h-4 text-neon-purple" />;
      case 'write_file':
        return <FileCode className="w-4 h-4 text-neon-green" />;
      case 'apply_patch_diff':
        return <GitCommit className="w-4 h-4 text-neon-amber" />;
      case 'execute_terminal_command':
        return <Terminal className="w-4 h-4 text-blue-400" />;
      case 'auto_heal_error':
        return <Flame className="w-4 h-4 text-neon-pink animate-pulse" />;
      default:
        return <Sparkles className="w-4 h-4 text-primary" />;
    }
  };

  const getToolTitle = (tc: ToolCall) => {
    switch (tc.name) {
      case 'read_directory_tree':
        return `Scanning Project Structure: ${tc.parameters?.path || 'Root'}`;
      case 'read_file':
        return `Reading File: ${tc.parameters?.path || 'Unknown'}`;
      case 'write_file':
        return `Writing File: ${tc.parameters?.path || 'Unknown'}`;
      case 'apply_patch_diff':
        return `Surgically Patching: ${tc.parameters?.path || 'Unknown'}`;
      case 'execute_terminal_command':
        return `Executing: ${tc.parameters?.command || 'Shell Command'}`;
      case 'auto_heal_error':
        return `Auto-Healing Error Detected in Compiler/Runtime`;
      default:
        return `Invoking: ${tc.name}`;
    }
  };

  return (
    <div className="space-y-2.5 my-3">
      {toolCalls.map((tc) => {
        const isExpanded = expandedId === tc.id;

        return (
          <div
            key={tc.id}
            className={`rounded-xl border transition-all text-xs overflow-hidden backdrop-blur-md ${
              tc.status === 'running'
                ? 'border-primary/50 bg-primary/5 shadow-glow-purple/10'
                : tc.status === 'failed'
                ? 'border-neon-pink/40 bg-neon-pink/5'
                : tc.name === 'auto_heal_error'
                ? 'border-neon-pink/30 bg-neon-pink/10'
                : 'border-border/80 bg-card/60 hover:border-border'
            }`}
          >
            {/* Header / Click to Expand */}
            <div
              onClick={() => toggleExpand(tc.id)}
              className="flex items-center justify-between p-2.5 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1 rounded-lg bg-secondary/80 border border-border/60">
                  {getToolIcon(tc.name)}
                </div>
                <span className="font-semibold text-gray-200 truncate">
                  {getToolTitle(tc)}
                </span>
              </div>

              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                {tc.status === 'running' && (
                  <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Running
                  </span>
                )}
                {tc.status === 'completed' && (
                  <span className="flex items-center gap-1 text-[11px] text-neon-green font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Done
                  </span>
                )}
                {tc.status === 'failed' && (
                  <span className="flex items-center gap-1 text-[11px] text-neon-pink font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Failed
                  </span>
                )}
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Expanded Details / Diff Viewer / Output */}
            {isExpanded && (
              <div className="p-3 border-t border-border/60 bg-background/70 space-y-2 font-mono">
                {/* Parameters */}
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-sans tracking-wider mb-1">
                    Parameters
                  </div>
                  <pre className="p-2 rounded bg-card border border-border/50 text-[11px] text-gray-300 overflow-x-auto">
                    {JSON.stringify(tc.parameters, null, 2)}
                  </pre>
                </div>

                {/* Diff Viewer for apply_patch_diff */}
                {tc.name === 'apply_patch_diff' && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-gray-400 uppercase font-sans tracking-wider">
                      Patch Diff Details
                    </div>
                    <div className="p-2 rounded bg-red-950/20 border border-red-900/40 text-[11px] text-red-300 overflow-x-auto">
                      <div className="text-[10px] text-red-400 font-sans font-bold mb-1">- Target Chunk (Search)</div>
                      <pre className="whitespace-pre-wrap">{tc.parameters.search_chunk}</pre>
                    </div>
                    <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/40 text-[11px] text-emerald-300 overflow-x-auto">
                      <div className="text-[10px] text-emerald-400 font-sans font-bold mb-1">+ Replacement Chunk</div>
                      <pre className="whitespace-pre-wrap">{tc.parameters.replace_chunk}</pre>
                    </div>
                  </div>
                )}

                {/* Auto Heal Error Explanation */}
                {tc.name === 'auto_heal_error' && (
                  <div className="p-2.5 rounded bg-neon-pink/10 border border-neon-pink/30 space-y-1.5 font-sans">
                    <div className="text-neon-pink font-bold text-xs flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      Self-Healing Diagnosis Applied:
                    </div>
                    <p className="text-gray-300 text-xs">{tc.parameters.suggested_fix}</p>
                    <div className="text-[10px] text-gray-400 font-mono mt-1 pt-1 border-t border-neon-pink/20 truncate">
                      Intercepted Logs: {tc.parameters.error_logs?.slice(0, 180)}...
                    </div>
                  </div>
                )}

                {/* Results / Error Output */}
                {tc.result && (
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-sans tracking-wider mb-1">
                      Execution Result
                    </div>
                    <pre className="p-2 rounded bg-card border border-border/50 text-[11px] text-emerald-400 overflow-x-auto max-h-48 overflow-y-auto">
                      {typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2)}
                    </pre>
                  </div>
                )}

                {tc.error && (
                  <div>
                    <div className="text-[10px] text-neon-pink uppercase font-sans tracking-wider mb-1">
                      Error Log
                    </div>
                    <pre className="p-2 rounded bg-neon-pink/10 border border-neon-pink/30 text-[11px] text-neon-pink overflow-x-auto max-h-48 overflow-y-auto">
                      {tc.error}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
