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
