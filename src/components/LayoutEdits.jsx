import { useRef, useLayoutEffect } from 'react';
import { LAYOUT_EDITS_PREFIX, applyLayoutEdits } from '../utils/layoutEdit';

// Envuelve una gráfica y le aplica los objetos movidos desde la pestaña EDITOR (config.layoutEdits_<id>).
// No agrega ninguna caja al layout (display: contents) y, si la gráfica no tiene cambios, no hace nada.
export default function LayoutEdits({ id, config, children }) {
  const ref = useRef(null);
  const edits = config?.[`${LAYOUT_EDITS_PREFIX}${id}`];
  const signature = edits ? JSON.stringify(edits) : '';

  useLayoutEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return undefined;
    const current = signature ? JSON.parse(signature) : null;
    applyLayoutEdits(wrapper, current);
    if (!current || Object.keys(current).length === 0) return undefined;

    // La gráfica vuelve a crear nodos al cambiar de página, de piloto o al aparecer: se reaplican los cambios
    const observer = new MutationObserver(() => applyLayoutEdits(wrapper, current));
    observer.observe(wrapper, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [signature]);

  return <div ref={ref} data-le-wrap="1" style={{ display: 'contents' }}>{children}</div>;
}
