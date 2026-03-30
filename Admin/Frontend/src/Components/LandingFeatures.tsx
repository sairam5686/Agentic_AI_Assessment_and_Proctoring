

const PlaceholderPicture = ({ className = '' }) => (
  <div className={`aspect-square rounded-2xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center ${className}`}>
    <div className="w-10 h-10 rounded-full border border-gray-100 bg-gray-50" />
  </div>
);

const LandingFeatures = () => {
  return (
    <section className="py-20 px-6 bg-white font-sans text-[#111]">
      <div className="max-w-[1100px] mx-auto">

        {/*
          Layout (desktop):
          ┌──────────────┬──────────────────┬──────────────┐
          │  Card 1      │  Card 2          │  Card 3      │
          │  (top-left)  │  (top-center)    │  (full-ht)   │
          ├──────────────┼──────────────────┤              │
          │  Card 4 (bottom-left, 2-col span)│              │
          └──────────────┴──────────────────┴──────────────┘
        */}
        {/* ── Section Heading ── */}
        <div className="mb-12 text-center">
          <h2 className="text-[36px] font-bold tracking-tight leading-tight">
            Our Prime Features
          </h2>
          <p className="text-[15px] text-[#888] mt-3 max-w-[480px] mx-auto leading-relaxed">
            Everything you need to streamline your hiring process, all in one place.
          </p>
        </div>

        <div
          className="grid gap-5"
          style={{
            gridTemplateColumns: '1fr 1.3fr 1fr',
            gridTemplateRows: 'auto auto',
          }}
        >

          {/* ── Card 1 · Generate scores ── */}
          <div
            className="flex flex-col bg-[#f7f7f7] rounded-[24px] p-7"
            style={{ gridColumn: '1', gridRow: '1' }}
          >
            <h3 className="text-[18px] font-semibold mb-1.5 leading-snug">
              AI-Powered Fraud Detection
            </h3>
            <p className="text-[14px] text-[#888] leading-relaxed mb-6">
              Generate violation scores based on real-time behavior. As accurate as human proctors.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-auto">
              {[1, 2, 3, 4].map((i) => (
                <PlaceholderPicture key={i} />
              ))}
            </div>
          </div>

          {/* ── Card 2 · Track progress ── */}
          <div
            className="flex flex-col bg-[#f7f7f7] rounded-[24px] p-7"
            style={{ gridColumn: '2', gridRow: '1' }}
          >
            <h3 className="text-[18px] font-semibold mb-1.5 leading-snug">
              Monitor Test Progress
            </h3>
            <p className="text-[14px] text-[#888] leading-relaxed mb-6">
              Track every step of the candidate's assessment, from system check to final submission.
            </p>

            {/* Step dots */}
            <div className="flex items-center gap-1.5 mb-6">
              {Array.from({ length: 11 }, (_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all ${
                    i < 10
                      ? 'w-2 h-2 bg-gray-200'
                      : 'w-3 h-3 bg-[#bbb]'
                  }`}
                />
              ))}
            </div>

            {/* Flow nodes */}
            <div className="mt-auto flex flex-col gap-3">
              {[
                { label: 'Assessment Started', align: 'self-end' },
                { label: 'System Checks Passed',        align: 'self-start' },
                { label: 'AI Monitoring Active',      align: 'self-end' },
              ].map(({ label, align }) => (
                <div
                  key={label}
                  className={`${align} flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3.5 py-2 shadow-sm`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                  <span className="text-[12px] font-medium text-gray-700 whitespace-nowrap">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Card 3 · Upload resumes · spans both rows ── */}
          <div
            className="flex flex-col bg-[#f7f7f7] rounded-[24px] p-7 relative overflow-hidden"
            style={{ gridColumn: '3', gridRow: '1 / 3' }}
          >
            <h3 className="text-[18px] font-semibold mb-1.5 leading-snug">
              Bulk Candidate Enrollment
            </h3>
            <p className="text-[14px] text-[#888] leading-relaxed mb-6">
              One click OR drag and drop Excel files to enroll hundreds of candidates instantly.
            </p>

            {/* Upload area — fills remaining height */}
            <div className="flex-1 relative rounded-[18px] border border-dashed border-gray-300 bg-white overflow-hidden min-h-[240px]">
              {/* Grid pattern */}
              <div
                className="absolute inset-0 opacity-50"
                style={{
                  backgroundImage:
                    'linear-gradient(#e8e8e8 1px, transparent 1px), linear-gradient(90deg, #e8e8e8 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />
              {/* Upload CTA */}
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-center gap-3 p-6">
                <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-gray-700">Drag &amp; Drop Candidate List</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">XLSX, CSV, PDF</p>
                </div>
                <div className="mt-2 px-4 py-1.5 rounded-full bg-gray-900 text-white text-[11px] font-medium cursor-pointer hover:bg-gray-700 transition-colors">
                  Browse files
                </div>
              </div>
            </div>
          </div>

          {/* ── Card 4 · Schedule interviews · spans 2 cols on bottom ── */}
          <div
            className="flex flex-col bg-[#f7f7f7] rounded-[24px] p-7"
            style={{ gridColumn: '1 / 3', gridRow: '2' }}
          >
            <h3 className="text-[18px] font-semibold mb-1.5 leading-snug">
              Seamless Proctor Assignment
            </h3>
            <p className="text-[14px] text-[#888] leading-relaxed mb-6">
              Assign proctors and invigilators to assessments in seconds, effortlessly.
            </p>

            {/* Two avatars with a connector line */}
            <div className="mt-auto flex items-center justify-center gap-0">
              <PlaceholderPicture className="w-16 h-16 shrink-0 z-10" />

              {/* Connector */}
              <div className="flex-1 max-w-[180px] flex items-center gap-1.5 px-3">
                <div className="flex-1 h-px bg-gray-200" />
                <div className="flex flex-col items-center gap-1">
                  <div className="px-2.5 py-1 bg-white border border-gray-200 rounded-full shadow-sm text-[10px] text-gray-500 font-medium whitespace-nowrap">
                    Active Session · 90 min
                  </div>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-gray-300" />
                    <div className="w-1 h-1 rounded-full bg-gray-200" />
                    <div className="w-1 h-1 rounded-full bg-gray-200" />
                  </div>
                </div>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <PlaceholderPicture className="w-16 h-16 shrink-0 z-10" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default LandingFeatures;