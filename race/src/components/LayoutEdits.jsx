import { useRef, useState, useLayoutEffect } from 'react';
import { LAYOUT_EDITS_PREFIX, applyLayoutEdits, applyTextSizes } from '../utils/layoutEdit';
import LogoCover from './LogoCover';
import { getCoverSettings } from '../utils/logoCover';
import { SIZE_W_PREFIX, SIZE_H_PREFIX, readSize, applyGraphicSize } from '../utils/graphicSize';

// Envuelve una gráfica y le aplica los objetos movidos desde la pestaña EDITOR (config.layoutEdits_<id>).
// También aplica el ancho/alto propio de la gráfica (config.sizeW_<id> / sizeH_<id>).
// Si la gráfica tiene logos de tapado elegidos en PERSONALIZAR, los dibuja encima de su caja al aparecer (ver LogoCover).
//   visible: si la gráfica está en pantalla (undefined = vista previa); coverReplay: número que sube al pulsar "probar";
//   noCover: sin tapado (por ejemplo en el editor de objetos).
// No agrega ninguna caja al layout (display: contents) y, si la gráfica no tiene cambios, no hace nada.
export default function LayoutEdits({ id, config, children, visible, coverReplay, noCover }) {
  const ref = useRef(null);
  const [roots, setRoots] = useState([]);
  const cover = noCover ? { logos: [], time: 0 } : getCoverSettings(config, id);
  const coverOn = cover.logos.length > 0;
  const edits = config?.[`${LAYOUT_EDITS_PREFIX}${id}`];
  const signature = edits ? JSON.stringify(edits) : '';
  const textSizes = config?.[`textSizes_${id}`];
  const textSizeSignature = textSizes ? JSON.stringify(textSizes) : '';
  // La gráfica de resultados finales dibuja su propio tamaño (con medidas por defecto), así que acá se la saltea
  const sized = id !== 'finalResults';
  const width = sized ? readSize(config?.[`${SIZE_W_PREFIX}${id}`]) : null;
  const height = sized ? readSize(config?.[`${SIZE_H_PREFIX}${id}`]) : null;

  useLayoutEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return undefined;
    const current = signature ? JSON.parse(signature) : null;
    const currentTextSizes = textSizeSignature ? JSON.parse(textSizeSignature) : null;
    const hasEdits = (!!current && Object.keys(current).length > 0) || (!!currentTextSizes && Object.keys(currentTextSizes).length > 0);
    const apply = () => {
      applyLayoutEdits(wrapper, current);
      if (sized) applyGraphicSize(wrapper, width, height);
      applyTextSizes(wrapper, currentTextSizes);
    };
    apply();
    if (!hasEdits && !width && !height) return undefined;

    // La gráfica vuelve a crear nodos al cambiar de página, de piloto o al aparecer: se reaplican los cambios
    const observer = new MutationObserver(apply);
    observer.observe(wrapper, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [signature, textSizeSignature, sized, width, height]);

  // Cajas principales de la gráfica (hijos directos del envoltorio): sobre cada una va el tapado con logo
  useLayoutEffect(() => {
    const wrapper = ref.current;
    if (!wrapper || !coverOn) { setRoots(prev => (prev.length ? [] : prev)); return undefined; }
    const find = () => {
      const found = Array.from(wrapper.children).filter(c => !['STYLE', 'SCRIPT', 'LINK'].includes(c.tagName) && getComputedStyle(c).position !== 'static');
      setRoots(prev => (prev.length === found.length && prev.every((r, i) => r === found[i]) ? prev : found));
    };
    find();
    const observer = new MutationObserver(find);
    observer.observe(wrapper, { childList: true });
    return () => observer.disconnect();
  }, [coverOn]);

  return (
    <div ref={ref} data-le-wrap="1" style={{ display: 'contents' }}>
      {children}
      {coverOn && roots.map((root, i) => (
        <LogoCover key={i} root={root} logos={cover.logos} time={cover.time} visible={visible} replay={coverReplay} config={config} id={id} />
      ))}
    </div>
  );
}
