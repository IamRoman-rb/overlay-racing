import { useRef, useLayoutEffect } from 'react';
import { LAYOUT_EDITS_PREFIX, applyLayoutEdits } from '../utils/layoutEdit';
import { SIZE_W_PREFIX, SIZE_H_PREFIX, readSize, applyGraphicSize } from '../utils/graphicSize';

// Envuelve una gráfica y le aplica los objetos movidos desde la pestaña EDITOR (config.layoutEdits_<id>).
// También aplica el ancho/alto propio de la gráfica (config.sizeW_<id> / sizeH_<id>).
// No agrega ninguna caja al layout (display: contents) y, si la gráfica no tiene cambios, no hace nada.
export default function LayoutEdits({ id, config, children }) {
  const ref = useRef(null);
  const edits = config?.[`${LAYOUT_EDITS_PREFIX}${id}`];
  const signature = edits ? JSON.stringify(edits) : '';
  // La gráfica de resultados finales dibuja su propio tamaño (con medidas por defecto), así que acá se la saltea
  const sized = id !== 'finalResults';
  const width = sized ? readSize(config?.[`${SIZE_W_PREFIX}${id}`]) : null;
  const height = sized ? readSize(config?.[`${SIZE_H_PREFIX}${id}`]) : null;

  useLayoutEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return undefined;
    const current = signature ? JSON.parse(signature) : null;
    const hasEdits = !!current && Object.keys(current).length > 0;
    const apply = () => {
      applyLayoutEdits(wrapper, current);
      if (sized) applyGraphicSize(wrapper, width, height);
    };
    apply();
    if (!hasEdits && !width && !height) return undefined;

    // La gráfica vuelve a crear nodos al cambiar de página, de piloto o al aparecer: se reaplican los cambios
    const observer = new MutationObserver(apply);
    observer.observe(wrapper, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [signature, sized, width, height]);

  return <div ref={ref} data-le-wrap="1" style={{ display: 'contents' }}>{children}</div>;
}
