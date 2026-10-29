import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { analyzeLogo, buildCoverBackground, layoutLogos } from '../utils/logoCover';
import { getAnimDuration } from '../utils/animationTiming';

export const COVER_ATTR = 'data-logo-cover';

const FADE_SHARE = 0.45; // del tiempo de tapado, cuánto es el descubrimiento (el resto el logo se queda quieto)
const EXIT_COVER_SECONDS = 0.25; // al desaparecer la gráfica, el logo vuelve a taparla rápido

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return [231, 76, 60];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Se dibuja DENTRO de la caja de la gráfica (portal), así hereda su posición, escala, animación y redondeo de bordes.
// visible: true/false según la gráfica en el overlay; undefined = vista previa (solo actúa al pedir "probar" con `replay`).
export default function LogoCover({ root, logos, time, visible, replay, config, id }) {
  const [infos, setInfos] = useState([]);
  const [mode, setMode] = useState('idle'); // idle | on | onSoft | fade
  const [dims, setDims] = useState({ w: 0, h: 0 }); // medidas de la caja de la gráfica (sin escala ni animación)
  const wasVisible = useRef(false);
  const logosKey = logos.join('|');
  const animDur = getAnimDuration(config, id);

  useEffect(() => {
    let alive = true;
    Promise.all(logos.map(analyzeLogo)).then(res => { if (alive) setInfos(res); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logosKey]);

  // Mantiene al día el tamaño de la caja (cambia con el ancho/alto de PERSONALIZAR, el formato de la gráfica, etc.)
  useLayoutEffect(() => {
    if (!root) return undefined;
    const measure = () => setDims(prev => (prev.w === root.offsetWidth && prev.h === root.offsetHeight ? prev : { w: root.offsetWidth, h: root.offsetHeight }));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [root]);

  useLayoutEffect(() => {
    const timers = [];
    const later = (fn, s) => timers.push(setTimeout(fn, s * 1000));
    const playIn = () => {
      setMode('on');
      later(() => setMode('fade'), animDur + time * (1 - FADE_SHARE));
      later(() => setMode('idle'), animDur + time + 0.1);
    };

    if (visible === undefined) {
      if (replay) playIn();
    } else if (visible) {
      playIn();
      wasVisible.current = true;
    } else if (wasVisible.current) {
      wasVisible.current = false;
      setMode('onSoft');
      later(() => setMode('idle'), Math.max(animDur, EXIT_COVER_SECONDS) + 0.1);
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, replay, root]);

  if (!root || logos.length === 0) return null;

  const fallbackColor = hexToRgb(config?.themeMain);
  const { background, lightBase } = buildCoverBackground(infos, fallbackColor);
  const fadeS = time * FADE_SHARE;
  const revealing = mode === 'fade';
  const opacity = mode === 'on' || mode === 'onSoft' ? 1 : 0;
  const transition = mode === 'fade' ? `opacity ${fadeS}s ease-in-out` : mode === 'onSoft' ? `opacity ${EXIT_COVER_SECONDS}s ease-out` : 'none';
  const blurPx = Math.max(6, Math.min(40, Math.round(Math.min(dims.w, dims.h) * 0.35)));
  const { vertical, gap, sizes } = layoutLogos(logos.map((_, i) => infos[i]?.aspect || 1), dims.w || 1, dims.h || 1);

  const cover = (
    <div
      {...{ [COVER_ATTR]: '1' }}
      style={{
        position: 'absolute', inset: 0, zIndex: 9999, overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none',
        background, opacity, transition, visibility: mode === 'idle' ? 'hidden' : 'visible'
      }}
    >
      {/* Difuminado: cada logo agrandado y desenfocado llena su parte del fondo con sus propios colores */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: vertical ? 'column' : 'row' }}>
        {logos.map((src, i) => (
          <div key={`glow${i}`} style={{ flex: '1 1 0', minWidth: 0, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
            <img src={src} alt="" style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              transform: 'scale(1.8)', filter: `blur(${blurPx}px) saturate(1.5)`, opacity: lightBase ? 0.35 : 0.55
            }} />
          </div>
        ))}
      </div>

      {/* Logos nítidos: medidas en px calculadas para que queden juntos, centrados y dentro del ancho y el alto de la gráfica */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: vertical ? 'column' : 'row', gap: `${gap}px`,
        transform: revealing ? 'scale(1.12)' : 'scale(1)', filter: revealing ? 'blur(6px)' : 'none',
        transition: revealing ? `transform ${fadeS}s ease-in, filter ${fadeS}s ease-in` : 'none'
      }}>
        {logos.map((src, i) => (
          <img key={i} src={src} alt="" style={{
            display: 'block', flex: 'none', width: `${sizes[i].w}px`, height: `${sizes[i].h}px`, objectFit: 'contain',
            filter: lightBase ? 'drop-shadow(0 2px 6px rgba(255,255,255,0.5))' : 'drop-shadow(0 3px 10px rgba(0,0,0,0.5))'
          }} />
        ))}
      </div>
    </div>
  );

  return createPortal(cover, root);
}
