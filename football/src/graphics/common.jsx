import { useEffect, useState } from 'react';
import { readable } from '../state';

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

// Aparece y desaparece con una transición (el contenido queda montado hasta terminar de salir).
// Todas las gráficas ocupan el lienzo completo y se posicionan adentro con coordenadas de 1920x1080.
// instant: sin transición (la vista previa de PERSONALIZAR mide la gráfica ya asentada).
export function Anim({ visible, kind = 'fade', ms = 450, instant, children }) {
  const [shown, setShown] = useState(false);
  const [exited, setExited] = useState(!visible);
  const mounted = visible || !exited;

  useEffect(() => {
    // Un instante después de montar se pasa al estado "mostrado", así la transición de entrada se ve
    const timer = setTimeout(() => {
      if (visible) { setExited(false); setShown(true); } else setShown(false);
    }, visible ? 30 : 0);
    const leave = visible ? null : setTimeout(() => setExited(true), ms);
    return () => { clearTimeout(timer); clearTimeout(leave); };
  }, [visible, ms]);

  if (instant) return visible ? <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{children}</div> : null;
  if (!mounted) return null;
  const hidden = {
    fade: { opacity: 0 },
    left: { opacity: 0, transform: 'translateX(-70px)' },
    up: { opacity: 0, transform: 'translateY(70px)' },
    scale: { opacity: 0, transform: 'scale(0.94)' }
  }[kind];
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      transition: `opacity ${ms}ms ease, transform ${ms}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
      ...(shown && visible ? { opacity: 1, transform: 'none' } : hidden)
    }}>{children}</div>
  );
}

// Ubica una gráfica en el lienzo con la posición, escala y opacidad elegidas en PERSONALIZAR (esquina superior izquierda).
// data-gid permite medirla desde el panel para dibujar el recuadro de arrastre.
export function Place({ id, pos, children }) {
  return (
    <div data-gid={id} style={{
      position: 'absolute', left: pos.x, top: pos.y, transform: `scale(${pos.scale})`, transformOrigin: 'top left',
      opacity: pos.opacity
    }}>{children}</div>
  );
}
