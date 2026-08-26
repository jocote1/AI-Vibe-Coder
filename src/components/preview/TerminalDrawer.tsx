import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { 
  Terminal as TerminalIcon, 
  Trash2, 
  RotateCcw, 
  ChevronUp, 
  ChevronDown, 
  Activity,
  Server
} from 'lucide-react';

interface TerminalDrawerProps {
  projectDir: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

type TabType = 'shell' | 'agent-log' | 'dev-server';

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({
  projectDir,
  isExpanded,
  onToggleExpand,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('shell');
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionId = 'vibe_studio_term_main';

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerm({
      theme: {
        background: '#090a0f',
        foreground: '#f3f4f6',
        cursor: '#22d3ee',
        selectionBackground: 'rgba(99, 102, 241, 0.4)',
        black: '#10131c',
        red: '#f43f5e',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#6366f1',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#ffffff',
      },
      fontFamily: 'Fira Code, JetBrains Mono, Menlo, monospace',
      fontSize: 12,
      lineHeight: 1.3,
      cursorBlink: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstance.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[1;36m✨ VIBE-STUDIO TERMINAL READY\x1b[0m');
    term.writeln(`\x1b[90mDirectory: ${projectDir || 'Workspace'}\x1b[0m\r\n`);

    // Setup Electron PTY session
    if (window.electronAPI) {
      window.electronAPI.createTerminalSession(sessionId, projectDir);

      const unregisterData = window.electronAPI.onTerminalData(({ id, data }) => {
        if (id === sessionId) {
          term.write(data);
        }
      });

      const unregisterExit = window.electronAPI.onTerminalExit(({ id, code }) => {
        if (id === sessionId) {
          term.writeln(`\r\n\x1b[90m[Process exited with code ${code}]\x1b[0m\r\n`);
        }
      });

      term.onData((input) => {
        window.electronAPI?.writeTerminal(sessionId, input);
      });

      const unregisterAgentChunk = window.electronAPI.onAgentCommandChunk(({ chunk }) => {
        if (activeTab === 'agent-log') {
          term.write(chunk.replace(/\n/g, '\r\n'));
        }
      });

      return () => {
        unregisterData();
        unregisterExit();
        unregisterAgentChunk();
        term.dispose();
      };
    } else {
      term.writeln('\x1b[33m[Running in web preview mode - simulated terminal]\x1b[0m\r\n$ ');
      term.onData((data) => {
        term.write(data);
      });
      return () => {
        term.dispose();
      };
    }
  }, [projectDir]);

  // Handle window resizing & drawer expand
  useEffect(() => {
    const handleResize = () => {
      fitAddonRef.current?.fit();
    };
    window.addEventListener('resize', handleResize);
    const timeout = setTimeout(handleResize, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [isExpanded, activeTab]);

  const handleClear = () => {
    xtermInstance.current?.clear();
  };

  const handleRestartSession = () => {
    if (window.electronAPI) {
      window.electronAPI.killTerminalSession(sessionId);
      window.electronAPI.createTerminalSession(sessionId, projectDir);
      xtermInstance.current?.clear();
      xtermInstance.current?.writeln('\x1b[1;36m✨ Session restarted.\x1b[0m\r\n');
    }
  };

  return (
    <div
      className={`flex flex-col bg-card border-t border-border transition-all duration-300 ${
        isExpanded ? 'h-64' : 'h-10'
      }`}
    >
      {/* Terminal Tab Bar */}
      <div className="flex items-center justify-between px-3 h-10 bg-card border-b border-border/80 text-xs select-none">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('shell')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all ${
              activeTab === 'shell'
                ? 'bg-secondary text-neon-cyan font-bold border border-border/60'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>Interactive Shell</span>
          </button>

          <button
            onClick={() => setActiveTab('agent-log')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all ${
              activeTab === 'agent-log'
                ? 'bg-secondary text-neon-purple font-bold border border-border/60'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Agent Tool Stream</span>
          </button>

          <button
            onClick={() => setActiveTab('dev-server')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all ${
              activeTab === 'dev-server'
                ? 'bg-secondary text-neon-green font-bold border border-border/60'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Dev Server Output</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClear}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-secondary transition-all"
            title="Clear Terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleRestartSession}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-secondary transition-all"
            title="Restart Shell Session"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleExpand}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-secondary transition-all ml-1"
            title={isExpanded ? 'Collapse Terminal' : 'Expand Terminal'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div className={`flex-1 p-2 bg-background overflow-hidden ${!isExpanded && 'hidden'}`}>
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
};
