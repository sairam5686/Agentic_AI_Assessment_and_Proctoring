/**
 * proctorStore.ts — Central Zustand State Store
 *
 * Manages ALL global state for the Proctor Interface:
 *   - Authentication (login / logout)
 *   - Candidate list fetching & polling (every 10s)
 *   - Candidate violation flags (evidence logs from backend)
 *   - Agora RTM (Real-Time Messaging) — proctor ↔ candidate chat
 *   - Agora RTC (Real-Time Communication) — proctor's own camera feed
 *   - UI theme switching (blue / black / white)
 *
 * Backend Base URL: http://localhost:8000  (FastAPI)
 */
import { create } from 'zustand';
import axios from 'axios';
import AgoraRTM, { RTMClient } from 'agora-rtm';
import AgoraRTC, { IAgoraRTCClient, ILocalVideoTrack } from 'agora-rtc-sdk-ng';
import { AGORA_CONFIG } from '../Config/AgoraConfig';

const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : `http://${window.location.hostname}:8000`;

/** A single violation/flag event recorded for a candidate during the exam. */
export interface CandidateFlag {
    timestamp: string;      // Human-readable timestamp of the violation
    type: string;           // Violation category e.g. 'illegal_object', 'head_turned', 'drowsy'
    reason: string;         // Description/details of the violation
    webcam_url?: string;    // Cloud URL of the webcam snapshot evidence (if from laptop camera)
    mobile_url?: string;    // Cloud URL of the mobile snapshot evidence (if from mobile camera)
}

/** Represents a candidate assigned to this proctor's assessment session. */
export interface Candidate {
    id: string;             // Candidate ID (usually candidate_id from backend, or email as fallback)
    name: string;
    reg_no: string;         // Registration number
    email: string;
    college: string;
    department: string;
    isOnline: boolean;      // True if candidate has joined AND has camera on
    isJoined: boolean;      // True if enrollment status is beyond 'invitation sent'
    cameraOn: boolean;      // True if at least one Agora video track is active
    flags: CandidateFlag[]; // List of violation flags sorted by most recent first
}

/** A chat message sent/received via Agora RTM. */
export interface ChatMessage {
    id: string;                          // Random unique ID
    sender: 'proctor' | 'candidate';     // Who sent the message
    text: string;
    timestamp: string;                   // Display-friendly time string (HH:MM)
    candidateId?: string;                // If set, message is for/from a specific candidate; null = broadcast
}

interface ProctorState {
    isAuthenticated: boolean;
    proctorName: string;
    proctorEmail: string;
    assessmentId: string;
    candidates: Candidate[];
    selectedCandidateId: string | null;
    proctorCameraEnabled: boolean;
    messages: ChatMessage[];
    pollingInterval: any | null;
    rtmClient: RTMClient | null;
    rtcClient: IAgoraRTCClient | null;
    localVideoTrack: ILocalVideoTrack | null;
    rtmStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
    rtmError: string | null;
    theme: 'blue' | 'black' | 'white';

    setTheme: (theme: 'blue' | 'black' | 'white') => void;
    logout: () => void;
    setLoginData: (name: string, email: string, aId: string) => void;
    login: (assessmentId: string, passkey: string) => Promise<boolean>;
    fetchCandidates: () => Promise<void>;
    fetchCandidateFlags: (email: string) => Promise<CandidateFlag[]>;
    updateCandidateStatus: (candidateId: string, status: Partial<Candidate>) => void;
    setSelectedCandidateId: (id: string | null) => void;
    toggleProctorCamera: () => void;
    sendMessage: (text: string, candidateId?: string) => void;
    startPolling: () => void;
    stopPolling: () => void;
    initRTM: () => Promise<void>;
    logoutRTM: () => Promise<void>;
    initRTC: () => Promise<void>;
    closeRTC: () => Promise<void>;
}

