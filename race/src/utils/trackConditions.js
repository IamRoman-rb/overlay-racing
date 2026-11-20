// CONDICIONES DE PISTA: viento y temperatura sobre el trazado.
// Todo es cálculo puro (sin React) para poder probarlo.
//
// Qué es real y qué es estimado:
//  - El viento (dirección, fuerza, ráfagas) es el dato de Open-Meteo. Lo que se calcula es cómo le pega a cada tramo
//    según hacia dónde va el auto: de frente, de cola o cruzado. Para eso hace falta saber dónde está el norte en la
//    imagen del circuito (config.trackNorth, grados en sentido horario desde "arriba").
//  - La temperatura del asfalto NO la mide nadie: se estima con la del aire, la radiación solar y el viento. Varía
//    por zona sólo con las sombras marcadas (config.trackShade) o con las mediciones cargadas (config.trackTempPoints).

const toRad = (d) => (d * Math.PI) / 180;
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v.replace(',', '.'))) ? Number(v.replace(',', '.')) : null));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Distancia circular entre dos fracciones de vuelta (0..0.5)
export const lapDist = (a, b) => { const d = Math.abs((((a - b) % 1) + 1) % 1); return Math.min(d, 1 - d); };

// Ángulo del norte en la imagen: 0 = arriba (como Google Maps), 90 = a la derecha
export function northAngle(config) {
  const n = num(config?.trackNorth);
  return n === null ? 0 : ((n % 360) + 360) % 360;
}

// Temperatura del asfalto estimada (°C). Regla empírica: con sol pleno (~900 W/m²) y poco viento el asfalto queda
// ~20 °C arriba del aire; el viento lo enfría y de noche queda apenas por debajo del aire.
export function estimateTrackTemp(wd) {
  const air = num(wd?.temp);
  if (air === null) return null;
  const rad = Math.max(0, num(wd?.radiation) ?? 0);
  const wind = Math.max(0, num(wd?.windSpeed) ?? 0);
  const gain = (rad * 0.028) / (1 + wind / 35);
  return Math.round((air + gain - (rad < 20 ? 1 : 0)) * 10) / 10;
}

// Clasificación del viento en un tramo: along = componente a favor (+1 cola, -1 frente), cross = de costado
export function windClass(along) {
  if (along >= 0.5) return 'tail';
  if (along <= -0.5) return 'head';
  return 'cross';
}

// Sombra (0..1) en la fracción de vuelta t. Cada zona: { t, w } (centro y medio ancho), con un borde suave.
export function shadeAt(zones, t) {
  let s = 0;
  (Array.isArray(zones) ? zones : []).forEach(z => {
    const c = num(z?.t); const w = num(z?.w) ?? 0.03;
    if (c === null) return;
    const d = lapDist(t, c);
    const edge = 0.012;
    const v = d <= w ? 1 : d >= w + edge ? 0 : 1 - (d - w) / edge;
    s = Math.max(s, v);
  });
  return s;
}

// Mediciones válidas: [{ t, temp }]
export function validTempPoints(points) {
  return (Array.isArray(points) ? points : [])
    .map(p => ({ t: num(p?.t), temp: num(p?.temp) }))
    .filter(p => p.t !== null && p.temp !== null && p.t >= 0 && p.t <= 1);
}

