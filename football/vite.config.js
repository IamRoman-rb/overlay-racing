import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// Interfaz del módulo de fútbol. Se sirve en el puerto 5174 (Carrera usa el 5173) y se compila a football/dist.
// Las librerías (react, socket.io-client, ...) se resuelven desde node_modules de la raíz del repo.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  base: './',
  server: { port: 5174, strictPort: true },
  // Igual que en carrera: vMix 23 y anteriores embeben un Chromium viejo, así que se baja la sintaxis.
  build: { target: 'es2017', outDir: 'dist', emptyOutDir: true },
})
