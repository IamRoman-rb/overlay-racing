// Estilos visuales de cada liga. Son recreaciones del lenguaje gráfico de cada transmisión (paleta, tipografía, forma
// del marcador y de los jugadores); no incluyen escudos ni logos oficiales: el logo de la competición se carga a mano.
//
//   font / weight / upper : tipografía de todas las gráficas de la liga
//   bg / panel            : fondo de los paneles grandes y de las cajas interiores
//   text / muted          : letras principales y secundarias
//   accent / accent2      : colores de marca (acento principal y secundario); onAccent = letra sobre el acento
//   bugBg/bugText, scoreBg/scoreText, clockBg/clockText : colores del marcador (barra, caja del resultado, reloj)
//   barRadius / panelRadius : esquinas del marcador y de los paneles; radius = esquinas de las piezas chicas
//   bug                   : qué marcador se dibuja (ver graphics/Scorebug.jsx)
//   marker                : cómo se dibuja cada jugador en la cancha ('shirt' | 'circle' | 'tag' | 'square')
//   clock                 : 'mmss' (23:11) o 'min' (24')
// Cada gráfica puede pisar cualquiera de estos valores desde PERSONALIZAR (ver applyLook).
import { readable } from './state';

export const LEAGUES = {
  bundesliga: {
    id: 'bundesliga', name: 'Bundesliga', country: 'Alemania', tag: 'BL',
    font: "'Barlow Condensed', 'Arial Narrow', sans-serif", weight: 800, upper: true,
    bg: 'linear-gradient(135deg, #17171a 0%, #2b0c10 100%)', panel: 'rgba(255,255,255,0.07)',
    text: '#ffffff', muted: '#b9b9c0', accent: '#d20515', accent2: '#ffffff', onAccent: '#ffffff',
    bugBg: '#ffffff', bugText: '#111111', scoreBg: '#111111', scoreText: '#ffffff', clockBg: '#2a2a2f', clockText: '#ffffff',
    radius: 0, barRadius: 0, panelRadius: 6, bug: 'bundesliga', marker: 'shirt', clock: 'mmss',
    pitch: { a: '#1d6b34', b: '#1a6130', line: 'rgba(255,255,255,0.7)' },
    swatch: ['#d20515', '#ffffff', '#17171a']
  },
  premier: {
    id: 'premier', name: 'Premier League', country: 'Inglaterra', tag: 'PL',
    font: "'Poppins', 'Segoe UI', sans-serif", weight: 700, upper: false,
    bg: 'linear-gradient(135deg, #38003c 0%, #5a0f63 55%, #2a0030 100%)', panel: 'rgba(255,255,255,0.1)',
    text: '#ffffff', muted: '#d7b8dc', accent: '#00ff85', accent2: '#e90052', onAccent: '#38003c',
    bugBg: 'linear-gradient(135deg, #38003c 0%, #5a0f63 55%, #2a0030 100%)', bugText: '#ffffff', scoreBg: '#ffffff', scoreText: '#38003c', clockBg: '#00ff85', clockText: '#38003c',
    radius: 14, barRadius: 14, panelRadius: 20, bug: 'premier', marker: 'circle', clock: 'mmss',
    pitch: { a: '#2c7a4b', b: '#276f43', line: 'rgba(255,255,255,0.65)' },
    swatch: ['#38003c', '#00ff85', '#e90052']
  },
  laliga: {
    id: 'laliga', name: 'LaLiga', country: 'España', tag: 'LL',
    font: "'Montserrat', 'Segoe UI', sans-serif", weight: 800, upper: true,
    bg: 'linear-gradient(135deg, #0c0c10 0%, #1c1c24 100%)', panel: 'rgba(255,255,255,0.07)',
    text: '#ffffff', muted: '#a9a9b6', accent: '#ff4b44', accent2: '#ffcc00', onAccent: '#ffffff',
    bugBg: '#121216', bugText: '#ffffff', scoreBg: '#ffffff', scoreText: '#111111', clockBg: '#ff4b44', clockText: '#ffffff',
    radius: 4, barRadius: 2, panelRadius: 10, bug: 'laliga', marker: 'tag', clock: 'mmss',
    pitch: { a: '#1f6a3a', b: '#1b5f34', line: 'rgba(255,255,255,0.6)' },
    swatch: ['#0c0c10', '#ff4b44', '#ffcc00']
  },
  argentina: {
    id: 'argentina', name: 'Liga Argentina', country: 'Argentina', tag: 'LP',
    font: "'Oswald', 'Arial Narrow', sans-serif", weight: 600, upper: true,
    bg: 'linear-gradient(135deg, #0a2a55 0%, #14437f 100%)', panel: 'rgba(255,255,255,0.09)',
    text: '#ffffff', muted: '#b8cde6', accent: '#75aadb', accent2: '#f6b40e', onAccent: '#0a2a55',
    bugBg: 'linear-gradient(180deg, #9cc6ec 0%, #75aadb 100%)', bugText: '#0a2a55', scoreBg: '#0a2a55', scoreText: '#ffffff', clockBg: '#f6b40e', clockText: '#0a2a55',
    radius: 6, barRadius: 0, panelRadius: 12, bug: 'argentina', marker: 'square', clock: 'mmss',
    pitch: { a: '#2a7d3f', b: '#257238', line: 'rgba(255,255,255,0.7)' },
    swatch: ['#0a2a55', '#75aadb', '#f6b40e']
  },
  mls: {
    id: 'mls', name: 'MLS', country: 'Estados Unidos', tag: 'MLS',
    font: "'Inter', 'Segoe UI', sans-serif", weight: 700, upper: false,
    bg: 'linear-gradient(135deg, #08080b 0%, #1a1a22 100%)', panel: 'rgba(255,255,255,0.08)',
    text: '#ffffff', muted: '#a1a1ad', accent: '#ffffff', accent2: '#e31937', onAccent: '#08080b',
    bugBg: 'rgba(14,14,18,0.78)', bugText: '#ffffff', scoreBg: 'transparent', scoreText: '#ffffff', clockBg: '#e31937', clockText: '#ffffff',
    radius: 20, barRadius: 999, panelRadius: 26, bug: 'mls', marker: 'circle', clock: 'min',
    pitch: { a: '#1b5e37', b: '#185432', line: 'rgba(255,255,255,0.55)' },
    swatch: ['#08080b', '#ffffff', '#e31937']
  }
};

