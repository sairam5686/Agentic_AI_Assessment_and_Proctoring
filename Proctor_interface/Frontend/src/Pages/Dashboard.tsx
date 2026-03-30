/**
 * Dashboard.tsx — Main Proctor Dashboard Page
 *
 * This is the primary view after login. It contains:
 *   - NavBar (top)           — branding, theme switcher, logout
 *   - Session Stats Bar      — total / active / offline / joined / yet-to-join counts (clickable → overlay)
 *   - CandidateGrid          — video grid of all assigned candidates (double-click → fullscreen)
 *   - Right Sidebar          — proctor's own camera preview + RTM chat panel
 *   - StatusOverlay          — modal list of candidates filtered by status category
 *   - CandidateFullScreen    — full-screen single candidate view
 *
 * Key behaviors:
 *   - On mount: starts candidate polling (every 10s) and initializes Agora RTM messaging
 *   - On unmount: stops polling and disconnects RTM
 *   - Applies theme class to <html> element based on store's theme setting
 */
import { useEffect, useState, useRef } from 'react';
import { useProctorStore } from '../store/proctorStore';
import NavBar from '../Components/NavBar';
import CandidateGrid from '../Components/CandidateGrid';
import StatusOverlay from '../Components/StatusOverlay';
import CandidateFullScreenOverlay from '../Components/CandidateFullScreenOverlay';
import {
    UserX,
    Video,
    VideoOff,
    Send,
    UserCheck,
    Clock
} from 'lucide-react';

