import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import type { IAgoraRTCClient, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';
import { AGORA_CONFIG } from '../Config/AgoraConfig';
import { FiVideoOff } from 'react-icons/fi';

interface ProctorVideoViewProps {
    assessmentId: string;
}

const ProctorVideoView: React.FC<ProctorVideoViewProps> = ({ assessmentId }) => {
    const [proctorTrack, setProctorTrack] = useState<IRemoteVideoTrack | null>(null);
    const videoRef = useRef<HTMLDivElement>(null);
    const clientRef = useRef<IAgoraRTCClient | null>(null);

    useEffect(() => {
        let isMounted = true;
        
        const init = async () => {
            try {
                const channelName = `${assessmentId}_proctor_video`.toLowerCase();
                const uid = 0; // Candidate joins as subscriber (UID 0)

                // Fetch dynamic token from backend
                const response = await fetch(`${AGORA_CONFIG.tokenUrl}?channelName=${channelName}&uid=${uid}`);
                if (!response.ok) throw new Error("Security Token Fetch Failed");
                const { token } = await response.json();

                const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
                clientRef.current = client;

                client.on('user-published', async (user, mediaType) => {
                    if (user.uid === 1 && mediaType === 'video') {
                        await client.subscribe(user, mediaType);
                        if (isMounted) setProctorTrack(user.videoTrack!);
                        console.log("Subscribed to proctor video");
                    }
                });

                client.on('user-unpublished', (user, mediaType) => {
                    if (user.uid === 1 && mediaType === 'video') {
                        if (isMounted) setProctorTrack(null);
                    }
                });

                await client.join(AGORA_CONFIG.appId, channelName, token, uid);
                console.log("Joined proctor video channel:", channelName);
            } catch (err) {
                console.error("Failed to join proctor video channel:", err);
            }
        };

        init();

        return () => {
            isMounted = false;
            const client = clientRef.current;
            if (client) {
                client.leave();
            }
        };
    }, [assessmentId]);

    useEffect(() => {
        if (proctorTrack && videoRef.current) {
            proctorTrack.play(videoRef.current);
        }
    }, [proctorTrack]);

    return (
        <div className="w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800 shadow-xl group">
            <div ref={videoRef} className="w-full h-full object-cover" />
            
            {!proctorTrack && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/50 backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                        <FiVideoOff size={24} />
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Proctor Camera Offline</span>
                </div>
            )}
            
            {proctorTrack && (
                <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 bg-indigo-600/90 backdrop-blur-md rounded-lg shadow-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                    <span className="text-[9px] font-black text-white uppercase tracking-wider">Live Proctor</span>
                </div>
            )}
        </div>
    );
};

export default ProctorVideoView;
