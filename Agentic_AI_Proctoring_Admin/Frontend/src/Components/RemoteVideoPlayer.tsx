import React, { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import type { IAgoraRTCClient, IRemoteVideoTrack } from "agora-rtc-sdk-ng";
import { AGORA_CONFIG } from "../Config/AgoraConfig";

interface RemoteVideoPlayerProps {
  channel: string;
  viewMode?: "laptop" | "mobile" | "both";
}

const RemoteVideoPlayer: React.FC<RemoteVideoPlayerProps> = ({ channel, viewMode = "both" }) => {
  const [remoteUsers, setRemoteUsers] = useState<Map<number, IRemoteVideoTrack>>(new Map());
  const [assignedUids, setAssignedUids] = useState<{laptop: number | null, mobile: number | null}>({ laptop: null, mobile: null });
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const isJoiningRef = useRef(false);

  useEffect(() => {
    let client: IAgoraRTCClient | null = null;

    const init = async () => {
      if (isJoiningRef.current) return;
      isJoiningRef.current = true;

      try {
        client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        client.on("user-published", async (user: any, mediaType: "video" | "audio") => {
          console.log(`[AGORA] Stream Published: UID=${user.uid}, Type=${mediaType}`);
          try {
            await client?.subscribe(user, mediaType);
            if (mediaType === "video") {
              setRemoteUsers(prev => {
                const next = new Map(prev);
                next.set(Number(user.uid), user.videoTrack);
                return next;
              });
            }
            if (mediaType === "audio") {
              user.audioTrack?.play();
            }
          } catch (err) {
            console.error("[AGORA] Subscription error:", err);
          }
        });

        client.on("user-unpublished", (user) => {
          console.log(`[AGORA] Stream Unpublished: UID=${user.uid}`);
          setRemoteUsers(prev => {
            const next = new Map(prev);
            const track = next.get(Number(user.uid));
            if (track) {
              track.stop();
            }
            next.delete(Number(user.uid));
            return next;
          });
        });

        // Fetch dynamic token from backend
        const tokenResponse = await fetch(`${AGORA_CONFIG.tokenUrl}?channelName=${channel}`);
        if (!tokenResponse.ok) throw new Error("Security Token Fetch Failed");
        const { token } = await tokenResponse.json();

        if (clientRef.current === client) {
          await client.join(AGORA_CONFIG.appId, channel, token, null);
          console.log("Admin successfully joined channel:", channel);
        }
      } catch (error) {
        console.error("Failed to join Agora channel:", error);
      } finally {
        isJoiningRef.current = false;
      }
    };

    init();

    return () => {
      const cleanup = async () => {
        const currentClient = clientRef.current;
        if (currentClient) {
          console.log("[AGORA] Cleaning up client...");
          clientRef.current = null;
          
          setRemoteUsers(prev => {
            prev.forEach(track => {
              track.stop();
              // track.close() is not available on IRemoteVideoTrack, but stop() is sufficient for release
            });
            return new Map();
          });

          try {
            await currentClient.leave();
          } catch (err) {
            console.error("[AGORA] Leave error:", err);
          }
        }
      };
      cleanup();
    };
  }, [channel]);

  // Logic to dynamically map available streams to display slots
  useEffect(() => {
    const users = Array.from(remoteUsers.keys());
    setAssignedUids(prev => {
      let nextLaptop = prev.laptop;
      let nextMobile = prev.mobile;

      // Clean up UIDs that are no longer active
      if (nextLaptop !== null && !remoteUsers.has(nextLaptop)) nextLaptop = null;
      if (nextMobile !== null && !remoteUsers.has(nextMobile)) nextMobile = null;

      // Assign priority UIDs first
      users.forEach(uid => {
        if (uid === 1) nextLaptop = 1;
        if (uid === 2) nextMobile = 2;
      });

      // Fill empty slots with other available UIDs
      users.forEach(uid => {
        if (uid !== 1 && uid !== 2) {
          if (nextLaptop === null && nextMobile !== uid) nextLaptop = uid;
          else if (nextMobile === null && nextLaptop !== uid) nextMobile = uid;
        }
      });

      if (nextLaptop !== prev.laptop || nextMobile !== prev.mobile) {
        console.log(`[AGORA] Mapped feeds: Laptop=${nextLaptop || 'None'}, Mobile=${nextMobile || 'None'} (Available UIDs: ${users.join(', ')})`);
        return { laptop: nextLaptop, mobile: nextMobile };
      }
      return prev;
    });
  }, [remoteUsers]);

  // Handle playing tracks in their specific containers
  useEffect(() => {
    remoteUsers.forEach((track, uid) => {
      const el = document.getElementById(`video-${uid}`);
      if (el && track) {
        track.play(el);
      }
    });
  }, [remoteUsers, viewMode, assignedUids]); // Added assignedUids to dependencies

  const showLaptop = viewMode === "laptop" || viewMode === "both";
  const showMobile = viewMode === "mobile" || viewMode === "both";

  const renderVideo = (uid: number | null, label: string) => {
    const track = uid !== null ? remoteUsers.get(uid) : null;
    const containerId = uid !== null ? `video-${uid}` : `waiting-${label.replace(/\s+/g, '-')}`;

    return (
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-sm border border-gray-200">
        <div id={containerId} className="w-full h-full" />
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 text-white text-[9px] font-black rounded-lg uppercase tracking-widest backdrop-blur-md">
          {label} {uid && `(UID: ${uid})`}
        </div>
        {!track && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-900/10 backdrop-blur-sm">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white drop-shadow-md">
              Waiting for {label}...
            </p>
          </div>
        )}
        {track && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-red-600/90 text-white text-[10px] font-black rounded-lg uppercase tracking-widest shadow-lg animate-pulse">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            Live
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`grid gap-6 ${viewMode === "both" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
      {showLaptop && renderVideo(assignedUids.laptop, "Laptop Webcam")}
      {showMobile && renderVideo(assignedUids.mobile, "Mobile Camera")}
    </div>
  );
};

export default RemoteVideoPlayer;
