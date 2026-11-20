#!/usr/bin/env node
// Prepara los logos de marcas (race/public/brands/<slug>.png) para el modo "blanco" de las gráficas.
//
// El modo blanco pinta el logo con `filter: brightness(0) invert(1)`: todo píxel opaco queda blanco. Eso anda con logos
// recortados (letras, siluetas), pero los que son un escudo/óvalo relleno (Ford, Fiat, Ferrari...) quedan como una
// mancha blanca, y los que traen fondo opaco quedan como un rectángulo blanco.
//
// Este script:
//   1. Quita el fondo opaco liso de los logos que lo traen (relleno desde los bordes por color parecido). Sobrescribe el PNG.
//   2. Detecta los logos "rellenos" (sin huecos transparentes por dentro) con detalle interno y genera una versión
//      monocromática en race/public/brands/mono/<slug>.png: blanco con la transparencia según el brillo, así el
//      detalle (letras, borde, dibujo) se sigue leyendo. Marca esas marcas con "mono": true en src/data/brands.json.
//
// Uso: node scripts/brand-logos.cjs   (es idempotente: se puede volver a correr al agregar logos)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..', 'race');
const DIR = path.join(ROOT, 'public', 'brands');
const MONO_DIR = path.join(DIR, 'mono');
const INDEX = path.join(ROOT, 'src', 'data', 'brands.json');

