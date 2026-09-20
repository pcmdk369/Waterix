import React from 'react';
import { ShieldCheck, Lock, Trash2, EyeOff, Server, ArrowLeft } from 'lucide-react';

interface PrivacyPageProps {
  onBack: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBack }) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Waterix Editor</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Privacy Architecture
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Zero Accounts • Zero Long-Term Storage • Ephemeral Processing
            </p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center space-x-2 mb-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>1. Complete Anonymity — No User Accounts</span>
            </h2>
            <p>
              WATERIX™ is built from the ground up without accounts, email verification, passwords, user profiles, or tracking identifiers. When you open the application, you can immediately begin restoring authorized media without submitting any personal credentials.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center space-x-2 mb-2">
              <Trash2 className="w-4 h-4 text-emerald-400" />
              <span>2. Temporary Media Lifetime & Automated Shredding</span>
            </h2>
            <p className="mb-2">
              All uploaded images, video streams, masks, intermediate frames, and restored files are treated as ephemeral artifacts:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li>Stored in isolated temporary workspace directories with randomly generated cryptographic tokens.</li>
              <li>Instantly deleted upon user clicking "Start New" or sending a removal command.</li>
              <li>Automatically shredded from system memory and disk after 30 minutes of inactivity.</li>
              <li>Never retained in permanent cloud databases or used to train public models.</li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center space-x-2 mb-2">
              <Server className="w-4 h-4 text-blue-400" />
              <span>3. Isolated Server-Side Processing</span>
            </h2>
            <p>
              Media processing is executed within sandboxed container environments. Uploads are checked for strict MIME types and file signatures. No executable code or arbitrary scripts can be executed from user uploads.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center space-x-2 mb-2">
              <EyeOff className="w-4 h-4 text-purple-400" />
              <span>4. Zero Tracking & Third-Party Cookies</span>
            </h2>
            <p>
              We do not embed third-party marketing trackers, pixel beacons, or advertising cookies. Your session exists strictly in your local browser state during active editing.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
