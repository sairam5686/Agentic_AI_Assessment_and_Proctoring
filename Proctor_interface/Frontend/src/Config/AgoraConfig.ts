/**
 * Agora SDK Configuration
 * - appId: Unique Agora project App ID used for both RTC (video) and RTM (messaging) services.
 * - tokenUrl: Backend endpoint to fetch temporary RTC tokens for secure channel access.
 *   Also used to derive the RTM token URL by replacing '/token' with '/rtm-token'.
 */
export const AGORA_CONFIG = {
  appId: import.meta.env.VITE_AGORA_APP_ID,
  tokenUrl: "http://localhost:8000/agora/token"
};
