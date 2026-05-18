import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router';
import { 
    AlertTriangle, 
    Target, BarChart3, Fingerprint, Eye, BookOpen, 
    Camera, Puzzle, Smartphone, Download, XCircle, FileText, 
    ArrowLeft, User, ShieldCheck, AlertCircle, CheckCircle2, 
    Code2, Database, Award, BarChart2, 
    RefreshCw, ShieldAlert, Bot, Copy, PenLine, Building2, Flag, Brain, Search, Lightbulb, Check, ArrowRight, Send
} from 'lucide-react';
import NavBar from '../Components/NavBar';
import RemoteVideoPlayer from '../Components/RemoteVideoPlayer';


/* ─────────────── constants ─────────────── */

const VIOLATION_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
    illegal_object:   { label: 'Illegal Object',   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-100' },
    low_attention:    { label: 'Low Attention',    color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-100' },
    head_turned:      { label: 'Head Turned',      color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    drowsy:           { label: 'Drowsy',           color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    face_not_visible: { label: 'Face Not Visible', color: 'text-indigo-700',   bg: 'bg-indigo-50',   border: 'border-indigo-100' },
};

const formatTime = (timeStr: string) => {
    const parts = timeStr.split('_');
    if (parts.length < 3) return timeStr;
    return `${parts[0]}:${parts[1]}:${parts[2]}`;
};

/* ─────────────── chart primitives (no external lib) ─────────────── */

const Ring = ({ pct, size = 120, stroke = 10, color = '#4f46e5', children }: {
    pct: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode;
}) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    return (
        <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
                    strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - Math.min(Math.max(pct, 0), 100) / 100)}
                    style={{ transition: 'stroke-dashoffset 1s ease' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">{children}</div>
        </div>
    );
};

const ThinBar = ({ pct, colorClass, delay = 0 }: { pct: number; colorClass: string; delay?: number }) => (
    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, delay, ease: 'easeOut' }}
            className={`h-full rounded-full ${colorClass}`} />
    </div>
);

const Sparkline = ({ values, color = '#4f46e5', fill = false }: {
    values: number[]; color?: string; fill?: boolean;
}) => {
    if (!values || values.length < 2) return null;
    const w = 220, h = 60, pad = 6;
    const max = Math.max(...values, 1);
    const pts = values.map((v, i) => [
        pad + (i / (values.length - 1)) * (w - 2 * pad),
        h - pad - (v / max) * (h - 2 * pad),
    ]);
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${d} L${pts[pts.length - 1][0].toFixed(1)},${(h - pad).toFixed(1)} L${pts[0][0].toFixed(1)},${(h - pad).toFixed(1)} Z`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
            {fill && <path d={area} fill={color} opacity="0.12" />}
            <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill={color} />
            ))}
        </svg>
    );
};

const VBarChart = ({ bars }: { bars: { label: string; value: number; max: number; color: string }[] }) => {
    const globalMax = Math.max(...bars.map(b => b.value), 1);
    return (
        <div className="flex items-end gap-4 h-36">
            {bars.map((b, i) => {
                const pct = (b.value / globalMax) * 100;
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-black text-gray-500">{b.value}</span>
                        <div className="w-full flex items-end" style={{ height: 92 }}>
                            <motion.div
                                initial={{ height: 0 }} animate={{ height: `${pct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                                className={`w-full rounded-t-lg ${b.color}`}
                                style={{ minHeight: b.value > 0 ? 4 : 0 }} />
                        </div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wide text-center leading-tight">{b.label}</span>
                    </div>
                );
            })}
        </div>
    );
};

/* ─────────────── Code Integrity Card ─────────────── */

