// ESTILO ELITE: el paquete gráfico de transmisión (presentación del circuito, récord, clima, torre, zócalos).
// Los colores salen de la paleta de PERSONALIZAR (colores del tema), igual que el resto de las gráficas.

export const ELITE_FONT = "'Saira Condensed', 'Barlow Condensed', 'Arial Narrow', sans-serif";

// Colores de los sectores (S1, S2, ...) en la presentación del circuito
export const SECTOR_PALETTE = ['#ff2d55', '#ffd60a', '#19c3ff', '#2fd17f', '#b26bff', '#ff8c1a', '#ff5fd2', '#7ee8fa'];

const hexOk = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

// Mezcla un color con negro (amount < 0) o blanco (amount > 0)
export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  const r = mix((n >> 16) & 255); const g = mix((n >> 8) & 255); const b = mix(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function getElitePalette(config) {
  const pick = (key, fallback) => (hexOk(config?.[key]) ? config[key] : fallback);
  const base = pick('themeBg', '#1a1a1a');           // fondo de las cajas
  const deep = pick('themeHeaderBg', '#000000');     // encabezados y etiquetas
  const accent = pick('themeSecondary', '#3498db');  // detalles y posición en la torre
  const red = pick('themeMain', '#e74c3c');          // franja del récord
  const text = pick('themeNormalText', '#ffffff');
  const muted = pick('themeNumberText', '#bdc3c7');
  return {
    base,
    dark: shade(base, -0.42),
    deep,
    light: shade(base, 0.16),
    panel: rgba(deep, 0.55),
    line: rgba(text, 0.9),
    accent,
    red,
    text,
    muted,
    title: pick('themeTitleText', text),
    // Fondo con un brillo suave de arriba a la derecha, como en la presentación de la transmisión
    background: `radial-gradient(ellipse at 75% 0%, ${shade(base, 0.14)} 0%, ${base} 45%, ${shade(base, -0.3)} 100%)`
  };
}

// Código de 4 letras con el apellido ("Julio Manavella" -> "MANA"), como en las torres de TV
export function surnameCode(name, letters = 4) {
  const clean = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z\s,]/g, ' ').trim();
  if (!clean) return '';
  // "APELLIDO, Nombre" -> apellido primero; si no, la última palabra
  const word = clean.includes(',') ? clean.split(',')[0].trim().split(/\s+/).pop() : clean.split(/\s+/).pop();
  return word.slice(0, letters).toUpperCase();
}

// Color fijo por número de auto (para las fichas de número de la torre)
const NUMBER_COLORS = ['#7b2ff7', '#f5b400', '#f05a28', '#b0123b', '#ffd23f', '#2bb673', '#e0a96d', '#c41e3a', '#1d6fe0', '#167a6e',
  '#f7931e', '#8fd3f4', '#ff9ec7', '#5a1a8c', '#16a34a', '#ffd400', '#e7f6a1', '#6b21a8', '#bfe3b4', '#f4b6a0'];
export function numberColor(num) {
  const s = String(num || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return NUMBER_COLORS[h % NUMBER_COLORS.length];
}

// Texto negro o blanco según el color de fondo
export function textOnColor(hex) {
  if (!hexOk(hex)) return '#fff';
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#000' : '#fff';
}

// Foto de un piloto servida por el programa (carpeta de fotos de PERSONALIZAR): /photo/<número>
export function photoUrl(number) {
  if (!number || typeof window === 'undefined') return null;
  const host = window.location.hostname || 'localhost';
  return `http://${host}:8080/photo/${encodeURIComponent(number)}`;
}
