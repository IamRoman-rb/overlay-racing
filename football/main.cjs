const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

// MÓDULO OVERLAY FÚTBOL (Overlay Graphics).
// Lo abre el instalador (launcher/main.cjs) después del login, igual que el módulo de carrera: pasa el contexto por
// global.overlayModuleCtx y llama a start().
//
// Sin proveedor de datos, TODO se carga a mano en el panel (equipos, jugadores, cuerpo técnico, logos, marcador, reloj).
// El panel es el dueño del estado: lo manda entero con 'fb-push-state' y acá sólo se guarda en disco y se reparte al
// overlay (ventana propia por IPC, y OBS / vMix / navegadores de la red por Socket.IO en el puerto 8080).
const moduleCtx = global.overlayModuleCtx || {};
const isDev = moduleCtx.isDev !== undefined ? moduleCtx.isDev : !app.isPackaged;
const userDataPath = isDev ? __dirname : app.getPath('userData');
const dataPath = path.join(userDataPath, 'football-data.json');
const distDir = path.join(__dirname, 'dist');

const PORT = 8080;
const OVERLAY_SIZE = { width: 1920, height: 1080 };

let controlWindow = null;
let overlayWindow = null;
let io = null;
let server = null;
let returningToLauncher = false;
ipcMain.on('return-to-launcher', () => {
  returningToLauncher = true;
  moduleCtx.returnToLauncher?.();
  if (controlWindow && !controlWindow.isDestroyed()) controlWindow.close();
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.close();
  if (io) io.close();
  else if (server) server.close();
});

// Lo que se guarda es todo menos lo que está "al aire" (las gráficas arrancan ocultas en cada sesión).
let state = null;

