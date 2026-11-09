// Pruebas de la detección automática del trazado con imágenes sintéticas (pista dibujada con un recorrido conocido).
import test from 'node:test';
import assert from 'node:assert/strict';
import { detectTrackFromPixels } from '../src/utils/trackDetect.js';

// Recorrido real del circuito (en % de la imagen) parecido al de la pestaña CIRCUITO
const KEY = [[64, 94], [38, 72], [30, 60], [27, 40], [28, 22], [31, 12], [35, 6], [40, 8], [43, 14], [47, 19], [50, 16], [52, 15], [57, 17],
  [63, 21], [66, 24], [66, 33], [69, 40], [73, 44], [74, 49], [71, 51], [64, 50], [60, 47], [58, 50], [58, 57], [62, 63], [67, 70], [71, 78],
  [72, 88], [70, 95], [67, 96]];

function distToSeg(px, py, ax, ay, bx, by) {
  const vx = bx - ax; const vy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}
const loopPx = (w, h) => KEY.map(([x, y]) => [x / 100 * w, y / 100 * h]);
function distToLoop(px, py, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    best = Math.min(best, distToSeg(px, py, a[0], a[1], b[0], b[1]));
  }
  return best;
}
function insidePoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]; const [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// paint(x, y) -> [r, g, b, a]
function makeImage(w, h, paint) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(paint(x, y), (y * w + x) * 4);
  return { data, width: w, height: h };
}

// Error medio (en % del ancho) entre los puntos sugeridos y la línea central real, y cobertura del recorrido
function quality(result, w, h) {
  const pts = loopPx(w, h);
  const errs = result.points.map(p => distToLoop(p.x / 100 * w, p.y / 100 * h, pts) / w * 100);
  // Cobertura: cada vértice del recorrido real tiene un punto sugerido cerca
  const covered = pts.filter(([x, y]) => result.points.some(p => Math.hypot(p.x / 100 * w - x, p.y / 100 * h - y) < w * 0.06)).length / pts.length;
  return { mean: errs.reduce((a, b) => a + b, 0) / errs.length, covered };
}

const W = 360; const H = 240;
const PTS = loopPx(W, H);
const band = (x, y, half) => distToLoop(x, y, PTS) <= half;

test('PNG sin fondo: pista opaca sobre transparente', () => {
  const img = makeImage(W, H, (x, y) => (band(x, y, 6) ? [90, 90, 90, 255] : [0, 0, 0, 0]));
  const r = detectTrackFromPixels(img);
  assert.ok(!r.error, r.error);
  assert.equal(r.method, 'alpha');
  const q = quality(r, W, H);
  assert.ok(q.mean < 0.5, `error medio ${q.mean.toFixed(2)} %`);
  assert.ok(q.covered > 0.9, `cobertura ${q.covered}`);
  assert.ok(r.closed);
});

test('Imagen con fondo blanco: pista oscura', () => {
  const img = makeImage(W, H, (x, y) => (band(x, y, 6) ? [40, 40, 40, 255] : [255, 255, 255, 255]));
  const r = detectTrackFromPixels(img);
  assert.ok(!r.error, r.error);
  assert.equal(r.method, 'color');
  const q = quality(r, W, H);
  assert.ok(q.mean < 0.5, `error medio ${q.mean.toFixed(2)} %`);
  assert.ok(q.covered > 0.9, `cobertura ${q.covered}`);
});

test('Fondo oscuro con bordes claros, calle de boxes y un texto suelto', () => {
  const pit = [[64 / 100 * W, 94 / 100 * H], [50 / 100 * W, 88 / 100 * H], [40 / 100 * W, 78 / 100 * H]];
  const img = makeImage(W, H, (x, y) => {
    const d = distToLoop(x, y, PTS);
    const onPit = distToSeg(x, y, pit[0][0], pit[0][1], pit[1][0], pit[1][1]) < 2 || distToSeg(x, y, pit[1][0], pit[1][1], pit[2][0], pit[2][1]) < 2;
    const text = x > 300 && x < 340 && y > 20 && y < 34; // "logo" separado de la pista
    if (d <= 5) return [70, 70, 70, 255];
    if (d <= 7) return [230, 230, 230, 255];
    if (onPit || text) return [200, 200, 200, 255];
    return [17, 17, 17, 255];
  });
  const r = detectTrackFromPixels(img);
  assert.ok(!r.error, r.error);
  const q = quality(r, W, H);
  assert.ok(q.mean < 0.6, `error medio ${q.mean.toFixed(2)} %`);
  assert.ok(q.covered > 0.85, `cobertura ${q.covered}`);
});

test('Circuito dibujado como figura rellena: usa el contorno', () => {
  const img = makeImage(W, H, (x, y) => (insidePoly(x, y, PTS) ? [200, 30, 30, 255] : [255, 255, 255, 255]));
  const r = detectTrackFromPixels(img);
  assert.ok(!r.error, r.error);
  const q = quality(r, W, H);
  assert.ok(q.mean < 1.5, `error medio ${q.mean.toFixed(2)} %`);
  assert.ok(q.covered > 0.85, `cobertura ${q.covered}`);
});

test('Imagen sin pista reconocible', () => {
  const img = makeImage(W, H, () => [255, 255, 255, 255]);
  assert.ok(detectTrackFromPixels(img).error);
});
