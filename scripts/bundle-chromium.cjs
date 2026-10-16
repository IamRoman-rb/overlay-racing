// Prepara la carpeta "chromium/" que electron-builder copia dentro del .exe (extraResources).
// Así el scraper de timing funciona en cualquier PC, sin Chrome, Edge ni Node instalados.
// Se ejecuta solo como parte de `npm run dist`.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const OUT_DIR = path.join(__dirname, '..', 'chromium');
const EXE_NAME = process.platform === 'win32' ? 'chrome-headless-shell.exe' : 'chrome-headless-shell';

function findExe(dir, depth = 0) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return null; }
  const hit = entries.find(en => en.isFile() && en.name === EXE_NAME);
  if (hit) return path.join(dir, hit.name);
  if (depth >= 4) return null;
  for (const en of entries) {
    if (en.isDirectory()) {
      const found = findExe(path.join(dir, en.name), depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function cacheDirectory() {
  if (process.env.PUPPETEER_CACHE_DIR) return process.env.PUPPETEER_CACHE_DIR;
  return path.join(os.homedir(), '.cache', 'puppeteer');
}

function locate() {
  return findExe(path.join(cacheDirectory(), 'chrome-headless-shell'));
}

if (findExe(OUT_DIR)) {
  console.log('✅ chromium/ ya está preparado, no se vuelve a copiar.');
  process.exit(0);
}

let exe = locate();
if (!exe) {
  console.log('⬇️  No hay Chromium descargado, instalándolo con Puppeteer (solo la primera vez)...');
  execSync('npx puppeteer browsers install chrome-headless-shell', { stdio: 'inherit' });
  exe = locate();
}
if (!exe) {
  console.error('❌ No se pudo obtener chrome-headless-shell. Revisá la conexión a internet y reintentá.');
  process.exit(1);
}

const srcDir = path.dirname(exe);
console.log(`📦 Copiando Chromium desde ${srcDir} ...`);
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.cpSync(srcDir, OUT_DIR, { recursive: true });
console.log('✅ chromium/ listo para empaquetar.');
