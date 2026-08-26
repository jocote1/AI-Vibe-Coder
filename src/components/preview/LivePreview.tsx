import React, { useState, useRef, useEffect } from 'react';
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  RotateCw, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  Globe, 
  Loader2
} from 'lucide-react';

interface LivePreviewProps {
  initialUrl?: string;
  projectDir?: string;
}

type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export const LivePreview: React.FC<LivePreviewProps> = ({
  initialUrl = 'http://localhost:5173',
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [key, setKey] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setUrl(initialUrl);
    setInputUrl(initialUrl);
  }, [initialUrl]);

  const handleRefresh = () => {
    setIsLoading(true);
    setKey((prev) => prev + 1);
    setTimeout(() => setIsLoading(false), 600);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputUrl.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `http://${target}`;
    }
    setUrl(target);
    setInputUrl(target);
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

  const dimensions = getViewportDimensions();

  return (
    <div className="flex flex-col h-full bg-card/40 backdrop-blur-md rounded-2xl border border-border overflow-hidden">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-card/70 border-b border-border text-xs">
        {/* URL Bar */}
        <form onSubmit={handleUrlSubmit} className="flex items-center flex-1 min-w-[200px] max-w-md bg-background/90 rounded-lg border border-border/80 px-2.5 py-1 focus-within:border-primary/60 transition-all">
          <Globe className="w-3.5 h-3.5 text-neon-cyan mr-1.5 flex-shrink-0" />
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

        {/* Zoom & Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom(Math.max(50, zoom - 15))}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-gray-300 border border-border"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-gray-400 min-w-[32px] text-center">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom(Math.min(150, zoom + 15))}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-gray-300 border border-border"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-gray-300 border border-border transition-transform active:rotate-180"
            title="Refresh Preview"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-neon-cyan' : ''}`} />
          </button>

          <button
            onClick={openInBrowser}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-gray-300 border border-border"
            title="Open in Native Browser"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview Stage / Frame */}
      <div className="flex-1 bg-background/90 p-4 flex items-center justify-center overflow-auto relative">
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
              <span className="text-xs text-gray-300 font-medium">Reloading Preview...</span>
            </div>
          )}

          <iframe
            key={key}
            ref={iframeRef}
            src={url}
            title="Vibe App Live Preview"
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>
      </div>
    </div>
  );
};
