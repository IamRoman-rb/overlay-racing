// Ancho y alto propios de cada gráfica (PERSONALIZAR): config.sizeW_<id> / config.sizeH_<id>, en px.
// Vacío = tamaño original de la gráfica. Como las gráficas son JSX fijo, el tamaño se aplica sobre el DOM ya renderizado:
// la caja principal de la gráfica toma el ancho/alto pedido y su tarjeta (el único hijo) se estira para llenarla.
// La de resultados finales usa estas mismas claves pero dibuja su tamaño por su cuenta (ver finalResultsSize.js).

export const SIZE_W_PREFIX = 'sizeW_';
export const SIZE_H_PREFIX = 'sizeH_';

const SKIP_TAGS = new Set(['STYLE', 'SCRIPT', 'LINK']);
const originals = new WeakMap(); // elemento -> { propiedad: valor inline original }

export function readSize(raw) {
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

// Pone (o, con value = null, devuelve al original) una propiedad inline recordando lo que había antes
function setProp(el, prop, value) {
  let saved = originals.get(el);
  if (value === null) {
    if (!saved || !(prop in saved)) return;
    if (el.style[prop] !== saved[prop]) el.style[prop] = saved[prop];
    delete saved[prop];
    return;
  }
  if (!saved) { saved = {}; originals.set(el, saved); }
  if (!(prop in saved)) saved[prop] = el.style[prop];
  if (el.style[prop] !== value) el.style[prop] = value;
}

export function applyGraphicSize(wrapper, width, height) {
  Array.from(wrapper.children).filter(c => !SKIP_TAGS.has(c.tagName)).forEach(root => {
    setProp(root, 'width', width ? `${width}px` : null);
    setProp(root, 'height', height ? `${height}px` : null);
    const cards = Array.from(root.children).filter(c => !SKIP_TAGS.has(c.tagName));
    if (cards.length !== 1) return;
    const card = cards[0];
    setProp(card, 'width', width ? '100%' : null);
    setProp(card, 'height', height ? '100%' : null);
    setProp(card, 'boxSizing', width || height ? 'border-box' : null);
  });
}
