// Instala, actualiza y carga los módulos del software (carrera, fútbol, ...), que se descargan del servidor.
//
// Cada módulo es un .zip firmado con module.json (id, version, entry, launcherApi), su código y su interfaz ya compilada.
// Se guardan en <datos del usuario>/modules/<módulo>/<versión>/ y se abre la versión más nueva instalada, salvo que se elija
// otra desde el "Historial de actualizaciones" de la ventana de módulos.
const { app, ipcMain } = require('electron');
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

// En desarrollo (npm start) los módulos disponibles localmente se abren desde este repo, sin descargar nada.
// OVERLAY_FORCE_DOWNLOAD=1 fuerza la descarga real para probar el circuito completo.
const DEV_MODULE_DIRS = { racing: path.join(__dirname, '..', 'race'), football: path.join(__dirname, '..', 'football') };
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

// Se conservan las KEEP_VERSIONS más nuevas, más las que se pidan (por ejemplo, una versión anterior que se acaba de elegir)
function pruneOldVersions(moduleId, keep = []) {
  const versions = installedVersions(moduleId);
  versions.slice(0, Math.max(0, versions.length - KEEP_VERSIONS)).filter(v => !keep.includes(v)).forEach(v => {
    try { fs.rmSync(path.join(modulesRoot(), moduleId, v), { recursive: true, force: true }); } catch (e) {}
  });
}

function describe(moduleId, version) {
  const dir = path.join(modulesRoot(), moduleId, version);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'module.json'), 'utf-8'));
  return { moduleId, version, dir, entry: manifest.entry || 'main.cjs' };
}

// Estado de un módulo para la ventana de módulos: qué versión hay instalada y si el servidor tiene una más nueva.
// Una actualización NUNCA es obligatoria: si ya hay una versión instalada, se puede abrir sin actualizar.
async function getModuleStatus(entry, sessionToken) {
  const local = useLocalSource(entry.id);
  const installed = installedVersions(entry.id);
  const status = {
    ...entry,
    installedVersion: local ? 'dev' : (installed[installed.length - 1] || null),
    updateAvailable: false,
    updateBlocked: false,
    notes: null
  };
  // Con código local el módulo está siempre disponible, aunque el servidor todavía no tenga una versión publicada
  if (local) return { ...status, available: true };

  // Se consulta de nuevo al servidor: así aparecen también las versiones publicadas después de iniciar sesión
  try {
    const latest = await api.fetchLatest(entry.id, sessionToken);
    status.available = true;
    status.version = latest.version;
    status.notes = latest.notes || null;
    if (status.installedVersion && compareVersions(latest.version, status.installedVersion) > 0) {
      status.updateAvailable = true;
      // El módulo nuevo necesita un instalador más nuevo: se avisa, pero se puede seguir usando el instalado
      status.updateBlocked = latest.launcherApi > LAUNCHER_API;
    }
  } catch (err) {
    console.warn('[launcher] no se pudo consultar la última versión de', entry.id, '-', err.message);
    // Sin respuesta del servidor se conserva lo que ya se sabía (y lo instalado sigue abriéndose)
  }
  return status;
}

// Deja listo el módulo para abrirlo.
//  - Sin nada instalado: lo descarga (no hay otra opción).
//  - Con una versión instalada: la abre tal cual, salvo que se pida actualizar ({ update: true }).
// onStatus({ phase: 'checking' | 'downloading' | 'verifying' | 'installing', progress? })
async function ensureModule(moduleId, sessionToken, onStatus = () => {}, { update = false } = {}) {
  const local = useLocalSource(moduleId);
  if (local) return { moduleId, version: 'dev', dir: local, entry: 'main.cjs' };

  const alreadyInstalled = installedVersions(moduleId);
  if (alreadyInstalled.length && !update) return describe(moduleId, alreadyInstalled[alreadyInstalled.length - 1]);

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

  return installRelease(moduleId, latest, sessionToken, onStatus);
}

