/**
 * AgoraVideoPlayer.tsx — Candidate Video Feed Component
 *
 * Displays a single candidate's live camera feeds (front/side) using Agora RTC.
 *
 * Channel naming: "{assessmentId}_{candidateId}" (lowercased)
 * Token fetched from: GET /agora/token?channelName=...
 *
 * UID mapping logic:
 *   UID 1  → Laptop/Front camera
 *   UID 2  → Mobile/Side camera
 *   Other  → Assigned to whichever slot (front/side) is currently empty
 *
 * Props:
 *   assessmentId  — Current assessment session ID
 *   candidateId   — Candidate's unique ID
 *   layout        — 'grid' (compact, side-by-side in card) | 'focused' (large, separate panels)
 *   viewMode      — 'front' | 'side' | 'both' — which camera feeds to display
 *   showLabels    — Whether to show "Front" / "Side" labels on video panels
 *
 * Side effect: Updates the candidate's cameraOn status in the Zustand store
 * whenever tracks are gained/lost.
 */
import { useEffect, useState, useRef } from 'react';
import AgoraRTC, { IAgoraRTCClient, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';
import { AGORA_CONFIG } from '../Config/AgoraConfig';
import { Monitor, Smartphone, VideoOff } from 'lucide-react';
import { useProctorStore } from '../store/proctorStore';

interface AgoraVideoPlayerProps {
    assessmentId: string;
    candidateId: string;
    layout: 'grid' | 'focused';
    viewMode?: 'front' | 'side' | 'both';
    showLabels?: boolean;
}

export default function AgoraVideoPlayer({ 
    assessmentId, 
    candidateId, 
    layout, 
    viewMode = 'both',
    showLabels = true 
}: AgoraVideoPlayerProps) {
    const [client, setClient] = useState<IAgoraRTCClient | null>(null);
    const [frontTrack, setFrontTrack] = useState<IRemoteVideoTrack | null>(null);
    const [sideTrack, setSideTrack] = useState<IRemoteVideoTrack | null>(null);
    const [isJoined, setIsJoined] = useState(false);
    
    const frontRef = useRef<HTMLDivElement>(null);
    const sideRef = useRef<HTMLDivElement>(null);

    const channelName = `${assessmentId}_${candidateId}`.toLowerCase();

    useEffect(() => {
        let rtcClient: IAgoraRTCClient | null = null;

        const init = async () => {
            rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
            setClient(rtcClient);

            rtcClient.on('user-published', async (user, mediaType) => {
                console.log(`[AGORA] User published: ${user.uid}, MediaType: ${mediaType} in channel: ${channelName}`);
                await rtcClient!.subscribe(user, mediaType);
                
                if (mediaType === 'video') {
                    const remoteVideoTrack = user.videoTrack!;
                    const uid = Number(user.uid);
                    
                    // Flexible mapping logic:
                    // 1. If UID is 1, it's definitely Laptop (Front).
                    // 2. If UID is 2, it's definitely Mobile (Side).
                    // 3. For any other UID, we assign to whichever slot is currently empty.
                    
                    setFrontTrack(prev => {
                        if (uid === 1) return remoteVideoTrack;
                        // Avoid overwriting a valid UID 1 with a random UID
                        if (uid !== 2 && !prev) return remoteVideoTrack;
                        return prev;
                    });

                    setSideTrack(prev => {
                        if (uid === 2) return remoteVideoTrack;
                        // For random UIDs, if Front is taken and Side is empty, take Side
                        // Or if this is the only stream available besides Front
                        if (uid !== 1 && !prev) return remoteVideoTrack;
                        return prev;
                    });

                    console.log(`[AGORA] Processed UID ${uid}. Track assigned based on availability.`);
                }
            });

            rtcClient.on('user-unpublished', (user, mediaType) => {
                if (mediaType === 'video') {
                    const uid = Number(user.uid);
                    if (uid === 1) setFrontTrack(null);
                    else if (uid === 2) setSideTrack(null);
                    else {
                        // For other UIDs, clear tracks as they go offline
                        setFrontTrack(prev => (prev && uid !== 2) ? null : prev);
                        setSideTrack(prev => (prev && uid !== 1) ? null : prev);
                    }
                }
            });

            try {
                // Fetch token
                const response = await fetch(`${AGORA_CONFIG.tokenUrl}?channelName=${channelName}`);
                const data = await response.json();
                const token = data.token;

                await rtcClient.join(AGORA_CONFIG.appId, channelName, token, null);
                setIsJoined(true);
                console.log(`Joined Agora RTC channel: ${channelName} with AppID: ${AGORA_CONFIG.appId}`);
                console.log(`RTC Token used: ${token.substring(0, 10)}...`);
            } catch (error) {
                console.error('Error joining Agora channel:', error);
            }
        };

        init();

        return () => {
            if (rtcClient) {
                rtcClient.leave();
                rtcClient.removeAllListeners();
            }
        };
    }, [channelName]);

    const isLoading = !isJoined || !client;

    const { updateCandidateStatus } = useProctorStore();

    useEffect(() => {
        const hasCamera = !!(frontTrack || sideTrack);
        updateCandidateStatus(candidateId, { cameraOn: hasCamera });
    }, [frontTrack, sideTrack, candidateId, updateCandidateStatus]);

    useEffect(() => {
        if (frontTrack && frontRef.current) {
            frontTrack.play(frontRef.current);
        }
    }, [frontTrack]);

    useEffect(() => {
        if (sideTrack && sideRef.current) {
            sideTrack.play(sideRef.current);
        }
    }, [sideTrack]);

    const renderPlaceholder = (type: 'Front' | 'Side') => (
        <div className="flex flex-col items-center gap-2 opacity-40">
            {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-accent-main/30 border-t-accent-main rounded-md animate-spin" />
                    <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">Joining...</span>
                </div>
            ) : (
                <>
                    <div className="w-12 h-12 bg-surface rounded-md flex items-center justify-center border-2 border-border-subtle animate-pulse">
                        <VideoOff size={20} className="text-text-secondary" />
                    </div>
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{type} Offline</span>
                </>
            )}
        </div>
    );

    if (layout === 'focused') {
        const showFront = viewMode === 'front' || viewMode === 'both';
        const showSide = viewMode === 'side' || viewMode === 'both';

        return (
            <div className={`grid ${showFront && showSide ? 'grid-cols-2' : 'grid-cols-1'} gap-4 w-full`}>
                {showFront && (
                    <div className="aspect-video bg-surface/50 rounded-lg border border-border-subtle relative overflow-hidden flex items-center justify-center shadow-2xl group/video">
                        {showLabels && (
                            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-brand/80 backdrop-blur-md px-2.5 py-1.5 rounded-md border border-border-subtle">
                                <Monitor size={12} className="text-accent-main" />
                                <span className="text-[9px] font-black text-text-primary uppercase tracking-widest">Front</span>
                            </div>
                        )}
                        <div ref={frontRef} className="w-full h-full object-cover" />
                        {!frontTrack && (
                            <div className="absolute inset-0 flex items-center justify-center bg-brand/40 backdrop-blur-[2px]">
                                {renderPlaceholder('Front')}
                            </div>
                        )}
                    </div>
                )}
                {showSide && (
                    <div className="aspect-video bg-surface/50 rounded-none border border-border-subtle relative overflow-hidden flex items-center justify-center shadow-2xl group/video">
                        {showLabels && (
                            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-brand/80 backdrop-blur-md px-2.5 py-1.5 rounded-none border border-border-subtle">
                                <Smartphone size={12} className="text-accent-main" />
                                <span className="text-[9px] font-black text-text-primary uppercase tracking-widest">Side</span>
                            </div>
                        )}
                        <div ref={sideRef} className="w-full h-full object-cover" />
                        {!sideTrack && (
                            <div className="absolute inset-0 flex items-center justify-center bg-brand/40 backdrop-blur-[2px]">
                                {renderPlaceholder('Side')}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    const showFront = viewMode === 'front' || viewMode === 'both';
    const showSide = viewMode === 'side' || viewMode === 'both';

    return (
        <div className="flex gap-px bg-border-subtle/30 aspect-video relative">
            {showFront && (
                <div className="flex-1 bg-brand/50 relative flex items-center justify-center group-hover:bg-brand/70 transition-colors overflow-hidden">
                    {showLabels && (
                        <div className="absolute top-3 left-4 z-10 flex items-center gap-1.5 bg-brand/80 backdrop-blur-md px-2 py-1 rounded-md border border-border-subtle/50">
                            <Monitor size={10} className="text-accent-main" />
                            <span className="text-[8px] font-black text-text-primary uppercase tracking-widest">Front</span>
                        </div>
                    )}
                    <div ref={frontRef} className="w-full h-full" />
                    {!frontTrack && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            {renderPlaceholder('Front')}
                        </div>
                    )}
                </div>
            )}
            {showSide && (
                <div className="flex-1 bg-brand/50 relative flex items-center justify-center border-l border-border-subtle/30 group-hover:bg-brand/70 transition-colors overflow-hidden">
                    {showLabels && (
                        <div className="absolute top-3 left-4 z-10 flex items-center gap-1.5 bg-brand/80 backdrop-blur-md px-2 py-1 rounded-none border border-border-subtle/50">
                            <Smartphone size={10} className="text-accent-main" />
                            <span className="text-[8px] font-black text-text-primary uppercase tracking-widest">Side</span>
                        </div>
                    )}
                    <div ref={sideRef} className="w-full h-full" />
                    {!sideTrack && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            {renderPlaceholder('Side')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
