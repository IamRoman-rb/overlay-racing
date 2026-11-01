// Edición de objetos dentro de una gráfica (pestaña EDITOR). Copia de race/src/utils/layoutEdit.js.
//
// Las gráficas son JSX fijo, así que sus "objetos" (logo, título, tabla, etc.) se detectan a partir del DOM ya
// renderizado y se mueven con la propiedad CSS `translate`, que es independiente de `transform`: no pisa las
// animaciones de entrada ni la escala de la gráfica. Cada objeto se identifica por su camino dentro de la gráfica
// ("div:0>div:1>h1:0"); los desplazamientos se guardan en state.edits[idGráfica] = { camino: { x, y } } y los tamaños de texto en state.textSizes.

// Un bloque con más hijos que esto (por ejemplo las filas de pilotos) se mueve entero, no fila por fila
const MAX_SPLIT = 8;
const SKIP_TAGS = new Set(['STYLE', 'SCRIPT', 'LINK']);

// El tapado con logo (data-logo-cover) vive dentro de la gráfica pero no es un objeto de ella
const kidsOf = (el) => Array.from(el.children).filter(c => !SKIP_TAGS.has(c.tagName) && !c.hasAttribute('data-logo-cover'));
const hasOwnText = (el) => Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim() !== '');
const isRendered = (el) => {
  const display = getComputedStyle(el).display;
  if (display === 'none') return false;
  if (display === 'contents') return true;
  const r = el.getBoundingClientRect();
  return r.width > 0 || r.height > 0;
};

export function pathOf(wrapper, el) {
  const steps = [];
  let node = el;
  while (node && node !== wrapper) {
    const parent = node.parentElement;
    if (!parent) return null;
    steps.unshift(`${node.tagName.toLowerCase()}:${kidsOf(parent).indexOf(node)}`);
    node = parent;
  }
  return node === wrapper ? steps.join('>') : null;
}

export function resolvePath(wrapper, key) {
  let node = wrapper;
  for (const step of key.split('>')) {
    const [tag, idx] = step.split(':');
    const child = kidsOf(node)[Number(idx)];
    if (!child || child.tagName.toLowerCase() !== tag) return null;
    node = child;
  }
  return node;
}

// Objetos movibles de la gráfica. `depth` = cuántos niveles de bloques se separan (1 = bloques grandes, 3 = detalle fino).
export function detectObjects(wrapper, depth = 1) {
  const found = [];
  const split = (el, level) => {
    const kids = kidsOf(el).filter(isRendered);
    if (kids.length === 0 || hasOwnText(el)) { found.push(el); return; }
    // Cadena de envoltorios (un solo hijo): se baja sin gastar nivel
    if (kids.length === 1) { split(kids[0], level); return; }
    if (level > depth || kids.length > MAX_SPLIT) { found.push(el); return; }
    kids.forEach(kid => split(kid, level + 1));
  };
  kidsOf(wrapper).filter(isRendered).forEach(root => split(root, 1));
  return found
    .map(el => ({ el, key: pathOf(wrapper, el) }))
    .filter(o => o.key)
    .filter((o, i, all) => all.findIndex(p => p.key === o.key) === i);
}

// Nombre corto para mostrar en la lista de objetos: su texto, o "imagen" si solo tiene una
export function describeObject(el) {
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (text) return text.length > 28 ? `${text.slice(0, 28)}…` : text;
  return el.tagName === 'IMG' || el.querySelector('img') ? 'img' : '';
}

// El navegador interno de vMix 23 y anteriores es un Chromium viejo sin la propiedad `translate`: ahí se corre el objeto
// con left/top (si está en el flujo normal) o con margin (si ya está posicionado de forma absoluta).
const SUPPORTS_TRANSLATE = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('translate', '1px 1px');
const fallbackOriginals = new WeakMap();

function setOffset(el, x, y) {
  if (SUPPORTS_TRANSLATE) { el.style.setProperty('translate', `${x}px ${y}px`); return; }
  if (!fallbackOriginals.has(el)) {
    const cs = getComputedStyle(el);
    fallbackOriginals.set(el, {
      position: el.style.position, left: el.style.left, top: el.style.top, marginLeft: el.style.marginLeft, marginTop: el.style.marginTop,
      computedPosition: cs.position, baseMarginLeft: parseFloat(cs.marginLeft) || 0, baseMarginTop: parseFloat(cs.marginTop) || 0
    });
  }
  const orig = fallbackOriginals.get(el);
  if (orig.computedPosition === 'absolute' || orig.computedPosition === 'fixed') {
    el.style.marginLeft = `${orig.baseMarginLeft + x}px`;
    el.style.marginTop = `${orig.baseMarginTop + y}px`;
  } else {
    if (orig.computedPosition === 'static') el.style.position = 'relative';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }
}

function clearOffset(el) {
  el.style.removeProperty('translate');
  const orig = fallbackOriginals.get(el);
  if (!orig) return;
  el.style.position = orig.position;
  el.style.left = orig.left;
  el.style.top = orig.top;
  el.style.marginLeft = orig.marginLeft;
  el.style.marginTop = orig.marginTop;
  fallbackOriginals.delete(el);
}


const textSizeOriginals = new WeakMap();

// Aplica tamaños tipográficos por objeto DOM. Se guardan por camino dentro de cada gráfica,
// por lo que cambiar un texto no afecta a ningún otro.
export function applyTextSizes(wrapper, sizes) {
  wrapper.querySelectorAll('[data-le-text-size]').forEach(el => {
    const original = textSizeOriginals.get(el);
    if (original) {
      if (original.value) el.style.setProperty('font-size', original.value, original.priority);
      else el.style.removeProperty('font-size');
      textSizeOriginals.delete(el);
    }
    el.removeAttribute('data-le-text-size');
  });
  if (!sizes) return;
  Object.entries(sizes).forEach(([key, raw]) => {
    const size = Number(raw);
    if (!Number.isFinite(size) || size < 6 || size > 240) return;
    const el = resolvePath(wrapper, key);
    if (!el || !el.style) return;
    if (!textSizeOriginals.has(el)) {
      textSizeOriginals.set(el, {
        value: el.style.getPropertyValue('font-size'),
        priority: el.style.getPropertyPriority('font-size')
      });
    }
    el.style.setProperty('font-size', `${Math.round(size)}px`, 'important');
    el.setAttribute('data-le-text-size', '1');
  });
}

export function applyLayoutEdits(wrapper, edits) {
  wrapper.querySelectorAll('[data-le]').forEach(el => {
    clearOffset(el);
    el.removeAttribute('data-le');
  });
  if (!edits) return;
  Object.entries(edits).forEach(([key, off]) => {
    if (!off || (!off.x && !off.y)) return;
    const el = resolvePath(wrapper, key);
    if (!el || !el.style) return;
    setOffset(el, off.x || 0, off.y || 0);
    el.setAttribute('data-le', '1');
  });
}
