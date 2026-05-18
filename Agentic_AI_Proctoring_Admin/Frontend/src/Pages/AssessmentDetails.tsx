import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import {
    Download,
    Users2,
    Search,
    ChevronRight,
    UserPlus,
    ShieldCheck,
    Mail,
    Trash2,
    SlidersHorizontal,
    X,
    FileSpreadsheet,
    Award,
    Send,
    CheckCircle2,
    XCircle,
    Loader2
} from 'lucide-react';
import NavBar from '../Components/NavBar';

const AssessmentDetails = () => {
    const location = useLocation();
    const testData = location.state?.test;
    const [activeTab, setActiveTab] = useState('candidates');
    const [fullTestData, setFullTestData] = useState<any>(null);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [proctors, setProctors] = useState<any[]>([]);
    const [unassignedCandidates, setUnassignedCandidates] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [proctorForm, setProctorForm] = useState({
        name: '',
        email: '',
        candidateCount: '' as string | number
    });
    const navigate = useNavigate();

    // ── Filter state ──────────────────────────────────────────────────────────
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterScoreMin, setFilterScoreMin] = useState<string>('');
    const [filterScoreMax, setFilterScoreMax] = useState<string>('');
    const [filterConfMin, setFilterConfMin] = useState<string>('');
    const [filterConfMax, setFilterConfMax] = useState<string>('');

    // ── Download modal state ──────────────────────────────────────────────────
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadFileName, setDownloadFileName] = useState('');

    // ── Certificate deployment state ──────────────────────────────────────────
    const [showCertModal, setShowCertModal] = useState(false);
    const [certPreviewCandidate, setCertPreviewCandidate] = useState<any>(null);
    const [selectedCertCandidates, setSelectedCertCandidates] = useState<Set<string>>(new Set());
    const [certSendStatus, setCertSendStatus] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});
    const [isSendingAll, setIsSendingAll] = useState(false);
    const certPreviewRef = useRef<HTMLDivElement>(null);
    const fetchProctors = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/test/${testData.test_id}/proctor`);
            const data = await res.json();
            setProctors(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch proctors:", error);
        }
    };

    const fetchUnassigned = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/test/${testData.test_id}/unassigned-candidates`);
            const data = await res.json();
            setUnassignedCandidates(data);
            // Default count to empty or 1 if data exists
            setProctorForm(prev => ({ ...prev, candidateCount: data.length > 0 ? 1 : '' }));
        } catch (error) {
            console.error("Failed to fetch unassigned candidates:", error);
        }
    };

    useEffect(() => {
        const fetchFullDetails = async () => {
            if (!testData?.test_id) return;
            try {
                const [previewRes, candidatesRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/admin/test/${testData.test_id}/Preview`),
                    fetch(`${import.meta.env.VITE_API_URL}/admin/test/${testData.test_id}/candidates`)
                ]);
                const previewData = await previewRes.json();
                const candidatesData = await candidatesRes.json();

                setFullTestData(previewData);
                setCandidates(candidatesData);

                await Promise.all([fetchProctors(), fetchUnassigned()]);
            } catch (error) {
                console.error("Failed to fetch assessment details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFullDetails();
    }, [testData]);



    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return 'N/A';
        }
    };

    // ── Filtered candidates (memoized) ────────────────────────────────────────
    const filteredCandidates = useMemo(() => {
        return candidates.filter(c => {
            const nameMatch = c.name?.toLowerCase().includes(searchTerm.toLowerCase());
            const emailMatch = c.email?.toLowerCase().includes(searchTerm.toLowerCase());
            const regMatch = c.reg_no?.toLowerCase().includes(searchTerm.toLowerCase());
            if (!nameMatch && !emailMatch && !regMatch) return false;

            if (filterStatus !== 'all' && c.status !== filterStatus) return false;

            const score = c.total_score ?? null;
            if (filterScoreMin !== '' && (score === null || score < parseFloat(filterScoreMin))) return false;
            if (filterScoreMax !== '' && (score === null || score > parseFloat(filterScoreMax))) return false;

            const conf = c.confidence_score ?? null;
            if (filterConfMin !== '' && (conf === null || conf < parseFloat(filterConfMin))) return false;
            if (filterConfMax !== '' && (conf === null || conf > parseFloat(filterConfMax))) return false;

            return true;
        });
    }, [candidates, searchTerm, filterStatus, filterScoreMin, filterScoreMax, filterConfMin, filterConfMax]);

    const activeFilterCount = [filterStatus !== 'all', filterScoreMin, filterScoreMax, filterConfMin, filterConfMax].filter(Boolean).length;

    const resetFilters = () => {
        setFilterStatus('all');
        setFilterScoreMin('');
        setFilterScoreMax('');
        setFilterConfMin('');
        setFilterConfMax('');
    };

    // ── Certification helpers ──────────────────────────────────────────────────
    const isCertification = fullTestData?.metadata?.category === 'Certification';
    const certConfig = fullTestData?.certification_config;
    const passingThreshold = certConfig?.global_threshold ?? 70;

    const maxTotalScore = useMemo(() => {
        if (!fullTestData) return 0;
        let max = 0;
        if (fullTestData.MCQ?.total_questions) max += fullTestData.MCQ.total_questions;
        if (fullTestData.Coding?.questions) max += (fullTestData.Coding.questions as any[]).reduce((a: number, q: any) => a + (q.marks || 0), 0);
        if (fullTestData.SQL?.questions) max += (fullTestData.SQL.questions as any[]).reduce((a: number, q: any) => a + (q.marks || 0), 0);
        if (fullTestData.FITB?.sections) max += (fullTestData.FITB.sections as any[]).reduce((a: number, s: any) =>
            a + ((s.questions as any[])?.reduce((qa: number, q: any) => qa + (q.marks || 0), 0) || 0), 0);
        if (fullTestData.Essay?.enabled) max += 50;
        return max;
    }, [fullTestData]);

    const isEligible = (candidate: any) => {
        if (!isCertification || maxTotalScore === 0) return false;
        const score = candidate.total_score;
        if (score === undefined || score === null) return false;
        return (score / maxTotalScore) * 100 >= passingThreshold;
    };

    const eligibleCandidates = useMemo(() =>
        candidates.filter((c: any) => c.status === 'Completed' && isEligible(c)),
        [candidates, maxTotalScore, passingThreshold, isCertification]
    );

    const openCertModal = () => {
        const initial = new Set<string>(eligibleCandidates.map((c: any) => c.email as string));
        setSelectedCertCandidates(initial);
        setCertPreviewCandidate(eligibleCandidates[0] || null);
        setCertSendStatus({});
        setShowCertModal(true);
    };

    const sendCertificateForCandidate = async (candidate: any) => {
        setCertSendStatus(prev => ({ ...prev, [candidate.email]: 'sending' }));
        try {
            setCertPreviewCandidate(candidate);
            await new Promise(r => setTimeout(r, 150));
            let imageBase64: string | null = null;
            if (certPreviewRef.current) {
                imageBase64 = await toPng(certPreviewRef.current, { cacheBust: true, pixelRatio: 2 });
            }
            const scorePercent = maxTotalScore > 0
                ? Math.round((candidate.total_score / maxTotalScore) * 100)
                : (candidate.total_score ?? 0);
            const certId = `CERT-${Date.now()}-${(candidate.email as string).split('@')[0].toUpperCase()}`;
            const formData = new FormData();
            formData.append('email', candidate.email);
            formData.append('name', candidate.name || candidate.email);
            formData.append('track_name', certConfig?.track_name || 'Skill Certification');
            formData.append('certificate_id', certId);
            formData.append('score', String(scorePercent));
            formData.append('issuer', certConfig?.issuer || 'Assessment Authority');
            if (imageBase64) formData.append('Certificate_Image', imageBase64);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/send-certificate`, { method: 'POST', body: formData });
            setCertSendStatus(prev => ({ ...prev, [candidate.email]: res.ok ? 'sent' : 'error' }));
        } catch {
            setCertSendStatus(prev => ({ ...prev, [candidate.email]: 'error' }));
        }
    };

    const handleSendAllCertificates = async () => {
        setIsSendingAll(true);
        const toSend = eligibleCandidates.filter((c: any) => selectedCertCandidates.has(c.email));
        for (const candidate of toSend) {
            await sendCertificateForCandidate(candidate);
        }
        setIsSendingAll(false);
        toast.success(`Certificates sent to ${toSend.length} candidate(s).`);
    };

    // ── Excel export ──────────────────────────────────────────────────────────
    const handleExcelDownload = () => {
        const defaultName = `${testData?.test_title || 'Assessment'}_Candidates_${new Date().toISOString().slice(0,10)}`;
        setDownloadFileName(defaultName);
        setShowDownloadModal(true);
    };

    const doExcelDownload = () => {
        const rows = filteredCandidates.map(c => ({
            'Name':                       c.name || '--',
            'Email':                      c.email || '--',
            'Registration No':            c.reg_no || '--',
            'College':                    c.college || '--',
            'Status':                     c.status || '--',
            'Total Score':                c.total_score ?? '--',
            'Confidence Score (%)':       c.confidence_score ?? '--',
            'Trust Score (%)':            c.trust_score ?? '--',
            'Webcam Risk Score':          c.webcam_risk_score ?? '--',
            'Webcam Violation Score':     c.webcam_violation_score ?? '--',
            'Webcam Log Count':           c.webcam_log_count ?? 0,
            'Mobile Suspicion Score':     c.mobile_suspicion_score ?? '--',
            'Mobile Trust Score':         c.mobile_trust_score ?? '--',
            'Mobile Violation Count':     c.mobile_violation_count ?? '--',
            'Mobile Log Count':           c.mobile_log_count ?? 0,
            'Total Violation Count':      c.total_violation_count ?? 0,
            'Sections Completed':         c.sections_completed ?? '--',
            'Start Time':                 c.start_time ? new Date(c.start_time).toLocaleString('en-GB') : '--',
            'End Time':                   c.end_time   ? new Date(c.end_time).toLocaleString('en-GB')   : '--',
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length + 4, 20) }));
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
        XLSX.writeFile(wb, `${downloadFileName || 'candidates'}.xlsx`);
        setShowDownloadModal(false);
        toast.success('Excel file downloaded successfully!');
    };

    const calculateSectionInfo = () => {
        const sections = [];

        // MCQ
        if (fullTestData?.MCQ && fullTestData.MCQ.total_questions > 0) {
            const qCount = fullTestData.MCQ.total_questions;
            sections.push({
                name: 'MCQ Section',
                questions: qCount,
                duration: fullTestData.MCQ.mcq_duration || '--',
                marks: qCount // 1 mark per question based on parser
            });
        }

        // Gaming
        if (fullTestData?.Gaming?.games?.[0] && fullTestData.Gaming.games[0].enabled) {
            const game = fullTestData.Gaming.games[0];
            sections.push({
                name: 'Gaming Section',
                questions: game.rounds_count,
                duration: game.total_duration,
                marks: '--',
                isGaming: true
            });
        }

        // Coding
        if (fullTestData?.Coding && fullTestData.Coding.total_questions > 0) {
            const totalMarks = fullTestData.Coding.questions?.reduce((acc: number, q: any) => acc + (q.marks || 0), 0);
            sections.push({
                name: 'Coding Section',
                questions: fullTestData.Coding.total_questions,
                duration: fullTestData.Coding.coding_duration || '--',
                marks: totalMarks || '--'
            });
        }

        // SQL
        if (fullTestData?.SQL && fullTestData.SQL.total_questions > 0) {
            const totalMarks = fullTestData.SQL.questions?.reduce((acc: number, q: any) => acc + (q.marks || 0), 0);
            sections.push({
                name: 'SQL Section',
                questions: fullTestData.SQL.total_questions,
                duration: fullTestData.SQL.sql_duration || '--',
                marks: totalMarks || '--'
            });
        }

        // FITB
        if (fullTestData?.FITB && fullTestData.FITB.total_questions > 0) {
            const totalMarks = (fullTestData.FITB.sections || []).reduce((acc: number, s: any) =>
                acc + (s.questions?.reduce((qAcc: number, q: any) => qAcc + (q.marks || 0), 0) || 0), 0
            );
            sections.push({
                name: 'Fill in the Blanks',
                questions: fullTestData.FITB.total_questions,
                duration: fullTestData.FITB.fitb_duration || '--',
                marks: totalMarks || '--'
            });
        }

        // Essay
        if (fullTestData?.Essay?.enabled) {
            sections.push({
                name: 'Essay Section',
                questions: 1,
                duration: fullTestData.Essay.duration || '--',
                marks: '--'
            });
        }

        // Diagram
        if (fullTestData?.Diagram?.enabled) {
            sections.push({
                name: 'Diagram Section',
                questions: 1,
                duration: '--',
                marks: '--'
            });
        }

        return sections;
    };

    const sectionsInfo = calculateSectionInfo();

    const handleAssignProctor = async (e: React.FormEvent) => {
        e.preventDefault();
        const count = parseInt(proctorForm.candidateCount.toString());
        if (isNaN(count) || count <= 0) {
            toast.error("Please assign at least 1 candidate");
            return;
        }

        setAssigning(true);
        try {
            const formData = new FormData();
            formData.append('assessment_id', testData.test_id);
            formData.append('name', proctorForm.name);
            formData.append('email', proctorForm.email);
            formData.append('candidate_count', count.toString());

            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/assign-proctor`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`Proctor assigned successfully! Passkey: ${data.passkey}`);
                setProctorForm({ name: '', email: '', candidateCount: '' });
                await Promise.all([fetchProctors(), fetchUnassigned()]);
            } else {
                const errData = await response.json();
                toast.error(errData.detail || "Failed to assign proctor");
            }
        } catch (error) {
            console.error('Assignment error:', error);
            toast.error('An error occurred during assignment');
        } finally {
            setAssigning(false);
        }
    };

    const handleTerminateProctor = async (proctorEmail: string) => {
        if (!window.confirm(`Are you sure you want to terminate proctor ${proctorEmail}? This will invalidate their passkey.`)) {
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/terminate-proctor/${testData.test_id}/${proctorEmail}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success("Proctor assignment terminated");
                await Promise.all([fetchProctors(), fetchUnassigned()]);
            } else {
                toast.error("Failed to terminate proctor");
            }
        } catch (error) {
            console.error("Termination error:", error);
            toast.error("An error occurred during termination");
        }
    };

    return (
        <>
        <div className="min-h-screen bg-[#F0F2F5] font-sans pb-12">
            <NavBar />

            <div className="max-w-[1800px] mx-auto px-10 py-8 pt-24">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-[#1e293b] tracking-tight uppercase">{testData?.test_title || 'Analytics'}</h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-800">
                    {/* Sidebar */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                            <h2 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-wider">Test Details</h2>

                            {loading ? (
                                <div className="space-y-4 animate-pulse">
                                    {[1, 2, 3].map(i => <div key={i} className="h-4 bg-gray-100 rounded w-full" />)}
                                </div>
                            ) : (sectionsInfo.length > 0 || fullTestData?.metadata) ? (
                                <div className="space-y-8">
                                    {fullTestData?.metadata?.category === 'University' && (
                                        <div className="space-y-4 pb-6 border-b border-gray-100">
                                            <h3 className="text-[11px] font-black text-orange-500 uppercase tracking-[0.15em]">University Metadata</h3>
                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</p>
                                                    <p className="text-sm font-black text-gray-900 leading-tight">{fullTestData.metadata.subject_name}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Code</p>
                                                        <p className="text-sm font-black text-gray-900">{fullTestData.metadata.subject_code}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dept</p>
                                                        <p className="text-sm font-black text-gray-900">{fullTestData.metadata.department}</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sem</p>
                                                        <p className="text-sm font-black text-gray-900">{fullTestData.metadata.semester}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reg</p>
                                                        <p className="text-sm font-black text-gray-900">{fullTestData.metadata.regulation}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {sectionsInfo.map((section, idx) => (
                                        <div key={idx} className="space-y-3">
                                            <h3 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.15em]">{section.name}</h3>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 text-xs font-bold uppercase tracking-tight">{section.isGaming ? 'Rounds' : 'Questions'}:</span>
                                                    <span className="text-gray-900 font-extrabold">{section.questions}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 text-xs font-bold uppercase tracking-tight">Duration:</span>
                                                    <span className="text-gray-900 font-extrabold">{section.duration} mins</span>
                                                </div>
                                                {section.marks !== '--' && !section.isGaming && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-tight">Total Marks:</span>
                                                        <span className="text-gray-900 font-extrabold">{section.marks}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 font-bold text-sm">Taken On:</span>
                                            <span className="text-gray-900 font-black text-sm">{formatDate(testData?.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm italic py-4">No test configuration found</p>
                            )}

                            <div className="mt-12 pt-12 border-t border-gray-100">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Human Proctors</h3>
                                <div className="space-y-4">
                                    {proctors.length > 0 ? proctors.slice(0, 3).map((p, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xs font-black">
                                                {p.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-900 uppercase tracking-wider">{p.name}</p>
                                                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">Monitoring {p.candidate_count} Users</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center">
                                                <Users2 size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest italic">Not Connected</p>
                                            </div>
                                        </div>
                                    )}
                                    {proctors.length > 3 && <p className="text-[9px] font-bold text-gray-400 uppercase ml-11">+{proctors.length - 3} more</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-9 space-y-8">
                        {/* Tabs */}
                        <div className="flex items-center justify-between border-b border-gray-200 px-2">
                            <div className="flex gap-12">
                                <button
                                    onClick={() => setActiveTab('candidates')}
                                    className={`pb-4 text-sm font-bold tracking-tight transition-all relative ${activeTab === 'candidates' ? 'text-[#4F46E5]' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Candidates
                                    {activeTab === 'candidates' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />}
                                </button>
                                <button
                                    onClick={() => setActiveTab('invigilator')}
                                    className={`pb-4 text-sm font-bold tracking-tight transition-all relative ${activeTab === 'invigilator' ? 'text-[#4F46E5]' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Assign Invigilator
                                    {activeTab === 'invigilator' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]" />}
                                </button>
                            </div>
                            <div className="flex items-center gap-4 pb-4">
                                {isCertification && (
                                    <button
                                        onClick={openCertModal}
                                        disabled={eligibleCandidates.length === 0}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Award size={14} />
                                        Deploy Certificate
                                        {eligibleCandidates.length > 0 && (
                                            <span className="bg-white/20 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                                {eligibleCandidates.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={handleExcelDownload}
                                    className="flex items-center gap-2 text-indigo-600 text-[11px] font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
                                >
                                    <FileSpreadsheet size={14} />
                                    Export Excel
                                </button>
                            </div>
                        </div>

                        {/* Candidates Tab Content */}
                        {activeTab === 'candidates' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="text-[20px] font-black text-[#1e293b] uppercase tracking-tight shrink-0">Enrolled Candidates</h3>
                                    <div className="flex items-center gap-3 ml-auto">
                                        <div className="relative w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search candidates..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm shadow-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setShowFilterPanel(v => !v)}
                                            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all shadow-sm ${
                                                showFilterPanel || activeFilterCount > 0
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'
                                            }`}
                                        >
                                            <SlidersHorizontal size={15} />
                                            Filters
                                            {activeFilterCount > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                                                    {activeFilterCount}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* ── Filter Panel ── */}
                                <AnimatePresence>
                                {showFilterPanel && (
                                    <motion.div
                                        key="filter-panel"
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.18 }}
                                        className="bg-white border border-gray-100 rounded-2xl shadow-md p-6"
                                    >
                                        <div className="flex items-center justify-between mb-5">
                                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.18em]">Filter Candidates</p>
                                            {activeFilterCount > 0 && (
                                                <button onClick={resetFilters} className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-wider flex items-center gap-1">
                                                    <X size={12} /> Clear All
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Status filter */}
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Status</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { val: 'all', label: 'All' },
                                                        { val: 'Completed', label: 'Completed' },
                                                        { val: 'Joined', label: 'Joined' },
                                                        { val: 'invitation sent to candidate', label: 'Invited' },
                                                        { val: 'mail not sent', label: 'Mail Failed' },
                                                    ].map(s => (
                                                        <button
                                                            key={s.val}
                                                            onClick={() => setFilterStatus(s.val)}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                                                                filterStatus === s.val
                                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                                    : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-indigo-300'
                                                            }`}
                                                        >
                                                            {s.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            {/* Score range */}
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Score Range</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="number" placeholder="Min" value={filterScoreMin} onChange={e => setFilterScoreMin(e.target.value)}
                                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                                                    <span className="text-gray-300 font-bold">–</span>
                                                    <input type="number" placeholder="Max" value={filterScoreMax} onChange={e => setFilterScoreMax(e.target.value)}
                                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                                                </div>
                                            </div>
                                            {/* Confidence range */}
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Confidence Score (%)</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="number" placeholder="Min" value={filterConfMin} onChange={e => setFilterConfMin(e.target.value)}
                                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                                                    <span className="text-gray-300 font-bold">–</span>
                                                    <input type="number" placeholder="Max" value={filterConfMax} onChange={e => setFilterConfMax(e.target.value)}
                                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                Showing <span className="text-indigo-600 font-black">{filteredCandidates.length}</span> of <span className="text-gray-700 font-black">{candidates.length}</span> candidates
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                                </AnimatePresence>

                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden text-slate-800">
                                    <div className="overflow-x-auto">
                                         <table className="w-full text-left">
                                             <thead>
                                                 <tr className="bg-gray-50/50 border-b border-gray-100">
                                                     <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Candidate</th>
                                                     <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Registration Number</th>
                                                     <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                                     <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Score</th>
                                                     <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Confidence</th>
                                                      <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Eligibility</th>
                                                     <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                                                 </tr>
                                             </thead>
                                             <tbody className="divide-y divide-gray-50">
                                                 {filteredCandidates.map((candidate, idx) => (
                                                     <tr key={idx} className="hover:bg-gray-50/30 transition-colors group">
                                                         <td className="px-4 py-4">
                                                             <div className="flex items-center gap-4">
                                                                 <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black">
                                                                     {(candidate.name || '').charAt(0)}
                                                                 </div>
                                                                 <div>
                                                                     <p className="text-sm font-black text-gray-900 leading-none mb-1">{candidate.name}</p>
                                                                     <p className="text-[11px] font-bold text-gray-400">{candidate.email}</p>
                                                                 </div>
                                                             </div>
                                                         </td>
                                                         <td className="px-4 py-4">
                                                             <span className="text-sm font-bold text-gray-600">{candidate.reg_no}</span>
                                                         </td>
                                                         <td className="px-4 py-4">
                                                             <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${candidate.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                                                 }`}>
                                                                 {candidate.status.replace(/_/g, ' ')}
                                                             </span>
                                                         </td>
                                                         <td className="px-4 py-4">
                                                             <span className="text-sm font-black text-gray-900">
                                                                 {candidate.total_score !== undefined ? candidate.total_score : '--'}
                                                             </span>
                                                         </td>
                                                         <td className="px-4 py-4">
                                                             <span className={`text-sm font-black ${candidate.confidence_score !== undefined && candidate.confidence_score !== null ? (candidate.confidence_score >= 70 ? 'text-green-600' : candidate.confidence_score >= 40 ? 'text-yellow-600' : 'text-red-600') : 'text-gray-900'}`}>
                                                                 {candidate.confidence_score !== undefined && candidate.confidence_score !== null ? `${candidate.confidence_score}%` : '--'}
                                                             </span>
                                                         </td>
                                                         <td className="px-4 py-4">
                                                             {isCertification ? (
                                                                 isEligible(candidate) ? (
                                                                     <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-700 border-emerald-100 whitespace-nowrap">
                                                                         <CheckCircle2 size={10} /> Eligible
                                                                     </span>
                                                                 ) : (
                                                                     <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-red-50 text-red-600 border-red-100 whitespace-nowrap">
                                                                         <XCircle size={10} /> Below Threshold
                                                                     </span>
                                                                 )
                                                             ) : (
                                                                 <span className="text-gray-300 text-[10px] font-bold">--</span>
                                                             )}
                                                         </td>
                                                         <td className="px-4 py-4 text-right">
                                                             <button
                                                                 onClick={() => navigate('/candidate-analytics', { state: { candidate, testId: testData?.test_id } })}
                                                                 className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95 whitespace-nowrap"
                                                             >
                                                                 View Analytics
                                                                 <ChevronRight size={14} />
                                                             </button>
                                                         </td>
                                                     </tr>
                                                 ))}
                                             </tbody>
                                         </table>

                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Invigilator Tab Content */}
                        {activeTab === 'invigilator' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[20px] font-black text-[#1e293b] uppercase tracking-tight">Proctor Management</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Assignment Form */}
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
                                        <div className="flex items-center gap-3 mb-8">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                                <UserPlus size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-gray-900 uppercase">Assign New proctor</h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Credentials will be emailed</p>
                                            </div>
                                        </div>

                                        <form onSubmit={handleAssignProctor} className="space-y-5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Proctor Name</label>
                                                <div className="relative">
                                                    <Users2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="e.g. John Doe"
                                                        value={proctorForm.name}
                                                        onChange={(e) => setProctorForm({ ...proctorForm, name: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-bold"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Work Email</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                                    <input
                                                        type="email"
                                                        required
                                                        placeholder="proctor@example.com"
                                                        value={proctorForm.email}
                                                        onChange={(e) => setProctorForm({ ...proctorForm, email: e.target.value })}
                                                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-bold"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Candidate Limit</label>
                                                    <span className="text-[9px] font-black text-indigo-500 uppercase">{unassignedCandidates.length} Remaining</span>
                                                </div>
                                                <div className="relative">
                                                    <Users2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max={unassignedCandidates.length}
                                                        required
                                                        placeholder="Enter limit..."
                                                        value={proctorForm.candidateCount}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setProctorForm({ ...proctorForm, candidateCount: val === '' ? '' : parseInt(val) });
                                                        }}
                                                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-bold"
                                                    />
                                                </div>
                                            </div>

                                            {/* Preview List */}
                                            {typeof proctorForm.candidateCount === 'number' && proctorForm.candidateCount > 0 && unassignedCandidates.length > 0 && (
                                                <div className="space-y-2 pt-2">
                                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Assignment Preview</label>
                                                    <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-3">
                                                        {unassignedCandidates.slice(0, proctorForm.candidateCount).map((c, i) => (
                                                            <div key={i} className="flex items-center gap-3">
                                                                <div className="w-6 h-6 bg-white rounded flex items-center justify-center text-[10px] font-black text-indigo-500 border border-indigo-50">
                                                                    {i + 1}
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-black text-gray-800 leading-none mb-0.5">{c.name}</p>
                                                                    <p className="text-[9px] font-bold text-gray-400">{c.email}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}


                                            <button
                                                type="submit"
                                                disabled={assigning || unassignedCandidates.length === 0}
                                                className={`w-full py-4 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 mt-4 ${unassignedCandidates.length === 0 ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
                                                    }`}
                                            >
                                                {assigning ? 'Assigning...' : (
                                                    unassignedCandidates.length === 0 ? 'All Candidates Assigned' : 'Assign Proctor'
                                                )}
                                            </button>
                                        </form>
                                    </div>

                                    {/* Status / Active Proctor */}
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 h-full">
                                            <div className="flex items-center gap-3 mb-8">
                                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                                    <ShieldCheck size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-gray-900 uppercase">Assigned Proctors</h4>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active monitoring status</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                                {proctors.length > 0 ? (
                                                    proctors.map((p, idx) => (
                                                        <div key={idx} className="p-5 bg-emerald-50/20 rounded-2xl border border-emerald-100/30 group">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600 font-black text-sm border border-emerald-50">
                                                                        {p.name.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <h5 className="text-sm font-black text-gray-900 leading-none mb-1">{p.name}</h5>
                                                                        <p className="text-[10px] font-bold text-gray-400">{p.email}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-100/50 rounded-lg">
                                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                                        <span className="text-[9px] font-black text-emerald-700 uppercase">Active</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleTerminateProctor(p.email)}
                                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                        title="Terminate Assignment"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                                <div className="p-3 bg-white/60 rounded-xl border border-white">
                                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Assigned</p>
                                                                    <p className="text-xs font-black text-emerald-600">{p.candidate_count} Candidates</p>
                                                                </div>
                                                                <div className="p-3 bg-white/60 rounded-xl border border-white">
                                                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Passkey</p>
                                                                    <div className="flex items-center justify-between">
                                                                        <code className="text-[10px] font-black text-indigo-600 tracking-wider">{p.passkey}</code>
                                                                        <button
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(p.passkey);
                                                                                toast.success('Passkey copied!');
                                                                            }}
                                                                            className="text-[8px] font-black text-gray-400 hover:text-indigo-600 uppercase"
                                                                        >
                                                                            Copy
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="pt-3 border-t border-emerald-100/20">
                                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Monitored Emails</p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {(p.assigned_candidates || []).map((email: string, i: number) => (
                                                                        <span key={i} className="px-2 py-1 bg-white/40 border border-white/60 rounded text-[9px] font-bold text-gray-600">
                                                                            {email}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                                            <Users2 size={24} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-gray-300 uppercase">No Proctors Assigned</p>
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight max-w-[180px] mx-auto mt-2 leading-relaxed">
                                                                Assign an invigilator to monitor candidates
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>

        {/* ── Excel Download Modal ── */}
        <AnimatePresence>
        {showDownloadModal && (
            <motion.div
                key="download-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
                onClick={() => setShowDownloadModal(false)}
            >
                <motion.div
                    initial={{ scale: 0.93, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.93, opacity: 0, y: 16 }}
                    transition={{ duration: 0.22 }}
                    className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 w-full max-w-md"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <FileSpreadsheet size={22} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Export to Excel</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {filteredCandidates.length} candidates · .xlsx format
                            </p>
                        </div>
                        <button onClick={() => setShowDownloadModal(false)} className="ml-auto p-1.5 text-gray-300 hover:text-gray-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="mb-6">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">File Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={downloadFileName}
                                onChange={e => setDownloadFileName(e.target.value)}
                                className="w-full px-4 py-3 pr-16 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                placeholder="Enter file name..."
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase">.xlsx</span>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-6">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Included Columns (20 fields)</p>
                        <div className="flex flex-wrap gap-1.5">
                            {['Name','Email','Reg No','College','Status','Total Score','Confidence %','Trust Score','Webcam Risk','Webcam Violations','Webcam Logs','Mobile Suspicion','Mobile Trust','Mobile Violations','Mobile Logs','Total Violations','Sections Done','Start Time','End Time'].map(col => (
                                <span key={col} className="px-2 py-1 bg-white border border-gray-100 rounded-lg text-[9px] font-black text-gray-500 uppercase tracking-wide">{col}</span>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setShowDownloadModal(false)}
                            className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={doExcelDownload}
                            disabled={!downloadFileName.trim()}
                            className="flex-1 py-3 bg-emerald-600 text-white text-sm font-black rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40"
                        >
                            <Download size={16} /> Download
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
        </AnimatePresence>

        {/* ── Certificate Deployment Modal ── */}
        <AnimatePresence>
        {showCertModal && (
            <motion.div
                key="cert-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
                onClick={() => setShowCertModal(false)}
            >
                <motion.div
                    initial={{ scale: 0.94, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.94, opacity: 0, y: 20 }}
                    transition={{ duration: 0.24 }}
                    className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-gray-50/60 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                <Award size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Deploy Certificates</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {selectedCertCandidates.size} of {eligibleCandidates.length} eligible candidates selected
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSendAllCertificates}
                                disabled={isSendingAll || selectedCertCandidates.size === 0}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isSendingAll ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                {isSendingAll ? 'Sending...' : 'Send Certificates'}
                            </button>
                            <button onClick={() => setShowCertModal(false)} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Modal Body */}
                    <div className="flex flex-1 overflow-hidden">
                        {/* Left: Candidate List */}
                        <div className="w-80 shrink-0 border-r border-gray-100 flex flex-col">
                            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/40">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Eligible Candidates</p>
                            </div>
                            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                                {eligibleCandidates.map((c: any) => {
                                    const status = certSendStatus[c.email] || 'idle';
                                    const isSelected = selectedCertCandidates.has(c.email);
                                    const scorePercent = maxTotalScore > 0 ? Math.round((c.total_score / maxTotalScore) * 100) : c.total_score;
                                    return (
                                        <div
                                            key={c.email}
                                            onClick={() => {
                                                if (status === 'sent') return;
                                                setCertPreviewCandidate(c);
                                                setSelectedCertCandidates(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(c.email)) next.delete(c.email);
                                                    else next.add(c.email);
                                                    return next;
                                                });
                                            }}
                                            className={`flex items-center gap-3 px-5 py-4 cursor-pointer transition-all ${certPreviewCandidate?.email === c.email ? 'bg-emerald-50' : 'hover:bg-gray-50/60'} ${status === 'sent' ? 'opacity-60' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                readOnly
                                                checked={isSelected}
                                                className="w-4 h-4 accent-emerald-600 rounded shrink-0"
                                            />
                                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-700 font-black text-xs shrink-0">
                                                {(c.name || '').charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-gray-900 truncate">{c.name}</p>
                                                <p className="text-[9px] font-bold text-gray-400 truncate">{c.email}</p>
                                                <p className="text-[9px] font-black text-emerald-600">{scorePercent}% score</p>
                                            </div>
                                            <div className="shrink-0">
                                                {status === 'sending' && <Loader2 size={14} className="text-amber-500 animate-spin" />}
                                                {status === 'sent' && <CheckCircle2 size={14} className="text-emerald-600" />}
                                                {status === 'error' && <XCircle size={14} className="text-red-500" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Certificate Preview */}
                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-100/60 overflow-auto py-8">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Certificate Preview</p>
                            {certPreviewCandidate ? (
                                <div
                                    ref={certPreviewRef}
                                    className="w-[700px] aspect-[1.414/1] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-slate-200 p-10 flex flex-col items-center justify-between relative overflow-hidden"
                                    style={{ fontFamily: 'Georgia, serif' }}
                                >
                                    {/* Dot texture */}
                                    <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 0)', backgroundSize: '22px 22px' }} />
                                    {/* Frames */}
                                    <div className="absolute inset-3 border border-slate-100 pointer-events-none" />
                                    <div className="absolute inset-6 border-2 border-slate-200 pointer-events-none" />

                                    {/* Header */}
                                    <div className="z-10 flex flex-col items-center mt-4 mb-3">
                                        <div className="w-10 h-10 bg-blue-600 rounded-xl rotate-45 flex items-center justify-center shadow-lg shadow-blue-100 mb-5 border-2 border-white">
                                            <span className="text-lg font-black text-white -rotate-45">V</span>
                                        </div>
                                        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-400 mb-1">Official Certification</p>
                                        <h2 className="text-lg font-black uppercase tracking-[0.1em] text-slate-800 border-b-2 border-blue-600 pb-1 px-4" style={{ fontFamily: 'Arial, sans-serif' }}>
                                            {certConfig?.title || 'Certificate of Achievement'}
                                        </h2>
                                    </div>

                                    {/* Recipient */}
                                    <div className="z-10 flex flex-col items-center text-center px-10 mb-3">
                                        <p className="text-[8px] text-slate-400 uppercase tracking-[0.3em] font-bold mb-2">This acknowledges that</p>
                                        <h3 className="text-[28px] italic text-slate-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                                            {certPreviewCandidate.name || certPreviewCandidate.email}
                                        </h3>
                                        <div className="w-28 h-px bg-slate-200 mb-2" />
                                        <p className="text-[8px] text-slate-400 uppercase tracking-[0.15em] font-bold leading-tight max-w-[400px]">
                                            has demonstrated exceptional proficiency and successfully met all requirements for the certification in
                                        </p>
                                    </div>

                                    {/* Track */}
                                    <div className="z-10 mb-6">
                                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">
                                            {certConfig?.track_name || 'Technical Specialization'}
                                        </p>
                                    </div>

                                    {/* Footer */}
                                    <div className="absolute bottom-8 left-0 right-0 px-14 flex justify-between items-end">
                                        <div className="flex flex-col items-center">
                                            <div className="w-24 h-px bg-slate-300 mb-1.5" />
                                            <p className="text-[7px] font-black text-slate-800 uppercase tracking-widest">{certConfig?.issuer || 'Issuing Authority'}</p>
                                            <p className="text-[6px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Issuing Organization</p>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="w-24 h-px bg-slate-300 mb-1.5" />
                                            <p className="text-[7px] font-black text-slate-800 uppercase tracking-widest">
                                                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                            <p className="text-[6px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Date of Issue</p>
                                        </div>
                                    </div>

                                    {/* Watermark seal */}
                                    <div className="absolute top-8 left-8 w-20 h-20 opacity-[0.06] pointer-events-none">
                                        <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                                            <path id="cert-curve" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="transparent" />
                                            <text className="text-[10px] font-bold uppercase tracking-widest fill-current">
                                                <textPath href="#cert-curve">Verified Certification Virtusa Jatayu </textPath>
                                            </text>
                                        </svg>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-400">
                                    <Award size={40} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-sm font-bold">Select a candidate to preview their certificate</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
        </AnimatePresence>
        </>
    );
};

export default AssessmentDetails;
