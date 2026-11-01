// Duración (en segundos) de la transición de entrada/salida de cada gráfica, configurable en PERSONALIZAR.
// Si el campo está vacío o inválido se usa la duración original de la gráfica (`fallback`).
export function getAnimDuration(config, id, fallback = 0.4) {
  const raw = config?.[`animationDuration_${id}`];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(10, Math.max(0, n));
}

// Transición "enrollar": la gráfica va apareciendo de arriba hacia abajo y desaparece de abajo hacia arriba
// (recorte animado con clip-path; el margen negativo evita cortar sombras ni contenido que sobresale).
// Para los demás estilos no agrega nada. Se usa junto con transition sobre `all` o con clip-path incluido.
export function getRollClip(animStyle, isVisible) {
  if (animStyle !== 'roll') return {};
  return { clipPath: isVisible ? 'inset(-100px)' : 'inset(0px -100px 100% -100px)' };
}
