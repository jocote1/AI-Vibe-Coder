import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  RotateCw, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  Globe, 
  Loader2,
  FileCode,
  Server
} from 'lucide-react';

interface LivePreviewProps {
  initialUrl?: string;
  projectDir?: string;
}

type ViewportMode = 'desktop' | 'tablet' | 'mobile';
type PreviewMode = 'auto' | 'static-html' | 'server';

export const LivePreview: React.FC<LivePreviewProps> = ({
  initialUrl = 'http://localhost:5173',
  projectDir = '',
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('auto');
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [key, setKey] = useState(0);

  // Static HTML Rendering State
  const [staticHtmlContent, setStaticHtmlContent] = useState<string>('');
  const [availableHtmlFiles, setAvailableHtmlFiles] = useState<string[]>([]);
  const [selectedHtmlFile, setSelectedHtmlFile] = useState<string>('index.html');
  const [hasStaticHtml, setHasStaticHtml] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Scan workspace for HTML files and load static content
  const loadStaticHtml = useCallback(async () => {
    if (!projectDir || !window.electronAPI) return;

    try {
      setIsLoading(true);
      const tree = await window.electronAPI.readDirectoryTree(projectDir, 3);
      const htmlFiles: string[] = [];

      const findHtmls = (nodes: any[]) => {
        for (const n of nodes) {
          if (n.isDirectory && n.children) {
            findHtmls(n.children);
          } else if (n.name.endsWith('.html')) {
            htmlFiles.push(n.relativePath || n.name);
          }
        }
      };
      findHtmls(tree);
      setAvailableHtmlFiles(htmlFiles);

      if (htmlFiles.length > 0) {
        setHasStaticHtml(true);
        const targetFile = htmlFiles.includes(selectedHtmlFile) ? selectedHtmlFile : htmlFiles[0];
        setSelectedHtmlFile(targetFile);

        const fullPath = `${projectDir.replace(/[/\\]+$/, '')}/${targetFile}`;
        let rawHtml = await window.electronAPI.readFile(fullPath);

        // Inline referenced local CSS and JS for seamless previewing
        const cssMatches = rawHtml.matchAll(/<link\s+[^>]*href=["']([^"']+\.css)["'][^>]*>/gi);
        for (const match of cssMatches) {
          const cssRel = match[1].replace(/^\.?\//, '');
          const cssPath = `${projectDir.replace(/[/\\]+$/, '')}/${cssRel}`;
          try {
            const cssContent = await window.electronAPI.readFile(cssPath);
            rawHtml = rawHtml.replace(match[0], `<style>\n${cssContent}\n</style>`);
          } catch {}
        }

        const jsMatches = rawHtml.matchAll(/<script\s+[^>]*src=["']([^"']+\.js)["'][^>]*><\/script>/gi);
        for (const match of jsMatches) {
          const jsRel = match[1].replace(/^\.?\//, '');
          const jsPath = `${projectDir.replace(/[/\\]+$/, '')}/${jsRel}`;
          try {
            const jsContent = await window.electronAPI.readFile(jsPath);
            rawHtml = rawHtml.replace(match[0], `<script>\n${jsContent}\n</script>`);
          } catch {}
        }

        setStaticHtmlContent(rawHtml);
      } else {
        setHasStaticHtml(false);
      }
    } catch (e) {
      console.warn('Failed to scan or load static HTML:', e);
    } finally {
      setIsLoading(false);
    }
  }, [projectDir, selectedHtmlFile]);

  useEffect(() => {
    loadStaticHtml();
  }, [loadStaticHtml]);

  // Periodic poll to refresh preview when files are modified by the agent
  useEffect(() => {
    const interval = setInterval(() => {
      if (projectDir) {
        loadStaticHtml();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [projectDir, loadStaticHtml]);

  const handleRefresh = () => {
    setIsLoading(true);
    setKey((prev) => prev + 1);
    loadStaticHtml();
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputUrl.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `http://${target}`;
    }
    setUrl(target);
    setInputUrl(target);
    setPreviewMode('server');
    handleRefresh();
  };

  const openInBrowser = () => {
    if (window.electronAPI) {
      window.electronAPI.openExternalUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const getViewportDimensions = () => {
    switch (viewport) {
      case 'mobile':
        return { width: '375px', height: '667px' };
      case 'tablet':
        return { width: '768px', height: '1024px' };
      case 'desktop':
      default:
        return { width: '100%', height: '100%' };
    }
  };

  const isUsingStatic = (previewMode === 'auto' && hasStaticHtml) || previewMode === 'static-html';
  const dimensions = getViewportDimensions();

  return (
    <div className="flex flex-col h-full bg-card/40 backdrop-blur-md rounded-2xl border border-border overflow-hidden">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-card/70 border-b border-border text-xs">
        {/* Mode Selector & Address Bar */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[280px]">
          {/* Mode Switcher */}
          <div className="flex items-center bg-secondary/80 rounded-lg p-0.5 border border-border/60">
            <button
              onClick={() => {
                setPreviewMode('static-html');
                loadStaticHtml();
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                isUsingStatic
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Preview Static HTML / Canvas / Game directly from project"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>HTML / App</span>
            </button>

            <button
              onClick={() => setPreviewMode('server')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                !isUsingStatic
                  ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Connect to Dev Server (e.g. localhost:5173)"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Dev Server</span>
            </button>
          </div>

          {isUsingStatic ? (
            /* HTML File Selector */
            <div className="flex items-center flex-1 bg-background/90 rounded-lg border border-border/80 px-2.5 py-1">
              <span className="text-[10px] text-neon-cyan font-mono mr-1.5 font-bold">FILE:</span>
              {availableHtmlFiles.length > 0 ? (
                <select
                  value={selectedHtmlFile}
                  onChange={(e) => setSelectedHtmlFile(e.target.value)}
                  className="bg-transparent text-[11px] text-gray-200 focus:outline-none flex-1 font-mono cursor-pointer"
                >
                  {availableHtmlFiles.map((file) => (
                    <option key={file} value={file} className="bg-card text-white">
                      {file}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[11px] text-gray-400 font-mono truncate">
                  No .html file found in workspace
                </span>
              )}
            </div>
          ) : (
            /* Server URL Bar */
            <form onSubmit={handleUrlSubmit} className="flex items-center flex-1 bg-background/90 rounded-lg border border-border/80 px-2.5 py-1 focus-within:border-primary/60 transition-all">
              <Globe className="w-3.5 h-3.5 text-primary mr-1.5 flex-shrink-0" />
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="http://localhost:5173"
                className="flex-1 bg-transparent text-[11px] text-gray-200 focus:outline-none"
              />
              <button type="submit" className="text-[10px] text-gray-400 hover:text-white px-1 font-mono">
                GO
              </button>
            </form>
          )}
        </div>

        {/* Viewport & Actions */}
        <div className="flex items-center gap-1.5">
          {/* Viewport Toggles */}
          <div className="flex items-center bg-secondary/80 rounded-lg p-0.5 border border-border/60">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded-md transition-all ${
                viewport === 'desktop' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              title="Desktop View (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded-md transition-all ${
                viewport === 'tablet' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              title="Tablet View (768x1024)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-md transition-all ${
                viewport === 'mobile' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              title="Mobile View (375x667)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 15))}
              className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-gray-300 border border-border"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-gray-400 min-w-[28px] text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(Math.min(150, zoom + 15))}
              className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-gray-300 border border-border"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-gray-300 border border-border transition-transform active:rotate-180"
            title="Refresh Preview"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-neon-cyan' : ''}`} />
          </button>

          {!isUsingStatic && (
            <button
              onClick={openInBrowser}
              className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-gray-300 border border-border"
              title="Open in Browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Preview Stage / Frame */}
      <div className="flex-1 bg-background/95 p-4 flex items-center justify-center overflow-auto relative">
        <div
          style={{
            width: dimensions.width,
            height: dimensions.height,
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'width 0.3s ease, height 0.3s ease, transform 0.2s ease',
          }}
          className={`relative bg-white rounded-xl shadow-2xl overflow-hidden border ${
            viewport !== 'desktop' ? 'border-border shadow-glow-purple/20' : 'border-transparent'
          }`}
        >
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 space-y-2">
              <Loader2 className="w-6 h-6 text-neon-cyan animate-spin" />
              <span className="text-xs text-gray-300 font-medium">Hot-Reloading Preview...</span>
            </div>
          )}

          {isUsingStatic ? (
            staticHtmlContent ? (
              <iframe
                key={`static-${key}`}
                ref={iframeRef}
                srcDoc={staticHtmlContent}
                title="Vibe App Static HTML Preview"
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            ) : (
              <div className="w-full h-full bg-[#090a0f] flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-3">
                <FileCode className="w-12 h-12 text-neon-cyan/40 stroke-1" />
                <div className="max-w-xs space-y-1">
                  <div className="text-xs font-bold text-white">Live HTML & App Preview Ready</div>
                  <p className="text-[11px] text-gray-500">
                    Ask the agent to build an HTML game, dashboard, or UI. It will appear right here in real-time.
                  </p>
                </div>
              </div>
            )
          ) : (
            <iframe
              key={`server-${key}`}
              ref={iframeRef}
              src={url}
              title="Vibe App Dev Server Preview"
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          )}
        </div>
      </div>
    </div>
  );
};
