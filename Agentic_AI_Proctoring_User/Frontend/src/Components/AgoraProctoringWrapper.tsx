import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import AgoraRTC from "agora-rtc-sdk-ng";
import type { IAgoraRTCClient, ILocalVideoTrack, ILocalAudioTrack } from "agora-rtc-sdk-ng";
import { AGORA_CONFIG } from "../Config/AgoraConfig";

interface AgoraProctoringContextType {
  localVideoTrack: ILocalVideoTrack | null;
  localAudioTrack: ILocalAudioTrack | null;
  status: "idle" | "connecting" | "active" | "error";
  errorMsg: string;
  initTracks: () => Promise<void>;
  cleanup: () => Promise<void>;
  tracksVersion: number;
}

const AgoraProctoringContext = createContext<AgoraProctoringContextType | undefined>(undefined);

export const useAgoraProctoring = () => {
  const context = useContext(AgoraProctoringContext);
  if (!context) throw new Error("useAgoraProctoring must be used within AgoraProctoringWrapper");
  return context;
};

interface Props {
  children: React.ReactNode;
}

const AgoraProctoringWrapper: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoTrackRef = useRef<ILocalVideoTrack | null>(null);
  const localAudioTrackRef = useRef<ILocalAudioTrack | null>(null);
  const isInitializingRef = useRef(false);
  const isJoinedRef = useRef(false);
  const isJoiningRef = useRef(false);

  const [status, setStatus] = useState<"idle" | "connecting" | "active" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [tracksVersion, setTracksVersion] = useState(0); 

  const initTracks = useCallback(async () => {
    if (localVideoTrackRef.current) return; // Already have tracks
    if (isInitializingRef.current) return;

    isInitializingRef.current = true;
    setStatus("connecting");
    setErrorMsg("");

    try {
      console.log("Agora Wrapper: Initializing Master Tracks...");
      
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack().catch(e => {
        console.warn("Mic fail:", e);
        return null;
      });
      const videoTrack = await AgoraRTC.createCameraVideoTrack().catch(e => {
        console.warn("Camera fail:", e);
        throw new Error("Camera Access Denied or Busy");
      });

      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = videoTrack;
      setTracksVersion(v => v + 1);
      
      console.log("Agora Wrapper: Master Tracks Ready.");
      setStatus("idle");
    } catch (err: any) {
      console.error("Agora Wrapper Track Init Failure:", err);
      setStatus("error");
      setErrorMsg(err?.message || String(err));
    } finally {
      isInitializingRef.current = false;
    }
  }, []);

  const startStreaming = useCallback(async () => {
    if (isJoinedRef.current || !localVideoTrackRef.current) return;
    
    try {
      setStatus("connecting");
      console.log("Agora Wrapper: Starting Admin Stream...");
      
      const assessmentId = localStorage.getItem('assessment_id')?.toString().trim().toLowerCase();
      const candidateId = localStorage.getItem('candidate_id')?.toString().trim().toLowerCase();
      
      if (!assessmentId || !candidateId) {
          throw new Error("Missing Assessment or Candidate ID");
      }

      const channelName = `${assessmentId}_${candidateId}`;
      const appId = AGORA_CONFIG.appId;

      if (!appId || appId.includes("Replace")) {
          throw new Error("Missing Agora App ID");
      }

      if (isJoiningRef.current) return;
      isJoiningRef.current = true;

      // Fetch dynamic token from backend
      const tokenResponse = await fetch(`${AGORA_CONFIG.tokenUrl}?channelName=${channelName}`);
      if (!tokenResponse.ok) throw new Error("Security Token Fetch Failed");
      const { token } = await tokenResponse.json();

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      console.log(`Agora Wrapper: Joining channel ${channelName} as UID 1 (Candidate Laptop)`);
      if (clientRef.current === client) {
        await client.join(appId, channelName, token, 1);
        
        const tracksToPublish = [];
        if (localAudioTrackRef.current) tracksToPublish.push(localAudioTrackRef.current);
        if (localVideoTrackRef.current) tracksToPublish.push(localVideoTrackRef.current);

        await client.publish(tracksToPublish);
        isJoinedRef.current = true;
        setStatus("active");
        console.log("Agora Wrapper: Admin Stream Live with channel:", channelName);
      }
    } catch (err: any) {
      console.error("Agora Wrapper Streaming Failure:", err);
      setStatus("error");
      const cleanMsg = err?.message || String(err);
      setErrorMsg(cleanMsg.length > 40 ? cleanMsg.substring(0, 40) + "..." : cleanMsg);
    } finally {
      isJoiningRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Include ALL assessment-related paths
    const proctoringPaths = [
        '/dashboard', 
        '/section/', 
        '/submission', 
        '/guiding-page',
        '/section/mcq',
        '/section/coding',
        '/section/sql',
        '/section/pipe-puzzle'
    ];

    const isProctoringPage = proctoringPaths.some(path => location.pathname.includes(path));
    const isSubmissionPage = location.pathname.includes('/submission');
    const isStarted = localStorage.getItem('assessment_started') === 'true';
                             
    console.log("Agora Wrapper: Route check:", location.pathname, "isMatch:", isProctoringPage, "isStarted:", isStarted, "isJoined:", isJoinedRef.current);

    // CRITICAL: Do NOT auto-init tracks if we are on the submission page.
    // If they are already active, they can stay, but if we just cleaned them up,
    // don't bring them back.
    if (isProctoringPage && isStarted && !isSubmissionPage) {
        if (!isJoinedRef.current) {
            if (localVideoTrackRef.current) {
                startStreaming();
            } else {
                console.log("Agora Wrapper: Missing tracks. Auto-initializing...");
                initTracks();
            }
        }
    }
  }, [location.pathname, startStreaming, tracksVersion, initTracks]);

  const cleanup = useCallback(async () => {
    console.log("Agora Wrapper: Full System Shutdown Initiated...");
    
    // 1. Close Agora tracks (Synchronous release)
    if (localVideoTrackRef.current) {
      console.log("Agora Wrapper: Stopping & Closing Video Track");
      try {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
      } catch (e) { console.warn("Video stop fail:", e); }
      localVideoTrackRef.current = null;
    }
    if (localAudioTrackRef.current) {
      try {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      } catch (e) { console.warn("Audio stop fail:", e); }
      localAudioTrackRef.current = null;
    }
    
    // 2. Leave Agora Client (NON-BLOCKING)
    const client = clientRef.current;
    if (client) {
      clientRef.current = null;
      console.log("Agora Wrapper: Leaving channel (non-blocking)...");
      client.leave().catch(err => console.error("Agora Wrapper Leave Error:", err));
    }
    
    isJoinedRef.current = false;
    isJoiningRef.current = false;
    setTracksVersion(v => v + 1); 
    setStatus("idle");
    console.log("Agora Wrapper: System Shutdown Logic Complete.");
  }, []);

  // Listen for test completion and fullscreen exit
  useEffect(() => {
    const handleExitConditions = () => {
      const isCompleted = localStorage.getItem('assessment_completed') === 'true';
      const isFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);

      console.log("Agora Wrapper: Exit condition check - isCompleted:", isCompleted, "isFullscreen:", isFullscreen);
      
      if (isCompleted && !isFullscreen && localVideoTrackRef.current) {
        cleanup();
      }
    };

    document.addEventListener('fullscreenchange', handleExitConditions);
    return () => document.removeEventListener('fullscreenchange', handleExitConditions);
  }, [cleanup]);

  return (
    <AgoraProctoringContext.Provider value={{ 
      localVideoTrack: localVideoTrackRef.current, 
      localAudioTrack: localAudioTrackRef.current,
      status, 
      errorMsg, 
      initTracks,
      cleanup,
      tracksVersion 
    }}>
      {children}
    </AgoraProctoringContext.Provider>
  );
};

export default AgoraProctoringWrapper;
