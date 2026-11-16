// Arnés para probar el launcher de Electron sin Electron, sin red externa y sin credenciales reales:
//  - un módulo `electron` falso (app, BrowserWindow, ipcMain) que se inyecta en require.cache;
//  - un servidor de licencias/módulos falso en 127.0.0.1 (puerto libre) al que apunta OVERLAY_SERVER_URL;
//  - paquetes de módulo .zip firmados con una clave Ed25519 creada en la prueba (la pública reemplaza, sólo en
//    memoria, a launcher/release-public-key.pem mientras dura la prueba).
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const Module = require('module');
const { EventEmitter } = require('events');
const AdmZip = require('adm-zip');

const REPO = path.resolve(__dirname, '..', '..');
const LAUNCHER_DIR = path.join(REPO, 'launcher');
const ELECTRON_PATH = require.resolve('electron', { paths: [LAUNCHER_DIR] });

function tempDir(prefix = 'overlay-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ---------------------------------------------------------------- electron falso
function createFakeElectron({ userData, appData = userData, isPackaged = false, lock = true, version = '9.9.9' } = {}) {
  const calls = { quit: 0, exit: [], setPath: [] };
  let resolveReady;
  const ready = new Promise(r => { resolveReady = r; });
  const paths = { userData, appData };

  const app = new EventEmitter();
  Object.assign(app, {
    isPackaged,
    calls,
    getPath: (name) => paths[name] || os.tmpdir(),
    setPath: (name, value) => { paths[name] = value; calls.setPath.push([name, value]); },
    requestSingleInstanceLock: () => lock,
    exit: (code) => { calls.exit.push(code); },
    quit: () => { calls.quit++; },
    getVersion: () => version,
    getAppPath: () => REPO,
    whenReady: () => ready,
    fireReady: () => { resolveReady(); return ready.then(() => new Promise(r => setImmediate(r))); },
  });

  class BrowserWindow extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.url = null;
      this.destroyed = false;
      this.visible = true;
      this.focused = false;
      this.sent = [];
      this.webContents = { send: (channel, payload) => this.sent.push([channel, payload]) };
      BrowserWindow.all.push(this);
    }
    loadURL(url) { this.url = url; return Promise.resolve(); }
    close() {
      if (this.destroyed) return;
      this.destroyed = true;
      BrowserWindow.all = BrowserWindow.all.filter(w => w !== this);
      this.emit('closed');
    }
    isDestroyed() { return this.destroyed; }
    isMinimized() { return false; }
    restore() {}
    focus() { this.focused = true; }
    show() { this.visible = true; }
    static getAllWindows() { return [...BrowserWindow.all]; }
  }
  BrowserWindow.all = [];

  // Igual que Electron: registrar dos veces el mismo canal con handle() es un error.
  const handlers = new Map();
  const listeners = new Map();
  const ipcMain = {
    handle(channel, fn) {
      if (handlers.has(channel)) throw new Error(`Attempted to register a second handler for '${channel}'`);
      handlers.set(channel, fn);
    },
    removeHandler(channel) { handlers.delete(channel); },
    on(channel, fn) { listeners.set(channel, fn); },
  };
  const invoke = (channel, ...args) => {
    const fn = handlers.get(channel);
    if (!fn) throw new Error(`Sin handler para ${channel}`);
    return fn({ sender: null }, ...args);
  };
  const emit = (channel, ...args) => listeners.get(channel)({ sender: null }, ...args);

  return { app, BrowserWindow, ipcMain, invoke, emit, handlers };
}

// Carga módulos del launcher con un electron falso y estado limpio (sin caché de una carga anterior).
function loadWithFakeElectron(fake, request, { serverUrl } = {}) {
  for (const key of Object.keys(require.cache)) if (key.startsWith(LAUNCHER_DIR + path.sep)) delete require.cache[key];
  const m = new Module(ELECTRON_PATH);
  m.filename = ELECTRON_PATH;
  m.loaded = true;
  m.exports = fake;
  require.cache[ELECTRON_PATH] = m;
  const prevUrl = process.env.OVERLAY_SERVER_URL;
  if (serverUrl) process.env.OVERLAY_SERVER_URL = serverUrl;
  const consoleBackup = { log: console.log, warn: console.warn, error: console.error };
  let exports;
  try {
    exports = require(path.join(LAUNCHER_DIR, request));
  } finally {
    if (prevUrl === undefined) delete process.env.OVERLAY_SERVER_URL; else process.env.OVERLAY_SERVER_URL = prevUrl;
  }
  const restore = () => {
    Object.assign(console, consoleBackup); // logger.cjs reemplaza console.* para copiar al archivo de log
    delete require.cache[ELECTRON_PATH];
    for (const key of Object.keys(require.cache)) if (key.startsWith(LAUNCHER_DIR + path.sep)) delete require.cache[key];
  };
  return { exports, restore };
}

// ---------------------------------------------------------------- firma y paquetes
function createSigner() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const sign = (moduleId, version, sha256) => crypto.sign(null, Buffer.from(`${moduleId}:${version}:${sha256}`), privateKey).toString('base64');
  return { publicPem, sign };
}

