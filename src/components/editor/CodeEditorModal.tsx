import React, { useState, useEffect } from 'react';
import { FileNode } from '../../types/electron';
import { 
  X, 
  Folder, 
  FileCode, 
  Save, 
  RotateCw, 
  Check, 
  Loader2 
} from 'lucide-react';

interface CodeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectDir: string;
}

export const CodeEditorModal: React.FC<CodeEditorModalProps> = ({
  isOpen,
  onClose,
  projectDir,
}) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadTree = async () => {
    if (!projectDir || !window.electronAPI) return;
    setIsLoadingTree(true);
    try {
      const tree = await window.electronAPI.readDirectoryTree(projectDir, 5);
      setFileTree(tree);
    } catch (e) {
      console.error('Failed to load file tree:', e);
    } finally {
      setIsLoadingTree(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTree();
    }
  }, [isOpen, projectDir]);

  const handleSelectFile = async (node: FileNode) => {
    if (node.isDirectory) return;
    setSelectedFilePath(node.path);
    try {
      if (window.electronAPI) {
        const content = await window.electronAPI.readFile(node.path);
        setFileContent(content);
        setOriginalContent(content);
      }
    } catch (e) {
      console.error('Failed to read file:', e);
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFilePath || !window.electronAPI) return;
    setIsSaving(true);
    try {
      const res = await window.electronAPI.writeFile(selectedFilePath, fileContent);
      if (res.success) {
        setOriginalContent(fileContent);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (e) {
      console.error('Failed to save file:', e);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const renderNode = (node: FileNode, level = 0) => {
    const isSelected = selectedFilePath === node.path;

    if (node.isDirectory) {
      return (
        <div key={node.path} style={{ paddingLeft: `${level * 12}px` }}>
          <div className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-secondary/60 text-gray-300 text-xs cursor-pointer select-none font-medium">
            <Folder className="w-3.5 h-3.5 text-neon-cyan" />
            <span className="truncate">{node.name}</span>
          </div>
          {node.children && (
            <div>{node.children.map((child: FileNode) => renderNode(child, level + 1))}</div>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.path}
        style={{ paddingLeft: `${level * 12}px` }}
        onClick={() => handleSelectFile(node)}
        className={`flex items-center gap-1.5 py-1 px-1.5 rounded text-xs cursor-pointer transition-colors ${
          isSelected
            ? 'bg-primary/20 text-white font-semibold border-l-2 border-primary'
            : 'text-gray-400 hover:text-gray-200 hover:bg-secondary/40'
        }`}
      >
        <FileCode className="w-3.5 h-3.5 text-gray-400" />
        <span className="truncate">{node.name}</span>
      </div>
    );
  };

  const isModified = fileContent !== originalContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl">
      <div className="w-full max-w-5xl h-[85vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center">
              <FileCode className="w-4 h-4 text-neon-purple" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">WORKSPACE FILE EXPLORER & EDITOR</h2>
              <p className="text-xs text-gray-400 font-mono truncate max-w-md">{projectDir}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedFilePath && (
              <button
                onClick={handleSaveFile}
                disabled={isSaving || !isModified}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                  isModified
                    ? 'bg-neon-green text-black hover:bg-neon-green/90'
                    : 'bg-secondary text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : savedSuccess ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {savedSuccess ? 'Saved!' : 'Save (Cmd+S)'}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Split View */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Tree Sidebar */}
          <div className="w-64 border-r border-border bg-background/50 flex flex-col">
            <div className="flex items-center justify-between p-2.5 border-b border-border/80 text-xs">
              <span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px]">
                Project Files
              </span>
              <button
                onClick={loadTree}
                className="p-1 rounded hover:bg-secondary text-gray-400 hover:text-white"
                title="Refresh Tree"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoadingTree ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono">
              {fileTree.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">
                  {isLoadingTree ? 'Scanning directory...' : 'No files found.'}
                </div>
              ) : (
                fileTree.map((node: FileNode) => renderNode(node))
              )}
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex flex-col bg-background/90">
            {selectedFilePath ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/80 bg-card/40 text-xs font-mono">
                  <span className="text-gray-300 truncate font-semibold">
                    {selectedFilePath.split('/').pop()}
                  </span>
                  {isModified && (
                    <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.2 rounded bg-amber-400/10 border border-amber-400/20">
                      UNSAVED CHANGES
                    </span>
                  )}
                </div>

                <div className="flex-1 p-3 overflow-hidden">
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="w-full h-full bg-transparent text-gray-200 text-xs font-mono leading-relaxed focus:outline-none resize-none"
                    spellCheck={false}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500 space-y-2">
                <FileCode className="w-10 h-10 stroke-1" />
                <p className="text-xs">Select a file from the explorer on the left to view or edit code.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
