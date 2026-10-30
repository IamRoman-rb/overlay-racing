// Transición "tapado con logo": al aparecer, la gráfica queda cubierta por el logo de la liga y/o el de la productora
// (sobre un fondo difuminado con los colores del propio logo) y recién después se descubren los datos.
// Es el mismo análisis de colores que usa el módulo de carrera.

const mix = (c, target, t) => c.map((v, i) => Math.round(v + (target[i] - v) * t));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const analysisCache = new Map(); // src -> Promise<{ colors, luminance }>

// Detecta los colores dominantes del logo (prefiere los vivos sobre blancos, negros y grises) y qué tan claro u oscuro es.
// Si la imagen no se puede leer devuelve una paleta vacía y el fondo usa un color de reemplazo.
export function analyzeLogo(src) {
  if (analysisCache.has(src)) return analysisCache.get(src);
  const job = new Promise((resolve) => {
    const fallback = { colors: [], luminance: 0.5, aspect: 1 };
    const img = new Image();
    img.onerror = () => resolve(fallback);
    img.onload = () => {
      // proporción ancho/alto del logo (un SVG sin medidas propias puede dar 0: se toma cuadrado)
      const aspect = img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1;
      fallback.aspect = aspect;
      try {
        const scale = Math.min(1, 64 / Math.max(img.naturalWidth, img.naturalHeight, 1));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        const buckets = new Map();
        let lumSum = 0, lumCount = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue; // transparente: no es parte del logo
          const r = data[i], g = data[i + 1], b = data[i + 2];
          lumSum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; lumCount++;
          const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
          const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
          bucket.r += r; bucket.g += g; bucket.b += b; bucket.n++;
          buckets.set(key, bucket);
        }
        if (lumCount === 0) { resolve(fallback); return; }

        const all = Array.from(buckets.values()).map((bk) => {
          const c = [bk.r / bk.n, bk.g / bk.n, bk.b / bk.n];
          const max = Math.max(...c), min = Math.min(...c);
          const sat = max === 0 ? 0 : (max - min) / max;
          const neutral = sat < 0.18 && (max > 225 || max < 45); // blanco o negro casi puros: no definen el "color" del logo
          return { c, score: bk.n * (0.25 + sat * 2.5) * (neutral ? 0.15 : 1) };
        }).sort((a, b) => b.score - a.score);

        const colors = [];
        for (const { c } of all) {
          if (colors.every(p => dist(p, c) > 70)) colors.push(c.map(Math.round));
          if (colors.length === 3) break;
        }
        resolve({ colors, luminance: lumSum / lumCount, aspect });
      } catch {
        resolve(fallback);
      }
    };
    img.src = src;
  });
  analysisCache.set(src, job);
  return job;
}

// Fondo del tapado a partir de lo detectado en los logos: degradé con sus colores (oscurecidos, o aclarados si el logo es oscuro
// para que se siga leyendo) más un brillo suave. `fallbackColor` = [r,g,b] si no se detectó ningún color.
export function buildCoverBackground(infos, fallbackColor) {
  const found = infos.flatMap(i => i.colors);
  const colors = found.length ? found : [fallbackColor];
  const lum = infos.length ? infos.reduce((s, i) => s + i.luminance, 0) / infos.length : 0.5;
  const lightBase = lum < 0.28 && found.length <= 1; // logo oscuro y sin color vivo: fondo claro
  const tone = (c) => (lightBase ? mix(c, [255, 255, 255], 0.78) : mix(c, [0, 0, 0], 0.55));
  const stops = colors.map(tone);
  if (stops.length === 1) stops.push(lightBase ? mix(colors[0], [255, 255, 255], 0.5) : mix(colors[0], [0, 0, 0], 0.8));
  const css = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
  const gradient = `linear-gradient(120deg, ${stops.map(css).join(', ')})`;
  const glow = `radial-gradient(ellipse at 50% 40%, rgba(255,255,255,${lightBase ? 0.5 : 0.16}), rgba(255,255,255,0) 65%)`;
  return { background: `${glow}, ${gradient}`, lightBase };
}

// Medidas (px) de cada logo dentro de la caja de la gráfica (width x height): todos juntos, centrados y sin pasarse ni del ancho
// ni del alto. En una caja más alta que ancha se apilan; en una más ancha que alta van en fila. Se calcula con la proporción de cada
// logo y con margen en px (un margen en % se mide siempre sobre el ancho y en una tira baja y ancha no dejaba lugar al logo).
export function layoutLogos(aspects, width, height, cap = 320) {
  const vertical = height > width;
  const short = Math.min(width, height);
  const pad = Math.max(2, short * 0.14);
  const gapWanted = Math.max(4, short * 0.1);
  const availW = Math.max(1, width - pad * 2);
  const availH = Math.max(1, height - pad * 2);
  const n = aspects.length;

  const sizes = aspects.map((ar) => {
    const base = vertical ? { w: availW, h: availW / ar } : { w: availH * ar, h: availH };
    const k = Math.min(1, cap / base.w, cap / base.h);
    return { w: base.w * k, h: base.h * k };
  });

  const limit = vertical ? availH : availW;
  const gap = Math.min(gapWanted, Math.max(0, (limit - 1) / Math.max(1, n - 1) / 2));
  const total = sizes.reduce((s, z) => s + (vertical ? z.h : z.w), 0);
  const room = Math.max(1, limit - gap * (n - 1));
  const fit = total > room ? room / total : 1;
  return { vertical, gap, sizes: sizes.map(z => ({ w: Math.max(1, z.w * fit), h: Math.max(1, z.h * fit) })) };
}
