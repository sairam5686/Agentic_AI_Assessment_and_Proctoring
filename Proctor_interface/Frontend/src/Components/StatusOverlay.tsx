/**
 * StatusOverlay.tsx — Candidate Status List Modal
 *
 * A modal overlay that shows a scrollable list of candidates filtered by status.
 * Opened when the proctor clicks one of the stats buttons in the Session Overview bar.
 *
 * Status types and their meanings:
 *   'active'      → Candidates online with camera enabled (green indicator)
 *   'offline'     → Candidates who joined but camera is off (red indicator)
 *   'joined'      → All candidates who have joined the session
 *   'yet_to_join' → Candidates who haven't joined yet
 *
 * Props:
 *   title      — Display title for the overlay header
 *   candidates — Filtered list of Candidate objects to display
 *   type       — Status category (determines the icon and indicator color)
 *   onClose    — Callback to dismiss the overlay (also closes on outside click)
 */
import { useEffect, useRef } from 'react';
import { X, User, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Candidate } from '../store/proctorStore';

interface StatusOverlayProps {
    title: string;
    candidates: Candidate[];
    onClose: () => void;
    type: 'active' | 'offline' | 'joined' | 'yet_to_join';
}

export default function StatusOverlay({ title, candidates, onClose, type }: StatusOverlayProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const getIcon = () => {
        switch (type) {
            case 'active': return <CheckCircle size={18} className="text-status-active" />;
            case 'offline': return <AlertCircle size={18} className="text-status-offline" />;
            case 'joined': return <User size={18} className="text-accent-main" />;
            case 'yet_to_join': return <Clock size={18} className="text-status-warning" />;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                ref={overlayRef}
                className="w-full max-w-lg bg-surface rounded-lg border border-border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-border-subtle flex items-center justify-between bg-surface">
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">{title}</h3>
                        <span className="px-2.5 py-0.5 rounded-md bg-brand border border-border-subtle text-[10px] font-black text-text-secondary shadow-sm">
                            {candidates.length}
                        </span>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-brand border border-transparent hover:border-border-subtle rounded-md transition-colors text-text-secondary hover:text-text-primary shadow-sm hover:shadow-md"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {candidates.length === 0 ? (
                        <div className="py-20 text-center">
                            <p className="text-text-secondary font-bold uppercase tracking-widest text-[10px]">No candidates in this category</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {candidates.map((c) => (
                                <div 
                                    key={c.id}
                                    className="p-4 bg-brand rounded-lg border border-border-subtle flex items-center justify-between group hover:border-accent-main/30 transition-all shadow-sm"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-text-primary rounded-md flex items-center justify-center font-black text-brand text-sm shadow-lg border border-border-subtle group-hover:scale-110 transition-transform">
                                            {c.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-text-primary uppercase group-hover:text-accent-main transition-colors">
                                                {c.name}
                                            </h4>
                                            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest leading-none mt-1">
                                                ID: {c.id}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-sm ${type === 'active' ? 'bg-status-active shadow-[0_0_8px_var(--color-status-active)]' : 'bg-surface'}`} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-surface border-t border-border-subtle">
                    <button 
                        onClick={onClose}
                        className="w-full py-3 bg-accent-main hover:bg-accent-main/80 text-white rounded-md font-black uppercase text-[10px] tracking-widest shadow-lg shadow-accent-main/20 transition-all active:scale-[0.98]"
                    >
                        Close List
                    </button>
                </div>
            </div>
        </div>
    );
}
