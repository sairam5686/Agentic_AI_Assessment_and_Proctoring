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



  const sections = QuestionsJson ? [
    { key: 'gaming', label: 'Game Assessments', sub: 'Pipe Puzzle · Test your logic and problem solving', tag: 'Games', tagColor: '#f97316', tagBg: '#fff7ed' },
    { key: 'mcq', label: 'Multiple Choice Questions', sub: `Knowledge Check · ${QuestionsJson.MCQ_Questions?.length ?? 0} items`, tag: 'MCQ', tagColor: '#6366f1', tagBg: '#eef2ff' },
    { key: 'coding', label: 'Coding Challenges', sub: 'Algorithm & Logic · Implement efficient solutions', tag: 'Programming', tagColor: '#3b82f6', tagBg: '#eff6ff' },
    { key: 'sql', label: 'SQL Database', sub: 'Queries · Test your database management skills', tag: 'Database', tagColor: '#10b981', tagBg: '#ecfdf5' },
  ] : [];


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

          {/* Section Cards — all shown at full detail, no locking */}
          {QuestionsJson && (
            <div className="flex flex-col gap-4">
              {sections.map((s, idx) => (
                <div
                  key={s.key}
                  className="bg-white border border-gray-200 rounded-2xl p-7 flex items-center gap-6 transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">{s.label}</p>
                    <p className="text-xs text-gray-400">{s.sub}</p>
                    <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full" style={{ color: s.tagColor, background: s.tagBg }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.tagColor }} />
                      {s.tag}
                    </span>
                  </div>
                </div>
              ))}

              {/* Single Start button */}
              <div className="mt-4">
                <button
                  onClick={() => navigator('/section/pipe-puzzle', {
                    state: { ...QuestionsJson.Assessment_Info, ...QuestionsJson }
                  })}
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