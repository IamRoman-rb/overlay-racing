// =========================================================================
// 3. MOTOR MYLAPS ORBITS (conexión directa por IP, sin internet)
// =========================================================================
// Orbits 4 y Orbits 5 publican los datos en vivo con el "Results Protocol" de AMB/MYLAPS
// (también conocido como protocolo RMonitor, el mismo que usa el relay de Race Monitor).
// Orbits actúa como SERVIDOR TCP (puerto 50000 por defecto) y cada cliente que se conecta recibe
// primero un volcado completo del estado de la sesión y después las novedades en tiempo real.
//
// Cada mensaje es una línea de texto CSV (campos de texto entre comillas) terminada en CR/LF:
//   $I,"TimeOfDay","Date"                                   -> inicio: borrar todo
//   $B,RunId,"Descripción"                                  -> sesión (run) actual
//   $C,ClassId,"Descripción"                                -> clase / categoría
//   $E,"Clave","Valor"                                      -> ajustes (TRACKNAME, TRACKLENGTH)
//   $A,"Reg","Nro",Transponder,"Nombre","Apellido","Nac",ClassId
//   $COMP,"Reg","Nro",ClassId,"Nombre","Apellido","Nac","Adicional"
//   $F,LapsToGo,"TimeToGo","TimeOfDay","RaceTime","Bandera" -> latido (1 por segundo)
//   $G,Pos,"Reg",Vueltas,"TiempoTotal"                      -> clasificación de carrera
//   $H,Pos,"Reg",VueltaMejor,"MejorTiempo"                  -> clasificación por mejor vuelta
//   $J,"Reg","TiempoVuelta","TiempoTotal"                   -> pasada por meta
// Extensiones de Race Monitor que algunos relays agregan (se aceptan si llegan):
//   $RMS,"race|qualifying|practice"   $RMHL,"Reg","Vueltas","Pos","TiempoVuelta","Bandera","TiempoTotal"
//
// El módulo mantiene una conexión persistente (reconecta sola) y arma la misma estructura
// { session, drivers } que devuelven los scrapers de Speedhive y Race Monitor.

const net = require('net');

const DEFAULT_PORT = 50000;
const CONNECT_TIMEOUT_MS = 5000;
const RECONNECT_DELAY_MS = 3000;
const MAX_LINE_BUFFER = 256 * 1024;   // protección: una "línea" sin fin de línea no puede crecer sin límite
const MAX_COMPETITORS = 1000;
const MAX_FIELD_LENGTH = 120;

let socket = null;
let target = null;            // { host, port } al que queremos estar conectados
let connected = false;
let lastError = '';
let lastDataAt = 0;
let connectedAt = 0;
let reconnectTimer = null;
let lineBuffer = Buffer.alloc(0);
let connectWaiters = [];      // promesas esperando el resultado del intento de conexión en curso
let messageCount = 0;

const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

function emptyState() {
  return {
    runId: null,
    sessionName: '',
    sortMode: '',              // '' = automático; 'race' | 'qualifying' | 'practice' si llega $RMS
    flag: '',
    lapsToGo: null,
    timeToGo: '',
    raceTime: '',
    timeOfDay: '',
    trackName: '',
    classes: {},               // classId -> descripción
    competitors: {}            // reg -> { reg, number, firstName, lastName, nationality, classId, ... }
  };
}
let state = emptyState();

// ---------------------------------------------------------------------------
// Parseo
// ---------------------------------------------------------------------------

// CSV con comillas dobles; "" dentro de un campo es una comilla literal.
function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { fields.push(cur); cur = ''; }
    else cur += ch;
  }
  fields.push(cur);
  return fields.map(f => f.trim().slice(0, MAX_FIELD_LENGTH));
}

// Orbits 5 manda UTF-8; Orbits 4 manda texto ANSI (Windows-1252). Se prueba UTF-8 y si la línea
// no es UTF-8 válido se decodifica como Latin-1, así los acentos (Pérez, Muñoz) salen bien en ambos.
function decodeLine(buf) {
  try { return utf8Decoder.decode(buf); } catch (e) { return buf.toString('latin1'); }
}

