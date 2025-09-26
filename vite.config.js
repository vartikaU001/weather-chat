import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on all addresses, use http://localhost or your LAN IP
    port: 5173,
    strictPort: false,
    open: true,
  },
})
