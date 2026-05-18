import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'react-toastify'
import Editor from '@monaco-editor/react'
import { useLocalPersist } from '../hooks/useLocalPersist'
import API_USER_URL from '../Config/apiConfig'

const SQL_TEMPLATE = `-- Write your SQL query below\n`

const DIFFICULTY_STYLES: Record<string, string> = {
    Easy: 'bg-green-50 text-green-600 border-green-200',
    Medium: 'bg-amber-50 text-amber-600 border-amber-200',
    Hard: 'bg-red-50 text-red-600 border-red-200',
}

interface TestcaseResult {
    test_case_id: number
    status: 'passed' | 'failed'
    expected_output: any[][]
    your_output: any[][]
    marks_awarded: number
    total_marks: number
}

interface RunApiResponse {
    assessment_id: string
    question_id: string
    overall_status: 'passed' | 'failed'
    total_marks_awarded: number
    total_marks: number
    testcase_results: TestcaseResult[]
}

const OutputTable = ({ data, label }: { data: any[][], label: string }) => {
    if (!data || data.length === 0) return (
        <div className="text-xs text-gray-400 italic">(empty result)</div>
    )
    // const cols = data[0].length
    return (
        <div>
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                {row.map((cell, j) => (
                                    <td key={j} className="px-3 py-1.5 font-mono text-gray-700 border-r border-gray-100 last:border-r-0">
                                        {cell === null ? <span className="text-gray-300 italic">NULL</span> : String(cell)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const SqlSection = () => {
    const Locator = useLocation()
    const navigate = useNavigate()
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

    const SqlQuestions = assessmentState.SQL_Questions || assessmentState

    const assessment = Array.isArray(SqlQuestions) ? SqlQuestions[0] : SqlQuestions
    const questions = assessment?.questions || []
    const totalDurationSeconds = parseInt(assessment?.sql_duration || '0') * 60

    const [activeQIdx, setActiveQIdx] = useState(0)

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [activeQIdx]);
    const [code, setCode, clearCode] = useLocalPersist<Record<string, string>>(`sql_code_${assessment_id}`, {})
    const [activeTab, setActiveTab] = useState<'problem' | 'testcases'>('problem')
    const [submitted, setSubmitted] = useState(false)
    const [lastSaved, setLastSaved] = useState<number>(Date.now())
    const [timeAgo, setTimeAgo] = useState("just now")
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showGlobalFinishConfirm, setShowGlobalFinishConfirm] = useState(false)
    const [showUserInfo, setShowUserInfo] = useState(false)
    const [submittedQuestions, setSubmittedQuestions] = useState<string[]>([])
    const [runApiResponse, setRunApiResponse, clearRunApiResponse] = useLocalPersist<Record<string, RunApiResponse | null>>(`sql_results_${assessment_id}`, {})
    const [runErrors, setRunErrors] = useState<Record<string, string | null>>({})
    const [isRunning, setIsRunning] = useState(false)
    
    const [timeLeft, setTimeLeft] = useState<number>(() => {
        const saved = localStorage.getItem(`sql_time_${assessment_id}`)
        if (saved) return parseInt(saved)
        return totalDurationSeconds > 0 ? totalDurationSeconds : 3600 // Default 60m if not yet loaded
    })

    // Sync timeLeft with localStorage
    useEffect(() => {
        if (timeLeft > 0 && !submitted) {
            localStorage.setItem(`sql_time_${assessment_id}`, timeLeft.toString())
        }
    }, [timeLeft, assessment_id, submitted])

    // If totalDurationSeconds becomes available and we haven't started yet
    useEffect(() => {
        const saved = localStorage.getItem(`sql_time_${assessment_id}`)
        if (!saved && totalDurationSeconds > 0) {
            setTimeLeft(totalDurationSeconds)
        }
    }, [totalDurationSeconds, assessment_id])

    const activeQ = questions[activeQIdx]
    const qId = activeQ?.question_id
    const currentCode = code[qId] || SQL_TEMPLATE

    // Timer
    useEffect(() => {
        if (submitted || timeLeft <= 0) return
        const interval = setInterval(() => {
            setTimeLeft((t) => {
                if (t <= 1) { clearInterval(interval); setSubmitted(true); return 0 }
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

    const timerColor = timeLeft < 60 ? 'text-red-500' : timeLeft < 300 ? 'text-amber-500' : 'text-gray-800'

    const handleCodeChange = (val: string | undefined) => {
        setCode((prev) => ({ ...prev, [qId]: val || '' }))
        setLastSaved(Date.now())
        setTimeAgo("just now")
    }

    const handleRun = async () => {
        setIsRunning(true)
        setActiveTab('testcases')
        setRunApiResponse((prev) => ({ ...prev, [qId]: null }))
        setRunErrors((prev) => ({ ...prev, [qId]: null }))

        try {
            const email = localStorage.getItem("candidate_email");
            fetch(`${API_USER_URL}/Code/Checker`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessment_id,
                    email: email,
                    question_id: qId,
                    language: 'MySQL',
                    code: currentCode,
                }),
            }).catch(e => console.log(e));

            const data: any = {
                assessment_id,
                question_id: qId,
                code: currentCode,
            }

            const response = await fetch(`${API_USER_URL}/run-sql`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const result = await response.json()

            if (response.status === 429) {
                toast.error("You are running queries too frequently. Please wait a few seconds.", {
                    position: "top-right",
                    theme: "colored"
                });
                setIsRunning(false);
                return;
            }

            if (!response.ok) {
                const message =
                    result?.detail ||
                    result?.error ||
                    result?.message ||
                    `Server error (${response.status})`
                setRunErrors((prev) => ({ ...prev, [qId]: message }))
                return
            }

            if (result?.error || result?.detail) {
                setRunErrors((prev) => ({ ...prev, [qId]: result.error || result.detail }))
                return
            }

            setRunApiResponse((prev) => ({ ...prev, [qId]: result as RunApiResponse }))
            setLastSaved(Date.now())
            setTimeAgo("just now")
        } catch (err: any) {
            console.error('Run failed:', err)
            const message =
                err?.message === 'Failed to fetch'
                    ? 'Could not connect to the server. Make sure the backend is running.'
                    : err?.message || 'An unexpected error occurred.'
            setRunErrors((prev) => ({ ...prev, [qId]: message }))
        } finally {
            setIsRunning(false)
        }
    }

    const handleSqlSubmit = async () => {
        const email = localStorage.getItem("candidate_email") || "";
        const user_name = localStorage.getItem("candidate_name") || "";

        const results_payload = questions.map((q: any) => {
            const qCode = code[q.question_id] || "";
            const result = runApiResponse[q.question_id];

            const passed_testcases =
                result?.testcase_results.filter(
                    (t) => t.status === "passed"
                ).length || 0;

            const total_testcases =
                result?.testcase_results.length || 0;

            const test_cases = (result?.testcase_results || []).map((tc) => ({
                test_case_id: tc.test_case_id,
                test_case_output_value: tc.your_output,
                marks: tc.marks_awarded
            }));

            const status = passed_testcases >= 3 ? "Passed" : (result ? "Failed" : "Error");

            return {
                question_id: q.question_id,
                question_text: q.question_text || "",
                query: qCode,
                test_cases: test_cases,
                total_testcases: total_testcases || q.test_case_count || 0,
                total_marks: result?.total_marks || q.marks || 0,
                status: status,
                passed_testcases: passed_testcases,
                user_marks: result?.total_marks_awarded || 0,
            };
        });

        const total_marks = results_payload.reduce(
            (acc: number, curr: any) => acc + curr.user_marks,
            0
        );

        try {
            const resp = await fetch(`${API_USER_URL}/api/sql/results`, {
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
                toast.error("Submission rate limit reached. Please try again in a moment.", {
                    position: "top-right",
                    theme: "colored"
                });
                return;
            }

            if (!resp.ok) {
                throw new Error("Failed to save SQL results");
            }
            
            const isLastQuestion = activeQIdx === questions.length - 1;
            if (isLastQuestion) {
                // Cleanup local persistence ONLY on final section completion
                clearCode();
                clearRunApiResponse();
                localStorage.removeItem(`sql_time_${assessment_id}`);
                localStorage.removeItem(`assessment_data_${assessment_id}`);
                
                localStorage.setItem('sql_completed', 'true');
                setSubmitted(true);
            } else {
                setActiveQIdx(prev => prev + 1);
                setActiveTab('problem');
            }
        } catch (error) {
            console.error("Error saving SQL results:", error);
            alert("Error submitting results. Please try again.");
        }
    }

    const solvedCount = questions.filter((q: any) =>
        (code[q.question_id]?.trim() && code[q.question_id] !== SQL_TEMPLATE) ||
        submittedQuestions.includes(q.question_id)
    ).length

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
                        <p className="text-sm text-gray-500 mb-8">Your SQL queries have been recorded successfully.</p>
                        
                        <button
                            onClick={() => {
                                localStorage.setItem('sql_completed', 'true');
                                
                                const enabledSectionsRaw = localStorage.getItem('enabled_sections');
                                if (enabledSectionsRaw) {
                                  const enabledSections = JSON.parse(enabledSectionsRaw);
                                  const currentIdx = enabledSections.findIndex((s: any) => s.key === 'sql');
                                  
                                  if (currentIdx !== -1 && currentIdx < enabledSections.length - 1) {
                                    const nextSection = enabledSections[currentIdx + 1];
                                    navigate(`/section/${nextSection.key}`, { state: { ...assessmentState } });
                                    return;
                                  }
                                }
                                navigate('/submission');
                            }}
                            className="w-full py-4 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 active:scale-95 transition-all duration-150 cursor-pointer uppercase tracking-wide"
                        >
                            Continue to next step →
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const visibleTestcases = activeQ?.testcases?.filter((tc: any) => !tc.is_hidden) || []
    const currentRunResponse = runApiResponse[qId]
    const currentRunError = runErrors[qId]

    const ensureArray = (val: any) => {
        if (Array.isArray(val)) return val
        if (typeof val === 'string') return val.split(',').map(s => s.trim())
        return []
    }

    const tableColumns = ensureArray(activeQ?.table_display?.columns)
    const tableRows = Array.isArray(activeQ?.table_display?.sample_rows)
        ? activeQ.table_display.sample_rows
        : typeof activeQ?.table_display?.sample_rows === 'string'
            ? activeQ.table_display.sample_rows.split('|').map((row: string) => row.split(',').map((c: string) => c.trim()))
            : []

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 flex-shrink-0">
                <div className="max-w-[1600px] mx-auto px-6 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <img src="/virtusa-logo.svg" alt="Virtusa" className="h-8 w-auto" />
                        <div className="h-10 w-px bg-gray-200" />
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <h1 className="text-base font-bold text-gray-900 leading-tight">
                                    {assessment?.test_title || "SQL Assessment"}
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
                                className="px-5 py-2 bg-[#E31B23] text-white text-xs font-bold rounded-lg hover:bg-[#c4151c] shadow-sm transition-all active:scale-95 uppercase tracking-wide cursor-pointer"
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
                    const hasCode = code[q.question_id]?.trim() &&
                        code[q.question_id] !== SQL_TEMPLATE
                    return (
                        <button
                            key={q.question_id}
                            onClick={() => {}}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-default ${activeQIdx === idx
                                ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                                : submittedQuestions.includes(q.question_id)
                                    ? 'bg-green-50 text-green-600 border-green-200 opacity-80'
                                    : hasCode
                                        ? 'bg-teal-50 text-teal-600 border-teal-200'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                }`}
                            title={submittedQuestions.includes(q.question_id) ? "Question submitted and locked" : ""}
                        >
                            Q{idx + 1}
                            {submittedQuestions.includes(q.question_id) ? (
                                <span className="ml-1.5 text-[10px]">✓</span>
                            ) : (hasCode && activeQIdx !== idx && (
                                <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                            ))}
                        </button>
                    )
                })}
                <span className="ml-auto text-xs text-gray-400">{questions.length} questions · {questions.reduce((a: number, q: any) => a + q.marks, 0)} marks total</span>
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

                        {activeTab === 'problem' && activeQ && (
                            <div>
                                {/* Question Header */}
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-gray-400">#{activeQIdx + 1}</span>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${DIFFICULTY_STYLES[activeQ.difficulty] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                            {activeQ.difficulty}
                                        </span>
                                    </div>
                                    <span className="text-xs font-semibold text-teal-600 flex-shrink-0">{activeQ.marks} pts</span>
                                </div>

                                {/* Question Text */}
                                <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{activeQ.question_text}</p>
                                </div>

                                {/* Table Schema Display */}
                                {activeQ?.table_display && (
                                    <div className="mb-5">
                                        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">
                                            📊 Table: <span className="text-teal-600 normal-case tracking-normal">{activeQ.table_display.table_name}</span>
                                        </p>
                                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        {tableColumns.map((col: string) => (
                                                            <th key={col} className="px-3 py-2 text-left font-semibold text-gray-600">
                                                                {col}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {tableRows.map((row: string[], i: number) => (
                                                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                            {row.map((cell: string, j: number) => (
                                                                <td key={j} className="px-3 py-2 text-gray-700 font-mono">
                                                                    {cell}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Sample Testcases in Problem Tab */}
                                {visibleTestcases.length > 0 && (
                                    <>
                                        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Expected Output</p>
                                        <div className="space-y-3">
                                            {visibleTestcases.map((tc: any) => (
                                                <div key={tc.test_case_id} className="rounded-xl border border-gray-200 overflow-hidden">
                                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                                        <span className="text-xs font-semibold text-gray-600">Test Case {tc.test_case_id}</span>
                                                        <span className="text-xs text-gray-400">{tc.marks} pts</span>
                                                    </div>
                                                    <div className="p-3">
                                                        <p className="text-xs text-gray-400 mb-1">Expected Output</p>
                                                        <code className="block text-xs font-mono bg-gray-900 text-blue-400 rounded-lg px-3 py-2 whitespace-pre-line">{tc.expected_output}</code>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'testcases' && (
                            <div className="space-y-4">
                                {isRunning ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                                        <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
                                        <p className="text-xs text-gray-500">Running SQL query…</p>
                                    </div>
                                ) : currentRunError ? (
                                    <div className="space-y-4">
                                        {/* Error Banner */}
                                        <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
                                            <div className="px-4 py-3 border-b border-red-100 flex items-center gap-2">
                                                <span className="text-base text-red-600 font-bold">!</span>
                                                <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Execution Error</span>
                                            </div>
                                            <div className="p-4">
                                                <pre className="text-xs font-mono text-red-700 bg-red-100 rounded-lg px-3 py-3 whitespace-pre-wrap break-words leading-relaxed">
                                                    {currentRunError}
                                                </pre>
                                                <p className="text-xs text-red-400 mt-3">Fix the error in your query and run again.</p>
                                            </div>
                                        </div>
                                        {/* Still show test case expectations so they can reference them */}
                                        {visibleTestcases.length > 0 && (
                                            <>
                                                <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Expected Outputs</p>
                                                {visibleTestcases.map((tc: any) => (
                                                    <div key={tc.test_case_id} className="rounded-xl border border-gray-200 overflow-hidden">
                                                        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-gray-600">Test Case {tc.test_case_id}</span>
                                                            <span className="text-xs text-gray-400">{tc.marks} pts</span>
                                                        </div>
                                                        <div className="p-3">
                                                            <p className="text-xs text-gray-400 mb-1">Expected Output</p>
                                                            <code className="block text-xs font-mono bg-gray-900 text-blue-400 rounded-lg px-3 py-2 whitespace-pre-line">{tc.expected_output}</code>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                ) : currentRunResponse ? (
                                    <>
                                        {/* ── Overall Result Banner ── */}
                                        <div className={`rounded-xl border p-4 flex items-center justify-between ${currentRunResponse.overall_status === 'passed'
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-red-50 border-red-200'
                                            }`}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">
                                                    {currentRunResponse.overall_status === 'passed' ? '✓' : '✗'}
                                                </span>
                                                <div>
                                                    <p className={`text-sm font-bold capitalize ${currentRunResponse.overall_status === 'passed' ? 'text-green-700' : 'text-red-700'
                                                        }`}>
                                                        {currentRunResponse.overall_status}
                                                    </p>
                                                    <p className="text-xs text-gray-500">Overall Result</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-lg font-bold tabular-nums ${currentRunResponse.overall_status === 'passed' ? 'text-green-700' : 'text-red-600'
                                                    }`}>
                                                    {currentRunResponse.total_marks_awarded}
                                                    <span className="text-sm font-medium text-gray-400">/{currentRunResponse.total_marks}</span>
                                                </p>
                                                <p className="text-xs text-gray-400">Marks</p>
                                            </div>
                                        </div>

                                        {/* ── Per Test Case Results ── */}
                                        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Test Case Results</p>

                                        {currentRunResponse.testcase_results.map((tc) => {
                                            const passed = tc.status === 'passed'
                                            return (
                                                <div key={tc.test_case_id} className={`rounded-xl border overflow-hidden ${passed ? 'border-green-200' : 'border-red-200'
                                                    }`}>
                                                    {/* Header */}
                                                    <div className={`px-3 py-2.5 flex items-center justify-between border-b ${passed
                                                        ? 'bg-green-50 border-green-100'
                                                        : 'bg-red-50 border-red-100'
                                                        }`}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold">{passed ? '✓' : '✗'}</span>
                                                            <span className="text-xs font-semibold text-gray-700">
                                                                Test Case {tc.test_case_id}
                                                            </span>
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${passed
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-red-100 text-red-700'
                                                                }`}>
                                                                {passed ? 'Passed' : 'Failed'}
                                                            </span>
                                                        </div>
                                                        <span className={`text-xs font-bold tabular-nums ${passed ? 'text-green-600' : 'text-red-500'}`}>
                                                            {tc.marks_awarded}/{tc.total_marks} pts
                                                        </span>
                                                    </div>

                                                    {/* Output Tables */}
                                                    <div className="p-3 space-y-3 bg-white">
                                                        <OutputTable data={tc.your_output} label="Your Output" />
                                                        {!passed && (
                                                            <OutputTable data={tc.expected_output} label="Expected Output" />
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {/* Hidden test cases notice */}
                                        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
                                            <p className="text-xs text-gray-400">
                                                {activeQ?.testcases?.filter((tc: any) => tc.is_hidden).length || 0} hidden test cases will run on submission
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-4">Test Cases</p>
                                        {visibleTestcases.map((tc: any) => (
                                            <div key={tc.test_case_id} className="rounded-xl border border-gray-200 overflow-hidden">
                                                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-gray-600">Test Case {tc.test_case_id}</span>
                                                    <span className="text-xs text-gray-400">{tc.marks} pts</span>
                                                </div>
                                                <div className="p-3 space-y-2">
                                                    {tc.setup_sql && (
                                                        <div>
                                                            <p className="text-xs text-gray-400 mb-1">Setup SQL</p>
                                                            <code className="block text-xs font-mono bg-gray-900 text-green-400 rounded-lg px-3 py-2 whitespace-pre-line">{tc.setup_sql}</code>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-xs text-gray-400 mb-1">Expected Output</p>
                                                        <code className="block text-xs font-mono bg-gray-900 text-blue-400 rounded-lg px-3 py-2 whitespace-pre-line">{tc.expected_output}</code>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
                                            <p className="text-xs text-gray-400">{activeQ?.testcases?.filter((tc: any) => tc.is_hidden).length || 0} hidden test cases will run on submission</p>
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
                            <span className="px-3 py-1 rounded-lg text-xs font-semibold border bg-gray-900 text-white border-gray-900">
                                MySQL
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCode((prev) => ({ ...prev, [qId]: SQL_TEMPLATE }))}
                                className="px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 transition-all cursor-pointer"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => {
                                    if (submittedQuestions.includes(qId)) return;
                                    handleRun();
                                }}
                                disabled={isRunning || submittedQuestions.includes(qId)}
                                className="px-4 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold rounded-lg hover:bg-teal-100 disabled:opacity-50 transition-all cursor-pointer"
                            >
                                {isRunning ? 'Running…' : '▶ Run'}
                            </button>
                            {!submittedQuestions.includes(qId) && (
                                <button
                                    onClick={handleSqlSubmit}
                                    className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-700 shadow-sm transition-all active:scale-95 uppercase tracking-wide cursor-pointer"
                                >
                                    Submit
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 overflow-hidden">
                        <Editor
                            height="100%"
                            language="sql"
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

            {/* Global Finish Confirm Modal */}
            {showGlobalFinishConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] px-6">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-100">
                        <div className="h-4" />
                        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Finish Entire Assessment?</h3>
                        <p className="text-sm text-gray-500 text-center mb-6">
                            You are about to conclude all sections. This will submit your current queries and end the assessment. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowGlobalFinishConfirm(false)}
                                className="flex-1 py-3 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all cursor-pointer uppercase tracking-wide"
                            >
                                No, Continue
                            </button>
                            <button
                                onClick={async () => {
                                    const email = localStorage.getItem("candidate_email") || "";
                                    const user_name = localStorage.getItem("candidate_name") || "";

                                    const results_payload = questions.map((q: any) => {
                                        const qCode = code[q.question_id] || "";
                                        const result = runApiResponse[q.question_id];

                                        const passed_testcases =
                                            result?.testcase_results.filter(
                                                (t) => t.status === "passed"
                                            ).length || 0;

                                        const total_testcases =
                                            result?.testcase_results.length || 0;

                                        const test_cases = (result?.testcase_results || []).map((tc) => ({
                                            test_case_id: tc.test_case_id,
                                            test_case_output_value: tc.your_output,
                                            marks: tc.marks_awarded
                                        }));

                                        const status = passed_testcases >= 3 ? "Passed" : (result ? "Failed" : "Error");

                                        return {
                                            question_id: q.question_id,
                                            question_text: q.question_text || "",
                                            query: qCode,
                                            test_cases: test_cases,
                                            total_testcases: total_testcases || q.test_case_count || 0,
                                            total_marks: result?.total_marks || q.marks || 0,
                                            status: status,
                                            passed_testcases: passed_testcases,
                                            user_marks: result?.total_marks_awarded || 0,
                                        };
                                    });

                                    const total_marks = results_payload.reduce(
                                        (acc: number, curr: any) => acc + curr.user_marks,
                                        0
                                    );

                                    try {
                                        const resp = await fetch(`${API_USER_URL}/api/sql/results`, {
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
                                            console.error("Failed to save SQL results:", errorData);
                                            alert("Failed to save SQL results. Please check your connection.");
                                            return;
                                        }
                                    } catch (error) {
                                        console.error("Error saving SQL results:", error);
                                        alert("Network error while saving SQL results. Please try again.");
                                        return;
                                    }

                                    // Cleanup local persistence
                                    clearCode();
                                    clearRunApiResponse();
                                    localStorage.removeItem(`sql_time_${assessment_id}`);
                                    localStorage.removeItem(`assessment_data_${assessment_id}`);

                                    localStorage.setItem('sql_completed', 'true');
                                    setSubmitted(true);
                                    
                                    const enabledSectionsRaw = localStorage.getItem('enabled_sections');
                                    if (enabledSectionsRaw) {
                                      const enabledSections = JSON.parse(enabledSectionsRaw);
                                      const currentIdx = enabledSections.findIndex((s: any) => s.key === 'sql');
                                      
                                      if (currentIdx !== -1 && currentIdx < enabledSections.length - 1) {
                                        const nextSection = enabledSections[currentIdx + 1];
                                        navigate(`/section/${nextSection.key}`, { state: { ...assessmentState } });
                                        return;
                                      }
                                    }
                                    navigate('/submission');
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

export default SqlSection