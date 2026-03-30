import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { io } from 'socket.io-client';

const MobileConnect: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { assessment_id, email } = (location.state as any) || {
        assessment_id: localStorage.getItem('assessment_id'),
        email: localStorage.getItem('candidate_email')
    };

    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [isExpired, setIsExpired] = useState(false);
    const [isMobileConnected, setIsMobileConnected] = useState(false);
    const [serverIp, setServerIp] = useState<string>('');
    const socketRef = useRef<any>(null);

    useEffect(() => {
        if (!assessment_id || !email) return;
        const room = `${assessment_id.toString().trim().toLowerCase()}_${email.toString().trim().toLowerCase()}`;

        // Connect to Socket.io
        socketRef.current = io('http://localhost:8000');
        
        socketRef.current.on('connect', () => {
            const joinData = { 
                assessment_id: assessment_id?.toString().trim().toLowerCase(), 
                email: email?.toString().trim().toLowerCase() 
            };
            console.log("Laptop connecting to room:", joinData);
            socketRef.current.emit('join_room', joinData);
        });

        socketRef.current.on('mobile_connected', (data: any) => {
            if (data.status === 'active') {
                console.log("Socket signal: Mobile active");
                setIsMobileConnected(true);
            }
        });

        // Polling fallback every 2 seconds for high reliability
        const pollInterval = setInterval(async () => {
            if (isMobileConnected) return; // Stop polling if already connected
            try {
                const res = await fetch(`http://localhost:8000/api/mobile/status/${room}`);
                const data = await res.json();
                if (data.status === 'active') {
                    console.log("Polling signal: Mobile active");
                    setIsMobileConnected(true);
                }
            } catch (err) {
                console.error("Status poll failed:", err);
            }
        }, 2000);

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            clearInterval(pollInterval);
        };
    }, [assessment_id, email, isMobileConnected]);

    useEffect(() => {
        // Fetch the actual server IP from backend so QR works even on localhost
        fetch("http://localhost:8000/api/get-server-ip")
            .then(res => res.json())
            .then(data => setServerIp(data.ip))
            .catch(err => console.error("Failed to fetch server IP:", err));
    }, []);

    useEffect(() => {
        if (timeLeft <= 0) {
            setIsExpired(true);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleRetry = () => {
        setTimeLeft(300);
        setIsExpired(false);
    };

    const handleBeginAssessment = () => {
        // Signal both laptop and mobile to start streaming simultaneously
        if (socketRef.current) {
            const syncData = { 
                assessment_id: assessment_id?.toString().trim().toLowerCase(), 
                email: email?.toString().trim().toLowerCase() 
            };
            socketRef.current.emit('start_assessment', syncData);
        }

        localStorage.setItem('assessment_started', 'true');
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col items-center justify-center py-12">
            {/* Top nav */}
            <div className="fixed top-0 left-0 right-0 h-[54px] bg-white border-b border-slate-200 flex items-center px-8 gap-3 z-50 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <img src="/virtusa-logo.svg" alt="Virtusa" className="h-8 block" />
            </div>

            <div className="w-full max-w-4xl flex gap-8 mt-8">
                {/* Left Side: QR Code */}
                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 mb-6">Scan with Third Eye App</h2>
                    
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 mb-6 min-h-[280px] flex items-center justify-center">
                        {!isExpired ? (
                            serverIp ? (
                                <QRCode 
                                    value={JSON.stringify({ 
                                        assessment_id, 
                                        email, 
                                        candidate_id: localStorage.getItem('candidate_id'),
                                        server_ip: serverIp 
                                    })} 
                                    size={220}
                                    level="H"
                                />
                            ) : (
                                <div className="animate-pulse flex flex-col items-center">
                                    <div className="w-16 h-16 bg-slate-200 rounded-lg mb-3"></div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fetching Server IP...</p>
                                </div>
                            )
                        ) : (
                            <div className="w-[220px] h-[220px] flex flex-col items-center justify-center text-slate-400">
                                <span className="text-4xl mb-2">⏱️</span>
                                <p className="text-sm font-medium">Session Expired</p>
                            </div>
                        )}
                    </div>

                    <div className="text-center">
                        {!isExpired ? (
                            <>
                                <p className="text-2xl font-black text-slate-900 mb-0.5">{formatTime(timeLeft)}</p>
                                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Remaining Time</p>
                            </>
                        ) : (
                            <button 
                                onClick={handleRetry}
                                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md"
                            >
                                Retry Session
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Side: Instructions */}
                <div className="w-[360px] flex flex-col gap-6">
                    <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-7 flex-1">
                        <h3 className="text-base font-bold mb-5 border-b border-white/10 pb-3">Instructions</h3>
                        <div className="space-y-5">
                            <div className="flex gap-4">
                                <span className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                                <p className="text-[13px] text-white/70 leading-relaxed">Open the Third Eye app on your mobile device.</p>
                            </div>
                            <div className="flex gap-4">
                                <span className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                                <p className="text-[13px] text-white/70 leading-relaxed">Grant camera and microphone permissions when prompted.</p>
                            </div>
                            <div className="flex gap-4">
                                <span className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                                <p className="text-[13px] text-white/70 leading-relaxed">Enable Do Not Disturb (DND) mode to avoid interruptions during the assessment.</p>
                            </div>
                            <div className="flex gap-4">
                                <span className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">4</span>
                                <p className="text-[13px] text-white/70 leading-relaxed">Scan the QR code on the left to activate secondary proctoring.</p>
                            </div>
                            <div className="flex gap-4">
                                <span className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-bold shrink-0">5</span>
                                <p className="text-[13px] text-white/70 leading-relaxed">Keep your phone in **Landscape** view and ensure your face is clearly visible.</p>
                            </div>
                        </div>
                    </div>

                    {/* Status / Proceed Button */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-2.5 h-2.5 rounded-full ${isMobileConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-slate-300 animate-pulse'}`}></div>
                            <span className="text-[13px] font-bold text-slate-700">
                                {isMobileConnected ? 'Mobile Connected' : 'Waiting for connection...'}
                            </span>
                        </div>
                        <button 
                            disabled={!isMobileConnected}
                            onClick={handleBeginAssessment}
                            className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                                isMobileConnected 
                                ? 'bg-slate-900 text-white hover:bg-black hover:-translate-y-1 shadow-lg' 
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
                            }`}
                        >
                            Begin Assessment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileConnect;
