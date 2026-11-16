// ACOMODO AUTOMÁTICO DE GRÁFICAS SUPERPUESTAS (overlay).
// Cuando dos gráficas al aire se pisan, la que salió última se corre a un lugar libre PEGADO a la que estorba:
// arriba, abajo, a la izquierda o a la derecha (nunca a cualquier punto), dentro de la pantalla y sin alejarse más de
// maxShift de su posición. Si no hay lugar posible, se queda donde está. Al irse la otra, vuelve a su lugar.
//
// items: [{ id, x, y, w, h, since, fixed }] en coordenadas del lienzo, con la posición ORIGINAL (sin corrimiento).
//   since: cuándo salió al aire (las más viejas no se mueven); fixed: nunca se mueve (por ejemplo una tira de todo el ancho)
// Devuelve { [id]: { dx, dy } } (0, 0 si no se mueve).

export const ARRANGE_DEFAULTS = { gap: 12, maxShift: 380, edge: 6, tolerance: 4 };

// Se pisan si se cruzan más de `tol` px en los dos ejes (rozarse no cuenta)
export function rectsOverlap(a, b, tol = 0) {
  return a.x + a.w - tol > b.x && b.x + b.w - tol > a.x && a.y + a.h - tol > b.y && b.y + b.h - tol > a.y;
}

export function arrangeGraphics(items, canvas, options = {}) {
  const { gap, maxShift, edge, tolerance } = { ...ARRANGE_DEFAULTS, ...options };
  const W = canvas.width; const H = canvas.height;
  const order = [...items].sort((a, b) => (a.fixed === b.fixed ? (a.since || 0) - (b.since || 0) : (a.fixed ? -1 : 1)));
  const placed = [];
  const offsets = {};

  order.forEach(it => {
    const home = { x: it.x, y: it.y, w: it.w, h: it.h };
    offsets[it.id] = { dx: 0, dy: 0 };
    if (it.fixed || !placed.some(p => rectsOverlap(home, p, tolerance))) { placed.push(home); return; }

    const inside = (r) => r.x >= edge && r.y >= edge && r.x + r.w <= W - edge && r.y + r.h <= H - edge;
    let best = null;
    placed.forEach(p => {
      const cands = [
        { x: home.x, y: p.y - home.h - gap },   // arriba
        { x: home.x, y: p.y + p.h + gap },      // abajo
        { x: p.x - home.w - gap, y: home.y },   // izquierda
        { x: p.x + p.w + gap, y: home.y }       // derecha
      ];
      cands.forEach(c => {
        const r = { x: c.x, y: c.y, w: home.w, h: home.h };
        const dist = Math.hypot(r.x - home.x, r.y - home.y);
        if (dist > maxShift || !inside(r)) return;
        if (placed.some(q => rectsOverlap(r, q, 0))) return;
        if (!best || dist < best.dist) best = { ...r, dist };
      });
    });
    if (best) {
      offsets[it.id] = { dx: Math.round(best.x - home.x), dy: Math.round(best.y - home.y) };
      placed.push({ x: best.x, y: best.y, w: home.w, h: home.h });
    } else {
      placed.push(home);
    }
  });
  return offsets;
}
