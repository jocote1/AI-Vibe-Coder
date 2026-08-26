import React, { useState } from 'react';
import { 
  X, 
  FolderPlus, 
  FolderOpen, 
  FileCode, 
  Layers, 
  Terminal, 
  ArrowRight,
  Check
} from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (folderPath: string, templateId: string, projectName: string) => void;
  defaultBaseDir: string;
}

interface TemplateOption {
  id: string;
  name: string;
  badge: string;
  icon: any;
  description: string;
  starterPrompt: string;
}

export const TEMPLATES: TemplateOption[] = [
  {
    id: 'vanilla-html',
    name: 'HTML5 / CSS / JS App & Game',
    badge: 'Instant Live Preview',
    icon: FileCode,
    description: 'Zero-config standalone web app or canvas game with real-time live preview.',
    starterPrompt: 'Build a complete, beautifully designed interactive HTML5, CSS3, and JavaScript app with sound, animations, and modern UI.',
  },
  {
    id: 'react-tailwind',
    name: 'React + Vite + Tailwind CSS',
    badge: 'Modern Web',
    icon: Layers,
    description: 'Component-driven reactive frontend with Tailwind CSS styling and hot-reload.',
    starterPrompt: 'Build a production-ready React application using Tailwind CSS, interactive components, and dark mode.',
  },
  {
    id: 'python-app',
    name: 'Python FastAPI / CLI App',
    badge: 'Backend / Script',
    icon: Terminal,
    description: 'Python REST API, backend data service, or terminal tool with auto-healing execution.',
    starterPrompt: 'Create a Python application with clean modular structure and automated tests.',
  },
  {
    id: 'blank',
    name: 'Blank Project',
    badge: 'Custom',
    icon: FolderPlus,
    description: 'Empty workspace directory. Prompt the agent to build anything from scratch.',
    starterPrompt: '',
  },
];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  defaultBaseDir,
}) => {
  const [projectName, setProjectName] = useState('my-vibe-app');
  const [selectedTemplate, setSelectedTemplate] = useState('vanilla-html');
  const [customPath, setCustomPath] = useState('');

  if (!isOpen) return null;

  const handleBrowseFolder = async () => {
    if (window.electronAPI) {
      const selected = await window.electronAPI.openDirectory();
      if (selected) {
        setCustomPath(selected);
      }
    }
  };

  const handleCreate = () => {
    const cleanName = projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'my-vibe-app';
    const targetDir = customPath || `${defaultBaseDir.replace(/[/\\]+$/, '')}/${cleanName}`;
    onCreateProject(targetDir, selectedTemplate, cleanName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-neon-cyan p-0.5 shadow-glow-cyan/50">
              <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center">
                <FolderPlus className="w-4 h-4 text-neon-cyan" />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">START NEW PROJECT</h2>
              <p className="text-xs text-gray-400">Choose a project directory and starting template</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Project Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-200">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. tic-tac-toe-game, crypto-dashboard, pomodoro-timer"
              className="w-full bg-background/90 text-xs text-white rounded-xl border border-border px-3.5 py-2.5 focus:outline-none focus:border-primary font-mono shadow-inner"
            />
          </div>

          {/* Project Location */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-200">Project Location</label>
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="text-[11px] text-neon-cyan hover:underline flex items-center gap-1"
              >
                <FolderOpen className="w-3 h-3" />
                Browse Directory
              </button>
            </div>

            <div className="flex items-center gap-2 bg-background/90 rounded-xl border border-border px-3.5 py-2 text-xs font-mono text-gray-300">
              <span className="truncate flex-1">
                {customPath || `${defaultBaseDir}/${projectName.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'my-vibe-app'}`}
              </span>
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-200">Starter Template</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                const IconComponent = tmpl.icon;

                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-glow-purple/20'
                        : 'bg-secondary/40 border-border/70 hover:border-border hover:bg-secondary/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-background border border-border/60">
                          <IconComponent className="w-4 h-4 text-neon-cyan" />
                        </div>
                        <div className="text-xs font-bold text-white">{tmpl.name}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-neon-cyan" />}
                    </div>

                    <p className="text-[11px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                      {tmpl.description}
                    </p>

                    <div className="mt-2 text-[10px] text-neon-purple font-mono font-medium">
                      {tmpl.badge}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/70 text-gray-300 text-xs font-semibold transition-all border border-border"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-glow-purple cursor-pointer"
          >
            <span>Create & Launch Project</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
