import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  RotateCw, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  Loader2,
  FileCode,
  Server,
  Lock,
  ShieldCheck
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

  // Static HTML State
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

        // Inline referenced local CSS and JS for previewing
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

  // Periodic poll to refresh preview when files change
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
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden shadow-2xl">
      {/* Browser Chrome Window Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-surface/80 border-b border-white/[0.06] text-xs select-none">
        {/* Left: Window Dots & Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/[0.06]">
            <button
              onClick={() => {
                setPreviewMode('static-html');
                loadStaticHtml();
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                isUsingStatic
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Preview HTML / Canvas / Game directly from project"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>HTML Live</span>
            </button>

            <button
              onClick={() => setPreviewMode('server')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                !isUsingStatic
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Connect to Dev Server (e.g. localhost:5173)"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Dev Server</span>
            </button>
          </div>
        </div>

        {/* Center: URL Pill Address Bar */}
        <div className="flex-1 max-w-md mx-2">
          {isUsingStatic ? (
            <div className="flex items-center bg-black/40 rounded-lg border border-white/[0.06] px-3 py-1 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mr-2 flex-shrink-0" />
              <span className="text-[10px] text-gray-400 font-mono mr-1.5 font-bold">LOCAL:</span>
              {availableHtmlFiles.length > 0 ? (
                <select
                  value={selectedHtmlFile}
                  onChange={(e) => setSelectedHtmlFile(e.target.value)}
                  className="bg-transparent text-[11px] text-gray-200 focus:outline-none flex-1 font-mono cursor-pointer"
                >
                  {availableHtmlFiles.map((file) => (
                    <option key={file} value={file} className="bg-[#11141d] text-white">
                      {file}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[11px] text-gray-500 font-mono truncate">
                  No HTML file in workspace
                </span>
              )}
            </div>
          ) : (
            <form onSubmit={handleUrlSubmit} className="flex items-center bg-black/40 rounded-lg border border-white/[0.06] px-3 py-1 focus-within:border-indigo-500/60 transition-all">
              <Lock className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="http://localhost:5173"
                className="flex-1 bg-transparent text-[11px] text-gray-200 focus:outline-none font-mono"
              />
              <button type="submit" className="text-[10px] text-gray-400 hover:text-white px-1 font-mono">
                GO
              </button>
            </form>
          )}
        </div>

        {/* Right: Viewport & Zoom Controls */}
        <div className="flex items-center gap-1.5">
          {/* Viewport Modes */}
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/[0.06]">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded-md transition-all ${
                viewport === 'desktop' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              title="Desktop (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded-md transition-all ${
                viewport === 'tablet' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              title="Tablet (768x1024)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-md transition-all ${
                viewport === 'mobile' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
              title="Mobile (375x667)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 bg-black/40 rounded-lg px-2 py-0.5 border border-white/[0.06]">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 15))}
              className="text-gray-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono text-gray-300 min-w-[28px] text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(Math.min(150, zoom + 15))}
              className="text-gray-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg bg-black/40 hover:bg-white/5 text-gray-300 border border-white/[0.06] transition-transform active:rotate-180"
            title="Refresh"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {!isUsingStatic && (
            <button
              onClick={openInBrowser}
              className="p-1.5 rounded-lg bg-black/40 hover:bg-white/5 text-gray-300 border border-white/[0.06]"
              title="Open in Browser"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Preview Canvas Stage */}
      <div className="flex-1 bg-[#090b10] p-4 flex items-center justify-center overflow-auto relative">
        <div
          style={{
            width: dimensions.width,
            height: dimensions.height,
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'width 0.3s ease, height 0.3s ease, transform 0.2s ease',
          }}
          className={`relative bg-white rounded-xl shadow-2xl overflow-hidden ${
            viewport !== 'desktop' ? 'border border-white/10 ring-1 ring-black/50' : ''
          }`}
        >
          {isLoading && (
            <div className="absolute inset-0 bg-[#0a0c10]/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 space-y-2">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              <span className="text-xs text-gray-300 font-medium font-mono">Hot-Reloading Preview...</span>
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
              <div className="w-full h-full bg-[#0a0c10] flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-3">
                <FileCode className="w-12 h-12 text-cyan-400/30 stroke-1" />
                <div className="max-w-xs space-y-1">
                  <div className="text-xs font-bold text-white tracking-wide">Live Preview Ready</div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Ask the agent to build an HTML game, dashboard, or UI. It renders right here with live hot-reloading.
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
