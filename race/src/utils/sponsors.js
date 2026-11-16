import { useCallback, useEffect, useState } from 'react';

// SPONSORS: imágenes o videos que el programa guarda en su carpeta (userData/sponsors) y sirve por /sponsor-assets/<archivo>.
//   config.sponsors            [{ id, name, file, type: 'image' | 'video', crop?: { x, y, w, h } (fracciones 0..1), originalFile?,
//                                 groupId?, active? }]  (el orden de la lista es el orden de rotación; active === false = no sale en rotaciones)
//   config.sponsorGroups       [{ id, name }]  grupos para ordenar la biblioteca y rotar por grupo
//                              (originalFile: el archivo como se cargó, cuando se le quitó el fondo)
//   config.sponsorPlacements   { [gráfica]: { ids: [id...], groups: [grupo...], dx, dy, w, h, interval } }  (dx/dy/w/h en px de la gráfica sin escalar)
//   config.sponsorLive*        opciones de la gráfica SPONSOR al aire (formato, ancho, segundos de rotación)

export const SPONSOR_IMAGE_EXT = ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'];
export const SPONSOR_VIDEO_EXT = ['mp4', 'webm'];
export const DEFAULT_PLACEMENT = { ids: [], dx: 0, dy: -76, w: 180, h: 64, interval: 6 };

export function sponsorUrl(file) {
  if (!file || typeof window === 'undefined') return null;
  const host = window.location.hostname || 'localhost';
  return `http://${host}:8080/sponsor-assets/${encodeURIComponent(file)}`;
}

export const sponsorList = (config) => (Array.isArray(config?.sponsors) ? config.sponsors.filter(s => s && s.id && s.file) : []);

// ¿Sale en las rotaciones y en las gráficas? (se apaga desde la biblioteca sin borrarlo)
export const sponsorActive = (s) => !!s && s.active !== false;

export const sponsorGroups = (config) => (Array.isArray(config?.sponsorGroups) ? config.sponsorGroups.filter(g => g && g.id) : []);

// Sponsors que muestra la gráfica SPONSOR AL AIRE según su estado { rotate, groupId, sponsorId }
export function liveItems(config, state) {
  const all = sponsorList(config);
  if (state?.rotate) return all.filter(s => sponsorActive(s) && (!state.groupId || s.groupId === state.groupId));
  return all.filter(s => s.id === state?.sponsorId);
}

// Mueve un sponsor (arrastrar y soltar en la biblioteca): queda en el grupo `groupId` (null = sin grupo), antes de `beforeId`
// (o al final de ese grupo si beforeId es null). Devuelve una lista nueva.
export function moveSponsor(list, dragId, beforeId, groupId) {
  const src = list.find(s => s.id === dragId);
  if (!src || dragId === beforeId) return list;
  const moved = { ...src };
  if (groupId) moved.groupId = groupId; else delete moved.groupId;
  const rest = list.filter(s => s.id !== dragId);
  let at = beforeId ? rest.findIndex(s => s.id === beforeId) : -1;
  if (at < 0) {
    // Al final del grupo: después del último sponsor de ese grupo (o al final de todo)
    const inGroup = (s) => (groupId ? s.groupId === groupId : !s.groupId);
    let last = -1;
    rest.forEach((s, i) => { if (inGroup(s)) last = i; });
    at = last >= 0 ? last + 1 : rest.length;
  }
  return [...rest.slice(0, at), moved, ...rest.slice(at)];
}

const num = (v, def, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
};

// Ubicación de los sponsors en una gráfica, con valores válidos (null si no tiene sponsors elegidos que existan)
//   ids: los sponsors que se ven (activos, en el orden de la biblioteca): los elegidos uno por uno + los de los grupos elegidos
export function getPlacement(config, id) {
  const raw = config?.sponsorPlacements?.[id];
  if (!raw || typeof raw !== 'object') return null;
  const chosen = new Set(Array.isArray(raw.ids) ? raw.ids : []);
  const groups = new Set(Array.isArray(raw.groups) ? raw.groups : []);
  const ids = sponsorList(config).filter(s => sponsorActive(s) && (chosen.has(s.id) || (s.groupId && groups.has(s.groupId)))).map(s => s.id);
  if (!ids.length) return null;
  return {
    ids,
    dx: num(raw.dx, DEFAULT_PLACEMENT.dx, -4000, 4000),
    dy: num(raw.dy, DEFAULT_PLACEMENT.dy, -4000, 4000),
    w: num(raw.w, DEFAULT_PLACEMENT.w, 20, 1920),
    h: num(raw.h, DEFAULT_PLACEMENT.h, 12, 1080),
    interval: num(raw.interval, DEFAULT_PLACEMENT.interval, 2, 120)
  };
}

