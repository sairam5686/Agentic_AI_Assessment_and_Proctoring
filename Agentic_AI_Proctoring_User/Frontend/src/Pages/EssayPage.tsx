import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'
import Editor from '@monaco-editor/react'
import 'react-toastify/dist/ReactToastify.css'
import API_USER_URL from '../Config/apiConfig'

// ─── TypeScript interfaces ────────────────────────────────────────────────────

interface SectionResult {
  score: number
  max: number
  feedback: string
  strengths: string
  improvement: string
}

interface EssaySections {
  [key: string]: SectionResult
}

interface EssayEvaluation {
  total_score: number
  grade: string
  overall_feedback: string
  originality_note: string
  sections: EssaySections
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Use a dynamic API_BASE to handle different network environments (localhost vs IP)
const API_BASE = API_USER_URL;
const MIN_WORDS = 200

// ─── Helper utilities ─────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Main component ───────────────────────────────────────────────────────────

const EssayPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state || {}) as Record<string, any>

  // Resolve candidate data
  const topic: string =
    state?.essay_topic ||
    state?.Assessment_Info?.essay_topic ||
    localStorage.getItem('essay_topic') ||
    'The Impact of Artificial Intelligence on Modern Society'

  const description: string =
    state?.essay_description ||
    state?.Assessment_Info?.essay_description ||
    localStorage.getItem('essay_description') ||
    'Write a comprehensive essay discussing the transformative effects of AI across various sectors.'

  const rubric: any =
    state?.essay_rubric ||
    state?.Assessment_Info?.essay_rubric ||
    JSON.parse(localStorage.getItem('essay_rubric') || 'null')

  const candidateId: string =
    state?.candidate_id ||
    localStorage.getItem('candidate_email') ||
    ''

  const examId: string =
    state?.assessment_id ||
    localStorage.getItem('assessment_id') ||
    ''

  const testTitle: string =
    state?.test_title ||
    state?.Assessment_Info?.test_title ||
    'Essay Assessment'

  const essayDuration = parseInt(state?.essay_duration || state?.Assessment_Info?.essay_duration || '30') * 60

  // ── Component state ─────────────────────────────────────────────────────────
  const [essayText, setEssayText] = useState(() => {
    return localStorage.getItem(`essay_content_${examId}`) || ''
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(() => {
    return localStorage.getItem('essay_completed') === 'true'
  })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastSaved, setLastSaved] = useState<number>(Date.now())
  const [timeAgo, setTimeAgo] = useState("just now")
  
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const saved = localStorage.getItem(`essay_time_${examId}`)
    if (saved) return parseInt(saved)
    return essayDuration > 0 ? essayDuration : 1800 // Default 30m
  })

  const wordCount = useMemo(() => countWords(essayText), [essayText])
  const wordsMet = wordCount >= MIN_WORDS
  const wordsLeft = Math.max(0, MIN_WORDS - wordCount)

  // ── Effects ───────────────────────────────────────────────────────────────

  // Persist essay content
  useEffect(() => {
    if (essayText && !submitted) {
      localStorage.setItem(`essay_content_${examId}`, essayText)
    }
  }, [essayText, examId, submitted])

  // Sync timeLeft with localStorage
  useEffect(() => {
    if (timeLeft > 0 && !submitted) {
      localStorage.setItem(`essay_time_${examId}`, timeLeft.toString())
    }
  }, [timeLeft, examId, submitted])

  // Timer interval
  useEffect(() => {
    if (submitted || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { 
          clearInterval(interval)
          // Auto submit on timeout
          handleSubmit()
          return 0 
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [submitted])

  // Time ago interval
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - lastSaved) / 1000)
      if (diff < 5) setTimeAgo("just now")
      else if (diff < 60) setTimeAgo(`${diff} seconds ago`)
      else setTimeAgo(`${Math.floor(diff / 60)} minutes ago`)
    }, 5000)
    return () => clearInterval(interval)
  }, [lastSaved])

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEditorChange = (value: string | undefined) => {
    setEssayText(value || '')
    setLastSaved(Date.now())
    setTimeAgo("just now")
  }

  const handleSubmit = async () => {
    if (!wordsMet || loading) return

    setLoading(true)
    try {
      const payload = {
        essay_text: essayText,
        topic: topic,
        email: candidateId, // candidateId variable holds the email
        assessment_id: examId,
        user_name: localStorage.getItem("candidate_name") || "Candidate",
      }

      const res = await fetch(`${API_BASE}/api/essay/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.status === 429) {
        toast.error("Submission rate limit reached. Please wait a moment before trying again.", {
          position: "top-right",
          theme: "colored"
        });
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown server error' }))
        throw new Error(err.detail || `Server error ${res.status}`)
      }

      localStorage.setItem('essay_completed', 'true')
      localStorage.removeItem(`essay_time_${examId}`)
      setSubmitted(true)
      toast.success('Essay submitted successfully!')
    } catch (err: any) {
      console.error('[ESSAY SUBMIT ERROR]', err)
      toast.error(err.message || 'Failed to submit essay. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = () => {
    const enabledSectionsRaw = localStorage.getItem('enabled_sections')
    if (enabledSectionsRaw) {
      const enabledSections = JSON.parse(enabledSectionsRaw)
      const currentIdx = enabledSections.findIndex((s: any) => s.key === 'essay')
      if (currentIdx !== -1 && currentIdx < enabledSections.length - 1) {
        const nextSection = enabledSections[currentIdx + 1]
        navigate('/guiding-page', { state: { ...state, nextSection: nextSection.label } })
        return
      }
    }
    navigate('/guiding-page', { state: { ...state, nextSection: 'Finish' } })
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const timerColor = timeLeft < 60 ? 'text-red-500' : timeLeft < 300 ? 'text-amber-500' : 'text-gray-800'

  // ──────────────────────────────────────────────────────────────────────────
  // SUCCESS VIEW
  // ──────────────────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center">
          <img src="/virtusa-logo.svg" alt="Virtusa" className="h-7 w-auto" />
        </header>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6 text-4xl shadow-sm border border-green-100">
              ✅
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Essay Submitted!</h2>
            <p className="text-sm text-gray-500 mb-8">Your essay has been recorded and is ready for evaluation.</p>
            
            <button
              onClick={handleContinue}
              className="w-full py-4 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 active:scale-95 transition-all duration-150 cursor-pointer uppercase tracking-wide"
            >
              Continue to next step →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN WRITING VIEW
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-hidden h-screen">
      <ToastContainer />

      {/* ── Top Nav (Standard Header) ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-[1600px] mx-auto px-6 py-2.5 flex items-center justify-between">
          
          {/* Left: Logo & Assessment Info */}
          <div className="flex items-center gap-8">
            <img src="/virtusa-logo.svg" alt="Virtusa" className="h-8 w-auto" />
            <div className="h-10 w-px bg-gray-200" />
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <h1 className="text-base font-bold text-gray-900 leading-tight">{testTitle}</h1>
                <p className="text-[12px] font-bold text-gray-500 uppercase tracking-widest">
                  {localStorage.getItem("candidate_name") || "Candidate"}
                </p>
              </div>

              <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[11px] font-bold text-gray-500 italic uppercase tracking-wider">
                  Saved {timeAgo}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Timer & Global Controls */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <p className={`text-lg font-bold tabular-nums tracking-tight ${timerColor}`}>
                {formatTime(timeLeft)}
              </p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest -mt-1">Test Time</p>
            </div>

            <div className="h-8 w-px bg-gray-200" />

            <div className="flex items-center gap-3">
              <button 
                onClick={toggleFullscreen}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                )}
              </button>

              <button
                onClick={() => {
                   if(confirm("Are you sure you want to finish the assessment?")) {
                      handleSubmit().then(() => {
                        navigate('/guiding-page', { state: { ...state, nextSection: 'Finish' } });
                      });
                   }
                }}
                className="px-5 py-2 bg-[#E31B23] text-white text-xs font-bold rounded-lg hover:bg-[#c4151c] shadow-sm transition-all active:scale-95 uppercase tracking-wide"
              >
                Finish Assessment
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Split Layout ── */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 113px)' }}>
        
        {/* ── Left: Instructions Panel ── */}
        <div className="w-96 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto">
            <h2 className="text-xs font-bold tracking-widest uppercase text-indigo-500 mb-4">Description</h2>
            <div className="prose prose-sm max-w-none text-gray-600 mb-8 whitespace-pre-wrap leading-relaxed">
              {description}
            </div>

            <h2 className="text-xs font-bold tracking-widest uppercase text-indigo-500 mb-2">Topic</h2>
            <p className="text-lg font-extrabold text-gray-900 leading-snug mb-8">
              {topic}
            </p>

            <h2 className="text-xs font-bold tracking-widest uppercase text-indigo-500 mb-4">Essay Format & Rubric</h2>
            <div className="space-y-6">
              {rubric?.sections ? Object.entries(rubric.sections).map(([key, sec]: [string, any], idx) => (
                <div key={key} className="relative pl-6 border-l-2 border-indigo-100">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-gray-800">{idx + 1}. {sec.name}</p>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {sec.max_marks} Points
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {sec.criteria?.map((c: string, cidx: number) => (
                      <li key={cidx} className="flex items-start gap-2 text-xs text-gray-500 leading-normal">
                        <span className="mt-1 w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )) : (
                <p className="text-xs text-gray-400 italic">No detailed rubric provided.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Editor Panel ── */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          
          {/* Editor Tab Bar */}
          <div className="bg-gray-100 border-b border-gray-200 flex items-center px-4 flex-shrink-0">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-xs font-semibold border-t-2 border-indigo-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              essay.txt
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 relative border-b border-gray-200">
            <Editor
              height="100%"
              defaultLanguage="plaintext"
              theme="light"
              value={essayText}
              onChange={handleEditorChange}
              options={{
                fontSize: 15,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                padding: { top: 20, bottom: 20 },
                automaticLayout: true,
                fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
              }}
            />
          </div>

          {/* Editor Footer / Word Count Info & Submit Button */}
          <div className="bg-white px-6 py-3 flex items-center justify-between flex-shrink-0 border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Word Count</span>
                <p className={`text-sm font-bold ${wordsMet ? 'text-green-600' : 'text-amber-600'}`}>
                  {wordCount} / {MIN_WORDS} <span className="text-xs font-medium text-gray-400 ml-1">{wordsMet ? '(Met ✓)' : `(${wordsLeft} more needed)`}</span>
                </p>
              </div>
              <div className="h-8 w-px bg-gray-100" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Format</span>
                <p className="text-xs font-semibold text-gray-600 uppercase">Plain Text</p>
              </div>
            </div>

            <button
              id="essay-submit-btn-bottom"
              onClick={handleSubmit}
              disabled={!wordsMet || loading}
              className="flex items-center gap-3 px-8 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-gray-700 active:scale-[0.98] uppercase tracking-wide shadow-md"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-[100] gap-5">
          <div className="bg-white border border-gray-200 rounded-2xl px-10 py-10 flex flex-col items-center gap-5 shadow-xl max-w-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl animate-pulse">
              🚀
            </div>
            <div>
              <p className="text-base font-bold text-gray-900 mb-1">Submitting your essay...</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Please wait while we record your response.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EssayPage

