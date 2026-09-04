const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { getVotingHtml } = require('./src/scripts/votingHtml.cjs');
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

const defaultPositions = {
  relator: { x: 20, y: 560, scale: 1 }, comentarista: { x: 20, y: 480, scale: 1 }, notero1: { x: 20, y: 400, scale: 1 },
  notero2: { x: 20, y: 320, scale: 1 }, circuito: { x: 20, y: 240, scale: 1 }, clima: { x: 20, y: 160, scale: 1 },
  ticker: { x: 0, y: 660, scale: 1 }, grid: { x: 0, y: 0, scale: 1 }, finalResults: { x: 240, y: 40, scale: 1 },
  tower: { x: 20, y: 20, scale: 1 }, winner: { x: 440, y: 550, scale: 1 }, flags: { x: 320, y: 50, scale: 1 },
  fastestLap: { x: 440, y: 150, scale: 1 }, battle: { x: 50, y: 50, scale: 1 }, customZocalo: { x: 20, y: 580, scale: 1 },
  votingQR: { x: 20, y: 700, scale: 1 }, votingResults: { x: 1550, y: 50, scale: 1 }, lapCounter: { x: 1700, y: 40, scale: 1 },
  pitStop: { x: 50, y: 700, scale: 1 }
};

if (!fs.existsSync(posPath)) fs.writeFileSync(posPath, JSON.stringify(defaultPositions, null, 2));

function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) { if (net.family === 'IPv4' && !net.internal) return net.address; }
  }
  return '127.0.0.1';
}
const localIP = getLocalIP();

let currentDriversForVote = [];
let votesData = {};
let lastLeaderboard = { session: {}, drivers: [] };

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

let publicVotingUrl = null;
let publicTunnel = null;
let tunnelConnecting = false;
const TUNNEL_RETRY_TIME = 5000;

async function createPublicTunnel() {
  if (tunnelConnecting) {
    return;
  }
  tunnelConnecting = true;
  try {
    console.log('🌐 Intentando crear túnel público con Cloudflare...');
    if (publicTunnel) {
      try {
        await publicTunnel.close();
      } catch (e) {}
      publicTunnel = null;
    }
    publicVotingUrl = null;
    broadcast('update-ip', null);
    if (controlWindow) {
      controlWindow.webContents.send('update-ip', null);
    }

    const { startTunnel } = await import('untun');
    publicTunnel = await startTunnel({ port: 8080 });
    
    // Obtenemos la URL de Cloudflare
    const tunnelUrl = await publicTunnel.getURL();

    if (!tunnelUrl) {
      throw new Error('Cloudflare no devolvió una URL pública');
    }
    
    publicVotingUrl = `${tunnelUrl}/votar`;
    console.log('');
    console.log('==============================================');
    console.log('🌍 TÚNEL PÚBLICO DE VOTACIÓN ACTIVO');
    console.log(`🌍 ${publicVotingUrl}`);
    console.log('==============================================');
    console.log('');

    broadcast('update-ip', publicVotingUrl);
    if (controlWindow) {
      controlWindow.webContents.send('update-ip', publicVotingUrl);
    }
    
  } catch (err) {
    console.error(
      '❌ No se pudo crear el túnel público:',
      err?.message || err
    );
    publicVotingUrl = null;
    broadcast('update-ip', null);
    if (controlWindow) {
      controlWindow.webContents.send('update-ip', null);
    }
    scheduleTunnelRetry();
  } finally {
    tunnelConnecting = false;
  }
}

function scheduleTunnelRetry() {
  if (tunnelConnecting) return;
  console.log(`🔄 Reintentando túnel público en ${TUNNEL_RETRY_TIME / 1000}s...`);
  setTimeout(() => {
    createPublicTunnel();
  }, TUNNEL_RETRY_TIME);
}

let broadcastState = {
  ticker: false, tower: false, grid: false, finalResults: false, fastestLap: false,
  lapCounter: false,
  votingQR: false, votingResults: false,
  pitStop: { isVisible: false, driver: null, startTime: null, stoppedTime: null, isRunning: false },
  graphics: {},
  winner: { isVisible: false, driver: null },
  flags: { red: false, tricolor: false, black: false, blue: false },
  driverInfo: { isVisible: false, driver: null },
  battle: { isVisible: false, pos: 1 },
  customZocalo: { isVisible: false, title: '', text: '' }
};

const expressApp = express();
const server = http.createServer(expressApp);
const io = new Server(server, { cors: { origin: '*' } });

if (!isDev) {
  expressApp.use(express.static(path.join(__dirname, 'dist')));
}

io.on('connection', (socket) => {
  console.log('🟢 Visor / vMix conectado al servidor de gráficas.');
  
  try { if (fs.existsSync(dbPath)) socket.emit('update-config', JSON.parse(fs.readFileSync(dbPath, 'utf-8'))); } catch (e) {}
  try {
    if (fs.existsSync(posPath)) socket.emit('update-positions', JSON.parse(fs.readFileSync(posPath, 'utf-8')));
    else socket.emit('update-positions', defaultPositions);
  } catch (e) {}

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
  const html = getVotingHtml(currentDriversForVote, campeonato);
  res.send(html);
});

expressApp.post('/vote', (req, res) => {
  const num = decodeURIComponent(req.query.num);
  votesData[num] = (votesData[num] || 0) + 1;
  io.emit('update-votes', votesData); 
  if (controlWindow) controlWindow.webContents.send('update-votes', votesData); 
  res.sendStatus(200);
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
  console.log('');
  console.log('==============================================');
  console.log('📡 BROADCAST SERVER ACTIVO');
  console.log(`📡 RED LOCAL: http://${localIP}:8080`);
  console.log('==============================================');
  console.log('');

  await createPublicTunnel();
});

const broadcast = (event, data) => { io.emit(event, data); };

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
  if (controlWindow) controlWindow.webContents.send('update-votes', votesData); 
});
ipcMain.on('toggle-virtual-champ', (e, data) => { broadcastState.virtualChamp = data; broadcast('set-virtual-champ', data); });
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
  if (controlWindow) controlWindow.webContents.send('update-pitstop', broadcastState.pitStop);
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

ipcMain.handle('get-local-ip', () => {
  return publicVotingUrl;
});

ipcMain.handle('get-votes', () => votesData);
ipcMain.handle('get-config', () => {
  try { if (fs.existsSync(dbPath)) return JSON.parse(fs.readFileSync(dbPath, 'utf-8')); } catch (e) {}
  return { campeonato: '', relator: '', comentarista: '' };
});
ipcMain.handle('save-config', (event, data) => {
  try { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); broadcast('update-config', data); return true; } catch (e) { return false; }
});
ipcMain.handle('get-default-positions', () => defaultPositions);
ipcMain.handle('get-positions', () => {
  try { return JSON.parse(fs.readFileSync(posPath, 'utf-8')); } catch (e) { return defaultPositions; }
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

  return leaderboard;
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
  controlWindow = new BrowserWindow({ width: 1050, height: 700, webPreferences: { nodeIntegration: true, contextIsolation: false }, autoHideMenuBar: true });
  overlayWindow = new BrowserWindow({ width: 1920, height: 1080, frame: false, resizable: false, transparent: true, hasShadow: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });

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