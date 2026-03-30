/**
 * CandidateGrid.tsx — Candidate Video Grid Component
 *
 * Displays all assigned candidates in a responsive 2-column grid.
 * Each card contains:
 *   - AgoraVideoPlayer in 'grid' layout with live camera feeds
 *   - "Live" badge when candidate's camera is active
 *   - Candidate name & ID footer
 *   - Flag button (red if violations exist) → opens FlagDetailsOverlay
 *
 * Interactions:
 *   - Single click on a card → selects candidate for direct chat
 *   - Double click on a card → triggers onCandidateDoubleClick (opens fullscreen view)
 *
 * Props:
 *   viewMode              — 'front' | 'side' | 'both' — passed through to AgoraVideoPlayer
 *   onCandidateDoubleClick — Callback with candidate ID to open fullscreen overlay
 */
import { useState } from 'react';
import { useProctorStore, Candidate } from '../store/proctorStore';
import { Shield, Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import AgoraVideoPlayer from './AgoraVideoPlayer';
import FlagDetailsOverlay from './FlagDetailsOverlay';

interface CandidateGridProps {
    viewMode: 'front' | 'side' | 'both';
    onCandidateDoubleClick: (id: string) => void;
}

export default function CandidateGrid({ viewMode, onCandidateDoubleClick }: CandidateGridProps) {
    const { candidates, setSelectedCandidateId, assessmentId } = useProctorStore();
    const [flagOverlayCandidate, setFlagOverlayCandidate] = useState<Candidate | null>(null);

    if (candidates.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-brand transition-colors duration-500">
                <div className="w-20 h-20 bg-surface rounded-md flex items-center justify-center mb-6 border border-border-subtle">
                    <Shield className="w-8 h-8 text-text-secondary" />
                </div>
                <h3 className="text-xl font-black text-text-primary uppercase tracking-tight mb-2">No Candidates Assigned</h3>
                <p className="text-text-secondary text-sm max-w-[300px] font-medium">Please wait for the administrator to assign candidates to your session.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8 max-w-[1600px] mx-auto relative">
            {candidates.map((candidate, idx) => (
                <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-surface rounded-lg border border-border-subtle overflow-hidden group hover:border-accent-main/30 shadow-2xl transition-all relative"
                >
                    <div
                        onClick={() => setSelectedCandidateId(candidate.id)}
                        onDoubleClick={() => onCandidateDoubleClick(candidate.id)}
                        className="flex-1 bg-brand relative overflow-hidden group-hover:bg-brand/80 transition-colors aspect-video cursor-pointer"
                    >
                        <AgoraVideoPlayer
                            assessmentId={assessmentId}
                            candidateId={candidate.id}
                            layout="grid"
                            viewMode={viewMode}
                        />

                        {/* Status Overlays */}
                        <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between z-10">
                            {candidate.cameraOn && (
                                <div className="px-3 py-1.5 bg-status-active/10 backdrop-blur-md border border-status-active/20 rounded-md flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="w-1.5 h-1.5 rounded-sm bg-status-active animate-pulse shadow-[0_0_8px_var(--color-status-active)]" />
                                    <span className="text-[9px] font-black text-status-active uppercase tracking-widest">Live</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Candidate Info Footer */}
                    <div className="p-6 flex items-center justify-between font-black">
                        <div>
                            <h3 className="text-sm font-black text-text-primary tracking-tight uppercase group-hover:text-accent-main transition-colors">{candidate.name}</h3>
                            <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest mt-0.5">{candidate.id}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Flag Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFlagOverlayCandidate(candidate);
                                }}
                                className={`p-2.5 rounded-md border transition-all ${candidate.flags.length > 0
                                        ? 'bg-status-offline/10 border-status-offline/30 text-status-offline hover:bg-status-offline/20'
                                        : 'bg-surface border-border-subtle text-text-secondary hover:text-text-primary hover:bg-brand/10'
                                    }`}
                                title="View Flags"
                            >
                                <Flag size={14} fill={candidate.flags.length > 0 ? "currentColor" : "none"} />
                            </button>
                            <div className="px-3 py-1.5 bg-surface rounded-md border border-border-subtle font-black">
                                <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">ID: C-0{idx + 1}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            ))}

            {/* Flag Overlay */}
            {flagOverlayCandidate && (
                <FlagDetailsOverlay
                    candidate={flagOverlayCandidate}
                    onClose={() => setFlagOverlayCandidate(null)}
                />
            )}
        </div>
    );
}
