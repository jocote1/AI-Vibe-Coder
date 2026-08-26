import React, { useState } from 'react';
import { BUILD_TARGETS, BuildTargetType, ExeBuilder } from '../../lib/builders/exe-builder';
import { BuildProgress } from '../../types/electron';
import { 
  X, 
  Archive, 
  Laptop, 
  Terminal, 
  Cpu, 
  Zap, 
  Coffee, 
  FolderCheck, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Download
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectDir: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  projectDir,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<BuildTargetType>('zip');
  const [isBuilding, setIsBuilding] = useState(false);
  const [progressState, setProgressState] = useState<BuildProgress | null>(null);

  if (!isOpen) return null;

  const getTargetIcon = (iconName: string) => {
    switch (iconName) {
      case 'Archive':
        return <Archive className="w-5 h-5 text-neon-cyan" />;
      case 'Laptop':
        return <Laptop className="w-5 h-5 text-primary" />;
      case 'Terminal':
        return <Terminal className="w-5 h-5 text-neon-amber" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5 text-neon-purple" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-neon-green" />;
      case 'Coffee':
        return <Coffee className="w-5 h-5 text-amber-500" />;
      default:
        return <Download className="w-5 h-5 text-neon-cyan" />;
    }
  };

  const handleStartBuild = async () => {
    setIsBuilding(true);
    setProgressState({
      stage: 'Starting build sequence...',
      progress: 5,
    });

    try {
      const result = await ExeBuilder.runBuild(selectedTarget, projectDir, (p) => {
        setProgressState(p);
      });

      if (!result.success) {
        setProgressState({
          stage: 'Build Failed',
          progress: 100,
          done: true,
          error: result.error || 'Unknown build error',
        });
      }
    } catch (err: any) {
      setProgressState({
        stage: 'Build Errored',
        progress: 100,
        done: true,
        error: err.message,
      });
    } finally {
      setIsBuilding(false);
    }
  };

  const handleRevealInFolder = () => {
    if (progressState?.outputPath && window.electronAPI) {
      window.electronAPI.showItemInFolder(progressState.outputPath);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
              <Download className="w-4 h-4 text-neon-cyan" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">ONE-CLICK BUILD & EXPORT STUDIO</h2>
              <p className="text-xs text-gray-400">Package standalone binaries and zero-config distributables</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Selection Cards */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BUILD_TARGETS.map((target) => {
              const isSelected = selectedTarget === target.id;

              return (
                <div
                  key={target.id}
                  onClick={() => !isBuilding && setSelectedTarget(target.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-glow-purple/20'
                      : 'bg-secondary/40 border-border/70 hover:border-border hover:bg-secondary/70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-background/80 border border-border/60">
                        {getTargetIcon(target.iconName)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{target.title}</div>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-secondary text-gray-300 border border-border font-mono">
                          {target.outputFormat}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                    {target.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-border/40 text-[10px] text-gray-500 font-mono">
                    Req: {target.requirements}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Build Status HUD */}
          {progressState && (
            <div className="mt-4 p-4 rounded-xl bg-background/90 border border-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-200 flex items-center gap-2">
                  {isBuilding ? (
                    <Loader2 className="w-4 h-4 text-neon-cyan animate-spin" />
                  ) : progressState.error ? (
                    <AlertCircle className="w-4 h-4 text-neon-pink" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-neon-green" />
                  )}
                  {progressState.stage}
                </span>
                <span className="font-mono text-gray-400 font-bold">{progressState.progress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden border border-border/50">
                <div
                  className={`h-full transition-all duration-300 ${
                    progressState.error
                      ? 'bg-neon-pink'
                      : 'bg-gradient-to-r from-neon-cyan via-primary to-neon-purple'
                  }`}
                  style={{ width: `${progressState.progress}%` }}
                />
              </div>

              {/* Build Log Chunk */}
              {progressState.log && (
                <pre className="p-2.5 rounded bg-card border border-border text-[11px] font-mono text-gray-300 max-h-28 overflow-y-auto overflow-x-auto whitespace-pre-wrap">
                  {progressState.log}
                </pre>
              )}

              {/* Output Path & Reveal Button */}
              {progressState.outputPath && (
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <span className="text-[11px] text-neon-green font-mono truncate max-w-[400px]">
                    📦 {progressState.outputPath}
                  </span>
                  <button
                    onClick={handleRevealInFolder}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-white text-xs font-semibold border border-border transition-all shadow-sm"
                  >
                    <FolderCheck className="w-3.5 h-3.5 text-neon-cyan" />
                    Reveal in Finder / Explorer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card/80">
          <div className="text-xs text-gray-400">
            Target Directory: <span className="font-mono text-gray-300">{projectDir || './'}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isBuilding}
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/70 text-gray-300 text-xs font-semibold transition-all border border-border disabled:opacity-50"
            >
              Close
            </button>
            <button
              onClick={handleStartBuild}
              disabled={isBuilding}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-glow-purple disabled:opacity-50 cursor-pointer"
            >
              {isBuilding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Building...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Build & Export Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
