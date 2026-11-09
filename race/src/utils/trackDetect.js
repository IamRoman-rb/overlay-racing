// DETECCIÓN AUTOMÁTICA DEL TRAZADO a partir de la imagen del circuito (pestaña CIRCUITO > TRAZADO).
//
// 1. Máscara de la pista: con un PNG sin fondo, los píxeles opacos; con una imagen con fondo, los que se diferencian del
//    color del borde de la imagen (umbral de Otsu sobre la distancia de color).
// 2. Se queda con la mancha más grande (descarta textos, logos y referencias sueltas) y cierra huecos chicos.
// 3. Esqueleto (adelgazamiento de Zhang-Suen) -> línea central de la pista, y se podan las ramas sin salida (calle de
//    boxes, rebabas) hasta que queda el lazo.
// 4. Se recorre el lazo en orden y se reparte en puntos equidistantes, en % de la imagen (mismo espacio que el trazado a mano).
// Si el esqueleto no forma un lazo (por ejemplo, un circuito dibujado como figura rellena), se usa el contorno de la mancha.

const WORK_SIZE = 360; // lado mayor de la imagen de trabajo (px)

const N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

function otsu(hist, total) {
  let sum = 0;
  for (let i = 0; i < hist.length; i++) sum += i * hist[i];
  let sumB = 0; let wB = 0; let best = 0; let thr = 0;
  for (let i = 0; i < hist.length; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB; const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; thr = i; }
  }
  return thr;
}

const medianOf = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] || 0; };

// Máscara de la pista (Uint8Array 0/1) y el método usado
function trackMask({ data, width: w, height: h }) {
  const n = w * h;
  let transparent = 0;
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 16) transparent++;
  const mask = new Uint8Array(n);
  if (transparent > n * 0.12) {
    for (let i = 0; i < n; i++) mask[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
    return { mask, method: 'alpha' };
  }
  // Color de fondo = mediana de los píxeles del borde de la imagen
  const rs = []; const gs = []; const bs = [];
  const pushPx = (x, y) => { const i = (y * w + x) * 4; rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]); };
  for (let x = 0; x < w; x++) { pushPx(x, 0); pushPx(x, h - 1); }
  for (let y = 0; y < h; y++) { pushPx(0, y); pushPx(w - 1, y); }
  const bg = [medianOf(rs), medianOf(gs), medianOf(bs)];
  const dist = new Uint16Array(n);
  const hist = new Array(443).fill(0);
  for (let i = 0; i < n; i++) {
    const dr = data[i * 4] - bg[0]; const dg = data[i * 4 + 1] - bg[1]; const db = data[i * 4 + 2] - bg[2];
    const d = Math.min(442, Math.round(Math.sqrt(dr * dr + dg * dg + db * db)));
    dist[i] = d; hist[d]++;
  }
  // Fondo = lo que se parece al borde de la imagen (con su variación propia); todo lo demás es pista (asfalto + pianos
  // juntos: un umbral de Otsu separaría sólo los bordes blancos y la línea quedaría corrida al costado de la pista).
  const borderDist = [];
  const pushDist = (x, y) => { borderDist.push(dist[y * w + x]); };
  for (let x = 0; x < w; x++) { pushDist(x, 0); pushDist(x, h - 1); }
  for (let y = 0; y < h; y++) { pushDist(0, y); pushDist(w - 1, y); }
  borderDist.sort((a, b) => a - b);
  const p95 = borderDist[Math.floor(borderDist.length * 0.95)] || 0;
  let thr = Math.max(25, p95 + 20);
  let count = 0;
  for (let i = 0; i < n; i++) if (dist[i] > thr) count++;
  // Fondo no uniforme (foto, degradé): se separa lo que más contrasta
  if (count > n * 0.6) thr = Math.max(30, otsu(hist, n));
  for (let i = 0; i < n; i++) mask[i] = dist[i] > thr ? 1 : 0;
  return { mask, method: 'color' };
}

// Mancha (8-conexa) más grande
function largestComponent(mask, w, h) {
  const label = new Int32Array(w * h).fill(-1);
  let best = null;
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || label[s] !== -1) continue;
    const pixels = [];
    stack.push(s); label[s] = s;
    while (stack.length) {
      const p = stack.pop(); pixels.push(p);
      const x = p % w; const y = (p / w) | 0;
      for (const [dx, dy] of N8) {
        const nx = x + dx; const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (mask[q] && label[q] === -1) { label[q] = s; stack.push(q); }
      }
    }
    if (!best || pixels.length > best.length) best = pixels;
  }
  const out = new Uint8Array(w * h);
  (best || []).forEach(p => { out[p] = 1; });
  return { mask: out, size: best ? best.length : 0 };
}

