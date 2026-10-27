// Instalador / lanzador de Race Dynamics.
//
// Es lo único que se instala en la PC del cliente: inicia sesión con la licencia, muestra los módulos que esa licencia
// incluye (Carrera, ...) y al elegir uno descarga su última versión del servidor y lo abre. El código y la interfaz
// de cada módulo NO están acá: viven en el servidor (ver launcher/moduleManager.cjs).
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { installLogger, logDir, logPath } = require('./logger.cjs');
const { getLoginHtml } = require('./loginHtml.cjs');
const { getModulesHtml } = require('./modulesHtml.cjs');
const api = require('./api.cjs');
const { ensureModule, getModuleStatus, loadModule } = require('./moduleManager.cjs');

let loginWindow = null;
let modulesWindow = null;
let session = null;        // datos de la licencia tras el login (módulos, plan, vencimiento, token de descarga)
let moduleRunning = false; // ya se abrió un módulo: el programa vive mientras viva su ventana

// Una sola copia del programa a la vez: si se abre una segunda (por ejemplo, el instalador la lanza
// al terminar y ya había una abierta), la nueva se cierra y se trae al frente la que ya estaba.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.exit(0);
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
}

installLogger();

// Identificador único y estable de esta computadora, para vincular la licencia.
// No depende de un paquete externo: usa la MAC de la primera interfaz de red real
// combinada con el hostname, todo hasheado (no guarda datos sensibles en crudo).
function getMachineId() {
  try {
    const nets = os.networkInterfaces();
    let mac = null;
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
          mac = net.mac;
          break;
        }
      }
      if (mac) break;
    }
    const raw = `${mac || 'nomac'}-${os.hostname()}-${os.platform()}-${os.arch()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  } catch (e) {
    return crypto.createHash('sha256').update(`fallback-${Date.now()}`).digest('hex');
  }
}

const iconPath = path.join(__dirname, 'assets', 'logo.png');

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 420, height: 480, icon: iconPath, resizable: false, autoHideMenuBar: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  loginWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(getLoginHtml()));
  loginWindow.on('closed', () => { loginWindow = null; if (!modulesWindow && !moduleRunning) app.quit(); });
}

function createModulesWindow() {
  modulesWindow = new BrowserWindow({
    width: 940, height: 640, minWidth: 640, minHeight: 480, icon: iconPath, autoHideMenuBar: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  modulesWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(getModulesHtml()));
  modulesWindow.on('closed', () => { modulesWindow = null; if (!loginWindow && !moduleRunning) app.quit(); });
}

ipcMain.handle('attempt-license-login', async (event, { username, password }) => {
  const data = await api.login({ username, password, machineId: getMachineId() });
  if (!data.ok) return { success: false, error: data.error || 'No se pudo iniciar sesión' };

  session = { ...data, username };
  createModulesWindow();
  if (loginWindow) loginWindow.close();
  return { success: true };
});

// Sólo aparecen los módulos que incluye la licencia; si compra otro, aparece en el próximo inicio de sesión.
// Cada módulo trae su versión instalada y si el servidor tiene una más nueva (updateAvailable).
ipcMain.handle('get-launcher-state', async () => ({
  username: session?.username || '',
  plan: session?.plan || null,
  expiresAt: session?.expiresAt || null,
  modules: session ? await Promise.all((session.moduleCatalog || []).map(entry => getModuleStatus(entry, session.sessionToken))) : []
}));

// update: true = el usuario eligió actualizar; false = abrir la versión instalada tal cual
ipcMain.handle('open-module', async (event, { id: moduleId, update = false }) => {
  if (!session || !session.modules.includes(moduleId)) return { error: 'Tu licencia no incluye este módulo.' };
  if (moduleRunning) return { error: 'Ya hay un módulo abierto.' };

  const sendStatus = (status) => {
    if (modulesWindow && !modulesWindow.isDestroyed()) modulesWindow.webContents.send('module-status', { id: moduleId, ...status });
  };

  try {
    const installed = await ensureModule(moduleId, session.sessionToken, sendStatus, { update });
    sendStatus({ phase: 'opening' });
    moduleRunning = true;
    await loadModule(installed, {
      isDev: !app.isPackaged && installed.version === 'dev',
      // Los módulos cargan paquetes sólo-ESM (como untun) desde acá, que es donde se resuelven las dependencias
      importDep: (name) => import(name),
      license: { username: session.username, modules: session.modules, plan: session.plan, expiresAt: session.expiresAt },
      logDir,
      logPath,
      launcherVersion: app.getVersion()
    });
    if (modulesWindow) modulesWindow.close();
    return { ok: true };
  } catch (err) {
    moduleRunning = false;
    console.error('[launcher] no se pudo abrir el módulo', moduleId, err);
    return { error: err?.message || 'No se pudo abrir el módulo' };
  }
});

ipcMain.on('launcher-logout', () => {
  if (moduleRunning) return;
  session = null;
  createLoginWindow();
  if (modulesWindow) modulesWindow.close();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

if (gotSingleInstanceLock) app.whenReady().then(createLoginWindow);
