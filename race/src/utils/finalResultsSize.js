// Medidas por defecto (px) de la gráfica de resultados finales: el tamaño original de cada formato con la página llena de pilotos.
// Son fijas a propósito: la gráfica NO cambia de tamaño cuando la última página tiene pocos pilotos.
const DEFAULT_SIZES = {
  standard: { width: 1176, height: 774 },
  compact: { width: 1176, height: 728 },
  minimal: { width: 1110, height: 693 },
  broadcast: { width: 1502, height: 586 }
};

export function getFinalResultsDefaultSize(format) {
  return DEFAULT_SIZES[format] || DEFAULT_SIZES.standard;
}

// Ancho y alto con los que se dibuja la gráfica: lo que el operador cargó en PERSONALIZAR o, si está vacío o inválido, el defecto.
export function getFinalResultsSize(config, format) {
  const def = getFinalResultsDefaultSize(format);
  // sizeW_/sizeH_ son las claves genéricas de PERSONALIZAR; finalResultsWidth/Height son las de la versión 1.0.1
  const w = parseFloat(config?.sizeW_finalResults ?? config?.finalResultsWidth);
  const h = parseFloat(config?.sizeH_finalResults ?? config?.finalResultsHeight);
  return {
    width: Number.isFinite(w) && w > 0 ? w : def.width,
    height: Number.isFinite(h) && h > 0 ? h : def.height
  };
}
