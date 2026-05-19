import React, { useState } from 'react';

const SebRequired: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Install Safe Exam Browser",
      description: "Download and install SEB for Windows or macOS. It creates a locked, secure browsing environment for your exam session.",
      image: (
        <img src="/seb_install_dark.png" alt="Install SEB" className="w-80 h-56 object-contain mb-8 rounded-xl shadow-none" />
      )
    },
    {
      title: "Download Configuration",
      description: "Get the assessment configuration file (.seb). This file contains the specific settings required for your exam.",
      image: (
        <img src="/seb_config_dark.png" alt="Download Config" className="w-80 h-56 object-contain mb-8 rounded-xl shadow-none" />
      )
    },
    {
      title: "Launch Assessment",
      description: "Once installed, click the launch button or open the configuration file to securely start your assessment.",
      image: (
         <img src="/seb_launch_dark.png" alt="Launch Assessment" className="w-80 h-56 object-contain mb-8 rounded-xl shadow-none" />
      )
    }
  ];

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  const launchInSeb = () => {
    const origin = window.location.origin;
    const sebUrl = origin
      .replace(/^https:\/\//i, 'sebs://')
      .replace(/^http:\/\//i, 'seb://');
    
    window.location.href = sebUrl;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-12 font-['Outfit']">
      <div className="max-w-[1400px] w-full bg-white rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.05)] border border-slate-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side - Slider (Instruction) */}
        <div className="w-full md:w-1/2 p-12 lg:p-16 flex flex-col items-center justify-center border-b md:border-b-0 border-slate-700 bg-slate-800 relative overflow-hidden">
           
           {/* Decorative background glows */}
           <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#3b82f6]/15 rounded-full blur-[100px] pointer-events-none" />
           <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#818cf8]/15 rounded-full blur-[100px] pointer-events-none" />

           <div className="w-full max-w-lg bg-[#1e293b] rounded-3xl p-10 shadow-[0_12px_40px_rgb(0,0,0,0.3)] border border-slate-700 flex flex-col items-center text-center transition-all duration-500 z-10">
              {slides[currentSlide].image}
              <h3 className="text-3xl font-bold text-white mb-4">{slides[currentSlide].title}</h3>
              <p className="text-lg text-slate-300 leading-relaxed min-h-[80px]">
                {slides[currentSlide].description}
              </p>
           </div>

           {/* Slider Controls */}
           <div className="flex items-center gap-4 mt-8 z-10">
              <button onClick={prevSlide} className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors bg-slate-800/50 shadow-sm backdrop-blur-md">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex gap-2">
                {slides.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-6 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]' : 'w-2 bg-slate-700'}`}
                  />
                ))}
              </div>

              <button onClick={nextSlide} className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors bg-slate-800/50 shadow-sm backdrop-blur-md">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
           </div>

        </div>

        {/* Right Side - Action / Download */}
        <div className="w-full md:w-1/2 p-12 lg:p-16 flex flex-col justify-center bg-white relative">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider rounded-full mb-6 border border-slate-200 self-start">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Secure Environment Required
          </div>

          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-6">
            Safe Exam Browser <br/> Required
          </h1>
          
          <p className="text-slate-500 text-lg leading-relaxed mb-12">
            This assessment must be accessed through Safe Exam Browser to ensure fairness, security, and integrity.
          </p>

          <div className="flex flex-col gap-6">
            
            <a
              href="https://safeexambrowser.org/download_en.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-6 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl transition-all shadow-sm group"
            >
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-105 transition-transform">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-slate-800 font-bold text-lg">Download SEB</h4>
                <p className="text-slate-500 text-base mt-1">Get the browser for your OS</p>
              </div>
              <div className="px-4 py-2 bg-indigo-50 text-indigo-600 text-sm font-bold rounded-xl border border-indigo-100">
                Step 1
              </div>
            </a>

            <a
              href="/TITANS_CANDIDATEPORTAL.seb"
              download="TITANS_CANDIDATEPORTAL.seb"
              className="flex items-center p-6 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl transition-all shadow-sm group"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-105 transition-transform">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-slate-800 font-bold text-lg">Download config file</h4>
                <p className="text-slate-500 text-base mt-1">TITANS_CANDIDATEPORTAL.seb</p>
              </div>
              <div className="px-4 py-2 bg-emerald-50 text-emerald-600 text-sm font-bold rounded-xl border border-emerald-100">
                Step 2
              </div>
            </a>

            <button
              onClick={launchInSeb}
              className="mt-6 w-full flex items-center justify-center gap-3 p-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10 group text-xl"
            >
            
              <span>Already set up? Launch exam in SEB</span>
            </button>

          </div>

          <div className="mt-8 text-center text-slate-400 text-[10px] font-medium">
            © Team Titans. All rights reserved.
          </div>

        </div>

      </div>
    </div>
  );
};

export default SebRequired;
