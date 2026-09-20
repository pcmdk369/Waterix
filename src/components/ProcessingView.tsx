import React from 'react';
import { ActiveJob, JobStage } from '../types';
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface ProcessingViewProps {
  job: ActiveJob;
  onCancel?: () => void;
}

const STAGES: JobStage[] = [
  'Uploading',
  'Preparing',
  'Detecting selected area',
  'AI Restoration',
  'Rebuilding Media',
  'Finalizing',
];

export const ProcessingView: React.FC<ProcessingViewProps> = ({ job, onCancel }) => {
  const currentStageIndex = STAGES.indexOf(job.stage);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-12 sm:py-20 text-center">
      {/* Animated Orb / Centerpiece */}
      <div className="relative mx-auto w-24 h-24 mb-8 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
        <div className="relative w-20 h-20 rounded-full bg-slate-900 border-2 border-cyan-500/50 flex items-center justify-center shadow-2xl">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        </div>
      </div>

      {/* Title & Stage */}
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
        {job.stage}
      </h2>
      <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto">
        {job.mediaType === 'video'
          ? 'Deep neural video inpainting & frame-by-frame temporal interpolation in progress.'
          : 'High-fidelity harmonic boundary synthesis & content-aware inpainting in progress.'}
      </p>

      {/* Progress Bar & Percentage */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex items-center justify-between text-sm font-semibold mb-3">
          <span className="text-slate-300 flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Processing Status</span>
          </span>
          <span className="text-cyan-400 font-mono text-base">{job.progress}%</span>
        </div>

        {/* Bar */}
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/50">
          <div
            id="processing-progress-fill"
            className="bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 h-full rounded-full transition-all duration-300 ease-out shadow-lg shadow-cyan-500/30"
            style={{ width: `${Math.max(5, Math.min(100, job.progress))}%` }}
          />
        </div>
      </div>

      {/* Sequential Pipeline Stages List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 text-left shadow-lg">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
          Pipeline Sequence
        </h4>

        <div className="space-y-3">
          {STAGES.map((stage, idx) => {
            const isCompleted = currentStageIndex > idx;
            const isCurrent = currentStageIndex === idx;

            return (
              <div
                key={stage}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                  isCurrent
                    ? 'bg-cyan-950/40 border-cyan-500/40 text-white'
                    : isCompleted
                    ? 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                    : 'bg-transparent border-transparent text-slate-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                  )}
                  <span className={`text-sm ${isCurrent ? 'font-semibold text-white' : 'font-normal'}`}>
                    {stage}
                  </span>
                </div>

                <span className="text-xs font-mono">
                  {isCompleted ? (
                    <span className="text-emerald-400 font-semibold">Done</span>
                  ) : isCurrent ? (
                    <span className="text-cyan-400 font-semibold">Active</span>
                  ) : (
                    <span className="text-slate-600">Pending</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {job.error && (
        <div className="mt-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>Error: {job.error}</span>
        </div>
      )}

      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-6 text-xs text-slate-500 hover:text-slate-300 transition-colors underline cursor-pointer"
        >
          Cancel Job
        </button>
      )}
    </div>
  );
};
