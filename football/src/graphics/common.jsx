import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { readable } from '../state';
import LogoCover from './LogoCover';
import { applyLayoutEdits, applyTextSizes } from '../utils/layoutEdit';

// Escudo del equipo; sin escudo cargado muestra un círculo con el color del equipo y la inicial
export function Crest({ team, size = 40, style }) {
  if (team?.logo) return <img src={team.logo} alt="" style={{ width: size, height: size, objectFit: 'contain', flex: 'none', ...style }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: team?.color || '#666', color: readable(team?.color),
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 800, flex: 'none', ...style
    }}>{(team?.short || '?').slice(0, 1)}</div>
  );
}

// Foto del jugador/DT en círculo; sin foto, una silueta simple
export function Avatar({ photo, size = 100, ring, bg = 'rgba(255,255,255,0.15)' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flex: 'none', background: bg,
      border: ring ? `${Math.max(3, size / 28)}px solid ${ring}` : 'none', boxSizing: 'border-box', position: 'relative'
    }}>
      {photo
        ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
        : (
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <circle cx="50" cy="38" r="17" fill="rgba(255,255,255,0.35)" />
            <path d="M16 96 C16 68 84 68 84 96 Z" fill="rgba(255,255,255,0.35)" />
          </svg>
        )}
    </div>
  );
}

// Cómo sale cada transición mientras la gráfica está oculta (al mostrarse pasa a "sin transformar"). El deslizado va hacia
// el lado de donde viene cada gráfica.
const SLIDE_FROM = { scorebug: [-60, 0], lineup: [-70, 0], intro: [0, 40], alert: [0, 70], branding: [60, 0] };
function hiddenStyle(style, id) {
  switch (style) {
    case 'fade': return { opacity: 0 };
    case 'zoom': return { opacity: 0, transform: 'scale(0.9)' };
    case 'bounce': return { opacity: 0, transform: 'scale(0.3)' };
    case 'flip': return { opacity: 0, transform: 'scaleY(0.05)' };
    case 'rotate': return { opacity: 0, transform: 'scale(0.85) rotate(-15deg)' };
    // "enrollar": se va descubriendo de arriba hacia abajo (el margen negativo no corta sombras)
    case 'roll': return { clipPath: 'inset(0px -100px 100% -100px)' };
    default: { const [x, y] = SLIDE_FROM[id] || [-40, 0]; return { opacity: 0, transform: `translate(${x}px, ${y}px)` }; }
  }
}

// Envoltorio sin caja (display: contents) que aplica lo hecho en la pestaña EDITOR: objetos movidos y tamaños de texto propios.
// La gráfica vuelve a crear nodos al cambiar de datos o al aparecer, así que se reaplica con cada cambio del DOM.
function LayoutEdits({ edits, textSizes, children }) {
  const ref = useRef(null);
  const editsSig = edits && Object.keys(edits).length ? JSON.stringify(edits) : '';
  const sizesSig = textSizes && Object.keys(textSizes).length ? JSON.stringify(textSizes) : '';

  useLayoutEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return undefined;
    const currentEdits = editsSig ? JSON.parse(editsSig) : null;
    const currentSizes = sizesSig ? JSON.parse(sizesSig) : null;
    const apply = () => { applyLayoutEdits(wrapper, currentEdits); applyTextSizes(wrapper, currentSizes); };
    apply();
    if (!currentEdits && !currentSizes) return undefined;
    const observer = new MutationObserver(apply);
    observer.observe(wrapper, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [editsSig, sizesSig]);

  return <div ref={ref} data-le-wrap="1" style={{ display: 'contents' }}>{children}</div>;
}

// Una gráfica en el lienzo: la ubica (posición, escala, opacidad y ancho/alto elegidos en PERSONALIZAR), la anima al aparecer y
// desaparecer con el estilo y la duración propios, y la tapa un momento con los logos si así está configurado.
//   pos     : { x, y, scale, opacity, w, h, anim, animMs, cover, coverMs }
//   radius  : esquinas de la gráfica (el tapado con logo las respeta)
//   logos   : data URIs con los que se tapa (vacío = sin tapado)
//   instant : sin transición ni tapado (vista previa de PERSONALIZAR, que mide la gráfica ya asentada)
//   edits / textSizes : objetos movidos y tamaños de texto de la pestaña EDITOR
// El contenedor lleva data-gid para poder medirlo desde el panel.
export function Graphic({ id, pos, visible, instant, radius = 0, logos = [], color, edits, textSizes, children }) {
  const [shown, setShown] = useState(false);
  const [exited, setExited] = useState(!visible);
  const [root, setRoot] = useState(null);
  const ms = Math.max(0, Number(pos.animMs) || 0);
  const mounted = visible || !exited;

  useEffect(() => {
    // Un instante después de montar se pasa al estado "mostrado", así la transición de entrada se ve
    const timer = setTimeout(() => {
      if (visible) { setExited(false); setShown(true); } else setShown(false);
    }, visible ? 30 : 0);
    const leave = visible ? null : setTimeout(() => setExited(true), ms + 50);
    return () => { clearTimeout(timer); clearTimeout(leave); };
  }, [visible, ms]);

  if (instant ? !visible : !mounted) return null;

  const sized = (pos.w > 0 ? ' gfx-w' : '') + (pos.h > 0 ? ' gfx-h' : '');
  const on = instant || (shown && visible);
  const animStyle = on
    ? { opacity: 1, transform: 'none', ...(pos.anim === 'roll' ? { clipPath: 'inset(-100px)' } : {}) }
    : hiddenStyle(pos.anim, id);

  return (
    <div data-gid={id} className={`gfx${sized}`} style={{
      position: 'absolute', left: pos.x, top: pos.y, transform: `scale(${pos.scale})`, transformOrigin: 'top left',
      opacity: pos.opacity, width: pos.w > 0 ? pos.w : undefined, height: pos.h > 0 ? pos.h : undefined
    }}>
      <div ref={setRoot} className="gfx-anim" style={{
        position: 'relative', transformOrigin: 'top left', borderRadius: radius,
        width: pos.w > 0 ? '100%' : undefined, height: pos.h > 0 ? '100%' : undefined,
        transition: instant ? 'none' : `all ${ms}ms cubic-bezier(0.175, 0.885, 0.32, 1.275)`, ...animStyle
      }}>
        <LayoutEdits edits={edits} textSizes={textSizes}>{children}</LayoutEdits>
        {!instant && logos.length > 0 && (
          <LogoCover root={root} logos={logos} time={Math.max(0.3, (Number(pos.coverMs) || 1400) / 1000)} animDur={ms / 1000} visible={!!visible} color={color} />
        )}
      </div>
    </div>
  );
}