export const LEAGUE_LIST = Object.values(LEAGUES);
export const getLeague = (id) => LEAGUES[id] || LEAGUES.premier;

// Colores que se pueden cambiar en cada gráfica (PERSONALIZAR). group: dónde se muestran ('base' en todas; el resto sólo en esa gráfica).
export const COLOR_FIELDS = [
  { key: 'text', label: 'Letras', group: 'base' },
  { key: 'muted', label: 'Letras secundarias', group: 'base' },
  { key: 'bg', label: 'Fondo', group: 'base' },
  { key: 'panel', label: 'Cajas interiores', group: 'base' },
  { key: 'accent', label: 'Color principal', group: 'base' },
  { key: 'accent2', label: 'Color secundario', group: 'base' },
  { key: 'borderColor', label: 'Borde', group: 'base' },
  { key: 'bugBg', label: 'Fondo de la barra', group: 'scorebug' },
  { key: 'bugText', label: 'Letras de la barra', group: 'scorebug' },
  { key: 'scoreBg', label: 'Fondo del resultado', group: 'scorebug' },
  { key: 'scoreText', label: 'Letras del resultado', group: 'scorebug' },
  { key: 'clockBg', label: 'Fondo del reloj', group: 'scorebug' },
  { key: 'clockText', label: 'Letras del reloj', group: 'scorebug' },
  { key: 'pitchA', label: 'Cancha (franja clara)', group: 'lineup' },
  { key: 'pitchB', label: 'Cancha (franja oscura)', group: 'lineup' },
  { key: 'pitchLine', label: 'Líneas de la cancha', group: 'lineup' }
];

// Estilo de la liga con los cambios de UNA gráfica por encima. `look` guarda sólo lo que se cambió (vacío = el de la liga):
//   font, text, muted, bg, panel, accent, accent2, bugBg..., pitchA/B/Line, borderColor, borderWidth (px), radius (px)
export function applyLook(theme, look) {
  const out = { ...theme, pitch: { ...theme.pitch }, border: { width: 0, color: theme.accent } };
  if (!look) return out;
  ['font', 'text', 'muted', 'bg', 'panel', 'accent2', 'bugBg', 'bugText', 'scoreBg', 'scoreText', 'clockBg', 'clockText']
    .forEach(k => { if (look[k]) out[k] = look[k]; });
  if (look.accent) { out.accent = look.accent; out.onAccent = readable(look.accent); }
  if (look.pitchA) out.pitch.a = look.pitchA;
  if (look.pitchB) out.pitch.b = look.pitchB;
  if (look.pitchLine) out.pitch.line = look.pitchLine;
  const radius = Number(look.radius);
  if (look.radius !== '' && look.radius !== undefined && Number.isFinite(radius)) {
    out.panelRadius = radius; out.barRadius = radius; out.radius = Math.min(radius, 20); out.radiusCustom = true;
  }
  out.border = { width: Number(look.borderWidth) || 0, color: look.borderColor || out.accent };
  return out;
}

// Borde propio de la gráfica (si el grosor es 0 no agrega nada)
export const borderCss = (t) => (t.border && t.border.width > 0 ? { border: `${t.border.width}px solid ${t.border.color}`, boxSizing: 'border-box' } : {});