// Descarga, verifica (hash + firma) e instala la versión `release` ({ version, sha256, signature }) del módulo
async function installRelease(moduleId, release, sessionToken, onStatus = () => {}, { keep = [] } = {}) {
  const workDir = path.join(modulesRoot(), moduleId);
  fs.mkdirSync(workDir, { recursive: true });
  const zipFile = path.join(workDir, `${release.version}.download.zip`);
  const stagingDir = path.join(workDir, `${release.version}.partial`);
  const finalDir = path.join(workDir, release.version);

  try {
    onStatus({ phase: 'downloading', progress: 0 });
    await api.downloadPackage(moduleId, release.version, sessionToken, zipFile, progress => onStatus({ phase: 'downloading', progress }));

    onStatus({ phase: 'verifying' });
    const sha256 = await sha256File(zipFile);
    if (sha256 !== release.sha256) throw new Error('La descarga quedó corrupta (no coincide el hash). Probá de nuevo.');
    verifyPackage(moduleId, release.version, sha256, release.signature);

    onStatus({ phase: 'installing' });
    fs.rmSync(stagingDir, { recursive: true, force: true });
    fs.rmSync(finalDir, { recursive: true, force: true });
    extractSafely(zipFile, stagingDir);
    const manifest = JSON.parse(fs.readFileSync(path.join(stagingDir, 'module.json'), 'utf-8'));
    if (manifest.id !== moduleId || manifest.version !== release.version) throw new Error('El paquete no corresponde al módulo pedido.');
    fs.writeFileSync(path.join(stagingDir, COMPLETE_MARK), new Date().toISOString());
    fs.renameSync(stagingDir, finalDir);
  } finally {
    fs.rmSync(zipFile, { force: true });
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }

  pruneOldVersions(moduleId, [release.version, ...keep]);
  return describe(moduleId, release.version);
}

// Abre una versión elegida del historial: si no está instalada, la descarga del servidor.
async function ensureModuleVersion(moduleId, version, sessionToken, onStatus = () => {}) {
  if (!/^\d+\.\d+\.\d+$/.test(String(version))) throw new Error('Versión inválida.');
  if (installedVersions(moduleId).includes(version)) return describe(moduleId, version);
  onStatus({ phase: 'checking' });
  const releases = await api.fetchReleases(moduleId, sessionToken);
  const release = releases.find(r => r.version === version);
  if (!release) throw new Error(`La versión ${version} ya no está disponible en el servidor.`);
  if (release.launcherApi > LAUNCHER_API) {
    throw new Error('Esa versión necesita un instalador más nuevo. Descargá el instalador actualizado desde la web.');
  }
  return installRelease(moduleId, release, sessionToken, onStatus);
}

// Historial para la ventana de módulos: versiones publicadas (con notas y fecha) marcando cuáles ya están en esta PC.
// Si el servidor no responde, se muestran al menos las versiones instaladas.
async function getModuleReleases(moduleId, sessionToken) {
  const installed = installedVersions(moduleId);
  let releases = [];
  let error = null;
  try {
    releases = await api.fetchReleases(moduleId, sessionToken);
  } catch (err) {
    error = err.message || 'No se pudo consultar el historial de versiones.';
  }
  const list = releases.map(r => ({
    version: r.version, notes: r.notes || null, releasedAt: r.releasedAt || null, size: r.size || 0,
    installed: installed.includes(r.version), blocked: r.launcherApi > LAUNCHER_API
  }));
  installed.forEach(v => {
    if (!list.some(r => r.version === v)) list.push({ version: v, notes: null, releasedAt: null, size: 0, installed: true, blocked: false, localOnly: true });
  });
  list.sort((x, y) => compareVersions(y.version, x.version));
  return { releases: list, newestInstalled: installed[installed.length - 1] || null, error };
}

// Los módulos corren dentro de este mismo proceso: si se abre otra versión del mismo módulo sin cerrar el programa (una
// actualización o una versión anterior del historial), sus canales `ipcMain.handle` ya están registrados por la versión
// anterior y Electron rechaza registrarlos de nuevo ("Attempted to register a second handler"). Con esto, registrar un
// canal reemplaza al anterior: así funciona también con versiones viejas de los módulos, que no se pueden cambiar.
function allowHandlerReplacement() {
  if (ipcMain.overlayHandlerReplacement) return;
  const originalHandle = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = (channel, listener) => {
    ipcMain.removeHandler(channel);
    return originalHandle(channel, listener);
  };
  ipcMain.overlayHandlerReplacement = true;
}

// Carga el código del módulo dentro de este mismo proceso. Los módulos usan las librerías (express, socket.io,
// puppeteer, ...) que trae el instalador, así que se agregan sus carpetas a la búsqueda de require().
function loadModule(installed, ctx) {
  allowHandlerReplacement();
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

module.exports = { ensureModule, ensureModuleVersion, getModuleReleases, getModuleStatus, loadModule, installedVersions };
