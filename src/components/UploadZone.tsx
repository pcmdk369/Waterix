import React, { useRef, useState, useEffect } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  Video as VideoIcon,
  ShieldCheck,
  Zap,
  Lock,
  AlertCircle,
  Eraser,
  Stamp,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { StudioMode } from '../types';

interface UploadZoneProps {
  onFileSelected: (file: File, mode: StudioMode) => void;
  isUploading: boolean;
  uploadProgress?: number;
  errorMessage?: string | null;
  initialMode?: StudioMode;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFileSelected,
  isUploading,
  uploadProgress = 0,
  errorMessage,
  initialMode = 'remove',
}) => {
  const [activeMode, setActiveMode] = useState<StudioMode>(initialMode);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Sync mode if changed from header or props
  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

  // Global paste handler to support Ctrl+V / Cmd+V
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (isValidFile(file)) {
          onFileSelected(file, activeMode);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFileSelected, activeMode]);

  const isValidFile = (file: File): boolean => {
    if (!file) return false;
    const type = (file.type || '').toLowerCase();
    if (type.startsWith('image/') || type.startsWith('video/')) return true;
    return /\.(jpe?g|png|webp|gif|bmp|tiff?|avif|heic|heif|mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (isValidFile(file)) {
        onFileSelected(file, activeMode);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero Header */}
      <div className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>Remove • Add • Protect</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-3">
          WATERIX™
        </h1>
        <p className="text-lg sm:text-xl font-medium text-slate-300 mb-2">
          AI Media Cleanup & Watermark Studio
        </p>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          No Login • No Signup • No Account • Upload → Edit → Download
        </p>
      </div>

      {/* Mode Switcher: Remove Watermark vs Add Watermark */}
      <div className="flex justify-center mb-8">
        <div className="p-1.5 bg-slate-900 border border-slate-800 rounded-2xl flex max-w-md w-full shadow-xl">
          <button
            id="mode-remove-watermark-btn"
            type="button"
            onClick={() => setActiveMode('remove')}
            className={`flex-1 inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] ${
              activeMode === 'remove'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Eraser className="w-4 h-4" />
            <span>Remove Watermark</span>
          </button>

          <button
            id="mode-add-watermark-btn"
            type="button"
            onClick={() => setActiveMode('add')}
            className={`flex-1 inline-flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] ${
              activeMode === 'add'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Stamp className="w-4 h-4" />
            <span>Add Watermark</span>
          </button>
        </div>
      </div>

      {/* Upload Drop Zone Card */}
      <div
        id="media-dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01] shadow-2xl shadow-cyan-500/10'
            : 'border-slate-700 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.heic,.heif,.mp4,.mov,.webm,.mkv,.avi,.m4v"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              const file = e.target.files[0];
              e.target.value = '';
              onFileSelected(file, activeMode);
            }
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.heic,.heif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              const file = e.target.files[0];
              e.target.value = '';
              onFileSelected(file, activeMode);
            }
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              const file = e.target.files[0];
              e.target.value = '';
              onFileSelected(file, activeMode);
            }
          }}
        />

        {isUploading ? (
          <div className="py-8 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 animate-pulse">
              <UploadCloud className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Uploading {activeMode === 'remove' ? 'for Cleanup' : 'for Watermarking'}...
            </h3>
            <p className="text-sm text-slate-400 mb-4">Initializing secure temporary workspace</p>
            <div className="w-64 bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-cyan-500 h-full transition-all duration-300"
                style={{ width: `${Math.max(15, uploadProgress)}%` }}
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-105 transition-transform shadow-inner">
              <UploadCloud className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              {activeMode === 'remove'
                ? 'Drop image or video to remove watermark'
                : 'Drop image or video to add custom watermark'}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              or paste directly from your clipboard (Ctrl + V / ⌘ + V)
            </p>

            {/* Choose File Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <button
                id="choose-file-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm sm:text-base shadow-lg shadow-cyan-600/25 hover:shadow-cyan-500/40 transition-all cursor-pointer min-h-[44px]"
              >
                Choose File
              </button>

              <button
                id="upload-image-btn"
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex items-center space-x-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-sm border border-slate-700 transition-colors cursor-pointer min-h-[44px]"
              >
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>Upload Image</span>
              </button>

              <button
                id="upload-video-btn"
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="inline-flex items-center space-x-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-sm border border-slate-700 transition-colors cursor-pointer min-h-[44px]"
              >
                <VideoIcon className="w-4 h-4 text-blue-400" />
                <span>Upload Video</span>
              </button>
            </div>

            {/* Formats Supported */}
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/60 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">SUPPORTED:</span>
              <span>JPG • JPEG • PNG • WEBP • MP4 • MOV • WEBM</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 flex items-center justify-center space-x-2 text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl p-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Trust & Privacy Micro-Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        <div className="flex items-start space-x-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="p-2 rounded-xl bg-slate-800 text-cyan-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">100% Anonymous</h4>
            <p className="text-xs text-slate-400 mt-0.5">No login, signup, email, or credentials needed.</p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="p-2 rounded-xl bg-slate-800 text-blue-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Temporary Processing</h4>
            <p className="text-xs text-slate-400 mt-0.5">Auto-deleted after download. Zero permanent storage.</p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Authorized Media Only</h4>
            <p className="text-xs text-slate-400 mt-0.5">Engineered for cleanups of your owned or authorized media.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
