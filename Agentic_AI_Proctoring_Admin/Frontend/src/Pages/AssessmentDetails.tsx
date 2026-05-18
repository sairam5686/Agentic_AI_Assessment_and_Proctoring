import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
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
    Award
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

    // ── Certificate deployment state ─────────────────────────────────────────
    const [deployingCerts, setDeployingCerts] = useState(false);
    const [showDeployModal, setShowDeployModal] = useState(false);
    const [bulkDeployCandidate, setBulkDeployCandidate] = useState<any | null>(null);
    const bulkCertRef = useRef<HTMLDivElement>(null);
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

    // ── Certification helpers ─────────────────────────────────────────────────
    const isCertificationTest = testData?.category === 'Certification' ||
        fullTestData?.category === 'Certification' ||
        fullTestData?.certification_config != null;

    const certConfig = fullTestData?.certification_config;
    const globalThreshold = certConfig?.global_threshold ?? 60;

    const eligibleCandidates = filteredCandidates.filter(c => c.status === 'Completed');

    const handleDeployCertificates = async () => {
        if (eligibleCandidates.length === 0) return;
        setDeployingCerts(true);
        try {
            const { toPng } = await import('html-to-image');
            let sent = 0;
            let failed = 0;

            for (const c of eligibleCandidates) {
                // Set active candidate to render the hidden certificate
                setBulkDeployCandidate(c);
                
                // Wait for React to render and paint the certificate container
                await new Promise(resolve => setTimeout(resolve, 180));

                let dataUrl = '';
                if (bulkCertRef.current) {
                    try {
                        dataUrl = await toPng(bulkCertRef.current, { quality: 0.95, pixelRatio: 1.5 });
                    } catch (imageErr) {
                        console.error('Error capturing bulk certificate for', c.email, imageErr);
                    }
                }

                const fd = new FormData();
                fd.append('email', c.email);
                fd.append('name', c.name);
                fd.append('track_name', certConfig?.track_name || certConfig?.trackName || testData?.test_title || 'Assessment');
                fd.append('certificate_id', `CERT-${testData?.test_id?.slice(-6).toUpperCase()}-${c.reg_no || c.email.split('@')[0]}`);
                fd.append('score', String(c.total_score ?? 0));
                fd.append('issuer', certConfig?.issuer || 'TEAM_TITANS');
                if (dataUrl) {
                    fd.append('Certificate_Image', dataUrl);
                }

                try {
                    const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/send-certificate`, {
                        method: 'POST',
                        body: fd
                    });
                    if (res.ok) {
                        sent++;
                    } else {
                        failed++;
                        console.error('Failed to send certificate for', c.email);
                    }
                } catch (fetchErr) {
                    failed++;
                    console.error('Error sending certificate for', c.email, fetchErr);
                }
            }

            // Reset active certificate candidate
            setBulkDeployCandidate(null);
            setShowDeployModal(false);

            if (failed === 0) {
                toast.success(`🎓 Certificates deployed successfully to all ${sent} filtered candidates!`);
            } else {
                toast.success(`🎓 Deployed ${sent} certificates. ${failed} failed — check console.`);
            }
        } catch (e) {
            toast.error('Certificate deployment failed.');
            console.error(e);
            setBulkDeployCandidate(null);
        } finally {
            setDeployingCerts(false);
        }
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
                    <div className="lg:col-span-2 space-y-6">
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
                    <div className="lg:col-span-10 space-y-8">
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
                            <div className="flex items-center gap-3 pb-4">
                                {isCertificationTest && (
                                    <button
                                        onClick={() => eligibleCandidates.length > 0 && setShowDeployModal(true)}
                                        disabled={eligibleCandidates.length === 0}
                                        title={eligibleCandidates.length === 0 ? "No completed candidates match active filters" : `Deploy certificates to ${eligibleCandidates.length} completed candidate(s) matching active filters`}
                                        className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-xl px-4 py-2 ${
                                            eligibleCandidates.length > 0
                                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md active:scale-95'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        <Award size={14} />
                                        Deploy Certificate
                                        {eligibleCandidates.length > 0 && (
                                            <span className="bg-white/20 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
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
                                                     {isCertificationTest && <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Eligibility</th>}
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
                                                         {isCertificationTest && (
                                                             <td className="px-4 py-4">
                                                                 {candidate.status === 'Completed' ? (
                                                                     (candidate.total_score ?? 0) >= globalThreshold ? (
                                                                         <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Eligible
                                                                         </span>
                                                                     ) : (
                                                                         <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-50 text-red-600 border border-red-100">
                                                                             <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Not Eligible
                                                                         </span>
                                                                     )
                                                                 ) : (
                                                                     <span className="text-[10px] font-bold text-gray-300">--</span>
                                                                 )}
                                                             </td>
                                                         )}
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

        {/* ── Deploy Certificate Confirmation Modal ── */}
        <AnimatePresence>
        {showDeployModal && (
            <motion.div
                key="deploy-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
                onClick={() => setShowDeployModal(false)}
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
                            <Award size={22} />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Deploy Certificates</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {eligibleCandidates.length} candidate(s) · matching active filters
                            </p>
                        </div>
                        <button onClick={() => setShowDeployModal(false)} className="ml-auto p-1.5 text-gray-300 hover:text-gray-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Recipients</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {eligibleCandidates.map((c, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-black text-gray-800">{c.name}</p>
                                        <p className="text-[9px] font-bold text-gray-400">{c.email}</p>
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-700">{c.total_score} pts</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 mb-6">
                        <p className="text-[9px] font-bold text-gray-500">
                            Certificates will be emailed to all eligible candidates with their score and a unique certificate ID.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setShowDeployModal(false)}
                            className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={handleDeployCertificates}
                            disabled={deployingCerts}
                            className="flex-1 py-3 bg-emerald-600 text-white text-sm font-black rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {deployingCerts ? 'Sending...' : <><Award size={15} /> Send Certificates</>}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
        </AnimatePresence>

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
        {/* Hidden Container for Bulk Certificate Generation */}
        {bulkDeployCandidate && (
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <div 
                    ref={bulkCertRef} 
                    className="w-full max-w-[760px] aspect-[1.414/1] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-[1px] border-slate-200 p-12 flex flex-col items-center justify-between relative overflow-hidden text-left"
                    style={{ minHeight: '537px', width: '760px', height: '537px' }}
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
                        {certConfig?.title || certConfig?.certificateTitle || "Certificate of Achievement"}
                      </h2>
                    </div>

                    {/* Recipient Section */}
                    <div className="z-10 flex flex-col items-center text-center px-12 mb-4 w-full">
                      <p className="text-[9px] text-slate-400 uppercase tracking-[0.3em] font-bold mb-2">This acknowledges that</p>
                      <h3 className="text-3xl font-serif italic text-slate-900 mb-2">{bulkDeployCandidate.name}</h3>
                      <div className="w-32 h-px bg-slate-200 mb-3" />
                      <p className="text-[9px] text-slate-400 uppercase tracking-[0.15em] font-bold leading-tight max-w-[440px]">
                        has demonstrated exceptional proficiency and successfully met all requirements for the certification in
                      </p>
                    </div>

                    {/* Track Section */}
                    <div className="z-10 mb-4 text-center w-full">
                      <p className="text-[11px] font-bold text-slate-800 uppercase tracking-[0.2em]">
                        {certConfig?.track_name || certConfig?.trackName || testData?.test_title || 'Technical Specialization'}
                      </p>
                    </div>

                    {/* Dynamic Performance Metrics */}
                    <div className="z-10 flex gap-8 mb-12 items-center justify-center w-full">
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Overall Score</span>
                        <span className="text-sm font-black text-slate-800">{bulkDeployCandidate.total_score ?? 0}%</span>
                      </div>
                      <div className="w-px h-6 bg-slate-200" />
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Grade</span>
                        <span className="text-sm font-black text-blue-600">
                          {(bulkDeployCandidate.total_score ?? 0) >= 90 ? 'DISTINCTION' : (bulkDeployCandidate.total_score ?? 0) >= 75 ? 'EXCELLENT' : 'PASS'}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-slate-200" />
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Verification ID</span>
                        <span className="text-[8px] font-mono text-slate-500">{`CERT-${testData?.test_id?.slice(-6).toUpperCase()}-${bulkDeployCandidate.reg_no || bulkDeployCandidate.email.split('@')[0]}`}</span>
                      </div>
                    </div>

                    {/* Footer Section */}
                    <div className="absolute bottom-10 left-0 right-0 px-16 flex justify-between items-end w-full">
                      <div className="flex flex-col items-center">
                        <div className="w-28 h-px bg-slate-300 mb-2" />
                        <p className="text-[8px] font-black text-slate-800 uppercase tracking-widest">{certConfig?.issuer || "Virtusa Authority"}</p>
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
            </div>
        )}
        </>
    );
};

export default AssessmentDetails;
