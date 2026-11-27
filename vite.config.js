import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_BASE: "/" locally and in Docker, "/<repo-name>/" for GitHub Pages.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE || '/',
    plugins: [react()],
    server: {
      host: true,          // listen on 0.0.0.0 so Docker / Codespaces can reach it
      port: 5173,
      strictPort: true,
      watch: { usePolling: !!env.CHOKIDAR_USEPOLLING }, // file changes inside Docker on Windows
    },
    preview: { host: true, port: 4173 },
  }
})
