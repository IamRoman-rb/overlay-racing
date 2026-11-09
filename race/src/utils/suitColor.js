// COLOR DEL NÚMERO A PARTIR DEL TRAJE: se analiza la foto del piloto (zona del torso, debajo de la cara), se toma el
// color dominante del traje y se usa de fondo del número, con el texto en negro o blanco según el contraste.
// Se activa en la pestaña PILOTOS (config.numberColorsFromPhotos). Los resultados quedan en memoria por número.
import { useEffect, useState } from 'react';
import { photoUrl, textOnColor } from './elite.js';

const cache = new Map();     // número -> { bg, text } | null (sin foto o sin color claro)
const pending = new Set();
const listeners = new Set();

function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max / 255 };
}
const toHex = (r, g, b) => `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

// Color dominante del traje a partir de los píxeles de la imagen (RGBA)
export function suitColorFromPixels(data, w, h) {
  const bins = new Map();
  let neutral = { n: 0, r: 0, g: 0, b: 0 };
  for (let y = Math.floor(h * 0.45); y < Math.floor(h * 0.95); y++) {
    for (let x = Math.floor(w * 0.15); x < Math.floor(w * 0.85); x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 200) continue; // fondo transparente
      const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
      const { h: hue, s, v } = rgbToHsv(r, g, b);
      // Piel (manos, cuello): tonos anaranjados poco saturados
      if (hue >= 8 && hue <= 45 && s > 0.15 && s < 0.65 && v > 0.35) continue;
      if (s < 0.28 || v < 0.18) {
        neutral = { n: neutral.n + 1, r: neutral.r + r, g: neutral.g + g, b: neutral.b + b };
        continue;
      }
      const key = Math.floor(hue / 15);
      const bin = bins.get(key) || { w: 0, r: 0, g: 0, b: 0 };
      const weight = s * v;
      bins.set(key, { w: bin.w + weight, r: bin.r + r * weight, g: bin.g + g * weight, b: bin.b + b * weight });
    }
  }
  let best = null;
  bins.forEach(bin => { if (!best || bin.w > best.w) best = bin; });
  const colorful = best ? best.w : 0;
  // Traje negro / blanco / gris: si casi no hay color, se usa el neutro dominante
  if (best && colorful > neutral.n * 0.12) {
    const bg = toHex(best.r / best.w, best.g / best.w, best.b / best.w);
    return { bg, text: textOnColor(bg) };
  }
  if (neutral.n > 50) {
    const bg = toHex(neutral.r / neutral.n, neutral.g / neutral.n, neutral.b / neutral.n);
    return { bg, text: textOnColor(bg) };
  }
  return null;
}

function analyze(number) {
  if (pending.has(number) || cache.has(number)) return;
  pending.add(number);
  const done = (value) => { cache.set(number, value); pending.delete(number); listeners.forEach(fn => fn()); };
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const w = 60; const h = Math.max(20, Math.round(60 * img.naturalHeight / Math.max(1, img.naturalWidth)));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
      done(suitColorFromPixels(ctx.getImageData(0, 0, w, h).data, w, h));
    } catch { done(null); }
  };
  img.onerror = () => done(null);
  img.src = photoUrl(number);
}

// { [número]: { bg, text } } de los pilotos con foto, si la opción está activada
export function useSuitColors(drivers, config) {
  const enabled = config?.numberColorsFromPhotos === true && !!config?.photosPath;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const fn = () => setTick(t => t + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, [enabled]);
  const numbers = enabled ? (drivers || []).map(d => String(d && d.number || '')).filter(Boolean) : [];
  const key = numbers.join(',');
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    key.split(',').filter(Boolean).forEach(analyze);
  }, [enabled, key]);
  const out = {};
  if (enabled) numbers.forEach(n => { const v = cache.get(n); if (v) out[n] = v; });
  return out;
}

// Estilo de la ficha del número: el color del traje si hay, si no el de la gráfica
export const numberChip = (suit, number, bg, color) => (suit && suit[String(number)] ? { backgroundColor: suit[String(number)].bg, color: suit[String(number)].text } : { backgroundColor: bg, color });
