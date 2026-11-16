// Animaciones del CONTENIDO de las gráficas (textos, íconos, fotos, números), además de la transición de la caja.
// Cada gráfica arma su animador con makeFx(config, id, isVisible) y lo aplica a sus elementos:
//   fx.text(i)  -> el texto sube y aparece           fx.icon(i)  -> el ícono / logo "salta"
//   fx.photo(i) -> la foto se descubre de abajo       fx.num(i)   -> número que aparece con un golpe de escala
//   fx.wipe(i)  -> barra / línea que se dibuja        fx.row(index, total) -> la aparición configurable de las filas
// i es el orden (cada paso suma unos milisegundos), así los elementos entran de a uno después de la caja.
// Igual que rowEntrance: mientras la gráfica está oculta la animación queda en 'none' y al salir al aire se asigna,
// por eso arranca de cero cada vez. Los keyframes sólo definen el punto de partida (animation-fill-mode: backwards):
// cada elemento termina en su propio estilo. Se desactiva por gráfica con config.contentAnim_<id> === false.
import { rowEntranceStyle, ROW_ANIM_CSS } from './rowEntrance';

export const CONTENT_ANIM_CSS = [
  ROW_ANIM_CSS,
  '@keyframes caRise { from { opacity: 0; transform: translateY(65%); } }',
  '@keyframes caSlide { from { opacity: 0; transform: translateX(-24px); } }',
  '@keyframes caPop { 0% { opacity: 0; transform: scale(0.3) rotate(-14deg); } 65% { opacity: 1; transform: scale(1.14) rotate(3deg); } }',
  '@keyframes caNum { 0% { opacity: 0; transform: scale(1.8); filter: blur(3px); } 60% { opacity: 1; transform: scale(0.94); filter: blur(0); } }',
  '@keyframes caPhoto { from { opacity: 0; transform: scale(1.12) translateY(12px); clip-path: inset(100% 0 0 0); } }',
  '@keyframes caWipe { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }',
  // Cambio de valor (vuelta nueva, posición): el número viejo "cae" y entra el nuevo con un golpe
  '@keyframes caTick { 0% { opacity: 0; transform: translateY(-75%) scale(0.7); } 55% { opacity: 1; transform: translateY(8%) scale(1.18); } 100% { transform: none; } }',
  '@keyframes caSweep { 0% { opacity: 1; background-position: 160% 0; } 100% { opacity: 0; background-position: -60% 0; } }',
  '@keyframes caGlow { 0% { box-shadow: 0 0 0 0 var(--ca-glow, rgba(255,255,255,0.7)); } 100% { box-shadow: 0 0 0 14px rgba(255,255,255,0); } }',
  '@keyframes caMic { 0%, 100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }',
  // Líneas de gráficos SVG que se dibujan (con pathLength="1" y strokeDasharray 1)
  '@keyframes caDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }',
  // Barras que crecen desde la base (izquierda)
  '@keyframes caGrow { from { transform: scaleX(0); } }',
  // Grupo escalonado: cada hijo directo de .ca-group entra después del anterior (textos suben, imágenes saltan)
  '.ca-group > * { animation: caRise 0.45s cubic-bezier(0.22, 0.8, 0.3, 1) backwards; }',
  '.ca-group > img, .ca-group > svg { animation-name: caPhoto; animation-duration: 0.7s; }',
  ...Array.from({ length: 12 }, (_, i) => `.ca-group > :nth-child(${i + 1}) { animation-delay: ${(0.2 + i * 0.07).toFixed(2)}s; }`)
].join(' ');

// Los keyframes van una sola vez en el <head> de cualquier ventana que dibuje gráficas (overlay, vistas previas, OBS)
if (typeof document !== 'undefined' && !document.getElementById('content-anim-css')) {
  const el = document.createElement('style');
  el.id = 'content-anim-css';
  el.textContent = CONTENT_ANIM_CSS;
  document.head.appendChild(el);
}

export const contentAnimOn = (config, id) => config?.[`contentAnim_${id}`] !== false;

const EASE = 'cubic-bezier(0.22, 0.8, 0.3, 1)';
const SPRING = 'cubic-bezier(0.34, 1.4, 0.5, 1)';
const STEP = 0.07; // segundos entre un elemento y el siguiente

// base: segundos antes del primer elemento (para que la caja ya haya entrado)
export function makeFx(config, id, isVisible, base = 0.18) {
  const on = contentAnimOn(config, id);
  const anim = (name, dur, i, ease = EASE) => {
    if (!on) return {};
    if (!isVisible) return { animation: 'none' };
    return { animation: `${name} ${dur}s ${ease} ${(base + i * STEP).toFixed(3)}s backwards` };
  };
  return {
    on,
    text: (i = 0) => anim('caRise', 0.45, i),
    slide: (i = 0) => anim('caSlide', 0.45, i),
    icon: (i = 0) => anim('caPop', 0.55, i, SPRING),
    num: (i = 0) => anim('caNum', 0.5, i),
    photo: (i = 0) => anim('caPhoto', 0.7, i),
    wipe: (i = 0) => anim('caWipe', 0.6, i),
    // Barra que crece desde la izquierda (transformOrigin a la izquierda)
    grow: (i = 0) => ({ transformOrigin: 'left center', ...anim('caGrow', 0.7, i) }),
    // Línea SVG que se dibuja: el elemento necesita pathLength="1"
    draw: (i = 0) => (on ? { strokeDasharray: 1, ...anim('caDraw', 1.1, i, 'ease-out') } : {}),
    // className para un contenedor cuyos hijos entran escalonados (va como className={fx.group})
    group: on && isVisible ? 'ca-group' : undefined,
    // Filas con pilotos: el mismo efecto configurable que la torre de posiciones (APARICIÓN DE LAS FILAS)
    row: (index, total, rowBase = base) => (on ? rowEntranceStyle(config, id, index, total, isVisible, rowBase) : {})
  };
}
