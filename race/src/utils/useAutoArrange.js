import { useEffect, useRef } from 'react';
import { arrangeGraphics } from './autoArrange';

// Aplica el acomodo automático (utils/autoArrange) a las gráficas del overlay.
// Cada gráfica está envuelta por LayoutEdits (data-le-wrap, data-le-id, data-le-visible): se miden sus cajas principales
// (hijos directos) y, si hay que correrla, se les suma un margen (no se toca `transform`, que usan las animaciones de
// entrada y la escala; la transición `all` de las gráficas lo hace deslizar). Se revisa cada 400 ms.
const SKIP_IDS = new Set(['windVectors']);     // efectos de pantalla completa: ni se mueven ni estorban
const FIXED_IDS = new Set(['ticker']);          // tira inferior: estorba pero no se mueve

function roots(wrapper) {
  return Array.from(wrapper.children).filter(c => c.nodeType === 1 && !['STYLE', 'SCRIPT', 'LINK'].includes(c.tagName));
}

export function useAutoArrange(containerRef, enabled, canvas) {
  const since = useRef({});
  const W = canvas.width; const H = canvas.height;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const clearAll = () => container.querySelectorAll('[data-aa-shift]').forEach(el => {
      el.style.marginLeft = ''; el.style.marginTop = ''; el.removeAttribute('data-aa-shift'); delete el.dataset.aaDx; delete el.dataset.aaDy;
    });
    if (!enabled) { clearAll(); return undefined; }

    const tick = () => {
      const cRect = container.getBoundingClientRect();
      const k = cRect.width / W || 1;   // el overlay puede verse escalado (vista previa / navegador)
      const items = [];
      const byId = {};
      container.querySelectorAll('[data-le-wrap][data-le-id]').forEach(wrapper => {
        const id = wrapper.getAttribute('data-le-id');
        const els = roots(wrapper);
        if (wrapper.getAttribute('data-le-visible') !== '1' || SKIP_IDS.has(id)) {
          delete since.current[id];
          byId[id] = { els, offset: { dx: 0, dy: 0 } };   // fuera del aire: vuelve a su lugar
          return;
        }
        if (!since.current[id]) since.current[id] = Date.now();
        let box = null;
        els.forEach(el => {
          if (el.hasAttribute('data-sponsor-slot')) return;   // los sponsors acompañan, pero no cuentan para el tamaño
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return;
          // Margen real de ESTE momento (durante el deslizamiento todavía no llegó al valor final)
          const cs = el.hasAttribute('data-aa-shift') ? getComputedStyle(el) : null;
          const dx = cs ? parseFloat(cs.marginLeft) || 0 : 0; const dy = cs ? parseFloat(cs.marginTop) || 0 : 0;
          const x = (r.left - cRect.left) / k - dx; const y = (r.top - cRect.top) / k - dy;
          const w = r.width / k; const h = r.height / k;
          box = box ? { x: Math.min(box.x, x), y: Math.min(box.y, y), r: Math.max(box.r, x + w), b: Math.max(box.b, y + h) } : { x, y, r: x + w, b: y + h };
        });
        byId[id] = { els };
        if (!box) return;
        const w = box.r - box.x; const h = box.b - box.y;
        if (w * h > W * H * 0.5) return;                   // casi toda la pantalla: no se acomoda
        items.push({ id, x: box.x, y: box.y, w, h, since: since.current[id], fixed: FIXED_IDS.has(id) || w > W * 0.85 });
      });

      const offsets = arrangeGraphics(items, { width: W, height: H });
      Object.entries(byId).forEach(([id, { els, offset }]) => {
        const o = offset || offsets[id] || { dx: 0, dy: 0 };
        els.forEach(el => {
          const curDx = parseFloat(el.dataset.aaDx || '0'); const curDy = parseFloat(el.dataset.aaDy || '0');
          if (Math.abs(curDx - o.dx) < 3 && Math.abs(curDy - o.dy) < 3) return;   // sin temblores por la animación
          if (o.dx === 0 && o.dy === 0) {
            el.style.marginLeft = ''; el.style.marginTop = ''; el.removeAttribute('data-aa-shift'); delete el.dataset.aaDx; delete el.dataset.aaDy;
          } else {
            el.style.marginLeft = `${o.dx}px`; el.style.marginTop = `${o.dy}px`;
            el.setAttribute('data-aa-shift', '1'); el.dataset.aaDx = String(o.dx); el.dataset.aaDy = String(o.dy);
          }
        });
      });
    };
    tick();
    const iv = setInterval(tick, 400);
    return () => { clearInterval(iv); clearAll(); };
  }, [containerRef, enabled, W, H]);
}
