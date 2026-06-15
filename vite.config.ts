import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Accetta richieste dal tunnel HTTPS aperto da `shopify app dev`
    // (necessario per caricare l'app embedded nell'admin Shopify).
    allowedHosts: ['.trycloudflare.com', 'localhost'],
  },
})
