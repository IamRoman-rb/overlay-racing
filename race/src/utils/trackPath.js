// Geometría del trazado del mapa en vivo (config.trackPath: puntos en % de la imagen del circuito, o de un lienzo 3:2 si
// no hay imagen; el primero es la largada). `aspect` = ancho / alto de ese espacio (el de la imagen, o 1.5).
// Los puntos marcados a mano tienen pequeñas diferencias entre clic y clic: se limpian (duplicados), se suavizan y se
// unen con una curva Catmull-Rom cerrada, así la pista se ve fluida y los autos se mueven sobre la misma curva.

export const DEFAULT_ASPECT = 1.5; // lienzo 3:2 cuando no hay imagen del circuito

const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

// % de la imagen -> unidades (ancho = aspect, alto = 1) sin deformar, sin puntos repetidos o casi encimados
function toUnits(points, aspect) {
  const out = [];
  (points || []).forEach(p => {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    const q = { x: (p.x / 100) * aspect, y: p.y / 100 };
    if (!out.length || dist(out[out.length - 1], q) > 0.006) out.push(q);
  });
  if (out.length > 2 && dist(out[0], out[out.length - 1]) < 0.006) out.pop();
  return out;
}

// Suavizado de lazo cerrado (1-2-1). La largada (punto 0) se mueve igual que el resto: queda sobre la curva.
function smooth(points, passes) {
  let pts = points;
  for (let k = 0; k < passes; k++) {
    const n = pts.length;
    pts = pts.map((p, i) => {
      const a = pts[(i - 1 + n) % n];
      const b = pts[(i + 1) % n];
      return { x: a.x * 0.25 + p.x * 0.5 + b.x * 0.25, y: a.y * 0.25 + p.y * 0.5 + b.y * 0.25 };
    });
  }
  return pts;
}

// Más puntos marcados => más suavizado (un trazado de 8 puntos casi no se toca; uno de 90 se alisa)
const passesFor = (n) => (n >= 60 ? 3 : n >= 25 ? 2 : n >= 10 ? 1 : 0);

// Segmentos Bézier de una Catmull-Rom cerrada que pasa por todos los puntos
function bezierSegments(pts) {
  const n = pts.length;
  return pts.map((p1, i) => {
    const p0 = pts[(i - 1 + n) % n];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    return {
      p1,
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      p2
    };
  });
}

function bezierAt(s, t) {
  const u = 1 - t;
  const a = u * u * u; const b = 3 * u * u * t; const c = 3 * u * t * t; const d = t * t * t;
  return { x: a * s.p1.x + b * s.c1.x + c * s.c2.x + d * s.p2.x, y: a * s.p1.y + b * s.c1.y + c * s.c2.y + d * s.p2.y };
}

