import { create } from 'zustand';
import axios from 'axios';
import AgoraRTM, { RTMClient } from 'agora-rtm';

const API_BASE_URL = 'http://192.168.0.102:8000';

export interface ChatMessage {
    id: string;
    sender: 'proctor' | 'candidate';
    text: string;
    timestamp: string;
}

interface ChatState {
    messages: ChatMessage[];
    isChatOpen: boolean;
    rtmClient: RTMClient | null;
    unreadCount: number;
    rtmStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
    rtmError: string | null;

    setChatOpen: (open: boolean) => void;
    sendMessage: (text: string) => Promise<void>;
    initRTM: () => Promise<void>;
    logoutRTM: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
    messages: [],
    isChatOpen: false,
    rtmClient: null,
    unreadCount: 0,
    rtmStatus: 'disconnected',
    rtmError: null,

    setChatOpen: (open) => set({ isChatOpen: open, unreadCount: open ? 0 : get().unreadCount }),

    sendMessage: async (text) => {
        const { rtmClient, rtmStatus } = get();
        const rawEmail = localStorage.getItem('candidate_email') || '';
        const rawAId = localStorage.getItem('assessment_id') || '';
        
        const candidateEmail = rawEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const assessmentId = rawAId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        if (!candidateEmail || !assessmentId) {
            console.error("[RTM] Missing email or assessment ID in storage");
            return;
        }

        const newMessage: ChatMessage = {
            id: Math.random().toString(36).substring(7),
            sender: 'candidate',
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        set((state) => ({ messages: [...state.messages, newMessage] }));

        if (rtmClient && rtmStatus === 'connected') {
            try {
                // Publish to assessment channel — proctor is subscribed to this channel
                console.log(`[RTM] Candidate publishing to channel: [${assessmentId}]`);
                const result = await rtmClient.publish(assessmentId, text);
                console.log("[RTM] Publish result:", result);
            } catch (err) {
                console.error("[RTM] Failed to send RTM message:", err);
            }
        } else {
            console.warn("[RTM] Client not connected, message stored locally only.");
        }
    },

    initRTM: async () => {
        const rawEmail = localStorage.getItem('candidate_email') || '';
        const rawAId = localStorage.getItem('assessment_id') || '';
        const { rtmClient } = get();

        const loginEmail = rawEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const subAssessmentId = rawAId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        console.log(`[RTM] Candidate Raw Email: [${rawEmail}], Cleaned: [${loginEmail}]`);
        console.log(`[RTM] Candidate Raw AssessmentId: [${rawAId}], Cleaned: [${subAssessmentId}]`);

        if (!loginEmail || !subAssessmentId || rtmClient) return;

        set({ rtmStatus: 'connecting', rtmError: null });

        try {
            const appId = (import.meta.env.VITE_AGORA_APP_ID || '').replace(/"/g, '').trim();
            const client = new AgoraRTM.RTM(appId, loginEmail);
            console.log("[RTM] Candidate initializing with UserAccount:", loginEmail);

            // Fetch RTM token from proctor's backend
            const response = await axios.get(`${API_BASE_URL}/agora/rtm-token`, {
                params: { userAccount: loginEmail }
            });
            const { token } = response.data;

            await client.login({ token });
            console.log("[RTM] Candidate login successful");
            
            // Subscribe to the assessment channel (to receive proctor broadcasts)
            // and own channel (to receive private messages from proctor)
            await client.subscribe(subAssessmentId);
            await client.subscribe(loginEmail);
            console.log(`[RTM] Candidate subscribed to [${subAssessmentId}] and [${loginEmail}]`);

            // Message listener
            client.addEventListener('message', (event: any) => {
                const publisher = event.publisher;
                // Avoid adding our own echoed messages
                if (publisher.toLowerCase() === loginEmail.toLowerCase()) {
                    return;
                }

                console.log("[RTM] Candidate received message event:", {
                    channelName: event.channelName,
                    publisher: publisher,
                    message: event.message
                });
                
                const msg: ChatMessage = {
                    id: Math.random().toString(36).substring(7),
                    sender: 'proctor',
                    text: typeof event.message === 'string' ? event.message : (event.message?.toString() || ''),
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                
                set((state) => ({ 
                    messages: [...state.messages, msg],
                    unreadCount: get().isChatOpen ? 0 : get().unreadCount + 1
                }));
            });

            client.addEventListener('status', (event: any) => {
                console.log("[RTM] Candidate connection status change:", event);
                if (event.state === 'CONNECTED') {
                    set({ rtmStatus: 'connected' });
                } else if (event.state === 'DISCONNECTED' || event.state === 'FAILED') {
                    set({ rtmStatus: 'error', rtmError: event.reason || 'Connection failed' });
                }
            });

            set({ rtmClient: client, rtmStatus: 'connected' });
        } catch (err: any) {
            console.error("[RTM] Candidate Init failed:", err);
            set({ rtmStatus: 'error', rtmError: err.message || String(err) });
        }
    },

    logoutRTM: async () => {
        const { rtmClient } = get();
        if (rtmClient) {
            await rtmClient.logout();
            set({ rtmClient: null, rtmStatus: 'disconnected' });
        }
    }
}));
