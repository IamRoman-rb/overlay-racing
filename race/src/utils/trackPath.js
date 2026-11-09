// Geometría del trazado del mapa en vivo (config.trackPath: puntos en % de un lienzo 3:2, el primero es la largada).
// Los puntos marcados a mano tienen pequeñas diferencias entre clic y clic: se limpian (duplicados), se suavizan y se
// unen con una curva Catmull-Rom cerrada, así la pista se ve fluida y los autos se mueven sobre la misma curva.

const ASPECT_W = 3; // el lienzo de la pestaña CIRCUITO es 3:2: se trabaja en esas unidades para no deformar el circuito
const ASPECT_H = 2;

const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

// % del lienzo -> unidades 3:2, sin puntos repetidos o casi encimados
function toUnits(points) {
  const out = [];
  (points || []).forEach(p => {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    const q = { x: (p.x / 100) * ASPECT_W, y: (p.y / 100) * ASPECT_H };
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
export function buildTrack(rawPoints, { width = 420, fit = true, pad = 22, minHeight = 170, maxHeight = 340 } = {}) {
  const base = toUnits(rawPoints);
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
    height = Math.round(width * (ASPECT_H / ASPECT_W));
    scale = width / ASPECT_W;
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
    image: { x: ox, y: oy, w: ASPECT_W * scale, h: ASPECT_H * scale }
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

// Curva suavizada en coordenadas % del lienzo 3:2 (para la vista previa de la pestaña CIRCUITO)
export function smoothPathPercent(rawPoints) {
  const track = buildTrack(rawPoints, { width: 300, fit: false });
  if (!track) return '';
  // Con fit: false, 300 px = 100 % de ancho y 200 px = 100 % de alto
  return track.d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${(parseFloat(x) / 3).toFixed(2)} ${(parseFloat(y) / 2).toFixed(2)}`);
}
