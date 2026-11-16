import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  base: './',
  // vMix 23 y anteriores embeben un Chromium viejo en su input "Web Browser".
  // Con el target por defecto de Vite el JS usa sintaxis moderna y ese Chromium
  // lo rechaza, dejando el overlay en blanco. es2017 baja la sintaxis (JS y CSS).
  build: {
    target: 'es2017',
    rolldownOptions: {
      output: {
        codeSplitting: {
          // React y el router cambian poco entre versiones: en su propio archivo, el navegador de vMix/OBS
          // los conserva en caché cuando se actualiza el programa (index.html no se cachea, los .js sí).
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|cookie|set-cookie-parser)[\\/]/ },
          ],
        },
      },
    },
  },
})
