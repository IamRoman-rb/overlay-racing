import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  // vMix 23 y anteriores embeben un Chromium viejo en su input "Web Browser".
  // Con el target por defecto de Vite el JS usa sintaxis moderna y ese Chromium
  // lo rechaza, dejando el overlay en blanco. es2017 baja la sintaxis (JS y CSS).
  build: { target: 'es2017' },
})
