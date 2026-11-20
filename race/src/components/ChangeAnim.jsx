import { useState } from 'react';
import { FILL } from '../utils/insetBox';
import '../utils/contentAnim'; // inyecta los keyframes (caTick, caSweep)

// Valores que se animan cuando cambian (vuelta, brecha, puntos). Los keyframes están en utils/contentAnim.js.
const SPRING = 'cubic-bezier(0.34, 1.4, 0.5, 1)';

// Cuenta los cambios de un valor (patrón de React: estado derivado de la prop, sin efectos). 0 = todavía no cambió.
function useChangeCount(value) {
  const [state, setState] = useState({ value, n: 0 });
  if (state.value !== value) {
    const next = { value, n: state.n + 1 };
    setState(next);
    return next.n;
  }
  return state.n;
}

// Valor que se anima cada vez que cambia (vuelta, tiempo total, posición). No se anima al montarse.
export function ChangeTick({ value, children, style, enabled = true }) {
  const n = useChangeCount(value);
  return (
    <span key={n} style={{ display: 'inline-block', ...(enabled && n > 0 ? { animation: `caTick 0.6s ${SPRING}` } : {}), ...style }}>
      {children ?? value}
    </span>
  );
}

// Brillo que cruza la caja cuando cambia el valor. Va dentro de un contenedor con position: relative y overflow: hidden.
export function ChangeSweep({ value, color = 'rgba(255,255,255,0.35)', enabled = true }) {
  const n = useChangeCount(value);
  if (!enabled || n === 0) return null;
  return (
    <span key={n} aria-hidden="true" style={{
      position: 'absolute', ...FILL, pointerEvents: 'none', zIndex: 2,
      background: `linear-gradient(105deg, transparent 35%, ${color} 50%, transparent 65%)`, backgroundSize: '260% 100%',
      animation: 'caSweep 0.9s ease-out forwards', opacity: 0
    }} />
  );
}
