// Pruebas de la escritura de estado por red del módulo de fútbol (football/main.cjs).
//
// Riesgo que cubren: el puerto 8080 está abierto a la red local y antes cualquier cliente Socket.IO (incluida una página web de otro
// sitio abierta en cualquier navegador de la red) podía mandar 'fb-push-state' con cualquier contenido: se guardaba en
// football-data.json, pisaba los equipos y un estado malformado dejaba el panel sin poder abrirse en cada arranque.
// Se verifica que:
//   - un estado normal del panel se sigue aceptando (panel remoto legítimo) y llega a los overlays,
//   - un overlay (vMix / OBS) puede seguir leyendo aunque su Origin sea cualquiera,
//   - una página de otro origen no puede escribir, y un estado malformado se rechaza sin tocar el archivo,
//   - al arrancar queda una copia de seguridad de los datos.
//
// Levanta el main.cjs real con Electron simulado y la carpeta de datos en un directorio temporal: no toca football-data.json.
// Necesita el puerto 8080 libre (se saltea si el programa está abierto).
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const footballDir = path.join(__dirname, '..');
const PORT = 8080;
const BASE = `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const portFree = () => new Promise(resolve => {
  const probe = net.createServer().once('error', () => resolve(false)).once('listening', () => probe.close(() => resolve(true)));
  probe.listen(PORT, '0.0.0.0');
});

// Electron simulado: sólo lo que main.cjs usa al cargarse y en start()
function loadFootballMain(userData) {
  const ipcHandlers = {};
  const noop = () => {};
  class FakeWindow {
    constructor() { this.webContents = { send: noop }; }
    loadURL() {} on() {} close() {}
    isDestroyed() { return false; }
  }
  const electron = {
    app: { isPackaged: true, getPath: () => userData, quit: noop, exit: (code) => { throw new Error(`app.exit(${code})`); } },
    ipcMain: { on: (name, fn) => { ipcHandlers[name] = fn; }, handle: noop },
    BrowserWindow: FakeWindow,
    dialog: { showErrorBox: (title, message) => { throw new Error(message); }, showOpenDialog: noop }
  };
  const originalLoad = Module._load;
  Module._load = function (request, ...rest) { return request === 'electron' ? electron : originalLoad.call(this, request, ...rest); };
  global.overlayModuleCtx = { isDev: false };
  const entry = require.resolve(path.join(footballDir, 'main.cjs'));
  delete require.cache[entry];
  try { return { mod: require(entry), ipcHandlers }; } finally { Module._load = originalLoad; }
}

const loadState = () => import(pathToFileURL(path.join(footballDir, 'src', 'state.js')).href);

// Un estado como el que manda el panel: normalizado, con equipos, plantel, titulares y un evento
async function realisticState() {
  const S = await loadState();
  const team = { ...S.emptyTeam(), name: 'Club Norte', short: 'NOR', coach: { name: 'DT Norte', photo: null }, staff: [{ id: 's1', role: 'PF', name: 'Ana' }] };
  team.players = Array.from({ length: 14 }, (_, i) => ({ ...S.emptyPlayer(), number: String(i + 1), name: `Jugador ${i + 1}`, pos: i === 0 ? 'POR' : 'MED' }));
  const base = S.defaultState();
  const lineup = S.autoLineup(team, '4-4-2');
  const state = S.normalizeState({
    ...base,
    teams: [team],
    textSizes: { scorebug: { 'div:0>span:1': 40 } },
    layout: { ...base.layout, scorebug: { ...base.layout.scorebug, cover: 'league' } },
    match: { ...base.match, homeId: team.id, home: { ...base.match.home, ...lineup }, events: [{ id: 'e1', kind: 'goal', side: 'home', playerId: team.players[9].id, minute: '12' }] }
  });
  state.live = { ...state.live, alert: null };
  return state;
}

test('checkIncomingState acepta los estados del panel y rechaza los malformados', async () => {
  const { mod } = loadFootballMain(fs.mkdtempSync(path.join(os.tmpdir(), 'fb-unit-')));
  const S = await loadState();
  assert.equal(mod.checkIncomingState(S.defaultState()), null);
  assert.equal(mod.checkIncomingState(S.normalizeState({})), null);
  assert.equal(mod.checkIncomingState(await realisticState()), null);
  assert.equal(mod.checkIncomingState({}), null, 'un objeto vacío es válido (el panel lo completa con valores por defecto)');

  for (const bad of [null, 'texto', 42, [], { teams: [null] }, { teams: 'x' }, { teams: [{ players: 'x' }] },
    { teams: [{ short: 7 }] }, { teams: [{ players: [{ nick: { a: 1 } }] }] }, { match: [] }, { match: { events: 'x' } },
    { match: { home: { xi: 'x' } } }, { layout: [] }, { live: { alert: 'x' } }]) {
    assert.notEqual(mod.checkIncomingState(bad), null, `debería rechazar ${JSON.stringify(bad)}`);
  }
});

test('isAllowedWriteOrigin: misma página / localhost / sin Origin sí; otro sitio no', () => {
  const { mod } = loadFootballMain(fs.mkdtempSync(path.join(os.tmpdir(), 'fb-unit-')));
  const ok = (origin, host) => mod.isAllowedWriteOrigin(origin, host);
  assert.equal(ok(undefined, '192.168.1.10:8080'), true);
  assert.equal(ok('http://192.168.1.10:8080', '192.168.1.10:8080'), true);
  assert.equal(ok('http://PC-PRODUCCION:8080', 'pc-produccion:8080'), true);
  assert.equal(ok('http://localhost:5174', '192.168.1.10:8080'), true);
  assert.equal(ok('http://127.0.0.1:8080', '127.0.0.1:8080'), true);
  assert.equal(ok('https://sitio-ajeno.example', '192.168.1.10:8080'), false);
  assert.equal(ok('http://192.168.1.10:9999', '192.168.1.10:8080'), false);
  assert.equal(ok('null', '192.168.1.10:8080'), false);
  assert.equal(ok('file://', '192.168.1.10:8080'), false);
  assert.equal(ok('no es una url', '192.168.1.10:8080'), false);
});

test('servidor real: overlay lee, panel legítimo escribe, otro origen y estados malformados no', async (t) => {
  if (!(await portFree())) { t.skip(`el puerto ${PORT} está en uso (¿está abierto el programa?)`); return; }
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'fb-server-'));
  const dataFile = path.join(userData, 'football-data.json');
  const original = await realisticState();
  delete original.live;
  fs.writeFileSync(dataFile, JSON.stringify(original));

  const { mod, ipcHandlers } = loadFootballMain(userData);
  mod.start();
  const { io } = require('socket.io-client');
  const clients = [];
  const connect = (origin) => new Promise((resolve, reject) => {
    const socket = io(BASE, { transports: ['websocket'], reconnection: false, extraHeaders: origin ? { Origin: origin } : {} });
    clients.push(socket);
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
  const nextState = (socket) => new Promise(resolve => socket.once('fb-state', resolve));
  t.after(() => { clients.forEach(c => c.close()); ipcHandlers['return-to-launcher']?.(); });

  // Copia de seguridad al arrancar
  const backups = fs.readdirSync(path.join(userData, 'football-backups'));
  assert.equal(backups.length, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(userData, 'football-backups', backups[0]), 'utf8')), original);

  // Un overlay con cualquier Origin (vMix / OBS) recibe el estado al conectarse
  const overlayFirst = new Promise(resolve => {
    const socket = io(BASE, { transports: ['websocket'], reconnection: false, extraHeaders: { Origin: 'https://cualquier-origen.example' } });
    clients.push(socket);
    socket.once('fb-state', (s) => resolve({ socket, s }));
  });
  const { socket: overlay, s: firstState } = await overlayFirst;
  assert.equal(firstState.teams[0].name, 'Club Norte');

  // Otro sitio intenta pisar los equipos: se rechaza, el archivo no cambia y el overlay no recibe nada
  const attacker = await connect('https://sitio-ajeno.example');
  let overlayGotSomething = false;
  overlay.once('fb-state', () => { overlayGotSomething = true; });
  const attackerReply = nextState(attacker);
  attacker.emit('fb-push-state', { teams: [null], pwned: true });
  assert.equal((await attackerReply).teams[0].name, 'Club Norte', 'al rechazado se le devuelve el estado vigente');
  await wait(600);
  assert.equal(overlayGotSomething, false);
  assert.deepEqual(JSON.parse(fs.readFileSync(dataFile, 'utf8')), original);

  // Panel legítimo abierto por IP (Origin = Host de este servidor): estado malformado se rechaza
  const panel = await connect(BASE);
  const panelReply = nextState(panel);
  panel.emit('fb-push-state', { ...original, teams: [null] });
  assert.equal((await panelReply).teams[0].name, 'Club Norte');
  await wait(600);
  assert.deepEqual(JSON.parse(fs.readFileSync(dataFile, 'utf8')), original);

  // ...y un cambio normal (tamaño de texto del EDITOR) se acepta, llega al overlay y se guarda (sin "live")
  const changed = { ...original, textSizes: { scorebug: { 'div:0>span:1': 52 } }, live: { scorebug: true } };
  const overlayUpdate = nextState(overlay);
  panel.emit('fb-push-state', changed);
  assert.equal((await overlayUpdate).textSizes.scorebug['div:0>span:1'], 52);
  await wait(600);
  const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.equal(saved.textSizes.scorebug['div:0>span:1'], 52);
  assert.equal(saved.live, undefined);

  // Cliente sin Origin (no es un navegador) puede escribir: el filtro de origen frena páginas web, no programas en la red
  const script = await connect(null);
  const overlayUpdate2 = nextState(overlay);
  script.emit('fb-push-state', { ...changed, textSizes: {} });
  assert.deepEqual((await overlayUpdate2).textSizes, {});
});
