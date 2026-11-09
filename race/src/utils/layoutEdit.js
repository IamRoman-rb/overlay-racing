// Edición de objetos dentro de una gráfica (pestaña EDITOR).
//
// Las gráficas son JSX fijo, así que sus "objetos" (logo, título, tabla, etc.) se detectan a partir del DOM ya
// renderizado y se mueven con la propiedad CSS `translate`, que es independiente de `transform`: no pisa las
// animaciones de entrada ni la escala de la gráfica. Cada objeto se identifica por su camino dentro de la gráfica
// ("div:0>div:1>h1:0"); los desplazamientos se guardan en config como layoutEdits_<idGráfica> = { camino: { x, y } }.

export const LAYOUT_EDITS_PREFIX = 'layoutEdits_';

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
// por lo que cambiar un texto no afecta a ningún otro. Devuelve los caminos que no existen en la gráfica tal como está dibujada
// (el tamaño se eligió en el EDITOR con otra variante de la gráfica: otros datos, sin título, otra cantidad de filas...).
export function applyTextSizes(wrapper, sizes) {
  const missing = [];
  wrapper.querySelectorAll('[data-le-text-size]').forEach(el => {
    const original = textSizeOriginals.get(el);
    if (original) {
      if (original.value) el.style.setProperty('font-size', original.value, original.priority);
      else el.style.removeProperty('font-size');
      textSizeOriginals.delete(el);
    }
    el.removeAttribute('data-le-text-size');
  });
  if (!sizes) return missing;
  Object.entries(sizes).forEach(([key, raw]) => {
    const size = Number(raw);
    if (!Number.isFinite(size) || size < 6 || size > 240) return;
    const el = resolvePath(wrapper, key);
    if (!el || !el.style) { missing.push(key); return; }
    if (!textSizeOriginals.has(el)) {
      textSizeOriginals.set(el, {
        value: el.style.getPropertyValue('font-size'),
        priority: el.style.getPropertyPriority('font-size')
      });
    }
    el.style.setProperty('font-size', `${Math.round(size)}px`, 'important');
    el.setAttribute('data-le-text-size', '1');
  });
  return missing;
}

// Igual que applyTextSizes pero para los objetos movidos; también devuelve los caminos que no se encontraron.
export function applyLayoutEdits(wrapper, edits) {
  const missing = [];
  wrapper.querySelectorAll('[data-le]').forEach(el => {
    clearOffset(el);
    el.removeAttribute('data-le');
  });
  if (!edits) return missing;
  Object.entries(edits).forEach(([key, off]) => {
    if (!off || (!off.x && !off.y)) return;
    const el = resolvePath(wrapper, key);
    if (!el || !el.style) { missing.push(key); return; }
    setOffset(el, off.x || 0, off.y || 0);
    el.setAttribute('data-le', '1');
  });
  return missing;
}

// ---------------------------------------------------------------------------------------------------------------------
// Estilos por elemento (pestaña PERSONALIZAR). Igual que los tamaños de texto, se guardan por camino dentro de la gráfica:
// config.elementStyles_<idGráfica> = { camino: { ...campos } }. Los campos vacíos no se tocan (queda el estilo de la gráfica).
//   - TEXTO (color, tipografía, peso, etc.): van al elemento Y a todo lo que tiene adentro. Si se elige un bloque entero
//     cambian todos sus textos (cada texto de la gráfica trae su propio color, así que heredarlo no alcanza).
//   - FONDO, BORDE, SOMBRA, OPACIDAD, IMAGEN y FILTROS: van solo al elemento elegido.
// Si un bloque y un elemento dentro de él tienen estilos, gana el más específico (el de adentro).

export const ELEMENT_STYLES_PREFIX = 'elementStyles_';

export const TEXT_SHADOWS = {
  none: 'none',
  soft: '0 1px 3px rgba(0,0,0,0.6)',
  strong: '0 2px 6px rgba(0,0,0,0.95)',
  glow: '0 0 8px currentColor'
};

export const BOX_SHADOWS = {
  none: () => 'none',
  soft: () => '0 4px 12px rgba(0,0,0,0.45)',
  strong: () => '0 10px 30px rgba(0,0,0,0.85)',
  glow: (s) => `0 0 16px ${s.borderColor || s.bgColor || '#ffffff'}`
};

export const BG_SIZES = { cover: 'cover', contain: 'contain', stretch: '100% 100%' };
export const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'none'];
export const BORDER_SIDES = ['all', 'left', 'right', 'top', 'bottom', 'topBottom', 'leftRight'];
export const IMG_FITS = ['contain', 'cover', 'fill'];

