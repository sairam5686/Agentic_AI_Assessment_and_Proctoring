import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAgoraProctoring } from '../Components/AgoraProctoringWrapper';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Award, CheckCircle2, Download, XCircle, ArrowLeft, 
    ShieldCheck, Fingerprint, Copy, User, Calendar, Target,
    FileText, PenLine, Code2, Database, HelpCircle, Puzzle
} from 'lucide-react';

const Ring = ({ pct, size = 100, stroke = 8, color = '#6366f1', children }: any) => {
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

const Submission: React.FC = () => {
    const { cleanup } = useAgoraProctoring();
    const [candidateResult, setCandidateResult] = useState<any>(null);
    const [testInfo, setTestInfo] = useState<any>(null);
    const [showCertificate, setShowCertificate] = useState(false);
    const [loading, setLoading] = useState(true);

    const email = localStorage.getItem('candidate_email');
    const assessment_id = localStorage.getItem('assessment_id');

    useEffect(() => {
        const socket = io('http://localhost:8000');
        if (assessment_id && email) {
            socket.emit('test_ended', { assessment_id, email });
        }
        
        // Finalize state
        localStorage.setItem('assessment_completed', 'true');
        localStorage.removeItem('assessment_started');
        sessionStorage.removeItem('system_check_passed');

        fetchData();
    }, []);

    const fetchData = async () => {
        if (!assessment_id || !email) return;
        try {
            // 1. Fetch aggregated results
            const resResults = await fetch(`http://localhost:8000/candidate/${assessment_id}/${email}/results`);
            const resultsData = await resResults.json();
            setCandidateResult(resultsData);

            // 2. Fetch test config
            const resTest = await fetch(`http://localhost:8000/admin/test/${assessment_id}/Preview`);
            const testData = await resTest.json();
            setTestInfo(testData);

            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch results:", err);
            setLoading(false);
        }
    };

    const ds = (() => {
        if (!candidateResult || !testInfo) return null;

        const mcqList  = candidateResult.MCQ || [];
        const codList  = candidateResult.Coding || [];
        const sqlList  = candidateResult.SQL || [];
        const fitbList = candidateResult.FITB || [];
        const pipeList = candidateResult.Pipe_Puzzle || [];
        const essayResult = candidateResult.Essay;

        const bestOf = (arr: any[], key: (x: any) => number) =>
            arr.reduce((b: any, c: any) => key(c) > key(b ?? {}) ? c : (b ?? c), null);

        const bestMCQ = bestOf(mcqList, x => x.user_total_marks ?? 0);
        const bestCod = bestOf(codList, x => x.total_marks ?? 0);
        const bestSQL = bestOf(sqlList, x => x.total_marks ?? 0);
        const bestFITB = bestOf(fitbList, x => x.user_total_marks ?? 0);

        const hasMCQ = !!testInfo.MCQ;
        const hasCod = !!testInfo.Coding;
        const hasSQL = !!testInfo.SQL;
        const hasFITB = !!testInfo.FITB;
        const hasGaming = !!testInfo.Gaming?.games?.[0]?.enabled;
        const hasEssay = !!testInfo.Essay?.enabled;

        const mcqScore = bestMCQ?.user_total_marks ?? 0;
        const mcqMax = hasMCQ ? (bestMCQ?.total_marks ?? 30) : 0;
        const codScore = bestCod?.total_marks ?? 0;
        const codMax = hasCod ? 30 : 0;
        const sqlScore = bestSQL?.total_marks ?? 0;
        const sqlMax = hasSQL ? 10 : 0;
        const fitbScore = bestFITB?.user_total_marks ?? 0;
        const fitbMax = hasFITB ? (bestFITB?.total_marks ?? 20) : 0;
        const essayEv = essayResult?.result || essayResult?.evaluation;
        const essayScore = essayEv?.total_score ?? 0;
        const essayMax = hasEssay ? Object.values(testInfo.Essay.rubric?.sections || {}).reduce((s: any, sec: any) => s + (sec.max_marks || 0), 0) : 0;
        const pipePass = pipeList.filter((p: any) => p.scores?.[0]?.success).length;
        const pipeMax = hasGaming ? pipeList.length : 0;

        const totalScore = mcqScore + codScore + sqlScore + fitbScore + essayScore;
        const totalMax = mcqMax + codMax + sqlMax + fitbMax + essayMax;

        const isCertification = testInfo.category === 'Certification';
        const certConfig = testInfo.certification_config;
        const thresholds = certConfig?.thresholds || {};
        const globalThreshold = certConfig?.global_threshold || 60;

        const checkPass = (score: number, max: number, key: string) => {
            const t = thresholds[key] || globalThreshold;
            return max > 0 ? (score / max) * 100 >= t : true;
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
            Object.values(sectionPass).every(v => v) && (totalScore / totalMax) * 100 >= globalThreshold
        ) : false;

        return {
            totalScore, totalMax,
            mcqScore, mcqMax, codScore, codMax, sqlScore, sqlMax, fitbScore, fitbMax,
            essayScore, essayMax, pipePass, pipeMax,
            isCertification, isPassed, sectionPass, certConfig
        };
    })();;

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-white text-xs font-black uppercase tracking-[0.3em]">Finalizing Results...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-blue-500/30">
            {/* Nav */}
            <header className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black">V</div>
                    <span className="text-xs font-black tracking-[0.2em] uppercase">Jatayu Season 5</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Candidate: {email}</span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-16">
                <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden p-12 relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 -mr-32 -mt-32 rounded-full blur-3xl" />
                    
                    <div className="relative text-center mb-12">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-[1.5rem] flex items-center justify-center text-emerald-500 mx-auto mb-6 border border-emerald-500/30">
                            <CheckCircle2 size={40} />
                        </div>
                        <p className="text-[10px] font-black tracking-[0.4em] uppercase text-blue-500 mb-2">Submission Successful</p>
                        <h1 className="text-4xl font-black tracking-tight mb-4">Assessment Complete</h1>
                        <p className="text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
                            Thank you for participating. Your responses have been securely stored and evaluated by our Agentic AI engine.
                        </p>
                    </div>

                    {/* Certification Status Hero */}
                    {ds?.isCertification && (
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`mb-12 p-8 rounded-3xl border-2 transition-all ${ds.isPassed ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.1)]' : 'bg-red-500/10 border-red-500/30'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${ds.isPassed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                        {ds.isPassed ? <Award /> : <XCircle />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Certification Status</p>
                                        <h2 className="text-2xl font-black uppercase tracking-tight">
                                            {ds.isPassed ? 'Successfully Certified' : 'Certification Failed'}
                                        </h2>
                                        <p className="text-xs font-medium text-slate-400 mt-1">
                                            {ds.isPassed ? 'You have met all the industry benchmarks.' : 'Some section scores did not meet the required threshold.'}
                                        </p>
                                    </div>
                                </div>
                                {ds.isPassed && (
                                    <button 
                                        onClick={() => setShowCertificate(true)}
                                        className="bg-white text-slate-900 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 shadow-xl flex items-center gap-2"
                                    >
                                        <Award size={14} /> View Certificate
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Scores Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-12">
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex items-center gap-6">
                            <Ring pct={(ds?.totalScore / ds?.totalMax) * 100} size={80} color="#3b82f6">
                                <span className="text-xl font-black">{Math.round((ds?.totalScore / ds?.totalMax) * 100)}%</span>
                            </Ring>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Overall Accuracy</p>
                                <p className="text-lg font-black">{ds?.totalScore} / {ds?.totalMax} <span className="text-xs text-slate-500">marks</span></p>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex items-center gap-6">
                            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                                <ShieldCheck size={32} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Proctoring Status</p>
                                <p className="text-lg font-black text-emerald-500">VERIFIED</p>
                            </div>
                        </div>
                    </div>

                    {/* Section Breakdown */}
                    <div className="bg-slate-800/30 rounded-3xl p-8 border border-slate-800/50">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Performance Breakdown</h4>
                        <div className="grid grid-cols-3 gap-6">
                            {[
                                { key: 'mcq', label: 'MCQ', icon: <HelpCircle size={16}/>, score: ds?.mcqScore, max: ds?.mcqMax },
                                { key: 'coding', label: 'Coding', icon: <Code2 size={16}/>, score: ds?.codScore, max: ds?.codMax },
                                { key: 'sql', label: 'SQL', icon: <Database size={16}/>, score: ds?.sqlScore, max: ds?.sqlMax },
                                { key: 'essay', label: 'Essay', icon: <PenLine size={16}/>, score: ds?.essayScore, max: ds?.essayMax },
                                { key: 'gaming', label: 'Games', icon: <Puzzle size={16}/>, score: ds?.pipePass, max: ds?.pipeMax },
                            ].filter(s => s.max > 0).map(s => (
                                <div key={s.key} className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            {s.icon}
                                            <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                                        </div>
                                        <span className={`text-[10px] font-black ${ds?.isCertification ? (ds.sectionPass[s.key] ? 'text-emerald-500' : 'text-red-500') : 'text-slate-500'}`}>
                                            {Math.round((s.score / s.max) * 100)}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${ds?.isCertification ? (ds.sectionPass[s.key] ? 'bg-emerald-500' : 'bg-red-500') : 'bg-blue-600'}`}
                                            style={{ width: `${(s.score / s.max) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-12 flex justify-center">
                         <button 
                            onClick={() => window.location.href = '/'}
                            className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-all flex items-center gap-2"
                         >
                            <ArrowLeft size={14} /> Back to Dashboard
                         </button>
                    </div>
                </div>
            </main>

            {/* Certificate Modal */}
            <AnimatePresence>
                {showCertificate && ds && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl max-w-4xl w-full overflow-hidden relative border-[12px] border-white text-slate-900"
                        >
                            <div className="relative p-12 border-[3px] border-gray-100 rounded-[1.5rem] bg-gradient-to-br from-white via-slate-50/50 to-white overflow-hidden text-center">
                                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none grayscale">
                                    <ShieldCheck size={500} />
                                </div>

                                <div className="relative flex flex-col items-center">
                                    <div className="w-20 h-20 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white mb-6 shadow-xl shadow-indigo-200 ring-8 ring-indigo-50">
                                        <ShieldCheck size={40} />
                                    </div>
                                    <h1 className="text-sm font-black text-indigo-600 uppercase tracking-[0.4em] mb-4">{ds.certConfig?.issuer || 'VIRTUSA - JATAYU SEASON 5'}</h1>
                                    <div className="h-1 w-16 bg-indigo-600 rounded-full mb-12" />

                                    <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase mb-2">
                                        {ds.certConfig?.title || 'Certificate of Achievement'}
                                    </h2>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-12">This credential is proudly awarded to</p>

                                    <h3 className="text-6xl font-serif italic text-slate-800 mb-8 tracking-tight capitalize">{localStorage.getItem('candidate_name') || 'Candidate Name'}</h3>

                                    <div className="max-w-xl mx-auto mb-12">
                                        <p className="text-slate-500 font-medium leading-relaxed">
                                            For successfully clearing all industry benchmarks and demonstrating professional proficiency in
                                        </p>
                                        <p className="text-xl font-black text-slate-900 mt-2 uppercase tracking-wide">
                                            {ds.certConfig?.track_name || 'Professional Certification'}
                                        </p>
                                    </div>

                                    <div className="flex gap-6 mb-16">
                                        <div className="text-center px-8 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
                                            <p className="text-2xl font-black text-slate-800">{Math.round((ds.totalScore / ds.totalMax) * 100)}%</p>
                                        </div>
                                        <div className="text-center px-8 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Issue Date</p>
                                            <p className="text-sm font-black text-slate-800 uppercase mt-1.5">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                    </div>

                                    <div className="w-full flex justify-between items-end px-12 mt-4">
                                        <div className="text-center">
                                            <div className="w-40 h-px bg-slate-300 mb-2" />
                                            <p className="text-[10px] font-black text-slate-900 uppercase">Executive Director</p>
                                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Virtusa Global Services</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="w-40 h-px bg-slate-300 mb-2" />
                                            <p className="text-[10px] font-black text-slate-900 uppercase">Lead Program Mentor</p>
                                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Jatayu Season 5</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-12">
                                <button 
                                    onClick={() => setShowCertificate(false)}
                                    className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                                >
                                    Close Preview
                                </button>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => window.print()}
                                        className="px-8 py-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
                                    >
                                        <Download size={14} /> Download PDF
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Submission;
