import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// El lint cubre sólo el código que mantiene el proyecto. Todo lo que es
// salida de un build, dependencias, binarios empaquetados o copias de trabajo
// de herramientas queda fuera de forma explícita (no por omisión).
export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '.claude/**',            // worktrees y estado de Claude Code
    'release/**',            // salida de electron-builder
    'release-modules/**',    // paquetes de npm run module:pack
    'dist/**',
    'dist-ssr/**',
    'race/dist/**',
    'football/dist/**',
    'chromium/**',           // Chromium empaquetado por bundle-chromium.cjs
    'graphify-out/**',
    'coverage/**',
  ]),

  // Interfaz web (React) de los módulos: corre en el navegador / overlay.
  {
    files: ['race/src/**/*.{js,jsx}', 'football/src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  // Proceso principal de Electron, servidores de los módulos, scripts de
  // distribución, pruebas y archivos de configuración: corren en Node.
  {
    files: [
      '**/*.cjs',
      '**/*.mjs',
      'eslint.config.js',
      'race/vite.config.js',
      'football/vite.config.js',
    ],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
])
