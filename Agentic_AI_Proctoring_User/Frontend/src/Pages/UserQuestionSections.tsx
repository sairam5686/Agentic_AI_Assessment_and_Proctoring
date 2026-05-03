import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router';


const UserQuestionSections = () => {
  const [QuestionsJson, setQuestionsJson] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const navigator = useNavigate()
  const location = useLocation()

  // ── Authentication and System check gate ───────────────────────────────────
  useEffect(() => {
    const email = localStorage.getItem('candidate_email');
    const aid = localStorage.getItem('assessment_id');

    if (!email || !aid) {
      navigator('/', { replace: true });
      return;
    }

    if (!sessionStorage.getItem('system_check_passed')) {
      navigator('/system-check', { replace: true });
    }
  }, [navigator]);

  // ── Fetch assessment data ──────────────────────────────────────────────────
  const fetcher = async () => {
    try {
      const assessment_id = localStorage.getItem('assessment_id');
      if (!assessment_id) throw new Error('No assessment ID found. Please login again.');

      const response = await fetch(`http://127.0.0.1:8000/assessment/${assessment_id}/questions`)
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to fetch questions for this assessment')
      }
      const data = await response.json()
      setQuestionsJson(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // If we got data passed through state from system-check, use it directly
    if (location.state && Object.keys(location.state as object).length > 0) {
      setQuestionsJson(location.state)
      setLoading(false)
    } else {
      fetcher()
    }
  }, [])



  const isUniversity = QuestionsJson?.Assessment_Info?.category?.toLowerCase().includes('university') || localStorage.getItem('login_mode') === 'University';

  const sections = QuestionsJson ? [
    // Only show Gaming if it's NOT a university exam and is enabled
    ...(!isUniversity && QuestionsJson.Gaming_Config?.games?.[0]?.enabled ? [{ 
      key: 'gaming', 
      label: 'Game Assessments', 
      sub: 'Pipe Puzzle · Test your logic and problem solving', 
      tag: 'Games', tagColor: '#f97316', tagBg: '#fff7ed' 
    }] : []),
    
    // Only show MCQ if there are questions
    ...(QuestionsJson.MCQ_Questions?.length > 0 ? [{ 
      key: 'mcq', 
      label: 'Multiple Choice Questions', 
      sub: `Knowledge Check · ${QuestionsJson.MCQ_Questions.length} items`, 
      tag: 'MCQ', tagColor: '#6366f1', tagBg: '#eef2ff' 
    }] : []),
    
    // Only show Coding if there are questions
    ...(QuestionsJson.Coding_Questions?.length > 0 ? [{ 
      key: 'coding', 
      label: 'Coding Challenges', 
      sub: `Algorithm & Logic · ${QuestionsJson.Coding_Questions.length} challenges`, 
      tag: 'Programming', tagColor: '#3b82f6', tagBg: '#eff6ff' 
    }] : []),
    
    // Only show SQL if there are questions
    ...(QuestionsJson.SQL_Questions?.length > 0 ? [{ 
      key: 'sql', 
      label: 'SQL Database', 
      sub: `Queries · ${QuestionsJson.SQL_Questions.length} queries`, 
      tag: 'Database', tagColor: '#10b981', tagBg: '#ecfdf5' 
    }] : []),

    // Only show FITB if there are questions
    ...(QuestionsJson.FITB_Questions?.length > 0 ? [{ 
      key: 'fitb', 
      label: 'Fill in the Blanks', 
      sub: `Concepts · ${QuestionsJson.FITB_Questions.length} items`, 
      tag: 'Theory', tagColor: '#f59e0b', tagBg: '#fffbeb' 
    }] : []),
  ] : [];

  useEffect(() => {
    if (sections.length > 0) {
      localStorage.setItem('enabled_sections', JSON.stringify(sections));
    }
  }, [sections]);

  const handleSectionClick = (sectionKey: string) => {
    navigator(`/section/${sectionKey}`, {
      state: { ...QuestionsJson.Assessment_Info, ...QuestionsJson }
    });
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Virtusa topbar */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <img src="/virtusa-logo.svg" alt="Virtusa" style={{ height: '32px', display: 'block' }} />
      </header>

      <div className="flex items-start justify-center px-6 py-16">
        <div className="w-full max-w-2xl">

          {/* Header */}
          <div className="mb-12 pb-8 border-b border-gray-200">
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">
              Assessment Portal
            </p>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">
              {QuestionsJson?.Assessment_Info?.test_title || 'Your Test Sections'}
            </h1>
            <p className="text-[1.1rem] font-medium text-slate-600 mb-3">
              Welcome, {localStorage.getItem('candidate_name') || 'Candidate'}!
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Start your assessment with the below button, your progress is saved automatically.
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
              <p className="text-sm font-medium text-gray-500">Loading your assessment…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-400 text-xl">⚠</div>
              <p className="text-sm font-medium text-gray-600">Unable to load questions</p>
              <p className="text-xs text-gray-400">{error}</p>
            </div>
          )}

          {/* Section Cards */}
          {QuestionsJson && (
            <div className="flex flex-col gap-4">
              {sections.map((section, idx) => {
                const isCompleted = localStorage.getItem(`${section.key}_completed`) === 'true';
                const isPreviousCompleted = idx === 0 || localStorage.getItem(`${sections[idx-1].key}_completed`) === 'true';
                const isLocked = !isCompleted && !isPreviousCompleted;

                return (
                  <button
                    key={section.key}
                    onClick={() => !isLocked && handleSectionClick(section.key)}
                    disabled={isLocked}
                    className={`group relative bg-white border border-gray-200 rounded-2xl p-7 flex items-center gap-6 transition-all duration-200 ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer shadow-sm hover:shadow-md'}`}
                  >
                    {isCompleted && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    
                    {isLocked && (
                      <div className="absolute top-4 right-4 text-gray-300">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    )}

                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-1">{section.label}</p>
                      <p className="text-xs text-gray-400">{section.sub}</p>
                      <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full" style={{ color: section.tagColor, background: section.tagBg }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: section.tagColor }} />
                        {section.tag}
                      </span>
                    </div>
                  </button>
                )
              })}

              {/* Single Start button */}
              <div className="mt-4">
                <button
                  onClick={() => {
                    const firstSection = sections[0];
                    if (firstSection) {
                      handleSectionClick(firstSection.key);
                    }
                  }}
                  className="w-full py-3.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 active:scale-95 transition-all duration-150 cursor-pointer"
                >
                  Start Assessment →
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <p className="text-xs text-gray-400">All responses are encrypted and securely stored</p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default UserQuestionSections;