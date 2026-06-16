import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Porta assegnata da `shopify app dev` (via env), altrimenti default Vite (5173).
const port = Number(process.env.FRONTEND_PORT || process.env.PORT) || undefined

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Legge tutte le env (incluse non-VITE) dai file .env per la config server-side.
  const env = loadEnv(mode, process.cwd(), '')
  // Backend locale verso cui il proxy inoltra le chiamate /api (solo lato server).
  const backendTarget = env.DEV_BACKEND_URL || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      port,
      // Se la CLI assegna una porta, falliamo invece di ripiegare su un'altra
      // (altrimenti il tunnel punterebbe a una porta su cui Vite non è in ascolto).
      strictPort: port !== undefined,
      // Accetta richieste dal tunnel HTTPS aperto da `shopify app dev`
      // (necessario per caricare l'app embedded nell'admin Shopify).
      allowedHosts: ['.trycloudflare.com', 'localhost'],
      // Il frontend chiama /api/* (same-origin, HTTPS via tunnel): Vite inoltra
      // al backend http locale. Evita mixed-content e l'upgrade http->https.
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  }
})
