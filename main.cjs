const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { getVotingHtml } = require('./src/scripts/votingHtml.cjs');
const { getPenaltyHtml } = require('./src/scripts/penaltyHtml.cjs');
const fs = require('fs');
const path = require('path');
const { scrapeSpeedhive, scrapeRaceMonitor } = require('./src/scripts/scraper.cjs');
const { networkInterfaces } = require('os');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const xlsx = require('xlsx');

let controlWindow;
let overlayWindow;

const isDev = !app.isPackaged;
const userDataPath = isDev ? __dirname : app.getPath('userData');

const dbPath = path.join(userDataPath, 'database.json');
const posPath = path.join(userDataPath, 'posiciones.json');
const backupPath = path.join(userDataPath, 'last_race.json');
const lapTimesPath = path.join(userDataPath, 'lap_times.json');

const defaultPositions = {
  relator: { x: 20, y: 560, scale: 1 }, comentarista: { x: 20, y: 480, scale: 1 }, notero1: { x: 20, y: 400, scale: 1 },
  notero2: { x: 20, y: 320, scale: 1 }, circuito: { x: 20, y: 240, scale: 1 }, clima: { x: 20, y: 160, scale: 1 },
  ticker: { x: 0, y: 660, scale: 1 }, grid: { x: 0, y: 0, scale: 1 }, finalResults: { x: 240, y: 40, scale: 1 },
  tower: { x: 20, y: 20, scale: 1 }, winner: { x: 440, y: 550, scale: 1 }, flags: { x: 320, y: 50, scale: 1 },
  fastestLap: { x: 440, y: 150, scale: 1 }, battle: { x: 50, y: 50, scale: 1 }, customZocalo: { x: 20, y: 580, scale: 1 },
  votingQR: { x: 20, y: 700, scale: 1 }, votingResults: { x: 1550, y: 50, scale: 1 }, lapCounter: { x: 1700, y: 40, scale: 1 },
  virtualChamp: { x: 1400, y: 150, scale: 1 }, pitStop: { x: 50, y: 700, scale: 1 },
  startingLights: { x: 700, y: 400, scale: 1 },
  lapTimesHistory: { x: 100, y: 500, scale: 1 },
  trackAlert: { x: 1500, y: 500, scale: 1 },
  penaltyAlert: { x: 1500, y: 750, scale: 1 }
};

if (!fs.existsSync(posPath)) fs.writeFileSync(posPath, JSON.stringify(defaultPositions, null, 2));

