import React from 'react';

const SebRequired: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center p-6 font-['Inter'] relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#3b82f6]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#818cf8]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Lock Card */}
      <div className="w-full max-w-xl bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-slate-800 p-10 text-center z-10">
        
        {/* Glow Shield Icon */}
        <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-pulse">
          <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 bg-red-500/10 text-red-400 text-[10px] font-extrabold uppercase tracking-widest rounded-full mb-4 border border-red-500/20">
            Secure Environment Required
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-4">
            Safe Exam Browser Required
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
            To ensure assessment security, fairness, and integrity, this assessment can only be accessed using the <strong>Safe Exam Browser (SEB)</strong>.
          </p>
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto mb-8">
          <a
            href="https://safeexambrowser.org/download_en.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-5 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700 hover:border-slate-500 text-white rounded-2xl transition-all duration-300 active:scale-[0.98] group"
          >
            <svg className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span className="text-sm font-bold">1. Download SEB</span>
            <span className="text-[10px] text-slate-500 mt-1">Get SEB for your OS</span>
          </a>

          <a
            href="/TITANS_CANDIDATEPORTAL.seb"
            download="TITANS_CANDIDATEPORTAL.seb"
            className="flex flex-col items-center justify-center p-5 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 border border-blue-500/20 group"
          >
            <svg className="w-8 h-8 text-white mb-3 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-bold">2. Download Config</span>
            <span className="text-[10px] text-blue-200 mt-1">Launch assessment in SEB</span>
          </a>
        </div>

        {/* Steps Guide */}
        <div className="bg-slate-950/40 rounded-2xl p-6 text-left border border-slate-800/80 max-w-md mx-auto">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">Quick Setup Guide</h3>
          <ul className="space-y-3 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">1</span>
              <span>Install Safe Exam Browser using the <strong>Download SEB</strong> button.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">2</span>
              <span>Download the configuration file via the <strong>Download Config</strong> button.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">3</span>
              <span>Double-click the downloaded <code>TITANS_CANDIDATEPORTAL.seb</code> file to securely launch and take your test.</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8 text-center text-slate-600 text-xs">
        © Team Titans. All rights reserved.
      </div>
    </div>
  );
};

export default SebRequired;
