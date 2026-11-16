// PAÍSES Y BANDERAS: race/public/flags/<código>.svg (se copian a dist/flags) e índice en src/data/countries.json.
// Código: ISO de 2 letras en mayúscula ("AR"), o regiones como "GB-ENG" (Inglaterra) / "ES-CT" (Cataluña).
import COUNTRIES_RAW from '../data/countries.json';
import circuitos from '../data/circuitos.json';

export const COUNTRIES = COUNTRIES_RAW;
const BY_CODE = new Map(COUNTRIES.map(c => [c.code, c]));

export const flagSrc = (code) => (code && BY_CODE.has(String(code).toUpperCase()) ? `flags/${String(code).toLowerCase()}.svg` : null);

// Nombre en castellano (Intl) con el del archivo como respaldo
let displayNames = null;
try { displayNames = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['es'], { type: 'region' }) : null; } catch { displayNames = null; }
export function countryName(code) {
  const c = BY_CODE.get(String(code || '').toUpperCase());
  if (!c) return '';
  if (displayNames && /^[A-Z]{2}$/.test(c.code)) {
    try { const n = displayNames.of(c.code); if (n && n !== c.code) return n; } catch { /* sin traducción */ }
  }
  return c.name;
}

// Lista para elegir (nombres en castellano, ordenada)
export function countryOptions() {
  return COUNTRIES.map(c => ({ code: c.code, name: countryName(c.code) })).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

// Texto escrito (nombre en castellano o inglés, o código) -> código; '' = vacío; null = no se reconoce
export function countryFromText(text) {
  const v = norm(text);
  if (!v) return '';
  const up = String(text).trim().toUpperCase();
  if (BY_CODE.has(up)) return up;
  const hit = COUNTRIES.find(c => norm(countryName(c.code)) === v || norm(c.name) === v);
  return hit ? hit.code : null;
}

// País del circuito: el elegido a mano (PANEL > CIRCUITO), el del circuito de la lista o el de la ubicación de la PC
// (clima "en esta PC": "Ciudad, AR").
export function circuitCountry(config) {
  const manual = String(config?.circuitCountry || '').toUpperCase();
  if (manual && BY_CODE.has(manual)) return manual;
  const c = circuitos.find(x => x.nombre === config?.circuito);
  if (c && c.pais && BY_CODE.has(c.pais)) return c.pais;
  const place = String(config?.weatherData?.place || '');
  const m = place.match(/,\s*([A-Z]{2})\s*$/);
  if (m && BY_CODE.has(m[1])) return m[1];
  return '';
}

// País de un piloto: el de sus datos (PILOTOS o el cronometraje) o el del mapa número -> país que arma el overlay
export function driverCountry(driver, config, number) {
  const code = String(driver?.country || config?.driverCountries?.[String(number ?? driver?.number ?? '')] || '').toUpperCase();
  return BY_CODE.has(code) ? code : '';
}

// ¿La gráfica muestra banderas junto a los nombres? (PERSONALIZAR > "Mostrar la bandera de cada piloto")
export const flagsEnabled = (config, id) => config?.[`showFlags_${id}`] === true;

// ESTILOS DE LA BANDERA DETRÁS DE LAS FOTOS (PERSONALIZAR > Banderas, config.photoFlagStyle)
//   mask: cómo se recorta / desvanece · wave: la tela ondea · slant: va inclinada
export const PHOTO_FLAG_STYLES = [
  { id: 'oval', label: 'Óvalo (Centro Sólido, Bordes Suaves)', mask: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 0%, #000 55%, rgba(0,0,0,0.6) 75%, transparent 100%)' },
  { id: 'halo', label: 'Halo (Resplandor Muy Suave)', mask: 'radial-gradient(ellipse 50% 50% at 50% 45%, #000 0%, rgba(0,0,0,0.55) 45%, transparent 85%)' },
  { id: 'wave', label: 'Bandera Flameando (Óvalo con Movimiento)', mask: 'radial-gradient(ellipse 52% 50% at 50% 50%, #000 0%, #000 58%, rgba(0,0,0,0.6) 78%, transparent 100%)', wave: true },
  { id: 'column', label: 'Columna (Franja Vertical Detrás)', mask: 'linear-gradient(to right, transparent 12%, #000 32%, #000 68%, transparent 88%)' },
  { id: 'band', label: 'Banda (Franja Horizontal a la Altura del Pecho)', mask: 'linear-gradient(to bottom, transparent 15%, #000 38%, #000 68%, transparent 92%)' },
  { id: 'rise', label: 'Desde Abajo (Sube y se Desvanece Hacia Arriba)', mask: 'linear-gradient(to top, #000 0%, #000 30%, rgba(0,0,0,0.5) 60%, transparent 95%)' },
  { id: 'diagonal', label: 'Diagonal (Franja Inclinada)', mask: 'linear-gradient(120deg, transparent 22%, #000 40%, #000 60%, transparent 78%)', slant: true },
  { id: 'full', label: 'Completa (Toda la Caja, Desvanecida Abajo)', mask: 'linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%)' }
];
export function photoFlagStyle(config) {
  return PHOTO_FLAG_STYLES.find(s => s.id === config?.photoFlagStyle) || PHOTO_FLAG_STYLES[0];
}
// Intensidad elegida (10 % a 100 %); sin elegir, la que trae cada gráfica
export function photoFlagOpacity(config, fallback) {
  const v = Number(config?.photoFlagOpacity);
  return Number.isFinite(v) && v >= 0.1 && v <= 1 ? v : fallback;
}