function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) { if (net.family === 'IPv4' && !net.internal) return net.address; }
  }
  return '127.0.0.1';
}
function getVotingUrl() {
  return publicVotingUrl || `http://${getLocalIP()}:8080/votar`;
}
// Comparte el mismo túnel público que la votación: sólo cambia el path final.
function getStewardUrl() {
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

    const { startTunnel } = await import('untun');
    publicTunnel = await startTunnel({ port: 8080 });
    const tunnelUrl = await publicTunnel.getURL();

    if (!tunnelUrl) throw new Error('Cloudflare no devolvió una URL pública');

    publicVotingUrl = `${tunnelUrl}/votar`;
    broadcast('update-ip', publicVotingUrl);
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

let broadcastState = {
  ticker: false, tower: false, grid: false, finalResults: false, fastestLap: false,
  lapCounter: false, votingQR: false, votingResults: false, virtualChamp: false,
  pitStop: { isVisible: false, driver: null, startTime: null, stoppedTime: null, isRunning: false },
  startingLights: { isVisible: false, step: 0 },
  graphics: {},
  lapTimesHistory: false,
  lapTimesFocus: null,
  winner: { isVisible: false, driver: null },
  flags: { red: false, tricolor: false, black: false, blue: false },
  driverInfo: { isVisible: false, driver: null },
  battle: { isVisible: false, pos: 1 },
  customZocalo: { isVisible: false, title: '', text: '' },
  trackAlert: { isVisible: false, curveId: null, curveName: '', type: 'yellow' },
  penaltyAlert: { isVisible: false, driverNumber: null, driverName: '', type: 'investigation', reason: '' },
};

const expressApp = express();
const server = http.createServer(expressApp);
const io = new Server(server, { cors: { origin: '*' } });

// Necesario para leer el body JSON que manda el panel web de comisarios (fetch POST).
expressApp.use(express.json());

if (!isDev) {
  expressApp.use(express.static(path.join(__dirname, 'dist')));
}

io.on('connection', (socket) => {
  try { if (fs.existsSync(dbPath)) socket.emit('update-config', JSON.parse(fs.readFileSync(dbPath, 'utf-8'))); } catch (e) {}
  try {
    let savedPos = {};
    if (fs.existsSync(posPath)) savedPos = JSON.parse(fs.readFileSync(posPath, 'utf-8'));
    const mergedPositions = { ...defaultPositions, ...savedPos };
    socket.emit('update-positions', mergedPositions);
  } catch (e) {
    socket.emit('update-positions', defaultPositions);
  }

  // FIX QR: sin esto, cualquier cliente que conectara después del arranque
  // (overlay que tarda en montar, reconexión, browser source de OBS/vMix, o un simple
  // "Reload" del input en vMix) se quedaba pegado al valor por defecto ("localhost")
  // porque nunca recibía la URL real. Cada conexión nueva ahora recibe el estado actual.
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

// --- WEB DE COMISARIOS DEPORTIVOS (misma URL/túnel que la votación, distinto path) ---
expressApp.get('/comisarios', (req, res) => {
  let campeonato = 'CARRERA';
  try {
    if (fs.existsSync(dbPath)) {
      const configData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      if (configData.campeonato) campeonato = configData.campeonato;
    }
  } catch (e) {}
  // currentDriversForVote se actualiza en cada scrape, así que esta página siempre
  // se renderiza con la lista de pilotos vigente al momento en que el comisario la abre.
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

server.listen(8080, '0.0.0.0', async () => {
  await createPublicTunnel();
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
  try { io.emit(event, data); } catch (e) {}
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send(event, data);
  }
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send(event, data);
  }
};

ipcMain.on('preview-positions', (event, data) => broadcast('update-positions', data));
ipcMain.on('force-update-leaderboard', (event, data) => { lastLeaderboard = data; broadcast('update-leaderboard', data); });
ipcMain.on('toggle-ticker', (e, data) => { broadcastState.ticker = data; broadcast('set-ticker-visibility', data); });
ipcMain.on('toggle-tower', (e, data) => { broadcastState.tower = data; broadcast('set-tower-visibility', data); });
ipcMain.on('toggle-graphic', (e, data) => { broadcastState.graphics[data.id] = data.visible; broadcast('set-graphic-visibility', data); });
ipcMain.on('toggle-grid', (e, data) => { broadcastState.grid = data; broadcast('set-grid-visibility', data); });
ipcMain.on('grid-next', () => broadcast('grid-next'));
ipcMain.on('grid-prev', () => broadcast('grid-prev'));
ipcMain.on('toggle-final-results', (e, data) => { broadcastState.finalResults = data; broadcast('set-final-results-visibility', data); });
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
// Se puede disparar desde DOS lugares: el panel de Electron (ipcMain 'trigger-penalty')
// o la web de comisarios (POST /comisarios/trigger). Ambos caen en esta misma función,
// así el estado y el timer de auto-ocultado quedan sincronizados sin importar el origen.
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

  // Auto-ocultado: viene configurado desde el panel o la web. Si no llega o es inválido, usamos 10s por defecto.
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

    // Enciende las 5 luces, una por segundo, y se queda esperando la orden manual de largada
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
    // Sólo se puede largar si las 5 luces ya están encendidas
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

ipcMain.handle('get-local-ip', () => getVotingUrl());
ipcMain.handle('get-steward-url', () => getStewardUrl());
ipcMain.handle('get-votes', () => votesData);
ipcMain.handle('get-config', () => {
  try { if (fs.existsSync(dbPath)) return JSON.parse(fs.readFileSync(dbPath, 'utf-8')); } catch (e) {}
  return { campeonato: '', relator: '', comentarista: '' };
});
ipcMain.handle('save-config', (event, data) => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
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
ipcMain.handle('load-backup', () => {
  try {
    if (fs.existsSync(backupPath)) {
      const bData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
      lastLeaderboard = bData;
      return bData;
    }
  } catch (e) {} return null;
});

ipcMain.handle('scrape-timing', async (event, { provider, code }) => {
  let leaderboard = provider === 'racemonitor' ? await scrapeRaceMonitor(code) : await scrapeSpeedhive(code);
  if (leaderboard && leaderboard.drivers && leaderboard.drivers.length > 0) {
    currentDriversForVote = leaderboard.drivers;
  }
  lastLeaderboard = leaderboard;
  broadcast('update-leaderboard', leaderboard);
  calculateLiveChampionship();
  updateLapTimesHistory(leaderboard); 
  return leaderboard;
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

function createWindows() {
  const iconPath = path.join(__dirname, 'src', 'assets', 'logo.png');

  controlWindow = new BrowserWindow({ width: 1050, height: 700, icon: iconPath, webPreferences: { nodeIntegration: true, contextIsolation: false }, autoHideMenuBar: true });
  overlayWindow = new BrowserWindow({ width: 1920, height: 1080, icon: iconPath, frame: false, resizable: false, transparent: true, hasShadow: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });

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

app.whenReady().then(createWindows);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
