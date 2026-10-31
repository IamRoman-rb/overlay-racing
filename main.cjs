const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { getVotingHtml } = require('./src/scripts/votingHtml.cjs');
const { getPenaltyHtml } = require('./src/scripts/penaltyHtml.cjs');
const fs = require('fs');
const path = require('path');
const { scrapeSpeedhive, scrapeRaceMonitor, getBrowserInfo } = require('./src/scripts/scraper.cjs');
const { networkInterfaces } = require('os');
const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');
const xlsx = require('xlsx');
const os = require('os');
const { getSystemStats, stopHardwarePoller } = require('./src/scripts/systemStats.cjs');

// MÓDULO OVERLAY RACING (Overlay Graphics).
// Este archivo ya no es el programa completo: lo abre el instalador (launcher/main.cjs) después del login, tras
// descargarlo del servidor junto con el resto del módulo. El instalador pasa el contexto por global.overlayModuleCtx
// y llama a start(); el login, el menú de módulos, la instancia única y el log a archivo viven en el instalador.
const moduleCtx = global.overlayModuleCtx || {};

let controlWindow;
let overlayWindow;

const isDev = moduleCtx.isDev !== undefined ? moduleCtx.isDev : !app.isPackaged;
const userDataPath = isDev ? __dirname : app.getPath('userData');

const dbPath = path.join(userDataPath, 'database.json');
const posPath = path.join(userDataPath, 'posiciones.json');
const backupPath = path.join(userDataPath, 'last_race.json');
const lapTimesPath = path.join(userDataPath, 'lap_times.json');
const votesHistoryPath = path.join(userDataPath, 'votes_history.json');

// Log a archivo: lo instala el instalador (launcher/logger.cjs); acá sólo se necesita saber dónde queda,
// para mostrarlo en AJUSTES > DIAGNÓSTICO.
const logDir = moduleCtx.logDir || app.getPath('userData');
const logPath = moduleCtx.logPath || path.join(logDir, 'race-dynamics.log');

// Layout pensado para un lienzo de 1920x1080: torre de posiciones arriba a la izquierda,
// zócalos (relator/comentarista/noteros/circuito/clima) apilados abajo a la izquierda pero
// corridos a la derecha de la torre (que puede crecer mucho en altura con muchos pilotos),
// tira inferior a todo lo ancho, columna de gráficas de posiciones/vueltas arriba a la
// derecha, y el resto de gráficas de alerta/interactividad distribuidas en el centro sin
// pisarse entre sí en los combos más comunes (ver detalle de cálculo en el commit).
const defaultPositions = {
  relator: { x: 380, y: 935, scale: 1 }, comentarista: { x: 380, y: 860, scale: 1 }, notero1: { x: 380, y: 785, scale: 1 },
  notero2: { x: 380, y: 710, scale: 1 }, circuito: { x: 380, y: 635, scale: 1 }, clima: { x: 380, y: 520, scale: 1 },
  ticker: { x: 0, y: 1020, scale: 1 }, grid: { x: 320, y: 180, scale: 1 }, finalResults: { x: 395, y: 190, scale: 1 },
  tower: { x: 20, y: 20, scale: 1 }, winner: { x: 680, y: 800, scale: 1 }, flags: { x: 640, y: 30, scale: 1 },
  fastestLap: { x: 1440, y: 110, scale: 1 }, battle: { x: 730, y: 140, scale: 1 }, customZocalo: { x: 380, y: 420, scale: 1 },
  votingQR: { x: 20, y: 745, scale: 1 }, votingResults: { x: 1440, y: 655, scale: 1 }, lapCounter: { x: 1740, y: 20, scale: 1 },
  virtualChamp: { x: 1440, y: 235, scale: 1 }, pitStop: { x: 850, y: 900, scale: 1 },
  startingLights: { x: 775, y: 470, scale: 1 },
  lapTimesHistory: { x: 950, y: 350, scale: 1 },
  trackAlert: { x: 950, y: 610, scale: 1 },
  penaltyAlert: { x: 950, y: 500, scale: 1 },
  driverInfo: { x: 380, y: 335, scale: 1 },
  branding: { x: 1640, y: 900, scale: 1 },
  evento: { x: 560, y: 20, scale: 1 }
};

if (!fs.existsSync(posPath)) fs.writeFileSync(posPath, JSON.stringify(defaultPositions, null, 2));

function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) { if (net.family === 'IPv4' && !net.internal) return net.address; }
  }
  return '127.0.0.1';
}

const CLOUD_PUBLIC_URL = 'https://overlayracing.site';

function getVotingUrl() {
  // Prioridad: servidor cloud propio > túnel de Cloudflare > IP local de la red
  if (cloudConfig?.qrToken) return `${CLOUD_PUBLIC_URL}/qr/${cloudConfig.qrToken}`;
  return publicVotingUrl || `http://${getLocalIP()}:8080/votar`;
}
function getStewardUrl() {
  if (cloudConfig?.comisarioToken) return `${CLOUD_PUBLIC_URL}/comisario/${cloudConfig.comisarioToken}`;
  if (publicVotingUrl) return publicVotingUrl.replace(/\/votar$/, '/comisarios');
  return `http://${getLocalIP()}:8080/comisarios`;
}

let currentDriversForVote = [];
let votesData = {};
let lastLeaderboard = { session: {}, drivers: [] };

let lapTimesHistory = {};
try {
  if (fs.existsSync(lapTimesPath)) {
    lapTimesHistory = JSON.parse(fs.readFileSync(lapTimesPath, 'utf-8'));
  }
} catch (e) {
  lapTimesHistory = {};
}

let championshipData = { drivers: [], pointScale: {} };
let liveChampionship = [];

function calculateLiveChampionship() {
  if (!championshipData.drivers.length) return;

  let tempStandings = championshipData.drivers.map(d => ({
    number: d.Numero?.toString(), name: d.Nombre,
    basePoints: parseFloat(d.Puntos) || 0, livePoints: parseFloat(d.Puntos) || 0, added: 0
  }));

  if (lastLeaderboard && lastLeaderboard.drivers) {
    lastLeaderboard.drivers.forEach(raceDriver => {
      let pos = parseInt(raceDriver.pos);
      let pointsToAdd = championshipData.pointScale[pos] || 0;
      let champDriver = tempStandings.find(d => d.number === raceDriver.number);
      if (champDriver) {
        champDriver.added = pointsToAdd;
        champDriver.livePoints = champDriver.basePoints + pointsToAdd;
      }
    });
  }

  tempStandings.sort((a, b) => b.livePoints - a.livePoints);
  tempStandings.forEach((d, index) => d.livePos = index + 1);
  liveChampionship = tempStandings;

  broadcast('update-championship', liveChampionship);
}

