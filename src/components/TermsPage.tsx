import React from 'react';
import { FileText, AlertTriangle, CheckCircle, Scale, ArrowLeft } from 'lucide-react';

interface TermsPageProps {
  onBack: () => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
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
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Terms & Acceptable Use
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Authorized Media Inpainting & Artifact Cleanup Guidelines
            </p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
          <section className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>1. Intended & Permitted Uses</span>
            </h2>
            <p className="mb-2">
              WATERIX™ is designed strictly for authorized media cleanup, restoration, and defect correction on visual content you own or have explicit authorization to modify. Permitted uses include:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
              <li>Removing camera timestamps, dates, or technical sensor overlays from your own footage.</li>
              <li>Eliminating accidental optical artifacts, lens dust specks, glare, or water spots.</li>
              <li>Cleaning up unwanted background boom microphones, wires, or studio clutter in your productions.</li>
              <li>Updating outdated brand logos or visual badges on company-owned media assets.</li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-slate-950/60 border border-red-900/40 bg-red-950/10">
            <h2 className="text-base font-bold text-red-300 flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>2. Strictly Prohibited Uses</span>
            </h2>
            <p className="mb-2 text-slate-300">
              Under no circumstances may WATERIX™ be used for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-red-200/80 pl-2">
              <li>Removing copyright notices, creator attributions, or copyright management information (CMI) without license.</li>
              <li>Circumventing digital rights management (DRM) or licensing watermarks on stock photography or video platforms.</li>
              <li>Misrepresenting another creator's intellectual property as your own.</li>
              <li>Processing unlawful, defamatory, or abusive content.</li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center space-x-2 mb-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>3. User Warranty of Authorization</span>
            </h2>
            <p>
              By utilizing the WATERIX™ service, you represent and warrant that you hold all necessary legal rights, licenses, and permissions to upload, inpaint, process, and download the media submitted to the engine.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
