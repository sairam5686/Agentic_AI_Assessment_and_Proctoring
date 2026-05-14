import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLocalPersist } from '../hooks/useLocalPersist'
import API_USER_URL from '../Config/apiConfig'

const McqSection = () => {
  const Locator = useLocation()
  const navigate = useNavigate()
  const state = Locator.state || {}

  // Handle state persistence and recovery
  const [assessmentState, setAssessmentState] = useState<any>(state)
  const assessment_id = assessmentState?.assessment_id || localStorage.getItem("assessment_id") || "default"

  useEffect(() => {
    // If state is present in Locator, save it for recovery
    if (Locator.state && Object.keys(Locator.state as any).length > 0) {
      localStorage.setItem(`assessment_data_${assessment_id}`, JSON.stringify(Locator.state))
      setAssessmentState(Locator.state)
    } else {
      // If state is missing (refresh), try to recover from localStorage
      const savedState = localStorage.getItem(`assessment_data_${assessment_id}`)
      if (savedState) {
        setAssessmentState(JSON.parse(savedState))
      }
    }
  }, [Locator.state, assessment_id])

  // Handle both full assessment object and standalone MCQ questions array
  const McqQuestion = assessmentState.MCQ_Questions || assessmentState
  const assessment = Array.isArray(McqQuestion) ? McqQuestion[0] : McqQuestion

  const sections = assessment?.sections || []
  const totalDurationSeconds = parseInt(assessment?.mcq_duration || '0') * 60

  const [activeSectionIdx, setActiveSectionIdx] = useState(0)
  const [answers, setAnswers, clearAnswers] = useLocalPersist<Record<number, string>>(`mcq_answers_${assessment_id}`, {})
  
  const [submitted, setSubmitted] = useState(false)
  const [lastSaved, setLastSaved] = useState<number>(Date.now())
  const [timeAgo, setTimeAgo] = useState("just now")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showGlobalFinishConfirm, setShowGlobalFinishConfirm] = useState(false)
  const [showUserInfo, setShowUserInfo] = useState(false)
  
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const saved = localStorage.getItem(`mcq_time_${assessment_id}`)
    if (saved) return parseInt(saved)
    return totalDurationSeconds > 0 ? totalDurationSeconds : 1800 // Default 30m if not yet loaded
  })

  // Sync timeLeft with localStorage
  useEffect(() => {
    if (timeLeft > 0 && !submitted) {
      localStorage.setItem(`mcq_time_${assessment_id}`, timeLeft.toString())
    }
  }, [timeLeft, assessment_id, submitted])

  // If totalDurationSeconds becomes available and we haven't started yet
  useEffect(() => {
    const saved = localStorage.getItem(`mcq_time_${assessment_id}`)
    if (!saved && totalDurationSeconds > 0) {
      setTimeLeft(totalDurationSeconds)
    }
  }, [totalDurationSeconds, assessment_id])

  const activeSection = sections[activeSectionIdx]
  const allQuestions = sections.flatMap((s: any) => s.questions)
  const totalQuestions = assessment?.total_questions || allQuestions.length
  const answeredCount = Object.keys(answers).length

  useEffect(() => {
    if (submitted || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); handleSubmit(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [submitted, timeLeft])

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

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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

  const handleAnswer = (questionId: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
    setLastSaved(Date.now())
    setTimeAgo("just now")
  }

  const handleSubmit = async () => {
    try {
      const email = localStorage.getItem("candidate_email") || "";
      const user_name = localStorage.getItem("candidate_name") || "";

      const mcq_results = allQuestions.map((q: any) => {
        const userAnswer = answers[q.question_id] || "";
        const correctAnswer = q.correct_answer || q.answer || q.Correct_answer || "";
        const mark = userAnswer === correctAnswer ? (q.marks || 1) : 0;

        return {
          question_id: q.question_id,
          Correct_answer: correctAnswer,
          user_answer: userAnswer,
          Mark: mark
        };
      });

      const user_total_marks = mcq_results.reduce((acc: number, r: any) => acc + r.Mark, 0);
      const total_marks = allQuestions.reduce((acc: number, q: any) => acc + (q.marks || 1), 0);

      const payload = {
        assessment_id,
        user_name,
        email,
        MCQ_Result: mcq_results,
        user_total_marks,
        total_marks
      };

      const response = await fetch(`${API_USER_URL}/api/mcq/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save MCQ results");
      }

      // Cleanup local persistence on success
      clearAnswers();
      localStorage.removeItem(`mcq_time_${assessment_id}`);
      localStorage.removeItem(`assessment_data_${assessment_id}`);

      localStorage.setItem("mcq_completed", "true");
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting MCQ results:", error);
      alert("Error submitting results. Please try again.");
    }
  };

  const handleNextFlow = () => {
    localStorage.setItem('mcq_completed', 'true');
    
    const enabledSectionsRaw = localStorage.getItem('enabled_sections');
    if (enabledSectionsRaw) {
      const enabledSections = JSON.parse(enabledSectionsRaw);
      const currentIdx = enabledSections.findIndex((s: any) => s.key === 'mcq');
      
      if (currentIdx !== -1 && currentIdx < enabledSections.length - 1) {
        const nextSection = enabledSections[currentIdx + 1];
        navigate(`/section/${nextSection.key}`, { state: { ...state } });
        return;
      }
    }
    navigate('/submission');
  }

  const handleFinishAssessment = async () => {
    await handleSubmit();
    handleNextFlow();
  }

  const timerColor =
    timeLeft < 60 ? 'text-red-500' : timeLeft < 300 ? 'text-amber-500' : 'text-gray-800'

  // ─── Thank You Screen ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-2.5 flex items-center">
          <img src="/virtusa-logo.svg" alt="Virtusa" className="h-7 w-auto" />
        </header>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6 text-4xl shadow-sm border border-green-100" />

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Section Completed!</h2>
            <p className="text-sm text-gray-500 mb-8">
              Your MCQ responses have been recorded successfully.
            </p>

            <button
              onClick={handleNextFlow}
              className="w-full py-4 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 active:scale-95 transition-all duration-150 cursor-pointer uppercase tracking-wide"
            >
              Continue to next step →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Main Test UI ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-2.5 flex items-center justify-between">
          
          {/* Left: Logo & Assessment Info */}
          <div className="flex items-center gap-5">
            <img src="/virtusa-logo.svg" alt="Virtusa" className="h-7 w-auto" />
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-gray-900 leading-tight">
                  {assessment?.test_title || "Technical Assessment"}
                </h1>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  {localStorage.getItem("candidate_name") || "Candidate"}
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-gray-500 italic uppercase">
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

              <div className="relative">
                <button 
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                  title="Candidate Info"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </button>

                {showUserInfo && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-[100] animate-in fade-in zoom-in duration-200">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Candidate Details</p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Name</p>
                        <p className="text-xs font-bold text-gray-800">{localStorage.getItem("candidate_name")}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Email</p>
                        <p className="text-xs font-bold text-gray-800">{localStorage.getItem("candidate_email")}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Assessment ID</p>
                        <p className="text-xs font-mono font-bold text-gray-800">{assessment?.assessment_id || localStorage.getItem("assessment_id")}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowGlobalFinishConfirm(true)}
                className="px-5 py-2 bg-[#E31B23] text-white text-xs font-bold rounded-lg hover:bg-[#c4151c] shadow-sm transition-all active:scale-95 uppercase tracking-wide"
              >
                Finish Assessment
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">

        {/* Left: Section Tabs + Questions */}
        <div className="flex-1 min-w-0">

          {/* Section Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {sections.map((sec: any, idx: number) => {
              const secAnswered = sec.questions.filter((q: any) => answers[q.question_id]).length
              return (
                <button
                  key={sec.section_id}
                  onClick={() => setActiveSectionIdx(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 border cursor-pointer ${activeSectionIdx === idx
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                >
                  Section {idx + 1}
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${activeSectionIdx === idx ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {secAnswered}/{sec.questions.length}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Section Title */}
          <div className="mb-6 pb-4 border-b border-gray-200">
            <p className="text-xs font-semibold tracking-widest uppercase text-indigo-500 mb-1">
              Section {activeSectionIdx + 1}
            </p>
            <h2 className="text-lg font-bold text-gray-900">{activeSection?.section_name}</h2>
          </div>

          {/* Questions */}
          <div className="space-y-8">
            {activeSection?.questions.map((q: any, qIdx: number) => {
              const globalIdx = sections
                .slice(0, activeSectionIdx)
                .reduce((acc: number, s: any) => acc + s.questions.length, 0) + qIdx + 1

              return (
                <div id={`q-${q.question_id}`} key={q.question_id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 transition-all duration-150">
                  <div className="flex items-start gap-4 mb-5">
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">
                      {globalIdx}
                    </span>
                    <p className="text-sm font-medium text-gray-800 leading-relaxed">{q.question_text}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pl-11">
                    {Object.entries(q.options).map(([key, value]) => {
                      const optionVal = value as string
                      const isSelected = answers[q.question_id] === optionVal
                      return (
                        <button
                          key={key}
                          onClick={() => handleAnswer(q.question_id, optionVal)}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150 cursor-pointer ${isSelected
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-800 font-semibold'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/40'
                            }`}
                        >
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-xs font-bold mr-3 ${isSelected ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                            {key}
                          </span>
                          {optionVal.replace(/^[A-D]\)\s*/, '')}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-4 pl-11">
                    <span className="text-xs text-gray-400 font-medium">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Section Nav */}
          <div className="flex justify-between mt-10">
            <button
              onClick={() => setActiveSectionIdx((i) => Math.max(i - 1, 0))}
              disabled={activeSectionIdx === 0}
              className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              ← Previous Section
            </button>
            <button
              onClick={() => setActiveSectionIdx((i) => Math.min(i + 1, sections.length - 1))}
              disabled={activeSectionIdx === sections.length - 1}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Next Section →
            </button>
          </div>
        </div>

        {/* Right: Question Palette */}
        <aside className="w-64 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sticky top-24">
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">Question Palette</p>

            {sections.map((sec: any, sIdx: number) => (
              <div key={sec.section_id} className="mb-5">
                <p className="text-xs font-semibold text-gray-500 mb-2">Section {sIdx + 1}</p>
                <div className="flex flex-wrap gap-2">
                  {sec.questions.map((q: any, qIdx: number) => {
                    const isAnswered = !!answers[q.question_id]
                    const isActive = activeSectionIdx === sIdx
                    return (
                      <button
                        key={q.question_id}
                        onClick={() => {
                          setActiveSectionIdx(sIdx)
                          setTimeout(() => {
                            document.getElementById(`q-${q.question_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }, 50)
                        }}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${isAnswered
                          ? 'bg-indigo-500 text-white'
                          : isActive
                            ? 'bg-gray-100 text-gray-600 border border-gray-300'
                            : 'bg-gray-100 text-gray-400'
                          }`}
                      >
                        {qIdx + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-indigo-500 flex-shrink-0" />
                <p className="text-xs text-gray-500">Answered</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-gray-100 border border-gray-300 flex-shrink-0" />
                <p className="text-xs text-gray-500">Not answered</p>
              </div>
              <button
                onClick={handleSubmit}
                className="w-full mt-5 py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-gray-700 active:scale-95 transition-all cursor-pointer uppercase tracking-wide"
              >
                Submit
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Global Finish Confirm Modal */}
      {showGlobalFinishConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-6">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-100">
            <div className="h-4" />
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Finish Entire Assessment?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              You are about to conclude all sections. This will submit your current answers and end the assessment. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGlobalFinishConfirm(false)}
                className="flex-1 py-3 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all cursor-pointer uppercase tracking-wide"
              >
                No, Continue
              </button>
              <button
                onClick={handleFinishAssessment}
                className="flex-1 py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer uppercase tracking-wide shadow-md"
              >
                Yes, Finish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default McqSection