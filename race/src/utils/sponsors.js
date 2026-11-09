import { useEffect, useState } from 'react';

// SPONSORS: imágenes o videos que el programa guarda en su carpeta (userData/sponsors) y sirve por /sponsor-assets/<archivo>.
//   config.sponsors            [{ id, name, file, type: 'image' | 'video' }]
//   config.sponsorPlacements   { [gráfica]: { ids: [id...], dx, dy, w, h, interval } }  (dx/dy/w/h en px de la gráfica sin escalar)
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

const num = (v, def, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
};

// Ubicación de los sponsors en una gráfica, con valores válidos (null si no tiene sponsors elegidos que existan)
export function getPlacement(config, id) {
  const raw = config?.sponsorPlacements?.[id];
  if (!raw || typeof raw !== 'object') return null;
  const known = new Set(sponsorList(config).map(s => s.id));
  const ids = (Array.isArray(raw.ids) ? raw.ids : []).filter(x => known.has(x));
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

export function typeFromFile(file) {
  const ext = String(file || '').split('.').pop().toLowerCase();
  return SPONSOR_VIDEO_EXT.includes(ext) ? 'video' : 'image';
}

// Rota entre varios sponsors cada `seconds` (devuelve el índice actual; 0 si está detenido o hay uno solo)
export function useRotation(count, seconds, running = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running || count < 2) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [count, seconds, running]);
  return running && count > 1 ? rotationIndex(count, seconds, now) : 0;
}
