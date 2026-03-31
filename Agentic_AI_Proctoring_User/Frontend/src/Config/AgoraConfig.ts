export const AGORA_CONFIG = {
  appId: import.meta.env.VITE_AGORA_APP_ID || "YOUR_AGORA_APP_ID",
  token: null, // Tokens will now be fetched dynamically
  tokenUrl: "http://localhost:8000/agora/token"
};
