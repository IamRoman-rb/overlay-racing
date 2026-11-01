// Tamaño del lienzo del overlay (px). Por defecto 1920x1080; se cambia en PERSONALIZAR (config.overlayWidth / overlayHeight).
export const DEFAULT_CANVAS = { width: 1920, height: 1080 };
const MIN_SIZE = 320;
const MAX_SIZE = 7680;

function clampDim(raw, fallback) {
  const n = Math.round(parseFloat(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, n));
}

export function getCanvasSize(config) {
  return {
    width: clampDim(config?.overlayWidth, DEFAULT_CANVAS.width),
    height: clampDim(config?.overlayHeight, DEFAULT_CANVAS.height)
  };
}
