import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'react-toastify'
import Editor from '@monaco-editor/react'
import { useLocalPersist } from '../hooks/useLocalPersist'
import API_USER_URL from '../Config/apiConfig'

const LANGUAGE_TEMPLATES: Record<string, string> = {
  Python: `# Write your solution here\ndef solution():\n    pass\n`,
  Java: `// Write your solution here\npublic class Solution {\n    public static void main(String[] args) {\n        // your code\n    }\n}\n`,
  'C++': `// Write your solution here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // your code\n    return 0;\n}\n`,
  JavaScript: `// Write your solution here\nfunction solution() {\n    // your code\n}\n`,
}

const LANGUAGE_MAP: Record<string, string> = {
  Python: 'python',
  Java: 'java',
  'C++': 'cpp',
  JavaScript: 'javascript',
}

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: 'bg-green-50 text-green-600 border-green-200',
  Medium: 'bg-amber-50 text-amber-600 border-amber-200',
  Hard: 'bg-red-50 text-red-600 border-red-200',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisibleTestcaseResult {
  title: string
  input: string
  expected_output: string
  your_output: string
  passed: boolean
  marks: number
}

interface RunResult {
  visible_testcases: VisibleTestcaseResult[]
  hidden_summary: {
    total: number
    passed: number
  }
  all_testcase_results?: any[] // Added for detailed storage
  total_marks_earned: number
  total_marks: number
}

// ─── Component ────────────────────────────────────────────────────────────────

