import React from 'react';
import { PageView } from '../types';
import { Sparkles, ShieldCheck, FileText, ArrowLeft, RefreshCw } from 'lucide-react';

interface HeaderProps {
  currentView: PageView;
  onNavigate: (view: PageView) => void;
  hasActiveJob: boolean;
  onStartNew?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  hasActiveJob,
  onStartNew,
}) => {
  return (
    <header className="w-full bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <button
            id="brand-home-button"
            onClick={() => onNavigate('app')}
            className="flex items-center space-x-2 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white">WATERIX™</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  AI STUDIO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
                Media Cleanup & Watermark Studio
              </p>
            </div>
          </button>
        </div>

        {/* Navigation / Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {hasActiveJob && currentView === 'app' && (
            <button
              id="header-start-new-button"
              onClick={onStartNew}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Start New</span>
            </button>
          )}

          {currentView !== 'app' ? (
            <button
              id="back-to-editor-button"
              onClick={() => onNavigate('app')}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/60 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Editor</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                id="nav-privacy-button"
                onClick={() => onNavigate('privacy')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Privacy</span>
              </button>

              <button
                id="nav-terms-button"
                onClick={() => onNavigate('terms')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Terms</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
