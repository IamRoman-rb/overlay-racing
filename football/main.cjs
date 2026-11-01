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

function pushState(next, sender) {
  if (!next || typeof next !== 'object') return;
  state = next;
  scheduleSave();
  if (io) io.emit('fb-state', state);
  [controlWindow, overlayWindow].forEach(win => {
    if (win && !win.isDestroyed() && win.webContents !== sender) win.webContents.send('fb-state', state);
  });
}

ipcMain.handle('fb-get-state', () => state);
ipcMain.on('fb-push-state', (e, next) => pushState(next, e.sender));

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
    socket.on('fb-push-state', (next) => pushState(next, null));
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
    startServer();
    createWindows();
  }
};