const CodingSection = () => {
  const Locator = useLocation()
  const navigate = useNavigate()
  const state = Locator.state || {}
  

  // Handle state persistence and recovery
  const [assessmentState, setAssessmentState] = useState<any>(Locator.state || {})
  const assessment_id = assessmentState?.assessment_id || localStorage.getItem("assessment_id") || "default"

  useEffect(() => {
    if (Locator.state && Object.keys(Locator.state as any).length > 0) {
      localStorage.setItem(`assessment_data_${assessment_id}`, JSON.stringify(Locator.state))
      setAssessmentState(Locator.state)
    } else {
      const savedState = localStorage.getItem(`assessment_data_${assessment_id}`)
      if (savedState) {
        setAssessmentState(JSON.parse(savedState))
      }
    }
  }, [Locator.state, assessment_id])

  // Handle both full assessment object and standalone Coding questions array
  const CodingQuestions = assessmentState.Coding_Questions || assessmentState
  const assessment = Array.isArray(CodingQuestions) ? CodingQuestions[0] : CodingQuestions
  const questions = assessment?.questions || []
  const totalDurationSeconds = parseInt(assessment?.coding_duration || '0') * 60

  const [activeQIdx, setActiveQIdx] = useState(0)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeQIdx]);
  const [selectedLang, setSelectedLang, clearLang] = useLocalPersist<Record<string, string>>(`coding_lang_${assessment_id}`, {})
  const [code, setCode, clearCode] = useLocalPersist<Record<string, string>>(`coding_code_${assessment_id}`, {})
  const [activeTab, setActiveTab] = useState<'problem' | 'testcases'>('problem')
  const [submitted, setSubmitted] = useState(false)
  const [lastSaved, setLastSaved] = useState<number>(Date.now())
  const [timeAgo, setTimeAgo] = useState("just now")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showGlobalFinishConfirm, setShowGlobalFinishConfirm] = useState(false)
  const [showUserInfo, setShowUserInfo] = useState(false)
  const [submittedQuestions, setSubmittedQuestions] = useState<string[]>([])

  const [runCooldown, setRunCooldown] = useState<number>(0)
  const [submitCooldown, setSubmitCooldown] = useState<number>(0)

  useEffect(() => {
    if (runCooldown <= 0) return
    const timer = setInterval(() => {
      setRunCooldown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [runCooldown])

  useEffect(() => {
    if (submitCooldown <= 0) return
    const timer = setInterval(() => {
      setSubmitCooldown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [submitCooldown])

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const saved = localStorage.getItem(`coding_time_${assessment_id}`)
    if (saved) return parseInt(saved)
    return totalDurationSeconds > 0 ? totalDurationSeconds : 3600 // Default 60m if not yet loaded
  })

  // Sync timeLeft with localStorage
  useEffect(() => {
    if (timeLeft > 0 && !submitted) {
      localStorage.setItem(`coding_time_${assessment_id}`, timeLeft.toString())
    }
  }, [timeLeft, assessment_id, submitted])

  // If totalDurationSeconds becomes available and we haven't started yet
  useEffect(() => {
    const saved = localStorage.getItem(`coding_time_${assessment_id}`)
    if (!saved && totalDurationSeconds > 0) {
      setTimeLeft(totalDurationSeconds)
    }
  }, [totalDurationSeconds, assessment_id])

  // Per-question run results keyed by question_id
  const [runResults, setRunResults, clearRunResults] = useLocalPersist<Record<string, RunResult | null>>(`coding_results_${assessment_id}`, {})
  const [isRunning, setIsRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  const activeQ = questions[activeQIdx]
  const qId = activeQ?.question_id
  const lang = selectedLang[qId] || activeQ?.languages?.[0] || 'Python'
  const currentCode = code[`${qId}-${lang}`] || LANGUAGE_TEMPLATES[lang] || ''

  // The run result for the currently active question
  const activeRunResult: RunResult | null = runResults[qId] ?? null



  const Code_Checker = async () => {
    
   const email =   localStorage.getItem("candidate_email")
    const data = {
      assessment_id,
      email : email,
      question_id: qId,
      language: lang,
      code: currentCode,
    } 
    try {
      fetch(`${API_USER_URL}/Code/Checker` , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

    } catch (error) {
      console.log(error);
      
    }
  }
  
  
  // ─── Code Execution Fetcher ────────────────────────────────────────────────
  const Fetcher = async () => {
    if (runCooldown > 0) return;
    setIsRunning(true)
    setRunError(null)
    setActiveTab('testcases')

    const data = {
      assessment_id: assessment.assessment_id,
      question_id: qId,
      language: lang,
      code: currentCode,
    }

    try {
      const response = await fetch(`${API_USER_URL}/run-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.status === 429) {
        setRunCooldown(30);
        toast.error("You are running code too frequently. Please wait 30 seconds before trying again.", {
          position: "top-right",
          theme: "colored"
        });
        setIsRunning(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const result: RunResult = await response.json()

      setRunResults((prev) => ({ ...prev, [qId]: result }))
      setLastSaved(Date.now())
      setTimeAgo("just now")
    } catch (error: any) {
      setRunError(error?.message || 'Something went wrong while running your code.')
    } finally {
      setIsRunning(false)
    }
  }

  // ─── Init language selections ──────────────────────────────────────────────

  useEffect(() => {
    const init: Record<string, string> = {}
    questions.forEach((q: any) => { init[q.question_id] = q.languages[0] })
    setSelectedLang(init)
  }, [])

  // ─── Timer ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (submitted || timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); setSubmitted(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [submitted])

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

  const timerColor = timeLeft < 60 ? 'text-red-500' : timeLeft < 300 ? 'text-amber-500' : 'text-gray-800'

  const handleCodeChange = (val: string | undefined) => {
    setCode((prev) => ({ ...prev, [`${qId}-${lang}`]: val || '' }))
    setLastSaved(Date.now())
    setTimeAgo("just now")
  }

  const handleLangChange = (newLang: string) => {
    setSelectedLang((prev) => ({ ...prev, [qId]: newLang }))
  }

  const solvedCount = questions.filter((q: any) => {
    const qLang = selectedLang[q.question_id] || q.languages[0]
    const c = code[`${q.question_id}-${qLang}`]
    return (c?.trim() && c !== LANGUAGE_TEMPLATES[qLang]) || submittedQuestions.includes(q.question_id)
  }).length

  const visibleTestcases = activeQ?.testcases?.filter((tc: any) => !tc.is_hidden) || []
  const hiddenCount = activeQ?.testcases?.filter((tc: any) => tc.is_hidden).length ?? 0

  const handleNextFlow = () => {
    localStorage.setItem('coding_completed', 'true');
    
    const enabledSectionsRaw = localStorage.getItem('enabled_sections');
    if (enabledSectionsRaw) {
      const enabledSections = JSON.parse(enabledSectionsRaw);
      const currentIdx = enabledSections.findIndex((s: any) => s.key === 'coding');
      
      if (currentIdx !== -1 && currentIdx < enabledSections.length - 1) {
        const nextSection = enabledSections[currentIdx + 1];
        navigate(`/section/${nextSection.key}`, { state: { ...assessmentState } });
        return;
      }
    }
    navigate('/submission');
  }

  const handleCodingSubmit = async () => {
    if (submitCooldown > 0) return;
    const email = localStorage.getItem("candidate_email") || "";
    const user_name = localStorage.getItem("candidate_name") || "";

    const results_payload = questions.map((q: any) => {
      const qLang = selectedLang[q.question_id] || q.languages[0];
      const qCode = code[`${q.question_id}-${qLang}`] || "";
      const result = runResults[q.question_id];

      const passed_testcases =
        (result?.hidden_summary.passed || 0) +
        (result?.visible_testcases.filter((t: any) => t.passed)
          .length || 0);

      const total_testcases =
        (result?.hidden_summary.total || 0) +
        (result?.visible_testcases.length || 0);

      const test_cases = (result?.all_testcase_results || []).map((tc: any, index: number) => ({
        test_case_order: index + 1,
        test_case_output_value: tc.your_output || "",
        test_case_marks: tc.marks || 0
      }));

      const status = passed_testcases >= 3 ? "Passed" : (result ? "Failed" : "Error");

      return {
        question_id: q.question_id,
        question_text: q.question_text || "",
        code: qCode,
        language: qLang,
        test_cases: test_cases,
        total_testcases: total_testcases || q.test_case_count || 0,
        total_marks: result?.total_marks || q.marks || 0,
        status: status,
        passed_testcases: passed_testcases,
        user_marks: result?.total_marks_earned || 0,
      };
    });

    const total_marks = results_payload.reduce(
      (acc: number, curr: any) => acc + curr.user_marks,
      0
    );

    try {
      const resp = await fetch(`${API_USER_URL}/api/coding/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          user_name,
          assessment_id,
          results: results_payload,
          total_marks,
        }),
      });

      if (resp.status === 429) {
        setSubmitCooldown(10);
        toast.error("Submission rate limit reached. Please wait 10 seconds before trying again.", {
          position: "top-right",
          theme: "colored"
        });
        return;
      }

      if (!resp.ok) {
        throw new Error("Failed to save Coding results");
      }

      // Per-question logic
      setSubmittedQuestions(prev => [...prev, qId]);
      
      const isLastQuestion = activeQIdx === questions.length - 1;
      if (isLastQuestion) {
        // Cleanup local persistence ONLY on final section completion
        clearCode();
        clearLang();
        clearRunResults();
        localStorage.removeItem(`coding_time_${assessment_id}`);
        localStorage.removeItem(`assessment_data_${assessment_id}`);

        localStorage.setItem("coding_completed", "true");
        setSubmitted(true);
      } else {
        // Move to next question
        setActiveQIdx(prev => prev + 1);
        setActiveTab('problem');
      }
    } catch (error) {
      console.error("Error saving Coding results:", error);
      toast.dismiss();
      toast.error("Error submitting results. Please try again.");
    }
  }

  // ─── Thank You Screen ──────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
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
            <p className="text-sm text-gray-500 mb-8">Your code has been recorded successfully.</p>
            
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

  // ─── Main UI ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top Nav ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-[1600px] mx-auto px-6 py-2.5 flex items-center justify-between">
          
          {/* Left: Logo & Assessment Info */}
          <div className="flex items-center gap-8">
            <img src="/virtusa-logo.svg" alt="Virtusa" className="h-8 w-auto" />
            <div className="h-10 w-px bg-gray-200" />
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <h1 className="text-base font-bold text-gray-900 leading-tight">
                  {assessment?.test_title || "Coding Assessment"}
                </h1>
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

      {/* ── Question Nav Bar ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-2 flex items-center gap-2 flex-shrink-0">
        {questions.map((q: any, idx: number) => {
          const qLang = selectedLang[q.question_id] || q.languages[0]
          const hasCode = code[`${q.question_id}-${qLang}`]?.trim() &&
            code[`${q.question_id}-${qLang}`] !== LANGUAGE_TEMPLATES[qLang]
          return (
            <button
              key={q.question_id}
              onClick={() => {}}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-default ${activeQIdx === idx
                ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                : submittedQuestions.includes(q.question_id)
                  ? 'bg-green-50 text-green-600 border-green-200 opacity-80'
                  : hasCode
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}
              title={submittedQuestions.includes(q.question_id) ? "Question submitted and locked" : ""}
            >
              Q{idx + 1}
              {submittedQuestions.includes(q.question_id) ? (
                <span className="ml-1.5 text-[10px]">✓</span>
              ) : hasCode && activeQIdx !== idx && (
                <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
              )}
            </button>
          )
        })}
        <span className="ml-auto text-xs text-gray-400">
          {questions.length} questions · {questions.reduce((a: number, q: any) => a + q.marks, 0)} marks total
        </span>
      </div>

      {/* ── Main Split Layout ── */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 113px)' }}>

        {/* ── Left: Problem Panel ── */}
        <div className="w-96 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-4 pt-3 gap-1 flex-shrink-0">
            <button
              onClick={() => setActiveTab('problem')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${activeTab === 'problem'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-800'
                }`}
            >
              Problem
            </button>
            <button
              onClick={() => setActiveTab('testcases')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${activeTab === 'testcases'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-800'
                }`}
            >
              Test Cases
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
                {visibleTestcases.length}
              </span>
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-5">

            {/* ── Problem Tab ── */}
            {activeTab === 'problem' && activeQ && (
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-400">#{activeQIdx + 1}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${DIFFICULTY_STYLES[activeQ.difficulty] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {activeQ.difficulty}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                      {activeQ.topic}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 flex-shrink-0">{activeQ.marks} pts</span>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{activeQ.question_text}</p>
                </div>

                <div className="flex gap-3 mb-5">
                  <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Input</p>
                    <p className="text-xs font-mono text-gray-700">{activeQ.input_types}</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Output</p>
                    <p className="text-xs font-mono text-gray-700">{activeQ.output_types}</p>
                  </div>
                </div>

                <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Examples</p>
                <div className="space-y-3">
                  {visibleTestcases.map((tc: any) => (
                    <div key={tc.title} className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600">{tc.title}</span>
                        <span className="text-xs text-gray-400">{tc.marks} pts</span>
                      </div>
                      <div className="p-3 space-y-2">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Input</p>
                          <code className="block text-xs font-mono bg-gray-900 text-green-400 rounded-lg px-3 py-2">{tc.input}</code>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Expected Output</p>
                          <code className="block text-xs font-mono bg-gray-900 text-blue-400 rounded-lg px-3 py-2">{tc.expected_output}</code>
                        </div>
                        {tc.description && (
                          <p className="text-xs text-gray-400 italic whitespace-pre-line">{tc.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Test Cases Tab ── */}
            {activeTab === 'testcases' && (
              <div className="space-y-3">

                {/* Loading state */}
                {isRunning && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
                    <p className="text-xs text-gray-500">Running test cases…</p>
                  </div>
                )}

                {/* Error state */}
                {!isRunning && runError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-semibold text-red-600 mb-1">Execution Error</p>
                    <p className="text-xs text-red-500">{runError}</p>
                  </div>
                )}

                {/* Results from API */}
                {!isRunning && !runError && activeRunResult && (
                  <>
                    {/* Score summary bar */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">Score</span>
                        <span className={`text-sm font-bold ${activeRunResult.total_marks_earned === activeRunResult.total_marks ? 'text-green-600' : 'text-amber-600'}`}>
                          {activeRunResult.total_marks_earned} / {activeRunResult.total_marks}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>
                          Visible: {activeRunResult.visible_testcases.filter(t => t.passed).length}/{activeRunResult.visible_testcases.length} passed
                        </span>
                        <span>·</span>
                        <span>
                          Hidden: {activeRunResult.hidden_summary.passed}/{activeRunResult.hidden_summary.total} passed
                        </span>
                      </div>
                    </div>

                    <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-2">Visible Test Cases</p>

                    {activeRunResult.visible_testcases.map((tc) => (
                      <div
                        key={tc.title}
                        className={`rounded-xl border overflow-hidden transition-all ${tc.passed ? 'border-green-200' : 'border-red-200'}`}
                      >
                        {/* Header */}
                        <div className={`px-3 py-2 border-b flex items-center justify-between ${tc.passed ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                          <span className="text-xs font-semibold text-gray-600">{tc.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{tc.marks} pts</span>
                            {tc.passed
                              ? <span className="text-xs font-bold text-green-600">✓ Passed</span>
                              : <span className="text-xs font-bold text-red-500">✗ Failed</span>
                            }
                          </div>
                        </div>

                        {/* Body */}
                        <div className="p-3 space-y-2">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Input</p>
                            <code className="block text-xs font-mono bg-gray-900 text-green-400 rounded-lg px-3 py-2">{tc.input}</code>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Expected</p>
                            <code className="block text-xs font-mono bg-gray-900 text-blue-400 rounded-lg px-3 py-2">{tc.expected_output}</code>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Your Output</p>
                            <code className={`block text-xs font-mono rounded-lg px-3 py-2 ${tc.passed ? 'bg-gray-900 text-green-400' : 'bg-gray-900 text-red-400'}`}>
                              {tc.your_output}
                            </code>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Hidden test cases summary */}
                    <div className={`rounded-xl border border-dashed p-4 text-center ${activeRunResult.hidden_summary.passed === activeRunResult.hidden_summary.total ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                      {activeRunResult.hidden_summary.total > 0 ? (
                        <p className="text-xs text-gray-500">
                          🔒 Hidden tests: <span className={`font-semibold ${activeRunResult.hidden_summary.passed === activeRunResult.hidden_summary.total ? 'text-green-600' : 'text-amber-600'}`}>
                            {activeRunResult.hidden_summary.passed}/{activeRunResult.hidden_summary.total} passed
                          </span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">No hidden test cases for this question.</p>
                      )}
                    </div>
                  </>
                )}

                {/* No run yet — show static testcases */}
                {!isRunning && !runError && !activeRunResult && (
                  <>
                    <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">Visible Test Cases</p>
                    {visibleTestcases.map((tc: any) => (
                      <div key={tc.title} className="rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-600">{tc.title}</span>
                          <span className="text-xs text-gray-400">{tc.marks} pts</span>
                        </div>
                        <div className="p-3 space-y-2">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Input</p>
                            <code className="block text-xs font-mono bg-gray-900 text-green-400 rounded-lg px-3 py-2">{tc.input}</code>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Expected</p>
                            <code className="block text-xs font-mono bg-gray-900 text-blue-400 rounded-lg px-3 py-2">{tc.expected_output}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
                      <p className="text-xs text-gray-400">
                        🔒 {hiddenCount} hidden test case{hiddenCount !== 1 ? 's' : ''} will run on submission
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Editor Panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Editor Toolbar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500">Language:</span>
              <div className="flex gap-1">
                {activeQ?.languages?.map((l: string) => (
                  <button
                    key={l}
                    onClick={() => handleLangChange(l)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${lang === l
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCode((prev) => ({ ...prev, [`${qId}-${lang}`]: LANGUAGE_TEMPLATES[lang] || '' }))}
                className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 transition-all cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={()=>{
                  if (submittedQuestions.includes(qId) || runCooldown > 0) return;
                  Code_Checker()
                  Fetcher() 
                }}
                disabled={isRunning || submittedQuestions.includes(qId) || runCooldown > 0}
                className={`px-4 py-1.5 border text-xs font-semibold rounded-lg disabled:opacity-50 transition-all ${runCooldown > 0 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 cursor-pointer'}`}
              >
                {isRunning ? 'Running…' : runCooldown > 0 ? `Wait (${runCooldown}s)` : '▶ Run'}
              </button>
              {!submittedQuestions.includes(qId) && (
                <button
                  onClick={handleCodingSubmit}
                  disabled={submitCooldown > 0}
                  className={`px-4 py-1.5 text-white text-xs font-bold rounded-lg shadow-sm transition-all uppercase tracking-wide disabled:opacity-50 ${submitCooldown > 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-700 active:scale-95 cursor-pointer'}`}
                >
                  {submitCooldown > 0 ? `Wait (${submitCooldown}s)` : 'Submit'}
                </button>
              )}
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={LANGUAGE_MAP[lang] || 'python'}
              value={currentCode}
              onChange={handleCodeChange}
              theme="vs"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                tabSize: 4,
                wordWrap: 'on',
                renderLineHighlight: 'line',
                padding: { top: 16, bottom: 16 },
                smoothScrolling: true,
                cursorSmoothCaretAnimation: 'on',
                formatOnPaste: true,
                automaticLayout: true,
                readOnly: submittedQuestions.includes(qId),
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Confirm Modal ── */}
      {/* Global Finish Confirm Modal */}
      {showGlobalFinishConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-6">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-100">
            <div className="h-4" />
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Finish Entire Assessment?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              You are about to conclude all sections. This will submit your current code and end the assessment. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGlobalFinishConfirm(false)}
                className="flex-1 py-3 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all cursor-pointer uppercase tracking-wide"
              >
                No, Continue
              </button>
              <button
                id="global-finish-btn"
                onClick={async () => {
                  const email = localStorage.getItem("candidate_email") || "";
                  const user_name = localStorage.getItem("candidate_name") || "";

                  const results_payload = questions.map((q: any) => {
                    const qLang = selectedLang[q.question_id] || q.languages[0];
                    const qCode = code[`${q.question_id}-${qLang}`] || "";
                    const result = runResults[q.question_id];

                    const passed_testcases =
                      (result?.hidden_summary.passed || 0) +
                      (result?.visible_testcases.filter((t) => t.passed)
                        .length || 0);

                    const total_testcases =
                      (result?.hidden_summary.total || 0) +
                      (result?.visible_testcases.length || 0);

                    // Map all test case results if available
                    const test_cases = (result?.all_testcase_results || []).map((tc: any, index: number) => ({
                      test_case_order: index + 1,
                      test_case_output_value: tc.your_output || "",
                      test_case_marks: tc.marks || 0
                    }));

                    // Logic: Passed if at least 3 testcases are passed
                    const status = passed_testcases >= 3 ? "Passed" : (result ? "Failed" : "Error");

                    return {
                      question_id: q.question_id,
                      question_text: q.question_text || "",
                      code: qCode,
                      language: qLang,
                      test_cases: test_cases,
                      total_testcases: total_testcases || q.test_case_count || 0,
                      total_marks: result?.total_marks || q.marks || 0,
                      status: status,
                      passed_testcases: passed_testcases,
                      user_marks: result?.total_marks_earned || 0,
                    };
                  });

                  const total_marks = results_payload.reduce(
                    (acc: number, curr: any) => acc + curr.user_marks,
                    0
                  );

                  try {
                    const resp = await fetch(`${API_USER_URL}/api/coding/results`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        email,
                        user_name,
                        assessment_id,
                        results: results_payload,
                        total_marks,
                      }),
                    });

                    if (!resp.ok) {
                      const errorData = await resp.json();
                      console.error("Failed to save Coding results:", errorData);
                      toast.dismiss();
                      toast.error("Failed to save coding results. Please check your connection.");
                      return;
                    }
                  } catch (error) {
                    console.error("Error saving Coding results:", error);
                    toast.dismiss();
                    toast.error("Network error while saving coding results. Please try again.");
                    return;
                  }

                  // Cleanup local persistence
                  clearCode();
                  clearLang();
                  clearRunResults();
                  localStorage.removeItem(`coding_time_${assessment_id}`);
                  localStorage.removeItem(`assessment_data_${assessment_id}`);

                  localStorage.setItem("coding_completed", "true");
                  
                  const enabledSectionsRaw = localStorage.getItem('enabled_sections');
                  if (enabledSectionsRaw) {
                    const enabledSections = JSON.parse(enabledSectionsRaw);
                    const currentIdx = enabledSections.findIndex((s: any) => s.key === 'coding');
                    
                    if (currentIdx !== -1 && currentIdx < enabledSections.length - 1) {
                      const nextSection = enabledSections[currentIdx + 1];
                      setSubmitted(true);
                      navigate('/guiding-page', { state: { ...assessmentState, nextSection: nextSection.key } });
                      return;
                    }
                  }
                  
                  setSubmitted(true);
                  navigate('/guiding-page', { state: { ...assessmentState, nextSection: 'Finish' } });
                }}
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

export default CodingSection