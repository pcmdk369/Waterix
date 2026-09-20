import React, { useState, useRef } from 'react';
import { Download, RefreshCw, Eye, Sparkles, SlidersHorizontal, Columns2, Check, ArrowRight } from 'lucide-react';
import { ActiveJob } from '../types';

interface ResultViewProps {
  job: ActiveJob;
  onStartNew: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ job, onStartNew }) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // 0 to 100%
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side' | 'after-only' | 'before-only'>('slider');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);

  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const pct = Math.round((offsetX / rect.width) * 100);
    setSliderPos(pct);
  };

  const startSliderDrag = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDraggingSlider(true);
    handleSliderMove(e);
  };

  const handleDownload = () => {
    if (!job.downloadUrl) return;
    setIsDownloading(true);

    const link = document.createElement('a');
    link.href = job.downloadUrl;
    link.download = `waterix-cleaned-${job.filename}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
    }, 1500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-8 flex flex-col items-center">
      {/* Top Controls & View Mode Selector */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg">
        {/* View Toggle Tabs */}
        <div className="flex items-center space-x-1 bg-slate-800/80 rounded-xl p-1 border border-slate-700/50">
          <button
            onClick={() => setViewMode('slider')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[36px] ${
              viewMode === 'slider'
                ? 'bg-cyan-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Split Slider</span>
          </button>

          <button
            onClick={() => setViewMode('side-by-side')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[36px] ${
              viewMode === 'side-by-side'
                ? 'bg-cyan-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Side-by-Side</span>
          </button>

          <button
            onClick={() => setViewMode('after-only')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[36px] ${
              viewMode === 'after-only'
                ? 'bg-cyan-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Clean Result</span>
          </button>

          <button
            onClick={() => setViewMode('before-only')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[36px] ${
              viewMode === 'before-only'
                ? 'bg-cyan-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Original</span>
          </button>
        </div>

        {/* Primary Download & Start New Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            id="start-new-action-btn"
            onClick={onStartNew}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm border border-slate-700 transition-colors min-h-[44px] cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Start New</span>
          </button>

          <button
            id="download-result-action-btn"
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all min-h-[44px] cursor-pointer"
          >
            {isDownloading ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{job.mediaType === 'video' ? 'Download Video' : 'Download Image'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Media Comparison Viewer */}
      <div className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-3 sm:p-6 overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[420px]">
        {job.mediaType === 'image' ? (
          /* Image Mode */
          viewMode === 'slider' ? (
            /* Interactive Split-Screen Comparison Slider */
            <div
              ref={containerRef}
              onMouseDown={startSliderDrag}
              onMouseMove={(e) => {
                if (e.buttons === 1) handleSliderMove(e);
              }}
              onTouchStart={startSliderDrag}
              onTouchMove={handleSliderMove}
              className="relative max-w-full max-h-[68vh] rounded-2xl overflow-hidden shadow-2xl select-none cursor-ew-resize inline-block"
            >
              {/* Clean Processed (Right / Background Layer) */}
              <img
                src={job.processedUrl || ''}
                alt="Clean Result"
                className="max-h-[68vh] max-w-full block rounded-2xl pointer-events-none object-contain"
              />

              {/* Original Before (Left / Foreground Layer clipped by slider position) */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={job.originalUrl}
                  alt="Original"
                  className="max-h-[68vh] max-w-none block pointer-events-none object-contain"
                  style={{ width: containerRef.current?.clientWidth }}
                />
              </div>

              {/* Draggable Divider Line */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.8)] pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              >
                {/* Drag Handle Knob */}
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-2xl border-2 border-cyan-500 font-bold text-xs">
                  <SlidersHorizontal className="w-4 h-4 rotate-90" />
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-[11px] font-bold uppercase tracking-wider pointer-events-none border border-white/20">
                Before (Original)
              </div>
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-cyan-900/80 backdrop-blur-md text-cyan-200 text-[11px] font-bold uppercase tracking-wider pointer-events-none border border-cyan-500/40">
                After (Cleaned)
              </div>
            </div>
          ) : viewMode === 'side-by-side' ? (
            /* Side-by-Side Comparison */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Before (Original)
                </span>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black max-h-[50vh] flex items-center justify-center">
                  <img
                    src={job.originalUrl}
                    alt="Before"
                    className="max-h-[50vh] max-w-full object-contain"
                  />
                </div>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>After (Cleaned)</span>
                </span>
                <div className="rounded-xl overflow-hidden border border-cyan-500/40 bg-black max-h-[50vh] flex items-center justify-center">
                  <img
                    src={job.processedUrl || ''}
                    alt="After"
                    className="max-h-[50vh] max-w-full object-contain"
                  />
                </div>
              </div>
            </div>
          ) : viewMode === 'after-only' ? (
            /* After Only */
            <div className="max-h-[68vh] max-w-full rounded-2xl overflow-hidden shadow-2xl bg-black">
              <img
                src={job.processedUrl || ''}
                alt="After"
                className="max-h-[68vh] max-w-full object-contain"
              />
            </div>
          ) : (
            /* Before Only */
            <div className="max-h-[68vh] max-w-full rounded-2xl overflow-hidden shadow-2xl bg-black">
              <img
                src={job.originalUrl}
                alt="Before"
                className="max-h-[68vh] max-w-full object-contain"
              />
            </div>
          )
        ) : (
          /* Video Mode */
          <div className="w-full flex flex-col items-center">
            {viewMode === 'side-by-side' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Before (Original)
                  </span>
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video w-full flex items-center justify-center">
                    <video
                      src={job.originalUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>After (Cleaned MP4)</span>
                  </span>
                  <div className="rounded-xl overflow-hidden border border-cyan-500/40 bg-black aspect-video w-full flex items-center justify-center">
                    <video
                      src={job.processedUrl || ''}
                      controls
                      playsInline
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            ) : viewMode === 'before-only' ? (
              <div className="aspect-video max-h-[60vh] w-full max-w-3xl rounded-xl overflow-hidden bg-black border border-slate-800">
                <video
                  src={job.originalUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-video max-h-[60vh] w-full max-w-3xl rounded-xl overflow-hidden bg-black border border-cyan-500/40 shadow-2xl">
                <video
                  src={job.processedUrl || ''}
                  controls
                  playsInline
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ephemeral Notice */}
      <div className="mt-4 text-center text-xs text-slate-500 flex items-center justify-center space-x-1.5">
        <span>Files are temporary and automatically shredded after download or session end.</span>
      </div>
    </div>
  );
};