// Rectángulo del recuadro de sponsors en el lienzo, a partir de la posición/escala de la gráfica
export function placementRect(placement, pos) {
  const p = pos || { x: 0, y: 0, scale: 1 };
  const s = Number.isFinite(p.scale) && p.scale > 0 ? p.scale : 1;
  return { left: p.x + placement.dx * s, top: p.y + placement.dy * s, width: placement.w * s, height: placement.h * s };
}

// Índice que rota cada `seconds` (el mismo para todas las ventanas: se calcula con el reloj)
export function rotationIndex(count, seconds, now = Date.now()) {
  if (!count || count < 2) return 0;
  const step = Math.max(1, seconds) * 1000;
  return Math.floor(now / step) % count;
}

// IMÁN: acerca el recuadro { x, y, w, h } a las líneas guía (bordes y centro de la gráfica, bordes y centro de la pantalla).
//   mode 'move': se alinea el borde izquierdo / centro / derecho (y arriba / centro / abajo) con la guía más cercana.
//   mode 'size': sólo el borde derecho y el de abajo (al agrandar desde la esquina).
// Devuelve el recuadro ajustado y las guías usadas (para dibujarlas).
export function snapBox(box, xs, ys, threshold, mode = 'move') {
  const best = (anchors, targets) => {
    let hit = null;
    anchors.forEach(a => targets.forEach(tg => {
      const d = tg - a;
      if (Math.abs(d) <= threshold && (!hit || Math.abs(d) < Math.abs(hit.d))) hit = { d, line: tg };
    }));
    return hit;
  };
  const out = { ...box };
  const lines = { x: [], y: [] };
  if (mode === 'size') {
    const hx = best([box.x + box.w], xs); if (hx) { out.w = box.w + hx.d; lines.x.push(hx.line); }
    const hy = best([box.y + box.h], ys); if (hy) { out.h = box.h + hy.d; lines.y.push(hy.line); }
    return { box: out, lines };
  }
  const hx = best([box.x, box.x + box.w / 2, box.x + box.w], xs); if (hx) { out.x = box.x + hx.d; lines.x.push(hx.line); }
  const hy = best([box.y, box.y + box.h / 2, box.y + box.h], ys); if (hy) { out.y = box.y + hy.d; lines.y.push(hy.line); }
  return { box: out, lines };
}

// Formatos que pueden tener transparencia: van sin la caja de fondo al aire (sale solo el logo)
export function sponsorTransparent(sponsor) {
  return !!sponsor && sponsor.type !== 'video' && /\.(png|svg|webp|gif)$/i.test(String(sponsor.file || ''));
}

// Recorte válido (fracciones de la imagen) o null si no hay recorte / es la imagen entera
export function normalizeCrop(crop) {
  if (!crop || typeof crop !== 'object') return null;
  const c = (v) => (Number.isFinite(Number(v)) ? Math.min(1, Math.max(0, Number(v))) : NaN);
  const x = c(crop.x); const y = c(crop.y);
  let w = c(crop.w); let h = c(crop.h);
  if ([x, y, w, h].some(Number.isNaN)) return null;
  w = Math.min(w, 1 - x); h = Math.min(h, 1 - y);
  if (w < 0.01 || h < 0.01) return null;
  if (x < 0.001 && y < 0.001 && w > 0.999 && h > 0.999) return null;
  return { x, y, w, h };
}

// Dónde va la imagen recortada dentro de un recuadro de boxW x boxH (contain = entra entera, cover = llena el recuadro):
//   clip: caja visible (centrada) / media: tamaño y posición de la imagen completa dentro de esa caja
export function cropLayout(boxW, boxH, natW, natH, crop, fit = 'contain') {
  const cw = crop.w * natW; const ch = crop.h * natH;
  if (!(boxW > 0 && boxH > 0 && cw > 0 && ch > 0)) return null;
  const s = fit === 'cover' ? Math.max(boxW / cw, boxH / ch) : Math.min(boxW / cw, boxH / ch);
  const clipW = Math.min(boxW, cw * s); const clipH = Math.min(boxH, ch * s);
  return {
    clip: { left: (boxW - clipW) / 2, top: (boxH - clipH) / 2, width: clipW, height: clipH },
    media: { left: (-crop.x * natW * s - (cw * s - clipW) / 2) || 0, top: (-crop.y * natH * s - (ch * s - clipH) / 2) || 0, width: natW * s, height: natH * s }
  };
}

