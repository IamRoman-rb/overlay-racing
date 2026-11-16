// scripts/bundle-chromium.cjs: prepara chromium/ para el instalador a partir de la caché de Puppeteer.
// Todo en carpetas temporales; la "instalación" de Chrome se reemplaza por una función de prueba (sin red).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { findExe, prepare, cacheDirectory } = require('../scripts/bundle-chromium.cjs');

const EXE = 'chrome.exe';

function sandbox(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'overlay-chromium-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, outDir: path.join(root, 'chromium'), cacheDir: path.join(root, 'cache') };
}

function fakeChrome(dir, extra = {}) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, EXE), 'exe');
  for (const [name, data] of Object.entries(extra)) fs.writeFileSync(path.join(dir, name), data);
  return path.join(dir, EXE);
}

const quiet = { log: () => {}, logError: () => {} };

test('findExe: encuentra el ejecutable hasta 4 niveles de profundidad', (t) => {
  const { root } = sandbox(t);
  const exe = fakeChrome(path.join(root, 'a', 'b', 'c', 'd'));
  assert.equal(findExe(root, 0, EXE), exe);
  fakeChrome(path.join(root, 'x1', 'x2', 'x3', 'x4', 'x5', 'x6'));
  assert.equal(findExe(path.join(root, 'x1'), 0, EXE), null, 'más profundo no se busca');
  assert.equal(findExe(path.join(root, 'no-existe'), 0, EXE), null);
});

test('si chromium/ ya está preparado no copia ni descarga nada', (t) => {
  const { outDir, cacheDir } = sandbox(t);
  fakeChrome(path.join(outDir, 'chrome-win64'));
  let installs = 0;
  assert.equal(prepare({ outDir, cacheDir, exeName: EXE, install: () => { installs++; }, ...quiet }), 0);
  assert.equal(installs, 0);
});

test('copia Chrome desde la caché de Puppeteer a chromium/ (la carpeta completa, con sus recursos)', (t) => {
  const { outDir, cacheDir } = sandbox(t);
  fakeChrome(path.join(cacheDir, 'chrome', 'win64-152.0', 'chrome-win64'), { 'resources.pak': 'pak' });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'resto-viejo.txt'), 'se borra');
  assert.equal(prepare({ outDir, cacheDir, exeName: EXE, install: () => assert.fail('no debería descargar'), ...quiet }), 0);
  assert.deepEqual(fs.readdirSync(outDir).sort(), [EXE, 'resources.pak']);
});

test('sin Chrome en caché lo instala una vez y lo copia', (t) => {
  const { outDir, cacheDir } = sandbox(t);
  let installs = 0;
  const install = () => { installs++; fakeChrome(path.join(cacheDir, 'chrome', 'win64-1', 'chrome-win64')); };
  assert.equal(prepare({ outDir, cacheDir, exeName: EXE, install, ...quiet }), 0);
  assert.equal(installs, 1);
  assert.ok(fs.existsSync(path.join(outDir, EXE)));
});

test('si no se puede conseguir Chrome termina con error y no deja chromium/', (t) => {
  const { outDir, cacheDir } = sandbox(t);
  const errors = [];
  assert.equal(prepare({ outDir, cacheDir, exeName: EXE, install: () => {}, log: () => {}, logError: (m) => errors.push(m) }), 1);
  assert.match(errors[0], /No se pudo obtener Chrome/);
  assert.equal(fs.existsSync(outDir), false);
});

test('la caché de Puppeteer respeta PUPPETEER_CACHE_DIR', () => {
  assert.equal(cacheDirectory({ PUPPETEER_CACHE_DIR: '/cache/propia' }), '/cache/propia');
  assert.equal(cacheDirectory({}), path.join(os.homedir(), '.cache', 'puppeteer'));
});
