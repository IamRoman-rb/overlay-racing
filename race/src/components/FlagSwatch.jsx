import banderaCuadrosImg from '../assets/bandera cuadros.jpg';
import { FILL } from '../utils/insetBox';

// Muestra de la bandera vigente (ver utils/flagState): un rectángulo con el color de la bandera (tricolor en franjas,
// a cuadros con la foto de la bandera). Con `label`, el texto va adentro del rectángulo.
// pulse: titila suave (para banderas que piden atención: roja, amarilla, safety car...).
const ATTENTION = ['red', 'yellow', 'tricolor', 'purple', 'black'];

export default function FlagSwatch({ flag, width = 14, height = 30, label = null, fontSize = 11, radius = 2, pulse = true, style }) {
  if (!flag) return null;
  // Sin el atajo `background` (mezclado con backgroundImage/Size React lo pisa y el degradado no se dibuja)
  const backgroundImage = flag.checker ? `url("${banderaCuadrosImg}")`
    : flag.stripes ? `linear-gradient(90deg, ${flag.stripes[0]} 33.3%, ${flag.stripes[1]} 33.3%, ${flag.stripes[1]} 66.6%, ${flag.stripes[2]} 66.6%)`
      : 'none';
  const attention = pulse && ATTENTION.includes(flag.key);
  return (
    <span style={{
      position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height,
      backgroundColor: flag.color, backgroundImage, backgroundSize: flag.checker ? 'cover' : '100% 100%',
      backgroundPosition: 'center', backgroundRepeat: 'no-repeat', borderRadius: `${radius}px`, boxSizing: 'border-box',
      border: flag.border ? `1px solid ${flag.border}` : 'none', overflow: 'hidden', ...style
    }}>
      <style>{'@keyframes flagSwatchPulse { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }'}</style>
      {attention && <span style={{ position: 'absolute', ...FILL, backgroundColor: 'rgba(255,255,255,0.32)', animation: 'flagSwatchPulse 1.2s ease-in-out infinite' }} />}
      {label && (
        <span style={{
          position: 'relative', color: flag.text, fontSize: `${fontSize}px`, fontWeight: 900, letterSpacing: '0.5px', whiteSpace: 'nowrap',
          padding: '0 6px', textShadow: flag.checker || flag.stripes ? '0 0 4px #fff, 0 0 2px #fff' : 'none'
        }}>{label}</span>
      )}
    </span>
  );
}