function parseLapTimeToSeconds(str) {
  if (!str || str === '-' || str.toUpperCase?.() === 'IN PIT') return null;
  const parts = str.split(':');
  let val = parts.length === 2 ? parseInt(parts[0], 10) * 60 + parseFloat(parts[1]) : parseFloat(str);
  if (isNaN(val) || val <= 0) return null;
  return val;
}

function saveLapTimesToDisk() {
  try { fs.writeFileSync(lapTimesPath, JSON.stringify(lapTimesHistory, null, 2)); } catch (e) {}
}

function updateLapTimesHistory(leaderboard) {
  if (!leaderboard || !leaderboard.drivers || leaderboard.drivers.length === 0) return;

  let changed = false;
  leaderboard.drivers.forEach(driver => {
    const num = driver.number;
    const lap = parseInt(driver.laps) || 0;
    const seconds = parseLapTimeToSeconds(driver.lastLap);
    if (!num || lap <= 0 || seconds === null) return;

    if (!lapTimesHistory[num]) lapTimesHistory[num] = [];
    const arr = lapTimesHistory[num];
    const lastEntry = arr[arr.length - 1];

    // Sólo agregamos un punto nuevo si es una vuelta que todavía no registramos para este piloto
    if (!lastEntry || lastEntry.lap !== lap) {
      arr.push({ lap, seconds, timeStr: driver.lastLap });
      changed = true;
    }
  });

  if (changed) {
    saveLapTimesToDisk();
    broadcast('update-lap-times-history', lapTimesHistory);
  }
}

function resetLapTimesHistory() {
  lapTimesHistory = {};
  saveLapTimesToDisk(); // pisa el archivo con datos vacíos: arranca limpio para la próxima carrera
  broadcast('update-lap-times-history', lapTimesHistory);
}


let publicVotingUrl = null;
let publicTunnel = null;
let tunnelConnecting = false;
const TUNNEL_RETRY_TIME = 5000;

async function createPublicTunnel() {
  if (tunnelConnecting) return;
  tunnelConnecting = true;
  try {
    if (publicTunnel) {
      try { await publicTunnel.close(); } catch (e) {}
      publicTunnel = null;
    }
    publicVotingUrl = null;
    broadcast('update-ip', null);

    // untun es un paquete sólo-ESM: se importa a través del instalador, que es donde se resuelven las dependencias
    const { startTunnel } = await (moduleCtx.importDep ? moduleCtx.importDep('untun') : import('untun'));
    // acceptCloudflareNotice: sin esto, en una PC donde todavía no está descargado el binario de
    // cloudflared, untun intenta preguntar por consola (que en la app empaquetada no existe), cancela
    // el túnel y el QR de votación nunca funciona. Con la opción, lo descarga solo la primera vez.
    publicTunnel = await startTunnel({ port: 8080, acceptCloudflareNotice: true });
    if (!publicTunnel) throw new Error('No se pudo iniciar el túnel de Cloudflare');
    const tunnelUrl = await publicTunnel.getURL();

    if (!tunnelUrl) throw new Error('Cloudflare no devolvió una URL pública');

    publicVotingUrl = `${tunnelUrl}/votar`;
    broadcast('update-ip', publicVotingUrl);
    startTunnelHealthCheck(); // arranca (o reinicia) el monitoreo sobre el túnel recién creado
  } catch (err) {
    publicVotingUrl = null;
    broadcast('update-ip', `http://${getLocalIP()}:8080/votar`);
    scheduleTunnelRetry();
  } finally {
    tunnelConnecting = false;
  }
}

function scheduleTunnelRetry() {
  if (tunnelConnecting) return;
  setTimeout(() => { createPublicTunnel(); }, TUNNEL_RETRY_TIME);
}

// --- HEALTH CHECK DEL TÚNEL (FIX del error DNS_PROBE_POSSIBLE) ---
function checkUrlAlive(url, timeoutMs = 6000) {
  return new Promise((resolve) => {
    try {
      const req = https.request(url, { method: 'HEAD', timeout: timeoutMs }, (res) => {
        res.resume();
        resolve(res.statusCode < 500);
      });
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.on('error', () => resolve(false));
      req.end();
    } catch (e) {
      resolve(false);
    }
  });
}

let tunnelHealthInterval = null;
const TUNNEL_HEALTH_CHECK_INTERVAL = 30000; // chequea cada 30s

function startTunnelHealthCheck() {
  if (tunnelHealthInterval) clearInterval(tunnelHealthInterval);
  tunnelHealthInterval = setInterval(async () => {
    if (!publicVotingUrl || tunnelConnecting) return;
    const alive = await checkUrlAlive(publicVotingUrl);
    if (!alive) {
      console.log('[Tunnel] URL caída (DNS/timeout). Regenerando túnel...');
      createPublicTunnel();
    }
  }, TUNNEL_HEALTH_CHECK_INTERVAL);
}

// --- CONEXIÓN AL SERVIDOR CLOUD (overlayracing.site) ---
// El software se conecta como CLIENTE hacia tu VPS. Desde ahí se empuja en vivo:
//  - la lista de pilotos habilitados para votar (para el QR público)
//  - las sanciones/investigaciones (para el panel del comisario público)
// Los tokens de evento (qr_token / comisario_token) se cargan desde database.json,
// bajo la clave "cloud", y se configuran desde el panel (IPC get/save-cloud-config).
const CLOUD_URL = 'https://overlayracing.site';
let cloudSocket = null;
let cloudConfig = { qrToken: '', comisarioToken: '' };

function loadCloudConfig() {
  try {
    if (fs.existsSync(dbPath)) {
      const configData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      if (configData?.cloud) {
        cloudConfig = {
          qrToken: configData.cloud.qrToken || '',
          comisarioToken: configData.cloud.comisarioToken || ''
        };
      }
    }
  } catch (e) {}
  broadcast('update-ip', getVotingUrl());
}

