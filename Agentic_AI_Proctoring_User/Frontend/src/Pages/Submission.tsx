import React, { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAgoraProctoring } from '../Components/AgoraProctoringWrapper';


const Submission: React.FC = () => {


    const { cleanup } = useAgoraProctoring();
    const Mobile_Fetcher = async () => {
        try {
            const assessment_id = localStorage.getItem('assessment_id');
            const email = localStorage.getItem('candidate_email');
            if (assessment_id && email) {

                const dataval = {
                    assessment_id: assessment_id,
                    email: email
                }
                const response = await fetch('http://localhost:8002/mobile/score', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataval)
                });
                const data = await response.json();
                console.log(data);
            }
        } catch (error) {
            console.log(error);
        }
    }
    const fetcher = async () => {
        try {
            const assessment_id = localStorage.getItem('assessment_id');
            const email = localStorage.getItem('candidate_email');
            if (assessment_id && email) {
                const response = await fetch('http://127.0.0.1:8001/webcam/score/store', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ assessment_id, email })
                });
                const data = await response.json();
                console.log(data);
            }
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        // Clear session markers so the flow can be restarted fresh if needed
        sessionStorage.removeItem('system_check_passed');
        localStorage.setItem('assessment_completed', 'true');
        localStorage.removeItem('assessment_started');
        // cleanup(); // MOVED TO BUTTON CLICK AS PER USER REQUIREMENT
        localStorage.removeItem('gaming_completed');
        localStorage.removeItem('mcq_completed');
        localStorage.removeItem('coding_completed');
        localStorage.removeItem('sql_completed');

        // Signal mobile to cleanup
        const socket = io('http://localhost:8000');
        const assessment_id = localStorage.getItem('assessment_id');
        const email = localStorage.getItem('candidate_email');
        if (assessment_id && email) {
            socket.emit('test_ended', { assessment_id, email });
        }
    }, []);

    const [enabledSections, setEnabledSections] = React.useState<any[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('enabled_sections');
        if (saved) {
            setEnabledSections(JSON.parse(saved));
        }
    }, []);

    const sections = enabledSections.length > 0 ? enabledSections : [
        { label: 'Game Assessments', color: '#f97316' },
        { label: 'Multiple Choice Questions', color: '#6366f1' },
        { label: 'Coding Challenges', color: '#3b82f6' },
        { label: 'SQL Database', color: '#10b981' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 px-6 py-2.5 flex items-center">
                <img src="/virtusa-logo.svg" alt="Virtusa" className="h-7 w-auto" />
            </header>

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-xl border-gray-100 transition-all hover:shadow-2xl">
                   
                    {/* Success Circle (Empty) */}
                    <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-100" />

                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-blue-600 mb-2">
                        Assessment Complete
                    </p>
                    <h1 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
                        All Done!
                    </h1>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed text-center">
                        Your assessment has been submitted successfully. Our team will review your results and get back to you shortly.
                    </p>

                    {/* Section checklist */}
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 mb-8 text-left">
                        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-5">
                            Sections Completed
                        </p>
                        <div className="space-y-4">
                            {sections.map(s => (
                                <div key={s.label} className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-xs flex-shrink-0">
                                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700">{s.label}</span>
                                    <div className="ml-auto flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Completed</span>
                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-[11px] text-gray-400 flex items-center justify-center gap-2 mb-8 italic text-center">
                        All responses are encrypted and securely stored
                    </p>

                    <button
                        onClick={async () => {
                            console.log("Submission: Exit button clicked. Prioritizing UI response...");

                            try {
                                if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
                                    if (document.exitFullscreen) {
                                        await document.exitFullscreen();
                                    } else if ((document as any).webkitExitFullscreen) {
                                        await (document as any).webkitExitFullscreen();
                                    }
                                }
                            } catch (e) {
                                console.warn("Fast fullscreen exit failed, trying again later:", e);
                            }

                            const performCleanup = async () => {
                                try {
                                    console.log("Submission: Background cleanup starting...");
                                   
                                    await cleanup();

                                    const a_id = localStorage.getItem("assessment_id")?.toString().trim().toLowerCase();
                                    const email = localStorage.getItem("candidate_email")?.toString().trim().toLowerCase();

                                    if (a_id && email) {
                                        fetch("http://localhost:8001/stop", { method: "POST" }).catch(() => {});
                                        fetch("http://localhost:8002/stop", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ assessment_id: a_id, email_id: email })
                                        }).catch(() => {});
                                    }
                                   
                                    setTimeout(() => {
                                        console.log("Submission: Final reload to ensure camera off");
                                        window.location.reload();
                                    }, 1000);
                                   
                                } catch (err) {
                                    console.error("Background cleanup failed:", err);
                                }
                            };

                            Mobile_Fetcher();
                            fetcher();
                            performCleanup();
                        }}
                        className="w-full py-4 bg-gray-900 text-white text-sm font-bold rounded-2xl hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200 cursor-pointer"
                    >
                        Exit Fullscreen
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Submission;
