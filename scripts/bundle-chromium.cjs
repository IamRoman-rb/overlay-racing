// Prepara la carpeta "chromium/" que electron-builder copia dentro del instalador (extraResources).
// Se usa Chrome COMPLETO y no chrome-headless-shell: este último es un programa de consola, y al
// lanzarlo desde una app de escritorio Windows abre varias ventanas de terminal (cmd) visibles.
// Así el scraper de timing funciona en cualquier PC, sin Chrome, Edge ni Node instalados.
// Se ejecuta solo como parte de `npm run dist` (las funciones se exportan para las pruebas).
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const OUT_DIR = path.join(__dirname, '..', 'chromium');
const EXE_NAME = process.platform === 'win32' ? 'chrome.exe' : 'chrome';

function findExe(dir, depth = 0, exeName = EXE_NAME) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
  const hit = entries.find(en => en.isFile() && en.name === exeName);
  if (hit) return path.join(dir, hit.name);
  if (depth >= 4) return null;
  for (const en of entries) {
    if (en.isDirectory()) {
      const found = findExe(path.join(dir, en.name), depth + 1, exeName);
      if (found) return found;
    }
  }
  return null;
}

function cacheDirectory(env = process.env) {
  if (env.PUPPETEER_CACHE_DIR) return env.PUPPETEER_CACHE_DIR;
  return path.join(os.homedir(), '.cache', 'puppeteer');
}

// Devuelve 0 si chromium/ quedó listo y 1 si no se pudo conseguir Chrome.
function prepare({
  outDir = OUT_DIR,
  cacheDir = cacheDirectory(),
  exeName = EXE_NAME,
  install = () => execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' }),
  log = console.log,
  logError = console.error,
} = {}) {
  const locate = () => findExe(path.join(cacheDir, 'chrome'), 0, exeName);

  if (findExe(outDir, 0, exeName)) {
    log('✅ chromium/ ya está preparado, no se vuelve a copiar.');
    return 0;
  }

  let exe = locate();
  if (!exe) {
    log('⬇️  No hay Chromium descargado, instalándolo con Puppeteer (solo la primera vez)...');
    install();
    exe = locate();
  }
  if (!exe) {
    logError('❌ No se pudo obtener Chrome. Revisá la conexión a internet y reintentá.');
    return 1;
  }

  const srcDir = path.dirname(exe);
  log(`📦 Copiando Chromium desde ${srcDir} ...`);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.cpSync(srcDir, outDir, { recursive: true });
  log('✅ chromium/ listo para empaquetar.');
  return 0;
}

module.exports = { findExe, cacheDirectory, prepare };

if (require.main === module) {
  process.exit(prepare());
}
