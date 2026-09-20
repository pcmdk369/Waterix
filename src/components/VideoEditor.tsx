import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Info,
  Sliders,
  Move,
  Maximize,
} from 'lucide-react';
import { ActiveJob, BoundingBox } from '../types';

interface VideoEditorProps {
  job: ActiveJob;
  onRemove: (bbox: BoundingBox) => void;
  onCancel: () => void;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  job,
  onRemove,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(job.duration || 10);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({
    width: job.width || 1280,
    height: job.height || 720,
  });

  // Relative bounding box (percentages 0-100 for responsive UI)
  const [box, setBox] = useState<{ leftPct: number; topPct: number; widthPct: number; heightPct: number }>({
    leftPct: 75,
    topPct: 82,
    widthPct: 22,
    heightPct: 14,
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialBox, setInitialBox] = useState(box);

  // Sync video time
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || job.duration || 10);
      setVideoDimensions({
        width: videoRef.current.videoWidth || job.width || 1280,
        height: videoRef.current.videoHeight || job.height || 720,
      });
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Corner Presets
  const applyPreset = (preset: 'br' | 'bl' | 'tr' | 'tl' | 'center') => {
    if (preset === 'br') {
      setBox({ leftPct: 72, topPct: 82, widthPct: 25, heightPct: 15 });
    } else if (preset === 'bl') {
      setBox({ leftPct: 3, topPct: 82, widthPct: 25, heightPct: 15 });
    } else if (preset === 'tr') {
      setBox({ leftPct: 72, topPct: 4, widthPct: 25, heightPct: 15 });
    } else if (preset === 'tl') {
      setBox({ leftPct: 3, topPct: 4, widthPct: 25, heightPct: 15 });
    } else if (preset === 'center') {
      setBox({ leftPct: 35, topPct: 40, widthPct: 30, heightPct: 20 });
    }
  };

  // Handle Box Dragging & Resizing inside video preview container
  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setIsResizing(false);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
    setInitialBox(box);
  };

  const startResize = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setIsDragging(false);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
    setInitialBox(box);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging && !isResizing) return;
      if (!containerRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = containerRef.current.getBoundingClientRect();

      const dxPct = ((clientX - dragStart.x) / rect.width) * 100;
      const dyPct = ((clientY - dragStart.y) / rect.height) * 100;

      if (isDragging) {
        const nextLeft = Math.max(0, Math.min(100 - initialBox.widthPct, initialBox.leftPct + dxPct));
        const nextTop = Math.max(0, Math.min(100 - initialBox.heightPct, initialBox.topPct + dyPct));
        setBox((prev) => ({ ...prev, leftPct: nextLeft, topPct: nextTop }));
      } else if (isResizing) {
        const nextWidth = Math.max(5, Math.min(100 - initialBox.leftPct, initialBox.widthPct + dxPct));
        const nextHeight = Math.max(5, Math.min(100 - initialBox.topPct, initialBox.heightPct + dyPct));
        setBox((prev) => ({ ...prev, widthPct: nextWidth, heightPct: nextHeight }));
      }
    };

    const handleUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, isResizing, dragStart, initialBox]);

  // Submit bounding box to server
  const handleRemoveClick = () => {
    const videoW = videoDimensions.width || 1280;
    const videoH = videoDimensions.height || 720;

    const actualBbox: BoundingBox = {
      x: Math.round((box.leftPct / 100) * videoW),
      y: Math.round((box.topPct / 100) * videoH),
      width: Math.round((box.widthPct / 100) * videoW),
      height: Math.round((box.heightPct / 100) * videoH),
    };

    onRemove(actualBbox);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Top Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 sm:p-3 mb-3 flex flex-wrap items-center justify-between gap-2 shadow-lg">
        {/* Preset Locations */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">Position:</span>
          <button
            onClick={() => applyPreset('br')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer min-h-[36px]"
          >
            Bottom-Right
          </button>
          <button
            onClick={() => applyPreset('tr')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer min-h-[36px]"
          >
            Top-Right
          </button>
          <button
            onClick={() => applyPreset('bl')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer min-h-[36px]"
          >
            Bottom-Left
          </button>
          <button
            onClick={() => applyPreset('tl')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer min-h-[36px]"
          >
            Top-Left
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onCancel}
            className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>

          <button
            id="video-remove-action-btn"
            onClick={handleRemoveClick}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all min-h-[44px] cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI RESTORE</span>
          </button>
        </div>
      </div>

      {/* Video Preview Container */}
      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden relative flex items-center justify-center p-2 sm:p-4">
        <div
          ref={containerRef}
          className="relative max-h-[60vh] max-w-full aspect-video shadow-2xl rounded-xl overflow-hidden bg-black flex items-center justify-center select-none"
        >
          {/* HTML5 Video Element */}
          <video
            ref={videoRef}
            src={job.originalUrl}
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-contain"
            onClick={togglePlay}
          />

          {/* Interactive Bounding Box Overlay for Watermark Selection */}
          <div
            id="video-watermark-selection-box"
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            className={`absolute border-2 border-dashed rounded-lg cursor-move transition-shadow ${
              isDragging || isResizing
                ? 'border-cyan-300 bg-cyan-500/30 shadow-xl shadow-cyan-500/40'
                : 'border-red-500 bg-red-500/25 shadow-lg shadow-red-500/20'
            }`}
            style={{
              left: `${box.leftPct}%`,
              top: `${box.topPct}%`,
              width: `${box.widthPct}%`,
              height: `${box.heightPct}%`,
            }}
          >
            {/* Box Header Label */}
            <div className="absolute -top-6 left-0 px-1.5 py-0.5 rounded bg-red-600 text-[10px] font-bold text-white uppercase tracking-wider flex items-center space-x-1 shadow-md whitespace-nowrap">
              <Move className="w-2.5 h-2.5" />
              <span>Target Region</span>
            </div>

            {/* Resize Handle (Bottom-Right) */}
            <div
              onMouseDown={startResize}
              onTouchStart={startResize}
              className="absolute -bottom-2 -right-2 w-5 h-5 bg-cyan-400 border-2 border-slate-900 rounded-full cursor-se-resize flex items-center justify-center shadow-lg hover:scale-125 transition-transform"
              title="Drag to resize"
            >
              <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Video Playback & Timeline Controls */}
      <div className="mt-3 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg">
        {/* Scrubber Bar */}
        <div className="flex items-center space-x-3 mb-2">
          <button
            id="video-play-pause-btn"
            onClick={togglePlay}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer shrink-0 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <input
            id="video-timeline-scrubber"
            type="range"
            min="0"
            max={duration || 10}
            step="0.05"
            value={currentTime}
            onChange={handleScrub}
            className="flex-1 accent-cyan-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />

          <span className="text-xs font-mono text-slate-300 shrink-0 w-24 text-right">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Tip */}
        <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            Drag and resize the red box over the unwanted logo. Play the video to ensure it covers the area across frames, then click <strong>AI RESTORE</strong>.
          </span>
        </div>
      </div>
    </div>
  );
};