function connectToCloud() {
  try {
    if (cloudSocket) {
      try { cloudSocket.removeAllListeners(); cloudSocket.disconnect(); } catch (e) {}
      cloudSocket = null;
    }

    cloudSocket = ioClient(CLOUD_URL, { transports: ['websocket'], reconnection: true });

    cloudSocket.on('connect', () => {
      broadcast('cloud-status', { connected: true });
      // Le decimos al servidor "yo soy el Electron dueño de este evento" para que
      // pueda reenviarnos votos y sanciones de la web directo a este socket.
      cloudSocket.emit('register-event', {
        qr_token: cloudConfig.qrToken,
        comisario_token: cloudConfig.comisarioToken
      });
      pushDriversToCloud();
      pushLeaderboardToCloud(lastLeaderboard);
    });
    cloudSocket.on('disconnect', () => {
      broadcast('cloud-status', { connected: false });
    });
    cloudSocket.on('connect_error', () => {
      broadcast('cloud-status', { connected: false });
    });

    // Cuando alguien vota desde overlayracing.site, sumamos el voto acá como si
    // hubiera entrado por el túnel local.
    cloudSocket.on('vote:new', (data) => {
      try {
        const num = data?.option_key;
        if (!num) return;
        votesData[num] = (votesData[num] || 0) + 1;
        broadcast('update-votes', votesData);
      } catch (e) {}
    });

    // Cuando el comisario carga una sanción desde su celular, sale al aire acá mismo
    cloudSocket.on('penalty:trigger', (data) => {
      try { triggerPenalty(data); } catch (e) {}
    });

    // Cuando el comisario la oculta manualmente desde su celular
    cloudSocket.on('penalty:hide', () => {
      try { hidePenaltyAlert(); } catch (e) {}
    });
  } catch (e) {
    cloudSocket = null;
  }
}

function pushDriversToCloud() {
  try {
    if (!cloudSocket?.connected || !cloudConfig?.qrToken) return;
    const drivers = (currentDriversForVote || []).map(d => ({ number: d?.number, name: d?.name }));
    cloudSocket.emit('push-drivers', { qr_token: cloudConfig.qrToken, drivers });
  } catch (e) {}
}

// Tabla completa del scraper (posiciones, vueltas, tiempos, sectores) para la vista de
// prensa en el server (relator / comentarista / notero).
function pushLeaderboardToCloud(leaderboard) {
  try {
    if (!cloudSocket?.connected || !cloudConfig?.qrToken || !leaderboard) return;
    cloudSocket.emit('push-leaderboard', {
      qr_token: cloudConfig.qrToken,
      leaderboard: { session: leaderboard.session || {}, drivers: leaderboard.drivers || [] }
    });
  } catch (e) {}
}

function pushPenaltyToCloud(penalty) {
  try {
    if (!cloudSocket?.connected || !cloudConfig?.comisarioToken) return;
    cloudSocket.emit('push-penalty', {
      comisario_token: cloudConfig.comisarioToken,
      driver: penalty?.driverName || null,
      reason: penalty?.reason || null,
      decision: penalty?.type || null,
      payload: penalty
    });
  } catch (e) {}
}

let broadcastState = {
  ticker: false, tower: false, grid: false, finalResults: false, fastestLap: false,
  lapCounter: false, votingQR: false, votingResults: false, virtualChamp: false,
  pitStop: { isVisible: false, driver: null, startTime: null, stoppedTime: null, isRunning: false },
  startingLights: { isVisible: false, step: 0 },
  graphics: {},
  lapTimesHistory: false,
  lapTimesFocus: null,
  winner: { isVisible: false, driver: null },
  flags: { red: false, tricolor: false, black: false, blue: false, checkered: false, green: false },
  driverInfo: { isVisible: false, driver: null },
  battle: { isVisible: false, pos: 1 },
  customZocalo: { isVisible: false, title: '', text: '' },
  trackAlert: { isVisible: false, curveId: null, curveName: '', type: 'yellow' },
  penaltyAlert: { isVisible: false, driverNumber: null, driverName: '', type: 'investigation', reason: '' },
};

const expressApp = express();
const server = http.createServer(expressApp);
// Los logos se sirven como recursos HTTP para que vMix/OBS por IP no tenga que recibir
// imágenes Base64 gigantes dentro del paquete Socket.IO de configuración.
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 25 * 1024 * 1024
});

// Necesario para leer el body JSON que manda el panel web de comisarios (fetch POST).
expressApp.use(express.json());

if (!isDev) {
  expressApp.use(express.static(path.join(__dirname, 'dist')));
}

// Reemplaza únicamente los logos Base64 por URLs locales. Electron sigue recibiendo
// la configuración original por IPC; los navegadores remotos descargan los logos por HTTP.
function getNetworkConfig(config) {
  if (!config || typeof config !== 'object') return config;
  const networkConfig = { ...config };
  let version = Date.now();
  try { if (fs.existsSync(dbPath)) version = fs.statSync(dbPath).mtimeMs; } catch (e) {}
  ['logo', 'categoryLogo'].forEach((key) => {
    const value = networkConfig[key];
    if (typeof value === 'string' && /^data:image\\/[a-zA-Z0-9.+-]+;base64,/.test(value)) {
      networkConfig[key] = `/overlay-assets/${key}?v=${version}`;
    }
  });
  return networkConfig;
}

// Endpoint seguro: sólo permite servir los dos logos configurados, nunca rutas arbitrarias.
expressApp.get('/overlay-assets/:asset', (req, res) => {
  const keys = { logo: 'logo', categoryLogo: 'categoryLogo' };
  const key = keys[req.params.asset];
  if (!key) return res.sendStatus(404);
  try {
    const config = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const value = config[key];
    const match = typeof value === 'string' && value.match(/^data:(image\\/[a-zA-Z0-9.+-]+);base64,([\\s\\S]+)$/);
    if (!match) return res.sendStatus(404);
    const mime = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
    res.set('Cache-Control', 'no-store');
    res.type(mime).send(Buffer.from(match[2], 'base64'));
  } catch (error) {
    res.sendStatus(404);
  }
});

io.on('connection', (socket) => {
  try { if (fs.existsSync(dbPath)) socket.emit('update-config', getNetworkConfig(JSON.parse(fs.readFileSync(dbPath, 'utf-8')))); } catch (e) {}
  try {
    let savedPos = {};
    if (fs.existsSync(posPath)) savedPos = JSON.parse(fs.readFileSync(posPath, 'utf-8'));
    const mergedPositions = { ...defaultPositions, ...savedPos };
    socket.emit('update-positions', mergedPositions);
  } catch (e) {
    socket.emit('update-positions', defaultPositions);
  }

  socket.emit('update-ip', getVotingUrl());

  socket.emit('update-leaderboard', lastLeaderboard);
  socket.emit('update-votes', votesData);
  socket.emit('set-ticker-visibility', broadcastState.ticker);
  socket.emit('set-tower-visibility', broadcastState.tower);
  socket.emit('set-grid-visibility', broadcastState.grid);
  socket.emit('set-final-results-visibility', broadcastState.finalResults);
  socket.emit('set-fastest-lap-visibility', broadcastState.fastestLap);
  socket.emit('set-voting-qr', broadcastState.votingQR);
  socket.emit('set-voting-results', broadcastState.votingResults);
  socket.emit('set-winner-visibility', broadcastState.winner);
  socket.emit('set-flag-visibility', broadcastState.flags);
  socket.emit('set-driver-info-visibility', broadcastState.driverInfo);
  socket.emit('set-battle-visibility', broadcastState.battle);
  socket.emit('set-custom-zocalo-visibility', broadcastState.customZocalo);
  socket.emit('set-lap-counter-visibility', broadcastState.lapCounter);
  socket.emit('set-virtual-champ', broadcastState.virtualChamp);
  socket.emit('update-pitstop', broadcastState.pitStop);
  socket.emit('update-starting-lights', broadcastState.startingLights);
  socket.emit('update-track-alert', broadcastState.trackAlert);
  socket.emit('update-penalty', broadcastState.penaltyAlert);
  socket.emit('cloud-status', { connected: !!cloudSocket?.connected });
  Object.keys(broadcastState.graphics).forEach(id => {
    socket.emit('set-graphic-visibility', { id, visible: broadcastState.graphics[id] });
  });
});

expressApp.get('/votar', (req, res) => {
  let campeonato = 'CARRERA';
  try {
    if (fs.existsSync(dbPath)) {
      const configData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      if (configData.campeonato) campeonato = configData.campeonato;
    }
  } catch (e) {}
  res.send(getVotingHtml(currentDriversForVote, campeonato));
});

expressApp.post('/vote', (req, res) => {
  const num = decodeURIComponent(req.query.num);
  votesData[num] = (votesData[num] || 0) + 1;
  broadcast('update-votes', votesData);
  res.sendStatus(200);
});

// --- WEB LOCAL DE COMISARIOS (vía túnel Cloudflare, se mantiene como respaldo) ---
expressApp.get('/comisarios', (req, res) => {
  let campeonato = 'CARRERA';
  try {
    if (fs.existsSync(dbPath)) {
      const configData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      if (configData.campeonato) campeonato = configData.campeonato;
    }
  } catch (e) {}
  res.send(getPenaltyHtml(currentDriversForVote, campeonato, broadcastState.penaltyAlert));
});

expressApp.post('/comisarios/trigger', (req, res) => {
  try {
    triggerPenalty(req.body || {});
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(500);
  }
});

expressApp.post('/comisarios/hide', (req, res) => {
  try {
    hidePenaltyAlert();
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(500);
  }
});

expressApp.get('/photo/:number', (req, res) => {
  try {
    const configData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const photosDir = configData.photosPath;
    if (!photosDir) return res.sendStatus(404);
    const num = req.params.number;
    const exts = ['.png', '.jpg', '.jpeg', '.PNG', '.JPG'];
    for (const ext of exts) {
      const checkPath = path.join(photosDir, `${num}${ext}`);
      if (fs.existsSync(checkPath)) return res.sendFile(checkPath);
    }
    res.sendStatus(404);
  } catch (e) {
    res.sendStatus(500);
  }
});

// Si el puerto 8080 ya está ocupado (otra copia del programa abierta, una versión anterior o
// cualquier otra aplicación), antes salía un error técnico de Node. Ahora se explica y se cierra.
server.on('error', (err) => {
  console.error('Error del servidor local:', err);
  const fatal = () => {
    const message = err.code === 'EADDRINUSE'
      ? 'No se pudo iniciar porque el puerto 8080 ya está en uso.\n\nCerrá otras ventanas de Overlay Graphics (o versiones anteriores del programa) y volvé a abrirlo. Si el problema sigue, reiniciá la computadora.'
      : `No se pudo iniciar el servidor local:\n\n${err.message}`;
    dialog.showErrorBox('Overlay Graphics', message);
    app.exit(1);
  };
  if (app.isReady()) fatal(); else app.once('ready', fatal);
});

server.listen(8080, '0.0.0.0', async () => {
  await createPublicTunnel();
  loadCloudConfig();
  connectToCloud();
  setTimeout(() => {
    if (!publicVotingUrl) {
      const ip = getLocalIP();
      if (ip !== '127.0.0.1') {
        broadcast('update-ip', `http://${ip}:8080/votar`);
      }
    }
  }, 3000);
});

// FIX MAESTRO: Enviar a Socket.io Y DIRECTAMENTE a las ventanas de Electron por IPC
const broadcast = (event, data) => {
  // La ventana local recibe Base64 por IPC; los overlays remotos reciben URLs HTTP
  // para evitar paquetes enormes y permitir que vMix cargue las imágenes desde la LAN.
  try { io.emit(event, event === 'update-config' ? getNetworkConfig(data) : data); } catch (e) {}
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send(event, data);
  }
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send(event, data);
  }
};

ipcMain.on('preview-positions', (event, data) => broadcast('update-positions', data));
ipcMain.on('force-update-leaderboard', (event, data) => { lastLeaderboard = data; broadcast('update-leaderboard', data); pushLeaderboardToCloud(data); });
ipcMain.on('toggle-ticker', (e, data) => { broadcastState.ticker = data; broadcast('set-ticker-visibility', data); });
ipcMain.on('toggle-tower', (e, data) => { broadcastState.tower = data; broadcast('set-tower-visibility', data); });
ipcMain.on('toggle-graphic', (e, data) => { broadcastState.graphics[data.id] = data.visible; broadcast('set-graphic-visibility', data); });
ipcMain.on('toggle-grid', (e, data) => { broadcastState.grid = data; broadcast('set-grid-visibility', data); });
ipcMain.on('grid-next', () => broadcast('grid-next'));
ipcMain.on('grid-prev', () => broadcast('grid-prev'));
ipcMain.on('toggle-final-results', (e, data) => { broadcastState.finalResults = data; broadcast('set-final-results-visibility', data); });
ipcMain.on('final-results-next', () => broadcast('final-results-next'));
ipcMain.on('final-results-prev', () => broadcast('final-results-prev'));
ipcMain.on('toggle-winner', (e, data) => { broadcastState.winner = data; broadcast('set-winner-visibility', data); });
ipcMain.on('toggle-flag', (e, data) => { broadcastState.flags = data; broadcast('set-flag-visibility', data); });
ipcMain.on('toggle-fastest-lap', (e, data) => { broadcastState.fastestLap = data; broadcast('set-fastest-lap-visibility', data); });
ipcMain.on('toggle-driver-info', (e, data) => { broadcastState.driverInfo = data; broadcast('set-driver-info-visibility', data); });
ipcMain.on('toggle-battle', (e, data) => { broadcastState.battle = data; broadcast('set-battle-visibility', data); });
ipcMain.on('toggle-custom-zocalo', (e, data) => { broadcastState.customZocalo = data; broadcast('set-custom-zocalo-visibility', data); });
ipcMain.on('toggle-voting-qr', (e, data) => { broadcastState.votingQR = data; broadcast('set-voting-qr', data); });
ipcMain.on('toggle-voting-results', (e, data) => { broadcastState.votingResults = data; broadcast('set-voting-results', data); });
ipcMain.on('toggle-lap-counter', (e, data) => { broadcastState.lapCounter = data; broadcast('set-lap-counter-visibility', data); });
ipcMain.on('reset-votes', () => {
  votesData = {};
  broadcast('update-votes', votesData);
});

// --- HISTORIAL DE VOTACIONES POR CATEGORÍA ---
// Cada registro guarda el ranking completo de una categoría/carrera de un día (con los nombres de los
// pilotos tal como estaban al guardar, porque al cambiar de categoría la lista de pilotos cambia).
function readVotesHistory() {
  try {
    if (fs.existsSync(votesHistoryPath)) {
      const parsed = JSON.parse(fs.readFileSync(votesHistoryPath, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}
function writeVotesHistory(list) {
  try { fs.writeFileSync(votesHistoryPath, JSON.stringify(list, null, 2)); return true; } catch (e) { return false; }
}
function localDayString(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

ipcMain.handle('get-vote-history', () => readVotesHistory());

// data: { category, drivers: [{number, name}], resetAfter }
// Si ya hay un registro de la misma categoría el mismo día, se reemplaza (volver a guardar = actualizar).
ipcMain.handle('save-vote-record', (event, data) => {
  const category = String(data?.category || '').trim();
  if (!category) return { ok: false, reason: 'NO_CATEGORY' };

  const namesByNumber = {};
  (data?.drivers || []).forEach(d => { if (d?.number != null) namesByNumber[String(d.number)] = d.name || ''; });

  const results = Object.keys(votesData)
    .filter(num => votesData[num] > 0)
    .map(num => ({ number: String(num), name: namesByNumber[num] || '', votes: votesData[num] }))
    .sort((a, b) => b.votes - a.votes);
  if (results.length === 0) return { ok: false, reason: 'NO_VOTES' };

  const now = new Date();
  const day = localDayString(now);
  const record = {
    id: `${now.getTime()}`,
    category,
    day,
    savedAt: now.toISOString(),
    totalVotes: results.reduce((sum, r) => sum + r.votes, 0),
    results
  };

  const sameKey = (r) => r.day === day && String(r.category).trim().toLowerCase() === category.toLowerCase();
  const history = readVotesHistory().filter(r => !sameKey(r));
  history.push(record);
  if (!writeVotesHistory(history)) return { ok: false, reason: 'WRITE_FAILED' };

  if (data?.resetAfter) {
    votesData = {};
    broadcast('update-votes', votesData);
  }
  return { ok: true, record, history };
});

ipcMain.handle('delete-vote-record', (event, id) => {
  const history = readVotesHistory().filter(r => r.id !== id);
  writeVotesHistory(history);
  return history;
});
ipcMain.on('toggle-virtual-champ', (e, data) => { broadcastState.virtualChamp = data; broadcast('set-virtual-champ', data); });

ipcMain.on('toggle-lap-times-history', (e, data) => { broadcastState.lapTimesHistory = data; broadcast('set-lap-times-history-visibility', data); });
ipcMain.on('set-lap-times-focus', (e, driverNumber) => { broadcastState.lapTimesFocus = driverNumber; broadcast('update-lap-times-focus', driverNumber); });
ipcMain.on('reset-lap-times-history', () => resetLapTimesHistory());

ipcMain.on('trigger-track-alert', (e, data) => {
  broadcastState.trackAlert = { isVisible: true, curveId: data.curveId, curveName: data.curveName, type: data.type };
  broadcast('update-track-alert', broadcastState.trackAlert);
});
ipcMain.on('hide-track-alert', () => {
  broadcastState.trackAlert = { isVisible: false, curveId: null, curveName: '', type: 'yellow' };
  broadcast('update-track-alert', broadcastState.trackAlert);
});

// --- SANCIONES / BAJO INVESTIGACIÓN (COMISARIOS DEPORTIVOS, ESTILO F1) ---
let penaltyHideTimer = null;
const clearPenaltyTimer = () => {
  if (penaltyHideTimer) { clearTimeout(penaltyHideTimer); penaltyHideTimer = null; }
};

function triggerPenalty(data) {
  clearPenaltyTimer();

  broadcastState.penaltyAlert = {
    isVisible: true,
    driverNumber: data?.driverNumber ?? null,
    driverName: data?.driverName ?? '',
    type: data?.type === 'penalty' ? 'penalty' : 'investigation',
    reason: data?.reason || ''
  };
  broadcast('update-penalty', broadcastState.penaltyAlert);
  pushPenaltyToCloud(broadcastState.penaltyAlert);

  const rawSeconds = Number(data?.autoHideSeconds);
  const seconds = Number.isFinite(rawSeconds) && rawSeconds > 0 ? rawSeconds : 10;

  penaltyHideTimer = setTimeout(() => {
    broadcastState.penaltyAlert = { ...broadcastState.penaltyAlert, isVisible: false };
    broadcast('update-penalty', broadcastState.penaltyAlert);
    penaltyHideTimer = null;
  }, seconds * 1000);
}

function hidePenaltyAlert() {
  clearPenaltyTimer();
  broadcastState.penaltyAlert = { ...broadcastState.penaltyAlert, isVisible: false };
  broadcast('update-penalty', broadcastState.penaltyAlert);
}

ipcMain.on('trigger-penalty', (e, data) => triggerPenalty(data));
ipcMain.on('hide-penalty', () => hidePenaltyAlert());

ipcMain.on('pitstop-action', (e, { action, driver }) => {
  if (action === 'start') {
    broadcastState.pitStop = { isVisible: true, driver, startTime: Date.now(), stoppedTime: null, isRunning: true };
  } else if (action === 'stop') {
    if (broadcastState.pitStop.isRunning) {
      broadcastState.pitStop.stoppedTime = Date.now() - broadcastState.pitStop.startTime;
      broadcastState.pitStop.isRunning = false;
    }
  } else if (action === 'hide') {
    broadcastState.pitStop.isVisible = false;
  }
  broadcast('update-pitstop', broadcastState.pitStop);
});

// --- SEMÁFORO DE LARGADA (LARGADA MANUAL) ---
let startingLightsTimers = [];
const clearStartingLightsTimers = () => {
  startingLightsTimers.forEach(t => clearTimeout(t));
  startingLightsTimers = [];
};

ipcMain.on('starting-lights-action', (e, action) => {
  if (action === 'hide') {
    clearStartingLightsTimers();
    broadcastState.startingLights = { isVisible: false, step: 0 };
    broadcast('update-starting-lights', broadcastState.startingLights);
    return;
  }

  if (action === 'start') {
    clearStartingLightsTimers();
    broadcastState.startingLights = { isVisible: true, step: 0 };
    broadcast('update-starting-lights', broadcastState.startingLights);

    for (let i = 1; i <= 5; i++) {
      const t = setTimeout(() => {
        broadcastState.startingLights = { isVisible: true, step: i };
        broadcast('update-starting-lights', broadcastState.startingLights);
      }, i * 1000);
      startingLightsTimers.push(t);
    }
    return;
  }

  if (action === 'go') {
    if (broadcastState.startingLights.step !== 5) return;

    clearStartingLightsTimers();
    broadcastState.startingLights = { isVisible: true, step: 6 };
    broadcast('update-starting-lights', broadcastState.startingLights);

    const hideTimer = setTimeout(() => {
      broadcastState.startingLights = { isVisible: false, step: 0 };
      broadcast('update-starting-lights', broadcastState.startingLights);
    }, 2500);
    startingLightsTimers.push(hideTimer);
  }
});

ipcMain.handle('get-pitstop', () => broadcastState.pitStop);
ipcMain.handle('get-championship', () => liveChampionship);
ipcMain.handle('load-excel', async () => {
  const result = await dialog.showOpenDialog(controlWindow, {
    title: 'Cargar Campeonato (Excel)', properties: ['openFile'], filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const workbook = xlsx.readFile(result.filePaths[0]);
      const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      let drivers = []; let pointScale = {};
      sheet.forEach(row => {
        if (row.Numero !== undefined) drivers.push({ Numero: row.Numero, Nombre: row.Nombre || 'Piloto', Puntos: row.Puntos || 0 });
        if (row.Posicion !== undefined && row.Puntos_Escala !== undefined) pointScale[row.Posicion] = parseFloat(row.Puntos_Escala);
      });
      championshipData = { drivers, pointScale };
      calculateLiveChampionship();
      return true;
    } catch (e) { return false; }
  }
  return false;
});

// Genera una plantilla .xlsx lista para completar con el formato que espera 'load-excel'
// (solo lee la primera hoja; las instrucciones van en una segunda hoja para no interferir).
ipcMain.handle('save-excel-template', async (event, language) => {
  const instructions = {
    es: ['INSTRUCCIONES', 'Completá la hoja "Campeonato". No cambies los nombres de las columnas (Numero, Nombre, Puntos, Posicion, Puntos_Escala).', 'Numero / Nombre / Puntos: un piloto por fila. Puntos es el puntaje que ya trae antes de esta carrera.', 'Posicion / Puntos_Escala: cuántos puntos da cada posición de llegada (1°, 2°, 3°...). Pueden estar en filas distintas a las de los pilotos.', 'Los datos de ejemplo se pueden borrar o reemplazar. Solo se lee la primera hoja.'],
    en: ['INSTRUCTIONS', 'Fill in the "Campeonato" sheet. Do not change the column names (Numero, Nombre, Puntos, Posicion, Puntos_Escala).', 'Numero / Nombre / Puntos: one driver per row. Puntos is the score the driver already has before this race.', 'Posicion / Puntos_Escala: how many points each finishing position gives (1st, 2nd, 3rd...). They can be on different rows than the drivers.', 'The sample data can be deleted or replaced. Only the first sheet is read.'],
    pt: ['INSTRUÇÕES', 'Preencha a planilha "Campeonato". Não altere os nomes das colunas (Numero, Nombre, Puntos, Posicion, Puntos_Escala).', 'Numero / Nombre / Puntos: um piloto por linha. Puntos é a pontuação que o piloto já tem antes desta corrida.', 'Posicion / Puntos_Escala: quantos pontos cada posição de chegada dá (1º, 2º, 3º...). Podem estar em linhas diferentes das dos pilotos.', 'Os dados de exemplo podem ser apagados ou substituídos. Apenas a primeira planilha é lida.'],
    de: ['ANLEITUNG', 'Fülle das Blatt "Campeonato" aus. Ändere die Spaltennamen nicht (Numero, Nombre, Puntos, Posicion, Puntos_Escala).', 'Numero / Nombre / Puntos: ein Fahrer pro Zeile. Puntos ist die Punktzahl, die der Fahrer vor diesem Rennen bereits hat.', 'Posicion / Puntos_Escala: wie viele Punkte jede Zielposition bringt (1., 2., 3. ...). Sie können in anderen Zeilen stehen als die Fahrer.', 'Die Beispieldaten können gelöscht oder ersetzt werden. Nur das erste Blatt wird gelesen.'],
    fr: ['INSTRUCTIONS', 'Remplissez la feuille "Campeonato". Ne changez pas les noms des colonnes (Numero, Nombre, Puntos, Posicion, Puntos_Escala).', 'Numero / Nombre / Puntos : un pilote par ligne. Puntos est le score que le pilote a déjà avant cette course.', 'Posicion / Puntos_Escala : combien de points rapporte chaque position d\'arrivée (1er, 2e, 3e...). Elles peuvent être sur d\'autres lignes que les pilotes.', 'Les données d\'exemple peuvent être supprimées ou remplacées. Seule la première feuille est lue.']
  };
  const result = await dialog.showSaveDialog(controlWindow, {
    title: 'Guardar plantilla de campeonato',
    defaultPath: 'plantilla-campeonato.xlsx',
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  });
  if (result.canceled || !result.filePath) return null;
  try {
    const scale = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
    const sampleDrivers = [[12, 'Piloto Ejemplo 1', 45], [7, 'Piloto Ejemplo 2', 38], [21, 'Piloto Ejemplo 3', 30], [5, 'Piloto Ejemplo 4', 22], [33, 'Piloto Ejemplo 5', 15]];
    // Las celdas vacías se omiten (no '' ), porque load-excel trata cualquier fila con Numero definido como piloto
    const rows = scale.map((points, i) => {
      const d = sampleDrivers[i];
      return { ...(d ? { Numero: d[0], Nombre: d[1], Puntos: d[2] } : {}), Posicion: i + 1, Puntos_Escala: points };
    });
    const sheet = xlsx.utils.json_to_sheet(rows, { header: ['Numero', 'Nombre', 'Puntos', 'Posicion', 'Puntos_Escala'] });
    sheet['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 10 }, { wch: 10 }, { wch: 15 }];
    const lines = instructions[language] || instructions.es;
    const help = xlsx.utils.aoa_to_sheet(lines.map(line => [line]));
    help['!cols'] = [{ wch: 120 }];
    const book = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(book, sheet, 'Campeonato');
    xlsx.utils.book_append_sheet(book, help, lines[0]);
    xlsx.writeFile(book, result.filePath);
    shell.showItemInFolder(result.filePath);
    return result.filePath;
  } catch (e) {
    console.error('Error generando la plantilla de Excel:', e);
    return false;
  }
});

// Direcciones por las que otra PC de la red (por ejemplo la que corre vMix) puede abrir el overlay.
ipcMain.handle('get-network-urls', () => {
  const urls = [];
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        urls.push({ adapter: name, address: net.address, url: `http://${net.address}:8080/#/overlay` });
      }
    }
  }
  return urls;
});

ipcMain.handle('get-system-stats', () => getSystemStats());
ipcMain.handle('get-local-ip', () => getVotingUrl());
ipcMain.handle('get-steward-url', () => getStewardUrl());
ipcMain.handle('get-votes', () => votesData);
ipcMain.handle('get-config', () => {
  try { if (fs.existsSync(dbPath)) return JSON.parse(fs.readFileSync(dbPath, 'utf-8')); } catch (e) {}
  return { campeonato: '', relator: '', comentarista: '' };
});
// Tamaño del lienzo del overlay (config.overlayWidth / overlayHeight); por defecto 1920x1080
function getOverlaySize(cfg) {
  const dim = (raw, fallback) => {
    const n = Math.round(parseFloat(raw));
    return Number.isFinite(n) ? Math.min(7680, Math.max(320, n)) : fallback;
  };
  return { width: dim(cfg && cfg.overlayWidth, 1920), height: dim(cfg && cfg.overlayHeight, 1080) };
}

function applyOverlaySize(cfg) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  const { width, height } = getOverlaySize(cfg);
  const [curW, curH] = overlayWindow.getContentSize();
  if (curW === width && curH === height) return;
  // La ventana del overlay no es redimensionable a mano: se habilita un instante para poder cambiarle el tamaño por código
  overlayWindow.setResizable(true);
  overlayWindow.setContentSize(width, height);
  overlayWindow.setResizable(false);
}

ipcMain.handle('save-config', (event, data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    applyOverlaySize(data);
    broadcast('update-config', data);
    return true;
  } catch (e) { return false; }
});
ipcMain.handle('get-default-positions', () => defaultPositions);
ipcMain.handle('get-positions', () => {
  try {
    let savedPos = JSON.parse(fs.readFileSync(posPath, 'utf-8'));
    return { ...defaultPositions, ...savedPos };
  } catch (e) { return defaultPositions; }
});
ipcMain.handle('save-positions', (event, data) => {
  try { fs.writeFileSync(posPath, JSON.stringify(data, null, 2)); broadcast('update-positions', data); return true; } catch (e) { return false; }
});
ipcMain.handle('save-backup', (event, data) => {
  try { fs.writeFileSync(backupPath, JSON.stringify(data, null, 2)); return true; } catch (e) { return false; }
});

// --- COPIA DE SEGURIDAD DE LA CONFIGURACIÓN (database.json + posiciones.json) ---
// Permite al usuario guardar/restaurar su configuración manualmente, por ejemplo antes de
// actualizar el programa a una versión nueva, para no perder colores, textos, formatos ni posiciones.
ipcMain.handle('export-settings', async () => {
  const result = await dialog.showOpenDialog(controlWindow, {
    title: 'Elegí una carpeta para guardar la copia de seguridad',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return false;
  try {
    const destDir = result.filePaths[0];
    let exportedAny = false;
    if (fs.existsSync(dbPath)) { fs.copyFileSync(dbPath, path.join(destDir, 'database.json')); exportedAny = true; }
    if (fs.existsSync(posPath)) { fs.copyFileSync(posPath, path.join(destDir, 'posiciones.json')); exportedAny = true; }
    return exportedAny;
  } catch (e) { return false; }
});

ipcMain.handle('import-settings', async () => {
  const result = await dialog.showOpenDialog(controlWindow, {
    title: 'Elegí la carpeta con database.json y/o posiciones.json',
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const srcDir = result.filePaths[0];
  const imported = { config: false, positions: false };
  let configData = null;
  let positionsData = null;

  try {
    const srcDbPath = path.join(srcDir, 'database.json');
    if (fs.existsSync(srcDbPath)) {
      configData = JSON.parse(fs.readFileSync(srcDbPath, 'utf-8'));
      fs.writeFileSync(dbPath, JSON.stringify(configData, null, 2));
      broadcast('update-config', configData);
      imported.config = true;
    }
  } catch (e) {}

  try {
    const srcPosPath = path.join(srcDir, 'posiciones.json');
    if (fs.existsSync(srcPosPath)) {
      const rawPositions = JSON.parse(fs.readFileSync(srcPosPath, 'utf-8'));
      positionsData = { ...defaultPositions, ...rawPositions };
      fs.writeFileSync(posPath, JSON.stringify(rawPositions, null, 2));
      broadcast('update-positions', positionsData);
      imported.positions = true;
    }
  } catch (e) {}

  if (!imported.config && !imported.positions) return null;
  return { imported, config: configData, positions: positionsData };
});
ipcMain.handle('load-backup', () => {
  try {
    if (fs.existsSync(backupPath)) {
      const bData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
      lastLeaderboard = bData;
      return bData;
    }
  } catch (e) {} return null;
});

ipcMain.handle('get-diagnostics', () => {
  let logTail = '';
  try {
    const lines = fs.readFileSync(logPath, 'utf-8').split('\n').filter(Boolean);
    logTail = lines.slice(-40).join('\n');
  } catch (e) { logTail = '(sin log todavía)'; }
  let browserInfo = {};
  try { browserInfo = getBrowserInfo(); } catch (e) { browserInfo = { error: e.message }; }
  return {
    version: app.getVersion(),
    packaged: app.isPackaged,
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
    resourcesPath: process.resourcesPath,
    browser: browserInfo,
    logPath,
    logTail
  };
});
ipcMain.handle('open-logs-folder', () => shell.showItemInFolder(fs.existsSync(logPath) ? logPath : logDir));

ipcMain.handle('scrape-timing', async (event, { provider, code }) => {
  let leaderboard;
  try {
    leaderboard = provider === 'racemonitor' ? await scrapeRaceMonitor(code) : await scrapeSpeedhive(code);
  } catch (e) {
    console.error('Error en scrape-timing:', e);
    return { session: {}, drivers: [], error: { code: 'SCRAPER_ERROR', message: e?.message || '' } };
  }
  if (leaderboard && leaderboard.drivers && leaderboard.drivers.length > 0) {
    currentDriversForVote = leaderboard.drivers;
    pushDriversToCloud();
  }
  // Si el scraper falló (sin navegador, sin internet, error puntual), no pisamos los últimos datos
  // buenos: así un corte momentáneo no deja vacías las gráficas que están al aire.
  if (leaderboard?.error) return leaderboard;
  lastLeaderboard = leaderboard;
  broadcast('update-leaderboard', leaderboard);
  pushLeaderboardToCloud(leaderboard);
  calculateLiveChampionship();
  updateLapTimesHistory(leaderboard);
  return leaderboard;
});

// --- CONFIG DEL SERVIDOR CLOUD (tokens de QR / Comisario del evento activo) ---
ipcMain.handle('get-cloud-config', () => {
  loadCloudConfig();
  return { ...cloudConfig, connected: !!cloudSocket?.connected, url: CLOUD_URL };
});
ipcMain.handle('save-cloud-config', (event, data) => {
  try {
    let configData = {};
    if (fs.existsSync(dbPath)) configData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    configData.cloud = {
      qrToken: data?.qrToken || '',
      comisarioToken: data?.comisarioToken || ''
    };
    fs.writeFileSync(dbPath, JSON.stringify(configData, null, 2));
    cloudConfig = configData.cloud;
    broadcast('update-ip', getVotingUrl());
    connectToCloud(); // reconecta / reaplica con los tokens nuevos
    return true;
  } catch (e) { return false; }
});

ipcMain.handle('get-initial-state', () => {
  let config = {};
  try { if (fs.existsSync(dbPath)) config = JSON.parse(fs.readFileSync(dbPath, 'utf-8')); } catch (e) {}

  let positions = defaultPositions;
  try {
    if (fs.existsSync(posPath)) {
      const savedPos = JSON.parse(fs.readFileSync(posPath, 'utf-8'));
      positions = { ...defaultPositions, ...savedPos };
    }
  } catch (e) {}

  return {
  config,
  positions,
  broadcastState,
  leaderboard: lastLeaderboard,
  lapTimesHistory,
  votes: votesData,
  localIp: getVotingUrl()
  };
});



const handleFileSelect = async (title, extensions) => {
  const result = await dialog.showOpenDialog(controlWindow, { title, properties: ['openFile'], filters: [{ name: 'Imágenes', extensions }] });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const mimeType = filePath.endsWith('.svg') ? 'image/svg+xml' : (filePath.endsWith('.png') ? 'image/png' : 'image/jpeg');
    const base64 = fs.readFileSync(filePath, { encoding: 'base64' });
    return `data:${mimeType};base64,${base64}`;
  }
  return null;
};
ipcMain.handle('select-logo', () => handleFileSelect('Seleccionar Logo', ['png', 'jpg', 'jpeg']));
ipcMain.handle('select-category-logo', () => handleFileSelect('Seleccionar Logo Categoría', ['png', 'jpg', 'jpeg']));
ipcMain.handle('select-track-image', () => handleFileSelect('Seleccionar Imagen del Circuito', ['png', 'jpg', 'jpeg']));
ipcMain.handle('select-design-image', (e, title) => handleFileSelect(`Diseño PNG/SVG: ${title}`, ['png', 'svg']));
ipcMain.handle('select-photos-folder', async () => {
  const result = await dialog.showOpenDialog(controlWindow, { title: 'Seleccionar Carpeta Fotos', properties: ['openDirectory'] });
  return !result.canceled ? result.filePaths[0] : null;
});

ipcMain.on('overlay-control', (event, action) => {
  if (!overlayWindow) return;
  if (action === 'minimize') overlayWindow.minimize();
  else if (action === 'maximize') { overlayWindow.isMaximized() ? overlayWindow.unmaximize() : overlayWindow.maximize(); }
  else if (action === 'close') app.quit();
});

// Tras un alert()/confirm() nativo en Windows la ventana pierde el foco de teclado (los inputs no
// dejan escribir); blur + focus fuerza a Windows a devolvérselo.
ipcMain.on('refocus-window', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (!win || win.isDestroyed()) return;
  win.blur();
  win.focus();
  e.sender.focus();
});

function createWindows() {
  const iconPath = path.join(__dirname, 'src', 'assets', 'logo.png');

  controlWindow = new BrowserWindow({ width: 1050, height: 700, icon: iconPath, webPreferences: { nodeIntegration: true, contextIsolation: false }, autoHideMenuBar: true });
  let savedConfig = {};
  try { if (fs.existsSync(dbPath)) savedConfig = JSON.parse(fs.readFileSync(dbPath, 'utf-8')); } catch (e) { savedConfig = {}; }
  const overlaySize = getOverlaySize(savedConfig);
  overlayWindow = new BrowserWindow({ width: overlaySize.width, height: overlaySize.height, useContentSize: true, icon: iconPath, frame: false, resizable: false, transparent: true, hasShadow: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });

  if (isDev) {
    controlWindow.loadURL('http://localhost:5173/#/');
    overlayWindow.loadURL('http://localhost:5173/#/overlay');
  } else {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    controlWindow.loadURL(`file://${indexPath}#/`);
    overlayWindow.loadURL(`file://${indexPath}#/overlay`);
  }
  controlWindow.on('closed', () => app.quit());
}

app.on('will-quit', stopHardwarePoller);

// Punto de entrada que usa el instalador
module.exports = {
  start() {
    createWindows();
  }
};