import React from "react";

const StartTestPage = () => {
  return (
    <div className="min-h-screen w-screen bg-gray-50 flex items-center justify-center px-4">

      {/* CARD */}
      <div className="grid md:grid-cols-2 w-full max-w-6xl h-[650px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">

        {/* LEFT PANEL */}
        <div className="flex flex-col justify-center px-12 py-16">

          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-xs tracking-widest uppercase text-blue-600 font-medium">
              Proctoring Platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl font-serif font-bold text-gray-900 leading-tight mb-6">
            Secure online exams <br />
            <span className="text-gray-400">
              built for trust.
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-gray-500 text-sm leading-relaxed max-w-md mb-10">
            A clean, modern platform that keeps test-takers focused while
            giving admins full control and proctors real-time visibility.
          </p>

          {/* Buttons */}
          <div className="flex gap-4">
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-md hover:shadow-lg">
              Start Exam
            </button>

            <button className="border border-gray-300 text-gray-600 px-8 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 transition">
              Learn More
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-10 mt-12 pt-8 border-t border-gray-200">
            {[
              { value: "99.8%", label: "Uptime SLA" },
              { value: "2M+", label: "Exams secured" },
              { value: "150+", label: "Institutions" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 tracking-wide">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="relative">

          <img
            src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1170&auto=format&fit=crop"
            alt="Online Exam"
            className="w-full h-full object-cover"
          />

          {/* Overlay */}
          <div className="absolute inset-0  from-white/90 via-white/30 to-transparent"></div>

          {/* Active Sessions Card */}
          <div className="absolute top-6 right-6 bg-white shadow-lg rounded-xl px-5 py-4 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Active sessions
            </p>
            <p className="text-2xl font-bold text-gray-900">1,284</p>
            <p className="text-xs text-green-500 font-medium">
              ↑ 12% this hour
            </p>
          </div>

          {/* Security Badge */}
          <div className="absolute bottom-8 left-8 flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-md border border-gray-200">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">
                End-to-end encrypted
              </p>
              <p className="text-xs text-gray-500">
                Secure & trusted infrastructure
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StartTestPage;