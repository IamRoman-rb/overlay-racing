// `inset` (atajo de top/right/bottom/left) recién existe en Chrome 87: el input "Web Browser" de vMix 23 es Chrome 77 y
// lo ignora, así que una capa con `position: absolute; inset: 0` queda de 0x0 (banderas, fotos, recorrido del circuito
// invisibles o corridos por IP). En las gráficas se usa siempre esto en su lugar.
//   insetBox(0)                 -> { top: 0, right: 0, bottom: 0, left: 0 }
//   insetBox('6% -10% 0 -10%')  -> mismo orden que en CSS (1 a 4 valores)
export function insetBox(value = 0) {
  const parts = typeof value === 'number' ? [value] : String(value).trim().split(/\s+/).filter(Boolean);
  const v = parts.length ? parts : [0];
  const top = v[0];
  const right = v.length > 1 ? v[1] : top;
  const bottom = v.length > 2 ? v[2] : top;
  const left = v.length > 3 ? v[3] : right;
  return { top, right, bottom, left };
}

export const FILL = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

// Estilo con un `inset` adentro (por ejemplo el que reciben las banderas detrás de las fotos) -> sin `inset`
export function expandInset(style) {
  if (!style || style.inset === undefined) return style;
  const { inset, ...rest } = style;
  return { ...insetBox(inset), ...rest };
}