// ---------------------------------------------------------------- PNG RGBA 8 bits (lo único que hay en la carpeta)
function decode(file) {
  const b = fs.readFileSync(file);
  let p = 8, ihdr = null; const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') ihdr = { w: d.readUInt32BE(0), h: d.readUInt32BE(4), bd: d[8], ct: d[9], il: d[12] };
    else if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  if (!ihdr || ihdr.bd !== 8 || ihdr.ct !== 6 || ihdr.il) return null;
  const { w, h } = ihdr, bpp = 4, stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(h * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const ft = raw[y * (stride + 1)], o = y * (stride + 1) + 1, cur = px.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, up = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = raw[o + x];
      if (ft === 1) v += a; else if (ft === 2) v += up; else if (ft === 3) v += (a + up) >> 1;
      else if (ft === 4) { const q = a + up - c, pa = Math.abs(q - a), pb = Math.abs(q - up), pc = Math.abs(q - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? up : c); }
      cur[x] = v & 255;
    }
    prev = cur;
  }
  return { w, h, px };
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const v of buf) c = CRC[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encode({ w, h, px }) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- análisis
const lum = (px, i) => 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
const edgePixels = (w, h) => { const e = []; for (let x = 0; x < w; x++) e.push([x, 0], [x, h - 1]); for (let y = 1; y < h - 1; y++) e.push([0, y], [w - 1, y]); return e; };

// Relleno desde los bordes: marca los píxeles alcanzables que cumplen `pass`
function floodFromEdges(w, h, pass) {
  const seen = new Uint8Array(w * h), st = edgePixels(w, h);
  while (st.length) {
    const [x, y] = st.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = y * w + x;
    if (seen[i] || !pass(i)) continue;
    seen[i] = 1;
    st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}

// 1. Fondo opaco liso → transparente
function removeBackground(img) {
  const { w, h, px } = img, edges = edgePixels(w, h);
  const opaqueEdges = edges.filter(([x, y]) => px[(y * w + x) * 4 + 3] > 200);
  if (opaqueEdges.length / edges.length < 0.6) return false;
  // color de fondo = mediana por canal de los bordes opacos
  const med = [0, 1, 2].map(c => { const v = opaqueEdges.map(([x, y]) => px[(y * w + x) * 4 + c]).sort((a, b) => a - b); return v[v.length >> 1]; });
  const dist = (i) => Math.max(Math.abs(px[i * 4] - med[0]), Math.abs(px[i * 4 + 1] - med[1]), Math.abs(px[i * 4 + 2] - med[2]));
  const TOL = 40, SOFT = 90;
  const bg = floodFromEdges(w, h, (i) => px[i * 4 + 3] < 30 || dist(i) <= SOFT);
  let changed = 0;
  for (let i = 0; i < w * h; i++) {
    if (!bg[i]) continue;
    const d = dist(i);
    // borde suave: lo muy parecido al fondo desaparece, lo intermedio queda semitransparente (antialias)
    const a = d <= TOL ? 0 : Math.round(px[i * 4 + 3] * (d - TOL) / (SOFT - TOL));
    if (a !== px[i * 4 + 3]) { px[i * 4 + 3] = a; changed++; }
  }
  return changed > 0;
}

// Distancia (en píxeles) de cada píxel opaco al borde de la silueta: mide qué tan "gruesas" son las zonas rellenas
function thickness(w, h, px) {
  const dt = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) dt[i] = px[i * 4 + 3] > 128 ? 1e9 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (!dt[i]) continue;
    let v = Math.min(x, y) + 1;
    if (x > 0) v = Math.min(v, dt[i - 1] + 1);
    if (y > 0) v = Math.min(v, dt[i - w] + 1, x > 0 ? dt[i - w - 1] + 1 : v, x < w - 1 ? dt[i - w + 1] + 1 : v);
    dt[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; if (!dt[i]) continue;
    let v = Math.min(dt[i], w - x, h - y);
    if (x < w - 1) v = Math.min(v, dt[i + 1] + 1);
    if (y < h - 1) v = Math.min(v, dt[i + w] + 1, x < w - 1 ? dt[i + w + 1] + 1 : v, x > 0 ? dt[i + w - 1] + 1 : v);
    dt[i] = v;
  }
  return dt;
}

// 2. ¿Tiene zonas rellenas grandes (escudo, óvalo, disco) con detalle adentro? Ahí la silueta blanca pierde el logo.
function monoVersion(img) {
  const { w, h, px } = img;
  const outside = floodFromEdges(w, h, (i) => px[i * 4 + 3] <= 128);
  const dt = thickness(w, h, px), r = Math.max(3, Math.round(Math.min(w, h) * 0.12));
  let interior = 0, opaque = 0, thick = 0; const L = [], LT = [];
  for (let i = 0; i < w * h; i++) {
    if (!outside[i]) interior++;
    if (px[i * 4 + 3] > 128) { opaque++; L.push(lum(px, i * 4)); if (dt[i] >= r) { thick++; LT.push(lum(px, i * 4)); } }
  }
  if (!opaque) return null;
  const solid = interior > 0 && opaque / interior >= 0.97; // sin huecos transparentes adentro
  if (!solid && thick / opaque < 0.1) return null;          // trazos finos (letras, contornos): la silueta ya se lee bien
  L.sort((a, b) => a - b); LT.sort((a, b) => a - b);
  const lo = L[Math.floor(L.length * 0.05)], hi = L[Math.floor(L.length * 0.95)];
  if (hi - lo < 40) return null; // un solo color: la silueta es el logo
  // El color del relleno (zonas gruesas; si no hay, el que domina) queda tenue; el detalle, blanco pleno
  const ref = LT.length ? LT : L, median = ref[ref.length >> 1];
  const invert = median > (lo + hi) / 2;
  const out = Buffer.alloc(px.length);
  for (let i = 0; i < w * h; i++) {
    let t = Math.min(1, Math.max(0, (lum(px, i * 4) - lo) / (hi - lo)));
    if (invert) t = 1 - t;
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = 255;
    out[i * 4 + 3] = Math.round(px[i * 4 + 3] * (0.3 + 0.7 * t));
  }
  return { w, h, px: out };
}

// ---------------------------------------------------------------- main
const index = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
fs.mkdirSync(MONO_DIR, { recursive: true });
const cleaned = [], mono = new Set();
for (const f of fs.readdirSync(DIR).filter(f => /\.png$/i.test(f))) {
  const slug = f.replace(/\.png$/i, '');
  const img = decode(path.join(DIR, f));
  if (!img) { console.warn(`  (salteado, formato no soportado) ${f}`); continue; }
  if (removeBackground(img)) { fs.writeFileSync(path.join(DIR, f), encode(img)); cleaned.push(slug); }
  const m = monoVersion(img);
  const monoFile = path.join(MONO_DIR, f);
  if (m) { fs.writeFileSync(monoFile, encode(m)); mono.add(slug); }
  else if (fs.existsSync(monoFile)) fs.unlinkSync(monoFile);
}
for (const b of index) { if (mono.has(b.slug)) b.mono = true; else delete b.mono; }
fs.writeFileSync(INDEX, JSON.stringify(index));
console.log(`Fondo quitado: ${cleaned.length}${cleaned.length ? ` (${cleaned.join(', ')})` : ''}`);
console.log(`Versión monocromática: ${mono.size}`);