// Arma el trazado listo para dibujar dentro de un recuadro de `width` px de ancho.
//   fit: true = se encuadra el circuito ocupando todo el recuadro (el alto se adapta a la forma del circuito);
//        false = se respeta el lienzo 3:2 completo (para que coincida con la imagen de fondo).
// Devuelve { d, samples, total, height, start: {x,y,angle}, image: {x,y,w,h} } o null si hay menos de 3 puntos.
export function buildTrack(rawPoints, { width = 420, fit = true, pad = 22, minHeight = 170, maxHeight = 340, aspect = DEFAULT_ASPECT } = {}) {
  const ar = Number.isFinite(aspect) && aspect > 0.2 && aspect < 5 ? aspect : DEFAULT_ASPECT;
  const base = toUnits(rawPoints, ar);
  if (base.length < 3) return null;
  const pts = smooth(base, passesFor(base.length));
  const segs = bezierSegments(pts);

  // Muestreo denso de la curva (para ubicar los autos por distancia recorrida)
  const STEPS = Math.max(6, Math.ceil(240 / segs.length));
  const raw = [];
  segs.forEach(s => { for (let k = 0; k < STEPS; k++) raw.push(bezierAt(s, k / STEPS)); });

  // Transformación unidades -> px
  let scale; let ox; let oy; let height;
  if (fit) {
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    raw.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    const bw = Math.max(1e-6, maxX - minX); const bh = Math.max(1e-6, maxY - minY);
    const inner = width - pad * 2;
    height = Math.round(Math.min(maxHeight, Math.max(minHeight, inner * (bh / bw) + pad * 2)));
    scale = Math.min(inner / bw, (height - pad * 2) / bh);
    ox = (width - bw * scale) / 2 - minX * scale;
    oy = (height - bh * scale) / 2 - minY * scale;
  } else {
    height = Math.round(width / ar);
    scale = width / ar;
    ox = 0; oy = 0;
  }
  const tx = (p) => ({ x: p.x * scale + ox, y: p.y * scale + oy });

  const samples = raw.map(tx);
  const cum = [0];
  for (let i = 1; i <= samples.length; i++) cum.push(cum[i - 1] + dist(samples[i - 1], samples[i % samples.length]));
  const total = cum[cum.length - 1];

  const f = (n) => n.toFixed(1);
  const first = tx(segs[0].p1);
  const d = `M ${f(first.x)} ${f(first.y)} ` + segs.map(s => {
    const c1 = tx(s.c1); const c2 = tx(s.c2); const p2 = tx(s.p2);
    return `C ${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
  }).join(' ') + ' Z';

  const next = samples[1];
  const angle = Math.atan2(next.y - samples[0].y, next.x - samples[0].x) * 180 / Math.PI;

  return {
    d, samples, cum, total, height,
    start: { x: samples[0].x, y: samples[0].y, angle },
    image: { x: ox, y: oy, w: ar * scale, h: scale }
  };
}

// Punto de la pista a una fracción de vuelta (0 = largada, 0.5 = media vuelta)
export function pointOnTrack(track, frac) {
  const target = (((frac % 1) + 1) % 1) * track.total;
  const { cum, samples } = track;
  let lo = 0; let hi = cum.length - 1;
  while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= target) lo = mid; else hi = mid; }
  const a = samples[lo % samples.length];
  const b = samples[(lo + 1) % samples.length];
  const len = cum[lo + 1] - cum[lo];
  const k = len ? (target - cum[lo]) / len : 0;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

// Curva suavizada en coordenadas % de la imagen (para la vista previa de la pestaña CIRCUITO, en un SVG 0..100)
export function smoothPathPercent(rawPoints, aspect = DEFAULT_ASPECT) {
  const ar = Number.isFinite(aspect) && aspect > 0.2 && aspect < 5 ? aspect : DEFAULT_ASPECT;
  // Con fit: false y ancho = 100 * aspect, la escala es 100: y queda en %, x hay que dividirla por aspect
  const track = buildTrack(rawPoints, { width: 100 * ar, fit: false, aspect: ar });
  if (!track) return '';
  return track.d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${(parseFloat(x) / ar).toFixed(2)} ${parseFloat(y).toFixed(2)}`);
}

// Punto del trazado (suavizado) más cercano a un punto en % de la imagen. Devuelve { x, y } en % y t = fracción de vuelta
// desde la largada (0..1). Se usa para que las curvas marcadas queden sobre el trazado y se puedan dibujar al aire.
export function nearestOnTrack(rawPoints, aspect, pct) {
  const ar = Number.isFinite(aspect) && aspect > 0.2 && aspect < 5 ? aspect : DEFAULT_ASPECT;
  const track = buildTrack(rawPoints, { width: 100 * ar, fit: false, aspect: ar });
  if (!track || !pct) return null;
  const px = pct.x * ar; const py = pct.y; // mismo espacio que las muestras (escala 100)
  let best = 0; let bestD = Infinity;
  track.samples.forEach((s, i) => {
    const d = (s.x - px) * (s.x - px) + (s.y - py) * (s.y - py);
    if (d < bestD) { bestD = d; best = i; }
  });
  const s = track.samples[best];
  return { x: Math.round((s.x / ar) * 100) / 100, y: Math.round(s.y * 100) / 100, t: Math.round((track.cum[best] / track.total) * 10000) / 10000 };
}

// ---------------------------------------------------------------------------------------------------------------------
// Datos del circuito que salen solos del trazado (presentación del circuito)

// Sentido de giro visto desde arriba: 'cw' (horario) | 'ccw' (antihorario). Coordenadas de pantalla (y hacia abajo).
export function trackDirection(rawPoints, aspect = DEFAULT_ASPECT) {
  const track = buildTrack(rawPoints, { width: 100 * aspect, fit: false, aspect });
  if (!track) return null;
  let area = 0;
  const s = track.samples;
  for (let i = 0; i < s.length; i++) {
    const a = s[i]; const b = s[(i + 1) % s.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area > 0 ? 'cw' : 'ccw';
}

// Hacia qué lado dobla la pista en la fracción de vuelta t: 'L' (izquierda) | 'R' (derecha), según el sentido de marcha
export function turnAt(rawPoints, aspect, t) {
  const track = buildTrack(rawPoints, { width: 100 * aspect, fit: false, aspect });
  if (!track || !Number.isFinite(t)) return null;
  const p0 = pointOnTrack(track, t - 0.012);
  const p1 = pointOnTrack(track, t);
  const p2 = pointOnTrack(track, t + 0.012);
  const cross = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x);
  // Con y hacia abajo, un producto cruz positivo es un giro a la derecha
  return cross > 0 ? 'R' : 'L';
}

// Tramos [desde, hasta] (fracciones de vuelta) a partir de los cortes de sector. Sin cortes: un solo tramo.
export function sectorRanges(splits) {
  const cuts = (Array.isArray(splits) ? splits : [])
    .map(Number).filter(v => Number.isFinite(v) && v > 0.002 && v < 0.998)
    .sort((a, b) => a - b);
  const bounds = [0, ...cuts, 1];
  const out = [];
  for (let i = 0; i < bounds.length - 1; i++) if (bounds[i + 1] - bounds[i] > 0.001) out.push([bounds[i], bounds[i + 1]]);
  return out;
}

// Puntos del trazado entre dos fracciones de vuelta (para dibujar un sector)
export function trackSegment(track, t0, t1) {
  if (!track) return [];
  const pts = [pointOnTrack(track, t0)];
  const a = t0 * track.total; const b = t1 * track.total;
  track.samples.forEach((s, i) => { if (track.cum[i] > a && track.cum[i] < b) pts.push(s); });
  pts.push(pointOnTrack(track, t1 >= 1 ? 0.99999 : t1));
  return pts;
}

// Perspectiva (el circuito "acostado" como en las transmisiones): inclina el plano hacia atrás tilt grados
export function projectTilt(p, { cx, cy, tilt = 50, distance = 900 }) {
  const rad = (tilt * Math.PI) / 180;
  const dy = p.y - cy;
  const z = dy * Math.sin(rad);
  const k = distance / (distance + z);
  return { x: cx + (p.x - cx) * k, y: cy + dy * Math.cos(rad) * k };
}

// Tramos de cada sector en % de la imagen (para pintarlos en la pestaña CIRCUITO): [{ points: 'x,y x,y ...', t0, t1 }]
export function sectorPathsPercent(rawPoints, aspect, splits) {
  const ar = Number.isFinite(aspect) && aspect > 0.2 && aspect < 5 ? aspect : DEFAULT_ASPECT;
  const track = buildTrack(rawPoints, { width: 100 * ar, fit: false, aspect: ar });
  if (!track) return [];
  return sectorRanges(splits).map(([t0, t1]) => ({
    t0, t1,
    points: trackSegment(track, t0, t1).map(p => `${(p.x / ar).toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  }));
}