export default function Dashboard() {
    const {
        isAuthenticated,
        fetchCandidates,
        candidates,
        proctorCameraEnabled,
        toggleProctorCamera,
        messages,
        sendMessage,
        selectedCandidateId,
        setSelectedCandidateId,
        startPolling,
        stopPolling,
        initRTM,
        logoutRTM,
        localVideoTrack,
        rtmStatus,
        rtmError,
        theme
    } = useProctorStore();

    // Effect: Apply/remove theme CSS class on the root <html> element
    useEffect(() => {
        document.documentElement.classList.remove('theme-black', 'theme-white');
        if (theme === 'black') {
            document.documentElement.classList.add('theme-black');
        } else if (theme === 'white') {
            document.documentElement.classList.add('theme-white');
        }
    }, [theme]);

    const [chatInput, setChatInput] = useState('');
    const [viewMode, setViewMode] = useState<'front' | 'side' | 'both'>('both');
    const videoRef = useRef<HTMLDivElement>(null);

    // Overlay state — which status category overlay is currently open
    const [overlayType, setOverlayType] = useState<'active' | 'offline' | 'joined' | 'yet_to_join' | null>(null);
    const [fullScreenCandidateId, setFullScreenCandidateId] = useState<string | null>(null);
    const { assessmentId } = useProctorStore();

    // Effect: Play proctor's own camera track in the self-view panel when available
    useEffect(() => {
        if (localVideoTrack && videoRef.current) {
            localVideoTrack.play(videoRef.current);
        }
        return () => {
            if (localVideoTrack) {
                localVideoTrack.stop();
            }
        };
    }, [localVideoTrack]);

    // Effect: Fetch candidates once on auth
    useEffect(() => {
        if (isAuthenticated) {
            fetchCandidates();
        }
    }, [isAuthenticated, fetchCandidates]);

    /**
     * Chat form submit handler.
     * Sends the message to the selected candidate (or broadcasts if none selected).
     */
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        sendMessage(chatInput, selectedCandidate?.id);
        setChatInput('');
    };

    // Effect: Start candidate polling (every 10s) and RTM connection on auth
    useEffect(() => {
        if (isAuthenticated) {
            startPolling();
            initRTM();
        }
        return () => {
            stopPolling();
            logoutRTM();
        };
    }, [isAuthenticated, startPolling, stopPolling, initRTM, logoutRTM]);

    // Candidate filter groups for the status overlay buttons
    const activeCandidates = candidates.filter(c => c.isOnline);                    // Online + camera on
    const offlineCandidates = candidates.filter(c => !c.isOnline && c.isJoined);    // Joined but camera off
    const joinedCandidates = candidates.filter(c => c.isJoined);                    // All who have joined
    const yetToJoinCandidates = candidates.filter(c => !c.isJoined);                // Haven't joined yet


    if (!isAuthenticated) return null;

    const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

    return (
        <div className="h-screen w-full bg-brand flex flex-col font-sans transition-all duration-500 overflow-hidden text-text-primary">
            <NavBar />

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 border-r border-border-subtle">
                    {/* Top Stats Bar */}
                    <div className="bg-surface border-b border-border-subtle px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <h2 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Session Overview</h2>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-brand/50 rounded-md border border-border-subtle">
                                    <span className="text-[10px] font-bold text-text-secondary uppercase">Total</span>
                                    <span className="text-sm font-black text-text-primary">{candidates.length}</span>
                                </div>

                                {/* Active Button */}
                                <button
                                    onClick={() => setOverlayType('active')}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-status-active/5 hover:bg-status-active/10 rounded-md border border-status-active/20 transition-all group"
                                >
                                    <div className="w-1.5 h-1.5 rounded-sm bg-status-active shadow-[0_0_8px_var(--color-status-active)] group-hover:scale-125 transition-transform" />
                                    <span className="text-[10px] font-bold text-text-secondary uppercase">Active</span>
                                    <span className="text-sm font-black text-status-active">{activeCandidates.length}</span>
                                </button>

                                {/* Offline Button */}
                                <button
                                    onClick={() => setOverlayType('offline')}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-status-offline/5 hover:bg-status-offline/10 rounded-none border border-status-offline/20 transition-all group"
                                >
                                    <UserX size={12} className="text-status-offline group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-bold text-text-secondary uppercase">Offline</span>
                                    <span className="text-sm font-black text-status-offline">{offlineCandidates.length}</span>
                                </button>

                                {/* Joined Button */}
                                <button
                                    onClick={() => setOverlayType('joined')}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-accent-main/5 hover:bg-accent-main/10 rounded-none border border-accent-main/20 transition-all group"
                                >
                                    <UserCheck size={12} className="text-accent-main group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-bold text-text-secondary uppercase">Joined</span>
                                    <span className="text-sm font-black text-accent-main">{joinedCandidates.length}</span>
                                </button>

                                {/* Yet to Join Button */}
                                <button
                                    onClick={() => setOverlayType('yet_to_join')}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-status-warning/5 hover:bg-status-warning/10 rounded-none border border-status-warning/20 transition-all group"
                                >
                                    <Clock size={12} className="text-status-warning group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-bold text-text-secondary uppercase">Yet to Join</span>
                                    <span className="text-sm font-black text-status-warning">{yetToJoinCandidates.length}</span>
                                </button>


                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex bg-brand rounded-md p-1 border border-border-subtle">
                                <button
                                    onClick={() => setViewMode('front')}
                                    className={`px-3 py-1.5 rounded-none text-[10px] font-black uppercase transition-all ${viewMode === 'front' ? 'bg-accent-main text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                    Front
                                </button>
                                <button
                                    onClick={() => setViewMode('side')}
                                    className={`px-3 py-1.5 rounded-none text-[10px] font-black uppercase transition-all ${viewMode === 'side' ? 'bg-accent-main text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                    Side
                                </button>
                                <button
                                    onClick={() => setViewMode('both')}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${viewMode === 'both' ? 'bg-accent-main text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                    Both
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Content Area */}
                    <div className="flex-1 overflow-y-auto p-8 bg-brand text-text-secondary">
                        <CandidateGrid
                            viewMode={viewMode}
                            onCandidateDoubleClick={(id) => setFullScreenCandidateId(id)}
                        />
                    </div>
                </div>

                {/* Right Panel - Chat & Proctor View */}
                <aside className="w-[400px] flex flex-col bg-surface backdrop-blur-xl border-l border-border-subtle">
                    {/* Proctor Self View */}
                    <div className="p-6 border-b border-border-subtle">
                        <div className="aspect-video bg-brand rounded-lg border border-border-subtle overflow-hidden relative group shadow-2xl">
                            <div
                                ref={videoRef}
                                className={`w-full h-full object-cover transition-opacity duration-500 overflow-hidden ${proctorCameraEnabled ? 'opacity-100' : 'opacity-0'}`}
                            />
                            {!proctorCameraEnabled && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                    <div className="w-12 h-12 rounded-md bg-surface/50 flex items-center justify-center text-text-secondary">
                                        <VideoOff size={24} />
                                    </div>
                                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Camera Offline</span>
                                </div>
                            )}
                            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 px-3 py-1 bg-surface/80 backdrop-blur-md rounded-md border border-border-subtle">
                                    <div className={`w-1.5 h-1.5 rounded-sm ${proctorCameraEnabled ? 'bg-emerald-500' : 'bg-text-secondary'}`} />
                                    <span className="text-[9px] font-black text-text-primary uppercase tracking-tight">Proctor View</span>
                                </div>
                                <button
                                    onClick={toggleProctorCamera}
                                    className={`p-2 rounded-md backdrop-blur-md border transition-all ${proctorCameraEnabled ? 'bg-rose-500/20 border-rose-500/50 text-rose-500' : 'bg-accent-main/20 border-accent-main/50 text-accent-main'}`}
                                >
                                    {proctorCameraEnabled ? <VideoOff size={14} /> : <Video size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Chat System */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="p-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-xs font-black text-text-primary uppercase tracking-tight">Communication</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={`w-1 h-1 rounded-sm ${rtmStatus === 'connected' ? 'bg-status-active shadow-[0_0_8px_var(--color-status-active)]' :
                                            rtmStatus === 'connecting' ? 'bg-status-warning animate-pulse' :
                                                rtmStatus === 'error' ? 'bg-status-offline' : 'bg-surface'
                                        }`} />
                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${rtmStatus === 'connected' ? 'text-status-active' :
                                            rtmStatus === 'connecting' ? 'text-status-warning' :
                                                rtmStatus === 'error' ? 'text-status-offline' : 'text-text-secondary'
                                        }`}>
                                        RTM {rtmStatus}
                                        {rtmError && <span className="ml-2 opacity-50 lowercase normal-case">({rtmError})</span>}
                                    </span>
                                </div>
                            </div>
                            <select
                                value={selectedCandidateId || 'broadcast'}
                                onChange={(e) => setSelectedCandidateId(e.target.value === 'broadcast' ? null : e.target.value)}
                                className="bg-brand border border-border-subtle text-[10px] font-black text-text-secondary px-3 py-1.5 rounded-md outline-none focus:border-accent-main transition-colors uppercase"
                            >
                                <option value="broadcast">Broadcast to All</option>
                                {candidates.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto px-6 space-y-4">
                            {messages.filter(m => !m.candidateId || m.candidateId === selectedCandidateId).map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.sender === 'proctor' ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">{msg.sender}</span>
                                        <span className="text-[9px] font-bold text-text-secondary opacity-60">{msg.timestamp}</span>
                                    </div>
                                    <div className={`max-w-[85%] p-3 text-xs font-medium leading-relaxed ${msg.sender === 'proctor'
                                            ? 'bg-accent-main text-white rounded-md shadow-lg'
                                            : 'bg-surface border border-border-subtle text-text-primary rounded-md'
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-6">
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={selectedCandidateId ? `Message ${selectedCandidate?.name}...` : "Broadcast to all candidates..."}
                                    className="w-full bg-brand border border-border-subtle text-xs text-text-primary px-5 py-4 rounded-md outline-none focus:border-accent-main/50 transition-all pr-14 placeholder:text-text-secondary/50 group-hover:border-border-subtle/80 shadow-inner"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-accent-main text-white rounded-md flex items-center justify-center hover:bg-accent-main/80 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-accent-main/20"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </form>
                    </div>
                </aside>
            </div>

            {/* Overlays */}
            {overlayType && (
                <StatusOverlay
                    type={overlayType}
                    title={overlayType.replace(/_/g, ' ')}
                    candidates={
                        overlayType === 'active' ? activeCandidates :
                            overlayType === 'offline' ? offlineCandidates :
                                overlayType === 'joined' ? joinedCandidates :
                                    yetToJoinCandidates
                    }
                    onClose={() => setOverlayType(null)}
                />
            )}

            {/* Full Screen Overlay */}
            {fullScreenCandidateId && candidates.find(c => c.id === fullScreenCandidateId) && (
                <CandidateFullScreenOverlay
                    candidate={candidates.find(c => c.id === fullScreenCandidateId)!}
                    viewMode={viewMode}
                    assessmentId={assessmentId}
                    onClose={() => setFullScreenCandidateId(null)}
                />
            )}
        </div>
    );
}