function readSaved() {
  try { if (fs.existsSync(dataPath)) return JSON.parse(fs.readFileSync(dataPath, 'utf-8')); } catch (e) {
    console.error('[football] no se pudo leer', dataPath, e.message);
  }
  return null;
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const { live, ...persistent } = state || {};
      // Escritura en dos pasos: si la PC se apaga a mitad de guardado no se pierde la carga de equipos
      const tmp = `${dataPath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(persistent));
      fs.renameSync(tmp, dataPath);
    } catch (e) { console.error('[football] no se pudo guardar', e.message); }
  }, 400);
}

// ---------- Protección de la escritura por red ----------
// El puerto 8080 queda abierto a la red local para que OBS / vMix lean el overlay y para que un panel abierto en otra PC
// (http://<IP>:8080/#/) pueda editar. Leer sigue abierto a todos; ESCRIBIR (fb-push-state por Socket.IO) tiene dos filtros:
//   1. Origen: una página web de OTRO sitio (abierta en cualquier navegador de la red, incluso en esta PC) no puede escribir.
//      Se acepta la página servida por este mismo programa (Origin = Host), localhost, y clientes sin Origin (no son navegadores).
//      No reemplaza una autenticación: un programa en la red puede no mandar Origin. Ver docs/auditoria-iso-preliminar.md.
//   2. Forma: se rechaza un estado con estructura imposible (equipos nulos, listas que no son listas, ...), que antes se guardaba
//      en disco y dejaba el panel sin abrir en cada arranque. El panel propio siempre manda un estado normalizado, que pasa.
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const optionalObject = (v) => v === undefined || isPlainObject(v);
const optionalArray = (v, item) => v === undefined || (Array.isArray(v) && (!item || v.every(item)));
// Textos que el dibujo trata como string (toUpperCase / trim): un número o un objeto ahí rompe el render
const optionalText = (v) => !v || typeof v === 'string';
const validPlayer = (p) => isPlainObject(p) && optionalText(p.name) && optionalText(p.nick);
const validTeam = (t) => isPlainObject(t) && optionalText(t.short) && optionalArray(t.players, validPlayer)
  && optionalArray(t.staff, isPlainObject) && (t.coach === undefined || t.coach === null || isPlainObject(t.coach));

// Devuelve null si el estado se puede aceptar, o el motivo del rechazo
function checkIncomingState(next) {
  if (!isPlainObject(next)) return 'no es un objeto';
  for (const key of ['layout', 'look', 'edits', 'textSizes', 'brand', 'ui', 'live', 'match']) {
    if (!optionalObject(next[key])) return `"${key}" no es un objeto`;
  }
  if (!optionalArray(next.teams, validTeam)) return '"teams" tiene equipos o jugadores con forma inválida';
  const match = next.match;
  if (match) {
    for (const side of ['home', 'away']) {
      const s = match[side];
      if (!optionalObject(s) || (s && (!optionalArray(s.xi) || !optionalArray(s.bench)))) return `"match.${side}" inválido`;
    }
    if (!optionalArray(match.events, isPlainObject)) return '"match.events" inválido';
    if (!optionalObject(match.score) || !optionalObject(match.clock)) return '"match.score" o "match.clock" inválido';
  }
  if (next.live && !(next.live.alert === undefined || next.live.alert === null || isPlainObject(next.live.alert))) return '"live.alert" inválido';
  return null;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
// origin / host: cabeceras Origin y Host del cliente Socket.IO al conectarse
function isAllowedWriteOrigin(origin, host) {
  if (origin === undefined || origin === '') return true;
  if (typeof origin !== 'string' || origin === 'null') return false; // "null": iframes aislados / archivos locales
  let url;
  try { url = new URL(origin); } catch { return false; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (LOOPBACK_HOSTS.has(url.hostname)) return true;
  return typeof host === 'string' && url.host.toLowerCase() === host.toLowerCase();
}

// Copia de football-data.json al abrir el módulo (se guardan las últimas BACKUP_KEEP): si algo pisa los equipos durante la
// sesión, se puede volver a la carga anterior copiando la copia sobre football-data.json con el programa cerrado.
const BACKUP_KEEP = 5;
function backupSavedData(saved) {
  try {
    if (!saved || checkIncomingState(saved) || !fs.existsSync(dataPath)) return;
    const dir = path.join(userDataPath, 'football-backups');
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    fs.copyFileSync(dataPath, path.join(dir, `football-data-${stamp}.json`));
    fs.readdirSync(dir).filter(f => /^football-data-\d{8}-\d{6}\.json$/.test(f)).sort().reverse().slice(BACKUP_KEEP)
      .forEach(f => { try { fs.unlinkSync(path.join(dir, f)); } catch { /* se intenta en el próximo arranque */ } });
  } catch (e) { console.warn('[football] no se pudo hacer la copia de seguridad:', e.message); }
}

// Reparte el estado a todos menos a quien lo mandó (ventana por IPC o cliente Socket.IO): los paneles se ponen al día con lo
// que cambia otro panel, y no reciben de vuelta lo propio (pisaría lo que siguieron cambiando mientras viajaba).
function pushState(next, { webContents = null, socket = null } = {}) {
  if (!next || typeof next !== 'object') return;
  state = next;
  scheduleSave();
  if (io) (socket ? socket.broadcast : io).emit('fb-state', state);
  [controlWindow, overlayWindow].forEach(win => {
    if (win && !win.isDestroyed() && win.webContents !== webContents) win.webContents.send('fb-state', state);
  });
}

// Diagnóstico de los overlays (navegador de vMix/OBS, configuración recibida, objetos del EDITOR que no se encuentran, logos que no
// cargan). Va al registro del programa; se limita por cliente para que una página rota no llene el log.
const DIAG_LIMIT = 60;
function logDiag(who, payload, count) {
  if (count > DIAG_LIMIT || !payload || typeof payload.message !== 'string') return;
  console.log(`[football] ${who}: ${payload.message.slice(0, 300)}${count === DIAG_LIMIT ? ' (no se registran más avisos de este cliente)' : ''}`);
}

ipcMain.handle('fb-get-state', () => state);
ipcMain.on('fb-push-state', (e, next) => pushState(next, { webContents: e.sender }));
let windowDiagCount = 0;
ipcMain.on('fb-diag', (e, payload) => logDiag('ventana overlay', payload, ++windowDiagCount));

// Imagen elegida desde el panel: se devuelve incrustada (data URI) para guardarla dentro de football-data.json
ipcMain.handle('fb-pick-image', async (e, title) => {
  const result = await dialog.showOpenDialog(controlWindow, {
    title: title || 'Seleccionar imagen', properties: ['openFile'],
    filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] }]
  });
  if (result.canceled || !result.filePaths.length) return null;
  const file = result.filePaths[0];
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  return `data:${mime};base64,${fs.readFileSync(file, { encoding: 'base64' })}`;
});

ipcMain.on('overlay-control', (e, action) => {
  if (!overlayWindow) return;
  if (action === 'minimize') overlayWindow.minimize();
  else if (action === 'maximize') { overlayWindow.isMaximized() ? overlayWindow.unmaximize() : overlayWindow.maximize(); }
  else if (action === 'close') app.quit();
});

// Tras un alert()/confirm() nativo en Windows la ventana pierde el foco de teclado; blur + focus lo devuelve.
ipcMain.on('refocus-window', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win || win.isDestroyed()) return;
  win.blur();
  win.focus();
  e.sender.focus();
});

function startServer() {
  const expressApp = express();
  server = http.createServer(expressApp);
  io = new Server(server, { cors: { origin: '*' } });

  // OBS / vMix abren http://<ip de esta PC>:8080/#/overlay como "Browser source"
  if (fs.existsSync(distDir)) expressApp.use(express.static(distDir));

  io.on('connection', (socket) => {
    socket.emit('fb-state', state);
    const { origin, host } = socket.handshake.headers;
    const canWrite = isAllowedWriteOrigin(origin, host);
    let rejectedCount = 0;
    socket.on('fb-push-state', (next) => {
      const reason = canWrite ? checkIncomingState(next) : `origen no permitido (${String(origin).slice(0, 100)})`;
      if (!reason) { pushState(next, { socket }); return; }
      if (++rejectedCount <= DIAG_LIMIT) console.warn(`[football] cambio rechazado de ${socket.handshake.address}: ${reason}`);
      // El que mandó vuelve al estado vigente (si era un panel legítimo, ve que su cambio no se aplicó en vez de quedar distinto)
      socket.emit('fb-state', state);
    });
    let diagCount = 0;
    socket.on('fb-diag', (payload) => logDiag(`overlay ${socket.handshake.address}`, payload, ++diagCount));
  });

  server.on('error', (err) => {
    console.error('[football] error del servidor local:', err);
    const message = err.code === 'EADDRINUSE'
      ? `No se pudo iniciar porque el puerto ${PORT} ya está en uso.\n\nCerrá otras ventanas de Overlay Graphics y volvé a abrirlo.`
      : `No se pudo iniciar el servidor local:\n\n${err.message}`;
    dialog.showErrorBox('Overlay Graphics', message);
    app.exit(1);
  });
  server.listen(PORT, '0.0.0.0');
}

function createWindows() {
  const iconPath = path.join(__dirname, 'assets', 'logo.png');
  const webPreferences = { nodeIntegration: true, contextIsolation: false };

  controlWindow = new BrowserWindow({ width: 1366, height: 820, icon: iconPath, webPreferences, autoHideMenuBar: true, title: 'Overlay Fútbol' });
  overlayWindow = new BrowserWindow({
    ...OVERLAY_SIZE, useContentSize: true, icon: iconPath, frame: false, resizable: false, transparent: true, hasShadow: false, webPreferences
  });

  if (isDev) {
    controlWindow.loadURL('http://localhost:5174/#/');
    overlayWindow.loadURL('http://localhost:5174/#/overlay');
  } else {
    const indexPath = path.join(distDir, 'index.html');
    controlWindow.loadURL(`file://${indexPath}#/`);
    overlayWindow.loadURL(`file://${indexPath}#/overlay`);
  }
  controlWindow.on('closed', () => { if (!returningToLauncher) app.quit(); });
}

// Punto de entrada que usa el instalador
module.exports = {
  start() {
    returningToLauncher = false;
    state = readSaved();
    backupSavedData(state);
    startServer();
    createWindows();
  },
  // Para las pruebas automáticas (football/test/); el instalador sólo usa start()
  checkIncomingState,
  isAllowedWriteOrigin
};