function morph(mask, w, h, dilate) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = dilate ? 0 : 1;
      for (let dy = -1; dy <= 1 && v === (dilate ? 0 : 1); dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx; const ny = y + dy;
          const m = nx < 0 || ny < 0 || nx >= w || ny >= h ? 0 : mask[ny * w + nx];
          if (dilate && m) { v = 1; break; }
          if (!dilate && !m) { v = 0; break; }
        }
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

// Adelgazamiento de Zhang-Suen
function thin(mask, w, h) {
  const m = Uint8Array.from(mask);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : m[y * w + x]);
  let changed = true;
  while (changed) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      const del = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!m[y * w + x]) continue;
          const p2 = at(x, y - 1); const p3 = at(x + 1, y - 1); const p4 = at(x + 1, y); const p5 = at(x + 1, y + 1);
          const p6 = at(x, y + 1); const p7 = at(x - 1, y + 1); const p8 = at(x - 1, y); const p9 = at(x - 1, y - 1);
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
          let a = 0;
          for (let k = 0; k < 8; k++) if (!seq[k] && seq[k + 1]) a++;
          if (a !== 1) continue;
          if (step === 0 && (p2 * p4 * p6 || p4 * p6 * p8)) continue;
          if (step === 1 && (p2 * p4 * p8 || p2 * p6 * p8)) continue;
          del.push(y * w + x);
        }
      }
      if (del.length) { changed = true; del.forEach(i => { m[i] = 0; }); }
    }
  }
  return m;
}

const neighbors = (m, w, h, p) => {
  const x = p % w; const y = (p / w) | 0;
  const out = [];
  for (const [dx, dy] of N8) {
    const nx = x + dx; const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < w && ny < h && m[ny * w + nx]) out.push(ny * w + nx);
  }
  return out;
};

// Saca todas las puntas sueltas una y otra vez: quedan sólo los lazos
function pruneEnds(m, w, h) {
  let queue = [];
  for (let p = 0; p < w * h; p++) if (m[p] && neighbors(m, w, h, p).length <= 1) queue.push(p);
  while (queue.length) {
    const next = [];
    queue.forEach(p => {
      if (!m[p]) return;
      const nb = neighbors(m, w, h, p);
      if (nb.length <= 1) { m[p] = 0; nb.forEach(q => next.push(q)); }
    });
    queue = next;
  }
  return m;
}

// Recorre el lazo del esqueleto prefiriendo seguir derecho en los cruces
function traceLoop(m, w, h) {
  let start = -1;
  // Empieza en el píxel del lazo más abajo (suele estar sobre una recta, lejos de los cruces)
  for (let p = w * h - 1; p >= 0 && start < 0; p--) if (m[p]) start = p;
  if (start < 0) return [];
  const visited = new Uint8Array(w * h);
  const path = [start];
  visited[start] = 1;
  let cur = start; let dir = null;
  for (let guard = 0; guard < w * h; guard++) {
    const cand = neighbors(m, w, h, cur).filter(q => !visited[q]);
    if (!cand.length) break;
    const cx = cur % w; const cy = (cur / w) | 0;
    let pick = cand[0]; let bestScore = -Infinity;
    cand.forEach(q => {
      const dx = (q % w) - cx; const dy = ((q / w) | 0) - cy;
      const len = Math.hypot(dx, dy);
      // Seguir la dirección actual y preferir vecinos en cruz (pasos más cortos)
      const score = (dir ? (dx * dir[0] + dy * dir[1]) / len : 0) - (len > 1 ? 0.05 : 0);
      if (score > bestScore) { bestScore = score; pick = q; }
    });
    const nx = (pick % w) - cx; const ny = ((pick / w) | 0) - cy;
    const nl = Math.hypot(nx, ny);
    dir = dir ? [dir[0] * 0.6 + (nx / nl) * 0.4, dir[1] * 0.6 + (ny / nl) * 0.4] : [nx / nl, ny / nl];
    visited[pick] = 1; path.push(pick); cur = pick;
  }
  return path.map(p => ({ x: p % w, y: (p / w) | 0 }));
}

