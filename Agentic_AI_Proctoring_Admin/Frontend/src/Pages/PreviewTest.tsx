import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import { Code2, FileText, Database, Puzzle, PenLine, Palette, BarChart3, BookOpen } from 'lucide-react'

interface TestCase {
  title: string
  description: string
  input: string
  expected_output: string
  type: string
  size: string
  marks: number
  is_hidden: boolean
}

interface CodingQuestion {
  question_id: string
  topic: string
  difficulty: string
  question_text: string
  input_types: string
  output_types: string
  languages: string[]
  marks: number
  testcases: TestCase[] | Record<string, never> | null
}

interface MCQOption {
  A: string
  B: string
  C: string
  D: string
}

interface MCQQuestion {
  question_id: number
  question_text: string
  options: MCQOption
  correct_answer: string
  marks: number
  type: string
}

interface MCQSection {
  section_id: number
  section_name: string
  questions: MCQQuestion[]
}

interface CodingSection {
  test_title: string
  coding_duration: string
  total_questions: number
  questions: CodingQuestion[]
}

interface MCQSectionData {
  test_title: string
  mcq_duration: string
  total_questions: number
  sections: MCQSection[]
}

interface SQLTableDisplay {
  table_name: string
  columns: string[]
  sample_rows: string[][]
}

interface SQLQuestion {
  question_id: string
  question_text: string
  difficulty: string
  marks: number
  table_display: SQLTableDisplay
}

interface SQLSectionData {
  test_title: string
  sql_duration: string
  total_questions: number
  questions: SQLQuestion[]
}

interface GameRoundConfig {
  round: number
  grid_size: number
}

interface GameConfig {
  game_id: string
  enabled: boolean
  duration_per_round: number
  total_duration: number
  rounds_count: number
  rounds_config: GameRoundConfig[]
}

interface GamingSectionData {
  assessment_id: string
  test_title: string
  games: GameConfig[]
}

// FITB interfaces
interface FITBQuestion {
  question_id: number
  question_text: string
  blank_count: number
  blanks: string[][]           // list of lists of accepted answers
  marks: number
  partial_marks: boolean
  difficulty: string
  type: string
}

interface FITBSection {
  section_id: number
  section_name: string
  questions: FITBQuestion[]
}

interface FITBSectionData {
  test_title: string
  fitb_duration: string
  total_questions: number
  sections: FITBSection[]
}

interface AssessmentData {
  assessment_id: string
  status: string
  category?: string
  metadata?: any
  certification_config?: any
  Coding: CodingSection | null
  MCQ: MCQSectionData | null
  SQL: SQLSectionData | null
  Gaming: GamingSectionData | null
  FITB: FITBSectionData | null
  Essay: {
    enabled: boolean;
    topic: string;
    duration: number | null;
    rubric?: {
      sections: Record<string, { name: string; max_marks: number; criteria: string[] }>
    } | null
  } | null;
  Diagram: {
    enabled: boolean;
    prompt: string;
    master_json: any;
    master_image: string | null;
  } | null;
}

const difficultyColors: Record<string, string> = {
  Easy: 'bg-green-100 text-green-700 border border-green-200',
  Medium: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  Hard: 'bg-red-100 text-red-700 border border-red-200',
}

