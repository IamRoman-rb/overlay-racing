// Simulador de MYLAPS Orbits (salida "Results Protocol" / RMonitor por TCP) para probar la
// conexión de Overlay Racing sin tener un cronometrador real.
//
// Uso:
//   node scripts/orbits-simulator.cjs                 -> carrera, puerto 50000
//   node scripts/orbits-simulator.cjs --qualy         -> clasificación (orden por mejor vuelta)
//   node scripts/orbits-simulator.cjs --port 50001 --drivers 15 --speed 4 --laps 20
//
// --speed acelera el tiempo (4 = las vueltas pasan 4 veces más rápido) para no esperar 1:30 por vuelta.
// En la app: AJUSTES -> proveedor "MYLAPS Orbits 4 / 5 (IP)" -> IP 127.0.0.1, puerto 50000.

const net = require('net');

const args = process.argv.slice(2);
const arg = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const PORT = parseInt(arg('port', '50000'), 10);
const DRIVERS = Math.min(40, Math.max(2, parseInt(arg('drivers', '12'), 10)));
const SPEED = Math.max(1, parseFloat(arg('speed', '3')));
const TOTAL_LAPS = parseInt(arg('laps', '15'), 10);
const QUALY = args.includes('--qualy');

const NAMES = [
  ['Juan', 'Pérez'], ['Martín', 'Muñoz'], ['Lucía', 'Fernández'], ['Diego', 'Gómez'], ['Sofía', 'Rodríguez'],
  ['Matías', 'López'], ['Valentina', 'Díaz'], ['Nicolás', 'Martínez'], ['Camila', 'Sánchez'], ['Tomás', 'Romero'],
  ['Agustín', 'Álvarez'], ['Julieta', 'Torres'], ['Facundo', 'Ruiz'], ['Florencia', 'Ramírez'], ['Joaquín', 'Benítez'],
  ['Bruno', 'Acosta'], ['Milagros', 'Medina'], ['Franco', 'Herrera'], ['Paula', 'Suárez'], ['Ignacio', 'Castro']
];
const NATS = ['ARG', 'ARG', 'ARG', 'URU', 'CHI', 'BRA', 'PAR'];

const fmt = (sec) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec - h * 3600 - m * 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
};
const clock = (sec) => fmt(Math.max(0, sec)).slice(0, 8);
const now = () => new Date().toTimeString().slice(0, 8);

const drivers = Array.from({ length: DRIVERS }, (_, i) => {
  const [first, surname] = NAMES[i % NAMES.length];
  return {
    reg: String(i + 1), number: String([7, 12, 33, 5, 21, 44, 3, 18, 9, 27, 11, 66, 2, 14, 77, 8, 10, 23, 31, 99][i] ?? i + 100),
    first, surname, nat: NATS[i % NATS.length], cls: i % 3 === 0 ? 2 : 1,
    pace: 88 + Math.random() * 4,          // ritmo base en segundos por vuelta
    laps: 0, total: 0, best: null, bestLap: 0, last: null,
    next: 2 + i * 0.6                       // primera pasada (largada escalonada)
  };
});

let raceTime = 0;
let flag = 'Green';
let finished = false;
const clients = new Set();

const send = (line, only) => {
  const data = line + '\r\n';
  for (const c of only ? [only] : clients) { try { c.write(data); } catch (e) { /* cliente caído */ } }
};

function standings() {
  const list = [...drivers];
  if (QUALY) list.sort((a, b) => (a.best ?? 1e9) - (b.best ?? 1e9));
  else list.sort((a, b) => (b.laps - a.laps) || (a.total - b.total) || (a.next - b.next));
  return list;
}

function sendStandings(only) {
  standings().forEach((d, i) => send(`$G,${i + 1},"${d.reg}",${d.laps},"${fmt(d.total)}"`, only));
  [...drivers].filter(d => d.best).sort((a, b) => a.best - b.best)
    .forEach((d, i) => send(`$H,${i + 1},"${d.reg}",${d.bestLap},"${fmt(d.best)}"`, only));
}

function sendHeartbeat(only) {
  const lapsToGo = QUALY ? 9999 : Math.max(0, TOTAL_LAPS - Math.max(0, ...drivers.map(d => d.laps)));
  const timeToGo = QUALY ? clock(15 * 60 - raceTime) : '00:00:00';
  send(`$F,${lapsToGo},"${timeToGo}","${now()}","${clock(raceTime)}","${flag.padEnd(6)}"`, only);
}

// Volcado completo que recibe cada cliente al conectarse (igual que Orbits)
function sendFullState(sock) {
  send(`$I,"${now()}.000","${new Date().toDateString()}"`, sock);
  send('$E,"TRACKNAME","Autódromo de Prueba"', sock);
  send('$E,"TRACKLENGTH","3.200"', sock);
  send(`$B,1,"${QUALY ? 'Turismo Pista - Clasificación' : 'Turismo Pista - Carrera Final'}"`, sock);
  send('$C,1,"Clase 2"', sock);
  send('$C,2,"Clase 3"', sock);
  drivers.forEach(d => send(`$COMP,"${d.reg}","${d.number}",${d.cls},"${d.first}","${d.surname}","${d.nat}",""`, sock));
  sendHeartbeat(sock);
  sendStandings(sock);
}

// Cada 100 ms reales avanza 0.1 * SPEED segundos de carrera
setInterval(() => {
  if (finished) return;
  raceTime += 0.1 * SPEED;
  let crossed = false;
  for (const d of drivers) {
    if (raceTime < d.next) continue;
    const lapTime = d.pace + (Math.random() - 0.4) * 1.5 + (flag === 'Yellow' ? 12 : 0);
    if (d.laps > 0 || QUALY) {
      d.last = lapTime; d.total += lapTime;
      if (!d.best || lapTime < d.best) { d.best = lapTime; d.bestLap = d.laps + 1; }
    } else {
      d.total = raceTime; // pasada de largada
    }
    d.laps += 1;
    d.next = raceTime + lapTime;
    if (d.last) send(`$J,"${d.reg}","${fmt(d.last)}","${fmt(d.total)}"`);
    crossed = true;
  }
  if (crossed) sendStandings();
  const leaderLaps = Math.max(...drivers.map(d => d.laps));
  if (!QUALY && leaderLaps > TOTAL_LAPS) { flag = 'Finish'; finished = true; sendHeartbeat(); console.log('🏁 Carrera terminada (Ctrl+C para salir)'); }
  if (QUALY && raceTime >= 15 * 60) { flag = 'Finish'; finished = true; sendHeartbeat(); console.log('🏁 Clasificación terminada'); }
}, 100);

// Latido cada 1 s y una amarilla de prueba a mitad de carrera
setInterval(() => {
  if (!finished) {
    const leaderLaps = Math.max(...drivers.map(d => d.laps));
    const half = Math.floor(TOTAL_LAPS / 2);
    if (!QUALY) flag = leaderLaps === half ? 'Yellow' : 'Green';
  }
  sendHeartbeat();
}, 1000);

const server = net.createServer(sock => {
  clients.add(sock);
  console.log(`🟢 Cliente conectado: ${sock.remoteAddress}:${sock.remotePort} (${clients.size} conectados)`);
  sendFullState(sock);
  sock.on('error', () => {});
  sock.on('close', () => { clients.delete(sock); console.log(`🔴 Cliente desconectado (${clients.size} conectados)`); });
});
server.on('error', e => {
  console.error(e.code === 'EADDRINUSE' ? `❌ El puerto ${PORT} ya está en uso (¿Orbits abierto u otro simulador?). Probá con --port 50001` : e.message);
  process.exit(1);
});
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🏎️  Simulador de Orbits escuchando en el puerto ${PORT} — ${QUALY ? 'CLASIFICACIÓN' : `CARRERA a ${TOTAL_LAPS} vueltas`}, ${DRIVERS} pilotos, velocidad x${SPEED}`);
  console.log('   En Overlay Racing: AJUSTES -> "MYLAPS Orbits 4 / 5 (IP)" -> IP 127.0.0.1, puerto ' + PORT);
});