// Contorno exterior de la mancha (seguimiento de borde de Moore): plan B cuando no hay lazo
function outerContour(mask, w, h) {
  let start = -1;
  for (let p = 0; p < w * h && start < 0; p++) if (mask[p]) start = p;
  if (start < 0) return [];
  const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x];
  const out = [];
  let x = start % w; let y = (start / w) | 0;
  let back = 4; // se llegó desde la izquierda
  const sx = x; const sy = y;
  for (let guard = 0; guard < w * h * 2; guard++) {
    out.push({ x, y });
    let found = false;
    for (let k = 0; k < 8; k++) {
      const d = (back + 1 + k) % 8;
      const nx = x + N8[d][0]; const ny = y + N8[d][1];
      if (at(nx, ny)) { x = nx; y = ny; back = (d + 4) % 8; found = true; break; }
    }
    if (!found || (x === sx && y === sy && out.length > 2)) break;
  }
  return out;
}

// Reparte el recorrido en `count` puntos equidistantes
function resample(pts, count) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = cum[cum.length - 1];
  const out = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const target = (k / count) * total;
    while (j < cum.length - 2 && cum[j + 1] < target) j++;
    const seg = cum[j + 1] - cum[j] || 1;
    const t = (target - cum[j]) / seg;
    out.push({ x: pts[j].x + (pts[j + 1].x - pts[j].x) * t, y: pts[j].y + (pts[j + 1].y - pts[j].y) * t });
  }
  return { points: out, length: total };
}

// imageData: { data (RGBA), width, height }. Devuelve { points: [{x,y} en %], method, closed } o { error }.
export function detectTrackFromPixels(imageData) {
  const { width: w, height: h } = imageData;
  if (!w || !h) return { error: 'EMPTY' };
  const { mask: raw, method } = trackMask(imageData);
  const comp = largestComponent(raw, w, h);
  if (comp.size < w * h * 0.004) return { error: 'NOT_FOUND', method };
  // Cierre (dilatar + erosionar): une cortes chicos de la pista sin rellenar el interior del circuito
  let closed = morph(morph(comp.mask, w, h, true), w, h, false);

  // Ancho típico de la pista = área / largo del esqueleto. Lo que es bastante más fino que la pista (calle de boxes,
  // pianos, líneas de referencia) se borra con una apertura antes de sacar la línea central.
  const area = closed.reduce((a, b) => a + b, 0);
  const skelLen = thin(closed, w, h).reduce((a, b) => a + b, 0) || 1;
  const width = area / skelLen;
  if (width >= 6) {
    const r = Math.min(8, Math.floor(width * 0.3));
    let opened = closed;
    for (let i = 0; i < r; i++) opened = morph(opened, w, h, false);
    for (let i = 0; i < r; i++) opened = morph(opened, w, h, true);
    const main = largestComponent(opened, w, h);
    if (main.size > area * 0.5) closed = main.mask;
  }

  let route = traceLoop(pruneEnds(thin(closed, w, h), w, h), w, h);
  let source = 'skeleton';
  const diag = Math.hypot(w, h);
  const span = (pts) => {
    if (!pts.length) return 0;
    const xs = pts.map(p => p.x); const ys = pts.map(p => p.y);
    return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  };
  // El lazo tiene que abarcar buena parte de la pista; si no (figura rellena, ruido), plan B: el contorno
  if (route.length < 30 || span(route) < span(outerContour(closed, w, h)) * 0.6) {
    route = outerContour(closed, w, h);
    source = 'contour';
  }
  if (route.length < 20) return { error: 'NOT_FOUND', method };

  const first = route[0]; const last = route[route.length - 1];
  const isClosed = Math.hypot(first.x - last.x, first.y - last.y) < diag * 0.04;
  const { points, length } = resample(route, 60);
  const count = Math.max(24, Math.min(90, Math.round(length / (diag * 0.025))));
  const final = resample(route, count).points;
  return {
    points: (final.length ? final : points).map(p => ({ x: Math.round((p.x / w) * 1000) / 10, y: Math.round((p.y / h) * 1000) / 10 })),
    method, source, closed: isClosed
  };
}

// Carga la imagen (data URL) en un canvas reducido y detecta el trazado
export function detectTrackFromImage(src) {
  return new Promise((resolve) => {
    if (!src || typeof document === 'undefined') { resolve({ error: 'EMPTY' }); return; }
    const img = new Image();
    img.onload = () => {
      try {
        const k = Math.min(1, WORK_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(20, Math.round(img.naturalWidth * k));
        const h = Math.max(20, Math.round(img.naturalHeight * k));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(detectTrackFromPixels(ctx.getImageData(0, 0, w, h)));
      } catch (e) {
        resolve({ error: 'FAILED', message: e && e.message });
      }
    };
    img.onerror = () => resolve({ error: 'LOAD' });
    img.src = src;
  });
}
