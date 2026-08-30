const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { scrapeSpeedhive, scrapeRaceMonitor } = require('./src/scripts/scraper.cjs');
const http = require('http');
const { networkInterfaces } = require('os');

let controlWindow;
let overlayWindow;

// --- FIX PARA PRODUCCIÓN ---
// Detecta si estamos en modo desarrollo o si ya es un instalador .exe
const isDev = !app.isPackaged;
const userDataPath = isDev ? __dirname : app.getPath('userData');

const dbPath = path.join(userDataPath, 'database.json');
const posPath = path.join(userDataPath, 'posiciones.json');
const backupPath = path.join(userDataPath, 'last_race.json');

const defaultPositions = {
  relator: { x: 20, y: 560, scale: 1 },
  comentarista: { x: 20, y: 480, scale: 1 },
  notero1: { x: 20, y: 400, scale: 1 },
  notero2: { x: 20, y: 320, scale: 1 },
  circuito: { x: 20, y: 240, scale: 1 },
  clima: { x: 20, y: 160, scale: 1 },
  ticker: { x: 0, y: 660, scale: 1 },
  grid: { x: 0, y: 0, scale: 1 },
  finalResults: { x: 240, y: 40, scale: 1 },
  tower: { x: 20, y: 20, scale: 1 },
  winner: { x: 440, y: 550, scale: 1 },
  flags: { x: 320, y: 50, scale: 1 },
  fastestLap: { x: 440, y: 150, scale: 1 },
  driverInfo: { x: 80, y: 480, scale: 1 },
  battle: { x: 50, y: 50, scale: 1 },
  customZocalo: { x: 20, y: 580, scale: 1 },
  votingQR: { x: 20, y: 700, scale: 1 },
  votingResults: { x: 1550, y: 50, scale: 1 }
};

if (!fs.existsSync(posPath)) {
  fs.writeFileSync(posPath, JSON.stringify(defaultPositions, null, 2));
}

// =========================================================================
// SERVIDOR WEB INTERNO PARA LA VOTACIÓN
// =========================================================================
function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}
const localIP = getLocalIP();

let currentDriversForVote = [];
let votesData = {};

const voteServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    const html = `
      <!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Votación Piloto del Día</title>
      <style>
        body { background: #121212; color: #fff; font-family: Arial, sans-serif; padding: 15px; margin: 0; }
        h2 { color: #f39c12; text-align: center; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #e74c3c; padding-bottom: 10px; margin-top: 0; }
        .driver { background: #1a1a1a; margin-bottom: 10px; padding: 15px; border-radius: 6px; border-left: 5px solid #e74c3c; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.5); }
        .info { display: flex; flex-direction: column; gap: 4px; flex: 1; padding-right: 10px; }
        .num { color: #f39c12; font-weight: bold; font-size: 14px; }
        .name { font-size: 16px; font-weight: 900; text-transform: uppercase; }
        .btn { background: #e74c3c; color: #fff; border: none; padding: 12px 20px; border-radius: 4px; font-weight: bold; cursor: pointer; transition: 0.2s; white-space: nowrap; }
        .btn.voted { background: #2ecc71; pointer-events: none; }
        #thanks { display: none; text-align: center; margin-top: 50px; font-size: 20px; color: #2ecc71; font-weight: bold; }
      </style></head>
      <body>
        <div id="poll"><h2>PILOTO DEL DÍA</h2><p style="text-align:center; color:#888; font-size:13px; margin-bottom:20px;">Votá a tu favorito</p>
        ${currentDriversForVote.map(d => `
          <div class="driver">
            <div class="info"><span class="num">#${d.number}</span><span class="name">${d.name}</span></div>
            <button class="btn" onclick="vote('${d.number}', this)">VOTAR</button>
          </div>`).join('')}
        </div>
        <div id="thanks">¡GRACIAS POR VOTAR!<br><span style="font-size:14px; color:#888; font-weight:normal; margin-top:10px; display:block;">Mira los resultados en la transmisión.</span></div>
        <script>
          function vote(num, btn) {
            btn.innerHTML = 'ENVIANDO...';
            fetch('/vote?num=' + encodeURIComponent(num), { method: 'POST' }).then(() => {
              document.getElementById('poll').style.display = 'none';
              document.getElementById('thanks').style.display = 'block';
            });
          }
        </script>
      </body></html>
    `;
    res.end(html);
  } 
  else if (req.method === 'POST' && req.url.startsWith('/vote?num=')) {
    const num = decodeURIComponent(req.url.split('=')[1]);
    votesData[num] = (votesData[num] || 0) + 1;
    if (overlayWindow) overlayWindow.webContents.send('update-votes', votesData);
    res.writeHead(200); 
    res.end('OK');
  } else {
    res.writeHead(404); 
    res.end();
  }
});