// Analiza el trazado (salida de buildTrack): para cada muestra, la temperatura y el viento.
//   reverse: true si el sentido de marcha es el contrario al orden de los puntos
// Devuelve { points: [{ x, y, t, temp, along, cross, cls }], air, trackTemp, min, max, hot, cold, share, measured, gusts }
export function analyzeTrack(track, { weatherData, north = 0, shade, tempPoints, reverse = false } = {}) {
  if (!track || !track.samples?.length) return null;
  const wd = weatherData || {};
  const air = num(wd.temp);
  const trackTemp = estimateTrackTemp(wd);
  const windSpeed = Math.max(0, num(wd.windSpeed) ?? 0);
  const windDir = num(wd.windDir);
  const toward = windDir === null ? null : windDir + 180;      // hacia dónde sopla
  const sunGain = trackTemp !== null && air !== null ? Math.max(0, trackTemp - air) : 0;
  const { samples, cum, total } = track;
  const n = samples.length;

  const base = samples.map((p, i) => {
    const a = samples[(i - 1 + n) % n]; const b = samples[(i + 1) % n];
    let dx = b.x - a.x; let dy = b.y - a.y;
    if (reverse) { dx = -dx; dy = -dy; }
    // Rumbo en pantalla (horario desde arriba) -> rumbo geográfico restando el norte de la imagen
    const bearing = Math.atan2(dx, -dy) * 180 / Math.PI - north;
    let along = 0; let cross = 0;
    if (toward !== null && windSpeed > 0) {
      const rel = toRad(toward - bearing);
      along = Math.cos(rel); cross = Math.sin(rel);
    }
    const t = total ? cum[i] / total : i / n;
    // Con sombra plena el asfalto pierde ~70 % de lo que gana con el sol
    const est = trackTemp === null ? null : trackTemp - sunGain * 0.7 * shadeAt(shade, t);
    return { x: p.x, y: p.y, t, est, along, cross, cls: windSpeed > 0 && toward !== null ? windClass(along) : 'none' };
  });

  // Mediciones: se corrige la estimación con la diferencia medida, interpolada por distancia sobre la pista
  const meas = validTempPoints(tempPoints);
  const estAt = (t) => {
    let best = base[0]; let bd = Infinity;
    base.forEach(b => { const d = lapDist(b.t, t); if (d < bd) { bd = d; best = b; } });
    return best.est ?? 0;
  };
  // Sin dato de clima la estimación vale 0 y la medición pasa a ser el valor absoluto
  const offsets = meas.map(m => ({ t: m.t, off: m.temp - estAt(m.t) }));
  const points = base.map(b => {
    let temp = b.est;
    if (offsets.length) {
      let wsum = 0; let vsum = 0; let exact = null;
      offsets.forEach(o => {
        const d = lapDist(b.t, o.t);
        if (d < 1e-4) exact = o.off;
        const w = 1 / (d * d + 1e-6);
        wsum += w; vsum += w * o.off;
      });
      const off = exact !== null ? exact : vsum / wsum;
      temp = (b.est ?? 0) + off;
    }
    return { ...b, temp: temp === null ? null : Math.round(temp * 10) / 10 };
  });

  const withTemp = points.filter(p => p.temp !== null);
  let hot = null; let cold = null;
  withTemp.forEach(p => { if (!hot || p.temp > hot.temp) hot = p; if (!cold || p.temp < cold.temp) cold = p; });
  const share = { head: 0, tail: 0, cross: 0 };
  points.forEach(p => { if (share[p.cls] !== undefined) share[p.cls] += 1; });
  Object.keys(share).forEach(k => { share[k] = n ? Math.round((share[k] / n) * 100) : 0; });

  return {
    points, air, trackTemp, hot, cold,
    min: cold ? cold.temp : null, max: hot ? hot.temp : null,
    share, measured: meas.length > 0, windSpeed, windDir, gusts: num(wd.gusts)
  };
}