// Mientras está activo, la clave pública del launcher es la de la prueba.
function useTestPublicKey(publicPem) {
  const original = fs.readFileSync;
  fs.readFileSync = function patched(file, ...rest) {
    if (typeof file === 'string' && file.endsWith(`${path.sep}release-public-key.pem`)) return publicPem;
    return original.call(this, file, ...rest);
  };
  return () => { fs.readFileSync = original; };
}

// Arma un paquete de módulo como los que publica scripts/release-modules.cjs.
// startSource: cuerpo de start(ctx) del main.cjs del módulo.
function buildModuleZip({ id, version, launcherApi = 1, entry = 'main.cjs', manifest, extraEntries = [], startSource }) {
  const zip = new AdmZip();
  const mf = manifest || { id, name: `Módulo ${id}`, version, entry, launcherApi };
  zip.addFile('module.json', Buffer.from(JSON.stringify(mf)));
  const body = startSource || `
    global.__moduleStarts = global.__moduleStarts || [];
    global.__moduleStarts.push({ id: ${JSON.stringify(id)}, version: ${JSON.stringify(version)}, ctx });
    return { started: ${JSON.stringify(`${id}@${version}`)} };`;
  zip.addFile(entry, Buffer.from(`module.exports.start = (ctx) => {${body}\n};\n`));
  zip.addFile('dist/index.html', Buffer.from('<!doctype html><title>módulo</title>'));
  // AdmZip sanea los nombres al agregarlos ("../x" queda "x"). Para simular un paquete malicioso, los `rawName`
  // se agregan con un nombre provisorio del mismo largo y después se reescriben los bytes en el zip.
  const raw = [];
  extraEntries.forEach(({ name, rawName, data }, i) => {
    if (!rawName) { zip.addFile(name, Buffer.from(data)); return; }
    const placeholder = `${String.fromCharCode(65 + i)}${'q'.repeat(rawName.length - 1)}`;
    zip.addFile(placeholder, Buffer.from(data));
    raw.push([placeholder, rawName]);
  });
  let buffer = zip.toBuffer();
  for (const [placeholder, rawName] of raw) {
    buffer = Buffer.from(buffer.toString('latin1').split(placeholder).join(rawName), 'latin1');
  }
  return buffer;
}

function makeRelease(signer, opts) {
  const zip = buildModuleZip(opts);
  const sha256 = crypto.createHash('sha256').update(zip).digest('hex');
  return {
    version: opts.version,
    launcherApi: opts.launcherApi || 1,
    notes: opts.notes || null,
    releasedAt: opts.releasedAt || null,
    size: zip.length,
    sha256,
    signature: opts.badSignature ? signer.sign(opts.id, opts.version, 'otro-hash') : signer.sign(opts.id, opts.version, sha256),
    zip,
  };
}

// ---------------------------------------------------------------- servidor falso
// state.releases: { [moduleId]: [release...] } (la más nueva primero); state.latest: { [moduleId]: version }
// state.users: { usuario: contraseña }; state.down: true => responde 503 a todo; state.corrupt: { 'id@ver': true }
async function startFakeServer(state) {
  const requests = [];
  const sendJson = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      requests.push({ method: req.method, url: req.url, auth: req.headers.authorization || null });
      if (state.down) return sendJson(res, 503, { error: 'Servidor en mantenimiento' });
      if (req.method === 'POST' && req.url === '/api/public/license/login') {
        const { username, password, machineId } = JSON.parse(body || '{}');
        if (!machineId) return sendJson(res, 400, { error: 'Falta el identificador de la PC' });
        (state.machineIds = state.machineIds || []).push(machineId);
        if (state.users?.[username] !== password) return sendJson(res, 401, { error: 'Usuario o contraseña incorrectos' });
        return sendJson(res, 200, { ok: true, ...state.license });
      }
      if (req.headers.authorization !== `Bearer ${state.license?.sessionToken}`) return sendJson(res, 401, { error: 'Sesión inválida' });
      let m = req.url.match(/^\/api\/public\/modules\/([^/]+)\/latest$/);
      if (m) {
        const list = state.releases?.[m[1]] || [];
        const rel = list.find(r => r.version === state.latest?.[m[1]]) || list[0];
        if (!rel) return sendJson(res, 404, { error: 'Módulo sin versiones publicadas' });
        const { zip, ...meta } = rel; void zip;
        return sendJson(res, 200, meta);
      }
      m = req.url.match(/^\/api\/public\/modules\/([^/]+)\/releases$/);
      if (m) return sendJson(res, 200, { releases: (state.releases?.[m[1]] || []).map(({ zip, ...meta }) => { void zip; return meta; }) });
      m = req.url.match(/^\/api\/public\/modules\/([^/]+)\/download\/([^/]+)$/);
      if (m) {
        const rel = (state.releases?.[m[1]] || []).find(r => r.version === m[2]);
        if (!rel) return sendJson(res, 404, { error: 'Versión inexistente' });
        let data = rel.zip;
        if (state.corrupt?.[`${m[1]}@${m[2]}`]) { data = Buffer.from(data); data[data.length - 1] ^= 0xff; }
        res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Length': data.length });
        return res.end(data);
      }
      sendJson(res, 404, { error: 'No encontrado' });
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, requests, close: () => new Promise(r => server.close(r)) };
}

module.exports = {
  REPO, LAUNCHER_DIR, tempDir, createFakeElectron, loadWithFakeElectron,
  createSigner, useTestPublicKey, buildModuleZip, makeRelease, startFakeServer,
};
