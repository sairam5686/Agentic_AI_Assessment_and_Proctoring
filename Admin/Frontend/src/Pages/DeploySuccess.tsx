import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router';
import {
    CheckCircle2,
    Layout,
    Loader2,
    Globe,
    Mail,
    ArrowRight,
    X
} from 'lucide-react';

const DeploySuccess = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const assessmentId = location.state?.assessmentId;

    const [status, setStatus] = useState<'deploying' | 'success' | 'error'>('deploying');
    const [message, setMessage] = useState('Initiating deployment protocol...');

    useEffect(() => {
        if (!assessmentId) {
            setStatus('error');
            setMessage('Assessment ID not found.');
            return;
        }

        const deploy = async () => {
            try {
                const formData = new FormData();
                formData.append('assessment_id', assessmentId);

                const response = await fetch('http://localhost:8000/initiate-test', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error('Deployment failed');

                // Delay for 6 seconds to show progress but stay within 5-10s limit
                setTimeout(() => setStatus('success'), 6000);
            } catch (err) {
                setStatus('error');
                setMessage('Error during deployment. Please check backend logs.');
            }
        };

        deploy();
    }, [assessmentId]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-2xl relative z-10">
                <AnimatePresence mode="wait">
                    {status === 'deploying' && (
                        <motion.div
                            key="deploying"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="text-center space-y-8"
                        >
                            <div className="relative inline-block">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                    className="w-32 h-32 rounded-full border-4 border-dashed border-blue-500/30 flex items-center justify-center"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="w-20 h-20 bg-blue-600 rounded-3xl shadow-xl shadow-blue-500/40 flex items-center justify-center"
                                    >
                                        <Loader2 className="w-10 h-10 text-white animate-spin" />
                                    </motion.div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Deploying Assessment</h2>
                                <p className="text-slate-500 font-medium max-w-md mx-auto">
                                    Our systems are broadcasting the assessment and notifying registered candidates via secure SMTP links.
                                </p>
                            </div>

                            <div className="flex justify-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '200ms' }} />
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '400ms' }} />
                            </div>
                        </motion.div>
                    )}

                    {status === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white overflow-hidden"
                        >
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-12 text-center relative">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                                    className="w-24 h-24 bg-white rounded-full mx-auto flex items-center justify-center shadow-2xl"
                                >
                                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                                </motion.div>
                                <h2 className="text-4xl font-black text-white mt-8 tracking-tight">Deployment Complete</h2>
                                <p className="text-emerald-50 font-medium mt-2">All protocols successfully initialized</p>
                            </div>

                            <div className="p-12 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex items-start gap-4">
                                        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                                            <Globe size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">Assessment Live</h4>
                                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">The test is now accessible and active for candidates.</p>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex items-start gap-4">
                                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                                            <Mail size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">Mails Sent</h4>
                                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">Invitations sent with personalized secure links.</p>
                                        </div>
                                    </div>
                                </div>

                                <motion.button
                                    onClick={() => navigate('/assessment-details')}
                                    whileHover={{ scale: 1.02, x: 5 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black tracking-wide shadow-xl flex items-center justify-center gap-3 group transition-all"
                                >
                                    <Layout size={20} />
                                    <span>View Assessment Details</span>
                                    <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white rounded-[3rem] p-12 shadow-2xl text-center space-y-6 border border-red-100"
                        >
                            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full mx-auto flex items-center justify-center">
                                <X size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900">{message}</h2>
                            <button
                                onClick={() => navigate('/start-test', { state: { assessmentId } })}
                                className="px-8 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors"
                            >
                                Retry Deployment
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default DeploySuccess;
