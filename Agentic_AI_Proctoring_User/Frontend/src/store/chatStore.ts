// # FILE: chatStore.ts - Zustand store for Agora RTM chat state management.
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
                // If we have a proctor email, send to their private channel
                const rawProctor = localStorage.getItem('proctor_email');
                if (rawProctor) {
                    const target = rawProctor.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                    console.log(`[RTM] Candidate sending PRIVATE message to proctor: [${target}]`);
                    await rtmClient.publish(target, text);
                } else {
                    // Fallback to broadcast if proctor not found (unlikely)
                    console.log(`[RTM] Candidate broadcasting to channel: [${assessmentId}]`);
                    await rtmClient.publish(assessmentId, text);
                }
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

        if (!loginEmail || !subAssessmentId || rtmClient) return;

        set({ rtmStatus: 'connecting', rtmError: null });

        try {
            // Use sanitized App ID from .env
            const appId = (import.meta.env.VITE_AGORA_APP_ID || "").replace(/"/g, '').trim();
            const client = new AgoraRTM.RTM(appId, loginEmail, {
                presenceTimeout: 300
            });

            const response = await axios.get(`${API_BASE_URL}/agora/rtm-token`, {
                params: { userAccount: loginEmail }
            });
            const { token } = response.data;

            await client.login({ token });

            // Subscribe sequentially with delay to prevent timeouts
            await client.subscribe(subAssessmentId);
            await new Promise(resolve => setTimeout(resolve, 500));
            await client.subscribe(loginEmail);

            client.addEventListener('message', (event: any) => {
                const publisher = event.publisher;
                if (publisher.toLowerCase() === loginEmail.toLowerCase()) return;

                // Smart Message Reader (handles strings and objects)
                const messageText = typeof event.message === 'string' ? event.message : (event.message?.data || event.message?.text || event.message?.toString() || "");

                const msg: ChatMessage = {
                    id: Math.random().toString(36).substring(7),
                    sender: 'proctor',
                    text: messageText,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };

                set((state) => ({
                    messages: [...state.messages, msg],
                    unreadCount: get().isChatOpen ? 0 : get().unreadCount + 1
                }));
            });

            client.addEventListener('status', (event: any) => {
                console.log("[RTM] Candidate connection status change:", event.state, event.reason || "");
                if (event.state === 'CONNECTED') {
                    set({ rtmStatus: 'connected' });
                } else if (event.state === 'DISCONNECTED' || event.state === 'FAILED') {
                    set({ rtmStatus: 'error', rtmError: event.reason || 'Connection lost' });

                    // AUTO-RECONNECT
                    if (get().rtmStatus !== 'disconnected') {
                        console.log("[RTM] Candidate connection lost. Reconnecting in 5s...");
                        setTimeout(() => {
                            if (get().rtmStatus !== 'connected') {
                                get().initRTM();
                            }
                        }, 5000);
                    }
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