const typeColors: Record<string, string> = {
  Default: 'bg-blue-100 text-blue-700',
  Basic: 'bg-indigo-50 text-indigo-700',
  Necessary: 'bg-indigo-50 text-indigo-700',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Normalise testcases: always returns an array (empty if null / {} / []) */
const normaliseTestCases = (
  testcases: TestCase[] | Record<string, unknown> | null | undefined
): TestCase[] => {
  if (!testcases) return []
  if (Array.isArray(testcases)) return testcases
  // It's a plain object (possibly {}) — return values if they look like TestCase objects
  const values = Object.values(testcases)
  if (values.length === 0) return []
  return values as TestCase[]
}

/** Empty-state banner used in both tabs */
const EmptyState = ({ icon, message }: { icon: React.ReactNode; message: string }) => (
  <div className="bg-white rounded-xl border border-dashed border-gray-200 shadow-sm p-12 flex flex-col items-center gap-3 text-center">
    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-400">{icon}</div>
    <p className="text-sm text-gray-400 max-w-xs">{message}</p>
  </div>
)

// ─── Component ───────────────────────────────────────────────────────────────

const PreviewTest = () => {
  const location = useLocation()
  const [data, setData] = useState<AssessmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'coding' | 'mcq' | 'sql' | 'gaming' | 'fitb' | 'essay' | 'diagram' | null>(null)
  const [expandedQuestion, setExpandedQuestion] = useState<string | number | null>(null)
  const [showStopModal, setShowStopModal] = useState(false)

  const navigate = useNavigate()

  const fetcher = async (assessment_id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/admin/test/${assessment_id}/Preview`)
      const json = await response.json()
      console.log('API response:', json)

      // Accept data even if sections are null — just not all missing entirely
      if (!json?.Coding && !json?.MCQ && !json?.SQL && !json?.Gaming && !json?.FITB && !json?.Essay) {
        setError(`Unexpected data shape: ${JSON.stringify(Object.keys(json))}`)
        return
      }

      setData(json)

      // Auto-select a tab that actually has data
      const hasGaming = !!(json.Gaming && json.Gaming.games?.[0]?.enabled)
      if (hasGaming) setActiveTab('gaming')
      else if (json.MCQ && json.MCQ.total_questions > 0) setActiveTab('mcq')
      else if (json.Coding && json.Coding.total_questions > 0) setActiveTab('coding')
      else if (json.SQL && json.SQL.total_questions > 0) setActiveTab('sql')
      else if (json.FITB && json.FITB.total_questions > 0) setActiveTab('fitb')
      else if (json.Diagram && json.Diagram.enabled) setActiveTab('diagram')
    } catch (err) {
      console.error(err)
      setError('Failed to load assessment data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const test_id = location.state?.test?.test_id
    if (test_id) fetcher(test_id)
    else {
      setError('No test ID provided.')
      setLoading(false)
    }
  }, [])

  const handleStopAssessment = async () => {
    if (!data?.assessment_id) return;

    try {
      const formData = new FormData();
      formData.append('assessment_id', data.assessment_id);
      formData.append('status', 'terminated');

      const response = await fetch('http://localhost:8000/update-test-status', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to update status');

      setData(prev => prev ? { ...prev, status: 'terminated' } : null);
      toast.success("Assessment has been terminated successfully.");
      setShowStopModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to stop assessment.");
    }
  };

  const formatDuration = (minutes: string | null | undefined) => {
    if (!minutes) return '—'
    const m = parseInt(minutes)
    if (isNaN(m)) return '—'
    const h = Math.floor(m / 60)
    if (h > 0) return `${h}h ${m % 60}m`
    return `${m}m`
  }

  // ── Derived totals (safe even when sections are null) ──────────────────────
  const hasCoding = !!(data?.Coding?.questions?.length)
  const hasMCQ = !!(data?.MCQ?.sections?.length)
  const hasSQL = !!(data?.SQL?.questions?.length)
  const hasFITB = !!(data?.FITB?.sections?.length)
  const hasGaming = !!(data?.Gaming && data?.Gaming?.games?.[0]?.enabled)
  const hasEssay = !!(data?.Essay?.enabled)
  const hasDiagram = !!(data?.Diagram?.enabled)

  // ── Render guards ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading assessment...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow text-center max-w-sm">

          <p className="text-red-500 font-medium">{error || 'No data available.'}</p>
        </div>
      </div>
    )
  }

  // ── Main UI ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <button onClick={() => navigate(-1)} className="flex gap-2 items-center text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg> Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {data.category === 'Certification'
                ? `${data.certification_config?.track_name} Assessment`
                : (data.Coding?.test_title ?? data.MCQ?.test_title ?? data.SQL?.test_title ?? data.FITB?.test_title ?? 'Assessment Preview')
              }
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">ID: {data.assessment_id}</p>
              {data.certification_config && (
                <>
                  <span className="text-gray-300">•</span>
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{data.certification_config.issuer}</p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-4 text-sm text-gray-600">
              {data.Gaming && data.Gaming.games?.[0]?.enabled && (
                <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg">
                  <span>Gaming Duration: {data.Gaming.games[0].total_duration} mins</span>
                </div>
              )}
              {data.MCQ && (
                <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg">
                  <span>MCQ Duration: {formatDuration(data.MCQ.mcq_duration)}</span>
                </div>
              )}
              {data.Coding && (
                <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg">
                  <span>Coding Duration: {formatDuration(data.Coding.coding_duration)}</span>
                </div>
              )}
              {data.SQL && (
                <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg">
                  <span>SQL Duration: {formatDuration(data.SQL.sql_duration)}</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Gaming Rounds',
              value: data.Gaming?.games?.[0]?.rounds_count ?? 0,
              color: 'orange',
              show: !!(data.Gaming && data.Gaming.games?.[0]?.enabled)
            },
            {
              label: 'MCQ Questions',
              value: data.MCQ?.total_questions ?? 0,
              color: 'purple',
              show: !!(data.MCQ?.total_questions)
            },
            {
              label: 'Coding Questions',
              value: data.Coding?.total_questions ?? 0,
              color: 'indigo',
              show: !!(data.Coding?.total_questions)
            },
            {
              label: 'SQL Questions',
              value: data.SQL?.total_questions ?? 0,
              color: 'teal',
              show: !!(data.SQL?.total_questions)
            },
            {
              label: 'Fill in Blanks',
              value: data.FITB?.total_questions ?? 0,
              color: 'amber',
              show: !!(data.FITB?.total_questions)
            },
            {
              label: 'Essay',
              value: '50 marks',
              color: 'violet',
              show: hasEssay
            },
            {
              label: 'Diagram Question',
              value: '10 marks',
              color: 'orange',
              show: hasDiagram
            },
          ].filter(card => card.show).map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-sm text-gray-500">{label}</p>
              <p className={`text-2xl font-bold text-${color}-600 mt-1`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs — only show tabs that exist */}
        <div className="flex gap-2 mb-5">
          {data.Gaming && data.Gaming.games?.[0]?.enabled && (
            <button
              onClick={() => setActiveTab('gaming')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'gaming'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
            >
              Gaming
            </button>
          )}
          {data.MCQ && data.MCQ.total_questions > 0 && (
            <button
              onClick={() => setActiveTab('mcq')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'mcq'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
            >
              MCQ
            </button>
          )}
          {data.Coding && data.Coding.total_questions > 0 && (
            <button
              onClick={() => setActiveTab('coding')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'coding'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
            >
              Coding
            </button>
          )}
          {data.SQL && data.SQL.total_questions > 0 && (
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'sql'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
            >
              SQL
            </button>
          )}
          {data.FITB && data.FITB.total_questions > 0 && (
            <button
              onClick={() => setActiveTab('fitb')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'fitb'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
            >
              Fill in the Blanks
            </button>
          )}
          {hasEssay && (
            <button
              onClick={() => setActiveTab('essay')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'essay'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
            >
              Essay
            </button>
          )}
          {hasDiagram && (
            <button
              onClick={() => setActiveTab('diagram')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'diagram'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
            >
              Diagram
            </button>
          )}
        </div>

        {/* ── Gaming Tab ── */}
        {activeTab === 'gaming' && data.Gaming && (
          <div className="space-y-4">
            {data.Gaming.games.map((game) => (
              <div key={game.game_id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-400"><Puzzle size={24} /></div>
                    <div>
                      <h3 className="font-bold text-gray-800 capitalize">{game.game_id.replace('-', ' ')}</h3>
                      <p className="text-xs text-gray-500">{game.rounds_count} Rounds • {game.duration_per_round} mins per round</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${game.enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'}`}>
                    {game.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  {game.rounds_config.map((round) => (
                    <div key={round.round} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Round {round.round}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Grid Size</span>
                        <span className="text-sm font-bold text-indigo-600">{round.grid_size}x{round.grid_size}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Coding Tab ── */}
        {activeTab === 'coding' && (
          <>
            {!hasCoding ? (
              <EmptyState icon={<Code2 size={28} />} message="No coding questions have been added to this assessment yet." />
            ) : (
              <div className="space-y-4">
                {data.Coding!.questions.map((q, idx) => {
                  const testcases = normaliseTestCases(q.testcases)

                  return (
                    <div
                      key={q.question_id}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                    >
                      {/* Question Header */}
                      <button
                        onClick={() =>
                          setExpandedQuestion(
                            expandedQuestion === q.question_id ? null : q.question_id
                          )
                        }
                        className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-indigo-100 text-indigo-700 text-sm font-bold rounded-lg flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{q.topic}</p>
                            <p className="text-xs text-gray-400">{q.question_id}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full ${difficultyColors[q.difficulty] ?? 'bg-gray-100 text-gray-600'
                              }`}
                          >
                            {q.difficulty ?? 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                            {q.marks ?? 0} marks
                          </span>
                          <span className="text-gray-400 text-sm ml-2">
                            {expandedQuestion === q.question_id ? '▲' : '▼'}
                          </span>
                        </div>
                      </button>

                      {expandedQuestion === q.question_id && (
                        <div className="border-t border-gray-100 px-6 py-5">
                          {/* Question Text */}
                          <div className="bg-gray-50 rounded-lg p-4 mb-5">
                            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                              {q.question_text}
                            </p>
                          </div>

                          {/* Meta */}
                          <div className="flex flex-wrap gap-3 mb-5">
                            {q.input_types && (
                              <div className="text-xs text-gray-500">
                                <span className="font-medium text-gray-700">Input:</span>{' '}
                                {q.input_types}
                              </div>
                            )}
                            {q.output_types && (
                              <div className="text-xs text-gray-500">
                                <span className="font-medium text-gray-700">Output:</span>{' '}
                                {q.output_types}
                              </div>
                            )}
                            <div className="flex gap-1 flex-wrap">
                              {(q.languages ?? []).map((lang) => (
                                <span
                                  key={lang}
                                  className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded"
                                >
                                  {lang}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Test Cases */}
                          <h3 className="text-sm font-semibold text-gray-700 mb-3">Test Cases</h3>
                          {testcases.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-lg px-4 py-3 border border-dashed border-gray-200">
                              <span>🧪</span>
                              <span>No test cases defined for this question.</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {testcases.map((tc, tcIdx) => (
                                <div
                                  key={tc.title ?? tcIdx}
                                  className={`rounded-lg border p-4 ${tc.is_hidden
                                    ? 'border-dashed border-gray-300 bg-gray-50'
                                    : 'border-gray-200 bg-white'
                                    }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-700">
                                      {tc.title ?? `Test Case ${tcIdx + 1}`}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      {tc.type && (
                                        <span
                                          className={`text-xs px-2 py-0.5 rounded-full ${typeColors[tc.type] ?? 'bg-gray-100 text-gray-600'
                                            }`}
                                        >
                                          {tc.type}
                                        </span>
                                      )}
                                      {tc.is_hidden && (
                                        <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                                          Hidden
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-400">{tc.marks ?? 0}pts</span>
                                    </div>
                                  </div>
                                  {tc.description && (
                                    <p className="text-xs text-gray-500 mb-2">{tc.description}</p>
                                  )}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-gray-100 rounded p-2">
                                      <p className="text-xs text-gray-400 mb-1">Input</p>
                                      <code className="text-xs text-gray-700">
                                        {tc.input ?? '—'}
                                      </code>
                                    </div>
                                    <div className="bg-green-50 rounded p-2">
                                      <p className="text-xs text-gray-400 mb-1">Expected</p>
                                      <code className="text-xs text-green-700">
                                        {tc.expected_output ?? '—'}
                                      </code>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── MCQ Tab ── */}
        {activeTab === 'mcq' && (
          <>
            {!hasMCQ ? (
              <EmptyState icon={<FileText size={28} />} message="No MCQ sections have been added to this assessment yet." />
            ) : (
              <div className="space-y-6">
                {data.MCQ!.sections.map((section) => (
                  <div
                    key={section.section_id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    {/* Section Header */}
                    <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-md flex items-center justify-center">
                            {section.section_id}
                          </span>
                          <h2 className="font-semibold text-gray-800 text-sm">{section.section_name}</h2>
                        </div>
                        <span className="text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                          {section.questions?.length ?? 0} questions
                        </span>
                      </div>
                    </div>

                    {/* Questions */}
                    {!section.questions?.length ? (
                      <div className="px-6 py-6">
                        <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-lg px-4 py-3 border border-dashed border-gray-200">
                          <span>📭</span>
                          <span>No questions in this section.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {section.questions.map((q, idx) => (
                          <div key={q.question_id} className="px-6 py-4">
                            <button
                              onClick={() =>
                                setExpandedQuestion(
                                  expandedQuestion === `mcq-${q.question_id}`
                                    ? null
                                    : `mcq-${q.question_id}`
                                )
                              }
                              className="w-full text-left"
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-xs text-gray-400 font-medium w-6 mt-0.5 shrink-0">
                                  {idx + 1}.
                                </span>
                                <p className="text-sm text-gray-700 flex-1">{q.question_text}</p>
                                <span className="text-gray-400 text-xs ml-2 shrink-0">
                                  {expandedQuestion === `mcq-${q.question_id}` ? '▲' : '▼'}
                                </span>
                              </div>
                            </button>

                            {expandedQuestion === `mcq-${q.question_id}` && (
                              <div className="mt-3 ml-9">
                                {!q.options || Object.keys(q.options).length === 0 ? (
                                  <p className="text-xs text-gray-400 italic">No options available.</p>
                                ) : (
                                  <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(q.options).map(([key, value]) => (
                                      <div
                                        key={key}
                                        className={`text-xs px-3 py-2 rounded-lg border ${value === q.correct_answer
                                          ? 'bg-green-50 border-green-300 text-green-700 font-medium'
                                          : 'bg-gray-50 border-gray-200 text-gray-600'
                                          }`}
                                      >
                                        {value === q.correct_answer && (
                                          <span className="mr-1">✓</span>
                                        )}
                                        <span className="font-semibold mr-1">{key}.</span>
                                        {value}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SQL Tab ── */}
        {activeTab === 'sql' && (
          <>
            {!hasSQL ? (
              <EmptyState icon={<Database size={28} />} message="No SQL questions have been added to this assessment yet." />
            ) : (
              <div className="space-y-4">
                {data.SQL!.questions.map((q, idx) => (
                  <div
                    key={q.question_id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    {/* Question Header */}
                    <button
                      onClick={() =>
                        setExpandedQuestion(
                          expandedQuestion === `sql-${q.question_id}` ? null : `sql-${q.question_id}`
                        )
                      }
                      className="w-full text-left px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-lg flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{q.question_text}</p>
                          <p className="text-xs text-gray-400">{q.question_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${difficultyColors[q.difficulty] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {q.difficulty ?? 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                          {q.marks ?? 0} marks
                        </span>
                        <span className="text-gray-400 text-sm ml-2">
                          {expandedQuestion === `sql-${q.question_id}` ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>

                    {expandedQuestion === `sql-${q.question_id}` && (
                      <div className="border-t border-gray-100 px-6 py-5">
                        {/* Table Schema & Sample Data */}
                        {q.table_display && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                              Table: <span className="text-indigo-600">{q.table_display.table_name}</span>
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                <thead>
                                  <tr className="bg-indigo-50">
                                    {q.table_display.columns.map((col) => (
                                      <th key={col} className="px-4 py-2 text-left font-semibold text-indigo-700 border-b border-gray-200">
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {q.table_display.sample_rows.map((row, rIdx) => (
                                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      {row.map((cell, cIdx) => (
                                        <td key={cIdx} className="px-4 py-2 text-gray-700 border-b border-gray-100">
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── FITB Tab ── */}
        {activeTab === 'fitb' && (
          <>
            {!hasFITB ? (
              <EmptyState icon={<BookOpen size={28} />} message="No Fill in the Blanks questions have been added to this assessment yet." />
            ) : (
              <div className="space-y-6">
                {data.FITB!.sections.map((section) => (
                  <div
                    key={section.section_id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    {/* Section Header */}
                    <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-indigo-500 text-white text-xs font-bold rounded-md flex items-center justify-center">
                            {section.section_id}
                          </span>
                          <h2 className="font-semibold text-gray-800 text-sm">{section.section_name}</h2>
                        </div>
                        <span className="text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                          {section.questions?.length ?? 0} questions
                        </span>
                      </div>
                    </div>

                    {/* Questions */}
                    {!section.questions?.length ? (
                      <div className="px-6 py-6">
                        <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-lg px-4 py-3 border border-dashed border-gray-200">
                          <span>📭</span>
                          <span>No questions in this section.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {section.questions.map((q, idx) => {
                          const isExpanded = expandedQuestion === `fitb-${q.question_id}`
                          // Split sentence on #blank# tokens for inline display
                          const parts = q.question_text.split('#blank#')

                          return (
                            <div key={q.question_id} className="px-6 py-4">
                              <button
                                onClick={() =>
                                  setExpandedQuestion(isExpanded ? null : `fitb-${q.question_id}`)
                                }
                                className="w-full text-left"
                              >
                                <div className="flex items-start gap-3">
                                  <span className="text-xs text-gray-400 font-medium w-6 mt-0.5 shrink-0">
                                    {idx + 1}.
                                  </span>
                                  {/* Inline preview with blank markers */}
                                  <p className="text-sm text-gray-700 flex-1 leading-relaxed">
                                    {parts.map((part, i) => (
                                      <span key={i}>
                                        {part}
                                        {i < parts.length - 1 && (
                                          <span className="inline-block mx-1 px-3 py-0.5 bg-indigo-50 border border-indigo-300 text-indigo-700 rounded text-xs font-mono align-middle">
                                            _blank_{i + 1}_
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </p>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${difficultyColors[q.difficulty] ?? 'bg-gray-100 text-gray-600'
                                      }`}>
                                      {q.difficulty}
                                    </span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                                      {q.marks} marks
                                    </span>
                                    <span className="text-gray-400 text-xs ml-1">
                                      {isExpanded ? '▲' : '▼'}
                                    </span>
                                  </div>
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="mt-4 ml-9 space-y-3">
                                  {/* Partial marks badge */}
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${q.partial_marks
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-500'
                                      }`}>
                                      {q.partial_marks ? '✓ Partial Marks Enabled' : '✗ Full Marks Only'}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {q.blank_count} blank{q.blank_count !== 1 ? 's' : ''}
                                    </span>
                                  </div>

                                  {/* Accepted answers per blank */}
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-600">Accepted Answers:</p>
                                    {q.blanks.map((accepted, bIdx) => (
                                      <div key={bIdx} className="flex items-center gap-2">
                                        <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-mono whitespace-nowrap">
                                          Blank {bIdx + 1}
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                          {accepted.map((ans) => (
                                            <span
                                              key={ans}
                                              className="text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded font-medium"
                                            >
                                              ✓ {ans}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Essay Tab ── */}
        {activeTab === 'essay' && hasEssay && data.Essay && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-400 shadow-sm"><PenLine size={28} /></div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Essay / Long Answer Preview</h3>
                  <p className="text-sm text-gray-500 font-medium">AI-powered evaluation based on custom rubric</p>
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Time Limit</p>
                    <p className="text-lg font-black text-indigo-600 leading-none">{data.Essay.duration || 30} Mins</p>
                  </div>
                  <div className="w-px h-8 bg-gray-100 mx-2"></div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Max Score</p>
                    <p className="text-lg font-black text-gray-800 leading-none">50 Marks</p>
                  </div>
                </div>
              </div>

              {/* Topic */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  Prompt / Topic for Candidate
                </div>
                <p className="text-lg font-bold text-gray-800 leading-relaxed">
                  {data.Essay.topic || "No topic provided for this essay."}
                </p>
              </div>

              {/* Rubric Breakdown */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  Grading Rubric Configuration
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(data.Essay.rubric?.sections || {}).map(([key, section]) => (
                    <div key={key} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-violet-200 transition-colors shadow-sm group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🎯</span>
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{section.name}</h4>
                        </div>
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100">
                          {section.max_marks} MARKS
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {section.criteria.map((c, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px] text-gray-500 font-medium leading-relaxed">
                            <span className="text-indigo-400 mt-1 shrink-0">✓</span>
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
            </div>
          </div>
        )}

        {/* ── Diagram Tab ── */}
        {activeTab === 'diagram' && hasDiagram && data.Diagram && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-400 shadow-sm"><Palette size={28} /></div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">System Design / Diagram Preview</h3>
                  <p className="text-sm text-gray-500 font-medium">Visual high-fidelity master solution & requirements</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100">
                    Master Solution
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  Problem Statement / Prompt
                </div>
                <p className="text-base font-semibold text-gray-800 leading-relaxed">
                  {data.Diagram.prompt || "No prompt provided for this diagram question."}
                </p>
              </div>

              {/* Master Diagram Image */}
              <div className="relative group">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  Master Solution PNG Snapshot
                </div>

                <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-4 min-h-[400px] flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-200 group-hover:bg-indigo-50/10">
                  {data.Diagram.master_image ? (
                    <img
                      src={data.Diagram.master_image}
                      alt="Master Diagram Solution"
                      className="max-w-full max-h-[600px] object-contain rounded-xl shadow-lg transition-transform duration-500 group-hover:scale-[1.02]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x450?text=Diagram+Image+Load+Failed';
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl mb-4 opacity-20">🖼️</div>
                      <p className="text-sm font-bold text-gray-400">No master diagram image found.</p>
                      <p className="text-xs text-gray-300 mt-1 uppercase tracking-widest font-black">Admin must capture & save the diagram first</p>
                    </div>
                  )}
                </div>

                {/* Overlay Badge */}
                {data.Diagram.master_image && (
                  <div className="absolute top-12 right-6 px-4 py-2 bg-black/60 backdrop-blur-md text-white rounded-xl text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    High Fidelity Preview
                  </div>
                )}
              </div>

              {/* Metadata Stats */}
              <div className="mt-10 grid grid-cols-4 gap-4">
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Max Marks</p>
                  <p className="text-lg font-black text-gray-800 leading-none">10 Marks</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Node Count</p>
                  <p className="text-lg font-black text-gray-800 leading-none">
                    {data.Diagram.master_json?.nodes?.length || 0} Nodes
                  </p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Edge Count</p>
                  <p className="text-lg font-black text-gray-800 leading-none">
                    {data.Diagram.master_json?.edges?.length || 0} Links
                  </p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Evaluation</p>
                  <p className="text-lg font-black text-indigo-600 leading-none flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    AI Assisted
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {data.status !== 'terminated' && (
        <button onClick={() => navigate("/start-test", { state: { assessment_id: data.assessment_id } })}
          className="fixed right-6 bottom-6 group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-5 py-3 rounded-2xl shadow-lg hover:shadow-indigo-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 active:scale-95 active:translate-y-0">
          {/* Pulsing dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
          </span>

          <span className="text-sm font-semibold tracking-wide">Initiate Test</span>

          {/* Animated arrow */}
          <svg
            className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      )}


      <div className="fixed top-4 right-4 z-[999]">
        <div className="react-toastify">
          {/* This is a placeholder for context, actual ToastContainer is used */}
        </div>
      </div>
    </div>
  )
}

export default PreviewTest