voteServer.listen(8080, '0.0.0.0', () => {
  console.log(`📡 Servidor de votación activo en http://${localIP}:8080`);
});

ipcMain.handle('get-local-ip', () => localIP);
ipcMain.on('reset-votes', () => { 
  votesData = {}; 
  if (overlayWindow) overlayWindow.webContents.send('update-votes', votesData); 
});
ipcMain.on('toggle-voting-qr', (event, data) => { if (overlayWindow) overlayWindow.webContents.send('set-voting-qr', data); });
ipcMain.on('toggle-voting-results', (event, data) => { if (overlayWindow) overlayWindow.webContents.send('set-voting-results', data); });


ipcMain.handle('select-logo', async () => {
  const result = await dialog.showOpenDialog(controlWindow, {
    title: 'Seleccionar Logo de Productora',
    properties: ['openFile'],
    filters: [{ name: 'Imagenes', extensions: ['png', 'jpg', 'jpeg'] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const fileExt = path.extname(filePath).toLowerCase();
    const mimeType = fileExt === '.png' ? 'image/png' : 'image/jpeg';
    const base64 = fs.readFileSync(filePath, { encoding: 'base64' });
    return `data:${mimeType};base64,${base64}`;
  }
  return null;
});

ipcMain.handle('select-design-image', async (event, title) => {
  const result = await dialog.showOpenDialog(controlWindow, {
    title: `Seleccionar Diseño PNG/SVG para: ${title}`,
    properties: ['openFile'],
    filters: [{ name: 'Imágenes', extensions: ['png', 'svg'] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.svg' ? 'image/svg+xml' : 'image/png';
    const base64 = fs.readFileSync(filePath, { encoding: 'base64' });
    return `data:${mimeType};base64,${base64}`;
  }
  return null;
});

ipcMain.handle('select-category-logo', async () => {
  const result = await dialog.showOpenDialog(controlWindow, {
    title: 'Seleccionar Logo de Categoría',
    properties: ['openFile'],
    filters: [{ name: 'Imagenes', extensions: ['png', 'jpg', 'jpeg'] }]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const fileExt = path.extname(filePath).toLowerCase();
    const mimeType = fileExt === '.png' ? 'image/png' : 'image/jpeg';
    const base64 = fs.readFileSync(filePath, { encoding: 'base64' });
    return `data:${mimeType};base64,${base64}`;
  }
  return null;
});

// --- MANEJADORES: MEMORIA / BACKUP DE CARRERA ---
ipcMain.handle('save-backup', (event, data) => {
  try {
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('load-backup', () => {
  try {
    if (fs.existsSync(backupPath)) {
      return JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    }
  } catch (e) {}
  return null;
});

ipcMain.on('force-update-leaderboard', (event, data) => {
  if (overlayWindow) overlayWindow.webContents.send('update-leaderboard', data);
});

ipcMain.handle('scrape-timing', async (event, { provider, code }) => {
  let leaderboard;
  
  if (provider === 'racemonitor') {
    leaderboard = await scrapeRaceMonitor(code);
  } else {
    leaderboard = await scrapeSpeedhive(code);
  }
  
  if (leaderboard && leaderboard.drivers && leaderboard.drivers.length > 0) {
    currentDriversForVote = leaderboard.drivers;
  }
  
  if (overlayWindow) overlayWindow.webContents.send('update-leaderboard', leaderboard);
  return leaderboard;
});

ipcMain.handle('get-config', () => {
  try { if (fs.existsSync(dbPath)) return JSON.parse(fs.readFileSync(dbPath, 'utf-8')); } catch (e) {}
  return { campeonato: '', relator: '', comentarista: '' };
});
ipcMain.handle('save-config', (event, data) => {
  try { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); if (overlayWindow) overlayWindow.webContents.send('update-config', data); return true; } catch (e) { return false; }
});

ipcMain.handle('get-default-positions', () => defaultPositions);
ipcMain.handle('get-positions', () => {
  try { return JSON.parse(fs.readFileSync(posPath, 'utf-8')); } catch (e) { return defaultPositions; }
});
ipcMain.handle('save-positions', (event, data) => {
  try { fs.writeFileSync(posPath, JSON.stringify(data, null, 2)); if (overlayWindow) overlayWindow.webContents.send('update-positions', data); return true; } catch (e) { return false; }
});

ipcMain.handle('select-photos-folder', async () => {
  const result = await dialog.showOpenDialog(controlWindow, {
    title: 'Seleccionar Carpeta de Fotos de Pilotos',
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]; 
  }
  return null;
});

ipcMain.on('preview-positions', (event, data) => { if (overlayWindow) overlayWindow.webContents.send('update-positions', data); });
ipcMain.on('toggle-ticker', (event, isVisible) => { if (overlayWindow) overlayWindow.webContents.send('set-ticker-visibility', isVisible); });
ipcMain.on('toggle-tower', (event, isVisible) => { if (overlayWindow) overlayWindow.webContents.send('set-tower-visibility', isVisible); });
ipcMain.on('toggle-graphic', (event, data) => { if (overlayWindow) overlayWindow.webContents.send('set-graphic-visibility', data); });
ipcMain.on('toggle-grid', (event, isVisible) => { if (overlayWindow) overlayWindow.webContents.send('set-grid-visibility', isVisible); });
ipcMain.on('grid-next', () => { if (overlayWindow) overlayWindow.webContents.send('grid-next'); });
ipcMain.on('grid-prev', () => { if (overlayWindow) overlayWindow.webContents.send('grid-prev'); });
ipcMain.on('toggle-final-results', (event, isVisible) => { if (overlayWindow) overlayWindow.webContents.send('set-final-results-visibility', isVisible); });
ipcMain.on('toggle-winner', (event, { isVisible, driver }) => { if (overlayWindow) overlayWindow.webContents.send('set-winner-visibility', { isVisible, driver }); });
ipcMain.on('toggle-flag', (event, flagsData) => { if (overlayWindow) overlayWindow.webContents.send('set-flag-visibility', flagsData); });
ipcMain.on('toggle-fastest-lap', (event, isVisible) => { if (overlayWindow) overlayWindow.webContents.send('set-fastest-lap-visibility', isVisible); });
ipcMain.on('toggle-driver-info', (event, payload) => { if (overlayWindow) overlayWindow.webContents.send('set-driver-info-visibility', payload); });
ipcMain.on('toggle-battle', (event, payload) => { if (overlayWindow) overlayWindow.webContents.send('set-battle-visibility', payload); });
ipcMain.on('toggle-custom-zocalo', (event, payload) => { if (overlayWindow) overlayWindow.webContents.send('set-custom-zocalo-visibility', payload); });

ipcMain.on('overlay-control', (event, action) => {
  if (!overlayWindow) return;
  if (action === 'minimize') overlayWindow.minimize();
  else if (action === 'maximize') {
    if (overlayWindow.isMaximized()) overlayWindow.unmaximize();
    else overlayWindow.maximize();
  } else if (action === 'close') app.quit(); 
});

function createWindows() {
  controlWindow = new BrowserWindow({ 
    width: 1050, height: 700, 
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    autoHideMenuBar: true
  });
  
  overlayWindow = new BrowserWindow({ 
    width: 1920, height: 1080, 
    frame: false, resizable: false, maximizable: false, transparent: true, hasShadow: false, 
    webPreferences: { nodeIntegration: true, contextIsolation: false } 
  });

  // RUTEO INTELIGENTE PARA PRODUCCIÓN
  if (isDev) {
    controlWindow.loadURL('http://localhost:5173/#/');
    overlayWindow.loadURL('http://localhost:5173/#/overlay');
  } else {
    // Cuando lo exportes como .exe leerá la carpeta 'dist'
    controlWindow.loadURL(`file://${path.join(__dirname, 'dist', 'index.html')}#/`);
    overlayWindow.loadURL(`file://${path.join(__dirname, 'dist', 'index.html')}#/overlay`);
  }

  controlWindow.on('closed', () => app.quit());
}

app.whenReady().then(createWindows);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });