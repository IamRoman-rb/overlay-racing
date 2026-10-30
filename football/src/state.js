// Modelo de datos del módulo de fútbol y utilidades puras (sin React).
//
// Un solo objeto de estado lo comparten el panel (que lo edita) y el overlay (que lo dibuja):
//   teams  : biblioteca de equipos cargados a mano (escudo, colores, DT, cuerpo técnico, plantel)
//   match  : el partido en juego (equipos elegidos, liga, formaciones, titulares, suplentes, marcador, reloj, eventos)
//   live   : qué gráficas están al aire en este momento (no se guarda en disco)

export const uid = () => Math.random().toString(36).slice(2, 10);

// Tamaño del lienzo del overlay (px)
export const CANVAS = { width: 1920, height: 1080 };

// Texto negro o blanco según el color de fondo, para que el número de la camiseta siempre se lea
export function readable(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const luma = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return luma > 150 ? '#111111' : '#ffffff';
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// "2026-11-08" -> "domingo 8 de noviembre"
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

export const POSITIONS = ['POR', 'DEF', 'MED', 'DEL'];
export const FORMATIONS = ['4-4-2', '4-3-3', '4-2-3-1', '4-1-4-1', '4-5-1', '3-5-2', '3-4-3', '5-3-2', '5-4-1'];

// start = segundo del partido en el que arranca cada período
export const PERIODS = [
  { id: 'PRE', label: 'PREVIA', start: 0 },
  { id: '1T', label: '1T', start: 0 },
  { id: 'ET', label: 'ENTRETIEMPO', start: 45 * 60 },
  { id: '2T', label: '2T', start: 45 * 60 },
  { id: 'FIN', label: 'FINAL', start: 90 * 60 },
  { id: 'PR1', label: 'PRÓRROGA 1', start: 90 * 60 },
  { id: 'PR2', label: 'PRÓRROGA 2', start: 105 * 60 }
];
// Minuto a partir del cual lo que pasa es tiempo agregado (45+3', 90+2', ...)
const PERIOD_END_MIN = { '1T': 45, '2T': 90, PR1: 105, PR2: 120 };

export const EVENT_KINDS = [
  { id: 'goal', label: 'GOL' },
  { id: 'sub', label: 'CAMBIO' },
  { id: 'yellow', label: 'AMARILLA' },
  { id: 'red', label: 'ROJA' }
];

export const emptyPlayer = () => ({ id: uid(), number: '', name: '', nick: '', pos: 'MED', photo: null, captain: false });
export const emptyTeam = () => ({
  id: uid(), name: 'Nuevo equipo', short: 'NEW', color1: '#1d4ed8', color2: '#ffffff', logo: null, stadium: '',
  coach: { name: '', photo: null }, staff: [], players: []
});
export const emptySide = () => ({ formation: '4-4-2', xi: Array(11).fill(null), bench: [] });

// Gráficas que se pueden mover, escalar y personalizar. x / y son la esquina superior izquierda en px del lienzo de 1920x1080.
export const GRAPHICS = [
  { id: 'scorebug', label: 'Marcador + reloj' },
  { id: 'lineup', label: 'Alineación' },
  { id: 'intro', label: 'Presentación del partido' },
  { id: 'alert', label: 'Evento (gol, cambio, tarjeta)' }
];
export const DEFAULT_LAYOUT = {
  scorebug: { x: 56, y: 44, scale: 1, opacity: 1 },
  lineup: { x: 60, y: 124, scale: 1, opacity: 1 },
  intro: { x: 150, y: 200, scale: 1, opacity: 1 },
  alert: { x: 300, y: 790, scale: 1, opacity: 1 }
};
// Cambios de estilo que pisan los de la liga (cadena vacía = usar el de la liga)
export const DEFAULT_STYLE = { font: '', accent: '', accent2: '' };

export function defaultState() {
  return {
    layout: { ...DEFAULT_LAYOUT },
    style: { ...DEFAULT_STYLE },
    teams: [],
    match: {
      league: 'premier', competition: '', competitionLogo: null, round: '', stadium: '', date: '', time: '', referee: '',
      homeId: null, awayId: null,
      home: emptySide(), away: emptySide(),
      score: { home: 0, away: 0 },
      clock: { running: false, base: 0, startedAt: null, period: 'PRE', added: 0 },
      events: []
    },
    live: { scorebug: false, intro: false, lineup: { visible: false, side: 'home' }, alert: null }
  };
}

// Completa lo guardado (o recibido) con los valores por defecto, así versiones viejas del archivo no rompen nada
export function normalizeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const match = { ...base.match, ...(raw.match || {}) };
  match.home = { ...emptySide(), ...(match.home || {}) };
  match.away = { ...emptySide(), ...(match.away || {}) };
  match.score = { ...base.match.score, ...(match.score || {}) };
  match.clock = { ...base.match.clock, ...(match.clock || {}) };
  match.events = Array.isArray(match.events) ? match.events : [];
  const live = { ...base.live, ...(raw.live || {}) };
  live.lineup = { ...base.live.lineup, ...(live.lineup || {}) };
  // Cada gráfica conserva lo que tenga guardado y completa lo que falte (así una gráfica nueva no rompe archivos viejos)
  const layout = {};
  GRAPHICS.forEach(({ id }) => { layout[id] = { ...DEFAULT_LAYOUT[id], ...(raw.layout?.[id] || {}) }; });
  const style = { ...DEFAULT_STYLE, ...(raw.style || {}) };
  return { layout, style, teams: Array.isArray(raw.teams) ? raw.teams : [], match, live };
}

export const teamById = (state, id) => state.teams.find(t => t.id === id) || null;
export const teamOfSide = (state, side) => teamById(state, state.match[side === 'away' ? 'awayId' : 'homeId']);
export const playerById = (team, id) => (team && id ? team.players.find(p => p.id === id) : null) || null;

// Datos de un equipo listos para dibujar (con valores de reemplazo si todavía no se eligió equipo)
export function teamInfo(team, fallbackName, fallbackShort, fallbackColor) {
  return {
    name: team?.name || fallbackName,
    short: (team?.short || fallbackShort).toUpperCase(),
    logo: team?.logo || null,
    color: team?.color1 || fallbackColor,
    color2: team?.color2 || '#ffffff',
    stadium: team?.stadium || '',
    coach: team?.coach || { name: '', photo: null },
    staff: team?.staff || []
  };
}

// Nombre que se ve en pantalla: el apodo si lo hay, si no el apellido (última palabra del nombre)
export function displayName(player) {
  if (!player) return '';
  if (player.nick && player.nick.trim()) return player.nick.trim();
  const parts = (player.name || '').trim().split(/\s+/);
  return parts[parts.length - 1] || '';
}

// ---------- Reloj ----------
export const clockSeconds = (clock, now = Date.now()) =>
  clock.running && clock.startedAt ? clock.base + Math.max(0, (now - clock.startedAt) / 1000) : clock.base;

const pad = (n) => String(n).padStart(2, '0');

// Minuto "de televisión": 67' es el que se está jugando (66:xx transcurridos). Pasado el final del período es 45+3'.
export function matchMinute(clock, now = Date.now()) {
  const sec = Math.floor(clockSeconds(clock, now));
  const minute = sec > 0 ? Math.floor(sec / 60) + 1 : 0;
  const end = PERIOD_END_MIN[clock.period];
  if (end && minute > end) return `${end}+${minute - end}`;
  return String(minute);
}

// Texto del reloj de la gráfica. style: 'mmss' (23:11) o 'min' (24')
export function clockText(clock, style, now = Date.now()) {
  if (clock.period === 'PRE') return '';
  if (clock.period === 'ET') return 'ENT.';
  if (clock.period === 'FIN') return 'FINAL';
  const sec = Math.floor(clockSeconds(clock, now));
  if (style === 'min') return `${matchMinute(clock, now)}'`;
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
}

// ---------- Formaciones ----------
// Devuelve los 11 puestos de una formación con su posición en la cancha (x e y entre 0 y 1; el arco está a la izquierda).
// El orden es el de la lista de titulares del panel: arquero y después cada línea de atrás hacia adelante.
export function formationSlots(formation) {
  const lines = [1, ...String(formation).split('-').map(Number).filter(n => n > 0)];
  const slots = [];
  lines.forEach((count, li) => {
    const pos = li === 0 ? 'POR' : li === 1 ? 'DEF' : li === lines.length - 1 ? 'DEL' : 'MED';
    for (let j = 0; j < count; j++) {
      slots.push({
        pos,
        label: `${pos} ${li === 0 ? '' : j + 1}`.trim(),
        x: 0.07 + 0.86 * (li / (lines.length - 1)),
        y: 0.08 + 0.84 * ((j + 1) / (count + 1))
      });
    }
  });
  return slots.slice(0, 11);
}

// Completa los titulares automáticamente según la posición de cada jugador (los de menor número primero)
export function autoLineup(team, formation) {
  const slots = formationSlots(formation);
  const byNumber = (a, b) => (parseInt(a.number, 10) || 999) - (parseInt(b.number, 10) || 999);
  const pool = { POR: [], DEF: [], MED: [], DEL: [] };
  [...team.players].sort(byNumber).forEach(p => (pool[p.pos] || pool.MED).push(p.id));
  const used = new Set();
  const take = (pos) => {
    const id = pool[pos].find(x => !used.has(x)) || Object.values(pool).flat().find(x => !used.has(x)) || null;
    if (id) used.add(id);
    return id;
  };
  const xi = slots.map(s => take(s.pos));
  const bench = team.players.map(p => p.id).filter(id => !used.has(id)).slice(0, 9);
  return { xi, bench };
}

// "10 Lionel Messi DEL" por línea -> jugadores (para cargar un plantel pegándolo de una planilla)
export function parseRoster(text) {
  const posMap = { POR: 'POR', ARQ: 'POR', GK: 'POR', DEF: 'DEF', DF: 'DEF', MED: 'MED', MC: 'MED', MF: 'MED', DEL: 'DEL', FW: 'DEL', DC: 'DEL' };
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
    const tokens = line.split(/[\s,;\t]+/).filter(Boolean);
    const player = emptyPlayer();
    if (/^\d{1,3}$/.test(tokens[0])) player.number = tokens.shift();
    const last = tokens[tokens.length - 1];
    if (tokens.length > 1 && posMap[last?.toUpperCase()]) player.pos = posMap[tokens.pop().toUpperCase()];
    player.name = tokens.join(' ');
    return player;
  }).filter(p => p.name);
}