// "00:01:23.456" -> segundos (83.456). Acepta también "1:23.456", "83.456" y "83".
function timeToSeconds(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (!s || !/^[\d:.]+$/.test(s)) return null;
  const parts = s.split(':').map(Number);
  if (parts.some(n => Number.isNaN(n))) return null;
  let total = 0;
  for (const p of parts) total = total * 60 + p;
  return total;
}

// Segundos -> "1:23.456" / "58.123" / "1:02:03.456" (mismo estilo que muestra Speedhive).
function formatSeconds(sec, { decimals = 3 } = {}) {
  if (sec === null || sec === undefined || !Number.isFinite(sec) || sec < 0) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec - h * 3600 - m * 60;
  let sStr = s.toFixed(decimals);
  if (h > 0 || m > 0) sStr = sStr.padStart(decimals > 0 ? decimals + 3 : 2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${sStr}`;
  if (m > 0) return `${m}:${sStr}`;
  return sStr;
}

function formatLapTime(str) {
  const sec = timeToSeconds(str);
  return sec && sec > 0 ? formatSeconds(sec) : '';
}

// Reloj de sesión sin milésimas: "00:12:45" -> "12:45", "01:02:03" -> "1:02:03".
function formatClock(str) {
  const sec = timeToSeconds(str);
  if (sec === null) return '';
  const whole = Math.floor(sec);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function toInt(v) {
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function getCompetitor(reg) {
  const key = String(reg || '').trim();
  if (!key) return null;
  if (!state.competitors[key]) {
    if (Object.keys(state.competitors).length >= MAX_COMPETITORS) return null;
    state.competitors[key] = {
      reg: key, number: key, firstName: '', lastName: '', nationality: '', classId: '', additional: '',
      racePos: null, laps: null, totalTime: '',
      bestPos: null, bestLapNumber: null, bestLapTime: '',
      lastLapTime: ''
    };
  }
  return state.competitors[key];
}

// Cambio de sesión: se borran posiciones y tiempos pero se conservan los datos de los pilotos.
function resetRunData() {
  for (const c of Object.values(state.competitors)) {
    c.racePos = null; c.laps = null; c.totalTime = '';
    c.bestPos = null; c.bestLapNumber = null; c.bestLapTime = '';
    c.lastLapTime = '';
  }
  state.flag = ''; state.lapsToGo = null; state.timeToGo = ''; state.raceTime = '';
}

function handleMessage(line) {
  if (!line || line[0] !== '$') return;
  const f = parseCsvLine(line);
  const type = f[0].toUpperCase();
  messageCount++;

  switch (type) {
    case '$I': // reinicio: Orbits manda todo de nuevo a continuación
      state = emptyState();
      break;
    case '$B': {
      const runId = f[1] || '';
      if (state.runId !== null && state.runId !== runId) resetRunData();
      state.runId = runId;
      state.sessionName = f[2] || '';
      break;
    }
    case '$C':
      if (f[1] !== undefined && Object.keys(state.classes).length < 500) state.classes[f[1]] = f[2] || '';
      break;
    case '$E': {
      const key = (f[1] || '').toUpperCase();
      if (key === 'TRACKNAME') state.trackName = f[2] || '';
      break;
    }
    case '$A': {
      const c = getCompetitor(f[1]);
      if (!c) break;
      c.number = f[2] || c.number;
      c.firstName = f[4] || '';
      c.lastName = f[5] || '';
      c.nationality = f[6] || '';
      c.classId = f[7] || '';
      break;
    }
    case '$COMP': {
      const c = getCompetitor(f[1]);
      if (!c) break;
      c.number = f[2] || c.number;
      c.classId = f[3] || '';
      c.firstName = f[4] || '';
      c.lastName = f[5] || '';
      c.nationality = f[6] || '';
      c.additional = f[7] || '';
      break;
    }
    case '$F': {
      const lapsToGo = toInt(f[1]);
      // 9999 = la sesión no es por vueltas (es por tiempo)
      state.lapsToGo = lapsToGo !== null && lapsToGo < 9999 ? lapsToGo : null;
      state.timeToGo = f[2] || '';
      state.timeOfDay = f[3] || '';
      state.raceTime = f[4] || '';
      state.flag = (f[5] || '').trim().toLowerCase();
      break;
    }
    case '$G': {
      const c = getCompetitor(f[2]);
      if (!c) break;
      c.racePos = toInt(f[1]);
      c.laps = toInt(f[3]);
      c.totalTime = f[4] || '';
      break;
    }
    case '$H': {
      const c = getCompetitor(f[2]);
      if (!c) break;
      c.bestPos = toInt(f[1]);
      c.bestLapNumber = toInt(f[3]);
      c.bestLapTime = f[4] || '';
      break;
    }
    case '$J': {
      const c = getCompetitor(f[1]);
      if (!c) break;
      if (timeToSeconds(f[2])) c.lastLapTime = f[2];
      if (f[3]) c.totalTime = f[3];
      break;
    }
    case '$RMS':
      state.sortMode = (f[1] || '').trim().toLowerCase();
      break;
    case '$RMHL': {
      const c = getCompetitor(f[1]);
      if (!c) break;
      const lap = toInt(f[2]);
      if (lap !== null && (c.laps === null || lap >= c.laps) && timeToSeconds(f[4])) c.lastLapTime = f[4];
      break;
    }
    default:
      break; // $RMLT, $RMCA, $RMDTL y otros: no se usan
  }
}

function onData(chunk) {
  lastDataAt = Date.now();
  lineBuffer = lineBuffer.length ? Buffer.concat([lineBuffer, chunk]) : chunk;
  let start = 0;
  for (let i = 0; i < lineBuffer.length; i++) {
    const b = lineBuffer[i];
    if (b === 0x0a || b === 0x0d) {
      if (i > start) {
        try { handleMessage(decodeLine(lineBuffer.subarray(start, i)).trim()); } catch (e) { /* línea corrupta: se ignora */ }
      }
      start = i + 1;
    }
  }
  lineBuffer = start >= lineBuffer.length ? Buffer.alloc(0) : Buffer.from(lineBuffer.subarray(start));
  if (lineBuffer.length > MAX_LINE_BUFFER) lineBuffer = Buffer.alloc(0);
}

// ---------------------------------------------------------------------------
// Conexión
// ---------------------------------------------------------------------------

function settleWaiters(ok) {
  const waiters = connectWaiters;
  connectWaiters = [];
  waiters.forEach(fn => fn(ok));
}

function clearReconnect() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

function scheduleReconnect() {
  clearReconnect();
  if (!target) return;
  reconnectTimer = setTimeout(() => { reconnectTimer = null; openSocket(); }, RECONNECT_DELAY_MS);
}

function openSocket() {
  if (!target || socket) return;
  const { host, port } = target;
  const s = new net.Socket();
  socket = s;
  lineBuffer = Buffer.alloc(0);
  s.setNoDelay(true);
  s.setTimeout(CONNECT_TIMEOUT_MS);

  s.on('connect', () => {
    if (socket !== s) return;
    connected = true;
    connectedAt = Date.now();
    lastError = '';
    s.setTimeout(0);
    s.setKeepAlive(true, 5000);
    // Cada conexión nueva recibe el volcado completo: arrancamos con el estado limpio.
    state = emptyState();
    console.log(`🟢 Orbits: conectado a ${host}:${port}`);
    settleWaiters(true);
  });
  s.on('data', chunk => { if (socket === s) onData(chunk); });
  s.on('timeout', () => {
    if (socket !== s) return;
    lastError = `Tiempo de espera agotado al conectar con ${host}:${port}`;
    s.destroy();
  });
  s.on('error', err => {
    if (socket !== s) return;
    lastError = err.code ? `${err.code} ${host}:${port}` : err.message;
  });
  s.on('close', () => {
    if (socket !== s) return;
    const wasConnected = connected;
    socket = null;
    connected = false;
    if (wasConnected) console.log(`🔴 Orbits: se cerró la conexión con ${host}:${port}${lastError ? ` (${lastError})` : ''}`);
    else console.log(`⚠️ Orbits: no se pudo conectar a ${host}:${port}${lastError ? ` (${lastError})` : ''}`);
    if (!lastError) lastError = wasConnected ? 'Orbits cerró la conexión' : 'No se pudo conectar';
    settleWaiters(false);
    scheduleReconnect();
  });

  console.log(`⏳ Orbits: conectando a ${host}:${port}...`);
  s.connect(port, host);
}

function disconnect() {
  target = null;
  clearReconnect();
  if (socket) { const s = socket; socket = null; s.destroy(); }
  connected = false;
  settleWaiters(false);
}

// Acepta "192.168.1.50", "192.168.1.50:50000" o un nombre de equipo ("PC-CRONO").
function parseAddress(rawHost, rawPort) {
  let host = String(rawHost || '').trim().replace(/^[a-z]+:\/\//i, '').replace(/\/.*$/, '');
  let port = toInt(rawPort);
  const m = host.match(/^([^:]+):(\d+)$/);
  if (m) { host = m[1]; port = toInt(m[2]); }
  if (!host || !/^[a-zA-Z0-9.\-]+$/.test(host) || host.length > 253) return null;
  if (!port) port = DEFAULT_PORT;
  if (port < 1 || port > 65535) return null;
  return { host, port };
}

// Deja la conexión apuntando a host:port. Si es un destino nuevo, espera (hasta el timeout) a que
// conecte para que el primer "CARGAR DATOS AHORA" ya devuelva algo.
async function ensureConnection(host, port) {
  const same = target && target.host === host && target.port === port;
  if (!same) {
    disconnect();
    target = { host, port };
    state = emptyState();
    lastError = '';
  }
  if (connected) return true;
  if (!socket && !reconnectTimer) openSocket();
  if (same && reconnectTimer) return false; // ya se está reintentando en segundo plano
  if (!socket) return false;
  const ok = await new Promise(resolve => {
    connectWaiters.push(resolve);
    setTimeout(() => resolve(false), CONNECT_TIMEOUT_MS + 500);
  });
  // Recién conectados: le damos un instante a Orbits para mandar el volcado inicial.
  if (ok) await new Promise(r => setTimeout(r, 700));
  return ok;
}

// ---------------------------------------------------------------------------
// Armado del leaderboard (misma forma que Speedhive / Race Monitor)
// ---------------------------------------------------------------------------

function isQualifyingLike() {
  if (state.sortMode) return state.sortMode !== 'race';
  return /(pr[aá]ctica|practice|entrenamiento|training|libre|free|qualif|clasif|quali|warm[ -]?up|tanda)/i.test(state.sessionName)
    && !/(carrera|race|final|manga|heat|serie)/i.test(state.sessionName);
}

function buildLeaderboard() {
  const qualifying = isQualifyingLike();
  const list = Object.values(state.competitors);

  const rankOf = c => {
    const primary = qualifying ? c.bestPos : c.racePos;
    const secondary = qualifying ? c.racePos : c.bestPos;
    return primary ?? secondary ?? null;
  };
  list.sort((a, b) => {
    const ra = rankOf(a); const rb = rankOf(b);
    if (ra !== null && rb !== null && ra !== rb) return ra - rb;
    if (ra !== null && rb === null) return -1;
    if (ra === null && rb !== null) return 1;
    return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
  });

  const leader = list[0];
  const leaderLaps = leader?.laps ?? 0;
  const leaderTotal = timeToSeconds(leader?.totalTime);
  const leaderBest = timeToSeconds(leader?.bestLapTime);

  const drivers = list.map((c, idx) => {
    let diff = '-';
    if (idx > 0) {
      if (qualifying) {
        const best = timeToSeconds(c.bestLapTime);
        if (best && leaderBest) diff = `+${formatSeconds(Math.max(0, best - leaderBest))}`;
      } else {
        const laps = c.laps ?? 0;
        const lapsDown = leaderLaps - laps;
        if (lapsDown > 0) diff = `+${lapsDown} ${lapsDown === 1 ? 'LAP' : 'LAPS'}`;
        else {
          const total = timeToSeconds(c.totalTime);
          if (total && leaderTotal && laps > 0) diff = `+${formatSeconds(Math.max(0, total - leaderTotal))}`;
        }
      }
    }
    const name = `${c.firstName} ${c.lastName}`.replace(/\s+/g, ' ').trim() || `Piloto ${c.number}`;
    return {
      pos: String(rankOf(c) ?? idx + 1),
      number: c.number || '-',
      name,
      nationality: c.nationality || '',
      make: state.classes[c.classId] || '',
      laps: String(c.laps ?? 0),
      lastLap: formatLapTime(c.lastLapTime) || '-',
      diff,
      totalTime: (c.totalTime && timeToSeconds(c.totalTime) > 0) ? formatSeconds(timeToSeconds(c.totalTime)) : '-',
      bestLap: formatLapTime(c.bestLapTime) || '-',
      sector1: '', sector2: '', sector3: '',
      // Dato adicional del competidor ($COMP) y clase: de ahí sale la marca del auto
      extra: [c.additional, state.classes[c.classId]].filter(Boolean)
    };
  });

  // Reloj: en sesiones por tiempo se muestra lo que falta; si no, el tiempo transcurrido.
  const toGoSec = timeToSeconds(state.timeToGo);
  const clock = toGoSec && toGoSec > 0 ? formatClock(state.timeToGo) : formatClock(state.raceTime);

  return {
    session: {
      name: state.sessionName,
      totalTime: clock || '-',
      laps: drivers.length > 0 ? drivers[0].laps : '-',
      lapsToGo: state.lapsToGo,
      flag: state.flag,
      track: state.trackName
    },
    drivers
  };
}

// Punto de entrada que usa main.cjs en cada tick (1 por segundo).
async function fetchOrbits(rawHost, rawPort) {
  const addr = parseAddress(rawHost, rawPort);
  if (!addr) {
    return { session: {}, drivers: [], error: { code: 'ORBITS_INVALID_HOST', message: String(rawHost || '') } };
  }
  const ok = await ensureConnection(addr.host, addr.port);
  if (!ok && !connected) {
    return { session: {}, drivers: [], error: { code: 'ORBITS_NOT_CONNECTED', message: lastError || `${addr.host}:${addr.port}` } };
  }
  const result = buildLeaderboard();
  console.log(`✅ [1s Tick] Orbits ${addr.host}:${addr.port} - "${result.session.name}" | Pilotos: ${result.drivers.length}`);
  return result;
}

function getOrbitsStatus() {
  return {
    host: target?.host || '',
    port: target?.port || null,
    connected,
    connecting: !!socket && !connected,
    lastError,
    connectedAt,
    lastDataAt,
    secondsSinceData: lastDataAt ? Math.round((Date.now() - lastDataAt) / 1000) : null,
    messages: messageCount,
    competitors: Object.keys(state.competitors).length,
    session: state.sessionName
  };
}

module.exports = {
  fetchOrbits,
  disconnectOrbits: disconnect,
  getOrbitsStatus,
  ORBITS_DEFAULT_PORT: DEFAULT_PORT,
  // exportados para pruebas
  _internal: { parseCsvLine, handleMessage, buildLeaderboard, parseAddress, formatSeconds, timeToSeconds, reset: () => { state = emptyState(); } }
};
