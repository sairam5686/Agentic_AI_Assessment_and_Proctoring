import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import {
    Download,
    Users2,
    Search,
    ChevronRight,
    UserPlus,
    ShieldCheck,
    Mail,
    Trash2
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
                            <button className="flex items-center gap-2 text-indigo-600 text-[11px] font-black uppercase tracking-widest pb-4 hover:opacity-70 transition-opacity">
                                <Download size={14} />
                                Download
                            </button>
                        </div>

                        {/* Candidates Tab Content */}
                        {activeTab === 'candidates' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[20px] font-black text-[#1e293b] uppercase tracking-tight">Enrolled Candidates</h3>
                                    <div className="relative w-72">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search candidates..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm shadow-sm"
                                        />
                                    </div>
                                </div>

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
                                                     <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                                                 </tr>
                                             </thead>
                                             <tbody className="divide-y divide-gray-50">
                                                 {candidates.filter(c =>
                                                     c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                     c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                     c.reg_no.toLowerCase().includes(searchTerm.toLowerCase())
                                                 ).map((candidate, idx) => (
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
    );
};

export default AssessmentDetails;
