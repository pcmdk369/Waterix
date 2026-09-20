import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { ImageEditor } from './components/ImageEditor';
import { VideoEditor } from './components/VideoEditor';
import { AddWatermarkEditor } from './components/AddWatermarkEditor';
import { ProcessingView } from './components/ProcessingView';
import { ResultView } from './components/ResultView';
import { PrivacyPage } from './components/PrivacyPage';
import { TermsPage } from './components/TermsPage';
import {
  ActiveJob,
  PageView,
  BoundingBox,
  StudioMode,
  TextWatermarkConfig,
  ImageWatermarkConfig,
} from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<PageView>('app');
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<StudioMode>('remove');

  const pollIntervalRef = useRef<number | null>(null);

  // Sync hash for direct /privacy or /terms navigation
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#privacy') setCurrentView('privacy');
      else if (hash === '#terms') setCurrentView('terms');
      else if (hash === '' || hash === '#/') setCurrentView('app');
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleNavigate = (view: PageView) => {
    setCurrentView(view);
    if (view === 'privacy') window.location.hash = '#privacy';
    else if (view === 'terms') window.location.hash = '#terms';
    else window.location.hash = '#/';
  };

  // Upload handler with mode tracking
  const handleFileSelected = async (file: File, mode: StudioMode = 'remove') => {
    setUploadError(null);
    setSelectedMode(mode);

    // Client-side guard for 25MB limit
    if (file.size > 26 * 1024 * 1024) {
      setUploadError('File size exceeds 25MB limit. Please upload a smaller image or video.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 80 ? prev + 12 : prev));
      }, 150);

      const postUpload = () =>
        fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

      let response = await postUpload();

      // If backend was warming up or 502/503/504, auto-retry once after 1.2s
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        await new Promise((r) => setTimeout(r, 1200));
        response = await postUpload();
      }

      clearInterval(progressTimer);
      setUploadProgress(100);

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      }

      if (!response.ok) {
        let msg = data?.error;
        if (!msg) {
          if (response.status === 413) {
            msg = 'File size is too large (25MB limit).';
          } else if (response.status === 502 || response.status === 503 || response.status === 504) {
            msg = 'Processing server is warming up. Please try uploading again in a few seconds.';
          } else {
            msg = `Upload failed (status ${response.status}). Please try again.`;
          }
        }
        throw new Error(msg);
      }

      if (!data || !data.jobId) {
        throw new Error('Unexpected response format from server. Please try again.');
      }

      setActiveJob({
        jobId: data.jobId,
        mediaType: data.mediaType,
        filename: data.filename,
        originalUrl: data.originalUrl,
        width: data.width,
        height: data.height,
        duration: data.duration,
        status: 'ready',
        stage: 'Uploading',
        progress: 100,
        mode,
      });
      setIsUploading(false);
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploadError(err.message || 'Failed to upload media. Please try again.');
      setIsUploading(false);
    }
  };

  // Trigger Image Watermark Removal
  const handleImageRemove = async (maskDataUrl: string) => {
    if (!activeJob) return;

    setActiveJob((prev) =>
      prev
        ? {
            ...prev,
            status: 'processing',
            stage: 'Preparing',
            progress: 10,
          }
        : null
    );

    try {
      const res = await fetch('/api/image/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: activeJob.jobId,
          maskDataUrl,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

      if (!res.ok) {
        throw new Error(data?.error || `Inpainting request failed with status ${res.status}`);
      }

      startPolling(activeJob.jobId);
    } catch (err: any) {
      console.error('Image remove error:', err);
      setActiveJob((prev) => (prev ? { ...prev, status: 'failed', error: err.message } : null));
    }
  };

  // Trigger Video Watermark Removal
  const handleVideoRemove = async (bbox: BoundingBox) => {
    if (!activeJob) return;

    setActiveJob((prev) =>
      prev
        ? {
            ...prev,
            status: 'processing',
            stage: 'Preparing',
            progress: 10,
          }
        : null
    );

    try {
      const res = await fetch('/api/video/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: activeJob.jobId,
          bbox,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

      if (!res.ok) {
        throw new Error(data?.error || `Video removal request failed with status ${res.status}`);
      }

      startPolling(activeJob.jobId);
    } catch (err: any) {
      console.error('Video remove error:', err);
      setActiveJob((prev) => (prev ? { ...prev, status: 'failed', error: err.message } : null));
    }
  };

  // Apply Text Watermark (Image or Video)
  const handleApplyTextWatermark = async (config: TextWatermarkConfig) => {
    if (!activeJob) return;

    setActiveJob((prev) =>
      prev
        ? {
            ...prev,
            status: 'processing',
            stage: 'Preparing',
            progress: 10,
          }
        : null
    );

    try {
      const res = await fetch('/api/watermark/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: activeJob.jobId,
          text: config.text,
          options: config,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

      if (!res.ok) {
        throw new Error(data?.error || `Watermarking failed with status ${res.status}`);
      }

      startPolling(activeJob.jobId);
    } catch (err: any) {
      console.error('Text watermark apply error:', err);
      setActiveJob((prev) => (prev ? { ...prev, status: 'failed', error: err.message } : null));
    }
  };

  // Apply Logo / Image Watermark (Image or Video)
  const handleApplyImageWatermark = async (config: ImageWatermarkConfig) => {
    if (!activeJob) return;

    setActiveJob((prev) =>
      prev
        ? {
            ...prev,
            status: 'processing',
            stage: 'Preparing',
            progress: 10,
          }
        : null
    );

    try {
      const res = await fetch('/api/watermark/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: activeJob.jobId,
          logoDataUrl: config.logoDataUrl,
          options: config,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

      if (!res.ok) {
        throw new Error(data?.error || `Logo watermarking failed with status ${res.status}`);
      }

      startPolling(activeJob.jobId);
    } catch (err: any) {
      console.error('Logo watermark apply error:', err);
      setActiveJob((prev) => (prev ? { ...prev, status: 'failed', error: err.message } : null));
    }
  };

  // Polling helper
  const startPolling = useCallback((jobId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/job/${jobId}`);
        if (!res.ok) return;

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;

        const data = await res.json().catch(() => null);
        if (!data) return;

        setActiveJob((prev) => {
          if (!prev || prev.jobId !== jobId) return prev;
          return {
            ...prev,
            status: data.status,
            stage: data.stage,
            progress: data.progress,
            processedUrl: data.processedUrl,
            downloadUrl: data.downloadUrl,
            error: data.error,
          };
        });

        if (data.status === 'completed' || data.status === 'failed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.warn('Polling check error:', err);
      }
    }, 400);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Reset / Start New (triggers backend file deletion)
  const handleStartNew = async () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (activeJob) {
      try {
        await fetch(`/api/job/${activeJob.jobId}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Failed to delete job on backend:', err);
      }
    }

    setActiveJob(null);
    setUploadError(null);
    setCurrentView('app');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        hasActiveJob={!!activeJob}
        onStartNew={handleStartNew}
      />

      {/* Main Body */}
      <main className="flex-1 flex flex-col">
        {currentView === 'privacy' ? (
          <PrivacyPage onBack={() => handleNavigate('app')} />
        ) : currentView === 'terms' ? (
          <TermsPage onBack={() => handleNavigate('app')} />
        ) : !activeJob ? (
          <UploadZone
            onFileSelected={handleFileSelected}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            errorMessage={uploadError}
            initialMode={selectedMode}
          />
        ) : activeJob.status === 'ready' ? (
          activeJob.mode === 'add' ? (
            <AddWatermarkEditor
              job={activeJob}
              onApplyTextWatermark={handleApplyTextWatermark}
              onApplyImageWatermark={handleApplyImageWatermark}
              onCancel={handleStartNew}
            />
          ) : activeJob.mediaType === 'image' ? (
            <ImageEditor
              job={activeJob}
              onRemove={handleImageRemove}
              onCancel={handleStartNew}
            />
          ) : (
            <VideoEditor
              job={activeJob}
              onRemove={handleVideoRemove}
              onCancel={handleStartNew}
            />
          )
        ) : activeJob.status === 'processing' ? (
          <ProcessingView job={activeJob} onCancel={handleStartNew} />
        ) : activeJob.status === 'completed' ? (
          <ResultView job={activeJob} onStartNew={handleStartNew} />
        ) : (
          /* Failed state */
          <div className="max-w-md mx-auto my-auto px-4 py-12 text-center">
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 mb-6">
              <h3 className="text-lg font-bold text-red-300 mb-2">Processing Failed</h3>
              <p className="text-sm text-red-200/80">
                {activeJob.error || 'An unexpected error occurred during media processing.'}
              </p>
            </div>
            <button
              onClick={handleStartNew}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-colors cursor-pointer"
            >
              Try Another File
            </button>
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="py-4 border-t border-slate-900 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>WATERIX™ • AI Media Cleanup & Watermark Studio</span>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleNavigate('privacy')}
              className="hover:text-slate-400 transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <span>•</span>
            <button
              onClick={() => handleNavigate('terms')}
              className="hover:text-slate-400 transition-colors cursor-pointer"
            >
              Terms of Use
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