export const useProctorStore = create<ProctorState>((set, get) => ({
    isAuthenticated: false,
    proctorName: '',
    proctorEmail: '',
    assessmentId: '',
    candidates: [],
    selectedCandidateId: null,
    proctorCameraEnabled: false,
    messages: [],
    pollingInterval: null,
    rtmClient: null,
    rtcClient: null,
    localVideoTrack: null,
    rtmStatus: 'disconnected',
    rtmError: null,
    theme: 'blue',

    /** Updates the UI color theme. Applied via CSS class on <html> element. */
    setTheme: (theme: 'blue' | 'black' | 'white') => set({ theme }),

    /** Logs out the proctor — stops polling, disconnects RTM & RTC, and resets all session state. */
    logout: () => {
        get().stopPolling();
        get().logoutRTM();
        get().closeRTC();
        set({
            isAuthenticated: false,
            proctorName: '',
            proctorEmail: '',
            assessmentId: '',
            candidates: [],
            messages: []
        });
    },

    /**
     * Stores proctor identity after successful login.
     * @param name  — Proctor's display name
     * @param email — Proctor's email (used as RTM user ID)
     * @param aId   — Assessment ID for this session
     */
    setLoginData: (name, email, aId) => set({
        proctorName: name,
        proctorEmail: email,
        assessmentId: aId,
        isAuthenticated: true
    }),

    /**
     * Authenticates the proctor against the backend.
     * API: POST /proctor/login  (FormData: assessment_id, passkey)
     * Returns: true on success (sets auth state), false on failure.
     */
    login: async (assessmentId: string, passkey: string) => {
        try {
            const formData = new FormData();
            formData.append('assessment_id', assessmentId);
            formData.append('passkey', passkey);

            // API: POST /proctor/login — returns { name, email } on success
            const response = await axios.post(`${API_BASE_URL}/proctor/login`, formData);
            if (response.data && response.data.email) {
                get().setLoginData(response.data.name, response.data.email, assessmentId);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Login failed:", error);
            return false;
        }
    },

    /**
     * Fetches the list of candidates assigned to this proctor for the current assessment.
     * API: GET /proctor/assigned-candidates?assessment_id=...&proctor_email=...
     * Also fetches violation flags for each candidate via fetchCandidateFlags().
     *
     * Status logic:
     *   isJoined = enrollment status is NOT 'invitation sent to candidate' or 'mail not sent'
     *   isOnline = isJoined AND cameraOn (preserved from existing state / Agora track status)
     */
    fetchCandidates: async () => {
        const { assessmentId, proctorEmail, candidates: existingCandidates } = get();
        if (!assessmentId || !proctorEmail) return;

        try {
            // API: GET /proctor/assigned-candidates — returns array of candidate enrollment records
            const response = await axios.get(`${API_BASE_URL}/proctor/assigned-candidates`, {
                params: { assessment_id: assessmentId, proctor_email: proctorEmail }
            });

            const rawCandidates = response.data;
            const updatedCandidates = await Promise.all(rawCandidates.map(async (c: any) => {
                const existingCandidate = existingCandidates.find(ec => ec.id === c.candidate_id || ec.email === c.email);

                // Fetch violation flags for each candidate
                const flags = await get().fetchCandidateFlags(c.email);

                // Determine join status from enrollment record
                const isJoined = c.status !== "invitation sent to candidate" && c.status !== "mail not sent";

                return {
                    id: c.candidate_id || c.email,
                    name: c.name,
                    reg_no: c.reg_no || c.candidate_id || "N/A",
                    email: c.email,
                    college: c.college || "N/A",
                    department: c.Department || c.department || "N/A",
                    isJoined: isJoined,
                    isOnline: isJoined && (existingCandidate?.cameraOn || false),
                    cameraOn: existingCandidate?.cameraOn || false,
                    flags: flags
                };
            }));

            set({ candidates: updatedCandidates });
        } catch (error) {
            console.error("Error fetching candidates:", error);
        }
    },

    /**
     * Fetches violation/evidence logs for a specific candidate.
     * API: GET /EvidencesLogs/{assessmentId}/{email}/get
     * Maps backend log records into CandidateFlag[] and sorts by newest first.
     *
     * @param email — Candidate's email address
     * @returns CandidateFlag[] — sorted violation list (newest first), empty array on error
     */
    fetchCandidateFlags: async (email: string) => {
        const { assessmentId } = get();
        try {
            // API: GET /EvidencesLogs/{assessmentId}/{email}/get — returns array of violation log records
            const response = await axios.get(`${API_BASE_URL}/EvidencesLogs/${assessmentId}/${email}/get`);
            const rawLogs = response.data;
            const flags: CandidateFlag[] = rawLogs.map((log: any) => {
                const timestamp = log.timestamp || Date.now() / 1000;
                return {
                    timestamp: log.time || new Date(timestamp * 1000).toLocaleString(),
                    type: log.violation_type || log.type || "Violation",
                    reason: log.details || "Behavioral anomaly detected",
                    webcam_url: (log.camera_type === 'laptop' || !log.camera_type) ? (log.cloud_url || log.webcam_url) : undefined,
                    mobile_url: (log.camera_type === 'mobile') ? log.cloud_url : undefined
                };
            });

            return flags.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch (error) {
            console.error(`Error fetching flags for ${email}:`, error);
            return [];
        }
    },

    /**
     * Partially updates a candidate's local state (e.g. cameraOn status from Agora track events).
     * @param candidateId — Candidate to update
     * @param status      — Partial<Candidate> fields to merge
     */
    updateCandidateStatus: (candidateId, status) => {
        set((state) => ({
            candidates: state.candidates.map((c) =>
                c.id === candidateId ? { ...c, ...status } : c
            ),
        }));
    },

    /** Starts polling fetchCandidates() every 10 seconds. Fetches once immediately on start. */
    startPolling: () => {
        const currentInterval = get().pollingInterval;
        if (currentInterval) {
            clearInterval(currentInterval);
        }

        get().fetchCandidates();

        const interval = setInterval(() => {
            get().fetchCandidates();
        }, 10000);

        set({ pollingInterval: interval });
    },

    /** Stops the candidate polling interval. */
    stopPolling: () => {
        const { pollingInterval } = get();
        if (pollingInterval) {
            clearInterval(pollingInterval);
            set({ pollingInterval: null });
        }
    },

    /** Sets the currently selected candidate for the chat panel. null = broadcast mode. */
    setSelectedCandidateId: (id) => set({ selectedCandidateId: id }),

    /** Toggles the proctor's own camera. Initializes or closes the Agora RTC connection accordingly. */
    toggleProctorCamera: () => {
        const current = get().proctorCameraEnabled;
        set({ proctorCameraEnabled: !current });
        if (!current) {
            get().initRTC();
        } else {
            get().closeRTC();
        }
    },

    /**
     * Sends a chat message via Agora RTM.
     * - If candidateId is provided → publishes to that candidate's personal channel (email-based)
     * - If candidateId is null      → broadcasts to the assessment channel (all candidates)
     * Message is always stored locally regardless of RTM connection status.
     *
     * @param text        — Message content
     * @param candidateId — Target candidate ID (omit for broadcast)
     */
    sendMessage: async (text, candidateId) => {
        console.log("[CHAT] sendMessage triggered. Text:", text, "To:", candidateId);
        const { rtmClient, rtmStatus } = get();

        const newMessage: ChatMessage = {
            id: Math.random().toString(36).substring(7),
            sender: 'proctor',
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            candidateId
        };

        // Store message locally first
        set((state) => ({ messages: [...state.messages, newMessage] }));

        // Publish via RTM if connected
        if (rtmClient && rtmStatus === 'connected') {
            try {
                if (candidateId) {
                    // Direct message: publish to candidate's sanitized email channel
                    const candidate = get().candidates.find(c => c.id === candidateId);
                    const rawTarget = (candidate?.email || candidateId);
                    const target = rawTarget.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                    console.log("[RTM] Publishing PRIVATE message to:", target, "Text:", text);
                    await rtmClient.publish(target, text);
                } else {
                    // Broadcast: publish to assessment-wide channel
                    const broadcastChannel = get().assessmentId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                    console.log("[RTM] Publishing BROADCAST message to:", broadcastChannel, "Text:", text);
                    await rtmClient.publish(broadcastChannel, text);
                }
            } catch (err) {
                console.error("[RTM] Failed to send RTM message:", err);
            }
        } else {
            console.warn("[RTM] Client not connected, message stored locally only.");
        }
    },

    /**
     * Initializes Agora RTM (Real-Time Messaging) for proctor-candidate chat.
     *
     * Steps:
     *   1. Sanitizes proctor email & assessment ID (alphanumeric only) for RTM compatibility
     *   2. Fetches an RTM token from: GET /agora/rtm-token?userAccount=...
     *   3. Logs in to RTM with the token
     *   4. Subscribes to the assessment-wide channel for broadcast messages
     *   5. Listens for incoming messages and connection status changes
     *
     * Guard: Skips initialization if already connected or connecting.
     * Incoming messages from candidates are matched to Candidate records by sanitized email/ID.
     */
    initRTM: async () => {
        const { proctorEmail, assessmentId, rtmClient, rtmStatus } = get();

        // CLEANUP: If there's an existing client (even if it's in an error state), log it out and clear it
        const currentClient = get().rtmClient;
        if (currentClient) {
            console.log("[RTM] Cleaning up existing client before fresh init...");
            try {
                await currentClient.logout();
            } catch (e) {
                // Ignore logout errors if already disconnected
            }
            set({ rtmClient: null, rtmStatus: 'idle' });
        }

        if (!proctorEmail || !assessmentId) {
            return;
        }

        set({ rtmStatus: 'connecting', rtmError: null });

        try {
            const appId = AGORA_CONFIG.appId;

            // Sanitize IDs: only allow alphanumeric chars for RTM compatibility
            const safeRtmId = (id: string) => id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            const loginEmail = safeRtmId(proctorEmail);
            const subAssessmentId = safeRtmId(assessmentId);

            if (!loginEmail) {
                throw new Error("Proctor email is empty after cleaning");
            }

            const client = new AgoraRTM.RTM(appId, loginEmail, {
                presenceTimeout: 300
            });
            console.log("[RTM] Initializing for user:", loginEmail);

            // API: GET /agora/rtm-token?userAccount=... — fetches RTM authentication token
            const rtmTokenUrl = `${API_BASE_URL}/agora/rtm-token`;
            console.log("[RTM] Fetching token from:", rtmTokenUrl);
            
            const response = await axios.get(rtmTokenUrl, {
                params: { userAccount: loginEmail }
            });
            const { token } = response.data;
            console.log("[RTM] Token received:", token ? "YES (Success)" : "NO (Empty)");

            if (!token) {
                throw new Error("Backend returned an empty RTM token");
            }

            await client.login({ token });

            // Subscribe to assessment-wide broadcast channel
            console.log("[RTM] Subscribing to broadcast:", subAssessmentId);
            await client.subscribe(subAssessmentId);
            
            // NEW: Subscribe to private channel (proctor's sanitized email) to receive direct replies
            console.log("[RTM] Subscribing to private:", loginEmail);
            await client.subscribe(loginEmail);

            // NEW: Subscribe to candidate-to-proctor channel
            console.log("[RTM] Subscribing to candidate-to-proctor channel:", `proctor_${subAssessmentId}`);
            await client.subscribe(`proctor_${subAssessmentId}`);
            
            console.log("[RTM] Subscription SUCCESS.");

            // Listen for incoming messages from candidates
            client.addEventListener('message', (event: any) => {
                console.log("[RTM] Raw message received event:", event);
                const publisher = event.publisher;
                
                // Skip our own echoed messages (RTM v2 echoes channel messages)
                if (publisher.toLowerCase() === loginEmail.toLowerCase()) {
                    return;
                }

                // Check if this is a broadcast message (from the assessment channel)
                const isBroadcast = event.channelName === subAssessmentId;

                // Match publisher to a known candidate by sanitized email or ID
                const candidate = get().candidates.find(c =>
                    c.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === publisher.toLowerCase() ||
                    c.id.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === publisher.toLowerCase()
                );

                const candidateId = candidate ? candidate.id : publisher;

                const messageText = typeof event.message === 'string' ? event.message : (event.message?.data || event.message?.text || event.message?.toString() || "");

                const msg: ChatMessage = {
                    id: Math.random().toString(36).substring(7),
                    sender: 'candidate',
                    text: messageText,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    // If it's a broadcast, we leave candidateId undefined so it shows in the "All" view
                    candidateId: isBroadcast ? undefined : candidateId
                };

                set((state) => ({ messages: [...state.messages, msg] }));
            });

            // Track RTM connection status changes
            client.addEventListener('status', (event: any) => {
                console.log("[RTM] Connection status change:", event.state, event.reason || "");
                
                if (event.state === 'CONNECTED') {
                    set({ rtmStatus: 'connected', rtmError: null });
                } else if (event.state === 'DISCONNECTED' || event.state === 'FAILED') {
                    set({ rtmStatus: 'error', rtmError: event.reason || 'Connection lost' });
                    
                    // AUTO-RECONNECT: If we aren't deliberately logging out, try to reconnect in 5s
                    if (get().rtmStatus !== 'disconnected') {
                        console.log("[RTM] Connection lost. Attempting auto-reconnect in 5 seconds...");
                        setTimeout(() => {
                            if (get().rtmStatus !== 'connected') {
                                get().initRTM();
                            }
                        }, 5000);
                    }
                }
            });

            set({ rtmClient: client, rtmStatus: 'connected', rtmError: null });
        } catch (err: any) {
            console.error("[RTM] Init failed:", err);
            set({ rtmStatus: 'error', rtmError: err.message || String(err) });
        }
    },

    /** Disconnects from Agora RTM. Sets status to 'disconnected' before logout to prevent race conditions. */
    logoutRTM: async () => {
        const { rtmClient } = get();

        if (rtmClient) {
            try {
                set({ rtmStatus: 'disconnected', rtmClient: null });
                await rtmClient.logout();
            } catch (err) {
                console.error("[RTM] Logout failed:", err);
            }
        } else {
            set({ rtmStatus: 'disconnected' });
        }
    },

    /**
     * Initializes Agora RTC to publish the proctor's camera feed.
     * Channel: {assessmentId}_proctor_video (UID: 1)
     * API: GET /agora/token?channelName=...&uid=1 — fetches RTC token
     * Creates a local camera video track and publishes it to the channel.
     */
    initRTC: async () => {
        const { assessmentId, rtcClient } = get();
        if (!assessmentId || rtcClient) return;

        try {
            const channelName = `${assessmentId}_proctor_video`.toLowerCase();
            const uid = 1;

            // API: GET /agora/token?channelName=...&uid=... — fetches RTC authentication token
            const response = await axios.get(`${AGORA_CONFIG.tokenUrl}?channelName=${channelName}&uid=${uid}`);
            const { token } = response.data;

            const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
            await client.join(AGORA_CONFIG.appId, channelName, token, uid);

            const videoTrack = await AgoraRTC.createCameraVideoTrack();
            await client.publish([videoTrack]);

            set({ rtcClient: client, localVideoTrack: videoTrack });
        } catch (err) {
            console.error("Proctor RTC Init failed:", err);
            set({ proctorCameraEnabled: false });
        }
    },

    /** Stops and closes the proctor's local camera track, then leaves the RTC channel. */
    closeRTC: async () => {
        const { rtcClient, localVideoTrack } = get();
        if (localVideoTrack) {
            localVideoTrack.stop();
            localVideoTrack.close();
        }
        if (rtcClient) {
            await rtcClient.leave();
        }
        set({ rtcClient: null, localVideoTrack: null });
    }
}));
