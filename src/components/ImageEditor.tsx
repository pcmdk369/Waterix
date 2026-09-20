import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Paintbrush,
  Eraser,
  Square,
  Hexagon,
  Undo2,
  Redo2,
  Trash2,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  Check,
} from 'lucide-react';
import { EditorTool, ActiveJob } from '../types';

interface ImageEditorProps {
  job: ActiveJob;
  onRemove: (maskDataUrl: string) => void;
  onCancel: () => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  job,
  onRemove,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTool, setActiveTool] = useState<EditorTool>('brush');
  const [brushSize, setBrushSize] = useState<number>(26);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null);

  // Polygon tool points state
  const [polyPoints, setPolyPoints] = useState<{ x: number; y: number }[]>([]);

  // History for Undo / Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Zoom & View
  const [zoom, setZoom] = useState<number>(1);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [hasMarks, setHasMarks] = useState<boolean>(false);

  // Initialize canvas when image loads
  const handleImageLoad = () => {
    if (!imgRef.current || !canvasRef.current) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const initialSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialSnapshot]);
      setHistoryIndex(0);
      setHasMarks(false);
    }
    setImageLoaded(true);
  };

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => {
      const updated = prev.slice(0, historyIndex + 1);
      return [...updated, snapshot];
    });
    setHistoryIndex((prev) => prev + 1);
    setHasMarks(true);
  }, [historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const targetState = history[nextIndex];
      const canvas = canvasRef.current;
      if (canvas && targetState) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(targetState, 0, 0);
          setHistoryIndex(nextIndex);
          setHasMarks(nextIndex > 0);
        }
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const targetState = history[nextIndex];
      const canvas = canvasRef.current;
      if (canvas && targetState) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(targetState, 0, 0);
          setHistoryIndex(nextIndex);
          setHasMarks(true);
        }
      }
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      saveToHistory();
      setHasMarks(false);
      setPolyPoints([]);
    }
  };

  // Convert client (screen) coordinates to canvas coordinate space
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Finish polygon selection & fill area
  const completePolygon = () => {
    if (polyPoints.length < 3) {
      setPolyPoints([]);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Restore previous canvas state before preview line drawing
    if (historyIndex >= 0 && history[historyIndex]) {
      ctx.putImageData(history[historyIndex], 0, 0);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
    for (let i = 1; i < polyPoints.length; i++) {
      ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.70)';
    ctx.fill();

    saveToHistory();
    setPolyPoints([]);
  };

  // Start drawing or add polygon point
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const coords = getCanvasCoords(e);

    if (activeTool === 'polygon') {
      const nextPoints = [...polyPoints, coords];
      setPolyPoints(nextPoints);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Redraw preview
        if (historyIndex >= 0 && history[historyIndex]) {
          ctx.putImageData(history[historyIndex], 0, 0);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.moveTo(nextPoints[0].x, nextPoints[0].y);
        for (let i = 1; i < nextPoints.length; i++) {
          ctx.lineTo(nextPoints[i].x, nextPoints[i].y);
        }
        ctx.stroke();

        // Draw points
        for (const pt of nextPoints) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      }
      return;
    }

    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'rectangle') {
      setRectStart(coords);
    } else {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;

      if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
      }

      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  // Continue drawing
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool === 'polygon') return;
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const coords = getCanvasCoords(e);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'rectangle' && rectStart) {
      if (historyIndex >= 0 && history[historyIndex]) {
        ctx.putImageData(history[historyIndex], 0, 0);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.65)';
      const width = coords.x - rectStart.x;
      const height = coords.y - rectStart.y;
      ctx.fillRect(rectStart.x, rectStart.y, width, height);
    } else if (activeTool === 'brush' || activeTool === 'eraser') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  // End drawing
  const endDrawing = () => {
    if (activeTool === 'polygon') return;
    if (!isDrawing) return;
    setIsDrawing(false);
    setRectStart(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.closePath();
      }
    }
    saveToHistory();
  };

  const handleRemoveClick = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maskDataUrl = canvas.toDataURL('image/png');
    onRemove(maskDataUrl);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Top Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 sm:p-3 mb-3 flex flex-wrap items-center justify-between gap-2 shadow-lg">
        {/* Tool selection buttons */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            id="tool-brush-btn"
            onClick={() => {
              if (polyPoints.length > 0) completePolygon();
              setActiveTool('brush');
            }}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[44px] ${
              activeTool === 'brush'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Paintbrush className="w-4 h-4" />
            <span>Brush</span>
          </button>

          <button
            id="tool-eraser-btn"
            onClick={() => {
              if (polyPoints.length > 0) completePolygon();
              setActiveTool('eraser');
            }}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[44px] ${
              activeTool === 'eraser'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Eraser className="w-4 h-4" />
            <span>Eraser</span>
          </button>

          <button
            id="tool-rectangle-btn"
            onClick={() => {
              if (polyPoints.length > 0) completePolygon();
              setActiveTool('rectangle');
            }}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[44px] ${
              activeTool === 'rectangle'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Square className="w-4 h-4" />
            <span>Rectangle</span>
          </button>

          <button
            id="tool-polygon-btn"
            onClick={() => setActiveTool('polygon')}
            className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[44px] ${
              activeTool === 'polygon'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Hexagon className="w-4 h-4" />
            <span>Polygon</span>
          </button>

          {activeTool === 'polygon' && polyPoints.length >= 3 && (
            <button
              onClick={completePolygon}
              className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer min-h-[44px]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Close Shape</span>
            </button>
          )}

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Brush Size Slider */}
          {activeTool !== 'rectangle' && activeTool !== 'polygon' && (
            <div className="hidden md:flex items-center space-x-2 px-2 py-1 bg-slate-800/60 rounded-xl border border-slate-700/50">
              <span className="text-xs text-slate-400 font-medium">Size</span>
              <input
                type="range"
                min="6"
                max="80"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-20 sm:w-24 accent-cyan-500 cursor-pointer"
              />
              <span className="text-xs font-mono text-cyan-400 w-6">{brushSize}</span>
            </div>
          )}
        </div>

        {/* Edit Operations (Undo, Redo, Clear) */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            id="tool-undo-btn"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            id="tool-redo-btn"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            id="tool-clear-btn"
            onClick={handleClear}
            disabled={!hasMarks && polyPoints.length === 0}
            className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-red-950/40 hover:text-red-400 hover:border-red-800/60 border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-h-[44px] cursor-pointer"
            title="Clear all markings"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs hidden sm:inline font-medium">Clear</span>
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Zoom controls */}
          <div className="flex items-center space-x-1 bg-slate-800/60 rounded-xl p-1 border border-slate-700/50">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 px-1">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Main Action Button */}
          <button
            id="image-remove-action-btn"
            onClick={handleRemoveClick}
            disabled={!hasMarks}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all min-h-[44px] cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI RESTORE</span>
          </button>
        </div>
      </div>

      {/* Main Canvas / Media Preview Area */}
      <div
        ref={containerRef}
        className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl overflow-auto relative flex items-center justify-center p-4 select-none touch-none"
      >
        <div
          className="relative inline-block shadow-2xl transition-transform duration-100"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          {/* Base Image */}
          <img
            ref={imgRef}
            src={job.originalUrl}
            alt="Original Preview"
            onLoad={handleImageLoad}
            className="max-h-[68vh] max-w-full block rounded-lg pointer-events-none object-contain"
          />

          {/* Mask Drawing Canvas */}
          <canvas
            id="mask-drawing-canvas"
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
            className="absolute inset-0 w-full h-full cursor-crosshair rounded-lg"
          />
        </div>

        {/* Guidance badge */}
        {!hasMarks && imageLoaded && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-full px-4 py-2 text-xs text-slate-300 flex items-center space-x-2 shadow-xl pointer-events-none">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {activeTool === 'polygon'
                ? 'Click points around the watermark, then click "Close Shape".'
                : 'Paint or draw a box over the watermark, then click AI RESTORE.'}
            </span>
          </div>
        )}
      </div>

      {/* Mobile Brush Size Control Bar */}
      {activeTool !== 'rectangle' && activeTool !== 'polygon' && (
        <div className="md:hidden flex items-center justify-between mt-2 px-3 py-2 bg-slate-900/80 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400">Brush: {brushSize}px</span>
          <input
            type="range"
            min="6"
            max="80"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-44 accent-cyan-500"
          />
          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