// Tramos largos con el mismo tipo de viento (para poner un cartel): [{ cls, mid: punto, len (fracción), along }]
export function windRuns(analysis, minLen = 0.07) {
  if (!analysis) return [];
  const pts = analysis.points;
  const n = pts.length;
  if (!n || pts[0].cls === 'none') return [];
  // Arranca en un cambio de tipo, así un tramo que cruza la largada no queda partido en dos
  let start = pts.findIndex((p, i) => p.cls !== pts[(i - 1 + n) % n].cls);
  if (start < 0) start = 0;
  const runs = [];
  let cur = null;
  for (let k = 0; k < n; k++) {
    const p = pts[(start + k) % n];
    if (!cur || cur.cls !== p.cls) { cur = { cls: p.cls, items: [] }; runs.push(cur); }
    cur.items.push(p);
  }
  return runs
    .map(r => ({ cls: r.cls, len: r.items.length / n, mid: r.items[Math.floor(r.items.length / 2)], along: r.items.reduce((s, p) => s + p.along, 0) / r.items.length }))
    .filter(r => r.len >= minLen && r.cls !== 'cross')
    .sort((a, b) => b.len - a.len)
    .slice(0, 3);
}

// ---------------------------------------------------------------------------------------------------------------------
// Escalas de color

const hexToRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbToHex = (r) => '#' + r.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
function rampColor(stops, k) {
  const x = clamp(Number.isFinite(k) ? k : 0, 0, 1) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const a = hexToRgb(stops[i]); const b = hexToRgb(stops[i + 1]);
  const f = x - i;
  return rgbToHex(a.map((v, j) => v + (b[j] - v) * f));
}

// Temperatura del asfalto: secuencial tipo cámara térmica. Las gráficas van sobre fondo oscuro, así que lo más caliente
// es lo más claro (violeta oscuro -> rojo -> naranja -> amarillo pálido)
export const HEAT_STOPS = ['#4a1486', '#9c179e', '#d8456c', '#f3742f', '#fdb42f', '#fcf5b0'];
export const heatColor = (k) => rampColor(HEAT_STOPS, k);

// Viento por tramo: divergente (cola azul, cruzado gris neutro, frente rojo)
export const WIND_COLORS = { tail: '#3a86ff', cross: '#9aa3ad', head: '#ff4d4d', none: '#9aa3ad' };
export function windAlongColor(along) {
  return along >= 0 ? rampColor(['#9aa3ad', '#6c9df5', '#3a86ff'], along) : rampColor(['#9aa3ad', '#f07f7f', '#ff4d4d'], -along);
}

// Normaliza un valor entre min y max (si son iguales, al medio)
export const norm = (v, min, max) => (max - min > 0.05 ? (v - min) / (max - min) : 0.5);

// ¿Hay que invertir el sentido de marcha? Sí cuando DATOS > SENTIDO DE GIRO dice lo contrario al orden de los puntos.
export function travelReversed(track, circuitDirection) {
  if (!track || (circuitDirection !== 'cw' && circuitDirection !== 'ccw')) return false;
  const s = track.samples;
  let area = 0;
  for (let i = 0; i < s.length; i++) { const a = s[i]; const b = s[(i + 1) % s.length]; area += a.x * b.y - b.x * a.y; }
  return (area > 0 ? 'cw' : 'ccw') !== circuitDirection;
}

// CIRCUITO > CLIMA EN PISTA: clic sobre la pista (snap = nearestOnTrack). Devuelve [clave, valor] para la configuración:
// con 'shade' agrega una sombra (o la quita si ya había una ahí); con 'temp' agrega una medición vacía para completar.
export const SHADE_W = 0.03;
export function condClickPatch(config, tool, snap, now = Date.now()) {
  if (!snap || !Number.isFinite(snap.t)) return null;
  const t = Math.round(snap.t * 10000) / 10000;
  if (tool === 'temp') {
    const pts = Array.isArray(config?.trackTempPoints) ? config.trackTempPoints : [];
    return ['trackTempPoints', [...pts, { id: `m${now.toString(36)}`, t, temp: '' }]];
  }
  const zones = Array.isArray(config?.trackShade) ? config.trackShade : [];
  const hit = zones.findIndex(z => lapDist(z.t, t) <= (Number(z.w) || SHADE_W));
  return ['trackShade', hit >= 0 ? zones.filter((_, i) => i !== hit) : [...zones, { t, w: SHADE_W }]];
}
