// Duración (en segundos) de la transición de entrada/salida de cada gráfica, configurable en PERSONALIZAR.
// Si el campo está vacío o inválido se usa la duración original de la gráfica (`fallback`).
export function getAnimDuration(config, id, fallback = 0.4) {
  const raw = config?.[`animationDuration_${id}`];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(10, Math.max(0, n));
}
