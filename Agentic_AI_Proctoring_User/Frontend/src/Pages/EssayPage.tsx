import { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// ─── TypeScript interfaces ────────────────────────────────────────────────────

interface SectionResult {
  score: number
  max: number
  feedback: string
  strengths: string
  improvement: string
}

interface EssaySections {
  introduction: SectionResult
  content_analysis: SectionResult
  examples_evidence: SectionResult
  conclusion: SectionResult
}

interface EssayEvaluation {
  total_score: number
  grade: string
  overall_feedback: string
  originality_note: string
  sections: EssaySections
}

interface EssayApiResponse {
  status: string
  candidate_id: string
  exam_id: string
  topic: string
  result: EssayEvaluation
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_META: {
  key: keyof EssaySections
  label: string
  icon: string
  accent: string
  bg: string
}[] = [
  { key: 'introduction',     label: 'Introduction',       icon: '📖', accent: '#6366f1', bg: '#eef2ff' },
  { key: 'content_analysis', label: 'Content & Analysis', icon: '🧠', accent: '#3b82f6', bg: '#eff6ff' },
  { key: 'examples_evidence',label: 'Examples & Evidence',icon: '🔍', accent: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'conclusion',       label: 'Conclusion',         icon: '🏁', accent: '#10b981', bg: '#ecfdf5' },
]

const GRADE_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  A:   { text: '#15803d', bg: '#dcfce7', border: '#86efac' },
  'B+':{ text: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
  B:   { text: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
  C:   { text: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
  F:   { text: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
}

const API_BASE = 'http://127.0.0.1:8000'
const MIN_WORDS = 200

// ─── Helper utilities ─────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

function ScoreBar({ score, max, accent }: { score: number; max: number; accent: string }) {
  const pct = Math.round((score / max) * 100)
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
      <div
        className="h-2 rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: accent }}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const EssayPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state || {}) as Record<string, any>

  // Resolve candidate data from router state → localStorage fallback
  const topic: string =
    state?.essay_topic ||
    state?.Assessment_Info?.essay_topic ||
    localStorage.getItem('essay_topic') ||
    'The Impact of Artificial Intelligence on Modern Society'

  const candidateId: string =
    state?.candidate_id ||
    localStorage.getItem('candidate_email') ||
    ''

  const examId: string =
    state?.assessment_id ||
    localStorage.getItem('assessment_id') ||
    ''

  // ── Component state ─────────────────────────────────────────────────────────
  const [essayText, setEssayText]     = useState('')
  const [loading, setLoading]         = useState(false)
  const [evaluation, setEvaluation]   = useState<EssayEvaluation | null>(null)
  const [submitted, setSubmitted]     = useState(false)

  const wordCount  = useMemo(() => countWords(essayText), [essayText])
  const wordsMet   = wordCount >= MIN_WORDS
  const wordsLeft  = Math.max(0, MIN_WORDS - wordCount)

  // ── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!wordsMet || loading) return

    setLoading(true)
    try {
      const payload = {
        essay_text:   essayText,
        topic:        topic,
        candidate_id: candidateId,
        exam_id:      examId,
      }

      const res = await fetch(`${API_BASE}/api/essay/evaluate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown server error' }))
        throw new Error(err.detail || `Server error ${res.status}`)
      }

      const data: EssayApiResponse = await res.json()
      setEvaluation(data.result)
      setSubmitted(true)

      // Mark section complete for sequential navigation
      localStorage.setItem('essay_completed', 'true')
    } catch (err: any) {
      toast.error(err.message || 'Failed to evaluate essay. Please try again.', {
        position: 'top-right',
        autoClose: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  // ── Navigate to next section ────────────────────────────────────────────────
  const handleContinue = () => {
    const enabledSectionsRaw = localStorage.getItem('enabled_sections')
    if (enabledSectionsRaw) {
      const enabledSections = JSON.parse(enabledSectionsRaw)
      const currentIdx = enabledSections.findIndex((s: any) => s.key === 'essay')
      if (currentIdx !== -1 && currentIdx < enabledSections.length - 1) {
        const nextSection = enabledSections[currentIdx + 1]
        navigate(`/section/${nextSection.key}`, { state })
        return
      }
    }
    navigate('/submission')
  }

  const gradeStyle = evaluation ? (GRADE_STYLES[evaluation.grade] ?? GRADE_STYLES['B']) : null

  // ──────────────────────────────────────────────────────────────────────────
  // RESULTS VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (submitted && evaluation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ToastContainer />

        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/virtusa-logo.svg" alt="Virtusa" className="h-7 w-auto" />
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <p className="text-xs font-bold text-gray-900">Essay Evaluation</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  {localStorage.getItem('candidate_name') || 'Candidate'}
                </p>
              </div>
            </div>
            <button
              id="essay-continue-btn"
              onClick={handleContinue}
              className="px-5 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-700 transition-all cursor-pointer"
            >
              Continue →
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

          {/* Score hero card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row md:items-center gap-8">
            {/* Total score ring */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="relative w-28 h-28">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                  <circle cx="56" cy="56" r="48" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                  <circle
                    cx="56" cy="56" r="48" fill="none"
                    stroke="#6366f1" strokeWidth="10"
                    strokeDasharray={`${(evaluation.total_score / 50) * 301.59} 301.59`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-gray-900">{evaluation.total_score}</span>
                  <span className="text-xs font-semibold text-gray-400">/ 50</span>
                </div>
              </div>
              {/* Grade badge */}
              <span
                id="essay-grade-badge"
                className="px-4 py-1.5 rounded-full text-sm font-extrabold border"
                style={{
                  color: gradeStyle!.text,
                  background: gradeStyle!.bg,
                  borderColor: gradeStyle!.border,
                }}
              >
                {evaluation.grade}
              </span>
            </div>

            {/* Feedback block */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Overall Feedback</p>
              <p className="text-sm text-gray-700 leading-relaxed">{evaluation.overall_feedback}</p>

              {/* Originality note */}
              <div className="mt-4 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <span className="text-base mt-0.5">💡</span>
                <div>
                  <p className="text-xs font-bold text-blue-700 mb-0.5">Originality Note</p>
                  <p className="text-xs text-blue-600 leading-relaxed">{evaluation.originality_note}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SECTION_META.map(({ key, label, icon, accent, bg }) => {
              const sec = evaluation.sections[key]
              return (
                <div
                  key={key}
                  id={`essay-section-${key}`}
                  className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Section header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                        style={{ background: bg }}
                      >
                        {icon}
                      </span>
                      <p className="text-sm font-bold text-gray-900">{label}</p>
                    </div>
                    <span
                      className="text-sm font-extrabold px-2.5 py-1 rounded-lg"
                      style={{ color: accent, background: bg }}
                    >
                      {sec.score}/{sec.max}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <ScoreBar score={sec.score} max={sec.max} accent={accent} />

                  {/* Feedback */}
                  <p className="text-xs text-gray-600 leading-relaxed mt-3">{sec.feedback}</p>

                  {/* Strength */}
                  <div className="mt-3 flex items-start gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
                    <span className="text-green-500 text-sm mt-0.5 flex-shrink-0">✓</span>
                    <p className="text-xs text-green-700 leading-relaxed">{sec.strengths}</p>
                  </div>

                  {/* Improvement */}
                  <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                    <span className="text-amber-500 text-sm mt-0.5 flex-shrink-0">→</span>
                    <p className="text-xs text-amber-700 leading-relaxed">{sec.improvement}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom continue */}
          <div className="flex justify-end pb-8">
            <button
              onClick={handleContinue}
              className="px-8 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-700 transition-all cursor-pointer"
            >
              Continue to Next Section →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // WRITING VIEW
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/virtusa-logo.svg" alt="Virtusa" className="h-7 w-auto" />
            <div className="h-6 w-px bg-gray-200" />
            <div>
              <p className="text-xs font-bold text-gray-900">Essay Section</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                {localStorage.getItem('candidate_name') || 'Candidate'}
              </p>
            </div>
          </div>
          {/* Live word count pill in header */}
          <div
            id="essay-word-count-pill"
            className="px-4 py-1.5 rounded-full text-xs font-bold border transition-all"
            style={
              wordsMet
                ? { color: '#15803d', background: '#dcfce7', borderColor: '#86efac' }
                : { color: '#b45309', background: '#fef3c7', borderColor: '#fcd34d' }
            }
          >
            {wordCount} / {MIN_WORDS} words
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Topic card */}
        <div className="bg-white border border-gray-200 rounded-2xl px-8 py-7 mb-6 shadow-sm">
          <p className="text-xs font-bold tracking-widest uppercase text-indigo-500 mb-2">Essay Topic</p>
          <h1 className="text-xl font-extrabold text-gray-900 leading-snug">{topic}</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Write a well-structured essay. Your response will be evaluated on Introduction,
            Content &amp; Analysis, Examples &amp; Evidence, and Conclusion — 50 marks total.
          </p>
        </div>

        {/* Rubric quick reference */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {SECTION_META.map(({ label, icon, accent, bg, key }) => {
            const maxMarks = key === 'content_analysis' ? 20 : 10
            return (
              <div
                key={key}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm"
              >
                <span className="text-base">{icon}</span>
                <div>
                  <p className="text-[10px] font-semibold text-gray-500">{label}</p>
                  <p className="text-sm font-extrabold" style={{ color: accent }}>
                    {maxMarks} marks
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Textarea card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Essay</p>
            <span
              id="essay-word-count-inline"
              className="text-xs font-bold transition-colors"
              style={{ color: wordsMet ? '#16a34a' : '#dc2626' }}
            >
              {wordCount} words
              {!wordsMet && wordsLeft > 0 && (
                <span className="ml-1 font-medium text-gray-400">
                  ({wordsLeft} more needed)
                </span>
              )}
              {wordsMet && <span className="ml-1">✓</span>}
            </span>
          </div>

          <textarea
            id="essay-textarea"
            value={essayText}
            onChange={(e) => setEssayText(e.target.value)}
            disabled={loading}
            placeholder={`Begin your essay on "${topic}" here...\n\nTip: Start with a clear introduction that states your purpose. Aim for at least 200 words.`}
            className="w-full min-h-[420px] px-6 py-5 text-sm text-gray-800 leading-relaxed resize-none outline-none placeholder:text-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontFamily: 'inherit' }}
          />

          {/* Bottom bar of textarea */}
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            {/* Word count progress bar */}
            <div className="flex-1 mr-6">
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (wordCount / MIN_WORDS) * 100)}%`,
                    background: wordsMet ? '#16a34a' : '#f59e0b',
                  }}
                />
              </div>
            </div>
            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
              Min. {MIN_WORDS} words required
            </span>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex flex-col items-end gap-2">
          {!wordsMet && essayText.length > 0 && (
            <p className="text-xs text-red-500 font-medium">
              Please write at least {MIN_WORDS} words before submitting ({wordsLeft} words remaining).
            </p>
          )}

          <button
            id="essay-submit-btn"
            onClick={handleSubmit}
            disabled={!wordsMet || loading}
            className="flex items-center gap-3 px-8 py-3.5 bg-gray-900 text-white text-sm font-bold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-gray-700 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>AI is evaluating your essay…</span>
              </>
            ) : (
              <>
                <span>Submit for AI Evaluation</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-50 gap-5">
            <div className="bg-white border border-gray-200 rounded-2xl px-10 py-10 flex flex-col items-center gap-5 shadow-xl max-w-sm text-center">
              {/* Animated AI brain icon */}
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl animate-pulse">
                🧠
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 mb-1">AI is evaluating your essay…</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Analysing introduction, content, examples, and conclusion against the rubric.
                  This usually takes 5–10 seconds.
                </p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EssayPage
