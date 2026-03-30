/**
 * CandidateFullScreenOverlay.tsx — Full-Screen Candidate View
 *
 * Opens as a modal overlay when the proctor double-clicks a candidate in the grid.
 * Shows the candidate's video feed (via AgoraVideoPlayer in 'focused' layout) along
 * with a header displaying candidate name, ID, and college.
 *
 * Props:
 *   candidate    — Candidate object with name, id, college, cameraOn status
 *   viewMode     — 'front' | 'side' | 'both' — controls which camera feeds are visible
 *   assessmentId — Current assessment session ID (passed to AgoraVideoPlayer)
 *   onClose      — Callback to dismiss the overlay
 */
import { X } from 'lucide-react';
import { Candidate } from '../store/proctorStore';
import AgoraVideoPlayer from './AgoraVideoPlayer';

interface CandidateFullScreenOverlayProps {
    candidate: Candidate;
    viewMode: 'front' | 'side' | 'both';
    assessmentId: string;
    onClose: () => void;
}

export default function CandidateFullScreenOverlay({ 
    candidate, 
    viewMode, 
    assessmentId, 
    onClose 
}: CandidateFullScreenOverlayProps) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-brand/95 backdrop-blur-md animate-in fade-in duration-300">
            {/* Background Close Action */}
            <div className="absolute inset-0" onClick={onClose} />
            
            <div className="w-full h-full max-w-7xl flex flex-col gap-6 relative z-10 animate-in zoom-in-95 duration-300">
                {/* Header Overlay */}
                <div className="flex items-center justify-between bg-surface/50 backdrop-blur-xl border border-border-subtle p-6 rounded-lg shadow-2xl">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-accent-main rounded-md flex items-center justify-center font-black text-white text-xl shadow-lg shadow-accent-main/20">
                            {candidate.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight">{candidate.name}</h2>
                            <div className="flex items-center gap-3 mt-1 text-text-secondary">
                                <span className="text-xs font-bold uppercase tracking-widest bg-brand px-2 py-0.5 rounded-md border border-border-subtle">ID: {candidate.id}</span>
                                <span className="text-xs font-bold uppercase tracking-widest bg-brand px-2 py-0.5 rounded-md border border-border-subtle">{candidate.college}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-12 h-12 bg-surface hover:bg-brand rounded-md flex items-center justify-center text-text-secondary hover:text-text-primary transition-all hover:rotate-90 shadow-xl border border-border-subtle"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Video Container */}
                <div className="flex-1 bg-brand/50 rounded-lg border border-border-subtle overflow-hidden shadow-2xl relative group">
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                        <AgoraVideoPlayer 
                            assessmentId={assessmentId} 
                            candidateId={candidate.id} 
                            layout="focused" 
                            viewMode={viewMode}
                            showLabels={true}
                        />
                    </div>
                    
                    {/* Status Badge */}
                    <div className="absolute bottom-8 left-8 flex items-center gap-3 px-4 py-2 bg-surface/80 backdrop-blur-xl border border-border-subtle rounded-md shadow-2xl">
                        <div className={`w-3 h-3 rounded-sm ${candidate.cameraOn ? 'bg-status-active shadow-[0_0_12px_var(--color-status-active)]' : 'bg-text-secondary'} animate-pulse`} />
                        <span className="text-xs font-black text-text-primary uppercase tracking-widest">
                            {candidate.cameraOn ? 'Live Stream Active' : 'Camera Offline'}
                        </span>
                    </div>
                </div>

                {/* Keyboard Hint */}
                <div className="text-center">
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Click outside or use the close button to exit full view</p>
                </div>
            </div>
        </div>
    );
}
