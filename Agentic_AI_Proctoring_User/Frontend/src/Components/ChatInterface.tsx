import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { FiSend, FiMessageCircle, FiX, FiMinimize2, FiVideo } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import ProctorVideoView from './ProctorVideoView';

const ChatInterface: React.FC = () => {
    const { 
        messages, 
        isChatOpen, 
        setChatOpen, 
        sendMessage, 
        unreadCount,
        initRTM,
        logoutRTM
    } = useChatStore();
    
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const assessmentId = localStorage.getItem('assessment_id') || '';

    useEffect(() => {
        initRTM();
        return () => {
            logoutRTM();
        };
    }, [initRTM, logoutRTM]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isChatOpen]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        sendMessage(input);
        setInput('');
    };

    return (
        <>
            {/* Chat Toggle Button */}
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setChatOpen(!isChatOpen)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl z-[10000] cursor-pointer"
            >
                {isChatOpen ? <FiMinimize2 size={24} /> : <FiMessageCircle size={24} />}
                {unreadCount > 0 && !isChatOpen && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0F172A]">
                        {unreadCount}
                    </span>
                )}
            </motion.button>

            {/* Chat Panel */}
            <AnimatePresence>
                {isChatOpen && (
                    <motion.div
                        initial={{ x: 450, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 450, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 w-[420px] h-full bg-[#0F172A]/98 backdrop-blur-2xl border-l border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[9999] flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/40">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                    <FiVideo size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-tight">Proctor Interaction</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Active Session</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setChatOpen(false)}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        {/* Proctor Video Area */}
                        <div className="px-6 py-4 bg-slate-900/20">
                            <ProctorVideoView assessmentId={assessmentId} />
                        </div>

                        {/* Messages Area */}
                        <div className="flex items-center gap-3 px-6 py-2">
                             <div className="h-px flex-1 bg-slate-800" />
                             <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Messages</span>
                             <div className="h-px flex-1 bg-slate-800" />
                        </div>

                        <div 
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scroll-smooth scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
                        >
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center gap-3 text-center opacity-30">
                                    <FiMessageCircle size={40} className="text-slate-600" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No communication yet</p>
                                </div>
                            )}
                            {messages.map((msg) => (
                                <motion.div 
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    key={msg.id} 
                                    className={`flex flex-col ${msg.sender === 'candidate' ? 'items-end' : 'items-start'}`}
                                >
                                    <div className={`max-w-[88%] p-3.5 text-xs font-medium leading-relaxed shadow-xl ${
                                        msg.sender === 'candidate' 
                                            ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                                            : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-2xl rounded-tl-sm'
                                    }`}>
                                        {msg.text}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 px-1 opacity-40">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                            {msg.sender === 'candidate' ? 'You' : 'Proctor'}
                                        </span>
                                        <span className="text-[8px] font-bold text-slate-500">{msg.timestamp}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-6 border-t border-slate-800/50 bg-slate-900/40">
                            <div className="relative group">
                                <input 
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Message proctor..."
                                    className="w-full bg-slate-900/80 border border-slate-800 text-xs text-white px-5 py-4 rounded-2xl outline-none focus:border-indigo-500/50 transition-all pr-14 placeholder:text-slate-600 group-hover:border-slate-700"
                                />
                                <button 
                                    type="submit"
                                    disabled={!input.trim()}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:bg-slate-800 shadow-lg shadow-indigo-500/20"
                                >
                                    <FiSend size={16} />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ChatInterface;
