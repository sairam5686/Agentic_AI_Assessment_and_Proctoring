/**
 * FlagDetailsOverlay.tsx — Violation Evidence Viewer
 *
 * A modal overlay that displays all flagged violations for a specific candidate.
 * Layout: two-column split — Webcam evidence (left) vs Mobile evidence (right).
 *
 * Each violation card shows:
 *   - Color-coded violation type badge (e.g. Illegal Object, Head Turned, Drowsy, etc.)
 *   - Timestamp of the violation
 *   - Evidence snapshot image (clickable → opens full-size in new tab)
 *
 * VIOLATION_META maps violation type keys to display labels and color schemes.
 *
 * Props:
 *   candidate — Candidate object containing the flags array
 *   onClose   — Callback to dismiss the overlay (also closes on outside click)
 */
import { useEffect, useRef } from 'react';
import { X, AlertTriangle, Shield, Camera, Smartphone, Eye } from 'lucide-react';
import { Candidate } from '../store/proctorStore';

interface FlagDetailsOverlayProps {
    candidate: Candidate;
    onClose: () => void;
}

const VIOLATION_META: Record<string, { label: string; color: string; bg: string; border: string; glow: string }> = {
    illegal_object:   { label: 'Illegal Object',   color: 'text-status-offline',    bg: 'bg-status-offline/10',    border: 'border-status-offline/20', glow: 'shadow-status-offline/20' },
    low_attention:    { label: 'Low Attention',    color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20', glow: 'shadow-amber-500/20' },
    head_turned:      { label: 'Head Turned',      color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', glow: 'shadow-orange-500/20' },
    drowsy:           { label: 'Drowsy',           color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', glow: 'shadow-purple-500/20' },
    face_not_visible: { label: 'Face Not Visible', color: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20', glow: 'shadow-blue-500/20' },
    multiple_people:  { label: 'Multiple People',  color: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-500/20', glow: 'shadow-red-500/20' },
    talking:          { label: 'Talking',          color: 'text-pink-500',   bg: 'bg-pink-500/10',   border: 'border-pink-500/20', glow: 'shadow-pink-500/20' },
};

export default function FlagDetailsOverlay({ candidate, onClose }: FlagDetailsOverlayProps) {
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


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                ref={overlayRef}
                className="w-full max-w-4xl bg-surface rounded-lg border border-border-subtle shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-border-subtle flex items-center justify-between bg-surface/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-accent-main rounded-md flex items-center justify-center font-black text-white text-lg shadow-xl ring-2 ring-accent-main/20">
                            {candidate.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-text-primary uppercase tracking-tight">{candidate.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Shield size={12} className="text-text-secondary" />
                                <span className="text-[9px] font-black text-text-secondary uppercase tracking-[0.2em] leading-none">Evidence Log</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-brand rounded-md transition-colors text-text-secondary hover:text-text-primary"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Unified Scrolling Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-brand/50 min-h-0">
                    <div className="grid grid-cols-2 w-full divide-x divide-border-subtle/50 min-h-full">
                        {/* ── Webcam Column ── */}
                        <div className="flex flex-col">
                            <div className="sticky top-0 z-20 px-6 py-4 bg-surface/95 backdrop-blur-md border-b border-border-subtle flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Camera size={14} className="text-text-secondary" />
                                    <h4 className="text-[10px] font-black text-text-primary uppercase tracking-widest">Webcam Evidence</h4>
                                </div>
                                <span className="px-2 py-0.5 bg-brand text-[9px] font-black text-text-secondary rounded-md border border-border-subtle">
                                    {candidate.flags.filter(f => f.webcam_url).length}
                                </span>
                            </div>
                            <div className="p-6 space-y-6">
                                {candidate.flags.filter(f => f.webcam_url).length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale scale-75">
                                        <Camera size={32} className="mb-2" />
                                        <p className="text-[8px] font-black uppercase tracking-widest">No Webcam Data</p>
                                    </div>
                                ) : (
                                    candidate.flags.filter(f => f.webcam_url).map((flag, idx) => {
                                        const meta = VIOLATION_META[flag.type] || { label: flag.type, color: 'text-text-primary', bg: 'bg-surface', border: 'border-border-subtle', glow: '' };
                                        return (
                                            <div key={`m-${idx}`} className="bg-surface rounded-lg border border-border-subtle shadow-lg overflow-hidden group hover:border-accent-main/30 transition-all">
                                                <div className="px-4 py-3 flex items-center justify-between border-b border-border-subtle bg-brand/30">
                                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${meta.bg} ${meta.color} ${meta.border}`}>
                                                        {meta.label}
                                                    </span>
                                                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest font-mono opacity-60">
                                                        {flag.timestamp.split(',').pop()?.trim() || flag.timestamp}
                                                    </span>
                                                </div>
                                                <div className="relative aspect-video group/img cursor-pointer" onClick={() => window.open(flag.webcam_url, '_blank')}>
                                                    <img src={flag.webcam_url} alt={meta.label} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Eye size={16} className="text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* ── Mobile Column ── */}
                        <div className="flex flex-col border-l border-border-subtle/50">
                            <div className="sticky top-0 z-20 px-6 py-4 bg-surface/95 backdrop-blur-md border-b border-border-subtle flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Smartphone size={14} className="text-text-secondary" />
                                    <h4 className="text-[10px] font-black text-text-primary uppercase tracking-widest">Mobile Evidence</h4>
                                </div>
                                <span className="px-2 py-0.5 bg-brand text-[9px] font-black text-text-secondary rounded-none border border-border-subtle">
                                    {candidate.flags.filter(f => f.mobile_url).length}
                                </span>
                            </div>
                            <div className="p-6 space-y-6">
                                {candidate.flags.filter(f => f.mobile_url).length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale scale-75">
                                        <Smartphone size={32} className="mb-2" />
                                        <p className="text-[8px] font-black uppercase tracking-widest">No Mobile Data</p>
                                    </div>
                                ) : (
                                    candidate.flags.filter(f => f.mobile_url).map((flag, idx) => {
                                        const meta = VIOLATION_META[flag.type] || { label: flag.type, color: 'text-text-primary', bg: 'bg-surface', border: 'border-border-subtle', glow: '' };
                                        return (
                                            <div key={`m-${idx}`} className="bg-surface rounded-none border border-border-subtle shadow-lg overflow-hidden group hover:border-accent-main/30 transition-all">
                                                <div className="px-4 py-3 flex items-center justify-between border-b border-border-subtle bg-brand/30">
                                                    <span className={`px-2 py-0.5 rounded-none text-[8px] font-black uppercase tracking-widest border ${meta.bg} ${meta.color} ${meta.border}`}>
                                                        {meta.label}
                                                    </span>
                                                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest font-mono opacity-60">
                                                        {flag.timestamp.split(',').pop()?.trim() || flag.timestamp}
                                                    </span>
                                                </div>
                                                <div className="relative aspect-video group/img cursor-pointer" onClick={() => window.open(flag.mobile_url, '_blank')}>
                                                    <img src={flag.mobile_url} alt={meta.label} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Eye size={16} className="text-white" />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 bg-surface border-t border-border-subtle flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={12} className="text-status-offline" />
                        <p className="text-[9px] font-black text-status-offline uppercase tracking-widest">
                            {candidate.flags.length} Critical Violations
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 bg-brand hover:bg-accent-main text-text-primary rounded-md font-black uppercase text-[10px] tracking-widest border border-border-subtle transition-all active:scale-[0.98] shadow-lg"
                    >
                        Dismiss Analysis
                    </button>
                </div>
            </div>
        </div>
    );
}
