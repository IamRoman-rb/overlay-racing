// Archivo de circuito (.circuito.json): el trazado punteado de la pestaña CIRCUITO (puntos, largada, sectores y curvas),
// la imagen del mapa y los datos del circuito, para guardarlo aparte y volver a cargarlo en otra carrera o en otra PC.

export const CIRCUIT_FILE_KIND = 'overlay-racing/circuito';
export const CIRCUIT_FILE_VERSION = 1;

const TEXT_KEYS = ['circuitName', 'circuitCity', 'circuitLength', 'recordTime', 'recordDriver', 'recordNumber', 'recordTeam', 'recordSpeed', 'recordDate', 'recordEvent'];

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null));
const pct = (v) => { const n = num(v); return n === null ? null : Math.round(Math.min(100, Math.max(0, n)) * 100) / 100; };
const clipText = (v, n) => String(v === undefined || v === null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);

// Lo que se guarda: sólo lo del circuito (no toca el resto de la configuración)
export function buildCircuitFile(config, now = new Date()) {
  const c = config || {};
  const data = {
    trackPath: Array.isArray(c.trackPath) ? c.trackPath : [],
    trackSectors: Array.isArray(c.trackSectors) ? c.trackSectors : [],
    trackCurves: Array.isArray(c.trackCurves) ? c.trackCurves : [],
    trackImage: typeof c.trackImage === 'string' ? c.trackImage : null,
    circuitDirection: c.circuitDirection || '',
    trackMapLineColor: c.trackMapLineColor || '',
    trackMapShowImage: c.trackMapShowImage === true,
    // CLIMA EN PISTA: norte del mapa y zonas de sombra (las mediciones son de cada carrera: no se guardan)
    trackNorth: Number.isFinite(Number(c.trackNorth)) ? Number(c.trackNorth) : 0,
    trackShade: Array.isArray(c.trackShade) ? c.trackShade : []
  };
  TEXT_KEYS.forEach(k => { data[k] = c[k] === undefined || c[k] === null ? '' : String(c[k]); });
  return { kind: CIRCUIT_FILE_KIND, version: CIRCUIT_FILE_VERSION, savedAt: now.toISOString(), name: clipText(c.circuitName || c.circuito, 80), data };
}

// Nombre de archivo sugerido: "Autódromo de Zárate.circuito.json" sin caracteres que Windows no acepta
export function circuitFileName(config) {
  const base = clipText(config?.circuitName || config?.circuito || 'circuito', 80).replace(/[\\/:*?"<>|]+/g, '').trim() || 'circuito';
  return `${base}.circuito.json`;
}

// Lee un archivo de circuito (texto o ya parseado) y devuelve el parche para la configuración, o lanza un Error
// con un mensaje para el operador. Valida todo: el archivo puede venir de otra PC o estar editado a mano.
export function parseCircuitFile(input) {
  let raw = input;
  if (typeof input === 'string') {
    try { raw = JSON.parse(input); } catch { throw new Error('El archivo no es un circuito válido (no se pudo leer).'); }
  }
  if (!raw || typeof raw !== 'object') throw new Error('El archivo no es un circuito válido.');
  // También acepta el formato suelto { trackPath: [...] } por si se armó a mano
  const d = raw.kind === CIRCUIT_FILE_KIND && raw.data && typeof raw.data === 'object' ? raw.data : raw;
  if (!Array.isArray(d.trackPath)) throw new Error('El archivo no tiene un trazado de circuito.');

  const trackPath = d.trackPath.slice(0, 2000).map(p => ({ x: pct(p && p.x), y: pct(p && p.y) })).filter(p => p.x !== null && p.y !== null);
  if (trackPath.length < 3) throw new Error('El trazado del archivo tiene menos de 3 puntos.');

  const trackSectors = (Array.isArray(d.trackSectors) ? d.trackSectors : [])
    .map(num).filter(v => v !== null && v > 0 && v < 1).sort((a, b) => a - b).slice(0, 20);
  const trackCurves = (Array.isArray(d.trackCurves) ? d.trackCurves : []).slice(0, 100).map((cv, i) => {
    if (!cv || typeof cv !== 'object') return null;
    const x = pct(cv.x); const y = pct(cv.y);
    if (x === null || y === null) return null;
    const out = { id: clipText(cv.id, 40) || `c${i + 1}`, x, y };
    const name = clipText(cv.name, 60);
    if (name) out.name = name;
    const t = num(cv.t);
    if (t !== null && t >= 0 && t <= 1) out.t = t;
    return out;
  }).filter(Boolean);
  const img = typeof d.trackImage === 'string' && /^data:image\/(png|jpe?g|webp|svg\+xml);base64,/i.test(d.trackImage) ? d.trackImage : null;

  const patch = {
    trackPath, trackSectors, trackCurves, trackImage: img,
    circuitDirection: ['cw', 'ccw'].includes(d.circuitDirection) ? d.circuitDirection : '',
    trackMapShowImage: d.trackMapShowImage === true
  };
  if (/^#[0-9a-f]{6}$/i.test(d.trackMapLineColor || '')) patch.trackMapLineColor = d.trackMapLineColor;
  const north = num(d.trackNorth);
  patch.trackNorth = north === null ? 0 : Math.round(((north % 360) + 360) % 360);
  patch.trackShade = (Array.isArray(d.trackShade) ? d.trackShade : []).slice(0, 50).map(z => {
    const t = num(z && z.t); const w = num(z && z.w);
    return t !== null && t >= 0 && t <= 1 ? { t, w: w !== null && w > 0 && w <= 0.2 ? w : 0.03 } : null;
  }).filter(Boolean);
  TEXT_KEYS.forEach(k => { if (d[k] !== undefined) patch[k] = clipText(d[k], 80); });
  return patch;
}