const SIDES = ['top', 'right', 'bottom', 'left'];
const SIDE_SETS = {
  all: SIDES, left: ['left'], right: ['right'], top: ['top'], bottom: ['bottom'],
  topBottom: ['top', 'bottom'], leftRight: ['left', 'right']
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
// Imagen elegida desde el panel (Base64) o la URL local con la que el servidor se la manda a los navegadores remotos (vMix / OBS)
const IMAGE_RE = /^(data:image\/(png|jpeg|svg\+xml);base64,[A-Za-z0-9+/=]+|\/overlay-assets\/element\/[A-Za-z0-9_%.-]+\/[A-Za-z0-9_%.-]+\/[a-zA-Z]+(\?v=[0-9.]+)?)$/;
const isHex = (v) => typeof v === 'string' && HEX_RE.test(v);
const isImage = (v) => typeof v === 'string' && v.length < 30000000 && IMAGE_RE.test(v);
const clampNum = (v, min, max) => {
  if (v === '' || v === null || v === undefined || typeof v === 'boolean') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};

// Campos de imagen de un estilo (el servidor los reemplaza por URLs para los navegadores remotos)
export const ELEMENT_IMAGE_FIELDS = ['bgImage', 'imgSrc'];

export function hexToRgba(hex, alphaPercent = 100) {
  if (!isHex(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  const a = clampNum(alphaPercent, 0, 100);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a === null ? 1 : a / 100})`;
}

// Saca de un estilo los valores inválidos (por ejemplo los que vienen de un .json editado a mano). Devuelve null si no queda nada.
export function sanitizeElementStyle(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  const num = (field, min, max, round = false) => {
    const n = clampNum(raw[field], min, max);
    if (n !== null) out[field] = round ? Math.round(n) : n;
  };
  const oneOf = (field, list) => { if (list.includes(raw[field])) out[field] = raw[field]; };
  // Texto
  if (isHex(raw.color)) out.color = raw.color;
  if (typeof raw.fontFamily === 'string' && raw.fontFamily && raw.fontFamily.length <= 120 && !/[;{}<>\\]/.test(raw.fontFamily)) out.fontFamily = raw.fontFamily;
  if (['400', '700', '900'].includes(String(raw.fontWeight))) out.fontWeight = String(raw.fontWeight);
  oneOf('fontStyle', ['normal', 'italic']);
  oneOf('textTransform', ['none', 'uppercase', 'lowercase', 'capitalize']);
  num('letterSpacing', -5, 30);
  if (Object.prototype.hasOwnProperty.call(TEXT_SHADOWS, raw.textShadow)) out.textShadow = raw.textShadow;
  // Fondo
  if (isHex(raw.bgColor)) out.bgColor = raw.bgColor;
  if (isHex(raw.bgColor2)) out.bgColor2 = raw.bgColor2;
  if (out.bgColor || out.bgColor2) num('bgOpacity', 0, 100, true);
  if (out.bgColor2) num('bgAngle', 0, 360, true);
  if (isImage(raw.bgImage)) out.bgImage = raw.bgImage;
  if (out.bgImage) oneOf('bgSize', Object.keys(BG_SIZES));
  // Borde
  if (isHex(raw.borderColor)) out.borderColor = raw.borderColor;
  num('borderWidth', 0, 40);
  oneOf('borderStyle', BORDER_STYLES);
  if (out.borderWidth !== undefined || out.borderStyle) oneOf('borderSides', BORDER_SIDES);
  num('borderRadius', 0, 500);
  // Efectos
  num('opacity', 0, 100, true);
  if (Object.prototype.hasOwnProperty.call(BOX_SHADOWS, raw.boxShadow)) out.boxShadow = raw.boxShadow;
  num('grayscale', 0, 100, true);
  num('brightness', 0, 300, true);
  // Imagen
  if (isImage(raw.imgSrc)) out.imgSrc = raw.imgSrc;
  oneOf('imgFit', IMG_FITS);
  return Object.keys(out).length ? out : null;
}

export function sanitizeElementStyles(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  Object.entries(raw).forEach(([key, style]) => {
    if (typeof key !== 'string' || !/^[a-z0-9-]+:\d+(>[a-z0-9-]+:\d+)*$/.test(key)) return;
    const clean = sanitizeElementStyle(style);
    if (clean) out[key] = clean;
  });
  return Object.keys(out).length ? out : null;
}

function textDeclarations(s) {
  const d = [];
  if (s.color) d.push(['color', s.color]);
  if (s.fontFamily) d.push(['font-family', s.fontFamily]);
  if (s.fontWeight) d.push(['font-weight', s.fontWeight]);
  if (s.fontStyle) d.push(['font-style', s.fontStyle]);
  if (s.textTransform) d.push(['text-transform', s.textTransform]);
  if (s.letterSpacing !== undefined) d.push(['letter-spacing', `${s.letterSpacing}px`]);
  if (s.textShadow) d.push(['text-shadow', TEXT_SHADOWS[s.textShadow]]);
  return d;
}

function boxDeclarations(s, el) {
  const d = [];
  const alpha = s.bgOpacity === undefined ? 100 : s.bgOpacity;
  // Fondo: imagen > degradé > color liso. Siempre se pisa background-image: si no, un degradé o un diseño PNG de la gráfica
  // taparía el color elegido.
  if (s.bgImage) {
    d.push(['background-image', `url("${s.bgImage}")`]);
    d.push(['background-size', BG_SIZES[s.bgSize || 'cover']]);
    d.push(['background-position', 'center']);
    d.push(['background-repeat', 'no-repeat']);
    if (s.bgColor) d.push(['background-color', hexToRgba(s.bgColor, alpha)]);
  } else if (s.bgColor2) {
    const from = hexToRgba(s.bgColor || s.bgColor2, alpha);
    d.push(['background-image', `linear-gradient(${s.bgAngle === undefined ? 90 : s.bgAngle}deg, ${from}, ${hexToRgba(s.bgColor2, alpha)})`]);
    d.push(['background-color', 'transparent']);
  } else if (s.bgColor) {
    d.push(['background-color', hexToRgba(s.bgColor, alpha)]);
    d.push(['background-image', 'none']);
  } else if (s.bgOpacity !== undefined) {
    // Sin color elegido, la opacidad del fondo en 0 lo quita
    if (s.bgOpacity === 0) { d.push(['background-color', 'transparent']); d.push(['background-image', 'none']); }
  }
  // Borde: con grosor o tipo se dibuja en los lados elegidos (y se sacan los demás); solo con color, se recolorea el que ya tiene
  if (s.borderWidth !== undefined || s.borderStyle) {
    const active = SIDE_SETS[s.borderSides || 'all'];
    const width = s.borderWidth === undefined ? 2 : s.borderWidth;
    const style = s.borderStyle || 'solid';
    SIDES.forEach(side => {
      const on = active.includes(side) && style !== 'none' && width > 0;
      d.push([`border-${side}-width`, on ? `${width}px` : '0px']);
      d.push([`border-${side}-style`, on ? style : 'none']);
      if (on && s.borderColor) d.push([`border-${side}-color`, s.borderColor]);
    });
  } else if (s.borderColor) {
    d.push(['border-color', s.borderColor]);
  }
  if (s.borderRadius !== undefined) d.push(['border-radius', `${s.borderRadius}px`]);
  if (s.boxShadow) d.push(['box-shadow', BOX_SHADOWS[s.boxShadow](s)]);
  if (s.opacity !== undefined) d.push(['opacity', String(s.opacity / 100)]);
  const filters = [];
  if (s.grayscale !== undefined) filters.push(`grayscale(${s.grayscale}%)`);
  if (s.brightness !== undefined) filters.push(`brightness(${s.brightness}%)`);
  if (filters.length) d.push(['filter', filters.join(' ')]);
  // Imagen: en un <img> se reemplaza lo que muestra (content) sin tocar su src, que lo maneja la gráfica
  if (el.tagName === 'IMG') {
    if (s.imgSrc) d.push(['content', `url("${s.imgSrc}")`]);
    if (s.imgFit) d.push(['object-fit', s.imgFit]);
  }
  return d;
}

const styleOriginals = new WeakMap(); // elemento -> { propiedad: { value, priority } }

function setStyled(el, prop, value) {
  let orig = styleOriginals.get(el);
  if (!orig) { orig = {}; styleOriginals.set(el, orig); }
  if (!Object.prototype.hasOwnProperty.call(orig, prop)) {
    orig[prop] = { value: el.style.getPropertyValue(prop), priority: el.style.getPropertyPriority(prop) };
  }
  el.style.setProperty(prop, value, 'important');
  el.setAttribute('data-le-style', '1');
}

function restoreStyled(el) {
  const orig = styleOriginals.get(el);
  if (orig) {
    Object.entries(orig).forEach(([prop, { value, priority }]) => {
      // Si React ya volvió a escribir la propiedad (sin !important), ese valor es el bueno: no se pisa
      if (el.style.getPropertyPriority(prop) !== 'important') return;
      if (value) el.style.setProperty(prop, value, priority);
      else el.style.removeProperty(prop);
    });
    styleOriginals.delete(el);
  }
  el.removeAttribute('data-le-style');
}

// Aplica config.elementStyles_<id>. Devuelve los caminos que no existen en la gráfica tal como está dibujada.
export function applyElementStyles(wrapper, styles) {
  const missing = [];
  wrapper.querySelectorAll('[data-le-style]').forEach(restoreStyled);
  if (!styles) return missing;
  // Primero los bloques de afuera, después los de adentro: así el estilo más específico queda encima
  const entries = Object.entries(styles).sort((a, b) => a[0].split('>').length - b[0].split('>').length);
  entries.forEach(([key, raw]) => {
    const style = sanitizeElementStyle(raw);
    if (!style) return;
    const el = resolvePath(wrapper, key);
    if (!el || !el.style) { missing.push(key); return; }
    const text = textDeclarations(style);
    if (text.length) {
      const targets = [el, ...Array.from(el.querySelectorAll('*')).filter(n => n.style && !n.closest('[data-logo-cover]'))];
      targets.forEach(node => text.forEach(([prop, value]) => setStyled(node, prop, value)));
    }
    boxDeclarations(style, el).forEach(([prop, value]) => setStyled(el, prop, value));
  });
  return missing;
}

// ---------------------------------------------------------------------------------------------------------------------
// Navegación por los elementos de una gráfica (PERSONALIZAR > ELEMENTOS): cualquier caja, texto o imagen se puede elegir,
// incluidos los bloques que solo envuelven a otro elemento (por ejemplo la barra "RECORD DE VUELTA" detrás de su texto).

// Tipo de elemento para mostrarlo en la lista: imagen, ícono, texto o bloque
export function elementKind(el) {
  if (el.tagName === 'IMG') return 'image';
  if (el.tagName.toLowerCase() === 'svg' || el.tagName === 'CANVAS') return 'icon';
  if (hasOwnText(el) || (kidsOf(el).length === 0 && (el.textContent || '').trim())) return 'text';
  return 'block';
}

const isSelectable = (el) => !el.ownerSVGElement && !SKIP_TAGS.has(el.tagName) && !el.closest('[data-logo-cover]');

// El elemento más chico de la gráfica que está bajo el punto (coordenadas de pantalla). Los dibujos SVG cuentan como uno solo.
export function elementAtPoint(wrapper, x, y) {
  let best = null;
  let bestArea = Infinity;
  wrapper.querySelectorAll('*').forEach(el => {
    if (!isSelectable(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || x < r.left || x > r.right || y < r.top || y > r.bottom) return;
    if (getComputedStyle(el).visibility === 'hidden') return;
    const area = r.width * r.height;
    // Con el mismo tamaño gana el de más adentro (aparece después en el documento)
    if (area <= bestArea) { best = el; bestArea = area; }
  });
  return best;
}

// Textos del elemento separados (textContent los pega: "VUELTA101ROBERTO")
const textOf = (el) => {
  const parts = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const v = n.textContent.replace(/\s+/g, ' ').trim();
    if (v) parts.push(v);
  }
  return parts.join(' · ');
};

// Primer elemento con texto propio dentro de `el` (para mostrar el color de texto de un bloque)
export function firstTextElement(el) {
  if (!el) return null;
  if (hasOwnText(el)) return el;
  return Array.from(el.querySelectorAll('*')).find(n => !n.ownerSVGElement && hasOwnText(n)) || el;
}

const describeNode = (wrapper, el) => {
  const kind = elementKind(el);
  const text = textOf(el);
  return { key: pathOf(wrapper, el), kind, label: text.length > 32 ? `${text.slice(0, 32)}…` : text };
};

// Para el elemento `key`: sus contenedores (de afuera hacia adentro), él mismo y sus hijos visibles.
// Sin `key` (o si ya no existe): las cajas principales de la gráfica como punto de partida.
export function elementTree(wrapper, key) {
  const el = key ? resolvePath(wrapper, key) : null;
  if (!el) {
    return { current: null, ancestors: [], children: kidsOf(wrapper).filter(isRendered).filter(isSelectable).map(c => describeNode(wrapper, c)) };
  }
  const ancestors = [];
  let node = el.parentElement;
  while (node && node !== wrapper) {
    ancestors.unshift(describeNode(wrapper, node));
    node = node.parentElement;
  }
  const isLeaf = el.tagName === 'IMG' || el.tagName.toLowerCase() === 'svg';
  const children = isLeaf ? [] : kidsOf(el).filter(isRendered).filter(isSelectable).map(c => describeNode(wrapper, c));
  return { current: describeNode(wrapper, el), ancestors, children };
}