const CodeIntegritySection = ({ data, index = 0, total = 1 }: { data: any; index?: number; total?: number }) => {
    if (!data) return null;

    const plagScore   = Math.round((data.result?.plagiarism?.plagiarism_score ?? 0) * 100);
    const aiScore     = Math.round((data.result?.ai_detection?.ai_score ?? 0) * 100);
    const isPlagiarized = data.result?.plagiarism?.is_plagiarized ?? false;
    const isAI          = data.result?.ai_detection?.is_ai_generated ?? false;
    const features      = data.result?.ai_detection?.features ?? {};

    const plagColor = isPlagiarized ? '#ef4444' : plagScore > 30 ? '#f59e0b' : '#10b981';
    const aiColor   = isAI          ? '#ef4444' : aiScore   > 40 ? '#f59e0b' : '#10b981';

    const featureItems = [
        { label: 'Avg Line Length',         value: features.avg_line_length ?? '--',                           unit: 'chars' },
        { label: 'Unique Token Ratio',       value: features.unique_token_ratio != null ? `${Math.round(features.unique_token_ratio * 100)}%` : '--', unit: '' },
        { label: 'Indentation Consistent',  value: features.indentation_consistent ? 'Yes' : 'No',            unit: '' },
        { label: 'Repetitive Patterns',      value: features.repetitive_patterns    ? 'Yes' : 'No',            unit: '' },
    ];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
            <div className="flex items-center gap-2.5 mb-7">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <ShieldAlert size={14} />
                </div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Code Integrity Analysis</h3>
                <span className="ml-auto px-2.5 py-1 bg-indigo-50 text-[9px] font-black text-gray-400 rounded-lg border border-gray-100 uppercase tracking-widest">
                    {total > 1 ? `Submission ${index + 1}/${total} · ` : ''}{data.question_id} · {data.language}
                </span>
            </div>

            {/* Two rings side by side */}
            <div className="grid grid-cols-2 gap-6 mb-7">
                {/* Plagiarism */}
                <div className="flex flex-col items-center gap-3 p-5 rounded-xl border bg-indigo-50/50">
                    <Ring pct={plagScore} size={100} stroke={10} color={plagColor}>
                        <span className="text-lg font-black text-gray-800">{plagScore}%</span>
                    </Ring>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Plagiarism Score</p>
                        <span className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border
                            ${isPlagiarized ? 'bg-red-50 text-red-600 border-red-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                            {isPlagiarized ? <XCircle size={10} /> : <CheckCircle2 size={10} />}
                            {isPlagiarized ? 'Plagiarized' : 'Original'}
                        </span>
                    </div>
                </div>

                {/* AI Detection */}
                <div className="flex flex-col items-center gap-3 p-5 rounded-xl border bg-indigo-50/50">
                    <Ring pct={aiScore} size={100} stroke={10} color={aiColor}>
                        <span className="text-lg font-black text-gray-800">{aiScore}%</span>
                    </Ring>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Detection Score</p>
                        <span className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border
                            ${isAI ? 'bg-red-50 text-red-600 border-red-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                            {isAI ? <Bot size={10} /> : <CheckCircle2 size={10} />}
                            {isAI ? 'AI Generated' : 'Human Written'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Feature breakdown */}
            <div className="border-t border-gray-100 pt-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Code Feature Analysis</p>
                <div className="grid grid-cols-2 gap-3">
                    {featureItems.map((f, i) => (
                        <div key={i} className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide leading-tight">{f.label}</span>
                            <span className="text-sm font-black text-gray-800 ml-2 shrink-0">
                                {f.value}{f.unit ? ` ${f.unit}` : ''}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Submission meta */}
            <div className="mt-4 flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100">
                <Copy size={13} className="text-indigo-400 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-0.5">Submission ID</p>
                    <p className="text-[11px] font-bold text-indigo-700 truncate font-mono">{data._id}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-0.5">Timestamp</p>
                    <p className="text-[10px] font-bold text-indigo-700">
                        {data.result?.timestamp ? new Date(data.result.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '--'}
                    </p>
                </div>
            </div>
        </div>
    );
};

/* ─────────────── main component ─────────────── */

const CandidateAnalytics = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { candidate, testId } = location.state || {};
    console.log(candidate, testId);

    const [analytics, setAnalytics]           = useState<any>(null);
    const [showInvigilator, setShowInvigilator] = useState(false);
    const [activeTab, setActiveTab]            = useState<'report' | 'video' | 'evidence'>('report');
    const [viewMode, setViewMode]              = useState<'laptop' | 'mobile' | 'both'>('both');
    const [evidenceLogs, setEvidenceLogs]      = useState<any[]>([]);
    const [evidenceFilter, setEvidenceFilter]  = useState<string>('all');
    const [lightboxImg, setLightboxImg]        = useState<{ url: string; type: string; time: string } | null>(null);
    const [candidateResult, setCandidateResult] = useState<any>(null);
    const [codeAnalytics, setCodeAnalytics]    = useState<any[]>([]);
    const [riskData, setRiskData] = useState<any>(null);
    const [testInfo, setTestInfo] = useState<any>(null);
    // ── NEW: mobile risk state ──
    const [mobileRiskData, setMobileRiskData] = useState<any>(null);
    const [essayResult, setEssayResult]        = useState<any>(null);
    const [diagramResult, setDiagramResult]    = useState<any>(null);
    const [showCertificate, setShowCertificate] = useState(false);
    

    /* ── fetchers ── */
    const CandidateResult = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/candidate/${testId}/${candidate.email}/results`);
            const data = await response.json();
            setCandidateResult(data);
        } catch (err) { console.log(err); }
    };

    const FetcherRiskScore = async () => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/candidate/${testId}/${candidate.email}/risk-score`);
            const data = await response.json();
            console.info(data);
             setRiskData(data); 
            
        } catch (error) {
            console.log(error);
            
        }
    }

    const FetcherRiskScoreMobile = async () => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/candidate/${testId}/${candidate.email}/risk-score/mobile`)
            const data = await response.json()
            console.log(data);
            // ── NEW: store mobile risk data in state ──
            setMobileRiskData(data);
        } catch (error) {
            console.log(error);
            
        }
    }


    const FetcherLogs = async () => {
        try {
            const res  = await fetch(`${import.meta.env.VITE_API_URL}/EvidencesLogs/${testId}/${candidate.email}/get`);
            const data = await res.json();
            console.log(data);
            if (Array.isArray(data)) setEvidenceLogs(data);
        } catch (err) { console.log(err); }
    };

    const CodeFetcher = async () => {
        try {
            const Codedata = await fetch(`${import.meta.env.VITE_API_URL}/EvidencesLogs/${testId}/${candidate.email}/analytics/code`);
            const data = await Codedata.json();
            console.log(data);
            if (Array.isArray(data)) setCodeAnalytics(data);
        } catch (error) {
            console.log(error);
        }
    };

    const EssayFetcher = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/candidate/${testId}/${candidate.email}/essay-result`);
            if (res.ok) {
                const data = await res.json();
                setEssayResult(data);
            }
        } catch (err) {
            console.log('Essay result not found:', err);
        }
    };

    const DiagramFetcher = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_USER_API_URL}/api/diagram/results/${testId}`);
            if (res.ok) {
                const data = await res.json();
                // Filter for this specific candidate
                const candidateResult = data.find((r: any) => r.email === candidate.email);
                setDiagramResult(candidateResult);
            }
        } catch (err) {
            console.log('Diagram result error:', err);
        }
    };

    useEffect(() => {
      FetcherRiskScoreMobile()
    }, [])


    useEffect(() => {
      FetcherRiskScore();
    }, [])
    
    useEffect(() => {
        CodeFetcher();
    }, []);

    /* ── derived stats from candidateResult ── */
    const ds = (() => {
        if (!candidateResult || !testInfo) return null;

        const mcqList:  any[] = candidateResult.MCQ         || [];
        const codList:  any[] = candidateResult.Coding       || [];
        const sqlList:  any[] = candidateResult.SQL          || [];
        const fitbList: any[] = candidateResult.FITB || [];
        const pipeList: any[] = candidateResult.Pipe_Puzzle  || [];

        const bestOf = <T extends any>(arr: T[], key: (x: T) => number): T | null =>
            arr.reduce((b: T | null, c: T) => key(c) > key(b ?? ({} as T)) ? c : (b ?? c), null);

        const bestMCQ = bestOf(mcqList, (x: any) => x.user_total_marks ?? 0);
        const bestCod = bestOf(codList, (x: any) => x.total_marks       ?? 0);
        const bestSQL = bestOf(sqlList, (x: any) => x.total_marks        ?? 0);
        const bestFITB = bestOf(fitbList, (x: any) => x.user_total_marks ?? 0);

        /* marks configuration from testInfo */
        const hasMCQ    = !!testInfo?.MCQ;
        const hasCod    = !!testInfo?.Coding;
        const hasSQL    = !!testInfo?.SQL;
        const hasFITB   = !!testInfo?.FITB;
        const hasGaming = !!testInfo?.Gaming?.games?.[0]?.enabled;
        const hasEssay  = !!testInfo?.Essay?.enabled;

        const mcqScore  = (bestMCQ as any)?.user_total_marks ?? 0;
        const mcqMax    = hasMCQ ? ((bestMCQ as any)?.total_marks ?? 30) : 0;
        const codScore  = (bestCod as any)?.total_marks        ?? 0;
        const codMax    = hasCod ? 30 : 0;
        const sqlScore  = (bestSQL as any)?.total_marks        ?? 0;
        const sqlMax    = hasSQL ? 10 : 0;
        const fitbScore = (bestFITB as any)?.user_total_marks ?? 0;
        const fitbMax   = hasFITB ? ((bestFITB as any)?.total_marks ?? 20) : 0;
        const pipePass  = pipeList.filter((p: any) => p.scores?.[0]?.success).length;
        const pipeMax   = hasGaming ? pipeList.length : 0;

        /* essay score */
        const essayEv = essayResult?.result || essayResult?.evaluation;
        const essayScore = Number(essayEv?.total_score ?? essayEv?.score ?? 0);
        
        let essayMax = 0;
        if (hasEssay) {
            const aiRubric = essayResult?.rubric_used?.sections || {};
            const aiSections = essayEv?.sections || {};
            const sectionKeys = Object.keys(aiRubric).length > 0 ? Object.keys(aiRubric) : Object.keys(aiSections);
            
            if (sectionKeys.length > 0) {
                essayMax = sectionKeys.reduce((sum, k) => sum + Number(aiRubric[k]?.max_marks ?? aiSections[k]?.max ?? 10), 0);
            } else {
                let parsedRubric = testInfo?.Essay?.rubric;
                if (typeof parsedRubric === 'string') {
                    try { parsedRubric = JSON.parse(parsedRubric); } catch (e) {}
                }
                essayMax = Object.values(parsedRubric?.sections || {}).reduce((s: any, sec: any) => s + Number(sec.max_marks || 0), 0) as number;
            }
        }

        const totalScore = Number(mcqScore) + Number(codScore) + Number(sqlScore) + Number(fitbScore) + Number(essayScore);
        const totalMax   = Number(mcqMax) + Number(codMax) + Number(sqlMax) + Number(fitbMax) + Number(essayMax);

        /* Certification Logic */
        const isCertification = testInfo?.category === 'Certification';
        const certConfig = testInfo?.certification_config;
        const thresholds = certConfig?.thresholds || {};
        const globalThreshold = certConfig?.global_threshold || 60;

        const checkPass = (score: number, max: number, key: string) => {
            const threshold = thresholds[key] || globalThreshold;
            return max > 0 ? (score / max) * 100 >= threshold : true;
        };

        const sectionPass = {
            mcq: checkPass(mcqScore, mcqMax, 'mcq'),
            coding: checkPass(codScore, codMax, 'coding'),
            sql: checkPass(sqlScore, sqlMax, 'sql'),
            fitb: checkPass(fitbScore, fitbMax, 'fitb'),
            essay: checkPass(essayScore, essayMax, 'essay'),
            gaming: hasGaming ? (pipePass / pipeMax) * 100 >= (thresholds['gaming'] || globalThreshold) : true
        };

        const isPassed = isCertification ? (
            Object.values(sectionPass).every(v => v) && 
            (totalScore / totalMax) * 100 >= globalThreshold
        ) : false;

        /* details */
        const mcqResults   = (bestMCQ as any)?.MCQ_Result ?? [];
        const mcqAnswered  = mcqResults.filter((q: any) => q.user_answer !== '').length;
        const mcqSkipped   = mcqResults.filter((q: any) => q.user_answer === '').length;
        const mcqCorrect   = mcqResults.filter((q: any) => q.Mark > 0).length;
        const mcqWrong     = mcqAnswered - mcqCorrect;

        const codResults   = (bestCod as any)?.results ?? [];
        const codAttempted = codResults.filter((q: any) => q.code?.trim()).length;
        const codPassed    = codResults.filter((q: any) => q.status === 'Passed').length;
        const codTotalQ    = codResults.length;

        const sqlResults   = (bestSQL as any)?.results ?? [];
        const sqlAttempted = sqlResults.filter((q: any) => q.query?.trim()).length;
        const sqlPassed    = sqlResults.filter((q: any) => q.status === 'Passed').length;
        const sqlTotalQ    = sqlResults.length;

        const mcqAccuracy = mcqAnswered > 0 ? Math.round((mcqCorrect / mcqAnswered) * 100) : 0;
        const codAccuracy = codAttempted > 0 ? Math.round((codPassed / codAttempted) * 100) : 0;
        const sqlAccuracy = sqlAttempted > 0 ? Math.round((sqlPassed / sqlAttempted) * 100) : 0;

        const fitbResults = (bestFITB as any)?.FITB_Result ?? [];
        const fitbAnswered = fitbResults.filter((q: any) => q.user_answer !== '').length;
        const fitbCorrect = fitbResults.filter((q: any) => q.Mark > 0).length;
        const fitbAccuracy = fitbAnswered > 0 ? Math.round((fitbCorrect / fitbAnswered) * 100) : 0;

        const mcqSeries = mcqList.map((a: any) => a.user_total_marks ?? 0);
        const codSeries = codList.map((a: any) => a.total_marks       ?? 0);
        const sqlSeries = sqlList.map((a: any) => a.total_marks        ?? 0);

        const pipeSucc      = pipeList.filter((p: any) => p.scores?.[0]?.success);
        const pipeBestTime  = pipeSucc.length ? Math.min(...pipeSucc.map((p: any) => p.scores[0].time)) : null;
        const pipeAvgMoves  = pipeSucc.length ? Math.round(pipeSucc.reduce((s: number, p: any) => s + p.scores[0].moves, 0) / pipeSucc.length) : null;
        const pipeAvgRot    = pipeSucc.length ? Math.round(pipeSucc.reduce((s: number, p: any) => s + p.scores[0].rotations, 0) / pipeSucc.length) : null;
        const pipeTimeSeries = pipeList.map((p: any) => p.scores?.[0]?.time ?? 0);

        return {
            totalScore, totalMax,
            mcqScore, mcqMax, codScore, codMax, sqlScore, sqlMax, fitbScore, fitbMax,
            essayScore, essayMax,
            pipePass, pipeMax,
            isCertification, isPassed, sectionPass, certConfig,
            hasMCQ, hasCod, hasSQL, hasFITB, hasGaming, hasEssay,
            mcqAnswered, mcqSkipped, mcqCorrect, mcqWrong,
            codAttempted, codPassed, codTotalQ,
            sqlAttempted, sqlPassed, sqlTotalQ,
            fitbAnswered, fitbCorrect,
            mcqAccuracy, codAccuracy, sqlAccuracy, fitbAccuracy,
            mcqSeries, codSeries, sqlSeries,
            pipeBestTime, pipeAvgMoves, pipeAvgRot, pipeTimeSeries,
            bestMCQ, bestCod, bestSQL, bestFITB,
            mcqAttempts: mcqList.length,
            codAttempts: codList.length,
            sqlAttempts: sqlList.length,
            fitbAttempts: fitbList.length,
            pipeAttempts: pipeList.length,
            summary: candidateResult.summary,
        };
    })();;

    /* ── effects ── */
    useEffect(() => {
        const fetchTestInfo = async () => {
            if (!testId) return;
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/test/${testId}/Preview`);
                setTestInfo(await res.json());
            } catch (err) { console.error(err); }
        };
        fetchTestInfo();
    }, [testId]);

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!testId || !candidate?.candidate_id) return;
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/test/${testId}/candidate/${candidate.candidate_id}/analytics`);
                setAnalytics(await res.json());
            } catch (err) { console.error(err); }
        };
        fetchAnalytics();
    }, [testId, candidate]);

    useEffect(() => { FetcherLogs(); CandidateResult(); EssayFetcher(); DiagramFetcher(); }, []);

    if (!candidate) return (
        <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center p-4">
            <p className="text-gray-500 mb-4 font-bold">No candidate data found</p>
            <button onClick={() => navigate(-1)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl">Go Back</button>
        </div>
    );

    const violationTypes = ['all', ...Array.from(new Set(evidenceLogs.map(l => l.type)))];
    const filteredLogs   = evidenceFilter === 'all' ? evidenceLogs : evidenceLogs.filter(l => l.type === evidenceFilter);
    const typeCounts     = evidenceLogs.reduce((acc: Record<string, number>, log) => {
        acc[log.type] = (acc[log.type] || 0) + 1; return acc;
    }, {});

    /* score helpers */
    const finalScore = ds?.totalScore ?? analytics?.secured_marks ?? 0;
    const finalMax   = ds?.totalMax   ?? analytics?.total_marks   ?? 0;
    const finalPct   = finalMax > 0 ? Math.round((finalScore / finalMax) * 100) : 0;
    const ringColor  = finalPct >= 80 ? '#10b981' : finalPct >= 60 ? '#f59e0b' : '#ef4444';
    const grade      = finalPct >= 90 ? 'A+' : finalPct >= 80 ? 'A' : finalPct >= 70 ? 'B' : finalPct >= 60 ? 'C' : 'D';
    const perfLabel  = finalMax === 0 ? 'Not Attempted' : finalPct >= 80 ? 'Excellent' : finalPct >= 60 ? 'Good' : 'Needs Work';

    /* ═══════════════════════════════════════════════ RENDER ═══════════════════════════════════════════════ */
    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans pb-16">
            <NavBar />

            {/* ── Lightbox – unchanged ── */}
            {lightboxImg && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
                    onClick={() => setLightboxImg(null)}>
                    <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
                        <button className="absolute -top-10 right-0 text-white text-sm font-bold uppercase tracking-widest opacity-70 hover:opacity-100"
                            onClick={() => setLightboxImg(null)}>Close ✕</button>
                        <img src={lightboxImg.url} alt={lightboxImg.type} className="w-full rounded-2xl shadow-2xl" />
                        <div className="mt-4 flex items-center justify-between">
                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border
                                ${VIOLATION_META[lightboxImg.type]?.bg || 'bg-indigo-50'}
                                ${VIOLATION_META[lightboxImg.type]?.color || 'text-gray-700'}
                                ${VIOLATION_META[lightboxImg.type]?.border || 'border-gray-100'}`}>
                                {VIOLATION_META[lightboxImg.type]?.label || lightboxImg.type}
                            </span>
                            <span className="text-white/60 text-xs font-mono">{formatTime(lightboxImg.time)}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[1800px] mx-auto px-10 py-8 pt-24">

                {/* ── Header – unchanged ── */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate(-1)}
                            className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 hover:bg-indigo-50 transition-colors text-gray-600 active:scale-95">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-black text-[#1e293b] tracking-tight uppercase">{candidate.name}</h1>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest leading-none
                                    ${analytics?.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                    {analytics?.status || 'Active'}
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Candidate Assessment Report</p>
                        </div>
                    </div>

                    {ds?.isCertification && (
                        <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all duration-500 shadow-lg ${ds.isPassed ? 'bg-indigo-50 border-indigo-200' : 'bg-red-50 border-red-200'}`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${ds.isPassed ? 'bg-indigo-500 text-white' : 'bg-red-500 text-white'}`}>
                                {ds.isPassed ? <Award /> : <XCircle />}
                            </div>
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${ds.isPassed ? 'text-indigo-600' : 'text-red-600'}`}>Certification Status</p>
                                <h3 className={`text-xl font-black uppercase ${ds.isPassed ? 'text-indigo-900' : 'text-red-900'}`}>
                                    {ds.isPassed ? 'SUCCESSFUL' : 'FAILED'}
                                </h3>
                            </div>
                            {ds.isPassed && (
                                <button 
                                    onClick={() => setShowCertificate(true)}
                                    className="ml-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md"
                                >
                                    <Download size={14} /> Get Certificate
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                    {/* ── LEFT SIDEBAR – completely unchanged ── */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 -mr-8 -mt-8 rounded-full blur-2xl" />
                            <div className="relative">
                                <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 mb-8 overflow-hidden mx-auto border-4 border-white shadow-xl">
                                    <User size={48} />
                                </div>
                                <h2 className="text-sm font-black text-center text-gray-900 mb-8 uppercase tracking-[0.2em] cursor-pointer hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 group"
                                    onClick={() => setShowInvigilator(!showInvigilator)}>
                                    Candidate Details
                                    <span className={`text-[9px] px-2 py-0.5 rounded-md border transition-all ${showInvigilator ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-gray-400 border-gray-100'}`}>
                                        {showInvigilator ? 'HIDE' : 'SHOW'}
                                    </span>
                                </h2>
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center gap-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">RegistrationNumber:</p>
                                        <p className="text-sm font-bold text-gray-900 leading-none">{analytics?.candidate_info?.reg_no || candidate.reg_no}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">EmailAddress:</p>
                                        <p className="text-sm font-bold text-gray-900 lowercase leading-none">{analytics?.candidate_info?.email || candidate.email}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{analytics?.metadata?.category === 'University' ? 'Department:' : 'College:'}</p>
                                        <p className="text-sm font-bold text-gray-900 uppercase leading-none">{analytics?.metadata?.category === 'University' ? analytics.metadata.department : (analytics?.candidate_info?.college || candidate.college)}</p>
                                    </div>
                                    {analytics?.metadata?.category === 'University' && (
                                        <div className="flex items-center gap-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Subject:</p>
                                            <p className="text-sm font-bold text-gray-900 uppercase leading-none">{analytics.metadata.subject_name} ({analytics.metadata.subject_code})</p>
                                        </div>
                                    )}
                                    {showInvigilator && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                            className="flex items-center gap-1 pt-5 border-t border-dashed border-gray-100">
                                            <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0"><User size={12} /></div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Invigilator:</p>
                                            <p className="text-[11px] font-bold text-indigo-600 uppercase leading-none">vimal raj</p>
                                        </motion.div>
                                    )}
                                </div>
                                <div className="mt-12 pt-10 border-t border-gray-100 space-y-8">
                                    <div>
                                        <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.2em] mb-4">Assessment Parameters</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { label: 'Games',  show: ds?.hasGaming },
                                                { label: 'Coding', show: ds?.hasCod },
                                                { label: 'SQL',    show: ds?.hasSQL },
                                                { label: 'MCQ',    show: ds?.hasMCQ },
                                                { label: 'FITB',   show: ds?.hasFITB },
                                                { label: 'Essay',  show: ds?.hasEssay },
                                            ].filter(t => t.show).map(tag => (
                                                <span key={tag.label} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-lg border border-indigo-100 uppercase tracking-tight leading-none">{tag.label}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-indigo-50/50 rounded-xl p-4 border border-gray-100/50">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 leading-none">Assessment Taken On</p>
                                        <p className="text-sm font-black text-gray-900 leading-none">
                                            {analytics?.created_at
                                                ? new Date(analytics.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                                                : '11 March 2026'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── MAIN CONTENT ── */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* ── Tab Switcher – unchanged ── */}
                        <div className="flex items-center justify-between border-b border-gray-200 mb-8">
                            <div className="flex gap-10">
                                {(['report', 'video', 'evidence'] as const).map(tab => (
                                    <div key={tab}
                                        className={`pb-4 text-sm font-black uppercase tracking-widest cursor-pointer transition-all flex items-center gap-2
                                            ${activeTab === tab ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        onClick={() => setActiveTab(tab)}>
                                        {tab === 'report' ? 'Assessment Report' : tab === 'video' ? 'Candidate video' : 'Evidence'}
                                        {tab === 'evidence' && evidenceLogs.length > 0 && (
                                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-black rounded-md border border-red-100 leading-none">{evidenceLogs.length}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button className="flex items-center gap-2 text-indigo-600 text-[11px] font-black uppercase tracking-widest pb-4 hover:opacity-70 transition-opacity">
                                <Download size={14} />Export PDF
                            </button>
                        </div>

                        {/* ════════════════════ REPORT TAB ════════════════════ */}
                        {activeTab === 'report' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

                                {/* ── R1: Hero score + grade + 3 KPIs ── */}
                                <div className="grid grid-cols-12 gap-5">
                                    {/* Score ring */}
                                    <div className="col-span-5 bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-4">
                                        <Ring pct={finalPct} size={156} stroke={14} color={ringColor}>
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-4xl font-black text-gray-900 leading-none">{finalScore}</span>
                                                <span className="text-sm text-gray-400 font-bold leading-none">/ {finalMax}</span>
                                            </div>
                                        </Ring>
                                        <div className="text-center space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Overall Score</p>
                                            <p className="text-lg font-black" style={{ color: ringColor }}>{finalPct}% · {perfLabel}</p>
                                        </div>
                                    </div>

                                    {/* Grade + KPIs */}
                                    <div className="col-span-7 grid grid-rows-2 gap-4">
                                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
                                            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl font-black shrink-0"
                                                style={{ background: `${ringColor}18`, color: ringColor }}>{grade}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Performance Grade</p>
                                                <p className="text-2xl font-black text-gray-900">{perfLabel}</p>
                                                <p className="text-xs text-gray-400 font-medium mt-1 truncate">{finalScore} marks out of {finalMax} total</p>
                                            </div>
                                            <Award size={32} className="text-gray-100 shrink-0" />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            {[
                                                {
                                                    icon: FileText, label: 'Attempted',
                                                    value: ds ? ds.mcqAnswered + ds.codAttempted + ds.sqlAttempted : '--',
                                                    color: 'text-indigo-600', bg: 'bg-indigo-50',
                                                },
                                                {
                                                    icon: XCircle, label: 'Skipped',
                                                    value: ds ? ds.mcqSkipped + (ds.codTotalQ - ds.codAttempted) + (ds.sqlTotalQ - ds.sqlAttempted) : '--',
                                                    color: 'text-red-500', bg: 'bg-red-50',
                                                },
                                                {
                                                    icon: RefreshCw, label: 'Total Sessions',
                                                    value: ds?.summary?.total_questions ?? '--',
                                                    color: 'text-indigo-600', bg: 'bg-indigo-50',
                                                },
                                            ].map((k, i) => (
                                                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center ${k.color} shrink-0`}><k.icon size={16} /></div>
                                                    <div>
                                                        <p className="text-lg font-black text-gray-900 leading-none">{k.value}</p>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{k.label}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* ── R2: Section score bars + accuracy rings ── */}
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                                        <div className="flex items-center gap-2.5 mb-7">
                                            <BarChart2 size={16} className="text-indigo-400" />
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Section Scores</h3>
                                        </div>
                                        <div className="space-y-5">
                                            {[
                                                { name: 'MCQ',        score: ds?.mcqScore ?? 0, max: ds?.mcqMax ?? 30, bar: 'bg-indigo-500', delay: 0, show: ds?.hasMCQ },
                                                { name: 'Coding',     score: ds?.codScore ?? 0, max: ds?.codMax ?? 30, bar: 'bg-indigo-500',   delay: 0.1, show: ds?.hasCod },
                                                { name: 'SQL',        score: ds?.sqlScore ?? 0, max: ds?.sqlMax ?? 10, bar: 'bg-indigo-500',delay: 0.2, show: ds?.hasSQL },
                                                { name: 'FITB',       score: ds?.fitbScore ?? 0, max: ds?.fitbMax ?? 20, bar: 'bg-indigo-500', delay: 0.3, show: ds?.hasFITB },
                                                { name: 'Essay',      score: ds?.essayScore ?? 0, max: ds?.essayMax ?? 50, bar: 'bg-indigo-500', delay: 0.4, show: ds?.hasEssay },
                                                { name: 'Pipe Puzzle (solved)',
                                                  score: ds?.pipePass ?? 0, max: Math.max(ds?.pipeMax ?? 1, 1),
                                                  bar: 'bg-indigo-500', delay: 0.5, show: ds?.hasGaming },
                                            ].filter(s => s.show).map((s, i) => {
                                                const pct = s.max > 0 ? Math.round((s.score / s.max) * 100) : 0;
                                                return (
                                                    <div key={i}>
                                                        <div className="flex justify-between mb-1.5">
                                                            <span className="text-[11px] font-black text-gray-700 uppercase tracking-wide">{s.name}</span>
                                                            <span className="text-[11px] font-black text-gray-500">
                                                                {s.score}/{s.max}
                                                                <span className="text-gray-300 font-medium ml-1">({pct}%)</span>
                                                            </span>
                                                        </div>
                                                        <ThinBar pct={pct} colorClass={s.bar} delay={s.delay} />
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* total mark banner */}
                                        <div className="mt-7 pt-6 border-t border-gray-100 flex items-center justify-between bg-indigo-50 rounded-xl px-5 py-4 border border-indigo-100">
                                            <div>
                                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Total Marks Secured</p>
                                                <p className="text-3xl font-black text-indigo-700 mt-0.5">{finalScore} <span className="text-base font-bold text-indigo-300">/ {finalMax}</span></p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Percentage</p>
                                                <p className="text-3xl font-black text-indigo-700">{finalPct}%</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                                        <div className="flex items-center gap-2.5 mb-7">
                                            <Target size={16} className="text-indigo-400" />
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Accuracy per Section</h3>
                                        </div>
                                        <div className="flex justify-around items-center mb-8">
                                            {[
                                                { label: 'MCQ',    pct: ds?.mcqAccuracy ?? 0, color: '#4f46e5', show: ds?.hasMCQ },
                                                { label: 'Coding', pct: ds?.codAccuracy ?? 0, color: '#4f46e5', show: ds?.hasCod },
                                                { label: 'SQL',    pct: ds?.sqlAccuracy ?? 0, color: '#4f46e5', show: ds?.hasSQL },
                                                { label: 'FITB',   pct: ds?.fitbAccuracy ?? 0, color: '#4f46e5', show: ds?.hasFITB },
                                            ].filter(a => a.show).map((a, i) => (
                                                <div key={i} className="flex flex-col items-center gap-2">
                                                    <Ring pct={a.pct} size={86} stroke={8} color={a.color}>
                                                        <span className="text-sm font-black text-gray-800">{a.pct}%</span>
                                                    </Ring>
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{a.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {/* MCQ correct/wrong/skipped */}
                                        {ds && (
                                            <div className="border-t border-gray-100 pt-6">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">MCQ Detail (best attempt)</p>
                                                <div className="flex gap-3">
                                                    {[
                                                        { label: 'Correct', value: ds.mcqCorrect, cls: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                                                        { label: 'Wrong',   value: ds.mcqWrong,   cls: 'bg-red-50 text-red-600 border-red-100' },
                                                        { label: 'Skipped', value: ds.mcqSkipped, cls: 'bg-indigo-50 text-gray-500 border-gray-100' },
                                                    ].map((b, i) => (
                                                        <div key={i} className={`flex-1 rounded-xl p-3 text-center border ${b.cls}`}>
                                                            <p className="text-xl font-black leading-none">{b.value}</p>
                                                            <p className="text-[9px] font-black uppercase tracking-widest mt-1">{b.label}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ── R3: Score trend sparklines ── */}
                             

                                {/* ── R4: Coding deep-dive + SQL deep-dive ── */}
                                <div className="grid grid-cols-2 gap-5">
                                    {/* Coding */}
                                    {ds?.hasCod && (
                                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                                            <div className="flex items-center gap-2.5 mb-6">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><Code2 size={14} /></div>
                                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Coding Deep-Dive</h3>
                                            </div>
                                            {ds ? (
                                                <>
                                                    <VBarChart bars={[
                                                        { label: 'Attempted', value: ds.codAttempted,               max: ds.codTotalQ, color: 'bg-indigo-200' },
                                                        { label: 'Passed',    value: ds.codPassed,                  max: ds.codTotalQ, color: 'bg-indigo-500' },
                                                        { label: 'Failed',    value: ds.codAttempted - ds.codPassed, max: ds.codTotalQ, color: 'bg-red-300' },
                                                        { label: 'Skipped',   value: ds.codTotalQ - ds.codAttempted, max: ds.codTotalQ, color: 'bg-gray-200' },
                                                    ]} />
                                                    <div className="mt-5 grid grid-cols-2 gap-3">
                                                        {[
                                                            { label: 'Best Score', value: `${ds.codScore}/30` },
                                                            { label: 'Accuracy',   value: `${ds.codAccuracy}%` },
                                                            { label: 'Attempts',   value: ds.codAttempts },
                                                            { label: 'Questions',  value: ds.codTotalQ },
                                                        ].map((k, i) => (
                                                            <div key={i} className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                                                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none">{k.label}</p>
                                                                <p className="text-base font-black text-indigo-800 mt-1">{k.value}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : <p className="text-gray-300 text-sm">Loading…</p>}
                                        </div>
                                    )}

                                    {/* SQL */}
                                    {ds?.hasSQL && (
                                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                                            <div className="flex items-center gap-2.5 mb-6">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><Database size={14} /></div>
                                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">SQL Deep-Dive</h3>
                                            </div>
                                            {ds ? (
                                                <>
                                                    <VBarChart bars={[
                                                        { label: 'Attempted', value: ds.sqlAttempted,                max: Math.max(ds.sqlTotalQ, 1), color: 'bg-indigo-200' },
                                                        { label: 'Passed',    value: ds.sqlPassed,                   max: Math.max(ds.sqlTotalQ, 1), color: 'bg-indigo-500' },
                                                        { label: 'Failed',    value: ds.sqlAttempted - ds.sqlPassed,  max: Math.max(ds.sqlTotalQ, 1), color: 'bg-red-300' },
                                                        { label: 'Skipped',   value: (ds.sqlTotalQ || 0) - ds.sqlAttempted, max: Math.max(ds.sqlTotalQ, 1), color: 'bg-gray-200' },
                                                    ]} />
                                                    <div className="mt-5 grid grid-cols-2 gap-3">
                                                        {[
                                                            { label: 'Best Score', value: `${ds.sqlScore}/10` },
                                                            { label: 'Accuracy',   value: `${ds.sqlAccuracy}%` },
                                                            { label: 'Attempts',   value: ds.sqlAttempts },
                                                            { label: 'Questions',  value: ds.sqlTotalQ },
                                                        ].map((k, i) => (
                                                            <div key={i} className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                                                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none">{k.label}</p>
                                                                <p className="text-base font-black text-indigo-800 mt-1">{k.value}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : <p className="text-gray-300 text-sm">Loading…</p>}
                                        </div>
                                    )}
                                </div>

                                {/* ── FITB Deep-Dive ── */}
                                {ds?.hasFITB && (
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                                        <div className="flex items-center gap-2.5 mb-6">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><BookOpen size={14} /></div>
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Fill in the Blanks Analysis</h3>
                                        </div>
                                        <VBarChart bars={[
                                            { label: 'Correct', value: ds.fitbCorrect, max: ds.fitbAnswered || 1, color: 'bg-indigo-500' },
                                            { label: 'Wrong',   value: ds.fitbAnswered - ds.fitbCorrect, max: ds.fitbAnswered || 1, color: 'bg-red-400' },
                                            { label: 'Skipped', value: (ds.bestFITB?.total_questions || 0) - ds.fitbAnswered, max: ds.bestFITB?.total_questions || 1, color: 'bg-gray-200' },
                                        ]} />
                                        <div className="mt-5 grid grid-cols-2 gap-3">
                                            {[
                                                { label: 'Total Marks', value: `${ds.fitbScore}/${ds.fitbMax}` },
                                                { label: 'Accuracy',    value: `${ds.fitbAccuracy}%` },
                                                { label: 'Attempts',    value: ds.fitbAttempts },
                                                { label: 'Questions',   value: ds.bestFITB?.total_questions || '--' },
                                            ].map((k, i) => (
                                                <div key={i} className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                                                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none">{k.label}</p>
                                                    <p className="text-base font-black text-indigo-800 mt-1">{k.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── Essay Deep-Dive ── */}
                                {essayResult && (() => {
                                    const ev = essayResult.result || essayResult.evaluation;
                                    if (!ev) return null;
                                    const GRADE_STYLES: Record<string, { text: string; bg: string; border: string }> = {
                                        'A':  { text: '#15803d', bg: '#dcfce7', border: '#86efac' },
                                        'B+': { text: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
                                        'B':  { text: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
                                        'C':  { text: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
                                        'F':  { text: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
                                    };
                                    const gradeStyle = GRADE_STYLES[ev.grade] ?? GRADE_STYLES['B'];

                                    // Build dynamic sections from rubric_used or fallback to result.sections keys
                                    const rubric = essayResult.rubric_used?.sections || {};
                                    const sectionColors = [
                                        { bg: 'bg-indigo-50',  border: 'border-indigo-100',  text: 'text-indigo-700',  barColor: '#4f46e5' },
                                        { bg: 'bg-indigo-50',    border: 'border-indigo-100',    text: 'text-indigo-700',    barColor: '#4f46e5' },
                                        { bg: 'bg-indigo-50',  border: 'border-indigo-100',  text: 'text-indigo-700',  barColor: '#4f46e5' },
                                        { bg: 'bg-indigo-50',  border: 'border-indigo-100',  text: 'text-indigo-700',  barColor: '#4f46e5' },
                                        { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700', barColor: '#4f46e5' },
                                    ];
                                    const sectionIcons = [
                                        <BookOpen size={16} />,
                                        <Building2 size={16} />,
                                        <BarChart3 size={16} />,
                                        <Eye size={16} />,
                                        <Flag size={16} />,
                                        <Brain size={16} />,
                                        <Search size={16} />,
                                        <Lightbulb size={16} />
                                    ];

                                    // All section keys: prefer from rubric_used, fallback to what AI returned
                                    const sectionKeys = Object.keys(rubric).length > 0
                                        ? Object.keys(rubric)
                                        : Object.keys(ev.sections || {});

                                    const totalMax = sectionKeys.reduce((sum, k) => {
                                        const m = rubric[k]?.max_marks ?? ev.sections?.[k]?.max ?? 10;
                                        return sum + m;
                                    }, 0);
                                    
                                    const totalEssayScore = Number(ev.total_score ?? ev.score ?? 0);
                                    const totalPct = totalMax > 0 ? Math.round((totalEssayScore / totalMax) * 100) : 0;

                                    return (
                                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                                            <div className="flex items-center gap-2.5 mb-7">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                    <PenLine size={14} />
                                                </div>
                                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Essay Evaluation</h3>
                                                <span className="ml-auto px-2.5 py-1 bg-indigo-50 text-[9px] font-black text-gray-400 rounded-lg border border-gray-100 uppercase tracking-widest">
                                                    {essayResult.submitted_at || '--'}
                                                </span>
                                            </div>

                                            {/* Score hero */}
                                            <div className="flex items-center gap-8 mb-7 p-5 bg-indigo-50/60 rounded-2xl border border-gray-100">
                                                <div className="flex flex-col items-center gap-2 shrink-0">
                                                    <Ring pct={totalPct} size={100} stroke={10} color="#4f46e5">
                                                        <span className="text-lg font-black text-gray-800">{totalEssayScore}</span>
                                                    </Ring>
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">/ {totalMax} marks</span>
                                                    <span
                                                        className="px-3 py-1 rounded-full text-xs font-black border"
                                                        style={{ color: gradeStyle.text, background: gradeStyle.bg, borderColor: gradeStyle.border }}
                                                    >
                                                        Grade {ev.grade || '--'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Overall Feedback</p>
                                                    <p className="text-xs text-gray-700 leading-relaxed mb-3">{ev.overall_feedback || ev.feedback || '--'}</p>
                                                    <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5">
                                                        <Lightbulb size={14} className="text-indigo-500 shrink-0" />
                                                        <div>
                                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Originality Note</p>
                                                            <p className="text-[11px] text-indigo-600 leading-snug">{ev.originality_note || '--'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Dynamic section breakdown */}
                                            <div className="grid grid-cols-2 gap-4">
                                                {sectionKeys.map((key, idx) => {
                                                    const sec = ev.sections?.[key];
                                                    if (!sec) return null;
                                                    const maxMarks = rubric[key]?.max_marks ?? sec.max ?? 10;
                                                    const sectionName = rubric[key]?.name ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                                    const pct = Math.round((sec.score / maxMarks) * 100);
                                                    const sc = sectionColors[idx % sectionColors.length];
                                                    const icon = sectionIcons[idx % sectionIcons.length];
                                                    return (
                                                        <div key={key} className={`rounded-xl border p-4 ${sc.bg} ${sc.border}`}>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-base">{icon}</span>
                                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${sc.text}`}>{sectionName}</p>
                                                                </div>
                                                                <span className={`text-sm font-black ${sc.text}`}>{sec.score}/{maxMarks}</span>
                                                            </div>
                                                            <ThinBar pct={pct} colorClass="bg-indigo-400" />
                                                            <p className="text-[10px] text-gray-600 leading-snug mt-2">{sec.feedback}</p>
                                                            <div className="mt-2 flex items-start gap-1.5">
                                                                <Check className="text-indigo-500 shrink-0" size={12} />
                                                                <p className="text-[10px] text-indigo-700 leading-snug">{sec.strengths}</p>
                                                            </div>
                                                            <div className="mt-1.5 flex items-start gap-1.5">
                                                                <ArrowRight className="text-slate-400 shrink-0" size={12} />
                                                                <p className="text-[10px] text-slate-600 leading-snug">{sec.improvement}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Topic + rubric info banner */}
                                            <div className="mt-5 grid grid-cols-2 gap-3">
                                                {essayResult.topic && (
                                                    <div className="flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100">
                                                        <PenLine size={13} className="text-indigo-400 shrink-0" />
                                                        <div>
                                                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Essay Topic</p>
                                                            <p className="text-xs font-bold text-indigo-700">{essayResult.topic}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3 bg-indigo-50 rounded-xl px-4 py-3 border border-indigo-100">
                                                    <PenLine size={13} className="text-indigo-400 shrink-0" />
                                                    <div>
                                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Sections Evaluated</p>
                                                        <p className="text-xs font-bold text-indigo-700">{sectionKeys.length} sections · {totalMax} marks total</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                                {diagramResult && (
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mt-8">
                                        <div className="flex items-center gap-2.5 mb-7">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <PenLine size={14} />
                                            </div>
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">AI Diagram Verification (Audit Proof)</h3>
                                            <span className="ml-auto px-2.5 py-1 bg-indigo-50 text-[9px] font-black text-gray-400 rounded-lg border border-gray-100 uppercase tracking-widest">
                                                Submitted: {diagramResult.submitted_at}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                            {/* Candidate Answer */}
                                            <div className="relative group">
                                                <div className="flex justify-between items-center mb-3">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Candidate Submission</p>
                                                    <span className="text-[9px] font-bold text-orange-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">Input Image</span>
                                                </div>
                                                <div 
                                                    className="aspect-video rounded-xl border border-gray-100 overflow-hidden bg-white cursor-pointer shadow-sm relative group"
                                                    onClick={() => setLightboxImg({ url: diagramResult.image_url, type: 'Candidate Diagram', time: diagramResult.submitted_at })}
                                                >
                                                    <img src={diagramResult.image_url} alt="Candidate Diagram" className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                        <Eye className="text-white opacity-0 group-hover:opacity-100" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Master Proof */}
                                            <div className="relative group">
                                                <div className="flex justify-between items-center mb-3">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Master Solution Logic</p>
                                                    <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">Reference Proof</span>
                                                </div>
                                                <div 
                                                    className="aspect-video rounded-xl border border-dashed border-indigo-200 overflow-hidden bg-indigo-50/30 cursor-pointer shadow-sm relative group"
                                                    onClick={() => setLightboxImg({ url: diagramResult.master_info?.master_image_url || 'https://via.placeholder.com/800x450?text=No+Master+Image', type: 'Master Solution', time: 'Reference' })}
                                                >
                                                    {diagramResult.master_info?.master_image_url ? (
                                                        <img src={diagramResult.master_info.master_image_url} alt="Master Solution" className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-indigo-400 opacity-50">
                                                            <Database size={32} />
                                                            <span className="text-[10px] font-black uppercase mt-2">Logic Stored in JSON</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                        <Eye className="text-white opacity-0 group-hover:opacity-100" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="md:col-span-1 space-y-4">
                                                <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI Assessment Score</p>
                                                        <span className="text-2xl font-black text-indigo-600">{diagramResult.ai_evaluation?.score}/10</span>
                                                    </div>
                                                    <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${(diagramResult.ai_evaluation?.score / 10) * 100}%` }} className="h-full bg-indigo-500 rounded-full" />
                                                    </div>
                                                </div>
                                                <div className="bg-indigo-50 rounded-xl p-4 border border-gray-100">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Visual Originality</p>
                                                    <p className={`text-xs font-black uppercase ${diagramResult.ai_evaluation?.originality === 'high' ? 'text-indigo-600' : 'text-indigo-600'}`}>
                                                        {diagramResult.ai_evaluation?.originality || 'N/A'} Detection
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="md:col-span-2 space-y-4">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Executive Summary</p>
                                                    <div className="text-sm text-gray-700 leading-relaxed font-medium bg-indigo-50 p-4 rounded-xl border border-gray-100 italic">
                                                        "{diagramResult.ai_evaluation?.feedback}"
                                                    </div>
                                                </div>
                                                
                                                {diagramResult.ai_evaluation?.areas_of_improvement && diagramResult.ai_evaluation.areas_of_improvement.length > 0 && (
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Critical Logic Improvements</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {diagramResult.ai_evaluation.areas_of_improvement.map((point: string, idx: number) => (
                                                                <div key={idx} className="flex items-start gap-2 bg-red-50/50 p-2.5 rounded-lg border border-red-100/50">
                                                                    <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                                                                    <span className="text-[11px] font-bold text-red-700 leading-tight">{point}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── R5: Pipe Puzzle analytics ── */}
                                {ds && ds.pipeMax > 0 && (
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                                        <div className="flex items-center gap-2.5 mb-7">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-orange-500"><Puzzle size={14} /></div>
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Pipe Puzzle Performance</h3>
                                        </div>
                                        <div className="grid grid-cols-12 gap-8">
                                            <div className="col-span-3 flex flex-col items-center gap-3">
                                                <Ring pct={ds.pipeMax > 0 ? Math.round((ds.pipePass / ds.pipeMax) * 100) : 0}
                                                    size={100} stroke={10} color="#f97316">
                                                    <span className="text-lg font-black text-gray-800">{ds.pipePass}/{ds.pipeMax}</span>
                                                </Ring>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Success Rate</p>
                                            </div>
                                            <div className="col-span-4 grid grid-cols-2 gap-3 content-center">
                                                {[
                                                    { label: 'Best Time',     value: ds.pipeBestTime != null ? `${ds.pipeBestTime}s` : '--', cls: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                                                    { label: 'Avg Moves',     value: ds.pipeAvgMoves ?? '--',   cls: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                                                    { label: 'Avg Rotations', value: ds.pipeAvgRot   ?? '--',   cls: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                                                    { label: 'Total Runs',    value: ds.pipeAttempts,           cls: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                                                ].map((k, i) => (
                                                    <div key={i} className={`rounded-xl p-3 border ${k.cls}`}>
                                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-none">{k.label}</p>
                                                        <p className="text-lg font-black mt-1 leading-none">{k.value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="col-span-5 flex flex-col justify-center">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Time per Attempt (seconds)</p>
                                                <Sparkline values={ds.pipeTimeSeries} color="#f97316" fill />
                                                <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-2">
                                                    <span>Attempt 1</span><span>Latest</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── R6: Code Integrity Analysis (from CodeFetcher) ── */}
                                {codeAnalytics.length > 0 && (
                                    <div className="space-y-4">
                                        {codeAnalytics.map((item, i) => (
                                            <CodeIntegritySection key={item._id || i} data={item} index={i} total={codeAnalytics.length} />
                                        ))}
                                    </div>
                                )}

                                {/* ── R7: Mobile Proctoring Risk Card (from FetcherRiskScoreMobile) ── */}
                                {mobileRiskData && (
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                                        <div className="flex items-center gap-2.5 mb-7">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-orange-500">
                                                <Smartphone size={14} />
                                            </div>
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Mobile Proctoring Risk</h3>
                                            <span className="ml-auto px-2.5 py-1 bg-indigo-50 text-[9px] font-black text-gray-400 rounded-lg border border-gray-100 uppercase tracking-widest font-mono">
                                                {mobileRiskData.timestamp
                                                    ? new Date(mobileRiskData.timestamp * 1000).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                    : '--'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-5 mb-7">
                                            {[
                                                {
                                                    label: 'Suspicion Score',
                                                    value: mobileRiskData.suspicion_score ?? 0,
                                                    max: 100,
                                                    color: (mobileRiskData.suspicion_score ?? 0) >= 70 ? '#ef4444' : (mobileRiskData.suspicion_score ?? 0) >= 40 ? '#f59e0b' : '#10b981',
                                                    bg: 'bg-red-50', border: 'border-red-100', textColor: 'text-red-600',
                                                },
                                                {
                                                    label: 'Trust Score',
                                                    value: mobileRiskData.trust_score ?? 0,
                                                    max: 100,
                                                    color: (mobileRiskData.trust_score ?? 0) >= 70 ? '#10b981' : (mobileRiskData.trust_score ?? 0) >= 40 ? '#f59e0b' : '#ef4444',
                                                    bg: 'bg-indigo-50', border: 'border-indigo-100', textColor: 'text-indigo-600',
                                                },
                                                {
                                                    label: 'Violations',
                                                    value: mobileRiskData.violation_count ?? 0,
                                                    max: 10,
                                                    color: (mobileRiskData.violation_count ?? 0) >= 5 ? '#ef4444' : (mobileRiskData.violation_count ?? 0) >= 2 ? '#f59e0b' : '#10b981',
                                                    bg: 'bg-indigo-50', border: 'border-indigo-100', textColor: 'text-indigo-600',
                                                },
                                            ].map((item, i) => (
                                                <div key={i} className={`rounded-2xl border p-5 flex flex-col items-center gap-4 ${item.bg} ${item.border}`}>
                                                    <Ring pct={Math.min((item.value / item.max) * 100, 100)} size={96} stroke={9} color={item.color}>
                                                        <span className="text-base font-black text-gray-800">{item.value}</span>
                                                    </Ring>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest text-center ${item.textColor}`}>{item.label}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Finalized via + ID banner */}
                                        <div className="flex items-center gap-3 bg-indigo-50 rounded-xl px-5 py-4 border border-indigo-100">
                                            <Smartphone size={14} className="text-indigo-400 shrink-0" />
                                            <div>
                                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Finalized Via</p>
                                                <p className="text-sm font-black text-indigo-700 capitalize">
                                                    {mobileRiskData.finalized_via?.replace(/_/g, ' ') ?? '--'}
                                                </p>
                                            </div>
                                            <div className="ml-auto text-right">
                                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Record ID</p>
                                                <p className="text-[10px] font-bold font-mono text-indigo-600">{mobileRiskData._id ?? '--'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </motion.div>
                        )}

                        {/* ── R8: Risk Score Card (from FetcherRiskScore) ── */}
                        {riskData && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                                <div className="flex items-center gap-2.5 mb-7">
                                    <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                                        <ShieldAlert size={14} />
                                    </div>
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Proctoring Risk Analysis</h3>
                                    <span className="ml-auto px-2.5 py-1 bg-indigo-50 text-[9px] font-black text-gray-400 rounded-lg border border-gray-100 uppercase tracking-widest font-mono">
                                        {riskData.timestamp}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-5 mb-7">
                                    {/* Video Proctoring */}
                                    {[
                                        {
                                            label: 'Video Risk',
                                            score: riskData.video_proctoring?.risk_score ?? 0,
                                            trust: riskData.video_proctoring?.trust_score ?? 0,
                                            violation: riskData.video_proctoring?.violation_score ?? 0,
                                            ringColor: (riskData.video_proctoring?.risk_score ?? 0) >= 70 ? '#ef4444' : (riskData.video_proctoring?.risk_score ?? 0) >= 40 ? '#f59e0b' : '#10b981',
                                            bg: 'bg-red-50', border: 'border-red-100', textColor: 'text-red-600',
                                            icon: <Eye size={13} />,
                                        },
                                        {
                                            label: 'Code Risk',
                                            score: riskData.code_analysis?.risk_score ?? 0,
                                            trust: riskData.code_analysis?.trust_score ?? 0,
                                            violation: riskData.code_analysis?.violation_score ?? 0,
                                            ringColor: (riskData.code_analysis?.risk_score ?? 0) >= 70 ? '#ef4444' : (riskData.code_analysis?.risk_score ?? 0) >= 40 ? '#f59e0b' : '#10b981',
                                            bg: 'bg-indigo-50', border: 'border-indigo-100', textColor: 'text-indigo-600',
                                            icon: <Code2 size={13} />,
                                        },
                                        {
                                            label: 'Overall Risk',
                                            score: Math.round(((riskData.video_proctoring?.risk_score ?? 0) + (riskData.code_analysis?.risk_score ?? 0)) / 2),
                                            trust: Math.round(((riskData.video_proctoring?.trust_score ?? 0) + (riskData.code_analysis?.trust_score ?? 0)) / 2),
                                            violation: Math.round(((riskData.video_proctoring?.violation_score ?? 0) + (riskData.code_analysis?.violation_score ?? 0)) / 2),
                                            ringColor: (() => { const s = Math.round(((riskData.video_proctoring?.risk_score ?? 0) + (riskData.code_analysis?.risk_score ?? 0)) / 2); return s >= 70 ? '#ef4444' : s >= 40 ? '#f59e0b' : '#10b981'; })(),
                                            bg: 'bg-indigo-50', border: 'border-indigo-100', textColor: 'text-indigo-600',
                                            icon: <ShieldCheck size={13} />,
                                        },
                                    ].map((item, i) => (
                                        <div key={i} className={`rounded-2xl border p-5 flex flex-col items-center gap-4 ${item.bg} ${item.border}`}>
                                            <Ring pct={item.score} size={96} stroke={9} color={item.ringColor}>
                                                <span className="text-base font-black text-gray-800">{item.score}</span>
                                            </Ring>
                                            <div className="text-center w-full">
                                                <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${item.textColor}`}>{item.label}</p>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wide">Trust</span>
                                                        <span className="text-[11px] font-black text-indigo-600">{item.trust}</span>
                                                    </div>
                                                    <ThinBar pct={item.trust} colorClass="bg-indigo-400" delay={i * 0.1} />
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wide">Violation</span>
                                                        <span className="text-[11px] font-black text-red-500">{item.violation}</span>
                                                    </div>
                                                    <ThinBar pct={item.violation} colorClass="bg-red-400" delay={i * 0.1 + 0.05} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Risk label banner */}
                                {(() => {
                                    const overallRisk = Math.round(((riskData.video_proctoring?.risk_score ?? 0) + (riskData.code_analysis?.risk_score ?? 0)) / 2);
                                    const isHigh = overallRisk >= 70;
                                    const isMed  = overallRisk >= 40;
                                    return (
                                        <div className={`flex items-center gap-3 rounded-xl px-5 py-4 border ${isHigh ? 'bg-red-50 border-red-100' : isMed ? 'bg-indigo-50 border-indigo-100' : 'bg-indigo-50 border-indigo-100'}`}>
                                            <AlertTriangle size={15} className={isHigh ? 'text-red-500' : 'text-indigo-500'} />
                                            <div>
                                                <p className={`text-[10px] font-black uppercase tracking-widest ${isHigh ? 'text-red-400' : isMed ? 'text-indigo-400' : 'text-indigo-400'}`}>Risk Assessment</p>
                                                <p className={`text-sm font-black ${isHigh ? 'text-red-700' : isMed ? 'text-indigo-700' : 'text-indigo-700'}`}>
                                                    {isHigh ? 'High Risk — Manual review strongly recommended' : isMed ? 'Moderate Risk — Flagged for review' : 'Low Risk — Candidate appears compliant'}
                                                </p>
                                            </div>
                                            <div className="ml-auto text-right">
                                                <p className={`text-[9px] font-black uppercase tracking-widest ${isHigh ? 'text-red-400' : isMed ? 'text-indigo-400' : 'text-indigo-400'}`}>Score ID</p>
                                                <p className={`text-[10px] font-bold font-mono ${isHigh ? 'text-red-600' : isMed ? 'text-indigo-600' : 'text-indigo-600'}`}>{riskData._id}</p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* ════════════════════ VIDEO TAB – completely unchanged ════════════════════ */}
                        {activeTab === 'video' && (
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Live Candidate Stream</h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Real-time monitoring via Agora RTC</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                                                {[{ id: 'laptop', label: 'Webcam' }, { id: 'mobile', label: 'Sidecam' }, { id: 'both', label: 'Both' }].map((mode) => (
                                                    <button key={mode.id} onClick={() => setViewMode(mode.id as any)}
                                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === mode.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                                        {mode.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-lg border border-green-100">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Encrypted</span>
                                            </div>
                                        </div>
                                    </div>
                                    <RemoteVideoPlayer channel={`${testId}_${candidate.candidate_id}`.toLowerCase()} viewMode={viewMode} />
                                    <div className="mt-8 grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-indigo-50 rounded-xl border border-gray-100">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Session ID</p>
                                            <p className="text-xs font-bold text-gray-900 truncate">{testId || 'N/A'}</p>
                                        </div>
                                        <div className="p-4 bg-indigo-50 rounded-xl border border-gray-100">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Standardized Channel</p>
                                            <p className="text-xs font-bold text-gray-900 truncate">{`${testId}_${candidate.candidate_id}`.toLowerCase()}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ════════════════════ EVIDENCE TAB – completely unchanged ════════════════════ */}
                        {activeTab === 'evidence' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                    {Object.entries(VIOLATION_META).map(([key, meta]) => (
                                        <div key={key} className={`rounded-xl p-4 border ${meta.bg} ${meta.border} flex flex-col gap-1`}>
                                            <span className={`text-2xl font-black ${meta.color}`}>{typeCounts[key] || 0}</span>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${meta.color} opacity-70`}>{meta.label}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {violationTypes.map(type => {
                                        const meta = VIOLATION_META[type];
                                        const isActive = evidenceFilter === type;
                                        return (
                                            <button key={type} onClick={() => setEvidenceFilter(type)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all
                                                    ${isActive ? (meta ? `${meta.bg} ${meta.color} ${meta.border}` : 'bg-indigo-50 text-indigo-600 border-indigo-100') : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}>
                                                {type === 'all' ? `All (${evidenceLogs.length})` : `${meta?.label || type} (${typeCounts[type] || 0})`}
                                            </button>
                                        );
                                    })}
                                </div>
                                {filteredLogs.length === 0 ? (
                                    <div className="bg-white rounded-2xl p-16 border border-gray-100 flex flex-col items-center justify-center text-center">
                                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-gray-300 mb-4"><Camera size={28} /></div>
                                        <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">No evidence logs found</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        {/* ── Laptop / Webcam Column ── */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 pb-3 border-b border-gray-100/80">
                                                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100/50">
                                                    <Camera size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Webcam Evidence</h4>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Primary Laptop Feed</p>
                                                </div>
                                                <span className="ml-auto px-2 py-0.5 bg-indigo-50 text-[9px] font-black text-gray-400 rounded-md border border-gray-100">
                                                    {filteredLogs.filter(l => l.camera_type === 'laptop' || !l.camera_type).length}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                {filteredLogs.filter(l => l.camera_type === 'laptop' || !l.camera_type).map((log, idx) => {
                                                    const meta = VIOLATION_META[log.type] || { label: log.type, color: 'text-gray-700', bg: 'bg-indigo-50', border: 'border-gray-100' };
                                                    return (
                                                        <motion.div key={log._id || `l-${idx}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                                                            className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                                                            <div className="relative aspect-video bg-indigo-50 overflow-hidden">
                                                                <img src={log.cloud_url} alt={meta.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.target as HTMLImageElement).src = ''; }} />
                                                                <button onClick={() => setLightboxImg({ url: log.cloud_url, type: log.type, time: log.time })}
                                                                    className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                                    <div className="w-10 h-10 bg-white/90 rounded-xl flex items-center justify-center text-gray-700 shadow-lg"><Eye size={18} /></div>
                                                                </button>
                                                                <span className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${meta.bg} ${meta.color} ${meta.border} leading-none shadow-sm`}>
                                                                    {meta.label}
                                                                </span>
                                                            </div>
                                                            <div className="px-4 py-3 flex items-center justify-between bg-white">
                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">{formatTime(log.time)}</span>
                                                                <span className="text-[8px] font-bold text-gray-300 truncate max-w-[80px]">#{log._id?.slice(-6) || idx}</span>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* ── Mobile / Sidecam Column ── */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 pb-3 border-b border-gray-100/80">
                                                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-orange-500 shadow-sm border border-indigo-100/50">
                                                    <Smartphone size={16} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Mobile Evidence</h4>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Secondary Mobile Feed</p>
                                                </div>
                                                <span className="ml-auto px-2 py-0.5 bg-indigo-50 text-[9px] font-black text-gray-400 rounded-md border border-gray-100">
                                                    {filteredLogs.filter(l => l.camera_type === 'mobile').length}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                {filteredLogs.filter(l => l.camera_type === 'mobile').map((log, idx) => {
                                                    const meta = VIOLATION_META[log.type] || { label: log.type, color: 'text-gray-700', bg: 'bg-indigo-50', border: 'border-gray-100' };
                                                    return (
                                                        <motion.div key={log._id || `m-${idx}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                                                            className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                                                            <div className="relative aspect-video bg-indigo-50 overflow-hidden">
                                                                <img src={log.cloud_url} alt={meta.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.target as HTMLImageElement).src = ''; }} />
                                                                <button onClick={() => setLightboxImg({ url: log.cloud_url, type: log.type, time: log.time })}
                                                                    className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                                    <div className="w-10 h-10 bg-white/90 rounded-xl flex items-center justify-center text-gray-700 shadow-lg"><Eye size={18} /></div>
                                                                </button>
                                                                <span className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${meta.bg} ${meta.color} ${meta.border} leading-none shadow-sm`}>
                                                                    {meta.label}
                                                                </span>
                                                            </div>
                                                            <div className="px-4 py-3 flex items-center justify-between bg-white">
                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">{formatTime(log.time)}</span>
                                                                <span className="text-[8px] font-bold text-gray-300 truncate max-w-[80px]">#{log._id?.slice(-6) || idx}</span>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                    </div>
                </div>
            </div>
            {/* ── Certificate Modal ── */}
            {showCertificate && ds && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/90 backdrop-blur-md p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full overflow-hidden relative border-[12px] border-white"
                    >
                        {/* Certificate Design */}
                        <div 
                            ref={(el) => { if (el) (window as any).certificateRef = el; }} 
                            className="w-full max-w-[760px] aspect-[1.414/1] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-[1px] border-slate-200 p-12 flex flex-col items-center justify-between relative overflow-hidden mx-auto text-left"
                            style={{ minHeight: '537px' }}
                        >
                            {/* Subtle Texture Background */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                            
                            {/* Elegant Border Frame */}
                            <div className="absolute inset-4 border-[1px] border-slate-100" />
                            <div className="absolute inset-8 border-[2px] border-slate-200" />
                            
                            {/* Header Section */}
                            <div className="z-10 flex flex-col items-center mt-6 mb-4 w-full text-center">
                              <div className="w-12 h-12 bg-blue-600 rounded-xl rotate-45 flex items-center justify-center shadow-lg shadow-blue-100 mb-6 border-2 border-white">
                                <span className="text-xl font-black text-white -rotate-45">V</span>
                              </div>
                              <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mb-1">Official Certification</h4>
                              <h2 className="text-xl font-black uppercase tracking-[0.1em] text-slate-800 border-b-2 border-blue-600 pb-1 px-4">
                                {ds.certConfig?.title || ds.certConfig?.certificateTitle || "Certificate of Achievement"}
                              </h2>
                            </div>

                            {/* Recipient Section */}
                            <div className="z-10 flex flex-col items-center text-center px-12 mb-4 w-full">
                              <p className="text-[9px] text-slate-400 uppercase tracking-[0.3em] font-bold mb-2">This acknowledges that</p>
                              <h3 className="text-3xl font-serif italic text-slate-900 mb-2">{candidate.name}</h3>
                              <div className="w-32 h-px bg-slate-200 mb-3" />
                              <p className="text-[9px] text-slate-400 uppercase tracking-[0.15em] font-bold leading-tight max-w-[440px]">
                                has demonstrated exceptional proficiency and successfully met all requirements for the certification in
                              </p>
                            </div>

                            {/* Track Section */}
                            <div className="z-10 mb-4 text-center w-full">
                              <p className="text-[11px] font-bold text-slate-800 uppercase tracking-[0.2em]">
                                {ds.certConfig?.track_name || 'Technical Specialization'}
                              </p>
                            </div>

                            {/* Dynamic Performance Metrics */}
                            <div className="z-10 flex gap-8 mb-12 items-center justify-center w-full">
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Overall Score</span>
                                <span className="text-sm font-black text-slate-800">{Math.round((ds.totalScore / ds.totalMax) * 100)}%</span>
                              </div>
                              <div className="w-px h-6 bg-slate-200" />
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Grade</span>
                                <span className="text-sm font-black text-blue-600">
                                  {Math.round((ds.totalScore / ds.totalMax) * 100) >= 90 ? 'DISTINCTION' : Math.round((ds.totalScore / ds.totalMax) * 100) >= 75 ? 'EXCELLENT' : 'PASS'}
                                </span>
                              </div>
                              <div className="w-px h-6 bg-slate-200" />
                              <div className="flex flex-col items-center">
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Verification ID</span>
                                <span className="text-[8px] font-mono text-slate-500">{`CERT-${testId.slice(-6).toUpperCase()}-${candidate.reg_no || candidate.email.split('@')[0]}`}</span>
                              </div>
                            </div>

                            {/* Footer Section */}
                            <div className="absolute bottom-10 left-0 right-0 px-16 flex justify-between items-end w-full">
                              <div className="flex flex-col items-center">
                                <div className="w-28 h-px bg-slate-300 mb-2" />
                                <p className="text-[8px] font-black text-slate-800 uppercase tracking-widest">{ds.certConfig?.issuer || "Virtusa Authority"}</p>
                                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Issuing Organization</p>
                              </div>
                              
                              <div className="flex flex-col items-center">
                                <div className="w-28 h-px bg-slate-300 mb-2" />
                                <p className="text-[8px] font-black text-slate-800 uppercase tracking-widest">
                                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Date of Issue</p>
                              </div>
                            </div>

                            {/* Security Seal Decor */}
                            <div className="absolute top-10 left-10 w-24 h-24 opacity-[0.08] pointer-events-none">
                               <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 animate-spin-slow">
                                  <path id="curve" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="transparent" />
                                  <text className="text-[10px] font-bold uppercase tracking-widest fill-current">
                                     <textPath href="#curve">Verified Certification • Virtusa Jatayu • </textPath>
                                  </text>
                                </svg>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-12">
                            <button 
                                onClick={() => setShowCertificate(false)}
                                className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                            >
                                Close Preview
                            </button>
                            <div className="flex gap-4">
                                <button className="px-8 py-4 bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                                    <Copy size={14} /> Share Link
                                </button>
                                <button 
                                    onClick={async () => {
                                        try {
                                            const { toPng } = await import('html-to-image');
                                            const node = (window as any).certificateRef;
                                            if (!node) return;

                                            // Capture high quality image
                                            const dataUrl = await toPng(node, { quality: 1.0, pixelRatio: 2 });

                                            const formData = new FormData();
                                            formData.append('email', candidate.email);
                                            formData.append('name', candidate.name);
                                            formData.append('track_name', ds.certConfig?.track_name || 'Professional Certification');
                                            formData.append('certificate_id', testId.substring(0,18).toUpperCase());
                                            formData.append('score', Math.round((ds.totalScore / ds.totalMax) * 100).toString());
                                            formData.append('issuer', ds.certConfig?.issuer || 'TEAM_TITANS');
                                            formData.append('Certificate_Image', dataUrl);

                                            const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/send-certificate`, {
                                                method: 'POST',
                                                body: formData
                                            });

                                            if (res.ok) {
                                                alert('Certificate image sent successfully to ' + candidate.email);
                                            } else {
                                                alert('Failed to send certificate');
                                            }
                                        } catch (err) {
                                            console.error(err);
                                            alert('Error generating or sending certificate');
                                        }
                                    }}
                                    className="px-8 py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-200 active:scale-95"
                                >
                                    <Send size={14} /> Send via Email
                                </button>
                                <button 
                                    onClick={() => window.print()}
                                    className="px-8 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95"
                                >
                                    <Download size={14} /> Download PDF
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default CandidateAnalytics;