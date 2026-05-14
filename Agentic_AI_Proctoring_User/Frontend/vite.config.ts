import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '../../',
  envPrefix: ['VITE_', 'AGORA_'],
  server: {
    proxy: {
      '/api': {
        target: 'https://agenticaiassessmentandproctoring-production-bc3a.up.railway.app',
        changeOrigin: true,
      },
    },
  },
})
