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
  Flame,
  FilePlus2
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

  const getToolMeta = (tc: ToolCall) => {
    switch (tc.name) {
      case 'read_directory_tree':
        return {
          icon: <FolderTree className="w-3.5 h-3.5 text-cyan-400" />,
          title: `Scanned directory structure (${tc.parameters?.path || 'workspace root'})`,
          badge: 'Tree Scan',
        };
      case 'read_file':
        return {
          icon: <FileCode className="w-3.5 h-3.5 text-purple-400" />,
          title: `Read ${tc.parameters?.path || 'source file'}`,
          badge: 'Read',
        };
      case 'write_file':
        return {
          icon: <FilePlus2 className="w-3.5 h-3.5 text-emerald-400" />,
          title: `Wrote ${tc.parameters?.path || 'file'}`,
          badge: 'Write',
        };
      case 'apply_patch_diff':
        return {
          icon: <GitCommit className="w-3.5 h-3.5 text-amber-400" />,
          title: `Patched ${tc.parameters?.path || 'file'}`,
          badge: 'Patch',
        };
      case 'execute_terminal_command':
        return {
          icon: <Terminal className="w-3.5 h-3.5 text-blue-400" />,
          title: `$ ${tc.parameters?.command || 'command'}`,
          badge: 'Command',
        };
      case 'auto_heal_error':
        return {
          icon: <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />,
          title: `Auto-Healed error diagnostics`,
          badge: 'Self-Heal',
        };
      default:
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-indigo-400" />,
          title: `Invoked ${tc.name}`,
          badge: 'Tool',
        };
    }
  };

  return (
    <div className="space-y-2 my-2.5">
      {toolCalls.map((tc) => {
        const isExpanded = expandedId === tc.id;
        const meta = getToolMeta(tc);

        return (
          <div
            key={tc.id}
            className={`rounded-xl border transition-all text-xs overflow-hidden backdrop-blur-md ${
              tc.status === 'running'
                ? 'border-indigo-500/40 bg-indigo-500/[0.04]'
                : tc.status === 'failed'
                ? 'border-rose-500/40 bg-rose-500/[0.04]'
                : 'border-white/[0.07] bg-black/20 hover:border-white/[0.12]'
            }`}
          >
            {/* Header Item */}
            <div
              onClick={() => toggleExpand(tc.id)}
              className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-md bg-white/[0.04] border border-white/[0.06]">
                  {meta.icon}
                </div>
                <span className="font-medium text-gray-200 truncate font-mono text-[11px]">
                  {meta.title}
                </span>
              </div>

              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                {tc.status === 'running' && (
                  <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-medium font-mono">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Running
                  </span>
                )}
                {tc.status === 'completed' && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium font-mono">
                    <CheckCircle2 className="w-3 h-3" />
                    Done
                  </span>
                )}
                {tc.status === 'failed' && (
                  <span className="flex items-center gap-1 text-[10px] text-rose-400 font-medium font-mono">
                    <AlertTriangle className="w-3 h-3" />
                    Failed
                  </span>
                )}
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                )}
              </div>
            </div>

            {/* Expanded Accordion Body */}
            {isExpanded && (
              <div className="px-3 pb-3 pt-1 border-t border-white/[0.06] bg-black/30 space-y-2 font-mono text-[11px]">
                {/* Parameters */}
                <div>
                  <div className="text-[9px] text-gray-500 uppercase tracking-wider font-sans mb-1">
                    Parameters
                  </div>
                  <pre className="p-2 rounded-lg bg-black/50 border border-white/[0.05] text-gray-300 overflow-x-auto whitespace-pre">
                    {JSON.stringify(tc.parameters, null, 2)}
                  </pre>
                </div>

                {/* Diff Viewer for apply_patch_diff */}
                {tc.name === 'apply_patch_diff' && (
                  <div className="space-y-1">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider font-sans">
                      Patch Diff
                    </div>
                    <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-900/40 text-rose-300 overflow-x-auto">
                      <div className="text-[9px] text-rose-400 font-sans font-bold mb-0.5">- Search Chunk</div>
                      <pre className="whitespace-pre-wrap">{tc.parameters.search_chunk}</pre>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-emerald-300 overflow-x-auto">
                      <div className="text-[9px] text-emerald-400 font-sans font-bold mb-0.5">+ Replace Chunk</div>
                      <pre className="whitespace-pre-wrap">{tc.parameters.replace_chunk}</pre>
                    </div>
                  </div>
                )}

                {/* Auto Heal Error Explanation */}
                {tc.name === 'auto_heal_error' && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1 font-sans">
                    <div className="text-rose-400 font-bold text-xs flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" />
                      Self-Healing Diagnosis Applied
                    </div>
                    <p className="text-gray-300 text-xs">{tc.parameters.suggested_fix}</p>
                  </div>
                )}

                {/* Results / Outputs */}
                {tc.result && (
                  <div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider font-sans mb-1">
                      Result
                    </div>
                    <pre className="p-2 rounded-lg bg-black/50 border border-white/[0.05] text-emerald-400 overflow-x-auto max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2)}
                    </pre>
                  </div>
                )}

                {tc.error && (
                  <div>
                    <div className="text-[9px] text-rose-400 uppercase tracking-wider font-sans mb-1">
                      Error Output
                    </div>
                    <pre className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 overflow-x-auto max-h-36 overflow-y-auto">
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
