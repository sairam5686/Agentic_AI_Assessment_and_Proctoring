import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useLocalPersist } from '../hooks/useLocalPersist'
import API_USER_URL from '../Config/apiConfig'

const FitbSection = () => {
  const Locator = useLocation()
  const navigate = useNavigate()
  const state = Locator.state || {}

  const [assessmentState, setAssessmentState] = useState<any>(state)
  const assessment_id = assessmentState?.assessment_id || localStorage.getItem("assessment_id") || "default"

  useEffect(() => {
    if (Locator.state && Object.keys(Locator.state as any).length > 0) {
      localStorage.setItem(`fitb_data_${assessment_id}`, JSON.stringify(Locator.state))
      setAssessmentState(Locator.state)
    } else {
      const savedState = localStorage.getItem(`fitb_data_${assessment_id}`)
      if (savedState) {
        setAssessmentState(JSON.parse(savedState))
      }
    }
  }, [Locator.state, assessment_id])

  const FITB_Data = assessmentState.FITB_Questions || assessmentState
  const assessment = Array.isArray(FITB_Data) ? FITB_Data[0] : FITB_Data
  
  const sections = assessment?.sections || []
  const totalDurationSeconds = parseInt(assessment?.fitb_duration || '0') * 60

  const [activeSectionIdx, setActiveSectionIdx] = useState(0)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeSectionIdx]);

  const [answers, setAnswers, clearAnswers] = useLocalPersist<Record<string, string[]>>(`fitb_answers_${assessment_id}`, {})
  
  const [submitted, setSubmitted] = useState(false)
  const [lastSaved, setLastSaved] = useState<number>(Date.now())
  const [timeAgo, setTimeAgo] = useState("just now")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showGlobalFinishConfirm, setShowGlobalFinishConfirm] = useState(false)
  const [showUserInfo, setShowUserInfo] = useState(false)
  
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const saved = localStorage.getItem(`fitb_time_${assessment_id}`)
    if (saved) return parseInt(saved)
    return totalDurationSeconds > 0 ? totalDurationSeconds : 1800
  })

  useEffect(() => {
    if (timeLeft > 0 && !submitted) {
      localStorage.setItem(`fitb_time_${assessment_id}`, timeLeft.toString())
    }
  }, [timeLeft, assessment_id, submitted])

  useEffect(() => {
    const saved = localStorage.getItem(`fitb_time_${assessment_id}`)
    if (!saved && totalDurationSeconds > 0) {
      setTimeLeft(totalDurationSeconds)
    }
  }, [totalDurationSeconds, assessment_id])

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

  const handleBlankChange = (questionId: number, blankIdx: number, value: string) => {
    const currentAnswers = answers[questionId.toString()] || []
    const newAnswers = [...currentAnswers]
    newAnswers[blankIdx] = value
    setAnswers((prev) => ({ ...prev, [questionId.toString()]: newAnswers }))
    setLastSaved(Date.now())
    setTimeAgo("just now")
  }

  const handleSubmit = async () => {
    try {
      const email = localStorage.getItem("candidate_email") || "";
      const user_name = localStorage.getItem("candidate_name") || "";
      const allQuestions = sections.flatMap((s: any) => s.questions || [])

      const fitb_results = allQuestions.map((q: any) => {
        const userAnswers = answers[q.question_id.toString()] || [];
        const correctBlanks = q.blanks || []; // list[list[str]]
        
        let marksEarned = 0;
        const resultsPerBlank = correctBlanks.map((acceptedList: string[], idx: number) => {
          const userVal = (userAnswers[idx] || "").trim();
          const isCorrect = acceptedList.some(a => a.toLowerCase() === userVal.toLowerCase());
          if (isCorrect) marksEarned += (q.marks / q.blank_count);
          return {
            blank_index: idx,
            user_answer: userVal,
            is_correct: isCorrect
          };
        });

        if (!q.partial_marks && marksEarned < q.marks) marksEarned = 0;

        return {
          question_id: q.question_id,
          user_answers: userAnswers,
          results: resultsPerBlank,
          marks_earned: marksEarned
        };
      });

      const user_total_marks = fitb_results.reduce((acc: number, r: any) => acc + r.marks_earned, 0);
      const total_marks = allQuestions.reduce((acc: number, q: any) => acc + (q.marks || 1), 0);

      const payload = {
        assessment_id,
        user_name,
        email,
        FITB_Result: fitb_results,
        user_total_marks,
        total_marks
      };

      const response = await fetch(`${API_USER_URL}/api/fitb/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save FITB results");

      clearAnswers();
      localStorage.removeItem(`fitb_time_${assessment_id}`);
      localStorage.removeItem(`fitb_data_${assessment_id}`);
      localStorage.setItem("fitb_completed", "true");
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting FITB results:", error);
      alert("Error submitting results. Please try again.");
    }
  };

  const handleFinishAssessment = async () => {
    await handleSubmit();
    
    // Sequential Navigation Logic
    const enabledSectionsRaw = localStorage.getItem('enabled_sections');
    if (enabledSectionsRaw) {
      const enabledSections = JSON.parse(enabledSectionsRaw);
      const currentIdx = enabledSections.findIndex((s: any) => s.key === 'fitb');
      
      if (currentIdx !== -1 && currentIdx < enabledSections.length - 1) {
        // Move to next section
        const nextSection = enabledSections[currentIdx + 1];
        navigate(`/section/${nextSection.key}`, { state: { ...assessmentState } });
        return;
      }
    }
    
    // If last section or not found, go to submission
    navigate('/submission');
  }

  const renderQuestionText = (q: any) => {
    const parts = q.question_text.split('#blank#');
    return (
      <div className="flex flex-wrap items-center gap-y-3 leading-relaxed text-sm font-medium text-gray-800">
        {parts.map((part: string, idx: number) => (
          <React.Fragment key={idx}>
            <span>{part}</span>
            {idx < parts.length - 1 && (
              <input
                type="text"
                className="mx-2 px-3 py-1 border-b-2 border-gray-300 focus:border-indigo-500 outline-none transition-all w-32 text-center bg-gray-50 rounded-sm"
                placeholder={`blank ${idx + 1}`}
                value={(answers[q.question_id.toString()] || [])[idx] || ''}
                onChange={(e) => handleBlankChange(q.question_id, idx, e.target.value)}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const activeSection = sections[activeSectionIdx]
  const allQuestions = sections.flatMap((s: any) => s.questions || [])
  const timerColor = timeLeft < 60 ? 'text-red-500' : timeLeft < 300 ? 'text-amber-500' : 'text-gray-800'

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-2.5 flex items-center">
          <img src="/virtusa-logo.svg" alt="Virtusa" className="h-7 w-auto" />
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-100 animate-in fade-in zoom-in duration-300">
              <svg className="w-10 h-10 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Section Completed!</h2>
            <p className="text-sm text-gray-500 mb-8">Your responses have been recorded successfully.</p>
            <button
              onClick={handleFinishAssessment}
              className="w-full py-4 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-all cursor-pointer uppercase tracking-wide"
            >
              Continue to next step →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <img src="/virtusa-logo.svg" alt="Virtusa" className="h-7 w-auto" />
            <div className="h-8 w-px bg-gray-200" />
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-gray-900 leading-tight">{assessment?.test_title || "Fill in the Blanks"}</h1>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{localStorage.getItem("candidate_name") || "Candidate"}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <p className={`text-lg font-bold tabular-nums tracking-tight ${timerColor}`}>{formatTime(timeLeft)}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest -mt-1">Test Time</p>
            </div>
            <button onClick={() => setShowGlobalFinishConfirm(true)} className="px-5 py-2 bg-[#E31B23] text-white text-xs font-bold rounded-lg hover:bg-[#c4151c] transition-all uppercase tracking-wide">Finish Assessment</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 mb-6 flex-wrap">
            {sections.map((sec: any, idx: number) => (
              <button
                key={sec.section_id}
                onClick={() => setActiveSectionIdx(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${activeSectionIdx === idx ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
              >
                Section {idx + 1}
              </button>
            ))}
          </div>

          <div className="mb-6 pb-4 border-b border-gray-200">
            <p className="text-xs font-semibold tracking-widest uppercase text-amber-500 mb-1">Fill in the Blanks</p>
            <h2 className="text-lg font-bold text-gray-900">{activeSection?.section_name}</h2>
          </div>

          <div className="space-y-8">
            {(activeSection?.questions || []).map((q: any, qIdx: number) => (
              <div key={q.question_id} className="bg-white border border-gray-200 rounded-2xl p-8 hover:border-gray-300 transition-all duration-150 shadow-sm">
                <div className="flex items-start gap-4 mb-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-50 text-amber-600 text-xs font-bold flex items-center justify-center">{qIdx + 1}</span>
                  <div className="flex-1">
                    {renderQuestionText(q)}
                  </div>
                </div>
                <div className="mt-4 pl-11">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{q.marks} Marks · {q.difficulty}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-10">
            <button onClick={() => setActiveSectionIdx((i) => Math.max(i - 1, 0))} disabled={activeSectionIdx === 0} className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">← Previous</button>
            <button onClick={() => setActiveSectionIdx((i) => Math.min(i + 1, sections.length - 1))} disabled={activeSectionIdx === sections.length - 1} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">Next →</button>
          </div>
        </div>

        <aside className="w-64 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sticky top-24 shadow-sm">
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">Question Status</p>
            {sections.map((sec: any, sIdx: number) => (
              <div key={sec.section_id} className="mb-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Section {sIdx + 1}</p>
                <div className="flex flex-wrap gap-2">
                  {(sec.questions || []).map((q: any, qIdx: number) => {
                    const isAnswered = (answers[q.question_id.toString()] || []).filter(v => v && v.trim()).length > 0;
                    return (
                      <div
                        key={q.question_id}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center ${isAnswered ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}
                      >
                        {qIdx + 1}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <button onClick={handleFinishAssessment} className="w-full mt-5 py-3 bg-gray-900 text-white text-[10px] font-bold rounded-xl hover:bg-gray-700 active:scale-95 transition-all cursor-pointer uppercase tracking-widest">Submit</button>
          </div>
        </aside>
      </div>

      {showGlobalFinishConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-6">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Finish Section?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">Are you sure you want to submit your Fill in the Blanks responses?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowGlobalFinishConfirm(false)} className="flex-1 py-3 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all cursor-pointer">No, Continue</button>
              <button onClick={handleFinishAssessment} className="flex-1 py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md">Yes, Finish</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FitbSection
