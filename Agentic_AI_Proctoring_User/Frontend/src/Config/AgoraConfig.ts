import API_USER_URL from './apiConfig';

export const AGORA_CONFIG = {
  appId: import.meta.env.VITE_AGORA_APP_ID || "YOUR_AGORA_APP_ID",
  token: null, // Tokens will now be fetched dynamically
  tokenUrl: `${API_USER_URL}/agora/token`
};
