// Instala, actualiza y carga los módulos del software (carrera, fútbol, ...), que se descargan del servidor.
//
// Cada módulo es un .zip firmado con module.json (id, version, entry, launcherApi), su código y su interfaz ya compilada.
// Se guardan en <datos del usuario>/modules/<módulo>/<versión>/ y se abre siempre la versión más nueva.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Module = require('module');
const AdmZip = require('adm-zip');
const api = require('./api.cjs');
const { LAUNCHER_API } = require('./config.cjs');

const modulesRoot = () => path.join(app.getPath('userData'), 'modules');
const COMPLETE_MARK = '.complete';
const KEEP_VERSIONS = 2;

// En desarrollo (npm start) el módulo de carrera se abre directo desde el código de este repo, sin descargar nada.
// OVERLAY_FORCE_DOWNLOAD=1 fuerza la descarga real para probar el circuito completo.
const DEV_MODULE_DIRS = { racing: path.join(__dirname, '..') };
const useLocalSource = (moduleId) => !app.isPackaged && !process.env.OVERLAY_FORCE_DOWNLOAD && DEV_MODULE_DIRS[moduleId];

const compareVersions = (a, b) => {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
};

function installedVersions(moduleId) {
  const dir = path.join(modulesRoot(), moduleId);
  try {
    return fs.readdirSync(dir)
      .filter(v => /^\d+\.\d+\.\d+$/.test(v) && fs.existsSync(path.join(dir, v, COMPLETE_MARK)))
      .sort(compareVersions);
  } catch (e) { return []; }
}

function readPublicKey() {
  try { return crypto.createPublicKey(fs.readFileSync(path.join(__dirname, 'release-public-key.pem'), 'utf-8')); }
  catch (e) { return null; }
}

// La firma cubre módulo + versión + hash: sólo el servidor propio (que tiene la clave privada) puede publicar código
function verifyPackage(moduleId, version, sha256, signature) {
  const key = readPublicKey();
  if (!key) {
    if (app.isPackaged) throw new Error('El instalador no tiene la clave para verificar los módulos. Reinstalalo.');
    console.warn('[launcher] sin launcher/release-public-key.pem: se omite la verificación de firma (sólo desarrollo)');
    return;
  }
  const ok = signature && crypto.verify(null, Buffer.from(`${moduleId}:${version}:${sha256}`), key, Buffer.from(signature, 'base64'));
  if (!ok) throw new Error('El paquete descargado no tiene una firma válida y no se va a ejecutar.');
}

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(file).on('data', d => hash.update(d)).on('end', () => resolve(hash.digest('hex'))).on('error', reject);
  });
}

// Extrae el zip a mano (en vez de extractAllTo) para rechazar cualquier ruta que se salga de la carpeta destino
function extractSafely(zipFile, destDir) {
  const zip = new AdmZip(zipFile);
  const root = path.resolve(destDir) + path.sep;
  for (const entry of zip.getEntries()) {
    const target = path.resolve(destDir, entry.entryName);
    if (!target.startsWith(root)) throw new Error(`Paquete inválido (ruta fuera de la carpeta): ${entry.entryName}`);
    if (entry.isDirectory) { fs.mkdirSync(target, { recursive: true }); continue; }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, entry.getData());
  }
}

function pruneOldVersions(moduleId) {
  const versions = installedVersions(moduleId);
  versions.slice(0, Math.max(0, versions.length - KEEP_VERSIONS)).forEach(v => {
    try { fs.rmSync(path.join(modulesRoot(), moduleId, v), { recursive: true, force: true }); } catch (e) {}
  });
}

function describe(moduleId, version) {
  const dir = path.join(modulesRoot(), moduleId, version);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'module.json'), 'utf-8'));
  return { moduleId, version, dir, entry: manifest.entry || 'main.cjs' };
}

// Deja listo el módulo: usa el instalado si ya es la última versión, o descarga la nueva.
// onStatus({ phase: 'checking' | 'downloading' | 'verifying' | 'installing', progress? })
async function ensureModule(moduleId, sessionToken, onStatus = () => {}) {
  const local = useLocalSource(moduleId);
  if (local) return { moduleId, version: 'dev', dir: local, entry: 'main.cjs' };

  onStatus({ phase: 'checking' });
  let latest;
  try {
    latest = await api.fetchLatest(moduleId, sessionToken);
  } catch (err) {
    // Sin respuesta del servidor se abre lo que ya está instalado, si hay algo
    const installed = installedVersions(moduleId);
    if (installed.length) {
      console.warn('[launcher] no se pudo consultar actualizaciones, se abre la versión instalada:', err.message);
      return describe(moduleId, installed[installed.length - 1]);
    }
    throw err;
  }

  if (latest.launcherApi > LAUNCHER_API) {
    throw new Error('Este módulo necesita una versión más nueva del instalador. Descargá el instalador actualizado desde la web.');
  }

  if (installedVersions(moduleId).includes(latest.version)) return describe(moduleId, latest.version);

  const workDir = path.join(modulesRoot(), moduleId);
  fs.mkdirSync(workDir, { recursive: true });
  const zipFile = path.join(workDir, `${latest.version}.download.zip`);
  const stagingDir = path.join(workDir, `${latest.version}.partial`);
  const finalDir = path.join(workDir, latest.version);

  try {
    onStatus({ phase: 'downloading', progress: 0 });
    await api.downloadPackage(moduleId, latest.version, sessionToken, zipFile, progress => onStatus({ phase: 'downloading', progress }));

    onStatus({ phase: 'verifying' });
    const sha256 = await sha256File(zipFile);
    if (sha256 !== latest.sha256) throw new Error('La descarga quedó corrupta (no coincide el hash). Probá de nuevo.');
    verifyPackage(moduleId, latest.version, sha256, latest.signature);

    onStatus({ phase: 'installing' });
    fs.rmSync(stagingDir, { recursive: true, force: true });
    fs.rmSync(finalDir, { recursive: true, force: true });
    extractSafely(zipFile, stagingDir);
    const manifest = JSON.parse(fs.readFileSync(path.join(stagingDir, 'module.json'), 'utf-8'));
    if (manifest.id !== moduleId || manifest.version !== latest.version) throw new Error('El paquete no corresponde al módulo pedido.');
    fs.writeFileSync(path.join(stagingDir, COMPLETE_MARK), new Date().toISOString());
    fs.renameSync(stagingDir, finalDir);
  } finally {
    fs.rmSync(zipFile, { force: true });
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }

  pruneOldVersions(moduleId);
  return describe(moduleId, latest.version);
}

// Carga el código del módulo dentro de este mismo proceso. Los módulos usan las librerías (express, socket.io,
// puppeteer, ...) que trae el instalador, así que se agregan sus carpetas a la búsqueda de require().
function loadModule(installed, ctx) {
  const appRoot = app.getAppPath();
  const searchPaths = [
    path.join(appRoot, 'node_modules'),
    path.join(`${appRoot}.unpacked`, 'node_modules')
  ];
  process.env.NODE_PATH = [...searchPaths, process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
  Module._initPaths();

  global.overlayModuleCtx = { ...ctx, moduleId: installed.moduleId, moduleVersion: installed.version, moduleDir: installed.dir };
  const entryFile = path.join(installed.dir, installed.entry);
  const mod = require(entryFile);
  if (typeof mod.start !== 'function') throw new Error(`El módulo ${installed.moduleId} no exporta start().`);
  return mod.start(global.overlayModuleCtx);
}

module.exports = { ensureModule, loadModule, installedVersions };
