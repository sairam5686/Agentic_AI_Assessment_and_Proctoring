import React, { useEffect, useRef } from "react";
import { useAgoraProctoring } from "./AgoraProctoringWrapper";

interface Props {
  children: React.ReactNode;
}

const ProctoringWrapper = ({ children }: Props) => {
  const { localVideoTrack } = useAgoraProctoring();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!localVideoTrack) return;

    // Create a hidden video element to play the Agora track
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    
    // IMPORTANT: instead of localVideoTrack.play(video), we use the raw track.
    // This allows components like SystemCheck to use localVideoTrack.play() without conflict.
    const mediaStreamTrack = localVideoTrack.getMediaStreamTrack();
    video.srcObject = new MediaStream([mediaStreamTrack]);
    video.play().catch(e => console.error("Hidden video playback failed:", e));
    
    videoRef.current = video;

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d");

    const sendFrame = async () => {
      if (!videoRef.current || !ctx) return;

      // ONLY send frames if the assessment has officially started
      const isStarted = localStorage.getItem('assessment_started') === 'true';
      if (!isStarted) return;

      // Draw the current frame from the video element
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.7); // Slightly lower quality for better speed

      const Assessment_id = localStorage.getItem("assessment_id")?.toString().trim().toLowerCase();
      const email_id = localStorage.getItem("candidate_email")?.toString().trim().toLowerCase();

      try {
        const videoProctorUrl = import.meta.env.VITE_VIDEO_PROCTOR_URL || "http://localhost:8001";
        await fetch(`${videoProctorUrl}/video/frame`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image,
            assessment_id: Assessment_id,
            email_id: email_id,
          }),
        });
      } catch (err) {
        console.error("Failed to send frame to backend:", err);
      }
    };

    const interval = setInterval(sendFrame, 100); // 10 FPS (Increased from 5 FPS)

    return () => {
      console.log("ProctoringWrapper: Cleaning up interval and video element...");
      clearInterval(interval);
      if (videoRef.current) {
        const stream = videoRef.current.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [localVideoTrack]);

  return <>{children}</>;
};

export default ProctoringWrapper;