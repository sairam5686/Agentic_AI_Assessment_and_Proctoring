/**
 * Login.tsx — Proctor Login Page
 *
 * Renders a login form for the proctor with two fields:
 *   1. Assessment ID — identifies the exam session
 *   2. Secure Passkey — 8-character auth passkey (auto-uppercased & trimmed)
 *
 * On submit, calls the Zustand store's login() action which hits:
 *   API: POST /proctor/login (FormData: assessment_id, passkey)
 *
 * On success → navigates to /dashboard.
 * On failure → displays an error banner.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { useProctorStore } from '../store/proctorStore';
import VirtusaWordmark from '../Components/VirtusaWordmark';

export default function Login() {
    const [assessmentId, setAssessmentId] = useState('');
    const [passkey, setPasskey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const login = useProctorStore((state) => state.login);

    /**
     * Form submit handler.
     * Calls store.login(assessmentId, passkey) and navigates on success.
     * @param e — React form event (prevented default to avoid page reload)
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const success = await login(assessmentId, passkey);
        if (success) {
            navigate('/dashboard');
        } else {
            setError('Invalid Assessment ID or Passkey. Please check your credentials and try again.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen w-full bg-brand flex flex-col items-center justify-center p-6 font-sans relative">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-[440px] flex flex-col items-center"
            >
                {/* Brand Logo & Name */}
                <div className="mb-12 flex items-center gap-4">
                    <div className="w-20 h-20 bg-surface rounded-md flex items-center justify-center shadow-2xl border border-border-subtle overflow-hidden">
                        <img 
                            src="https://pbs.twimg.com/profile_images/1973372506271584256/Sb4wfgD0_400x400.jpg" 
                            alt="Virtusa" 
                            className="w-14 h-14 object-contain"
                        />
                    </div>
                    <VirtusaWordmark height={40} className="mt-1" />
                </div>

                {/* Login Card */}
                <div className="w-full bg-surface rounded-lg shadow-2xl border border-border-subtle p-12">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-2">Proctor Login</h1>
                        <p className="text-text-secondary text-[13px] font-medium">Enter your credentials to start monitoring</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 bg-status-offline/10 border border-status-offline/20 rounded-md flex items-start gap-3"
                            >
                                <AlertCircle className="text-status-offline shrink-0" size={18} />
                                <p className="text-status-offline text-xs font-bold leading-relaxed">{error}</p>
                            </motion.div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest ml-1">Assessment ID</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    required
                                    value={assessmentId}
                                    onChange={(e) => setAssessmentId(e.target.value)}
                                    placeholder="Enter Assessment ID"
                                    className="w-full bg-brand/50 border border-border-subtle focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/5 rounded-md py-4 px-6 text-text-primary text-sm font-bold outline-none transition-all placeholder:text-text-secondary/50"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest ml-1">Secure Passkey</label>
                            <div className="relative group">
                                <input
                                    type="password"
                                    required
                                    value={passkey}
                                    onChange={(e) => setPasskey(e.target.value.toUpperCase().trim())}
                                    placeholder="8-character passkey"
                                    className="w-full bg-brand/50 border border-border-subtle focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/5 rounded-md py-4 px-6 text-text-primary text-sm font-bold outline-none transition-all placeholder:text-text-secondary/50 uppercase"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-accent hover:bg-accent/80 text-white py-5 rounded-md text-[12px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                        >
                            {loading ? 'Verifying...' : (
                                <>
                                    Launch Assessment
                                    <ChevronRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-border-subtle text-center">
                        <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest leading-relaxed">
                            Secure browser environment will be<br/>
                            initialized upon login.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
