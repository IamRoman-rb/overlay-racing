// Chromium < 84 (por ejemplo el del input "Web Browser" de vMix 23, que es Chrome 77)
// ignora `gap` en contenedores flex: los elementos quedan pegados. Este polyfill solo se
// activa en esos navegadores y reemplaza el gap por margenes entre los hijos.
function supportsFlexGap() {
  const flex = document.createElement('div');
  flex.style.display = 'flex';
  flex.style.flexDirection = 'column';
  flex.style.rowGap = '1px';
  flex.appendChild(document.createElement('div'));
  flex.appendChild(document.createElement('div'));
  flex.style.position = 'absolute';
  flex.style.visibility = 'hidden';
  document.body.appendChild(flex);
  const supported = flex.scrollHeight === 1;
  document.body.removeChild(flex);
  return supported;
}

function applyGap(el) {
  const gap = el.style.gap;
  if (!gap) return;
  const cs = window.getComputedStyle(el);
  if (cs.display !== 'flex' && cs.display !== 'inline-flex') return;
  const column = cs.flexDirection === 'column' || cs.flexDirection === 'column-reverse';
  const prop = column ? 'marginTop' : 'marginLeft';
  const reset = column ? 'marginLeft' : 'marginTop';
  Array.from(el.children).forEach((child, i) => {
    if (i > 0 && !child.style[prop]) child.style[prop] = gap;
    if (i === 0 && child.style[prop] === gap) child.style[prop] = '';
    if (child.style[reset] === gap) child.style[reset] = '';
  });
}

export function installFlexGapPolyfill() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  const start = () => {
    if (supportsFlexGap()) return;
    let scheduled = false;
    const run = () => {
      scheduled = false;
      document.querySelectorAll('[style*="gap"]').forEach(applyGap);
    };
    new MutationObserver(() => {
      if (!scheduled) { scheduled = true; requestAnimationFrame(run); }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    run();
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
}
