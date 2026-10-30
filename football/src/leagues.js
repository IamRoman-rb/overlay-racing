// Estilos visuales de cada liga. Son recreaciones del lenguaje gráfico de cada transmisión (paleta, tipografía, forma
// del marcador y de los jugadores); no incluyen escudos ni logos oficiales: el logo de la competición se carga a mano.
//
//   font / weight / upper : tipografía de todas las gráficas de la liga
//   bg                    : fondo de los paneles grandes (alineación, presentación)
//   accent / accent2      : colores de marca (acento principal y secundario)
//   bug                   : qué marcador se dibuja (ver graphics/Scorebug.jsx)
//   marker                : cómo se dibuja cada jugador en la cancha ('shirt' | 'circle' | 'tag' | 'square')
//   clock                 : 'mmss' (23:11) o 'min' (24')
import { readable } from './state';

export const LEAGUES = {
  bundesliga: {
    id: 'bundesliga', name: 'Bundesliga', country: 'Alemania', tag: 'BL',
    font: "'Barlow Condensed', 'Arial Narrow', sans-serif", weight: 800, upper: true,
    bg: 'linear-gradient(135deg, #17171a 0%, #2b0c10 100%)', panel: 'rgba(255,255,255,0.07)',
    text: '#ffffff', muted: '#b9b9c0', accent: '#d20515', accent2: '#ffffff', onAccent: '#ffffff',
    radius: 0, bug: 'bundesliga', marker: 'shirt', clock: 'mmss',
    pitch: { a: '#1d6b34', b: '#1a6130', line: 'rgba(255,255,255,0.7)' },
    swatch: ['#d20515', '#ffffff', '#17171a']
  },
  premier: {
    id: 'premier', name: 'Premier League', country: 'Inglaterra', tag: 'PL',
    font: "'Poppins', 'Segoe UI', sans-serif", weight: 700, upper: false,
    bg: 'linear-gradient(135deg, #38003c 0%, #5a0f63 55%, #2a0030 100%)', panel: 'rgba(255,255,255,0.1)',
    text: '#ffffff', muted: '#d7b8dc', accent: '#00ff85', accent2: '#e90052', onAccent: '#38003c',
    radius: 14, bug: 'premier', marker: 'circle', clock: 'mmss',
    pitch: { a: '#2c7a4b', b: '#276f43', line: 'rgba(255,255,255,0.65)' },
    swatch: ['#38003c', '#00ff85', '#e90052']
  },
  laliga: {
    id: 'laliga', name: 'LaLiga', country: 'España', tag: 'LL',
    font: "'Montserrat', 'Segoe UI', sans-serif", weight: 800, upper: true,
    bg: 'linear-gradient(135deg, #0c0c10 0%, #1c1c24 100%)', panel: 'rgba(255,255,255,0.07)',
    text: '#ffffff', muted: '#a9a9b6', accent: '#ff4b44', accent2: '#ffcc00', onAccent: '#ffffff',
    radius: 4, bug: 'laliga', marker: 'tag', clock: 'mmss',
    pitch: { a: '#1f6a3a', b: '#1b5f34', line: 'rgba(255,255,255,0.6)' },
    swatch: ['#0c0c10', '#ff4b44', '#ffcc00']
  },
  argentina: {
    id: 'argentina', name: 'Liga Argentina', country: 'Argentina', tag: 'LP',
    font: "'Oswald', 'Arial Narrow', sans-serif", weight: 600, upper: true,
    bg: 'linear-gradient(135deg, #0a2a55 0%, #14437f 100%)', panel: 'rgba(255,255,255,0.09)',
    text: '#ffffff', muted: '#b8cde6', accent: '#75aadb', accent2: '#f6b40e', onAccent: '#0a2a55',
    radius: 6, bug: 'argentina', marker: 'square', clock: 'mmss',
    pitch: { a: '#2a7d3f', b: '#257238', line: 'rgba(255,255,255,0.7)' },
    swatch: ['#0a2a55', '#75aadb', '#f6b40e']
  },
  mls: {
    id: 'mls', name: 'MLS', country: 'Estados Unidos', tag: 'MLS',
    font: "'Inter', 'Segoe UI', sans-serif", weight: 700, upper: false,
    bg: 'linear-gradient(135deg, #08080b 0%, #1a1a22 100%)', panel: 'rgba(255,255,255,0.08)',
    text: '#ffffff', muted: '#a1a1ad', accent: '#ffffff', accent2: '#e31937', onAccent: '#08080b',
    radius: 20, bug: 'mls', marker: 'circle', clock: 'min',
    pitch: { a: '#1b5e37', b: '#185432', line: 'rgba(255,255,255,0.55)' },
    swatch: ['#08080b', '#ffffff', '#e31937']
  }
};

export const LEAGUE_LIST = Object.values(LEAGUES);
export const getLeague = (id) => LEAGUES[id] || LEAGUES.premier;

// Tipografías que se pueden elegir en PERSONALIZAR (se cargan desde Google Fonts en index.html)
export const FONT_OPTIONS = [
  { label: 'Barlow Condensed', value: "'Barlow Condensed', 'Arial Narrow', sans-serif" },
  { label: 'Montserrat', value: "'Montserrat', 'Segoe UI', sans-serif" },
  { label: 'Poppins', value: "'Poppins', 'Segoe UI', sans-serif" },
  { label: 'Oswald', value: "'Oswald', 'Arial Narrow', sans-serif" },
  { label: 'Inter', value: "'Inter', 'Segoe UI', sans-serif" },
  { label: 'Bebas Neue', value: "'Bebas Neue', 'Arial Narrow', sans-serif" },
  { label: 'Roboto Condensed', value: "'Roboto Condensed', 'Arial Narrow', sans-serif" },
  { label: 'Titillium Web', value: "'Titillium Web', 'Segoe UI', sans-serif" },
  { label: 'Anton', value: "'Anton', 'Arial Narrow', sans-serif" },
  { label: 'Teko', value: "'Teko', 'Arial Narrow', sans-serif" },
  { label: 'Rajdhani', value: "'Rajdhani', 'Segoe UI', sans-serif" },
  { label: 'Arial', value: 'Arial, sans-serif' }
];

// Estilo de la liga con los cambios hechos en PERSONALIZAR por encima (font, accent, accent2; vacío = el de la liga)
export function applyStyle(theme, style) {
  if (!style) return theme;
  const out = { ...theme };
  if (style.font) out.font = style.font;
  if (style.accent) { out.accent = style.accent; out.onAccent = readable(style.accent); }
  if (style.accent2) out.accent2 = style.accent2;
  return out;
}
