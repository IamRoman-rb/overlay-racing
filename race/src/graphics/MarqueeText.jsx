import { useEffect, useRef } from 'react';

// Texto de una sola línea: si entra en su caja se muestra quieto (centrado o a la izquierda);
// si es más largo se desplaza en bucle. Todo se resuelve tocando el DOM directamente (sin estado)
// para poder reaccionar al ancho real de la caja y de la tipografía ya cargada.
const GAP_PX = 60;          // espacio entre repeticiones del texto al desplazarse
const SPEED_PX_PER_S = 45;  // velocidad de desplazamiento

export default function MarqueeText({ text, align = 'left', style }) {
  const boxRef = useRef(null);
  const trackRef = useRef(null);
  const firstRef = useRef(null);
  const cloneRef = useRef(null);

  useEffect(() => {
    const box = boxRef.current, track = trackRef.current, first = firstRef.current, clone = cloneRef.current;
    if (!box || !track || !first || !clone) return undefined;

    const apply = () => {
      const textWidth = first.scrollWidth - GAP_PX;
      const overflow = textWidth > box.clientWidth + 1;
      clone.style.display = overflow ? 'inline-block' : 'none';
      first.style.paddingRight = overflow ? `${GAP_PX}px` : '0px';
      track.style.animation = overflow
        ? `marqueeScrollText ${((textWidth + GAP_PX) / SPEED_PX_PER_S).toFixed(2)}s linear infinite`
        : 'none';
    };

    apply();
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(apply); ro.observe(box); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(apply).catch(() => {});
    return () => { if (ro) ro.disconnect(); };
  }, [text]);

  return (
    <div ref={boxRef} style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: align, ...style }}>
      <style>{'@keyframes marqueeScrollText { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }'}</style>
      <span ref={trackRef} style={{ display: 'inline-block', width: 'max-content' }}>
        <span ref={firstRef} style={{ display: 'inline-block' }}>{text}</span>
        <span ref={cloneRef} aria-hidden="true" style={{ display: 'none', paddingRight: `${GAP_PX}px` }}>{text}</span>
      </span>
    </div>
  );
}