// QUITAR FONDO: vuelve transparente el fondo de color liso que toca los bordes de la imagen (relleno desde los bordes,
// así el blanco de adentro del logo no se borra). tolerance: 0..255 de diferencia de color. Modifica `data` (RGBA).
export function removeBackground(data, w, h, tolerance = 40) {
  if (!w || !h) return 0;
  // Color de fondo: el más repetido entre los píxeles del borde (cuantizado)
  const counts = new Map();
  const border = [];
  for (let x = 0; x < w; x++) { border.push(x, (h - 1) * w + x); }
  for (let y = 1; y < h - 1; y++) { border.push(y * w, y * w + w - 1); }
  border.forEach(i => {
    const o = i * 4;
    if (data[o + 3] < 20) return;
    const key = ((data[o] >> 4) << 8) | ((data[o + 1] >> 4) << 4) | (data[o + 2] >> 4);
    const e = counts.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    counts.set(key, { n: e.n + 1, r: e.r + data[o], g: e.g + data[o + 1], b: e.b + data[o + 2] });
  });
  let best = null;
  counts.forEach(e => { if (!best || e.n > best.n) best = e; });
  if (!best) return 0; // los bordes ya son transparentes
  const bg = [best.r / best.n, best.g / best.n, best.b / best.n];
  const dist = (o) => Math.max(Math.abs(data[o] - bg[0]), Math.abs(data[o + 1] - bg[1]), Math.abs(data[o + 2] - bg[2]));
  const soft = tolerance * 1.6;
  const seen = new Uint8Array(w * h);
  const stack = border.filter(i => data[i * 4 + 3] >= 20 && dist(i * 4) <= tolerance);
  stack.forEach(i => { seen[i] = 1; });
  let cleared = 0;
  while (stack.length) {
    const i = stack.pop();
    const o = i * 4;
    data[o + 3] = 0;
    cleared++;
    const x = i % w; const y = (i - x) / w;
    const next = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    next.forEach(j => {
      if (j < 0 || seen[j]) return;
      seen[j] = 1;
      const jo = j * 4;
      if (data[jo + 3] < 20) { stack.push(j); return; }
      const d = dist(jo);
      if (d <= tolerance) stack.push(j);
      else if (d < soft) data[jo + 3] = Math.round(data[jo + 3] * (d - tolerance) / (soft - tolerance)); // borde suavizado
    });
  }
  return cleared;
}

// Recorte que deja afuera los bordes transparentes (fracciones), o null si no hay nada visible
export function alphaBounds(data, w, h, minAlpha = 16) {
  let x0 = w; let y0 = h; let x1 = -1; let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < minAlpha) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  return { x: x0 / w, y: y0 / h, w: (x1 - x0 + 1) / w, h: (y1 - y0 + 1) / h };
}

export function typeFromFile(file) {
  const ext = String(file || '').split('.').pop().toLowerCase();
  return SPONSOR_VIDEO_EXT.includes(ext) ? 'video' : 'image';
}

// Cuánto se muestra cada sponsor en una rotación: las imágenes los segundos elegidos; los videos se pasan completos
// (avisan al terminar). VIDEO_SAFETY_MS: por si un video nunca avisa (archivo dañado, códec no soportado), igual se sigue.
export const VIDEO_SAFETY_MS = 15 * 60 * 1000;
export function stepDuration(item, seconds) {
  if (item && item.type === 'video') return VIDEO_SAFETY_MS;
  return Math.max(1, Number(seconds) || 6) * 1000;
}

// Rotación de sponsors: devuelve el índice del que se ve y `next` (lo llama el video al terminar).
// Arranca del primero cada vez que sale al aire o cambia la lista.
export function useSequence(items, seconds, running = true) {
  const count = items.length;
  const key = items.map(s => s.id).join(',');
  const [seq, setSeq] = useState({ index: 0, key, running });
  if (seq.key !== key || seq.running !== running) setSeq({ index: 0, key, running });
  const index = seq.key === key && seq.running === running && count ? seq.index % count : 0;
  const current = items[index];
  const ms = stepDuration(current, seconds);
  useEffect(() => {
    if (!running || count < 2) return undefined;
    const timer = setTimeout(() => setSeq(s => (s.key === key ? { ...s, index: (s.index + 1) % count } : s)), ms);
    return () => clearTimeout(timer);
  }, [running, count, key, index, ms]);
  const next = useCallback(() => setSeq(s => (s.key === key && count ? { ...s, index: (s.index + 1) % count } : s)), [key, count]);
  return { index: running && count > 1 ? index : 0, next };
}
